import { Model } from "@nozbe/watermelondb";
import { date, field, json, text } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

import type { LlmapiToolCallEvent } from "../../../client";
import type {
  ActivityPhase,
  ChatCompletionUsage,
  ChatRole,
  FileMetadata,
  MessageChunk,
  MessageFeedback,
  SearchSource,
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
  @text("image_model") imageModel?: string;
  /** @deprecated Use fileIds with media table instead */
  @json("files", (raw: unknown) => raw as FileMetadata[]) files?: FileMetadata[];
  /** Array of media_id references for direct lookup */
  @json("file_ids", (raw: unknown) => raw as string[]) fileIds?: string[];
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
  @json("vector", (raw: unknown) => raw as number[]) vector?: number[];
  @text("embedding_model") embeddingModel?: string;
  @json("chunks", (raw: unknown) => raw as MessageChunk[]) chunks?: MessageChunk[];
  @json("usage", (raw: unknown) => raw as ChatCompletionUsage) usage?: ChatCompletionUsage;
  @json("sources", (raw: unknown) => raw as SearchSource[]) sources?: SearchSource[];
  @field("response_duration") responseDuration?: number;
  @field("was_stopped") wasStopped?: boolean;
  @text("error") error?: string;
  @json("thought_process", (raw: unknown) => raw as ActivityPhase[])
  thoughtProcess?: ActivityPhase[];
  @text("thinking") thinking?: string;
  @text("parent_message_id") parentMessageId?: string;
  @text("feedback") feedback?: MessageFeedback;
  @json("tool_call_events", (raw: unknown) => raw as LlmapiToolCallEvent[])
  toolCallEvents?: LlmapiToolCallEvent[];
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

/**
 * WatermelonDB model for cached conversation summaries.
 * One summary per conversation. Updated progressively as the conversation grows.
 */
export class ConversationSummary extends Model {
  static table = "conversation_summaries";

  static associations: Associations = {
    conversations: { type: "belongs_to", key: "conversation_id" },
  };

  @text("conversation_id") conversationId!: string;
  @text("summary") summary!: string;
  @text("summarized_up_to") summarizedUpTo!: string;
  @field("token_count") tokenCount!: number;
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;
}
