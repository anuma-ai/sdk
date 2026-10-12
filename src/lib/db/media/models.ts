import { Model } from "@nozbe/watermelondb";
import { date, field, json, readonly, text } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

import type { MediaDimensions, MediaMetadata, MediaRole, MediaType } from "./types";

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

  @text("media_id") mediaId!: string;
  @text("wallet_address") walletAddress!: string;
  @text("message_id") messageId?: string;
  @text("conversation_id") conversationId?: string;

  @text("name") name!: string;
  @text("mime_type") mimeType!: string;
  @text("media_type") mediaType!: MediaType;
  @field("size") size!: number;

  @text("role") role!: MediaRole;
  @text("model") model?: string;

  @text("source_url") sourceUrl?: string;

  @json("dimensions", (raw: unknown) => raw as MediaDimensions) dimensions?: MediaDimensions;
  @field("duration") duration?: number;
  @json("metadata", (raw: unknown) => raw as MediaMetadata) metadata?: MediaMetadata;

  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  @field("is_deleted") isDeleted!: boolean;
}
