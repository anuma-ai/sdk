#!/usr/bin/env node
/**
 * LongMemEval Benchmark CLI
 *
 * Usage:
 *   pnpm eval:longmemeval              # Run with small dataset (50 sessions/question)
 *   pnpm eval:longmemeval --variant m  # Run with medium dataset (500 sessions/question)
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
import type { LongMemEvalOptions, LongMemEvalQuestionType } from "./src/longmemeval/types.js";

const { values: args } = parseArgs({
  options: {
    variant: { type: "string", default: "s", short: "v" },
    max: { type: "string", short: "m" },
    "max-sessions": { type: "string" },
    types: { type: "string", short: "t" },
    model: { type: "string" },
    json: { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
    output: { type: "string", short: "o" },
    preload: { type: "boolean", default: false },
    "skip-unsupported": { type: "boolean", default: true },
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
  -m, --max <n>               Maximum number of questions to evaluate
  --max-sessions <n>          Max sessions to process per question (for dev)
  -t, --types <types>         Comma-separated question types to include
  --model <model>             Completion model to use for LLM calls
                              Default: fireworks/accounts/fireworks/models/gpt-oss-20b
  --skip-unsupported          Skip temporal-reasoning & knowledge-update (default: true)
  --json                      Output results as JSON
  --verbose                   Show detailed per-question results
  -o, --output <path>         Write results to file
  --preload                   Download all datasets (for CI setup)
  --cache-dir                 Print cache directory path and exit
  --stats                     Print dataset statistics and exit
  -h, --help                  Show this help message

Examples:
  pnpm eval:longmemeval                          # Full test with small dataset
  pnpm eval:longmemeval --variant oracle --max 5 # Fast: oracle sessions only
  pnpm eval:longmemeval --max 2 --max-sessions 5 # Quick dev test
  pnpm eval:longmemeval --variant m              # Full test with medium dataset

Environment Variables:
  PORTAL_API_KEY      Required for LLM calls
  REVERBIA_API_URL    Optional: Override API URL

Cache:
  Dataset files are cached in ~/.cache/longmemeval/
`);
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

  // Parse variant (s, m, or oracle)
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
    process.env.REVERBIA_API_URL || "https://portal.anuma-dev.ai";

  if (!apiKey) {
    console.error(
      "Error: PORTAL_API_KEY is required.\n\n" +
      "Add PORTAL_API_KEY to your .env file:\n" +
      "  PORTAL_API_KEY=your-api-key\n"
    );
    process.exit(1);
  }

  const options: LongMemEvalOptions = {
    variant: variant === "oracle" ? "s" : variant, // oracle uses same format as s
    maxQuestions: args.max ? parseInt(args.max, 10) : undefined,
    maxSessions: args["max-sessions"] ? parseInt(args["max-sessions"], 10) : undefined,
    questionTypes: args.types
      ? (args.types.split(",").map((t) => t.trim()) as LongMemEvalQuestionType[])
      : undefined,
    verbose: args.verbose,
    output: args.output,
    skipUnsupported: args["skip-unsupported"],
    completionModel: args.model,
  };

  try {
    console.log(`Loading LongMemEval dataset (${variant})...`);
    const dataset = await loadLongMemEvalDataset(variant);
    console.log(`Loaded ${dataset.length} entries`);

    const summary = await runLongMemEval(dataset, options, {
      apiKey,
      baseUrl,
    });

    if (args.json) {
      printLongMemEvalJson(summary);
    } else {
      printLongMemEvalSummary(summary);
    }

    if (args.output) {
      await writeFile(args.output, JSON.stringify(summary, null, 2));
      console.log(`\nResults written to ${args.output}`);
    }

    // Exit with non-zero if accuracy is below 50%
    process.exit(summary.accuracy < 0.5 ? 1 : 0);
  } catch (error) {
    console.error("Benchmark failed:", error);
    process.exit(1);
  }
}

main();
