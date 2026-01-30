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
