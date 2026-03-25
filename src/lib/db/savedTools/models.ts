import { Model } from "@nozbe/watermelondb";
import type { Associations } from "@nozbe/watermelondb/Model";
import { date, field, json, readonly, text } from "@nozbe/watermelondb/decorators";

import type { SavedToolParameter } from "./types";

const sanitizeParameters = (raw: unknown) => (raw as Record<string, SavedToolParameter>) ?? {};

export class SavedTool extends Model {
  static table = "saved_tools";

  static associations: Associations = {};

  @text("name") name!: string;
  @text("display_name") displayName!: string;
  @text("description") description!: string;
  @json("parameters", sanitizeParameters)
  parameters!: Record<string, SavedToolParameter>;
  @text("html") html!: string;
  @text("conversation_id") conversationId?: string;

  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @field("is_deleted") isDeleted!: boolean;
}
