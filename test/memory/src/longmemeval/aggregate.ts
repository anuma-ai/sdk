import type {
  LongMemEvalOptions,
  LongMemEvalQuestionType,
  LongMemEvalResult,
  LongMemEvalSummary,
} from "./types.js";
import { calculatePercentiles } from "../metrics.js";
import { summarizeJudgment } from "./judge.js";

const QUESTION_TYPES: readonly LongMemEvalQuestionType[] = [
  "single-session-user",
  "single-session-assistant",
  "single-session-preference",
  "temporal-reasoning",
  "knowledge-update",
  "multi-session",
];

export function aggregateSummary(
  results: LongMemEvalResult[],
  options: LongMemEvalOptions,
  strategy: "memory-engine" | "memory-vault" | "memory-recall" | "memory-ensemble"
): LongMemEvalSummary {
  const measured = results.filter((r) => r.harnessError === undefined);

  const byQuestionType: LongMemEvalSummary["byQuestionType"] =
    {} as LongMemEvalSummary["byQuestionType"];
  for (const type of QUESTION_TYPES) {
    const typeResults = results.filter((r) => r.questionType === type);
    if (typeResults.length > 0) {
      const tally = summarizeJudgment(typeResults);
      byQuestionType[type] = {
        total: tally.total,
        correct: tally.correct,
        judgeFailures: tally.judgeFailures,
        answerFailures: tally.answerFailures,
        harnessFailures: tally.harnessFailures,
        accuracy: tally.accuracy,
      };
    }
  }

  const latencyStats = calculatePercentiles(measured.map((r) => r.latencyMs));
  const overall = summarizeJudgment(results);

  const totalTokenUsage = results.reduce(
    (acc, r) => ({
      promptTokens: acc.promptTokens + r.tokenUsage.promptTokens,
      completionTokens: acc.completionTokens + r.tokenUsage.completionTokens,
      totalTokens: acc.totalTokens + r.tokenUsage.totalTokens,
      embeddingTokens: acc.embeddingTokens + r.tokenUsage.embeddingTokens,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0, embeddingTokens: 0 }
  );

  return {
    timestamp: new Date().toISOString(),
    datasetName: `longmemeval_${options.variant}_${strategy}`,
    strategy,
    totalQuestions: overall.total,
    correctAnswers: overall.correct,
    judgeFailures: overall.judgeFailures,
    answerFailures: overall.answerFailures,
    harnessFailures: overall.harnessFailures,
    accuracy: overall.accuracy,
    byQuestionType,
    retrieval: {
      avgPrecision:
        measured.length > 0
          ? measured.reduce((sum, r) => sum + r.retrievalPrecision, 0) / measured.length
          : 0,
      avgRecall:
        measured.length > 0
          ? measured.reduce((sum, r) => sum + r.retrievalRecall, 0) / measured.length
          : 0,
      measuredQuestions: measured.length,
    },
    latency: {
      p50: latencyStats.p50,
      p95: latencyStats.p95,
      p99: latencyStats.p99,
      mean: latencyStats.mean,
    },
    tokenUsage: totalTokenUsage,
    results: options.verbose ? results : [],
  };
}
