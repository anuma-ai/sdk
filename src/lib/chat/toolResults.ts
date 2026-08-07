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

import type { MessageOrigin } from "../db/chat/types";
import { capToolResultEntries, TOOL_RESULT_FOOTER_LINE } from "./toolResultMessage";

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
  /**
   * Provenance, from the plaintext `origin` column added in schema v44 (#866). `"tool_result"` marks
   * a row the SDK synthesised. Null on rows written before v44 and on rows a client wrote itself.
   */
  origin?: string | null;
}

/**
 * Value of the `origin` column on a row the SDK synthesised for a turn's tool results (v44, #866).
 *
 * `satisfies MessageOrigin` so this constant and the column's union cannot drift apart silently.
 */
export const TOOL_RESULT_ORIGIN = "tool_result" satisfies MessageOrigin;

/**
 * Is this stored row one of the synthetic tool-results rows?
 *
 * Two signals, in order of trust:
 *
 * 1. `origin === "tool_result"` — written by the SDK at the same moment as the row (v44, #866). A
 *    person cannot produce it from the composer, so where it is present the question is settled and
 *    the content is never consulted.
 * 2. Shape — the prefix AND at least one `Tool "<name>" returned: …` line. The prefix alone is not
 *    enough: a person can paste "[Tool Execution Results]" and treating that as synthetic would fold
 *    their words into the previous assistant turn or drop them outright.
 *
 * The shape check is a FALLBACK, not a replacement, because `origin` is null on every row written
 * before v44 and on the rows mobile still hand-writes for slides and documents. Its residual false
 * positive is a user who pastes the prefix AND a well-formed tool line in one message: nothing in the
 * content can distinguish that from a real synthetic, which is precisely why the column exists. That
 * case shrinks to nothing as pre-v44 rows age out.
 */
export function isToolResultsRow(row: ToolResultsRowLike): boolean {
  if (row.origin === TOOL_RESULT_ORIGIN) return true;
  // An origin the SDK set to something else is a positive statement that this is NOT a tool-results
  // row, so the shape guess must not override it.
  if (typeof row.origin === "string") return false;
  if (row.role !== "user" || !row.content.startsWith(TOOL_RESULTS_PREFIX)) return false;
  return parseToolResultSegments(row.content).length > 0;
}

/**
 * The per-tool entries inside a row.
 *
 * Line-based rather than split on the blank lines, because a client may write the same row with single
 * newlines (mobile's hand-written document card does) and `JSON.stringify` never emits a raw newline,
 * so an entry's PAYLOAD is always exactly one line.
 *
 * An entry is not, though. `buildToolResultContent` appends its truncation marker inside the entry
 * (`\n\n... (tool output truncated, N characters omitted)`), so a capped entry spans four lines. A
 * strictly one-line-per-entry parser dropped that marker on the way through the fold, handing the
 * model JSON cut mid-value with nothing saying it had been cut — the one thing the marker is worded
 * for. So trailing lines that are not themselves a tool line stay attached to the entry above.
 *
 * The row's own footer is the single exception: it belongs to the row, not to the last entry.
 */
export function parseToolResultSegments(content: string): ToolResultSegment[] {
  const segments: ToolResultSegment[] = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    const match = TOOL_LINE.exec(line);
    if (match) {
      segments.push({ name: match[1], line });
      continue;
    }
    const current = segments[segments.length - 1];
    if (!current || line === "" || line === TOOL_RESULT_FOOTER_LINE) continue;
    if (line === TOOL_RESULTS_PREFIX) continue;
    current.line = `${current.line}\n${line}`;
  }
  return segments;
}

/**
 * Apply the caller's replay policy for tool-results rows: fold them onto their assistant turn, or
 * drop them.
 *
 * Both entries funnel through here rather than each writing its own `fold ? … : …`, because the two
 * branches are not equally safe and the difference must be stated in exactly one place. Folding
 * moves the payload onto an `assistant` row, so a consumer that scrubs these rows by
 * `role === "user"` + prefix stops catching them — see `foldToolResultsInHistory`. Dropping is the
 * conservative branch and the default.
 *
 * Never sends the rows verbatim: a `role: "user"` row replayed as-is puts two consecutive user turns
 * on the wire and the model answers the previous one.
 */
export function prepareToolResultsForReplay<T extends ToolResultsRowLike>(
  rows: readonly T[],
  options: { fold: boolean; exclude?: readonly string[]; placeholder?: string }
): T[] {
  if (options.fold) {
    return foldToolResultsRows(rows, {
      exclude: options.exclude,
      placeholder: options.placeholder,
    });
  }
  return rows.filter((row) => !isToolResultsRow(row));
}

/**
 * Fold the synthetic tool-results rows of a replayed history into the assistant turns they belong to.
 *
 * - the row itself is removed, so history keeps strict user/assistant alternation;
 * - its tool lines are appended to the PRECEDING assistant message, which is where that turn's tool
 *   cycle happened — so "which of them likes chess" still has a referent after a reload;
 * - `exclude` withholds named tools' lines from REPLAY. Display payloads that exist only for the
 *   renderer belong here: mobile's People Nearby card carries third parties' snapped coordinates,
 *   which the search result deliberately strips before the model ever sees the people. Nothing in this
 *   module guesses that from the tool name — the app names the tools it will not replay.
 *
 *   Replay, and nothing more. An excluded payload is still built into the row by
 *   `buildToolResultContent`, still written to `history`, still encrypted at rest and still uploaded
 *   to the user's own backup — the card needs it to re-render after a reload, and #866's `origin` tag
 *   keeps it out of the vector index. "Not replayed to the model" and "does not travel at all" are
 *   different guarantees and only the first is on offer here; a persistence-level exclusion would cost
 *   the card its data on reload and belongs in its own change.
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
  const pending: { row: T; insertionPoint: number }[] = [];
  const assistantIndexById = new Map<string, number>();

  for (const row of rows) {
    if (isToolResultsRow(row)) {
      pending.push({ row, insertionPoint: out.length });
      continue;
    }
    out.push(row);
    if (row.role === "assistant" && row.uniqueId) {
      assistantIndexById.set(row.uniqueId, out.length - 1);
    }
  }

  // Grouped by target, because two rows can land on ONE assistant during the mobile transition — a
  // legacy hand-rolled row and the new SDK row for the same turn. Appending each separately produced
  // two `[Tool Execution Results]` blocks on the same message and double the payload.
  const byTarget = new Map<number, T[]>();
  for (const { row, insertionPoint } of pending) {
    const target = resolveFoldTarget(out, row, insertionPoint, assistantIndexById);
    // Nothing to fold into (a corrupt thread, or a row whose assistant is outside the window): drop
    // the row rather than send a bare user turn, which is the failure mode this function exists for.
    if (target === undefined) continue;
    const group = byTarget.get(target);
    if (group) group.push(row);
    else byTarget.set(target, [row]);
  }

  for (const [target, groupedRows] of byTarget) {
    const assistant = out[target];
    const kept = groupedRows
      .flatMap((row) => parseToolResultSegments(row.content))
      .filter((segment) => !exclude.has(segment.name));
    if (kept.length > 0) {
      out[target] = { ...assistant, content: appendToolResults(assistant.content, kept) };
    } else if (!assistant.content.trim() && options?.placeholder) {
      out[target] = { ...assistant, content: options.placeholder };
    }
  }
  return out;
}

/**
 * Which assistant message this row's payload belongs to, as an index into `out`.
 *
 * The durable link (`parentMessageId` → an assistant's `uniqueId`) settles it whenever it resolves,
 * which is every row this SDK writes. Everything below is for rows it did not write: the ones already
 * in users' databases, where mobile's `buildSlideDisplayMessage` chained to "the preceding message" and
 * so parented the row to the USER prompt, or to nothing at all.
 *
 * For those, the target is the NEAREST assistant in either direction, not a fixed direction. Neither
 * fixed order is correct:
 *
 * - Backwards-first breaks the legacy shape from turn two onward. `[u0, a0, u1, legacyRow, a1]` finds
 *   `a0` before it ever looks forward, so the deck's payload is attributed to the turn BEFORE the one
 *   that produced it, and the turn that did carries nothing. That is worse than the drop it replaced,
 *   and mobile — which owns the legacy rows — is exactly who opts into folding.
 * - Forwards-first breaks a parentless row that follows its assistant: `[a0, row, u1, a1]` would hand
 *   the payload to `a1`, a turn that had not happened yet.
 *
 * Distance settles both, and a tie goes backwards because the preceding assistant is the historical
 * meaning of these rows.
 */
function resolveFoldTarget<T extends ToolResultsRowLike>(
  out: readonly T[],
  row: T,
  insertionPoint: number,
  assistantIndexById: ReadonlyMap<string, number>
): number | undefined {
  const linked = row.parentMessageId ? assistantIndexById.get(row.parentMessageId) : undefined;
  if (linked !== undefined) return linked;

  let previous: number | undefined;
  for (let i = insertionPoint - 1; i >= 0; i--) {
    if (out[i].role === "assistant") {
      previous = i;
      break;
    }
  }
  let next: number | undefined;
  for (let i = insertionPoint; i < out.length; i++) {
    if (out[i].role === "assistant") {
      next = i;
      break;
    }
  }

  if (previous === undefined) return next;
  if (next === undefined) return previous;
  return next - insertionPoint < insertionPoint - previous ? next : previous;
}

/**
 * Hard ceiling on the appendix folded onto one assistant message, in characters.
 *
 * Separate from — and much tighter than — `MAX_PERSISTED_TOOL_RESULT_CHARS`, because the economics
 * differ: the persisted row is stored once, while this appendix is re-sent on EVERY subsequent turn.
 * `toolLoop` accumulates every successful auto-executed tool across every round, so a
 * `plan_deck + add_slide × 20` turn folds tens of KB onto a single message and then pays for it
 * forever. 20k chars is roughly 5k tokens — enough to keep a display payload's identifying fields
 * (which is what a follow-up needs) without carrying a full deck's JSX.
 */
export const MAX_FOLDED_APPENDIX_CHARS = 20_000;

/** The assistant's content with the kept tool entries appended as one capped block. */
function appendToolResults(assistantContent: string, kept: readonly ToolResultSegment[]): string {
  const framing = TOOL_RESULTS_PREFIX.length + 1 + (kept.length - 1);
  const capped = capToolResultEntries(
    kept.map((segment) => segment.line),
    MAX_FOLDED_APPENDIX_CHARS - framing
  );
  const appendix = `${TOOL_RESULTS_PREFIX}\n${capped.join("\n")}`;
  return assistantContent.trim() ? `${assistantContent}\n\n${appendix}` : appendix;
}
