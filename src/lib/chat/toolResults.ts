/**
 * The synthetic history row a turn's auto-executed tool results are persisted as.
 *
 * Both storage entries write this row so a display tool's payload survives a reload and the app can
 * re-render the card from history (`parseDisplayResults` in the clients keys off the tool NAME inside
 * it). It lived inline in the react entry only, which is why the expo entry silently had no row at
 * all and every mobile card had to hand-roll one; sharing the builder is what keeps the two from
 * drifting again.
 */

/** Marker the clients match on to tell this row apart from a real user turn. */
export const TOOL_RESULTS_PREFIX = "[Tool Execution Results]";

/**
 * Content for the row: one `Tool "<name>" returned: <json>` line per result.
 *
 * The trailing instruction is part of the format on purpose — the row is a `role: "user"` message, so
 * a model that is handed it back reads it as an instruction to continue rather than as a new request.
 */
export function buildToolResultsContent(
  results: readonly { name: string; result: unknown }[]
): string {
  const summary = results
    .map((r) => `Tool "${r.name}" returned: ${JSON.stringify(r.result)}`)
    .join("\n\n");
  return `${TOOL_RESULTS_PREFIX}\n\n${summary}\n\nBased on these results, continue with the task.`;
}
