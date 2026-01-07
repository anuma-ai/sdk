/**
 * Core evaluation metrics implementation
 * Based on LongMemEval methodology
 */

import type {
  RetrievalResult,
  RetrievalMetrics,
  PercentileStats,
} from "./types.js";

/**
 * Calculate Precision@K
 * Fraction of retrieved items that are relevant
 */
export function precisionAtK(
  retrieved: string[],
  relevant: Set<string>,
  k: number
): number {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
  return topK.length > 0 ? relevantInTopK / topK.length : 0;
}

/**
 * Calculate Recall@K
 * Fraction of relevant items that are retrieved
 */
export function recallAtK(
  retrieved: string[],
  relevant: Set<string>,
  k: number
): number {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
  return relevant.size > 0 ? relevantInTopK / relevant.size : 0;
}

/**
 * Calculate Mean Reciprocal Rank (MRR)
 * Average of 1/rank for first relevant item
 */
export function meanReciprocalRank(
  retrievedList: string[][],
  relevantList: Set<string>[]
): number {
  if (retrievedList.length !== relevantList.length) {
    throw new Error("Retrieved and relevant lists must have same length");
  }

  let sumRR = 0;
  for (let i = 0; i < retrievedList.length; i++) {
    const rr = reciprocalRank(retrievedList[i], relevantList[i]);
    sumRR += rr;
  }

  return retrievedList.length > 0 ? sumRR / retrievedList.length : 0;
}

/**
 * Calculate Reciprocal Rank for a single query
 */
export function reciprocalRank(
  retrieved: string[],
  relevant: Set<string>
): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (relevant.has(retrieved[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Calculate NDCG@K (Normalized Discounted Cumulative Gain)
 * Measures ranking quality with position-based weighting
 */
export function ndcgAtK(
  retrieved: string[],
  relevant: Set<string>,
  k: number
): number {
  const dcg = dcgAtK(retrieved, relevant, k);
  const idcg = idealDcgAtK(relevant.size, k);
  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * Calculate DCG@K (Discounted Cumulative Gain)
 */
function dcgAtK(retrieved: string[], relevant: Set<string>, k: number): number {
  let dcg = 0;
  const topK = retrieved.slice(0, k);

  for (let i = 0; i < topK.length; i++) {
    const rel = relevant.has(topK[i]) ? 1 : 0;
    // Using log2(i + 2) for 0-indexed position
    dcg += rel / Math.log2(i + 2);
  }

  return dcg;
}

/**
 * Calculate Ideal DCG@K (perfect ranking)
 */
function idealDcgAtK(numRelevant: number, k: number): number {
  let idcg = 0;
  const numPerfect = Math.min(numRelevant, k);

  for (let i = 0; i < numPerfect; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  return idcg;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate percentile statistics
 */
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

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff =
    squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(avgSquaredDiff);
}

/**
 * Aggregate retrieval metrics across multiple queries
 */
export function aggregateRetrievalMetrics(
  results: Array<{
    retrieved: string[];
    relevant: Set<string>;
    similarities: number[];
  }>,
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
    belowThresholdCount += similarities.filter(
      (s) => s < similarityThreshold
    ).length;
  }

  const retrievedLists = results.map((r) => r.retrieved);
  const relevantLists = results.map((r) => r.relevant);

  return {
    precisionAtK: Object.fromEntries(
      kValues.map((k) => [k, mean(precisionAtKAgg[k])])
    ),
    recallAtK: Object.fromEntries(
      kValues.map((k) => [k, mean(recallAtKAgg[k])])
    ),
    mrr: meanReciprocalRank(retrievedLists, relevantLists),
    ndcgAtK: Object.fromEntries(kValues.map((k) => [k, mean(ndcgAtKAgg[k])])),
    avgSimilarity: mean(allSimilarities),
    similarityStdDev: standardDeviation(allSimilarities),
    belowThresholdCount,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
