import { appSchema, tableSchema } from "@nozbe/watermelondb";
import {
  schemaMigrations,
  addColumns,
  unsafeExecuteSql,
} from "@nozbe/watermelondb/Schema/migrations";

export const chatStorageSchema = appSchema({
  version: 6,
  tables: [
    tableSchema({
      name: "history",
      columns: [
        { name: "message_id", type: "number" },
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "wallet_address", type: "string", isIndexed: true },
        { name: "role", type: "string", isIndexed: true },
        { name: "content", type: "string" },
        { name: "model", type: "string", isOptional: true },
        { name: "files", type: "string", isOptional: true },
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        { name: "vector", type: "string", isOptional: true },
        { name: "embedding_model", type: "string", isOptional: true },
        { name: "usage", type: "string", isOptional: true },
        { name: "sources", type: "string", isOptional: true },
        { name: "response_duration", type: "number", isOptional: true },
        { name: "was_stopped", type: "boolean", isOptional: true },
        { name: "error", type: "string", isOptional: true },
        { name: "thought_process", type: "string", isOptional: true }, // JSON stringified ActivityPhase[]
        { name: "thinking", type: "string", isOptional: true }, // Reasoning/thinking content
      ],
    }),
    tableSchema({
      name: "conversations",
      columns: [
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "wallet_address", type: "string", isIndexed: true },
        { name: "title", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
        { name: "is_deleted", type: "boolean", isIndexed: true },
      ],
    }),
  ],
});

export const chatStorageMigrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "was_stopped", type: "boolean", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "error", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: "history",
          columns: [
            { name: "thought_process", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: "history",
          columns: [
            { name: "thinking", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        unsafeExecuteSql("DELETE FROM history;"),
        unsafeExecuteSql("DELETE FROM conversations;"),
        addColumns({
          table: "history",
          columns: [{ name: "wallet_address", type: "string", isIndexed: true }],
        }),
        addColumns({
          table: "conversations",
          columns: [{ name: "wallet_address", type: "string", isIndexed: true }],
        }),
      ],
    },
  ],
});
