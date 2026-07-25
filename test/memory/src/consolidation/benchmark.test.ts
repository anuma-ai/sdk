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
 *   - accuracy (right action AND right target ids), overall + by category
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

/**
 * Gated metrics.
 *
 * IMPORTANT — this gate is coarse by construction. The corpus is 7 hand-labelled
 * cases, so at `--runs 5` one flipped decision moves accuracy by 1/35 ≈ 2.9%.
 * That makes this a detector for a COLLAPSE (a broken prompt, a schema change the
 * model can't satisfy, a fallback storm) rather than for fine-grained quality
 * drift. Growing the corpus is what would make a tighter gate meaningful.
 *
 * Each individual pass scores in 1/7 steps, so a 5-run baseline is a coin flip:
 * consecutive 5-run passes of the live model scored 94.3% / 100% / 82.9%, and a
 * baseline generated from the lucky 100% pass would red the gate on the healthy
 * 82.9% one. The committed baseline is therefore generated at `--runs 15`, where
 * the mean is representative and the tolerance comes from the spread the model
 * actually exhibits (mostly the one flaky `noop` case) rather than from a floor
 * picked by hand. The workflow gates at the same run count — the benchmark
 * REFUSES to compare across a different one.
 */
const GATE_METRICS: GateMetricSpec[] = [
  {
    key: "overallAccuracy",
    direction: "higher-better",
    minTolerance: 0.12,
    label: "accuracy",
  },
  // Fallbacks are the silent failure mode: a create-fallback leaves the stale
  // contradiction consolidation exists to retire. Higher is worse.
  { key: "fallbackRate", direction: "lower-better", minTolerance: 0.12, label: "fallback rate" },
];

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
  return {
    overallAccuracy: results.filter((r) => r.correct).length / total,
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
function gateConfig(model: string): { model: string; runs: number; cases: number } {
  // `cases` is recorded too: growing the corpus changes what the accuracy means,
  // so an old baseline must be regenerated rather than silently compared.
  return { model, runs: RUNS, cases: CASES.length };
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
