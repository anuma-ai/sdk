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
  createSupersedingMemoryOp,
  createVaultMemoryOp,
  getAllVaultMemoriesOp,
  getVaultMemoryOp,
  supersedeVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants.js";
import { generateEmbedding } from "../memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../memoryEngine/types.js";
import { cosineSimilarity } from "../memoryEngine/vector.js";
import { searchVaultMemories, type VaultEmbeddingCache } from "../memoryVault/searchTool.js";
import type { RetainOptions, RetainResult } from "./types.js";

const DEFAULT_AUTO_MERGE_THRESHOLD = 0.8;
/** Scope an unset `options.scope` resolves to — matches the DB write default
 * (`createVaultMemoryOp`). Used for BOTH the dedup search and the write so they
 * stay symmetric (see retain()). */
const DEFAULT_SCOPE = "private";
/** Looser threshold for the consolidator candidate set — paraphrased dupes
 * cluster around 0.6–0.8, which the strict cosine merge misses. Lowered to
 * catch reworded duplicates (e.g. "prefers dark mode" vs "prefers dark mode in
 * every app"). */
const DEFAULT_CONSOLIDATE_THRESHOLD = 0.55;
/** Widened so a value change can find (and retire) ALL stale duplicates of the
 * old value in one pass, not just the nearest few. */
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

  // Resolve the scope ONCE and use it for both the dedup search and the write.
  // Leaving the search unscoped (its old behavior) made read and write
  // asymmetric: an unscoped search could match — and merge into — a memory in a
  // different scope, or, when a caller passed a scope, miss a dupe sitting in
  // the default scope and create a duplicate. Searching the exact scope we'll
  // write to keeps dedup correct.
  const resolvedScope = options.scope ?? DEFAULT_SCOPE;

  // When set (by the consolidator's `supersede` decision), the new fact is a
  // changed value that retires this existing memory. We skip the strict cosine
  // merge (the new value must be created fresh, never merged) and stamp
  // `superseded_by` on this id after the create succeeds. The content is the
  // consolidator's refined version of the new fact.
  // All stale memories the consolidator wants retired (every duplicate of a
  // now-changed standing value), and the refined new-fact content.
  let supersedeTargetIds: string[] = [];
  let supersedeContent: string | undefined;

  if (enableAutoMerge) {
    // Stage 1 — semantic consolidation (Hindsight-pattern), if enabled.
    // Pulls top-K memories above the looser consolidation floor (default
    // 0.65) and asks an LLM to decide create/update/noop/supersede. Catches
    // paraphrased duplicates the strict cosine-merge below misses, and retires
    // stale values on a state change.
    if (options.consolidateOptions) {
      const outcome = await tryConsolidate(trimmed, ctx, options);
      if (outcome) {
        if ("done" in outcome) return outcome.done;
        supersedeTargetIds = outcome.supersede;
        supersedeContent = outcome.content;
      }
    }

    // Stage 2 — strict cosine auto-merge. Skipped when superseding (a changed
    // value must not merge into some other row). Use cosine-only search for
    // threshold semantics; the fusion ranker produces a different score
    // scale and isn't suitable for a pairwise-similarity gate.
    // Stage 2 is skipped when superseding (main's A2): a changed value must be
    // created fresh, never merged into some other row.
    if (supersedeTargetIds.length === 0) {
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
          // PR5 — include archived rows as merge candidates so a re-observed
          // fact resurrects (un-archives) the decayed row instead of creating a
          // fresh duplicate. The resurrection is applied on the merge write
          // below, but ONLY for a row that is not superseded/deleted (the
          // guards below preserve main's tombstone/supersession suppression).
          includeArchived: true,
          ...(options.folderId !== undefined && { folderId: options.folderId }),
        }
      );

      if (matches.length > 0) {
        const targetId = matches[0].uniqueId;
        const existing = await getVaultMemoryOp(ctx.vaultCtx, targetId);
        // `!existing.supersededBy` (main): never merge into — nor resurrect — a
        // row a newer fact already retired. A deleted row never reaches here
        // (search excludes soft-deleted), so main's tombstone suppression wins
        // on both the merge and the resurrection path.
        if (existing && !existing.supersededBy) {
          const mergedSourceIds = unionStrings(
            existing.sourceChunkIds ?? [],
            options.sourceChunkIds ?? []
          );
          // proofCountIncrement (not absolute proofCount) so two parallel
          // retain() calls don't race a read-modify-write and lose updates.
          const eventTimeUpdate = pickEventTimeUpdate(existing, options.eventTime);
          const factTypeUpdate = pickFactTypeUpdate(existing, options.factType);
          // resurrectFields encodes the decay gate: an ARCHIVED (non-superseded,
          // non-deleted) target → `{ restore: true }` (clears archived_at, NO
          // preserveUpdatedAt so the decay clock restarts); an ACTIVE target →
          // `{ preserveUpdatedAt: true }`, exactly main's normal proof-count
          // re-observation path (bump proof_count without inflating recency).
          const resurrect = resurrectFields(existing);
          const updated = await updateVaultMemoryOp(ctx.vaultCtx, targetId, {
            content: existing.content,
            proofCountIncrement: 1,
            sourceChunkIds: mergedSourceIds,
            // resurrect encodes the decay gate: ACTIVE target → { preserveUpdatedAt:
            // true } (main's normal re-observation path — bump proof_count without
            // inflating recency); ARCHIVED (non-superseded, non-deleted) target →
            // { restore: true } and NO preserveUpdatedAt, so archived_at clears and
            // updated_at bumps (decay clock restarts). The resurrection refresh wins
            // on the resurrect path only; main's watermark logic below is untouched
            // on the normal path.
            ...resurrect,
            // C3: record the re-observation. On the normal path preserveUpdatedAt
            // keeps updated_at pinned, so this stamps "seen again now" without
            // reordering the vault by edit time; on the resurrect path the restore
            // already bumped updated_at.
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
  }

  // No merge candidate (or auto-merge disabled, or the merge target was
  // deleted between search and write): create a new memory. For supersession,
  // use the consolidator's refined content; otherwise use the original input.
  const contentToWrite = supersedeContent ?? trimmed;
  const embedding = await generateEmbedding(contentToWrite, ctx.embeddingOptions);
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
    // Typed memory (PR1) — persist the extractor's classification on the
    // fresh row. Omitted for manual writes (persisted as null).
    ...(options.factType !== undefined && { factType: options.factType }),
    // Tier-0 security (PR3) — persist the trust tier on the fresh row when
    // the injection screen flagged it ("quarantined"). Only set on create:
    // quarantined candidates are force-created (enableAutoMerge: false), so
    // this never lands on the merge/update path where it could flip a clean
    // memory's tier. The DB op re-validates against the known set.
    ...(options.trustTier !== undefined && { trustTier: options.trustTier }),
  };

  // A2 supersession: create the new fact AND retire the stale one it replaces
  // ATOMICALLY, in one write (createSupersedingMemoryOp) — so a concurrent
  // supersession of the same standing attribute can't interleave between our
  // create and retire and leave an orphaned successor. The op re-checks the
  // target inside the write: if a competing supersession already retired it
  // (or it was deleted), NOTHING is created and we fall through to a plain
  // create below — the fact is still stored, and the rare duplicate self-
  // reconciles at the next consolidation / strict cosine merge.
  if (supersedeTargetIds.length > 0) {
    const [primaryTargetId, ...restTargetIds] = supersedeTargetIds;
    const { created, retired } = await createSupersedingMemoryOp(
      ctx.vaultCtx,
      createOpts,
      primaryTargetId
    );
    if (created && retired) {
      ctx.vaultCache.set(created.uniqueId, Float32Array.from(embedding));
      // Retire the remaining stale duplicates too, pointing them at the new
      // memory. Best-effort (non-atomic): a per-id failure or a concurrent
      // retire just leaves that row live — self-reconciled by the next
      // consolidation — and must not undo the successful primary write.
      for (const staleId of restTargetIds) {
        await supersedeVaultMemoryOp(ctx.vaultCtx, staleId, created.uniqueId).catch(() => {});
      }
      return {
        action: "supersede",
        memoryId: created.uniqueId,
        targetId: primaryTargetId,
        proofCount: 1,
      };
    }
    // Concurrent loss (primary target already retired/gone) → fall through to a
    // plain create so the fact is still persisted; no orphan was created.
  }

  const created = await createVaultMemoryOp(ctx.vaultCtx, createOpts);
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
 * Decide whether the incoming observation's fact type should be written onto
 * the merge/consolidate target. Mirrors {@link pickEventTimeUpdate}: the first
 * classification is authoritative, so adopt the incoming type ONLY when the
 * target carries none yet (`factType` is null — a legacy/untyped row) and the
 * new observation has one. Never overwrite an existing non-null type — this is
 * a lazy backfill of legacy rows, not a re-classification.
 */
function pickFactTypeUpdate(
  existing: { factType: string | null },
  incoming: RetainOptions["factType"]
): RetainOptions["factType"] | undefined {
  if (incoming === undefined) return undefined;
  if (existing.factType !== null) return undefined;
  return incoming;
}

/**
 * Decide the archive/recency fields for a merge write (PR5 — un-archive on
 * re-observe).
 *
 * - ACTIVE target (`archivedAt === null`): `{ preserveUpdatedAt: true }` — the
 *   pre-PR5 behavior. Bumping proof_count without inflating recency.
 * - ARCHIVED target: `{ restore: true }` and NO `preserveUpdatedAt`, so the
 *   write clears `archived_at` AND lets `updated_at` bump. Bumping updated_at
 *   resets the decay age clock, so the just-resurrected fact isn't immediately
 *   re-archived by the next sweep's age rule.
 *
 * Concurrency: the merge write re-checks `is_deleted` inside the serialized
 * writer, and the decay hard-delete op re-checks `archived_at`/window inside
 * ITS writer — so whichever commits first wins. If a hard-delete landed first,
 * the target is `is_deleted` and `getVaultMemoryOp` already returned null (we
 * never reach here); if this restore lands first, the delete sees
 * `archived_at === null` and skips.
 */
function resurrectFields(existing: {
  archivedAt?: number | null;
}): { restore: true } | { preserveUpdatedAt: true } {
  // Only a real archived timestamp counts as archived; null/undefined = active.
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
type ConsolidateOutcome = { done: RetainResult } | { supersede: string[]; content: string } | null;

async function tryConsolidate(
  trimmed: string,
  ctx: RetainContext,
  options: RetainOptions
): Promise<ConsolidateOutcome> {
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
      // PR5 — archived rows are consolidation candidates too, so a paraphrased
      // re-observation resurrects a decayed row rather than duplicating it.
      includeArchived: true,
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

  // supersede — the new fact replaces a standing value that changed. Validate
  // the stale target still exists AND isn't already retired (a concurrent
  // supersession may have beaten us to it); then hand back its id and the
  // refined content. retain() creates the new fact fresh (never merges) using
  // the consolidator's content and stamps superseded_by on the old one.
  // `getVaultMemoryOp` already excludes deleted rows.
  if (decision.action === "supersede" && decision.content) {
    // Multi-supersede: retire EVERY stale duplicate the consolidator flagged,
    // not just one — so a value change collapses all paraphrases of the old
    // value. Accept the multi-id `targetIds` shape, falling back to a single
    // `targetId` for back-compat. Keep only targets that still exist and aren't
    // already retired (a concurrent supersession may have beaten us to some).
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
    if (valid.length === 0) return null;
    return { supersede: valid, content: decision.content };
  }

  if (decision.action === "noop" && decision.targetId) {
    const existing = await getVaultMemoryOp(ctx.vaultCtx, decision.targetId);
    if (!existing || existing.supersededBy) return null; // race: target gone or superseded, fall through to create
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
      sourceChunkIds: mergedSourceIds,
      // ACTIVE target → { preserveUpdatedAt: true } (main's normal re-observation
      // path); ARCHIVED (non-superseded, non-deleted) → { restore: true } and no
      // preserveUpdatedAt so the decay clock restarts (PR5). Resurrection refresh
      // wins on the resurrect path; watermark below is untouched on the normal path.
      ...resurrect,
      // C3: record the re-observation. preserveUpdatedAt (normal path) keeps
      // updated_at pinned; the resurrect path already bumped it via restore.
      lastObservedAt: Date.now(),
      ...(eventTimeUpdate && { eventTime: eventTimeUpdate }),
      ...(factTypeUpdate !== undefined && { factType: factTypeUpdate }),
    });
    if (!updated) {
      // Target gone → fall through to create; genuine write failure → throw
      // rather than silently create a duplicate. See assertMergeTargetGoneOrThrow.
      await assertMergeTargetGoneOrThrow(ctx, decision.targetId);
      return null;
    }
    return {
      done: {
        action: "merge",
        memoryId: decision.targetId,
        targetId: decision.targetId,
        proofCount: updated.proofCount ?? (existing.proofCount ?? 1) + 1,
      },
    };
  }

  if (decision.action === "update" && decision.targetId && decision.content) {
    const existing = await getVaultMemoryOp(ctx.vaultCtx, decision.targetId);
    if (!existing || existing.supersededBy) return null;
    const mergedSourceIds = unionStrings(
      existing.sourceChunkIds ?? [],
      options.sourceChunkIds ?? []
    );
    // Re-embed the consolidated content; embeddingOptions includes the cache.
    const newEmbedding = await generateEmbedding(decision.content, ctx.embeddingOptions);
    const consolidatedModel = ctx.embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
    const eventTimeUpdate = pickEventTimeUpdate(existing, options.eventTime);
    const factTypeUpdate = pickFactTypeUpdate(existing, options.factType);
    const resurrect = resurrectFields(existing);
    const updated = await updateVaultMemoryOp(ctx.vaultCtx, decision.targetId, {
      content: decision.content,
      proofCountIncrement: 1,
      sourceChunkIds: mergedSourceIds,
      embedding: JSON.stringify(newEmbedding),
      embeddingModel: consolidatedModel,
      // Even when the LLM rewrites content into a richer paraphrase, this is
      // still a re-observation of an existing fact — not a new one. For an ACTIVE
      // target resurrectFields returns { preserveUpdatedAt: true } (recency
      // multiplier stays honest, matching the merge/noop paths). For an ARCHIVED
      // target it returns { restore: true } and lets updated_at bump so the decay
      // clock resets (PR5). Resurrection refresh wins on the resurrect path.
      ...resurrect,
      // C3: record the re-observation. preserveUpdatedAt (normal path) keeps
      // updated_at pinned; the resurrect path already bumped it via restore.
      lastObservedAt: Date.now(),
      ...(eventTimeUpdate && { eventTime: eventTimeUpdate }),
      ...(factTypeUpdate !== undefined && { factType: factTypeUpdate }),
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
      done: {
        action: "update",
        memoryId: decision.targetId,
        targetId: decision.targetId,
        proofCount: updated.proofCount ?? (existing.proofCount ?? 1) + 1,
      },
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
