/**
 * The rule under test: a harness crash must never move an AVERAGE.
 *
 * `suite.ts`'s per-entry catch fabricates a placeholder for an entry that threw
 * outside the answer and judge steps — retrieval 0/0 and latency 0 for a
 * question where none of the three was measured. #786 took those entries out of
 * the accuracy denominator; these tests cover the other half (#789), where the
 * same placeholder was still being averaged into retrieval and latency.
 *
 * This is not cosmetic. The #772 recall gate reads `retrieval.avgRecall` and
 * `retrieval.avgPrecision` at an 8pp tolerance, so with the crashed entries in
 * the denominator five crashes in a 50-question run fire the gate on their own —
 * reported as "retrieval regressed", pointing the author at a diff that never
 * touched ranking.
 */

import { describe, expect, it } from "vitest";
import { aggregateSummary } from "./aggregate.js";
import type { LongMemEvalOptions, LongMemEvalResult } from "./types.js";

const OPTIONS = { variant: "s" } as unknown as LongMemEvalOptions;

/** A healthy, fully-measured result. Overrides carry the case under test. */
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

/** The placeholder the per-entry catch writes: every measured field zeroed. */
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
    // Four perfect retrievals and one crash. Averaged over all five this reads
    // 80%; over the four that were measured it reads 100%, which is what the
    // run actually observed.
    const summary = aggregate([result(), result(), result(), result(), crashed()]);

    expect(summary.retrieval.avgPrecision).toBe(1);
    expect(summary.retrieval.avgRecall).toBe(1);
    expect(summary.retrieval.measuredQuestions).toBe(4);
    // The crash is still reported — excluded from the average, not from the run.
    expect(summary.harnessFailures).toBe(1);
    expect(summary.totalQuestions).toBe(5);
  });

  it("keeps a measured zero in the average — only fabricated zeros are dropped", () => {
    // A question where ranking genuinely retrieved nothing is a real reading and
    // must still count, or the fix would paper over the regressions the gate
    // exists to catch.
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
    // The gate compares one run against a baseline, so what matters is that the
    // number does not move with the crash count. Same four measured entries,
    // three different crash counts, one answer.
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
    // Distinguishable from "ranking returned nothing on every question", which
    // reads the same 0/0 but with a nonzero denominator. assertRetrievalHappened
    // splits the two on exactly this field.
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
    // Three real 100ms questions plus three crashes at 0ms. Over all six the
    // mean is 50ms and p50 collapses toward 0 — a speedup that never happened.
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
    // Guards the inverse of the above: the filter keys on harnessError, not on
    // latencyMs being zero, so a real sub-millisecond reading survives.
    const summary = aggregate([result({ latencyMs: 0 }), result({ latencyMs: 0 })]);

    expect(summary.latency.mean).toBe(0);
  });
});

describe("counts and totals still cover the whole run", () => {
  it("counts a crashed entry as a question and as a harness failure, not as a miss", () => {
    const summary = aggregate([result(), crashed()]);

    expect(summary.totalQuestions).toBe(2);
    expect(summary.harnessFailures).toBe(1);
    // One correct answer over the one question that was scored.
    expect(summary.accuracy).toBe(1);
    expect(summary.correctAnswers).toBe(1);
  });

  it("sums token usage over every entry, crashed included", () => {
    // A sum is not an average: the placeholder's zeros are additive-identity, so
    // including them cannot bias the total the way it biases a mean.
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
