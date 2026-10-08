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

/** Storage seam used by both local and remote retain. All plaintext work stays on-device. */
export interface RetainPersistence {
  prepare: (
    query: string,
    options?: Parameters<typeof prepareVaultCandidates>[4]
  ) => Promise<PreparedVaultCandidates>;
  get: (id: string) => ReturnType<typeof getVaultMemoryOp>;
  /** Fresh post-write probe; must not replace snapshots guarding earlier decisions. */
  getFresh?: (id: string) => ReturnType<typeof getVaultMemoryOp>;
  tombstones: (
    embedding: number[],
    model: string,
    scope: string,
    folderId?: string | null
  ) => ReturnType<typeof getAllVaultMemoriesOp>;
  create: (
    input: Parameters<typeof createVaultMemoryOp>[1]
  ) => ReturnType<typeof createVaultMemoryOp>;
  update: (
    id: string,
    patch: Parameters<typeof updateVaultMemoryOp>[2]
  ) => ReturnType<typeof updateVaultMemoryOp>;
  supersede: (id: string, successor: string) => ReturnType<typeof supersedeVaultMemoryOp>;
  createSuperseding: (
    input: Parameters<typeof createSupersedingMemoryOp>[1],
    target: string
  ) => ReturnType<typeof createSupersedingMemoryOp>;
}
interface RetainPipelineContext {
  normalizeEmbedding?: (embedding: number[]) => number[];
  persistence: RetainPersistence;
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
  return retainWithPersistence(
    content,
    {
      embeddingOptions: ctx.embeddingOptions,
      vaultCache: ctx.vaultCache,
      persistence: {
        prepare: (query, searchOptions) =>
          prepareVaultCandidates(
            query,
            ctx.vaultCtx,
            ctx.embeddingOptions,
            ctx.vaultCache,
            searchOptions
          ),
        get: (id) => getVaultMemoryOp(ctx.vaultCtx, id),
        tombstones: (_embedding, _model, scope, folderId) =>
          getAllVaultMemoriesOp(ctx.vaultCtx, {
            includeDeleted: true,
            scopes: [scope],
            ...(folderId !== undefined && { folderId }),
          }),
        create: (input) => createVaultMemoryOp(ctx.vaultCtx, input),
        update: (id, patch) => updateVaultMemoryOp(ctx.vaultCtx, id, patch),
        supersede: (id, successor) => supersedeVaultMemoryOp(ctx.vaultCtx, id, successor),
        createSuperseding: (input, target) =>
          createSupersedingMemoryOp(ctx.vaultCtx, input, target),
      },
    },
    options
  );
}

/** Shared device-side extraction, deduplication and consolidation pipeline. */
export async function retainWithPersistence(
  content: string,
  ctx: RetainPipelineContext,
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
    prepared = await ctx.persistence.prepare(trimmed, {
      limit: Math.max(options.consolidateTopK ?? DEFAULT_CONSOLIDATE_TOP_K, 1),
      useFusion: false,
      scopes: [resolvedScope],
      includeArchived: true,
      ...(options.folderId !== undefined && { folderId: options.folderId }),
    });
    prepared = withoutKindedRows(prepared);

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
        const existing = await ctx.persistence.get(targetId);
        if (existing && !existing.supersededBy) {
          const mergedSourceIds = unionStrings(
            existing.sourceChunkIds ?? [],
            options.sourceChunkIds ?? []
          );
          const eventTimeUpdate = pickEventTimeUpdate(existing, options.eventTime);
          const factTypeUpdate = pickFactTypeUpdate(existing, options.factType);
          const resurrect = resurrectFields(existing);
          const updated = await ctx.persistence.update(targetId, {
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
  const generatedEmbedding =
    reusableQueryEmbedding ?? (await generateEmbedding(contentToWrite, ctx.embeddingOptions));
  const embedding = ctx.normalizeEmbedding?.(generatedEmbedding) ?? generatedEmbedding;
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
    const { created, retired } = await ctx.persistence.createSuperseding(
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
          ok = (await ctx.persistence.supersede(staleId, created.uniqueId)) === true;
        } catch {
          // retire threw → `ok` stays false; re-read below tells apart a genuine
          // live leftover from an already-gone row.
        }
        if (ok) continue;
        const stillLive = await (
          ctx.persistence.getFresh
            ? ctx.persistence.getFresh(staleId)
            : ctx.persistence.get(staleId)
        ).catch(() => null);
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

  const created = await ctx.persistence.create(createOpts);
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

/** Drop kinded (profile) rows from a retain candidate set, so neither merge
 * stage can match one. */
function withoutKindedRows(prepared: PreparedVaultCandidates): PreparedVaultCandidates {
  const kinded = new Set(
    prepared.memories.filter((m) => m.kind !== null && m.kind !== undefined).map((m) => m.uniqueId)
  );
  if (kinded.size === 0) return prepared;
  return {
    ...prepared,
    memories: prepared.memories.filter((m) => !kinded.has(m.uniqueId)),
    embeddedItems: prepared.embeddedItems.filter((item) => !kinded.has(item.id)),
  };
}

function unionStrings(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

async function findTombstoneMatch(
  embedding: number[],
  embeddingModel: string,
  scope: string,
  ctx: RetainPipelineContext,
  opts: { threshold: number; folderId?: string | null }
): Promise<{ id: string; similarity: number } | null> {
  const rows = await ctx.persistence.tombstones(embedding, embeddingModel, scope, opts.folderId);
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
/**
 * Outcome of the consolidation pass:
 * - `{ done }` — a terminal decision (merge/update/noop); retain() returns it.
 * - `{ supersede }` — the new fact retires an existing one whose value changed;
 *   retain() creates the new fact fresh, then stamps `superseded_by` on the
 *   stale `supersede` id. `content` is the refined new fact from the consolidator.
 * - `null` — no consolidation decision; fall through to strict merge / create.
 */
type ConsolidateOutcome =
  | { done: RetainResult }
  | { supersede: string[]; content: string }
  /** The LLM explicitly chose `create` — not a fallback, which returns null. */
  | { create: true }
  | null;

function abandonToRace(options: RetainOptions, detail: string): null {
  notifyConsolidationFallback("target_vanished", options.consolidateOptions?.onFallback, detail);
  return null;
}

async function tryConsolidate(
  trimmed: string,
  ctx: RetainPipelineContext,
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
      const existing = await ctx.persistence.get(id);
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
    const existing = await ctx.persistence.get(decision.targetId);
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
    const updated = await ctx.persistence.update(decision.targetId, {
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
    const existing = await ctx.persistence.get(decision.targetId);
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
    const generatedEmbedding = await generateEmbedding(decision.content, ctx.embeddingOptions);
    const newEmbedding = ctx.normalizeEmbedding?.(generatedEmbedding) ?? generatedEmbedding;
    const consolidatedModel = ctx.embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
    const eventTimeUpdate = pickEventTimeUpdate(existing, options.eventTime);
    const factTypeUpdate = pickFactTypeUpdate(existing, options.factType);
    const resurrect = resurrectFields(existing);
    const updated = await ctx.persistence.update(decision.targetId, {
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

async function assertMergeTargetGoneOrThrow(
  ctx: RetainPipelineContext,
  targetId: string
): Promise<void> {
  const stillExists = await (ctx.persistence.getFresh
    ? ctx.persistence.getFresh(targetId)
    : ctx.persistence.get(targetId));
  if (stillExists) {
    throw new Error(`retain: merge into memory ${targetId} failed to persist`);
  }
}
