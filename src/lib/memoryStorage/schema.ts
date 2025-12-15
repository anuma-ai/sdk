import { appSchema, tableSchema } from "@nozbe/watermelondb";

/**
 * WatermelonDB schema for memory storage
 *
 * Defines the memories table for storing extracted user memories
 * with support for vector embeddings for semantic search.
 */
export const memoryStorageSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "memories",
      columns: [
        // Memory type classification
        { name: "type", type: "string", isIndexed: true }, // 'identity' | 'preference' | 'project' | 'skill' | 'constraint'
        // Hierarchical key structure
        { name: "namespace", type: "string", isIndexed: true },
        { name: "key", type: "string", isIndexed: true },
        { name: "value", type: "string" },
        // Evidence and confidence
        { name: "raw_evidence", type: "string" },
        { name: "confidence", type: "number" },
        { name: "pii", type: "boolean", isIndexed: true },
        // Composite keys for efficient lookups
        { name: "composite_key", type: "string", isIndexed: true }, // namespace:key
        { name: "unique_key", type: "string", isIndexed: true }, // namespace:key:value
        // Timestamps
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        // Vector embeddings for semantic search
        { name: "embedding", type: "string", isOptional: true }, // JSON stringified number[]
        { name: "embedding_model", type: "string", isOptional: true },
        // Soft delete flag
        { name: "is_deleted", type: "boolean", isIndexed: true },
      ],
    }),
  ],
});
