#!/usr/bin/env node
/**
 * Memory Evaluation CLI
 *
 * Usage:
 *   pnpm eval:memory              # Run all tests (quick mode)
 *   pnpm eval:memory --full       # Run with API calls to generate embeddings
 *   pnpm eval:memory --suite retrieval
 *   pnpm eval:memory --compare-baseline
 *   pnpm eval:memory --json
 */

import "dotenv/config";
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import {
  loadFixtures,
  runQuickEval,
  runFullEval,
  runSDKEval,
  loadBaseline,
  saveBaseline,
  compareResults,
} from "./eval/runner.js";
import {
  printSummary,
  printComparison,
  printJson,
  printMarkdown,
} from "./eval/reporters/console.js";
import type { EvalOptions } from "./eval/types.js";

const { values: args } = parseArgs({
  options: {
    quick: { type: "boolean", default: false },
    full: { type: "boolean", default: false },
    sdk: { type: "boolean", default: false },
    suite: { type: "string", default: "all" },
    "compare-baseline": { type: "boolean", default: false },
    "update-baseline": { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    markdown: { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
    output: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

function printHelp(): void {
  console.log(`
Memory Evaluation Framework

Usage:
  pnpm eval:memory [options]

Options:
  --quick              Use cached embeddings (algorithm tests)
  --full               Regenerate embeddings via Reverbia API (algorithm tests)
  --sdk                Test the SDK implementation with cached embeddings
  --suite <name>       Run specific suite: all, retrieval, extraction, latency
  --compare-baseline   Compare results against saved baseline
  --update-baseline    Save current results as new baseline
  --json               Output results as JSON
  --markdown           Output results as Markdown
  --verbose            Show detailed per-test results
  --output <path>      Write results to file
  --help               Show this help message

Environment Variables (for --full mode):
  REVERBIA_API_KEY     API key for authentication (required for --full)
  REVERBIA_API_URL     API base URL (default: https://ai-portal-dev.zetachain.com)

Examples:
  pnpm eval:memory                    # Quick evaluation (cached embeddings)
  pnpm eval:memory --full             # Full evaluation with API
  pnpm eval:memory --sdk              # Test SDK implementation
  pnpm eval:memory --compare-baseline # Compare with baseline
  pnpm eval:memory --json > results.json

  # With API authentication:
  export REVERBIA_API_KEY=your-api-key
  pnpm eval:memory --full
`);
}

async function main(): Promise<void> {
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const options: Partial<EvalOptions> = {
    quick: args.quick,
    full: args.full,
    sdk: args.sdk,
    suite: args.suite as EvalOptions["suite"],
    compareBaseline: args["compare-baseline"],
    updateBaseline: args["update-baseline"],
    json: args.json,
    markdown: args.markdown,
    verbose: args.verbose,
    output: args.output,
  };

  try {
    // Load fixtures
    const fixtures = await loadFixtures();

    // Check if we have embeddings for quick mode
    const hasEmbeddings = Object.keys(fixtures.embeddings).length > 0;

    // Determine run mode
    let summary: Awaited<ReturnType<typeof runFullEval>>;
    if (options.sdk) {
      console.log("Running SDK evaluation (testing SDK implementation)...");
      summary = await runSDKEval(fixtures, options);
    } else if (options.full) {
      console.log("Running full evaluation (generating embeddings via API)...");
      summary = await runFullEval(fixtures, options);
    } else if (hasEmbeddings) {
      console.log("Running quick evaluation (using cached embeddings)...");
      summary = await runQuickEval(fixtures, options);
    } else {
      console.log(
        "No cached embeddings found. Running full evaluation to generate them..."
      );
      summary = await runFullEval(fixtures, options);
    }

    // Output results
    if (options.json) {
      printJson(summary);
    } else if (options.markdown) {
      printMarkdown(summary);
    } else {
      printSummary(summary);
    }

    // Compare with baseline if requested
    if (options.compareBaseline) {
      const baseline = await loadBaseline();
      if (baseline) {
        const comparisons = compareResults(summary, baseline);
        if (!options.json && !options.markdown) {
          printComparison(comparisons);
        }

        // Check for regressions
        const degraded = comparisons.filter((c) => c.status === "degraded");
        if (degraded.length > 0) {
          process.exitCode = 1;
        }
      } else {
        console.log(
          "\nNo baseline found. Run with --update-baseline to create one."
        );
      }
    }

    // Update baseline if requested
    if (options.updateBaseline) {
      await saveBaseline(summary);
    }

    // Write to file if requested
    if (options.output) {
      const content = options.markdown
        ? generateMarkdownContent(summary)
        : JSON.stringify(summary, null, 2);
      await writeFile(options.output, content);
      console.log(`\nResults written to ${options.output}`);
    }

    // Force exit for SDK mode (WatermelonDB keeps process alive)
    if (options.sdk) {
      process.exit(process.exitCode || 0);
    }
  } catch (error) {
    console.error("Evaluation failed:", error);
    process.exit(1);
  }
}

function generateMarkdownContent(
  summary: Parameters<typeof printMarkdown>[0]
): string {
  const lines: string[] = [];

  lines.push("# Memory Evaluation Results\n");
  lines.push(`**Mode:** ${summary.mode}`);
  lines.push(`**Timestamp:** ${summary.timestamp}\n`);

  lines.push("## Overall\n");
  lines.push(`- Total: ${summary.totalInstances} instances`);
  lines.push(`- Passed: ${summary.passedInstances}`);
  lines.push(`- Failed: ${summary.failedInstances}\n`);

  lines.push("## Retrieval Metrics\n");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");

  for (const [k, v] of Object.entries(summary.retrieval.precisionAtK)) {
    lines.push(`| Precision@${k} | ${v.toFixed(4)} |`);
  }
  for (const [k, v] of Object.entries(summary.retrieval.recallAtK)) {
    lines.push(`| Recall@${k} | ${v.toFixed(4)} |`);
  }
  lines.push(`| MRR | ${summary.retrieval.mrr.toFixed(4)} |`);
  for (const [k, v] of Object.entries(summary.retrieval.ndcgAtK)) {
    lines.push(`| NDCG@${k} | ${v.toFixed(4)} |`);
  }

  return lines.join("\n");
}

main();
