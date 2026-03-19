/**
 * LongMemEval Dataset Types
 *
 * Based on the LongMemEval benchmark: https://github.com/xiaowu0162/LongMemEval
 */

export type LongMemEvalQuestionType =
  | "single-session-user"
  | "single-session-assistant"
  | "single-session-preference"
  | "temporal-reasoning"
  | "knowledge-update"
  | "multi-session";

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
  /** Cost per token for prompt/input */
  prompt: number;
  /** Cost per token for completion/output */
  completion: number;
}

export interface LongMemEvalResult {
  questionId: string;
  questionType: LongMemEvalQuestionType;
  question: string;
  expectedAnswer: string;
  generatedAnswer: string;
  isCorrect: boolean;
  retrievedSessionIds: string[];
  expectedSessionIds: string[];
  retrievalPrecision: number;
  retrievalRecall: number;
  latencyMs: number;
  tokenUsage: TokenUsage;
  strategy: "memory-engine" | "memory-vault";
  details?: Record<string, unknown>;
}

export interface LongMemEvalSummary {
  timestamp: string;
  datasetName: string;
  strategy: "memory-engine" | "memory-vault";
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  byQuestionType: Record<
    LongMemEvalQuestionType,
    {
      total: number;
      correct: number;
      accuracy: number;
    }
  >;
  retrieval: {
    avgPrecision: number;
    avgRecall: number;
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

export type LongMemEvalStrategy = "memory-engine" | "memory-vault" | "both";

export interface LongMemEvalOptions {
  variant: "s" | "m";
  strategy?: LongMemEvalStrategy;
  llmModel?: string;
  skipExisting?: boolean;
  questionId?: string;
  maxQuestions?: number;
  maxSessions?: number;
  questionTypes?: LongMemEvalQuestionType[];
  verbose?: boolean;
  output?: string;
  skipUnsupported?: boolean;
  concurrency?: number;
}

/** API configuration for LLM and embedding calls */
export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  llmModel: string;
}
