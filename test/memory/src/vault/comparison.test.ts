// Unit tests for the `--compare` pairing core — the silent-skip branches
// rutwik2001 flagged as untested (no prior per-query data, no overlap,
// malformed prior rows). No API key / network needed.
import { describe, expect, it } from "vitest";

import { pairForComparison, type PairableRow, type PriorRow } from "./comparison";

const cur = (query: string, recall: number, ndcg: number): PairableRow => ({ query, recall, ndcg });

describe("pairForComparison", () => {
  it("reports no-prior-data when the prior run has no per-query rows", () => {
    const result = pairForComparison([cur("q1", 1, 1)], []);
    expect(result).toEqual({ status: "no-prior-data" });
  });

  it("reports no-overlap when no query text matches", () => {
    const prior: PriorRow[] = [{ query: "other", recall: 0.5, ndcg: 0.5 }];
    const result = pairForComparison([cur("q1", 1, 1), cur("q2", 1, 1)], prior);
    expect(result).toEqual({ status: "no-overlap", priorCount: 1, currentCount: 2 });
  });

  it("pairs overlapping queries by text and preserves order", () => {
    const prior: PriorRow[] = [
      { query: "q1", recall: 0.4, ndcg: 0.3 },
      { query: "q2", recall: 0.6, ndcg: 0.7 },
    ];
    const result = pairForComparison([cur("q1", 0.5, 0.5), cur("q2", 0.8, 0.9)], prior);
    expect(result).toMatchObject({
      status: "paired",
      curRecall: [0.5, 0.8],
      baseRecall: [0.4, 0.6],
      curNdcg: [0.5, 0.9],
      baseNdcg: [0.3, 0.7],
      malformed: 0,
    });
  });

  it("skips prior rows with missing/non-numeric recall or ndcg and counts them", () => {
    const prior: PriorRow[] = [
      { query: "good", recall: 0.4, ndcg: 0.3 },
      { query: "no-ndcg", recall: 0.5 }, // ndcg undefined
      { query: "nan-recall", recall: NaN, ndcg: 0.5 },
      { query: "string", recall: "0.5", ndcg: 0.5 }, // wrong type
    ];
    const current = [
      cur("good", 0.9, 0.9),
      cur("no-ndcg", 0.9, 0.9),
      cur("nan-recall", 0.9, 0.9),
      cur("string", 0.9, 0.9),
    ];
    const result = pairForComparison(current, prior);
    expect(result).toMatchObject({
      status: "paired",
      curRecall: [0.9], // only "good" survived
      baseRecall: [0.4],
      malformed: 3,
    });
  });

  it("reports no-overlap when every overlapping prior row is malformed", () => {
    const prior: PriorRow[] = [{ query: "q1", recall: undefined, ndcg: undefined }];
    const result = pairForComparison([cur("q1", 0.9, 0.9)], prior);
    expect(result).toEqual({ status: "no-overlap", priorCount: 1, currentCount: 1 });
  });

  it("only pairs the shared subset when query sets partially overlap", () => {
    const prior: PriorRow[] = [
      { query: "shared", recall: 0.4, ndcg: 0.4 },
      { query: "prior-only", recall: 0.5, ndcg: 0.5 },
    ];
    const result = pairForComparison(
      [cur("shared", 0.9, 0.9), cur("current-only", 0.8, 0.8)],
      prior
    );
    expect(result).toMatchObject({ status: "paired", curRecall: [0.9], baseRecall: [0.4] });
  });
});
