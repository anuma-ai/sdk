import type { Collection, Database, Model } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

// Type-only — no runtime dependency on the memoryVault module (which imports
// from this file), so this cannot create an import cycle.
import type { VaultMemory } from "../memoryVault/models";
import type { Entity, MemoryEntity } from "./models";
import { type EntityKind, normalizeEntityName as normalizeName, type StoredEntity } from "./types";

/**
 * Accepted entity shape for {@link linkMemoryEntitiesOp}. A bare string is
 * a name with no kind (back-compat with the original signature); the object
 * form carries an optional classification.
 * @public
 */
export type EntityInput = string | { name: string; kind?: EntityKind | (string & {}) };

export interface EntityOperationsContext {
  database: Database;
  entityCollection: Collection<Entity>;
  memoryEntityCollection: Collection<MemoryEntity>;
  /**
   * Optional user-scope. When provided, `linkMemoryEntitiesOp` stamps
   * `user_id` on new memory_entity rows and `getMemoriesByEntityNamesOp`
   * filters lookups by it. Leave undefined for single-user clients.
   */
  userId?: string;
  /**
   * When `true`, `getMemoriesByEntityNamesOp` admits rows with
   * `user_id = null` alongside the strict `userId` match. Set this on
   * LokiJS (web) adapters where the v31 `unsafeExecuteSql` backfill
   * is a no-op — pre-v31 rows otherwise become invisible to the W5
   * lane until `backfillMemoryEntityUserIdsOp` runs. Default `false`
   * (server / SQLite, where the migration backfill is authoritative).
   */
  allowUnscopedRows?: boolean;
  /**
   * Declares that this process holds exactly ONE tenant's entity table — a
   * per-wallet client database, not a shared multi-user server.
   *
   * Read by `loadEntityVocabulary`, which enumerates the whole `entity` table
   * to build its recall-time index. That table is global vocabulary with no
   * owner ({@link listEntityNamesOp}), so enumerating it is only acceptable
   * when there is nobody else in it.
   *
   * This is deliberately NOT inferred from {@link userId}. `userId` answers "is
   * this read user-scoped" — the React client sets it to the connected wallet
   * to scope legacy `memory_entity` rows on a database that is nevertheless
   * physically single-tenant — so inferring tenancy from it is wrong in both
   * directions. Mirrors `VaultMemoryOperationsContext.singleTenant`, which
   * exists so the decay sweep's scope guard stops inferring safety from
   * `walletAddress`. Default (absent) is the safe answer: no enumeration.
   */
  singleTenant?: boolean;
}

/**
 * Bumped whenever this process creates or destroys `entity` rows. Read by the
 * recall-time entity-vocabulary cache as half of its version stamp.
 *
 * A row COUNT alone is NOT a sound stamp, which is the whole reason this
 * exists: {@link replaceMemoryEntitiesGuardedOp} can orphan-prune K entities
 * and create K others inside one writer, leaving the count unchanged while the
 * name SET has moved. A cache keyed on the count alone would then keep serving
 * a vocabulary that is missing a brand-new name — a silent recall miss, which
 * is precisely the failure the vocabulary tier exists to prevent, arriving
 * through the cache added to prevent it.
 *
 * Process-local is sufficient today: `entity` rows are written from this module
 * and nowhere else (`grep entityCollection src/lib` reaches only schema.ts and
 * models.ts outside this file), and there is no sync engine.
 *
 * BUMPED AFTER THE WRITER RESOLVES, and that ordering has a known residual. A
 * recall whose `countEntitiesOp` resolves against the post-commit table while
 * this counter is still pre-bump computes a stamp for a state that no longer
 * exists and can serve one stale index. It is one call wide and self-heals on
 * the next recall. The alternative — bumping before or inside the writer — is
 * worse in the direction that matters: a writer that throws would advance the
 * stamp for a commit that never happened, and a rebuild cached under that stamp
 * is wrong until something else moves it. Over-invalidating costs a rebuild;
 * under-invalidating costs a wrong answer, so the cheap failure is the one to
 * keep.
 *
 * A second `Database` in one process makes this counter shared, so a write to
 * one table invalidates the other's cached vocabulary — an over-invalidation,
 * costing a rebuild. It cannot cause the converse (one vault's names served for
 * another's queries) because the vocabulary's version stamp also carries a
 * per-context identity; this counter is not load-bearing for that. A sync
 * engine writing `entity` rows behind this module's back WOULD under-invalidate
 * and would need the stamp widened.
 */
let entityWriteGeneration = 0;

/**
 * Current entity-table write generation for this process. See
 * {@link entityWriteGeneration} for why a row count is not enough on its own.
 */
export function getEntityWriteGeneration(): number {
  return entityWriteGeneration;
}

/**
 * Hard cap on `memory_entity` rows {@link getMemoriesByEntityNamesOp} will
 * materialise PER SEED ENTITY.
 *
 * Per-entity, not per-lookup, and that distinction is the whole point. A single
 * global cap is applied by the database across the combined result with no
 * ordering guarantee, so one dense entity ("work", "2025") can fill the entire
 * budget and the rows for every other seed are dropped before this function
 * ever sees them. The overlap map is then built from an incomplete set, and
 * `rankMemoriesByOverlap` — which ranks precisely by how many seeds a memory
 * matched — undercounts or omits exactly the high-overlap memories the lane
 * exists to surface. Capping downstream at NODE_BUDGET does not save it: that
 * cut happens AFTER the ranking, so a truncated read picks the wrong 64.
 *
 * Bounding each seed separately makes starvation impossible by construction —
 * every seed gets its own budget, and the total is still bounded at
 * MAX_VOCABULARY_CANDIDATES (16) x this, the same ceiling the single global cap
 * had. The cost is one indexed read per seed instead of one combined read;
 * they are issued concurrently and each is an index hit on `entity_id`.
 *
 * KNOWN RESIDUAL, deliberately left. Each per-seed read is itself unordered, so
 * for a seed with more than this many links the 250 rows returned are arbitrary.
 * Cross-seed starvation is gone, but a memory that matches BOTH a rare seed and
 * a dense hub can still lose its hub credit if that particular link falls
 * outside the hub's 250 — undercounted overlap rather than a missing memory, so
 * it can reorder within the lane but cannot drop a match entirely. Left as-is at
 * NODE_BUDGET=64 because there is no relevance order to sort link rows by: any
 * ORDER BY here would be arbitrary too, just deterministically arbitrary. Worth
 * revisiting if `graphCount` / `graphSeedCount` diagnostics show dense hubs
 * saturating this in production.
 */
const MAX_LINKS_PER_ENTITY = 250;

function entityToStored(e: Entity): StoredEntity {
  return {
    uniqueId: e.id,
    canonicalName: e.canonicalName,
    kind: e.kind ?? null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

/**
 * Batch resolve-or-create a set of entities, WITHOUT its own
 * `database.write()`: callers run it inside their existing write block and
 * batch the returned `operations` alongside their own.
 *
 * That shape is load-bearing, not stylistic. When the upsert committed in its
 * own writer, a caller's link insert landed in a SECOND writer — and a
 * concurrent {@link replaceMemoryEntitiesGuardedOp} could run in the gap,
 * see the freshly-upserted entity at zero links, prune it
 * ({@link findOrphanedEntities}) and leave the caller inserting a
 * memory_entity row pointing at a deleted entity.
 *
 * Names are deduplicated and normalized (lower-trim) before lookup. When an
 * entity carries a `kind`, it is written on create and back-filled onto an
 * existing row whose kind is still null — but a non-null kind is never
 * overwritten (an earlier, likely-more-confident classification wins over a
 * later one). If the same name appears twice with different kinds in one
 * batch, the first non-null kind wins.
 */
async function upsertEntitiesInWrite(
  ctx: EntityOperationsContext,
  entities: ReadonlyArray<{ name: string; kind?: string }>
): Promise<{ entities: Map<string, StoredEntity>; operations: Model[]; createdCount: number }> {
  const kindByName = new Map<string, string | undefined>();
  for (const e of entities) {
    const name = normalizeName(e.name);
    if (name.length === 0) continue;
    const kind = e.kind && e.kind.length > 0 ? e.kind : undefined;
    if (!kindByName.has(name)) {
      kindByName.set(name, kind);
    } else if (kindByName.get(name) === undefined && kind !== undefined) {
      kindByName.set(name, kind);
    }
  }
  const unique = Array.from(kindByName.keys());
  const out = new Map<string, StoredEntity>();
  if (unique.length === 0) return { entities: out, operations: [], createdCount: 0 };

  const existing = await ctx.entityCollection
    .query(Q.where("canonical_name", Q.oneOf(unique)))
    .fetch();
  const existingNames = new Set(existing.map((e) => e.canonicalName));

  const updates = existing.filter((e) => {
    const incoming = kindByName.get(e.canonicalName);
    return incoming !== undefined && (e.kind === null || e.kind === undefined || e.kind === "");
  });

  const missing = unique.filter((n) => !existingNames.has(n));
  const created = missing.map((name) =>
    ctx.entityCollection.prepareCreate((record) => {
      record._setRaw("canonical_name", name);
      const kind = kindByName.get(name);
      if (kind !== undefined) record._setRaw("kind", kind);
    })
  );
  const updated = updates.map((e) =>
    e.prepareUpdate((record) => {
      record._setRaw("kind", kindByName.get(e.canonicalName) as string);
    })
  );

  for (const e of existing) out.set(e.canonicalName, entityToStored(e));
  for (const record of created) out.set(record.canonicalName, entityToStored(record));

  return { entities: out, operations: [...created, ...updated], createdCount: created.length };
}

/**
 * Link a memory to one or more entities. Accepts bare names (back-compat)
 * or `{ name, kind }` objects. Names are normalized; missing entities are
 * auto-created (with their kind), and an existing entity's null kind is
 * back-filled — see {@link upsertEntitiesInWrite}. Idempotent — duplicate
 * (memory_id, entity_id) pairs are skipped.
 *
 * `options.unlessTopicsUserManaged` re-checks the memory's vault row INSIDE
 * the serialized writer and skips link creation when the row is user-managed
 * (`topics_user_managed`), soft-deleted, or absent. Auto paths (extraction,
 * topic worker) need this: a pre-call check races the LLM round-trip —
 * `setMemoryEntitiesOp` sets the flag in its own writer and a delete can land
 * mid-call (orphaning links the cascade already swept) — so only an in-write
 * check guarantees a user's manual edit or delete can't be grafted over. The
 * row read fails CLOSED (skip links) so a transient fault never attaches
 * topics to a memory we couldn't verify. Entity upserts and link creation
 * run in ONE writer to prevent orphan-prune races; returns [] when links
 * were skipped.
 */
export async function linkMemoryEntitiesOp(
  ctx: EntityOperationsContext,
  memoryId: string,
  entityInputs: ReadonlyArray<EntityInput>,
  options?: { unlessTopicsUserManaged?: boolean }
): Promise<StoredEntity[]> {
  if (entityInputs.length === 0) return [];

  const normalized = entityInputs.map((e) => (typeof e === "string" ? { name: e } : e));
  const userId = ctx.userId;
  let skipped = false;
  let entities: StoredEntity[] = [];
  let createdCount = 0;

  await ctx.database.write(async () => {
    const {
      entities: byName,
      operations: entityOps,
      createdCount: created,
    } = await upsertEntitiesInWrite(ctx, normalized);
    entities = Array.from(byName.values());
    createdCount = created;

    if (options?.unlessTopicsUserManaged && (await autoLinkBlocked(ctx, memoryId))) {
      if (entityOps.length > 0) {
        await ctx.database.batch(...entityOps);
      }
      skipped = true;
      return;
    }

    if (entities.length === 0) return;

    const existingLinks = await ctx.memoryEntityCollection
      .query(Q.where("memory_id", memoryId))
      .fetch();
    const existingEntityIds = new Set(existingLinks.map((l) => String(l.entityId)));
    const toCreate = entities.filter((e) => !existingEntityIds.has(e.uniqueId));
    if (entityOps.length === 0 && toCreate.length === 0) return;

    const linkOps = toCreate.map((e) =>
      ctx.memoryEntityCollection.prepareCreate((record) => {
        record._setRaw("memory_id", memoryId);
        record._setRaw("entity_id", e.uniqueId);
        if (userId !== undefined) record._setRaw("user_id", userId);
      })
    );
    await ctx.database.batch(...entityOps, ...linkOps);
  });

  // AFTER the writer resolves, never inside it: a throwing writer commits
  // nothing and must not advance the stamp.
  if (createdCount > 0) entityWriteGeneration++;

  return skipped ? [] : entities;
}

/**
 * In-write guard for auto link paths: true when auto-managed links must NOT
 * be written to this memory — the vault row is user-managed, soft-deleted, or
 * absent, or the read failed (fail CLOSED). Truthiness (not `=== true`) so an
 * unsanitized SQLite `1` can never fail open. MUST be called from inside a
 * `database.write()` block: writers are serialized, so a committed
 * `setMemoryEntitiesOp` (flag) or vault delete is always visible here.
 */
async function autoLinkBlocked(ctx: EntityOperationsContext, memoryId: string): Promise<boolean> {
  try {
    const rows = await ctx.database
      .get<VaultMemory>("memory_vault")
      .query(Q.where("id", memoryId))
      .fetch();
    const row = rows[0];
    return !row || !!row.isDeleted || !!row.topicsUserManaged;
  } catch {
    return true;
  }
}

/**
 * REPLACE a memory's entity links with an auto-derived set — the topic
 * worker's write primitive. Unlike {@link setMemoryEntitiesOp} it does NOT
 * mark the memory user-managed (the pass is automatic), and unlike
 * {@link linkMemoryEntitiesOp} it removes stale links, so re-extracting an
 * edited memory drops entities its previous content mentioned ("works at
 * Acme" → "works at Globex" must unlink Acme). Insert-missing and
 * destroy-stale are batched in ONE writer, after the same in-write guard as
 * the link op (user-managed / deleted / absent / read-fault ⇒ skip).
 *
 * That batch also prunes `entity` rows left with no links at all (see
 * {@link findOrphanedEntities}) — otherwise a topic the extractor has disowned
 * keeps rendering as a chip that matches no memory.
 *
 * Returns the linked entities ([] for an answered-empty set), or null when
 * the guard skipped — callers must treat null as "not persisted" (e.g. don't
 * stamp `topics_extracted_at`).
 */
export async function replaceMemoryEntitiesGuardedOp(
  ctx: EntityOperationsContext,
  memoryId: string,
  entityInputs: ReadonlyArray<EntityInput>
): Promise<StoredEntity[] | null> {
  const normalized = entityInputs.map((e) => (typeof e === "string" ? { name: e } : e));
  const userId = ctx.userId;
  let skipped = false;
  let entities: StoredEntity[] = [];
  let createdCount = 0;
  let orphanCount = 0;

  await ctx.database.write(async () => {
    if (await autoLinkBlocked(ctx, memoryId)) {
      skipped = true;
      return;
    }

    const {
      entities: byName,
      operations: entityOps,
      createdCount: created,
    } = await upsertEntitiesInWrite(ctx, normalized);
    entities = Array.from(byName.values());
    createdCount = created;

    const existingLinks = await ctx.memoryEntityCollection
      .query(Q.where("memory_id", memoryId))
      .fetch();
    const keep = new Set(entities.map((e) => e.uniqueId));
    const existingEntityIds = new Set(existingLinks.map((l) => String(l.entityId)));
    const toCreate = entities.filter((e) => !existingEntityIds.has(e.uniqueId));
    const toDestroy = existingLinks.filter((l) => !keep.has(String(l.entityId)));
    if (entityOps.length === 0 && toCreate.length === 0 && toDestroy.length === 0) return;
    const orphans = await findOrphanedEntities(ctx, memoryId, toDestroy);
    orphanCount = orphans.length;
    await ctx.database.batch(
      ...entityOps,
      ...toCreate.map((e) =>
        ctx.memoryEntityCollection.prepareCreate((record) => {
          record._setRaw("memory_id", memoryId);
          record._setRaw("entity_id", e.uniqueId);
          if (userId !== undefined) record._setRaw("user_id", userId);
        })
      ),
      ...toDestroy.map((l) => l.prepareDestroyPermanently()),
      ...orphans.map((e) => e.prepareDestroyPermanently())
    );
  });

  // Bumped for DESTROYS as well as creates, and after the writer resolves. This
  // is the case a row count cannot see: pruning K orphans while creating K new
  // entities leaves the count identical and the name set completely different.
  if (createdCount > 0 || orphanCount > 0) entityWriteGeneration++;

  return skipped ? null : entities;
}

/**
 * Entity rows that will have NO links left once `toDestroy` is applied.
 *
 * Without this, an auto-extraction pass that stops mentioning an entity leaves
 * the `entity` row behind forever: clients render one chip per row, so a topic
 * the extractor has disowned keeps showing up and filters to nothing (client
 * issue #5135 — a calendar block titled "Home"). Re-extraction under a bumped
 * TOPICS_EXTRACTION_VERSION drops the link, and this drops the now-dead row with
 * it.
 *
 * Deliberately UNSCOPED by `user_id`: `entity` rows are global vocabulary with
 * no owner, so a row any other memory — or any other user — still references
 * must never be deleted. Only links belonging to THIS memory are the ones going
 * away, so anything else keeps the row alive. Runs inside the caller's writer,
 * where the link deletes aren't visible yet, which is why the check is
 * "links that aren't this memory's" rather than a plain count.
 *
 * Only reached from the auto path. A topic the user created by hand and never
 * used has no links to destroy, so it is never a candidate; one the extractor
 * had linked and then disowned is treated as extractor vocabulary and goes.
 *
 * No `Q.oneOf` chunking here (unlike the sweep query): the candidate list is one
 * memory's entities — single digits, nowhere near SQLite's variable cap.
 */
async function findOrphanedEntities(
  ctx: EntityOperationsContext,
  memoryId: string,
  toDestroy: readonly MemoryEntity[]
): Promise<Entity[]> {
  const candidateIds = [...new Set(toDestroy.map((l) => String(l.entityId)))];
  if (candidateIds.length === 0) return [];

  const links = await ctx.memoryEntityCollection
    .query(Q.where("entity_id", Q.oneOf(candidateIds)))
    .fetch();
  const stillLinked = new Set(
    links.filter((l) => String(l.memoryId) !== memoryId).map((l) => String(l.entityId))
  );
  const orphanIds = candidateIds.filter((id) => !stillLinked.has(id));
  if (orphanIds.length === 0) return [];
  return await ctx.entityCollection.query(Q.where("id", Q.oneOf(orphanIds))).fetch();
}

/**
 * Cascade delete: drop every memory_entity row pointing at the given
 * memory IDs. Vault delete ops call this so the W5 graph lane doesn't
 * keep returning IDs for memories that have been soft-deleted (and so
 * memory_entity doesn't grow unbounded).
 */
export async function unlinkMemoryEntitiesOp(
  ctx: EntityOperationsContext,
  memoryIds: readonly string[]
): Promise<void> {
  if (memoryIds.length === 0) return;
  const links = await ctx.memoryEntityCollection
    .query(Q.where("memory_id", Q.oneOf(Array.from(memoryIds))))
    .fetch();
  if (links.length === 0) return;
  await ctx.database.write(async () => {
    await ctx.database.batch(...links.map((l) => l.prepareDestroyPermanently()));
  });
}

/**
 * Bulk cascade delete: drop every memory_entity row for the given user.
 * Used by `deleteAllVaultMemoriesForUserOp`. No-op when `userId` is
 * absent (single-user clients use `unlinkMemoryEntitiesOp` keyed by
 * memory IDs instead).
 */
export async function unlinkAllMemoryEntitiesForUserOp(
  ctx: EntityOperationsContext,
  userId: string
): Promise<void> {
  if (!userId) return;
  const links = await ctx.memoryEntityCollection.query(Q.where("user_id", userId)).fetch();
  if (links.length === 0) return;
  await ctx.database.write(async () => {
    await ctx.database.batch(...links.map((l) => l.prepareDestroyPermanently()));
  });
}

/**
 * Backfill `memory_entity.user_id` from the parent vault row's user_id.
 * Idempotent — only touches rows where user_id is null.
 *
 * Why this exists: the v31 schema migration backfills via
 * `unsafeExecuteSql`, which is a no-op on the LokiJS (web) adapter. Native
 * SQLite installs have already been filled by the migration; web installs
 * upgrading through v31 keep `user_id=null` on every pre-existing
 * `memory_entity` row until this helper runs.
 *
 * Consumers wiring an `EntityOperationsContext` with `userId` set are
 * obliged to call this once on first use — `getMemoriesByEntityNamesOp`
 * strictly filters by `user_id`, so unstamped rows are otherwise
 * invisible to the W5 graph lane.
 *
 * @public
 */
export async function backfillMemoryEntityUserIdsOp(
  ctx: EntityOperationsContext,
  // Structural-minimal interface mirroring WatermelonDB's Collection.find,
  // which THROWS on missing ID (it does not return null). The try/catch
  // below is therefore load-bearing — don't simplify to a null check.
  vaultMemoryCollection: { find: (id: string) => Promise<{ userId?: string | null }> }
): Promise<number> {
  const unstamped = await ctx.memoryEntityCollection.query(Q.where("user_id", null)).fetch();
  if (unstamped.length === 0) return 0;

  const toUpdate: Array<{ link: MemoryEntity; userId: string }> = [];
  for (const link of unstamped) {
    try {
      const parent = await vaultMemoryCollection.find(String(link.memoryId));
      const userId = parent.userId;
      if (typeof userId === "string" && userId.length > 0) {
        toUpdate.push({ link, userId });
      }
    } catch {
      // Parent record missing (deleted, never existed) — leave the
      // orphan link for the cascade-delete sweep to collect.
    }
  }
  if (toUpdate.length === 0) return 0;

  await ctx.database.write(async () => {
    await ctx.database.batch(
      ...toUpdate.map(({ link, userId }) => link.prepareUpdate((r) => r._setRaw("user_id", userId)))
    );
  });
  return toUpdate.length;
}

/**
 * Row count of the global `entity` table. One indexed COUNT — no rows are
 * materialised and nothing is decrypted.
 *
 * Half of the recall-time entity-vocabulary cache's version stamp; see
 * {@link getEntityWriteGeneration} for why a count alone is not sound.
 */
export async function countEntitiesOp(ctx: EntityOperationsContext): Promise<number> {
  return ctx.entityCollection.query().fetchCount();
}

/**
 * Enumerate every stored canonical entity name, for the recall-time vocabulary
 * index that resolves query tokens against names that actually exist.
 *
 * `unsafeFetchRaw()`, NOT `.fetch()`. The precedent is
 * `getActiveVaultMemoryIdsOp` / `getVaultRankingProjectionsOp`: a whole-table
 * scan must not instantiate a WatermelonDB Model per row, because Models land
 * in the never-evicted RecordCache and stay there for the life of the process.
 * A real vault reaches ~15k entity rows and this runs on the recall path.
 *
 * DELIBERATELY UNSCOPED by `user_id`. The `entity` table is global vocabulary
 * with no owner — that is what makes {@link findOrphanedEntities} correct — so
 * there is no user column to filter on. A caller running multi-user must NOT
 * build a vocabulary from this: it would materialise every user's entity names
 * into one process's index at a cost nobody has measured, and hold them in
 * memory even though lookups stay scoped by `memory_entity.user_id`.
 * `loadEntityVocabulary` enforces that; this op does not guess.
 */
export async function listEntityNamesOp(
  ctx: EntityOperationsContext,
  options?: { limit?: number }
): Promise<string[]> {
  const limit = options?.limit;
  // SQLite reads `LIMIT -1` as "no limit", so a non-positive value must not
  // become a clause at all (same guard as the chat-side paginated reads).
  const clauses = limit !== undefined && Number.isFinite(limit) && limit > 0 ? [Q.take(limit)] : [];
  const rows = (await ctx.entityCollection.query(...clauses).unsafeFetchRaw()) as Array<
    Record<string, unknown>
  >;
  return rows
    .map((row) => row.canonical_name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

/**
 * W5 graph-lane read: given a set of entity names (e.g. extracted from
 * a query), return the set of memory IDs linked to *any* of them, with
 * a per-memory count of how many of the queried entities they match.
 *
 * Caller passes the result to `rankByEntityOverlap` to score each
 * memory via `tanh(0.5 × shared_entity_count)` — this op only does the
 * cheap "find candidate memories" step and leaves scoring to the
 * ranker so callers can attach their own kind-weights or alternative
 * scoring strategies later.
 *
 * Names are normalized (lowercased, trimmed). Empty input returns an
 * empty map. Names that don't exist as entities contribute nothing.
 *
 * Multi-user safety: when `ctx.userId` is set, results are filtered to
 * memory_entity rows whose `user_id` matches. Without this filter the
 * lane returns IDs from every user who tagged a matching entity.
 */
export async function getMemoriesByEntityNamesOp(
  ctx: EntityOperationsContext,
  entityNames: readonly string[]
): Promise<Map<string, Set<string>>> {
  const unique = Array.from(new Set(entityNames.map(normalizeName).filter((n) => n.length > 0)));
  if (unique.length === 0) return new Map();

  const entityRows = await ctx.entityCollection
    .query(Q.where("canonical_name", Q.oneOf(unique)))
    .fetch();
  if (entityRows.length === 0) return new Map();

  const entityIdToName = new Map(entityRows.map((e) => [e.id, e.canonicalName]));
  const linkConditions: Q.Clause[] = [];
  if (ctx.userId !== undefined) {
    if (ctx.allowUnscopedRows) {
      // LokiJS path: the v31 SQL backfill is a no-op, so pre-v31 rows
      // keep user_id=null. Admit them alongside the user's own rows;
      // the downstream `itemById` filter (built from user-scoped
      // `getAllVaultMemoriesOp`) still drops cross-user IDs.
      linkConditions.push(Q.or(Q.where("user_id", ctx.userId), Q.where("user_id", null)));
    } else {
      linkConditions.push(Q.where("user_id", ctx.userId));
    }
  }
  // `unsafeFetchRaw`, NOT `.fetch()`. This is the graph lane's fan-out read and
  // the only thing that ever bounded it was the extractor guessing wrong: a
  // candidate that matched no stored name returned no rows. The vocabulary tier
  // removes exactly that accident — every candidate it emits is a name that
  // exists — so this read goes from "usually zero rows" to "always rows, for up
  // to MAX_VOCABULARY_CANDIDATES real entities", and a dense entity ("2025",
  // "work") can carry hundreds of links each. `.fetch()` would instantiate a
  // WatermelonDB Model per link row into the never-evicted RecordCache; the two
  // columns read here are raw. Same precedent as `listEntityNamesOp` and
  // `getActiveVaultMemoryIdsOp`.
  //
  // One capped read PER SEED, concurrently, rather than one combined read with a
  // global cap — see {@link MAX_LINKS_PER_ENTITY} for why a global cap silently
  // corrupts the overlap ranking it feeds.
  const perEntityRows = await Promise.all(
    entityRows.map((entity) =>
      ctx.memoryEntityCollection
        .query(Q.where("entity_id", entity.id), ...linkConditions, Q.take(MAX_LINKS_PER_ENTITY))
        .unsafeFetchRaw()
    )
  );
  const linkRows = perEntityRows.flat() as Array<Record<string, unknown>>;

  // memoryId → Set<entity name> the memory matched.
  const out = new Map<string, Set<string>>();
  for (const link of linkRows) {
    const memoryId = String(link.memory_id);
    const entityName = entityIdToName.get(String(link.entity_id));
    if (!entityName) continue;
    let bucket = out.get(memoryId);
    if (!bucket) {
      bucket = new Set();
      out.set(memoryId, bucket);
    }
    bucket.add(entityName);
  }
  return out;
}

/**
 * Reverse of {@link getMemoriesByEntityNamesOp}: given a set of memory IDs
 * (e.g. the current BFS frontier), return each memory's set of linked
 * canonical entity names. This is the missing primitive for multi-hop graph
 * traversal (PR4) — one step outward from a memory to its neighbor entities,
 * which the traversal then expands to reach topically-adjacent memories.
 *
 * Empty input returns an empty map. Memory IDs with no links contribute
 * nothing (they simply don't appear as keys).
 *
 * Multi-user safety mirrors {@link getMemoriesByEntityNamesOp} exactly: when
 * `ctx.userId` is set, only `memory_entity` rows owned by that user are
 * followed (with the same `allowUnscopedRows` LokiJS escape hatch for pre-v31
 * rows whose `user_id` backfill was a no-op). Without the filter the reverse
 * lookup would leak entity links written by other users.
 *
 * @public
 */
export async function getEntitiesByMemoryIdsOp(
  ctx: EntityOperationsContext,
  memoryIds: readonly string[]
): Promise<Map<string, Set<string>>> {
  const unique = Array.from(new Set(memoryIds.filter((id) => id.length > 0)));
  if (unique.length === 0) return new Map();

  const linkConditions: Q.Clause[] = [Q.where("memory_id", Q.oneOf(unique))];
  if (ctx.userId !== undefined) {
    if (ctx.allowUnscopedRows) {
      // Same LokiJS escape hatch as getMemoriesByEntityNamesOp — admit
      // user_id=null rows (pre-v31 backfill no-op) alongside the user's own.
      linkConditions.push(Q.or(Q.where("user_id", ctx.userId), Q.where("user_id", null)));
    } else {
      linkConditions.push(Q.where("user_id", ctx.userId));
    }
  }
  const links = await ctx.memoryEntityCollection.query(...linkConditions).fetch();
  if (links.length === 0) return new Map();

  // Resolve entity IDs → canonical names in one batched read.
  const entityIds = Array.from(new Set(links.map((l) => String(l.entityId))));
  const entityRows = await ctx.entityCollection.query(Q.where("id", Q.oneOf(entityIds))).fetch();
  const entityIdToName = new Map(entityRows.map((e) => [e.id, e.canonicalName]));

  // memoryId → Set<entity name>.
  const out = new Map<string, Set<string>>();
  for (const link of links) {
    const entityName = entityIdToName.get(String(link.entityId));
    if (!entityName) continue;
    const memoryId = String(link.memoryId);
    let bucket = out.get(memoryId);
    if (!bucket) {
      bucket = new Set();
      out.set(memoryId, bucket);
    }
    bucket.add(entityName);
  }
  return out;
}
