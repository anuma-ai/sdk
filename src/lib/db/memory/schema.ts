import { appSchema, tableSchema } from "@nozbe/watermelondb";
import { schemaMigrations, addColumns } from "@nozbe/watermelondb/Schema/migrations";

export const memoryStorageSchema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: "memories",
      columns: [
        { name: "type", type: "string", isIndexed: true },
        { name: "namespace", type: "string", isIndexed: true },
        { name: "key", type: "string", isIndexed: true },
        { name: "value", type: "string" },
        { name: "raw_evidence", type: "string" },
        { name: "confidence", type: "number" },
        { name: "pii", type: "boolean", isIndexed: true },
        { name: "composite_key", type: "string", isIndexed: true },
        { name: "unique_key", type: "string", isIndexed: true },
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        { name: "accessed_at", type: "number", isIndexed: true },
        { name: "embedding", type: "string", isOptional: true },
        { name: "embedding_model", type: "string", isOptional: true },
        { name: "is_deleted", type: "boolean", isIndexed: true },
        { name: "supersedes", type: "string", isOptional: true, isIndexed: true },
        { name: "previous_value", type: "string", isOptional: true },
      ],
    }),
  ],
});

export const memoryStorageMigrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: "memories",
          columns: [
            { name: "accessed_at", type: "number" },
            { name: "supersedes", type: "string", isOptional: true },
            { name: "previous_value", type: "string", isOptional: true },
          ],
        }),
      ],
    },
  ],
});
