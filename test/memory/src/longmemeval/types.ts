/**
 * LongMemEval Dataset Types
 *
 * Based on the LongMemEval benchmark: https://github.com/xiaowu0162/LongMemEval
 */

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
  /** Set when the judge could not reach a verdict at all (transport failure,
   *  starved completion, unparseable response). `isCorrect` is false in that
   *  case but means nothing — this question is NOT a wrong answer and is
   *  excluded from the accuracy denominator. */
  judgeError?: string;
  /** Set when the answer step produced nothing to judge — it threw, or came
   *  back with empty content. Same deal as `judgeError`: `isCorrect` is false
   *  but meaningless, and the question is excluded from the denominator rather
   *  than counted as a miss. The judge is not called at all in this case. */
  answerError?: string;
  /** Set when the entry crashed outside the answer and judge steps and the
   *  suite's per-entry catch fabricated a placeholder. That placeholder also
   *  zeroes the retrieval numbers, so it is tracked apart from the other two
   *  rather than folded in — but like them it is excluded from the accuracy
   *  denominator, because a crashed entry is not a wrong answer either. */
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
  /** Questions the judge could not rule on. Nonzero means the accuracy below
   *  is measuring a smaller sample than `totalQuestions`, and a run where it
   *  equals `totalQuestions` measured nothing at all. */
  judgeFailures: number;
  /** Questions whose answer step produced nothing to judge. Counted apart from
   *  `judgeFailures` because they point at a different culprit — the answer
   *  model or its completion budget rather than the grader — but excluded from
   *  the accuracy denominator for the same reason. */
  answerFailures: number;
  /** Questions that crashed before either step could report. Their placeholder
   *  result also carries zeroed retrieval numbers, so a nonzero count here means
   *  the retrieval figures are understated too — not just the accuracy. */
  harnessFailures: number;
  /** Correct answers over the questions that were actually SCORED
   *  (`totalQuestions - judgeFailures - answerFailures - harnessFailures`), not over all
   *  questions. Neither failure is a wrong answer, and counting them as such
   *  is what made a broken evaluation step indistinguishable from a memory
   *  system that answered nothing right. 0 when nothing was scored. */
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

/**
 * Retrieval-ranking tuning knobs swept by the eval harness. Every field is
 * optional; when omitted the SDK's hardcoded defaults apply, so an empty
 * object is always a behavioral no-op. Field names match the SDK option
 * names (`MemoryVaultSearchOptions` / `RecallOptions`) except for
 * `recencyDecay`/`recencyFloor`, which map onto `recency.perYearDecay` /
 * `recency.floor`.
 */
export interface RetrievalTuningKnobs {
  /** Cross-encoder multiplicative blend weight. SDK default 0.1. */
  ceWeight?: number;
  /** Recency boost slope in the fused ranker. SDK default 1.0. */
  recencyAlpha?: number;
  /** Recency per-year linear decay slope. SDK default 0.2. */
  recencyDecay?: number;
  /** Recency multiplier floor. SDK default 0.1. */
  recencyFloor?: number;
  /** RRF smoothing constant for lane fusion. SDK default 60. */
  rrfK?: number;
  /** Supersession score-gap transfer factor. SDK default 0.8. */
  supersessionBoost?: number;
  /** Hard cap on the supersession candidate window. SDK default 50. */
  supersessionWindow?: number;
  /** Proof-count log-boost scale. SDK default 0.1. */
  proofCountAlpha?: number;
  /** Enable MMR diversification (rerank pipeline only). SDK default off. */
  mmr?: boolean;
  /** Cross-encoder rerank candidate count (SDK `rerankTopN`). SDK default 30. */
  rerankTopN?: number;
  /** BM25 admission divisor (SDK `bm25AdmissionDivisor`). SDK default 50. */
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
  /** Enable cross-encoder rerank in the vault search tool. Default true. */
  rerank?: boolean;
  /** "off" | "llm" — LLM-based query decomposition for composite queries. Default "llm". */
  decompose?: "off" | "llm";
  /** Enable LLM-based consolidation pass at retain time. Default true. */
  consolidate?: boolean;
  /** Max chars per session when building chunk source for the chunk lane. Default 12000. */
  chunkSourceMaxChars?: number;
  /** Max chars per excerpt emitted to the answer LLM in the tool result. Default 8000. */
  excerptMaxChars?: number;
  /** Lanes to query when --strategy=recall. "fact" matches the chat client
   *  today (searchTool.ts:1029); "fact-chunk" exercises the full recall()
   *  pipeline; "chunk" is an ablation (chunks only, no facts).
   *  Default "fact-chunk". */
  recallTypes?: RecallTypes;
  /** Emission style when --strategy=recall. "rrf" (recall.ts default,
   *  single ranked list) or "blocks" (vault-eval pattern, fact + chunk
   *  sections). Default "rrf". */
  recallEmit?: RecallEmit;
  /** Lane-call mode when --strategy=recall and types=fact-chunk.
   *  "fused" = one recall(types=fact,chunk) call. "per-lane" = two
   *  separate calls, no inter-lane slot competition. Default "fused". */
  recallLaneMode?: RecallLaneMode;
}

export type RecallTypes = "fact" | "chunk" | "fact-chunk";
export type RecallEmit = "rrf" | "blocks";
/** "fused" runs one recall(types=[...]) call (RRF inside recall.ts).
 *  "per-lane" runs recall once per lane (matches vault-eval behavior:
 *  no inter-lane slot competition, each lane gets its own pool). */
export type RecallLaneMode = "fused" | "per-lane";

/** API configuration for LLM and embedding calls */
export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  llmModel: string;
  /** Model for session-memory extraction. Defaults to llmModel. Lets a
   *  reasoning-heavy answer model (e.g. kimi) pair with a JSON-reliable
   *  extractor (e.g. gpt-5-mini, matching production autoExtract). */
  extractionModel?: string;
  /** Model for the answer judge. Defaults to llmModel, i.e. the model under
   *  evaluation grades its own answers — kept as the default so numbers stay
   *  comparable with every historical run, but overridable (`--judge-llm`)
   *  when the answer model is a poor grader or is the thing that's broken. */
  judgeModel?: string;
}
