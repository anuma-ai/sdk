import { appSchema, tableSchema } from "@nozbe/watermelondb";

/**
 * WatermelonDB schema for chat storage
 *
 * Defines two tables:
 * - history: Chat messages with metadata
 * - conversations: Conversation metadata
 */
export const chatStorageSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "history",
      columns: [
        { name: "message_id", type: "number" }, // Sequential ID within conversation
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "role", type: "string", isIndexed: true }, // 'user' | 'assistant' | 'system'
        { name: "content", type: "string" },
        { name: "model", type: "string", isOptional: true },
        { name: "files", type: "string", isOptional: true }, // JSON stringified FileMetadata[]
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        { name: "vector", type: "string", isOptional: true }, // JSON stringified number[]
        { name: "embedding_model", type: "string", isOptional: true },
        { name: "usage", type: "string", isOptional: true }, // JSON stringified ChatCompletionUsage
        { name: "sources", type: "string", isOptional: true }, // JSON stringified SearchSource[]
        { name: "response_duration", type: "number", isOptional: true },
      ],
    }),
    tableSchema({
      name: "conversations",
      columns: [
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "title", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
        { name: "is_deleted", type: "boolean", isIndexed: true },
      ],
    }),
  ],
});
