/** @public */
export type EntityKind = "person" | "place" | "thing" | "concept" | "other";

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
