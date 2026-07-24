import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { EmbeddedWalletSignerFn, SignMessageFn } from "../encryption-utils";
import {
  type EntityInput,
  type EntityOperationsContext,
  linkMemoryEntitiesOp,
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
    topicsExtractedAt: memory.topicsExtractedAt ?? null,
    topicsExtractedVersion: memory.topicsExtractedVersion ?? null,
    supersededBy: memory.supersededBy ?? null,
    supersededAt: memory.supersededAt ?? null,
    lastObservedAt: memory.lastObservedAt ?? null,
    factType: memory.factType ?? null,
    archivedAt: memory.archivedAt ?? null,
    trustTier: memory.trustTier ?? null,
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
    topicsExtractedAt: (raw.topics_extracted_at as number | null) ?? null,
    topicsExtractedVersion: (raw.topics_extracted_version as number | null) ?? null,
    supersededBy: (raw.superseded_by as string | null) ?? null,
    supersededAt: (raw.superseded_at as number | null) ?? null,
    lastObservedAt: (raw.last_observed_at as number | null) ?? null,
    factType: (raw.fact_type as string | null) ?? null,
    archivedAt: (raw.archived_at as number | null) ?? null,
    trustTier: (raw.trust_tier as string | null) ?? null,
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
  }
): Promise<StoredVaultMemory[]> {
  const conditions = [
    ...baseVaultConditions(ctx, options),
    ...(options?.scopes?.length ? [Q.where("scope", Q.oneOf(options.scopes))] : []),
    ...(options?.folderId !== undefined ? [Q.where("folder_id", options.folderId)] : []),
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
 * edit doesn't inflate the recency multiplier.
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

  // 1) Mark user-managed FIRST, re-checking soft-delete inside the writer — a
  // delete that committed after the probe must win (mirrors updateVaultMemoryOp),
  // so we never attach links to a deleted memory. Setting the flag before
  // touching links also means a later link failure still leaves the memory
  // user-managed rather than silently reclaimable by auto-extraction.
  let stale = false;
  const originalUpdatedAt = record.updatedAt.getTime();
  await ctx.database.write(async () => {
    if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) {
      stale = true;
      return;
    }
    await record.update((r) => {
      r._setRaw("topics_user_managed", true);
      r._setRaw("updated_at", originalUpdatedAt);
    });
  });
  if (stale) return null;

  // 2) Add the new links first (idempotent), THEN drop only the stale ones.
  // This ordering means a transient failure can leave at most EXTRA topics
  // (old ∪ new) — never zero — so a topic edit can't wipe a memory's topics
  // (the delete-all-then-relink order could, on a mid-op failure).
  const linked =
    entities.length > 0 ? await linkMemoryEntitiesOp(entityCtx, memoryId, entities) : [];
  const keep = new Set(linked.map((e) => e.uniqueId));
  const existing = await entityCtx.memoryEntityCollection
    .query(Q.where("memory_id", memoryId))
    .fetch();
  const staleLinks = existing.filter((l) => !keep.has(String(l.entityId)));
  if (staleLinks.length > 0) {
    await ctx.database.write(async () => {
      await ctx.database.batch(...staleLinks.map((l) => l.prepareDestroyPermanently()));
    });
  }

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
 */
export async function clearMemoryTopicsOverrideOp(
  ctx: VaultMemoryOperationsContext,
  memoryId: string
): Promise<boolean> {
  let record: VaultMemory;
  try {
    record = await ctx.vaultMemoryCollection.find(memoryId);
  } catch {
    return false;
  }
  if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return false;
  const originalUpdatedAt = record.updatedAt.getTime();
  await ctx.database.write(async () => {
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
  return true;
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
 */
export const TOPICS_EXTRACTION_VERSION = 2;

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
   * `topics_extracted_version` than {@link TOPICS_EXTRACTION_VERSION}. Edited /
   * stale-version rows come first (they get priority under `limit`), each group
   * newest-created first.
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
}

/**
 * Sweep query for the background topic-extraction worker: partition the
 * user's non-deleted, non-user-managed memories by what the worker should do
 * with them (see {@link MemoriesNeedingTopicExtraction}). User-managed rows
 * are never returned — the user owns their topics, including an intentionally
 * empty set. Requires `ctx.entityCtx` for the entity-links check.
 */
export async function getMemoriesNeedingTopicExtractionOp(
  ctx: VaultMemoryOperationsContext,
  options?: { limit?: number }
): Promise<MemoriesNeedingTopicExtraction> {
  const entityCtx = ctx.entityCtx;
  if (!entityCtx) {
    throw new Error("getMemoriesNeedingTopicExtractionOp requires ctx.entityCtx");
  }
  const conditions = [
    // Boolean optional column: null (legacy) and false both mean auto-managed.
    // Q.notEq(true) is a NULL trap on SQLite (NULL <> TRUE is NULL) — enumerate.
    Q.or(Q.where("topics_user_managed", null), Q.where("topics_user_managed", false)),
    ...baseVaultConditions(ctx),
    Q.sortBy("created_at", Q.desc),
  ];
  // unsafeFetchRaw (NOT fetch): whole-vault sweep must not pin a Model per row
  // into the never-evicted RecordCache (web Pile-2) — see getAllVaultMemoriesOp.
  const rows = (await ctx.vaultMemoryCollection.query(...conditions).unsafeFetchRaw()) as Record<
    string,
    unknown
  >[];

  // Stamped rows re-extract when edited since the last pass OR when they were
  // extracted under an older logic version (pre-v37 rows read as version 0, so a
  // TOPICS_EXTRACTION_VERSION bump re-processes them). Unstamped rows split on
  // whether they already have links (grandfather) or not (backfill).
  const stampedPending: Record<string, unknown>[] = [];
  const unstamped: Record<string, unknown>[] = [];
  for (const raw of rows) {
    const stamp = (raw.topics_extracted_at as number | null) ?? null;
    if (stamp !== null) {
      const version = (raw.topics_extracted_version as number | null) ?? 0;
      if ((raw.updated_at as number) > stamp || version < TOPICS_EXTRACTION_VERSION) {
        stampedPending.push(raw);
      }
    } else {
      unstamped.push(raw);
    }
  }

  // Which unstamped rows already have entity links? Chunk the id list — SQLite
  // caps bound variables (999), and huge Q.oneOf arrays hurt LokiJS too.
  // unsafeFetchRaw (NOT fetch) here too: the first post-migration sweep over a
  // legacy vault can touch thousands of link rows, and .fetch() would pin a
  // Model per row into the never-evicted RecordCache (web Pile-2).
  const linkedIds = new Set<string>();
  const CHUNK = 500;
  for (let i = 0; i < unstamped.length; i += CHUNK) {
    const ids = unstamped.slice(i, i + CHUNK).map((r) => r.id as string);
    const links = (await entityCtx.memoryEntityCollection
      .query(Q.where("memory_id", Q.oneOf(ids)))
      .unsafeFetchRaw()) as Record<string, unknown>[];
    for (const link of links) linkedIds.add(String(link.memory_id));
  }

  const linkedUnstampedAll: string[] = [];
  const pendingRaw: Record<string, unknown>[] = [...stampedPending];
  for (const raw of unstamped) {
    if (linkedIds.has(raw.id as string)) {
      linkedUnstampedAll.push(raw.id as string);
    } else {
      pendingRaw.push(raw);
    }
  }

  // Cap BOTH lists under `limit`. The worker stamps every `linkedUnstamped` id
  // (via stampTopicsExtractedAtOp, which must load a Model per row to update) —
  // uncapped, the first post-migration sweep of a legacy vault would grandfather
  // thousands at once and pin that many Models in the never-evicted RecordCache
  // (web Pile-2). Bounding it here drains the grandfather backlog across sweeps.
  const cap = options?.limit !== undefined && options.limit > 0 ? options.limit : undefined;
  const limitedPendingRaw = cap !== undefined ? pendingRaw.slice(0, cap) : pendingRaw;
  const linkedUnstamped = cap !== undefined ? linkedUnstampedAll.slice(0, cap) : linkedUnstampedAll;
  const pending = await mapInBatches(limitedPendingRaw, (raw) =>
    vaultMemoryRawToStored(raw, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
  );
  return { pending, linkedUnstamped };
}

/**
 * Stamp `topics_extracted_at` (and `topics_extracted_version`) on the given
 * memories — the topic worker calls this after a successful extraction pass
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
