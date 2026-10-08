export const LONG_MEM_EVAL_QUESTION_TYPES = [
  "single-session-user",
  "single-session-assistant",
  "single-session-preference",
  "temporal-reasoning",
  "knowledge-update",
  "multi-session",
] as const;

export type LongMemEvalQuestionType = (typeof LONG_MEM_EVAL_QUESTION_TYPES)[number];

export interface LongMemEvalMessage {
  role: "user" | "assistant";
  content: string;
}

export type LongMemEvalSession = LongMemEvalMessage[];

export interface LongMemEvalEntry {
  question_id: string;
  question_type: LongMemEvalQuestionType;
  question: string;
  answer: string;
  question_date: string;
  answer_session_ids: string[];
  haystack_dates: string[];
  haystack_session_ids: string[];
  haystack_sessions: LongMemEvalSession[];
}

export type LongMemEvalDataset = LongMemEvalEntry[];

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  embeddingTokens: number;
}

export interface ModelPricing {
  prompt: number;
  completion: number;
}

export interface LongMemEvalResult {
  questionId: string;
  questionType: LongMemEvalQuestionType;
  question: string;
  expectedAnswer: string;
  generatedAnswer: string;
  isCorrect: boolean;
  judgeError?: string;
  answerError?: string;
  harnessError?: string;
  retrievedSessionIds: string[];
  expectedSessionIds: string[];
  retrievalPrecision: number;
  retrievalRecall: number;
  latencyMs: number;
  tokenUsage: TokenUsage;
  strategy: "memory-engine" | "memory-vault" | "memory-recall" | "memory-ensemble";
  details?: Record<string, unknown>;
}

export interface LongMemEvalSummary {
  timestamp: string;
  datasetName: string;
  strategy: "memory-engine" | "memory-vault" | "memory-recall" | "memory-ensemble";
  totalQuestions: number;
  correctAnswers: number;
  judgeFailures: number;
  answerFailures: number;
  harnessFailures: number;
  accuracy: number;
  byQuestionType: Record<
    LongMemEvalQuestionType,
    {
      total: number;
      correct: number;
      judgeFailures: number;
      answerFailures: number;
      harnessFailures: number;
      accuracy: number;
    }
  >;
  retrieval: {
    avgPrecision: number;
    avgRecall: number;
    measuredQuestions: number;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
    mean: number;
  };
  tokenUsage: TokenUsage;
  cost?: {
    llmCost: number;
    embeddingCost: number;
    totalCost: number;
    llmModel: string;
    embeddingModel: string;
  };
  results: LongMemEvalResult[];
}

export interface LongMemEvalComparisonSummary {
  engine: LongMemEvalSummary;
  vault: LongMemEvalSummary;
}

export type LongMemEvalStrategy =
  | "memory-engine"
  | "memory-vault"
  | "memory-recall"
  | "memory-ensemble"
  | "both";

export interface RetrievalTuningKnobs {
  ceWeight?: number;
  recencyAlpha?: number;
  recencyDecay?: number;
  recencyFloor?: number;
  rrfK?: number;
  supersessionBoost?: number;
  supersessionWindow?: number;
  proofCountAlpha?: number;
  mmr?: boolean;
  rerankTopN?: number;
  bm25AdmissionDivisor?: number;
}

export interface LongMemEvalOptions extends RetrievalTuningKnobs {
  variant: "s" | "m";
  strategy?: LongMemEvalStrategy;
  llmModel?: string;
  extractionModel?: string;
  skipExisting?: boolean;
  questionId?: string;
  maxQuestions?: number;
  maxSessions?: number;
  questionTypes?: LongMemEvalQuestionType[];
  verbose?: boolean;
  output?: string;
  skipUnsupported?: boolean;
  concurrency?: number;
  rerank?: boolean;
  decompose?: "off" | "llm";
  consolidate?: boolean;
  chunkSourceMaxChars?: number;
  excerptMaxChars?: number;
  recallTypes?: RecallTypes;
  recallEmit?: RecallEmit;
  recallLaneMode?: RecallLaneMode;
}

export type RecallTypes = "fact" | "chunk" | "fact-chunk";
export type RecallEmit = "rrf" | "blocks";
export type RecallLaneMode = "fused" | "per-lane";

export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  llmModel: string;
  extractionModel?: string;
  judgeModel?: string;
  extractor?: "harness" | "sdk";
}
