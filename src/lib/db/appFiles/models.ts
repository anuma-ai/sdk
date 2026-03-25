import { Model } from "@nozbe/watermelondb";
import type { Associations } from "@nozbe/watermelondb/Model";
import { date, text } from "@nozbe/watermelondb/decorators";

export class AppFile extends Model {
  static table = "app_files";

  static associations: Associations = {};

  @text("conversation_id") conversationId!: string;
  @text("path") path!: string;
  @text("content") content!: string;
  @date("updated_at") updatedAt!: Date;
}
