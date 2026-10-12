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
    track("recall.completed", {
      usedBudget: diagnostics.usedBudget,
      reranked: diagnostics.reranked,
      candidateCount: diagnostics.candidateCount,
      admittedCount: diagnostics.admittedCount,
      topScore: diagnostics.topScore,
      lowestAdmittedScore: diagnostics.lowestAdmittedScore,
      minScoreApplied: diagnostics.minScoreApplied,
      truncated: diagnostics.truncated,
      emptyReason: diagnostics.emptyReason,
      graphLaneCount: diagnostics.graphLaneCount,
      temporalLaneCount: diagnostics.temporalLaneCount,
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
    metric("recall.admitted", diagnostics.admittedCount, {});
    metric("recall.facts", diagnostics.factCount, {});
    metric("recall.chunks", diagnostics.chunkCount, {});
    metric("recall.lane.graph", diagnostics.graphLaneCount, {});
    metric("recall.lane.temporal", diagnostics.temporalLaneCount, {});
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
