#!/usr/bin/env node
/**
 * LongMemEval Benchmark CLI
 *
 * Usage:
 *   pnpm eval:longmemeval              # Run both strategies (engine + vault)
 *   pnpm eval:engine --variant oracle   # Memory engine only
 *   pnpm eval:vault --variant oracle    # Memory vault only
 *   pnpm eval:longmemeval --max 10     # Run only first 10 questions
 *   pnpm eval:longmemeval --json       # Output as JSON
 *   pnpm eval:longmemeval --preload    # Download all datasets (for CI setup)
 */

import "dotenv/config";
import { parseArgs } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../src/lib/memoryEngine/constants.js";
import {
  buildGateBaseline,
  compareToGateBaseline,
  describeConfigMismatch,
  formatGateRegressions,
  type GateBaseline,
  type GateMetricSpec,
  isValidGateBaseline,
} from "./src/gate.js";
import {
  loadLongMemEvalDataset,
  preloadAllDatasets,
  getDatasetStats,
  getCacheDirectory,
  runLongMemEval,
  printLongMemEvalSummary,
  printLongMemEvalJson,
  fetchModelPricing,
  attachCost,
} from "./src/longmemeval/index.js";
import { LONG_MEM_EVAL_QUESTION_TYPES } from "./src/longmemeval/index.js";
import type {
  LongMemEvalOptions,
  LongMemEvalQuestionType,
  LongMemEvalStrategy,
  LongMemEvalSummary,
  LongMemEvalComparisonSummary,
  RecallEmit,
  RecallLaneMode,
  RecallTypes,
} from "./src/longmemeval/types.js";

function parseRecallTypes(raw: string): RecallTypes {
  if (raw === "fact" || raw === "chunk") return raw;
  return "fact-chunk";
}

function parseRecallEmit(raw: string): RecallEmit {
  return raw === "blocks" ? "blocks" : "rrf";
}

function parseRecallLaneMode(raw: string): RecallLaneMode {
  return raw === "per-lane" ? "per-lane" : "fused";
}

function parseQuestionTypes(raw: string): LongMemEvalQuestionType[] {
  const known = new Set<string>(LONG_MEM_EVAL_QUESTION_TYPES);
  const tokens = raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  const unknown = tokens.filter((t) => !known.has(t));
  if (unknown.length > 0) {
    console.error(
      `Unknown --types: ${unknown.join(", ")}. Expected one of ${LONG_MEM_EVAL_QUESTION_TYPES.join(", ")}`
    );
    process.exit(1);
  }
  return tokens as LongMemEvalQuestionType[];
}

const { values: args } = parseArgs({
  options: {
    variant: { type: "string", default: "s", short: "v" },
    strategy: { type: "string" },
    llm: { type: "string" },
    "extract-llm": { type: "string" },
    "judge-llm": { type: "string" },
    extractor: { type: "string" },
    "skip-existing": { type: "boolean", default: false },
    "question-id": { type: "string" },
    max: { type: "string", short: "m" },
    "max-sessions": { type: "string" },
    types: { type: "string", short: "t" },
    json: { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
    output: { type: "string", short: "o" },
    preload: { type: "boolean", default: false },
    "skip-unsupported": { type: "boolean", default: true },
    "include-unsupported": { type: "boolean", default: false },
    concurrency: { type: "string", short: "c" },
    "cache-dir": { type: "boolean", default: false },
    stats: { type: "boolean", default: false },
    help: { type: "boolean", default: false, short: "h" },
    rerank: { type: "string" },
    decompose: { type: "string" },
    consolidate: { type: "string" },
    "chunk-source": { type: "string" },
    "excerpt-cap": { type: "string" },
    "recall-types": { type: "string" },
    "recall-emit": { type: "string" },
    "recall-lane-mode": { type: "string" },
    "ce-weight": { type: "string" },
    "recency-alpha": { type: "string" },
    "recency-decay": { type: "string" },
    "recency-floor": { type: "string" },
    "rrf-k": { type: "string" },
    "supersession-boost": { type: "string" },
    "supersession-window": { type: "string" },
    "proof-count-alpha": { type: "string" },
    mmr: { type: "boolean" },
    "rerank-candidates": { type: "string" },
    "bm25-divisor": { type: "string" },
    // Retrieval regression gate — same contract as the other eval suites.
    // Deliberately gates RETRIEVAL only; see RECALL_GATE_METRICS.
    baseline: { type: "string" },
    "save-baseline": { type: "boolean", default: false },
    /**
     * Repeats for `--save-baseline`. Retrieval here is NOT deterministic (the
     * vault is built by LLM extraction), and a single capture lands anywhere in
     * the model's natural range — which moves the gate's fire threshold by as
     * much as the spread itself. Capturing over several runs makes the mean
     * representative and lets the tolerance come from measured spread instead of
     * the floor alone. Ignored outside --save-baseline.
     */
    "baseline-repeat": { type: "string" },
  },
});

const DEFAULT_RECALL_BASELINE_PATH = "test/memory/src/longmemeval/recall-baseline.json";

/**
 * Gated metrics for the recall gate.
 *
 * ONLY retrieval metrics block. `accuracy` is reported but never gated, and that
 * is a deliberate call from the data: the `benchmarks` branch history has
 * recall-strategy oracle runs at ~80% accuracy / ~94% retrieval recall sitting
 * beside sibling runs that collapsed to 0–1.8% accuracy. Those collapses are
 * answer-LLM / infrastructure flakiness, not ranking regressions — gating on
 * accuracy would red PRs for reasons the PR didn't cause. Retrieval recall and
 * precision are what a ranking change actually moves, and they don't depend on
 * the answer model at all.
 *
 * The gate config additionally pins `--decompose=off --consolidate=false
 * --rerank=false`, removing the LLM calls inside the retrieval path (query
 * decomposition, retain-time consolidation) and the native cross-encoder.
 *
 * Retrieval still is NOT deterministic, because building the vault runs LLM
 * extraction per session: back-to-back 50-question oracle runs of unchanged code
 * measured recall 91.5% / 95.5% / 92.0% — a ~4pp swing.
 *
 * The floor stays at SINGLE-RUN scale (8pp) on purpose, unlike the topic and
 * consolidation gates which were retuned down to mean-scale. This gate compares
 * ONE live run against a multi-run baseline, so the relevant uncertainty is a
 * single run's, not a mean's — `gate.ts` accounts for that asymmetry via the
 * standard error of the difference, sqrt(1/n_base + 1/1), and correctly WIDENS
 * here where it tightens elsewhere.
 */
const RECALL_GATE_METRICS: GateMetricSpec[] = [
  { key: "retrievalRecall", direction: "higher-better", minTolerance: 0.08, label: "recall" },
  { key: "retrievalPrecision", direction: "higher-better", minTolerance: 0.08, label: "precision" },
];

/** Parse a numeric CLI flag, exiting with a clear error on garbage input
 *  so a typo'd sweep doesn't silently fall back to the SDK default.
 *  `min` rejects out-of-range values that would corrupt ranking math
 *  rather than fail loudly (e.g. --bm25-divisor 0 → Infinity floor,
 *  --rrf-k -1 → division by zero at rank 0). */
function parseNumericFlag(
  name: string,
  raw: string,
  min?: { value: number; exclusive?: boolean }
): number {
  // Number("") === 0, so an empty value must be rejected explicitly.
  const value = raw.trim() === "" ? NaN : Number(raw);
  if (!Number.isFinite(value)) {
    console.error(`Invalid --${name}: "${raw}" is not a number`);
    process.exit(1);
  }
  if (min !== undefined && (min.exclusive ? value <= min.value : value < min.value)) {
    console.error(
      `Invalid --${name}: must be ${min.exclusive ? ">" : ">="} ${min.value}, got ${value}`
    );
    process.exit(1);
  }
  return value;
}

function printHelp(): void {
  console.log(`
LongMemEval Benchmark - Long-term Memory Evaluation

Usage:
  pnpm eval:longmemeval [options]

Options:
  -v, --variant <s|m|oracle>  Dataset variant:
                              s = small (~50 sessions per question)
                              m = medium (~500 sessions per question)
                              oracle = only answer sessions (fast, for dev)
                              Default: s
  --strategy <engine|vault|both>
                              Retrieval strategy:
                              engine = memory engine (conversation chunk retrieval)
                              vault = memory vault (extracted facts retrieval)
                              both = run both and compare (default)
  --llm <model>               Override chat completion model
  --extract-llm <model>       Override extraction model only (default: --llm).
                              Use a JSON-reliable model when the answer model
                              is reasoning-heavy (extraction results are cached
                              per model)
  --extractor <harness|sdk>   Which code path produces session memories.
                              harness = this suite's own prompt + fetch (default,
                                historical behaviour)
                              sdk     = extractFacts() from the SDK, i.e. the
                                production write path. See anuma-ai/sdk#907.
  --judge-llm <model>         Override the answer-judging model (default: --llm,
                              i.e. the model under evaluation grades itself)
  --skip-existing             Skip entries with existing transcript for same model
  --question-id <id>          Run only the specified question id
  -m, --max <n>               Maximum number of questions to evaluate
  --max-sessions <n>          Max sessions to process per question (for dev)
  -t, --types <types>         Comma-separated question types to include
  -c, --concurrency <n>       Number of questions to process in parallel (default: 1)
  --skip-unsupported          Skip temporal-reasoning & knowledge-update (default: true)
  --include-unsupported       Include temporal-reasoning & knowledge-update
  --json                      Output results as JSON
  --verbose                   Show detailed per-question results
  -o, --output <path>         Write results to file
  --preload                   Download all datasets (for CI setup)
  --cache-dir                 Print cache directory path and exit
  --stats                     Print dataset statistics and exit
  -h, --help                  Show this help message

Retrieval tuning knobs (defaults match production; omit for a no-op):
  --ce-weight <f>             Cross-encoder multiplicative blend weight (default: 0.1)
  --recency-alpha <f>         Recency boost slope in the fused ranker (default: 1.0)
  --recency-decay <f>         Recency per-year linear decay slope (default: 0.2)
  --recency-floor <f>         Recency multiplier floor for old memories (default: 0.1)
  --rrf-k <n>                 RRF smoothing constant for lane fusion (default: 60)
  --supersession-boost <f>    Score-gap fraction moved old->new on supersession (default: 0.8)
  --supersession-window <n>   Cap on supersession candidate window (default: 50)
  --proof-count-alpha <f>     Proof-count log-boost scale (default: 0.1)
  --mmr                       Enable MMR diversification on the rerank and
                              composite-decompose paths (default: off)
  --rerank-candidates <n>     Candidates fed to the CE reranker (default: 30)
  --bm25-divisor <f>          BM25 admission floor divisor, bm25/divisor (default: 50)

Shortcut scripts:
  pnpm eval:engine [options]    Equivalent to --strategy engine
  pnpm eval:vault [options]     Equivalent to --strategy vault

Examples:
  pnpm eval:longmemeval                             # Both strategies, small dataset
  pnpm eval:engine --variant oracle --max 5          # Engine only, oracle, 5 questions
  pnpm eval:vault --variant oracle --max 5           # Vault only, oracle, 5 questions
  pnpm eval:longmemeval --variant oracle --max 2     # Both, compare side-by-side
  pnpm eval:longmemeval --strategy engine --verbose   # Engine with details

Environment Variables:
  PORTAL_API_KEY      Required for LLM calls
  ANUMA_API_URL    Optional: Override API URL

Cache:
  Dataset files are cached in ~/.cache/longmemeval/
`);
}

function isComparison(
  result: LongMemEvalSummary | LongMemEvalComparisonSummary
): result is LongMemEvalComparisonSummary {
  return "engine" in result && "vault" in result;
}

async function main(): Promise<void> {
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args["cache-dir"]) {
    console.log(getCacheDirectory());
    process.exit(0);
  }

  if (args.preload) {
    await preloadAllDatasets();
    process.exit(0);
  }

  let variant: "s" | "m" | "oracle" = "s";
  if (args.variant === "m") variant = "m";
  else if (args.variant === "oracle") variant = "oracle";

  if (args.stats) {
    console.log(`Loading dataset (${variant})...`);
    const dataset = await loadLongMemEvalDataset(variant);
    const stats = getDatasetStats(dataset);
    console.log("\nDataset Statistics:");
    console.log(`  Total entries: ${stats.totalEntries}`);
    console.log(`  Avg sessions/entry: ${stats.avgSessionsPerEntry.toFixed(1)}`);
    console.log(`  Avg messages/session: ${stats.avgMessagesPerSession.toFixed(1)}`);
    console.log("\nQuestion Types:");
    for (const [type, count] of Object.entries(stats.questionTypes)) {
      console.log(`  ${type}: ${count}`);
    }
    process.exit(0);
  }

  const apiKey = process.env.PORTAL_API_KEY;
  const baseUrl = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";

  if (!apiKey) {
    console.error(
      "Error: PORTAL_API_KEY is required.\n\n" +
        "Add PORTAL_API_KEY to your .env file:\n" +
        "  PORTAL_API_KEY=your-api-key\n"
    );
    process.exit(1);
  }

  // Parse strategy
  let strategy: LongMemEvalStrategy = "both";
  const rawStrategy = args.strategy?.toLowerCase();
  if (rawStrategy === "engine" || rawStrategy === "memory-engine") {
    strategy = "memory-engine";
  } else if (rawStrategy === "vault" || rawStrategy === "memory-vault") {
    strategy = "memory-vault";
  } else if (rawStrategy === "recall" || rawStrategy === "memory-recall") {
    strategy = "memory-recall";
  } else if (rawStrategy === "ensemble" || rawStrategy === "memory-ensemble") {
    strategy = "memory-ensemble";
  } else if (rawStrategy === "both" || !rawStrategy) {
    strategy = "both";
  }

  // Fail FAST and LOUD on a gate request the comparison shape can't satisfy.
  // The gate only runs in the single-strategy branch below, so on the default
  // `both` shape `--baseline` used to be ignored while the process still exited
  // 0 — a requested gate silently becoming a vacuous pass, and a requested
  // `--save-baseline` silently writing nothing. That is precisely the failure
  // mode `assertRetrievalHappened` exists to prevent, so it can't be tolerated
  // here. Checked before the eval runs so nobody burns a run to learn it.
  if ((args.baseline !== undefined || args["save-baseline"]) && strategy === "both") {
    console.error(
      `\n  --baseline / --save-baseline need a single strategy: the comparison shape ` +
        `produces two summaries and no one set of numbers to gate.\n` +
        `  Re-run with --strategy recall (or engine / vault / ensemble).\n`
    );
    process.exit(1);
  }

  const options: LongMemEvalOptions = {
    variant: variant === "oracle" ? "s" : variant,
    strategy,
    llmModel: args.llm,
    extractionModel: args["extract-llm"],
    skipExisting: args["skip-existing"],
    questionId: args["question-id"],
    maxQuestions: args.max ? parseInt(args.max, 10) : undefined,
    maxSessions: args["max-sessions"] ? parseInt(args["max-sessions"], 10) : undefined,
    questionTypes: args.types ? parseQuestionTypes(args.types) : undefined,
    verbose: args.verbose,
    output: args.output,
    skipUnsupported: args["include-unsupported"] ? false : args["skip-unsupported"],
    concurrency: args.concurrency ? parseInt(args.concurrency, 10) : undefined,
    ...(args.rerank !== undefined && { rerank: args.rerank !== "false" }),
    ...(args.decompose !== undefined && {
      decompose: args.decompose === "off" ? "off" : "llm",
    }),
    ...(args.consolidate !== undefined && { consolidate: args.consolidate !== "false" }),
    ...(args["chunk-source"] !== undefined && {
      chunkSourceMaxChars: parseInt(args["chunk-source"], 10),
    }),
    ...(args["excerpt-cap"] !== undefined && {
      excerptMaxChars: parseInt(args["excerpt-cap"], 10),
    }),
    ...(args["recall-types"] !== undefined && {
      recallTypes: parseRecallTypes(args["recall-types"]),
    }),
    ...(args["recall-emit"] !== undefined && {
      recallEmit: parseRecallEmit(args["recall-emit"]),
    }),
    ...(args["recall-lane-mode"] !== undefined && {
      recallLaneMode: parseRecallLaneMode(args["recall-lane-mode"]),
    }),
    // Retrieval-ranking tuning knobs — only set when the flag is passed so
    // the SDK defaults stay authoritative (a flag-less run is a no-op).
    ...(args["ce-weight"] !== undefined && {
      ceWeight: parseNumericFlag("ce-weight", args["ce-weight"]),
    }),
    ...(args["recency-alpha"] !== undefined && {
      recencyAlpha: parseNumericFlag("recency-alpha", args["recency-alpha"]),
    }),
    ...(args["recency-decay"] !== undefined && {
      recencyDecay: parseNumericFlag("recency-decay", args["recency-decay"]),
    }),
    ...(args["recency-floor"] !== undefined && {
      recencyFloor: parseNumericFlag("recency-floor", args["recency-floor"]),
    }),
    ...(args["rrf-k"] !== undefined && {
      rrfK: parseNumericFlag("rrf-k", args["rrf-k"], { value: 0 }),
    }),
    ...(args["supersession-boost"] !== undefined && {
      supersessionBoost: parseNumericFlag("supersession-boost", args["supersession-boost"]),
    }),
    ...(args["supersession-window"] !== undefined && {
      supersessionWindow: parseNumericFlag("supersession-window", args["supersession-window"], {
        value: 0,
      }),
    }),
    ...(args["proof-count-alpha"] !== undefined && {
      proofCountAlpha: parseNumericFlag("proof-count-alpha", args["proof-count-alpha"]),
    }),
    ...(args.mmr !== undefined && { mmr: args.mmr }),
    ...(args["rerank-candidates"] !== undefined && {
      rerankTopN: parseNumericFlag("rerank-candidates", args["rerank-candidates"], { value: 1 }),
    }),
    ...(args["bm25-divisor"] !== undefined && {
      bm25AdmissionDivisor: parseNumericFlag("bm25-divisor", args["bm25-divisor"], {
        value: 0,
        exclusive: true,
      }),
    }),
  };

  try {
    console.log(`Loading LongMemEval dataset (${variant})...`);
    const dataset = await loadLongMemEvalDataset(variant);
    console.log(`Loaded ${dataset.length} entries`);

    const llmModel = args.llm || "cerebras/qwen-3-235b-a22b-instruct-2507";
    // Validated here rather than defaulted silently: a typo'd `--extractor sdkk`
    // that fell through to the harness path would produce a run labelled as the
    // SDK arm in the config record while measuring the other extractor — the
    // exact class of mislabelled comparison this flag exists to prevent.
    const extractorMode = args.extractor;
    if (extractorMode !== undefined && extractorMode !== "harness" && extractorMode !== "sdk") {
      console.error(`Invalid --extractor "${extractorMode}". Expected "harness" or "sdk".`);
      process.exit(1);
    }

    // judgeModel lives inside the closure so every `--baseline-repeat` capture
    // is judged by the same model as the first one.
    const runSuite = () =>
      runLongMemEval(dataset, options, {
        apiKey,
        baseUrl,
        llmModel,
        ...(args["judge-llm"] && { judgeModel: args["judge-llm"] }),
        ...(extractorMode && { extractor: extractorMode }),
      });
    const result = await runSuite();

    // Fetch model pricing and attach cost estimates
    const pricing = await fetchModelPricing(baseUrl, apiKey);
    const embeddingModel = DEFAULT_API_EMBEDDING_MODEL;

    function attachCostToSummary(summary: LongMemEvalSummary): void {
      attachCost(summary, llmModel, embeddingModel, pricing);
    }

    if (isComparison(result)) {
      attachCostToSummary(result.engine);
      attachCostToSummary(result.vault);

      if (args.json) {
        printLongMemEvalJson(result.engine);
        printLongMemEvalJson(result.vault);
      } else {
        console.log("\n══ Memory Engine Results ══");
        printLongMemEvalSummary(result.engine);
        console.log("\n══ Memory Vault Results ══");
        printLongMemEvalSummary(result.vault);
      }

      if (args.output) {
        await writeFile(args.output, JSON.stringify(result, null, 2));
        console.log(`\nResults written to ${args.output}`);
      }
    } else {
      attachCostToSummary(result);

      if (args.json) {
        printLongMemEvalJson(result);
      } else {
        printLongMemEvalSummary(result);
      }

      if (args.output) {
        await writeFile(args.output, JSON.stringify(result, null, 2));
        console.log(`\nResults written to ${args.output}`);
      }

      // Retrieval regression gate. Only meaningful on a single-strategy run —
      // the comparison shape has two summaries and no single set of numbers to
      // gate, so it's excluded above.
      if (args["save-baseline"]) {
        // Extra captures for a representative mean — see `--baseline-repeat`.
        const repeats = Math.max(1, parseInt(args["baseline-repeat"] ?? "1", 10) || 1);
        const runs = [result];
        for (let i = 1; i < repeats; i++) {
          console.error(`\n  baseline capture ${i + 1}/${repeats}...`);
          const next = await runSuite();
          if (isComparison(next)) break; // unreachable: guarded at arg-parse time
          runs.push(next);
        }
        await saveRecallBaseline(runs, args.baseline ?? DEFAULT_RECALL_BASELINE_PATH);
      } else if (args.baseline) {
        await gateRecallAgainstBaseline(result, args.baseline);
      }
    }

    // A run that couldn't be scored is not a run that scored badly. Exiting
    // non-zero makes longmemeval.yml fail, and because the benchmarks-branch
    // publish step is `if: success()`, an incomplete summary can no longer be
    // committed next to healthy ones as if it were a real result.
    //
    // Keep this the last gate before the success exit. Any other gate added
    // above it (a baseline comparison, say) must not exit 0 on its own, or a
    // partially-scored run publishes through that path instead.
    const unscored = isComparison(result)
      ? result.engine.judgeFailures +
        result.engine.answerFailures +
        result.engine.harnessFailures +
        result.vault.judgeFailures +
        result.vault.answerFailures +
        result.vault.harnessFailures
      : result.judgeFailures + result.answerFailures + result.harnessFailures;
    if (unscored > 0) {
      console.error(
        `\n${unscored} question(s) could not be scored (see the judge/no-answer counts above). ` +
          `Accuracy covers only the questions that were actually scored — this run is ` +
          `incomplete, not a low score.`
      );
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("Benchmark failed:", error);
    process.exit(1);
  }
}

/** Retrieval metrics the gate reads, flattened to the gate's run shape. */
function recallMetrics(result: {
  retrieval: { avgRecall: number; avgPrecision: number };
}): Record<string, number> {
  return {
    retrievalRecall: result.retrieval.avgRecall,
    retrievalPrecision: result.retrieval.avgPrecision,
  };
}

/**
 * The knobs these numbers depend on. Recorded so the gate refuses to compare a
 * bounded PR run against, say, a full-variant or differently-piped baseline —
 * every one of these changes what recall means.
 */
function recallGateConfig(): Record<string, string | number | boolean> {
  return {
    strategy: args.strategy ?? "",
    variant: args.variant ?? "",
    max: args.max ?? "",
    llm: args.llm ?? "",
    // The EXTRACTOR is what decides which memories exist to be retrieved, so it
    // moves the gated metrics at least as much as the answer model does. Without
    // it recorded, swapping only `--extract-llm` would sail past the config
    // check and compare two materially different vaults.
    extractLlm: args["extract-llm"] ?? "",
    // Which EXTRACTOR, not just which model. The harness prompt and the SDK's
    // produce different memories from the same session, so two runs that agree
    // on every other knob are still incomparable across this one — a stronger
    // invalidator than `extractLlm` above.
    extractor: args.extractor ?? "",
    // Every gated score is a cosine over these vectors, so a model swap changes
    // the embedding space itself — the most total way to invalidate a
    // comparison. The sibling vault-search gate records it for the same reason.
    embeddingModel: DEFAULT_API_EMBEDDING_MODEL,
    decompose: args.decompose ?? "",
    consolidate: args.consolidate ?? "",
    // Recorded because the cross-encoder reorders results: a baseline captured
    // with rerank on is not comparable to a gate run with it off.
    rerank: args.rerank ?? "",
    recallTypes: args["recall-types"] ?? "",
    recallEmit: args["recall-emit"] ?? "",
    recallLaneMode: args["recall-lane-mode"] ?? "",
  };
}

/**
 * Refuse to treat a run that retrieved NOTHING as a baseline or as a passing
 * gate. Zero recall across every question is an infrastructure failure (the
 * portal 500s, an expired key, a dataset that didn't load), not a measurement:
 * the first capture attempt for this gate scored 0.0/0.0 because the extractor
 * was 500ing, and it would have committed a baseline that can never fail.
 * Observed in the wild too — the `benchmarks` branch holds several
 * recall-strategy runs at 0–1.8% accuracy beside healthy ~80% ones.
 *
 * Also refuses a run that measured only PART of its questions. Excluding crashed
 * entries from the averages fixes a fabricated-zero bias, but it cannot fix a
 * SELECTION bias: if crashes cluster on the hard questions, what is left is an
 * easier subsample, and comparing it against a full-run baseline is not a
 * like-for-like comparison in either direction.
 */
function assertRetrievalHappened(result: {
  totalQuestions: number;
  harnessFailures: number;
  retrieval: { avgRecall: number; avgPrecision: number; measuredQuestions: number };
}): void {
  const { avgRecall, avgPrecision, measuredQuestions } = result.retrieval;
  // Nothing measured at all is its OWN failure, distinct from "ranking returned
  // nothing". The averages read 0/0 in both cases, but a run where every entry
  // crashed needs the operator pointed at the crashes rather than at the
  // retrieval stack — and once the averages exclude crashed entries, an empty
  // denominator is the only thing left that can produce this shape.
  if (measuredQuestions === 0) {
    console.error(
      `\n  Retrieval was never measured — every entry failed in the harness.\n` +
        `  This is a FAILED RUN, not a 0% result. See the per-entry harness errors above.\n`
    );
    process.exit(1);
  }
  // A PARTIAL measurement is refused outright rather than compared. This costs
  // nothing that was not already lost: the `unscored > 0` check at the end of
  // main() fails any run with a harness error regardless, so there is no run
  // where this exit changes the job outcome. What it changes is that the gate no
  // longer prints a verdict — or `--save-baseline` write a file — off a
  // subsample, ahead of that check. Relying on a later exit to invalidate an
  // earlier gate's output is exactly the ordering hazard the comment on that
  // check warns about; this makes the requirement local to the gate.
  if (measuredQuestions < result.totalQuestions) {
    console.error(
      `\n  Retrieval was measured on only ${measuredQuestions}/${result.totalQuestions} questions ` +
        `(${result.harnessFailures} harness failure(s)).\n` +
        `  Refusing to gate or capture a baseline from a partial run: crashes are not random ` +
        `with respect to difficulty,\n  so the surviving subsample is not comparable to a ` +
        `full-run baseline. Fix the harness errors and re-run.\n`
    );
    process.exit(1);
  }
  if (avgRecall > 0 || avgPrecision > 0) return;
  console.error(
    `\n  Retrieval was 0% on all ${measuredQuestions} measured question(s) — treating this as a FAILED RUN, not a result.\n` +
      `  A baseline captured here could never fail, and a gate passing here would be vacuous.\n` +
      `  Check the portal (HTTP 500s / auth) and the dataset cache, then re-run.\n`
  );
  process.exit(1);
}

async function saveRecallBaseline(
  runs: Array<{
    totalQuestions: number;
    harnessFailures: number;
    retrieval: { avgRecall: number; avgPrecision: number; measuredQuestions: number };
    accuracy: number;
  }>,
  path: string
): Promise<void> {
  runs.forEach(assertRetrievalHappened);
  const baseline = buildGateBaseline(
    runs.map(recallMetrics),
    RECALL_GATE_METRICS,
    recallGateConfig()
  );
  await writeFile(path, JSON.stringify(baseline, null, 2) + "\n");
  const band = baseline.metrics.retrievalRecall!;
  console.error(
    `\nRecall baseline written to ${path} from ${runs.length} run${runs.length === 1 ? "" : "s"}.\n` +
      `  recall mean ${(band.mean * 100).toFixed(1)}% ` +
      `[${(band.min * 100).toFixed(1)}–${(band.max * 100).toFixed(1)}], ` +
      `tolerance ${(band.tolerance * 100).toFixed(1)}pt ` +
      `→ the gate fires below ${((band.mean - band.tolerance) * 100).toFixed(1)}%.` +
      (runs.length === 1
        ? `\n  NOTE: a single capture lands wherever this run did, so the fire threshold ` +
          `moves with it. Pass --baseline-repeat 3+ for a representative mean.`
        : "") +
      `\n  Accuracy at capture: ${runs.map((r) => `${(r.accuracy * 100).toFixed(1)}%`).join(", ")} ` +
      `— recorded for reference only; the gate does not read it.`
  );
}

async function gateRecallAgainstBaseline(
  result: {
    totalQuestions: number;
    harnessFailures: number;
    retrieval: { avgRecall: number; avgPrecision: number; measuredQuestions: number };
    accuracy: number;
  },
  path: string
): Promise<void> {
  // A wholly-failed run must fail the gate loudly rather than reporting a
  // retrieval regression it can't distinguish from an outage.
  assertRetrievalHappened(result);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf-8"));
  } catch (err) {
    console.error(`Failed to load recall baseline from ${path}: ${String(err)}`);
    process.exit(1);
  }
  if (!isValidGateBaseline(parsed, RECALL_GATE_METRICS)) {
    console.error(
      `\n  ${path} is not a valid recall baseline (expected a config + metrics object). ` +
        `Generate one with --save-baseline.\n`
    );
    process.exit(1);
  }
  const baseline: GateBaseline = parsed;
  const mismatch = describeConfigMismatch(baseline, recallGateConfig());
  if (mismatch) {
    console.error(`\n  Refusing to gate: ${mismatch}. Re-run to match, or regenerate.\n`);
    process.exit(1);
  }
  const regressions = compareToGateBaseline([recallMetrics(result)], baseline, RECALL_GATE_METRICS);
  if (regressions.length === 0) {
    console.error(
      `\n  Retrieval gate: no regressions detected ` +
        `(accuracy ${(result.accuracy * 100).toFixed(1)}%, not gated).\n`
    );
    return;
  }
  console.error("\n  RETRIEVAL REGRESSION DETECTED\n");
  console.error(formatGateRegressions(regressions));
  console.error("");
  process.exit(1);
}

main();
