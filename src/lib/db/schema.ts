import { appSchema, tableSchema } from "@nozbe/watermelondb";
import {
  schemaMigrations,
  addColumns,
  createTable,
  unsafeExecuteSql,
} from "@nozbe/watermelondb/Schema/migrations";
import type Model from "@nozbe/watermelondb/Model";
import type { Class } from "@nozbe/watermelondb/types";
import { Message, Conversation } from "./chat/models";
import { Project } from "./project/models";
import { Memory } from "./memory/models";
import { ModelPreference } from "./settings/models";
import { UserPreference } from "./userPreferences/models";

/**
 * Current combined schema version for all SDK storage modules.
 *
 * Version history:
 * - v2: Baseline (chat + memory tables) - minimum supported version for migrations
 * - v3: Added was_stopped column to history table
 * - v4: Added modelPreferences table for settings storage
 * - v5: Added error column to history table for error persistence
 * - v6: Added thought_process column to history table for activity tracking
 * - v7: Added userPreferences table for unified user settings storage
 * - v8: BREAKING - Clear all data (switching embedding model from OpenAI to Fireworks)
 * - v9: Added thinking column to history table for reasoning/thinking content
 * - v10: Added projects table and project_id column to conversations table
 */
const SDK_SCHEMA_VERSION = 10;

/**
 * Combined WatermelonDB schema for all SDK storage modules.
 *
 * This unified schema includes all tables needed by the SDK:
 * - `history`: Chat message storage with embeddings and metadata
 * - `conversations`: Conversation metadata and organization
 * - `memories`: Persistent memory storage with semantic search
 * - `modelPreferences`: User model preferences (deprecated, use userPreferences)
 * - `userPreferences`: Unified user preferences (profile, personality, models)
 *
 * @example
 * ```typescript
 * import { Database } from '@nozbe/watermelondb';
 * import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
 * import { sdkSchema, sdkMigrations, sdkModelClasses } from '@reverbia/sdk/react';
 *
 * const adapter = new LokiJSAdapter({
 *   schema: sdkSchema,
 *   migrations: sdkMigrations,
 *   dbName: 'my-app-db',
 *   useWebWorker: false,
 *   useIncrementalIndexedDB: true,
 * });
 *
 * const database = new Database({
 *   adapter,
 *   modelClasses: sdkModelClasses,
 * });
 * ```
 */
export const sdkSchema = appSchema({
  version: SDK_SCHEMA_VERSION,
  tables: [
    // Chat storage tables
    tableSchema({
      name: "history",
      columns: [
        { name: "message_id", type: "number" },
        { name: "conversation_id", type: "string", isIndexed: true },
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
        { name: "title", type: "string" },
        { name: "project_id", type: "string", isOptional: true, isIndexed: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
        { name: "is_deleted", type: "boolean", isIndexed: true },
      ],
    }),
    // Project storage table
    tableSchema({
      name: "projects",
      columns: [
        { name: "project_id", type: "string", isIndexed: true },
        { name: "name", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
        { name: "is_deleted", type: "boolean", isIndexed: true },
      ],
    }),
    // Memory storage tables
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
        { name: "embedding", type: "string", isOptional: true },
        { name: "embedding_model", type: "string", isOptional: true },
        { name: "is_deleted", type: "boolean", isIndexed: true },
      ],
    }),
    // Settings storage tables (deprecated - use userPreferences)
    tableSchema({
      name: "modelPreferences",
      columns: [
        { name: "wallet_address", type: "string", isIndexed: true },
        { name: "models", type: "string", isOptional: true },
      ],
    }),
    // Unified user preferences storage
    tableSchema({
      name: "userPreferences",
      columns: [
        // Identity
        { name: "wallet_address", type: "string", isIndexed: true },
        // Profile fields (top-level for queryability)
        { name: "nickname", type: "string", isOptional: true },
        { name: "occupation", type: "string", isOptional: true },
        { name: "description", type: "string", isOptional: true },
        // Model preferences (JSON - flexible for model ordering)
        { name: "models", type: "string", isOptional: true },
        // Personality settings (JSON - sliders, style, custom instructions)
        { name: "personality", type: "string", isOptional: true },
        // Timestamps
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});

/**
 * Combined migrations for all SDK storage modules.
 *
 * These migrations handle database schema upgrades from any previous version
 * to the current version. The SDK manages all migration logic internally,
 * so consumer apps don't need to handle version arithmetic or migration merging.
 *
 * **Minimum supported version: v2**
 * Migrations from v1 are not supported. Databases at v1 require a fresh install.
 *
 * Migration history:
 * - v2 → v3: Added `was_stopped` column to history table
 * - v3 → v4: Added `modelPreferences` table for settings storage
 * - v4 → v5: Added `error` column to history table for error persistence
 * - v5 → v6: Added `thought_process` column to history table for activity tracking
 * - v6 → v7: Added `userPreferences` table for unified user settings storage
 * - v7 → v8: BREAKING - Clear all data (embedding model change)
 * - v8 → v9: Added `thinking` column to history table for reasoning/thinking content
 * - v9 → v10: Added `projects` table and `project_id` column to conversations
 */
export const sdkMigrations = schemaMigrations({
  migrations: [
    // v2 -> v3: Added was_stopped column to history
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "was_stopped", type: "boolean", isOptional: true }],
        }),
      ],
    },
    // v3 -> v4: Added settings storage (modelPreferences table)
    {
      toVersion: 4,
      steps: [
        createTable({
          name: "modelPreferences",
          columns: [
            { name: "wallet_address", type: "string", isIndexed: true },
            { name: "models", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    // v4 -> v5: Added error column to history for error persistence
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "error", type: "string", isOptional: true }],
        }),
      ],
    },
    // v5 -> v6: Added thought_process column to history table
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: "history",
          columns: [
            { name: "thought_process", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    // v6 -> v7: Added userPreferences table for unified user settings
    {
      toVersion: 7,
      steps: [
        createTable({
          name: "userPreferences",
          columns: [
            { name: "wallet_address", type: "string", isIndexed: true },
            { name: "nickname", type: "string", isOptional: true },
            { name: "occupation", type: "string", isOptional: true },
            { name: "description", type: "string", isOptional: true },
            { name: "models", type: "string", isOptional: true },
            { name: "personality", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
      ],
    },
    // v7 -> v8: BREAKING - Clear all data due to embedding model change
    // Switching from OpenAI text-embedding-3-small to Fireworks qwen3-embedding-8b
    // Old embeddings are incompatible, so we clear all chat and memory data
    {
      toVersion: 8,
      steps: [
        unsafeExecuteSql("DELETE FROM history;"),
        unsafeExecuteSql("DELETE FROM conversations;"),
        unsafeExecuteSql("DELETE FROM memories;"),
      ],
    },
    // v8 -> v9: Added thinking column to history for reasoning/thinking content
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "thinking", type: "string", isOptional: true }],
        }),
      ],
    },
    // v9 -> v10: Added projects table and project_id to conversations
    {
      toVersion: 10,
      steps: [
        createTable({
          name: "projects",
          columns: [
            { name: "project_id", type: "string", isIndexed: true },
            { name: "name", type: "string" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
            { name: "is_deleted", type: "boolean", isIndexed: true },
          ],
        }),
        addColumns({
          table: "conversations",
          columns: [
            { name: "project_id", type: "string", isOptional: true, isIndexed: true },
          ],
        }),
      ],
    },
  ],
});

/**
 * Model classes to register with the WatermelonDB database.
 *
 * Pass this array directly to the `modelClasses` option when creating
 * your Database instance.
 *
 * @example
 * ```typescript
 * import { Database } from '@nozbe/watermelondb';
 * import { sdkSchema, sdkMigrations, sdkModelClasses } from '@reverbia/sdk/react';
 *
 * const database = new Database({
 *   adapter,
 *   modelClasses: sdkModelClasses,
 * });
 * ```
 */
export const sdkModelClasses: Class<Model>[] = [
  Message,
  Conversation,
  Project,
  Memory,
  ModelPreference,
  UserPreference,
];
