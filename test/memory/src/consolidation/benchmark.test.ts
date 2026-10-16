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

const DEFAULT_BASELINE_PATH = "test/memory/src/consolidation/baseline.json";

const { values: args } = parseArgs({
  options: {
    models: { type: "string" },
    runs: { type: "string" },
    json: { type: "boolean", default: false },
    baseline: { type: "string", short: "b" },
    "save-baseline": { type: "boolean", default: false },
  },
});

const GATE_MODE = args["save-baseline"] || args.baseline !== undefined;

const API_KEY = process.env.PORTAL_API_KEY;
const BASE_URL = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";
const parsedRuns = Number(args.runs ?? process.env.RUNS ?? "3");
const RUNS = Number.isFinite(parsedRuns) && parsedRuns >= 1 ? Math.floor(parsedRuns) : 3;

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
    name: "already captured, different wording",
    category: "noop",
    newFact: "User has two children.",
    candidates: [
      { id: "c1", content: "User has two kids.", similarity: 0.95 },
      { id: "c2", content: "User is married.", similarity: 0.41 },
    ],
    expect: { action: "noop", targetIds: ["c1"] },
  },
];

const GATE_METRICS: GateMetricSpec[] = [
  {
    key: "overallAccuracy",
    direction: "higher-better",
    minTolerance: 0.03,
    label: "accuracy",
    itemsPerRun: CASES.length,
  },
  {
    key: "fallbackRate",
    direction: "lower-better",
    minTolerance: 0.03,
    label: "fallback rate",
  },
];

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

async function runCaseForModel(c: Case, model: string): Promise<RunResult> {
  const start = Date.now();
  const result = await consolidateMemory(c.newFact, c.candidates, {
    apiKey: API_KEY!,
    baseUrl: BASE_URL,
    model,
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

type ConsolidationRunMetrics = {
  overallAccuracy: number;
  fallbackRate: number;
};

function metricsFor(results: readonly RunResult[]): ConsolidationRunMetrics {
  const total = results.length || 1;
  const scored = results.filter((r) => !r.fallback);
  return {
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
    CASES.forEach((c, idx) => {
      const casePass = perRunResults.filter((run) => run[idx]?.correct).length;
      const flag = casePass === RUNS ? "✓" : casePass === 0 ? "✗" : "~";
      report(`    ${flag} [${c.category}] ${c.name} — ${casePass}/${RUNS}`);
    });
    byModel[model] = { runs, perRun: perRunResults.map(metricsFor), byCategory };
  }

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

function gateConfig(model: string): { model: string; cases: number } {
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
