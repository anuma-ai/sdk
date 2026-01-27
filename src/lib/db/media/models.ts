import { Model } from "@nozbe/watermelondb";
import { field, text, date, json, readonly } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type {
  MediaType,
  MediaRole,
  MediaDimensions,
  MediaMetadata,
} from "./types";

/**
 * WatermelonDB model for media records.
 * Represents files stored in the library (images, videos, audio, documents).
 */
export class Media extends Model {
  static table = "media";

  static associations: Associations = {
    history: { type: "belongs_to", key: "message_id" },
    conversations: { type: "belongs_to", key: "conversation_id" },
  };

  // Identity
  @text("media_id") mediaId!: string;
  @text("wallet_address") walletAddress!: string;
  @text("message_id") messageId?: string;
  @text("conversation_id") conversationId?: string;

  // Basic metadata
  @text("name") name!: string;
  @text("mime_type") mimeType!: string;
  @text("media_type") mediaType!: MediaType;
  @field("size") size!: number;

  // Origin
  @text("role") role!: MediaRole;
  @text("model") model?: string;

  // URLs
  @text("url") url?: string;
  @text("source_url") sourceUrl?: string;

  // Media-specific metadata
  @json("dimensions", (json) => json) dimensions?: MediaDimensions;
  @field("duration") duration?: number;
  @json("metadata", (json) => json) metadata?: MediaMetadata;

  // Timestamps
  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Soft delete
  @field("is_deleted") isDeleted!: boolean;
}
