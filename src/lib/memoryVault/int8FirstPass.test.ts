/**
 * 719/B3 — int8 cosine first pass + Float32 re-score.
 *
 * Accuracy evidence required before this path can become the default lane:
 * when the re-score window covers the corpus, results must match Float32
 * exactly; under a tight window, top-K recall against Float32 stays high.
 */
import { describe, expect, it } from "vitest";

import { cosineSimilarity } from "../memoryEngine/vector.js";
import { DEFAULT_INT8_RESCORE_TOP_N, rankVaultMemories } from "./searchTool.js";

function emb(overrides: Record<number, number>, dim = 8): number[] {
  const v = new Array(dim).fill(0);
  for (const [i, val] of Object.entries(overrides)) v[Number(i)] = val;
  return v;
}

function makeItem(id: string, embedding: number[], content = id) {
  return { id, content, embedding };
}

/** Mulberry32 — deterministic PRNG for the recall harness. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomUnit(dim: number, rng: () => number): number[] {
  const v = new Array(dim);
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    v[i] = rng() * 2 - 1;
    norm += v[i] * v[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < dim; i++) v[i] /= norm;
  return v;
}

describe("rankVaultMemories — int8 first pass (719/B3)", () => {
  const query = emb({ 0: 1 });
  const items = [
    makeItem("a", emb({ 0: 1 }), "alpha"),
    makeItem("b", emb({ 1: 1 }), "bravo"),
    makeItem("c", emb({ 0: 0.9, 1: 0.1 }), "charlie"),
    makeItem("d", emb({ 2: 1 }), "delta"),
  ];

  it("default (flag off) is unchanged Float32 cosine", () => {
    const out = rankVaultMemories("q", query, items, { limit: 4, minSimilarity: 0 });
    expect(out.map((r) => r.uniqueId)).toEqual(["a", "c", "b", "d"]);
  });

  it("with rescoreTopN >= corpus size, matches Float32 scores and order exactly", () => {
    const exact = rankVaultMemories("q", query, items, { limit: 4, minSimilarity: 0 });
    const approx = rankVaultMemories("q", query, items, {
      limit: 4,
      minSimilarity: 0,
      int8FirstPass: true,
      int8RescoreTopN: items.length,
    });

    expect(approx.map((r) => r.uniqueId)).toEqual(exact.map((r) => r.uniqueId));
    for (let i = 0; i < exact.length; i++) {
      expect(approx[i].similarity).toBeCloseTo(exact[i].similarity, 10);
    }
  });

  it("caches quantized embeddings on EmbeddedItem across passes", () => {
    const shared = items.map((i) => ({ ...i }));
    rankVaultMemories("q", query, shared, {
      limit: 4,
      minSimilarity: 0,
      int8FirstPass: true,
      int8RescoreTopN: 4,
    });
    expect(shared.every((i) => i.quantized !== undefined)).toBe(true);

    // Second pass must reuse the same QuantizedEmbedding objects.
    const firstQ = shared.map((i) => i.quantized);
    rankVaultMemories("q", emb({ 1: 1 }), shared, {
      limit: 4,
      minSimilarity: 0,
      int8FirstPass: true,
      int8RescoreTopN: 4,
    });
    expect(shared.map((i) => i.quantized)).toEqual(firstQ);
  });

  it("DEFAULT_INT8_RESCORE_TOP_N is 100", () => {
    expect(DEFAULT_INT8_RESCORE_TOP_N).toBe(100);
  });
});

describe("int8 first pass + float re-score — accuracy vs Float32", () => {
  it("recall@10 over 400-doc / 40-query 384-dim batch is >= 0.95 with rescoreTopN=50", () => {
    const dim = 384;
    const numDocs = 400;
    const numQueries = 40;
    const k = 10;
    const rescoreTopN = 50;
    const rng = makeRng(0xb3cafe);

    const docs = Array.from({ length: numDocs }, (_, i) => makeItem(`d${i}`, randomUnit(dim, rng)));

    let totalRecall = 0;
    for (let q = 0; q < numQueries; q++) {
      const query = randomUnit(dim, rng);

      const truth = docs
        .map((d, idx) => ({ idx, sim: cosineSimilarity(query, d.embedding) }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, k)
        .map((s) => s.idx);
      const truthSet = new Set(truth);

      const approx = rankVaultMemories("q", query, docs, {
        limit: k,
        minSimilarity: 0,
        int8FirstPass: true,
        int8RescoreTopN: rescoreTopN,
      });
      const approxIdx = approx.map((r) => Number(r.uniqueId.slice(1)));

      let hits = 0;
      for (const idx of approxIdx) {
        if (truthSet.has(idx)) hits += 1;
      }
      totalRecall += hits / k;
    }

    const meanRecall = totalRecall / numQueries;
    expect(meanRecall).toBeGreaterThanOrEqual(0.95);
  });
});
