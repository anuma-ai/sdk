import { Model } from "@nozbe/watermelondb";
import { date, readonly, text } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

export class AppFile extends Model {
  static table = "app_files";

  static associations: Associations = {};

  @text("conversation_id") conversationId!: string;
  @text("path") path!: string;
  @text("content") content!: string;
  @readonly @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
}
