/**
 * Consolidation "decide" model benchmark.
 *
 * The consolidation step is the memory pipeline's judgment call: given a new
 * fact + its nearest existing memories, decide create / update / supersede /
 * noop (and, for supersede, WHICH stale ids to retire). It's where models
 * diverge most — a weak model mis-fires the supersede decision (leaving stale
 * contradictions) or malforms the JSON (silent create-fallback).
 *
 * This harness runs a FIXED set of hand-labelled cases through
 * `consolidateMemory` across several candidate models and reports, per model:
 *   - accuracy (right action AND right target ids) over the decisions that
 *     COMPLETED, overall + by category
 *   - fallback rate (LLM error / schema violation → degraded to create)
 *   - median latency per decision
 *
 * Everything else (thresholds, top-K, the pipeline) is held constant — only the
 * decide model varies — so the numbers isolate model quality on THIS task.
 *
 * Run:
 *   PORTAL_API_KEY=... pnpm eval:consolidation
 *   PORTAL_API_KEY=... MODELS="minimax/minimax-m3,inclusionai/ling-2.6-flash" RUNS=5 pnpm eval:consolidation
 *   pnpm eval:consolidation --models inclusionai/ling-2.6-flash --runs 5 --json
 *   pnpm eval:consolidation --runs 5 --save-baseline   # write the golden baseline
 *   pnpm eval:consolidation --runs 5 --baseline test/memory/src/consolidation/baseline.json
 *                                                     # gate: exit 1 on a regression
 *
 * Models are stochastic, so the whole corpus runs `RUNS` times (default 3) and
 * the pass rate is the fraction of runs that matched the label. `--baseline`
 * gates accuracy + fallback rate against a committed baseline; see GATE_METRICS
 * for why that gate is a collapse detector rather than a drift detector.
 */

import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import {
  consolidateMemory,
  DEFAULT_CONSOLIDATION_MODEL,
} from "../../../../src/lib/memory/consolidate.js";
import {
  buildGateBaseline,
  compareToGateBaseline,
  describeConfigMismatch,
  formatGateRegressions,
  type GateBaseline,
  type GateMetricSpec,
  isValidGateBaseline,
} from "../gate.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_BASELINE_PATH = "test/memory/src/consolidation/baseline.json";

const { values: args } = parseArgs({
  options: {
    models: { type: "string" },
    runs: { type: "string" },
    json: { type: "boolean", default: false },
    // Regression gate — same contract as `eval:extraction` / `eval:topic`.
    baseline: { type: "string", short: "b" },
    "save-baseline": { type: "boolean", default: false },
  },
});

const GATE_MODE = args["save-baseline"] || args.baseline !== undefined;

const API_KEY = process.env.PORTAL_API_KEY;
const BASE_URL = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";
// `--runs` wins over RUNS= so CI doesn't depend on env plumbing; a garbage value
// falls back rather than silently running zero times.
const parsedRuns = Number(args.runs ?? process.env.RUNS ?? "3");
const RUNS = Number.isFinite(parsedRuns) && parsedRuns >= 1 ? Math.floor(parsedRuns) : 3;

// Candidate decide-models for a sweep. The gate instead defaults to the ONE
// model production runs, so a committed baseline describes the live path.
const DEFAULT_MODELS = [
  "minimax/minimax-m3",
  "inclusionai/ling-2.6-flash",
  "gpt-oss/gpt-oss-120b",
  "openrouter/amazon/nova-2-lite-v1",
];
const MODELS = (
  args.models ??
  process.env.MODELS ??
  (GATE_MODE ? DEFAULT_CONSOLIDATION_MODEL : DEFAULT_MODELS.join(","))
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

/**
 * Human/progress output. In `--json` mode everything except the single JSON
 * document goes to stderr, so a CI gate can parse stdout.
 */
function report(line: string): void {
  if (args.json) process.stderr.write(line + "\n");
  else console.log(line);
}

if (GATE_MODE && MODELS.length !== 1) {
  console.error(
    `\n  --baseline / --save-baseline compare ONE model against the baseline; ` +
      `got ${MODELS.length} (${MODELS.join(", ")}). Pass a single --models value.\n`
  );
  process.exit(1);
}

if (!API_KEY) {
  console.error(
    "Error: PORTAL_API_KEY is required.\n\n" +
      "Add PORTAL_API_KEY to your .env file:\n" +
      "  PORTAL_API_KEY=your-api-key\n"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Cases — hand-labelled. `candidates` are the existing memories the search
// surfaced; `expect` is the correct decision. For supersede, `targetIds` is the
// SET that should be retired (order-independent).
// ---------------------------------------------------------------------------

type Category =
  | "create"
  | "update"
  | "supersede-single"
  | "supersede-multi"
  | "noop"
  | "hard-negative";

interface Candidate {
  id: string;
  content: string;
  similarity: number;
}

interface Case {
  name: string;
  category: Category;
  newFact: string;
  candidates: Candidate[];
  expect: { action: "create" | "update" | "supersede" | "noop"; targetIds?: string[] };
}

const CASES: Case[] = [
  {
    name: "distinct new fact",
    category: "create",
    newFact: "User has a dog named Biscuit.",
    candidates: [
      { id: "c1", content: "User works as a software engineer.", similarity: 0.31 },
      { id: "c2", content: "User lives in San Francisco.", similarity: 0.28 },
    ],
    expect: { action: "create" },
  },
  {
    name: "same facet, adds detail",
    category: "update",
    newFact: "User's dog Biscuit is a golden retriever.",
    candidates: [
      { id: "c1", content: "User has a dog named Biscuit.", similarity: 0.82 },
      { id: "c2", content: "User lives in San Francisco.", similarity: 0.2 },
    ],
    expect: { action: "update", targetIds: ["c1"] },
  },
  {
    name: "standing value changed (1 stale)",
    category: "supersede-single",
    newFact: "User lives in San Francisco.",
    candidates: [
      { id: "c1", content: "User lives in Portland.", similarity: 0.86 },
      { id: "c2", content: "User has a dog named Biscuit.", similarity: 0.22 },
    ],
    expect: { action: "supersede", targetIds: ["c1"] },
  },
  {
    name: "standing value changed (3 paraphrased dupes)",
    category: "supersede-multi",
    newFact: "Prefers light mode in every app.",
    candidates: [
      { id: "c1", content: "Prefers dark mode in every app and user interface.", similarity: 0.83 },
      { id: "c2", content: "Prefers dark mode in every app.", similarity: 0.86 },
      { id: "c3", content: "Prefers dark mode in every app they use.", similarity: 0.84 },
      { id: "c4", content: "Favorite color is teal.", similarity: 0.24 },
    ],
    expect: { action: "supersede", targetIds: ["c1", "c2", "c3"] },
  },
  {
    name: "already captured",
    category: "noop",
    newFact: "User has a dog named Biscuit.",
    candidates: [
      { id: "c1", content: "User has a dog named Biscuit.", similarity: 0.98 },
      { id: "c2", content: "User lives in San Francisco.", similarity: 0.2 },
    ],
    expect: { action: "noop", targetIds: ["c1"] },
  },
  {
    name: "distinct events, same activity → create not merge",
    category: "hard-negative",
    newFact: "User went to the gym on Friday.",
    candidates: [
      { id: "c1", content: "User went to the gym on Monday.", similarity: 0.88 },
      { id: "c2", content: "User is training for a marathon.", similarity: 0.41 },
    ],
    expect: { action: "create" },
  },
  {
    name: "same topic, different facet → create not merge",
    category: "hard-negative",
    newFact: "User returned a sweater to Zara last week.",
    candidates: [
      { id: "c1", content: "User has a pending Zara boot exchange.", similarity: 0.79 },
      { id: "c2", content: "User shops at Zara.", similarity: 0.72 },
    ],
    expect: { action: "create" },
  },

  // ---- Second of each category (see GATE_METRICS below for why 12) --------
  // Every case below must have exactly ONE defensible answer. A case a competent
  // human would argue about adds variance instead of removing it, which is the
  // opposite of why the corpus grew.
  {
    name: "unrelated health fact",
    category: "create",
    newFact: "User is allergic to penicillin.",
    candidates: [
      { id: "c1", content: "User takes vitamin D every morning.", similarity: 0.36 },
      { id: "c2", content: "User's dentist is on Pine Street.", similarity: 0.24 },
    ],
    expect: { action: "create" },
  },
  {
    name: "same facet, adds an attribute",
    category: "update",
    newFact: "User's cat Mochi is four years old.",
    candidates: [
      { id: "c1", content: "User has a cat named Mochi.", similarity: 0.85 },
      { id: "c2", content: "User is allergic to pollen.", similarity: 0.19 },
    ],
    expect: { action: "update", targetIds: ["c1"] },
  },
  {
    name: "standing value contradicted (1 stale)",
    category: "supersede-single",
    newFact: "User is vegetarian.",
    candidates: [
      { id: "c1", content: "User eats meat a few times a week.", similarity: 0.81 },
      { id: "c2", content: "User loves Thai food.", similarity: 0.33 },
    ],
    expect: { action: "supersede", targetIds: ["c1"] },
  },
  {
    name: "standing value changed (3 paraphrased dupes, different facet)",
    category: "supersede-multi",
    newFact: "User's primary laptop is a MacBook Pro.",
    candidates: [
      { id: "c1", content: "User's main laptop is a ThinkPad X1.", similarity: 0.85 },
      { id: "c2", content: "User uses a ThinkPad as their primary machine.", similarity: 0.84 },
      { id: "c3", content: "User's daily-driver laptop is a ThinkPad.", similarity: 0.83 },
      { id: "c4", content: "User has two external monitors.", similarity: 0.22 },
    ],
    expect: { action: "supersede", targetIds: ["c1", "c2", "c3"] },
  },
  {
    // Restored after #825: the prompt now routes pure rewordings to noop. This
    // fixture's wording is the one in the production prompt ("two kids" /
    // "two children") — without it that rule has no live-eval coverage.
    // Measured 5/5 on ling-2.6-flash after the prompt fix.
    name: "already captured, different wording",
    category: "noop",
    newFact: "User has two children.",
    candidates: [
      { id: "c1", content: "User has two kids.", similarity: 0.95 },
      { id: "c2", content: "User is married.", similarity: 0.41 },
    ],
    expect: { action: "noop", targetIds: ["c1"] },
  },
  // STILL NOT restored: "different subject, same predicate → create not merge"
  // (sister lives in Denver), #822.
  //
  // History, because the obvious next step has already been tried: #825 added
  // the SAME SUBJECT REQUIRED prompt rule and ling-2.6-flash kept superseding
  // ~5–7/8. Prompt work did not move it.
  //
  // The fix is no longer in the prompt. `validate()` now refuses a supersede
  // whose stated subjects disagree and returns create with
  // `fallbackReason: "subject_mismatch"` — so the OUTCOME is correct even when
  // the model picks the wrong action, and the guard is pinned by unit tests that
  // need no LLM (`consolidate.test.ts`, "cross-subject supersede guard").
  //
  // Restoring the fixture here would now measure something different and
  // narrower: whether the model FILLS IN `newSubject` / `targetSubject`. The
  // guard is inert when it does not, and that compliance rate has not been
  // measured on ling-2.6-flash. Per the corpus rule below, a case only earns its
  // place once the model reliably clears it — so measure compliance first
  // (`subject_mismatch` rate in the eval output is the signal), then restore
  // this with a baseline regenerated in the same PR.
];

/**
 * Gated metrics.
 *
 * Declared AFTER `CASES` because `itemsPerRun` reads `CASES.length`: at module
 * scope a const can't be referenced before its initializer runs.
 *
 * This gate detects a COLLAPSE — a broken prompt, a schema the model can't
 * satisfy, a fallback storm — not fine-grained quality drift. The resolution
 * limit is one case: 12 cases x 15 passes is 180 decisions, so a single case
 * failing on EVERY pass moves the gated mean by 1/12 = 8.3pt, and the working
 * tolerance is deliberately set below that and above the run-to-run noise.
 *
 * WHY `itemsPerRun`. Accuracy is a rate over the corpus, and a rate's variance is
 * `p(1-p)/cases` — it shrinks as p approaches 1. So a baseline that draws a
 * lucky-high mean ALSO records an unusually small spread, and the gate compounds
 * both errors in the same direction: bar too high, band too narrow. That is not
 * hypothetical — the 7-case baseline captured 98.1% against a true mean of 95.4%
 * and failed 8 of 26 subsequent runs (31%) with no code change. `itemsPerRun`
 * floors the spread at what the mean actually implies; see `binomialRunStdDev`.
 *
 * `itemsPerRun` is on accuracy only, set to `CASES.length` as an upper bound
 * rather than an exact count: `metricsFor` scores accuracy over the decisions
 * that COMPLETED, so a run with fallbacks had fewer effective items and is
 * slightly noisier than the floor assumes. The error is second-order at the
 * single-digit fallback rates seen in practice, and it errs toward a tighter
 * gate — if `fallbackRate` is high enough for it to matter, that metric's own
 * band fires first and names the cause.
 *
 * `fallbackRate` deliberately omits `itemsPerRun`. Accuracy divides by completed
 * decisions, so a "stops producing parseable output" regression is invisible to
 * it and `fallbackRate` is the only detector. Near zero the binomial floor is
 * tiny, but a capture taken during a provider wobble records a non-zero mean and
 * the floor then WIDENS the ceiling off that weather — baking the same
 * unrepresentative-capture failure this PR exists to eliminate into the one
 * metric that has to catch absent decisions. Empirical spread alone (plus
 * `minTolerance`) is the right band here.
 *
 * WHY THE CORPUS IS 12 AND WHY GROWING IT IS NOT FREE. Two bounds squeeze it from
 * both sides, and the second one is counter-intuitive:
 *
 *   Upper bound — tolerance shrinks as 1/sqrt(cases) but one case's weight shrinks
 *   as 1/cases, so the two cross. Past roughly 28 cases (at 15 runs) the tolerance
 *   drops BELOW one case's weight and a fully-broken case stops firing: the gate
 *   grows more precise and less useful at the same time.
 *
 *   The real bound — a rate's variance is p(1-p), so adding cases the model gets
 *   WRONG raises the noise faster than the extra cases lower it. Learned the hard
 *   way: this corpus was taken to 14 and three of the new cases scored 0/25, which
 *   dropped the mean from 95% to 72%. At p=0.72 the variance is 4.4x what it is at
 *   p=0.95, the tolerance grew to 8.2pt against a one-case weight of 7.1pt, and the
 *   margin went NEGATIVE — a bigger corpus that could no longer detect a broken
 *   case. Those three were removed. A case only pays for itself if the model
 *   reliably gets it right; a case it fails is a finding to file, not a fixture.
 *
 *   After #825 fixed the rewording → noop prompt weakness, that fixture came
 *   back (measured 5/5). The sister/Denver different-subject case did NOT —
 *   ling-2.6-flash still supersedes on it most of the time, so restoring it would
 *   recreate the trap above. That case is now handled by a deterministic guard in
 *   `validate()` rather than by the model (#822); see the note at the end of
 *   `CASES` for why that changes what a restored fixture would measure and does
 *   not by itself earn it a place. Tokyo March vs January stayed out as a bad
 *   fixture with no single defensible label. So 12 = the 11 healthy cases + the
 *   one finding that actually cleared.
 *
 * So most of the false-failure fix above comes from `itemsPerRun` and an honest
 * baseline, not from corpus size. 12 over 7 buys a modest resolution gain for
 * ~1.7x the LLM cost.
 *
 * That cost is wall-clock, not just spend: cases run SEQUENTIALLY, and the
 * per-decision latency was measured anywhere from 1.4s to 4.5s depending on
 * provider load. At the slow end a 25-run capture is ~22 minutes against the job's
 * 30-minute timeout, which is the real ceiling on both corpus size and run count.
 *
 * The committed baseline is generated at `--runs 25` while the workflow GATES at
 * 15. Deliberately asymmetric: a capture's error in the mean is permanent until
 * someone regenerates it — and mis-estimating that mean is precisely what broke
 * this gate — whereas a gate run's cost is paid again on every PR. So buy
 * precision where it lasts. Over 12 cases, 25 passes put the mean's standard error
 * at ~1.3pp against ~1.7pp at 15. Not higher: 40 passes is 480 sequential calls,
 * which at the 4.5s latency seen above is past the job's 30-minute timeout.
 *
 * The counts need NOT match — `meanDiffTolerance` folds both into the tolerance,
 * and `runs` is deliberately absent from the recorded config for that reason. But
 * note the spread term DOMINATES the floor here, so gating at fewer runs than 15
 * genuinely widens the gate. Contrast the topic gate, where every floor dominates
 * and gating at 5 against a 10-run baseline is free.
 *
 * `minTolerance` remains the absolute backstop for a degenerate all-identical
 * capture, where both the empirical and binomial spreads are zero.
 */
const GATE_METRICS: GateMetricSpec[] = [
  {
    key: "overallAccuracy",
    direction: "higher-better",
    minTolerance: 0.03,
    label: "accuracy",
    itemsPerRun: CASES.length,
  },
  // Fallbacks are the silent failure mode: a create-fallback leaves the stale
  // contradiction consolidation exists to retire. Higher is worse. No
  // `itemsPerRun` — see GATE_METRICS doc above.
  {
    key: "fallbackRate",
    direction: "lower-better",
    minTolerance: 0.03,
    label: "fallback rate",
  },
];

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function setEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

interface RunResult {
  correct: boolean;
  fallback: boolean;
  ms: number;
  gotAction: string;
  gotTargets: string[];
}

function scoreDecision(
  result: Awaited<ReturnType<typeof consolidateMemory>>,
  expect: Case["expect"]
): { correct: boolean; targets: string[] } {
  const targets = result.targetIds ?? (result.targetId ? [result.targetId] : []);
  if (result.action !== expect.action) return { correct: false, targets };
  if (expect.action === "create") return { correct: true, targets };
  // update/noop/supersede — targets must match the labelled set.
  return { correct: setEqual(targets, expect.targetIds ?? []), targets };
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function pct(n: number, d: number): string {
  return d === 0 ? "  —  " : `${((n / d) * 100).toFixed(0).padStart(3)}%`;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function runCaseForModel(c: Case, model: string): Promise<RunResult> {
  const start = Date.now();
  const result = await consolidateMemory(c.newFact, c.candidates, {
    apiKey: API_KEY!,
    baseUrl: BASE_URL,
    model,
    // One attempt: we want to measure the model's raw decision quality, not the
    // retry harness. A transient failure surfaces as a fallback in the numbers.
    maxAttempts: 1,
  });
  const ms = Date.now() - start;
  const { correct, targets } = scoreDecision(result, c.expect);
  return {
    correct: correct && !result.fallbackReason,
    fallback: !!result.fallbackReason,
    ms,
    gotAction: result.action,
    gotTargets: targets,
  };
}

/** One repeat's metrics — a plain object TYPE so it stays assignable to the
 * gate's `Record<string, number>` run shape. */
type ConsolidationRunMetrics = {
  overallAccuracy: number;
  fallbackRate: number;
};

function metricsFor(results: readonly RunResult[]): ConsolidationRunMetrics {
  const total = results.length || 1;
  // Accuracy is over the decisions that actually HAPPENED. A fallback is not a
  // wrong decision, it's an absent one — the provider 429'd or returned
  // unparseable JSON, so the model never got to be right or wrong. Dividing by
  // every attempt made accuracy a second provider-health metric, which is what
  // `fallbackRate` already is, and it corrupted baselines: a capture taken during
  // an OpenRouter wobble recorded 88.4% where the same decisions scored 96.8%
  // over the ones that completed. That is the exact unrepresentative-capture
  // failure this gate's calibration exists to prevent, arriving through the
  // metric instead of the tolerance. It also matches what the report legend has
  // claimed all along ("excluding fallbacks").
  const scored = results.filter((r) => !r.fallback);
  return {
    // Every decision fell back: no accuracy signal exists, so report the floor
    // rather than NaN (which compares false against any tolerance and would read
    // as "no regression"). `fallbackRate` hits 1.0 in the same run and names the
    // real cause, so the two together are unambiguous.
    overallAccuracy:
      scored.length === 0 ? 0 : scored.filter((r) => r.correct).length / scored.length,
    fallbackRate: results.filter((r) => r.fallback).length / total,
  };
}

async function main(): Promise<void> {
  report(
    `\nConsolidation decide-model benchmark — ${CASES.length} cases × ${RUNS} runs × ${MODELS.length} models\n` +
      `base=${BASE_URL}\n`
  );

  const byModel: Record<
    string,
    {
      runs: RunResult[];
      perRun: ConsolidationRunMetrics[];
      byCategory: Record<string, { pass: number; total: number }>;
    }
  > = {};

  for (const model of MODELS) {
    const runs: RunResult[] = [];
    const byCategory: Record<string, { pass: number; total: number }> = {};
    report(`\n${model}`);
    // Repeat-OUTER, case-inner. Each repeat is a full pass over the corpus, so
    // it yields one comparable metric set and the gate gets a real run-to-run
    // spread. (Case-outer would only ever produce a single aggregate.)
    const perRunResults: RunResult[][] = [];
    for (let i = 0; i < RUNS; i++) {
      const thisRun: RunResult[] = [];
      for (const c of CASES) {
        byCategory[c.category] ??= { pass: 0, total: 0 };
        try {
          const r = await runCaseForModel(c, model);
          thisRun.push(r);
          byCategory[c.category].total += 1;
          if (r.correct) byCategory[c.category].pass += 1;
        } catch (err) {
          thisRun.push({
            correct: false,
            fallback: true,
            ms: 0,
            gotAction: "error",
            gotTargets: [],
          });
          byCategory[c.category].total += 1;
          console.error(`    ${c.name}: threw — ${err instanceof Error ? err.message : err}`);
        }
      }
      perRunResults.push(thisRun);
      runs.push(...thisRun);
    }
    // Per-case pass rate across the repeats (same numbers as before the loop
    // inversion — the same decisions, just grouped after the fact).
    CASES.forEach((c, idx) => {
      const casePass = perRunResults.filter((run) => run[idx]?.correct).length;
      const flag = casePass === RUNS ? "✓" : casePass === 0 ? "✗" : "~";
      report(`    ${flag} [${c.category}] ${c.name} — ${casePass}/${RUNS}`);
    });
    byModel[model] = { runs, perRun: perRunResults.map(metricsFor), byCategory };
  }

  // Summary table.
  const categories: Category[] = [
    "create",
    "update",
    "supersede-single",
    "supersede-multi",
    "noop",
    "hard-negative",
  ];
  const shortLabel: Record<Category, string> = {
    create: "create",
    update: "update",
    "supersede-single": "sup-1",
    "supersede-multi": "sup-N",
    noop: "noop",
    "hard-negative": "hardneg",
  };
  report("\n\n=== SUMMARY (pass rate) ===\n");
  const header = [
    "model".padEnd(34),
    ...categories.map((c) => shortLabel[c].padStart(10)),
    "OVERALL".padStart(8),
    "fallbk".padStart(7),
    "med ms".padStart(8),
  ];
  report(header.join(" "));
  for (const model of MODELS) {
    const { runs, byCategory } = byModel[model];
    const totalPass = runs.filter((r) => r.correct).length;
    const totalFallback = runs.filter((r) => r.fallback).length;
    const cols = categories.map((cat) => {
      const b = byCategory[cat];
      return b ? pct(b.pass, b.total).padStart(10) : "  —  ".padStart(10);
    });
    report(
      [
        model.padEnd(34),
        ...cols,
        pct(totalPass, runs.length).padStart(8),
        pct(totalFallback, runs.length).padStart(7),
        `${median(runs.map((r) => r.ms)).toFixed(0)}`.padStart(8),
      ].join(" ")
    );
  }
  report(
    "\nOVERALL = correct action AND correct target-id set, excluding fallbacks.\n" +
      "fallbk  = share of runs that degraded to create-fallback (LLM error / bad JSON).\n" +
      "med ms  = median decision latency per call.\n"
  );

  if (args.json) {
    // ONE JSON document on stdout (see `report`), so a CI gate can parse it.
    console.log(
      JSON.stringify(
        {
          runs: RUNS,
          cases: CASES.length,
          models: Object.fromEntries(
            Object.entries(byModel).map(([model, { perRun, byCategory }]) => [
              model,
              {
                runs: perRun,
                mean: {
                  overallAccuracy: mean(perRun.map((m) => m.overallAccuracy)),
                  fallbackRate: mean(perRun.map((m) => m.fallbackRate)),
                },
                byCategory,
              },
            ])
          ),
        },
        null,
        2
      )
    );
  }

  // Baseline handling last, all of its I/O on stderr so --json stays clean.
  const model = MODELS[0];
  const baselinePath = args.baseline ?? DEFAULT_BASELINE_PATH;
  if (args["save-baseline"]) {
    await saveBaseline(byModel[model].perRun, model, baselinePath);
  } else if (args.baseline) {
    await gateAgainstBaseline(byModel[model].perRun, model, baselinePath);
  }
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

/** The knobs the numbers depend on, recorded in the baseline and refused on mismatch. */
function gateConfig(model: string): { model: string; cases: number } {
  // `cases` IS recorded: growing the corpus changes what the accuracy means, so
  // an old baseline must be regenerated rather than silently compared.
  //
  // `runs` is NOT, for the same reason as the topic gate: it moves the
  // uncertainty of the mean, not its meaning, and `meanDiffTolerance` already
  // folds both run counts into the tolerance. Note the practical difference from
  // topic though — here the spread term dominates the floor, so gating at fewer
  // runs genuinely widens the gate rather than being free. The workflow stays at
  // 15 by choice, not by enforcement.
  return { model, cases: CASES.length };
}

async function saveBaseline(
  perRun: ConsolidationRunMetrics[],
  model: string,
  path: string
): Promise<void> {
  const baseline = buildGateBaseline(perRun, GATE_METRICS, gateConfig(model));
  await writeFile(path, JSON.stringify(baseline, null, 2) + "\n");
  console.error(
    `\nBaseline written to ${path} (${perRun.length} run${perRun.length === 1 ? "" : "s"}, ${model}).`
  );
}

async function gateAgainstBaseline(
  perRun: ConsolidationRunMetrics[],
  model: string,
  path: string
): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf-8"));
  } catch (err) {
    console.error(`Failed to load baseline from ${path}: ${String(err)}`);
    process.exit(1);
  }
  if (!isValidGateBaseline(parsed, GATE_METRICS)) {
    console.error(
      `\n  ${path} is not a valid consolidation baseline (expected a config + metrics ` +
        `object). Generate one with --save-baseline.\n`
    );
    process.exit(1);
  }
  const baseline: GateBaseline = parsed;
  const mismatch = describeConfigMismatch(baseline, gateConfig(model));
  if (mismatch) {
    console.error(`\n  Refusing to gate: ${mismatch}. Re-run to match, or regenerate.\n`);
    process.exit(1);
  }
  const regressions = compareToGateBaseline(perRun, baseline, GATE_METRICS);
  if (regressions.length === 0) {
    console.error("\n  Baseline comparison: no regressions detected.\n");
    return;
  }
  console.error("\n  REGRESSION DETECTED\n");
  console.error(formatGateRegressions(regressions));
  console.error("");
  process.exit(1);
}

void main();
