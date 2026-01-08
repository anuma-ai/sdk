#!/usr/bin/env node
/**
 * Memory Evaluation CLI
 *
 * Usage:
 *   pnpm eval:memory              # Quick mode: cached embeddings
 *   pnpm eval:memory --full       # Full mode: generate via API
 *   pnpm eval:memory --json       # Output as JSON
 *   pnpm eval:memory --verbose    # Show detailed results
 */

import "dotenv/config";
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { loadFixtures, runQuickEval, runFullEval } from "./src/runner.js";
import { printSummary, printJson } from "./src/reporter.js";
import type { EvalOptions, EvaluationSummary } from "./src/types.js";

const { values: args } = parseArgs({
  options: {
    full: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
    output: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

function printHelp(): void {
  console.log(`
Memory Evaluation - SDK Integration Tests

Usage:
  pnpm eval:memory [options]

Options:
  --full          Generate fresh embeddings via Portal API
  --json          Output results as JSON
  --verbose       Show detailed per-test results
  --output <path> Write results to file
  --help          Show this help message

Examples:
  pnpm eval:memory                 # Quick: cached embeddings
  pnpm eval:memory --full          # Full: generate via API
  pnpm eval:memory --json          # Output as JSON

Environment Variables (for --full mode):
  PORTAL_API_KEY      Required for embedding generation
  REVERBIA_API_URL    Optional: Override API URL
`);
}

async function main(): Promise<void> {
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const options: Partial<EvalOptions> = {
    full: args.full,
    json: args.json,
    verbose: args.verbose,
    output: args.output,
  };

  try {
    const fixtures = await loadFixtures();

    let summary: EvaluationSummary;

    if (args.full) {
      console.log("Running full SDK tests (generating embeddings via API)...\n");
      summary = await runFullEval(fixtures, options);
    } else {
      if (Object.keys(fixtures.embeddings).length === 0) {
        throw new Error("No cached embeddings. Run with --full to generate.");
      }
      console.log("Running SDK tests (using cached embeddings)...\n");
      summary = await runQuickEval(fixtures, options);
    }

    if (options.json) {
      printJson(summary);
    } else {
      printSummary(summary);
    }

    if (options.output) {
      await writeFile(options.output, JSON.stringify(summary, null, 2));
      console.log(`\nResults written to ${options.output}`);
    }

    process.exit(process.exitCode || 0);
  } catch (error) {
    console.error("Evaluation failed:", error);
    process.exit(1);
  }
}

main();
