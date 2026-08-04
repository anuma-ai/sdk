/**
 * The synthetic history row a turn's auto-executed tool results are persisted as, and how it is
 * replayed.
 *
 * Both storage entries write this row so a display tool's payload survives a reload and the app can
 * re-render the card from history (the clients' `parseDisplayResults` keys off the tool NAME inside
 * it). It lived inline in the react entry only, which is why the expo entry silently had no row at
 * all and every mobile card had to hand-roll one; sharing the format is what keeps the two from
 * drifting again.
 *
 * Replay is the other half. The row is stored as `role: "user"` (that is what lets a tool cycle's
 * context be rebuilt), so sending it back verbatim puts two consecutive user turns on the wire — and a
 * model handed that answers the PREVIOUS turn and swallows the new prompt. Web has always dropped
 * these rows client-side for exactly that reason, at the cost of the model forgetting what the tools
 * returned. `foldToolResultsRows` keeps both: the payload rides along on the preceding assistant
 * message, where it needs no turn of its own.
 */

/** Marker the clients match on to tell this row apart from a real user turn. */
export const TOOL_RESULTS_PREFIX = "[Tool Execution Results]";

/**
 * Stand-in for an assistant turn whose entire visible reply was a display card, when that card's
 * payload is excluded from replay. Same wording the clients use, so the two platforms tell the model
 * the same thing about the turn.
 */
export const DISPLAY_CARD_PLACEHOLDER = "[displayed a card to the user with the tool result]";

/** One tool's contribution to the row. */
export interface ToolResultSegment {
  name: string;
  /** The `Tool "<name>" returned: <json>` line, verbatim. */
  line: string;
}

const TOOL_LINE = /^Tool "([^"]+)" returned: (.*)$/;

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

/** A stored row's minimal shape — structural so both `StoredMessage` and plain pairs satisfy it. */
export interface ToolResultsRowLike {
  role: string;
  content: string;
}

/** Is this stored row one of the synthetic tool-results rows (and not a user turn quoting one)? */
export function isToolResultsRow(row: ToolResultsRowLike): boolean {
  return row.role === "user" && row.content.startsWith(TOOL_RESULTS_PREFIX);
}

/**
 * The per-tool lines inside a row.
 *
 * Line-based rather than split on the blank lines, because a client may write the same row with single
 * newlines (mobile's hand-written document card does) and `JSON.stringify` never emits a raw newline,
 * so one result is always exactly one line.
 */
export function parseToolResultSegments(content: string): ToolResultSegment[] {
  const segments: ToolResultSegment[] = [];
  for (const line of content.split("\n")) {
    const match = TOOL_LINE.exec(line.trim());
    if (match) segments.push({ name: match[1], line: line.trim() });
  }
  return segments;
}

/**
 * Fold the synthetic tool-results rows of a replayed history into the assistant turns they belong to.
 *
 * - the row itself is removed, so history keeps strict user/assistant alternation;
 * - its tool lines are appended to the PRECEDING assistant message, which is where that turn's tool
 *   cycle happened — so "which of them likes chess" still has a referent after a reload;
 * - `exclude` drops named tools' lines entirely. Display payloads that exist only for the renderer
 *   belong here: mobile's People Nearby card carries third parties' snapped coordinates, which the
 *   search result deliberately strips before the model ever sees the people. Nothing in this module
 *   guesses that from the tool name — the app names the tools it will not replay.
 * - an assistant turn whose visible reply WAS the card is stored empty; when everything in the row is
 *   excluded, it gets `placeholder` so it survives the caller's own empty-message filtering and does
 *   not collapse the alternation it was keeping.
 */
export function foldToolResultsRows<T extends ToolResultsRowLike>(
  rows: readonly T[],
  options?: { exclude?: readonly string[]; placeholder?: string }
): T[] {
  const exclude = new Set(options?.exclude ?? []);
  const out: T[] = [];
  for (const row of rows) {
    if (!isToolResultsRow(row)) {
      out.push(row);
      continue;
    }
    const kept = parseToolResultSegments(row.content).filter((s) => !exclude.has(s.name));
    const previous = out[out.length - 1];
    // Nothing to fold into (a row with no assistant before it — a corrupt or reordered thread): drop
    // it rather than send a bare user turn, which is the failure mode this whole function exists for.
    if (!previous || previous.role !== "assistant") continue;
    if (kept.length > 0) {
      const appendix = `${TOOL_RESULTS_PREFIX}\n${kept.map((s) => s.line).join("\n")}`;
      out[out.length - 1] = {
        ...previous,
        content: previous.content.trim() ? `${previous.content}\n\n${appendix}` : appendix,
      };
    } else if (!previous.content.trim() && options?.placeholder) {
      out[out.length - 1] = { ...previous, content: options.placeholder };
    }
  }
  return out;
}
