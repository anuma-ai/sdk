import { Model } from "@nozbe/watermelondb";
import { field, text, date, json } from "@nozbe/watermelondb/decorators";

export class Memory extends Model {
  static table = "memories";

  @text("text") text!: string;
  @text("conversation_id") conversationId?: string;
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @json("embedding", (json) => json) embedding?: number[];
  @text("embedding_model") embeddingModel?: string;
  @field("is_deleted") isDeleted!: boolean;
}
