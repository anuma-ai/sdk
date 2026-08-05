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

const HEADER = "[Tool Execution Results]\n\n";
const FOOTER = "\n\nBased on these results, continue with the task.";
const ENTRY_SEPARATOR = "\n\n";

/**
 * The footer, without its leading blank line.
 *
 * Exported so the replay parser can tell it apart from an entry's own trailing lines: a truncated
 * entry spans several lines, so the parser attaches trailing non-matching lines to the entry above —
 * and this is the one trailing line that belongs to the row rather than to any entry.
 */
export const TOOL_RESULT_FOOTER_LINE = FOOTER.trim();

/**
 * Hard ceiling on the persisted tool-result message, in characters. Bounds the
 * whole row, framing and per-entry prefixes included.
 *
 * It does *not* clear the per-tool caps: `truncate` in `tools/github.ts` returns
 * up to `MAX_RESPONSE_SIZE` (100_000) plus its own marker, and the
 * `Tool "<name>" returned: ` prefix and `JSON.stringify` escaping push it
 * further, so one maxed `github_api` call is over this budget on its own.
 */
export const MAX_PERSISTED_TOOL_RESULT_CHARS = 100_000;

/**
 * Assemble the persisted content for a turn's auto-executed tool results,
 * bounded to {@link MAX_PERSISTED_TOOL_RESULT_CHARS}.
 *
 * The budget is shared per entry rather than spent first-come-first-served over
 * the concatenation. Results accumulate in round order, and that order runs
 * against us: the data-fetch tools run first and return the huge payloads,
 * display tools run last and return the small structured ones. Capping the
 * concatenation therefore evicted the display entry whole (found in review of
 * PR #866), and that is data loss rather than lost context: the clients parse
 * this row back with /Tool "display_(\w+)" returned: (.+)/ to rehydrate chart
 * and weather cards on reload, and those payloads exist nowhere else.
 *
 * Truncation markers are explicit and human-readable on purpose: the row is fed
 * back to the model on later turns, so silent loss reads as the tool having
 * returned less than it did. Each marker stays attached to the entry it
 * describes, so it is never a lone note at the end of an unrelated blob.
 */
export function buildToolResultContent(results: AutoExecutedToolResult[]): string {
  const entries = results.map((r) => `Tool "${r.name}" returned: ${JSON.stringify(r.result)}`);
  const framing =
    HEADER.length + FOOTER.length + ENTRY_SEPARATOR.length * Math.max(0, entries.length - 1);
  const summary = capEntries(entries, MAX_PERSISTED_TOOL_RESULT_CHARS - framing).join(
    ENTRY_SEPARATOR
  );

  return `${HEADER}${summary}${FOOTER}`;
}

/**
 * Water-fill `budget` across already-assembled entries.
 *
 * Exported for the replay fold, which needs the same ceiling for the same reason on a different
 * string: the appendix it builds accumulates every auto-executed tool of a turn, and `plan_deck` +
 * 20 × `add_slide` folds tens of KB onto one assistant message that is then re-sent every turn.
 * Sharing this rather than writing a second cap is what keeps the two from disagreeing about which
 * entry gets evicted.
 */
export function capToolResultEntries(entries: string[], budget: number): string[] {
  return capEntries(entries, budget);
}

/**
 * Share `budget` across the entries by water-filling: each gets an equal slice,
 * and what the under-budget ones leave unused goes to the oversized ones.
 * Assigning smallest-first is what makes that a single pass, and it is why a
 * 200-char chart payload survives beside a github dump that is over budget on
 * its own — a flat `budget / n` would cut both.
 */
function capEntries(entries: string[], budget: number): string[] {
  const smallestFirst = entries
    .map((_, index) => index)
    .sort((a, b) => entries[a].length - entries[b].length);

  const capped = [...entries];
  let remaining = budget;
  let unassigned = entries.length;
  for (const index of smallestFirst) {
    capped[index] = truncateEntry(entries[index], Math.floor(remaining / unassigned));
    remaining -= capped[index].length;
    unassigned--;
  }

  return capped;
}

/** Cut one entry down to `allowance`, its own truncation marker included. */
function truncateEntry(entry: string, allowance: number): string {
  if (entry.length <= allowance) return entry;

  // Size the marker against the whole entry so its digit count is an upper
  // bound: the marker built from the real omitted count can only be shorter,
  // never long enough to push the entry back over its allowance.
  const keep = allowance - truncationMarker(entry.length).length;
  // Only reachable with thousands of results in one turn, where a share is
  // narrower than the marker itself. The ceiling wins over the annotation there.
  if (keep <= 0) return entry.slice(0, Math.max(0, allowance));

  return `${entry.slice(0, keep)}${truncationMarker(entry.length - keep)}`;
}

function truncationMarker(omitted: number): string {
  return `\n\n... (tool output truncated, ${omitted} characters omitted)`;
}
