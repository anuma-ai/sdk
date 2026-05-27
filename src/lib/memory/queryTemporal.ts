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
 * Timezone basis: windows are constructed via the local `Date(y,m,d)`
 * constructor (local midnight). The write side (auto-extracted
 * eventTime) shares the same basis so the day after "May 23" doesn't
 * land before May 23's window for non-UTC users.
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

interface TemporalWindow {
  /** Inclusive start of the window in Unix ms. */
  start: number;
  /** Exclusive end of the window in Unix ms. */
  end: number;
  /** Which phrase matched (diagnostic / explainability). */
  matchedPhrase: string;
}

const RELATIVE_DAY_ENTRIES: ReadonlyArray<[string, number]> = [
  ["today", 0],
  ["yesterday", -1],
  ["tomorrow", 1],
];

const DOW_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

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

/** DST-safe: a fixed 86.4M-ms delta misaligns the local calendar day across
 * spring-forward / fall-back; `Date(y,m,d)` normalizes to local midnight. */
function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate()).getTime();
}

function startOfWeek(ts: number): number {
  // Monday-start week (matches consumer-app convention; Sunday-start is
  // also defensible — pick one and stay consistent for the demo). Shift
  // so that Monday is day 0.
  const d = new Date(startOfDay(ts));
  const offset = (d.getDay() + 6) % 7;
  return addDays(d.getTime(), -offset);
}

function startOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function startOfNextMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

/** End-of-day for a calendar day (start of the *following* calendar day,
 * exclusive). Uses the local-midnight basis so windows align with how
 * dates are stored on the write side (see `autoExtract`). */
function endOfDay(dayStart: number): number {
  return addDays(dayStart, 1);
}

/** Day/week/month delta against a local-midnight base. Day and week use
 * `addDays` so DST transitions stay aligned; month uses the local Date
 * constructor for the same reason. */
function shiftByUnit(base: number, n: number, unit: string): number {
  if (unit.startsWith("day")) return addDays(base, n);
  if (unit.startsWith("week")) return addDays(base, n * 7);
  return addMonths(base, n);
}

// Hoisted regexes — parseQueryTimeWindow is called on every recall, so
// the dynamically-built MONTH_NAMES alternation only needs to compile once.
const MONTH_DAY_RE = new RegExp(
  `\\b(${MONTH_NAMES.join("|")})\\s+(\\d{1,2})(?:\\s*,?\\s*(\\d{4}))?\\b`
);
const MONTH_ONLY_RE = new RegExp(`\\bin\\s+(${MONTH_NAMES.join("|")})(?:\\s+(\\d{4}))?\\b`);
const FUTURE_OFFSET_RE =
  /\b(?:in\s+(\d+)\s+(day|days|week|weeks|month|months)|(\d+)\s+(day|days|week|weeks|month|months)\s+from\s+now)\b/;
const PAST_OFFSET_RE = /\b(\d+)\s+(day|days|week|weeks|month|months)\s+ago\b/;
const DOW_RE = /\b(next|last|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/;
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;

/**
 * Resolve a query's temporal phrase to an absolute window. Returns null
 * when the query has no temporal phrasing — caller's temporal lane
 * silently no-ops and the fact + chunk + graph lanes carry the query.
 */
export function parseQueryTimeWindow(
  query: string,
  now: number = Date.now()
): TemporalWindow | null {
  if (!query) return null;
  const q = query.toLowerCase();

  // ── 1. Relative day ─────────────────────────────────────────────────
  for (const [phrase, offset] of RELATIVE_DAY_ENTRIES) {
    if (q.includes(phrase)) {
      const day = addDays(startOfDay(now), offset);
      return { start: day, end: endOfDay(day), matchedPhrase: phrase };
    }
  }

  // ── 2. Relative week ────────────────────────────────────────────────
  if (/\bthis week\b/.test(q)) {
    const start = startOfWeek(now);
    return { start, end: addDays(start, 7), matchedPhrase: "this week" };
  }
  if (/\blast week\b/.test(q)) {
    const start = addDays(startOfWeek(now), -7);
    return { start, end: addDays(start, 7), matchedPhrase: "last week" };
  }
  if (/\bnext week\b/.test(q)) {
    const start = addDays(startOfWeek(now), 7);
    return { start, end: addDays(start, 7), matchedPhrase: "next week" };
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

  // ── 4. Numeric offset: "in N units", "N units from now", "N units ago" ──
  const futureMatch = FUTURE_OFFSET_RE.exec(q);
  if (futureMatch) {
    const n = parseInt(futureMatch[1] ?? futureMatch[3], 10);
    const unit = futureMatch[2] ?? futureMatch[4];
    const start = shiftByUnit(startOfDay(now), n, unit);
    return { start, end: endOfDay(start), matchedPhrase: futureMatch[0] };
  }
  const agoMatch = PAST_OFFSET_RE.exec(q);
  if (agoMatch) {
    const n = parseInt(agoMatch[1], 10);
    const start = shiftByUnit(startOfDay(now), -n, agoMatch[2]);
    return { start, end: endOfDay(start), matchedPhrase: agoMatch[0] };
  }

  // ── 5. Day-of-week with optional "next" / "last" ────────────────────
  const dowMatch = DOW_RE.exec(q);
  if (dowMatch) {
    const modifier = dowMatch[1] ?? "this";
    const targetDow = DOW_NAMES.indexOf(dowMatch[2]);
    const todayStart = startOfDay(now);
    const todayDow = new Date(todayStart).getDay();
    let delta = targetDow - todayDow;
    if (modifier === "next") delta = delta <= 0 ? delta + 7 : delta;
    else if (modifier === "last") delta = delta >= 0 ? delta - 7 : delta;
    // "this <weekday>" reads as closest upcoming OR today, not the past.
    else if (delta < 0) delta += 7;
    const day = addDays(todayStart, delta);
    return { start: day, end: endOfDay(day), matchedPhrase: dowMatch[0] };
  }

  // ── 6. Absolute date — "May 23 2026" / "May 23" / "2026-05-23" ──────
  const isoMatch = ISO_DATE_RE.exec(q);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const start = new Date(year, month - 1, day).getTime();
    if (Number.isFinite(start)) {
      return { start, end: endOfDay(start), matchedPhrase: isoMatch[0] };
    }
  }
  const monthDayMatch = MONTH_DAY_RE.exec(q);
  if (monthDayMatch) {
    const monthIdx = MONTH_NAMES.indexOf(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2], 10);
    const yearStr = monthDayMatch[3];
    const year = yearStr ? parseInt(yearStr, 10) : new Date(now).getFullYear();
    const start = new Date(year, monthIdx, day).getTime();
    return { start, end: endOfDay(start), matchedPhrase: monthDayMatch[0] };
  }

  // ── 7. Month-only — "in May", "in May 2026" ─────────────────────────
  const monthOnlyMatch = MONTH_ONLY_RE.exec(q);
  if (monthOnlyMatch) {
    const monthIdx = MONTH_NAMES.indexOf(monthOnlyMatch[1]);
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
