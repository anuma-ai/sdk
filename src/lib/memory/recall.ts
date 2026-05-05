/**
 * Unified Recall API — single retrieval surface above vault + engine.
 *
 * Today: delegates to existing `searchVaultMemories` and `searchChunksOp`,
 * unifies the result shape under `RankedMemory`. Internals (BM25, RRF
 * fusion, reranker, recency boost, token-budget truncation) land Tue 5/5
 * inside this function — callers don't change.
 *
 * The legacy functions remain as thin wrappers in their existing modules
 * for backwards compatibility; new code should prefer `recall()`.
 */

import { searchChunksOp } from "../db/chat/operations.js";
import type { ChunkSearchResult } from "../db/chat/types.js";
import { generateEmbedding } from "../memoryEngine/embeddings.js";
import type { VaultSearchResult } from "../memoryVault/searchTool.js";
import { searchVaultMemories } from "../memoryVault/searchTool.js";
import type {
  Budget,
  MemoryKind,
  RankedMemory,
  RecallContext,
  RecallOptions,
  RecallResult,
} from "./types.js";

const DEFAULT_LIMIT = 8;
const DEFAULT_BUDGET: Budget = "low";
const DEFAULT_FACT_MIN_SCORE = 0.1;
const DEFAULT_CHUNK_MIN_SCORE = 0.5;

/**
 * Single entry point for memory retrieval across facts (vault) and chunks
 * (engine). Returns a unified, ranked list.
 */
export async function recall(
  query: string,
  ctx: RecallContext,
  options: RecallOptions = {}
): Promise<RecallResult> {
  const types: MemoryKind[] = options.types ?? ["fact"];
  const limit = options.limit ?? DEFAULT_LIMIT;
  const budget = options.budget ?? DEFAULT_BUDGET;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return { memories: [], usedBudget: budget, reranked: false, candidateCount: 0 };
  }

  // Embed once, share across stores.
  let queryEmbedding: number[] | undefined;
  const needsEmbedding =
    (types.includes("chunk") && ctx.storageCtx) || (types.includes("fact") && ctx.vaultCtx);
  if (needsEmbedding) {
    queryEmbedding = await generateEmbedding(query, ctx.embeddingOptions);
  }

  const factResults: VaultSearchResult[] = [];
  const chunkResults: ChunkSearchResult[] = [];

  if (types.includes("fact") && ctx.vaultCtx && ctx.vaultCache) {
    const vaultMinScore = options.minScore ?? DEFAULT_FACT_MIN_SCORE;
    const results = await searchVaultMemories(
      query,
      ctx.vaultCtx,
      ctx.embeddingOptions,
      ctx.vaultCache,
      {
        limit,
        minSimilarity: vaultMinScore,
        useFusion: true,
        ...(options.scopes && { scopes: options.scopes }),
        ...(options.folderId !== undefined && { folderId: options.folderId }),
      }
    );
    factResults.push(...results);
  }

  if (types.includes("chunk") && ctx.storageCtx && queryEmbedding) {
    const chunkMinScore = options.minScore ?? DEFAULT_CHUNK_MIN_SCORE;
    const results = await searchChunksOp(ctx.storageCtx, queryEmbedding, {
      limit,
      minSimilarity: chunkMinScore,
      ...(options.conversationId && { conversationId: options.conversationId }),
    });
    chunkResults.push(...results);
  }

  // Unify shapes. Today: simple interleave by score within each kind, then
  // sort the union by score. Tue's W1 work replaces this with RRF fusion +
  // BM25 + reranker + recency, all inside this function.
  const memories: RankedMemory[] = [
    ...factResults.map(toFactMemory),
    ...chunkResults.map(toChunkMemory).filter(filterExcluded(options.excludeConversationId)),
  ];

  memories.sort((a, b) => b.score - a.score);

  return {
    memories: memories.slice(0, limit),
    usedBudget: budget,
    reranked: false,
    candidateCount: memories.length,
  };
}

function toFactMemory(r: VaultSearchResult): RankedMemory {
  return {
    id: r.uniqueId,
    kind: "fact",
    content: r.content,
    score: r.similarity,
    scoreBreakdown: { cosine: r.similarity },
    // createdAt/updatedAt aren't on VaultSearchResult today; populated when we
    // wire the new ranker in W1. Use epoch as a placeholder so callers can
    // already typecheck.
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function toChunkMemory(r: ChunkSearchResult): RankedMemory {
  return {
    id: r.message.uniqueId,
    kind: "chunk",
    content: r.chunkText,
    score: r.similarity,
    scoreBreakdown: { cosine: r.similarity },
    conversationId: r.message.conversationId,
    messageId: r.message.uniqueId,
    role: r.message.role as "user" | "assistant",
    createdAt: r.message.createdAt,
    updatedAt: r.message.createdAt,
  };
}

function filterExcluded(excludeConversationId?: string) {
  return (m: RankedMemory) => !excludeConversationId || m.conversationId !== excludeConversationId;
}
