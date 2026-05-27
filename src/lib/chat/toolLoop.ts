import type {
  LlmapiChatCompletionTool,
  LlmapiMessage,
  LlmapiResponseReasoning,
  LlmapiThinkingOptions,
  LlmapiToolCall,
} from "../../client";
import { createSseClient } from "../../client/core/serverSentEvents.gen";
import { BASE_URL } from "../../clientConfig";
import { generateEmbedding } from "../memoryEngine/embeddings";
import type { PromptPreProcessor } from "./preProcessor";
import type {
  ModelCallEndEvent,
  ModelCallStartEvent,
  RunEndEvent,
  RunErrorEvent,
  RunHooks,
  ToolUseEndEvent,
  ToolUseStartEvent,
} from "./runHooks";
import { composeHooks } from "./runHooks";

/**
 * Fire-and-forget hook invocation. Takes a thunk so synchronous throws
 * during the hook call itself are caught alongside async rejections —
 * passing the call's return value directly would let a sync throw escape
 * before the try/catch wraps it.
 */
async function safeAwait(fn: () => unknown): Promise<void> {
  try {
    // `await` on a non-thenable just resolves to the value, so this
    // works whether the hook is sync, async, or omitted (returns undefined).
    await fn();
  } catch {
    /* observer error, swallow */
  }
}

/** Generate a run ID. Uses crypto.randomUUID when available, falls back to a random hex string. */
function generateRunId(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  return (
    Math.random().toString(16).slice(2).padStart(12, "0") +
    Math.random().toString(16).slice(2).padStart(12, "0")
  );
}

/** Try to JSON.parse tool arguments. Returns undefined if not valid JSON. */
function tryParseToolArgs(raw: string): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  } catch {
    /* not JSON, ignore */
  }
  return undefined;
}

/**
 * Error thrown when the SSE connection receives a non-OK HTTP response.
 * Preserves the HTTP status code for programmatic error handling.
 */
class SseError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "SseError";
    this.statusCode = statusCode;
  }
}

function parseStatusCode(message: string): number | undefined {
  const match = message.match(/^SSE failed: (\d+) /);
  return match ? Number(match[1]) : undefined;
}

function wrapSseError(error: unknown): Error {
  if (error instanceof Error) {
    const statusCode = parseStatusCode(error.message);
    if (statusCode !== undefined) {
      return new SseError(statusCode, error.message);
    }
    return error;
  }
  return new Error(String(error));
}

/**
 * Defaults for transport-level retry on a single streaming round. We
 * retry ONLY when the failure happens before any chunk has been
 * processed downstream — once data has reached the smoothers /
 * accumulator / user callbacks, re-running the request would risk
 * duplicated or contradictory output (the upstream LLM is stochastic;
 * a retry would emit different content). Backoff is exponential-ish
 * with a small cap so a real outage doesn't hang the loop for half an
 * hour.
 *
 * Two schedules: rate-limited (429) gets longer backoffs because the
 * server is telling us to slow down — retrying in 500ms three times
 * burns round-trips and almost always fails again. We can't read the
 * actual Retry-After header (the SSE client lives in a generated file
 * that throws a stringified error), but a 5/15/30s schedule is a sane
 * default for a portal that occasionally rate-limits. Transient
 * transport failures (5xx, terminated, ECONNRESET) stay on the fast
 * schedule so a momentary blip doesn't add seconds of latency.
 */
const STREAM_RETRY_MAX_ATTEMPTS = 3;
const STREAM_RETRY_BACKOFF_MS: readonly number[] = [500, 2000, 5000];
const RATE_LIMIT_RETRY_BACKOFF_MS: readonly number[] = [5000, 15000, 30000];

/**
 * Pick a backoff for `attempt` (0-based) based on the error's
 * rate-limit classification. 429 errors get the longer schedule; all
 * other retriable errors get the fast schedule.
 */
function backoffForRetry(attempt: number, err: unknown): number {
  const schedule = isRateLimitedStreamError(err)
    ? RATE_LIMIT_RETRY_BACKOFF_MS
    : STREAM_RETRY_BACKOFF_MS;
  return schedule[attempt] ?? schedule[schedule.length - 1] ?? 1000;
}

/**
 * Extract an HTTP status code from a stream error, preferring the
 * SseError.statusCode field and falling back to a loose "SSE failed:
 * NNN" match on the (potentially re-wrapped) message string. Returns
 * undefined if no status can be inferred — message-only heuristics
 * like "terminated" are handled by their respective predicates.
 */
function getHttpStatusCode(err: Error): number | undefined {
  if (err instanceof SseError) return err.statusCode;
  const match = err.message.toLowerCase().match(/sse failed: (\d+)/);
  return match ? Number(match[1]) : undefined;
}

/** True iff `err` represents a 429 Too Many Requests response. */
function isRateLimitedStreamError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return getHttpStatusCode(err) === 429;
}

/**
 * Sleep for `ms` milliseconds; resolves immediately when the signal is
 * aborted so backoff doesn't hold up a cancellation.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const onAbort = () => {
      clearTimeout(t);
      resolve();
    };
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Predicate for "this streaming-round error is worth retrying."
 *
 * Conservative: includes 5xx/408/429 HTTP errors, undici's `terminated`
 * (TCP reset / unexpected close), and Node-level network failures
 * (ECONNRESET, ETIMEDOUT, "connect error"). Excludes abort errors
 * (user cancelled), 4xx other than 408/429 (validation / auth — retry
 * won't help), and ProviderStreamError (an in-band model timeout — the
 * same prompt would likely time out the same way on a retry, so we
 * surface the real cause instead of burning round-trips).
 */
function isRetriableStreamError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (isAbortError(err)) return false;

  // ProviderStreamError is NOT retried: it represents an in-band error
  // chunk emitted by the upstream provider (e.g. "the model timed out
  // generating a response"). The same prompt is likely to time out the
  // same way on a retry — better to surface the real cause immediately
  // so the caller knows the failure is at the model level, not the
  // transport. Without this explicit guard, a provider that emits
  // `{error: "terminated"}` would build a ProviderStreamError whose
  // message matches the undici-`terminated` heuristic below and get
  // retried anyway.
  if (err instanceof ProviderStreamError) return false;

  const code = getHttpStatusCode(err);
  if (code !== undefined) {
    return code === 408 || code === 429 || (code >= 500 && code < 600);
  }

  const msg = (err.message ?? "").toLowerCase();
  if (msg === "terminated") return true;
  if (msg.includes("econnreset") || msg.includes("etimedout")) return true;
  if (msg.includes("connection refused") || msg.includes("connect error")) return true;
  return false;
}

/**
 * Error thrown when an upstream provider emits an in-stream error event.
 * Carries the provider's code (e.g. `"timeout"`) so callers can match
 * programmatically via `err instanceof ProviderStreamError && err.code === "timeout"`
 * instead of string-matching the message.
 */
export class ProviderStreamError extends Error {
  readonly code: string | undefined;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ProviderStreamError";
    this.code = code;
  }
}

/**
 * Extract a provider-supplied error object from an SSE data chunk, if present.
 *
 * Some upstream providers (e.g. Fireworks, via our portal) end a stream by
 * emitting a normal `data: {"error": {...}}` event instead of raising an HTTP
 * error or closing the connection abnormally. Those chunks pass right through
 * the strategy's processStreamChunk (which only looks at content/tool deltas)
 * and the stream finishes cleanly with empty content — so the client shows a
 * generic "no response" error instead of the real cause (typically a provider
 * timeout). Detecting the shape here lets us surface the real message.
 *
 * Accepts either `{error: "..."}` or `{error: {code?, message?}}`.
 */
function extractProviderStreamError(chunk: unknown): ProviderStreamError | null {
  if (!chunk || typeof chunk !== "object") return null;
  const errField = (chunk as { error?: unknown }).error;
  if (!errField) return null;
  if (typeof errField === "string") return new ProviderStreamError(errField);
  if (typeof errField === "object") {
    const err = errField as { code?: unknown; message?: unknown };
    const code = typeof err.code === "string" ? err.code : undefined;
    const message = typeof err.message === "string" ? err.message : undefined;
    if (!code && !message) return null;
    if (code === "timeout") {
      return new ProviderStreamError(
        message ?? "The model provider timed out before returning a response. Please try again.",
        code
      );
    }
    return new ProviderStreamError(message ?? `Provider error: ${code}`, code);
  }
  return null;
}
import { getStrategy, resolveApiType } from "./useChat/strategies";
import type { ApiResponse, ApiType } from "./useChat/strategies/types";
import type { StreamSmoothingConfig } from "./useChat/StreamSmoother";
import { StreamSmoother } from "./useChat/StreamSmoother";
import type { AccumulatedToolCall, ToolConfig } from "./useChat/types";
import type {
  ServerToolCallEvent,
  ToolCallArgumentsDeltaEvent,
  ToolExecutionErrorType,
} from "./useChat/utils";
import {
  createStreamAccumulator,
  createToolExecutorMap,
  executeToolCall,
  isAbortError,
  isDoneMarker,
  safeJsonStringify,
  toolsToApiFormat,
  validateMessages,
  validateModel,
} from "./useChat/utils";

const CONNECTOR_PREFIXES = ["notion-", "google_calendar_", "google_drive_"];

const REQUEST_PROBE_ENCODER = new TextEncoder();

function measureRequest(
  round: number,
  attempt: number,
  body: Record<string, unknown>,
  messages: LlmapiMessage[],
  tools: LlmapiChatCompletionTool[] | undefined
): RequestEvent {
  const bodyBytes = REQUEST_PROBE_ENCODER.encode(JSON.stringify(body)).length;
  const messagesBytes = REQUEST_PROBE_ENCODER.encode(JSON.stringify(messages)).length;
  const toolsBytes = tools?.length ? REQUEST_PROBE_ENCODER.encode(JSON.stringify(tools)).length : 0;
  return {
    round,
    attempt,
    messageCount: messages.length,
    toolCount: tools?.length ?? 0,
    bodyBytes,
    messagesBytes,
    toolsBytes,
  };
}

/** Extract the text of the most recent user message. Empty string if none. */
function extractLastUserText(messages: LlmapiMessage[]): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return "";
  const content = lastUserMsg.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c) => c?.type === "text")
      .map((c) => c.text ?? "")
      .join(" ");
  }
  return "";
}

/** Check if a tool result is an error object returned by the executor (e.g. `{ error: "..." }`). */
function isToolErrorResult(result: unknown): boolean {
  return (
    result !== null &&
    typeof result === "object" &&
    "error" in result &&
    typeof (result as { error: unknown }).error === "string"
  );
}

/** Extract tool name from either nested (function.name) or flat (name) format. */
function getToolName(tool: Record<string, unknown>): string | undefined {
  const func = tool.function as Record<string, unknown> | undefined;
  const nestedName = func?.name;
  if (typeof nestedName === "string") return nestedName;
  const flatName = tool.name;
  if (typeof flatName === "string") return flatName;
  return undefined;
}

/** A tool result from an auto-executed tool. */
export type AutoExecutedToolResult = {
  name: string;
  result: unknown;
};

/**
 * Information emitted immediately before each LLM request is dispatched.
 *
 * Useful for measuring tool-loop cost: how many round-trips a flow takes,
 * how much of the request body is the (often-redundant) tool catalog, and
 * how the message history grows across continuation rounds. Emitting is
 * gated on the caller providing `onRequest`, so the serialization cost is
 * opt-in.
 */
export type RequestEvent = {
  /**
   * 0 for the initial request; 1+ for each continuation request following a
   * tool round. NOT unique across calls when transport-level retries fire —
   * each retry attempt reuses the same `round` value. Pair with `attempt`
   * to deduplicate: `attempt === 0` is the first dispatch of a round,
   * `attempt > 0` is a retry.
   */
  round: number;
  /**
   * 0 for the first dispatch of a `round`; 1+ for each transport-level
   * retry of the same round (see `onStreamRetry`). Use this to deduplicate
   * `onRequest` events for per-round cost accounting — counting only
   * `attempt === 0` gives one event per logical round.
   */
  attempt: number;
  /** Number of messages in the request body. */
  messageCount: number;
  /** Number of tool schemas in the request body. */
  toolCount: number;
  /** UTF-8 byte length of the full serialized request body. */
  bodyBytes: number;
  /** UTF-8 byte length of the serialized messages array. */
  messagesBytes: number;
  /** UTF-8 byte length of the serialized tools array (0 when no tools). */
  toolsBytes: number;
};

/** Information emitted after each tool execution round completes. */
export type StepFinishEvent = {
  /** 1-based index of this tool round. */
  stepIndex: number;
  /** Text content the model produced in this round (may be empty if the model only called tools). */
  content: string;
  /** Tool calls the model made in this round. */
  toolCalls: Array<{ name: string; arguments: string }>;
  /** Results from auto-executed tools in this round. */
  toolResults: Array<{
    name: string;
    result: unknown;
    error?: string;
    errorType?: ToolExecutionErrorType;
  }>;
  /** Token usage for this round, if available. */
  usage: { inputTokens?: number; outputTokens?: number };
};

/**
 * Options for `runToolLoop`.
 */
export type RunToolLoopOptions = {
  /** Messages to send to the model. */
  messages: LlmapiMessage[];
  /** Model identifier (e.g. "fireworks/accounts/fireworks/models/kimi-k2p5"). */
  model: string;
  /** Bearer token for the Portal API. Omit when using API-key auth via `headers`. */
  token?: string;
  /** Base URL for the Portal API. @default "https://portal.anuma-dev.ai" */
  baseUrl?: string;
  /** Additional headers to include with each request. */
  headers?: Record<string, string>;
  /** Which API backend to use. @default "auto" */
  apiType?: ApiType;
  /** Controls randomness (0.0 to 2.0). */
  temperature?: number;
  /** Maximum tokens to generate. */
  maxOutputTokens?: number;
  /** Tool definitions, optionally with executors for auto-execution. */
  tools?: Array<LlmapiChatCompletionTool | ToolConfig>;
  /** Controls which tool to use: "auto", "any", "none", "required", or a specific tool name. */
  toolChoice?: string;
  /**
   * Maximum tool execution rounds before forcing the model to respond with text.
   * After this many rounds, `toolChoice` is set to `"none"`. A hard safety
   * cap of `maxToolRounds + 5` iterations applies on top, in case the model
   * ignores `toolChoice: "none"` and keeps emitting tool calls.
   * @default 20
   */
  maxToolRounds?: number;
  /** Reasoning configuration for o-series models. */
  reasoning?: LlmapiResponseReasoning;
  /** Extended thinking configuration. */
  thinking?: LlmapiThinkingOptions;
  /** User-selected image generation model. */
  imageModel?: string;
  /** Groups requests belonging to the same conversation for observability. Pass-through only — not forwarded to the LLM provider. */
  conversationId?: string;
  /** Controls adaptive output smoothing for streaming. @default true */
  smoothing?: StreamSmoothingConfig | boolean;
  /** AbortSignal to cancel the request. */
  signal?: AbortSignal;
  /** Called with content text deltas as they stream. */
  onData?: (chunk: string) => void;
  /** Called with thinking/reasoning deltas as they stream. */
  onThinking?: (chunk: string) => void;
  /** Called when the completion finishes successfully. */
  onFinish?: (response: ApiResponse) => void;
  /** Called when an unexpected error occurs (not called for aborts). */
  onError?: (error: Error) => void;
  /** Called for tool calls that don't have an executor (e.g. server-side tools). */
  onToolCall?: (toolCall: LlmapiToolCall) => void;
  /** Called when a server-side tool (MCP) is invoked during streaming. */
  onServerToolCall?: (toolCall: ServerToolCallEvent) => void;
  /**
   * Called after each tool execution round completes.
   * Receives the round index, model content, tool calls, results, and usage.
   */
  onStepFinish?: (event: StepFinishEvent) => void;
  /**
   * Called immediately before each LLM request is dispatched, with payload
   * size metrics. Round 0 is the initial request; round 1+ are continuation
   * requests after a tool round. Transport-level retries (see
   * `onStreamRetry`) fire `onRequest` again with the same `round` value —
   * use `event.attempt` to distinguish the first dispatch (0) from retries
   * (1+). Enabling this incurs an extra JSON.stringify pass over the
   * request body.
   */
  onRequest?: (event: RequestEvent) => void;
  /**
   * Called with partial tool call arguments as they stream in.
   * Use for live preview of artifacts (HTML, slides) being generated.
   */
  onToolCallArgumentsDelta?: (event: ToolCallArgumentsDeltaEvent) => void;
  /**
   * Called when the streaming transport hits a transient pre-content
   * failure and the toolLoop schedules a retry. Surfaces the round
   * (`"initial"` or the 1-based continuation index), attempt counter,
   * remaining cap, the underlying error, and the backoff delay so
   * callers can log / surface UI / report metrics. Not invoked for
   * mid-content failures (where retry is unsafe) or for the final
   * attempt that surfaces as `result.error`. When omitted, retries
   * fire silently.
   */
  onStreamRetry?: (event: {
    round: "initial" | number;
    attempt: number;
    maxAttempts: number;
    backoffMs: number;
    error: Error;
  }) => void;
  /**
   * Custom streaming transport. Defaults to a fetch-based SSE client.
   * React Native environments can supply an XHR-based transport since
   * `fetch` response body streaming isn't available in RN.
   */
  transport?: StreamingTransport;
  /**
   * Pre-processors run after the last user message is received but before
   * the first LLM request. Each pre-processor receives the prompt text
   * and a shared embedding (computed once per request) and may return
   * additional messages to enrich the conversation. Messages returned by
   * each pre-processor are appended in array order to `messages` for the
   * initial LLM call and all subsequent tool-loop rounds.
   *
   * Pre-processors run in parallel; a failure in one is logged and does
   * not prevent the others or the LLM request.
   */
  preProcessors?: PromptPreProcessor[];
  /**
   * Maximum number of connector tool calls (notion, google calendar, google drive)
   * before they are removed from subsequent rounds. Set to `Infinity` to disable.
   * Only applies to fast models (cerebras) by default.
   * @default 2
   */
  maxConnectorCalls?: number;
  /**
   * Lifecycle hooks for observability (telemetry, tracing, UI surfaces).
   * All hooks are optional. Errors thrown by a hook are swallowed so a
   * buggy observer can't crash the loop. Hooks are awaited synchronously
   * at each fire site — keep them fast. Pass an array to attach multiple
   * listeners; they're composed into one dispatcher internally. See
   * `RunHooks` and `composeHooks`.
   */
  hooks?: RunHooks | RunHooks[];
};

export type RunToolLoopResult =
  | {
      data: ApiResponse;
      error: null;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
      /** Results from tools that were auto-executed by the SDK */
      autoExecutedToolResults?: AutoExecutedToolResult[];
    }
  | {
      data: ApiResponse | null;
      error: string;
      /** HTTP status code from the SSE connection, if available */
      statusCode?: number;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
    };

/** Options passed to a streaming transport function. */
export type StreamingTransportOptions = {
  baseUrl: string;
  endpoint: string;
  body: Record<string, unknown>;
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onSseError?: (error: unknown) => void;
};

/** Result returned by a streaming transport function. */
export type StreamingTransportResult = {
  stream: AsyncIterable<unknown>;
};

/**
 * A pluggable transport function for streaming SSE requests.
 * The default uses `fetch` + `ReadableStream`. React Native environments
 * can supply an XHR-based transport instead.
 *
 * ### Abort contract
 *
 * When `options.signal` aborts **mid-stream**, the returned async iterable
 * MUST surface an `AbortError` (an `Error` whose `name === "AbortError"`)
 * to its consumer — either by throwing from the iterator, or by causing
 * the underlying `read()` to reject. It MUST NOT terminate the iterable
 * with an orderly `done` in that case.
 *
 * `runToolLoop` relies on this to distinguish two scenarios that are
 * otherwise indistinguishable from outside the transport:
 * 1. The server closed the connection cleanly and every byte was
 *    delivered → iterable returns `done`, result is success.
 * 2. The caller aborted the request mid-stream → iterable throws
 *    `AbortError`, result is `{ data: <partial>, error: "Request aborted" }`.
 *
 * Transports that swallow mid-stream aborts and yield `done` instead
 * will cause a partial response to be reported as a successful
 * completion. The built-in `xhrTransport` and the default fetch-based
 * transport both honor this contract.
 */
export type StreamingTransport = (options: StreamingTransportOptions) => StreamingTransportResult;

/**
 * Wraps `globalThis.fetch` so that non-OK HTTP responses reject with an error
 * that includes the response body. Without this, a 500 from the portal
 * surfaces as "SSE failed: 500 Internal Server Error" with no detail — the
 * trace_id, request_id, and error type in the body are discarded. We read the
 * body defensively (at most 500 chars) so the original error path behaves the
 * same for successful responses.
 */
const errorCapturingFetch: typeof fetch = async (input, init) => {
  const response = await globalThis.fetch(input, init);
  if (response.ok) return response;
  let body = "";
  try {
    body = (await response.text()).slice(0, 500);
  } catch {
    // Ignore — some environments disallow reading the body on a failed response.
  }
  const detail = body ? `: ${body}` : "";
  throw new Error(`SSE failed: ${response.status} ${response.statusText}${detail}`);
};

/**
 * Default fetch-based streaming transport for the Portal API.
 */
const defaultTransport: StreamingTransport = (options) => {
  const url = `${options.baseUrl}${options.endpoint}`;
  return createSseClient({
    method: "POST",
    url,
    serializedBody: JSON.stringify(options.body),
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : undefined),
      ...options.headers,
    },
    signal: options.signal,
    sseMaxRetryAttempts: 1,
    onSseError: options.onSseError,
    fetch: errorCapturingFetch,
  });
};

/**
 * Framework-agnostic tool execution loop.
 *
 * Sends a streaming completion request, auto-executes tools that have executors,
 * feeds results back to the model, and repeats until the model stops emitting
 * tool calls or hits the iteration limit.
 *
 * This is the same loop that powers `useChat` in the React SDK, extracted so
 * it can be used from Node.js servers, CLI tools, and background workers.
 *
 * @example
 * ```ts
 * import { runToolLoop } from "@anuma/sdk/server";
 *
 * const result = await runToolLoop({
 *   messages: [{ role: "user", content: [{ type: "text", text: "What's the weather?" }] }],
 *   model: "fireworks/accounts/fireworks/models/kimi-k2p5",
 *   token: "my-api-token",
 *   tools: [{
 *     type: "function",
 *     function: { name: "get_weather", parameters: { type: "object", properties: { city: { type: "string" } } } },
 *     executor: async ({ city }) => fetchWeather(city),
 *   }],
 *   onData: (chunk) => process.stdout.write(chunk),
 * });
 * ```
 */
export async function runToolLoop(options: RunToolLoopOptions): Promise<RunToolLoopResult> {
  const {
    model,
    token,
    baseUrl = BASE_URL,
    headers,
    apiType = "auto",
    temperature,
    maxOutputTokens,
    tools,
    toolChoice: toolChoiceArg,
    maxToolRounds,
    reasoning,
    thinking,
    imageModel,
    conversationId,
    smoothing,
    signal,
    onData,
    onThinking,
    onFinish,
    onError,
    onToolCall,
    onServerToolCall,
    onToolCallArgumentsDelta,
    onStepFinish,
    onRequest,
    onStreamRetry,
    transport: makeStreamingRequest = defaultTransport,
    preProcessors,
    maxConnectorCalls = 2,
    hooks: hooksOption,
  } = options;
  // Accept a single listener or an array — array form is composed into a
  // single dispatcher so the rest of the loop can stay shape-agnostic.
  const hooks: RunHooks | undefined = Array.isArray(hooksOption)
    ? composeHooks(hooksOption)
    : hooksOption;
  const runId = generateRunId();
  // `messages` is mutable so pre-processors can inject context
  // (e.g. web search results) before the first LLM request.
  let messages = options.messages;

  const resolved = resolveApiType(apiType, model);
  const strategy = getStrategy(resolved);

  // `onRunEnd` and `onRunError` are mutually exclusive and fire at most once
  // per run. Every terminal path (validation failure, pre-start abort, clean
  // completion, mid-stream error, abort, outer catch) goes through these
  // helpers so tracing consumers can rely on a single matched start/end pair.
  let runTerminalFired = false;
  const fireRunEnd = async (payload: Omit<RunEndEvent, "runId">) => {
    if (runTerminalFired) return;
    runTerminalFired = true;
    await safeAwait(() => hooks?.onRunEnd?.({ runId, ...payload }));
  };
  const fireRunError = async (payload: Omit<RunErrorEvent, "runId">) => {
    if (runTerminalFired) return;
    runTerminalFired = true;
    await safeAwait(() => hooks?.onRunError?.({ runId, ...payload }));
  };

  // `onRunStart` fires before validation so observers see every invocation,
  // including failed pre-flight checks. The matching terminal hook fires
  // via `fireRunError` below. `messages` here is the raw caller payload —
  // pre-processors run later, so `beforeModelCall.messages` reflects the
  // post-enrichment state.
  await safeAwait(() =>
    hooks?.onRunStart?.({
      runId,
      model,
      messages,
      tools: tools ?? [],
    })
  );

  // Validate inputs
  const messagesValidation = validateMessages(messages);
  if (!messagesValidation.valid) {
    if (onError) onError(new Error(messagesValidation.message));
    await fireRunError({
      error: messagesValidation.message,
      stage: "model",
      errorObject: new Error(messagesValidation.message),
    });
    return { data: null, error: messagesValidation.message };
  }

  const modelValidation = validateModel(model);
  if (!modelValidation.valid) {
    if (onError) onError(new Error(modelValidation.message));
    await fireRunError({
      error: modelValidation.message,
      stage: "model",
      errorObject: new Error(modelValidation.message),
    });
    return { data: null, error: modelValidation.message };
  }

  if (!token && !headers) {
    const msg = "No access token available. Provide `token` or auth via `headers`.";
    if (onError) onError(new Error(msg));
    await fireRunError({ error: msg, stage: "model", errorObject: new Error(msg) });
    return { data: null, error: msg };
  }

  if (signal?.aborted) {
    await fireRunError({ error: "Request aborted", stage: "model" });
    return { data: null, error: "Request aborted" };
  }

  // Run pre-processors if any are provided. Each receives the shared
  // embedding and may return messages to enrich the conversation.
  if (preProcessors?.length) {
    try {
      const text = extractLastUserText(messages);
      if (text.length > 0) {
        const embedding = await generateEmbedding(text, {
          apiKey: headers?.["X-API-Key"],
          getToken: token ? () => Promise.resolve(token) : undefined,
          baseUrl,
        });
        const results = await Promise.all(
          preProcessors.map(async (p) => {
            try {
              return await p({ prompt: text, embedding, signal });
            } catch (err) {
              console.warn("[runToolLoop] pre-processor failed:", err);
              return undefined;
            }
          })
        );
        const extra = results.flatMap((r) => (Array.isArray(r) ? r : []));
        if (extra.length > 0) {
          messages = [...messages, ...extra];
        }
      }
    } catch (err) {
      // Embedding / pre-processor stage failure is non-fatal
      console.warn("[runToolLoop] pre-processor stage failed:", err);
    }
  }

  try {
    let sseError: Error | null = null;

    let apiTools = toolsToApiFormat(tools, resolved);
    let toolChoice = toolChoiceArg;
    let stepIndex = 0;

    const requestBody = strategy.buildRequestBody({
      messages,
      model,
      stream: true,
      temperature,
      maxOutputTokens,
      tools: apiTools,
      toolChoice,
      reasoning,
      thinking,
      imageModel,
      conversationId,
    });

    // Populated by the retry loop below; declared out here so the rest
    // of the function (post-stream tool execution etc.) can reach them.
    let accumulator!: ReturnType<typeof createStreamAccumulator>;
    let contentSmoother!: StreamSmoother;
    let thinkingSmoother!: StreamSmoother;

    await safeAwait(() =>
      hooks?.beforeModelCall?.({
        runId,
        stepIndex,
        model,
        messages,
        tools: apiTools ?? [],
        requestBody,
      })
    );

    // afterModelCall must pair with each beforeModelCall — fire exactly once
    // per LLM round, on success/abort/error. Tracked here to keep exits symmetric.
    // Transport-level retries are hidden from these hooks; observers can use
    // `onStreamRetry` if they want per-attempt visibility.
    let afterModelCallFired = false;
    const fireAfterModelCall = async (payload: Omit<ModelCallEndEvent, "runId" | "stepIndex">) => {
      if (afterModelCallFired) return;
      afterModelCallFired = true;
      await safeAwait(() =>
        hooks?.afterModelCall?.({
          runId,
          stepIndex,
          ...payload,
        })
      );
    };
    const extractFinishReason = (resp: unknown): string | undefined => {
      if (!resp || typeof resp !== "object") return undefined;
      // Completions API: choices[0].finish_reason
      const choices = (resp as { choices?: Array<{ finish_reason?: string | null }> }).choices;
      if (Array.isArray(choices) && choices[0]?.finish_reason) {
        return choices[0].finish_reason ?? undefined;
      }
      // Responses API: status field on the response
      const status = (resp as { status?: string }).status;
      return typeof status === "string" ? status : undefined;
    };
    const buildModelCallEndPayload = (
      acc: ReturnType<typeof createStreamAccumulator>,
      extra: { error?: string } = {}
    ): Omit<ModelCallEndEvent, "runId" | "stepIndex"> => {
      let finishReason: string | undefined;
      try {
        finishReason = extractFinishReason(strategy.buildFinalResponse(acc));
      } catch {
        /* best-effort — never fail the loop because of hook payload assembly */
      }
      return {
        content: acc.content,
        toolCalls: [...acc.toolCalls.values()].map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        })),
        usage: {
          inputTokens: acc.usage.prompt_tokens,
          outputTokens: acc.usage.completion_tokens,
        },
        finishReason,
        ...extra,
      };
    };

    // Transport-level retry: only fires when the failure happens before
    // any chunk reached the smoothers / accumulator. Once user-visible
    // output has started, a retry would risk duplicate or contradictory
    // content (the LLM is stochastic), so we bail instead.
    for (let attempt = 0; attempt < STREAM_RETRY_MAX_ATTEMPTS; attempt++) {
      sseError = null;
      if (onRequest) onRequest(measureRequest(0, attempt, requestBody, messages, apiTools));

      const sseResult = makeStreamingRequest({
        baseUrl,
        endpoint: strategy.endpoint,
        body: requestBody,
        token,
        headers,
        signal,
        onSseError: (error) => {
          sseError = wrapSseError(error);
        },
      });

      accumulator = createStreamAccumulator(model || undefined);
      contentSmoother = new StreamSmoother((text) => {
        if (onData) onData(text);
      }, smoothing);
      thinkingSmoother = new StreamSmoother((text) => {
        if (onThinking) onThinking(text);
      }, smoothing);

      let chunksEmittedDownstream = false;
      try {
        for await (const chunk of sseResult.stream) {
          // Detect mid-stream aborts here rather than after the loop. Once
          // `xhr.onload` (or fetch's equivalent) has run, the connection
          // closed cleanly and every byte was parsed; a late `signal.abort()`
          // from caller cleanup must not retroactively mark a completed
          // response as aborted.
          if (signal?.aborted) {
            contentSmoother.destroy();
            thinkingSmoother.destroy();
            await fireAfterModelCall(buildModelCallEndPayload(accumulator, { error: "aborted" }));
            await fireRunError({ error: "Request aborted", stage: "model" });
            return {
              data: strategy.buildFinalResponse(accumulator),
              error: "Request aborted",
              toolsChecksum: accumulator.toolsChecksum,
            };
          }

          if (isDoneMarker(chunk)) continue;

          const providerError = extractProviderStreamError(chunk);
          if (providerError) {
            contentSmoother.destroy();
            thinkingSmoother.destroy();
            throw providerError;
          }

          if (chunk && typeof chunk === "object") {
            const {
              content: contentDelta,
              thinking: thinkingDelta,
              serverToolCall,
              toolCallArgumentsDelta,
            } = strategy.processStreamChunk(chunk, accumulator);
            if (contentDelta) {
              chunksEmittedDownstream = true;
              contentSmoother.push(contentDelta);
            }
            if (thinkingDelta) {
              chunksEmittedDownstream = true;
              thinkingSmoother.push(thinkingDelta);
            }
            if (serverToolCall) {
              chunksEmittedDownstream = true;
              if (onServerToolCall) onServerToolCall(serverToolCall);
            }
            if (toolCallArgumentsDelta) {
              chunksEmittedDownstream = true;
              if (onToolCallArgumentsDelta) onToolCallArgumentsDelta(toolCallArgumentsDelta);
            }
          }
        }
        // An sseError set via the onSseError callback (but never thrown
        // by the iterator itself) still represents a transport-level
        // failure — fold it into the retry path.
        if (sseError !== null) throw sseError as Error;
        // Success.
        break;
      } catch (streamErr) {
        contentSmoother.destroy();
        thinkingSmoother.destroy();

        if (isAbortError(streamErr) || signal?.aborted) {
          await fireAfterModelCall(buildModelCallEndPayload(accumulator, { error: "aborted" }));
          const abortErr = streamErr instanceof Error ? streamErr : new Error("Request aborted");
          await fireRunError({ error: "Request aborted", stage: "model", errorObject: abortErr });
          return {
            data: strategy.buildFinalResponse(accumulator),
            error: "Request aborted",
            toolsChecksum: accumulator.toolsChecksum,
          };
        }

        const lastAttempt = attempt >= STREAM_RETRY_MAX_ATTEMPTS - 1;
        if (!chunksEmittedDownstream && !lastAttempt && isRetriableStreamError(streamErr)) {
          const backoff = backoffForRetry(attempt, streamErr);
          if (onStreamRetry) {
            const err = streamErr instanceof Error ? streamErr : new Error(String(streamErr));
            onStreamRetry({
              round: "initial",
              attempt: attempt + 1,
              maxAttempts: STREAM_RETRY_MAX_ATTEMPTS,
              backoffMs: backoff,
              error: err,
            });
          }
          await sleep(backoff, signal);
          continue;
        }
        const msg = streamErr instanceof Error ? streamErr.message : String(streamErr);
        await fireAfterModelCall(buildModelCallEndPayload(accumulator, { error: msg }));
        throw streamErr;
      }
    }

    // Only the terminal text response gets the paced typewriter drain. When the
    // round emitted tool calls (the agentic loop will continue), flush instantly:
    // paced-draining large tool args/results at the smoother's char rate blocked
    // the loop for tens of seconds per round — the dominant multi-round latency.
    if (accumulator.toolCalls.size > 0) {
      contentSmoother.flush();
      thinkingSmoother.flush();
    } else {
      await Promise.all([contentSmoother.drain(), thinkingSmoother.drain()]);
    }
    await fireAfterModelCall(buildModelCallEndPayload(accumulator));

    const response = strategy.buildFinalResponse(accumulator);

    // ── Multi-turn tool calling loop ──
    const executorMap = createToolExecutorMap(tools);
    let currentAccumulator = accumulator;
    let currentMessages = messages;
    let toolIteration = 0;
    // Absolute ceiling on caller-supplied maxToolRounds. Even trusted
    // callers shouldn't be able to drive 10k LLM round-trips per message;
    // 50 comfortably covers the slide-generation flow (needs ~20) while
    // bounding worst-case cost from a runaway or malicious caller.
    const ABSOLUTE_MAX_TOOL_ROUNDS = 50;
    const effectiveMaxToolRounds = Math.min(maxToolRounds ?? 20, ABSOLUTE_MAX_TOOL_ROUNDS);
    // Hard safety cap: a small margin above the soft cap. The soft cap sets
    // `toolChoice: "none"` to force a final text response, which should end
    // the loop within one more iteration; the hard cap guards against a
    // model that ignores `toolChoice: "none"` and keeps emitting tool calls.
    const hardIterationCap = effectiveMaxToolRounds + 5;
    const isConnectorTool = (name: string) => CONNECTOR_PREFIXES.some((p) => name.startsWith(p));
    const connectorCallCount = { total: 0 };
    let connectorLimitHit = false;
    // Accumulate successful tool results across every loop iteration. The
    // skipContinuation-only early-return path below returns just the final
    // round's results, which is fine for one-shot display_* tools. Multi-
    // round flows (e.g. slide-deck plan_deck + add_slide × N) need every
    // round's results so the storage layer can persist them as a
    // `[Tool Execution Results]` message and the chat UI can render the
    // deck via parseDisplayResults.
    const accumulatedToolResults: AutoExecutedToolResult[] = [];

    while (currentAccumulator.toolCalls.size > 0 && toolIteration < hardIterationCap) {
      toolIteration++;
      sseError = null;

      const toolCallsToExecute: AccumulatedToolCall[] = [];

      // Execute tools that have an executor; emit onToolCall for the rest.
      // Both branches fire `beforeToolUse` (it's observe-only and fires for
      // every tool the model invoked — executor-backed or server-side).
      // Note: `afterToolUse` is asymmetric — it only fires for tools that
      // actually run via an executor below. Server-side tools without an
      // executor get a `beforeToolUse` but never an `afterToolUse`.
      // TODO(follow-up PR): support returning { args?, abort?: { reason } }
      // from beforeToolUse so observers can mutate args or short-circuit
      // the call. Today this is observe-only.
      for (const toolCall of currentAccumulator.toolCalls.values()) {
        const executorConfig = executorMap.get(toolCall.name);

        await safeAwait(() =>
          hooks?.beforeToolUse?.({
            runId,
            stepIndex,
            toolCallId: toolCall.id,
            name: toolCall.name,
            rawArguments: toolCall.arguments,
            parsedArguments: tryParseToolArgs(toolCall.arguments),
          } satisfies ToolUseStartEvent)
        );

        if (executorConfig) {
          toolCallsToExecute.push(toolCall);
        } else {
          if (onToolCall) {
            onToolCall({
              id: toolCall.id,
              type: toolCall.type,
              function: {
                name: toolCall.name,
                arguments: toolCall.arguments,
              },
            });
          }
        }
      }

      if (toolCallsToExecute.length === 0) {
        break;
      }

      // Output tool execution info to thinking stream
      if (onThinking) {
        const toolInfo = toolCallsToExecute
          .map((tc) => {
            try {
              const args = JSON.parse(tc.arguments) as Record<string, unknown>;
              const argsStr = Object.entries(args)
                .map(([k, v]) => `${k}=${String(v)}`)
                .join(", ");
              return `${tc.name}(${argsStr})`;
            } catch {
              return `${tc.name}(${tc.arguments})`;
            }
          })
          .join(", ");
        thinkingSmoother.push(`\nExecuting tool: ${toolInfo}\n`);
      }

      // Topological phase execution: tools with dependsOn wait for the named
      // tools to complete before starting. Handles multi-level chains (A → B → C).
      // Note: batchToolNames tracks by name, so duplicate calls to the same tool
      // (e.g. two create_file calls) land in the same phase via Promise.all.
      const batchToolNames = new Set(toolCallsToExecute.map((tc) => tc.name));
      const completed = new Set<string>();
      let remaining = [...toolCallsToExecute];
      const executionResults: {
        id: string;
        name?: string;
        result?: unknown;
        error?: string;
        errorType?: ToolExecutionErrorType;
      }[] = [];

      while (remaining.length > 0) {
        const ready = remaining.filter((tc) => {
          const deps = executorMap.get(tc.name)?.dependsOn ?? [];
          return deps.every((d) => !batchToolNames.has(d) || completed.has(d));
        });
        if (ready.length === 0) {
          // Emit error results for remaining tools so every tool call the
          // LLM issued gets a corresponding tool result message.
          // Propagate failures transitively through the dependency chain
          // before classifying, so the result is independent of iteration order.
          const failedNames = new Set(
            executionResults
              .filter((r) => r.error)
              .map((r) => r.name)
              .filter(Boolean) as string[]
          );
          let changed = true;
          while (changed) {
            changed = false;
            for (const tc of remaining) {
              if (failedNames.has(tc.name)) continue;
              const deps = executorMap.get(tc.name)?.dependsOn ?? [];
              if (deps.some((d) => batchToolNames.has(d) && failedNames.has(d))) {
                failedNames.add(tc.name);
                changed = true;
              }
            }
          }
          for (const tc of remaining) {
            const deps = executorMap.get(tc.name)?.dependsOn ?? [];
            const failedDeps = deps.filter((d) => batchToolNames.has(d) && !completed.has(d));
            const blockedByFailure = failedDeps.some((d) => failedNames.has(d));
            const reason = blockedByFailure
              ? `failed dependencies: ${failedDeps.join(", ")}`
              : "a dependency cycle";
            const errorMsg = `Tool "${tc.name}" was not executed due to ${reason}`;
            executionResults.push({
              id: tc.id,
              name: tc.name,
              error: errorMsg,
              errorType: "execution",
            });
            await safeAwait(() =>
              hooks?.afterToolUse?.({
                runId,
                stepIndex,
                toolCallId: tc.id,
                name: tc.name,
                error: errorMsg,
                errorType: "execution",
              } satisfies ToolUseEndEvent)
            );
          }
          break;
        }

        const phaseResults = await Promise.all(
          ready.map(async (toolCall) => {
            const executorConfig = executorMap.get(toolCall.name);
            if (!executorConfig) {
              return {
                id: toolCall.id,
                name: toolCall.name,
                error: `No executor found for tool: ${toolCall.name}`,
              };
            }
            const { result, error, errorType } = await executeToolCall(
              toolCall,
              executorConfig.executor,
              executorConfig.executorTimeout
            );
            await safeAwait(() =>
              hooks?.afterToolUse?.({
                runId,
                stepIndex,
                toolCallId: toolCall.id,
                name: toolCall.name,
                result,
                error,
                errorType,
              } satisfies ToolUseEndEvent)
            );
            return { id: toolCall.id, name: toolCall.name, result, error, errorType };
          })
        );

        for (const r of phaseResults) {
          if (r.name && !r.error && !isToolErrorResult(r.result)) completed.add(r.name);
        }
        executionResults.push(...phaseResults);
        const readySet = new Set(ready);
        remaining = remaining.filter((tc) => !readySet.has(tc));
      }

      // Remove connector tools after maxConnectorCalls (fast models only)
      const isFastModel = model?.startsWith("cerebras/");
      if (isFastModel && apiTools && isFinite(maxConnectorCalls)) {
        for (const tc of toolCallsToExecute) {
          if (isConnectorTool(tc.name)) {
            connectorCallCount.total++;
          }
        }

        if (connectorCallCount.total >= maxConnectorCalls) {
          apiTools = apiTools.filter((t) => {
            const name = getToolName(t);
            return !name || !isConnectorTool(name);
          });
          if (apiTools.length === 0) {
            apiTools = undefined;
            toolChoice = undefined;
          } else if (typeof toolChoice === "string" && isConnectorTool(toolChoice)) {
            toolChoice = "auto";
          }
          for (const [name] of executorMap) {
            if (isConnectorTool(name)) executorMap.delete(name);
          }
          connectorLimitHit = true;
        }
      }

      // Remove tools with removeAfterExecution: true that succeeded
      if (tools && apiTools) {
        const successfullyExecutedNames = new Set<string>();
        for (const r of executionResults) {
          if (!r.error && !isToolErrorResult(r.result) && "name" in r && r.name) {
            successfullyExecutedNames.add(r.name);
          }
        }

        if (successfullyExecutedNames.size > 0) {
          const toolsToRemove = new Set<string>();
          for (const t of tools) {
            const tc = t as ToolConfig & Record<string, unknown>;
            const func = tc.function as Record<string, unknown> | undefined;
            const toolName: string | undefined =
              typeof func?.name === "string"
                ? func.name
                : typeof tc.name === "string"
                  ? tc.name
                  : undefined;
            if (
              tc.removeAfterExecution === true &&
              toolName &&
              successfullyExecutedNames.has(toolName)
            ) {
              toolsToRemove.add(toolName);
            }
          }

          if (toolsToRemove.size > 0) {
            apiTools = apiTools.filter((t) => {
              const name = getToolName(t);
              return !name || !toolsToRemove.has(name);
            });
            if (apiTools.length === 0) {
              apiTools = undefined;
              toolChoice = undefined;
            } else if (typeof toolChoice === "string" && toolsToRemove.has(toolChoice)) {
              toolChoice = "auto";
            }
            for (const name of toolsToRemove) {
              executorMap.delete(name);
            }
          }
        }
      }

      // Output tool results to thinking stream (skip tools that won't continue
      // to the LLM, as they can return very large results like 35K+ HTML that
      // would block drain() for minutes at the smoother's character rate)
      if (onThinking) {
        const thinkingResults = executionResults.filter(
          (r) => !r.name || executorMap.get(r.name)?.skipContinuation !== true
        );
        if (thinkingResults.length > 0) {
          const resultsText = thinkingResults
            .map((r) => {
              if (r.error) {
                return `${r.name}: Error - ${r.error}`;
              }
              const resultStr =
                typeof r.result === "string" ? r.result : safeJsonStringify(r.result);
              return `${r.name}: ${resultStr}`;
            })
            .join("\n");
          thinkingSmoother.push(`${resultsText}\n`);
        }
      }

      // Fire onStepFinish callback
      if (onStepFinish) {
        onStepFinish({
          stepIndex: toolIteration,
          content: currentAccumulator.content,
          toolCalls: toolCallsToExecute.map((tc) => ({
            name: tc.name,
            arguments: tc.arguments,
          })),
          toolResults: executionResults.map((r) => ({
            name: r.name ?? "",
            result: r.result,
            ...(r.error ? { error: r.error } : undefined),
            ...(r.errorType ? { errorType: r.errorType } : undefined),
          })),
          usage: {
            inputTokens: currentAccumulator.usage.prompt_tokens,
            outputTokens: currentAccumulator.usage.completion_tokens,
          },
        });
      }

      // Flush (don't paced-drain) the diagnostic thinking stream before
      // continuation. Tool args/results pushed here can be tens of KB (e.g. a
      // slide's full JSX, or plan_deck's recipe), and paced-draining them at the
      // smoother's char rate would block the loop for tens of seconds per round.
      thinkingSmoother.flush();

      // Accumulate this round's successful results for the main return path.
      // Multi-round flows (e.g. plan_deck + add_slide × N) need every round's
      // results so the chat UI can render the aggregated display interactions
      // (e.g. a populated slide deck) via parseDisplayResults.
      for (const r of executionResults) {
        if (!r.error && r.name) {
          accumulatedToolResults.push({ name: r.name, result: r.result });
        }
      }

      // Build tool result messages — exclude tools with skipContinuation
      // EXCEPT when the tool errored. Errors always continue so the model
      // can see what went wrong and retry; otherwise a skipContinuation
      // tool that fails leaves the assistant turn silently broken.
      const continueResults = executionResults.filter((r) => {
        if (!r.name) return false;
        if (r.error || isToolErrorResult(r.result)) return true;
        return executorMap.get(r.name)?.skipContinuation !== true;
      });

      // If ALL tools have skipContinuation, return early
      if (continueResults.length === 0) {
        const skipResponse = strategy.buildFinalResponse(currentAccumulator);
        if (onFinish) onFinish(skipResponse);
        await fireRunEnd({
          finalContent: currentAccumulator.content,
          totalSteps: stepIndex + 1,
        });
        return {
          data: skipResponse,
          error: null,
          toolsChecksum: currentAccumulator.toolsChecksum,
          autoExecutedToolResults: accumulatedToolResults,
        };
      }

      const continueToolCallIds = new Set(continueResults.map((r) => r.id));
      const assistantMessage: LlmapiMessage = {
        role: "assistant",
        content: [{ type: "text", text: currentAccumulator.content }],
        tool_calls: toolCallsToExecute
          .filter((tc) => continueToolCallIds.has(tc.id))
          .map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: tc.arguments || "{}",
            },
          })),
      };

      const toolResultMessages: LlmapiMessage[] = [assistantMessage];
      for (const execResult of continueResults) {
        const resultContent = execResult.error
          ? `Error: ${execResult.error}`
          : safeJsonStringify(execResult.result);

        toolResultMessages.push({
          role: "tool",
          content: [{ type: "text", text: resultContent }],
          tool_call_id: execResult.id,
        } as LlmapiMessage);
      }

      // Continue the conversation with tool results
      currentMessages = [...currentMessages, ...toolResultMessages];

      const continuationToolChoice = toolIteration >= effectiveMaxToolRounds ? "none" : toolChoice;

      const continuationRequestBody = strategy.buildRequestBody({
        messages: currentMessages,
        model,
        stream: true,
        temperature,
        maxOutputTokens,
        tools: apiTools,
        toolChoice: continuationToolChoice,
        reasoning,
        thinking,
        imageModel,
        conversationId,
      });

      // Continuation rounds use the same transport-level retry as the
      // initial request — same chunk-emission guard so we never replay
      // a round once partial content has reached the user.
      let contContentSmoother!: StreamSmoother;
      let contThinkingSmoother!: StreamSmoother;

      stepIndex++;
      afterModelCallFired = false;
      await safeAwait(() =>
        hooks?.beforeModelCall?.({
          runId,
          stepIndex,
          model,
          messages: currentMessages,
          tools: apiTools ?? [],
          requestBody: continuationRequestBody,
        } satisfies ModelCallStartEvent)
      );

      for (let attempt = 0; attempt < STREAM_RETRY_MAX_ATTEMPTS; attempt++) {
        sseError = null;
        if (onRequest)
          onRequest(
            measureRequest(
              toolIteration,
              attempt,
              continuationRequestBody,
              currentMessages,
              apiTools
            )
          );

        const continuationResult = makeStreamingRequest({
          baseUrl,
          endpoint: strategy.endpoint,
          body: continuationRequestBody,
          token,
          headers,
          signal,
          onSseError: (error) => {
            sseError = wrapSseError(error);
          },
        });

        currentAccumulator = createStreamAccumulator(model || undefined);
        contContentSmoother = new StreamSmoother((text) => {
          if (onData) onData(text);
        }, smoothing);
        contThinkingSmoother = new StreamSmoother((text) => {
          if (onThinking) onThinking(text);
        }, smoothing);

        let chunksEmittedDownstream = false;
        try {
          for await (const chunk of continuationResult.stream) {
            // See note in the initial stream loop above — the abort check
            // belongs inside the for-await body, not after it, so a clean
            // completion followed by a late cleanup-time abort isn't
            // misreported as "Request aborted".
            if (signal?.aborted) {
              contContentSmoother.destroy();
              contThinkingSmoother.destroy();
              await fireAfterModelCall(
                buildModelCallEndPayload(currentAccumulator, { error: "aborted" })
              );
              await fireRunError({ error: "Request aborted", stage: "model" });
              return {
                data: strategy.buildFinalResponse(currentAccumulator),
                error: "Request aborted",
                toolsChecksum: currentAccumulator.toolsChecksum,
              };
            }

            if (isDoneMarker(chunk)) continue;

            const providerError = extractProviderStreamError(chunk);
            if (providerError) {
              contContentSmoother.destroy();
              contThinkingSmoother.destroy();
              throw providerError;
            }

            if (chunk && typeof chunk === "object") {
              const {
                content: contentDelta,
                thinking: thinkingDelta,
                serverToolCall,
                toolCallArgumentsDelta: contToolCallArgsDelta,
              } = strategy.processStreamChunk(chunk, currentAccumulator);
              if (contentDelta) {
                chunksEmittedDownstream = true;
                contContentSmoother.push(contentDelta);
              }
              if (thinkingDelta) {
                chunksEmittedDownstream = true;
                contThinkingSmoother.push(thinkingDelta);
              }
              if (serverToolCall) {
                chunksEmittedDownstream = true;
                if (onServerToolCall) onServerToolCall(serverToolCall);
              }
              if (contToolCallArgsDelta) {
                chunksEmittedDownstream = true;
                if (onToolCallArgumentsDelta) onToolCallArgumentsDelta(contToolCallArgsDelta);
              }
            }
          }
          if (sseError !== null) throw sseError as Error;
          break; // success
        } catch (streamErr) {
          contContentSmoother.destroy();
          contThinkingSmoother.destroy();

          if (isAbortError(streamErr) || signal?.aborted) {
            await fireAfterModelCall(
              buildModelCallEndPayload(currentAccumulator, { error: "aborted" })
            );
            const abortErr = streamErr instanceof Error ? streamErr : new Error("Request aborted");
            await fireRunError({ error: "Request aborted", stage: "model", errorObject: abortErr });
            return {
              data: strategy.buildFinalResponse(currentAccumulator),
              error: "Request aborted",
              toolsChecksum: currentAccumulator.toolsChecksum,
            };
          }

          const lastAttempt = attempt >= STREAM_RETRY_MAX_ATTEMPTS - 1;
          if (!chunksEmittedDownstream && !lastAttempt && isRetriableStreamError(streamErr)) {
            const backoff = backoffForRetry(attempt, streamErr);
            if (onStreamRetry) {
              const err = streamErr instanceof Error ? streamErr : new Error(String(streamErr));
              onStreamRetry({
                round: toolIteration,
                attempt: attempt + 1,
                maxAttempts: STREAM_RETRY_MAX_ATTEMPTS,
                backoffMs: backoff,
                error: err,
              });
            }
            await sleep(backoff, signal);
            continue;
          }
          const msg = streamErr instanceof Error ? streamErr.message : String(streamErr);
          await fireAfterModelCall(buildModelCallEndPayload(currentAccumulator, { error: msg }));
          throw streamErr;
        }
      }

      // Same rule as the initial round: paced drain only for the terminal
      // response; flush instantly while the tool loop will continue.
      if (currentAccumulator.toolCalls.size > 0) {
        contContentSmoother.flush();
        contThinkingSmoother.flush();
      } else {
        await Promise.all([contContentSmoother.drain(), contThinkingSmoother.drain()]);
      }
      await fireAfterModelCall(buildModelCallEndPayload(currentAccumulator));
    }

    // Append connector limit tip after all content has streamed
    if (connectorLimitHit) {
      const tip =
        "\n\n> **Tip:** Switch to a **Thinking model** for more detailed results with connectors like Notion, Google Calendar, and Drive.\n";
      if (onData) onData(tip);
      currentAccumulator.content += tip;
    }

    // Build final response from the last accumulator
    if (toolIteration > 0) {
      const finalResponse = strategy.buildFinalResponse(currentAccumulator);
      if (onFinish) onFinish(finalResponse);
      await fireRunEnd({
        finalContent: currentAccumulator.content,
        totalSteps: stepIndex + 1,
      });
      return {
        data: finalResponse,
        error: null,
        toolsChecksum: currentAccumulator.toolsChecksum,
        autoExecutedToolResults: accumulatedToolResults,
      };
    }

    if (onFinish) onFinish(response);
    await fireRunEnd({
      finalContent: accumulator.content,
      totalSteps: stepIndex + 1,
    });
    return {
      data: response,
      error: null,
      toolsChecksum: accumulator.toolsChecksum,
    };
  } catch (err) {
    if (isAbortError(err)) {
      // `onRunStart` always fires before this try block opens, so any abort
      // that escapes here still needs a terminal hook to close the run.
      const abortErr = err instanceof Error ? err : new Error("Request aborted");
      await fireRunError({ error: "Request aborted", stage: "model", errorObject: abortErr });
      return { data: null, error: "Request aborted" };
    }

    const errorMsg = err instanceof Error ? err.message : "Failed to send message.";
    const errorObj = err instanceof Error ? err : new Error(errorMsg);
    if (onError) onError(errorObj);
    // Stage is "model" because every throwing path in this loop is either
    // inside or immediately after an LLM stream consumption (provider error,
    // SSE error, stream exception). Tool execution failures surface as
    // structured `{ error, errorType }` results, not thrown exceptions.
    await fireRunError({ error: errorMsg, stage: "model", errorObject: errorObj });
    const statusCode =
      err instanceof Error && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : undefined;
    return { data: null, error: errorMsg, statusCode };
  }
}
