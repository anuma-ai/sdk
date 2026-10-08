import {
  createSupersedingMemoryOp,
  createVaultMemoryOp,
  getAllVaultMemoriesOp,
  getVaultMemoryOp,
  supersedeVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations.js";
import { getLogger } from "../logger.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants.js";
import { generateEmbedding } from "../memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../memoryEngine/types.js";
import { cosineSimilarity } from "../memoryEngine/vector.js";
import {
  type PreparedVaultCandidates,
  prepareVaultCandidates,
  rankPreparedVaultCandidates,
  type VaultEmbeddingCache,
} from "../memoryVault/searchTool.js";
import { cacheRowVector } from "../memoryVault/vectorVersion.js";
import { notifyConsolidationFallback } from "./consolidationFallback.js";
import type { RetainOptions, RetainResult } from "./types.js";

const DEFAULT_AUTO_MERGE_THRESHOLD = 0.8;
const DEFAULT_SCOPE = "private";
const DEFAULT_CONSOLIDATE_THRESHOLD = 0.55;
const DEFAULT_CONSOLIDATE_TOP_K = 20;

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

  const resolvedScope = options.scope ?? DEFAULT_SCOPE;

  let supersedeTargetIds: string[] = [];
  let consolidationDecidedCreate = false;
  let supersedeContent: string | undefined;
  let prepared: PreparedVaultCandidates | undefined;

  if (enableAutoMerge) {
    prepared = await prepareVaultCandidates(
      trimmed,
      ctx.vaultCtx,
      ctx.embeddingOptions,
      ctx.vaultCache,
      {
        limit: Math.max(options.consolidateTopK ?? DEFAULT_CONSOLIDATE_TOP_K, 1),
        useFusion: false,
        scopes: [resolvedScope],
        includeArchived: true,
        ...(options.folderId !== undefined && { folderId: options.folderId }),
      }
    );

    if (prepared.embeddingFailure || prepared.embeddingsUnavailable) {
      throw new Error(
        "retain: embeddings unavailable — refusing to auto-merge against an inert cosine lane, " +
          "which would create a duplicate instead of merging into the existing memory. Retry " +
          "when embeddings recover, or pass enableAutoMerge: false to force a create."
      );
    }

    if (options.consolidateOptions) {
      const outcome = await tryConsolidate(trimmed, ctx, options, prepared);
      if (outcome) {
        if ("done" in outcome) return outcome.done;
        if ("create" in outcome) {
          consolidationDecidedCreate = true;
        } else {
          supersedeTargetIds = outcome.supersede;
          supersedeContent = outcome.content;
        }
      }
    }

    if (supersedeTargetIds.length === 0) {
      const { results: matches } = await rankPreparedVaultCandidates(
        trimmed,
        prepared,
        ctx.embeddingOptions,
        {
          limit: 1,
          minSimilarity: threshold,
          useFusion: false,
        }
      );

      if (matches.length > 0) {
        const targetId = matches[0].uniqueId;
        const existing = await getVaultMemoryOp(ctx.vaultCtx, targetId);
        if (existing && !existing.supersededBy) {
          const mergedSourceIds = unionStrings(
            existing.sourceChunkIds ?? [],
            options.sourceChunkIds ?? []
          );
          const eventTimeUpdate = pickEventTimeUpdate(existing, options.eventTime);
          const factTypeUpdate = pickFactTypeUpdate(existing, options.factType);
          const resurrect = resurrectFields(existing);
          const updated = await updateVaultMemoryOp(ctx.vaultCtx, targetId, {
            content: existing.content,
            proofCountIncrement: 1,
            observationSourceIds: options.sourceChunkIds,
            sourceChunkIds: mergedSourceIds,
            ...resurrect,
            lastObservedAt: Date.now(),
            ...(eventTimeUpdate && { eventTime: eventTimeUpdate }),
            ...(factTypeUpdate !== undefined && { factType: factTypeUpdate }),
          });
          if (updated) {
            return {
              action: "merge",
              memoryId: targetId,
              targetId,
              proofCount: updated.proofCount ?? (existing.proofCount ?? 1) + 1,
              similarity: matches[0].similarity,
              ...(consolidationDecidedCreate && { consolidation: "create" as const }),
            };
          }
          await assertMergeTargetGoneOrThrow(ctx, targetId);
        }
      }
    }
  }

  const contentToWrite = supersedeContent ?? trimmed;
  const reusableQueryEmbedding =
    supersedeContent === undefined && prepared && prepared.queryEmbedding.length > 0
      ? prepared.queryEmbedding
      : undefined;
  const embedding =
    reusableQueryEmbedding ?? (await generateEmbedding(contentToWrite, ctx.embeddingOptions));
  const embeddingModel = ctx.embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;

  if (options.respectTombstones) {
    const tombstone = await findTombstoneMatch(embedding, embeddingModel, resolvedScope, ctx, {
      threshold,
      folderId: options.folderId,
    });
    if (tombstone) {
      return {
        action: "suppressed",
        memoryId: tombstone.id,
        tombstoneId: tombstone.id,
        proofCount: 0,
        similarity: tombstone.similarity,
      };
    }
  }

  const createOpts = {
    content: contentToWrite,
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
    ...(options.factType !== undefined && { factType: options.factType }),
    ...(options.trustTier !== undefined && { trustTier: options.trustTier }),
  };

  if (supersedeTargetIds.length > 0) {
    const [primaryTargetId, ...restTargetIds] = supersedeTargetIds;
    const { created, retired } = await createSupersedingMemoryOp(
      ctx.vaultCtx,
      createOpts,
      primaryTargetId
    );
    if (created && retired) {
      cacheRowVector(
        ctx.vaultCache,
        created.uniqueId,
        Float32Array.from(embedding),
        created.updatedAt,
        createOpts.content
      );
      const liveLeftovers: string[] = [];
      for (const staleId of restTargetIds) {
        let ok = false;
        try {
          ok = (await supersedeVaultMemoryOp(ctx.vaultCtx, staleId, created.uniqueId)) === true;
        } catch {
          // retire threw → `ok` stays false; re-read below tells apart a genuine
          // live leftover from an already-gone row.
        }
        if (ok) continue;
        const stillLive = await getVaultMemoryOp(ctx.vaultCtx, staleId).catch(() => null);
        if (stillLive && !stillLive.supersededBy) liveLeftovers.push(staleId);
      }
      if (liveLeftovers.length > 0) {
        getLogger().warn(
          "[memory/retain] supersede left duplicate row(s) live — will reconcile at next consolidation",
          {
            newMemoryId: created.uniqueId,
            leftover: liveLeftovers.length,
            leftoverIds: liveLeftovers,
          }
        );
      }
      return {
        action: "supersede",
        memoryId: created.uniqueId,
        targetId: primaryTargetId,
        proofCount: 1,
        consolidation: "supersede",
      };
    }
    notifyConsolidationFallback(
      "target_vanished",
      options.consolidateOptions?.onFallback,
      `supersede: primary target ${primaryTargetId} retired or deleted inside the atomic write`
    );
  }

  const created = await createVaultMemoryOp(ctx.vaultCtx, createOpts);
  cacheRowVector(
    ctx.vaultCache,
    created.uniqueId,
    Float32Array.from(embedding),
    created.updatedAt,
    createOpts.content
  );

  return {
    action: "create",
    memoryId: created.uniqueId,
    proofCount: 1,
    ...(consolidationDecidedCreate && { consolidation: "create" as const }),
  };
}

function unionStrings(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

async function findTombstoneMatch(
  embedding: number[],
  embeddingModel: string,
  scope: string,
  ctx: RetainContext,
  opts: { threshold: number; folderId?: string | null }
): Promise<{ id: string; similarity: number } | null> {
  const rows = await getAllVaultMemoriesOp(ctx.vaultCtx, {
    includeDeleted: true,
    scopes: [scope],
    ...(opts.folderId !== undefined && { folderId: opts.folderId }),
  });
  let bestId: string | null = null;
  let bestSim = opts.threshold;
  for (const row of rows) {
    if (!row.isDeleted || !row.embedding) continue;
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
  return bestId === null ? null : { id: bestId, similarity: bestSim };
}

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

function pickFactTypeUpdate(
  existing: { factType: string | null },
  incoming: RetainOptions["factType"]
): RetainOptions["factType"] | undefined {
  if (incoming === undefined) return undefined;
  if (existing.factType !== null) return undefined;
  return incoming;
}

function resurrectFields(existing: {
  archivedAt?: number | null;
}): { restore: true } | { preserveUpdatedAt: true } {
  return typeof existing.archivedAt === "number" ? { restore: true } : { preserveUpdatedAt: true };
}

type ConsolidateOutcome =
  | { done: RetainResult }
  | { supersede: string[]; content: string }
  | { create: true }
  | null;

function abandonToRace(options: RetainOptions, detail: string): null {
  notifyConsolidationFallback("target_vanished", options.consolidateOptions?.onFallback, detail);
  return null;
}

async function tryConsolidate(
  trimmed: string,
  ctx: RetainContext,
  options: RetainOptions,
  prepared: PreparedVaultCandidates
): Promise<ConsolidateOutcome> {
  const consolidateOptions = options.consolidateOptions;
  if (!consolidateOptions) return null;

  const consolidateThreshold = options.consolidateThreshold ?? DEFAULT_CONSOLIDATE_THRESHOLD;
  const topK = options.consolidateTopK ?? DEFAULT_CONSOLIDATE_TOP_K;

  const { results: matches } = await rankPreparedVaultCandidates(
    trimmed,
    prepared,
    ctx.embeddingOptions,
    {
      limit: topK,
      minSimilarity: consolidateThreshold,
      useFusion: false,
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

  if (decision.action === "create") return decision.fallbackReason ? null : { create: true };

  if (decision.action === "supersede" && decision.content) {
    const requestedIds = decision.targetIds?.length
      ? decision.targetIds
      : decision.targetId
        ? [decision.targetId]
        : [];
    if (requestedIds.length === 0) return null;
    const valid: string[] = [];
    for (const id of requestedIds) {
      const existing = await getVaultMemoryOp(ctx.vaultCtx, id);
      if (existing && !existing.supersededBy) valid.push(id);
    }
    if (valid.length === 0) {
      return abandonToRace(
        options,
        `supersede: all ${requestedIds.length} target(s) deleted or already superseded`
      );
    }
    return { supersede: valid, content: decision.content };
  }

  if (decision.action === "noop" && decision.targetId) {
    const existing = await getVaultMemoryOp(ctx.vaultCtx, decision.targetId);
    if (!existing || existing.supersededBy) {
      return abandonToRace(
        options,
        `noop: target ${decision.targetId} ${existing ? "superseded" : "deleted"} before the write`
      );
    }
    const mergedSourceIds = unionStrings(
      existing.sourceChunkIds ?? [],
      options.sourceChunkIds ?? []
    );
    const eventTimeUpdate = pickEventTimeUpdate(existing, options.eventTime);
    const factTypeUpdate = pickFactTypeUpdate(existing, options.factType);
    const resurrect = resurrectFields(existing);
    const updated = await updateVaultMemoryOp(ctx.vaultCtx, decision.targetId, {
      content: existing.content,
      proofCountIncrement: 1,
      observationSourceIds: options.sourceChunkIds,
      sourceChunkIds: mergedSourceIds,
      ...resurrect,
      lastObservedAt: Date.now(),
      ...(eventTimeUpdate && { eventTime: eventTimeUpdate }),
      ...(factTypeUpdate !== undefined && { factType: factTypeUpdate }),
    });
    if (!updated) {
      await assertMergeTargetGoneOrThrow(ctx, decision.targetId);
      return abandonToRace(
        options,
        `noop: target ${decision.targetId} deleted mid-write (proof-count bump lost)`
      );
    }
    return {
      done: {
        action: "merge",
        memoryId: decision.targetId,
        targetId: decision.targetId,
        proofCount: updated.proofCount ?? (existing.proofCount ?? 1) + 1,
        consolidation: "noop",
      },
    };
  }

  if (decision.action === "update" && decision.targetId && decision.content) {
    const existing = await getVaultMemoryOp(ctx.vaultCtx, decision.targetId);
    if (!existing || existing.supersededBy) {
      return abandonToRace(
        options,
        `update: target ${decision.targetId} ${existing ? "superseded" : "deleted"} before the write`
      );
    }
    const mergedSourceIds = unionStrings(
      existing.sourceChunkIds ?? [],
      options.sourceChunkIds ?? []
    );
    const newEmbedding = await generateEmbedding(decision.content, ctx.embeddingOptions);
    const consolidatedModel = ctx.embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
    const eventTimeUpdate = pickEventTimeUpdate(existing, options.eventTime);
    const factTypeUpdate = pickFactTypeUpdate(existing, options.factType);
    const resurrect = resurrectFields(existing);
    const updated = await updateVaultMemoryOp(ctx.vaultCtx, decision.targetId, {
      content: decision.content,
      proofCountIncrement: 1,
      observationSourceIds: options.sourceChunkIds,
      sourceChunkIds: mergedSourceIds,
      embedding: JSON.stringify(newEmbedding),
      embeddingModel: consolidatedModel,
      ...resurrect,
      lastObservedAt: Date.now(),
      ...(eventTimeUpdate && { eventTime: eventTimeUpdate }),
      ...(factTypeUpdate !== undefined && { factType: factTypeUpdate }),
    });
    if (!updated) {
      await assertMergeTargetGoneOrThrow(ctx, decision.targetId);
      return abandonToRace(
        options,
        `update: target ${decision.targetId} deleted mid-write (consolidated rewrite lost)`
      );
    }
    cacheRowVector(
      ctx.vaultCache,
      decision.targetId,
      Float32Array.from(newEmbedding),
      updated.updatedAt,
      decision.content
    );
    return {
      done: {
        action: "update",
        memoryId: decision.targetId,
        targetId: decision.targetId,
        proofCount: updated.proofCount ?? (existing.proofCount ?? 1) + 1,
        consolidation: "update",
      },
    };
  }

  notifyConsolidationFallback(
    "invalid_response",
    options.consolidateOptions?.onFallback,
    `unapplicable ${decision.action} decision reached the applier — validate() should have rejected it`
  );
  return null;
}

async function assertMergeTargetGoneOrThrow(ctx: RetainContext, targetId: string): Promise<void> {
  const stillExists = await getVaultMemoryOp(ctx.vaultCtx, targetId);
  if (stillExists) {
    throw new Error(`retain: merge into memory ${targetId} failed to persist`);
  }
}
