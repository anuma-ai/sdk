/**
 * Shared types for memory evaluation metrics.
 */

export interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  min: number;
  max: number;
}

export interface RetrievalMetrics {
  precisionAtK: Record<number, number>;
  recallAtK: Record<number, number>;
  mrr: number;
  ndcgAtK: Record<number, number>;
  avgSimilarity: number;
  similarityStdDev: number;
  belowThresholdCount: number;
}
