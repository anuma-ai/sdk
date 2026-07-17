import { describe, expect, it } from "vitest";

import {
  type BaselineOverall,
  buildBaseline,
  compareToBaseline,
  type ExtractionBaseline,
  FORBIDDEN_HITS_TOLERANCE,
  MIN_METRIC_TOLERANCE,
} from "./baseline.js";

function overall(partial: Partial<BaselineOverall>): BaselineOverall {
  return {
    recall: 0.9,
    precision: 0.9,
    entityCoverage: 1,
    kindAccuracy: 1,
    negativeCleanRate: 1,
    forbiddenHits: 0,
    ...partial,
  };
}

describe("buildBaseline", () => {
  it("computes per-metric mean and floors the tolerance for a stable metric", () => {
    const runs = [overall({ recall: 0.9 }), overall({ recall: 0.9 }), overall({ recall: 0.9 })];
    const baseline = buildBaseline(runs, 0.62);

    expect(baseline.runs).toBe(3);
    expect(baseline.matchThreshold).toBe(0.62);
    expect(baseline.metrics.recall.mean).toBeCloseTo(0.9, 5);
    // Zero spread → tolerance floored, never 0 (which would make the gate flaky).
    expect(baseline.metrics.recall.tolerance).toBe(MIN_METRIC_TOLERANCE);
  });

  it("widens tolerance to the observed spread when it exceeds the floor", () => {
    const runs = [overall({ recall: 0.8 }), overall({ recall: 0.95 })];
    const baseline = buildBaseline(runs, 0.62);
    // spread = 0.15 > floor → tolerance tracks the noise.
    expect(baseline.metrics.recall.tolerance).toBeCloseTo(0.15, 5);
    expect(baseline.metrics.recall.mean).toBeCloseTo(0.875, 5);
  });
});

describe("compareToBaseline", () => {
  const baseline: ExtractionBaseline = buildBaseline(
    [overall({ recall: 0.9, kindAccuracy: 1 }), overall({ recall: 0.9, kindAccuracy: 1 })],
    0.62
  );

  it("passes when metrics hold within tolerance", () => {
    // recall dips 0.02 < 0.03 floor → not a regression.
    const runs = [overall({ recall: 0.88 })];
    expect(compareToBaseline(runs, baseline)).toEqual([]);
  });

  it("flags a metric that drops beyond tolerance", () => {
    const runs = [overall({ kindAccuracy: 0.5 })];
    const regressions = compareToBaseline(runs, baseline);
    expect(regressions).toHaveLength(1);
    expect(regressions[0].metric).toBe("kindAccuracy");
    expect(regressions[0].current).toBeCloseTo(0.5, 5);
  });

  it("averages current runs before comparing (noise on one run doesn't trip it)", () => {
    // mean recall = (0.95 + 0.85) / 2 = 0.90 → no drop.
    const runs = [overall({ recall: 0.95 }), overall({ recall: 0.85 })];
    expect(compareToBaseline(runs, baseline)).toEqual([]);
  });

  it("flags a rise in forbidden-fact hits beyond the count tolerance", () => {
    const runs = [overall({ forbiddenHits: FORBIDDEN_HITS_TOLERANCE + 2 })];
    const regressions = compareToBaseline(runs, baseline);
    expect(regressions.map((r) => r.metric)).toContain("forbiddenHits");
  });

  it("does not flag forbidden-fact hits within the slack", () => {
    const runs = [overall({ forbiddenHits: FORBIDDEN_HITS_TOLERANCE })];
    expect(compareToBaseline(runs, baseline).map((r) => r.metric)).not.toContain("forbiddenHits");
  });

  it("skips metrics absent from an older baseline instead of crashing", () => {
    // Simulate a baseline written before `kindAccuracy` existed.
    const partial = JSON.parse(JSON.stringify(baseline)) as ExtractionBaseline;
    delete (partial.metrics as Record<string, unknown>).kindAccuracy;
    const runs = [overall({ kindAccuracy: 0 })];
    const regressions = compareToBaseline(runs, partial);
    expect(regressions.map((r) => r.metric)).not.toContain("kindAccuracy");
  });
});
