/**
 * Unified memory layer types — the Recall / Retain API.
 *
 * This module defines the public surface for the new unified memory layer
 * that sits above `memoryVault` (curated facts) and `memoryEngine` (raw
 * conversation chunks). Callers should prefer these types over the legacy
 * `VaultSearchResult` / `ChunkSearchResult` shapes; the underlying stores
 * may converge later, the API will not.
 */

import type { ChunkVectorCache, StorageOperationsContext } from "../db/chat/operations.js";
import type { EntityOperationsContext } from "../db/entities/operations.js";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations.js";
import type { EmbeddingOptions } from "../memoryEngine/types.js";
import type { VaultEmbeddingCache } from "../memoryVault/searchTool.js";
import type { PiiRedactor } from "../pii/redactor.js";
import type { PortalLlmAuth } from "./portalLlm.js";
import type { RecencyOptions } from "./recency.js";

// Re-exported here so the public types surface is one module; the
// interface lives next to the fetch helper that enforces it.
export type { PortalLlmAuth } from "./portalLlm.js";

export type MemoryKind = "fact" | "chunk";

/**
 * Budget controls retrieval depth/cost. Higher budgets enable more
 * candidate sources and the cross-encoder reranker.
 *
 * - `low`: cosine + BM25 fusion only. No reranker. Mobile default.
 * - `mid`: + recency boost. Demo default.
 * - `high`: + cross-encoder rerank stage. Demo `budget: high` path.
 */
export type Budget = "low" | "mid" | "high";

export interface ScoreBreakdown {
  /** Raw cosine similarity. Set only when callers compute it explicitly
   * (e.g. cosine-only `useFusion: false` search); the fusion path sets
   * {@link fused} instead so the label stays honest. */
  cosine?: number;
  /** Composite score from the fused ranker (cosine + BM25 + RRF + recency
   * + proof boost). What `RankedMemory.score` carries when the fusion
   * pipeline ran. */
  fused?: number;
  bm25?: number;
  recency?: number;
  rerank?: number;
  /** Final RRF rank (1-indexed) before any boost. */
  rrfRank?: number;
}

/**
 * A ranked memory returned by `recall()`. Shape is uniform across kinds —
 * `kind` discriminates, kind-specific metadata is optional.
 */
export interface RankedMemory {
  id: string;
  kind: MemoryKind;
  content: string;
  score: number;
  scoreBreakdown?: ScoreBreakdown;

  // Fact-only
  sourceChunkIds?: string[];
  proofCount?: number;
  source?: string;
  folderId?: string | null;
  /**
   * Anchored event-time for the fact (the date the underlying event
   * occurred, not the write time). When present, the recall executor
   * surfaces it to the LLM as `(event: YYYY-MM-DD)` so the answer model
   * can do date arithmetic for temporal-reasoning questions. Null /
   * undefined means the fact has no anchored date.
   */
  eventTimeStart?: number | null;
  eventTimeEnd?: number | null;
  eventTimeKind?: "point" | "range" | "ongoing" | null;

  // Chunk-only
  conversationId?: string;
  messageId?: string;
  role?: "user" | "assistant";

  createdAt: Date;
  updatedAt: Date;
}

export interface RecallOptions {
  /** Which kinds to search. Default: ['fact']. */
  types?: MemoryKind[];
  /** Max items returned. Default: 8. */
  limit?: number;
  /** Token budget for the result; greedy-truncates after ranking. Not yet enforced; reserved for W1. */
  maxTokens?: number;
  /** Search depth. Default: 'low'. */
  budget?: Budget;
  /** Include source chunks for fact memories that have provenance. Default: false. */
  includeChunks?: boolean;
  /** Vault scope filter. Vault-only. */
  scopes?: string[];
  /** Vault folder filter. Vault-only. */
  folderId?: string | null;
  /** Restrict chunk search to one conversation. Chunk-only. */
  conversationId?: string;
  /** Exclude one conversation from chunk search. Chunk-only. */
  excludeConversationId?: string;
  /** Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults). */
  minScore?: number;
  /**
   * Auth + endpoint for the LLM-based query decomposition pass. Without
   * these, decompose is skipped even at `budget: 'high'`. Mirrors the
   * shape used by `searchVaultMemories`. Auth is the dual pattern — one
   * of `apiKey` / `getToken` is required; see {@link PortalLlmAuth}.
   */
  decomposeOptions?: PortalLlmAuth & {
    baseUrl?: string;
    model?: string;
  };
  /**
   * Reference "now" for resolving relative temporal phrases in the
   * query ("last week", "yesterday", "N days ago"). Default: `Date.now()`.
   * Override for back-dated evaluation harnesses (bench corpora dated
   * 2021–2023) and for deterministic tests — otherwise the W6 lane
   * resolves windows in 2026 and never overlaps stored event_time.
   */
  now?: number;
  /**
   * Best-effort observability hook. Called once per `recall()` with per-lane
   * timings, lane counts, and soft-degradation signals — the raw material for
   * tuning latency/quality and for wiring recall telemetry to PostHog. Invoked
   * synchronously just before `recall()` returns; a throwing callback is
   * swallowed (diagnostics must never break retrieval). Off unless provided.
   */
  onDiagnostics?: (diagnostics: RecallDiagnostics) => void;
  // -------------------------------------------------------------------------
  // Ranking tuning knobs — forwarded verbatim to the vault search pipeline.
  // All optional; defaults below match the pipeline's hardcoded behavior, so
  // omitting them is a no-op. Exposed for evaluation / ablation sweeps.
  // -------------------------------------------------------------------------
  /** Number of candidates fed to the cross-encoder rerank stage. Default: 30. */
  rerankTopN?: number;
  /** Multiplicative cross-encoder blend weight. Default: 0.1. */
  ceWeight?: number;
  /** Recency boost slope in the fused ranker. Default: 1.0. */
  recencyAlpha?: number;
  /** Recency decay curve overrides (per-year decay slope, floor, no-date multiplier). */
  recency?: RecencyOptions;
  /** Apply MMR diversification after ranking (rerank pipeline only). Default: false. */
  mmr?: boolean;
  /** Supersession score-gap transfer factor. Default: 0.8. */
  supersessionBoost?: number;
  /** Hard cap on the supersession candidate window. Default: 50. */
  supersessionWindow?: number;
  /** Proof-count log-boost scale. Default: 0.1. */
  proofCountAlpha?: number;
  /** Divisor mapping BM25 scores to the admission floor. Default: 50. */
  bm25AdmissionDivisor?: number;
  /** RRF smoothing constant for lane fusion (facts × chunks and side lanes). Default: 60. */
  rrfK?: number;
  /**
   * Decrypt vault memory content only for the top-N ranked candidates
   * instead of the whole vault. Forwarded verbatim to the vault search
   * pipeline's `MemoryVaultSearchOptions`. Default: off (legacy
   * whole-vault decrypt path).
   */
  decryptLast?: boolean;
}

export interface RecallContext {
  /** Required when `types` includes 'fact'. */
  vaultCtx?: VaultMemoryOperationsContext;
  /** Required when `types` includes 'chunk'. */
  storageCtx?: StorageOperationsContext;
  /** Embedding API options. */
  embeddingOptions: EmbeddingOptions;
  /** Vault embedding LRU cache. */
  vaultCache?: VaultEmbeddingCache;
  /**
   * Optional chunk-vector LRU cache. When provided, the chunk lane skips the
   * per-query decrypt + JSON.parse of every message's chunk vectors on warm
   * entries. Build via `createChunkVectorCache`. Omit for legacy behavior.
   */
  chunkCache?: ChunkVectorCache;
  /**
   * Optional — when provided, recall extracts entities from the query
   * and adds a graph lane to the RRF fusion (memories sharing entities
   * with the query rank higher). Build via `entityCollection` +
   * `memoryEntityCollection` from your DatabaseManager.
   */
  entityCtx?: EntityOperationsContext;
}

export interface RecallResult {
  memories: RankedMemory[];
  /** Diagnostic: budget actually used (may downgrade if reranker fails). */
  usedBudget: Budget;
  /** Diagnostic: was the reranker invoked? */
  reranked: boolean;
  /** Diagnostic: total candidates considered before truncation. */
  candidateCount: number;
  /** Diagnostic: total memories in the vault when fact lane was queried. */
  vaultSize?: number;
}

/** Soft-degradation signals surfaced via {@link RecallDiagnostics.degraded}. */
export type RecallDegradation =
  /** Rerank was requested (budget mid/high) but the cross-encoder didn't run
   *  this call — unavailable (e.g. React Native) or a transient failure. */
  | "rerank-unavailable"
  /** `budget: 'high'` requested but no `decomposeOptions`, so query
   *  decomposition was skipped and the budget downgraded to mid. */
  | "decompose-unavailable";

/**
 * Per-call recall observability payload (see {@link RecallOptions.onDiagnostics}).
 * All timings are wall-clock milliseconds. Lane counts are post-dedupe,
 * pre-fusion. Intended to be forwarded to a metrics sink (e.g. PostHog).
 */
export interface RecallDiagnostics {
  /** Budget actually executed (may have downgraded from the requested one). */
  usedBudget: Budget;
  /** Whether the cross-encoder actually reranked the fact lane this call. */
  reranked: boolean;
  /** Total candidates considered before truncation. */
  candidateCount: number;
  /** Total vault size when the fact lane ran (absent if it didn't). */
  vaultSize?: number;
  /** Facts the fact lane returned (post-dedupe, pre-fusion). */
  factCount: number;
  /** Chunks the chunk lane returned (post-dedupe, pre-fusion). */
  chunkCount: number;
  /** Wall-clock phase timings (ms). */
  timings: {
    /** Whole `recall()` call. */
    total: number;
    /** Parallel query-embed + graph/temporal side-lane build. */
    prep: number;
    /** Vault fact-lane search (`searchVaultMemoriesWithSize`). */
    factLane: number;
    /** Chunk-lane search (`searchChunksOp`). */
    chunkLane: number;
    /** Cross-lane RRF fusion + provenance dedup after both lanes. */
    fuse: number;
  };
  /** Soft-degradation signals that fired this call (empty when clean). */
  degraded: RecallDegradation[];
}

// ---------------------------------------------------------------------------
// Retain API — for completeness / future-proofing. Implemented Wed 5/6 (W2).
// ---------------------------------------------------------------------------

export type RetainAction = "create" | "merge" | "update" | "skip" | "suppressed" | "supersede";
export type RetainSource = "manual" | "auto-extracted" | "capsule";

/** Why the consolidator fell back to "create" instead of a real decision. */
export type ConsolidationFallbackReason = "llm_error" | "invalid_response";

export interface RetainOptions {
  source?: RetainSource;
  sourceChunkIds?: string[];
  scope?: string;
  folderId?: string | null;
  /** When provided, applies merge-on-write logic instead of plain insert. */
  enableAutoMerge?: boolean;
  /**
   * When true, a would-be create is suppressed if it matches a soft-deleted
   * ("tombstoned") memory above the auto-merge threshold — so auto-extraction
   * can't silently resurrect a fact the user deleted. Off by default so manual
   * and other `retain()` callers are unaffected; auto-extraction opts in.
   * Returns `action: 'suppressed'` with the matched `tombstoneId`.
   */
  respectTombstones?: boolean;
  /** Cosine similarity threshold for auto-merge. Default: 0.85. */
  autoMergeThreshold?: number;
  /**
   * When provided, runs an LLM-based consolidation pass against the top-K
   * existing memories above `consolidateThreshold` (looser than auto-merge).
   * The LLM emits create/update/noop per Hindsight's facet-dedup rules.
   * Auth/endpoint required — one of `apiKey` / `getToken` (see
   * {@link PortalLlmAuth}); without this option we keep the cosine-only path.
   */
  consolidateOptions?: PortalLlmAuth & {
    baseUrl?: string;
    model?: string;
    /**
     * Invoked when the consolidator degrades to its "create" fallback
     * instead of returning a real decision — `llm_error` for network /
     * timeout / unparseable output, `invalid_response` for well-formed
     * JSON that violates the schema (unknown action, bad targetId).
     * A flaky consolidator silently accumulates duplicate memories;
     * wire this to logging/metrics so the fallback rate is observable.
     */
    onFallback?: (reason: ConsolidationFallbackReason) => void;
    /**
     * When set, the new fact and existing candidates are PII-redacted before
     * the consolidation model sees them and the result is de-anonymized before
     * persistence. Auto-extraction inherits this from its `extract` options.
     */
    piiRedaction?: boolean | PiiRedactor;
  };
  /** Cosine similarity floor for the consolidator candidate set. Default: 0.65. */
  consolidateThreshold?: number;
  /** Top-K consolidation candidates to feed the LLM. Default: 5. */
  consolidateTopK?: number;
  /**
   * W6 temporal lane — when the event in this fact occurred. Persisted to
   * memory_vault.event_time_* columns; recall's temporal lane filters
   * and boosts memories whose event-time overlaps the query window.
   * Auto-extraction emits this; manual writes can omit it.
   */
  eventTime?: {
    kind: "point" | "range" | "ongoing";
    start: number;
    end: number | null;
  } | null;
}

export interface RetainResult {
  action: RetainAction;
  memoryId: string;
  /** When action is 'merge' or 'update', the prior memory's id. When action is
   * 'supersede', the stale memory that was retired (`memoryId` is the new one). */
  targetId?: string;
  /**
   * When action is 'suppressed', the id of the soft-deleted memory that blocked
   * re-creation. `memoryId` is set to the same id (no new memory was written).
   */
  tombstoneId?: string;
  /** Updated proof_count after this write. 0 when nothing was written (suppressed). */
  proofCount: number;
}
