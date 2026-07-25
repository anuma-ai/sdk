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
}

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
): Promise<{ entities: Map<string, StoredEntity>; operations: Model[] }> {
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
  if (unique.length === 0) return { entities: out, operations: [] };

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

  return { entities: out, operations: [...created, ...updated] };
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

  await ctx.database.write(async () => {
    const { entities: byName, operations: entityOps } = await upsertEntitiesInWrite(
      ctx,
      normalized
    );
    entities = Array.from(byName.values());

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

  await ctx.database.write(async () => {
    if (await autoLinkBlocked(ctx, memoryId)) {
      skipped = true;
      return;
    }

    const { entities: byName, operations: entityOps } = await upsertEntitiesInWrite(
      ctx,
      normalized
    );
    entities = Array.from(byName.values());

    const existingLinks = await ctx.memoryEntityCollection
      .query(Q.where("memory_id", memoryId))
      .fetch();
    const keep = new Set(entities.map((e) => e.uniqueId));
    const existingEntityIds = new Set(existingLinks.map((l) => String(l.entityId)));
    const toCreate = entities.filter((e) => !existingEntityIds.has(e.uniqueId));
    const toDestroy = existingLinks.filter((l) => !keep.has(String(l.entityId)));
    if (entityOps.length === 0 && toCreate.length === 0 && toDestroy.length === 0) return;
    const orphans = await findOrphanedEntities(ctx, memoryId, toDestroy);
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
  const linkConditions: Q.Clause[] = [Q.where("entity_id", Q.oneOf(entityRows.map((e) => e.id)))];
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
  const links = await ctx.memoryEntityCollection.query(...linkConditions).fetch();

  // memoryId → Set<entity name> the memory matched.
  const out = new Map<string, Set<string>>();
  for (const link of links) {
    const memoryId = String(link.memoryId);
    const entityName = entityIdToName.get(String(link.entityId));
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
