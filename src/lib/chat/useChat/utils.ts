import { jsonrepair } from "jsonrepair";

import type { LlmapiChatCompletionTool, LlmapiMessage } from "../../../client";
import { getLogger } from "../../logger";
import type { AccumulatedToolCall, StreamAccumulator, ToolConfig, ToolExecutor } from "./types";

function parseToolArguments(raw: string): { args: Record<string, unknown> } | { error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { args: parsed as Record<string, unknown> };
    }
    return {
      error: `Tool arguments must be a JSON object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`,
    };
  } catch (e) {
    const originalError = e instanceof Error ? e.message : String(e);
    try {
      const repaired = jsonrepair(raw);
      const parsed = JSON.parse(repaired) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { args: parsed as Record<string, unknown> };
      }
      return {
        error: `Tool arguments (after repair) must be a JSON object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`,
      };
    } catch {
      return { error: `Failed to parse tool arguments: ${originalError}` };
    }
  }
}

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

const REASONING_TAG_FORMATS = [
  { open: "<reasoning>", close: "</reasoning>" },
  { open: "<think>", close: "</think>" },
] as const;

function detectTagFormat(
  content: string,
  partialTag: string
): (typeof REASONING_TAG_FORMATS)[number] | null {
  const combined = partialTag + content;

  for (const format of REASONING_TAG_FORMATS) {
    if (
      combined.includes(format.open) ||
      combined.includes(format.close) ||
      format.open.startsWith(combined.slice(0, format.open.length)) ||
      format.close.startsWith(combined.slice(0, format.close.length))
    ) {
      return format;
    }
  }

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
  const format =
    detectedFormat || detectTagFormat(content, previousPartialTag) || REASONING_TAG_FORMATS[0];

  const OPENING_TAG = format.open;
  const CLOSING_TAG = format.close;
  const OPENING_TAG_LEN = OPENING_TAG.length;
  const CLOSING_TAG_LEN = CLOSING_TAG.length;

  const fullContent = previousPartialTag + content;
  let messageContent = "";
  let reasoningContent = "";
  let partialTag = "";
  let i = 0;
  let insideReasoning = wasInsideReasoning;
  let implicitReasoningStart = wasImplicitReasoningStart;

  if (implicitReasoningStart === undefined) {
    const hasClosingTag = REASONING_TAG_FORMATS.some((fmt) => fullContent.includes(fmt.close));
    const hasOpeningTag = REASONING_TAG_FORMATS.some((fmt) => fullContent.includes(fmt.open));

    if (hasClosingTag && !hasOpeningTag) {
      implicitReasoningStart = true;
      insideReasoning = true;
    } else if (hasOpeningTag) {
      implicitReasoningStart = false;
    }
  } else if (implicitReasoningStart === true) {
    insideReasoning = wasInsideReasoning;
  }

  if (previousPartialTag) {
    if (previousPartialTag === OPENING_TAG) {
      insideReasoning = true;
      i = OPENING_TAG_LEN;
    } else if (previousPartialTag === CLOSING_TAG) {
      i = CLOSING_TAG_LEN;
      insideReasoning = false;
    } else if (wasInsideReasoning && CLOSING_TAG.startsWith(previousPartialTag)) {
      if (fullContent.startsWith(CLOSING_TAG)) {
        i = CLOSING_TAG_LEN;
        insideReasoning = false;
      } else if (
        CLOSING_TAG.startsWith(fullContent.slice(0, Math.min(CLOSING_TAG_LEN, fullContent.length)))
      ) {
        return {
          messageContent: "",
          reasoningContent: "",
          partialTag: fullContent.slice(0, Math.min(CLOSING_TAG_LEN, fullContent.length)),
          insideReasoning: true,
          implicitReasoningStart,
        };
      } else {
        reasoningContent = previousPartialTag;
        i = previousPartialTag.length;
        insideReasoning = true;
      }
    } else if (OPENING_TAG.startsWith(previousPartialTag)) {
      if (fullContent.startsWith(OPENING_TAG)) {
        insideReasoning = true;
        i = OPENING_TAG_LEN;
      } else if (
        OPENING_TAG.startsWith(fullContent.slice(0, Math.min(OPENING_TAG_LEN, fullContent.length)))
      ) {
        return {
          messageContent: "",
          reasoningContent: "",
          partialTag: fullContent.slice(0, Math.min(OPENING_TAG_LEN, fullContent.length)),
          insideReasoning: wasInsideReasoning,
          implicitReasoningStart,
        };
      } else {
        if (wasInsideReasoning) {
          reasoningContent = previousPartialTag;
        } else {
          messageContent = previousPartialTag;
        }
        i = previousPartialTag.length;
      }
    } else {
      if (wasInsideReasoning) {
        reasoningContent = previousPartialTag;
      } else {
        messageContent = previousPartialTag;
      }
      i = previousPartialTag.length;
    }
  }

  while (i < fullContent.length) {
    if (insideReasoning) {
      const closeIndex = fullContent.indexOf(CLOSING_TAG, i);

      if (closeIndex === -1) {
        const remaining = fullContent.slice(i);
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

      const contentBeforeClose = fullContent.slice(i, closeIndex);
      if (contentBeforeClose) {
        reasoningContent += contentBeforeClose;
      }
      i = closeIndex + CLOSING_TAG_LEN;
      insideReasoning = false;
    } else {
      const openIndex = fullContent.indexOf(OPENING_TAG, i);

      if (openIndex === -1) {
        const remaining = fullContent.slice(i);
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

      messageContent += fullContent.slice(i, openIndex);
      i = openIndex + OPENING_TAG_LEN;
      insideReasoning = true;
    }
  }

  for (const tagFormat of REASONING_TAG_FORMATS) {
    if (messageContent.includes(tagFormat.open) || messageContent.includes(tagFormat.close)) {
      getLogger().warn("[parseReasoningTags] Warning: Tag found in messageContent, removing");
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
      getLogger().warn("[parseReasoningTags] Warning: Tag found in reasoningContent, removing");
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

function isImplicitReasoningModel(modelName?: string): boolean {
  if (!modelName) return false;
  const lowerModel = modelName.toLowerCase();
  return lowerModel.includes("qwen") && lowerModel.includes("thinking");
}

/**
 * Creates an initial stream accumulator
 * @param initialModel - Optional model name to initialize with (from request)
 */
export function createStreamAccumulator(initialModel?: string): StreamAccumulator {
  const implicitReasoning = isImplicitReasoningModel(initialModel);

  return {
    content: "",
    thinking: "",
    responseId: "",
    responseModel: initialModel || "",
    usage: {},
    toolCalls: new Map(),
    partialReasoningTag: "",
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
/** Event emitted when tool call arguments are being streamed. */
export type ToolCallArgumentsDeltaEvent = {
  toolCallId: string;
  toolName: string;
  argumentsDelta: string;
  accumulatedArguments: string;
};

export type ProcessChunkResult = {
  /** Content delta (regular assistant response) */
  content: string | null;
  /** Thinking delta (reasoning/thinking content) */
  thinking: string | null;
  /** Server tool call event (for activity indicators) */
  serverToolCall?: ServerToolCallEvent;
  /** Tool call arguments delta (for streaming artifact preview) */
  toolCallArgumentsDelta?: ToolCallArgumentsDeltaEvent;
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
 * Checks if an SSE chunk is an in-stream error event from Bifrost.
 *
 * Some providers (OpenRouter Qwen, MiniMax) keep the HTTP connection open on
 * an upstream timeout and emit a structured error *inside* the stream instead
 * of returning a 5xx. Shape:
 *
 *   { "error": { "message": "...", "type": "timeout_error", "code": "timeout",
 *                "trace_id": "...", "request_id": "..." } }
 *
 * If we don't detect this, the stream just ends silently with no tool call
 * and no usable response. Detecting it lets the strategy throw, which the
 * tool loop surfaces as a normal error to the caller.
 */
export function getInStreamErrorMessage(chunk: unknown): string | null {
  if (!chunk || typeof chunk !== "object") return null;
  const obj = chunk as { error?: unknown };
  const err = obj.error;
  if (!err || typeof err !== "object") return null;
  const e = err as { message?: unknown; type?: unknown; code?: unknown; trace_id?: unknown };
  const message = typeof e.message === "string" ? e.message : "";
  const type = typeof e.type === "string" ? e.type : "";
  const code = typeof e.code === "string" ? e.code : "";
  const traceId = typeof e.trace_id === "string" ? e.trace_id : "";
  if (!message && !type && !code) return null;
  const parts: string[] = [];
  if (type) parts.push(type);
  if (code && code !== type) parts.push(code);
  const label = parts.length > 0 ? `[${parts.join(" ")}] ` : "";
  const fallback = message || type || code || "in-stream error";
  const traced = traceId ? ` (trace_id: ${traceId})` : "";
  return `${label}${fallback}${traced}`;
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
): Map<
  string,
  {
    executor: ToolExecutor;
    skipContinuation: boolean;
    executorTimeout?: number;
    dependsOn?: string[];
    deAnonymizeArgs?: boolean;
  }
> {
  const map = new Map<
    string,
    {
      executor: ToolExecutor;
      skipContinuation: boolean;
      executorTimeout?: number;
      dependsOn?: string[];
      deAnonymizeArgs?: boolean;
    }
  >();

  if (!tools) {
    return map;
  }

  for (const tool of tools) {
    const func = (tool as Record<string, unknown>).function as Record<string, unknown> | undefined;
    const toolName: string | undefined =
      typeof func?.name === "string"
        ? func.name
        : typeof (tool as Record<string, unknown>).name === "string"
          ? ((tool as Record<string, unknown>).name as string)
          : undefined;
    if (!toolName) continue;

    const toolWithExecutor = tool as ToolConfig & Record<string, unknown>;
    if (toolWithExecutor.executor) {
      map.set(toolName, {
        executor: toolWithExecutor.executor,
        skipContinuation: toolWithExecutor.skipContinuation === true,
        ...(toolWithExecutor.executorTimeout !== undefined && {
          executorTimeout: toolWithExecutor.executorTimeout,
        }),
        ...(toolWithExecutor.dependsOn && { dependsOn: toolWithExecutor.dependsOn }),
        ...(toolWithExecutor.deAnonymizeArgs && { deAnonymizeArgs: true }),
      });
    }
  }

  return map;
}

const TOOL_EXECUTOR_TIMEOUT_MS = 30_000;

/** Sentinel error for tool execution timeouts. */
class ToolTimeoutError extends Error {
  constructor() {
    super("Tool execution timed out");
    this.name = "ToolTimeoutError";
  }
}

/** Sentinel error for tool calls cancelled through an abort signal. */
class ToolCancelledError extends Error {
  constructor() {
    super("Tool execution cancelled");
    this.name = "ToolCancelledError";
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

export type ToolExecutionErrorType = "parse" | "timeout" | "execution" | "cancelled";

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
 * When `signal` aborts, the call stops waiting and returns a "cancelled" error
 * result. The executor receives the signal so it can release its own resources;
 * it is not interrupted otherwise, so a tool that never settles
 * (an interactive prompt) cannot keep the caller parked after the user cancels.
 */
export async function executeToolCall(
  toolCall: AccumulatedToolCall,
  executor: ToolExecutor,
  timeoutMs: number = TOOL_EXECUTOR_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<ToolExecutionResult> {
  let args: Record<string, unknown> = {};
  if (toolCall.arguments) {
    const parsed = parseToolArguments(toolCall.arguments);
    if ("error" in parsed) {
      return { error: parsed.error, errorType: "parse" };
    }
    args = parsed.args;
  }

  if (signal?.aborted) {
    return { error: "Tool execution cancelled", errorType: "cancelled" };
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    const racers: Promise<unknown>[] = [];
    if (signal) {
      racers.push(
        new Promise<never>((_, reject) => {
          onAbort = () => reject(new ToolCancelledError());
          signal.addEventListener("abort", onAbort, { once: true });
        })
      );
    }
    racers.push(Promise.resolve(signal ? executor(args, signal) : executor(args)));
    if (isFinite(timeoutMs)) {
      racers.push(
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new ToolTimeoutError()), timeoutMs);
        })
      );
    }
    return { result: await Promise.race(racers) };
  } catch (e) {
    if (e instanceof ToolCancelledError) {
      return { error: "Tool execution cancelled", errorType: "cancelled" };
    }
    const message = e instanceof Error ? e.message : String(e);
    return {
      error: `Tool execution failed: ${message}`,
      errorType: e instanceof ToolTimeoutError ? "timeout" : "execution",
    };
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
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

  return tools.map((tool): Record<string, unknown> => {
    const {
      executor: _executor,
      skipContinuation: _skipContinuation,
      removeAfterExecution: _removeAfterExecution,
      removeAfterResult: _removeAfterResult,
      executorTimeout: _executorTimeout,
      dependsOn: _dependsOn,
      deAnonymizeArgs: _deAnonymizeArgs,
      ...apiTool
    } = tool as ToolConfig & Record<string, unknown>;

    const func = (apiTool as Record<string, unknown>).function as
      | Record<string, unknown>
      | undefined;

    const flatName =
      !func && typeof (apiTool as Record<string, unknown>).name === "string"
        ? ((apiTool as Record<string, unknown>).name as string)
        : undefined;

    if (apiType === "responses") {
      if (func) {
        const { name, description, parameters, arguments: args, ...restFunc } = func;
        return {
          type: "function",
          name: name as string,
          description: description as string,
          parameters: (parameters || args) as Record<string, unknown>,
          ...restFunc,
        };
      }
      return apiTool;
    }

    if (apiType === "completions") {
      if (flatName) {
        const {
          type: _type,
          name,
          description,
          parameters,
          ...rest
        } = apiTool as Record<string, unknown>;
        return {
          type: "function",
          ...rest,
          function: { name, description, parameters },
        } as Record<string, unknown>;
      }
      if (func && !func.parameters && func.arguments) {
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
