/**
 * Memory Evaluation Framework Types
 */

export type MemoryType =
  | "identity"
  | "preference"
  | "project"
  | "skill"
  | "constraint";

export interface Memory {
  id: string;
  type: MemoryType;
  namespace: string;
  key: string;
  value: string;
  rawEvidence?: string;
  confidence: number;
  pii?: boolean;
  embedding?: number[];
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

export interface LatencyMetrics {
  embeddingGenerationMs: PercentileStats;
  searchTimeMs: PercentileStats;
  extractionTimeMs: PercentileStats;
}

export interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  min: number;
  max: number;
}

export interface EvaluationResult {
  instanceId: string;
  category: string;
  passed: boolean;
  metrics: Partial<RetrievalMetrics>;
  latencyMs: number;
  details?: Record<string, unknown>;
}

export interface EvaluationSummary {
  timestamp: string;
  mode: "quick" | "full";
  totalInstances: number;
  passedInstances: number;
  failedInstances: number;
  retrieval: RetrievalMetrics;
  latency: LatencyMetrics;
  byCategory: Record<string, { total: number; passed: number; metrics: Partial<RetrievalMetrics> }>;
  byDifficulty: Record<string, { total: number; passed: number }>;
}

export interface ComparisonResult {
  metric: string;
  baseline: number;
  current: number;
  delta: number;
  deltaPercent: number;
  status: "improved" | "degraded" | "unchanged";
}

export interface Fixtures {
  memories: Memory[];
  embeddings: Record<string, number[]>;
  queries: QueryFixture[];
}

export interface QueryFixture {
  id: string;
  query: string;
  queryEmbedding?: number[];
  relevantMemoryIds: string[];
  difficulty: "easy" | "medium" | "hard";
}

export interface EvalOptions {
  full: boolean;
  json: boolean;
  verbose: boolean;
  output?: string;
}
