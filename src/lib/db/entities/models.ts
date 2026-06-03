import { Model } from "@nozbe/watermelondb";
import { date, field, readonly, text } from "@nozbe/watermelondb/decorators";

/**
 * A canonical entity (person, place, thing) extracted from the user's
 * conversations. Many-to-many with vault memories via {@link MemoryEntity}.
 *
 * Created on the write path by the auto-extraction worker (W2) when a
 * candidate fact arrives with non-empty `entities[]`. Used at retrieval
 * time as a 3rd RRF lane (W5 graph traversal): query entity overlap
 * with stored memories surfaces topically-related facts that pure
 * semantic search misses.
 */
export class Entity extends Model {
  static table = "entity";

  /** Lowercased, trimmed name used for dedup and lookup. */
  @text("canonical_name") canonicalName!: string;
  /** Optional category — "person" | "place" | "thing" | "concept" | etc. */
  @field("kind") kind!: string | null;
  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
}

/**
 * Join row: a memory references an entity (and vice versa). Multiple
 * rows per memory (one per entity) and per entity (one per memory).
 */
export class MemoryEntity extends Model {
  static table = "memory_entity";

  @text("memory_id") memoryId!: string;
  @text("entity_id") entityId!: string;
  /**
   * User-scope for the W5 graph lane. Optional because client-side
   * (single-user) deployments may leave it null; server-side multi-user
   * deployments must set it so retrieval can filter cross-user IDs.
   */
  @field("user_id") userId!: string | null;
  @readonly @date("created_at") createdAt!: Date;
}
