import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { Entity, MemoryEntity } from "./models";
import { normalizeEntityName as normalizeName, type StoredEntity } from "./types";

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
 * Batch resolve-or-create a set of canonical names. Read + create run
 * inside one `database.write()` so concurrent turns can't race a
 * check-then-create on the same brand-new name.
 *
 * Names are deduplicated and normalized (lower-trim) before lookup.
 */
async function upsertEntitiesOp(
  ctx: EntityOperationsContext,
  names: string[]
): Promise<Map<string, StoredEntity>> {
  const unique = Array.from(new Set(names.map(normalizeName).filter((n) => n.length > 0)));
  const out = new Map<string, StoredEntity>();
  if (unique.length === 0) return out;

  return await ctx.database.write(async () => {
    const existing = await ctx.entityCollection
      .query(Q.where("canonical_name", Q.oneOf(unique)))
      .fetch();
    for (const e of existing) out.set(e.canonicalName, entityToStored(e));

    const missing = unique.filter((n) => !out.has(n));
    if (missing.length === 0) return out;

    const prepared = missing.map((name) =>
      ctx.entityCollection.prepareCreate((record) => {
        record._setRaw("canonical_name", name);
      })
    );
    await ctx.database.batch(...prepared);
    for (const record of prepared) {
      out.set(record.canonicalName, entityToStored(record));
    }
    return out;
  });
}

/**
 * Link a memory to one or more entities. Names are normalized; missing
 * entities are auto-created. Idempotent — duplicate (memory_id, entity_id)
 * pairs are skipped.
 */
export async function linkMemoryEntitiesOp(
  ctx: EntityOperationsContext,
  memoryId: string,
  entityNames: string[]
): Promise<StoredEntity[]> {
  if (entityNames.length === 0) return [];

  const byName = await upsertEntitiesOp(ctx, entityNames);
  const entities = Array.from(byName.values());
  if (entities.length === 0) return [];

  const userId = ctx.userId;
  // Read existing pairs *inside* the write so two parallel
  // linkMemoryEntitiesOp calls for the same memory can't both miss and
  // both insert overlapping (memory_id, entity_id) rows — which would
  // inflate the shared-count downstream in rankByEntityOverlap.
  await ctx.database.write(async () => {
    const existingLinks = await ctx.memoryEntityCollection
      .query(Q.where("memory_id", memoryId))
      .fetch();
    const existingEntityIds = new Set(existingLinks.map((l) => String(l.entityId)));
    const toCreate = entities.filter((e) => !existingEntityIds.has(e.uniqueId));
    if (toCreate.length === 0) return;
    const prepared = toCreate.map((e) =>
      ctx.memoryEntityCollection.prepareCreate((record) => {
        record._setRaw("memory_id", memoryId);
        record._setRaw("entity_id", e.uniqueId);
        if (userId !== undefined) record._setRaw("user_id", userId);
      })
    );
    await ctx.database.batch(...prepared);
  });

  return entities;
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
    // Strict user-scope. Pre-v31 rows have user_id=null and are filtered
    // out by this clause until `backfillMemoryEntityUserIdsOp` runs; the
    // SDK init paths (react/expo useChatStorage) invoke that helper once
    // per session. Tolerating null here would leak cross-user rows in
    // any future consumer that bypasses the downstream itemById join.
    linkConditions.push(Q.where("user_id", ctx.userId));
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
