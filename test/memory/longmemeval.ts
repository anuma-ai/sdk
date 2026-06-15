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
import { writeFile } from "node:fs/promises";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../src/lib/memoryEngine/constants.js";
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
  },
});

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
    const result = await runLongMemEval(dataset, options, {
      apiKey,
      baseUrl,
      llmModel,
    });

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
    }

    process.exit(0);
  } catch (error) {
    console.error("Benchmark failed:", error);
    process.exit(1);
  }
}

main();
