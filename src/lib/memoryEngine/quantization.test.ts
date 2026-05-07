import { describe, expect, it } from "vitest";

import { cosineInt8, dequantizeEmbedding, quantizeEmbedding } from "./quantization";

/**
 * Exact Float32 cosine similarity. Used as the ground-truth oracle in
 * the recall benchmark below.
 */
function cosineFloat32(a: Float32Array | number[], b: Float32Array | number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const mag = Math.sqrt(normA) * Math.sqrt(normB);
  return mag === 0 ? 0 : dot / mag;
}

/**
 * Mulberry32 — small, deterministic 32-bit PRNG. Vitest's `Math.random`
 * is not seedable, and the recall benchmark needs reproducibility.
 */
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

/** Builds a roughly-unit-norm random vector of `dim` dims using the given RNG. */
function randomEmbedding(dim: number, rng: () => number): Float32Array {
  const v = new Float32Array(dim);
  for (let i = 0; i < dim; i += 1) {
    v[i] = rng() * 2 - 1;
  }
  // Normalize so cosine values are well-distributed.
  let norm = 0;
  for (let i = 0; i < dim; i += 1) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i += 1) v[i] /= norm;
  }
  return v;
}

describe("quantizeEmbedding", () => {
  it("zero vector quantizes to zero data and zero scale", () => {
    const { data, scale } = quantizeEmbedding(new Float32Array(8));
    expect(scale).toBe(0);
    expect(data.length).toBe(8);
    expect(Array.from(data)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("empty vector returns empty Int8Array and zero scale", () => {
    const { data, scale } = quantizeEmbedding([]);
    expect(scale).toBe(0);
    expect(data.length).toBe(0);
  });

  it("accepts a number[] as well as Float32Array", () => {
    const arr = [0.1, -0.5, 1, -1];
    const { data, scale } = quantizeEmbedding(arr);
    expect(scale).toBe(1);
    expect(data.length).toBe(arr.length);
  });

  it("scales the maximum absolute value to ±127", () => {
    const v = new Float32Array([0.25, -0.5, 1, -0.1]);
    const { data, scale } = quantizeEmbedding(v);
    expect(scale).toBe(1);
    expect(data[2]).toBe(127);
    expect(data[1]).toBe(Math.round(-0.5 * 127));
  });

  it("recovers the original within quantization tolerance via dequantize", () => {
    const v = new Float32Array([0.1, -0.4, 0.7, -0.9, 0.05, 0.0, 0.33]);
    const q = quantizeEmbedding(v);
    const back = dequantizeEmbedding(q);
    expect(back.length).toBe(v.length);
    for (let i = 0; i < v.length; i += 1) {
      expect(Math.abs(back[i] - v[i])).toBeLessThan(scale_tolerance(q.scale));
    }
  });

  it("dequantize of zero-scale yields zero vector", () => {
    const back = dequantizeEmbedding({ data: new Int8Array(4), scale: 0 });
    expect(Array.from(back)).toEqual([0, 0, 0, 0]);
  });
});

/**
 * Per-element error bound: |v[i] - back[i]| <= scale / (2 * 127) plus a
 * small float epsilon. Returns scale/127 as a safe upper bound.
 */
function scale_tolerance(scale: number): number {
  return scale / 127 + 1e-6;
}

describe("cosineInt8", () => {
  it("returns 0 for mismatched dimensions", () => {
    const a = quantizeEmbedding([1, 2, 3]);
    const b = quantizeEmbedding([1, 2]);
    expect(cosineInt8(a.data, a.scale, b.data, b.scale)).toBe(0);
  });

  it("returns 0 when either vector has zero scale", () => {
    const a = quantizeEmbedding([0, 0, 0, 0]);
    const b = quantizeEmbedding([1, 2, 3, 4]);
    expect(cosineInt8(a.data, a.scale, b.data, b.scale)).toBe(0);
    expect(cosineInt8(b.data, b.scale, a.data, a.scale)).toBe(0);
  });

  it("self-similarity of a unit vector is 1 within tolerance", () => {
    const rng = makeRng(0xc0ffee);
    const v = randomEmbedding(1536, rng);
    const q = quantizeEmbedding(v);
    expect(cosineInt8(q.data, q.scale, q.data, q.scale)).toBeCloseTo(1, 6);
  });

  it("approximates Float32 cosine within 0.02 absolute error on unit vectors", () => {
    const rng = makeRng(42);
    let maxErr = 0;
    for (let trial = 0; trial < 50; trial += 1) {
      const a = randomEmbedding(1536, rng);
      const b = randomEmbedding(1536, rng);
      const truth = cosineFloat32(a, b);
      const qa = quantizeEmbedding(a);
      const qb = quantizeEmbedding(b);
      const approx = cosineInt8(qa.data, qa.scale, qb.data, qb.scale);
      const err = Math.abs(truth - approx);
      if (err > maxErr) maxErr = err;
    }
    expect(maxErr).toBeLessThan(0.02);
  });
});

describe("recall benchmark vs Float32 cosine", () => {
  it("recall@10 over a 200-doc / 50-query 1536-dim batch is >= 0.95", () => {
    const dim = 1536;
    const numDocs = 200;
    const numQueries = 50;
    const k = 10;

    const rng = makeRng(0xbadbeef);

    // Build the corpus and pre-quantize it.
    const docsF32: Float32Array[] = [];
    const docsQ: ReturnType<typeof quantizeEmbedding>[] = [];
    for (let i = 0; i < numDocs; i += 1) {
      const v = randomEmbedding(dim, rng);
      docsF32.push(v);
      docsQ.push(quantizeEmbedding(v));
    }

    let totalRecall = 0;
    for (let q = 0; q < numQueries; q += 1) {
      const query = randomEmbedding(dim, rng);
      const queryQ = quantizeEmbedding(query);

      // Float32 ground-truth top-K.
      const truthScores = docsF32.map((d, idx) => ({ idx, sim: cosineFloat32(query, d) }));
      truthScores.sort((a, b) => b.sim - a.sim);
      const truthTopK = new Set(truthScores.slice(0, k).map((s) => s.idx));

      // Int8 ranked top-K.
      const approxScores = docsQ.map((d, idx) => ({
        idx,
        sim: cosineInt8(queryQ.data, queryQ.scale, d.data, d.scale),
      }));
      approxScores.sort((a, b) => b.sim - a.sim);
      const approxTopK = approxScores.slice(0, k).map((s) => s.idx);

      let hits = 0;
      for (const idx of approxTopK) {
        if (truthTopK.has(idx)) hits += 1;
      }
      totalRecall += hits / k;
    }

    const meanRecall = totalRecall / numQueries;
    expect(meanRecall).toBeGreaterThanOrEqual(0.95);
  });
});
