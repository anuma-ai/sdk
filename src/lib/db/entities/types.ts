/**
 * The recognized entity classifications. Runtime list + derived type kept
 * in one place so the extractor's validation and the `EntityKind` union
 * can't drift apart.
 * @public
 */
export const ENTITY_KINDS = ["person", "place", "thing", "concept", "other"] as const;

/** @public */
export type EntityKind = (typeof ENTITY_KINDS)[number];

/**
 * Single canonicalization rule for entity names. Used by both the write
 * side (`linkMemoryEntitiesOp` / `upsertEntitiesOp`) and the query side
 * (`extractQueryEntities`) so lookup parity stays guaranteed even if the
 * rule evolves (e.g. Unicode normalization, hyphen collapse).
 */
export function normalizeEntityName(name: string): string {
  return name.trim().toLowerCase();
}

export interface StoredEntity {
  uniqueId: string;
  canonicalName: string;
  kind: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** @public */
export interface CreateEntityOptions {
  canonicalName: string;
  kind?: EntityKind | (string & {});
}

// StoredMemoryEntity (the converted shape of MemoryEntity rows) was
// removed alongside the W5 graph-lane read helpers — reintroduce when
// the read path needs it again.
