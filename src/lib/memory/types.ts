/**
 * Unified memory layer types — the Recall / Retain API.
 *
 * This module defines the public surface for the new unified memory layer
 * that sits above `memoryVault` (curated facts) and `memoryEngine` (raw
 * conversation chunks). Callers should prefer these types over the legacy
 * `VaultSearchResult` / `ChunkSearchResult` shapes; the underlying stores
 * may converge later, the API will not.
 */

import type { StorageOperationsContext } from "../db/chat/operations.js";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations.js";
import type { EmbeddingOptions } from "../memoryEngine/types.js";
import type { VaultEmbeddingCache } from "../memoryVault/searchTool.js";

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
  cosine?: number;
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
}

export interface RecallResult {
  memories: RankedMemory[];
  /** Diagnostic: budget actually used (may downgrade if reranker fails). */
  usedBudget: Budget;
  /** Diagnostic: was the reranker invoked? */
  reranked: boolean;
  /** Diagnostic: total candidates considered before truncation. */
  candidateCount: number;
}

// ---------------------------------------------------------------------------
// Retain API — for completeness / future-proofing. Implemented Wed 5/6 (W2).
// ---------------------------------------------------------------------------

export type RetainAction = "create" | "merge" | "update" | "skip";
export type RetainSource = "manual" | "auto-extracted" | "capsule";

export interface RetainOptions {
  source?: RetainSource;
  sourceChunkIds?: string[];
  scope?: string;
  folderId?: string | null;
  /** When provided, applies merge-on-write logic instead of plain insert. */
  enableAutoMerge?: boolean;
  /** Cosine similarity threshold for auto-merge. Default: 0.85. */
  autoMergeThreshold?: number;
}

export interface RetainResult {
  action: RetainAction;
  memoryId: string;
  /** When action is 'merge' or 'update', the prior memory's id. */
  targetId?: string;
  /** Updated proof_count after this write. */
  proofCount: number;
}
