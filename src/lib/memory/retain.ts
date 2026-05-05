/**
 * Retain API — single write surface for the unified memory layer with
 * write-time auto-merge.
 *
 * On write, retain() searches for the nearest existing memory and, if its
 * cosine similarity to the new content exceeds the auto-merge threshold,
 * folds the new fact into the existing record (incrementing proof_count
 * and unioning source_chunk_ids). Otherwise it inserts a new memory.
 *
 * This is the W4 (auto-merge / dedup) workstream made callable. The W2
 * auto-extraction worker uses retain() as its write step, with the LLM
 * resolver upstream deciding when auto-merge should be enabled vs when
 * a semantic update should be applied via the lower-level update op.
 */

import {
  createVaultMemoryOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations.js";
import { generateEmbedding } from "../memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../memoryEngine/types.js";
import { searchVaultMemories, type VaultEmbeddingCache } from "../memoryVault/searchTool.js";
import type { RetainOptions, RetainResult } from "./types.js";

const DEFAULT_AUTO_MERGE_THRESHOLD = 0.85;

export interface RetainContext {
  vaultCtx: VaultMemoryOperationsContext;
  embeddingOptions: EmbeddingOptions;
  vaultCache: VaultEmbeddingCache;
}

/**
 * Persist a memory, merging into the nearest existing record if its
 * cosine similarity exceeds the auto-merge threshold.
 *
 * Default behavior (autoMerge ON): proof_count increments on the merged
 * target, source_chunk_ids accumulate (union), content is left untouched.
 * The caller doesn't see a duplicate and the original memory's UI badge
 * shows it has been re-observed.
 *
 * Pass `enableAutoMerge: false` for a force-create (W2 resolver path
 * after it has explicitly decided "create new").
 */
export async function retain(
  content: string,
  ctx: RetainContext,
  options: RetainOptions = {}
): Promise<RetainResult> {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new Error("retain: content cannot be empty");
  }

  const enableAutoMerge = options.enableAutoMerge ?? true;
  const threshold = options.autoMergeThreshold ?? DEFAULT_AUTO_MERGE_THRESHOLD;

  if (enableAutoMerge) {
    // Use cosine-only search for threshold semantics. The fusion ranker
    // produces a different score scale and isn't suitable for a
    // pairwise-similarity gate.
    const matches = await searchVaultMemories(
      trimmed,
      ctx.vaultCtx,
      ctx.embeddingOptions,
      ctx.vaultCache,
      {
        limit: 1,
        minSimilarity: threshold,
        useFusion: false,
        ...(options.scope !== undefined && { scopes: [options.scope] }),
        ...(options.folderId !== undefined && { folderId: options.folderId }),
      }
    );

    if (matches.length > 0) {
      const targetId = matches[0].uniqueId;
      const existing = await getVaultMemoryOp(ctx.vaultCtx, targetId);
      if (existing) {
        const newProofCount = (existing.proofCount ?? 1) + 1;
        const mergedSourceIds = unionStrings(
          existing.sourceChunkIds ?? [],
          options.sourceChunkIds ?? []
        );
        await updateVaultMemoryOp(ctx.vaultCtx, targetId, {
          content: existing.content,
          proofCount: newProofCount,
          sourceChunkIds: mergedSourceIds,
        });
        return {
          action: "merge",
          memoryId: targetId,
          targetId,
          proofCount: newProofCount,
        };
      }
    }
  }

  // No merge candidate (or auto-merge disabled): create a new memory.
  const embedding = await generateEmbedding(trimmed, ctx.embeddingOptions);
  ctx.vaultCache.set(trimmed, embedding);

  const created = await createVaultMemoryOp(ctx.vaultCtx, {
    content: trimmed,
    ...(options.scope !== undefined && { scope: options.scope }),
    ...(options.folderId !== undefined && { folderId: options.folderId }),
    embedding: JSON.stringify(embedding),
    ...(options.sourceChunkIds && options.sourceChunkIds.length > 0 && {
      sourceChunkIds: options.sourceChunkIds,
    }),
    proofCount: 1,
    source: options.source ?? "manual",
  });

  return {
    action: "create",
    memoryId: created.uniqueId,
    proofCount: 1,
  };
}

function unionStrings(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}
