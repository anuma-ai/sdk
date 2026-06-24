"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LlmapiMessage } from "../client";
import { BASE_URL } from "../clientConfig";
import {
  resumeStream as runResumeStream,
  type ResumeStreamOptions,
  type ResumeStreamResult,
  streamCancelPath,
} from "../lib/chat/resumeStream";
import {
  type ApiType,
  type AutoExecutedToolResult,
  type BaseSendMessageArgs,
  type BaseUseChatOptions,
  type BaseUseChatResult,
  createErrorResult,
  resolveApiType,
  runToolLoop,
  type RunToolLoopResult,
  type StreamResumeHandle,
  validateToken,
  validateTokenGetter,
} from "../lib/chat/useChat";
import { xhrTransport } from "../lib/chat/xhrTransport";
import { getLogger } from "../lib/logger";
import { PiiRedactor } from "../lib/pii/redactor";

type SendMessageArgs = BaseSendMessageArgs & {
  /**
   * Per-request callback for thinking/reasoning chunks.
   */
  onThinking?: (chunk: string) => void;
  /**
   * Memory context to inject as a system message.
   * This is typically context from the memory engine or other sources.
   */
  memoryContext?: string;
  /**
   * Search context to inject as a system message.
   * This is typically formatted search results from useSearch.
   */
  searchContext?: string;
  /**
   * File context to inject as a system message.
   * This is typically extracted text from preprocessed file attachments.
   */
  fileContext?: string;
  /**
   * Override the API type for this request only.
   * Useful when different models need different APIs.
   * @default Uses the hook-level apiType or "auto"
   */
  apiType?: ApiType;
  /**
   * Custom HTTP headers to include with the API request (e.g. X-Privacy-Mode).
   */
  headers?: Record<string, string>;
};

type SendMessageResult =
  | {
      data: NonNullable<RunToolLoopResult["data"]>;
      error: null;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
      /** Results from tools that were auto-executed by the SDK */
      autoExecutedToolResults?: AutoExecutedToolResult[];
    }
  | {
      data: RunToolLoopResult["data"] | null;
      error: string;
      /** Checksum of tools used to generate this response */
      toolsChecksum?: string;
    }
  | {
      /** The detached variant from runToolLoop (resumable streams only). */
      data: RunToolLoopResult["data"];
      error: "Request detached";
      detached: true;
      /** Pass to `resumeStream` to replay; null when nothing was resumable. */
      resume: StreamResumeHandle | null;
    };

/**
 * @inline
 */
interface UseChatOptions extends BaseUseChatOptions {
  /**
   * Which API endpoint to use. Default: "auto"
   * - "auto": automatically selects the best API based on model support
   * - "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
   * - "completions": OpenAI Chat Completions API (wider model compatibility)
   */
  apiType?: ApiType;
  /**
   * Opt into resumable streaming. When `true`, every `sendMessage` request
   * sends `X-Stream-Resumable: 1` so the portal keeps generating into its
   * buffer after a client disconnect, and `detach()` can hand back a
   * {@link StreamResumeHandle} for {@link resumeStream}. Off by default — no
   * header is sent and `detach()` always resolves to `null`.
   * @default false
   */
  resumable?: boolean;
  /**
   * Observability for the fire-and-forget cancel POST that `stop()` issues for
   * a resumable stream. The stop-without-cancel billing risk must be visible:
   * once the capability header ships, the portal no longer treats a dropped
   * socket as cancellation, so a `stop()` whose cancel POST silently fails
   * bills the full generation.
   */
  onCancelResult?: (result: {
    inferenceId: string;
    ok: boolean;
    status?: number;
    error?: Error;
  }) => void;
  /**
   * Observe the stream metadata the portal issues at HEADERS_RECEIVED, once per
   * round. Fires alongside the internal resume-handle capture — additive, never
   * altering it. The payload is enriched beyond the lib's `{inferenceId, round}`
   * with the RESOLVED `apiType` (completions vs responses event shapes differ;
   * "auto" is not resumable) and the `model`, so a consumer can persist a
   * rebuildable {@link StreamResumeHandle} (mobile PR5 cold-launch registry).
   * Fires per round; the SDK keeps the latest round's id internally.
   */
  onStreamMeta?: (meta: {
    inferenceId: string;
    apiType: "responses" | "completions";
    model?: string;
    round?: number;
  }) => void;
}

type UseChatResult = BaseUseChatResult & {
  sendMessage: (args: SendMessageArgs) => Promise<SendMessageResult>;
  /**
   * Tear down the in-flight request as a DETACH rather than a stop: the portal
   * keeps generating server-side and `sendMessage` resolves with the detached
   * variant. Resolves to the {@link StreamResumeHandle} captured for the
   * in-flight stream (or `null` when nothing is resumable — `resumable` was
   * off, or no inference id had been issued yet). Pair with `resumeStream`.
   */
  detach: () => StreamResumeHandle | null;
  /**
   * Replay a detached stream from the portal's buffer (GET from seq 0, fresh
   * accumulator). Thin hook wrapper over the library `resumeStream` — supplies
   * the hook's `getToken`/`baseUrl`/`transport` defaults; the token is resolved
   * at invocation so a refresh during the detach window is honored.
   */
  resumeStream: (
    handle: StreamResumeHandle,
    opts?: Pick<ResumeStreamOptions, "idleTimeoutMs" | "smoothing"> & {
      /**
       * Replay + reconcile + persist exactly as normal, but emit NOTHING to any
       * consumer callback — `onData` / `onThinking` / `onFinish` / `onError` are
       * all withheld; the caller uses the returned result. `isLoading` is also
       * left untouched, so reusing the on-screen chat's hook for an off-screen
       * recovery can't flicker the visible loading state. A headless resume also
       * does NOT touch the shared abort controller: its abort signal lives only
       * in a local controller, so the visible UI's `stop()` can't abort it, and
       * it can't clobber a concurrently-visible stream's controller (a later
       * `stop()` still aborts the visible stream, not the headless resume). A
       * cold-launch replay of a conversation that is NOT the one on screen
       * (mobile PR5) must not bleed recovered text into the visible chat's
       * streaming buffer, nor deliver the recovered response (onFinish) or a
       * transient error (onError) to the on-screen consumer. The row still
       * persists internally regardless.
       * @default false
       */
      headless?: boolean;
    }
  ) => Promise<ResumeStreamResult>;
};

/**
 * A React hook for managing chat completions with authentication.
 *
 * **React Native version** — Uses XMLHttpRequest for streaming since
 * `fetch` response body streaming isn't available in React Native.
 * Delegates all tool loop logic to the shared `runToolLoop`.
 *
 * @param options - Optional configuration object
 * @param options.getToken - An async function that returns an authentication token.
 * @param options.baseUrl - Optional base URL for the API requests.
 * @param options.onData - Callback function to be called when a new data chunk is received.
 * @param options.onThinking - Callback function to be called when thinking/reasoning content is received.
 * @param options.onFinish - Callback function to be called when the chat completion finishes successfully.
 * @param options.onError - Callback function to be called when an unexpected error is encountered.
 *
 * @returns An object containing:
 *   - `isLoading`: A boolean indicating whether a request is currently in progress
 *   - `sendMessage`: An async function to send chat messages
 *   - `stop`: A function to abort the current request
 *
 * @category Hooks
 *
 * @example
 * ```tsx
 * const { isLoading, sendMessage, stop } = useChat({
 *   getToken: async () => await getAuthToken(),
 *   onFinish: (response) => console.log("Chat finished:", response),
 *   onError: (error) => console.error("Chat error:", error)
 * });
 *
 * const handleSend = async () => {
 *   const result = await sendMessage({
 *     messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }],
 *     model: 'fireworks/accounts/fireworks/models/kimi-k2p5'
 *   });
 * };
 * ```
 */
export function useChat(options?: UseChatOptions): UseChatResult {
  const {
    getToken,
    baseUrl = BASE_URL,
    onData: globalOnData,
    onThinking: globalOnThinking,
    onFinish,
    onError,
    onToolCall,
    onServerToolCall,
    onToolCallArgumentsDelta,
    onStepFinish,
    apiType: defaultApiType = "auto",
    smoothing,
    preProcessors,
    piiRedaction,
    onPiiRedacted,
    resumable = false,
    onCancelResult,
    onStreamMeta: onStreamMetaConsumer,
  } = options || {};
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Distinct from abortControllerRef: aborting THIS one is a detach (keep
  // generating server-side), aborting the abort controller is a stop.
  const detachControllerRef = useRef<AbortController | null>(null);
  // The latest resume handle we can build for the in-flight stream, refreshed
  // from onStreamMeta as soon as the portal issues an X-Inference-ID. Read by
  // stop() (to POST cancel) and detach() (to return the handle synchronously).
  const pendingResumeRef = useRef<StreamResumeHandle | null>(null);

  // Fire-and-forget cancel POST: tells the portal to stop generating into the
  // buffer and release it. Errors are swallowed — a failed cancel must never
  // surface to the user, and the buffer TTL reclaims it regardless. This is the
  // billing-safe teardown for a stop that lands AFTER a resumable stream began.
  const fireCancel = useCallback(
    (handle: StreamResumeHandle) => {
      const { inferenceId } = handle;
      // Keep ONLY the fetch in the rejectable region and report the outcome from
      // the settled handlers — so a consumer onCancelResult that throws on the
      // success path can't fall into the catch and fire a contradictory second
      // { ok: false }. A genuine fetch failure still reports a single ok:false.
      void (async () => {
        const token = getToken ? await getToken() : null;
        const res = await fetch(`${baseUrl}${streamCancelPath(inferenceId)}`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return { inferenceId, ok: res.ok, status: res.status };
      })().then(
        (result) => onCancelResult?.(result),
        (err) => {
          getLogger().warn("[useChat] stream cancel POST failed:", err);
          onCancelResult?.({ inferenceId, ok: false, error: err as Error });
        }
      );
    },
    [getToken, baseUrl, onCancelResult]
  );

  // When piiRedaction is `true`, upgrade it to a single redactor instance kept
  // for the lifetime of this hook so placeholder state is shared across turns.
  const piiRedactorRef = useRef<PiiRedactor | null>(null);
  if (piiRedaction === true && !piiRedactorRef.current) {
    piiRedactorRef.current = new PiiRedactor();
  }
  const resolvedPiiRedaction = piiRedaction === true ? piiRedactorRef.current! : piiRedaction;

  const stop = useCallback(() => {
    // A stop on a resumable stream that already has an inference id must also
    // cancel the server-side buffer, or the portal keeps billing for a
    // generation nobody will read.
    const pending = pendingResumeRef.current;
    if (resumable && pending) fireCancel(pending);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    detachControllerRef.current = null;
    pendingResumeRef.current = null;
  }, [resumable, fireCancel]);

  const detach = useCallback((): StreamResumeHandle | null => {
    // Abort via the detach signal (not the stop signal): runToolLoop tears the
    // stream down but the portal keeps generating, and sendMessage resolves
    // with the detached variant. No cancel POST — that would kill the buffer we
    // intend to resume.
    if (detachControllerRef.current) {
      detachControllerRef.current.abort();
    }
    return pendingResumeRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      detachControllerRef.current = null;
      pendingResumeRef.current = null;
    };
  }, []);

  const resumeStream = useCallback(
    async (
      handle: StreamResumeHandle,
      opts?: Pick<ResumeStreamOptions, "idleTimeoutMs" | "smoothing"> & { headless?: boolean }
    ): Promise<ResumeStreamResult> => {
      // Validate the token getter, then resolve the token AT INVOCATION — a
      // multi-minute background gap between detach and resume expires the
      // bearer, so a token captured at hook-mount or detach time is never
      // reused. The lib takes a concrete `token: string`; the hook owns the
      // fetch-fresh-token contract.
      const getterValidation = validateTokenGetter(getToken);
      if (!getterValidation.valid) {
        return { data: null, error: getterValidation.message, interrupted: false };
      }
      const token = await getToken!();
      const tokenValidation = validateToken(token);
      if (!tokenValidation.valid) {
        return { data: null, error: tokenValidation.message, interrupted: false };
      }

      // Headless: replay/reconcile/persist exactly as normal but emit nothing to
      // ANY hook-level consumer callback. The lib no-ops missing callbacks, so
      // headless mode simply withholds all four (onData/onThinking AND
      // onFinish/onError) — a cold-launch replay of an off-screen conversation
      // can't bleed recovered text into the visible chat's streaming buffer, nor
      // can a clean terminal (onFinish) or a transient failure (onError) deliver
      // the recovered ApiResponse to the on-screen consumer. The cold-launch
      // worker (mobile PR5) consumes the RETURNED result, never these callbacks,
      // so suppressing them here is correct. `headless` is stripped from `opts`
      // so it never reaches the lib as an unknown option.
      const { headless, ...resumeOpts } = opts ?? {};
      // A fresh controller drives this resume's abort signal regardless. But only
      // the NON-headless path stores it in the shared abortControllerRef — the
      // same ref sendMessage/stop/detach mutate. Headless is documented as
      // "reuse the on-screen hook for an off-screen recovery", so if a headless
      // resume overlapped a live visible stream it would otherwise clobber the
      // visible stream's controller, and a later stop() would abort the wrong
      // one (the headless resume) while leaving the visible stream running.
      // Guarding with `!headless` — exactly like the isLoading guard below —
      // keeps headless fully isolated from the shared lifecycle: its abort lives
      // only in this local, passed to runResumeStream as the signal but never
      // reachable from the visible UI's stop(). The finally reset is already
      // conditional on `abortControllerRef.current === abortController`, so it
      // stays a no-op for headless (the ref was never set to this controller).
      const abortController = new AbortController();
      if (!headless) abortControllerRef.current = abortController;
      // Headless means "invisible": besides withholding the four consumer
      // callbacks below, never toggle the shared isLoading. A caller reusing the
      // on-screen chat's hook for an off-screen headless recovery would otherwise
      // flicker the visible loading state. The non-headless path is unchanged.
      if (!headless) setIsLoading(true);
      try {
        return await runResumeStream({
          handle,
          token: token!,
          baseUrl,
          // RN can't stream fetch bodies — same transport the live stream used.
          transport: xhrTransport,
          smoothing,
          signal: abortController.signal,
          ...(headless
            ? {}
            : {
                onData: (chunk) => {
                  if (globalOnData) globalOnData(chunk);
                },
                onThinking: (chunk) => {
                  if (globalOnThinking) globalOnThinking(chunk);
                },
                onFinish,
                onError,
              }),
          ...resumeOpts,
        });
      } finally {
        if (!headless) setIsLoading(false);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [getToken, baseUrl, smoothing, globalOnData, globalOnThinking, onFinish, onError]
  );

  const sendMessage = useCallback(
    async ({
      messages,
      model,
      onData,
      onThinking,
      memoryContext,
      searchContext,
      fileContext,
      // Responses API options
      temperature,
      maxOutputTokens,
      tools,
      toolChoice,
      maxToolRounds,
      reasoning,
      thinking,
      imageModel,
      apiType: requestApiType,
      conversationId,
      piiRedaction: requestPiiRedaction,
      headers,
    }: SendMessageArgs): Promise<SendMessageResult> => {
      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      // Fresh detach controller + resume state for this request.
      const detachController = new AbortController();
      detachControllerRef.current = detachController;
      pendingResumeRef.current = null;

      setIsLoading(true);

      try {
        // Validate token getter and get token
        const tokenGetterValidation = validateTokenGetter(getToken);
        if (!tokenGetterValidation.valid) {
          if (onError) onError(new Error(tokenGetterValidation.message));
          return { data: null, error: tokenGetterValidation.message };
        }

        const token = await getToken!();

        const tokenValidation = validateToken(token);
        if (!tokenValidation.valid) {
          if (onError) onError(new Error(tokenValidation.message));
          return { data: null, error: tokenValidation.message };
        }

        // Inject context as system messages
        let messagesWithContext = messages;
        if (memoryContext) {
          const memorySystemMessage: LlmapiMessage = {
            role: "system",
            content: [{ type: "text", text: memoryContext }],
          };
          messagesWithContext = [memorySystemMessage, ...messages];
        }

        if (searchContext) {
          const searchSystemMessage: LlmapiMessage = {
            role: "system",
            content: [
              {
                type: "text",
                text: "Here are the search results for the user's query. Use this information to respond to the user's request:",
              },
              { type: "text", text: searchContext },
            ],
          };
          messagesWithContext = [searchSystemMessage, ...messagesWithContext];
        }

        if (fileContext) {
          const fileSystemMessage: LlmapiMessage = {
            role: "system",
            content: [
              {
                type: "text",
                text:
                  'IMPORTANT: The user has attached files to this conversation. The extracted file contents are shown below. When the user asks about "the file", "this file", or "what\'s in the file", refer to this content:\n\n' +
                  fileContext,
              },
            ],
          };
          messagesWithContext = [fileSystemMessage, ...messagesWithContext];
        }

        // Delegate to the framework-agnostic tool loop with XHR transport
        const result: RunToolLoopResult = await runToolLoop({
          messages: messagesWithContext,
          model: model!,
          token: token!,
          baseUrl,
          apiType: requestApiType ?? defaultApiType,
          temperature,
          maxOutputTokens,
          tools,
          toolChoice,
          maxToolRounds,
          reasoning,
          thinking,
          imageModel,
          conversationId,
          headers,
          smoothing,
          signal: abortController.signal,
          // Only opt into the resumable buffer + detach handshake when the hook
          // was configured for it — otherwise this is a plain stop-only stream.
          resumable,
          detachSignal: detachController.signal,
          transport: xhrTransport,
          onStreamMeta: (meta) => {
            // Build the resume handle as soon as the portal issues an inference
            // id, so stop()/detach() have something to act on even mid-stream.
            // The resolved api type the stream actually used drives replay
            // parsing — resolveApiType here matches what runToolLoop resolved.
            const resolvedApiType = resolveApiType(requestApiType ?? defaultApiType, model);
            pendingResumeRef.current = {
              inferenceId: meta.inferenceId,
              apiType: resolvedApiType,
              model,
              conversationId,
            };
            // Additive consumer observability: fire alongside the internal
            // handle capture with the SAME resolved apiType + model, so a
            // consumer can persist a rebuildable handle (mobile PR5). Never
            // alters the handle behavior above; fires per round. Guarded: a
            // throwing consumer callback must not disrupt the handle capture
            // above or the stream itself — log via the SDK logger and swallow.
            if (onStreamMetaConsumer) {
              try {
                onStreamMetaConsumer({
                  inferenceId: meta.inferenceId,
                  apiType: resolvedApiType,
                  model,
                  round: meta.round,
                });
              } catch (metaErr) {
                getLogger().warn("[useChat] consumer onStreamMeta threw:", metaErr);
              }
            }
          },
          onData: (chunk) => {
            if (onData) onData(chunk);
            if (globalOnData) globalOnData(chunk);
          },
          onThinking: (chunk) => {
            if (onThinking) onThinking(chunk);
            if (globalOnThinking) globalOnThinking(chunk);
          },
          onFinish,
          onError,
          onToolCall,
          onServerToolCall,
          onToolCallArgumentsDelta,
          onStepFinish,
          preProcessors,
          piiRedaction: requestPiiRedaction ?? resolvedPiiRedaction,
          onPiiRedacted,
        });

        // On a detach, runToolLoop returns the authoritative resume handle
        // (resolved api type, latest inference id). Prefer it over the
        // optimistic one we built from onStreamMeta.
        if ("detached" in result && result.detached && result.resume) {
          pendingResumeRef.current = result.resume;
        } else {
          // Any non-detached terminal (clean completion or an error on THIS
          // connection) means the turn finished here — there is nothing left to
          // resume or cancel. Drop the optimistic handle from onStreamMeta, or a
          // later idle stop() would fire-and-forget a cancel POST for an
          // already-finished inference id (spurious portal traffic + a
          // misleading onCancelResult).
          pendingResumeRef.current = null;
        }

        return result;
      } catch (err) {
        return createErrorResult(
          err instanceof Error ? err.message : "Failed to send message.",
          onError
        );
      } finally {
        setIsLoading(false);
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        if (detachControllerRef.current === detachController) {
          detachControllerRef.current = null;
        }
      }
    },
    [
      getToken,
      baseUrl,
      globalOnData,
      globalOnThinking,
      onFinish,
      onError,
      onToolCall,
      onServerToolCall,
      onToolCallArgumentsDelta,
      onStepFinish,
      defaultApiType,
      smoothing,
      preProcessors,
      resolvedPiiRedaction,
      onPiiRedacted,
      resumable,
      onStreamMetaConsumer,
    ]
  );

  return {
    isLoading,
    sendMessage,
    stop,
    detach,
    resumeStream,
  };
}
