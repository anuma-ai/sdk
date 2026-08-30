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
 *
 * The handler does not observe every recall in the process. See
 * {@link createRecallDiagnosticsHandler} for the coverage boundary — that
 * note lives on the function, not here, because a file header is a floating
 * comment: it is not attached to the symbol, so it never reaches an editor
 * hover or the generated API surface.
 */

import type { RecallDiagnostics } from "../lib/memory/types";
import type { TelemetrySink } from "./types";

/**
 * Build an `onDiagnostics` callback that forwards recall diagnostics to
 * `sink`. Never throws — a throwing sink method is swallowed, matching the
 * `recall()` contract that diagnostics must not break retrieval.
 *
 * COVERAGE — this handler only sees recalls the host starts itself: a direct
 * `recall()` call, or `reflect()` (`ReflectOptions extends RecallOptions`, and
 * reflect forwards the options object). It does NOT see recalls that happen
 * inside a tool-loop run. `RecallOptions.onDiagnostics` is a single slot, not a
 * composable hook list, and both in-run paths already occupy it to read
 * `degraded` for themselves — the recall tool (`lib/memory/recallTool.ts`) and
 * the vault search tool (`lib/memoryVault/searchTool.ts`). Neither forwards a
 * caller's callback, and neither exposes the slot on its own options.
 *
 * Two consequences to plan for:
 *
 * - Event volume reports host-initiated recall only. A near-empty
 *   `recall.completed` stream means the app recalls through the tools. It does
 *   not mean recall is broken or that the sink is misconfigured.
 * - These events carry no `runId`, so you cannot join them to `run.failed` from
 *   `createMetricsHooks`. That join needs two changes in the memory layer, not
 *   here: make `onDiagnostics` forwardable through both tools, and thread the
 *   loop's `runId` (minted in `lib/chat/toolLoop.ts`) across the executor
 *   boundary onto `RecallDiagnostics`.
 *
 * A host that already holds a `runId` can stamp it today with no signature
 * change: wrap the sink rather than the handler, and put it on `track`
 * properties only. A metric tag of that cardinality is a problem for the
 * backend — see {@link TelemetrySink} on keeping tags low-cardinality.
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
