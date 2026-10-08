import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import { getLogger } from "../../logger";
import type { EmbeddedWalletSignerFn, SignMessageFn } from "../encryption-utils";
import {
  type EntityInput,
  type EntityOperationsContext,
  linkMemoryEntitiesOp,
  type MemoryTopicsWrite,
  prepareMemoryTopicsUpdate,
  relinkMemoryEntitiesFromTopicsOp,
  resolveMemoryTopicsWrite,
  unlinkAllMemoryEntitiesForUserOp,
  unlinkMemoryEntitiesOp,
} from "../entities/operations";
import { normalizeEntityName, parseTopics, type StoredTopic } from "../entities/types";
import { decryptVaultMemoryFields, encryptVaultMemoryContent } from "./encryption";
import type { VaultMemory } from "./models";
import type {
  CreateVaultMemoryOptions,
  RankableVaultMemory,
  StoredVaultMemory,
  UpdateVaultMemoryOptions,
  VaultMemoryVisibility,
} from "./types";
import { parseMedia } from "./types";

function visibilityOrPrivate(value: unknown): VaultMemoryVisibility {
  return value === "public" ? value : "private";
}

const NON_PRIVATE_VISIBILITIES: VaultMemoryVisibility[] = ["public"];

function visibilityConditions(requested?: VaultMemoryVisibility[]) {
  if (!requested?.length) return [];
  if (!requested.includes("private")) {
    return [Q.where("visibility", Q.oneOf([...requested]))];
  }
  const excluded = NON_PRIVATE_VISIBILITIES.filter((v) => !requested.includes(v));
  if (excluded.length === 0) return [];
  return [Q.or(Q.where("visibility", null), Q.where("visibility", Q.notIn(excluded)))];
}

export interface VaultMemoryOperationsContext {
  database: Database;
  vaultMemoryCollection: Collection<VaultMemory>;
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
  /** When set, operations scope to this user (server-side multi-user). */
  userId?: string;
  /** Optional extraction source eligibility check, executed inside the writer.
   * Must only read the database (must not start another writer). */
  canWrite?: () => Promise<boolean>;
  /**
   * Asserts this context runs against a physically single-tenant database — one
   * where every row belongs to the same owner (the per-wallet client DBs, which
   * hold exactly one wallet's rows written with `user_id = null`). This is the
   * ONLY thing that makes the decay sweep's unscoped scan/archive/delete safe
   * without a `userId`: see {@link assertVaultScopeForSweep}. A shared /
   * multi-tenant DB must NOT set this — it must scope by `userId` instead.
   * `walletAddress` presence alone is NOT a substitute (the sweep query filters
   * by `user_id` only, so a bare `walletAddress` on a shared DB would sweep
   * every tenant).
   */
  singleTenant?: boolean;
  /**
   * When set, vault delete ops cascade to memory_entity rows pointing at
   * the deleted memories. Without this the W5 graph lane keeps returning
   * IDs of soft-deleted memories and the join table grows unbounded.
   */
  entityCtx?: EntityOperationsContext;
}

function isOwnedByCtxUser(ctx: VaultMemoryOperationsContext, record: VaultMemory): boolean {
  return ctx.userId === undefined || record.userId === ctx.userId;
}

function baseVaultConditions(
  ctx: VaultMemoryOperationsContext,
  options?: {
    since?: Date;
    memoryIds?: string[];
    includeDeleted?: boolean;
    includeArchived?: boolean;
    includeQuarantined?: boolean;
    includeSuperseded?: boolean;
  }
) {
  return [
    ...(options?.memoryIds !== undefined ? [Q.where("id", Q.oneOf(options.memoryIds))] : []),
    ...(options?.includeDeleted ? [] : [Q.where("is_deleted", false)]),
    ...(options?.includeArchived ? [] : [Q.where("archived_at", Q.eq(null))]),
    ...(options?.includeQuarantined ? [] : [Q.where("trust_tier", Q.notEq("quarantined"))]),
    ...(options?.includeSuperseded ? [] : [Q.where("superseded_by", null)]),
    ...(ctx.userId !== undefined ? [Q.where("user_id", ctx.userId)] : []),
    ...(options?.since ? [Q.where("updated_at", Q.gt(options.since.getTime()))] : []),
  ];
}

const KNOWN_TRUST_TIERS = new Set(["quarantined", "trusted"]);

function normalizeTrustTier(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return KNOWN_TRUST_TIERS.has(value) ? value : null;
}

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
    media: parseMedia(memory.media),
    eventTimeStart: memory.eventTimeStart ?? null,
    eventTimeEnd: memory.eventTimeEnd ?? null,
    eventTimeKind: memory.eventTimeKind ?? null,
    topicsUserManaged: memory.topicsUserManaged ?? false,
    topics: parseTopics(memory.topics),
    topicsUpdatedAt: memory.topicsUpdatedAt ?? null,
    topicsExtractedAt: memory.topicsExtractedAt ?? null,
    topicsExtractedVersion: memory.topicsExtractedVersion ?? null,
    supersededBy: memory.supersededBy ?? null,
    supersededAt: memory.supersededAt ?? null,
    lastObservedAt: memory.lastObservedAt ?? null,
    factType: memory.factType ?? null,
    archivedAt: memory.archivedAt ?? null,
    trustTier: memory.trustTier ?? null,
    visibility: visibilityOrPrivate(memory.visibility),
    twinOptIn: memory.twinOptIn ?? false,
    publishedAt: memory.publishedAt ?? null,
    geohash: memory.geohash ?? null,
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

function populateNewVaultMemory(
  record: VaultMemory,
  ctx: VaultMemoryOperationsContext,
  opts: CreateVaultMemoryOptions,
  encryptedContent: string
): void {
  record._setRaw("content", encryptedContent);
  record._setRaw("scope", opts.scope ?? "private");
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
  if (opts.factType !== undefined) {
    record._setRaw("fact_type", opts.factType);
  }
  if (opts.trustTier !== undefined) {
    record._setRaw("trust_tier", normalizeTrustTier(opts.trustTier));
  }
  record._setRaw("visibility", opts.visibility ?? "private");
  record._setRaw(
    "published_at",
    opts.visibility && opts.visibility !== "private" ? (opts.publishedAt ?? Date.now()) : null
  );
  if (opts.geohash !== undefined) {
    record._setRaw("geohash", opts.geohash);
  }
}

/** @deprecated App code: use `MemoryStore.create` (`createLocalMemoryStore`). */
export async function createVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  opts: CreateVaultMemoryOptions
): Promise<StoredVaultMemory> {
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
    if (ctx.canWrite && !(await ctx.canWrite()))
      throw new Error("Memory source is no longer eligible");
    return ctx.vaultMemoryCollection.create((record) =>
      populateNewVaultMemory(record, ctx, opts, encryptedContent)
    );
  });

  return vaultMemoryToStored(created, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

/**
 * Atomically create a new memory AND retire the stale one it supersedes (A2),
 * in a single `database.write` — closing the create-then-retire race.
 *
 * Inside the write, the target's live state is re-checked: if it was
 * concurrently deleted or already superseded (a competing supersession won the
 * race), NOTHING is created and `{ created: null, retired: false }` is returned
 * so the caller falls back to a plain create. This means the loser of a
 * concurrent supersession never leaves an orphaned successor pointing at a
 * target someone else already retired — the whole create+retire is one atomic
 * unit, so no other writer can interleave between them.
 */
export async function createSupersedingMemoryOp(
  ctx: VaultMemoryOperationsContext,
  opts: CreateVaultMemoryOptions,
  targetId: string
): Promise<{ created: StoredVaultMemory | null; retired: boolean }> {
  if (!targetId) return { created: null, retired: false };
  const encryptedContent =
    ctx.walletAddress && ctx.signMessage
      ? await encryptVaultMemoryContent(
          opts.content,
          ctx.walletAddress,
          ctx.signMessage,
          ctx.embeddedWalletSigner
        )
      : opts.content;

  let createdRecord: VaultMemory | null = null;
  await ctx.database.write(async () => {
    if (ctx.canWrite && !(await ctx.canWrite()))
      throw new Error("Memory source is no longer eligible");
    let target: VaultMemory;
    try {
      target = await ctx.vaultMemoryCollection.find(targetId);
    } catch {
      return;
    }
    if (target.isDeleted || target.supersededBy || !isOwnedByCtxUser(ctx, target)) return;

    createdRecord = await ctx.vaultMemoryCollection.create((record) =>
      populateNewVaultMemory(record, ctx, opts, encryptedContent)
    );
    await target.update((r) => {
      r._setRaw("superseded_by", createdRecord!.id);
      r._setRaw("superseded_at", Date.now());
    });
  });

  if (!createdRecord) return { created: null, retired: false };
  const created = await vaultMemoryToStored(
    createdRecord,
    ctx.walletAddress,
    ctx.signMessage,
    ctx.embeddedWalletSigner
  );
  return { created, retired: true };
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
    if (kind !== "range") {
      if (kind === "ongoing") {
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
    const memEnd = end ?? start;
    if (memEnd >= windowStart && start < windowEnd) {
      out.push({ uniqueId: r.id, eventTimeStart: start, eventTimeEnd: end, eventTimeKind: kind });
    }
  }
  return out;
}

/** @deprecated App code: use `MemoryStore.createMany` (`createLocalMemoryStore`). */
export async function createVaultMemoriesBatchOp(
  ctx: VaultMemoryOperationsContext,
  optionsArray: CreateVaultMemoryOptions[]
): Promise<StoredVaultMemory[]> {
  if (optionsArray.length === 0) return [];

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

  const created = await ctx.database.write(async () => {
    if (ctx.canWrite && !(await ctx.canWrite()))
      throw new Error("Memory source is no longer eligible");
    const prepared = optionsArray.map((opts, i) =>
      ctx.vaultMemoryCollection.prepareCreate((record) =>
        populateNewVaultMemory(record, ctx, opts, encryptedContents[i])
      )
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

/** @deprecated App code: use `MemoryStore.get` (`createLocalMemoryStore`). */
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
    topicsUserManaged: raw.topics_user_managed === true || raw.topics_user_managed === 1,
    media: parseMedia(raw.media as string | null),
    topics: parseTopics(raw.topics),
    topicsUpdatedAt: (raw.topics_updated_at as number | null) ?? null,
    topicsExtractedAt: (raw.topics_extracted_at as number | null) ?? null,
    topicsExtractedVersion: (raw.topics_extracted_version as number | null) ?? null,
    supersededBy: (raw.superseded_by as string | null) ?? null,
    supersededAt: (raw.superseded_at as number | null) ?? null,
    lastObservedAt: (raw.last_observed_at as number | null) ?? null,
    factType: (raw.fact_type as string | null) ?? null,
    archivedAt: (raw.archived_at as number | null) ?? null,
    trustTier: (raw.trust_tier as string | null) ?? null,
    visibility: visibilityOrPrivate(raw.visibility),
    twinOptIn: raw.twin_opt_in === true || raw.twin_opt_in === 1,
    publishedAt: (raw.published_at as number | null) ?? null,
    geohash: (raw.geohash as string | null) ?? null,
    createdAt: new Date(raw.created_at as number),
    updatedAt: new Date(raw.updated_at as number),
    isDeleted: raw.is_deleted === true || raw.is_deleted === 1,
  };
}

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

/** @deprecated App code: use `MemoryStore.list` (`createLocalMemoryStore`). */
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
    /** Include archived (decayed) memories. Default `false` (PR1 choke point). */
    includeArchived?: boolean;
    /** Include quarantined memories. Default `false` (PR1 choke point). */
    includeQuarantined?: boolean;
    /** Typed memory (PR1) — restrict to these fact types. Omit for no filter. */
    factTypes?: string[];
    memoryIds?: string[];
    /**
     * Include A2-superseded memories (each carries `supersededBy`). Default
     * `false` — superseded rows are excluded, as they are from recall/dedup.
     * Used by a "memory history" view to render retired facts.
     */
    includeSuperseded?: boolean;
    /**
     * Filter by People Nearby visibility. Legacy rows with a NULL column
     * count as "private". Used by the publish reconciler to fetch the
     * published set to diff against the server index.
     */
    visibility?: VaultMemoryVisibility[];
  }
): Promise<StoredVaultMemory[]> {
  const conditions = [
    ...baseVaultConditions(ctx, options),
    ...(options?.scopes?.length ? [Q.where("scope", Q.oneOf(options.scopes))] : []),
    ...visibilityConditions(options?.visibility),
    ...(options?.folderId !== undefined ? [Q.where("folder_id", options.folderId)] : []),
    ...(options?.factTypes?.length ? [Q.where("fact_type", Q.oneOf(options.factTypes))] : []),
    Q.sortBy(options?.since ? "updated_at" : "created_at", Q.desc),
    ...(options?.limit !== null && options?.limit !== undefined && options.limit > 0
      ? [Q.take(options.limit)]
      : []),
  ];
  const results = (await ctx.vaultMemoryCollection.query(...conditions).unsafeFetchRaw()) as Record<
    string,
    unknown
  >[];
  return mapInBatches(results, (raw) =>
    vaultMemoryRawToStored(raw, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
  );
}

function vaultMemoryRawToRankable(raw: Record<string, unknown>): RankableVaultMemory {
  return {
    uniqueId: raw.id as string,
    scope: (raw.scope as string) ?? "",
    folderId: (raw.folder_id as string | null) ?? null,
    embedding: (raw.embedding as string | null) ?? null,
    embeddingModel: (raw.embedding_model as string | null) ?? null,
    createdAt: new Date(raw.created_at as number),
    updatedAt: new Date(raw.updated_at as number),
    lastObservedAt: (raw.last_observed_at as number | null) ?? null,
  };
}

/**
 * Return content-free {@link RankableVaultMemory} projections for recall
 * ranking — the "rank first, decrypt last" half of on-demand recall (#5017).
 *
 * Mirrors {@link getAllVaultMemoriesOp}'s query EXACTLY (same
 * `baseVaultConditions` — `is_deleted=false` + `user_id` scoping — plus the
 * same scope/folder filters and ordering) so the candidate SET is identical to
 * the whole-vault read; the ONLY difference is that `content` is never
 * decrypted (and never returned). Callers rank on `embedding`, then decrypt the
 * top-N winners on demand via {@link getVaultMemoryOp}.
 *
 * Because it reuses `baseVaultConditions`, deleted and cross-user rows are
 * excluded here just as they are from every other read path — a no-decrypt op
 * that skipped these would leak embeddings for rows the caller can't see.
 */
export async function getVaultRankingProjectionsOp(
  ctx: VaultMemoryOperationsContext,
  options?: {
    scopes?: string[];
    since?: Date;
    limit?: number;
    folderId?: string | null;
    memoryIds?: string[];
  }
): Promise<RankableVaultMemory[]> {
  const conditions = [
    ...baseVaultConditions(ctx, options),
    ...(options?.scopes?.length ? [Q.where("scope", Q.oneOf(options.scopes))] : []),
    ...(options?.folderId !== undefined ? [Q.where("folder_id", options.folderId)] : []),
    Q.sortBy(options?.since ? "updated_at" : "created_at", Q.desc),
    ...(options?.limit !== null && options?.limit !== undefined && options.limit > 0
      ? [Q.take(options.limit)]
      : []),
  ];
  const results = (await ctx.vaultMemoryCollection.query(...conditions).unsafeFetchRaw()) as Record<
    string,
    unknown
  >[];
  return results.map(vaultMemoryRawToRankable);
}

export interface VaultCandidateKey {
  uniqueId: string;
  folderId: string | null;
  scope: string;
  embeddingModel: string | null;
  updatedAt: Date;
}

function baseVaultSql(
  ctx: VaultMemoryOperationsContext,
  options?: { includeArchived?: boolean }
): {
  sql: string;
  args: Array<string | number | boolean | null>;
} {
  const clauses = [
    '"is_deleted" = 0',
    ...(options?.includeArchived ? [] : ['"archived_at" is null']),
    `"trust_tier" is not 'quarantined'`,
    '"superseded_by" is null',
  ];
  const args: Array<string | number | boolean | null> = [];
  if (ctx.userId !== undefined) {
    clauses.push('"user_id" = ?');
    args.push(ctx.userId);
  }
  return { sql: clauses.join(" and "), args };
}

/**
 * Column-projected candidate keys — id + rank-metadata, NO content/embedding
 * blobs. On OPFS-SQLite this is a projected SELECT (skips the blobs on disk);
 * on LokiJS (Q.unsafeSqlQuery throws) it falls back to the standard Q query +
 * unsafeFetchRaw (blobs are already resident there, so the read is free).
 */
export async function getVaultCandidateKeysOp(
  ctx: VaultMemoryOperationsContext,
  options?: {
    scopes?: string[];
    folderId?: string | null;
    /**
     * Typed memory (PR1) — restrict to these fact types. Omit for no filter.
     * MUST stay in step with `getAllVaultMemoriesOp`: this op backs the
     * decrypt-last search path, and the two paths are meant to return the same
     * candidate set for the same query. Dropping it here made typed recall
     * silently path-dependent (#779).
     */
    factTypes?: string[];
    memoryIds?: string[];
    /** Include archived (decayed) memories. Default `false`, as elsewhere. */
    includeArchived?: boolean;
  }
): Promise<VaultCandidateKey[]> {
  const mapRaw = (raw: Record<string, unknown>): VaultCandidateKey => ({
    uniqueId: raw.id as string,
    folderId: (raw.folder_id as string | null) ?? null,
    scope: (raw.scope as string) ?? "",
    embeddingModel: (raw.embedding_model as string | null) ?? null,
    updatedAt: new Date(raw.updated_at as number),
  });

  try {
    const base = baseVaultSql(ctx, {
      ...(options?.includeArchived !== undefined && { includeArchived: options.includeArchived }),
    });
    const clauses = [base.sql];
    const args = [...base.args];
    if (options?.memoryIds !== undefined) {
      if (options.memoryIds.length === 0) return [];
      clauses.push(`"id" in (${options.memoryIds.map(() => "?").join(",")})`);
      args.push(...options.memoryIds);
    }
    if (options?.scopes?.length) {
      clauses.push(`"scope" in (${options.scopes.map(() => "?").join(",")})`);
      args.push(...options.scopes);
    }
    if (options?.folderId !== undefined) {
      clauses.push(options.folderId === null ? '"folder_id" is null' : '"folder_id" = ?');
      if (options.folderId !== null) args.push(options.folderId);
    }
    if (options?.factTypes?.length) {
      clauses.push(`"fact_type" in (${options.factTypes.map(() => "?").join(",")})`);
      args.push(...options.factTypes);
    }
    const sql =
      `select "id", "scope", "folder_id", "embedding_model", "updated_at" ` +
      `from "memory_vault" where ${clauses.join(" and ")}`;
    const rows = (await ctx.vaultMemoryCollection
      .query(Q.unsafeSqlQuery(sql, args))
      .unsafeFetchRaw()) as Record<string, unknown>[];
    return rows.map(mapRaw);
  } catch (err) {
    getLogger().debug(
      "memoryVault: getVaultCandidateKeysOp projected SQL unavailable, using full-load fallback: " +
        (err instanceof Error ? err.message : String(err))
    );
    const conditions = [
      ...baseVaultConditions(ctx, {
        memoryIds: options?.memoryIds,
        ...(options?.includeArchived !== undefined && { includeArchived: options.includeArchived }),
      }),
      ...(options?.scopes?.length ? [Q.where("scope", Q.oneOf(options.scopes))] : []),
      ...(options?.folderId !== undefined ? [Q.where("folder_id", options.folderId)] : []),
      ...(options?.factTypes?.length ? [Q.where("fact_type", Q.oneOf(options.factTypes))] : []),
    ];
    const rows = (await ctx.vaultMemoryCollection.query(...conditions).unsafeFetchRaw()) as Record<
      string,
      unknown
    >[];
    return rows.map(mapRaw);
  }
}

/**
 * Column-projected embedding lookup for a KNOWN set of ids — id + embedding +
 * embedding_model, NO content. Used to backfill cache-miss vectors during
 * ranking without paying the content-decrypt cost. Mirrors
 * {@link getVaultCandidateKeysOp}'s dual-path shape: a projected SELECT on
 * OPFS-SQLite, falling back to the standard Q query + unsafeFetchRaw on
 * LokiJS (Q.unsafeSqlQuery throws there).
 */
export async function getVaultEmbeddingsByIdsOp(
  ctx: VaultMemoryOperationsContext,
  ids: string[],
  /**
   * Must match whatever admitted these ids. The caller has already filtered the
   * candidate set; re-applying a DEFAULT-ON exclusion here silently deletes rows
   * it deliberately admitted — which is how archived rows passed the key scan
   * and then vanished at hydration (#779).
   */
  options?: { includeArchived?: boolean }
): Promise<Array<{ uniqueId: string; embedding: string | null; embeddingModel: string | null }>> {
  if (ids.length === 0) return [];
  const mapRaw = (raw: Record<string, unknown>) => ({
    uniqueId: raw.id as string,
    embedding: (raw.embedding as string | null) ?? null,
    embeddingModel: (raw.embedding_model as string | null) ?? null,
  });
  try {
    const base = baseVaultSql(ctx, {
      ...(options?.includeArchived !== undefined && { includeArchived: options.includeArchived }),
    });
    const sql =
      `select "id", "embedding", "embedding_model" from "memory_vault" ` +
      `where ${base.sql} and "id" in (${ids.map(() => "?").join(",")})`;
    const rows = (await ctx.vaultMemoryCollection
      .query(Q.unsafeSqlQuery(sql, [...base.args, ...ids]))
      .unsafeFetchRaw()) as Record<string, unknown>[];
    return rows.map(mapRaw);
  } catch (err) {
    getLogger().debug(
      "memoryVault: getVaultEmbeddingsByIdsOp projected SQL unavailable, using full-load fallback: " +
        (err instanceof Error ? err.message : String(err))
    );
    const rows = (await ctx.vaultMemoryCollection
      .query(
        ...baseVaultConditions(ctx, {
          ...(options?.includeArchived !== undefined && {
            includeArchived: options.includeArchived,
          }),
        }),
        Q.where("id", Q.oneOf(ids))
      )
      .unsafeFetchRaw()) as Record<string, unknown>[];
    return rows.map(mapRaw);
  }
}

/**
 * Bulk-decrypt a KNOWN set of memories by ID — the "decrypt last" half of
 * on-demand recall (#5017) for lanes whose size is NOT bounded to the top-N
 * (e.g. the keyword lane over un-embedded rows). Uses `unsafeFetchRaw` + a
 * single `id oneOf` query so it does NOT pin a WatermelonDB Model per row into
 * the never-evicted RecordCache — unlike calling {@link getVaultMemoryOp} N
 * times, which `.find()`s each row and is only appropriate for the bounded
 * top-N winners (web Pile-2 tab-memory).
 *
 * Reuses `baseVaultConditions`, so deleted / superseded / cross-user rows are
 * excluded exactly as they are from recall — a caller can pass any id list and
 * only its own live rows come back.
 *
 * @deprecated App code: use `MemoryStore.list({ memoryIds })` (`createLocalMemoryStore`).
 */
export async function getVaultMemoriesByIdsOp(
  ctx: VaultMemoryOperationsContext,
  ids: string[],
  /** See {@link getVaultEmbeddingsByIdsOp} — must match what admitted these ids. */
  options?: { includeArchived?: boolean }
): Promise<StoredVaultMemory[]> {
  if (ids.length === 0) return [];
  const conditions = [
    ...baseVaultConditions(ctx, {
      ...(options?.includeArchived !== undefined && { includeArchived: options.includeArchived }),
    }),
    Q.where("id", Q.oneOf(ids)),
  ];
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

/**
 * Cheap count of the active (recall-reachable) vault rows (PR5). Used as the
 * graph-lane density hint that gates multi-hop traversal (see
 * {@link ../../memory/graphTraversal}.capHopsForDensity): above the threshold
 * the traversal degrades to seed-only rather than pay an unbounded expansion.
 *
 * Uses `fetchCount` over the same {@link baseVaultConditions} choke point every
 * read lane inherits (excludes deleted / archived / quarantined), so it counts
 * exactly the rows recall can reach. NO Model materialization and NO content
 * decrypt — a pure indexed COUNT, safe to run on the recall hot path.
 */
export async function countActiveVaultMemoriesOp(
  ctx: VaultMemoryOperationsContext
): Promise<number> {
  return ctx.vaultMemoryCollection.query(...baseVaultConditions(ctx)).fetchCount();
}

/**
 * Given a set of candidate memory ids, return the subset that is ACTIVE — i.e.
 * passes the same {@link baseVaultConditions} choke point every recall lane
 * inherits (not soft-deleted, not archived, not quarantined, and user-scoped).
 *
 * Used by the graph-traversal lane (see {@link ../../memory/graphTraversal})
 * to drop "forgotten" (archived / quarantined) memories from the traversal
 * FRONTIER before they can steer neighbor-entity ranking or egress their entity
 * names to the optional path-refiner. The final recall result gate already
 * hides archived/quarantined rows, but the traversal walks over ids directly —
 * so it must resolve them against the active set itself, at each hop.
 *
 * Plaintext-only: selects just the `id` column via `unsafeFetchRaw` — NO Model
 * per row (dodges the never-evicted RecordCache) and NO content decrypt — so it
 * is cheap enough to call per traversal hop. Empty input → empty set (no query).
 */
export async function getActiveVaultMemoryIdsOp(
  ctx: VaultMemoryOperationsContext,
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set<string>();
  const rows = (await ctx.vaultMemoryCollection
    .query(...baseVaultConditions(ctx), Q.where("id", Q.oneOf(ids)))
    .unsafeFetchRaw()) as Record<string, unknown>[];
  return new Set(rows.map((r) => r.id as string));
}

/** @deprecated App code: use `MemoryStore.update` (`createLocalMemoryStore`). */
export async function updateVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  opts: UpdateVaultMemoryOptions
): Promise<StoredVaultMemory | null> {
  try {
    const probe = await ctx.vaultMemoryCollection.find(id);
    if (probe.isDeleted || probe.supersededBy || !isOwnedByCtxUser(ctx, probe)) return null;

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
      if (ctx.canWrite && !(await ctx.canWrite()))
        throw new Error("Memory source is no longer eligible");
      if (record.isDeleted || record.supersededBy || !isOwnedByCtxUser(ctx, record)) {
        stale = true;
        return;
      }
      let observedSources: string[] = [];
      let replayedObservation = false;
      if (opts.observationSourceIds?.length) {
        try {
          const parsed: unknown = JSON.parse(record.sourceChunkIds ?? "[]");
          if (Array.isArray(parsed))
            observedSources = parsed.filter((id): id is string => typeof id === "string");
        } catch {
          /* Legacy malformed provenance is repaired by the next observation. */
        }
        replayedObservation = opts.observationSourceIds.every((id) => observedSources.includes(id));
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
          r._setRaw("embedding_model", opts.embeddingModel ?? null);
        }
        if (opts.sourceChunkIds !== undefined) {
          r._setRaw(
            "source_chunk_ids",
            JSON.stringify(
              opts.observationSourceIds?.length
                ? [...new Set([...observedSources, ...opts.sourceChunkIds])]
                : opts.sourceChunkIds
            )
          );
        }
        if (replayedObservation) {
          /* Same sources seen again: no new evidence, so no proof bump. */
        } else if (opts.proofCountIncrement !== undefined) {
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
        if (opts.topicsUserManaged !== undefined) {
          r._setRaw("topics_user_managed", opts.topicsUserManaged);
        }
        if (opts.lastObservedAt !== undefined && !replayedObservation) {
          r._setRaw("last_observed_at", opts.lastObservedAt);
        }
        if (opts.factType !== undefined) {
          r._setRaw("fact_type", opts.factType);
        }
        if (opts.trustTier !== undefined) {
          r._setRaw("trust_tier", normalizeTrustTier(opts.trustTier));
        }
        if (opts.restore) {
          r._setRaw("archived_at", null);
        }
        if (opts.preserveUpdatedAt) {
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

/**
 * Replace a memory's topic (entity) links with a user-chosen set and mark the
 * memory `topics_user_managed` so auto-extraction stops touching its links.
 * Replace semantics: the given `entities` become the memory's complete topic
 * set (pass `[]` to clear all topics — the memory stays user-managed and
 * unclustered). Requires `ctx.entityCtx`. Preserves `updated_at` so a topic
 * edit doesn't inflate the recency multiplier — `topics_updated_at` is what
 * carries the edit to the user's other devices.
 *
 * @deprecated App code: use `MemoryStore.setTopics` (`createLocalMemoryStore`).
 */
export async function setMemoryEntitiesOp(
  ctx: VaultMemoryOperationsContext,
  memoryId: string,
  entities: ReadonlyArray<EntityInput>
): Promise<StoredVaultMemory | null> {
  const entityCtx = ctx.entityCtx;
  if (!entityCtx) {
    throw new Error("setMemoryEntitiesOp requires ctx.entityCtx (entity collections)");
  }
  let record: VaultMemory;
  try {
    record = await ctx.vaultMemoryCollection.find(memoryId);
  } catch {
    return null;
  }
  if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return null;

  let stale = false;
  const originalUpdatedAt = record.updatedAt.getTime();
  await ctx.database.write(async (writer) => {
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) {
      stale = true;
      return;
    }
    await record.update((r) => {
      r._setRaw("topics_user_managed", true);
      r._setRaw("updated_at", originalUpdatedAt);
    });

    const linked =
      entities.length > 0
        ? await writer.callWriter(() =>
            linkMemoryEntitiesOp(entityCtx, memoryId, entities, { topicsSource: "user" })
          )
        : [];
    const keep = new Set(linked.map((e) => e.uniqueId));
    const existing = await entityCtx.memoryEntityCollection
      .query(Q.where("memory_id", memoryId))
      .fetch();
    const staleLinks = existing.filter((l) => !keep.has(String(l.entityId)));
    if (staleLinks.length === 0 && entities.length > 0) return;
    const topicsWrite = await resolveMemoryTopicsWrite(
      entityCtx,
      memoryId,
      linked,
      entities,
      "user"
    );
    await ctx.database.batch(
      ...staleLinks.map((l) => l.prepareDestroyPermanently()),
      ...(topicsWrite ? [prepareMemoryTopicsUpdate(topicsWrite)] : [])
    );
  });
  if (stale) return null;

  return vaultMemoryToStored(record, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

/**
 * Reset a memory's topics to automatic: clear the `topics_user_managed` flag so
 * auto-extraction resumes owning its links. Invalidates `topics_extracted_version`
 * (→ null) and ensures a NON-NULL `topics_extracted_at`, so the next sweep routes
 * the row through the stale-version pending path and actually RE-EXTRACTS it via
 * the LLM. A never-stamped user-curated row (`setMemoryEntitiesOp` marks
 * user-managed without stamping, so stamp can be null) would otherwise fall
 * through the sweep's unstamped→`linkedUnstamped` grandfather path (stamped
 * current, no LLM pass); forcing a stamp when absent avoids that. Existing links
 * are left in place until the re-extraction replaces them. Preserves `updated_at`.
 *
 * Both stamp columns are DEPRECATED (v42) — `topics_updated_at` subsumes them;
 * see the schema note. This op's version-invalidation trick is the reason the
 * earlier plan to exclude them from sync was dropped, and it's the last piece
 * that has to move before they can go.
 *
 * `options.unlessTopicsRecorded` declines the reset when the row already has a
 * `topics` record, re-checked INSIDE the serialized writer. Only the repair path
 * in {@link getMemoriesNeedingTopicExtractionOp} passes it: that path clears the
 * flag off rows whose curation is provably empty, and a `setMemoryEntitiesOp`
 * committing in the gap would have written a real record the autotagger must not
 * be handed. The user-facing reset leaves it off — resetting a memory that HAS
 * curated topics is the whole point there.
 */
export async function clearMemoryTopicsOverrideOp(
  ctx: VaultMemoryOperationsContext,
  memoryId: string,
  options?: { unlessTopicsRecorded?: boolean }
): Promise<boolean> {
  let record: VaultMemory;
  try {
    record = await ctx.vaultMemoryCollection.find(memoryId);
  } catch {
    return false;
  }
  if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;
  const originalUpdatedAt = record.updatedAt.getTime();
  let cleared = false;
  await ctx.database.write(async () => {
    if (options?.unlessTopicsRecorded && parseTopics(record.topics) !== null) return;
    cleared = true;
    await record.update((r) => {
      r._setRaw("topics_user_managed", false);
      r._setRaw("topics_extracted_version", null);
      if (record.topicsExtractedAt === null) {
        r._setRaw("topics_extracted_at", originalUpdatedAt);
      }
      r._setRaw("updated_at", originalUpdatedAt);
    });
  });
  return cleared;
}

/**
 * Set a memory's People Nearby visibility (and optionally its twin opt-in).
 *
 * This is the ONLY sanctioned write path for `visibility` — it keeps the
 * `published_at` bookkeeping consistent: transitioning to `public`
 * stamps `published_at` (kept if already set); transitioning to `private`
 * clears it (revoke). The server index remains the authority for what IS
 * published — this records the user's intent for the reconciler to act on.
 *
 * Preserves `updated_at`: a visibility change is metadata, not a
 * re-observation, so it must not inflate the recency multiplier (mirrors
 * {@link setMemoryEntitiesOp}).
 *
 * @deprecated App code: use `MemoryStore.setVisibility` (`createLocalMemoryStore`).
 */
export async function setMemoryVisibilityOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  opts: {
    visibility: VaultMemoryVisibility;
    /** If provided, sets the twin opt-in flag alongside the visibility. */
    twinOptIn?: boolean;
  }
): Promise<StoredVaultMemory | null> {
  let record: VaultMemory;
  try {
    record = await ctx.vaultMemoryCollection.find(id);
  } catch {
    return null;
  }
  if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return null;

  let stale = false;
  await ctx.database.write(async () => {
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) {
      stale = true;
      return;
    }
    const currentUpdatedAt = record.updatedAt.getTime();
    const currentPublishedAt = record.publishedAt ?? null;
    await record.update((r) => {
      r._setRaw("visibility", opts.visibility);
      if (opts.visibility === "private") {
        r._setRaw("published_at", null);
      } else if (currentPublishedAt === null) {
        r._setRaw("published_at", Date.now());
      }
      if (opts.twinOptIn !== undefined) {
        r._setRaw("twin_opt_in", opts.twinOptIn);
      }
      r._setRaw("updated_at", currentUpdatedAt);
    });
  });
  if (stale) return null;

  return vaultMemoryToStored(record, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

/** @deprecated App code: use `MemoryStore.delete` (`createLocalMemoryStore`). */
export async function deleteVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string
): Promise<boolean> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;

    let stale = false;
    await ctx.database.write(async () => {
      if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) {
        stale = true;
        return;
      }
      await record.update((r) => {
        r._setRaw("is_deleted", true);
      });
    });
    if (stale) return false;

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
 * Mark a memory as superseded by a newer one (A2 write-time supersession).
 * The row stays in the table (history + read-time fallback) but is excluded
 * from recall/dedup by default via `superseded_by`. Idempotent-ish: no-op if
 * the row is missing, not owned, deleted, or already superseded. Does NOT
 * preserve `updated_at` — superseded rows are hidden from recall, so their
 * recency is irrelevant.
 *
 * @param id - the memory being retired (e.g. "Lives in Portland")
 * @param supersededById - the newer memory that replaced it (e.g. "Lives in SF")
 *
 * @deprecated App code: use `MemoryStore.supersede` (`createLocalMemoryStore`).
 */
export async function supersedeVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  supersededById: string
): Promise<boolean> {
  if (id === supersededById) return false;
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || record.supersededBy || !isOwnedByCtxUser(ctx, record)) return false;

    let successor;
    try {
      successor = await ctx.vaultMemoryCollection.find(supersededById);
    } catch {
      return false;
    }
    if (successor.isDeleted || successor.supersededBy || !isOwnedByCtxUser(ctx, successor)) {
      return false;
    }

    let stale = false;
    await ctx.database.write(async () => {
      if (ctx.canWrite && !(await ctx.canWrite()))
        throw new Error("Memory source is no longer eligible");
      if (record.isDeleted || record.supersededBy || !isOwnedByCtxUser(ctx, record)) {
        stale = true;
        return;
      }
      if (successor.isDeleted || successor.supersededBy || !isOwnedByCtxUser(ctx, successor)) {
        stale = true;
        return;
      }
      await record.update((r) => {
        r._setRaw("superseded_by", supersededById);
        r._setRaw("superseded_at", Date.now());
      });
    });
    return !stale;
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

/**
 * The current topic-extraction logic version. Bump this whenever the extraction
 * prompt or model in `topicExtract.ts` changes: every memory stamped under an
 * older version (including pre-v37 rows, read as version 0) is then re-extracted
 * by the next sweep, so topic-quality improvements propagate across the existing
 * vault. The worker's `limit` drains that re-extraction across sweeps.
 *
 * Bumping this is a WHOLE-VAULT re-extraction: the gate is unconditional across
 * every stamped row, and `stampTopicsExtractedAtOp` stamps this version on every
 * healthy row, so a bump sends each user's entire extracted vault back to the
 * LLM. Never reach for it to repair a subset — see the pre-v42-restore repair in
 * {@link getMemoriesNeedingTopicExtractionOp}, which targets the damaged rows.
 */
export const TOPICS_EXTRACTION_VERSION = 3;

/**
 * Result of {@link getMemoriesNeedingTopicExtractionOp}: which memories the
 * background topic worker should run LLM entity extraction on, and which it
 * should merely stamp as already-extracted.
 */
export interface MemoriesNeedingTopicExtraction {
  /**
   * Memories to run LLM topic extraction on (decrypted): never-extracted rows
   * with no entity links, plus stamped rows edited since their last pass
   * (`updated_at` > `topics_extracted_at`) or extracted under an older
   * `topics_extracted_version` than {@link TOPICS_EXTRACTION_VERSION}, plus the
   * pre-v42-restore repair: a stamped row left with neither links nor a `topics`
   * record, which no no-LLM bucket can reach. Edited / stale-version rows come
   * first (they get priority under `limit`), each group newest-created first.
   */
  pending: StoredVaultMemory[];
  /**
   * IDs of rows that already have entity links but no watermark — legacy rows
   * extracted by the conversation pipeline before v36. Grandfather these with
   * {@link stampTopicsExtractedAtOp} (no LLM call) so a later content edit
   * makes them re-extractable instead of invisible forever. Bounded by the
   * same `limit` as {@link pending} — stamping loads a Model per row, so the
   * grandfather backlog is drained across sweeps rather than in one spike.
   */
  linkedUnstamped: string[];
  /**
   * IDs whose `topics` record disagrees with their `memory_entity` links — the
   * restored-device case, where the synced record arrived but the device-local
   * index (which can never sync) did not. Rebuild with
   * {@link relinkMemoryTopicsOp}: no LLM call, and no `memory_vault` write, so a
   * restore doesn't re-upload the vault.
   *
   * INCLUDES user-managed rows. A curated memory's index needs rebuilding just
   * like an auto one, and the flag it arrives with is what keeps the autotagger
   * off it — so unlike {@link pending} / {@link linkedUnstamped}, this bucket is
   * not filtered by ownership. Bounded by `limit`.
   */
  topicsToRelink: string[];
  /**
   * IDs that have links but no `topics` record at all — rows predating v42,
   * whose topics would otherwise never reach the server. Fill with
   * {@link backfillMemoryTopicsOp} (no LLM call), which derives the record from
   * the links already there.
   *
   * Also includes user-managed rows, for the same reason: a curated memory's
   * topics are exactly the ones worth preserving across a migration. Bounded by
   * `limit` because filling `topics` bumps `topics_updated_at` and so re-uploads
   * the row (embedding included) — uncapped, the first sweep after upgrade would
   * re-upload the entire vault at once. Rows already in {@link pending} are
   * excluded: their imminent LLM pass writes `topics` anyway.
   */
  topicsBackfill: string[];
}

async function linkedEntityNamesByMemory(
  entityCtx: EntityOperationsContext,
  memoryIds: readonly string[]
): Promise<Map<string, Set<string>>> {
  const CHUNK = 500;
  const entityIdByMemory = new Map<string, Set<string>>();
  const allEntityIds = new Set<string>();
  for (let i = 0; i < memoryIds.length; i += CHUNK) {
    const links = (await entityCtx.memoryEntityCollection
      .query(Q.where("memory_id", Q.oneOf(memoryIds.slice(i, i + CHUNK))))
      .unsafeFetchRaw()) as Record<string, unknown>[];
    for (const link of links) {
      const memoryId = String(link.memory_id);
      const entityId = String(link.entity_id);
      allEntityIds.add(entityId);
      let bucket = entityIdByMemory.get(memoryId);
      if (!bucket) {
        bucket = new Set();
        entityIdByMemory.set(memoryId, bucket);
      }
      bucket.add(entityId);
    }
  }

  const entityIds = Array.from(allEntityIds);
  const nameById = new Map<string, string>();
  for (let i = 0; i < entityIds.length; i += CHUNK) {
    const entities = (await entityCtx.entityCollection
      .query(Q.where("id", Q.oneOf(entityIds.slice(i, i + CHUNK))))
      .unsafeFetchRaw()) as Record<string, unknown>[];
    for (const e of entities) {
      if (typeof e.canonical_name === "string") nameById.set(String(e.id), e.canonical_name);
    }
  }

  const out = new Map<string, Set<string>>();
  for (const [memoryId, ids] of entityIdByMemory) {
    const names = new Set<string>();
    for (const id of ids) {
      const name = nameById.get(id);
      if (name !== undefined) names.add(name);
    }
    if (names.size > 0) out.set(memoryId, names);
  }
  return out;
}

function linksDivergeFromTopics(topics: readonly StoredTopic[], linked: Set<string>): boolean {
  const wanted = new Set(
    topics.map((t) => normalizeEntityName(t.name)).filter((n) => n.length > 0)
  );
  if (wanted.size !== linked.size) return true;
  for (const name of wanted) if (!linked.has(name)) return true;
  return false;
}

/**
 * Sweep query for the background topic-extraction worker: partition the user's
 * non-deleted memories by what the worker should do with them (see
 * {@link MemoriesNeedingTopicExtraction}). Requires `ctx.entityCtx` for the
 * entity-links check.
 *
 * User-managed rows are excluded from the two LLM-facing buckets — the user owns
 * their topics, including an intentionally empty set — but NOT from
 * `topicsToRelink` / `topicsBackfill`, which only move a curated row's topics
 * between the record and the index and never re-derive them. That's why the
 * ownership filter lives in the partition below rather than in the query: a
 * restored curated memory is exactly the row whose index must be rebuilt.
 *
 * NOT purely a read: a curated row with no `topics` record AND no usable link is
 * a contradiction only a pre-v42 restore produces, and this is the one place
 * that can see all three facts at once, so it clears the flag there (capped by
 * `limit`) before returning. See the branch for why that's safe.
 *
 * @deprecated App code: use `MemoryStore.maintenance.getTopicBacklog` (`createLocalMemoryStore`).
 */
export async function getMemoriesNeedingTopicExtractionOp(
  ctx: VaultMemoryOperationsContext,
  options?: { limit?: number }
): Promise<MemoriesNeedingTopicExtraction> {
  const entityCtx = ctx.entityCtx;
  if (!entityCtx) {
    throw new Error("getMemoriesNeedingTopicExtractionOp requires ctx.entityCtx");
  }
  const conditions = [...baseVaultConditions(ctx), Q.sortBy("created_at", Q.desc)];
  const rows = (await ctx.vaultMemoryCollection.query(...conditions).unsafeFetchRaw()) as Record<
    string,
    unknown
  >[];

  const linkedNames = await linkedEntityNamesByMemory(
    entityCtx,
    rows.map((r) => r.id as string)
  );

  const cap = options?.limit !== undefined && options.limit > 0 ? options.limit : undefined;
  const pendingRaw: Record<string, unknown>[] = [];
  const stampedPendingRaw: Record<string, unknown>[] = [];
  const linkedUnstampedAll: string[] = [];
  const topicsToRelinkAll: string[] = [];
  const topicsBackfillAll: string[] = [];
  const emptyCurationToClear: string[] = [];

  for (const raw of rows) {
    const id = raw.id as string;
    const topics = parseTopics(raw.topics);
    const linked = linkedNames.get(id);

    if (topics !== null && linksDivergeFromTopics(topics, linked ?? new Set())) {
      topicsToRelinkAll.push(id);
      continue;
    }

    if (raw.topics_user_managed) {
      if (topics !== null || linked !== undefined) {
        if (topics === null) topicsBackfillAll.push(id);
        continue;
      }
      if (cap !== undefined && emptyCurationToClear.length >= cap) continue;
      emptyCurationToClear.push(id);
    }

    const stamp = (raw.topics_extracted_at as number | null) ?? null;
    let isPending = false;
    if (stamp !== null) {
      const version = (raw.topics_extracted_version as number | null) ?? 0;
      if ((raw.updated_at as number) > stamp || version < TOPICS_EXTRACTION_VERSION) {
        stampedPendingRaw.push(raw);
        isPending = true;
      }
    } else if (linked !== undefined) {
      linkedUnstampedAll.push(id);
    } else {
      pendingRaw.push(raw);
      isPending = true;
    }

    if (!isPending && linked === undefined && topics === null) {
      pendingRaw.push(raw);
      isPending = true;
    }

    if (!isPending && topics === null && linked !== undefined) {
      topicsBackfillAll.push(id);
    }
  }

  for (const id of emptyCurationToClear) {
    try {
      await clearMemoryTopicsOverrideOp(ctx, id, { unlessTopicsRecorded: true });
    } catch (err) {
      getLogger().warn("[memory/topics] repair clear failed", err);
    }
  }

  const orderedPendingRaw = [...stampedPendingRaw, ...pendingRaw];
  const limitedPendingRaw = cap !== undefined ? orderedPendingRaw.slice(0, cap) : orderedPendingRaw;
  const pending = await mapInBatches(limitedPendingRaw, (raw) =>
    vaultMemoryRawToStored(raw, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
  );
  const applyCap = (ids: string[]): string[] => (cap !== undefined ? ids.slice(0, cap) : ids);
  return {
    pending,
    linkedUnstamped: applyCap(linkedUnstampedAll),
    topicsToRelink: applyCap(topicsToRelinkAll),
    topicsBackfill: applyCap(topicsBackfillAll),
  };
}

/**
 * Stamp `topics_extracted_at` (and `topics_extracted_version`) on the given
 * memories — both DEPRECATED (v42), subsumed by `topics_updated_at`; see the
 * schema note. The topic worker calls this after a successful extraction pass
 * (including zero-entity results, so quiet memories aren't re-asked every sweep)
 * and to grandfather `linkedUnstamped` rows without an LLM call. `version`
 * defaults to {@link TOPICS_EXTRACTION_VERSION}: stamping at the current version
 * (for both fresh extractions and grandfathered legacy rows) means they aren't
 * re-extracted until a future version bump. Preserves `updated_at` so a stamp
 * never inflates the recency multiplier — and never masks a concurrent content
 * edit from the next sweep. Skips deleted, foreign-user, and user-managed rows.
 * Returns the IDs actually stamped.
 *
 * ALL eligibility AND `updated_at` are read from the LIVE Model inside the
 * serialized writer — never a pre-writer snapshot. Writers are serialized, so
 * a content edit or topic-override that commits before this writer runs is
 * observed here: its fresh `updated_at` is preserved (so the next sweep's
 * `updated_at > stamp` check still fires) and a mid-pass user-managed flip
 * skips the row. Reading `updated_at` from a raw pre-fetch instead would write
 * a stale value back, pushing `updated_at < topics_extracted_at` and hiding
 * the edited memory from every future sweep.
 *
 * Callers bound the input via `getMemoriesNeedingTopicExtractionOp`'s `limit`
 * (both `pending` and `linkedUnstamped` are capped), so the per-row Model load
 * needed to `prepareUpdate` stays bounded and never spikes the RecordCache.
 *
 * @deprecated App code: use `MemoryStore.maintenance.stampTopicsExtracted` (`createLocalMemoryStore`).
 */
export async function stampTopicsExtractedAtOp(
  ctx: VaultMemoryOperationsContext,
  memoryIds: readonly string[],
  extractedAt: number,
  version: number = TOPICS_EXTRACTION_VERSION
): Promise<string[]> {
  if (memoryIds.length === 0) return [];

  const uniqueIds = Array.from(new Set(memoryIds));

  const CHUNK = 500;
  const stamped: string[] = [];

  for (let i = 0; i < uniqueIds.length; i += CHUNK) {
    const chunkIds = uniqueIds.slice(i, i + CHUNK);

    await ctx.database.write(async () => {
      const records: VaultMemory[] = [];
      for (const id of chunkIds) {
        try {
          records.push(await ctx.vaultMemoryCollection.find(id));
        } catch {
          // Missing row — skip.
        }
      }
      const eligible = records.filter(
        (record) => !record.isDeleted && isOwnedByCtxUser(ctx, record) && !record.topicsUserManaged
      );
      const prepared = eligible.map((record) => {
        const originalUpdatedAt = record.updatedAt.getTime();
        return record.prepareUpdate((r) => {
          r._setRaw("topics_extracted_at", extractedAt);
          r._setRaw("topics_extracted_version", version);
          r._setRaw("updated_at", originalUpdatedAt);
        });
      });
      for (const record of eligible) stamped.push(record.id);
      if (prepared.length > 0) await ctx.database.batch(...prepared);
    });
  }

  return stamped;
}

/**
 * Rebuild the `memory_entity` index for the sweep's `topicsToRelink` rows from
 * each row's `topics` record — the restored-device repair. No LLM call: every
 * name already lives on the row.
 *
 * Writes NOTHING to `memory_vault`, deliberately. Restored rows are written
 * `_status: 'synced'`, so touching them would mark the whole vault dirty and
 * re-upload it (embeddings included) after every migration — the index is
 * device-local state and rebuilding it is not a change to the memory.
 * `topics_user_managed` in particular is left exactly as it arrived, so the
 * autotagger stays off a curated memory whose links this just restored.
 *
 * Skips deleted rows, foreign-user rows, and rows with null topics.
 * Empty topics remove stale links. Returns the relinked IDs.
 *
 * @deprecated App code: use `MemoryStore.maintenance.relinkTopics` (`createLocalMemoryStore`).
 */
export async function relinkMemoryTopicsOp(
  ctx: VaultMemoryOperationsContext,
  memoryIds: readonly string[]
): Promise<string[]> {
  const entityCtx = ctx.entityCtx;
  if (!entityCtx) {
    throw new Error("relinkMemoryTopicsOp requires ctx.entityCtx");
  }
  const relinked: string[] = [];
  for (const id of Array.from(new Set(memoryIds))) {
    try {
      await ctx.database.write(async (writer) => {
        let record: VaultMemory;
        try {
          record = await ctx.vaultMemoryCollection.find(id);
        } catch {
          return;
        }
        if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return;
        const topics = parseTopics(record.topics);
        if (topics === null) return;
        await writer.callWriter(() => relinkMemoryEntitiesFromTopicsOp(entityCtx, id, topics));
        relinked.push(id);
      });
    } catch (err) {
      getLogger().warn("[memory/topics] relink failed", err);
    }
  }
  return relinked;
}

/**
 * Fill `topics` for the sweep's `topicsBackfill` rows from the links they
 * already carry — the one-time migration of pre-v42 rows, whose topics exist
 * only in the device-local index and so never reach the server. No LLM call.
 *
 * Bumps `topics_updated_at` (that's the point — it's what makes the row
 * upload) while pinning `updated_at`, like every other topic writer. Callers
 * must pass a `limit`-bounded list: each row's upload carries its embedding, so
 * an unbounded pass re-uploads the entire vault at once.
 *
 * `source` is derived from `topics_user_managed`, the only provenance a legacy
 * row has: a curated memory's topics are recorded as `user`, everything else as
 * `auto`. Skips deleted, foreign-user, unlinked rows, and rows that already have
 * a record. Returns the ids filled.
 *
 * Runs as ONE writer over the whole (caller-bounded) list, in two phases:
 * resolve every row's write — all the awaits — and only then prepare and batch,
 * synchronously. Resolving and preparing per row inside its own writer is what
 * fired WatermelonDB's "wasn't sent to batch() synchronously" diagnostic once
 * per memory (~107 on a single dev launch, sdk#891); it also cost N writes.
 * Same treatment as {@link stampTopicsExtractedAtOp}, including its
 * transpilation hazard — the prepare pass MUST stay a `.map()`.
 *
 * @deprecated App code: use `MemoryStore.maintenance.backfillTopics` (`createLocalMemoryStore`).
 */
export async function backfillMemoryTopicsOp(
  ctx: VaultMemoryOperationsContext,
  memoryIds: readonly string[]
): Promise<string[]> {
  const entityCtx = ctx.entityCtx;
  if (!entityCtx) {
    throw new Error("backfillMemoryTopicsOp requires ctx.entityCtx");
  }
  const uniqueIds = Array.from(new Set(memoryIds));
  if (uniqueIds.length === 0) return [];

  const filled: string[] = [];
  const CHUNK = 500;
  for (let i = 0; i < uniqueIds.length; i += CHUNK) {
    const chunkIds = uniqueIds.slice(i, i + CHUNK);
    await ctx.database.write(async () => {
      const writes: MemoryTopicsWrite[] = [];
      for (const id of chunkIds) {
        let record: VaultMemory;
        try {
          record = await ctx.vaultMemoryCollection.find(id);
        } catch {
          continue;
        }
        if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) continue;
        if (parseTopics(record.topics) !== null) continue;
        const links = await entityCtx.memoryEntityCollection
          .query(Q.where("memory_id", id))
          .unsafeFetchRaw();
        const entityIds = (links as Record<string, unknown>[]).map((l) => String(l.entity_id));
        if (entityIds.length === 0) continue;
        const entities = await entityCtx.entityCollection
          .query(Q.where("id", Q.oneOf(entityIds)))
          .fetch();
        if (entities.length === 0) continue;
        const source = record.topicsUserManaged ? "user" : "auto";
        const write = await resolveMemoryTopicsWrite(entityCtx, id, entities, [], source);
        if (write) writes.push(write);
      }
      if (writes.length === 0) return;

      const prepared = writes.map(prepareMemoryTopicsUpdate);
      await ctx.database.batch(...prepared);
      for (const write of writes) filled.push(write.row.id);
    });
  }
  return filled;
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

/**
 * The minimal plaintext shape the decay sweep needs — mirrors the `DecayInput`
 * shape in `memory/decay` plus the row id. Deliberately omits `content`
 * (encrypted) so the sweep stays zero-knowledge.
 */
export interface DecayCandidateRaw {
  uniqueId: string;
  factType: string | null;
  eventTimeEnd: number | null;
  eventTimeKind: string | null;
  /** Unix ms — the raw `updated_at`, used both for the age rule and as the
   * optimistic-concurrency guard passed back to {@link archiveVaultMemoryOp}. */
  updatedAt: number;
  lastObservedAt?: number | null;
  archivedAt: number | null;
  source: string | null;
  /** `trusted` | `quarantined` | null. Quarantined rows still decay by RULE, but
   * are never handed to the optional content-reading decay classifier (they must
   * not egress poison content — see the decay sweeper's `isBorderline`). */
  trustTier: string | null;
}

/**
 * Guard against a decay sweep amplifying across tenants. A sweep with no
 * `userId` reaches EVERY row the query can see (`baseVaultConditions` scopes by
 * `user_id` ONLY — there is no `wallet_address` column), so an unscoped sweep on
 * a shared DB would scan/archive/hard-delete every tenant's rows.
 *
 * Enforced contract — a context is accepted ONLY when it is one of:
 *  - MULTI-TENANT / server: `userId` is set. The query is then row-scoped to
 *    that user, so the sweep can't reach other tenants.
 *  - SINGLE-TENANT / per-wallet client DB: `singleTenant === true`. The DB
 *    physically holds one owner's rows (written with `user_id = null`), so the
 *    unscoped scan is safe BY the DB's isolation, and the caller says so
 *    explicitly.
 *
 * `walletAddress` is NO LONGER accepted as a scope proxy. Previously a bare
 * `walletAddress` passed this guard yet ran an UNSCOPED sweep — safe only if the
 * DB happened to be per-wallet, an unstated assumption. It is now rejected: a
 * per-wallet client MUST set `singleTenant: true` to make that isolation an
 * explicit, honest assertion rather than an inferred one. This closes the latent
 * multi-tenant risk (a future walletAddress-only context on a SHARED DB would
 * otherwise have swept across all tenants).
 *
 * NOTE (SDK consumers): the SDK's own client `vaultCtx` (built in
 * `useChatStorage`) now sets `singleTenant: true`. A client that constructs its
 * OWN `vaultCtx` for the sweeper must likewise pass `singleTenant: true` (it is
 * a per-wallet isolated DB) — otherwise this guard will throw after upgrading.
 */
export function assertVaultScopeForSweep(ctx: VaultMemoryOperationsContext): void {
  if (ctx.userId === undefined && ctx.singleTenant !== true) {
    throw new Error(
      "Refusing to run a decay sweep on an unscoped vault context: it has no userId " +
        "and is not marked singleTenant, so it would sweep across all tenants. Set " +
        "ctx.userId on server/multi-tenant contexts, or ctx.singleTenant = true on a " +
        "per-wallet, physically single-tenant client DB. (walletAddress alone is no " +
        "longer accepted — it does not scope the sweep query.)"
    );
  }
}

/**
 * Decay sweep candidate scan (PR2). Selects the plaintext columns
 * `classifyDecay` (in `memory/decay`) needs via
 * `unsafeFetchRaw` — NO Model per row (dodges the never-evicted RecordCache /
 * web Pile-2 OOM history) and NO `content` read / decrypt (zero-knowledge).
 *
 * Includes archived AND quarantined rows (so archived→delete transitions and
 * aged quarantined rows are seen) but excludes hard-deleted rows — the
 * `baseVaultConditions` default keeps `is_deleted = false`.
 *
 * Refuses to run on an unscoped multi-tenant context (see
 * {@link assertVaultScopeForSweep}).
 */
export async function getDecayCandidatesRawOp(
  ctx: VaultMemoryOperationsContext
): Promise<DecayCandidateRaw[]> {
  assertVaultScopeForSweep(ctx);
  const results = (await ctx.vaultMemoryCollection
    .query(...baseVaultConditions(ctx, { includeArchived: true, includeQuarantined: true }))
    .unsafeFetchRaw()) as Record<string, unknown>[];
  return results.map((raw) => ({
    uniqueId: raw.id as string,
    factType: (raw.fact_type as string | null) ?? null,
    eventTimeEnd: (raw.event_time_end as number | null) ?? null,
    eventTimeKind: (raw.event_time_kind as string | null) ?? null,
    updatedAt: raw.updated_at as number,
    lastObservedAt: (raw.last_observed_at as number | null) ?? null,
    archivedAt: (raw.archived_at as number | null) ?? null,
    source: (raw.source as string | null) ?? null,
    trustTier: (raw.trust_tier as string | null) ?? null,
  }));
}

/**
 * Archive a memory (decay soft state, PR2) — set `archived_at`. An archived row
 * drops out of every recall lane via the `baseVaultConditions` choke point but
 * stays recoverable via {@link restoreVaultMemoryOp} until the hard-delete
 * window elapses.
 *
 * Concurrency: re-checks `is_deleted` / ownership / `archived_at` INSIDE the
 * serialized writer (mirrors {@link updateVaultMemoryOp}). Additionally, when
 * `opts.expectedUpdatedAt` is given, the archive is skipped if the row's current
 * `updated_at` no longer matches — i.e. a `retain()` merge (which bumps
 * `updated_at`) landed between the sweep's candidate scan and this write, so the
 * fact was just re-observed and must NOT be archived on stale data. Idempotent:
 * a row another sweep already archived returns `false` (no double-write).
 *
 * @returns `true` if this call archived the row; `false` if it was stale
 *   (deleted / not owned / already archived / refreshed under us).
 *
 * @deprecated App code: use `MemoryStore.archive` (`createLocalMemoryStore`).
 */
export async function archiveVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  opts?: {
    /** Timestamp to stamp into `archived_at`. Default `Date.now()`. */
    now?: number;
    /** Optimistic-concurrency guard: skip if the row's `updated_at` changed
     * since the sweep observed it (a concurrent re-observation). */
    expectedUpdatedAt?: number;
    /** Also guard re-observations, which deliberately preserve updated_at. */
    expectedLastObservedAt?: number | null;
  }
): Promise<boolean> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;

    let stale = false;
    const archivedAtValue = opts?.now ?? Date.now();
    await ctx.database.write(async () => {
      if (record.isDeleted || !isOwnedByCtxUser(ctx, record) || record.archivedAt !== null) {
        stale = true;
        return;
      }
      if (
        (opts?.expectedUpdatedAt !== undefined &&
          record.updatedAt.getTime() !== opts.expectedUpdatedAt) ||
        (opts?.expectedLastObservedAt !== undefined &&
          (record.lastObservedAt ?? null) !== opts.expectedLastObservedAt)
      ) {
        stale = true;
        return;
      }
      await record.update((r) => {
        r._setRaw("archived_at", archivedAtValue);
      });
    });
    return !stale;
  } catch {
    return false;
  }
}

/**
 * Restore an archived memory (PR2) — clear `archived_at` so it re-enters recall.
 * Re-checks `is_deleted` / ownership inside the writer. Idempotent on an
 * already-active row (clearing null → null is harmless).
 *
 * @returns `true` if the row was restored (or already active); `false` if it was
 *   deleted / not owned / missing.
 *
 * @deprecated App code: use `MemoryStore.restore` (`createLocalMemoryStore`).
 */
export async function restoreVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string
): Promise<boolean> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;

    let stale = false;
    await ctx.database.write(async () => {
      if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) {
        stale = true;
        return;
      }
      await record.update((r) => {
        r._setRaw("archived_at", null);
      });
    });
    return !stale;
  } catch {
    return false;
  }
}

/**
 * Hard-delete a memory ONLY if it is still archived and still past the delete
 * window (PR2 decay terminal transition). Unlike the generic
 * {@link deleteVaultMemoryOp}, this re-reads `archived_at` INSIDE the writer and
 * bails if the row was restored (`archived_at → null`) or re-archived more
 * recently since the sweep's candidate scan. This is the restore-vs-delete
 * mutual-exclusion guard: a user hitting Restore between the scan and this write
 * must win, so their just-rescued memory is never permanently lost.
 *
 * @returns `true` if this call hard-deleted the row; `false` if it was stale
 *   (deleted / not owned / no longer archived / no longer past the window).
 */
export async function hardDeleteDecayedOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  opts: { hardDeleteWindowMs: number; now?: number }
): Promise<boolean> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;

    const now = opts.now ?? Date.now();
    let stale = false;
    await ctx.database.write(async () => {
      const archivedAt = record.archivedAt;
      if (
        record.isDeleted ||
        !isOwnedByCtxUser(ctx, record) ||
        archivedAt === null ||
        now - archivedAt <= opts.hardDeleteWindowMs
      ) {
        stale = true;
        return;
      }
      await record.update((r) => {
        r._setRaw("is_deleted", true);
      });
    });
    if (stale) return false;

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
 * What a re-embed was computed from. A search embeds a row it READ earlier, so
 * by the time the vector lands the row may have been edited (the tool clears
 * the embedding on an edit, a consolidation rewrites content under
 * preserveUpdatedAt); writing then would pin a vector for text that is gone.
 */
export interface VaultEmbeddingExpectation {
  /** Plaintext content the vector was computed from. */
  content?: string;
  /** `updatedAt` (ms) of the row as it was read. */
  updatedAt?: number;
}

export async function updateVaultMemoryEmbeddingOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  embedding: string,
  embeddingModel: string,
  /** When given, the write lands only if the row still matches it. */
  expected?: VaultEmbeddingExpectation
): Promise<boolean> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;
    const readUpdatedAt = record.updatedAt.getTime();
    const readStoredContent = record._getRaw("content");
    if (expected?.updatedAt !== undefined && expected.updatedAt !== readUpdatedAt) return false;
    if (expected?.content !== undefined) {
      const current = await vaultMemoryToStored(
        record,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      if (current.content !== expected.content) return false;
    }
    let written = false;
    await ctx.database.write(async () => {
      if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return;
      const originalUpdatedAt = record.updatedAt.getTime();
      if (originalUpdatedAt !== readUpdatedAt || record._getRaw("content") !== readStoredContent)
        return;
      await record.update((r) => {
        r._setRaw("embedding", embedding);
        r._setRaw("embedding_model", embeddingModel);
        r._setRaw("updated_at", originalUpdatedAt);
      });
      written = true;
    });
    return written;
  } catch {
    return false;
  }
}

function normalizeForDedupe(content: string): string {
  return content.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Find a live quarantined row in the same scope and folder with the same
 * source ids and (normalised) content. Scope and folder are part of the match
 * because the audit row is written into them: after a mode or folder change
 * the same sources must get their own row there. Quarantined candidates are force-created with auto-merge off, so a
 * retried extraction batch re-created the same audit row on every retry; the
 * caller checks this first and reuses the existing row instead.
 *
 * Only quarantined rows are read (few by construction) and only the ones whose
 * source ids match are decrypted.
 */
export async function findQuarantinedDuplicateOp(
  ctx: VaultMemoryOperationsContext,
  content: string,
  sourceIds: readonly string[],
  where: { scope: string; folderId: string | null }
): Promise<string | null> {
  const wanted = [...new Set(sourceIds)].sort().join("\u0000");
  const target = normalizeForDedupe(content);
  const rows = (await ctx.vaultMemoryCollection
    .query(
      Q.where("trust_tier", "quarantined"),
      Q.where("is_deleted", false),
      Q.where("scope", where.scope),
      Q.where("folder_id", where.folderId),
      ...(ctx.userId !== undefined ? [Q.where("user_id", ctx.userId)] : [])
    )
    .unsafeFetchRaw()) as Record<string, unknown>[];
  for (const raw of rows) {
    let ids: unknown;
    try {
      ids = JSON.parse((raw.source_chunk_ids as string | null) ?? "[]");
    } catch {
      continue;
    }
    if (!Array.isArray(ids)) continue;
    const key = [...new Set(ids.filter((id): id is string => typeof id === "string"))]
      .sort()
      .join("\u0000");
    if (key !== wanted) continue;
    const stored = await vaultMemoryRawToStored(
      raw,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
    if (normalizeForDedupe(stored.content) === target) return stored.uniqueId;
  }
  return null;
}
