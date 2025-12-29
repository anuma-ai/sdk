import type {
  LlmapiMessage,
  LlmapiMessageContentPart,
  LlmapiResponseResponse,
  LlmapiTool,
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
 */
export function messagesToInput(messages: LlmapiMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role || "user";

      // Handle tool result messages - format them as system messages with tool results
      if (role === "tool") {
        const content = Array.isArray(msg.content)
          ? msg.content.map(extractTextFromContentPart).filter(Boolean).join("\n")
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
 * Creates an initial stream accumulator
 */
export function createStreamAccumulator(): StreamAccumulator {
  return {
    content: "",
    thinking: "",
    responseId: "",
    responseModel: "",
    usage: {},
    toolCalls: new Map(),
  };
}

/**
 * Result from processing a streaming chunk
 */
export type ProcessChunkResult = {
  /** Content delta (regular assistant response) */
  content: string | null;
  /** Thinking delta (reasoning/thinking content) */
  thinking: string | null;
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
  if (chunk.type === "response.completed" && chunk.response?.usage) {
    accumulator.usage = {
      ...accumulator.usage,
      prompt_tokens: chunk.response.usage.input_tokens,
      completion_tokens: chunk.response.usage.output_tokens,
      total_tokens:
        (chunk.response.usage.input_tokens || 0) +
        (chunk.response.usage.output_tokens || 0),
    };
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
        console.log("[Tool Debug] output_text.delta - adding text:", deltaText.substring(0, 50));
        accumulator.content += deltaText;
        result.content = deltaText;
      }
    }
  }

  // Handle tool call events
  // Event: response.output_item.added with type "function_call"
  if (chunk.type === "response.output_item.added" && chunk.item) {
    // Debug logging
    console.log("[Tool Debug] output_item.added:", JSON.stringify(chunk.item, null, 2));

    if (chunk.item.type === "message") {
      console.log("[Tool Debug] Message output item added - ready to receive text deltas");
    }

    if (chunk.item.type === "function_call") {
      // Use item.id (fc_...) as the primary key since that's what arguments events use
      const itemId = chunk.item.id || "";
      const callId = chunk.item.call_id || "";

      if (itemId && chunk.item.name) {
        console.log("[Tool Debug] Detected tool call:", chunk.item.name, "item ID:", itemId, "call ID:", callId);
        accumulator.toolCalls.set(itemId, {
          id: callId || itemId, // Use call_id for the tool call ID
          type: "function",
          name: chunk.item.name,
          arguments: chunk.item.arguments || "",
          status: "pending",
        });
      }
    }
  }

  // Event: response.function_call_arguments.delta - streaming arguments (note: underscore, not dot)
  if (chunk.type === "response.function_call_arguments.delta") {
    console.log("[Tool Debug] Arguments delta event - item_id:", chunk.item_id, "call_id:", chunk.call_id, "args length:", chunk.arguments?.length);
    // Use item_id (fc_...) to look up the tool call
    const itemId = chunk.item_id || chunk.call_id || "";
    if (itemId && chunk.arguments) {
      const existing = accumulator.toolCalls.get(itemId);
      if (existing) {
        existing.arguments += chunk.arguments;
      } else {
        console.log("[Tool Debug] WARNING: Tool call not found for item ID:", itemId, "Available keys:", Array.from(accumulator.toolCalls.keys()));
      }
    }
  }

  // Event: response.function_call_arguments.done - arguments complete (note: underscore, not dot)
  if (chunk.type === "response.function_call_arguments.done") {
    console.log("[Tool Debug] Arguments done event - item_id:", chunk.item_id, "call_id:", chunk.call_id, "args:", chunk.arguments);
    // Use item_id (fc_...) to look up the tool call
    const itemId = chunk.item_id || chunk.call_id || "";
    if (itemId && chunk.arguments) {
      const existing = accumulator.toolCalls.get(itemId);
      if (existing) {
        existing.arguments = chunk.arguments;
        console.log("[Tool Debug] Successfully updated arguments:", existing.arguments);
      } else {
        console.log("[Tool Debug] WARNING: Tool call not found for item ID:", itemId, "Available keys:", Array.from(accumulator.toolCalls.keys()));
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
      Object.keys(accumulator.usage).length > 0
        ? accumulator.usage
        : undefined,
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
 */
export function createToolExecutorMap(
  tools?: Array<LlmapiTool | ToolConfig>
): Map<string, { executor: ToolExecutor; autoExecute: boolean }> {
  const map = new Map<string, { executor: ToolExecutor; autoExecute: boolean }>();

  if (!tools) {
    return map;
  }

  for (const tool of tools) {
    const toolName = tool.function?.name;
    if (!toolName) continue;

    // Check if this is a ToolConfig with an executor
    const toolConfig = tool as ToolConfig;
    if (toolConfig.executor) {
      map.set(toolName, {
        executor: toolConfig.executor,
        autoExecute: toolConfig.autoExecute !== false, // Default to true
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
    console.log("[Tool Debug] executeToolCall - raw arguments:", toolCall.arguments);
    let args: Record<string, unknown> = {};
    if (toolCall.arguments) {
      try {
        args = JSON.parse(toolCall.arguments);
        console.log("[Tool Debug] executeToolCall - parsed arguments:", args);
      } catch (e) {
        return {
          error: `Failed to parse tool arguments: ${e instanceof Error ? e.message : String(e)}`,
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
      error: `Tool execution failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Converts tool definitions to the format expected by the API (strips executors)
 */
export function toolsToApiFormat(
  tools?: Array<LlmapiTool | ToolConfig>
): LlmapiTool[] | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  return tools.map((tool) => {
    // Strip executor and autoExecute properties
    const { executor, autoExecute, ...apiTool } = tool as ToolConfig;
    return apiTool as LlmapiTool;
  });
}
