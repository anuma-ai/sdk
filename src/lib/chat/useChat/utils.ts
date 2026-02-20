import type {
  LlmapiChatCompletionTool,
  LlmapiMessage,
  LlmapiMessageContentPart,
  LlmapiResponseResponse,
} from "../../../client";
import type {
  StreamAccumulator,
  StreamingChunk,
  ToolConfig,
  ToolExecutor,
  AccumulatedToolCall,
} from "./types";

/**
 * Validation error types
 */
export type ValidationError =
  | "messages_required"
  | "model_required"
  | "token_getter_required"
  | "token_unavailable";

/**
 * Validation result
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: ValidationError; message: string };

/**
 * Error messages for validation errors
 */
export const VALIDATION_ERROR_MESSAGES: Record<ValidationError, string> = {
  messages_required: "messages are required to call sendMessage.",
  model_required: "model is required to call sendMessage.",
  token_getter_required: "Token getter function is required.",
  token_unavailable: "No access token available.",
};

/**
 * Validates that messages are provided
 */
export function validateMessages(
  messages: LlmapiMessage[] | undefined
): ValidationResult {
  if (!messages?.length) {
    return {
      valid: false,
      error: "messages_required",
      message: VALIDATION_ERROR_MESSAGES.messages_required,
    };
  }
  return { valid: true };
}

/**
 * Validates that model is provided
 */
export function validateModel(model: string | undefined): ValidationResult {
  if (!model) {
    return {
      valid: false,
      error: "model_required",
      message: VALIDATION_ERROR_MESSAGES.model_required,
    };
  }
  return { valid: true };
}

/**
 * Validates that token getter is provided
 */
export function validateTokenGetter(
  getToken: (() => Promise<string | null>) | undefined
): ValidationResult {
  if (!getToken) {
    return {
      valid: false,
      error: "token_getter_required",
      message: VALIDATION_ERROR_MESSAGES.token_getter_required,
    };
  }
  return { valid: true };
}

/**
 * Validates that token is available
 */
export function validateToken(token: string | null): ValidationResult {
  if (!token) {
    return {
      valid: false,
      error: "token_unavailable",
      message: VALIDATION_ERROR_MESSAGES.token_unavailable,
    };
  }
  return { valid: true };
}

/**
 * Extracts text from a message content part
 */
function extractTextFromContentPart(part: LlmapiMessageContentPart): string {
  if (part.type === "text" && part.text) {
    return part.text;
  }
  return "";
}

/**
 * Converts a messages array to a string input for the responses API.
 * Format: Each message is prefixed with its role, messages are separated by newlines.
 *
 * @deprecated This function is deprecated. The API now accepts messages as an array directly.
 * This function is kept for backward compatibility but is no longer used internally.
 */
export function messagesToInput(messages: LlmapiMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role || "user";

      // Handle tool result messages - format them as system messages with tool results
      if (role === "tool") {
        const content = Array.isArray(msg.content)
          ? msg.content
              .map(extractTextFromContentPart)
              .filter(Boolean)
              .join("\n")
          : String(msg.content || "");
        return `system: Tool result: ${content}`;
      }

      // Handle assistant messages with tool calls
      if (role === "assistant" && (msg as any).tool_calls) {
        const toolCalls = (msg as any).tool_calls;
        const toolCallsText = toolCalls
          .map((tc: any) => {
            const args = tc.function?.arguments || "{}";
            return `Called ${tc.function?.name}(${args})`;
          })
          .join(", ");
        return `assistant: ${toolCallsText}`;
      }

      const content = Array.isArray(msg.content)
        ? msg.content.map(extractTextFromContentPart).filter(Boolean).join("\n")
        : String(msg.content || "");
      return `${role}: ${content}`;
    })
    .join("\n\n");
}

/**
 * Result from parsing reasoning tags from content
 */
export type ReasoningParseResult = {
  /** Content with reasoning tags removed */
  messageContent: string;
  /** Extracted reasoning content */
  reasoningContent: string;
  /** Incomplete tag at the end (for next chunk) */
  partialTag: string;
  /** Whether we're currently inside a reasoning block (for next chunk) */
  insideReasoning: boolean;
  /** Whether this model uses implicit reasoning start (no opening tag) */
  implicitReasoningStart?: boolean;
};

/**
 * Supported reasoning tag formats
 */
const REASONING_TAG_FORMATS = [
  { open: "<reasoning>", close: "</reasoning>" },
  { open: "<think>", close: "</think>" },
] as const;

/**
 * Detects which tag format is being used based on content or partial tag
 */
function detectTagFormat(
  content: string,
  partialTag: string
): (typeof REASONING_TAG_FORMATS)[number] | null {
  const combined = partialTag + content;

  for (const format of REASONING_TAG_FORMATS) {
    // Check if content contains or starts with this format's tags
    if (
      combined.includes(format.open) ||
      combined.includes(format.close) ||
      format.open.startsWith(combined.slice(0, format.open.length)) ||
      format.close.startsWith(combined.slice(0, format.close.length))
    ) {
      return format;
    }
  }

  // Default to first format if starting with '<'
  if (combined.startsWith("<")) {
    return REASONING_TAG_FORMATS[0];
  }

  return null;
}

/**
 * Parses and extracts reasoning tags from content, handling partial tags across streaming chunks.
 * Supports both `<reasoning></reasoning>` and `<think></think>` tag formats.
 * Also supports models that start with reasoning content immediately (no opening tag)
 * and only use a closing tag to mark the end of reasoning.
 */
export function parseReasoningTags(
  content: string,
  previousPartialTag: string = "",
  wasInsideReasoning: boolean = false,
  detectedFormat?: { open: string; close: string },
  wasImplicitReasoningStart?: boolean
): ReasoningParseResult {
  // Detect or use provided tag format
  const format =
    detectedFormat ||
    detectTagFormat(content, previousPartialTag) ||
    REASONING_TAG_FORMATS[0];

  const OPENING_TAG = format.open;
  const CLOSING_TAG = format.close;
  const OPENING_TAG_LEN = OPENING_TAG.length;
  const CLOSING_TAG_LEN = CLOSING_TAG.length;

  // Combine previous partial with new content
  const fullContent = previousPartialTag + content;
  let messageContent = "";
  let reasoningContent = "";
  let partialTag = "";
  let i = 0;
  let insideReasoning = wasInsideReasoning;
  let implicitReasoningStart = wasImplicitReasoningStart;

  // Detect implicit reasoning start: model that doesn't use opening tag
  // We detect this when we see a closing tag without having seen an opening tag
  // This serves as a fallback for models not detected by name
  if (implicitReasoningStart === undefined) {
    // Check if there's a closing tag in current content
    const hasClosingTag = REASONING_TAG_FORMATS.some((fmt) =>
      fullContent.includes(fmt.close)
    );
    const hasOpeningTag = REASONING_TAG_FORMATS.some((fmt) =>
      fullContent.includes(fmt.open)
    );

    if (hasClosingTag && !hasOpeningTag) {
      // Model uses implicit reasoning start - treat everything before closing tag as reasoning
      implicitReasoningStart = true;
      insideReasoning = true;
    } else if (hasOpeningTag) {
      // Model uses explicit tags
      implicitReasoningStart = false;
    }
  } else if (implicitReasoningStart === true) {
    // For known implicit reasoning models (like Qwen), trust the wasInsideReasoning state.
    // This handles both initial requests and continuation requests after tool calls.
    // Each new accumulator starts with insideReasoning=true, meaning we expect thinking
    // content until we see </think>
    insideReasoning = wasInsideReasoning;
  }

  // Check if previous partial indicates we're already inside reasoning
  if (previousPartialTag) {
    if (previousPartialTag === OPENING_TAG) {
      insideReasoning = true;
      i = OPENING_TAG_LEN; // Start processing after the opening tag
    } else if (previousPartialTag === CLOSING_TAG) {
      // Complete closing tag from previous partial
      i = CLOSING_TAG_LEN;
      insideReasoning = false;
    } else if (
      wasInsideReasoning &&
      CLOSING_TAG.startsWith(previousPartialTag)
    ) {
      // Inside reasoning and partial could be start of closing tag - check closing tag first
      if (fullContent.startsWith(CLOSING_TAG)) {
        // Complete closing tag
        i = CLOSING_TAG_LEN;
        insideReasoning = false;
      } else if (
        CLOSING_TAG.startsWith(
          fullContent.slice(0, Math.min(CLOSING_TAG_LEN, fullContent.length))
        )
      ) {
        // Still incomplete - we're inside reasoning waiting for close
        return {
          messageContent: "",
          reasoningContent: "",
          partialTag: fullContent.slice(
            0,
            Math.min(CLOSING_TAG_LEN, fullContent.length)
          ),
          insideReasoning: true,
          implicitReasoningStart,
        };
      } else {
        // Not part of closing tag - must be reasoning content
        reasoningContent = previousPartialTag;
        i = previousPartialTag.length;
        insideReasoning = true;
      }
    } else if (OPENING_TAG.startsWith(previousPartialTag)) {
      // Previous partial is start of opening tag
      if (fullContent.startsWith(OPENING_TAG)) {
        // Now complete
        insideReasoning = true;
        i = OPENING_TAG_LEN;
      } else if (
        OPENING_TAG.startsWith(
          fullContent.slice(0, Math.min(OPENING_TAG_LEN, fullContent.length))
        )
      ) {
        // Still incomplete - preserve wasInsideReasoning state
        return {
          messageContent: "",
          reasoningContent: "",
          partialTag: fullContent.slice(
            0,
            Math.min(OPENING_TAG_LEN, fullContent.length)
          ),
          insideReasoning: wasInsideReasoning,
          implicitReasoningStart,
        };
      } else {
        // Not part of tag - treat as message content or reasoning based on state
        if (wasInsideReasoning) {
          reasoningContent = previousPartialTag;
        } else {
          messageContent = previousPartialTag;
        }
        i = previousPartialTag.length;
      }
    } else {
      // Previous partial was content (could be reasoning or message based on state)
      if (wasInsideReasoning) {
        reasoningContent = previousPartialTag;
      } else {
        messageContent = previousPartialTag;
      }
      i = previousPartialTag.length;
    }
  }

  // Process the rest of the content
  while (i < fullContent.length) {
    if (insideReasoning) {
      // Look for closing tag
      const closeIndex = fullContent.indexOf(CLOSING_TAG, i);

      if (closeIndex === -1) {
        // No closing tag found
        const remaining = fullContent.slice(i);
        // Check if end could be start of closing tag
        if (remaining.length < CLOSING_TAG_LEN) {
          const potentialClose = remaining;
          if (CLOSING_TAG.startsWith(potentialClose)) {
            partialTag = potentialClose;
          } else {
            reasoningContent += remaining;
          }
        } else {
          reasoningContent += remaining;
        }
        break;
      }

      // Found closing tag
      // Extract content before the closing tag (reasoning content)
      const contentBeforeClose = fullContent.slice(i, closeIndex);
      if (contentBeforeClose) {
        reasoningContent += contentBeforeClose;
      }
      // Skip over the closing tag itself
      i = closeIndex + CLOSING_TAG_LEN;
      // Exit reasoning mode - any content after this will be message content
      insideReasoning = false;
    } else {
      // Look for opening tag
      const openIndex = fullContent.indexOf(OPENING_TAG, i);

      if (openIndex === -1) {
        // No opening tag found
        const remaining = fullContent.slice(i);
        // Check if end could be start of opening tag
        if (remaining.length < OPENING_TAG_LEN) {
          const potentialOpen = remaining;
          if (OPENING_TAG.startsWith(potentialOpen)) {
            partialTag = potentialOpen;
          } else {
            messageContent += remaining;
          }
        } else {
          messageContent += remaining;
        }
        break;
      }

      // Found opening tag
      messageContent += fullContent.slice(i, openIndex);
      i = openIndex + OPENING_TAG_LEN;
      insideReasoning = true;
    }
  }

  // Defensive check: ensure tags are never included in output
  // This should never happen, but adding as a safety measure
  // Check for all supported tag formats
  for (const tagFormat of REASONING_TAG_FORMATS) {
    if (
      messageContent.includes(tagFormat.open) ||
      messageContent.includes(tagFormat.close)
    ) {
      console.warn(
        "[parseReasoningTags] Warning: Tag found in messageContent, removing"
      );
      messageContent = messageContent.replace(
        new RegExp(tagFormat.open.replace(/[<>/]/g, "\\$&"), "g"),
        ""
      );
      messageContent = messageContent.replace(
        new RegExp(tagFormat.close.replace(/[<>/]/g, "\\$&"), "g"),
        ""
      );
    }
    if (
      reasoningContent.includes(tagFormat.open) ||
      reasoningContent.includes(tagFormat.close)
    ) {
      console.warn(
        "[parseReasoningTags] Warning: Tag found in reasoningContent, removing"
      );
      reasoningContent = reasoningContent.replace(
        new RegExp(tagFormat.open.replace(/[<>/]/g, "\\$&"), "g"),
        ""
      );
      reasoningContent = reasoningContent.replace(
        new RegExp(tagFormat.close.replace(/[<>/]/g, "\\$&"), "g"),
        ""
      );
    }
  }

  return {
    messageContent,
    reasoningContent,
    partialTag,
    insideReasoning,
    implicitReasoningStart,
  };
}

/**
 * Check if a model uses implicit reasoning start (no opening tag, only closing tag)
 * Models like Qwen thinking models start reasoning immediately without `<think>` tag
 */
function isImplicitReasoningModel(modelName?: string): boolean {
  if (!modelName) return false;
  const lowerModel = modelName.toLowerCase();
  // Qwen thinking models use implicit reasoning (no `<think>` tag, only `</think>`)
  return lowerModel.includes("qwen") && lowerModel.includes("thinking");
}

/**
 * Creates an initial stream accumulator
 * @param initialModel - Optional model name to initialize with (from request)
 */
export function createStreamAccumulator(
  initialModel?: string
): StreamAccumulator {
  // Check if this model uses implicit reasoning start
  // For these models, we assume we're inside reasoning until we see </think>
  // This applies to both initial requests AND continuation requests (after tool calls),
  // since models like Qwen continue thinking in each response without `<think>` tags
  const implicitReasoning = isImplicitReasoningModel(initialModel);

  return {
    content: "",
    thinking: "",
    responseId: "",
    responseModel: initialModel || "",
    usage: {},
    toolCalls: new Map(),
    partialReasoningTag: "",
    // For implicit reasoning models, start inside reasoning mode
    // If they send `<think>` first, parseReasoningTags will handle it correctly
    insideReasoning: implicitReasoning,
    implicitReasoningStart: implicitReasoning ? true : undefined,
  };
}

/**
 * Server tool call event emitted during streaming
 */
export type ServerToolCallEvent = {
  /** Tool name (e.g., "BraveSearchMCP_brave_web_search") */
  name: string;
  /** Status: "started" when tool begins, "completed" when done */
  status: "started" | "completed";
  /** Arguments passed to the tool (JSON string) */
  arguments?: string;
};

/**
 * Result from processing a streaming chunk
 */
export type ProcessChunkResult = {
  /** Content delta (regular assistant response) */
  content: string | null;
  /** Thinking delta (reasoning/thinking content) */
  thinking: string | null;
  /** Server tool call event (for activity indicators) */
  serverToolCall?: ServerToolCallEvent;
};

/**
 * Processes a streaming chunk and updates the accumulator
 * Returns the content and thinking deltas if present
 */
export function processStreamingChunk(
  chunk: StreamingChunk,
  accumulator: StreamAccumulator
): ProcessChunkResult {
  const result: ProcessChunkResult = { content: null, thinking: null };

  // Debug: Log all chunk types
  if (chunk.type) {
    console.log("[Tool Debug] Event type:", chunk.type);
  }

  // Handle response.created event - extract ID and model from response object
  if (chunk.type === "response.created" && chunk.response) {
    if (chunk.response.id && !accumulator.responseId) {
      accumulator.responseId = chunk.response.id;
    }
    if (chunk.response.model && !accumulator.responseModel) {
      accumulator.responseModel = chunk.response.model;
    }
    return result;
  }

  // Handle response.completed event - extract usage from response object
  if (chunk.type === "response.completed") {
    if (chunk.response?.usage) {
      const u = chunk.response.usage;
      accumulator.usage = {
        ...accumulator.usage,
        prompt_tokens: u.input_tokens,
        completion_tokens: u.output_tokens,
        total_tokens: (u.input_tokens || 0) + (u.output_tokens || 0),
        ...(u.cost_micro_usd != null && { cost_micro_usd: u.cost_micro_usd }),
        ...(u.credits_used != null && { credits_used: u.credits_used }),
      };
    }

    // Mark all pending tool calls as completed and emit completion event
    for (const toolCall of accumulator.toolCalls.values()) {
      if (toolCall.status === "pending") {
        toolCall.status = "completed";
        result.serverToolCall = {
          name: toolCall.name,
          status: "completed",
        };
      }
    }

    return result;
  }

  // Legacy: Extract response ID and model from top-level fields
  if (chunk.id && !accumulator.responseId) {
    accumulator.responseId = chunk.id;
  }
  if (chunk.model && !accumulator.responseModel) {
    accumulator.responseModel = chunk.model;
  }

  // Accumulate usage data - merge instead of replace
  // This ensures we capture both token counts and cost_micro_usd
  if (chunk.usage) {
    accumulator.usage = {
      ...accumulator.usage,
      ...chunk.usage,
    };
  }

  // Handle thinking/reasoning content deltas
  // These event types are used by various providers for thinking content
  if (
    chunk.type === "response.reasoning.delta" ||
    chunk.type === "response.reasoning_summary_text.delta" ||
    chunk.type === "response.thinking.delta"
  ) {
    const delta = chunk.delta;
    if (delta) {
      // Handle both string and object delta formats
      const deltaText =
        typeof delta === "string"
          ? delta
          : delta.OfString || delta.OfResponseReasoningSummaryDeltaEventDelta;
      if (deltaText) {
        accumulator.thinking += deltaText;
        result.thinking = deltaText;
      }
    }
    return result;
  }

  // Extract content delta from responses API format
  if (chunk.type === "response.output_text.delta") {
    console.log("[Tool Debug] output_text.delta event - delta:", chunk.delta);
    const delta = chunk.delta;
    if (delta) {
      // Handle both string and object delta formats
      // The API may return delta as either a string or an object with OfString property
      const deltaText = typeof delta === "string" ? delta : delta.OfString;
      if (deltaText) {
        console.log(
          "[Tool Debug] output_text.delta - adding text:",
          deltaText.substring(0, 50)
        );
        accumulator.content += deltaText;
        result.content = deltaText;
      }
    }
  }

  // Handle tool call events
  // Event: response.output_item.added with type "function_call"
  if (chunk.type === "response.output_item.added" && chunk.item) {
    // Debug logging
    console.log(
      "[Tool Debug] output_item.added:",
      JSON.stringify(chunk.item, null, 2)
    );

    if (chunk.item.type === "message") {
      console.log(
        "[Tool Debug] Message output item added - ready to receive text deltas"
      );
    }

    if (chunk.item.type === "function_call") {
      // Use item.id (fc_...) as the primary key since that's what arguments events use
      const itemId = chunk.item.id || "";
      const callId = chunk.item.call_id || "";

      if (itemId && chunk.item.name) {
        console.log(
          "[Tool Debug] Detected tool call:",
          chunk.item.name,
          "item ID:",
          itemId,
          "call ID:",
          callId
        );
        accumulator.toolCalls.set(itemId, {
          id: callId || itemId, // Use call_id for the tool call ID
          type: "function",
          name: chunk.item.name,
          arguments: chunk.item.arguments || "",
          status: "pending",
        });

        // Emit server tool call started event
        result.serverToolCall = {
          name: chunk.item.name,
          status: "started",
          arguments: chunk.item.arguments,
        };
      }
    }
  }

  // Event: response.function_call_arguments.delta - streaming arguments (note: underscore, not dot)
  if (chunk.type === "response.function_call_arguments.delta") {
    console.log(
      "[Tool Debug] Arguments delta event - item_id:",
      chunk.item_id,
      "call_id:",
      chunk.call_id,
      "args length:",
      chunk.arguments?.length
    );
    // Use item_id (fc_...) to look up the tool call
    const itemId = chunk.item_id || chunk.call_id || "";
    if (itemId && chunk.arguments) {
      const existing = accumulator.toolCalls.get(itemId);
      if (existing) {
        existing.arguments += chunk.arguments;
      } else {
        console.log(
          "[Tool Debug] WARNING: Tool call not found for item ID:",
          itemId,
          "Available keys:",
          Array.from(accumulator.toolCalls.keys())
        );
      }
    }
  }

  // Event: response.function_call_arguments.done - arguments complete (note: underscore, not dot)
  if (chunk.type === "response.function_call_arguments.done") {
    console.log(
      "[Tool Debug] Arguments done event - item_id:",
      chunk.item_id,
      "call_id:",
      chunk.call_id,
      "args:",
      chunk.arguments
    );
    // Use item_id (fc_...) to look up the tool call
    const itemId = chunk.item_id || chunk.call_id || "";
    if (itemId && chunk.arguments) {
      const existing = accumulator.toolCalls.get(itemId);
      if (existing) {
        existing.arguments = chunk.arguments;
        console.log(
          "[Tool Debug] Successfully updated arguments:",
          existing.arguments
        );
      } else {
        console.log(
          "[Tool Debug] WARNING: Tool call not found for item ID:",
          itemId,
          "Available keys:",
          Array.from(accumulator.toolCalls.keys())
        );
      }
    }
  }

  return result;
}

/**
 * Builds the final response from accumulated stream data
 */
export function buildResponseResponse(
  accumulator: StreamAccumulator
): LlmapiResponseResponse {
  const output: LlmapiResponseResponse["output"] = [];

  // Add thinking/reasoning output if present
  if (accumulator.thinking) {
    output.push({
      type: "reasoning",
      role: "assistant",
      content: [{ type: "output_text", text: accumulator.thinking }],
      status: "completed",
    });
  }

  // Add tool calls if present
  if (accumulator.toolCalls.size > 0) {
    for (const toolCall of accumulator.toolCalls.values()) {
      output.push({
        type: "function_call",
        call_id: toolCall.id,
        name: toolCall.name,
        arguments: toolCall.arguments,
        status: toolCall.status,
      });
    }
  }

  // Add the main message output
  output.push({
    type: "message",
    role: "assistant",
    content: [{ type: "output_text", text: accumulator.content }],
    status: "completed",
  });

  return {
    id: accumulator.responseId,
    model: accumulator.responseModel,
    object: "response",
    output,
    usage:
      Object.keys(accumulator.usage).length > 0 ? accumulator.usage : undefined,
  };
}

/**
 * Creates a validation error result
 */
export function createErrorResult<T extends { data: null; error: string }>(
  message: string,
  onError?: (error: Error) => void
): T {
  if (onError) {
    onError(new Error(message));
  }
  return { data: null, error: message } as T;
}

/**
 * Handles an error and returns an error result
 */
export function handleError<T extends { data: null; error: string }>(
  err: unknown,
  onError?: (error: Error) => void
): T {
  const errorMsg =
    err instanceof Error ? err.message : "Failed to send message.";
  const errorObj = err instanceof Error ? err : new Error(errorMsg);

  if (onError) {
    onError(errorObj);
  }
  return { data: null, error: errorMsg } as T;
}

/**
 * Checks if the error is an abort error
 */
export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

/**
 * Checks if an SSE chunk is a DONE marker
 */
export function isDoneMarker(chunk: unknown): boolean {
  if (typeof chunk === "string") {
    const trimmed = chunk.trim();
    return trimmed === "[DONE]" || trimmed.includes("[DONE]");
  }
  return false;
}

/**
 * Parses an SSE data line and returns the chunk if valid
 */
export function parseSSEDataLine(line: string): StreamingChunk | null {
  if (!line.startsWith("data: ")) {
    return null;
  }

  const data = line.substring(6).trim();
  if (data === "[DONE]") {
    return null;
  }

  try {
    return JSON.parse(data) as StreamingChunk;
  } catch {
    return null;
  }
}

/**
 * Creates a map of tool name to executor from tool configs
 * Handles both Completions format (function.name) and Responses format (name at top level)
 */
export function createToolExecutorMap(
  tools?: Array<LlmapiChatCompletionTool | ToolConfig | Record<string, unknown>>
): Map<string, { executor: ToolExecutor; autoExecute: boolean }> {
  const map = new Map<
    string,
    { executor: ToolExecutor; autoExecute: boolean }
  >();

  if (!tools) {
    return map;
  }

  for (const tool of tools) {
    // Handle both Completions format (function.name) and Responses format (name at top level)
    const toolName = (tool as any).function?.name || (tool as any).name;
    if (!toolName) continue;

    // Check if this is a tool with an executor
    const toolWithExecutor = tool as ToolConfig & Record<string, unknown>;
    if (toolWithExecutor.executor) {
      map.set(toolName, {
        executor: toolWithExecutor.executor as ToolExecutor,
        autoExecute: toolWithExecutor.autoExecute !== false, // Default to true
      });
    }
  }

  return map;
}

/**
 * Executes a tool call with the provided executor
 */
export async function executeToolCall(
  toolCall: AccumulatedToolCall,
  executor: ToolExecutor
): Promise<{ result?: unknown; error?: string }> {
  try {
    // Parse arguments
    console.log(
      "[Tool Debug] executeToolCall - raw arguments:",
      toolCall.arguments
    );
    let args: Record<string, unknown> = {};
    if (toolCall.arguments) {
      try {
        args = JSON.parse(toolCall.arguments);
        console.log("[Tool Debug] executeToolCall - parsed arguments:", args);
      } catch (e) {
        return {
          error: `Failed to parse tool arguments: ${
            e instanceof Error ? e.message : String(e)
          }`,
        };
      }
    } else {
      console.log("[Tool Debug] executeToolCall - no arguments provided");
    }

    // Execute the tool
    const result = await executor(args);
    return { result };
  } catch (e) {
    return {
      error: `Tool execution failed: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }
}

/**
 * Converts tool definitions to the format expected by the API (strips executors)
 * Handles both Completions format (function.name) and Responses format (name at top level)
 */
export function toolsToApiFormat(
  tools?: Array<LlmapiChatCompletionTool | ToolConfig | Record<string, unknown>>
): Array<Record<string, unknown>> | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  return tools.map((tool) => {
    // Strip executor, autoExecute, and removeAfterExecution properties (client-side only)
    const { executor, autoExecute, removeAfterExecution, ...apiTool } = tool as ToolConfig & Record<string, unknown>;
    return apiTool;
  });
}
