/**
 * Assembly of the hidden `[Tool Execution Results]` message.
 *
 * Every auto-executed tool result is persisted as a synthetic `role: "user"`
 * row so later turns (and other devices) keep the context. That row is never
 * rendered, and until now it had no size bound at all: only `github.ts` and
 * `dropbox.ts` cap their own responses, while gmail, googleDrive,
 * googleCalendar, notion, slack, x and ~12 others cap nothing. So the outer
 * bound lives here, at the one choke point every provider funnels through,
 * rather than being re-litigated per tool. Per-tool caps stay as inner bounds.
 */

import type { AutoExecutedToolResult } from "./toolLoop";

/**
 * Hard ceiling on the persisted tool-result message, in characters.
 *
 * Matches the per-tool caps (`MAX_RESPONSE_SIZE` in `tools/github.ts`,
 * `MAX_CONTENT_SIZE` in `tools/dropbox.ts`) so a capped provider's payload is
 * unaffected and only the uncapped ones are newly bounded.
 */
export const MAX_PERSISTED_TOOL_RESULT_CHARS = 100_000;

/**
 * Assemble the persisted content for a turn's auto-executed tool results,
 * bounded to {@link MAX_PERSISTED_TOOL_RESULT_CHARS}.
 *
 * The truncation marker is explicit and human-readable on purpose: the row is
 * fed back to the model on later turns, so silent loss reads as the tool
 * having returned less than it did.
 */
export function buildToolResultContent(results: AutoExecutedToolResult[]): string {
  const summary = results
    .map((r) => `Tool "${r.name}" returned: ${JSON.stringify(r.result)}`)
    .join("\n\n");

  return `[Tool Execution Results]\n\n${capToolResultSummary(summary)}\n\nBased on these results, continue with the task.`;
}

/**
 * Cap the assembled tool output. Kept separate from the wrapper text so the
 * limit bounds the payload itself and the framing is never what gets cut.
 */
function capToolResultSummary(summary: string): string {
  if (summary.length <= MAX_PERSISTED_TOOL_RESULT_CHARS) return summary;
  const omitted = summary.length - MAX_PERSISTED_TOOL_RESULT_CHARS;
  return `${summary.slice(0, MAX_PERSISTED_TOOL_RESULT_CHARS)}\n\n... (tool output truncated, ${omitted} characters omitted)`;
}
