/**
 * The single reporting point for "a consolidation decision did not get applied,
 * so this retain created instead".
 *
 * Its own module rather than a member of `consolidate.ts` because `retain.ts`
 * needs it on paths where `consolidate.ts` is not loaded. Consolidation is an
 * optional stage and `retain.ts` reaches it through `await import()`, so a static
 * import of the applier's reporting helper from that module would pull the whole
 * LLM consolidation path into every bundle that only ever writes memories. This
 * file has no dependency beyond the logger.
 */

import { getLogger } from "../logger.js";
import type { ConsolidationFallbackReason } from "./types.js";

/**
 * Log a degrade-to-create and hand it to the caller's `onFallback`.
 *
 * Two callers, two causes, one channel. `consolidateMemory` reports the reasons
 * that originate in the model round-trip (`llm_error`, `invalid_response`);
 * `retain()`'s applier reports `target_vanished`, where the decision was good and
 * a concurrent writer removed the row it named before the write landed. Both end
 * in a create where a merge was intended, so both have to arrive here — a
 * fallback rate that only counts one of the two causes is not a fallback rate.
 *
 * @param detail Extra context for the log line only. Deliberately NOT passed to
 *   the hook: `onFallback` takes a bounded reason so a consumer can key a counter
 *   on it, and widening it to carry per-call strings (memory ids, counts) would
 *   turn that into a high-cardinality metric.
 */
export function notifyConsolidationFallback(
  reason: ConsolidationFallbackReason,
  onFallback: ((reason: ConsolidationFallbackReason) => void) | undefined,
  detail?: unknown
): void {
  // Warn by default so a persistently-failing consolidator (which silently
  // accumulates duplicate memories) is observable without the caller having
  // wired onFallback. This is the single log point for all degrade paths —
  // previously only the thrown-error path logged, so parsed===null and
  // invalid_response fallbacks were invisible.
  if (detail !== undefined) {
    getLogger().warn(`memory/consolidate: degraded to create (${reason})`, detail);
  } else {
    getLogger().warn(`memory/consolidate: degraded to create (${reason})`);
  }
  try {
    onFallback?.(reason);
  } catch {
    // Observability callback must not break the write path — a throwing
    // metrics hook would otherwise propagate up through retain() and
    // fail the very write the fallback is trying to preserve.
  }
}
