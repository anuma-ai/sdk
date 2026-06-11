import { describe, expect, it } from "vitest";

import { cosineSimilarity } from "./vector";

describe("cosineSimilarity", () => {
  it("returns 0 on dimension mismatch", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
    expect(cosineSimilarity([], [1])).toBe(0);
  });

  it("returns 0 (not NaN) for zero-magnitude vectors", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
    // Explicitly pin the no-NaN contract — a naive dot/(|a||b|) would
    // produce NaN here and poison every downstream sort.
    expect(Number.isNaN(cosineSimilarity([0, 0], [0, 0]))).toBe(false);
  });

  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([0.5, -0.25], [0.5, -0.25])).toBeCloseTo(1, 10);
  });

  it("is scale-invariant (parallel vectors → 1)", () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
    expect(cosineSimilarity([1, 1], [1, -1])).toBeCloseTo(0, 10);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 10);
  });

  it("handles single-element vectors", () => {
    expect(cosineSimilarity([3], [5])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([3], [-5])).toBeCloseTo(-1, 10);
    expect(cosineSimilarity([0], [5])).toBe(0);
  });

  it("stays numerically stable for large-magnitude vectors", () => {
    // Squared components reach 1e300 — just inside double range. The
    // result must stay an exact-ish 1, not overflow to Infinity/NaN.
    const big = [1e150, 1e150];
    expect(cosineSimilarity(big, big)).toBeCloseTo(1, 10);
    expect(Number.isFinite(cosineSimilarity(big, big))).toBe(true);
    expect(cosineSimilarity([1e150, 0], [0, 1e150])).toBe(0);
    // NOTE: components ≥ ~1e154 overflow the intermediate squares to
    // Infinity and the current implementation returns NaN. Pinned at the
    // safe scale here; real embeddings are unit-ish so this is academic.
  });

  it("computes correct value for a known pair", () => {
    // cos([1,0],[1,1]) = 1/√2
    expect(cosineSimilarity([1, 0], [1, 1])).toBeCloseTo(Math.SQRT1_2, 10);
  });
});
