export const BASELINE_METRICS = [
  "recall",
  "precision",
  "entityCoverage",
  "kindAccuracy",
  "negativeCleanRate",
  "firstAttemptCleanRate",
] as const;
export type BaselineMetric = (typeof BASELINE_METRICS)[number];

export const MIN_METRIC_TOLERANCE = 0.05;
export const FORBIDDEN_HITS_TOLERANCE = 1;

export type BaselineOverall = Record<BaselineMetric, number> & { forbiddenHits: number };

export interface BaselineMetricBand {
  mean: number;
  min: number;
  max: number;
  tolerance: number;
}
export interface BaselineSetup {
  dataset: string;
  profile: string | null;
}

export const DEFAULT_BASELINE_SETUP: BaselineSetup = { dataset: "general", profile: null };

export interface ExtractionBaseline extends Partial<BaselineSetup> {
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

export function isValidBaseline(obj: unknown): obj is ExtractionBaseline {
  if (!obj || typeof obj !== "object") return false;
  const b = obj as Record<string, unknown>;
  if (typeof b.matchThreshold !== "number" || !Number.isFinite(b.matchThreshold)) return false;
  if (b.dataset !== undefined && typeof b.dataset !== "string") return false;
  if (b.profile !== undefined && b.profile !== null && typeof b.profile !== "string") return false;
  const metrics = b.metrics;
  if (!metrics || typeof metrics !== "object") return false;
  return BASELINE_METRICS.some((m) => {
    const band = (metrics as Record<string, unknown>)[m];
    if (!band || typeof band !== "object") return false;
    const { mean, tolerance } = band as Record<string, unknown>;
    return typeof mean === "number" && typeof tolerance === "number";
  });
}

export function baselineSetup(baseline: Partial<BaselineSetup>): BaselineSetup {
  return {
    dataset: baseline.dataset ?? DEFAULT_BASELINE_SETUP.dataset,
    profile: baseline.profile ?? DEFAULT_BASELINE_SETUP.profile,
  };
}

function describeSetup(setup: BaselineSetup): string {
  return `dataset "${setup.dataset}", profile ${setup.profile === null ? "none" : `"${setup.profile}"`}`;
}

export function baselineSetupMismatch(
  baseline: Partial<BaselineSetup>,
  current: BaselineSetup
): string | null {
  const recorded = baselineSetup(baseline);
  if (recorded.dataset === current.dataset && recorded.profile === current.profile) return null;
  return (
    `this run uses ${describeSetup(current)} but the baseline was recorded with ` +
    `${describeSetup(recorded)}; compare against a baseline saved from the same setup.`
  );
}

function meanOf(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

function series(runs: readonly BaselineOverall[], metric: BaselineMetric): number[] {
  return runs.map((r) => r[metric]);
}

export function buildBaseline(
  runs: readonly BaselineOverall[],
  matchThreshold: number,
  setup: BaselineSetup = DEFAULT_BASELINE_SETUP
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
    dataset: setup.dataset,
    profile: setup.profile,
    matchThreshold,
    runs: runs.length,
    metrics,
    forbiddenHits: { mean: meanOf(forbidden), max: Math.max(...forbidden) },
  };
}

export function compareToBaseline(
  runs: readonly BaselineOverall[],
  baseline: ExtractionBaseline
): BaselineRegression[] {
  const regressions: BaselineRegression[] = [];
  for (const m of BASELINE_METRICS) {
    const base = baseline.metrics?.[m];
    if (!base) continue;
    const current = meanOf(series(runs, m));
    if (base.mean - current > base.tolerance) {
      regressions.push({ metric: m, baseline: base.mean, current, tolerance: base.tolerance });
    }
  }
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
