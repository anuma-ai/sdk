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

/** One tool's contribution to the row. Internal: the fold is the only consumer. */
interface ToolResultSegment {
  name: string;
  /** The `Tool "<name>" returned: <json>` line, verbatim. */
  line: string;
}

const TOOL_LINE = /^Tool "([^"]+)" returned: (.*)$/;

/** A stored row's minimal shape — structural so both `StoredMessage` and plain pairs satisfy it. */
interface ToolResultsRowLike {
  role: string;
  content: string;
  /** Present on stored rows; lets the fold find its assistant by link rather than by position. */
  uniqueId?: string;
  parentMessageId?: string;
}

/**
 * Is this stored row one of the synthetic tool-results rows?
 *
 * The prefix alone is not enough: a person can type or paste "[Tool Execution Results]" into the
 * composer, and treating that as synthetic would fold their words into the previous assistant turn or
 * drop them outright. A real synthetic always carries at least one `Tool "<name>" returned: …` line —
 * `buildToolResultContent` is only called with a non-empty result list — so requiring one keeps a
 * human's message a human's message.
 *
 * The `origin: "tool_result"` column added in v44 (#866) is the stronger signal, but it is absent on
 * every row written before then, so the shape check stays as the fallback rather than being replaced.
 */
export function isToolResultsRow(row: ToolResultsRowLike): boolean {
  if (row.role !== "user" || !row.content.startsWith(TOOL_RESULTS_PREFIX)) return false;
  return parseToolResultSegments(row.content).length > 0;
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
  // Deferred to a second pass so the fold does not depend on the row landing after its assistant.
  // History is sorted by `created_at`, which is NOT unique, and the assistant row and its tool-results
  // row are written back to back — a tie can order the row first, and a position-only fold would then
  // silently lose the tool output. Each entry keeps the durable link (`parentMessageId`) plus the
  // positional fallback for a row written without one.
  const pending: { row: T; fallbackIndex: number }[] = [];
  const assistantIndexById = new Map<string, number>();

  for (const row of rows) {
    if (isToolResultsRow(row)) {
      pending.push({ row, fallbackIndex: out.length - 1 });
      continue;
    }
    out.push(row);
    if (row.role === "assistant" && row.uniqueId) {
      assistantIndexById.set(row.uniqueId, out.length - 1);
    }
  }

  for (const { row, fallbackIndex } of pending) {
    const linked = row.parentMessageId ? assistantIndexById.get(row.parentMessageId) : undefined;
    const target = linked ?? fallbackIndex;
    const previous = out[target];
    // Nothing to fold into (a corrupt or truncated thread, or a row whose assistant is outside the
    // window): drop the row rather than send a bare user turn, which is the failure mode this whole
    // function exists for.
    if (!previous || previous.role !== "assistant") continue;
    const kept = parseToolResultSegments(row.content).filter((s) => !exclude.has(s.name));
    if (kept.length > 0) {
      const appendix = `${TOOL_RESULTS_PREFIX}\n${kept.map((s) => s.line).join("\n")}`;
      out[target] = {
        ...previous,
        content: previous.content.trim() ? `${previous.content}\n\n${appendix}` : appendix,
      };
    } else if (!previous.content.trim() && options?.placeholder) {
      out[target] = { ...previous, content: options.placeholder };
    }
  }
  return out;
}
