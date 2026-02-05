import { Model } from "@nozbe/watermelondb";
import { field, text, date, json } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type {
  ChatRole,
  FileMetadata,
  ChatCompletionUsage,
  SearchSource,
  ActivityPhase,
  MessageChunk,
} from "./types";

export class Message extends Model {
  static table = "history";

  static associations: Associations = {
    conversations: { type: "belongs_to", key: "conversation_id" },
    media: { type: "has_many", foreignKey: "message_id" },
  };

  @field("message_id") messageId!: number;
  @text("conversation_id") conversationId!: string;
  @text("role") role!: ChatRole;
  @text("content") content!: string;
  @text("model") model?: string;
  /** @deprecated Use fileIds with media table instead */
  @json("files", (json) => json) files?: FileMetadata[];
  /** Array of media_id references for direct lookup */
  @json("file_ids", (json) => json) fileIds?: string[];
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @json("vector", (json) => json) vector?: number[];
  @text("embedding_model") embeddingModel?: string;
  @json("chunks", (json) => json) chunks?: MessageChunk[];
  @json("usage", (json) => json) usage?: ChatCompletionUsage;
  @json("sources", (json) => json) sources?: SearchSource[];
  @field("response_duration") responseDuration?: number;
  @field("was_stopped") wasStopped?: boolean;
  @text("error") error?: string;
  @json("thought_process", (json) => json) thoughtProcess?: ActivityPhase[];
  @text("thinking") thinking?: string;
}

export class Conversation extends Model {
  static table = "conversations";

  static associations: Associations = {
    history: { type: "has_many", foreignKey: "conversation_id" },
    projects: { type: "belongs_to", key: "project_id" },
  };

  @text("conversation_id") conversationId!: string;
  @text("title") title!: string;
  @text("project_id") projectId?: string;
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @field("is_deleted") isDeleted!: boolean;
}
