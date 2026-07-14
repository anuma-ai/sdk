/**
 * Auto-extraction worker — orchestration glue for wiring
 * {@link extractAndRetain} into a chat lifecycle.
 *
 * The worker is created once per chat session and `processTurn()` is
 * called after each assistant turn (typically from `onStepFinish` in
 * useChat options, or from the caller's own post-turn hook). Each turn
 * fires async fire-and-forget — extraction never blocks the chat path.
 *
 * Concurrency: at most one extraction runs at a time (the spec's hard rate
 * limit of ≤1 LLM call in flight, which also keeps calls from racing on the
 * vault). A turn that arrives while one is in-flight is NOT dropped — it is
 * coalesced into a per-conversation pending queue and runs when the current
 * call finishes (queued conversations drain one at a time). A newer turn for
 * the same conversation supersedes an older pending one (logged via
 * `onSkipped` with `reason:"superseded"`); this is lossless because the
 * per-conversation watermark only advances on a completed extraction, so the
 * newest (superset) message list re-covers any superseded turn. Turns for
 * different conversations queue independently and never displace each other.
 *
 * Watermark + window: the worker keeps an in-memory, per-conversation
 * watermark of the last message it extracted through. Each run sends every
 * message *after* that watermark (plus a small overlap for coreference,
 * capped at `maxWindowSize`) rather than a fixed trailing slice — so facts
 * stated in turns that arrived during a busy window are still examined instead
 * of scrolling out of a last-N window. The watermark is session-scoped (in
 * memory); it does NOT survive process death, so an extraction killed mid-flight
 * by app backgrounding is not replayed in a later session. Durable cross-process
 * replay would require a persisted watermark (out of scope here).
 *
 * Memory Studio panel subscribes by passing `onMemoryExtracted` and/or
 * `onTurnComplete` callbacks. The Studio uses `onMemoryExtracted` to
 * fire a "Anuma is remembering: <fact>" toast on each accepted fact.
 */

import type { EntityOperationsContext } from "../db/entities/operations.js";
import { getLogger } from "../logger.js";
import { resolvePiiRedactor } from "../pii/redactor.js";
import {
  type AutoExtractMessage,
  extractAndRetain,
  type ExtractedCandidate,
  type ExtractFactsOptions,
  type ExtractOutcome,
  type QuarantinedMemoryInfo,
} from "./autoExtract.js";
import type { RetainContext } from "./retain.js";
import type { ConsolidationFallbackReason, RetainOptions, RetainResult } from "./types.js";

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
}

/** @public */
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
  /** Stop accepting new turns. In-flight work continues to completion. */
  dispose(): void;
}

const DEFAULT_WINDOW_SIZE = 6;
const DEFAULT_MAX_WINDOW_SIZE = 20;

// How many already-extracted messages (those at/before the watermark) to
// re-include ahead of the new messages, so the extractor has coreference
// context ("she" → a name mentioned a turn earlier). Kept small: re-sent
// identical text de-dupes at retain()'s cosine-merge, but it still costs
// tokens, so this is far tighter than the old fixed slice(-windowSize) overlap.
const CONTEXT_OVERLAP = 2;

// Absolute budget for one turn's extraction LLM call across all retries. Only
// one extraction runs at a time (a turn arriving mid-flight is coalesced into
// the pending queue), so a stuck call delays the NEXT turn's extraction. Without
// a budget the call could run maxAttempts × per-attempt timeout (~180s); 60s
// caps that ~3× while still allowing a few fast gpt-oss retries. Callers can
// override via `extract.totalTimeoutMs`.
const DEFAULT_EXTRACT_TOTAL_TIMEOUT_MS = 60_000;

// Cap on tracked per-conversation state. The worker is session-scoped (one per
// chat session, disposed on unmount) so entries are normally bounded by the
// conversations touched in a session, but a single long-lived session browsing
// many conversations would otherwise grow the map without bound. When exceeded
// we evict the oldest entry that has no queued turn (Map preserves insertion
// order). Dropping a watermark is self-healing — that conversation just
// re-extracts from a trailing window next time — but a queued pending turn must
// never be evicted, or we'd silently lose it (the loss this worker exists to
// prevent).
const MAX_TRACKED_CONVERSATIONS = 200;

/** Per-conversation extraction state (keyed by conversationId, undefined included). */
interface ConversationState {
  /**
   * Id of the last message extracted through. Advances only on a completed
   * extraction (not on throw), so a transient failure leaves the messages to be
   * re-covered by the next turn.
   */
  watermark?: string;
  /**
   * The most recent turn's messages that arrived while an extraction was in
   * flight, queued to run once the current one finishes. A newer turn for the
   * same conversation supersedes this (lossless — the watermark has not
   * advanced, so the newer superset re-covers it).
   */
  pending?: AutoExtractMessage[];
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
  // Bound the guarded extraction path by default (see constant above).
  const extract: ExtractFactsOptions = {
    ...options.extract,
    totalTimeoutMs: options.extract.totalTimeoutMs ?? DEFAULT_EXTRACT_TOTAL_TIMEOUT_MS,
  };
  let inflight = 0;
  let disposed = false;

  // Per-conversation state (watermark + coalescing queue), keyed by
  // conversationId (undefined is a valid Map key — its own slot). In-memory and
  // session-scoped; see the module docstring on durability. Keyed per
  // conversation so a turn for one conversation never displaces a queued turn
  // for another — within a conversation, supersession is lossless (the
  // watermark only advances on completion); across conversations a displaced
  // turn would be silently lost. Queued turns drain one at a time (≤1 in-flight).
  const conversations = new Map<string | undefined, ConversationState>();
  const stateFor = (conversationId?: string): ConversationState => {
    let state = conversations.get(conversationId);
    if (!state) {
      if (conversations.size >= maxTrackedConversations) evictOldestIdle(conversationId);
      state = {};
      conversations.set(conversationId, state);
    }
    return state;
  };

  /**
   * Drop the oldest tracked conversation that has no queued turn, to keep the
   * map bounded. Skips entries with a `pending` turn (evicting one would lose a
   * queued extraction) and the conversation being inserted. If every entry has
   * a pending turn (pathological), nothing is evicted and the map grows by one.
   */
  const evictOldestIdle = (incoming?: string): void => {
    for (const [key, st] of conversations) {
      if (key !== incoming && !st.pending) {
        conversations.delete(key);
        return;
      }
    }
  };

  /**
   * Decide which messages to send for `conversationId`, given its watermark:
   * - no watermark (first run / scrolled out of history) → trailing `slice(-windowSize)`.
   * - watermark present → everything after it (+ CONTEXT_OVERLAP for coreference),
   *   truncated to the most recent `maxWindowSize` under an extreme burst.
   * Returns `[]` to signal "nothing new since the last extraction" (the caller
   * skips with `reason:"no-new-content"`).
   */
  function computeWindow(
    messages: AutoExtractMessage[],
    conversationId?: string
  ): AutoExtractMessage[] {
    const lastId = conversations.get(conversationId)?.watermark;
    // No watermark (or it scrolled out of the provided history) → trailing slice.
    // `findIndex` short-circuits to -1 when lastId is undefined (no id matches).
    const idx = lastId === undefined ? -1 : messages.findIndex((m) => m.id === lastId);
    if (idx === -1) return messages.slice(-windowSize);
    // Watermark is already the last message → nothing new to extract.
    if (idx >= messages.length - 1) return [];
    const start = Math.max(0, idx + 1 - CONTEXT_OVERLAP);
    let window = messages.slice(start);
    if (window.length > maxWindowSize) {
      // Keep the OLDEST maxWindowSize, not the newest: the watermark advances to
      // this window's last message on success, so anything past it stays after
      // the watermark and is examined on the next turn. Truncating to the newest
      // instead would jump the watermark forward and permanently skip the
      // dropped (older) messages. This drains an extreme backlog oldest-first.
      getLogger().warn(
        `[memory/extract] ${window.length} un-extracted messages exceed maxWindowSize ${maxWindowSize}; examining the oldest ${maxWindowSize} this turn, the rest on subsequent turns`
      );
      window = window.slice(0, maxWindowSize);
    }
    return window;
  }

  // Resolve once — options are fixed for the extractor's lifetime. The
  // consolidation pass reuses the extract credentials (it hits the same
  // portal as extraction), so a browser client wired with `getToken`
  // gains consolidation with zero extra auth plumbing.
  const consolidateBaseUrl = options.consolidate?.baseUrl ?? options.extract.baseUrl;
  const consolidateOptions: RetainOptions["consolidateOptions"] = options.consolidate
    ? {
        ...(options.extract.apiKey !== undefined && { apiKey: options.extract.apiKey }),
        ...(options.extract.getToken !== undefined && { getToken: options.extract.getToken }),
        ...(consolidateBaseUrl !== undefined && { baseUrl: consolidateBaseUrl }),
        ...(options.consolidate.model !== undefined && { model: options.consolidate.model }),
        ...(options.consolidate.onFallback !== undefined && {
          onFallback: options.consolidate.onFallback,
        }),
        // PII redaction is inherited from `extract.piiRedaction` inside
        // extractAndRetain (so direct callers are covered too), not copied here.
      }
    : undefined;

  // Warn once if the caller wired a vault context with cascade-delete
  // entityCtx but didn't pass an entityCtx to the extractor. The W5
  // graph lane consumes both write- and read-side wiring; without the
  // worker linking entities at write time the lane stays empty.
  if (options.retainCtx.vaultCtx.entityCtx && !options.entityCtx) {
    getLogger().warn(
      "[memory/extract] retainCtx.vaultCtx.entityCtx is set but extractor was created without `entityCtx` — W5 graph lane will receive no writes"
    );
  }

  // PII redaction protects the extraction + consolidation LLM calls, but facts
  // are embedded with their REAL values unless embeddingOptions.maskInput is
  // set — a separate switch. Enabling piiRedaction while leaving maskInput unset
  // would silently ship raw PII to the embeddings provider, so auto-wire it from
  // the same redactor (maskText is stateless/unnumbered, ideal for masking). A
  // caller-supplied maskInput is respected; if piiRedaction is off (or a
  // malformed value), resolvePiiRedactor returns undefined and we leave the
  // context untouched.
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
      // Coalesce rather than drop: stash the latest turn (per conversation) to
      // run when the current extraction finishes. A newer turn for the SAME
      // conversation supersedes the older pending one — lossless, because the
      // watermark only advances on completion, so this newer (superset) message
      // list re-covers the superseded turn. Turns for other conversations get
      // their own slot and are never displaced.
      const state = stateFor(conversationId);
      if (state.pending) {
        options.onSkipped?.({ reason: "superseded", conversationId });
        // Union the superseded snapshot with the newer turn (dedup by id,
        // keeping pending-only messages ahead of the newer array) so a caller
        // that passes a bounded/sliding window — rather than the full growing
        // history — doesn't lose messages that were only in the superseded
        // turn. When the newer array is a superset (the common case: full
        // conversation history), pending-only is empty and this is just the
        // newer array. The spread produces a fresh array, so it also serves as
        // the snapshot below.
        const newIds = new Set(messages.map((m) => m.id));
        state.pending = [...state.pending.filter((m) => !newIds.has(m.id)), ...messages];
      } else {
        // Snapshot the array: it runs after the current extraction finishes,
        // and the chat layer may reuse/mutate its history array in the
        // meantime — a shared reference could make us extract different content
        // than the turn that was submitted (and advance the watermark wrong).
        state.pending = messages.slice();
      }
      return true;
    }
    return dispatch(messages, conversationId);
  }

  /** Run extraction now for the given turn. Assumes no extraction is in flight. */
  function dispatch(messages: AutoExtractMessage[], conversationId?: string): boolean {
    const window = computeWindow(messages, conversationId);
    if (window.length === 0) {
      options.onSkipped?.({ reason: "no-new-content", conversationId });
      drainPending();
      return false;
    }
    inflight++;
    const t0 = Date.now();

    void (async () => {
      try {
        const { candidates, results, failedCount, outcome } = await extractAndRetain(
          window,
          retainCtx,
          {
            extract,
            ...(options.minConfidence !== undefined && { minConfidence: options.minConfidence }),
            ...(options.entityCtx !== undefined && { entityCtx: options.entityCtx }),
            ...(options.scope !== undefined && { scope: options.scope }),
            ...(options.folderId !== undefined && { folderId: options.folderId }),
            ...(consolidateOptions !== undefined && { consolidateOptions }),
            ...(options.onCandidateFailed && {
              onCandidateFailed: (candidate, error) =>
                options.onCandidateFailed?.({ candidate, error, conversationId }),
            }),
            ...(options.onMemoryQuarantined && {
              onQuarantined: (info) => options.onMemoryQuarantined?.({ ...info, conversationId }),
            }),
          }
        );

        // Extraction completed (even with zero facts is a legit "examined,
        // nothing durable") → advance the watermark past everything we sent, so
        // the next turn starts after it. Only on success: a throw skips this,
        // leaving these messages to be re-covered next turn (transient retry).
        stateFor(conversationId).watermark = window[window.length - 1].id;

        // extractAndRetain returns candidates and results length-aligned:
        // entries appear only when their retain() write succeeded, so
        // candidates[i] always pairs with results[i].
        for (let i = 0; i < results.length; i++) {
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

  /**
   * Run the next queued turn, if any (FIFO over conversations). One dispatch at
   * a time — dispatch's `finally` calls back here, so queued conversations
   * drain sequentially, never overlapping. No-op after dispose (drops the queue).
   */
  function drainPending(): void {
    if (disposed) return;
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
      // Drop any queued-but-not-yet-running turns. In-flight work still completes.
      for (const state of conversations.values()) state.pending = undefined;
    },
  };
}
