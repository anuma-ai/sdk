import { describe, expect, it } from "vitest";
import {
  classifyObservationTrend,
  summarizeObservationTrends,
  TREND_RECENT_WINDOW_DAYS,
  TREND_STALE_WINDOW_DAYS,
} from "./observationTrend";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 22); // 2026-07-22

function daysAgo(n: number): number {
  return NOW - n * DAY;
}

describe("classifyObservationTrend", () => {
  it("labels a recently created low-proof fact as new", () => {
    expect(
      classifyObservationTrend({ createdAt: daysAgo(5), lastObservedAt: null, proofCount: 1 }, NOW)
    ).toBe("new");
    expect(
      classifyObservationTrend(
        { createdAt: daysAgo(20), lastObservedAt: daysAgo(1), proofCount: 2 },
        NOW
      )
    ).toBe("new");
  });

  it("labels a multiply-proven recently-observed fact as strengthening", () => {
    expect(
      classifyObservationTrend(
        { createdAt: daysAgo(60), lastObservedAt: daysAgo(2), proofCount: 5 },
        NOW
      )
    ).toBe("strengthening");
  });

  it("labels an old fact reconfirmed once recently as strengthening", () => {
    expect(
      classifyObservationTrend(
        { createdAt: daysAgo(120), lastObservedAt: daysAgo(3), proofCount: 2 },
        NOW
      )
    ).toBe("strengthening");
  });

  it("labels a quiet-but-not-stale fact as weakening", () => {
    expect(
      classifyObservationTrend(
        {
          createdAt: daysAgo(100),
          lastObservedAt: daysAgo(TREND_RECENT_WINDOW_DAYS + 5),
          proofCount: 4,
        },
        NOW
      )
    ).toBe("weakening");
  });

  it("treats the exact recent-window boundary as weakening", () => {
    expect(
      classifyObservationTrend(
        {
          createdAt: daysAgo(100),
          lastObservedAt: daysAgo(TREND_RECENT_WINDOW_DAYS),
          proofCount: 4,
        },
        NOW
      )
    ).toBe("weakening");
  });

  it("labels a long-quiet fact as stale", () => {
    expect(
      classifyObservationTrend(
        {
          createdAt: daysAgo(200),
          lastObservedAt: daysAgo(TREND_STALE_WINDOW_DAYS + 1),
          proofCount: 3,
        },
        NOW
      )
    ).toBe("stale");
  });

  it("treats the exact stale-window boundary as stale (not weakening)", () => {
    expect(
      classifyObservationTrend(
        {
          createdAt: daysAgo(200),
          lastObservedAt: daysAgo(TREND_STALE_WINDOW_DAYS),
          proofCount: 3,
        },
        NOW
      )
    ).toBe("stale");
  });

  it("falls back to createdAt when lastObservedAt is null", () => {
    // Never re-observed; created 40d ago → weakening (past recent window).
    expect(
      classifyObservationTrend({ createdAt: daysAgo(40), lastObservedAt: null, proofCount: 1 }, NOW)
    ).toBe("weakening");
  });

  it("treats missing proofCount as 1", () => {
    expect(classifyObservationTrend({ createdAt: daysAgo(3), lastObservedAt: null }, NOW)).toBe(
      "new"
    );
  });

  it("returns stable for a known, recently-seen, lightly-proven fact", () => {
    // Age > 30d, proofs=1, last seen recently — not new, not strengthening.
    expect(
      classifyObservationTrend(
        { createdAt: daysAgo(60), lastObservedAt: daysAgo(5), proofCount: 1 },
        NOW
      )
    ).toBe("stable");
  });

  it("clamps lastObservedAt earlier than createdAt up to createdAt", () => {
    // Corrupt watermark before create → treat as createdAt (= 10d ago) → new.
    expect(
      classifyObservationTrend(
        { createdAt: daysAgo(10), lastObservedAt: daysAgo(100), proofCount: 1 },
        NOW
      )
    ).toBe("new");
  });
});

describe("summarizeObservationTrends", () => {
  it("counts each label", () => {
    const counts = summarizeObservationTrends(
      [
        { createdAt: daysAgo(5), proofCount: 1 }, // new
        { createdAt: daysAgo(5), proofCount: 1 }, // new
        { createdAt: daysAgo(60), lastObservedAt: daysAgo(2), proofCount: 5 }, // strengthening
        { createdAt: daysAgo(200), lastObservedAt: daysAgo(100), proofCount: 2 }, // stale
      ],
      NOW
    );
    expect(counts).toEqual({
      new: 2,
      strengthening: 1,
      stable: 0,
      weakening: 0,
      stale: 1,
    });
  });
});
