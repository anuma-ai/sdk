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
 * so the archived + quarantined exclusions applied here cover all of recall at
 * once.
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
 *   string-valued.) */
function baseVaultConditions(
  ctx: VaultMemoryOperationsContext,
  options?: {
    since?: Date;
    includeDeleted?: boolean;
    includeArchived?: boolean;
    includeQuarantined?: boolean;
  }
) {
  return [
    ...(options?.includeDeleted ? [] : [Q.where("is_deleted", false)]),
    ...(options?.includeArchived ? [] : [Q.where("archived_at", Q.eq(null))]),
    ...(options?.includeQuarantined ? [] : [Q.where("trust_tier", Q.notEq("quarantined"))]),
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
        if (opts.topicsUserManaged !== undefined) {
          r._setRaw("topics_user_managed", opts.topicsUserManaged);
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
 * auto-extraction resumes owning its links. Existing links are left in place
 * (the next extraction pass may add to them). Preserves `updated_at`.
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
}

/**
 * Guard against a decay sweep amplifying across tenants. A sweep with no
 * `userId` reaches EVERY row the query can see, so this refuses a context that
 * is neither user- nor wallet-scoped rather than relying on caller discipline.
 *
 * IMPORTANT — what `walletAddress` actually buys here: `baseVaultConditions`
 * scopes the query by `user_id` ONLY (there is no `wallet_address` column). So a
 * context with `walletAddress` set but `userId` undefined PASSES this guard yet
 * runs an UNSCOPED scan/archive/delete across every row in the DB. That is safe
 * TODAY solely because client DBs are physically per-wallet isolated (one
 * wallet's rows per DB, written with `user_id = null`) — `walletAddress`
 * presence is TRUSTED as a proxy for "this is a per-wallet client DB", NOT an
 * enforced scope. A future walletAddress-only context on a SHARED / multi-tenant
 * DB would satisfy this guard and sweep across ALL tenants.
 *
 * We do NOT tighten this to `userId`-required, because the shipping client
 * `vaultCtx` is walletAddress-only over `user_id = null` rows (no backfill), so
 * requiring `userId` would break (or silently no-op) the client decay sweep.
 * TODO(follow-up): make the trust explicit with an `isPerWalletDb` /
 * `singleTenant` flag on the context and gate on
 * `userId !== undefined || singleTenant === true`. That needs a coordinated
 * client change to pass the flag, so it is out of scope for this SDK-only pass.
 */
export function assertVaultScopeForSweep(ctx: VaultMemoryOperationsContext): void {
  if (ctx.userId === undefined && ctx.walletAddress === undefined) {
    throw new Error(
      "Refusing to run a decay sweep on an unscoped vault context (no userId and no " +
        "walletAddress): this would sweep across all tenants. Set ctx.userId on " +
        "server/multi-tenant contexts."
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
