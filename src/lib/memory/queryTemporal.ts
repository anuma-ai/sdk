interface TemporalWindow {
  start: number;
  end: number;
  matchedPhrase: string;
}

const RELATIVE_DAY_ENTRIES: ReadonlyArray<[RegExp, string, number]> = [
  [/\btoday\b/, "today", 0],
  [/\byesterday\b/, "yesterday", -1],
  [/\btomorrow\b/, "tomorrow", 1],
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

function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  const targetYear = d.getFullYear();
  const targetMonth = d.getMonth() + months;
  const currentDay = d.getDate();
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(currentDay, lastDayOfTargetMonth);
  return new Date(targetYear, targetMonth, clampedDay).getTime();
}

function startOfWeek(ts: number): number {
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

function endOfDay(dayStart: number): number {
  return addDays(dayStart, 1);
}

function parseLocalCalendarDay(year: number, month: number, day: number): number | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function shiftByUnit(base: number, n: number, unit: string): number {
  if (unit.startsWith("day")) return addDays(base, n);
  if (unit.startsWith("week")) return addDays(base, n * 7);
  return addMonths(base, n);
}

function finiteWindow(start: number, end: number, matchedPhrase: string): TemporalWindow | null {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start, end, matchedPhrase };
}

function endOfOffsetWindow(start: number, unit: string): number {
  if (unit.startsWith("week")) return addDays(start, 7);
  if (unit.startsWith("month")) return addMonths(start, 1);
  return endOfDay(start);
}

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
  if (!Number.isFinite(now)) return null;
  const q = query.toLowerCase();

  for (const [pattern, phrase, offset] of RELATIVE_DAY_ENTRIES) {
    if (pattern.test(q)) {
      const day = addDays(startOfDay(now), offset);
      return { start: day, end: endOfDay(day), matchedPhrase: phrase };
    }
  }

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

  const futureMatch = FUTURE_OFFSET_RE.exec(q);
  if (futureMatch) {
    const n = parseInt(futureMatch[1] ?? futureMatch[3], 10);
    const unit = futureMatch[2] ?? futureMatch[4];
    const start = shiftByUnit(startOfDay(now), n, unit);
    return finiteWindow(start, endOfOffsetWindow(start, unit), futureMatch[0]);
  }
  const agoMatch = PAST_OFFSET_RE.exec(q);
  if (agoMatch) {
    const n = parseInt(agoMatch[1], 10);
    const unit = agoMatch[2];
    const start = shiftByUnit(startOfDay(now), -n, unit);
    return finiteWindow(start, endOfOffsetWindow(start, unit), agoMatch[0]);
  }

  const dowMatch = DOW_RE.exec(q);
  if (dowMatch) {
    const modifier = dowMatch[1] ?? "this";
    const targetDow = DOW_NAMES.indexOf(dowMatch[2]);
    const todayStart = startOfDay(now);
    const todayDow = new Date(todayStart).getDay();
    let delta = targetDow - todayDow;
    if (modifier === "next") delta = delta <= 0 ? delta + 7 : delta;
    else if (modifier === "last") delta = delta >= 0 ? delta - 7 : delta;
    else if (delta < 0) delta += 7;
    const day = addDays(todayStart, delta);
    return { start: day, end: endOfDay(day), matchedPhrase: dowMatch[0] };
  }

  const isoMatch = ISO_DATE_RE.exec(q);
  if (isoMatch) {
    const start = parseLocalCalendarDay(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10),
      parseInt(isoMatch[3], 10)
    );
    if (start !== null) {
      return { start, end: endOfDay(start), matchedPhrase: isoMatch[0] };
    }
  }
  const monthDayMatch = MONTH_DAY_RE.exec(q);
  if (monthDayMatch) {
    const monthIdx = MONTH_NAMES.indexOf(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2], 10);
    const yearStr = monthDayMatch[3];
    const year = yearStr ? parseInt(yearStr, 10) : new Date(now).getFullYear();
    const start = parseLocalCalendarDay(year, monthIdx + 1, day);
    if (start !== null) {
      return { start, end: endOfDay(start), matchedPhrase: monthDayMatch[0] };
    }
  }

  const monthOnlyMatch = MONTH_ONLY_RE.exec(q);
  if (monthOnlyMatch) {
    const monthIdx = MONTH_NAMES.indexOf(monthOnlyMatch[1]);
    const yearStr = monthOnlyMatch[2];
    const year = yearStr ? parseInt(yearStr, 10) : new Date(now).getFullYear();
    const start = new Date(year, monthIdx, 1).getTime();
    const end = new Date(year, monthIdx + 1, 1).getTime();
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return { start, end, matchedPhrase: monthOnlyMatch[0] };
    }
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

  if (memoryKind === "point" || (memoryKind !== "range" && memoryKind !== "ongoing")) {
    return memoryStart >= window.start && memoryStart < window.end ? 1 : 0;
  }

  if (memoryKind === "ongoing") {
    const ongoingEnd = memoryEnd ?? Number.POSITIVE_INFINITY;
    return memoryStart < window.end && ongoingEnd >= window.start ? 1 : 0;
  }

  const end = memoryEnd ?? memoryStart;
  const overlapStart = Math.max(memoryStart, window.start);
  const overlapEnd = Math.min(end, window.end);
  if (overlapEnd <= overlapStart) return 0;
  const overlap = overlapEnd - overlapStart;
  const memorySpan = Math.max(1, end - memoryStart);
  return overlap / memorySpan;
}
