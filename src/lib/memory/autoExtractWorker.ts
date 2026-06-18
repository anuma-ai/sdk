/**
 * Auto-extraction worker — orchestration glue for wiring
 * {@link extractAndRetain} into a chat lifecycle.
 *
 * The worker is created once per chat session and `processTurn()` is
 * called after each assistant turn (typically from `onStepFinish` in
 * useChat options, or from the caller's own post-turn hook). Each turn
 * fires async fire-and-forget — extraction never blocks the chat path.
 *
 * Concurrency: if a previous turn's extraction is still in-flight when a
 * new turn arrives, the new turn skips (logged via `onSkipped`). This
 * matches the spec's hard rate limit of ≤1 extraction call per assistant
 * turn and prevents overlapping LLM calls from racing on the vault.
 *
 * Memory Studio panel subscribes by passing `onMemoryExtracted` and/or
 * `onTurnComplete` callbacks. The Studio uses `onMemoryExtracted` to
 * fire a "Anuma is remembering: <fact>" toast on each accepted fact.
 */

import type { EntityOperationsContext } from "../db/entities/operations.js";
import { getLogger } from "../logger.js";
import {
  type AutoExtractMessage,
  extractAndRetain,
  type ExtractedCandidate,
  type ExtractFactsOptions,
} from "./autoExtract.js";
import type { RetainContext } from "./retain.js";
import type { ConsolidationFallbackReason, RetainOptions, RetainResult } from "./types.js";

/** @public */
export interface MemoryExtractedEvent {
  candidate: ExtractedCandidate;
  result: RetainResult;
  conversationId?: string;
}

/** @public */
export interface TurnSkippedEvent {
  reason: "in-flight" | "no-messages";
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
}

/** @public */
export interface CreateAutoExtractorOptions {
  retainCtx: RetainContext;
  extract: ExtractFactsOptions;
  /** Confidence floor for retained facts. Default 0.7. */
  minConfidence?: number;
  /** How many recent messages to feed the extractor. Default 6. */
  windowSize?: number;
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
   * (async, fire-and-forget). The returned promise resolves to true if
   * extraction was scheduled, false if skipped (in-flight or no messages).
   */
  processTurn(messages: AutoExtractMessage[], conversationId?: string): boolean;
  /** True while a turn's extraction is in flight. */
  isProcessing(): boolean;
  /** Stop accepting new turns. In-flight work continues to completion. */
  dispose(): void;
}

const DEFAULT_WINDOW_SIZE = 6;

/**
 * Create a per-session auto-extractor. See module docstring for usage.
 */
export function createAutoExtractor(options: CreateAutoExtractorOptions): AutoExtractor {
  const windowSize = options.windowSize ?? DEFAULT_WINDOW_SIZE;
  let inflight = 0;
  let disposed = false;

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
        // Inherit PII redaction from the extract options — if extraction
        // redacts, consolidation (which reasons over the same chat-derived
        // facts) must too, or it would re-leak the values extraction protected.
        ...(options.extract.piiRedaction !== undefined && {
          piiRedaction: options.extract.piiRedaction,
        }),
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

  function processTurn(messages: AutoExtractMessage[], conversationId?: string): boolean {
    if (disposed) return false;
    if (messages.length === 0) {
      options.onSkipped?.({ reason: "no-messages", conversationId });
      return false;
    }
    if (inflight > 0) {
      options.onSkipped?.({ reason: "in-flight", conversationId });
      return false;
    }

    const window = messages.slice(-windowSize);
    inflight++;
    const t0 = Date.now();

    void (async () => {
      try {
        const { candidates, results, failedCount } = await extractAndRetain(
          window,
          options.retainCtx,
          {
            extract: options.extract,
            ...(options.minConfidence !== undefined && { minConfidence: options.minConfidence }),
            ...(options.entityCtx !== undefined && { entityCtx: options.entityCtx }),
            ...(options.scope !== undefined && { scope: options.scope }),
            ...(options.folderId !== undefined && { folderId: options.folderId }),
            ...(consolidateOptions !== undefined && { consolidateOptions }),
            ...(options.onCandidateFailed && {
              onCandidateFailed: (candidate, error) =>
                options.onCandidateFailed?.({ candidate, error, conversationId }),
            }),
          }
        );

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
        });
      } catch (err) {
        options.onError?.(err instanceof Error ? err : new Error(String(err)), conversationId);
      } finally {
        inflight--;
      }
    })();

    return true;
  }

  return {
    processTurn,
    isProcessing: () => inflight > 0,
    dispose: () => {
      disposed = true;
    },
  };
}
