import type { LlmapiChatCompletionTool, LlmapiMessage } from "../../../client";
import type { AccumulatedToolCall, StreamAccumulator, ToolConfig, ToolExecutor } from "./types";

/**
 * Validation error types
 */
type ValidationError =
  | "messages_required"
  | "model_required"
  | "token_getter_required"
  | "token_unavailable";

/**
 * Validation result
 */
type ValidationResult = { valid: true } | { valid: false; error: ValidationError; message: string };

/**
 * Error messages for validation errors
 */
const VALIDATION_ERROR_MESSAGES: Record<ValidationError, string> = {
  messages_required: "messages are required to call sendMessage.",
  model_required: "model is required to call sendMessage.",
  token_getter_required: "Token getter function is required.",
  token_unavailable: "No access token available.",
};

/**
 * Validates that messages are provided
 */
export function validateMessages(messages: LlmapiMessage[] | undefined): ValidationResult {
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
 * Result from parsing reasoning tags from content
 */
type ReasoningParseResult = {
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
    detectedFormat || detectTagFormat(content, previousPartialTag) || REASONING_TAG_FORMATS[0];

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
    const hasClosingTag = REASONING_TAG_FORMATS.some((fmt) => fullContent.includes(fmt.close));
    const hasOpeningTag = REASONING_TAG_FORMATS.some((fmt) => fullContent.includes(fmt.open));

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
    } else if (wasInsideReasoning && CLOSING_TAG.startsWith(previousPartialTag)) {
      // Inside reasoning and partial could be start of closing tag - check closing tag first
      if (fullContent.startsWith(CLOSING_TAG)) {
        // Complete closing tag
        i = CLOSING_TAG_LEN;
        insideReasoning = false;
      } else if (
        CLOSING_TAG.startsWith(fullContent.slice(0, Math.min(CLOSING_TAG_LEN, fullContent.length)))
      ) {
        // Still incomplete - we're inside reasoning waiting for close
        return {
          messageContent: "",
          reasoningContent: "",
          partialTag: fullContent.slice(0, Math.min(CLOSING_TAG_LEN, fullContent.length)),
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
        OPENING_TAG.startsWith(fullContent.slice(0, Math.min(OPENING_TAG_LEN, fullContent.length)))
      ) {
        // Still incomplete - preserve wasInsideReasoning state
        return {
          messageContent: "",
          reasoningContent: "",
          partialTag: fullContent.slice(0, Math.min(OPENING_TAG_LEN, fullContent.length)),
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
    if (messageContent.includes(tagFormat.open) || messageContent.includes(tagFormat.close)) {
      console.warn("[parseReasoningTags] Warning: Tag found in messageContent, removing");
      messageContent = messageContent.replace(
        new RegExp(tagFormat.open.replace(/[<>/]/g, "\\$&"), "g"),
        ""
      );
      messageContent = messageContent.replace(
        new RegExp(tagFormat.close.replace(/[<>/]/g, "\\$&"), "g"),
        ""
      );
    }
    if (reasoningContent.includes(tagFormat.open) || reasoningContent.includes(tagFormat.close)) {
      console.warn("[parseReasoningTags] Warning: Tag found in reasoningContent, removing");
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
export function createStreamAccumulator(initialModel?: string): StreamAccumulator {
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
 * Creates a map of tool name to executor from tool configs
 * Handles both Completions format (function.name) and Responses format (name at top level)
 */
export function createToolExecutorMap(
  tools?: Array<LlmapiChatCompletionTool | ToolConfig | Record<string, unknown>>
): Map<string, { executor: ToolExecutor; skipContinuation: boolean; executorTimeout?: number }> {
  const map = new Map<
    string,
    { executor: ToolExecutor; skipContinuation: boolean; executorTimeout?: number }
  >();

  if (!tools) {
    return map;
  }

  for (const tool of tools) {
    // Handle both Completions format (function.name) and Responses format (name at top level)
    const toolName: string | undefined = (tool as any).function?.name || (tool as any).name;
    if (!toolName) continue;

    // Check if this is a tool with an executor
    const toolWithExecutor = tool as ToolConfig & Record<string, unknown>;
    if (toolWithExecutor.executor) {
      map.set(toolName, {
        executor: toolWithExecutor.executor,
        skipContinuation: toolWithExecutor.skipContinuation === true, // Default to false
        ...(toolWithExecutor.executorTimeout !== undefined && {
          executorTimeout: toolWithExecutor.executorTimeout,
        }),
      });
    }
  }

  return map;
}

/** Default timeout for tool executor calls (30 seconds). */
const TOOL_EXECUTOR_TIMEOUT_MS = 30_000;

/** Sentinel error for tool execution timeouts. */
class ToolTimeoutError extends Error {
  constructor() {
    super("Tool execution timed out");
    this.name = "ToolTimeoutError";
  }
}

/**
 * Safely serializes a value to JSON, returning a fallback string on failure
 * (e.g. circular references, BigInt, or non-serializable types).
 */
export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "null";
  } catch {
    return String(value);
  }
}

export type ToolExecutionErrorType = "parse" | "timeout" | "execution";

export type ToolExecutionResult = {
  result?: unknown;
  error?: string;
  /** Distinguishes parse errors, timeouts, and execution failures. */
  errorType?: ToolExecutionErrorType;
};

/**
 * Executes a tool call with the provided executor.
 * Applies a timeout (default 30s) to prevent hanging executors from blocking the loop.
 * Pass `Infinity` as timeoutMs to disable the timeout (e.g. for interactive tools).
 */
export async function executeToolCall(
  toolCall: AccumulatedToolCall,
  executor: ToolExecutor,
  timeoutMs: number = TOOL_EXECUTOR_TIMEOUT_MS
): Promise<ToolExecutionResult> {
  // Parse arguments
  let args: Record<string, unknown> = {};
  if (toolCall.arguments) {
    try {
      args = JSON.parse(toolCall.arguments);
    } catch (e) {
      return {
        error: `Failed to parse tool arguments: ${e instanceof Error ? e.message : String(e)}`,
        errorType: "parse",
      };
    }
  }

  try {
    // Execute the tool, optionally with a timeout
    if (!isFinite(timeoutMs)) {
      return { result: await executor(args) };
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        executor(args),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new ToolTimeoutError()), timeoutMs);
        }),
      ]);
      return { result };
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      error: `Tool execution failed: ${message}`,
      errorType: e instanceof ToolTimeoutError ? "timeout" : "execution",
    };
  }
}

/**
 * Converts tool definitions to the format expected by the API (strips executors)
 * Handles both Completions format (function.name) and Responses format (name at top level)
 */
export function toolsToApiFormat(
  tools?: Array<LlmapiChatCompletionTool | ToolConfig | Record<string, unknown>>,
  apiType?: string
): Array<Record<string, unknown>> | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  return tools.map((tool) => {
    // Strip client-side-only properties before sending to API
    const {
      executor: _executor,
      skipContinuation: _skipContinuation,
      removeAfterExecution: _removeAfterExecution,
      executorTimeout: _executorTimeout,
      ...apiTool
    } = tool as ToolConfig & Record<string, unknown>;

    const func = (apiTool as Record<string, unknown>).function as
      | Record<string, unknown>
      | undefined;

    // Detect flat-format tools (name at top level, no function wrapper)
    const flatName = !func && (apiTool as any).name;

    // Normalize tool format based on API type
    if (apiType === "responses") {
      if (func) {
        // Nested → flat for Responses API
        const { name, description, parameters, arguments: args, ...restFunc } = func;
        return {
          type: "function",
          name: name as string,
          description: description as string,
          parameters: (parameters || args) as Record<string, unknown>,
          ...restFunc,
        };
      }
      // Already flat — pass through
      return apiTool;
    }

    if (apiType === "completions") {
      if (flatName) {
        // Flat → nested for Completions API
        const { type: _type, name, description, parameters, ...rest } = apiTool as any;
        return {
          type: "function",
          ...rest,
          function: { name, description, parameters },
        };
      }
      if (func && !func.parameters && func.arguments) {
        // Completions API expects function.parameters, convert from arguments
        const { arguments: args, ...restFunc } = func;
        return {
          ...apiTool,
          function: { ...restFunc, parameters: args },
        };
      }
    }

    return apiTool;
  });
}
