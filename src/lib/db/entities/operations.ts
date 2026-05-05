import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { Entity, MemoryEntity } from "./models";
import type {
  CreateEntityOptions,
  StoredEntity,
  StoredMemoryEntity,
} from "./types";

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

function memoryEntityToStored(me: MemoryEntity): StoredMemoryEntity {
  return {
    uniqueId: me.id,
    memoryId: me.memoryId,
    entityId: me.entityId,
    createdAt: me.createdAt,
  };
}

/**
 * Get an entity by canonical name (lowercased), or null. Used by the
 * write path to dedup before inserting.
 */
export async function getEntityByNameOp(
  ctx: EntityOperationsContext,
  name: string
): Promise<StoredEntity | null> {
  const normalized = normalizeName(name);
  if (!normalized) return null;
  const matches = await ctx.entityCollection
    .query(Q.where("canonical_name", normalized))
    .fetch();
  const first = matches[0];
  return first ? entityToStored(first) : null;
}

/**
 * Create an entity, or return the existing one if `canonicalName` already exists.
 * Idempotent — safe to call repeatedly with the same name.
 */
export async function upsertEntityOp(
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
  const unique = Array.from(
    new Set(entityNames.map(normalizeName).filter((n) => n.length > 0))
  );
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

/**
 * Get all memory ids that share at least one entity with the given names.
 * Returns a Map keyed by memory id with the count of overlapping entities
 * (used by the W5 graph lane to score `tanh(shared / total_query)`).
 */
export async function getMemoriesByEntityNamesOp(
  ctx: EntityOperationsContext,
  names: string[]
): Promise<Map<string, number>> {
  const overlap = new Map<string, number>();
  const normalized = Array.from(
    new Set(names.map(normalizeName).filter((n) => n.length > 0))
  );
  if (normalized.length === 0) return overlap;

  const entityRows = await ctx.entityCollection
    .query(Q.where("canonical_name", Q.oneOf(normalized)))
    .fetch();
  if (entityRows.length === 0) return overlap;

  const entityIds = entityRows.map((e) => e.id);
  const links = await ctx.memoryEntityCollection
    .query(Q.where("entity_id", Q.oneOf(entityIds)))
    .fetch();

  for (const link of links) {
    const memId = String(link.memoryId);
    overlap.set(memId, (overlap.get(memId) ?? 0) + 1);
  }
  return overlap;
}

/**
 * List entity links for a single memory (e.g. for showing entity badges
 * in the Memory Studio panel).
 */
export async function getEntitiesForMemoryOp(
  ctx: EntityOperationsContext,
  memoryId: string
): Promise<StoredEntity[]> {
  const links = await ctx.memoryEntityCollection
    .query(Q.where("memory_id", memoryId))
    .fetch();
  if (links.length === 0) return [];

  const entityIds = links.map((l) => String(l.entityId));
  const entityRows = await ctx.entityCollection
    .query(Q.where("id", Q.oneOf(entityIds)))
    .fetch();
  return entityRows.map(entityToStored);
}

/**
 * Snapshot the full entity graph: every entity with the list of memory
 * ids that mention it. Powers the Memory Graph UI canvas.
 */
export interface EntityGraphNode {
  uniqueId: string;
  canonicalName: string;
  kind: string | null;
  memoryIds: string[];
}

export async function listEntityGraphOp(
  ctx: EntityOperationsContext
): Promise<EntityGraphNode[]> {
  const [entityRows, linkRows] = await Promise.all([
    ctx.entityCollection.query().fetch(),
    ctx.memoryEntityCollection.query().fetch(),
  ]);

  const linksByEntity = new Map<string, string[]>();
  for (const link of linkRows) {
    const eid = String(link.entityId);
    const arr = linksByEntity.get(eid);
    if (arr) arr.push(String(link.memoryId));
    else linksByEntity.set(eid, [String(link.memoryId)]);
  }

  return entityRows.map((e) => ({
    uniqueId: e.id,
    canonicalName: e.canonicalName,
    kind: e.kind ?? null,
    memoryIds: linksByEntity.get(e.id) ?? [],
  }));
}

export { memoryEntityToStored };
