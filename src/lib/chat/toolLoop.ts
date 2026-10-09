import type {
  LlmapiChatCompletionTool,
  LlmapiMessage,
  LlmapiResponseReasoning,
  LlmapiThinkingOptions,
  LlmapiToolCall,
} from "../../client";
import { createSseClient } from "../../client/core/serverSentEvents.gen";
import { BASE_URL } from "../../clientConfig";
import { CONFIRM_TOOL_NAME, missingConfirmFields } from "../../tools/confirmConstants";
import { generateEmbedding } from "../memoryEngine/embeddings";
import {
  createStreamingDeAnonymizer,
  type PiiMatch,
  type PiiRedactor,
  resolvePiiRedactor,
} from "../pii/redactor";
import { toolOutputForModel } from "../storage/mcpImages";
import {
  BUILT_IN_TOOL_SETS,
  CONFIRMED_ACTION_TOOL_SETS,
  TOOL_SEARCH_TOOL_NAME,
} from "../tools/serverTools";
import { validateEndpointOverride } from "./endpointOverride";
import { isAttachedFilesText } from "./fileContext";
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
import { wrapConnectorToolResult } from "./untrustedToolResult";

async function safeAwait(fn: () => unknown): Promise<void> {
  try {
    await fn();
  } catch {
    /* observer error, swallow */
  }
}

function generateRunId(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  return (
    Math.random().toString(16).slice(2).padStart(12, "0") +
    Math.random().toString(16).slice(2).padStart(12, "0")
  );
}

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

const STREAM_RETRY_MAX_ATTEMPTS = 3;
const STREAM_RETRY_BACKOFF_MS: readonly number[] = [500, 2000, 5000];
const RATE_LIMIT_RETRY_BACKOFF_MS: readonly number[] = [5000, 15000, 30000];

function backoffForRetry(attempt: number, err: unknown): number {
  const schedule = isRateLimitedStreamError(err)
    ? RATE_LIMIT_RETRY_BACKOFF_MS
    : STREAM_RETRY_BACKOFF_MS;
  return schedule[attempt] ?? schedule[schedule.length - 1] ?? 1000;
}

function getHttpStatusCode(err: Error): number | undefined {
  if (err instanceof SseError) return err.statusCode;
  const match = err.message.toLowerCase().match(/sse failed: (\d+)/);
  return match ? Number(match[1]) : undefined;
}

function isRateLimitedStreamError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return getHttpStatusCode(err) === 429;
}

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

function isRetriableStreamError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (isAbortError(err)) return false;

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
import type { AccumulatedToolCall, StreamAccumulator, ToolConfig } from "./useChat/types";
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

function extractLastUserText(messages: LlmapiMessage[]): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return "";
  const content = lastUserMsg.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c) => c?.type === "text" && !isAttachedFilesText(c.text))
      .map((c) => c.text ?? "")
      .join(" ");
  }
  return "";
}

function isToolErrorResult(result: unknown): boolean {
  return (
    result !== null &&
    typeof result === "object" &&
    "error" in result &&
    typeof (result as { error: unknown }).error === "string"
  );
}

function serverToolCallMessages(
  events: StreamAccumulator["toolCallEvents"],
  messages: LlmapiMessage[],
  skipIds: Set<string>
): LlmapiMessage[] {
  const seen = new Set(skipIds);
  for (const m of messages) {
    if (m.tool_call_id) seen.add(m.tool_call_id);
    for (const tc of m.tool_calls ?? []) if (tc.id) seen.add(tc.id);
  }
  const executed: NonNullable<StreamAccumulator["toolCallEvents"]> = [];
  for (const event of events ?? []) {
    if (!event.id || event.output === undefined || event.output === null || seen.has(event.id)) {
      continue;
    }
    seen.add(event.id);
    executed.push(event);
  }
  if (executed.length === 0) return [];

  return [
    {
      role: "assistant",
      content: undefined,
      tool_calls: executed.map((event) => ({
        id: event.id,
        type: "function",
        function: { name: event.name, arguments: event.arguments },
      })),
    },
    ...executed.map(
      (event) =>
        ({
          role: "tool",
          tool_call_id: event.id,
          content: [{ type: "text", text: toolOutputForModel(event.name, event.output ?? "") }],
        }) as LlmapiMessage
    ),
  ];
}

function getToolName(tool: Record<string, unknown>): string | undefined {
  const func = tool.function as Record<string, unknown> | undefined;
  const nestedName = func?.name;
  if (typeof nestedName === "string") return nestedName;
  const flatName = tool.name;
  if (typeof flatName === "string") return flatName;
  return undefined;
}

/**
 * The tools to keep once the user approves a confirm card whose action maps to
 * a tool set: the set's members and the tool-search tool that loads deferred
 * members. The confirm tool stays only when an approved card lacked a field
 * its action requires, so the model can show a complete one; after a complete
 * card, offering it again only invites a second card for the same approval.
 * Returns undefined to leave the tools alone: nothing was confirmed, the action
 * maps to no set, or none of the set's members is on offer.
 */
export function toolsAfterConfirmation(
  apiTools: Array<Record<string, unknown>>,
  executionResults: ReadonlyArray<{ name?: string; result?: unknown }>
): Array<Record<string, unknown>> | undefined {
  const members = new Set<string>();
  let keepConfirm = false;
  for (const r of executionResults) {
    if (r.name !== CONFIRM_TOOL_NAME) continue;
    const answer = r.result as
      | { confirmed?: unknown; action?: unknown; parameters?: unknown }
      | null
      | undefined;
    if (answer?.confirmed !== true || typeof answer.action !== "string") continue;
    const setName = CONFIRMED_ACTION_TOOL_SETS.get(answer.action.trim().toLowerCase());
    const set = BUILT_IN_TOOL_SETS.find((s) => s.name === setName);
    for (const member of set?.members ?? []) members.add(member);
    if (missingConfirmFields(answer.action, answer.parameters).length > 0) keepConfirm = true;
  }
  if (!apiTools.some((t) => members.has(getToolName(t) ?? ""))) return undefined;
  return apiTools.filter((t) => {
    const name = getToolName(t) ?? "";
    return (
      members.has(name) ||
      name === TOOL_SEARCH_TOOL_NAME ||
      (keepConfirm && name === CONFIRM_TOOL_NAME)
    );
  });
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
  /**
   * The round's own finish reason, as the provider sent it — `"length"` means
   * this round hit the output ceiling.
   *
   * Per-round, not per-turn: a round can truncate and the loop still recover on
   * the next one, which is why the loop does not treat it as an error on its
   * own (see the truncation guard below). Without it a consumer watching steps
   * cannot tell a round that said everything it meant to from one that was cut
   * off mid-argument — they differ only in this field (#805).
   *
   * Absent when the provider sent no finish reason. Note that no step event
   * fires for the round that *ends* a turn, so use {@link RunTerminalState} on
   * the result for the final round.
   */
  finishReason?: string;
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
  /**
   * Optional per-call override for the request path. When set, every streaming
   * request targets this path instead of the endpoint the strategy resolves from
   * the model. Only the URL path changes — the request body and response parsing
   * follow the resolved strategy exactly as they would without the override.
   *
   * Must be a non-empty, root-relative path (e.g. `"/api/v1/utility/responses"`);
   * a missing leading slash is normalized on. Empty/whitespace-only values and
   * protocol-relative (`"//host"`) or absolute (`"scheme://host"`) URLs are
   * rejected — the transport builds the URL as `baseUrl + endpoint`, so a bad
   * value would silently hit the portal root or send the request (and its Bearer
   * token) off-origin. An invalid override is reported like any other pre-flight
   * failure: `onRunError` fires and the run resolves to `{ data: null, error }`
   * (no throw).
   * @default undefined (path resolved from the model / `apiType`)
   */
  endpointOverride?: string;
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
  /**
   * Token budget for the whole call: input + output tokens summed across
   * rounds, as reported by the provider. Once cumulative usage reaches the
   * budget, the next continuation forces `toolChoice: "none"` so the model
   * wraps up with text instead of starting further tool rounds — the same
   * mechanism `maxToolRounds` uses. Because a round's cost is only known
   * after it completes, the budget can overshoot by at most one round plus
   * the wrap-up response. Gives hosts a hard, predictable per-message cost
   * ceiling independent of how chatty the model is. Providers that don't
   * report usage never trigger it. No budget by default.
   */
  maxTurnTokens?: number;
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
  /**
   * Opt into resumable streaming. Sends `X-Stream-Resumable: 1` on every
   * streaming request so the portal keeps generating into its buffer after a
   * client disconnect. Without this, detachSignal still ends the loop but
   * `resume` is always null (the server kills generation on disconnect).
   * @default false
   */
  resumable?: boolean;
  /**
   * Abort-like signal meaning "client is going away, keep generating server-side".
   * Tears the stream down like `signal`, but the result is the detached variant:
   * smoothers are FLUSHED (not destroyed), partial data is returned, and a
   * StreamResumeHandle is included when available. An abort on `signal` always
   * wins over a detach when both fire.
   */
  detachSignal?: AbortSignal;
  /**
   * Fires when a streaming response's headers arrive and carry X-Inference-ID.
   * Happy path: once per round. Transport-level retries dispatch a fresh HTTP
   * request with a fresh id, so this re-fires per attempt — the latest value is
   * authoritative and is what the resume handle carries. Errors thrown by the
   * callback are swallowed (observer contract, same as hooks).
   */
  onStreamMeta?: (event: StreamMetaEvent) => void;
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
   * each pre-processor are inserted in array order before the latest user message for the
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
   * Best-effort, client-side PII obfuscation — NOT a compliance guarantee.
   * When enabled, the text of outbound messages (all roles, plus tool results
   * on continuation rounds and any injected pre-processor context) is scanned
   * for personally identifiable information and matches are replaced with
   * tagged placeholders before the request leaves the device. Both the
   * streamed and final response are de-anonymized, so the user sees original
   * values.
   *
   * Detection is regex-based, so it can miss or over-match: it does NOT detect
   * names, and it does NOT scan non-text content (images, file uploads,
   * attachments) or model-generated tool-call arguments. Pass `true` for
   * default detection or a `PiiRedactor` instance to share placeholder state
   * across calls in the same conversation (recommended). Categories can be
   * tuned via `new PiiRedactor({ excludeCategories, extraPatterns })`.
   */
  piiRedaction?: boolean | PiiRedactor;
  /**
   * Called with the PII matches found each time outbound messages are redacted
   * (initial request, injected pre-processor context, and tool-result
   * continuation rounds). Useful for surfacing "redacted N emails, 1 SSN" to
   * the user for consent. Only fired when `piiRedaction` is active and at least
   * one match was found. Errors thrown by the callback are swallowed.
   */
  onPiiRedacted?: (matches: PiiMatch[]) => void;
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

/**
 * Terminal state of the LAST model response in the turn, normalized to the
 * completions vocabulary (`"stop"` | `"length"` | `"tool_calls"` | provider-
 * specific values). `undefined` when the stream carried no finish reason at all.
 *
 * Exposed because neither response shape reliably carries it out to a caller.
 * The Responses shape now carries `status` / `incomplete_details` — added in
 * `clientCompat` and emitted by `buildFinalResponse` — but only in the
 * Responses vocabulary, so a caller reading it has to translate
 * `incomplete_details.reason === "max_output_tokens"` itself. Completions
 * exposes `choices[0].finish_reason`, but omits `tool_calls` entirely when
 * there are none, so a caller sniffing the response cannot tell "no tool calls"
 * from "field absent". This field answers both questions in one vocabulary,
 * for either transport.
 *
 * The loop already knows both, unambiguously and identically for either API.
 * Reporting them here means callers and test harnesses stop reverse-engineering
 * them from a response shape that cannot answer. See anuma-ai/sdk#805.
 */
export type RunTerminalState = {
  /** Normalized finish reason of the final response. `"length"` means the output
   *  ceiling cut it off; anything else means the model stopped on its own. */
  finishReason?: string;
  /** Tool calls the final response carried. `0` is meaningful — combined with
   *  empty content it identifies a turn that ended having produced nothing. */
  finalToolCallCount: number;
};

export type RunToolLoopResult =
  | {
      data: ApiResponse;
      error: null;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
      /** Results from tools that were auto-executed by the SDK */
      autoExecutedToolResults?: AutoExecutedToolResult[];
      /** Terminal state of the final model response. See {@link RunTerminalState}. */
      terminalState?: RunTerminalState;
    }
  | {
      data: ApiResponse | null;
      error: string;
      /** HTTP status code from the SSE connection, if available */
      statusCode?: number;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
      /** True when the loop exited via detachSignal. `error` is "Request detached". */
      detached?: true;
      /** Non-null only when `resumable` was true AND an inference id was captured before detach. */
      resume?: StreamResumeHandle | null;
      /**
       * Terminal state of the final model response, when the failure is one the
       * loop diagnosed FROM that response — today, the truncated-to-nothing
       * error. See {@link RunTerminalState}.
       *
       * Absent on failures that never got a terminal response to read (transport
       * errors, detach, an SSE failure mid-stream), which is why it stays
       * optional here. Present on the truncation error specifically because that
       * is where it is most diagnostic: a caller can branch on
       * `finishReason === "length"` instead of matching the error string.
       */
      terminalState?: RunTerminalState;
    };

/** Capability header: tells the portal this client can resume a detached stream. Pinned with zeta-chain/ai-portal#1139. */
export const STREAM_RESUMABLE_HEADER = "X-Stream-Resumable";
/** Response header carrying the per-request stream id, issued by the portal pre-stream. */
export const INFERENCE_ID_HEADER = "X-Inference-ID";
const CONVERSATION_ID_HEADER = "X-Conversation-ID";

/**
 * Everything resumeStream() needs to replay a detached stream.
 * @public
 */
export type StreamResumeHandle = {
  inferenceId: string;
  /** The RESOLVED api type (never "auto") — resolveApiType() already ran inside runToolLoop. */
  apiType: Exclude<ApiType, "auto">;
  model?: string;
  conversationId?: string;
};

/**
 * Payload for RunToolLoopOptions.onStreamMeta.
 * @public
 */
export type StreamMetaEvent = {
  inferenceId: string;
  /** 0 = initial request, 1+ = continuation round (same numbering as RequestEvent.round). */
  round: number;
};

/** Options passed to a streaming transport function. */
export type StreamingTransportOptions = {
  baseUrl: string;
  endpoint: string;
  /** @default "POST" */
  method?: "GET" | "POST";
  /** Request body. Optional — GET resume requests have no body. */
  body?: Record<string, unknown>;
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onSseError?: (error: unknown) => void;
  /** Fires once per request when response headers arrive with X-Inference-ID (2xx only). */
  onStreamMeta?: (meta: { inferenceId: string }) => void;
  /**
   * Fires whenever bytes arrive on the wire — data frames AND the keep-alive
   * comment lines (`: ...`) the SSE parser otherwise discards. A pure liveness
   * signal: a consumer running an idle watchdog uses it to tell a slow-but-alive
   * stream (the server still heart-beating through a long reasoning silence)
   * apart from a dead connection (no bytes at all). Not every transport emits it
   * — the xhr transport does; treat its absence as "no extra liveness info".
   */
  onActivity?: () => void;
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
 * @internal — exported only so the resume primitive can share the same
 * fetch-based default; not part of the public surface.
 */
export const defaultTransport: StreamingTransport = (options) => {
  const url = `${options.baseUrl}${options.endpoint}`;
  const fetchWithMeta: typeof fetch = async (input, init) => {
    const response = await errorCapturingFetch(input, init);
    const id = response.headers.get(INFERENCE_ID_HEADER);
    if (id) {
      try {
        options.onStreamMeta?.({ inferenceId: id });
      } catch {
        /* observer error, swallow */
      }
    }
    return response;
  };
  return createSseClient({
    method: options.method ?? "POST",
    url,
    serializedBody: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : undefined),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : undefined),
      ...options.headers,
    },
    signal: options.signal,
    sseMaxRetryAttempts: 1,
    onSseError: options.onSseError,
    fetch: fetchWithMeta,
  });
};

function linkAbortSignals(
  a?: AbortSignal,
  b?: AbortSignal
): { signal: AbortSignal | undefined; cleanup: () => void } {
  if (!a || !b) return { signal: a ?? b, cleanup: () => {} };
  const controller = new AbortController();
  if (a.aborted || b.aborted) {
    controller.abort();
    return { signal: controller.signal, cleanup: () => {} };
  }
  const onAbort = () => controller.abort();
  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      a.removeEventListener("abort", onAbort);
      b.removeEventListener("abort", onAbort);
    },
  };
}

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
    endpointOverride,
    temperature,
    maxOutputTokens,
    tools,
    toolChoice: toolChoiceArg,
    maxToolRounds,
    maxTurnTokens,
    reasoning,
    thinking,
    imageModel,
    conversationId,
    smoothing,
    signal,
    resumable,
    detachSignal,
    onStreamMeta,
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
    piiRedaction,
    onPiiRedacted,
  } = options;
  const hooks: RunHooks | undefined = Array.isArray(hooksOption)
    ? composeHooks(hooksOption)
    : hooksOption;
  const runId = generateRunId();
  let messages = options.messages;

  const resolved = resolveApiType(apiType, model);
  const strategy = getStrategy(resolved);

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

  await safeAwait(() =>
    hooks?.onRunStart?.({
      runId,
      model,
      messages,
      tools: tools ?? [],
    })
  );

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

  let effectiveEndpoint = strategy.endpoint;
  if (endpointOverride !== undefined) {
    const overrideValidation = validateEndpointOverride(endpointOverride);
    if (!overrideValidation.valid) {
      if (onError) onError(new Error(overrideValidation.message));
      await fireRunError({
        error: overrideValidation.message,
        stage: "model",
        errorObject: new Error(overrideValidation.message),
      });
      return { data: null, error: overrideValidation.message };
    }
    effectiveEndpoint = overrideValidation.endpoint;
  }

  const { signal: combinedSignal, cleanup: cleanupSignalLink } = linkAbortSignals(
    signal,
    detachSignal
  );
  const isDetach = () => detachSignal?.aborted === true && signal?.aborted !== true;

  const conversationHeader =
    conversationId && conversationId.trim() !== ""
      ? { [CONVERSATION_ID_HEADER]: conversationId.trim() }
      : undefined;
  const effectiveHeaders = {
    ...headers,
    ...conversationHeader,
    ...(resumable ? { [STREAM_RESUMABLE_HEADER]: "1" } : undefined),
  };

  let lastInferenceId: string | null = null;
  const makeResumeHandle = (): StreamResumeHandle | null =>
    resumable === true && lastInferenceId !== null
      ? { inferenceId: lastInferenceId, apiType: resolved, model, conversationId }
      : null;

  if (combinedSignal?.aborted) {
    cleanupSignalLink();
    if (isDetach()) {
      await fireRunError({ error: "Request detached", stage: "model" });
      return { data: null, error: "Request detached", detached: true, resume: null };
    }
    await fireRunError({ error: "Request aborted", stage: "model" });
    return { data: null, error: "Request aborted" };
  }

  const redactor = resolvePiiRedactor(piiRedaction);

  const redactBatch = async (msgs: LlmapiMessage[]): Promise<LlmapiMessage[]> => {
    if (!redactor) return msgs;
    const { messages: redacted, matches } = await redactor.redactMessagesAsync(msgs);
    if (matches.length > 0 && onPiiRedacted) {
      try {
        onPiiRedacted(matches);
      } catch {
        /* observer error, swallow — same philosophy as the other hooks */
      }
    }
    return redacted;
  };

  messages = await redactBatch(messages);

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
              return await p({ prompt: text, embedding, signal: combinedSignal });
            } catch (err) {
              console.warn("[runToolLoop] pre-processor failed:", err);
              return undefined;
            }
          })
        );
        const extra = results.flatMap((r) => (Array.isArray(r) ? r : []));
        if (extra.length > 0) {
          let userIndex = messages.length - 1;
          while (userIndex > 0 && messages[userIndex].role !== "user") userIndex--;
          messages = [
            ...messages.slice(0, userIndex),
            ...(await redactBatch(extra)),
            ...messages.slice(userIndex),
          ];
        }
      }
    } catch (err) {
      console.warn("[runToolLoop] pre-processor stage failed:", err);
    }
  }

  const contentDeAnon = redactor && onData ? createStreamingDeAnonymizer(redactor, onData) : null;
  const thinkingDeAnon =
    redactor && onThinking ? createStreamingDeAnonymizer(redactor, onThinking) : null;
  const emitData = contentDeAnon ? contentDeAnon.push : onData;
  const emitThinking = thinkingDeAnon ? thinkingDeAnon.push : onThinking;
  const flushDeAnon = (): void => {
    contentDeAnon?.flush();
    thinkingDeAnon?.flush();
  };

  type Accumulator = ReturnType<typeof createStreamAccumulator>;
  const buildResponseFinal = (acc: Accumulator): ApiResponse =>
    redactor
      ? strategy.buildFinalResponse({
          ...acc,
          content: redactor.deAnonymize(acc.content),
          thinking: redactor.deAnonymize(acc.thinking),
        })
      : strategy.buildFinalResponse(acc);
  const finalContentText = (acc: Accumulator): string =>
    redactor ? redactor.deAnonymize(acc.content) : acc.content;

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
      const choices = (resp as { choices?: Array<{ finish_reason?: string | null }> }).choices;
      if (Array.isArray(choices) && choices[0]?.finish_reason) {
        return choices[0].finish_reason ?? undefined;
      }
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

    const returnDetached = async (
      acc: ReturnType<typeof createStreamAccumulator>,
      smoothers: StreamSmoother[]
    ): Promise<RunToolLoopResult> => {
      for (const smoother of smoothers) smoother.flush();
      flushDeAnon();
      await fireAfterModelCall(buildModelCallEndPayload(acc, { error: "detached" }));
      await fireRunError({ error: "Request detached", stage: "model" });
      return {
        data: buildResponseFinal(acc),
        error: "Request detached",
        detached: true,
        resume: makeResumeHandle(),
        toolsChecksum: acc.toolsChecksum,
      };
    };

    for (let attempt = 0; attempt < STREAM_RETRY_MAX_ATTEMPTS; attempt++) {
      sseError = null;

      if (combinedSignal?.aborted) {
        if (isDetach()) {
          await fireAfterModelCall({ content: "", toolCalls: [], error: "detached" });
          await fireRunError({ error: "Request detached", stage: "model" });
          return {
            data: null,
            error: "Request detached",
            detached: true,
            resume: makeResumeHandle(),
          };
        }
        await fireAfterModelCall({ content: "", toolCalls: [], error: "aborted" });
        await fireRunError({ error: "Request aborted", stage: "model" });
        return { data: null, error: "Request aborted" };
      }

      if (onRequest) onRequest(measureRequest(0, attempt, requestBody, messages, apiTools));

      const sseResult = makeStreamingRequest({
        baseUrl,
        endpoint: effectiveEndpoint,
        body: requestBody,
        token,
        headers: effectiveHeaders,
        signal: combinedSignal,
        onSseError: (error) => {
          sseError = wrapSseError(error);
        },
        onStreamMeta: (meta) => {
          lastInferenceId = meta.inferenceId;
          try {
            onStreamMeta?.({ inferenceId: meta.inferenceId, round: 0 });
          } catch {
            /* observer error, swallow — same philosophy as safeAwait */
          }
        },
      });

      accumulator = createStreamAccumulator(model || undefined);
      contentSmoother = new StreamSmoother((text) => {
        if (emitData) emitData(text);
      }, smoothing);
      thinkingSmoother = new StreamSmoother((text) => {
        if (emitThinking) emitThinking(text);
      }, smoothing);

      let chunksEmittedDownstream = false;
      try {
        for await (const chunk of sseResult.stream) {
          if (combinedSignal?.aborted) {
            if (isDetach()) {
              return await returnDetached(accumulator, [contentSmoother, thinkingSmoother]);
            }
            contentSmoother.destroy();
            thinkingSmoother.destroy();
            await fireAfterModelCall(buildModelCallEndPayload(accumulator, { error: "aborted" }));
            await fireRunError({ error: "Request aborted", stage: "model" });
            return {
              data: buildResponseFinal(accumulator),
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
        if (sseError !== null) throw sseError as Error;
        break;
      } catch (streamErr) {
        if (isAbortError(streamErr) || combinedSignal?.aborted) {
          if (isDetach()) {
            return await returnDetached(accumulator, [contentSmoother, thinkingSmoother]);
          }
          contentSmoother.destroy();
          thinkingSmoother.destroy();
          await fireAfterModelCall(buildModelCallEndPayload(accumulator, { error: "aborted" }));
          const abortErr = streamErr instanceof Error ? streamErr : new Error("Request aborted");
          await fireRunError({ error: "Request aborted", stage: "model", errorObject: abortErr });
          return {
            data: buildResponseFinal(accumulator),
            error: "Request aborted",
            toolsChecksum: accumulator.toolsChecksum,
          };
        }

        contentSmoother.destroy();
        thinkingSmoother.destroy();

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
          await sleep(backoff, combinedSignal);
          continue;
        }
        const msg = streamErr instanceof Error ? streamErr.message : String(streamErr);
        await fireAfterModelCall(buildModelCallEndPayload(accumulator, { error: msg }));
        throw streamErr;
      }
    }

    if (accumulator.toolCalls.size > 0) {
      contentSmoother.flush();
      thinkingSmoother.flush();
    } else {
      await Promise.all([contentSmoother.drain(), thinkingSmoother.drain()]);
    }
    flushDeAnon();
    await fireAfterModelCall(buildModelCallEndPayload(accumulator));

    const response = buildResponseFinal(accumulator);

    const executorMap = createToolExecutorMap(tools);
    let currentAccumulator = accumulator;
    let currentMessages = messages;
    let toolIteration = 0;
    const ABSOLUTE_MAX_TOOL_ROUNDS = 50;
    const effectiveMaxToolRounds = Math.min(maxToolRounds ?? 20, ABSOLUTE_MAX_TOOL_ROUNDS);
    const hardIterationCap = effectiveMaxToolRounds + 5;
    const isConnectorTool = (name: string) => CONNECTOR_PREFIXES.some((p) => name.startsWith(p));
    const connectorCallCount = { total: 0 };
    let connectorLimitHit = false;
    const accumulatedToolResults: AutoExecutedToolResult[] = [];

    let turnTokensUsed = 0;

    while (currentAccumulator.toolCalls.size > 0 && toolIteration < hardIterationCap) {
      toolIteration++;
      sseError = null;
      turnTokensUsed +=
        (currentAccumulator.usage.prompt_tokens ?? 0) +
        (currentAccumulator.usage.completion_tokens ?? 0);

      const toolCallsToExecute: AccumulatedToolCall[] = [];

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
            const skipErrorType = combinedSignal?.aborted ? "cancelled" : "execution";
            executionResults.push({
              id: tc.id,
              name: tc.name,
              error: errorMsg,
              errorType: skipErrorType,
            });
            await safeAwait(() =>
              hooks?.afterToolUse?.({
                runId,
                stepIndex,
                toolCallId: tc.id,
                name: tc.name,
                error: errorMsg,
                errorType: skipErrorType,
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
            const toolCallForExec =
              redactor && executorConfig.deAnonymizeArgs && toolCall.arguments
                ? { ...toolCall, arguments: redactor.deAnonymize(toolCall.arguments) }
                : toolCall;
            const { result, error, errorType } = await executeToolCall(
              toolCallForExec,
              executorConfig.executor,
              executorConfig.executorTimeout,
              combinedSignal
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

      if (tools && apiTools) {
        const successfullyExecutedNames = new Set<string>();
        const successfulResults: unknown[] = [];
        for (const r of executionResults) {
          if (!r.error && !isToolErrorResult(r.result) && "name" in r && r.name) {
            successfullyExecutedNames.add(r.name);
            successfulResults.push(r.result);
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
            if (!toolName) continue;
            const removeAfterResult = tc.removeAfterResult;
            if (
              (tc.removeAfterExecution === true && successfullyExecutedNames.has(toolName)) ||
              (typeof removeAfterResult === "function" &&
                successfulResults.some((result) => {
                  try {
                    return removeAfterResult(result);
                  } catch {
                    return false;
                  }
                }))
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

      if (apiTools) {
        const confirmedTools = toolsAfterConfirmation(apiTools, executionResults);
        if (confirmedTools) {
          const kept = new Set(confirmedTools.map(getToolName));
          if (
            typeof toolChoice === "string" &&
            !kept.has(toolChoice) &&
            apiTools.some((t) => getToolName(t) === toolChoice)
          ) {
            toolChoice = "auto";
          }
          apiTools = confirmedTools;
          for (const [name] of executorMap) {
            if (!kept.has(name)) executorMap.delete(name);
          }
        }
      }

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
          ...(currentAccumulator.finishReason !== undefined && {
            finishReason: currentAccumulator.finishReason,
          }),
        });
      }

      thinkingSmoother.flush();
      thinkingDeAnon?.flush();

      for (const r of executionResults) {
        if (!r.error && r.name) {
          accumulatedToolResults.push({ name: r.name, result: r.result });
        }
      }

      const continueResults = executionResults.filter((r) => {
        if (!r.name) return false;
        if (r.error || isToolErrorResult(r.result)) return true;
        return executorMap.get(r.name)?.skipContinuation !== true;
      });

      if (continueResults.length === 0) {
        const skipResponse = buildResponseFinal(currentAccumulator);
        if (onFinish) onFinish(skipResponse);
        await fireRunEnd({
          finalContent: finalContentText(currentAccumulator),
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

      const toolResultMessages: LlmapiMessage[] = [
        ...serverToolCallMessages(
          currentAccumulator.toolCallEvents,
          currentMessages,
          new Set(toolCallsToExecute.map((tc) => tc.id))
        ),
        assistantMessage,
      ];
      for (const execResult of continueResults) {
        const resultContent = execResult.error
          ? `Error: ${execResult.error}`
          : safeJsonStringify(execResult.result);

        toolResultMessages.push({
          role: "tool",
          content: [
            { type: "text", text: wrapConnectorToolResult(execResult.name ?? "", resultContent) },
          ],
          tool_call_id: execResult.id,
        } as LlmapiMessage);
      }

      currentMessages = [...currentMessages, ...(await redactBatch(toolResultMessages))];

      const turnBudgetExhausted = maxTurnTokens !== undefined && turnTokensUsed >= maxTurnTokens;
      const relaxedToolChoice = toolChoice === "required" ? "auto" : toolChoice;
      const continuationToolChoice =
        toolIteration >= effectiveMaxToolRounds || turnBudgetExhausted ? "none" : relaxedToolChoice;

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

        if (combinedSignal?.aborted) {
          if (isDetach()) {
            return await returnDetached(currentAccumulator, []);
          }
          await fireAfterModelCall(
            buildModelCallEndPayload(currentAccumulator, { error: "aborted" })
          );
          await fireRunError({ error: "Request aborted", stage: "model" });
          return {
            data: buildResponseFinal(currentAccumulator),
            error: "Request aborted",
            toolsChecksum: currentAccumulator.toolsChecksum,
          };
        }

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

        const continuationRound = toolIteration;
        const continuationResult = makeStreamingRequest({
          baseUrl,
          endpoint: effectiveEndpoint,
          body: continuationRequestBody,
          token,
          headers: effectiveHeaders,
          signal: combinedSignal,
          onSseError: (error) => {
            sseError = wrapSseError(error);
          },
          onStreamMeta: (meta) => {
            lastInferenceId = meta.inferenceId;
            try {
              onStreamMeta?.({ inferenceId: meta.inferenceId, round: continuationRound });
            } catch {
              /* observer error, swallow — same philosophy as safeAwait */
            }
          },
        });

        currentAccumulator = createStreamAccumulator(model || undefined);
        contContentSmoother = new StreamSmoother((text) => {
          if (emitData) emitData(text);
        }, smoothing);
        contThinkingSmoother = new StreamSmoother((text) => {
          if (emitThinking) emitThinking(text);
        }, smoothing);

        let chunksEmittedDownstream = false;
        try {
          for await (const chunk of continuationResult.stream) {
            if (combinedSignal?.aborted) {
              if (isDetach()) {
                return await returnDetached(currentAccumulator, [
                  contContentSmoother,
                  contThinkingSmoother,
                ]);
              }
              contContentSmoother.destroy();
              contThinkingSmoother.destroy();
              await fireAfterModelCall(
                buildModelCallEndPayload(currentAccumulator, { error: "aborted" })
              );
              await fireRunError({ error: "Request aborted", stage: "model" });
              return {
                data: buildResponseFinal(currentAccumulator),
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
          break;
        } catch (streamErr) {
          if (isAbortError(streamErr) || combinedSignal?.aborted) {
            if (isDetach()) {
              return await returnDetached(currentAccumulator, [
                contContentSmoother,
                contThinkingSmoother,
              ]);
            }
            contContentSmoother.destroy();
            contThinkingSmoother.destroy();
            await fireAfterModelCall(
              buildModelCallEndPayload(currentAccumulator, { error: "aborted" })
            );
            const abortErr = streamErr instanceof Error ? streamErr : new Error("Request aborted");
            await fireRunError({ error: "Request aborted", stage: "model", errorObject: abortErr });
            return {
              data: buildResponseFinal(currentAccumulator),
              error: "Request aborted",
              toolsChecksum: currentAccumulator.toolsChecksum,
            };
          }

          contContentSmoother.destroy();
          contThinkingSmoother.destroy();

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
            await sleep(backoff, combinedSignal);
            continue;
          }
          const msg = streamErr instanceof Error ? streamErr.message : String(streamErr);
          await fireAfterModelCall(buildModelCallEndPayload(currentAccumulator, { error: msg }));
          throw streamErr;
        }
      }

      if (currentAccumulator.toolCalls.size > 0) {
        contContentSmoother.flush();
        contThinkingSmoother.flush();
      } else {
        await Promise.all([contContentSmoother.drain(), contThinkingSmoother.drain()]);
      }
      flushDeAnon();
      await fireAfterModelCall(buildModelCallEndPayload(currentAccumulator));
    }

    if (connectorLimitHit) {
      const tip =
        "\n\n> **Tip:** Switch to a **Thinking model** for more detailed results with connectors like Notion, Google Calendar, and Drive.\n";
      if (emitData) emitData(tip);
      flushDeAnon();
      currentAccumulator.content += tip;
    }

    const truncatedToNothing = (acc: {
      finishReason?: string;
      toolCalls: Map<string, unknown>;
      content: string;
    }): boolean =>
      acc.finishReason === "length" && acc.toolCalls.size === 0 && acc.content.trim() === "";
    const TRUNCATION_ERROR =
      "Model response was truncated at the output-token limit before it produced " +
      "any usable content or tool call. Retry with a higher `maxOutputTokens`, or " +
      "prompt for fewer/smaller tool calls per turn.";

    const terminalStateOf = (acc: {
      finishReason?: string;
      toolCalls: Map<string, unknown>;
    }): RunTerminalState => ({
      ...(acc.finishReason !== undefined && { finishReason: acc.finishReason }),
      finalToolCallCount: acc.toolCalls.size,
    });

    if (toolIteration > 0) {
      if (truncatedToNothing(currentAccumulator)) {
        await fireRunError({ error: TRUNCATION_ERROR, stage: "model" });
        return {
          data: buildResponseFinal(currentAccumulator),
          error: TRUNCATION_ERROR,
          toolsChecksum: currentAccumulator.toolsChecksum,
          terminalState: terminalStateOf(currentAccumulator),
        };
      }
      const finalResponse = buildResponseFinal(currentAccumulator);
      if (onFinish) onFinish(finalResponse);
      await fireRunEnd({
        finalContent: finalContentText(currentAccumulator),
        totalSteps: stepIndex + 1,
      });
      return {
        data: finalResponse,
        error: null,
        toolsChecksum: currentAccumulator.toolsChecksum,
        autoExecutedToolResults: accumulatedToolResults,
        terminalState: terminalStateOf(currentAccumulator),
      };
    }

    if (truncatedToNothing(accumulator)) {
      await fireRunError({ error: TRUNCATION_ERROR, stage: "model" });
      return {
        data: response,
        error: TRUNCATION_ERROR,
        toolsChecksum: accumulator.toolsChecksum,
        terminalState: terminalStateOf(accumulator),
      };
    }

    if (onFinish) onFinish(response);
    await fireRunEnd({
      finalContent: finalContentText(accumulator),
      totalSteps: stepIndex + 1,
    });
    return {
      data: response,
      error: null,
      toolsChecksum: accumulator.toolsChecksum,
      terminalState: terminalStateOf(accumulator),
    };
  } catch (err) {
    if (isAbortError(err)) {
      if (isDetach()) {
        await fireRunError({ error: "Request detached", stage: "model" });
        return {
          data: null,
          error: "Request detached",
          detached: true,
          resume: makeResumeHandle(),
        };
      }
      const abortErr = err instanceof Error ? err : new Error("Request aborted");
      await fireRunError({ error: "Request aborted", stage: "model", errorObject: abortErr });
      return { data: null, error: "Request aborted" };
    }

    const errorMsg = err instanceof Error ? err.message : "Failed to send message.";
    const errorObj = err instanceof Error ? err : new Error(errorMsg);
    if (onError) onError(errorObj);
    await fireRunError({ error: errorMsg, stage: "model", errorObject: errorObj });
    const statusCode =
      err instanceof Error && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : undefined;
    return { data: null, error: errorMsg, statusCode };
  } finally {
    cleanupSignalLink();
  }
}
