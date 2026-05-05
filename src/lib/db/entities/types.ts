export type EntityKind = "person" | "place" | "thing" | "concept" | "other";

export interface StoredEntity {
  uniqueId: string;
  canonicalName: string;
  kind: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEntityOptions {
  canonicalName: string;
  kind?: EntityKind | string;
}

export interface StoredMemoryEntity {
  uniqueId: string;
  memoryId: string;
  entityId: string;
  createdAt: Date;
}
