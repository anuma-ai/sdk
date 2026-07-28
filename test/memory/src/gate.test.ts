import { describe, expect, it } from "vitest";

import {
  buildGateBaseline,
  compareToGateBaseline,
  describeConfigMismatch,
  formatGateRegressions,
  type GateBaseline,
  type GateMetricSpec,
  type GateRun,
  isValidGateBaseline,
  meanDiffTolerance,
  TOLERANCE_SIGMAS,
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
    // Identical runs → stdDev 0 → the floor governs, never 0 (which would make
    // the gate fire on floating-point noise).
    expect(baseline.metrics.recall.stdDev).toBe(0);
    expect(baseline.metrics.recall.tolerance).toBe(0.05);
  });

  it("widens tolerance to the observed spread when it exceeds the floor", () => {
    const baseline = buildGateBaseline(
      [run({ recall: 0.8 }), run({ recall: 0.95 })],
      SPECS,
      CONFIG
    );
    // stdDev of {0.8, 0.95} = 0.10607; the recorded tolerance is the same-shape
    // width 2*sd*sqrt(1/2+1/2) = 0.2121.
    expect(baseline.metrics.recall.stdDev).toBeCloseTo(0.10607, 4);
    expect(baseline.metrics.recall.tolerance).toBeCloseTo(0.21213, 4);
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

  // A MISSING band is forward-compat (skip); a PRESENT but malformed one is a
  // corrupt baseline. Without this the NaN arithmetic silently disables that
  // metric's gate while every other metric still validates the file.
  it("throws on a present-but-malformed band rather than silently skipping it", () => {
    for (const bad of [
      { mean: "0.9", stdDev: 0.05 },
      { mean: 0.9, stdDev: null },
      { mean: Number.NaN, stdDev: 0.05 },
      { mean: 0.9 },
    ]) {
      const corrupt = {
        ...baseline,
        metrics: { ...baseline.metrics, dropped: bad },
      } as unknown as typeof baseline;
      // The file still validates — `recall` is well-formed — so the guard has
      // to live in the comparison, not only in the shape check.
      expect(isValidGateBaseline(corrupt, SPECS)).toBe(true);
      expect(() => compareToGateBaseline([run()], corrupt, SPECS)).toThrow(/malformed/);
    }
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
    expect(isValidGateBaseline({ config: CONFIG, runs: 3, metrics: {} }, SPECS)).toBe(false);
    expect(isValidGateBaseline({ metrics: { recall: { mean: 1, stdDev: 0.05 } } }, SPECS)).toBe(
      false
    );
    // A pre-2026-07-27 baseline stored a fixed `tolerance` and no `stdDev`.
    // Gating against it would silently reuse the too-loose width, so it must be
    // rejected outright rather than accepted.
    expect(
      isValidGateBaseline(
        { config: CONFIG, runs: 15, metrics: { recall: { mean: 1, tolerance: 0.14 } } },
        SPECS
      )
    ).toBe(false);
    // Missing `runs` — the compare-time tolerance can't be derived without it.
    expect(
      isValidGateBaseline({ config: CONFIG, metrics: { recall: { mean: 1, stdDev: 0.01 } } }, SPECS)
    ).toBe(false);
    // A benchmark's own --json output has `overall`, not `metrics`.
    expect(isValidGateBaseline({ config: CONFIG, runs: 3, overall: { recall: 0.9 } }, SPECS)).toBe(
      false
    );
    // A band without the numbers the gate reads.
    expect(
      isValidGateBaseline({ config: CONFIG, runs: 3, metrics: { recall: { min: 1 } } }, SPECS)
    ).toBe(false);
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

/**
 * Regression test for the tolerance-scale bug (ws4charlie on #772).
 *
 * The gate compares MEANS, but the tolerance used to be the spread of a single
 * run. On the consolidation suite — 15 passes over 7 cases — that spread was
 * 1/7, so a case failing on EVERY pass moved the mean by only 0.124 and was
 * reported as "no regressions"; it took 3+ simultaneously broken cases to fire.
 */
describe("mean-difference tolerance scaling (#772 review)", () => {
  const ACC: GateMetricSpec[] = [
    { key: "overallAccuracy", direction: "higher-better", minTolerance: 0.03 },
  ];
  /** 15 passes over 7 cases; 2 of 105 decisions wrong, as measured. */
  const HEALTHY = [
    ...Array.from({ length: 13 }, () => ({ overallAccuracy: 1 })),
    ...Array.from({ length: 2 }, () => ({ overallAccuracy: 6 / 7 })),
  ];

  it("fires when ONE case breaks on every pass — the case the old scale missed", () => {
    const baseline = buildGateBaseline(HEALTHY, ACC, { runs: 15 });
    expect(baseline.metrics.overallAccuracy.mean).toBeCloseTo(103 / 105, 6);

    // Every pass loses exactly one of seven cases.
    const broken = Array.from({ length: 15 }, () => ({ overallAccuracy: 6 / 7 }));
    const regressions = compareToGateBaseline(broken, baseline, ACC);

    expect(regressions).toHaveLength(1);
    // The old spread-derived tolerance was 1/7 = 0.1429 and the drop is 0.1238,
    // so this exact input used to pass. Pin that it no longer can.
    expect(regressions[0].current).toBeCloseTo(6 / 7, 6);
    expect(0.1428571429).toBeGreaterThan(103 / 105 - 6 / 7); // the old miss, arithmetically
    expect(regressions[0].tolerance).toBeLessThan(103 / 105 - 6 / 7);
  });

  it("still passes an unchanged run of the same shape", () => {
    const baseline = buildGateBaseline(HEALTHY, ACC, { runs: 15 });
    expect(compareToGateBaseline(HEALTHY, baseline, ACC)).toEqual([]);
  });

  it("widens, not narrows, when the current side is a single run", () => {
    // The recall gate compares ONE live run against a 3-run baseline. Averaging
    // fewer runs means more uncertainty, so the tolerance must grow — the naive
    // "divide by sqrt(runs)" fix would have wrongly tightened it.
    const spec = ACC[0];
    const sameShape = meanDiffTolerance(spec, 0.05, 3, 3);
    const singleCurrent = meanDiffTolerance(spec, 0.05, 3, 1);
    expect(singleCurrent).toBeGreaterThan(sameShape);
  });

  it("derives tolerance from the standard error of the mean difference", () => {
    const spec: GateMetricSpec = { key: "m", direction: "higher-better", minTolerance: 0 };
    // 2 * sd * sqrt(1/n_base + 1/n_cur)
    expect(meanDiffTolerance(spec, 0.1, 4, 4)).toBeCloseTo(
      TOLERANCE_SIGMAS * 0.1 * Math.SQRT1_2,
      6
    );
    // More runs on both sides ⇒ tighter gate, which is the entire point.
    expect(meanDiffTolerance(spec, 0.1, 16, 16)).toBeLessThan(meanDiffTolerance(spec, 0.1, 4, 4));
  });

  it("never goes below the per-suite floor", () => {
    const spec: GateMetricSpec = { key: "m", direction: "higher-better", minTolerance: 0.03 };
    expect(meanDiffTolerance(spec, 0, 15, 15)).toBe(0.03);
  });
});

/**
 * A rate's noise depends on its level, so a baseline that draws a lucky-high mean
 * records a deceptively small spread and gates on chance. These pin the fix using
 * the ACTUAL numbers from the consolidation baseline that was failing ~31% of
 * runs with no code change (mean 98.1%, stdDev 0.0503, 15 runs, 7 cases).
 */
describe("itemsPerRun tolerance floor", () => {
  const LUCKY_MEAN = 0.980952380952381;
  const LUCKY_STDDEV = 0.050266539324928375;
  const BASE_RUNS = 15;

  /** The committed band, verbatim, so this test tracks the real regression. */
  function luckyBaseline(spec: GateMetricSpec): GateBaseline {
    return {
      config: {},
      runs: BASE_RUNS,
      metrics: {
        [spec.key]: {
          mean: LUCKY_MEAN,
          min: 6 / 7,
          max: 1,
          stdDev: LUCKY_STDDEV,
          tolerance: meanDiffTolerance(spec, LUCKY_STDDEV, BASE_RUNS, BASE_RUNS, LUCKY_MEAN),
        },
      },
    };
  }

  const WITHOUT: GateMetricSpec = {
    key: "overallAccuracy",
    direction: "higher-better",
    minTolerance: 0.03,
  };
  const WITH: GateMetricSpec = { ...WITHOUT, itemsPerRun: 7 };

  it("widens the tolerance when the mean implies more noise than the spread showed", () => {
    const without = meanDiffTolerance(WITHOUT, LUCKY_STDDEV, BASE_RUNS, BASE_RUNS, LUCKY_MEAN);
    const with_ = meanDiffTolerance(WITH, LUCKY_STDDEV, BASE_RUNS, BASE_RUNS, LUCKY_MEAN);
    // The observed-but-wrong width, and the binomially-honest one.
    expect(without).toBeCloseTo(0.0367, 4);
    expect(with_).toBeCloseTo(0.0572, 4);
    expect(with_).toBeGreaterThan(without);
  });

  it("stops failing the run that measured the process's true mean", () => {
    // 93.33% was observed twice and is ~1 standard error BELOW the true 95.35%
    // mean — i.e. an ordinary run. The old gate called it a regression.
    const trueMeanRun = Array.from({ length: BASE_RUNS }, () => ({ overallAccuracy: 0.9333 }));

    expect(compareToGateBaseline(trueMeanRun, luckyBaseline(WITHOUT), [WITHOUT])).toHaveLength(1);
    expect(compareToGateBaseline(trueMeanRun, luckyBaseline(WITH), [WITH])).toEqual([]);
  });

  it("keeps firing when one case of seven breaks on every pass", () => {
    // The widening must not buy calm at the cost of the gate's whole purpose.
    const broken = Array.from({ length: BASE_RUNS }, () => ({ overallAccuracy: 6 / 7 }));
    expect(compareToGateBaseline(broken, luckyBaseline(WITH), [WITH])).toHaveLength(1);
  });

  it("loses single-case sensitivity when the corpus mean is dragged down", () => {
    // The trap that a bigger corpus walks into. Variance is p(1-p), so cases the
    // model FAILS raise the noise faster than the extra cases lower it. Measured:
    // taking this corpus to 14 added three cases that scored 0/25, the mean fell
    // 95% -> 72%, and the tolerance overtook one case's weight — a larger corpus
    // that could no longer detect a broken case. Pinned so the bound is explicit
    // rather than rediscovered.
    const spec: GateMetricSpec = { ...WITHOUT, itemsPerRun: 14 };
    const draggedMean = 0.7229; // the mean actually captured at 14 cases
    const stdDev = Math.sqrt((draggedMean * (1 - draggedMean)) / 14);
    const tolerance = meanDiffTolerance(spec, stdDev, 25, 15, draggedMean);
    expect(tolerance).toBeGreaterThan(1 / 14);

    // The healthy corpus keeps the margin the gate depends on.
    const healthyMean = 0.92;
    const healthySd = Math.sqrt((healthyMean * (1 - healthyMean)) / 11);
    expect(
      meanDiffTolerance({ ...WITHOUT, itemsPerRun: 11 }, healthySd, 25, 15, healthyMean)
    ).toBeLessThan(1 / 11);
  });

  it("keeps firing on one broken case at the widened 21-case corpus", () => {
    // The design constraint of growing the corpus: tolerance shrinks as 1/sqrt(C)
    // but one case's weight shrinks as 1/C, so past roughly C = runs/(8p(1-p))
    // (~39 here) a single fully-broken case would stop tripping the gate. 21 keeps
    // a real margin; this pins that it does.
    const spec: GateMetricSpec = { ...WITHOUT, itemsPerRun: 21 };
    const mean = 0.9535;
    const stdDev = Math.sqrt((mean * (1 - mean)) / 21);
    const baseline: GateBaseline = {
      config: {},
      runs: BASE_RUNS,
      metrics: {
        overallAccuracy: {
          mean,
          min: mean,
          max: mean,
          stdDev,
          tolerance: meanDiffTolerance(spec, stdDev, BASE_RUNS, BASE_RUNS, mean),
        },
      },
    };
    const oneCaseWeight = 1 / 21;
    expect(baseline.metrics.overallAccuracy.tolerance).toBeLessThan(oneCaseWeight);

    const broken = Array.from({ length: BASE_RUNS }, () => ({
      overallAccuracy: mean - oneCaseWeight,
    }));
    expect(compareToGateBaseline(broken, baseline, [spec])).toHaveLength(1);
  });

  it("never narrows a spread that is genuinely wider than binomial", () => {
    // Correlated failures or a drifting provider show up as excess spread. A model
    // that assumes independent items must not be allowed to explain it away.
    const excess = 0.4;
    expect(meanDiffTolerance(WITH, excess, BASE_RUNS, BASE_RUNS, LUCKY_MEAN)).toBeCloseTo(
      meanDiffTolerance(WITHOUT, excess, BASE_RUNS, BASE_RUNS, LUCKY_MEAN),
      12
    );
  });

  it("leaves every metric that does not opt in exactly as it was", () => {
    for (const [sd, n] of [
      [0.05, 15],
      [0.1, 3],
      [0, 15],
    ] as const) {
      expect(meanDiffTolerance(WITHOUT, sd, n, n, LUCKY_MEAN)).toBe(
        meanDiffTolerance(WITHOUT, sd, n, n)
      );
    }
  });

  it("uses the widest rate the interval allows, not the measured one", () => {
    // A mean sitting at 1.0 has zero binomial variance; the floor must come from
    // the bottom of its confidence interval or it collapses exactly when a
    // too-perfect capture makes it matter most.
    const perfect = meanDiffTolerance(WITH, 0.02, BASE_RUNS, BASE_RUNS, 1);
    expect(perfect).toBeGreaterThan(TOLERANCE_SIGMAS * 0.02 * Math.sqrt(2 / BASE_RUNS));
  });
});
