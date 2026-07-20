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
  getAllVaultMemoriesOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants.js";
import { generateEmbedding } from "../memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../memoryEngine/types.js";
import { cosineSimilarity } from "../memoryEngine/vector.js";
import { searchVaultMemories, type VaultEmbeddingCache } from "../memoryVault/searchTool.js";
import type { RetainOptions, RetainResult } from "./types.js";

const DEFAULT_AUTO_MERGE_THRESHOLD = 0.85;
/** Scope an unset `options.scope` resolves to — matches the DB write default
 * (`createVaultMemoryOp`). Used for BOTH the dedup search and the write so they
 * stay symmetric (see retain()). */
const DEFAULT_SCOPE = "private";
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

  // Resolve the scope ONCE and use it for both the dedup search and the write.
  // Leaving the search unscoped (its old behavior) made read and write
  // asymmetric: an unscoped search could match — and merge into — a memory in a
  // different scope, or, when a caller passed a scope, miss a dupe sitting in
  // the default scope and create a duplicate. Searching the exact scope we'll
  // write to keeps dedup correct.
  const resolvedScope = options.scope ?? DEFAULT_SCOPE;

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
        scopes: [resolvedScope],
        ...(options.folderId !== undefined && { folderId: options.folderId }),
      }
    );

    if (matches.length > 0) {
      const targetId = matches[0].uniqueId;
      const existing = await getVaultMemoryOp(ctx.vaultCtx, targetId);
      if (existing) {
        const mergedSourceIds = unionStrings(
          existing.sourceChunkIds ?? [],
          options.sourceChunkIds ?? []
        );
        // proofCountIncrement (not absolute proofCount) so two parallel
        // retain() calls don't race a read-modify-write and lose updates.
        const eventTimeUpdate = pickEventTimeUpdate(existing, options.eventTime);
        const updated = await updateVaultMemoryOp(ctx.vaultCtx, targetId, {
          content: existing.content,
          proofCountIncrement: 1,
          sourceChunkIds: mergedSourceIds,
          preserveUpdatedAt: true,
          ...(eventTimeUpdate && { eventTime: eventTimeUpdate }),
        });
        if (updated) {
          return {
            action: "merge",
            memoryId: targetId,
            targetId,
            proofCount: updated.proofCount ?? (existing.proofCount ?? 1) + 1,
          };
        }
        // A null result collapses two very different outcomes: the target was
        // deleted mid-flight (benign race → fall through to create), or the
        // write itself threw inside updateVaultMemoryOp and the target is
        // still there. Re-probe to tell them apart — falling through on a real
        // write failure would create a duplicate that callers then link
        // entities to, instead of surfacing (and letting them retry) the failure.
        await assertMergeTargetGoneOrThrow(ctx, targetId);
      }
    }
  }

  // No merge candidate (or auto-merge disabled, or the merge target was
  // deleted between search and write): create a new memory.
  const embedding = await generateEmbedding(trimmed, ctx.embeddingOptions);
  const embeddingModel = ctx.embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;

  // Tombstone gate: if this create matches a soft-deleted memory, the user (or
  // the cleanup pass) removed that fact — don't let auto-extraction silently
  // resurrect it. Runs only on the create path (the live-merge search above
  // excludes deleted rows), and only when the caller opts in (auto-extraction
  // does; manual writes don't). Also closes the #647-M4 delete-race: a merge
  // target that vanished mid-flight is now soft-deleted, so it's suppressed
  // here instead of re-created.
  if (options.respectTombstones) {
    const tombstoneId = await findTombstoneMatch(embedding, embeddingModel, resolvedScope, ctx, {
      threshold,
      folderId: options.folderId,
    });
    if (tombstoneId) {
      return { action: "suppressed", memoryId: tombstoneId, tombstoneId, proofCount: 0 };
    }
  }

  const created = await createVaultMemoryOp(ctx.vaultCtx, {
    content: trimmed,
    scope: resolvedScope,
    ...(options.folderId !== undefined && { folderId: options.folderId }),
    embedding: JSON.stringify(embedding),
    embeddingModel,
    ...(options.sourceChunkIds &&
      options.sourceChunkIds.length > 0 && {
        sourceChunkIds: options.sourceChunkIds,
      }),
    proofCount: 1,
    source: options.source ?? "manual",
    ...(options.eventTime !== undefined &&
      options.eventTime !== null && {
        eventTime: {
          start: options.eventTime.start,
          end: options.eventTime.end,
          kind: options.eventTime.kind,
        },
      }),
  });

  // Cache is keyed by memory id (not content) — set after the create returns
  // the uniqueId. Float32Array = model-native precision, half the RAM of a
  // float64 number[].
  ctx.vaultCache.set(created.uniqueId, Float32Array.from(embedding));

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
 * Return the id of a soft-deleted ("tombstoned") memory whose embedding is
 * within `threshold` cosine of the incoming candidate, or null.
 *
 * Soft-deleted rows keep their `content`/`embedding`/`scope` (delete only flips
 * `is_deleted`), so they double as the tombstone store — no separate table.
 * `getAllVaultMemoriesOp` is the one read path that surfaces deleted rows
 * (`includeDeleted`); we filter to the deleted ones and cosine-match against the
 * persisted embedding (the id-keyed cache isn't populated for deleted rows).
 *
 * Scoped exactly like the live-merge search — same `scope` AND `folderId` — so a
 * fact deleted in one folder can't suppress a valid extraction into another.
 * Only rows embedded with the SAME model are compared: cosine across two
 * embedding spaces (a model swap at equal dimensionality) is meaningless and
 * would cause false suppressions/misses.
 */
async function findTombstoneMatch(
  embedding: number[],
  embeddingModel: string,
  scope: string,
  ctx: RetainContext,
  opts: { threshold: number; folderId?: string | null }
): Promise<string | null> {
  const rows = await getAllVaultMemoriesOp(ctx.vaultCtx, {
    includeDeleted: true,
    scopes: [scope],
    ...(opts.folderId !== undefined && { folderId: opts.folderId }),
  });
  let bestId: string | null = null;
  let bestSim = opts.threshold;
  for (const row of rows) {
    if (!row.isDeleted || !row.embedding) continue;
    // Only compare vectors from the same embedding space.
    if (row.embeddingModel !== embeddingModel) continue;
    let vec: number[];
    try {
      vec = JSON.parse(row.embedding) as number[];
    } catch {
      continue;
    }
    if (!Array.isArray(vec) || vec.length !== embedding.length) continue;
    const sim = cosineSimilarity(embedding, vec);
    if (sim >= bestSim) {
      bestSim = sim;
      bestId = row.uniqueId;
    }
  }
  return bestId;
}

/**
 * Decide whether the incoming observation's event_time should overwrite
 * the target's. The target wins by default — the original write was the
 * authoritative anchor; a re-observation with a vaguer or differently-
 * dated anchor would silently corrupt it.
 *
 * Inherit only when the target carries no anchor at all (`eventTimeStart`
 * is null) and the new observation has one.
 */
function pickEventTimeUpdate(
  existing: { eventTimeStart: number | null },
  incoming: RetainOptions["eventTime"]
):
  | { start: number | null; end: number | null; kind: "point" | "range" | "ongoing" | null }
  | undefined {
  if (incoming === undefined || incoming === null) return undefined;
  if (existing.eventTimeStart !== null) return undefined;
  return { start: incoming.start, end: incoming.end, kind: incoming.kind };
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

  const consolidateThreshold = options.consolidateThreshold ?? DEFAULT_CONSOLIDATE_THRESHOLD;
  const topK = options.consolidateTopK ?? DEFAULT_CONSOLIDATE_TOP_K;
  // Same scope resolution as retain() — search the scope we'll write to.
  const resolvedScope = options.scope ?? DEFAULT_SCOPE;

  const matches = await searchVaultMemories(
    trimmed,
    ctx.vaultCtx,
    ctx.embeddingOptions,
    ctx.vaultCache,
    {
      limit: topK,
      minSimilarity: consolidateThreshold,
      useFusion: false,
      scopes: [resolvedScope],
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
    const mergedSourceIds = unionStrings(
      existing.sourceChunkIds ?? [],
      options.sourceChunkIds ?? []
    );
    const eventTimeUpdate = pickEventTimeUpdate(existing, options.eventTime);
    const updated = await updateVaultMemoryOp(ctx.vaultCtx, decision.targetId, {
      content: existing.content,
      proofCountIncrement: 1,
      sourceChunkIds: mergedSourceIds,
      preserveUpdatedAt: true,
      ...(eventTimeUpdate && { eventTime: eventTimeUpdate }),
    });
    if (!updated) {
      // Target gone → fall through to create; genuine write failure → throw
      // rather than silently create a duplicate. See assertMergeTargetGoneOrThrow.
      await assertMergeTargetGoneOrThrow(ctx, decision.targetId);
      return null;
    }
    return {
      action: "merge",
      memoryId: decision.targetId,
      targetId: decision.targetId,
      proofCount: updated.proofCount ?? (existing.proofCount ?? 1) + 1,
    };
  }

  if (decision.action === "update" && decision.targetId && decision.content) {
    const existing = await getVaultMemoryOp(ctx.vaultCtx, decision.targetId);
    if (!existing) return null;
    const mergedSourceIds = unionStrings(
      existing.sourceChunkIds ?? [],
      options.sourceChunkIds ?? []
    );
    // Re-embed the consolidated content; embeddingOptions includes the cache.
    const newEmbedding = await generateEmbedding(decision.content, ctx.embeddingOptions);
    const consolidatedModel = ctx.embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
    const eventTimeUpdate = pickEventTimeUpdate(existing, options.eventTime);
    const updated = await updateVaultMemoryOp(ctx.vaultCtx, decision.targetId, {
      content: decision.content,
      proofCountIncrement: 1,
      sourceChunkIds: mergedSourceIds,
      embedding: JSON.stringify(newEmbedding),
      embeddingModel: consolidatedModel,
      // Even when the LLM rewrites content into a richer paraphrase,
      // this is still a re-observation of an existing fact — not a new
      // one. Preserving updated_at keeps the recency multiplier honest
      // and matches the merge/noop paths above.
      preserveUpdatedAt: true,
      ...(eventTimeUpdate && { eventTime: eventTimeUpdate }),
    });
    if (!updated) {
      // Target gone → fall through to create; genuine write failure → throw
      // rather than silently create a duplicate. See assertMergeTargetGoneOrThrow.
      await assertMergeTargetGoneOrThrow(ctx, decision.targetId);
      return null;
    }
    // Cache keyed by memory id (not content) — set only after the DB write
    // committed, so a failed update can't poison the cache with a vector for
    // content that was never persisted.
    ctx.vaultCache.set(decision.targetId, Float32Array.from(newEmbedding));
    return {
      action: "update",
      memoryId: decision.targetId,
      targetId: decision.targetId,
      proofCount: updated.proofCount ?? (existing.proofCount ?? 1) + 1,
    };
  }

  return null;
}

/**
 * Called when an auto-merge write (`updateVaultMemoryOp`) returns null. That
 * op collapses two very different outcomes into null: the target was
 * concurrently deleted (a benign race — the caller should fall through and
 * create), or the write path threw and the memory is still there (a genuine
 * failure). Re-probe to tell them apart: if the target still exists, the merge
 * failed to persist, so throw rather than let the caller silently create a
 * duplicate that entities would then link to.
 */
async function assertMergeTargetGoneOrThrow(ctx: RetainContext, targetId: string): Promise<void> {
  const stillExists = await getVaultMemoryOp(ctx.vaultCtx, targetId);
  if (stillExists) {
    throw new Error(`retain: merge into memory ${targetId} failed to persist`);
  }
}
