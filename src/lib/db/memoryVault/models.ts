import { Model } from "@nozbe/watermelondb";
import { date, field, readonly, text } from "@nozbe/watermelondb/decorators";

export class VaultMemory extends Model {
  static table = "memory_vault";

  @text("content") content!: string;
  @text("scope") scope!: string;
  @field("folder_id") folderId!: string | null;
  @field("user_id") userId!: string | null;
  @field("embedding") embedding!: string | null;
  /** Model that produced `embedding`. Null on legacy rows (grandfathered). */
  @field("embedding_model") embeddingModel!: string | null;
  @field("source_chunk_ids") sourceChunkIds!: string | null;
  @field("proof_count") proofCount!: number | null;
  @field("source") source!: string | null;
  /** W6 temporal lane — Unix ms timestamp of when the event occurred. */
  @field("event_time_start") eventTimeStart!: number | null;
  /** W6 temporal lane — Unix ms timestamp of event end (range/ongoing). */
  @field("event_time_end") eventTimeEnd!: number | null;
  /** W6 temporal lane — `point | range | ongoing | null`. */
  @field("event_time_kind") eventTimeKind!: string | null;
  /** When true, the user has manually set this memory's topics; auto-extraction
   *  leaves its entity links alone. Null on legacy rows (treated as false). */
  @field("topics_user_managed") topicsUserManaged!: boolean | null;
  /** The durable, synced record of this memory's topics — JSON `StoredTopic[]`.
   *  `entity` / `memory_entity` are a device-local index over it. Null = pre-v42
   *  (backfilled from the row's current links by the sweep). */
  @field("topics") topics!: string | null;
  /** Unix ms of the last `topics` write. Separate from `updated_at`, which every
   *  topic writer pins on purpose (recall recency) — see the schema note. */
  @field("topics_updated_at") topicsUpdatedAt!: number | null;
  /** Unix ms of the last LLM topic-extraction pass. Null = never extracted
   *  standalone (linked legacy rows are grandfathered as extracted).
   *  DEPRECATED (v42) — subsumed by `topics_updated_at`; see the schema note. */
  @field("topics_extracted_at") topicsExtractedAt!: number | null;
  /** A2 supersession: newer memory id that replaced this one, or null if live. */
  @field("superseded_by") supersededBy!: string | null;
  @field("superseded_at") supersededAt!: number | null;
  /** Extraction-logic version this memory was last stamped under. Null (pre-v38)
   *  reads as 0, so a TOPICS_EXTRACTION_VERSION bump re-extracts stale rows.
   *  DEPRECATED (v42) — subsumed by `topics_updated_at`; see the schema note. */
  @field("topics_extracted_version") topicsExtractedVersion!: number | null;
  /** C3 re-observation watermark: Unix ms of the last retain() merge, or null. */
  @field("last_observed_at") lastObservedAt!: number | null;
  /** Typed memory (PR1) — the extractor's FactType. Null on legacy/manual rows. */
  @field("fact_type") factType!: string | null;
  /** Decay archive state (PR2) — Unix ms when archived, null when active. */
  @field("archived_at") archivedAt!: number | null;
  /** Tier-0 security (PR3) — "quarantined" | "trusted" | null. */
  @field("trust_tier") trustTier!: string | null;
  /** People Nearby visibility: 'private' | 'public'. Null on legacy rows, and
   *  any unrecognised value, read as 'private' — never published without opt-in. */
  @field("visibility") visibility!: string | null;
  /** Owner opted this memory into their own digital twin (twin-scoped only). */
  @field("twin_opt_in") twinOptIn!: boolean | null;
  /** Unix ms when visibility last became non-private; null while private. */
  @field("published_at") publishedAt!: number | null;
  /** Reserved coarse-geohash slot for landmark/Trail memories. */
  @field("geohash") geohash!: string | null;
  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @field("is_deleted") isDeleted!: boolean;
}
