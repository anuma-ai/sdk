#!/usr/bin/env tsx
/**
 * Diff two app-gen benchmark runs.
 *
 * Each benchmark in `test/tools/app-generation/` writes a `metrics.json`
 * to its `.output/{bench}/` directory and appends a copy to
 * `.output/{bench}/.history/`. This script renders a side-by-side diff
 * between two such runs so you can see how a prompt change, tool tweak,
 * or model swap shifted the numbers.
 *
 * Usage:
 *   pnpm tsx scripts/compare-app-gen-runs.ts <benchmark>
 *     # Compares the latest metrics.json against the previous run from
 *     # .output/<benchmark>/.history/.
 *
 *   pnpm tsx scripts/compare-app-gen-runs.ts <path/to/before.json> <path/to/after.json>
 *     # Compares two explicit metrics files.
 *
 * Exits non-zero when the benchmark or files can't be located.
 */

import fs from "node:fs";
import path from "node:path";

import { compareRuns, type RunRecord } from "../src/tools/appGenMetrics.js";

const OUTPUT_ROOT = path.resolve(__dirname, "..", "test", "tools", "app-generation", ".output");

function readRun(p: string): RunRecord {
  if (!fs.existsSync(p)) {
    console.error(`error: file not found: ${p}`);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(p, "utf-8")) as RunRecord;
}

function resolveBenchmark(name: string): { before: RunRecord; after: RunRecord } {
  const benchDir = path.join(OUTPUT_ROOT, name);
  const latest = path.join(benchDir, "metrics.json");
  const historyDir = path.join(benchDir, ".history");
  if (!fs.existsSync(latest)) {
    console.error(`error: no metrics.json under ${path.relative(process.cwd(), benchDir)}`);
    console.error(`hint: run the benchmark first to produce a baseline`);
    process.exit(2);
  }
  if (!fs.existsSync(historyDir)) {
    console.error(`error: no .history/ under ${path.relative(process.cwd(), benchDir)}`);
    process.exit(2);
  }
  const after = readRun(latest);
  const priors = fs
    .readdirSync(historyDir)
    .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
    .sort();
  // The newest history file is a copy of the latest run; we want the one
  // before that.
  if (priors.length < 2) {
    console.error(
      `error: need at least two runs to compare; ${priors.length} found in ${path.relative(process.cwd(), historyDir)}`
    );
    process.exit(2);
  }
  const previous = priors[priors.length - 2]!;
  const before = readRun(path.join(historyDir, previous));
  return { before, after };
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(
      [
        "Usage:",
        "  pnpm tsx scripts/compare-app-gen-runs.ts <benchmark>",
        "  pnpm tsx scripts/compare-app-gen-runs.ts <before.json> <after.json>",
        "",
        "Benchmarks: kanban, flashcards-ai, photo-gallery, precision-updates, app-generation",
      ].join("\n")
    );
    process.exit(args.length === 0 ? 1 : 0);
  }

  let before: RunRecord;
  let after: RunRecord;
  if (args.length === 1) {
    ({ before, after } = resolveBenchmark(args[0]!));
  } else if (args.length === 2) {
    before = readRun(args[0]!);
    after = readRun(args[1]!);
  } else {
    console.error("error: pass either a benchmark name or two metrics file paths");
    process.exit(1);
  }

  console.log(compareRuns(before, after));
}

main();
