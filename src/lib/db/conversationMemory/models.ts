import { Model } from "@nozbe/watermelondb";
import { date, field, readonly, text } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

/**
 * A memory a conversation drew on, recorded so the conversation-level Memories
 * panel can be rebuilt after a reload. Stores only the vault memory id (+ recall
 * score) — the snippet/topic/scope are resolved from the memory_vault by id, so
 * no memory content is duplicated here.
 */
export class ConversationMemory extends Model {
  static table = "conversation_memory";

  static associations: Associations = {};

  @text("conversation_id") conversationId!: string;
  @text("memory_id") memoryId!: string;
  @field("score") score!: number;
  @readonly @date("created_at") createdAt!: Date;
}
