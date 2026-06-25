import { describe, expect, it } from "vitest";

import { applyMMR } from "./mmr.js";

const dim = 4;
function emb(weights: Record<number, number>): number[] {
  const v = new Array(dim).fill(0);
  for (const [k, w] of Object.entries(weights)) v[Number(k)] = w;
  const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

describe("applyMMR", () => {
  it("returns empty for empty candidates", () => {
    expect(applyMMR([], 5)).toEqual([]);
  });

  it("returns empty for k=0", () => {
    expect(applyMMR([{ id: "a", score: 1, embedding: emb({ 0: 1 }) }], 0)).toEqual([]);
  });

  it("picks top-K by relevance when λ=1 (no diversity penalty)", () => {
    const items = [
      { id: "high", score: 0.9, embedding: emb({ 0: 1 }) },
      { id: "mid", score: 0.5, embedding: emb({ 0: 0.95, 1: 0.31 }) },
      { id: "low", score: 0.1, embedding: emb({ 1: 1 }) },
    ];
    const result = applyMMR(items, 2, 1.0);
    expect(result.map((r) => r.id)).toEqual(["high", "mid"]);
  });

  it("first pick is always highest relevance", () => {
    const items = [
      { id: "a", score: 0.4, embedding: emb({ 0: 1 }) },
      { id: "b", score: 0.9, embedding: emb({ 1: 1 }) },
      { id: "c", score: 0.6, embedding: emb({ 2: 1 }) },
    ];
    const result = applyMMR(items, 1, 0.5);
    expect(result[0].id).toBe("b");
  });

  it("low λ picks diverse items even if less relevant", () => {
    // 'a' is most relevant. 'b' is identical to 'a' (high pairwise sim) but
    // slightly less relevant. 'c' is orthogonal and low relevance.
    const items = [
      { id: "a", score: 0.9, embedding: emb({ 0: 1 }) },
      { id: "b", score: 0.85, embedding: emb({ 0: 0.99, 1: 0.14 }) }, // near-dup of 'a'
      { id: "c", score: 0.4, embedding: emb({ 1: 1 }) }, // orthogonal
    ];
    // λ=0.2 puts 80% weight on diversity. After picking 'a', 'c' should
    // beat 'b' because 'b' is too similar to 'a'.
    const result = applyMMR(items, 2, 0.2);
    expect(result[0].id).toBe("a");
    expect(result[1].id).toBe("c");
  });

  it("high λ keeps near-duplicates over diverse low-relevance items", () => {
    const items = [
      { id: "a", score: 0.9, embedding: emb({ 0: 1 }) },
      { id: "b", score: 0.85, embedding: emb({ 0: 0.99, 1: 0.14 }) }, // near-dup
      { id: "c", score: 0.4, embedding: emb({ 1: 1 }) }, // orthogonal
    ];
    // λ=0.9 mostly cares about relevance; near-dup 'b' should still beat 'c'.
    const result = applyMMR(items, 2, 0.9);
    expect(result[0].id).toBe("a");
    expect(result[1].id).toBe("b");
  });

  it("respects k > candidates length", () => {
    const items = [
      { id: "a", score: 1, embedding: emb({ 0: 1 }) },
      { id: "b", score: 0.5, embedding: emb({ 1: 1 }) },
    ];
    const result = applyMMR(items, 5, 0.5);
    expect(result.length).toBe(2);
  });

  it("handles items with empty embeddings gracefully", () => {
    const items = [
      { id: "a", score: 0.9, embedding: emb({ 0: 1 }) },
      { id: "b", score: 0.7, embedding: [] },
      { id: "c", score: 0.5, embedding: emb({ 1: 1 }) },
    ];
    const result = applyMMR(items, 3, 0.5);
    expect(result.length).toBe(3);
    expect(result[0].id).toBe("a");
  });

  it("composite-style spread: picks one from each cluster", () => {
    // Three clusters of 2 items each. With λ=0.5 we should get 1 from each
    // cluster in top-3, not 2 from cluster 0 and 1 from cluster 1.
    const items = [
      { id: "p1a", score: 0.85, embedding: emb({ 0: 1 }) },
      { id: "p1b", score: 0.83, embedding: emb({ 0: 0.99, 1: 0.14 }) },
      { id: "p2a", score: 0.8, embedding: emb({ 1: 1 }) },
      { id: "p2b", score: 0.78, embedding: emb({ 1: 0.99, 2: 0.14 }) },
      { id: "p3a", score: 0.75, embedding: emb({ 2: 1 }) },
      { id: "p3b", score: 0.73, embedding: emb({ 2: 0.99, 0: 0.14 }) },
    ];
    const result = applyMMR(items, 3, 0.5);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("p1a"); // most relevant overall
    // Top-3 should span all 3 clusters
    const clusters = new Set(ids.map((id) => id[1]));
    expect(clusters.size).toBe(3);
  });

  it("clamps a NaN lambda to 0.5 instead of silently returning input order", () => {
    // 'high' has the top relevance but is NOT first in the array. Round 0 is
    // pure relevance, so a working lambda picks 'high' first. An unguarded NaN
    // lambda makes every `mmrScore > bestScore` false → it would pick index 0
    // ('low'). Asserting 'high' first proves the clamp took effect.
    const items = [
      { id: "low", score: 0.1, embedding: emb({ 0: 1 }) },
      { id: "high", score: 0.9, embedding: emb({ 1: 1 }) },
    ];
    const result = applyMMR(items, 2, NaN);
    expect(result.map((r) => r.id)).toEqual(["high", "low"]);
  });

  it("clamps lambda > 1 to pure relevance ordering", () => {
    const items = [
      { id: "low", score: 0.1, embedding: emb({ 0: 1 }) },
      { id: "high", score: 0.9, embedding: emb({ 1: 1 }) },
    ];
    const result = applyMMR(items, 2, 5);
    expect(result[0].id).toBe("high");
  });
});
