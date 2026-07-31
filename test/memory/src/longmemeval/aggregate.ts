/**
 * Run-level aggregation for LongMemEval — per-question results in, one
 * `LongMemEvalSummary` out.
 *
 * Split out of `suite.ts` so it can be tested. `suite.ts` imports WatermelonDB,
 * a Loki adapter and all four strategy modules at load time, which puts it out
 * of reach of the fast unit suite; the arithmetic here has no dependencies
 * beyond the judge tally and the percentile helper, and it is the arithmetic
 * that decides whether a gate fires. See `aggregate.test.ts`.
 *
 * The one rule this module exists to enforce: an entry that crashed in the
 * harness contributes to COUNTS but never to an AVERAGE. `suite.ts`'s per-entry
 * catch fabricates a placeholder result whose retrieval scores and latency are
 * zero — values that were never observed — and `harnessError` is the only field
 * that distinguishes those zeros from measured ones.
 */

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
  // An entry that crashed outside the answer and judge steps carries a
  // fabricated placeholder, not a reading: the per-entry catch in runLongMemEval
  // writes retrievalPrecision 0, retrievalRecall 0 and latencyMs 0 for a
  // question where none of the three was ever observed. `harnessError` is the
  // only thing that separates a fabricated zero from a measured one, so every
  // AVERAGE below runs over `measured` and never over `results`.
  //
  // Averaging the placeholders in is not a rounding difference. The recall gate
  // reads avgRecall and avgPrecision at an 8pp tolerance, so each crash in a
  // 50-question run drags both down 2pp on its own — five of them fire the gate
  // outright, and it fires as "retrieval regressed" on a diff that never touched
  // ranking. Latency reads the other way: zeros pull p50/mean DOWN, so a
  // crash-heavy run looks FASTER than the code actually is.
  //
  // COUNTS (totalQuestions, harnessFailures) still run over `results` — a
  // crashed entry is a real entry and has to be reported as one. tokenUsage also
  // stays a full-set sum: it is a total rather than an average, so a zeroed
  // placeholder understates cost slightly but cannot bias a gate.
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
  // Accuracy is measured over the questions that were actually scored.
  // Questions the judge couldn't rule on, and questions the answer step never
  // produced an answer for, are surfaced as their own counts instead of being
  // folded in as misses — see summarizeJudgment.
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
