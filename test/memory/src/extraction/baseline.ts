/**
 * Regression-gate math for the extraction benchmark, split out from
 * `benchmark.test.ts` so the pure comparison logic is unit-testable without a
 * live LLM run. The benchmark script owns all I/O (reading/writing the baseline
 * file, printing); this module is deterministic and side-effect-free.
 *
 * The extractor is a live, non-deterministic model, so a fixed pass/fail
 * threshold would be either flaky or blind. Instead a baseline stores each
 * metric's mean plus a tolerance derived from the baseline run's own spread —
 * the gate fires only when a metric drops by MORE than the noise the baseline
 * itself exhibited.
 */

/** Rate metrics where HIGHER is better; a drop beyond tolerance is a regression. */
export const BASELINE_METRICS = [
  "recall",
  "precision",
  "entityCoverage",
  "kindAccuracy",
  "negativeCleanRate",
] as const;
export type BaselineMetric = (typeof BASELINE_METRICS)[number];

/** Floor on the per-metric tolerance so a lucky low-variance baseline run can't
 * set an impossibly tight gate. */
export const MIN_METRIC_TOLERANCE = 0.03;
/** Forbidden-fact hits is a count where higher is worse; small absolute slack so
 * a single unlucky flip doesn't red the gate. */
export const FORBIDDEN_HITS_TOLERANCE = 1;

/** The subset of a run's `overall` metrics the gate reads. */
export type BaselineOverall = Record<BaselineMetric, number> & { forbiddenHits: number };

export interface BaselineMetricBand {
  mean: number;
  min: number;
  max: number;
  tolerance: number;
}
export interface ExtractionBaseline {
  matchThreshold: number;
  runs: number;
  metrics: Record<BaselineMetric, BaselineMetricBand>;
  forbiddenHits: { mean: number; max: number };
}

export interface BaselineRegression {
  metric: string;
  baseline: number;
  current: number;
  tolerance: number;
}

function meanOf(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

function series(runs: readonly BaselineOverall[], metric: BaselineMetric): number[] {
  return runs.map((r) => r[metric]);
}

/** Build a baseline from N runs: per-metric band + a spread-derived tolerance. */
export function buildBaseline(
  runs: readonly BaselineOverall[],
  matchThreshold: number
): ExtractionBaseline {
  const metrics = {} as Record<BaselineMetric, BaselineMetricBand>;
  for (const m of BASELINE_METRICS) {
    const xs = series(runs, m);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    metrics[m] = {
      mean: meanOf(xs),
      min,
      max,
      tolerance: Math.max(MIN_METRIC_TOLERANCE, max - min),
    };
  }
  const forbidden = runs.map((r) => r.forbiddenHits);
  return {
    matchThreshold,
    runs: runs.length,
    metrics,
    forbiddenHits: { mean: meanOf(forbidden), max: Math.max(...forbidden) },
  };
}

/** Compare current runs' means against the baseline; return any regressions. */
export function compareToBaseline(
  runs: readonly BaselineOverall[],
  baseline: ExtractionBaseline
): BaselineRegression[] {
  const regressions: BaselineRegression[] = [];
  for (const m of BASELINE_METRICS) {
    const base = baseline.metrics?.[m];
    if (!base) continue; // baseline predates this metric — skip, don't crash
    const current = meanOf(series(runs, m));
    if (base.mean - current > base.tolerance) {
      regressions.push({ metric: m, baseline: base.mean, current, tolerance: base.tolerance });
    }
  }
  // Forbidden-fact hits: higher is worse.
  const curForbidden = meanOf(runs.map((r) => r.forbiddenHits));
  const baseForbidden = baseline.forbiddenHits?.mean ?? 0;
  if (curForbidden - baseForbidden > FORBIDDEN_HITS_TOLERANCE) {
    regressions.push({
      metric: "forbiddenHits",
      baseline: baseForbidden,
      current: curForbidden,
      tolerance: FORBIDDEN_HITS_TOLERANCE,
    });
  }
  return regressions;
}
