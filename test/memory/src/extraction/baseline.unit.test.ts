import { describe, expect, it } from "vitest";

import {
  type BaselineOverall,
  baselineSetupMismatch,
  buildBaseline,
  compareToBaseline,
  type ExtractionBaseline,
  FORBIDDEN_HITS_TOLERANCE,
  isValidBaseline,
  MIN_METRIC_TOLERANCE,
} from "./baseline.js";

function overall(partial: Partial<BaselineOverall>): BaselineOverall {
  return {
    recall: 0.9,
    precision: 0.9,
    entityCoverage: 1,
    kindAccuracy: 1,
    negativeCleanRate: 1,
    firstAttemptCleanRate: 1,
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
    expect(baseline.metrics.recall.tolerance).toBe(MIN_METRIC_TOLERANCE);
  });

  it("widens tolerance to the observed spread when it exceeds the floor", () => {
    const runs = [overall({ recall: 0.8 }), overall({ recall: 0.95 })];
    const baseline = buildBaseline(runs, 0.62);
    expect(baseline.metrics.recall.tolerance).toBeCloseTo(0.15, 5);
    expect(baseline.metrics.recall.mean).toBeCloseTo(0.875, 5);
  });
});

describe("baseline setup", () => {
  const general = { dataset: "general", profile: null };
  const finance = { dataset: "finance", profile: "zetalabs-markets" };

  it("records the dataset and profile a baseline was saved from", () => {
    const baseline = buildBaseline([overall({})], 0.62, finance);
    expect(baseline.dataset).toBe("finance");
    expect(baseline.profile).toBe("zetalabs-markets");
    expect(isValidBaseline(JSON.parse(JSON.stringify(baseline)))).toBe(true);
  });

  it("accepts a comparison against a baseline from the same setup", () => {
    expect(baselineSetupMismatch(buildBaseline([overall({})], 0.62, finance), finance)).toBeNull();
    expect(baselineSetupMismatch(buildBaseline([overall({})], 0.62), general)).toBeNull();
  });

  it("treats a baseline without the fields as the general dataset with no profile", () => {
    const legacy = JSON.parse(JSON.stringify(buildBaseline([overall({})], 0.62))) as Record<
      string,
      unknown
    >;
    delete legacy.dataset;
    delete legacy.profile;
    expect(isValidBaseline(legacy)).toBe(true);
    expect(baselineSetupMismatch(legacy, general)).toBeNull();
    expect(baselineSetupMismatch(legacy, finance)).toContain('dataset "general", profile none');
  });

  it("refuses a comparison across datasets or profiles", () => {
    const saved = buildBaseline([overall({})], 0.62, finance);
    expect(baselineSetupMismatch(saved, general)).toContain('dataset "finance"');
    expect(baselineSetupMismatch(saved, { dataset: "finance", profile: null })).toContain(
      'profile "zetalabs-markets"'
    );
    expect(baselineSetupMismatch(saved, { ...finance, dataset: "general" })).not.toBeNull();
  });

  it("rejects a baseline whose dataset or profile is not a string", () => {
    const saved = JSON.parse(JSON.stringify(buildBaseline([overall({})], 0.62)));
    expect(isValidBaseline({ ...saved, dataset: 3 })).toBe(false);
    expect(isValidBaseline({ ...saved, profile: {} })).toBe(false);
  });
});

describe("compareToBaseline", () => {
  const baseline: ExtractionBaseline = buildBaseline(
    [overall({ recall: 0.9, kindAccuracy: 1 }), overall({ recall: 0.9, kindAccuracy: 1 })],
    0.62
  );

  it("passes when metrics hold within tolerance", () => {
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
    const partial = JSON.parse(JSON.stringify(baseline)) as ExtractionBaseline;
    delete (partial.metrics as Record<string, unknown>).kindAccuracy;
    const runs = [overall({ kindAccuracy: 0 })];
    const regressions = compareToBaseline(runs, partial);
    expect(regressions.map((r) => r.metric)).not.toContain("kindAccuracy");
  });
});

describe("isValidBaseline", () => {
  const good = buildBaseline([overall({})], 0.62);

  it("accepts a well-formed baseline", () => {
    expect(isValidBaseline(good)).toBe(true);
  });

  it("accepts a baseline missing one newer metric (forward-compat)", () => {
    const partial = JSON.parse(JSON.stringify(good)) as ExtractionBaseline;
    delete (partial.metrics as Record<string, unknown>).kindAccuracy;
    expect(isValidBaseline(partial)).toBe(true);
  });

  it("rejects an empty metrics object (would pass the gate vacuously)", () => {
    expect(isValidBaseline({ matchThreshold: 0.62, metrics: {} })).toBe(false);
  });

  it("rejects the eval's raw result shape (overall, not metrics)", () => {
    expect(isValidBaseline({ matchThreshold: 0.62, overall: { recall: 1 } })).toBe(false);
  });

  it("rejects a missing / non-numeric matchThreshold", () => {
    const noThreshold = JSON.parse(JSON.stringify(good)) as Record<string, unknown>;
    delete noThreshold.matchThreshold;
    expect(isValidBaseline(noThreshold)).toBe(false);
  });

  it("rejects null / non-objects", () => {
    expect(isValidBaseline(null)).toBe(false);
    expect(isValidBaseline("{}")).toBe(false);
  });
});
