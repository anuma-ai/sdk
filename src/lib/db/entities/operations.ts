import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { Entity, MemoryEntity } from "./models";
import type { CreateEntityOptions, StoredEntity } from "./types";

export interface EntityOperationsContext {
  database: Database;
  entityCollection: Collection<Entity>;
  memoryEntityCollection: Collection<MemoryEntity>;
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
 * Get an entity by canonical name (lowercased), or null. Used by the
 * write path to dedup before inserting.
 */
async function getEntityByNameOp(
  ctx: EntityOperationsContext,
  name: string
): Promise<StoredEntity | null> {
  const normalized = normalizeName(name);
  if (!normalized) return null;
  const matches = await ctx.entityCollection.query(Q.where("canonical_name", normalized)).fetch();
  const first = matches[0];
  return first ? entityToStored(first) : null;
}

/**
 * Create an entity, or return the existing one if `canonicalName` already exists.
 * Idempotent — safe to call repeatedly with the same name.
 */
async function upsertEntityOp(
  ctx: EntityOperationsContext,
  opts: CreateEntityOptions
): Promise<StoredEntity> {
  const existing = await getEntityByNameOp(ctx, opts.canonicalName);
  if (existing) return existing;

  const created = await ctx.database.write(async () => {
    return ctx.entityCollection.create((record) => {
      record._setRaw("canonical_name", normalizeName(opts.canonicalName));
      if (opts.kind !== undefined) record._setRaw("kind", opts.kind);
    });
  });
  return entityToStored(created);
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
  const unique = Array.from(new Set(entityNames.map(normalizeName).filter((n) => n.length > 0)));
  if (unique.length === 0) return [];

  // Resolve / create each entity.
  const entities: StoredEntity[] = [];
  for (const name of unique) {
    entities.push(await upsertEntityOp(ctx, { canonicalName: name }));
  }

  // Skip pairs that already exist.
  const existingLinks = await ctx.memoryEntityCollection
    .query(Q.where("memory_id", memoryId))
    .fetch();
  const existingEntityIds = new Set(existingLinks.map((l) => String(l.entityId)));

  const toCreate = entities.filter((e) => !existingEntityIds.has(e.uniqueId));
  if (toCreate.length === 0) return entities;

  await ctx.database.write(async () => {
    const prepared = toCreate.map((e) =>
      ctx.memoryEntityCollection.prepareCreate((record) => {
        record._setRaw("memory_id", memoryId);
        record._setRaw("entity_id", e.uniqueId);
      })
    );
    await ctx.database.batch(...prepared);
  });

  return entities;
}

// W5 graph-lane read helpers (getMemoriesByEntityNamesOp,
// getEntitiesForMemoryOp, listEntityGraphOp) and the memoryEntityToStored
// converter were removed because nothing in the SDK or its consumers
// calls them yet. Reintroduce when the W5 read path is wired into recall()
// or the Memory Graph UI; the table schema and write path
// (linkMemoryEntitiesOp + upsertEntityOp) stay in place to support that.
