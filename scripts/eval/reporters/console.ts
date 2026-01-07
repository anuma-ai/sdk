/**
 * Console reporter - terminal output with formatting
 */

import type { EvaluationSummary, ComparisonResult } from "../types.js";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
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

  // Mode and timestamp
  console.log(
    color(`Mode: ${summary.mode}`, COLORS.dim) +
      "  " +
      color(`Time: ${summary.timestamp}`, COLORS.dim)
  );
  console.log();

  // Overall stats
  console.log(color("Overall", COLORS.bold));
  console.log("─".repeat(65));
  console.log(
    `  Total:   ${summary.totalInstances} instances`
  );
  console.log(
    `  Passed:  ${color(String(summary.passedInstances), COLORS.green)} (${formatPercent(summary.passedInstances / summary.totalInstances)})`
  );
  console.log(
    `  Failed:  ${color(String(summary.failedInstances), summary.failedInstances > 0 ? COLORS.red : COLORS.dim)}`
  );
  console.log();

  // Retrieval metrics
  console.log(color("Retrieval Accuracy", COLORS.bold));
  console.log("─".repeat(65));

  const precisionKeys = Object.keys(summary.retrieval.precisionAtK)
    .map(Number)
    .sort((a, b) => a - b);

  for (const k of precisionKeys) {
    const p = summary.retrieval.precisionAtK[k] || 0;
    console.log(
      `  Precision@${k}:`.padEnd(16) +
        formatMetric(p).padStart(8) +
        "  " +
        progressBar(p)
    );
  }

  console.log();

  const recallKeys = Object.keys(summary.retrieval.recallAtK)
    .map(Number)
    .sort((a, b) => a - b);

  for (const k of recallKeys) {
    const r = summary.retrieval.recallAtK[k] || 0;
    console.log(
      `  Recall@${k}:`.padEnd(16) +
        formatMetric(r).padStart(8) +
        "  " +
        progressBar(r)
    );
  }

  console.log();
  console.log(`  MRR:`.padEnd(16) + formatMetric(summary.retrieval.mrr).padStart(8));

  const ndcgKeys = Object.keys(summary.retrieval.ndcgAtK)
    .map(Number)
    .sort((a, b) => a - b);

  for (const k of ndcgKeys) {
    const n = summary.retrieval.ndcgAtK[k] || 0;
    console.log(`  NDCG@${k}:`.padEnd(16) + formatMetric(n).padStart(8));
  }

  console.log();

  // Latency
  console.log(color("Latency (p50 / p95 / p99)", COLORS.bold));
  console.log("─".repeat(65));
  const search = summary.latency.searchTimeMs;
  console.log(
    `  Search:`.padEnd(16) +
      `${search.p50.toFixed(1)}ms / ${search.p95.toFixed(1)}ms / ${search.p99.toFixed(1)}ms`
  );
  console.log();

  // By difficulty
  if (Object.keys(summary.byDifficulty).length > 0) {
    console.log(color("By Difficulty", COLORS.bold));
    console.log("─".repeat(65));
    for (const [diff, stats] of Object.entries(summary.byDifficulty)) {
      const rate = stats.passed / stats.total;
      console.log(
        `  ${diff}:`.padEnd(16) +
          `${stats.passed}/${stats.total}`.padStart(8) +
          `  (${formatPercent(rate)})`
      );
    }
    console.log();
  }

  console.log("═".repeat(65));
}

export function printComparison(comparisons: ComparisonResult[]): void {
  console.log();
  console.log(color("Comparison with Baseline", COLORS.bold, COLORS.cyan));
  console.log("─".repeat(65));

  for (const c of comparisons) {
    const arrow = "→";
    let statusIcon: string;
    let statusColor: string;

    switch (c.status) {
      case "improved":
        statusIcon = "↑";
        statusColor = COLORS.green;
        break;
      case "degraded":
        statusIcon = "↓";
        statusColor = COLORS.red;
        break;
      default:
        statusIcon = "=";
        statusColor = COLORS.dim;
    }

    const deltaStr =
      c.status === "unchanged"
        ? "(unchanged)"
        : `(${c.deltaPercent >= 0 ? "+" : ""}${c.deltaPercent.toFixed(1)}%)`;

    console.log(
      `  ${c.metric}:`.padEnd(16) +
        formatMetric(c.baseline).padStart(8) +
        ` ${arrow} ` +
        formatMetric(c.current).padStart(8) +
        "  " +
        color(`${statusIcon} ${deltaStr}`, statusColor)
    );
  }

  console.log();

  // Overall status
  const degraded = comparisons.filter((c) => c.status === "degraded");
  if (degraded.length === 0) {
    console.log(color("✓ All metrics within acceptable range", COLORS.green));
  } else {
    console.log(
      color(
        `✗ ${degraded.length} metric(s) degraded: ${degraded.map((c) => c.metric).join(", ")}`,
        COLORS.red
      )
    );
  }
}

export function printJson(summary: EvaluationSummary): void {
  console.log(JSON.stringify(summary, null, 2));
}

export function printMarkdown(summary: EvaluationSummary): void {
  console.log("# Memory Evaluation Results\n");
  console.log(`**Mode:** ${summary.mode}`);
  console.log(`**Timestamp:** ${summary.timestamp}\n`);

  console.log("## Overall\n");
  console.log(`- Total: ${summary.totalInstances} instances`);
  console.log(`- Passed: ${summary.passedInstances}`);
  console.log(`- Failed: ${summary.failedInstances}\n`);

  console.log("## Retrieval Metrics\n");
  console.log("| Metric | Value |");
  console.log("|--------|-------|");

  for (const [k, v] of Object.entries(summary.retrieval.precisionAtK)) {
    console.log(`| Precision@${k} | ${formatMetric(v)} |`);
  }
  for (const [k, v] of Object.entries(summary.retrieval.recallAtK)) {
    console.log(`| Recall@${k} | ${formatMetric(v)} |`);
  }
  console.log(`| MRR | ${formatMetric(summary.retrieval.mrr)} |`);
  for (const [k, v] of Object.entries(summary.retrieval.ndcgAtK)) {
    console.log(`| NDCG@${k} | ${formatMetric(v)} |`);
  }

  console.log("\n## Latency\n");
  console.log("| Metric | p50 | p95 | p99 |");
  console.log("|--------|-----|-----|-----|");
  const s = summary.latency.searchTimeMs;
  console.log(
    `| Search | ${s.p50.toFixed(1)}ms | ${s.p95.toFixed(1)}ms | ${s.p99.toFixed(1)}ms |`
  );
}
