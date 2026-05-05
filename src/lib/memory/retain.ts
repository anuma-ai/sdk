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
import { consolidateMemory, type ConsolidateOptions } from "./consolidate.js";
import type { RetainOptions, RetainResult } from "./types.js";

const DEFAULT_AUTO_MERGE_THRESHOLD = 0.85;
/** Looser threshold for the consolidator candidate set — paraphrased dupes
 * cluster around 0.7–0.8, which the strict 0.85 cosine merge misses. */
const DEFAULT_CONSOLIDATE_THRESHOLD = 0.65;
const DEFAULT_CONSOLIDATE_TOP_K = 5;

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
    // Stage 1 — semantic consolidation (Hindsight-pattern), if enabled.
    // Pulls top-K memories above the looser consolidation floor (default
    // 0.65) and asks an LLM to decide create/update/noop. Catches
    // paraphrased duplicates the strict cosine-merge below misses.
    if (options.consolidateOptions) {
      const consolidationResult = await tryConsolidate(trimmed, ctx, options);
      if (consolidationResult) return consolidationResult;
    }

    // Stage 2 — strict cosine auto-merge. Use cosine-only search for
    // threshold semantics; the fusion ranker produces a different score
    // scale and isn't suitable for a pairwise-similarity gate.
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

/**
 * Stage 1 of the auto-merge path — LLM-based consolidation. Returns a
 * `RetainResult` when the LLM picked update or noop; returns `null` when
 * the LLM said create (or no candidates above the floor exist), in which
 * case the caller falls through to the strict cosine merge + create path.
 *
 * For "update": replaces the target's content with the consolidated form,
 * increments proof_count, unions source chunk ids. The new fact's
 * embedding is NOT regenerated for the target — the caller's content is
 * the merged form, and we re-embed once at update time so the cache stays
 * coherent for downstream retrieval.
 */
async function tryConsolidate(
  trimmed: string,
  ctx: RetainContext,
  options: RetainOptions
): Promise<RetainResult | null> {
  const consolidateOptions = options.consolidateOptions;
  if (!consolidateOptions) return null;

  const consolidateThreshold =
    options.consolidateThreshold ?? DEFAULT_CONSOLIDATE_THRESHOLD;
  const topK = options.consolidateTopK ?? DEFAULT_CONSOLIDATE_TOP_K;

  const matches = await searchVaultMemories(
    trimmed,
    ctx.vaultCtx,
    ctx.embeddingOptions,
    ctx.vaultCache,
    {
      limit: topK,
      minSimilarity: consolidateThreshold,
      useFusion: false,
      ...(options.scope !== undefined && { scopes: [options.scope] }),
      ...(options.folderId !== undefined && { folderId: options.folderId }),
    }
  );
  if (matches.length === 0) return null;

  const candidates = matches.map((m) => ({
    id: m.uniqueId,
    content: m.content,
    similarity: m.similarity,
  }));

  const { consolidateMemory: doConsolidate } = await import("./consolidate.js");
  const decision = await doConsolidate(trimmed, candidates, consolidateOptions);

  if (decision.action === "create") return null; // fall through to insert

  if (decision.action === "noop" && decision.targetId) {
    const existing = await getVaultMemoryOp(ctx.vaultCtx, decision.targetId);
    if (!existing) return null; // race: target gone, fall through to create
    const newProofCount = (existing.proofCount ?? 1) + 1;
    const mergedSourceIds = unionStrings(
      existing.sourceChunkIds ?? [],
      options.sourceChunkIds ?? []
    );
    await updateVaultMemoryOp(ctx.vaultCtx, decision.targetId, {
      content: existing.content,
      proofCount: newProofCount,
      sourceChunkIds: mergedSourceIds,
    });
    return {
      action: "merge",
      memoryId: decision.targetId,
      targetId: decision.targetId,
      proofCount: newProofCount,
    };
  }

  if (decision.action === "update" && decision.targetId && decision.content) {
    const existing = await getVaultMemoryOp(ctx.vaultCtx, decision.targetId);
    if (!existing) return null;
    const newProofCount = (existing.proofCount ?? 1) + 1;
    const mergedSourceIds = unionStrings(
      existing.sourceChunkIds ?? [],
      options.sourceChunkIds ?? []
    );
    // Re-embed the consolidated content; embeddingOptions includes the cache.
    const newEmbedding = await generateEmbedding(decision.content, ctx.embeddingOptions);
    ctx.vaultCache.set(decision.content, newEmbedding);
    await updateVaultMemoryOp(ctx.vaultCtx, decision.targetId, {
      content: decision.content,
      proofCount: newProofCount,
      sourceChunkIds: mergedSourceIds,
      embedding: JSON.stringify(newEmbedding),
    });
    return {
      action: "update",
      memoryId: decision.targetId,
      targetId: decision.targetId,
      proofCount: newProofCount,
    };
  }

  return null;
}
