import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import { getLogger } from "../../logger";
import type { EmbeddedWalletSignerFn, SignMessageFn } from "../encryption-utils";
import {
  type EntityInput,
  type EntityOperationsContext,
  linkMemoryEntitiesOp,
  prepareMemoryTopicsUpdate,
  relinkMemoryEntitiesFromTopicsOp,
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

/** Coerce a stored visibility column to the enum — null/unknown reads as
 * "private" (grandfathered legacy rows; nothing is published without opt-in).
 * "Unknown" deliberately includes the retired "matchable" tier and any value a
 * FUTURE schema might add: coercing toward private fails safe, since the wrong
 * answer un-publishes a memory rather than exposing one. */
function visibilityOrPrivate(value: unknown): VaultMemoryVisibility {
  return value === "public" ? value : "private";
}

const NON_PRIVATE_VISIBILITIES: VaultMemoryVisibility[] = ["public"];

/**
 * WHERE conditions for a visibility filter, mirroring {@link visibilityOrPrivate}:
 * a filter that includes 'private' matches NULL rows (grandfathered legacy) AND
 * any value outside the enum (a future schema's value must read as private
 * here, exactly as the coercion presents it). Non-private filters match their
 * literal values only.
 */
function visibilityConditions(requested?: VaultMemoryVisibility[]) {
  if (!requested?.length) return [];
  if (!requested.includes("private")) {
    return [Q.where("visibility", Q.oneOf([...requested]))];
  }
  // 'private' requested: match NULL plus everything NOT IN the non-private
  // values that were excluded from the request. (If nothing is excluded, the
  // filter is a no-op — every row matches.)
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

/** Returns true if the record belongs to the context user (or if no user scoping is active). */
function isOwnedByCtxUser(ctx: VaultMemoryOperationsContext, record: VaultMemory): boolean {
  return ctx.userId === undefined || record.userId === ctx.userId;
}

/** Builds the base WHERE conditions shared by all vault memory queries. This is
 * the single choke point every read lane (cosine/BM25/temporal/graph) inherits,
 * so the archived + quarantined + superseded exclusions applied here cover all
 * of recall at once. Default hides every non-visible state (deleted, archived,
 * quarantined, superseded); each has its own opt-in include flag.
 * - `includeDeleted` drops the soft-delete filter — only `getAllVaultMemoriesOp`
 *   opts into it (to surface "forgotten" memories); every other caller omits it
 *   and keeps the default non-deleted-only behavior.
 * - `includeArchived` (PR1) drops the archived-row filter. Default excludes rows
 *   with a non-null `archived_at` (decayed memories, PR2).
 * - `includeQuarantined` (PR1) drops the quarantine filter. Default excludes
 *   rows with `trust_tier === "quarantined"` (injection-screened memories, PR3).
 *   For this string value `Q.notEq` compiles to `is not` (SQLite) and, via the
 *   LokiJS string fast-path, to `{ trust_tier: { $ne: "quarantined" } }` — both
 *   KEEP null rows, so untyped/legacy rows are never excluded. (A non-string
 *   value would take LokiJS's `$not:$aeq` path instead; keep this comparison
 *   string-valued.)
 * - `includeSuperseded` (A2, main) drops the supersession filter. Default
 *   excludes rows with a non-null `superseded_by` (retired by a newer,
 *   incompatible-value fact) from recall + dedup; a "memory history" view can
 *   opt in. */
function baseVaultConditions(
  ctx: VaultMemoryOperationsContext,
  options?: {
    since?: Date;
    includeDeleted?: boolean;
    includeArchived?: boolean;
    includeQuarantined?: boolean;
    includeSuperseded?: boolean;
  }
) {
  return [
    ...(options?.includeDeleted ? [] : [Q.where("is_deleted", false)]),
    ...(options?.includeArchived ? [] : [Q.where("archived_at", Q.eq(null))]),
    ...(options?.includeQuarantined ? [] : [Q.where("trust_tier", Q.notEq("quarantined"))]),
    ...(options?.includeSuperseded ? [] : [Q.where("superseded_by", null)]),
    ...(ctx.userId !== undefined ? [Q.where("user_id", ctx.userId)] : []),
    ...(options?.since ? [Q.where("updated_at", Q.gt(options.since.getTime()))] : []),
  ];
}

/**
 * Tier-0 security (PR3) — the allowed `trust_tier` values.
 *
 * `trust_tier` is a loose plaintext string column, so a future direct
 * caller (not the injection screen) could pass an arbitrary value straight
 * into `_setRaw`. Constrain every write to this known set here — the single
 * place all writes funnel through — so the recall quarantine gate (which
 * keys off the exact string `"quarantined"`) can't be bypassed by a typo'd
 * or hostile tier, and so no unexpected value ever reaches the DB.
 */
const KNOWN_TRUST_TIERS = new Set(["quarantined", "trusted"]);

/**
 * Coerce a caller-supplied trust tier to the known set. `null`/`undefined`
 * and any unrecognized value collapse to `null` (untyped/trusted default).
 *
 * Coerce (not throw) so a bad value degrades to the SAFE direction: `null`
 * = visible, i.e. the pre-PR3 behavior for that row. This never HIDES a
 * fact the caller didn't explicitly quarantine (fail-open on visibility is
 * correct here — the screen sets the exact `"quarantined"` constant, which
 * is in the set and survives), and it never lets garbage forge a state.
 */
function normalizeTrustTier(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return KNOWN_TRUST_TIERS.has(value) ? value : null;
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
      // Typed memory (PR1) — persist the classification when provided; leave
      // null otherwise (legacy/manual/untyped). archived_at is never set on
      // create — a fresh memory is always active.
      if (opts.factType !== undefined) {
        record._setRaw("fact_type", opts.factType);
      }
      if (opts.trustTier !== undefined) {
        // Tier-0 (PR3): re-validate the loose string against the known set.
        record._setRaw("trust_tier", normalizeTrustTier(opts.trustTier));
      }
      record._setRaw("visibility", opts.visibility ?? "private");
      // Invariant: published_at is non-null iff visibility is non-private.
      // A non-private restore/import without a stamp gets one now.
      record._setRaw(
        "published_at",
        opts.visibility && opts.visibility !== "private" ? (opts.publishedAt ?? Date.now()) : null
      );
      if (opts.geohash !== undefined) {
        record._setRaw("geohash", opts.geohash);
      }
    });
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

  let createdRecord: VaultMemory | null = null;
  await ctx.database.write(async () => {
    let target: VaultMemory;
    try {
      target = await ctx.vaultMemoryCollection.find(targetId);
    } catch {
      return; // target gone → don't create; caller does a plain create
    }
    // Concurrent win / delete / cross-user → don't orphan a successor.
    if (target.isDeleted || target.supersededBy || !isOwnedByCtxUser(ctx, target)) return;

    createdRecord = await ctx.vaultMemoryCollection.create((record) => {
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
        // Typed memory (PR1) — see createVaultMemoryOp.
        if (opts.factType !== undefined) {
          record._setRaw("fact_type", opts.factType);
        }
        if (opts.trustTier !== undefined) {
          // Tier-0 (PR3): re-validate the loose string against the known set.
          record._setRaw("trust_tier", normalizeTrustTier(opts.trustTier));
        }
        record._setRaw("visibility", opts.visibility ?? "private");
        // Invariant: published_at is non-null iff visibility is non-private
        // (see createVaultMemoryOp).
        record._setRaw(
          "published_at",
          opts.visibility && opts.visibility !== "private" ? (opts.publishedAt ?? Date.now()) : null
        );
        if (opts.geohash !== undefined) {
          record._setRaw("geohash", opts.geohash);
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
    // SQLite stores booleans as 0/1, LokiJS as true/false — coerce both.
    topicsUserManaged: raw.topics_user_managed === true || raw.topics_user_managed === 1,
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
     * Restrict to these ids — the caller's own candidate set, applied at LOAD
     * time so ranking and top-K happen INSIDE it.
     *
     * Exists for topic-scoped recall: topic membership lives in the
     * `memory_entity` join, which this table can't be filtered on, so the
     * caller resolves the ids and hands them down. Post-filtering a ranked
     * result instead is not equivalent — top-K would be chosen across the whole
     * vault first, and a narrow scope would come back empty whenever its
     * memories didn't independently win on relevance.
     *
     * An EMPTY array is a real value meaning "nothing is eligible" and returns
     * no rows; omit the option for no filter.
     */
    memoryIds?: readonly string[];
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
    ...(options?.memoryIds !== undefined ? [Q.where("id", Q.oneOf([...options.memoryIds]))] : []),
    ...(options?.factTypes?.length ? [Q.where("fact_type", Q.oneOf(options.factTypes))] : []),
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

/**
 * Map a raw `memory_vault` row (snake_case `_raw`) to the content-free
 * {@link RankableVaultMemory} projection. No decrypt, no `content` — see the
 * type doc for why ciphertext must never ride along as plaintext content.
 */
function vaultMemoryRawToRankable(raw: Record<string, unknown>): RankableVaultMemory {
  return {
    uniqueId: raw.id as string,
    // @text coerces NULL→"" on the Model path; unsafeFetchRaw returns raw NULL, so guard.
    scope: (raw.scope as string) ?? "",
    folderId: (raw.folder_id as string | null) ?? null,
    embedding: (raw.embedding as string | null) ?? null,
    embeddingModel: (raw.embedding_model as string | null) ?? null,
    createdAt: new Date(raw.created_at as number),
    updatedAt: new Date(raw.updated_at as number),
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
  options?: { scopes?: string[]; since?: Date; limit?: number; folderId?: string | null }
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
  // unsafeFetchRaw (NOT fetch): mirror getAllVaultMemoriesOp — a whole-vault scan must not pin a
  // Model per row into the never-evicted RecordCache (web Pile-2). No decrypt: content stays sealed.
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

/**
 * SQL WHERE fragment mirroring baseVaultConditions (is_deleted, archived_at,
 * trust_tier, superseded_by, user_id) for the projected-read path. Kept
 * adjacent to baseVaultConditions — they MUST stay in lockstep.
 *
 * `trust_tier` uses SQLite's null-safe `IS NOT 'quarantined'` (not `!=`) so
 * legacy NULL-tier rows SURVIVE the filter, exactly like WatermelonDB's
 * null-inclusive `Q.notEq("quarantined")` on the Loki fallback path. Both
 * "quarantined" and the archived-at sentinel are hardcoded constants, so they
 * are inlined as SQL literals (no bound args) to keep the projection paths'
 * bound-arg lists identical to the pre-decay behavior.
 */
function baseVaultSql(
  ctx: VaultMemoryOperationsContext,
  options?: { includeArchived?: boolean }
): {
  sql: string;
  args: Array<string | number | boolean | null>;
} {
  const clauses = [
    '"is_deleted" = 0',
    // Mirrors `baseVaultConditions`' `includeArchived` branch. Defaults to
    // excluding archived rows, so every existing caller is unchanged.
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
     * Restrict to these ids. See {@link getAllVaultMemoriesOp} — the two paths
     * must admit the same candidate set for the same query, so this filter has
     * to exist on both or topic-scoped recall becomes path-dependent the way
     * `factTypes` once was (#779).
     */
    memoryIds?: readonly string[];
    /**
     * Typed memory (PR1) — restrict to these fact types. Omit for no filter.
     * MUST stay in step with `getAllVaultMemoriesOp`: this op backs the
     * decrypt-last search path, and the two paths are meant to return the same
     * candidate set for the same query. Dropping it here made typed recall
     * silently path-dependent (#779).
     */
    factTypes?: string[];
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

  // OPFS-SQLite: projected SELECT (skips content/embedding blobs).
  try {
    const base = baseVaultSql(ctx, {
      ...(options?.includeArchived !== undefined && { includeArchived: options.includeArchived }),
    });
    const clauses = [base.sql];
    const args = [...base.args];
    if (options?.scopes?.length) {
      clauses.push(`"scope" in (${options.scopes.map(() => "?").join(",")})`);
      args.push(...options.scopes);
    }
    if (options?.folderId !== undefined) {
      clauses.push(options.folderId === null ? '"folder_id" is null' : '"folder_id" = ?');
      if (options.folderId !== null) args.push(options.folderId);
    }
    if (options?.memoryIds !== undefined) {
      // An empty allow-list must match nothing, and `in ()` is a syntax error.
      if (options.memoryIds.length === 0) return [];
      clauses.push(`"id" in (${options.memoryIds.map(() => "?").join(",")})`);
      args.push(...options.memoryIds);
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
    // LokiJS fallback (Q.unsafeSqlQuery unsupported): standard Q query, full raw
    // rows (blobs resident, no extra I/O), projected in-memory. Logged so a
    // production regression (SQLite path failing → full-blob loads) is visible
    // rather than a silent perf cliff.
    getLogger().debug(
      "memoryVault: getVaultCandidateKeysOp projected SQL unavailable, using full-load fallback: " +
        (err instanceof Error ? err.message : String(err))
    );
    const conditions = [
      ...baseVaultConditions(ctx, {
        ...(options?.includeArchived !== undefined && { includeArchived: options.includeArchived }),
      }),
      ...(options?.scopes?.length ? [Q.where("scope", Q.oneOf(options.scopes))] : []),
      ...(options?.folderId !== undefined ? [Q.where("folder_id", options.folderId)] : []),
      ...(options?.memoryIds !== undefined ? [Q.where("id", Q.oneOf([...options.memoryIds]))] : []),
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
    // LokiJS fallback (see getVaultCandidateKeysOp) — logged so a silent
    // degrade to full-blob loads is observable.
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
      // Re-check inside the serialized writer: a delete that committed
      // after the probe must win — updating a soft-deleted row would
      // silently resurrect content on an invisible record.
      if (record.isDeleted || record.supersededBy || !isOwnedByCtxUser(ctx, record)) {
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
        if (opts.topicsUserManaged !== undefined) {
          r._setRaw("topics_user_managed", opts.topicsUserManaged);
        }
        if (opts.lastObservedAt !== undefined) {
          // C3 re-observation watermark. Set independently of updated_at so a
          // merge records "seen again now" while preserveUpdatedAt keeps the
          // edit-time recency signal pinned.
          r._setRaw("last_observed_at", opts.lastObservedAt);
        }
        // Typed memory (PR1) — retain()'s lazy backfill sets this only when the
        // existing row had no type (it decides that upstream), so a plain
        // presence check is enough here.
        if (opts.factType !== undefined) {
          r._setRaw("fact_type", opts.factType);
        }
        if (opts.trustTier !== undefined) {
          // Tier-0 (PR3): re-validate the loose string against the known set.
          r._setRaw("trust_tier", normalizeTrustTier(opts.trustTier));
        }
        // PR5 — un-archive on re-observe: clear archived_at so a decayed row a
        // new observation merged into re-enters recall. Ordering note: this runs
        // BEFORE the preserveUpdatedAt restore below, but retain() sets restore
        // WITHOUT preserveUpdatedAt (so updated_at bumps and the decay clock
        // resets) — the two are not combined.
        if (opts.restore) {
          r._setRaw("archived_at", null);
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

/**
 * Replace a memory's topic (entity) links with a user-chosen set and mark the
 * memory `topics_user_managed` so auto-extraction stops touching its links.
 * Replace semantics: the given `entities` become the memory's complete topic
 * set (pass `[]` to clear all topics — the memory stays user-managed and
 * unclustered). Requires `ctx.entityCtx`. Preserves `updated_at` so a topic
 * edit doesn't inflate the recency multiplier — `topics_updated_at` is what
 * carries the edit to the user's other devices.
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

  // Flag, links, stale-link prune and the `topics` record all land in ONE
  // writer. Committing the flag on its own published a window where the row read
  // as user-managed with neither a record nor a link — the exact shape
  // getMemoriesNeedingTopicExtractionOp treats as pre-v42 restore damage — so a
  // repair sweep landing between the two writes cleared the flag, invalidated
  // the extraction version and handed the user's topics to the autotagger. One
  // writer makes that intermediate state unreachable by any other writer.
  //
  // The soft-delete / ownership re-check stays INSIDE the writer: a delete that
  // committed after the probe above must win (mirrors updateVaultMemoryOp), so
  // links never attach to a deleted memory.
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

    // Add the new links first (idempotent), THEN drop only the stale ones. This
    // ordering means a transient failure can leave at most EXTRA topics
    // (old ∪ new) — never zero — so a topic edit can't wipe a memory's topics
    // (the delete-all-then-relink order could, on a mid-op failure). The link op
    // writes `topics` from old ∪ new for the same reason; the prune below then
    // narrows the record to the user's set, in the same batch as the link
    // deletes. `callWriter` runs the link op as part of this writer rather than
    // deadlocking on its own `database.write`.
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
    // Clearing all topics skips the link op entirely, so `topics` still needs its
    // explicit `[]` — the record of "the user removed every topic", which is not
    // the same as the null column that means "no record yet" (see parseTopics).
    if (staleLinks.length === 0 && entities.length > 0) return;
    const topicsOp = await prepareMemoryTopicsUpdate(entityCtx, memoryId, linked, entities, "user");
    await ctx.database.batch(
      ...staleLinks.map((l) => l.prepareDestroyPermanently()),
      ...(topicsOp ? [topicsOp] : [])
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
      // Stale version + a non-null stamp routes the row through the pending path
      // (LLM re-extraction). A row user-curated before any LLM pass has a null
      // stamp — force one so it doesn't fall through to grandfathering.
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
    // Re-check inside the serialized writer (see updateVaultMemoryOp): a
    // delete that committed after the probe must win.
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) {
      stale = true;
      return;
    }
    // Read BOTH timestamps inside the serialized writer, not at probe time. A
    // revoke that committed in between would leave a stale non-null
    // published_at snapshot here, so the publish branch would skip the stamp
    // and commit `visibility: public` with a NULL published_at — precisely the
    // invariant this op exists to hold, and one the reconciler reads as "must
    // not exist in the server index".
    const currentUpdatedAt = record.updatedAt.getTime();
    const currentPublishedAt = record.publishedAt ?? null;
    await record.update((r) => {
      r._setRaw("visibility", opts.visibility);
      if (opts.visibility === "private") {
        // Revoke: clear the publish stamp — the reconciler treats a private
        // memory with no published_at as "must not exist in the server index".
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
 * Mark a memory as superseded by a newer one (A2 write-time supersession).
 * The row stays in the table (history + read-time fallback) but is excluded
 * from recall/dedup by default via `superseded_by`. Idempotent-ish: no-op if
 * the row is missing, not owned, deleted, or already superseded. Does NOT
 * preserve `updated_at` — superseded rows are hidden from recall, so their
 * recency is irrelevant.
 *
 * @param id - the memory being retired (e.g. "Lives in Portland")
 * @param supersededById - the newer memory that replaced it (e.g. "Lives in SF")
 */
export async function supersedeVaultMemoryOp(
  ctx: VaultMemoryOperationsContext,
  id: string,
  supersededById: string
): Promise<boolean> {
  // A memory can't supersede itself.
  if (id === supersededById) return false;
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || record.supersededBy || !isOwnedByCtxUser(ctx, record)) return false;

    // Validate the successor before pointing at it: it must exist, be live (not
    // deleted, not itself superseded), and belong to the same user — otherwise
    // we'd hide `record` behind a dangling or cross-user pointer that history
    // consumers can't resolve.
    let successor;
    try {
      successor = await ctx.vaultMemoryCollection.find(supersededById);
    } catch {
      return false; // successor id doesn't exist
    }
    if (successor.isDeleted || successor.supersededBy || !isOwnedByCtxUser(ctx, successor)) {
      return false;
    }

    let stale = false;
    await ctx.database.write(async () => {
      // Re-check BOTH rows inside the serialized writer. The live models
      // reflect the latest committed state, so a concurrent delete/supersede of
      // the target OR the successor between the validation above and this write
      // is caught here — otherwise we'd stamp a pointer to a now-dead successor
      // (the TOCTOU this guard closes).
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

/** memoryId → the canonical names its `memory_entity` rows currently point at.
 * A memory with no USABLE links is absent from the map — no link rows at all, or
 * only rows pointing at `entity` rows that no longer exist. Never mapped to an
 * empty set: callers read presence as "has links", so a memory whose whole link
 * set failed to resolve has to read as unlinked or it gets grandfather-stamped
 * with zero topics (and offered for a backfill that can find nothing to write). */
async function linkedEntityNamesByMemory(
  entityCtx: EntityOperationsContext,
  memoryIds: readonly string[]
): Promise<Map<string, Set<string>>> {
  // Chunk both id lists — SQLite caps bound variables (999), and huge Q.oneOf
  // arrays hurt LokiJS too. unsafeFetchRaw (NOT fetch) throughout: the first
  // post-migration sweep over a legacy vault can touch thousands of link rows,
  // and .fetch() would pin a Model per row into the never-evicted RecordCache
  // (web Pile-2).
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

/** True when a memory's link set doesn't match the names in its `topics`
 * record — i.e. the device-local index needs rebuilding from the record. */
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
  // unsafeFetchRaw (NOT fetch): whole-vault sweep must not pin a Model per row
  // into the never-evicted RecordCache (web Pile-2) — see getAllVaultMemoriesOp.
  const rows = (await ctx.vaultMemoryCollection.query(...conditions).unsafeFetchRaw()) as Record<
    string,
    unknown
  >[];

  // Links are needed for every row now, not just unstamped ones: a restored row
  // arrives WITH a `topics_extracted_at` stamp, so the relink check has to see
  // stamped rows too or the restored-device case is never detected.
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

    // A non-empty record the index doesn't match: rebuild the index, and route
    // the row NOWHERE else. It needs neither the LLM nor a vault write, and a
    // restored row that `linkMemoryEntitiesOp` wrote topics for without stamping
    // (the auto path doesn't stamp) would otherwise ALSO read as never-extracted
    // with no links and get sent to the LLM — paying for extraction of topics we
    // already have. The rebuild makes links match, so the next sweep classifies
    // the row normally.
    if (
      topics !== null &&
      topics.length > 0 &&
      linksDivergeFromTopics(topics, linked ?? new Set())
    ) {
      topicsToRelinkAll.push(id);
      continue;
    }

    // Truthiness (not `=== true`) so an unsanitized SQLite `1` can't fail open.
    if (raw.topics_user_managed) {
      if (topics !== null || linked !== undefined) {
        // The user owns these topics — never re-derive them. Still a backfill
        // candidate: a curated row predating v42 has links but no record, and
        // without one its topics don't survive a device migration.
        if (topics === null) topicsBackfillAll.push(id);
        continue;
      }
      // Nothing to own: no `topics` record AND no usable link. That's what a
      // pre-v42 restore leaves behind — the flag synced, the device-local index
      // can't, and there was no record to rebuild it from — so relink has
      // nothing to read and backfill nothing to derive, and the flag keeps the
      // row out of entity-graph recall permanently. The curation is provably
      // empty, so drop the flag (after the loop) and classify the row like any
      // auto one.
      //
      // `topics: []` is deliberately NOT this shape: parseTopics reads it as
      // "recorded as topicless", a choice the user made, and re-extracting would
      // overwrite it.
      //
      // Capped like every bucket below: the clear loads a Model per row.
      if (cap !== undefined && emptyCurationToClear.length >= cap) continue;
      emptyCurationToClear.push(id);
    }

    // Stamped rows re-extract when edited since the last pass OR when they were
    // extracted under an older logic version (pre-v38 rows read as version 0, so
    // a TOPICS_EXTRACTION_VERSION bump re-processes them). Unstamped rows split
    // on whether they already have links (grandfather) or not (LLM pass).
    //
    // Both reads are DEPRECATED (v42): `topics_updated_at` subsumes them — null
    // there means never processed, non-null with an empty `topics` means
    // processed and found nothing, and a release-time EXTRACTOR_CHANGED_AT
    // constant compared against it replaces the version gate. The columns are
    // kept only to avoid a column-drop migration in an otherwise additive list;
    // cutting this branch over is a follow-up once `topics` is proven in prod.
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

    // Pre-v42-restore repair: a stamped row the checks above left in NO bucket,
    // carrying neither a link nor a `topics` record. Its stamp says it was
    // extracted, but nothing survived the restore, so relink has no record to
    // read and backfill no links to derive from — the LLM is the only way back
    // and this is the only route to it.
    //
    // Deliberately narrow — three conditions, all required — so that healthy
    // extracted rows are never dragged in. A TOPICS_EXTRACTION_VERSION bump
    // would have re-extracted the ENTIRE vault to reach these few rows.
    //
    // `topics === null` and NOT `topics.length === 0`: parseTopics keeps `[]`
    // ("extraction answered empty") apart from null ("no record"), and `[]` is a
    // legitimate result the watermark exists to stop re-asking about. This also
    // terminates the repair — an answered-empty pass writes `[]`, so a repaired
    // row stops matching even if the LLM finds nothing. A row with a NON-empty
    // record and no links belongs to `topicsToRelink`, which claimed it earlier.
    if (!isPending && linked === undefined && topics === null) {
      pendingRaw.push(raw);
      isPending = true;
    }

    // An imminent LLM pass writes `topics` itself, so backfilling first would
    // just buy a second upload of the same row.
    if (!isPending && topics === null && linked !== undefined) {
      topicsBackfillAll.push(id);
    }
  }

  // Drop the flag before returning, or routing these rows to `pending` achieves
  // nothing: BOTH the extraction path's up-front check and
  // `replaceMemoryEntitiesGuardedOp`'s in-write guard read `topics_user_managed`,
  // so a still-flagged row is selected every sweep and skipped every sweep. The
  // reset op is reused for its stamp invalidation too — the row stays pending
  // until an extraction actually lands. This dirties the row, so it uploads once;
  // that's intended, the flag no longer describes the memory.
  for (const id of emptyCurationToClear) {
    try {
      await clearMemoryTopicsOverrideOp(ctx, id, { unlessTopicsRecorded: true });
    } catch (err) {
      // One failed write must not abort the sweep — every other bucket is
      // computed by now and callers would get nothing. The clear is idempotent,
      // so the row is offered again next pass.
      getLogger().warn("[memory/topics] repair clear failed", err);
    }
  }

  // Cap EVERY list under `limit`. Each one costs a per-row Model load in the
  // worker's follow-up write (stamp / relink / backfill), which uncapped would
  // pin thousands of Models in the never-evicted RecordCache (web Pile-2) on the
  // first sweep of a legacy or freshly-restored vault. Capping also paces the
  // backfill's one-time re-upload of the vault across sweeps. Edited /
  // stale-version rows lead `pending` so they win the cap.
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
 */
export async function stampTopicsExtractedAtOp(
  ctx: VaultMemoryOperationsContext,
  memoryIds: readonly string[],
  extractedAt: number,
  version: number = TOPICS_EXTRACTION_VERSION
): Promise<string[]> {
  if (memoryIds.length === 0) return [];

  // Dedupe to avoid prepareUpdate conflicts on shared Model instances.
  const uniqueIds = Array.from(new Set(memoryIds));

  // Chunk the writer batches to keep any single batch reasonable.
  const CHUNK = 500;
  const stamped: string[] = [];

  for (let i = 0; i < uniqueIds.length; i += CHUNK) {
    const chunkIds = uniqueIds.slice(i, i + CHUNK);

    await ctx.database.write(async () => {
      // Load every Model BEFORE preparing any update. `find` is an async native
      // hop, and WatermelonDB requires prepareUpdate → batch within the same
      // tick — an `await` between a prepareUpdate and the batch lets the dev
      // "wasn't sent to batch() synchronously" diagnostic fire (an uncaught
      // throw that RedBoxes Debug builds mid-sweep).
      const records: VaultMemory[] = [];
      for (const id of chunkIds) {
        try {
          records.push(await ctx.vaultMemoryCollection.find(id));
        } catch {
          // Missing row — skip.
        }
      }
      // Synchronous pass: eligibility + updated_at read from the LIVE Model,
      // in-writer — never a pre-writer snapshot (see the doc comment).
      // Truthiness (not `!== true`) on the flag so an unsanitized SQLite `1`
      // can't fail open.
      //
      // TRANSPILATION HAZARD — keep this a `.filter().map()`, NOT a `for…of`
      // whose updater closure captures a per-iteration `const`: Metro/Babel's
      // block-scoping transform hoists such a loop body into an `async
      // _loop()` and AWAITS it per iteration in the shipped Hermes bundle,
      // re-inserting an event-loop yield between prepareUpdate and batch even
      // though this source is same-tick (observed in CI run 29861891347's
      // bundle). `.map()` callbacks are real function scopes and survive the
      // transform unchanged.
      const eligible = records.filter(
        (record) => !record.isDeleted && isOwnedByCtxUser(ctx, record) && !record.topicsUserManaged
      );
      const prepared = eligible.map((record) => {
        // Capture BEFORE prepareUpdate: prepareUpdate touches `updated_at`
        // to now() before the updater callback runs.
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
 * Skips deleted, foreign-user, and record-less rows. Returns the ids relinked.
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
    let record: VaultMemory;
    try {
      record = await ctx.vaultMemoryCollection.find(id);
    } catch {
      continue;
    }
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) continue;
    const topics = parseTopics(record.topics);
    if (topics === null || topics.length === 0) continue;
    try {
      await relinkMemoryEntitiesFromTopicsOp(entityCtx, id, topics);
      relinked.push(id);
    } catch (err) {
      // One unreadable row must not abort the rest of the rebuild — the sweep
      // will offer it again next pass.
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
 */
export async function backfillMemoryTopicsOp(
  ctx: VaultMemoryOperationsContext,
  memoryIds: readonly string[]
): Promise<string[]> {
  const entityCtx = ctx.entityCtx;
  if (!entityCtx) {
    throw new Error("backfillMemoryTopicsOp requires ctx.entityCtx");
  }
  const filled: string[] = [];
  for (const id of Array.from(new Set(memoryIds))) {
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
    // IMPRECISE BY CONSTRUCTION, and safe only because nothing reads `source`
    // yet. `topics_user_managed` is per-MEMORY, so a curated legacy row stamps
    // every one of its topics `user` — including auto-derived ones the user
    // merely kept when they added one of their own. Per-topic provenance simply
    // wasn't recorded before v42 and cannot be recovered. The later
    // partial-refresh feature (refresh `auto` entries, leave `user` alone) must
    // therefore NOT treat a backfilled `source` as ground truth: it would
    // freeze stale auto topics on every pre-v42 curated memory.
    const source = record.topicsUserManaged ? "user" : "auto";
    await ctx.database.write(async () => {
      // Names come from `entity.canonical_name`, so there's no display casing to
      // pass — a pre-v42 row never recorded one. Hence the empty `inputs`.
      const topicsOp = await prepareMemoryTopicsUpdate(entityCtx, id, entities, [], source);
      if (!topicsOp) return;
      await ctx.database.batch(topicsOp);
      filled.push(id);
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
  }
): Promise<boolean> {
  try {
    const record = await ctx.vaultMemoryCollection.find(id);
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;

    let stale = false;
    const archivedAtValue = opts?.now ?? Date.now();
    await ctx.database.write(async () => {
      // Re-check inside the serialized writer: a delete/archive/merge that
      // committed after the probe must win.
      if (record.isDeleted || !isOwnedByCtxUser(ctx, record) || record.archivedAt !== null) {
        stale = true;
        return;
      }
      if (
        opts?.expectedUpdatedAt !== undefined &&
        record.updatedAt.getTime() !== opts.expectedUpdatedAt
      ) {
        // A retain() merge refreshed this row between scan and write — the fact
        // was just re-observed, so leave it active.
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
      // Re-read inside the serialized writer: only delete if STILL archived and
      // STILL past the window. A concurrent restore (archived_at → null) or a
      // fresh re-archive must make this lose.
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

    // W5 cascade (best-effort), mirrors deleteVaultMemoryOp.
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
