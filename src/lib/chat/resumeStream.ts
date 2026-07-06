import { BASE_URL } from "../../clientConfig";
import type { StreamingTransport, StreamResumeHandle } from "./toolLoop";
import { defaultTransport } from "./toolLoop";
import { getStrategy } from "./useChat/strategies";
import { type ApiResponse, stripToolCalls } from "./useChat/strategies/types";
import { StreamSmoother, type StreamSmoothingConfig } from "./useChat/StreamSmoother";
import { createStreamAccumulator, getInStreamErrorMessage, isDoneMarker } from "./useChat/utils";

// Re-export the transport-layer constants and the handle type so a consumer
// that only imports the resume module has the full vocabulary in one place.
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
 * - clean completion → `{ data, error: null, interrupted: false }`
 * - in-stream error / tool-request terminal / idle timeout → `{ data, error,
 *   interrupted: true }` (finalize as a stopped/partial message)
 * - transient transport/HTTP failure (401, 5xx, network) → `{ data, error,
 *   interrupted: false, statusCode? }` (retryable — keep the handle)
 * @public
 */
export type ResumeStreamResult =
  | { data: ApiResponse; error: null; interrupted: false }
  | { data: ApiResponse | null; error: string; interrupted: boolean; statusCode?: number };

/**
 * Extract the HTTP status from a transport SSE error so 410 can be told apart
 * from a transient 401/5xx. Coupled BY CONTRACT to the `SSE failed: {status}`
 * message that {@link sseFailureMessage} produces in xhrTransport; a contract
 * test pins that format so this regex can't silently rot if the producer drifts.
 */
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

  // `handle.apiType` is the already-RESOLVED type from the original run, so the
  // replay parses bytes with the same strategy that produced them. We never
  // re-resolve from the model — that could disagree with how the stream was
  // actually generated.
  const strategy = getStrategy(handle.apiType);

  // Fresh accumulator: the reasoning-tag parser state (partialReasoningTag,
  // insideReasoning, implicitReasoningStart) lives on the accumulator, so a new
  // one gives the replay a clean stateful parser starting at seq 0.
  const accumulator = createStreamAccumulator(handle.model || undefined);
  // Fresh smoothers, never shared with the detached run.
  const contentSmoother = new StreamSmoother((text) => {
    if (onData) onData(text);
  }, smoothing);
  const thinkingSmoother = new StreamSmoother((text) => {
    if (onThinking) onThinking(text);
  }, smoothing);

  // Compose the caller signal with an internal idle-watchdog controller so a
  // hung replay can't strand the UI. AbortSignal.any isn't reliable on Hermes,
  // so we bridge by hand: the transport sees one signal that aborts when EITHER
  // the caller's signal or the watchdog fires.
  const idleController = new AbortController();
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let idleFired = false;
  // A caller-initiated abort (user stop()) must always win the error label over
  // the idle watchdog. The two can race: the watchdog timer can fire in the gap
  // between the caller aborting and the transport surfacing the AbortError, so
  // we both disarm the watchdog on caller abort AND track this flag, preferring
  // it over idleFired when building the message. Caller stop is never a timeout.
  let callerAborted = false;
  // Set once a terminal is reached so a trailing onActivity (a keep-alive byte
  // landing in the gap between the stream ending and cleanup running) can't
  // re-arm a watchdog for an already-finished resume and leak a timer.
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
  // The error label for an abort terminal: a caller stop wins over a timeout.
  const abortMessage = () =>
    callerAborted ? "Resume aborted" : idleFired ? "Resume timed out" : "Resume aborted";
  const onCallerAbort = () => {
    callerAborted = true;
    // Disarm first so the watchdog can't flip idleFired after the user stopped.
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

  // Interrupted terminal: flush (never destroy, never drain) both smoothers so
  // the UI synchronously gets every buffered byte, then return the partial. If
  // the buffer carried tool-call deltas (tool-request terminal), strip them: the
  // finalized partial must not persist/return a dangling function_call with no
  // matching tool_result — providers reject the orphan on the next turn.
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
  const sseResult = makeStreamingRequest({
    baseUrl,
    endpoint: streamReplayPath(handle.inferenceId),
    method: "GET",
    // No body, no starting_after, no cursor — replay is whole-stream from seq 0.
    token,
    signal: combinedSignal,
    onSseError: (error) => {
      sseError = error instanceof Error ? error : new Error(String(error));
    },
    // Re-arm the idle watchdog on ANY wire activity, not just data chunks. The
    // server slides its own liveness with a ~30s heartbeat and emits keep-alive
    // comments through a long (>idleTimeoutMs) reasoning silence; without this a
    // healthy but content-silent stream would trip the watchdog and truncate. A
    // truly dead connection sends no bytes at all, so the watchdog still fires.
    onActivity: armWatchdog,
  });

  armWatchdog();
  try {
    for await (const chunk of sseResult.stream) {
      // Re-arm on every chunk so the watchdog only fires on true silence.
      armWatchdog();

      if (combinedSignal.aborted) {
        cleanup();
        return buildInterrupted(abortMessage());
      }

      // A non-OK status can surface via onSseError while the iterator keeps
      // yielding (transport-dependent). Stop consuming the moment it's set
      // rather than delivering bytes for a failed stream — the post-loop guard
      // rethrows it into the 410/transient classification below.
      if (sseError !== null) break;

      if (isDoneMarker(chunk)) continue;

      // In-stream error event — the portal terminates a tool_request /
      // deadline_exceeded / liveness-stale replay by sending replayed content,
      // then ONE SSE error event, then [DONE]. Treat ANY in-stream error during
      // replay as an interrupted terminal: flush and return, never throw.
      const inStreamError = getInStreamErrorMessage(chunk);
      if (inStreamError !== null) {
        cleanup();
        return buildInterrupted(inStreamError);
      }

      if (chunk && typeof chunk === "object") {
        const { content, thinking } = strategy.processStreamChunk(chunk, accumulator);
        if (content) contentSmoother.push(content);
        if (thinking) thinkingSmoother.push(thinking);
      }
    }
    // A non-OK response can surface via onSseError without the iterator
    // throwing (the xhr path pushes `done` after onSseError).
    if (sseError !== null) throw sseError as Error;
  } catch (replayErr) {
    cleanup();
    const err = replayErr instanceof Error ? replayErr : new Error(String(replayErr));
    const statusCode = parseSseStatusCode(err);

    // 410 Gone: the buffer is evicted. Nothing partial to surface — throw the
    // typed error so the caller can branch without string-matching. No
    // onFinish/onError. Flush (not destroy) to honor §5's "never destroy() on
    // any resume path"; on a 410 the smoothers are empty so flush is a no-op,
    // but keeping a single discipline avoids ever discarding a buffered tail.
    if (statusCode === 410) {
      contentSmoother.flush();
      thinkingSmoother.flush();
      throw new StreamExpiredError(handle.inferenceId);
    }

    // A caller abort or idle timeout reaches here as an AbortError. Flush, not
    // destroy: the UI should still get whatever bytes the accumulator holds.
    if (err.name === "AbortError" || combinedSignal.aborted) {
      return buildInterrupted(abortMessage());
    }

    // Any other transport/HTTP failure (401, 5xx, network) is TRANSIENT: the
    // caller decides retry (401 → token refresh) vs degrade. Keep the handle —
    // do NOT mark interrupted. Flush the partial so nothing is dropped.
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

  // Tool-request defense in depth: resumeStream accepts no tools, so executors
  // structurally cannot run. If the buffer somehow carried tool-call deltas,
  // treat it as an interrupted terminal (flush, not drain) — identical to an
  // in-stream error.
  if (accumulator.toolCalls.size > 0) {
    return buildInterrupted("Stream ended with a pending tool request");
  }

  // Clean end of buffered stream: paced drain (nothing dropped), then onFinish.
  await Promise.all([contentSmoother.drain(), thinkingSmoother.drain()]);
  const response = strategy.buildFinalResponse(accumulator);
  if (onFinish) onFinish(response);
  return { data: response, error: null, interrupted: false };
}
