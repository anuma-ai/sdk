import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { Entity, MemoryEntity } from "./models";
import type { StoredEntity } from "./types";

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

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
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

  // Skip pairs that already exist.
  const existingLinks = await ctx.memoryEntityCollection
    .query(Q.where("memory_id", memoryId))
    .fetch();
  const existingEntityIds = new Set(existingLinks.map((l) => String(l.entityId)));

  const toCreate = entities.filter((e) => !existingEntityIds.has(e.uniqueId));
  if (toCreate.length === 0) return entities;

  const userId = ctx.userId;
  await ctx.database.write(async () => {
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
  const linkConditions = [Q.where("entity_id", Q.oneOf(entityRows.map((e) => e.id)))];
  if (ctx.userId !== undefined) {
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
