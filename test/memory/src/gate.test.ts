import { describe, expect, it } from "vitest";

import {
  buildGateBaseline,
  compareToGateBaseline,
  describeConfigMismatch,
  formatGateRegressions,
  type GateMetricSpec,
  type GateRun,
  isValidGateBaseline,
} from "./gate.js";

const SPECS: GateMetricSpec[] = [
  { key: "recall", direction: "higher-better", minTolerance: 0.05 },
  { key: "dropped", direction: "lower-better", minTolerance: 1, format: "count", label: "dropped" },
];

const CONFIG = { model: "gpt-oss/gpt-oss-120b", repeat: 5 };

function run(partial: Partial<Record<string, number>> = {}): GateRun {
  return { recall: 0.9, dropped: 0, ...partial };
}

describe("buildGateBaseline", () => {
  it("computes per-metric mean and floors the tolerance for a stable metric", () => {
    const baseline = buildGateBaseline([run(), run(), run()], SPECS, CONFIG);

    expect(baseline.runs).toBe(3);
    expect(baseline.config).toEqual(CONFIG);
    expect(baseline.metrics.recall.mean).toBeCloseTo(0.9, 5);
    // Zero spread → tolerance floored, never 0 (which would make the gate flaky).
    expect(baseline.metrics.recall.tolerance).toBe(0.05);
  });

  it("widens tolerance to the observed spread when it exceeds the floor", () => {
    const baseline = buildGateBaseline(
      [run({ recall: 0.8 }), run({ recall: 0.95 })],
      SPECS,
      CONFIG
    );
    expect(baseline.metrics.recall.tolerance).toBeCloseTo(0.15, 5);
    expect(baseline.metrics.recall.mean).toBeCloseTo(0.875, 5);
    expect(baseline.metrics.recall.min).toBeCloseTo(0.8, 5);
    expect(baseline.metrics.recall.max).toBeCloseTo(0.95, 5);
  });

  it("throws on an empty run set rather than emitting NaN/Infinity bands", () => {
    expect(() => buildGateBaseline([], SPECS, CONFIG)).toThrow(/at least one run/);
  });

  it("throws when a declared metric is missing from a run", () => {
    // A silent undefined becomes NaN, and every NaN comparison is false — the
    // gate would then report "no regressions" for a metric never produced.
    expect(() => buildGateBaseline([{ recall: 0.9 }], SPECS, CONFIG)).toThrow(
      /"dropped" is missing or non-finite in run 1/
    );
  });
});

describe("compareToGateBaseline", () => {
  const baseline = buildGateBaseline([run(), run(), run()], SPECS, CONFIG);

  it("passes an unchanged run", () => {
    expect(compareToGateBaseline([run()], baseline, SPECS)).toEqual([]);
  });

  it("passes a drop inside tolerance and a rise for a higher-better metric", () => {
    expect(compareToGateBaseline([run({ recall: 0.86 })], baseline, SPECS)).toEqual([]);
    expect(compareToGateBaseline([run({ recall: 0.99 })], baseline, SPECS)).toEqual([]);
  });

  it("flags a higher-better metric dropping past tolerance", () => {
    const [regression, ...rest] = compareToGateBaseline([run({ recall: 0.7 })], baseline, SPECS);
    expect(rest).toEqual([]);
    expect(regression).toMatchObject({
      metric: "recall",
      direction: "higher-better",
      tolerance: 0.05,
    });
    expect(regression.current).toBeCloseTo(0.7, 5);
    expect(regression.baseline).toBeCloseTo(0.9, 5);
  });

  it("flags a lower-better metric RISING past tolerance, and ignores it falling", () => {
    // `dropped` (memories in a failed extraction batch) getting worse means going
    // UP — the direction that a higher-better-only gate would have missed (#757).
    const worse = compareToGateBaseline([run({ dropped: 4 })], baseline, SPECS);
    expect(worse).toHaveLength(1);
    expect(worse[0]).toMatchObject({ metric: "dropped", direction: "lower-better" });

    expect(compareToGateBaseline([run({ dropped: 1 })], baseline, SPECS)).toEqual([]);
  });

  it("compares the MEAN of the current runs, not the worst run", () => {
    // One unlucky run inside a noisy set must not red the gate on its own. The
    // mean here (0.85) lands EXACTLY on the tolerance boundary, which also pins
    // the float-slack behaviour: 0.9 - 0.85 === 0.050000000000000044 in IEEE754.
    expect(
      compareToGateBaseline([run({ recall: 0.7 }), run({ recall: 1 })], baseline, SPECS)
    ).toEqual([]);
    // One notch past the boundary does fire.
    expect(
      compareToGateBaseline([run({ recall: 0.7 }), run({ recall: 0.98 })], baseline, SPECS)
    ).toHaveLength(1);
  });

  it("skips a metric the baseline predates instead of reporting a regression", () => {
    const older = { ...baseline, metrics: { recall: baseline.metrics.recall } };
    expect(compareToGateBaseline([run({ dropped: 99 })], older, SPECS)).toEqual([]);
  });
});

describe("isValidGateBaseline", () => {
  it("accepts a real baseline, including one missing a newer metric", () => {
    const baseline = buildGateBaseline([run()], SPECS, CONFIG);
    expect(isValidGateBaseline(baseline, SPECS)).toBe(true);
    expect(
      isValidGateBaseline({ ...baseline, metrics: { recall: baseline.metrics.recall } }, SPECS)
    ).toBe(true);
  });

  it("rejects wrong-shaped files that would otherwise pass vacuously", () => {
    expect(isValidGateBaseline(null, SPECS)).toBe(false);
    expect(isValidGateBaseline({ config: CONFIG, metrics: {} }, SPECS)).toBe(false);
    expect(isValidGateBaseline({ metrics: { recall: { mean: 1, tolerance: 0.05 } } }, SPECS)).toBe(
      false
    );
    // A benchmark's own --json output has `overall`, not `metrics`.
    expect(isValidGateBaseline({ config: CONFIG, overall: { recall: 0.9 } }, SPECS)).toBe(false);
    // A band without the numbers the gate reads.
    expect(isValidGateBaseline({ config: CONFIG, metrics: { recall: { min: 1 } } }, SPECS)).toBe(
      false
    );
  });
});

describe("describeConfigMismatch", () => {
  const baseline = buildGateBaseline([run()], SPECS, CONFIG);

  it("returns null when the config matches", () => {
    expect(describeConfigMismatch(baseline, { ...CONFIG })).toBeNull();
  });

  it("describes a differing or unset recorded key", () => {
    expect(describeConfigMismatch(baseline, { ...CONFIG, model: "openai/gpt-5-mini" })).toMatch(
      /model is openai\/gpt-5-mini, but the baseline was generated with gpt-oss\/gpt-oss-120b/
    );
    expect(describeConfigMismatch(baseline, { repeat: 5 })).toMatch(/model is \(unset\)/);
  });

  it("tolerates float representation drift on numeric knobs", () => {
    const numeric = buildGateBaseline([run()], SPECS, { matchThreshold: 0.62 });
    expect(describeConfigMismatch(numeric, { matchThreshold: 0.62 + 1e-12 })).toBeNull();
    expect(describeConfigMismatch(numeric, { matchThreshold: 0.6 })).toMatch(/matchThreshold/);
  });

  it("ignores knobs the baseline never recorded (forward compatible)", () => {
    expect(describeConfigMismatch(baseline, { ...CONFIG, newKnob: true })).toBeNull();
  });
});

describe("formatGateRegressions", () => {
  it("renders rates as percentages and counts as numbers", () => {
    const baseline = buildGateBaseline([run(), run()], SPECS, CONFIG);
    const table = formatGateRegressions(
      compareToGateBaseline([run({ recall: 0.5, dropped: 6 })], baseline, SPECS)
    );
    expect(table).toContain("recall");
    expect(table).toContain("90.0%");
    expect(table).toContain("50.0%");
    expect(table).toContain("dropped");
    expect(table).toContain("6.0");
  });
});
