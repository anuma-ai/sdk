/**
 * Adapter that turns {@link RecallDiagnostics} (the `onDiagnostics` hook on
 * {@link RecallOptions}) into telemetry events and metrics on a
 * {@link TelemetrySink}.
 *
 * Events emitted:
 *
 * - `recall.completed` — once per `recall()` call with budget, lane counts,
 *   and whether the cross-encoder reranked.
 * - `recall.degraded` — once per entry in `diagnostics.degraded`, with the
 *   degradation reason. A clean recall emits none.
 *
 * Metrics emitted (all tagged `lane`):
 *
 * - `recall.duration` (ms) for each timing lane: `total`, `prep`, `factLane`,
 *   `rerank`, `queryEmbed`, `chunkLane`, `fuse`. `rerank` and `queryEmbed`
 *   are SUBSETS of `factLane` — do not sum the lanes.
 * - `recall.candidates` (count), `recall.facts` (count), `recall.chunks` (count)
 * - `recall.vault.size`, `recall.vault.rows_decrypted`,
 *   `recall.vault.rows_embedded` when the fact lane reported them.
 */

import type { RecallDiagnostics } from "../lib/memory/types";
import type { TelemetrySink } from "./types";

/**
 * Build an `onDiagnostics` callback that forwards recall diagnostics to
 * `sink`. Never throws — a throwing sink method is swallowed, matching the
 * `recall()` contract that diagnostics must not break retrieval.
 */
export function createRecallDiagnosticsHandler(
  sink: TelemetrySink
): (diagnostics: RecallDiagnostics) => void {
  // See createMetricsHooks: an async sink method's rejected Promise would
  // escape a plain try/catch as an unhandled rejection, so swallow thenables
  // too.
  const swallow = (call: () => void): void => {
    try {
      const result: unknown = call();
      if (result && typeof (result as PromiseLike<unknown>).then === "function") {
        void Promise.resolve(result).catch(() => {});
      }
    } catch {
      // Diagnostics must never break retrieval.
    }
  };
  const track = (event: string, properties: Record<string, unknown>): void => {
    swallow(() => sink.track?.(event, properties));
  };
  const metric = (name: string, value: number, tags: Record<string, string>): void => {
    swallow(() => sink.metric?.(name, value, tags));
  };

  return (diagnostics: RecallDiagnostics) => {
    // totalMs rides the EVENT as well as the `recall.duration` metric. Both
    // TelemetrySink methods are optional and a track-only sink is supported and
    // documented (the module's own PostHog example is exactly that shape), so
    // without this the headline recall latency silently vanishes for anyone who
    // wired up `track` alone — they see recall.completed arriving and conclude
    // recall observability works. The run adapter already puts durationMs on
    // run.completed for the same reason; this removes the asymmetry.
    track("recall.completed", {
      usedBudget: diagnostics.usedBudget,
      reranked: diagnostics.reranked,
      candidateCount: diagnostics.candidateCount,
      factCount: diagnostics.factCount,
      chunkCount: diagnostics.chunkCount,
      totalMs: diagnostics.timings.total,
      ...(diagnostics.decryptLast !== undefined ? { decryptLast: diagnostics.decryptLast } : {}),
      degradedCount: diagnostics.degraded.length,
    });

    for (const reason of diagnostics.degraded) {
      track("recall.degraded", { reason, usedBudget: diagnostics.usedBudget });
    }

    for (const [lane, ms] of Object.entries(diagnostics.timings)) {
      metric("recall.duration", ms, { lane });
    }
    metric("recall.candidates", diagnostics.candidateCount, {});
    metric("recall.facts", diagnostics.factCount, {});
    metric("recall.chunks", diagnostics.chunkCount, {});
    if (diagnostics.vaultSize !== undefined) {
      metric("recall.vault.size", diagnostics.vaultSize, {});
    }
    if (diagnostics.vaultRowsDecrypted !== undefined) {
      metric("recall.vault.rows_decrypted", diagnostics.vaultRowsDecrypted, {});
    }
    if (diagnostics.vaultRowsEmbedded !== undefined) {
      metric("recall.vault.rows_embedded", diagnostics.vaultRowsEmbedded, {});
    }
  };
}
