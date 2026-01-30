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
  details?: Record<string, unknown>;
}

export interface LongMemEvalSummary {
  timestamp: string;
  datasetName: string;
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
  results: LongMemEvalResult[];
}

export interface LongMemEvalOptions {
  /** Dataset variant: 's' (small, ~50 sessions) or 'm' (medium, ~500 sessions) */
  variant: "s" | "m";
  /** Retrieval strategy */
  strategy?: "extracted-memories" | "chunked-tool";
  /** LLM model override for chat completions */
  llmModel?: string;
  /** Skip entries that already have transcripts for the same model */
  skipExisting?: boolean;
  /** Run only a specific question id */
  questionId?: string;
  /** Maximum number of questions to evaluate (for quick testing) */
  maxQuestions?: number;
  /** Maximum sessions to process per question (for dev/testing) */
  maxSessions?: number;
  /** Question types to include (default: all) */
  questionTypes?: LongMemEvalQuestionType[];
  /** Show verbose output */
  verbose?: boolean;
  /** Output file path */
  output?: string;
  /** Skip question types we don't support well */
  skipUnsupported?: boolean;
}

/** Cached embeddings for LongMemEval sessions */
export interface LongMemEvalEmbeddingsCache {
  version: string;
  model: string;
  variant: "s" | "m";
  /** Map of question_id -> session embeddings */
  entries: Record<
    string,
    {
      /** Embeddings for extracted memories from all sessions */
      memoryEmbeddings: Array<{
        sessionIndex: number;
        memoryIndex: number;
        embedding: number[];
        text: string;
      }>;
      /** Query embedding for the question */
      queryEmbedding: number[];
    }
  >;
}

/** Cached embeddings for chunked LongMemEval sessions */
export interface LongMemEvalChunkEmbeddingsCache {
  version: string;
  model: string;
  variant: "s" | "m";
  entries: Record<
    string,
    {
      chunks: Array<{
        sessionIndex: number;
        messageIndex: number;
        role: "user" | "assistant";
        contentHash: string;
        embedding: number[];
      }>;
    }
  >;
}
