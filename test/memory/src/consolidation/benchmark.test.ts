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
 *
 * Models are stochastic, so each case runs `RUNS` times (default 3) and the
 * pass rate is the fraction of runs that matched the label.
 */

import "dotenv/config";

import { consolidateMemory } from "../../../../src/lib/memory/consolidate.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.PORTAL_API_KEY;
const BASE_URL = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";
const RUNS = Number(process.env.RUNS ?? "3");

// Candidate decide-models. Override with MODELS="a,b,c".
const DEFAULT_MODELS = [
  "minimax/minimax-m3",
  "inclusionai/ling-2.6-flash",
  "gpt-oss/gpt-oss-120b",
  "openrouter/amazon/nova-2-lite-v1",
];
const MODELS = (process.env.MODELS ?? DEFAULT_MODELS.join(","))
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

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

async function main(): Promise<void> {
  console.log(
    `\nConsolidation decide-model benchmark — ${CASES.length} cases × ${RUNS} runs × ${MODELS.length} models\n` +
      `base=${BASE_URL}\n`
  );

  const byModel: Record<
    string,
    { runs: RunResult[]; byCategory: Record<string, { pass: number; total: number }> }
  > = {};

  for (const model of MODELS) {
    const runs: RunResult[] = [];
    const byCategory: Record<string, { pass: number; total: number }> = {};
    process.stdout.write(`\n${model}\n`);
    for (const c of CASES) {
      byCategory[c.category] ??= { pass: 0, total: 0 };
      let casePass = 0;
      for (let i = 0; i < RUNS; i++) {
        try {
          const r = await runCaseForModel(c, model);
          runs.push(r);
          byCategory[c.category].total += 1;
          if (r.correct) {
            byCategory[c.category].pass += 1;
            casePass += 1;
          }
        } catch (err) {
          runs.push({
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
      const flag = casePass === RUNS ? "✓" : casePass === 0 ? "✗" : "~";
      console.log(`    ${flag} [${c.category}] ${c.name} — ${casePass}/${RUNS}`);
    }
    byModel[model] = { runs, byCategory };
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
  console.log("\n\n=== SUMMARY (pass rate) ===\n");
  const header = ["model".padEnd(34), ...categories.map((c) => shortLabel[c].padStart(10)), "OVERALL".padStart(8), "fallbk".padStart(7), "med ms".padStart(8)];
  console.log(header.join(" "));
  for (const model of MODELS) {
    const { runs, byCategory } = byModel[model];
    const totalPass = runs.filter((r) => r.correct).length;
    const totalFallback = runs.filter((r) => r.fallback).length;
    const cols = categories.map((cat) => {
      const b = byCategory[cat];
      return b ? pct(b.pass, b.total).padStart(10) : "  —  ".padStart(10);
    });
    console.log(
      [
        model.padEnd(34),
        ...cols,
        pct(totalPass, runs.length).padStart(8),
        pct(totalFallback, runs.length).padStart(7),
        `${median(runs.map((r) => r.ms)).toFixed(0)}`.padStart(8),
      ].join(" ")
    );
  }
  console.log(
    "\nOVERALL = correct action AND correct target-id set, excluding fallbacks.\n" +
      "fallbk  = share of runs that degraded to create-fallback (LLM error / bad JSON).\n" +
      "med ms  = median decision latency per call.\n"
  );
}

void main();
