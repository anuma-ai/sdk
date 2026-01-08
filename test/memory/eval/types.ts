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

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface EvaluationInstance {
  id: string;
  category: "extraction" | "retrieval" | "update" | "abstention";
  description: string;

  // Input
  conversationHistory?: Message[];
  query?: string;
  seedMemories?: Memory[];

  // Expected outputs
  expectedMemories?: Partial<Memory>[];
  relevantMemoryIds?: string[];

  // Metadata
  difficulty: "easy" | "medium" | "hard";
}

export interface RetrievalResult {
  memoryId: string;
  similarity: number;
  rank: number;
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

export interface ExtractionMetrics {
  typeAccuracy: number;
  namespaceAccuracy: number;
  keyAccuracy: number;
  valueAccuracy: number;
  exactMatchRate: number;
  partialMatchRate: number;
  confidenceCorrelation: number;
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
  metrics: Partial<RetrievalMetrics & ExtractionMetrics>;
  latencyMs: number;
  details?: Record<string, unknown>;
}

export interface EvaluationSummary {
  timestamp: string;
  mode: "quick" | "full" | "sdk";
  totalInstances: number;
  passedInstances: number;
  failedInstances: number;

  retrieval: RetrievalMetrics;
  extraction?: ExtractionMetrics;
  latency: LatencyMetrics;

  byCategory: Record<
    string,
    {
      total: number;
      passed: number;
      metrics: Partial<RetrievalMetrics>;
    }
  >;

  byDifficulty: Record<
    string,
    {
      total: number;
      passed: number;
    }
  >;
}

export interface Baseline {
  version: string;
  createdAt: string;
  summary: EvaluationSummary;
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
  conversations: ConversationFixture[];
}

export interface QueryFixture {
  id: string;
  query: string;
  queryEmbedding?: number[];
  relevantMemoryIds: string[];
  difficulty: "easy" | "medium" | "hard";
}

export interface ConversationFixture {
  id: string;
  messages: Message[];
  expectedMemories: Partial<Memory>[];
  difficulty: "easy" | "medium" | "hard";
}

export interface EvalOptions {
  quick: boolean;
  full: boolean;
  sdk: boolean;
  suite: "all" | "retrieval" | "extraction" | "latency";
  compareBaseline: boolean;
  updateBaseline: boolean;
  json: boolean;
  markdown: boolean;
  verbose: boolean;
  output?: string;
}
