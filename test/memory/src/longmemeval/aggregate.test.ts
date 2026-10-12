import { describe, expect, it } from "vitest";
import { aggregateSummary } from "./aggregate.js";
import type { LongMemEvalOptions, LongMemEvalResult } from "./types.js";

const OPTIONS = { variant: "s" } as unknown as LongMemEvalOptions;

function result(over: Partial<LongMemEvalResult> = {}): LongMemEvalResult {
  return {
    questionId: "q",
    questionType: "single-session-user",
    question: "q?",
    expectedAnswer: "a",
    generatedAnswer: "a",
    isCorrect: true,
    retrievedSessionIds: ["s1"],
    expectedSessionIds: ["s1"],
    retrievalPrecision: 1,
    retrievalRecall: 1,
    latencyMs: 100,
    tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, embeddingTokens: 2 },
    strategy: "memory-vault",
    ...over,
  } as LongMemEvalResult;
}

function crashed(over: Partial<LongMemEvalResult> = {}): LongMemEvalResult {
  return result({
    isCorrect: false,
    generatedAnswer: "",
    harnessError: "Error: boom",
    retrievedSessionIds: [],
    retrievalPrecision: 0,
    retrievalRecall: 0,
    latencyMs: 0,
    tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, embeddingTokens: 0 },
    ...over,
  });
}

const aggregate = (results: LongMemEvalResult[]) =>
  aggregateSummary(results, OPTIONS, "memory-vault");

describe("retrieval averages exclude crashed entries", () => {
  it("does not let a crash drag retrieval down for a question it never measured", () => {
    const summary = aggregate([result(), result(), result(), result(), crashed()]);

    expect(summary.retrieval.avgPrecision).toBe(1);
    expect(summary.retrieval.avgRecall).toBe(1);
    expect(summary.retrieval.measuredQuestions).toBe(4);
    expect(summary.harnessFailures).toBe(1);
    expect(summary.totalQuestions).toBe(5);
  });

  it("keeps a measured zero in the average — only fabricated zeros are dropped", () => {
    const summary = aggregate([
      result(),
      result({ retrievalPrecision: 0, retrievalRecall: 0, retrievedSessionIds: [] }),
    ]);

    expect(summary.retrieval.avgPrecision).toBe(0.5);
    expect(summary.retrieval.avgRecall).toBe(0.5);
    expect(summary.retrieval.measuredQuestions).toBe(2);
    expect(summary.harnessFailures).toBe(0);
  });

  it("holds the retrieval figure steady as crashes accumulate around it", () => {
    const measured = [result({ retrievalPrecision: 0.5, retrievalRecall: 0.5 }), result()];
    const withCrashes = (n: number) => [...measured, ...Array.from({ length: n }, () => crashed())];

    for (const n of [0, 1, 10]) {
      const summary = aggregate(withCrashes(n));
      expect(summary.retrieval.avgPrecision).toBeCloseTo(0.75, 10);
      expect(summary.retrieval.avgRecall).toBeCloseTo(0.75, 10);
      expect(summary.retrieval.measuredQuestions).toBe(2);
    }
  });

  it("reports zero retrieval and a zero denominator when every entry crashed", () => {
    const summary = aggregate([crashed(), crashed()]);

    expect(summary.retrieval.avgPrecision).toBe(0);
    expect(summary.retrieval.avgRecall).toBe(0);
    expect(summary.retrieval.measuredQuestions).toBe(0);
    expect(summary.harnessFailures).toBe(2);
  });

  it("emits no NaN on an empty run", () => {
    const summary = aggregate([]);

    expect(summary.retrieval.avgPrecision).toBe(0);
    expect(summary.retrieval.avgRecall).toBe(0);
    expect(summary.retrieval.measuredQuestions).toBe(0);
    expect(summary.latency.mean).not.toBeNaN();
  });

  it("keeps measuredQuestions equal to totalQuestions minus harnessFailures", () => {
    const summary = aggregate([result(), result(), crashed(), crashed(), crashed()]);

    expect(summary.retrieval.measuredQuestions).toBe(
      summary.totalQuestions - summary.harnessFailures
    );
  });
});

describe("latency percentiles exclude crashed entries", () => {
  it("does not let zeroed placeholder latencies make the run look faster", () => {
    const summary = aggregate([
      result({ latencyMs: 100 }),
      result({ latencyMs: 100 }),
      result({ latencyMs: 100 }),
      crashed(),
      crashed(),
      crashed(),
    ]);

    expect(summary.latency.mean).toBe(100);
    expect(summary.latency.p50).toBe(100);
  });

  it("still reports a genuinely fast question", () => {
    const summary = aggregate([result({ latencyMs: 0 }), result({ latencyMs: 0 })]);

    expect(summary.latency.mean).toBe(0);
  });
});

describe("counts and totals still cover the whole run", () => {
  it("counts a crashed entry as a question and as a harness failure, not as a miss", () => {
    const summary = aggregate([result(), crashed()]);

    expect(summary.totalQuestions).toBe(2);
    expect(summary.harnessFailures).toBe(1);
    expect(summary.accuracy).toBe(1);
    expect(summary.correctAnswers).toBe(1);
  });

  it("sums token usage over every entry, crashed included", () => {
    const summary = aggregate([result(), result(), crashed()]);

    expect(summary.tokenUsage.promptTokens).toBe(20);
    expect(summary.tokenUsage.embeddingTokens).toBe(4);
  });

  it("excludes a crashed entry from its question type's accuracy too", () => {
    const summary = aggregate([
      result({ questionType: "multi-session" }),
      crashed({ questionType: "multi-session" }),
    ]);

    const bucket = summary.byQuestionType["multi-session"];
    expect(bucket.total).toBe(2);
    expect(bucket.harnessFailures).toBe(1);
    expect(bucket.accuracy).toBe(1);
  });
});
