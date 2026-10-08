import { describe, expect, it } from "vitest";

import { parseQueryTimeWindow, scoreEventTimeOverlap } from "./queryTemporal.js";

const NOW = new Date(2026, 4, 4, 12, 0, 0).getTime();

const THU = new Date(2026, 4, 7, 12, 0, 0).getTime();
const JAN31 = new Date(2026, 0, 31, 12, 0, 0).getTime();
const JAN15 = new Date(2026, 0, 15, 12, 0, 0).getTime();
const DEC15 = new Date(2026, 11, 15, 12, 0, 0).getTime();

const day = (y: number, m: number, d: number): number => new Date(y, m, d).getTime();

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
    expect(parseQueryTimeWindow("in 999999999 days", NOW)).toBeNull();
    expect(parseQueryTimeWindow("999999999 months ago", NOW)).toBeNull();
  });

  it("returns null for an absurdly long digit run (parseInt → Infinity)", () => {
    expect(parseQueryTimeWindow(`in ${"9".repeat(400)} weeks`, NOW)).toBeNull();
  });

  it("returns null for a non-finite `now` on EVERY branch (not just offsets)", () => {
    expect(parseQueryTimeWindow("today", NaN)).toBeNull();
    expect(parseQueryTimeWindow("this week", NaN)).toBeNull();
    expect(parseQueryTimeWindow("last month", NaN)).toBeNull();
    expect(parseQueryTimeWindow("next monday", NaN)).toBeNull();
    expect(parseQueryTimeWindow("2026-05-23", NaN)).toBeNull();
  });

  describe("relative-day branch", () => {
    it("resolves today/yesterday/tomorrow to single-day [midnight, next-midnight) windows", () => {
      expectWindow("today", NOW, day(2026, 4, 4), day(2026, 4, 5), "today");
      expectWindow("yesterday", NOW, day(2026, 4, 3), day(2026, 4, 4), "yesterday");
      expectWindow("tomorrow", NOW, day(2026, 4, 5), day(2026, 4, 6), "tomorrow");
    });

    it("lowercases the query first, so a shouty phrase still matches", () => {
      expectWindow("What did I do YESTERDAY?", NOW, day(2026, 4, 3), day(2026, 4, 4), "yesterday");
    });
  });

  describe("relative-week branch", () => {
    it("anchors this/last/next week to the Monday-start week regardless of the day within it", () => {
      expectWindow("this week", NOW, day(2026, 4, 4), day(2026, 4, 11), "this week");
      expectWindow("this week", THU, day(2026, 4, 4), day(2026, 4, 11), "this week");
      expectWindow("last week", THU, day(2026, 3, 27), day(2026, 4, 4), "last week");
      expectWindow("next week", THU, day(2026, 4, 11), day(2026, 4, 18), "next week");
    });
  });

  describe("relative-month branch", () => {
    it("resolves this/last/next month, crossing the year boundary in both directions", () => {
      expectWindow("this month", NOW, day(2026, 4, 1), day(2026, 5, 1), "this month");
      expectWindow("last month", JAN15, day(2025, 11, 1), day(2026, 0, 1), "last month");
      expectWindow("next month", DEC15, day(2027, 0, 1), day(2027, 1, 1), "next month");
    });
  });

  describe("numeric-offset branch", () => {
    it("treats a day offset as a single day window ending at the next midnight", () => {
      expectWindow("in 3 days", NOW, day(2026, 4, 7), day(2026, 4, 8), "in 3 days");
      expectWindow("3 days ago", NOW, day(2026, 4, 1), day(2026, 4, 2), "3 days ago");
    });

    it("treats a week offset as a 7-day window and resolves both future phrasings identically", () => {
      expectWindow("in 2 weeks", NOW, day(2026, 4, 18), day(2026, 4, 25), "in 2 weeks");
      expectWindow("2 weeks from now", NOW, day(2026, 4, 18), day(2026, 4, 25), "2 weeks from now");
    });

    it("treats a month offset as a one-calendar-month window and clamps at end-of-month", () => {
      expectWindow("in 1 month", NOW, day(2026, 5, 4), day(2026, 6, 4), "in 1 month");
      expectWindow("1 month ago", NOW, day(2026, 3, 4), day(2026, 4, 4), "1 month ago");
      expectWindow("in 1 month", JAN31, day(2026, 1, 28), day(2026, 2, 28), "in 1 month");
    });
  });

  describe("day-of-week branch (NOW is Monday 2026-05-04)", () => {
    it("resolves a bare weekday to the closest upcoming day, and today when it is today", () => {
      expectWindow("friday", NOW, day(2026, 4, 8), day(2026, 4, 9), "friday");
      expectWindow("monday", NOW, day(2026, 4, 4), day(2026, 4, 5), "monday");
    });

    it("handles the 'next' modifier: adds a week only when the day would otherwise be today or past", () => {
      expectWindow("next monday", NOW, day(2026, 4, 11), day(2026, 4, 12), "next monday");
      expectWindow("next friday", NOW, day(2026, 4, 8), day(2026, 4, 9), "next friday");
    });

    it("handles the 'last' modifier: subtracts a week (and a full week when the day is today)", () => {
      expectWindow("last friday", NOW, day(2026, 4, 1), day(2026, 4, 2), "last friday");
      expectWindow("last monday", NOW, day(2026, 3, 27), day(2026, 3, 28), "last monday");
    });
  });

  describe("absolute-date branch", () => {
    it("parses an ISO date to its single-day window", () => {
      expectWindow("2026-05-23", NOW, day(2026, 4, 23), day(2026, 4, 24), "2026-05-23");
    });

    it("rejects an out-of-range ISO date via round-trip validation instead of rolling over", () => {
      expect(parseQueryTimeWindow("2026-02-30", NOW)).toBeNull();
      expect(parseQueryTimeWindow("2026-13-05", NOW)).toBeNull();
    });

    it("parses a 'month day' phrase, defaulting the year to now's and accepting an explicit year", () => {
      expectWindow("may 23", NOW, day(2026, 4, 23), day(2026, 4, 24), "may 23");
      expectWindow("may 23, 2027", NOW, day(2027, 4, 23), day(2027, 4, 24), "may 23, 2027");
      expectWindow("may 23 2027", NOW, day(2027, 4, 23), day(2027, 4, 24), "may 23 2027");
    });

    it("rejects an out-of-range 'month day' via round-trip validation", () => {
      expect(parseQueryTimeWindow("february 30", NOW)).toBeNull();
      expect(parseQueryTimeWindow("june 31", NOW)).toBeNull();
    });
  });

  describe("month-only branch", () => {
    it("resolves a bare month to the whole calendar month, defaulting the year", () => {
      expectWindow("in may", NOW, day(2026, 4, 1), day(2026, 5, 1), "in may");
      expectWindow("in december 2027", NOW, day(2027, 11, 1), day(2028, 0, 1), "in december 2027");
    });

    it("routes 'in <month> <4-digit-year>' through the month-only branch, not month-day", () => {
      expectWindow("remind me in may 2027", NOW, day(2027, 4, 1), day(2027, 5, 1), "in may 2027");
    });
  });

  describe("branch precedence (order is load-bearing)", () => {
    it("prefers the relative-day match over a later week phrase", () => {
      expectWindow("yesterday and next week", NOW, day(2026, 4, 3), day(2026, 4, 4), "yesterday");
    });

    it("prefers the relative-month match over a day-of-week phrase", () => {
      expectWindow("last month on friday", NOW, day(2026, 3, 1), day(2026, 4, 1), "last month");
    });

    it("prefers the day-of-week match over an absolute date phrase", () => {
      expectWindow("friday may 23", NOW, day(2026, 4, 8), day(2026, 4, 9), "friday");
    });
  });

  describe("window invariant sweep (no NaN bound on any branch)", () => {
    it("returns a finite, non-empty [start, end) window for a phrase from every branch", () => {
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

  describe("non-matches", () => {
    it("returns null for near-miss phrases the grammar deliberately excludes", () => {
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
      expect(scoreEventTimeOverlap(100, null, "point", win(100, 200))).toBe(1);
      expect(scoreEventTimeOverlap(200, null, "point", win(100, 200))).toBe(0);
    });

    it("treats a null or unrecognized kind as a point", () => {
      expect(scoreEventTimeOverlap(150, null, null, win(100, 200))).toBe(1);
      expect(scoreEventTimeOverlap(150, null, "unknown-junk", win(100, 200))).toBe(1);
    });
  });

  describe("ongoing memories", () => {
    it("treats a null end as open-ended (still ongoing), scoring 1 as long as it started before the window ends", () => {
      expect(scoreEventTimeOverlap(50, null, "ongoing", win(1000, 2000))).toBe(1);
    });

    it("scores 0 when the ongoing end predates the window, and 1 when it lands exactly on window.start", () => {
      expect(scoreEventTimeOverlap(50, 90, "ongoing", win(100, 200))).toBe(0);
      expect(scoreEventTimeOverlap(50, 100, "ongoing", win(100, 200))).toBe(1);
    });
  });

  describe("range memories", () => {
    it("scores the overlap fraction: 1 fully inside, 0.5 half inside, 0 disjoint", () => {
      expect(scoreEventTimeOverlap(120, 180, "range", win(100, 200))).toBe(1);
      expect(scoreEventTimeOverlap(100, 300, "range", win(100, 200))).toBe(0.5);
      expect(scoreEventTimeOverlap(300, 400, "range", win(100, 200))).toBe(0);
    });

    it("scores a range with a null end as zero-width even inside the window", () => {
      expect(scoreEventTimeOverlap(150, null, "range", win(100, 200))).toBe(0);
      expect(scoreEventTimeOverlap(150, null, "point", win(100, 200))).toBe(1);
    });
  });
});
