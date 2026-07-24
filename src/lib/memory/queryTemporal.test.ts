import { describe, expect, it } from "vitest";

import { parseQueryTimeWindow, scoreEventTimeOverlap } from "./queryTemporal.js";

// Fixed reference "now" so windows are deterministic: 2026-05-04 (local).
const NOW = new Date(2026, 4, 4, 12, 0, 0).getTime();

// Additional local-midnight anchors for the branch-coverage suite. Each is
// built with the same `new Date(y, m, d, ...)` constructor the source uses, so
// the fixtures and the code agree on "local midnight" regardless of the CI
// timezone. 2026-05-04 is a Monday (verified: getDay() === 1), which makes the
// week-start and delta=0 day-of-week edges deterministic; THU is the Thursday
// of that same week for the non-degenerate week / DOW cases. JAN31 exercises
// the addMonths end-of-month clamp; JAN15 / DEC15 push month windows across the
// year boundary in both directions.
const THU = new Date(2026, 4, 7, 12, 0, 0).getTime();
const JAN31 = new Date(2026, 0, 31, 12, 0, 0).getTime();
const JAN15 = new Date(2026, 0, 15, 12, 0, 0).getTime();
const DEC15 = new Date(2026, 11, 15, 12, 0, 0).getTime();

// Expected bounds are always computed through the SAME local Date constructor
// the source builds windows with — never a hardcoded epoch-ms literal — so the
// assertions are timezone-agnostic (a hardcoded ms value would drift between a
// UTC CI runner and a local machine).
const day = (y: number, m: number, d: number): number => new Date(y, m, d).getTime();

/**
 * Assert a query resolves to exactly [start, end) with the given matched
 * phrase. Keeps the ~30 window cases below terse without hiding the three
 * facts that matter per case (start bound, exclusive end bound, which phrase
 * the parser reported).
 */
function expectWindow(
  query: string,
  now: number,
  start: number,
  end: number,
  phrase: string
): void {
  const w = parseQueryTimeWindow(query, now);
  expect(w).not.toBeNull();
  expect(w!.start).toBe(start);
  expect(w!.end).toBe(end);
  expect(w!.matchedPhrase).toBe(phrase);
}

/** Build a TemporalWindow literal for the score tests. TemporalWindow is not
 * exported, but it is structural, so an inline object matches it. matchedPhrase
 * is irrelevant to scoring — it exists only for diagnostics — so a constant
 * placeholder keeps the score cases focused on the numeric bounds. */
const win = (start: number, end: number) => ({ start, end, matchedPhrase: "t" });

describe("parseQueryTimeWindow", () => {
  it("returns null for an empty or non-temporal query", () => {
    expect(parseQueryTimeWindow("", NOW)).toBeNull();
    expect(parseQueryTimeWindow("what is my dog's name", NOW)).toBeNull();
  });

  it("resolves a small future offset to a finite window", () => {
    const w = parseQueryTimeWindow("in 3 days", NOW);
    expect(w).not.toBeNull();
    expect(Number.isFinite(w!.start)).toBe(true);
    expect(Number.isFinite(w!.end)).toBe(true);
    expect(w!.end).toBeGreaterThan(w!.start);
    expect(w!.matchedPhrase).toBe("in 3 days");
  });

  it("resolves a small past offset to a finite window", () => {
    const w = parseQueryTimeWindow("2 weeks ago", NOW);
    expect(w).not.toBeNull();
    expect(Number.isFinite(w!.start)).toBe(true);
    expect(w!.start).toBeLessThan(NOW);
  });

  it("returns null for an offset that overflows the JS Date range", () => {
    // 999999999 days ≈ 8.6e16 ms, past the ±8.64e15 ms Date limit → NaN window.
    // The guard must return null (no temporal lane) rather than a NaN window
    // that silently scores every memory 0.
    expect(parseQueryTimeWindow("in 999999999 days", NOW)).toBeNull();
    expect(parseQueryTimeWindow("999999999 months ago", NOW)).toBeNull();
  });

  it("returns null for an absurdly long digit run (parseInt → Infinity)", () => {
    expect(parseQueryTimeWindow(`in ${"9".repeat(400)} weeks`, NOW)).toBeNull();
  });

  it("returns null for a non-finite `now` on EVERY branch (not just offsets)", () => {
    // A NaN clock would otherwise build NaN bounds in the relative-day / week /
    // month / day-of-week / absolute-date branches too.
    expect(parseQueryTimeWindow("today", NaN)).toBeNull();
    expect(parseQueryTimeWindow("this week", NaN)).toBeNull();
    expect(parseQueryTimeWindow("last month", NaN)).toBeNull();
    expect(parseQueryTimeWindow("next monday", NaN)).toBeNull();
    expect(parseQueryTimeWindow("2026-05-23", NaN)).toBeNull();
  });

  // ── Branch 1: relative day ────────────────────────────────────────────
  describe("relative-day branch", () => {
    it("resolves today/yesterday/tomorrow to single-day [midnight, next-midnight) windows", () => {
      expectWindow("today", NOW, day(2026, 4, 4), day(2026, 4, 5), "today");
      expectWindow("yesterday", NOW, day(2026, 4, 3), day(2026, 4, 4), "yesterday");
      expectWindow("tomorrow", NOW, day(2026, 4, 5), day(2026, 4, 6), "tomorrow");
    });

    it("lowercases the query first, so a shouty phrase still matches", () => {
      // The parser calls query.toLowerCase() before any test, so casing and
      // surrounding words never defeat the match. matchedPhrase is the
      // already-lowercased token, not the original casing.
      expectWindow("What did I do YESTERDAY?", NOW, day(2026, 4, 3), day(2026, 4, 4), "yesterday");
    });
  });

  // ── Branch 2: relative week (Monday-start convention) ─────────────────
  describe("relative-week branch", () => {
    it("anchors this/last/next week to the Monday-start week regardless of the day within it", () => {
      // NOW is a Monday and THU is the Thursday of the same week; "this week"
      // must resolve to the identical [Mon, next Mon) window from either, which
      // is what pins the Monday-start convention (a Sunday-start impl would
      // give a different window from THU).
      expectWindow("this week", NOW, day(2026, 4, 4), day(2026, 4, 11), "this week");
      expectWindow("this week", THU, day(2026, 4, 4), day(2026, 4, 11), "this week");
      expectWindow("last week", THU, day(2026, 3, 27), day(2026, 4, 4), "last week");
      expectWindow("next week", THU, day(2026, 4, 11), day(2026, 4, 18), "next week");
    });
  });

  // ── Branch 3: relative month (with year-boundary crossings) ───────────
  describe("relative-month branch", () => {
    it("resolves this/last/next month, crossing the year boundary in both directions", () => {
      expectWindow("this month", NOW, day(2026, 4, 1), day(2026, 5, 1), "this month");
      // last month from mid-January rolls back into the previous year.
      expectWindow("last month", JAN15, day(2025, 11, 1), day(2026, 0, 1), "last month");
      // next month from mid-December rolls forward into the next year.
      expectWindow("next month", DEC15, day(2027, 0, 1), day(2027, 1, 1), "next month");
    });
  });

  // ── Branch 4: numeric offset ("in N units", "N units from now/ago") ───
  describe("numeric-offset branch", () => {
    it("treats a day offset as a single day window ending at the next midnight", () => {
      // The day-unit end is next-day midnight, NOT start + offset span — the
      // window is the target day itself, not the whole span up to it.
      expectWindow("in 3 days", NOW, day(2026, 4, 7), day(2026, 4, 8), "in 3 days");
      expectWindow("3 days ago", NOW, day(2026, 4, 1), day(2026, 4, 2), "3 days ago");
    });

    it("treats a week offset as a 7-day window and resolves both future phrasings identically", () => {
      // "in 2 weeks" and "2 weeks from now" hit the two different capture-group
      // arms of FUTURE_OFFSET_RE (futureMatch[1]/[2] vs futureMatch[3]/[4]);
      // both must land on the same [start, start+7d) window.
      expectWindow("in 2 weeks", NOW, day(2026, 4, 18), day(2026, 4, 25), "in 2 weeks");
      expectWindow("2 weeks from now", NOW, day(2026, 4, 18), day(2026, 4, 25), "2 weeks from now");
    });

    it("treats a month offset as a one-calendar-month window and clamps at end-of-month", () => {
      expectWindow("in 1 month", NOW, day(2026, 5, 4), day(2026, 6, 4), "in 1 month");
      expectWindow("1 month ago", NOW, day(2026, 3, 4), day(2026, 4, 4), "1 month ago");
      // From Jan 31, addMonths clamps to Feb 28 (2026 is not a leap year), and
      // the +1-month end clamps to Mar 28 — proving the clamp is applied on
      // both bounds, not just the start.
      expectWindow("in 1 month", JAN31, day(2026, 1, 28), day(2026, 2, 28), "in 1 month");
    });
  });

  // ── Branch 5: day-of-week with optional next/last/this ────────────────
  describe("day-of-week branch (NOW is Monday 2026-05-04)", () => {
    it("resolves a bare weekday to the closest upcoming day, and today when it is today", () => {
      // A bare future weekday resolves within this week; a bare weekday that IS
      // today (delta 0) resolves to today, not to next week.
      expectWindow("friday", NOW, day(2026, 4, 8), day(2026, 4, 9), "friday");
      expectWindow("monday", NOW, day(2026, 4, 4), day(2026, 4, 5), "monday");
    });

    it("handles the 'next' modifier: adds a week only when the day would otherwise be today or past", () => {
      // "next monday" (delta 0) jumps a full week; but "next friday" (delta > 0)
      // does NOT add a week — it lands on this coming Friday, identical to bare
      // "friday". This is arguably surprising but is the intended semantics, so
      // it is pinned deliberately: "next <weekday>" only advances a week when
      // the naive delta is <= 0.
      expectWindow("next monday", NOW, day(2026, 4, 11), day(2026, 4, 12), "next monday");
      expectWindow("next friday", NOW, day(2026, 4, 8), day(2026, 4, 9), "next friday");
    });

    it("handles the 'last' modifier: subtracts a week (and a full week when the day is today)", () => {
      expectWindow("last friday", NOW, day(2026, 4, 1), day(2026, 4, 2), "last friday");
      expectWindow("last monday", NOW, day(2026, 3, 27), day(2026, 3, 28), "last monday");
    });
  });

  // ── Branch 6: absolute dates ──────────────────────────────────────────
  describe("absolute-date branch", () => {
    it("parses an ISO date to its single-day window", () => {
      expectWindow("2026-05-23", NOW, day(2026, 4, 23), day(2026, 4, 24), "2026-05-23");
    });

    it("rejects an out-of-range ISO date via round-trip validation instead of rolling over", () => {
      // parseLocalCalendarDay round-trips the components: 2026-02-30 would roll
      // to March, and month 13 is out of range — both must return null rather
      // than silently landing on the wrong day.
      expect(parseQueryTimeWindow("2026-02-30", NOW)).toBeNull();
      expect(parseQueryTimeWindow("2026-13-05", NOW)).toBeNull();
    });

    it("parses a 'month day' phrase, defaulting the year to now's and accepting an explicit year", () => {
      expectWindow("may 23", NOW, day(2026, 4, 23), day(2026, 4, 24), "may 23");
      // Comma-separated and bare-year forms both capture the explicit 2027.
      expectWindow("may 23, 2027", NOW, day(2027, 4, 23), day(2027, 4, 24), "may 23, 2027");
      expectWindow("may 23 2027", NOW, day(2027, 4, 23), day(2027, 4, 24), "may 23 2027");
    });

    it("rejects an out-of-range 'month day' via round-trip validation", () => {
      // "february 30" must NOT silently roll to March, and "june 31" must not
      // roll to July — the round-trip guard rejects both.
      expect(parseQueryTimeWindow("february 30", NOW)).toBeNull();
      expect(parseQueryTimeWindow("june 31", NOW)).toBeNull();
    });
  });

  // ── Branch 7: month-only ("in <month>", "in <month> <year>") ──────────
  describe("month-only branch", () => {
    it("resolves a bare month to the whole calendar month, defaulting the year", () => {
      expectWindow("in may", NOW, day(2026, 4, 1), day(2026, 5, 1), "in may");
      expectWindow("in december 2027", NOW, day(2027, 11, 1), day(2028, 0, 1), "in december 2027");
    });

    it("routes 'in <month> <4-digit-year>' through the month-only branch, not month-day", () => {
      // MONTH_DAY_RE cannot split a 4-digit year into a 1-2 digit day (the \b
      // fails inside the digit run), so "in may 2027" falls through to
      // MONTH_ONLY and yields the full month of the explicit year.
      expectWindow("remind me in may 2027", NOW, day(2027, 4, 1), day(2027, 5, 1), "in may 2027");
    });
  });

  // ── Precedence: earlier branches win over later ones ──────────────────
  describe("branch precedence (order is load-bearing)", () => {
    it("prefers the relative-day match over a later week phrase", () => {
      // "yesterday" (branch 1) wins over "next week" (branch 2).
      expectWindow("yesterday and next week", NOW, day(2026, 4, 3), day(2026, 4, 4), "yesterday");
    });

    it("prefers the relative-month match over a day-of-week phrase", () => {
      // "last month" (branch 3) wins over "friday" (branch 5).
      expectWindow("last month on friday", NOW, day(2026, 3, 1), day(2026, 4, 1), "last month");
    });

    it("prefers the day-of-week match over an absolute date phrase", () => {
      // "friday" (branch 5) wins over "may 23" (branch 6). If the branch order
      // were ever reversed, this window would flip to May 23 — the ordering is
      // load-bearing, so this case guards it.
      expectWindow("friday may 23", NOW, day(2026, 4, 8), day(2026, 4, 9), "friday");
    });
  });

  // ── The regression net the issue asked for: no NaN windows, ever ──────
  describe("window invariant sweep (no NaN bound on any branch)", () => {
    it("returns a finite, non-empty [start, end) window for a phrase from every branch", () => {
      // One phrase per branch. The property under test is exactly the bug #630
      // was filed against: no resolved window may carry a NaN bound, and end
      // must strictly follow start, or the temporal lane silently scores every
      // memory 0.
      const phrases = [
        "today",
        "this week",
        "last month",
        "in 3 days",
        "2 weeks ago",
        "next friday",
        "2026-05-23",
        "may 23",
        "in may",
      ];
      for (const phrase of phrases) {
        const w = parseQueryTimeWindow(phrase, NOW);
        expect(w, `expected a window for "${phrase}"`).not.toBeNull();
        expect(Number.isFinite(w!.start), `start finite for "${phrase}"`).toBe(true);
        expect(Number.isFinite(w!.end), `end finite for "${phrase}"`).toBe(true);
        expect(w!.end, `end > start for "${phrase}"`).toBeGreaterThan(w!.start);
      }
    });
  });

  // ── Non-temporal phrasings that must NOT be mistaken for temporal ─────
  describe("non-matches", () => {
    it("returns null for near-miss phrases the grammar deliberately excludes", () => {
      // "mayonnaise" embeds a month name but is not word-bounded as one;
      // "this weekend" is not "this week" (the \b after week fails);
      // "soonish" is vague and out of scope.
      expect(parseQueryTimeWindow("mayonnaise", NOW)).toBeNull();
      expect(parseQueryTimeWindow("this weekend", NOW)).toBeNull();
      expect(parseQueryTimeWindow("soonish", NOW)).toBeNull();
    });
  });
});

describe("scoreEventTimeOverlap", () => {
  describe("point memories", () => {
    it("scores 0 when the memory has no start timestamp", () => {
      expect(scoreEventTimeOverlap(null, null, "point", win(100, 200))).toBe(0);
    });

    it("scores 1 at the inclusive start and 0 at the exclusive end", () => {
      // The window is [start, end): a point exactly at start is inside (1), a
      // point exactly at end is outside (0). Pins the half-open convention.
      expect(scoreEventTimeOverlap(100, null, "point", win(100, 200))).toBe(1);
      expect(scoreEventTimeOverlap(200, null, "point", win(100, 200))).toBe(0);
    });

    it("treats a null or unrecognized kind as a point", () => {
      // The first branch catches "point" OR anything that is neither "range"
      // nor "ongoing", so a null kind and a junk kind both score as points.
      expect(scoreEventTimeOverlap(150, null, null, win(100, 200))).toBe(1);
      expect(scoreEventTimeOverlap(150, null, "unknown-junk", win(100, 200))).toBe(1);
    });
  });

  describe("ongoing memories", () => {
    it("treats a null end as open-ended (still ongoing), scoring 1 as long as it started before the window ends", () => {
      // memoryEnd null → +Infinity end, so an event that began long before a
      // far-future window still overlaps it.
      expect(scoreEventTimeOverlap(50, null, "ongoing", win(1000, 2000))).toBe(1);
    });

    it("scores 0 when the ongoing end predates the window, and 1 when it lands exactly on window.start", () => {
      // The admission predicate is `end >= window.start` (mirrors
      // getMemoriesByEventTimeOp), so an end exactly at window.start is admitted.
      expect(scoreEventTimeOverlap(50, 90, "ongoing", win(100, 200))).toBe(0);
      expect(scoreEventTimeOverlap(50, 100, "ongoing", win(100, 200))).toBe(1);
    });
  });

  describe("range memories", () => {
    it("scores the overlap fraction: 1 fully inside, 0.5 half inside, 0 disjoint", () => {
      // Fully inside: overlap equals the memory's own span → 1.
      expect(scoreEventTimeOverlap(120, 180, "range", win(100, 200))).toBe(1);
      // A 200-wide range half inside a 100-wide window overlaps 100 of its 200
      // span → 0.5. Round-number fixtures make the fraction exact.
      expect(scoreEventTimeOverlap(100, 300, "range", win(100, 200))).toBe(0.5);
      // Disjoint → overlapEnd <= overlapStart → 0.
      expect(scoreEventTimeOverlap(300, 400, "range", win(100, 200))).toBe(0);
    });

    it("scores a range with a null end as zero-width even inside the window", () => {
      // NOTE(#630): a "range" memory with a NULL end coerces end := start, so a
      // start that lies INSIDE the window still yields a zero-width overlap
      // (overlapEnd <= overlapStart) and scores 0 — while the IDENTICAL
      // timestamp as a "point" scores 1. Correct behavior would treat an
      // end-less range as a point (score 1). Pinned here as CURRENT behavior;
      // reported as a bug candidate, not fixed in this test-only PR.
      expect(scoreEventTimeOverlap(150, null, "range", win(100, 200))).toBe(0);
      expect(scoreEventTimeOverlap(150, null, "point", win(100, 200))).toBe(1);
    });
  });
});
