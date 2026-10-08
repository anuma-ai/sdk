import { BASE_URL } from "../../clientConfig";
import type { StreamingTransport, StreamResumeHandle } from "./toolLoop";
import { defaultTransport } from "./toolLoop";
import { getStrategy } from "./useChat/strategies";
import { type ApiResponse, stripToolCalls } from "./useChat/strategies/types";
import { StreamSmoother, type StreamSmoothingConfig } from "./useChat/StreamSmoother";
import { createStreamAccumulator, getInStreamErrorMessage, isDoneMarker } from "./useChat/utils";

export type { StreamResumeHandle } from "./toolLoop";
export { INFERENCE_ID_HEADER, STREAM_RESUMABLE_HEADER } from "./toolLoop";

/**
 * Build the replay path for a detached stream. The portal serves the buffered
 * stream from seq 0 on a GET to this path — no `starting_after`, no `id:`
 * cursor, no request body. Replay always starts from the first buffered byte
 * and the client rebuilds its own view with a fresh accumulator; partial
 * client state is never sent back to the server.
 *
 * Exported so client repos can mock the endpoint in E2E without string drift.
 */
export function streamReplayPath(inferenceId: string): string {
  return `/api/v1/chat/streams/${encodeURIComponent(inferenceId)}`;
}

/**
 * Build the cancel path for a detached stream. A POST here tells the portal to
 * stop generating into the buffer and release it — the billing-safe teardown
 * for "the user pressed stop after we'd already detached".
 *
 * Exported so client repos can mock the endpoint in E2E without string drift.
 */
export function streamCancelPath(inferenceId: string): string {
  return `${streamReplayPath(inferenceId)}/cancel`;
}

/**
 * Thrown when the portal answers `410 Gone` to a replay GET: the buffered
 * stream is gone — expired (10-min sliding TTL), absent, not owned by the
 * caller, or already cancelled. There is nothing to replay; the answer is
 * permanently lost and the caller should fall back to a fresh send rather than
 * retry. A `stop()`-then-resume race lands here and finalizes as stopped, which
 * is correct.
 *
 * `resumeStream` throws this (it does not return it) and fires neither
 * `onFinish` nor `onError` — there is no body to deliver.
 * @public
 */
export class StreamExpiredError extends Error {
  readonly name = "StreamExpiredError";
  readonly inferenceId: string;
  constructor(inferenceId: string, message?: string) {
    super(message ?? `The resumable stream "${inferenceId}" has expired or no longer exists`);
    this.inferenceId = inferenceId;
  }
}

/**
 * Options for {@link resumeStream}.
 * @public
 */
export interface ResumeStreamOptions {
  /** The handle captured from a detached `runToolLoop` result. */
  handle: StreamResumeHandle;
  /**
   * Fresh bearer token. The CALLER fetches it at resume time — a multi-minute
   * background gap expires the bearer, so a token captured when the original
   * stream started must never be reused (see `useChat.resumeStream`).
   */
  token: string;
  /** Base URL for the portal. @default the SDK's configured BASE_URL. */
  baseUrl?: string;
  /**
   * Streaming transport. Defaults to the GET-capable fetch transport; Expo
   * passes `xhrTransport` (RN can't stream `fetch` bodies).
   */
  transport?: StreamingTransport;
  /** Aborts the replay; the partial is returned as an interrupted result. */
  signal?: AbortSignal;
  /** Adaptive output smoothing for the replayed content. @default true */
  smoothing?: StreamSmoothingConfig | boolean;
  /**
   * Client-side watchdog for a dead live-tail. @default 120_000ms.
   *
   * Deliberately NOT ~30s: the portal tolerates >100s reasoning silences (no
   * `data:` frames on the replay connection during them) and its own liveness
   * rule (heartbeat stale >90s => SSE error + `[DONE]`) is the authoritative
   * guard. This client timer is a backstop for a half-open TCP connection and
   * must sit ABOVE the server's 90s rule so the server error always wins when
   * the portal is reachable. Set to 0 / Infinity to disable.
   */
  idleTimeoutMs?: number;
  /** Content text deltas as they replay (always from seq 0 — reset accumulated text first). */
  onData?: (chunk: string) => void;
  /** Thinking/reasoning deltas as they replay. */
  onThinking?: (chunk: string) => void;
  /** Called once on a clean completion. Never called for 410 nor interrupted terminals. */
  onFinish?: (response: ApiResponse) => void;
  /** Called on a transient/unexpected failure. Never called for 410 (throws) nor interrupted terminals. */
  onError?: (error: Error) => void;
}

/**
 * Result of {@link resumeStream}. A `410 Gone` is the only outcome that throws
 * ({@link StreamExpiredError}); every other terminal is returned.
 *
 * - clean completion → `{ data, error: null, interrupted: false, empty }`
 * - in-stream error / tool-request terminal / idle timeout → `{ data, error,
 *   interrupted: true }` (finalize as a stopped/partial message)
 * - transient transport/HTTP failure (401, 5xx, network) → `{ data, error,
 *   interrupted: false, statusCode? }` (retryable — keep the handle)
 *
 * `empty` is true when the clean terminal delivered ZERO content/thinking
 * deltas — a `[DONE]`-only replay. That is never a real completion (a
 * completed generation always buffered at least one content frame); it means
 * the buffered frames were lost server-side (evicted/trimmed) while the
 * terminal survived. Consumers must NOT persist `data` (an empty response)
 * over content they already hold — keep the detached partial instead. On the
 * empty terminal `onFinish` is NOT fired (there is no completion to deliver);
 * the flag is optional so existing constructors of the clean arm stay valid.
 * @public
 */
export type ResumeStreamResult =
  | { data: ApiResponse; error: null; interrupted: false; empty?: boolean }
  | { data: ApiResponse | null; error: string; interrupted: boolean; statusCode?: number };

function parseSseStatusCode(err: Error): number | undefined {
  const match = err.message.match(/^SSE failed: (\d+)\b/i);
  return match ? Number(match[1]) : undefined;
}

/**
 * Replay a detached stream from the portal's buffer.
 *
 * This is the reconnect primitive: after `runToolLoop` returns the detached
 * variant with a {@link StreamResumeHandle}, `resumeStream` issues a GET to the
 * portal's replay endpoint and rebuilds the response from seq 0 using a FRESH
 * accumulator and FRESH smoothers. Nothing from the original (detached) run is
 * reused — the completions strategy's reasoning-tag parser is stateful, so
 * replaying into reused state would double-count; replay-from-0 into fresh
 * state is the correctness mechanism, not just a simplification.
 *
 * Contract highlights:
 * - **No `starting_after`, no `id:` cursor, no body.** The GET carries the
 *   inference id in the path only; replay is always whole-stream. (The server
 *   reserves `starting_after` but does NOT honor it — sending it would silently
 *   duplicate content.)
 * - **410 → throws {@link StreamExpiredError}.** No `onFinish`/`onError`.
 * - **In-stream error / tool-request terminal → `interrupted: true`.** Flushes
 *   both smoothers and returns the partial; no throw, no `onError`, no `onFinish`.
 * - **token resolved by the caller at resume time** so a refresh during the
 *   detach window is honored.
 *
 * @public
 */
export async function resumeStream(options: ResumeStreamOptions): Promise<ResumeStreamResult> {
  const {
    handle,
    token,
    baseUrl = BASE_URL,
    transport: makeStreamingRequest = defaultTransport,
    signal,
    smoothing,
    idleTimeoutMs = 120_000,
    onData,
    onThinking,
    onFinish,
    onError,
  } = options;

  const strategy = getStrategy(handle.apiType);

  const accumulator = createStreamAccumulator(handle.model || undefined);
  const contentSmoother = new StreamSmoother((text) => {
    if (onData) onData(text);
  }, smoothing);
  const thinkingSmoother = new StreamSmoother((text) => {
    if (onThinking) onThinking(text);
  }, smoothing);

  const idleController = new AbortController();
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let idleFired = false;
  let callerAborted = false;
  let settled = false;
  const idleEnabled =
    idleTimeoutMs > 0 && idleTimeoutMs !== Infinity && typeof setTimeout === "function";
  const armWatchdog = () => {
    if (!idleEnabled || settled) return;
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      idleFired = true;
      idleController.abort();
    }, idleTimeoutMs);
  };
  const disarmWatchdog = () => {
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = undefined;
    }
  };
  const abortMessage = () =>
    callerAborted ? "Resume aborted" : idleFired ? "Resume timed out" : "Resume aborted";
  const onCallerAbort = () => {
    callerAborted = true;
    disarmWatchdog();
    idleController.abort();
  };
  if (signal) {
    if (signal.aborted) {
      callerAborted = true;
      idleController.abort();
    } else signal.addEventListener("abort", onCallerAbort, { once: true });
  }
  const combinedSignal = idleController.signal;
  const cleanup = () => {
    settled = true;
    disarmWatchdog();
    if (signal) signal.removeEventListener("abort", onCallerAbort);
  };

  const buildInterrupted = (message: string): ResumeStreamResult => {
    contentSmoother.flush();
    thinkingSmoother.flush();
    const data =
      accumulator.toolCalls.size > 0
        ? stripToolCalls(strategy.buildFinalResponse(accumulator))
        : strategy.buildFinalResponse(accumulator);
    return { data, error: message, interrupted: true };
  };

  if (combinedSignal.aborted) {
    cleanup();
    return buildInterrupted(abortMessage());
  }

  let sseError: Error | null = null;
  let emittedOutput = false;
  const sseResult = makeStreamingRequest({
    baseUrl,
    endpoint: streamReplayPath(handle.inferenceId),
    method: "GET",
    token,
    signal: combinedSignal,
    onSseError: (error) => {
      sseError = error instanceof Error ? error : new Error(String(error));
    },
    onActivity: armWatchdog,
  });

  armWatchdog();
  try {
    for await (const chunk of sseResult.stream) {
      armWatchdog();

      if (combinedSignal.aborted) {
        cleanup();
        return buildInterrupted(abortMessage());
      }

      if (sseError !== null) break;

      if (isDoneMarker(chunk)) continue;

      const inStreamError = getInStreamErrorMessage(chunk);
      if (inStreamError !== null) {
        cleanup();
        return buildInterrupted(inStreamError);
      }

      if (chunk && typeof chunk === "object") {
        const { content, thinking } = strategy.processStreamChunk(chunk, accumulator);
        if (content) contentSmoother.push(content);
        if (thinking) thinkingSmoother.push(thinking);
        if (content || thinking) emittedOutput = true;
      }
    }
    if (sseError !== null) throw sseError as Error;
  } catch (replayErr) {
    cleanup();
    const err = replayErr instanceof Error ? replayErr : new Error(String(replayErr));
    const statusCode = parseSseStatusCode(err);

    if (statusCode === 410) {
      contentSmoother.flush();
      thinkingSmoother.flush();
      throw new StreamExpiredError(handle.inferenceId);
    }

    if (err.name === "AbortError" || combinedSignal.aborted) {
      return buildInterrupted(abortMessage());
    }

    contentSmoother.flush();
    thinkingSmoother.flush();
    if (onError) onError(err);
    return {
      data: strategy.buildFinalResponse(accumulator),
      error: err.message,
      interrupted: false,
      statusCode,
    };
  }

  cleanup();

  if (accumulator.toolCalls.size > 0) {
    return buildInterrupted("Stream ended with a pending tool request");
  }

  await Promise.all([contentSmoother.drain(), thinkingSmoother.drain()]);
  const response = strategy.buildFinalResponse(accumulator);
  const deliveredOutput = emittedOutput || (accumulator.toolCallEvents?.length ?? 0) > 0;
  if (onFinish && deliveredOutput) onFinish(response);
  return { data: response, error: null, interrupted: false, empty: !deliveredOutput };
}
