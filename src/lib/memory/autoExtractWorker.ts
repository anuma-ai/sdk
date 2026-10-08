import type { EntityOperationsContext } from "../db/entities/operations.js";
import { getLogger } from "../logger.js";
import { resolvePiiRedactor } from "../pii/redactor.js";
import {
  type AutoExtractMessage,
  extractAndRetain,
  type ExtractedCandidate,
  type ExtractFactsOptions,
  type ExtractionFunnel,
  type ExtractionTimings,
  type ExtractOutcome,
  type QuarantinedMemoryInfo,
} from "./autoExtract.js";
import type { InjectionClassifierOptions } from "./injectionClassifier.js";
import type { PortalLlmFailure } from "./portalLlm.js";
import type { RetainContext } from "./retain.js";
import type {
  ConsolidationFallbackReason,
  PortalLlmAuth,
  RetainOptions,
  RetainResult,
} from "./types.js";

/** @public */
export interface MemoryExtractedEvent {
  candidate: ExtractedCandidate;
  result: RetainResult;
  conversationId?: string;
}

/**
 * Tier-0 security (PR3) — fired once per candidate the injection screen
 * quarantined and persisted as an audit row. Distinct from
 * {@link MemoryExtractedEvent} so a client can render "held for review"
 * without treating a poisoned fact as a normal saved memory.
 * @public
 */
export interface MemoryQuarantinedEvent extends QuarantinedMemoryInfo {
  conversationId?: string;
}

/** @public */
export interface TurnSkippedEvent {
  /**
   * Why the turn produced no extraction call:
   * - `no-messages`     — the turn carried an empty message array.
   * - `no-new-content`  — every message was already extracted (watermark is at
   *                       the last message); the natural double-fire / re-mount
   *                       dedup, not a loss.
   * - `superseded`      — a queued (pending) turn was replaced by a newer one
   *                       before it ran. Lossless: the newer turn's window
   *                       re-covers it.
   * - `in-flight`       — retained for back-compat; no longer emitted. The
   *                       worker now coalesces in-flight arrivals into the
   *                       pending queue instead of dropping them.
   */
  reason: "no-messages" | "no-new-content" | "superseded" | "in-flight";
  conversationId?: string;
}

/** @public */
export interface TurnCompleteEvent {
  candidates: ExtractedCandidate[];
  results: RetainResult[];
  /** Per-candidate retain() failures. `onError` only fires on pipeline throws. */
  failedCount: number;
  durationMs: number;
  conversationId?: string;
  /**
   * Why the turn did/didn't produce facts. `empty-after-retry` means the
   * extractor failed (empty/malformed after exhausting retries) — alarm on a
   * rising rate of it; `no-facts` is a normal quiet turn. The two were
   * previously indistinguishable (both surfaced as zero candidates).
   */
  outcome: ExtractOutcome;
  /**
   * Present only alongside `outcome: "empty-after-retry"` — WHICH failure ended
   * the turn (#888).
   *
   * `outcome` says extraction gave up; this says why, from a stable enum. The
   * distinction is the whole point: a 2026-08-11 audit measured ~63% of
   * production extraction turns ending in `empty-after-retry` and could not tell
   * from telemetry whether the cause was the freeloader 403 everyone assumed or
   * something else. It took a Prometheus cross-check to find the real one — the
   * portal returning HTTP 200 with an empty body, which it counts as a success.
   *
   * Forward `failure.reason` into your extraction analytics event; all three
   * fields are bounded (an enum, an HTTP status, a small attempt count) and none
   * carries content.
   */
  failure?: PortalLlmFailure;
  /**
   * Where the candidates went between the model and the vault, as counts — the
   * drops before `retain()` that `candidates`/`results` cannot show. See
   * {@link ExtractionFunnel}.
   */
  funnel?: ExtractionFunnel;
  /** Extract vs. retain wall-clock split of `durationMs`. See {@link ExtractionTimings}. */
  timings?: ExtractionTimings;
  /** The extraction model this turn asked for. */
  model?: string;
}

/** @public */
/**
 * Durable per-conversation extraction cursor. Synchronous by contract (both
 * SDK platform stores — web `localStorage`, mobile MMKV — are sync), so the
 * worker can hydrate the watermark inline without changing its fire-and-forget
 * control flow. Implementations should be best-effort; the worker guards every
 * call, so a throwing store degrades to in-memory-only rather than breaking
 * extraction.
 *
 * @public
 */
export interface ExtractionCursorStore {
  /** Last message id extracted through for `conversationId`, or undefined. */
  get(conversationId: string): string | undefined;
  /** Persist the last-extracted message id for `conversationId`. */
  set(conversationId: string, messageId: string): void;
}

/** Minimal synchronous key/value surface — satisfied by the SDK's
 * `PlatformStorage` (web `localStorage`, mobile MMKV). */
interface SyncKeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Build an {@link ExtractionCursorStore} over a synchronous key/value store
 * (e.g. the SDK's `PlatformStorage`). Keys are namespaced by `keyPrefix`.
 * Reads/writes are guarded so a store that throws (quota, private mode) can't
 * break extraction — the watermark just falls back to in-memory.
 *
 * @public
 */
export function createPlatformCursorStore(
  storage: SyncKeyValueStore,
  keyPrefix = "anuma:mem:xcursor:"
): ExtractionCursorStore {
  return {
    get(conversationId) {
      try {
        return storage.getItem(keyPrefix + conversationId) ?? undefined;
      } catch {
        return undefined;
      }
    },
    set(conversationId, messageId) {
      try {
        storage.setItem(keyPrefix + conversationId, messageId);
      } catch {
        /* best-effort */
      }
    },
  };
}

export interface CreateAutoExtractorOptions {
  retainCtx: RetainContext;
  extract: ExtractFactsOptions;
  /** Confidence floor for retained facts. Default 0.7. */
  minConfidence?: number;
  /**
   * Trailing-window size used when there is no watermark yet for a
   * conversation (the first extraction, or after the watermark scrolled out of
   * the provided history): the extractor receives the last `windowSize`
   * messages. Default 6. Once a watermark exists, the window is computed from
   * it (everything since the watermark) rather than this fixed slice.
   */
  windowSize?: number;
  /**
   * Upper bound on the widened (post-watermark) window. Under an extreme burst
   * — more un-extracted messages accumulate than this cap while an extraction
   * is stuck — the window is truncated to the most recent `maxWindowSize`
   * messages and a warning is logged. Bounds extraction LLM cost/latency.
   * Default 20. Coerced to be ≥ `windowSize`.
   */
  maxWindowSize?: number;
  /**
   * Cap on the number of conversations whose extraction state (watermark +
   * coalescing queue) is held in memory. When exceeded, the oldest entry with
   * no queued turn is evicted — its conversation simply re-extracts from a
   * trailing window next time (self-healing). The worker is session-scoped, so
   * the default is generous; lower it for very long-lived, many-conversation
   * sessions in RAM-constrained hosts. Default 200.
   */
  maxTrackedConversations?: number;
  /**
   * Durable per-conversation watermark store. When provided, the watermark is
   * hydrated from it the first time each conversation is touched and written
   * through on every advance, so extraction resumes exactly after the last
   * extracted message across process restarts (and, with a process-shared
   * store, across concurrent sessions). Build via {@link createPlatformCursorStore}.
   * Omit for in-memory-only (legacy) behavior.
   */
  cursorStore?: ExtractionCursorStore;
  /**
   * Entity / memory_entity write context — when provided, each retained
   * candidate's `entities[]` is persisted via `linkMemoryEntitiesOp`,
   * populating the W5 graph retrieval lane. Without this the lane stays
   * empty and recall's graph fusion is a no-op.
   */
  entityCtx?: EntityOperationsContext;
  /** Override scope for all retained facts. */
  scope?: string;
  /** Override folderId for all retained facts. */
  folderId?: string | null;
  /**
   * Enable the LLM-based consolidation pass (Hindsight facet-dedup) on
   * every retain() write. Auth is NOT configured here — the consolidation
   * call reuses the `extract` options' credentials (`apiKey` / `getToken`)
   * and defaults to its `baseUrl` unless overridden below. Absent →
   * identical behavior to today: retain() runs the strict cosine-only
   * auto-merge with no consolidation LLM calls.
   */
  consolidate?: {
    /** Portal base URL for consolidation calls. Default: the `extract` options' `baseUrl`. */
    baseUrl?: string;
    /** Override the consolidation model. Default: see `consolidate.ts`. */
    model?: string;
    /**
     * Notified on each degraded create-fallback (LLM failure or
     * schema-violating response). See
     * `RetainOptions.consolidateOptions.onFallback`.
     */
    onFallback?: (reason: ConsolidationFallbackReason) => void;
  };
  /**
   * Tier-0 security (PR5) — enable the optional SECOND-layer LLM injection
   * classifier over the candidates the deterministic screen passed as clean.
   * Presence is the switch, so `injectionClassifier: {}` is how a client turns
   * it on. Auth is NOT configured here — like `consolidate`, the call reuses
   * the `extract` credentials and defaults to its `baseUrl`. See
   * `injectionClassifier.ts` for the safety posture and the defaults.
   */
  injectionClassifier?: {
    /** Portal base URL for classifier calls. Default: the `extract` options' `baseUrl`. */
    baseUrl?: string;
    model?: string;
    maxCandidates?: number;
    totalTimeoutMs?: number;
  };
  /** Per-fact event — fires once per memory written. */
  onMemoryExtracted?: (event: MemoryExtractedEvent) => void;
  /**
   * Tier-0 security (PR3) — fires once per candidate quarantined by the
   * injection screen (and persisted as an audit row). Lets a client surface a
   * "held for review" state instead of the fact silently disappearing.
   */
  onMemoryQuarantined?: (event: MemoryQuarantinedEvent) => void;
  /** Per-turn event — fires once after the whole pipeline finishes. */
  onTurnComplete?: (event: TurnCompleteEvent) => void;
  /** Diagnostic — fires when a turn is skipped. */
  onSkipped?: (event: TurnSkippedEvent) => void;
  /** Diagnostic — fires on unexpected pipeline errors. */
  onError?: (error: Error, conversationId?: string) => void;
  /**
   * Per-candidate retain() failure. Lets UI layers ("Anuma is saving …
   * — couldn't save Lives in Portland") surface the specific fact that
   * dropped instead of only seeing the aggregate `failedCount`. Fires
   * once per filtered candidate that threw during retain.
   */
  onCandidateFailed?: (event: {
    candidate: ExtractedCandidate;
    error: unknown;
    conversationId?: string;
  }) => void;
}

/** @public */
export interface AutoExtractor {
  /**
   * Kick off extraction for the most recent turn. Returns immediately
   * (async, fire-and-forget). Returns `true` if extraction was dispatched now
   * OR queued to run after the current in-flight call; `false` if nothing will
   * happen for this turn (disposed, empty messages, or every message was
   * already extracted — see {@link TurnSkippedEvent}).
   *
   * Pass the full recent `messages` array (the worker decides the window from
   * its per-conversation watermark); `conversationId` keys that watermark, so
   * pass it consistently for the same conversation.
   */
  processTurn(messages: AutoExtractMessage[], conversationId?: string): boolean;
  /** True while a turn's extraction is in flight. */
  isProcessing(): boolean;
  /**
   * Stop accepting new turns. In-flight work continues to completion, and any
   * turn already queued (coalesced while an extraction was in flight) is still
   * flushed — never dropped — so a turn sent right before unmount isn't lost.
   */
  dispose(): void;
}

const DEFAULT_WINDOW_SIZE = 6;
const DEFAULT_MAX_WINDOW_SIZE = 20;

const CONTEXT_OVERLAP = 2;

const DEFAULT_EXTRACT_TOTAL_TIMEOUT_MS = 60_000;

const MAX_TRACKED_CONVERSATIONS = 200;

/** Per-conversation extraction state (keyed by conversationId, undefined included). */
interface ConversationState {
  /**
   * Id of the last message extracted through. Advances only when the extractor
   * genuinely examined the window — not on a throw, and not on an
   * `empty-after-retry` outcome (the LLM failed after exhausting retries, so
   * nothing was examined). Either way the messages are left to be re-covered by
   * the next turn.
   */
  watermark?: string;
  /**
   * The most recent turn's messages that arrived while an extraction was in
   * flight, queued to run once the current one finishes. A newer turn for the
   * same conversation supersedes this (lossless — the watermark has not
   * advanced, so the newer superset re-covers it).
   */
  pending?: AutoExtractMessage[];
  /** True once the persisted cursor has been read into `watermark` (at most
   * once per state instance), so hydration never clobbers a live watermark. */
  hydrated?: boolean;
}

/**
 * Create a per-session auto-extractor. See module docstring for usage.
 */
export function createAutoExtractor(options: CreateAutoExtractorOptions): AutoExtractor {
  const windowSize = options.windowSize ?? DEFAULT_WINDOW_SIZE;
  const maxWindowSize = Math.max(options.maxWindowSize ?? DEFAULT_MAX_WINDOW_SIZE, windowSize);
  const maxTrackedConversations = Math.max(
    1,
    options.maxTrackedConversations ?? MAX_TRACKED_CONVERSATIONS
  );
  const extract: ExtractFactsOptions = {
    ...options.extract,
    totalTimeoutMs: options.extract.totalTimeoutMs ?? DEFAULT_EXTRACT_TOTAL_TIMEOUT_MS,
  };
  let inflight = 0;
  let disposed = false;

  const conversations = new Map<string | undefined, ConversationState>();
  const cursorStore = options.cursorStore;

  const hydrate = (state: ConversationState, conversationId?: string): void => {
    if (state.hydrated) return;
    state.hydrated = true;
    if (!cursorStore || conversationId === undefined || state.watermark !== undefined) return;
    try {
      const persisted = cursorStore.get(conversationId);
      if (persisted) state.watermark = persisted;
    } catch {
      /* best-effort — a throwing store degrades to in-memory-only */
    }
  };

  const stateFor = (conversationId?: string): ConversationState => {
    let state = conversations.get(conversationId);
    if (!state) {
      if (conversations.size >= maxTrackedConversations) evictOldestIdle(conversationId);
      state = {};
      conversations.set(conversationId, state);
      hydrate(state, conversationId);
    }
    return state;
  };

  const evictOldestIdle = (incoming?: string): void => {
    for (const [key, st] of conversations) {
      if (key !== incoming && !st.pending) {
        conversations.delete(key);
        return;
      }
    }
  };

  function computeWindow(
    messages: AutoExtractMessage[],
    conversationId?: string
  ): { window: AutoExtractMessage[]; contiguous: boolean } {
    const lastId = stateFor(conversationId).watermark;
    const idx = lastId === undefined ? -1 : messages.findIndex((m) => m.id === lastId);
    if (idx === -1) {
      return { window: messages.slice(-windowSize), contiguous: messages.length <= windowSize };
    }
    if (idx >= messages.length - 1) return { window: [], contiguous: true };
    const start = Math.max(0, idx + 1 - CONTEXT_OVERLAP);
    let window = messages.slice(start);
    if (window.length > maxWindowSize) {
      getLogger().warn(
        `[memory/extract] ${window.length} un-extracted messages exceed maxWindowSize ${maxWindowSize}; examining the oldest ${maxWindowSize} this turn, the rest on subsequent turns`
      );
      window = window.slice(0, maxWindowSize);
    }
    return { window, contiguous: true };
  }

  const persistCursor = (
    conversationId: string | undefined,
    messages: AutoExtractMessage[],
    advancedToId: string,
    contiguous: boolean
  ): void => {
    if (!cursorStore || conversationId === undefined || !contiguous) return;
    try {
      const stored = cursorStore.get(conversationId);
      if (stored && stored !== advancedToId) {
        const storedIdx = messages.findIndex((m) => m.id === stored);
        const newIdx = messages.findIndex((m) => m.id === advancedToId);
        if (storedIdx !== -1 && newIdx !== -1 && storedIdx >= newIdx) return;
      }
      cursorStore.set(conversationId, advancedToId);
    } catch {
      /* best-effort */
    }
  };

  const subPassAuth = (baseUrlOverride?: string): PortalLlmAuth & { baseUrl?: string } => {
    const baseUrl = baseUrlOverride ?? options.extract.baseUrl;
    return {
      ...(options.extract.apiKey !== undefined && { apiKey: options.extract.apiKey }),
      ...(options.extract.getToken !== undefined && { getToken: options.extract.getToken }),
      ...(baseUrl !== undefined && { baseUrl }),
    };
  };

  const consolidateOptions: RetainOptions["consolidateOptions"] = options.consolidate
    ? { ...options.consolidate, ...subPassAuth(options.consolidate.baseUrl) }
    : undefined;

  const injectionClassifierOptions: InjectionClassifierOptions | undefined =
    options.injectionClassifier
      ? { ...options.injectionClassifier, ...subPassAuth(options.injectionClassifier.baseUrl) }
      : undefined;

  if (options.retainCtx.vaultCtx.entityCtx && !options.entityCtx) {
    getLogger().warn(
      "[memory/extract] retainCtx.vaultCtx.entityCtx is set but extractor was created without `entityCtx` — W5 graph lane will receive no writes"
    );
  }

  const piiRedactor = resolvePiiRedactor(options.extract.piiRedaction);
  const retainCtx: RetainContext =
    piiRedactor && !options.retainCtx.embeddingOptions.maskInput
      ? {
          ...options.retainCtx,
          embeddingOptions: {
            ...options.retainCtx.embeddingOptions,
            maskInput: (text) => piiRedactor.maskText(text),
          },
        }
      : options.retainCtx;

  function processTurn(messages: AutoExtractMessage[], conversationId?: string): boolean {
    if (disposed) return false;
    if (messages.length === 0) {
      options.onSkipped?.({ reason: "no-messages", conversationId });
      return false;
    }
    if (inflight > 0) {
      const state = stateFor(conversationId);
      if (state.pending) {
        options.onSkipped?.({ reason: "superseded", conversationId });
        const newIds = new Set(messages.map((m) => m.id));
        state.pending = [...state.pending.filter((m) => !newIds.has(m.id)), ...messages];
      } else {
        state.pending = messages.slice();
      }
      return true;
    }
    return dispatch(messages, conversationId);
  }

  function dispatch(messages: AutoExtractMessage[], conversationId?: string): boolean {
    const { window, contiguous } = computeWindow(messages, conversationId);
    if (window.length === 0) {
      options.onSkipped?.({ reason: "no-new-content", conversationId });
      drainPending();
      return false;
    }
    inflight++;
    const t0 = Date.now();

    void (async () => {
      try {
        const { candidates, results, failedCount, outcome, failure, funnel, timings, model } =
          await extractAndRetain(window, retainCtx, {
            extract,
            ...(options.minConfidence !== undefined && { minConfidence: options.minConfidence }),
            ...(options.entityCtx !== undefined && { entityCtx: options.entityCtx }),
            ...(options.scope !== undefined && { scope: options.scope }),
            ...(options.folderId !== undefined && { folderId: options.folderId }),
            ...(consolidateOptions !== undefined && { consolidateOptions }),
            ...(injectionClassifierOptions !== undefined && {
              injectionClassifier: injectionClassifierOptions,
            }),
            ...(options.onCandidateFailed && {
              onCandidateFailed: (candidate, error) =>
                options.onCandidateFailed?.({ candidate, error, conversationId }),
            }),
            ...(options.onMemoryQuarantined && {
              onQuarantined: (info) => options.onMemoryQuarantined?.({ ...info, conversationId }),
            }),
          });

        if (outcome !== "empty-after-retry" && failedCount === 0) {
          const advancedTo = window[window.length - 1].id;
          stateFor(conversationId).watermark = advancedTo;
          persistCursor(conversationId, messages, advancedTo, contiguous);
        }

        for (let i = 0; i < results.length; i++) {
          if (results[i].action === "suppressed") continue;
          options.onMemoryExtracted?.({
            candidate: candidates[i],
            result: results[i],
            conversationId,
          });
        }
        options.onTurnComplete?.({
          candidates,
          results,
          failedCount,
          durationMs: Date.now() - t0,
          conversationId,
          outcome,
          funnel,
          timings,
          model,
          ...(failure !== undefined && { failure }),
        });
      } catch (err) {
        options.onError?.(err instanceof Error ? err : new Error(String(err)), conversationId);
      } finally {
        inflight--;
        drainPending();
      }
    })();

    return true;
  }

  function drainPending(): void {
    for (const [conversationId, state] of conversations) {
      if (state.pending) {
        const messages = state.pending;
        state.pending = undefined;
        dispatch(messages, conversationId);
        return;
      }
    }
  }

  return {
    processTurn,
    isProcessing: () => inflight > 0,
    dispose: () => {
      disposed = true;
      if (inflight === 0) drainPending();
    },
  };
}
