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
  /** Typed memory (PR1) — the extractor's FactType. Null on legacy/manual rows. */
  @field("fact_type") factType!: string | null;
  /** Decay archive state (PR2) — Unix ms when archived, null when active. */
  @field("archived_at") archivedAt!: number | null;
  /** Tier-0 security (PR3) — "quarantined" | "trusted" | null. */
  @field("trust_tier") trustTier!: string | null;
  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @field("is_deleted") isDeleted!: boolean;
}
