#!/usr/bin/env node
/**
 * Memory Evaluation CLI - SDK Integration Tests
 *
 * Usage:
 *   pnpm eval:memory              # Quick mode: Run with cached embeddings (no API)
 *   pnpm eval:memory --full       # Full mode: Generate fresh embeddings via API
 *   pnpm eval:memory --json       # Output as JSON
 *   pnpm eval:memory --verbose    # Show detailed results
 */

import "dotenv/config";
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { loadFixtures, runQuickEval, runFullEval } from "./eval/runner.js";
import { printSummary, printJson } from "./eval/reporters/console.js";
import type { EvalOptions, EvaluationSummary } from "./eval/types.js";

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
Memory Evaluation Framework - SDK Integration Tests

Usage:
  pnpm eval:memory [options]

Options:
  --full               Generate fresh embeddings via Portal API (requires PORTAL_API_KEY)
  --json               Output results as JSON
  --verbose            Show detailed per-test results
  --output <path>      Write results to file
  --help               Show this help message

Examples:
  pnpm eval:memory                    # Quick: Use cached embeddings (default)
  pnpm eval:memory --full             # Full: Generate fresh embeddings via API
  pnpm eval:memory --json             # Output as JSON
  pnpm eval:memory --verbose          # Show detailed results
  pnpm eval:memory --full --json      # Full mode with JSON output

Environment Variables (for --full mode):
  PORTAL_API_KEY       Required for embedding generation
  REVERBIA_API_URL     Optional: Override API URL (defaults to production)

What This Tests:
  - SDK's searchSimilarMemoriesOp() function
  - WatermelonDB memory operations (save, search, retrieve)
  - SDK's cosineSimilarity calculation
  - Full integration stack (database + search + retrieval)
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
    // Load fixtures
    const fixtures = await loadFixtures();

    let summary: EvaluationSummary;

    if (args.full) {
      // Full mode: Generate fresh embeddings via API
      console.log("Running full SDK integration tests (generating embeddings via API)...\n");
      summary = await runFullEval(fixtures, options);
    } else {
      // Quick mode: Use cached embeddings
      if (Object.keys(fixtures.embeddings).length === 0) {
        throw new Error(
          "No cached embeddings found. Run with --full to generate embeddings first."
        );
      }
      console.log("Running SDK integration tests (using cached embeddings)...\n");
      summary = await runQuickEval(fixtures, options);
    }

    // Output results
    if (options.json) {
      printJson(summary);
    } else {
      printSummary(summary);
    }

    // Write to file if requested
    if (options.output) {
      const content = JSON.stringify(summary, null, 2);
      await writeFile(options.output, content);
      console.log(`\nResults written to ${options.output}`);
    }

    // Force exit (WatermelonDB keeps process alive)
    process.exit(process.exitCode || 0);
  } catch (error) {
    console.error("Evaluation failed:", error);
    process.exit(1);
  }
}

main();
