import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { EmbeddedWalletSignerFn, SignMessageFn } from "../encryption-utils";
import {
  type EntityOperationsContext,
  unlinkAllMemoryEntitiesForUserOp,
  unlinkMemoryEntitiesOp,
} from "../entities/operations";
import { decryptVaultMemoryFields, encryptVaultMemoryContent } from "./encryption";
import type { VaultMemory } from "./models";
import type {
  CreateVaultMemoryOptions,
  StoredVaultMemory,
  UpdateVaultMemoryOptions,
} from "./types";

export interface VaultMemoryOperationsContext {
  database: Database;
  vaultMemoryCollection: Collection<VaultMemory>;
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
  /** When set, operations scope to this user (server-side multi-user). */
  userId?: string;
  /**
   * When set, vault delete ops cascade to memory_entity rows pointing at
   * the deleted memories. Without this the W5 graph lane keeps returning
   * IDs of soft-deleted memories and the join table grows unbounded.
   */
  entityCtx?: EntityOperationsContext;
}

/** Returns true if the record belongs to the context user (or if no user scoping is active). */
function isOwnedByCtxUser(ctx: VaultMemoryOperationsContext, record: VaultMemory): boolean {
  return ctx.userId === undefined || record.userId === ctx.userId;
}

/** Builds the base WHERE conditions shared by all vault memory queries.
 * `includeDeleted` drops the soft-delete filter — only `getAllVaultMemoriesOp`
 * opts into it (to surface "forgotten" memories); every other caller omits it
 * and keeps the default non-deleted-only behavior. */
function baseVaultConditions(
  ctx: VaultMemoryOperationsContext,
  options?: { since?: Date; includeDeleted?: boolean }
) {
  return [
    ...(options?.includeDeleted ? [] : [Q.where("is_deleted", false)]),
    ...(ctx.userId !== undefined ? [Q.where("user_id", ctx.userId)] : []),
    ...(options?.since ? [Q.where("updated_at", Q.gt(options.since.getTime()))] : []),
  ];
}

/** Processes items in batches of 50 to avoid blocking the event loop. */
async function mapInBatches<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const BATCH = 50;
  const results: R[] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    results.push(...(await Promise.all(items.slice(i, i + BATCH).map(fn))));
  }
  return results;
}

function vaultMemoryToStoredRaw(memory: VaultMemory): StoredVaultMemory {
  let sourceChunkIds: string[] | null = null;
  if (memory.sourceChunkIds) {
    try {
      const parsed = JSON.parse(memory.sourceChunkIds) as unknown;
      if (Array.isArray(parsed)) {
        sourceChunkIds = parsed.filter((s): s is string => typeof s === "string");
      }
    } catch {
      sourceChunkIds = null;
    }
  }
  return {
    uniqueId: memory.id,
    content: memory.content,
    scope: memory.scope,
    folderId: memory.folderId ?? null,
    userId: memory.userId ?? null,
    embedding: memory.embedding ?? null,
    embeddingModel: memory.embeddingModel ?? null,
    sourceChunkIds,
    proofCount: memory.proofCount ?? null,
    source: memory.source ?? null,
    eventTimeStart: memory.eventTimeStart ?? null,
    eventTimeEnd: memory.eventTimeEnd ?? null,
    eventTimeKind: memory.eventTimeKind ?? null,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    isDeleted: memory.isDeleted,
  };
}

export async function vaultMemoryToStored(
  memory: VaultMemory,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredVaultMemory> {
  const raw = vaultMemoryToStoredRaw(memory);
  if (walletAddress) {
    return decryptVaultMemoryFields(raw, walletAddress, signMessage, embeddedWalletSigner);
  }
  return raw;
}

export async function createVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  opts: CreateVaultMemoryOptions
): Promise<StoredVaultMemory> {
  const scope = opts.scope ?? "private";
  const encryptedContent =
    ctx.walletAddress && ctx.signMessage
      ? await encryptVaultMemoryContent(
          opts.content,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        )
      : opts.content;

  const created = await ctx.database.write(async () => {
    return ctx.vaultMemoryCollection.create((record) => {
      record._setRaw("content", encryptedContent);
      record._setRaw("scope", scope);
      record._setRaw("folder_id", opts.folderId ?? null);
      record._setRaw("user_id", ctx.userId ?? null);
      record._setRaw("is_deleted", false);
      if (opts.embedding !== undefined) {
        record._setRaw("embedding", opts.embedding);
        record._setRaw("embedding_model", opts.embeddingModel ?? null);
      }
      if (opts.sourceChunkIds !== undefined) {
        record._setRaw("source_chunk_ids", JSON.stringify(opts.sourceChunkIds));
      }
      record._setRaw("proof_count", opts.proofCount ?? 1);
      record._setRaw("source", opts.source ?? "manual");
      if (opts.eventTime) {
        record._setRaw("event_time_start", opts.eventTime.start ?? null);
        record._setRaw("event_time_end", opts.eventTime.end ?? null);
        record._setRaw("event_time_kind", opts.eventTime.kind ?? null);
      }
    });
  });

  return vaultMemoryToStored(created, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

/**
 * W6 temporal lane read — fetch memories whose event-time overlaps the
 * given window. "Overlap" means:
 *   - point/ongoing: event_time_start ∈ [windowStart, windowEnd)
 *   - range:         memory range ∩ window non-empty
 *
 * Returns a thin shape with just the fields needed for the temporal
 * ranker — uniqueId, eventTimeStart, eventTimeEnd, eventTimeKind. Caller
 * scores overlap via {@link scoreEventTimeOverlap} and folds into RRF.
 *
 * Uses the indexed `event_time_start` column for the cheap point/ongoing
 * filter; range overlap is then post-filtered in JS (rare; range
 * memories are < 5% of typical vaults).
 */
export async function getMemoriesByEventTimeOp(
  ctx: VaultMemoryOperationsContext,
  windowStart: number,
  windowEnd: number
): Promise<
  Array<{
    uniqueId: string;
    eventTimeStart: number;
    eventTimeEnd: number | null;
    eventTimeKind: string | null;
  }>
> {
  // Push as much filtering into SQL as possible:
  //   - event_time_start IS NOT NULL
  //   - event_time_start < windowEnd  (any candidate must start before
  //     the window ends, regardless of kind)
  //   - (event_time_start >= windowStart  OR  kind IN ("range","ongoing"))
  //     A point starting before windowStart can't overlap, so filter at
  //     SQL. Range/ongoing rows starting earlier may still overlap and
  //     fall through to the JS check below.
  const records = await ctx.vaultMemoryCollection
    .query(
      ...baseVaultConditions(ctx),
      Q.where("event_time_start", Q.notEq(null)),
      Q.where("event_time_start", Q.lte(windowEnd)),
      Q.or(
        Q.where("event_time_start", Q.gte(windowStart)),
        Q.where("event_time_kind", Q.oneOf(["range", "ongoing"]))
      )
    )
    .fetch();

  const out: Array<{
    uniqueId: string;
    eventTimeStart: number;
    eventTimeEnd: number | null;
    eventTimeKind: string | null;
  }> = [];
  for (const r of records) {
    const start = r.eventTimeStart;
    if (start === null) continue;
    const end = r.eventTimeEnd ?? null;
    const kind = r.eventTimeKind ?? null;
    // Point/ongoing: only keep if start is inside window.
    if (kind !== "range") {
      if (kind === "ongoing") {
        // Overlap window if started before windowEnd and (if it has a
        // non-null end) hasn't ended before windowStart.
        const ongoingEnd = end ?? Number.POSITIVE_INFINITY;
        if (start < windowEnd && ongoingEnd >= windowStart) {
          out.push({
            uniqueId: r.id,
            eventTimeStart: start,
            eventTimeEnd: end,
            eventTimeKind: kind,
          });
        }
      } else {
        if (start >= windowStart && start < windowEnd) {
          out.push({
            uniqueId: r.id,
            eventTimeStart: start,
            eventTimeEnd: end,
            eventTimeKind: kind,
          });
        }
      }
      continue;
    }
    // Range: overlap if [start, end] ∩ [windowStart, windowEnd) is non-empty.
    const memEnd = end ?? start;
    if (memEnd >= windowStart && start < windowEnd) {
      out.push({ uniqueId: r.id, eventTimeStart: start, eventTimeEnd: end, eventTimeKind: kind });
    }
  }
  return out;
}

export async function createVaultMemoriesBatchOp(
  ctx: VaultMemoryOperationsContext,
  optionsArray: CreateVaultMemoryOptions[]
): Promise<StoredVaultMemory[]> {
  if (optionsArray.length === 0) return [];

  // Pre-encrypt all contents in parallel
  const encryptedContents = await Promise.all(
    optionsArray.map(async (opts) => {
      if (ctx.walletAddress && ctx.signMessage) {
        return encryptVaultMemoryContent(
          opts.content,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        );
      }
      return opts.content;
    })
  );

  // Single write transaction with batch create
  const created = await ctx.database.write(async () => {
    const prepared = optionsArray.map((opts, i) =>
      ctx.vaultMemoryCollection.prepareCreate((record) => {
        record._setRaw("content", encryptedContents[i]);
        record._setRaw("scope", opts.scope ?? "private");
        record._setRaw("folder_id", opts.folderId ?? null);
        record._setRaw("user_id", ctx.userId ?? null);
        record._setRaw("is_deleted", false);
        if (optionsArray[i].embedding !== undefined) {
          record._setRaw("embedding", optionsArray[i].embedding);
          record._setRaw("embedding_model", optionsArray[i].embeddingModel ?? null);
        }
        if (opts.sourceChunkIds !== undefined) {
          record._setRaw("source_chunk_ids", JSON.stringify(opts.sourceChunkIds));
        }
        record._setRaw("proof_count", opts.proofCount ?? 1);
        record._setRaw("source", opts.source ?? "manual");
        if (opts.eventTime) {
          record._setRaw("event_time_start", opts.eventTime.start ?? null);
          record._setRaw("event_time_end", opts.eventTime.end ?? null);
          record._setRaw("event_time_kind", opts.eventTime.kind ?? null);
        }
      })
    );
    await ctx.database.batch(...prepared);
    return prepared;
  });

  return Promise.all(
    created.map((record) =>
      vaultMemoryToStored(record, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    )
  );
}

export async function getVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string
): Promise<StoredVaultMemory | null> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return null;
    return vaultMemoryToStored(
      record,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
  } catch {
    return null;
  }
}

/**
 * Map a raw `memory_vault` row (snake_case `_raw` from `unsafeFetchRaw`) to the Stored shape
 * WITHOUT instantiating a WatermelonDB Model — mirrors {@link vaultMemoryToStoredRaw} but reads
 * raw columns. Used by the bulk read ops so a whole-vault load doesn't pin a Model per row in
 * the never-evicted RecordCache (web Pile-2 tab-memory; mobile SQLite is paged so it's harmless
 * there). Return shape is identical, so callers are unaffected.
 */
function vaultMemoryRawToStoredRaw(raw: Record<string, unknown>): StoredVaultMemory {
  let sourceChunkIds: string[] | null = null;
  const rawChunks = raw.source_chunk_ids;
  if (typeof rawChunks === "string" && rawChunks) {
    try {
      const parsed = JSON.parse(rawChunks) as unknown;
      if (Array.isArray(parsed)) {
        sourceChunkIds = parsed.filter((s): s is string => typeof s === "string");
      }
    } catch {
      sourceChunkIds = null;
    }
  }
  return {
    uniqueId: raw.id as string,
    content: (raw.content as string) ?? "",
    // @text coerces NULL→"" on the Model path; unsafeFetchRaw returns the raw NULL, so guard.
    scope: (raw.scope as string) ?? "",
    folderId: (raw.folder_id as string | null) ?? null,
    userId: (raw.user_id as string | null) ?? null,
    embedding: (raw.embedding as string | null) ?? null,
    embeddingModel: (raw.embedding_model as string | null) ?? null,
    sourceChunkIds,
    proofCount: (raw.proof_count as number | null) ?? null,
    source: (raw.source as string | null) ?? null,
    eventTimeStart: (raw.event_time_start as number | null) ?? null,
    eventTimeEnd: (raw.event_time_end as number | null) ?? null,
    eventTimeKind: (raw.event_time_kind as string | null) ?? null,
    createdAt: new Date(raw.created_at as number),
    updatedAt: new Date(raw.updated_at as number),
    // SQLite stores booleans as 0/1, LokiJS as true/false — coerce both.
    isDeleted: raw.is_deleted === true || raw.is_deleted === 1,
  };
}

/** Raw-row variant of {@link vaultMemoryToStored}: map then decrypt, no Model built. */
async function vaultMemoryRawToStored(
  raw: Record<string, unknown>,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredVaultMemory> {
  const stored = vaultMemoryRawToStoredRaw(raw);
  if (walletAddress) {
    return decryptVaultMemoryFields(stored, walletAddress, signMessage, embeddedWalletSigner);
  }
  return stored;
}

export async function getAllVaultMemoriesOp(
  ctx: VaultMemoryOperationsContext,
  options?: {
    scopes?: string[];
    since?: Date;
    limit?: number;
    folderId?: string | null;
    /**
     * Include soft-deleted memories in the result (each carries
     * `isDeleted: true`). Default `false` — deleted rows are excluded, as
     * they are from every other read path. Used by the Memory Graph to
     * render "forgotten" nodes; ordinary consumers should leave this off.
     */
    includeDeleted?: boolean;
  }
): Promise<StoredVaultMemory[]> {
  const conditions = [
    ...baseVaultConditions(ctx, options),
    ...(options?.scopes?.length ? [Q.where("scope", Q.oneOf(options.scopes))] : []),
    ...(options?.folderId !== undefined ? [Q.where("folder_id", options.folderId)] : []),
    Q.sortBy(options?.since ? "updated_at" : "created_at", Q.desc),
    ...(options?.limit !== null && options?.limit !== undefined && options.limit > 0
      ? [Q.take(options.limit)]
      : []),
  ];
  // unsafeFetchRaw (NOT fetch): a whole-vault load must not build a Model per row into the
  // never-evicted RecordCache (web Pile-2). Same SQL (incl. sortBy/take); raws decrypted directly.
  const results = (await ctx.vaultMemoryCollection.query(...conditions).unsafeFetchRaw()) as Record<
    string,
    unknown
  >[];
  return mapInBatches(results, (raw) =>
    vaultMemoryRawToStored(raw, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
  );
}

export async function getAllVaultMemoryContentsOp(
  ctx: VaultMemoryOperationsContext,
  options?: { since?: Date }
): Promise<string[]> {
  // unsafeFetchRaw (NOT fetch): bulk content scan must not pin a Model per row (web Pile-2).
  const results = (await ctx.vaultMemoryCollection
    .query(...baseVaultConditions(ctx, options))
    .unsafeFetchRaw()) as Record<string, unknown>[];
  return mapInBatches(results, async (raw) => {
    const stored = await vaultMemoryRawToStored(
      raw,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
    return stored.content;
  });
}

export async function updateVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  opts: UpdateVaultMemoryOptions
): Promise<StoredVaultMemory | null> {
  try {
    // Pre-check outside the writer so we don't pay encryption for a
    // memory that's already gone; the authoritative check re-runs
    // inside the write block below (a concurrent delete could land
    // between this read and the write).
    const probe = await ctx.vaultMemoryCollection.find(id);
    if (probe.isDeleted || !isOwnedByCtxUser(ctx, probe)) return null;

    const encryptedContent =
      ctx.walletAddress && ctx.signMessage
        ? await encryptVaultMemoryContent(
            opts.content,
            ctx.walletAddress,
            ctx.signMessage,
            ctx.embeddedWalletSigner
          )
        : opts.content;

    let stale = false;
    const record = probe;
    const originalUpdatedAt = record.updatedAt.getTime();
    await ctx.database.write(async () => {
      // Re-check inside the serialized writer: a delete that committed
      // after the probe must win — updating a soft-deleted row would
      // silently resurrect content on an invisible record.
      if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) {
        stale = true;
        return;
      }
      await record.update((r) => {
        r._setRaw("content", encryptedContent);
        if (opts.scope !== undefined) {
          r._setRaw("scope", opts.scope);
        }
        if (opts.folderId !== undefined) {
          r._setRaw("folder_id", opts.folderId);
        }
        if (opts.embedding !== undefined) {
          r._setRaw("embedding", opts.embedding);
          // Keep the model tag in sync with the vector. An explicit model wins;
          // otherwise reset to null (grandfathered / current-compatible). Never
          // leave the prior tag on a new vector — a stale tag would make search
          // treat the row as stale every query and re-embed it in a loop.
          r._setRaw("embedding_model", opts.embeddingModel ?? null);
        }
        if (opts.sourceChunkIds !== undefined) {
          r._setRaw("source_chunk_ids", JSON.stringify(opts.sourceChunkIds));
        }
        if (opts.proofCountIncrement !== undefined) {
          // Read inside the writer so two parallel retain() calls observe
          // each other's commits and neither loses its increment. Reading
          // `r.proofCount` reflects the latest committed _raw value (the
          // identity-mapped record is updated immediately by _setRaw, and
          // database.write() serializes writers).
          const current = r.proofCount ?? 1;
          r._setRaw("proof_count", current + opts.proofCountIncrement);
        } else if (opts.proofCount !== undefined) {
          r._setRaw("proof_count", opts.proofCount);
        }
        if (opts.source !== undefined) {
          r._setRaw("source", opts.source);
        }
        if (opts.eventTime !== undefined) {
          r._setRaw("event_time_start", opts.eventTime.start ?? null);
          r._setRaw("event_time_end", opts.eventTime.end ?? null);
          r._setRaw("event_time_kind", opts.eventTime.kind ?? null);
        }
        if (opts.preserveUpdatedAt) {
          // WatermelonDB's record.update() bumps updated_at automatically.
          // Restore the original so re-observation doesn't double-count
          // against the recency multiplier on top of proof_count.
          r._setRaw("updated_at", originalUpdatedAt);
        }
      });
    });
    if (stale) return null;

    return vaultMemoryToStored(
      record,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
  } catch {
    return null;
  }
}

export async function deleteVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string
): Promise<boolean> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;

    let stale = false;
    await ctx.database.write(async () => {
      // Re-check inside the serialized writer (see updateVaultMemoryOp).
      if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) {
        stale = true;
        return;
      }
      await record.update((r) => {
        r._setRaw("is_deleted", true);
      });
    });
    if (stale) return false;

    // W5 cascade: drop the join rows so the graph lane doesn't keep
    // returning IDs of soft-deleted memories. Best-effort — a failure
    // here doesn't roll back the vault delete.
    if (ctx.entityCtx) {
      try {
        await unlinkMemoryEntitiesOp(ctx.entityCtx, [id]);
      } catch {
        // Auxiliary cleanup — leave the cascade to the next sweep.
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get all non-deleted, unfiled vault memories (folder_id is null).
 */
export async function getUnfiledVaultMemoriesOp(
  ctx: VaultMemoryOperationsContext
): Promise<StoredVaultMemory[]> {
  const conditions = [
    Q.where("folder_id", null),
    ...baseVaultConditions(ctx),
    Q.sortBy("created_at", Q.desc),
  ];
  const results = await ctx.vaultMemoryCollection.query(...conditions).fetch();
  return mapInBatches(results, (record) =>
    vaultMemoryToStored(record, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
  );
}

export async function deleteAllVaultMemoriesForUserOp(
  ctx: VaultMemoryOperationsContext,
  userId: string
): Promise<number> {
  if (ctx.userId !== undefined && ctx.userId !== userId) return 0;

  const records = await ctx.vaultMemoryCollection
    .query(Q.where("user_id", userId), Q.where("is_deleted", false))
    .fetch();

  if (records.length === 0) return 0;

  await ctx.database.write(async () => {
    const prepared = records.map((record) =>
      record.prepareUpdate((r) => {
        r._setRaw("is_deleted", true);
      })
    );
    await ctx.database.batch(...prepared);
  });

  // W5 cascade: drop every join row for this user in one pass. Falls
  // back to per-memory unlink when the entity context lacks user_id
  // scoping (single-user clients).
  if (ctx.entityCtx) {
    try {
      if (ctx.entityCtx.userId !== undefined) {
        await unlinkAllMemoryEntitiesForUserOp(ctx.entityCtx, userId);
      } else {
        await unlinkMemoryEntitiesOp(
          ctx.entityCtx,
          records.map((r) => r.id)
        );
      }
    } catch {
      // Auxiliary cleanup — leave the cascade to the next sweep.
    }
  }

  return records.length;
}

export async function updateVaultMemoryEmbeddingOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  embedding: string,
  // Required (not optional) so the tag is always synced to the vector — a
  // model-less write that left a stale tag would make search re-embed the row
  // every query. Matches the message-side updateMessageEmbeddingOp; compile
  // time catches any caller that forgets it.
  embeddingModel: string
): Promise<boolean> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;
    await ctx.database.write(async () => {
      await record.update((r) => {
        r._setRaw("embedding", embedding);
        r._setRaw("embedding_model", embeddingModel);
      });
    });
    return true;
  } catch {
    return false;
  }
}
