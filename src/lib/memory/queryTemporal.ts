/**
 * Query-time temporal phrase parser for the W6 recall lane.
 *
 * Given a query like "what's coming up next week?" or "what did I do
 * last Tuesday?", returns a `[start, end]` window in Unix ms that the
 * temporal lane uses to filter / boost memories whose event-time
 * overlaps. Returns null when no temporal phrase is detected — the
 * temporal lane silently skips and the other lanes do the work.
 *
 * Coverage targets the ~80% of consumer-chat temporal phrasings:
 *  - Relative day:    "today", "yesterday", "tomorrow"
 *  - Relative week:   "this week", "last week", "next week"
 *  - Relative month:  "this month", "last month", "next month"
 *  - Numeric offset:  "in 3 days", "3 days ago", "2 weeks from now"
 *  - Day-of-week:     "Tuesday", "next Friday", "last Monday"
 *  - Absolute date:   "May 23", "May 23 2026", "2026-05-23"
 *  - Range:           "between X and Y", "from X to Y"
 *
 * Anchored phrases like "before my Japan trip" / "after Sara's wedding"
 * are deliberately out of scope — those need a separate event-anchor
 * resolver pass that joins query entities to memory event-times. Defer
 * to a follow-up if eval shows real lift.
 *
 * Returns absolute timestamps (Unix ms). Caller is responsible for
 * setting `now` (defaults to `Date.now()`); test fixtures should pass
 * an explicit `now` to keep determinism.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export interface TemporalWindow {
  /** Inclusive start of the window in Unix ms. */
  start: number;
  /** Exclusive end of the window in Unix ms. */
  end: number;
  /** Which phrase matched (diagnostic / explainability). */
  matchedPhrase: string;
}

const RELATIVE_DAY: Record<string, number> = {
  today: 0,
  yesterday: -1,
  tomorrow: 1,
};

const DOW_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function startOfWeek(ts: number): number {
  // Monday-start week (matches consumer-app convention; Sunday-start is
  // also defensible — pick one and stay consistent for the demo). Shift
  // so that Monday is day 0.
  const d = new Date(startOfDay(ts));
  const offset = (d.getDay() + 6) % 7;
  return d.getTime() - offset * DAY_MS;
}

function startOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function startOfNextMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

/**
 * Resolve a query's temporal phrase to an absolute window. Returns null
 * when the query has no temporal phrasing — caller's temporal lane
 * silently no-ops and the fact + chunk + graph lanes carry the query.
 */
export function parseQueryTimeWindow(query: string, now: number = Date.now()): TemporalWindow | null {
  if (!query) return null;
  const q = query.toLowerCase();

  // ── 1. Relative day ─────────────────────────────────────────────────
  for (const [phrase, offset] of Object.entries(RELATIVE_DAY)) {
    if (q.includes(phrase)) {
      const day = startOfDay(now) + offset * DAY_MS;
      return { start: day, end: day + DAY_MS, matchedPhrase: phrase };
    }
  }

  // ── 2. Relative week ────────────────────────────────────────────────
  if (/\bthis week\b/.test(q)) {
    const start = startOfWeek(now);
    return { start, end: start + WEEK_MS, matchedPhrase: "this week" };
  }
  if (/\blast week\b/.test(q)) {
    const start = startOfWeek(now) - WEEK_MS;
    return { start, end: start + WEEK_MS, matchedPhrase: "last week" };
  }
  if (/\bnext week\b/.test(q)) {
    const start = startOfWeek(now) + WEEK_MS;
    return { start, end: start + WEEK_MS, matchedPhrase: "next week" };
  }

  // ── 3. Relative month ───────────────────────────────────────────────
  if (/\bthis month\b/.test(q)) {
    const start = startOfMonth(now);
    return { start, end: startOfNextMonth(now), matchedPhrase: "this month" };
  }
  if (/\blast month\b/.test(q)) {
    const startThis = startOfMonth(now);
    const d = new Date(startThis);
    const start = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
    return { start, end: startThis, matchedPhrase: "last month" };
  }
  if (/\bnext month\b/.test(q)) {
    const start = startOfNextMonth(now);
    const d = new Date(start);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    return { start, end, matchedPhrase: "next month" };
  }

  // ── 4. Numeric offset: "in N days", "N days ago", "N weeks from now" ─
  const inMatch = /\bin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/.exec(q);
  if (inMatch) {
    const n = parseInt(inMatch[1]!, 10);
    const unit = inMatch[2]!;
    const delta = unit.startsWith("day")
      ? n * DAY_MS
      : unit.startsWith("week")
        ? n * WEEK_MS
        : n * 30 * DAY_MS;
    const day = startOfDay(now) + delta;
    return { start: day, end: day + DAY_MS, matchedPhrase: inMatch[0] };
  }
  const agoMatch = /\b(\d+)\s+(day|days|week|weeks|month|months)\s+ago\b/.exec(q);
  if (agoMatch) {
    const n = parseInt(agoMatch[1]!, 10);
    const unit = agoMatch[2]!;
    const delta = unit.startsWith("day")
      ? n * DAY_MS
      : unit.startsWith("week")
        ? n * WEEK_MS
        : n * 30 * DAY_MS;
    const day = startOfDay(now) - delta;
    return { start: day, end: day + DAY_MS, matchedPhrase: agoMatch[0] };
  }

  // ── 5. Day-of-week with optional "next" / "last" ────────────────────
  const dowMatch = /\b(next|last|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(q);
  if (dowMatch) {
    const modifier = dowMatch[1] ?? "this";
    const targetDow = DOW_NAMES.indexOf(dowMatch[2]!);
    const todayStart = startOfDay(now);
    const todayDow = new Date(todayStart).getDay();
    let delta = targetDow - todayDow;
    if (modifier === "next") delta = delta <= 0 ? delta + 7 : delta;
    else if (modifier === "last") delta = delta >= 0 ? delta - 7 : delta;
    // "this Tuesday" — closest upcoming or current
    const day = todayStart + delta * DAY_MS;
    return { start: day, end: day + DAY_MS, matchedPhrase: dowMatch[0] };
  }

  // ── 6. Absolute date — "May 23 2026" / "May 23" / "2026-05-23" ──────
  // ISO YYYY-MM-DD
  const isoMatch = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(q);
  if (isoMatch) {
    const ms = Date.parse(isoMatch[0]);
    if (Number.isFinite(ms)) {
      return { start: ms, end: ms + DAY_MS, matchedPhrase: isoMatch[0] };
    }
  }
  // "May 23 2026" or "May 23"
  const monthDayMatch = new RegExp(
    `\\b(${MONTH_NAMES.join("|")})\\s+(\\d{1,2})(?:\\s*,?\\s*(\\d{4}))?\\b`
  ).exec(q);
  if (monthDayMatch) {
    const monthIdx = MONTH_NAMES.indexOf(monthDayMatch[1]!);
    const day = parseInt(monthDayMatch[2]!, 10);
    const yearStr = monthDayMatch[3];
    const year = yearStr ? parseInt(yearStr, 10) : new Date(now).getFullYear();
    const start = new Date(year, monthIdx, day).getTime();
    return { start, end: start + DAY_MS, matchedPhrase: monthDayMatch[0] };
  }

  // ── 7. Month-only — "in May", "in May 2026" ─────────────────────────
  const monthOnlyMatch = new RegExp(
    `\\bin\\s+(${MONTH_NAMES.join("|")})(?:\\s+(\\d{4}))?\\b`
  ).exec(q);
  if (monthOnlyMatch) {
    const monthIdx = MONTH_NAMES.indexOf(monthOnlyMatch[1]!);
    const yearStr = monthOnlyMatch[2];
    const year = yearStr ? parseInt(yearStr, 10) : new Date(now).getFullYear();
    const start = new Date(year, monthIdx, 1).getTime();
    const end = new Date(year, monthIdx + 1, 1).getTime();
    return { start, end, matchedPhrase: monthOnlyMatch[0] };
  }

  return null;
}

/**
 * Score a memory's event-time against the query window.
 *
 * - Returns 1.0 when fully overlapping
 * - Returns a fractional score when partially overlapping (range memories)
 * - Returns 0 when disjoint (memory drops out of the temporal lane)
 *
 * The temporal lane only surfaces memories with score > 0; the actual
 * RRF rank is determined by sorting memories by score descending. Tie
 * breaks fall through to RRF rank quantization.
 */
export function scoreEventTimeOverlap(
  memoryStart: number | null,
  memoryEnd: number | null,
  memoryKind: string | null,
  window: TemporalWindow
): number {
  if (memoryStart === null) return 0;

  // Point: memory has a single timestamp. Score 1 if inside window.
  if (memoryKind === "point" || (memoryKind !== "range" && memoryKind !== "ongoing")) {
    return memoryStart >= window.start && memoryStart < window.end ? 1 : 0;
  }

  // Ongoing: started before window end, still going. Full overlap.
  if (memoryKind === "ongoing") {
    return memoryStart < window.end ? 1 : 0;
  }

  // Range: compute overlap fraction.
  const end = memoryEnd ?? memoryStart;
  const overlapStart = Math.max(memoryStart, window.start);
  const overlapEnd = Math.min(end, window.end);
  if (overlapEnd <= overlapStart) return 0;
  const overlap = overlapEnd - overlapStart;
  const memorySpan = Math.max(1, end - memoryStart);
  return overlap / memorySpan;
}

export interface TemporalProximityOptions {
  /** Distance at which the boost decays to half. Default 30 days. */
  halfLifeMs?: number;
  /** Coefficient on the boost. Final multiplier = 1 + alpha × proximity. Default 0.15. */
  alpha?: number;
}

/**
 * Multiplicative boost for memories whose event-time is *close to but
 * outside* the query window. Returns 1.0 (neutral) when:
 *  - the query has no temporal phrase (`window === null`)
 *  - the memory has no event-time (`memoryStart === null`)
 *  - the memory is *inside* the window (`distance === 0`)
 *
 * The third case is the key fix from the v1 boost. The temporal *lane*
 * already RRF-ranks every in-window memory; applying a multiplicative
 * lift on top of that double-counts the signal — a temporal-reasoning
 * sweep at α=0.3, halfLife=7d regressed the category by 3pp because
 * in-window memories were getting boosted in the cosine head AND ranked
 * by the temporal lane, drowning out cross-window evidence the question
 * actually needed. Restricting the boost to *out-of-window* memories
 * (those the lane drops entirely) lets it act as a softer floor without
 * fighting the lane's signal.
 *
 * For out-of-window memories, returns `1 + alpha × 0.5^(distance/halfLife)`,
 * decaying exponentially toward 1.0 as distance grows. Defaults softened
 * (α=0.15, halfLife=30d) after the v1 sweep showed the original was too
 * aggressive.
 *
 * Mirrors Hindsight's post-fusion temporal-proximity multiplier (cf.
 * benchmarks docs §"Recency, temporal proximity, proof count").
 */
export function temporalProximityMultiplier(
  memoryStart: number | null,
  memoryEnd: number | null,
  memoryKind: string | null,
  window: TemporalWindow | null,
  options?: TemporalProximityOptions
): number {
  if (window === null || memoryStart === null) return 1.0;
  const halfLife = options?.halfLifeMs ?? 30 * DAY_MS;
  const alpha = options?.alpha ?? 0.15;

  let distance: number;
  if (memoryKind === "range" && memoryEnd !== null) {
    if (memoryStart < window.end && memoryEnd > window.start) {
      return 1.0; // in-window: lane handles it, no double-count.
    }
    distance = memoryEnd <= window.start ? window.start - memoryEnd : memoryStart - window.end;
  } else if (memoryKind === "ongoing") {
    if (memoryStart < window.end) return 1.0;
    distance = memoryStart - window.end;
  } else {
    if (memoryStart >= window.start && memoryStart < window.end) {
      return 1.0;
    }
    distance =
      memoryStart < window.start ? window.start - memoryStart : memoryStart - window.end + 1;
  }

  const proximity = Math.pow(0.5, distance / halfLife);
  return 1 + alpha * proximity;
}
