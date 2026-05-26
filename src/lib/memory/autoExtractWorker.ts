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

import {
  type AutoExtractMessage,
  extractAndRetain,
  type ExtractedCandidate,
  type ExtractFactsOptions,
} from "./autoExtract.js";
import type { RetainContext } from "./retain.js";
import type { RetainResult } from "./types.js";

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
  /** Per-fact event — fires once per memory written. */
  onMemoryExtracted?: (event: MemoryExtractedEvent) => void;
  /** Per-turn event — fires once after the whole pipeline finishes. */
  onTurnComplete?: (event: TurnCompleteEvent) => void;
  /** Diagnostic — fires when a turn is skipped. */
  onSkipped?: (event: TurnSkippedEvent) => void;
  /** Diagnostic — fires on unexpected pipeline errors. */
  onError?: (error: Error, conversationId?: string) => void;
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
        const { candidates, results } = await extractAndRetain(window, options.retainCtx, {
          extract: options.extract,
          ...(options.minConfidence !== undefined && { minConfidence: options.minConfidence }),
        });

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
