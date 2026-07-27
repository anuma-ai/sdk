/**
 * Shared regression-gate math for the live-LLM memory eval suites.
 *
 * Generalized from `extraction/baseline.ts`, which solved this first for the
 * extraction benchmark. Every one of these suites drives a live,
 * non-deterministic model, so a fixed pass/fail threshold is either flaky or
 * blind. Instead a committed baseline stores each metric's mean plus a tolerance
 * derived from the baseline run's OWN spread — the gate fires only when a metric
 * moves by more than the noise the baseline itself exhibited.
 *
 * Suites differ in two ways this module abstracts over:
 *   - metric direction: recall is higher-better, dropped-batches is lower-better
 *   - run config: a gate is only meaningful against a baseline generated with the
 *     same model / flags, so the config is recorded and mismatches are refused
 *     ({@link describeConfigMismatch}) rather than silently compared.
 *
 * Pure and side-effect-free: each benchmark script owns its own I/O (reading and
 * writing the baseline file, printing), so this module unit-tests without a live
 * LLM run. See `gate.test.ts`.
 *
 * `extraction/baseline.ts` and `vault/benchmark.test.ts` keep their own bespoke
 * comparison math — their baselines are already committed in a different shape,
 * and rewriting them would invalidate those files for no quality gain.
 */

/** Whether a metric improving means going up (a rate) or down (a failure count). */
export type MetricDirection = "higher-better" | "lower-better";

export interface GateMetricSpec {
  /** Key into a run's metric record. */
  key: string;
  direction: MetricDirection;
  /**
   * Floor on the spread-derived tolerance, so a lucky low-variance baseline run
   * can't set an impossibly tight gate. Size it above ONE corpus item's worth of
   * the metric: an inherent single-item flip must not read as a regression,
   * because a real drop moves more than one item.
   */
  minTolerance: number;
  /** How {@link formatGateRegressions} renders the value. Defaults to `"rate"`. */
  format?: "rate" | "count";
  /** Optional display label; defaults to {@link GateMetricSpec.key}. */
  label?: string;
}

/**
 * Multiplier on the standard error of the mean difference. ~2 ≈ a 95% interval
 * for a roughly normal statistic, so a healthy run clears the gate ~19 times out
 * of 20 while a real shift of several standard errors fires.
 */
export const TOLERANCE_SIGMAS = 2;

/**
 * Tolerance for comparing a mean of `currentRuns` against a baseline mean of
 * `baselineRuns`, given the per-run standard deviation.
 *
 * This is the whole reason bands store `stdDev` rather than a fixed tolerance.
 * The gate compares MEANS, and the uncertainty of a mean shrinks as √n — so
 * using a single run's spread as the tolerance makes the gate ~√n too loose.
 * Concretely, on the consolidation suite (15 passes over 7 cases) the old
 * spread-derived tolerance was 1/7: a case failing on EVERY pass moved the mean
 * by 0.124 and was reported as "no regressions". Only 3+ simultaneously broken
 * cases could ever fire.
 *
 * `√(1/n_base + 1/n_cur)` is the standard error of the DIFFERENCE of two means,
 * which is what's actually being tested. It also does the right thing when the
 * two sides differ: the recall gate compares a single live run against a 3-run
 * baseline, so its tolerance stays near single-run width instead of being
 * wrongly tightened.
 */
export function meanDiffTolerance(
  spec: GateMetricSpec,
  stdDev: number,
  baselineRuns: number,
  currentRuns: number
): number {
  const nBase = Math.max(1, baselineRuns);
  const nCur = Math.max(1, currentRuns);
  const standardError = stdDev * Math.sqrt(1 / nBase + 1 / nCur);
  return Math.max(spec.minTolerance, TOLERANCE_SIGMAS * standardError);
}

/** One run's metrics. Extra keys are ignored, so a run summary can be passed whole. */
export type GateRun = Readonly<Record<string, number>>;

/**
 * The knobs a run's numbers depend on (model, repeat count, ranker flags…).
 * Recorded in the baseline so a gate can refuse an apples-to-oranges comparison.
 */
export type GateConfig = Readonly<Record<string, string | number | boolean>>;

export interface GateMetricBand {
  mean: number;
  min: number;
  max: number;
  /**
   * Sample standard deviation of the PER-RUN values. The gate derives its
   * tolerance from this at compare time ({@link meanDiffTolerance}) rather than
   * storing a fixed one, because the right tolerance depends on how many runs
   * each side averages — which the baseline can't know.
   */
  stdDev: number;
  /** Informational: the tolerance a same-shape comparison would use. */
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

/** Sample (n-1) standard deviation; 0 for a single run. */
function sampleStdDev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const mu = meanOf(xs);
  const variance = xs.reduce((acc, x) => acc + (x - mu) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/**
 * Pull one metric's series out of `runs`, failing loudly on a missing or
 * non-finite value. A silent `undefined` would become `NaN`, and every `NaN`
 * comparison is false — so the gate would report "no regressions" for a metric
 * the harness never actually produced.
 */
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

/** Build a baseline from N runs: per-metric band + a spread-derived tolerance. */
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
      // Recorded so a human reading the file sees the effective gate width for a
      // same-shape run; `compareToGateBaseline` recomputes it for the actual run
      // counts rather than trusting this number.
      tolerance: meanDiffTolerance(spec, stdDev, runs.length, runs.length),
    };
  }
  return { config, runs: runs.length, metrics };
}

/**
 * Compare the current runs' means against `baseline`; return any regressions.
 *
 * A metric absent from the baseline is SKIPPED (the baseline predates it) rather
 * than treated as a regression — so adding a metric doesn't invalidate every
 * committed baseline. It also won't be gated until the baseline is regenerated;
 * {@link isValidGateBaseline} is what stops that forward-compat branch from
 * making a wrong-shaped file pass vacuously.
 */
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
    // A band that EXISTS but is malformed is a corrupt baseline, not a
    // forward-compat gap. `isValidGateBaseline` only requires SOME metric to be
    // well-formed, so a file with one good band and one `{"mean": "0.9"}` would
    // otherwise reach here and silently disable that metric: the arithmetic
    // yields NaN, every NaN comparison is false, and the gate reports "no
    // regression" for a metric it never actually checked.
    if (!Number.isFinite(base.mean) || !Number.isFinite(base.stdDev)) {
      throw new Error(
        `Baseline band for "${spec.key}" is malformed (mean=${String(base.mean)}, ` +
          `stdDev=${String(base.stdDev)}); regenerate the baseline.`
      );
    }
    // Tolerance is computed HERE, from both run counts, not read from the file —
    // see meanDiffTolerance for why a stored spread is the wrong scale.
    const tolerance = meanDiffTolerance(spec, base.stdDev, baseline.runs, runs.length);
    const current = meanOf(series(runs, spec.key));
    const drop = spec.direction === "higher-better" ? base.mean - current : current - base.mean;
    // Strictly MORE than the tolerance, with float slack: a drop landing exactly
    // on the tolerance is within the baseline's own noise, and without the
    // epsilon a mean like 0.85 vs 0.9 reds the gate on representation error
    // alone (0.9 - 0.85 === 0.050000000000000044 > 0.05).
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

/**
 * Structural check that a parsed object is actually a gate baseline — not, say,
 * a benchmark's raw `--json` output (which has `overall`, not `metrics`) or an
 * empty `{ "metrics": {} }`. Requires a config object plus at least one of
 * `specs` present with a numeric mean + tolerance, so the "skip a missing
 * metric" branch above can't be tricked into passing on a wrong-shaped file.
 * (A baseline missing one NEWER metric still validates.)
 */
export function isValidGateBaseline(
  obj: unknown,
  specs: readonly GateMetricSpec[]
): obj is GateBaseline {
  if (!obj || typeof obj !== "object") return false;
  const b = obj as Record<string, unknown>;
  if (!b.config || typeof b.config !== "object") return false;
  const metrics = b.metrics;
  if (!metrics || typeof metrics !== "object") return false;
  // `runs` is required: the compare-time tolerance is derived from it, and a
  // baseline without it can't be gated against at all.
  if (typeof b.runs !== "number" || !Number.isFinite(b.runs) || b.runs < 1) return false;
  return specs.some((spec) => {
    const band = (metrics as Record<string, unknown>)[spec.key];
    if (!band || typeof band !== "object") return false;
    const { mean, stdDev } = band as Record<string, unknown>;
    // `stdDev` (not `tolerance`) is the load-bearing field. This also rejects
    // pre-2026-07-27 baselines, which stored only a fixed spread-derived
    // tolerance — gating against those would silently reuse the ~sqrt(n)-too-loose
    // width this shape exists to fix, so they must be regenerated, not tolerated.
    return typeof mean === "number" && typeof stdDev === "number";
  });
}

/**
 * Describe the first way `config` differs from what the baseline was generated
 * with, or `null` when they agree. Comparing runs produced under a different
 * model or ranker flag against this baseline is apples-to-oranges, so callers
 * should refuse the gate (not just warn).
 *
 * Only keys the baseline RECORDED are compared: adding a new knob doesn't
 * invalidate existing baselines — but it also isn't gated on until the baseline
 * is regenerated with that knob present.
 */
export function describeConfigMismatch(baseline: GateBaseline, config: GateConfig): string | null {
  for (const [key, want] of Object.entries(baseline.config ?? {})) {
    const got = config[key];
    if (typeof want === "number" && typeof got === "number") {
      // Tolerate float representation drift (0.62 read back from JSON).
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

/** Render regressions as a fixed-width table (caller decides where it goes). */
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
