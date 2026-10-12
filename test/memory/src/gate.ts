export type MetricDirection = "higher-better" | "lower-better";

export interface GateMetricSpec {
  key: string;
  direction: MetricDirection;
  minTolerance: number;
  itemsPerRun?: number;
  format?: "rate" | "count";
  label?: string;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function binomialRunStdDev(rate: number, items: number): number {
  const p = clamp01(rate);
  return Math.sqrt((p * (1 - p)) / Math.max(1, items));
}

function highestVarianceRate(mean: number, seOfMean: number, sigmas: number): number {
  const lo = clamp01(mean - sigmas * seOfMean);
  const hi = clamp01(mean + sigmas * seOfMean);
  if (lo <= 0.5 && 0.5 <= hi) return 0.5;
  return Math.abs(lo - 0.5) < Math.abs(hi - 0.5) ? lo : hi;
}

export const TOLERANCE_SIGMAS = 2;

export function meanDiffTolerance(
  spec: GateMetricSpec,
  stdDev: number,
  baselineRuns: number,
  currentRuns: number,
  mean?: number
): number {
  const nBase = Math.max(1, baselineRuns);
  const nCur = Math.max(1, currentRuns);
  let perRunStdDev = stdDev;
  if (spec.itemsPerRun !== undefined && mean !== undefined) {
    const worstRate = highestVarianceRate(mean, stdDev / Math.sqrt(nBase), TOLERANCE_SIGMAS);
    perRunStdDev = Math.max(stdDev, binomialRunStdDev(worstRate, spec.itemsPerRun));
  }
  const standardError = perRunStdDev * Math.sqrt(1 / nBase + 1 / nCur);
  return Math.max(spec.minTolerance, TOLERANCE_SIGMAS * standardError);
}

export type GateRun = Readonly<Record<string, number>>;

export type GateConfig = Readonly<Record<string, string | number | boolean>>;

export interface GateMetricBand {
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  tolerance: number;
}

export interface GateBaseline {
  config: GateConfig;
  runs: number;
  metrics: Record<string, GateMetricBand>;
}

export interface GateRegression {
  metric: string;
  label: string;
  baseline: number;
  current: number;
  tolerance: number;
  direction: MetricDirection;
  format: "rate" | "count";
}

function meanOf(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sampleStdDev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const mu = meanOf(xs);
  const variance = xs.reduce((acc, x) => acc + (x - mu) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

function series(runs: readonly GateRun[], key: string): number[] {
  return runs.map((run, i) => {
    const v = run[key];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(`Gate metric "${key}" is missing or non-finite in run ${i + 1}`);
    }
    return v;
  });
}

function requireRuns(runs: readonly GateRun[]): void {
  if (runs.length === 0) throw new Error("Gate needs at least one run");
}

export function buildGateBaseline(
  runs: readonly GateRun[],
  specs: readonly GateMetricSpec[],
  config: GateConfig
): GateBaseline {
  requireRuns(runs);
  const metrics: Record<string, GateMetricBand> = {};
  for (const spec of specs) {
    const xs = series(runs, spec.key);
    const stdDev = sampleStdDev(xs);
    metrics[spec.key] = {
      mean: meanOf(xs),
      min: Math.min(...xs),
      max: Math.max(...xs),
      stdDev,
      tolerance: meanDiffTolerance(spec, stdDev, runs.length, runs.length, meanOf(xs)),
    };
  }
  return { config, runs: runs.length, metrics };
}

export function compareToGateBaseline(
  runs: readonly GateRun[],
  baseline: GateBaseline,
  specs: readonly GateMetricSpec[]
): GateRegression[] {
  requireRuns(runs);
  const regressions: GateRegression[] = [];
  for (const spec of specs) {
    const base = baseline.metrics?.[spec.key];
    if (!base) continue;
    if (!Number.isFinite(base.mean) || !Number.isFinite(base.stdDev)) {
      throw new Error(
        `Baseline band for "${spec.key}" is malformed (mean=${String(base.mean)}, ` +
          `stdDev=${String(base.stdDev)}); regenerate the baseline.`
      );
    }
    const tolerance = meanDiffTolerance(spec, base.stdDev, baseline.runs, runs.length, base.mean);
    const current = meanOf(series(runs, spec.key));
    const drop = spec.direction === "higher-better" ? base.mean - current : current - base.mean;
    if (drop - tolerance > 1e-9) {
      regressions.push({
        metric: spec.key,
        label: spec.label ?? spec.key,
        baseline: base.mean,
        current,
        tolerance,
        direction: spec.direction,
        format: spec.format ?? "rate",
      });
    }
  }
  return regressions;
}

export function isValidGateBaseline(
  obj: unknown,
  specs: readonly GateMetricSpec[]
): obj is GateBaseline {
  if (!obj || typeof obj !== "object") return false;
  const b = obj as Record<string, unknown>;
  if (!b.config || typeof b.config !== "object") return false;
  const metrics = b.metrics;
  if (!metrics || typeof metrics !== "object") return false;
  if (typeof b.runs !== "number" || !Number.isFinite(b.runs) || b.runs < 1) return false;
  return specs.some((spec) => {
    const band = (metrics as Record<string, unknown>)[spec.key];
    if (!band || typeof band !== "object") return false;
    const { mean, stdDev } = band as Record<string, unknown>;
    return typeof mean === "number" && typeof stdDev === "number";
  });
}

export function describeConfigMismatch(baseline: GateBaseline, config: GateConfig): string | null {
  for (const [key, want] of Object.entries(baseline.config ?? {})) {
    const got = config[key];
    if (typeof want === "number" && typeof got === "number") {
      if (Math.abs(want - got) > 1e-9) {
        return `${key} is ${got}, but the baseline was generated with ${want}`;
      }
      continue;
    }
    if (got !== want) {
      return `${key} is ${got === undefined ? "(unset)" : String(got)}, but the baseline was generated with ${String(want)}`;
    }
  }
  return null;
}

export function formatGateRegressions(regressions: readonly GateRegression[]): string {
  const labelWidth = Math.max(6, ...regressions.map((r) => r.label.length));
  const fmt = (r: GateRegression, v: number): string =>
    r.format === "count" ? v.toFixed(1) : `${(v * 100).toFixed(1)}%`;
  const lines = [
    `  ${"Metric".padEnd(labelWidth)}  ${"Baseline".padStart(9)}  ${"Current".padStart(9)}  ${"Tolerance".padStart(9)}`,
    `  ${"─".repeat(labelWidth)}  ${"─".repeat(9)}  ${"─".repeat(9)}  ${"─".repeat(9)}`,
  ];
  for (const r of regressions) {
    lines.push(
      `  ${r.label.padEnd(labelWidth)}  ${fmt(r, r.baseline).padStart(9)}  ` +
        `${fmt(r, r.current).padStart(9)}  ${fmt(r, r.tolerance).padStart(9)}`
    );
  }
  return lines.join("\n");
}
