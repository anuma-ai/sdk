import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROFILE_FACT_TYPE_WEIGHTS,
  DEFAULT_PROFILE_PROOF_ALPHA,
  rankProfileCandidates,
  scoreProfileSalience,
} from "./profileSalience.js";
import { TREND_RECENT_WINDOW_DAYS, TREND_STALE_WINDOW_DAYS } from "./observationTrend.js";

const NOW = Date.UTC(2026, 6, 22);
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(n: number): number {
  return NOW - n * DAY_MS;
}

describe("scoreProfileSalience", () => {
  it("ranks durable + high-proof above trivia", () => {
    const durable = scoreProfileSalience(
      {
        id: "a",
        createdAt: daysAgo(120),
        lastObservedAt: daysAgo(2),
        proofCount: 5,
        factType: "preference",
      },
      NOW
    );
    const trivia = scoreProfileSalience(
      {
        id: "b",
        createdAt: daysAgo(5),
        lastObservedAt: null,
        proofCount: 1,
        factType: "ongoing_context",
      },
      NOW
    );
    expect(durable).toBeGreaterThan(trivia);
  });

  it("demotes stale facts relative to stable same-type peers", () => {
    const stable = scoreProfileSalience(
      {
        id: "a",
        createdAt: daysAgo(60),
        lastObservedAt: daysAgo(5),
        proofCount: 2,
        factType: "identity",
      },
      NOW
    );
    const stale = scoreProfileSalience(
      {
        id: "b",
        createdAt: daysAgo(200),
        lastObservedAt: daysAgo(TREND_STALE_WINDOW_DAYS + 1),
        proofCount: 2,
        factType: "identity",
      },
      NOW
    );
    expect(stable).toBeGreaterThan(stale);
  });

  it("treats null factType as neutral (weight 1)", () => {
    const untyped = scoreProfileSalience(
      {
        id: "a",
        createdAt: daysAgo(10),
        lastObservedAt: daysAgo(1),
        proofCount: 1,
        factType: null,
      },
      NOW
    );
    const other = scoreProfileSalience(
      {
        id: "b",
        createdAt: daysAgo(10),
        lastObservedAt: daysAgo(1),
        proofCount: 1,
        factType: "other",
      },
      NOW
    );
    // Both new + proofCount=1 → same proof/trend; other has explicit 1.0 weight.
    expect(untyped).toBeCloseTo(other, 5);
  });

  it("is neutral on proofCount=1 relative to the log curve baseline", () => {
    // type=1, trend=stable (age>30, quiet<30 impossible with age 40 + lastObs 5 → strengthening
    // if proofs>=2). Use proofs=1, age>30, last within 30 → stable.
    const score = scoreProfileSalience(
      {
        id: "a",
        createdAt: daysAgo(60),
        lastObservedAt: daysAgo(5),
        proofCount: 1,
        factType: "other",
      },
      NOW
    );
    // 1.0 * (1 + α*log2 - α*log2) * 1.0 = 1.0
    expect(score).toBeCloseTo(1, 5);
    expect(DEFAULT_PROFILE_PROOF_ALPHA).toBe(0.2);
  });

  it("exports durable type weights above ephemeral", () => {
    expect(DEFAULT_PROFILE_FACT_TYPE_WEIGHTS.identity).toBe(1.5);
    expect(DEFAULT_PROFILE_FACT_TYPE_WEIGHTS.plan).toBe(0.6);
    expect(DEFAULT_PROFILE_FACT_TYPE_WEIGHTS.ongoing_context).toBe(0.6);
  });
});

describe("rankProfileCandidates", () => {
  it("sorts by score descending and returns trend", () => {
    const ranked = rankProfileCandidates(
      [
        {
          id: "trivia",
          createdAt: daysAgo(3),
          proofCount: 1,
          factType: "plan",
        },
        {
          id: "veg",
          createdAt: daysAgo(100),
          lastObservedAt: daysAgo(1),
          proofCount: 4,
          factType: "preference",
        },
        {
          id: "quiet",
          createdAt: daysAgo(200),
          lastObservedAt: daysAgo(TREND_RECENT_WINDOW_DAYS + 10),
          proofCount: 2,
          factType: "identity",
        },
      ],
      NOW
    );
    expect(ranked[0].id).toBe("veg");
    expect(ranked[0].trend).toBe("strengthening");
    expect(ranked.map((r) => r.id)).toEqual(["veg", "quiet", "trivia"]);
  });

  it("breaks score ties by proofCount then id", () => {
    const ranked = rankProfileCandidates(
      [
        {
          id: "b",
          createdAt: daysAgo(60),
          lastObservedAt: daysAgo(5),
          proofCount: 1,
          factType: "other",
        },
        {
          id: "a",
          createdAt: daysAgo(60),
          lastObservedAt: daysAgo(5),
          proofCount: 1,
          factType: "other",
        },
      ],
      NOW
    );
    expect(ranked.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
