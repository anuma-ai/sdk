import { Model } from "@nozbe/watermelondb";
import { field, text, date, json, readonly } from "@nozbe/watermelondb/decorators";

/**
 * WatermelonDB model for display interaction records.
 * Represents a resolved display tool output (e.g. a chart) anchored to a message.
 */
export class DisplayInteraction extends Model {
  static table = "display_interactions";

  // Identity
  @text("interaction_id") interactionId!: string;
  @text("conversation_id") conversationId!: string;
  @text("message_id") messageId?: string;

  // Tool metadata
  @text("display_type") displayType!: string;
  @field("tool_version") toolVersion!: number;

  // Result payload (JSON)
  @json("result", (v) => v) result!: any;

  // Timestamps
  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
}
