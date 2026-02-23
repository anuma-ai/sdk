/**
 * LongMemEval Results Reporter
 */

import type { LongMemEvalSummary, LongMemEvalQuestionType } from "./types.js";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
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
  return (value * 100).toFixed(1) + "%";
}

const QUESTION_TYPE_LABELS: Record<LongMemEvalQuestionType, string> = {
  "single-session-user": "Single-Session (User)",
  "single-session-assistant": "Single-Session (Asst)",
  "single-session-preference": "Single-Session (Pref)",
  "temporal-reasoning": "Temporal Reasoning",
  "knowledge-update": "Knowledge Update",
  "multi-session": "Multi-Session",
};

export function printLongMemEvalSummary(summary: LongMemEvalSummary): void {
  console.log();
  console.log(color("LongMemEval Benchmark Results", COLORS.bold, COLORS.cyan));
  console.log("═".repeat(70));
  console.log();

  console.log(
    color(`Dataset: ${summary.datasetName}`, COLORS.dim) +
      "  " +
      color(`Time: ${summary.timestamp}`, COLORS.dim)
  );
  console.log();

  // Overall accuracy
  console.log(color("Overall Accuracy", COLORS.bold));
  console.log("─".repeat(70));
  const accColor = summary.accuracy >= 0.5 ? COLORS.green : COLORS.red;
  console.log(
    `  Accuracy:`.padEnd(20) +
      color(formatPercent(summary.accuracy), accColor) +
      `  ${progressBar(summary.accuracy)}`
  );
  console.log(`  Correct:`.padEnd(20) + `${summary.correctAnswers}/${summary.totalQuestions}`);
  console.log();

  // By question type
  console.log(color("By Question Type", COLORS.bold));
  console.log("─".repeat(70));

  const typeOrder: LongMemEvalQuestionType[] = [
    "single-session-user",
    "single-session-assistant",
    "single-session-preference",
    "multi-session",
    "temporal-reasoning",
    "knowledge-update",
  ];

  for (const type of typeOrder) {
    const stats = summary.byQuestionType[type];
    if (!stats || stats.total === 0) continue;

    const label = QUESTION_TYPE_LABELS[type];
    const typeAccColor = stats.accuracy >= 0.5 ? COLORS.green : COLORS.red;
    const isUnsupported = type === "temporal-reasoning" || type === "knowledge-update";

    console.log(
      `  ${label}:`.padEnd(30) +
        color(formatPercent(stats.accuracy), typeAccColor).padStart(8) +
        `  ${stats.correct}/${stats.total}`.padStart(10) +
        (isUnsupported ? color("  (unsupported)", COLORS.yellow) : "")
    );
  }
  console.log();

  // Retrieval metrics
  console.log(color("Retrieval Quality", COLORS.bold));
  console.log("─".repeat(70));
  console.log(`  Avg Precision:`.padEnd(20) + formatPercent(summary.retrieval.avgPrecision));
  console.log(`  Avg Recall:`.padEnd(20) + formatPercent(summary.retrieval.avgRecall));
  console.log();

  // Latency
  console.log(color("Latency (per question)", COLORS.bold));
  console.log("─".repeat(70));
  console.log(
    `  Mean:`.padEnd(12) +
      `${summary.latency.mean.toFixed(0)}ms`.padStart(10) +
      `    p50: ${summary.latency.p50.toFixed(0)}ms`
  );
  console.log(
    `  p95:`.padEnd(12) +
      `${summary.latency.p95.toFixed(0)}ms`.padStart(10) +
      `    p99: ${summary.latency.p99.toFixed(0)}ms`
  );
  console.log();

  console.log("═".repeat(70));
}

export function printLongMemEvalJson(summary: LongMemEvalSummary): void {
  console.log(JSON.stringify(summary, null, 2));
}
