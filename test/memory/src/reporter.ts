/**
 * Console reporter - terminal output formatting
 */

import type { EvaluationSummary, ComparisonResult } from "./types.js";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function color(text: string, ...codes: string[]): string {
  if (!process.stdout.isTTY) return text;
  return codes.join("") + text + COLORS.reset;
}

function progressBar(value: number, width: number = 20): string {
  const filled = Math.round(value * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(2) + "%";
}

function formatMetric(value: number, decimals: number = 4): string {
  return value.toFixed(decimals);
}

export function printSummary(summary: EvaluationSummary): void {
  console.log();
  console.log(color("Memory Evaluation Results", COLORS.bold, COLORS.cyan));
  console.log("═".repeat(65));
  console.log();

  console.log(color(`Mode: ${summary.mode}`, COLORS.dim) + "  " + color(`Time: ${summary.timestamp}`, COLORS.dim));
  console.log();

  console.log(color("Overall", COLORS.bold));
  console.log("─".repeat(65));
  console.log(`  Total:   ${summary.totalInstances} instances`);
  console.log(`  Passed:  ${color(String(summary.passedInstances), COLORS.green)} (${formatPercent(summary.passedInstances / summary.totalInstances)})`);
  console.log(`  Failed:  ${color(String(summary.failedInstances), summary.failedInstances > 0 ? COLORS.red : COLORS.dim)}`);
  console.log();

  console.log(color("Retrieval Accuracy", COLORS.bold));
  console.log("─".repeat(65));

  const precisionKeys = Object.keys(summary.retrieval.precisionAtK).map(Number).sort((a, b) => a - b);
  for (const k of precisionKeys) {
    const p = summary.retrieval.precisionAtK[k] || 0;
    console.log(`  Precision@${k}:`.padEnd(16) + formatMetric(p).padStart(8) + "  " + progressBar(p));
  }
  console.log();

  const recallKeys = Object.keys(summary.retrieval.recallAtK).map(Number).sort((a, b) => a - b);
  for (const k of recallKeys) {
    const r = summary.retrieval.recallAtK[k] || 0;
    console.log(`  Recall@${k}:`.padEnd(16) + formatMetric(r).padStart(8) + "  " + progressBar(r));
  }
  console.log();

  console.log(`  MRR:`.padEnd(16) + formatMetric(summary.retrieval.mrr).padStart(8));

  const ndcgKeys = Object.keys(summary.retrieval.ndcgAtK).map(Number).sort((a, b) => a - b);
  for (const k of ndcgKeys) {
    const n = summary.retrieval.ndcgAtK[k] || 0;
    console.log(`  NDCG@${k}:`.padEnd(16) + formatMetric(n).padStart(8));
  }
  console.log();

  console.log(color("Latency (p50 / p95 / p99)", COLORS.bold));
  console.log("─".repeat(65));
  const search = summary.latency.searchTimeMs;
  console.log(`  Search:`.padEnd(16) + `${search.p50.toFixed(1)}ms / ${search.p95.toFixed(1)}ms / ${search.p99.toFixed(1)}ms`);
  console.log();

  if (Object.keys(summary.byDifficulty).length > 0) {
    console.log(color("By Difficulty", COLORS.bold));
    console.log("─".repeat(65));
    for (const [diff, stats] of Object.entries(summary.byDifficulty)) {
      const rate = stats.passed / stats.total;
      console.log(`  ${diff}:`.padEnd(16) + `${stats.passed}/${stats.total}`.padStart(8) + `  (${formatPercent(rate)})`);
    }
    console.log();
  }

  console.log("═".repeat(65));
}

export function printJson(summary: EvaluationSummary): void {
  console.log(JSON.stringify(summary, null, 2));
}
