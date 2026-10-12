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
  alpha?: number;
  seed?: number;
}

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
  const loIdx = Math.max(0, Math.floor((alpha / 2) * iterations));
  const hiIdx = Math.min(iterations - 1, Math.floor((1 - alpha / 2) * iterations));
  return { mean: mean(values), lo: means[loIdx], hi: means[hiIdx] };
}

export interface PairedDelta extends ConfidenceInterval {
  significant: boolean;
}

export function pairedBootstrapDelta(
  a: number[],
  b: number[],
  opts: BootstrapOptions = {}
): PairedDelta {
  const { iterations = 2000, alpha = 0.05, seed = 12345 } = opts;
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
