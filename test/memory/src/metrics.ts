/**
 * Evaluation metrics implementation
 */

import type { RetrievalMetrics, PercentileStats } from "./types.js";

export function precisionAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
  return topK.length > 0 ? relevantInTopK / topK.length : 0;
}

export function recallAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
  return relevant.size > 0 ? relevantInTopK / relevant.size : 0;
}

export function meanReciprocalRank(retrievedList: string[][], relevantList: Set<string>[]): number {
  if (retrievedList.length !== relevantList.length) {
    throw new Error("Retrieved and relevant lists must have same length");
  }

  let sumRR = 0;
  for (let i = 0; i < retrievedList.length; i++) {
    sumRR += reciprocalRank(retrievedList[i], relevantList[i]);
  }

  return retrievedList.length > 0 ? sumRR / retrievedList.length : 0;
}

export function reciprocalRank(retrieved: string[], relevant: Set<string>): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (relevant.has(retrieved[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

export function ndcgAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  const dcg = dcgAtK(retrieved, relevant, k);
  const idcg = idealDcgAtK(relevant.size, k);
  return idcg > 0 ? dcg / idcg : 0;
}

function dcgAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  let dcg = 0;
  const topK = retrieved.slice(0, k);

  for (let i = 0; i < topK.length; i++) {
    const rel = relevant.has(topK[i]) ? 1 : 0;
    dcg += rel / Math.log2(i + 2);
  }

  return dcg;
}

function idealDcgAtK(numRelevant: number, k: number): number {
  let idcg = 0;
  const numPerfect = Math.min(numRelevant, k);

  for (let i = 0; i < numPerfect; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  return idcg;
}

export function calculatePercentiles(values: number[]): PercentileStats {
  if (values.length === 0) {
    return { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    mean: values.reduce((a, b) => a + b, 0) / n,
    min: sorted[0],
    max: sorted[n - 1],
  };
}

function percentile(sorted: number[], p: number): number {
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function aggregateRetrievalMetrics(
  results: Array<{ retrieved: string[]; relevant: Set<string>; similarities: number[] }>,
  kValues: number[] = [1, 3, 5, 10],
  similarityThreshold: number = 0.2
): RetrievalMetrics {
  const precisionAtKAgg: Record<number, number[]> = {};
  const recallAtKAgg: Record<number, number[]> = {};
  const ndcgAtKAgg: Record<number, number[]> = {};
  const allSimilarities: number[] = [];
  let belowThresholdCount = 0;

  for (const k of kValues) {
    precisionAtKAgg[k] = [];
    recallAtKAgg[k] = [];
    ndcgAtKAgg[k] = [];
  }

  for (const { retrieved, relevant, similarities } of results) {
    for (const k of kValues) {
      precisionAtKAgg[k].push(precisionAtK(retrieved, relevant, k));
      recallAtKAgg[k].push(recallAtK(retrieved, relevant, k));
      ndcgAtKAgg[k].push(ndcgAtK(retrieved, relevant, k));
    }

    allSimilarities.push(...similarities);
    belowThresholdCount += similarities.filter((s) => s < similarityThreshold).length;
  }

  const retrievedLists = results.map((r) => r.retrieved);
  const relevantLists = results.map((r) => r.relevant);

  return {
    precisionAtK: Object.fromEntries(kValues.map((k) => [k, mean(precisionAtKAgg[k])])),
    recallAtK: Object.fromEntries(kValues.map((k) => [k, mean(recallAtKAgg[k])])),
    mrr: meanReciprocalRank(retrievedLists, relevantLists),
    ndcgAtK: Object.fromEntries(kValues.map((k) => [k, mean(ndcgAtKAgg[k])])),
    avgSimilarity: mean(allSimilarities),
    similarityStdDev: standardDeviation(allSimilarities),
    belowThresholdCount,
  };
}

// ---------------------------------------------------------------------------
// Bootstrap significance
//
// A single benchmark run over N queries gives one mean per metric, with no
// sense of how much that mean would wobble on a different sample of queries.
// On a ~100-query corpus a "+2pp recall" delta is easily noise. These helpers
// quantify that: a percentile bootstrap CI for a single run, and a *paired*
// bootstrap (resampling the same query indices for both configs) for whether
// one config genuinely beats another. Paired is the right test because the two
// configs are scored on the identical query set — pairing cancels per-query
// difficulty and is far more sensitive than comparing two independent CIs.
//
// Reproducible by default: a seeded PRNG (mulberry32) makes the CI bounds
// deterministic across runs, so a baseline comparison is stable. Note both
// helpers default to the same seed, so the recall and ndcg CIs computed in one
// run share an RNG sequence — their bounds are correlated through the resample
// indices, not independent draws. That's fine for reproducibility; pass
// distinct seeds if you ever need statistically independent CIs.
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ConfidenceInterval {
  mean: number;
  lo: number;
  hi: number;
}

export interface BootstrapOptions {
  iterations?: number;
  /** Two-sided alpha; 0.05 → 95% CI. */
  alpha?: number;
  seed?: number;
}

/** Percentile bootstrap CI for the mean of a per-query metric sample. */
export function bootstrapMeanCI(values: number[], opts: BootstrapOptions = {}): ConfidenceInterval {
  const { iterations = 2000, alpha = 0.05, seed = 12345 } = opts;
  const n = values.length;
  if (n === 0) return { mean: 0, lo: 0, hi: 0 };
  const rng = mulberry32(seed);
  const means: number[] = [];
  for (let b = 0; b < iterations; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += values[(rng() * n) | 0];
    means.push(sum / n);
  }
  means.sort((x, y) => x - y);
  // Percentile indices, clamped at BOTH ends. The index can sit one bin off the
  // exact percentile (~0.05pp at iterations=2000) — negligible for an eval CI.
  const loIdx = Math.max(0, Math.floor((alpha / 2) * iterations));
  const hiIdx = Math.min(iterations - 1, Math.floor((1 - alpha / 2) * iterations));
  return { mean: mean(values), lo: means[loIdx], hi: means[hiIdx] };
}

export interface PairedDelta extends ConfidenceInterval {
  /** True when the CI of the per-query difference excludes 0. */
  significant: boolean;
}

/**
 * Paired bootstrap on per-query differences `a[i] - b[i]` (a = candidate,
 * b = baseline). `significant` is true when the 95% CI of the mean difference
 * excludes 0 — i.e. the candidate's win/loss is unlikely to be sampling noise.
 */
export function pairedBootstrapDelta(
  a: number[],
  b: number[],
  opts: BootstrapOptions = {}
): PairedDelta {
  const { iterations = 2000, alpha = 0.05, seed = 12345 } = opts;
  // Paired test requires 1:1 correspondence; mismatched lengths are a caller
  // bug (e.g. unaligned query sets). Fail loud rather than silently truncate
  // to the shorter array, which would bias the delta and fabricate a verdict.
  if (a.length !== b.length) {
    throw new Error(
      `pairedBootstrapDelta requires equal-length arrays (got ${a.length} and ${b.length})`
    );
  }
  const n = a.length;
  if (n === 0) return { mean: 0, lo: 0, hi: 0, significant: false };
  const diffs = Array.from({ length: n }, (_, i) => a[i] - b[i]);
  const rng = mulberry32(seed);
  const resampled: number[] = [];
  for (let r = 0; r < iterations; r++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += diffs[(rng() * n) | 0];
    resampled.push(sum / n);
  }
  resampled.sort((x, y) => x - y);
  const lo = resampled[Math.floor((alpha / 2) * iterations)];
  const hi = resampled[Math.min(iterations - 1, Math.floor((1 - alpha / 2) * iterations))];
  return { mean: mean(diffs), lo, hi, significant: lo > 0 || hi < 0 };
}
