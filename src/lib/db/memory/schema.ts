import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const memoryStorageSchema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: "memories",
      columns: [
        { name: "text", type: "string" },
        { name: "conversation_id", type: "string", isOptional: true, isIndexed: true },
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        { name: "embedding", type: "string", isOptional: true },
        { name: "embedding_model", type: "string", isOptional: true },
        { name: "is_deleted", type: "boolean", isIndexed: true },
      ],
    }),
  ],
});
