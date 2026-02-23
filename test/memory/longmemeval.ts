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
import {
  loadLongMemEvalDataset,
  preloadAllDatasets,
  getDatasetStats,
  getCacheDirectory,
  runLongMemEval,
  printLongMemEvalSummary,
  printLongMemEvalJson,
} from "./src/longmemeval/index.js";
import type {
  LongMemEvalOptions,
  LongMemEvalQuestionType,
  LongMemEvalStrategy,
  LongMemEvalSummary,
  LongMemEvalComparisonSummary,
} from "./src/longmemeval/types.js";

const { values: args } = parseArgs({
  options: {
    variant: { type: "string", default: "s", short: "v" },
    strategy: { type: "string" },
    llm: { type: "string" },
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
    "cache-dir": { type: "boolean", default: false },
    stats: { type: "boolean", default: false },
    help: { type: "boolean", default: false, short: "h" },
  },
});

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
  --skip-existing             Skip entries with existing transcript for same model
  --question-id <id>          Run only the specified question id
  -m, --max <n>               Maximum number of questions to evaluate
  --max-sessions <n>          Max sessions to process per question (for dev)
  -t, --types <types>         Comma-separated question types to include
  --skip-unsupported          Skip temporal-reasoning & knowledge-update (default: true)
  --include-unsupported       Include temporal-reasoning & knowledge-update
  --json                      Output results as JSON
  --verbose                   Show detailed per-question results
  -o, --output <path>         Write results to file
  --preload                   Download all datasets (for CI setup)
  --cache-dir                 Print cache directory path and exit
  --stats                     Print dataset statistics and exit
  -h, --help                  Show this help message

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
  const baseUrl =
    process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";

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
  } else if (rawStrategy === "both" || !rawStrategy) {
    strategy = "both";
  }

  const options: LongMemEvalOptions = {
    variant: variant === "oracle" ? "s" : variant,
    strategy,
    llmModel: args.llm,
    skipExisting: args["skip-existing"],
    questionId: args["question-id"],
    maxQuestions: args.max ? parseInt(args.max, 10) : undefined,
    maxSessions: args["max-sessions"] ? parseInt(args["max-sessions"], 10) : undefined,
    questionTypes: args.types
      ? (args.types.split(",").map((t) => t.trim()) as LongMemEvalQuestionType[])
      : undefined,
    verbose: args.verbose,
    output: args.output,
    skipUnsupported: args["include-unsupported"] ? false : args["skip-unsupported"],
  };

  try {
    console.log(`Loading LongMemEval dataset (${variant})...`);
    const dataset = await loadLongMemEvalDataset(variant);
    console.log(`Loaded ${dataset.length} entries`);

    const result = await runLongMemEval(dataset, options, {
      apiKey,
      baseUrl,
      llmModel: "openai/gpt-4o-mini",
    });

    if (isComparison(result)) {
      // Both strategies — print each summary
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

      // Exit with non-zero if both strategies fail
      const minAccuracy = Math.max(result.engine.accuracy, result.vault.accuracy);
      process.exit(minAccuracy < 0.5 ? 1 : 0);
    } else {
      // Single strategy
      if (args.json) {
        printLongMemEvalJson(result);
      } else {
        printLongMemEvalSummary(result);
      }

      if (args.output) {
        await writeFile(args.output, JSON.stringify(result, null, 2));
        console.log(`\nResults written to ${args.output}`);
      }

      process.exit(result.accuracy < 0.5 ? 1 : 0);
    }
  } catch (error) {
    console.error("Benchmark failed:", error);
    process.exit(1);
  }
}

main();
