import { appSchema, tableSchema } from "@nozbe/watermelondb";
import type Model from "@nozbe/watermelondb/Model";
import {
  addColumns,
  createTable,
  schemaMigrations,
  unsafeExecuteSql,
} from "@nozbe/watermelondb/Schema/migrations";
import type { Class } from "@nozbe/watermelondb/types";

import { AppFile } from "./appFiles/models";
import { Conversation, ConversationSummary, Message } from "./chat/models";
import { ConversationMemory } from "./conversationMemory/models";
import { Entity, MemoryEntity } from "./entities/models";
import { Media } from "./media/models";
import { VaultMemory } from "./memoryVault/models";
import { Project } from "./project/models";
import { SavedTool } from "./savedTools/models";
import { ModelPreference } from "./settings/models";
import { UserPreference } from "./userPreferences/models";
import { VaultFolder } from "./vaultFolders/models";

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
 * - v11: Added media table for library feature, added file_ids column to history table
 * - v12: Added chunks column to history table for sub-message semantic search
 * - v13: Added parent_message_id column to history table for message branching (edit/regenerate)
 * - v14: Added feedback column to history table for like/dislike on responses
 * - v15: Replaced memories table with memory_vault table for persistent memory vault
 * - v16: Added scope column to memory_vault table for memory partitioning
 * - v17: Added image_model column to history table for AI-generated image model tracking
 * - v18: Added vault_folders table and folder_id column to memory_vault for folder organization
 * - v19: Added user_id column to memory_vault for multi-user server-side scoping
 * - v20: Added index on updated_at column of memory_vault for efficient since-based filtering
 * - v21: Added embedding column to memory_vault for persisted embedding vectors
 * - v22: Added is_system column to vault_folders for default system folders
 * - v23: Added conversation_summaries table for progressive history summarization
 * - v24: Added context column to vault_folders for LLM-generated folder summaries
 * - v25: Added saved_tools table for user-saved display apps exposed as LLM tools
 * - v26: Added app_files table for LLM-generated app source files (HTML/CSS/JS)
 * - v27: Added tool_call_events column to history for reconstructing tool call history
 * - v28: Added source_chunk_ids, proof_count, source columns to memory_vault for auto-extraction provenance and supersession tracking
 * - v29: Added entity + memory_entity tables for the W5 knowledge-graph retrieval lane
 * - v30: Added event_time_start, event_time_end, event_time_kind columns to memory_vault for the W6 temporal retrieval lane
 * - v31: Added user_id column to memory_entity for multi-user server-side scoping of the W5 graph retrieval lane
 * - v32: Added pinned_at column to conversations for pinning chats to the top of the list
 * - v33: Added embedding_model column to memory_vault so stale-model vectors are
 *   detectable and re-embeddable after an embedding-model change (null = legacy
 *   rows, grandfathered as compatible with the current model)
 * - v34: Added topics_user_managed column to memory_vault so a memory whose
 *   entity links the user has taken manual control of is left alone by
 *   auto-extraction (null/false = auto-derived, the default)
 * - v35: Added conversation_memory table recording which vault memories a
 *   conversation drew on, so the conversation-level Memories panel survives reload
 * - v36: Added fact_type, archived_at, trust_tier columns to memory_vault for
 *   typed memory + decay + Tier-0 security. All nullable + plaintext, no
 *   backfill (null = legacy/untyped, active, un-screened — content is
 *   encrypted so in-migration classification is impossible; NULL = zero-risk,
 *   exact embedding_model precedent)
 */
export const SDK_SCHEMA_VERSION = 36;

/**
 * Combined WatermelonDB schema for all SDK storage modules.
 *
 * This unified schema includes all tables needed by the SDK:
 * - `history`: Chat message storage with embeddings and metadata
 * - `conversations`: Conversation metadata and organization
 * - `memory_vault`: Persistent memory vault for curated facts
 * - `modelPreferences`: User model preferences (deprecated, use userPreferences)
 * - `userPreferences`: Unified user preferences (profile, personality, models)
 *
 * @example
 * ```typescript
 * import { Database } from '@nozbe/watermelondb';
 * import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
 * import { sdkSchema, sdkMigrations, sdkModelClasses } from '@anuma/sdk/react';
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
        { name: "image_model", type: "string", isOptional: true }, // AI model used for image generation
        { name: "files", type: "string", isOptional: true }, // Deprecated: use file_ids with media table
        { name: "file_ids", type: "string", isOptional: true }, // JSON array of media_id references
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        { name: "vector", type: "string", isOptional: true },
        { name: "embedding_model", type: "string", isOptional: true },
        { name: "chunks", type: "string", isOptional: true }, // JSON stringified MessageChunk[]
        { name: "usage", type: "string", isOptional: true },
        { name: "sources", type: "string", isOptional: true },
        { name: "response_duration", type: "number", isOptional: true },
        { name: "was_stopped", type: "boolean", isOptional: true },
        { name: "error", type: "string", isOptional: true },
        { name: "thought_process", type: "string", isOptional: true }, // JSON stringified ActivityPhase[]
        { name: "thinking", type: "string", isOptional: true }, // Reasoning/thinking content
        { name: "parent_message_id", type: "string", isOptional: true }, // Parent message for branching
        { name: "feedback", type: "string", isOptional: true }, // 'like' | 'dislike' | null
        { name: "tool_call_events", type: "string", isOptional: true }, // JSON stringified LlmapiToolCallEvent[]
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
        { name: "pinned_at", type: "number", isOptional: true },
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
    // Memory vault storage
    tableSchema({
      name: "memory_vault",
      columns: [
        { name: "content", type: "string" },
        { name: "scope", type: "string", isIndexed: true },
        { name: "folder_id", type: "string", isOptional: true, isIndexed: true },
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number", isIndexed: true },
        { name: "is_deleted", type: "boolean", isIndexed: true },
        { name: "user_id", type: "string", isOptional: true, isIndexed: true },
        { name: "embedding", type: "string", isOptional: true },
        // Model that produced `embedding`. Null on legacy rows (grandfathered as
        // current-model-compatible). Lets recall detect stale-model vectors and
        // re-embed them after an embedding-model change instead of silently
        // ranking them at cosine 0.
        { name: "embedding_model", type: "string", isOptional: true },
        { name: "source_chunk_ids", type: "string", isOptional: true },
        { name: "proof_count", type: "number", isOptional: true },
        { name: "source", type: "string", isOptional: true },
        // W6 temporal lane — when the event in this memory occurred. point
        // (event_time_start set, end null), range (both set), ongoing
        // (start set, end null + kind='ongoing'), or none (both null).
        { name: "event_time_start", type: "number", isOptional: true, isIndexed: true },
        { name: "event_time_end", type: "number", isOptional: true },
        { name: "event_time_kind", type: "string", isOptional: true },
        // When true, the user has manually set this memory's topics (entity
        // links). Auto-extraction then leaves its links alone — the user owns
        // them. Null/false = topics are auto-derived (default).
        { name: "topics_user_managed", type: "boolean", isOptional: true },
        // Typed memory (PR1) — the extractor's FactType classification for
        // this fact (identity | preference | relationship | plan |
        // ongoing_context | constraint | other). Null on legacy/manual/untyped
        // rows. Plaintext + indexed so recall can filter by type without a
        // signature prompt.
        { name: "fact_type", type: "string", isOptional: true, isIndexed: true },
        // Decay archive state (PR2) — Unix ms when this memory was archived by
        // the decay sweep. Null = active. Indexed so the recall choke point can
        // exclude archived rows cheaply.
        { name: "archived_at", type: "number", isOptional: true, isIndexed: true },
        // Tier-0 security (PR3) — "quarantined" when the write-time injection
        // screen flagged this fact, else null/"trusted". Indexed so the recall
        // choke point can default-exclude quarantined rows.
        { name: "trust_tier", type: "string", isOptional: true, isIndexed: true },
      ],
    }),
    // Entity table — canonical names extracted from auto-extraction (W5).
    tableSchema({
      name: "entity",
      columns: [
        { name: "canonical_name", type: "string", isIndexed: true },
        { name: "kind", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    // Many-to-many join: which memories reference which entities.
    tableSchema({
      name: "memory_entity",
      columns: [
        { name: "memory_id", type: "string", isIndexed: true },
        { name: "entity_id", type: "string", isIndexed: true },
        { name: "user_id", type: "string", isOptional: true, isIndexed: true },
        { name: "created_at", type: "number" },
      ],
    }),
    // Vault folder organization
    tableSchema({
      name: "vault_folders",
      columns: [
        { name: "name", type: "string" },
        { name: "scope", type: "string" },
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        { name: "is_deleted", type: "boolean", isIndexed: true },
        { name: "is_system", type: "boolean", isOptional: true },
        { name: "context", type: "string", isOptional: true },
      ],
    }),
    // Conversation summary cache for progressive history summarization
    tableSchema({
      name: "conversation_summaries",
      columns: [
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "summary", type: "string" },
        { name: "summarized_up_to", type: "string" }, // uniqueId of last summarized message
        { name: "token_count", type: "number" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    // Media library storage (images, videos, audio, documents)
    tableSchema({
      name: "media",
      columns: [
        // Identity
        { name: "media_id", type: "string", isIndexed: true },
        { name: "wallet_address", type: "string", isIndexed: true },
        { name: "message_id", type: "string", isOptional: true, isIndexed: true },
        { name: "conversation_id", type: "string", isOptional: true, isIndexed: true },
        // Basic metadata
        { name: "name", type: "string" },
        { name: "mime_type", type: "string", isIndexed: true },
        { name: "media_type", type: "string", isIndexed: true }, // "image" | "video" | "audio" | "document"
        { name: "size", type: "number" },
        // Origin
        { name: "role", type: "string", isIndexed: true }, // "user" | "assistant"
        { name: "model", type: "string", isOptional: true, isIndexed: true }, // AI model used for generation
        // Original external URL for cached files (MCP R2, etc.)
        { name: "source_url", type: "string", isOptional: true },
        // Media-specific metadata
        { name: "dimensions", type: "string", isOptional: true }, // JSON: { width, height }
        { name: "duration", type: "number", isOptional: true }, // Video/audio duration in seconds
        { name: "metadata", type: "string", isOptional: true }, // JSON: additional metadata
        // Timestamps
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        // Soft delete
        { name: "is_deleted", type: "boolean", isIndexed: true },
      ],
    }),
    // ── App files ─────────────────────────────────────────────────────────
    tableSchema({
      name: "app_files",
      columns: [
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "path", type: "string" },
        { name: "content", type: "string" },
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
      ],
    }),
    // ── Saved tools ──────────────────────────────────────────────────────
    tableSchema({
      name: "saved_tools",
      columns: [
        { name: "name", type: "string" },
        { name: "display_name", type: "string" },
        { name: "description", type: "string" },
        { name: "parameters", type: "string" }, // JSON: Record<string, SavedToolParameter>
        { name: "html", type: "string" },
        { name: "conversation_id", type: "string", isOptional: true },
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        { name: "is_deleted", type: "boolean", isIndexed: true },
      ],
    }),
    // ── Conversation memories (panel persistence) ────────────────────────
    tableSchema({
      name: "conversation_memory",
      columns: [
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "memory_id", type: "string", isIndexed: true },
        { name: "score", type: "number" },
        { name: "created_at", type: "number", isIndexed: true },
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
 * - v10 → v11: Added `media` table for library feature, added `file_ids` column to history
 * - v11 → v12: Added `chunks` column to history table for sub-message semantic search
 * - v12 → v13: Added `parent_message_id` column to history table for message branching
 * - v13 → v14: Added `feedback` column to history table for like/dislike on responses
 * - v14 → v15: Replaced `memories` table with `memory_vault` table for persistent memory vault
 * - v15 → v16: Added `scope` column to memory_vault table for memory partitioning
 * - v16 → v17: Added `image_model` column to history table for AI-generated image model tracking
 * - v17 → v18: Added `vault_folders` table (with scope) and `folder_id` column to memory_vault for folder organization
 * - v18 → v19: Added `user_id` column to memory_vault for multi-user server-side scoping
 * - v19 → v20: Added index on `updated_at` column of memory_vault for efficient since-based filtering
 * - v20 → v21: Added `embedding` column to memory_vault for persisted embedding vectors
 * - v21 → v22: Added `is_system` column to vault_folders for default system folders
 * - v22 → v23: Added `conversation_summaries` table for progressive history summarization
 * - v23 → v24: Added `context` column to vault_folders for LLM-generated folder summaries
 * - v24 → v25: Added `saved_tools` table for user-saved display apps exposed as LLM tools
 * - v25 → v26: Added `app_files` table for LLM-generated app source files (HTML/CSS/JS)
 * - v26 → v27: Added `tool_call_events` column to history for reconstructing tool call history
 * - v27 → v28: Added `source_chunk_ids`, `proof_count`, `source` columns to memory_vault for auto-extraction provenance and supersession tracking
 * - v28 → v29: Added `entity` + `memory_entity` tables for W5 knowledge-graph retrieval lane
 * - v29 → v30: Added `event_time_start`, `event_time_end`, `event_time_kind` columns to memory_vault for W6 temporal retrieval lane
 * - v30 → v31: Added `user_id` column to memory_entity for multi-user scoping of the W5 graph lane (with backfill from memory_vault.user_id)
 * - v31 → v32: Added `pinned_at` column to conversations for pinning chats
 * - v32 → v33: Added `embedding_model` column to memory_vault (null grandfathered as current-model-compatible)
 * - v33 → v34: Added `topics_user_managed` column to memory_vault (null/false = auto-derived topics, the default)
 * - v34 → v35: Added `conversation_memory` table (conversation ↔ recalled memory ids)
 * - v35 → v36: Added `fact_type`, `archived_at`, `trust_tier` columns to memory_vault for typed memory + decay + Tier-0 security (all nullable + plaintext, NULL backfill)
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
          columns: [{ name: "thought_process", type: "string", isOptional: true }],
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
          columns: [{ name: "project_id", type: "string", isOptional: true, isIndexed: true }],
        }),
      ],
    },
    // v10 -> v11: Added media table for library feature and file_ids to history
    {
      toVersion: 11,
      steps: [
        createTable({
          name: "media",
          columns: [
            // Identity
            { name: "media_id", type: "string", isIndexed: true },
            { name: "wallet_address", type: "string", isIndexed: true },
            { name: "message_id", type: "string", isOptional: true, isIndexed: true },
            { name: "conversation_id", type: "string", isOptional: true, isIndexed: true },
            // Basic metadata
            { name: "name", type: "string" },
            { name: "mime_type", type: "string", isIndexed: true },
            { name: "media_type", type: "string", isIndexed: true },
            { name: "size", type: "number" },
            // Origin
            { name: "role", type: "string", isIndexed: true },
            { name: "model", type: "string", isOptional: true, isIndexed: true },
            // Original external URL for cached files (MCP R2, etc.)
            { name: "source_url", type: "string", isOptional: true },
            // Media-specific metadata
            { name: "dimensions", type: "string", isOptional: true },
            { name: "duration", type: "number", isOptional: true },
            { name: "metadata", type: "string", isOptional: true },
            // Timestamps
            { name: "created_at", type: "number", isIndexed: true },
            { name: "updated_at", type: "number" },
            // Soft delete
            { name: "is_deleted", type: "boolean", isIndexed: true },
          ],
        }),
        // Add file_ids column to history table for direct media lookup
        addColumns({
          table: "history",
          columns: [{ name: "file_ids", type: "string", isOptional: true }],
        }),
      ],
    },
    // v11 -> v12: Added chunks column to history for sub-message semantic search
    {
      toVersion: 12,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "chunks", type: "string", isOptional: true }],
        }),
      ],
    },
    // v12 -> v13: Added parent_message_id column for message branching (edit/regenerate)
    {
      toVersion: 13,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "parent_message_id", type: "string", isOptional: true }],
        }),
      ],
    },
    // v13 -> v14: Added feedback column to history for like/dislike on responses
    {
      toVersion: 14,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "feedback", type: "string", isOptional: true }],
        }),
      ],
    },
    // v14 -> v15: Replaced memories table with memory_vault table
    {
      toVersion: 15,
      steps: [
        unsafeExecuteSql("DROP TABLE IF EXISTS memories;"),
        createTable({
          name: "memory_vault",
          columns: [
            { name: "content", type: "string" },
            { name: "created_at", type: "number", isIndexed: true },
            { name: "updated_at", type: "number" },
            { name: "is_deleted", type: "boolean", isIndexed: true },
          ],
        }),
      ],
    },
    // v15 -> v16: Added scope column to memory_vault for memory partitioning
    {
      toVersion: 16,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "scope", type: "string", isIndexed: true }],
        }),
        unsafeExecuteSql(
          "UPDATE memory_vault SET scope = 'private' WHERE scope IS NULL OR scope = '';"
        ),
      ],
    },
    // v16 -> v17: Added image_model column to history for AI-generated image model tracking
    {
      toVersion: 17,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "image_model", type: "string", isOptional: true }],
        }),
      ],
    },
    // v17 -> v18: Added vault_folders table and folder_id to memory_vault
    {
      toVersion: 18,
      steps: [
        createTable({
          name: "vault_folders",
          columns: [
            { name: "name", type: "string" },
            { name: "scope", type: "string" },
            { name: "created_at", type: "number", isIndexed: true },
            { name: "updated_at", type: "number" },
            { name: "is_deleted", type: "boolean", isIndexed: true },
          ],
        }),
        addColumns({
          table: "memory_vault",
          columns: [{ name: "folder_id", type: "string", isOptional: true, isIndexed: true }],
        }),
      ],
    },
    // v18 -> v19: Added user_id column to memory_vault for multi-user server-side scoping
    {
      toVersion: 19,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "user_id", type: "string", isOptional: true, isIndexed: true }],
        }),
      ],
    },
    // v19 -> v20: Added index on updated_at for efficient since-based filtering
    {
      toVersion: 20,
      steps: [
        unsafeExecuteSql(
          "CREATE INDEX IF NOT EXISTS memory_vault_updated_at ON memory_vault (updated_at);"
        ),
      ],
    },
    // v20 -> v21: Added embedding column to memory_vault for persisted embedding vectors
    {
      toVersion: 21,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "embedding", type: "string", isOptional: true }],
        }),
      ],
    },
    // v21 -> v22: Added is_system column to vault_folders for default system folders
    {
      toVersion: 22,
      steps: [
        addColumns({
          table: "vault_folders",
          columns: [{ name: "is_system", type: "boolean", isOptional: true }],
        }),
      ],
    },
    // v22 -> v23: Added conversation_summaries table for progressive history summarization
    {
      toVersion: 23,
      steps: [
        createTable({
          name: "conversation_summaries",
          columns: [
            { name: "conversation_id", type: "string", isIndexed: true },
            { name: "summary", type: "string" },
            { name: "summarized_up_to", type: "string" },
            { name: "token_count", type: "number" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
      ],
    },
    // v23 -> v24: Added context column to vault_folders for LLM-generated folder summaries
    {
      toVersion: 24,
      steps: [
        addColumns({
          table: "vault_folders",
          columns: [{ name: "context", type: "string", isOptional: true }],
        }),
      ],
    },
    // v24 -> v25: Added saved_tools table for user-saved display apps exposed as LLM tools
    // NOTE: v25, v26, and v27 are applied together on first migration. They are separate
    // steps because they were developed sequentially (saved_tools first, then app_files, then tool_call_events).
    {
      toVersion: 25,
      steps: [
        createTable({
          name: "saved_tools",
          columns: [
            { name: "name", type: "string" },
            { name: "display_name", type: "string" },
            { name: "description", type: "string" },
            { name: "parameters", type: "string" },
            { name: "html", type: "string" },
            { name: "conversation_id", type: "string", isOptional: true },
            { name: "created_at", type: "number", isIndexed: true },
            { name: "updated_at", type: "number" },
            { name: "is_deleted", type: "boolean", isIndexed: true },
          ],
        }),
      ],
    },
    // v25 -> v26: Added app_files table for LLM-generated app source files
    {
      toVersion: 26,
      steps: [
        createTable({
          name: "app_files",
          columns: [
            { name: "conversation_id", type: "string", isIndexed: true },
            { name: "path", type: "string" },
            { name: "content", type: "string" },
            { name: "created_at", type: "number", isIndexed: true },
            { name: "updated_at", type: "number" },
          ],
        }),
      ],
    },
    // v26 -> v27: Added tool_call_events column to history for reconstructing tool call history
    {
      toVersion: 27,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "tool_call_events", type: "string", isOptional: true }],
        }),
      ],
    },
    // v27 -> v28: Added source_chunk_ids, proof_count, source columns to memory_vault for
    // auto-extraction provenance (which conversation message(s) produced the memory) and
    // supersession tracking (how many times this fact has been re-observed).
    {
      toVersion: 28,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [
            { name: "source_chunk_ids", type: "string", isOptional: true },
            { name: "proof_count", type: "number", isOptional: true },
            { name: "source", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    // v28 -> v29: Added entity + memory_entity tables for the W5 knowledge-graph
    // retrieval lane. Auto-extraction populates these on the write path; the
    // ranker uses them to surface topically-related memories that pure semantic
    // search misses (composite-query lift).
    {
      toVersion: 29,
      steps: [
        createTable({
          name: "entity",
          columns: [
            { name: "canonical_name", type: "string", isIndexed: true },
            { name: "kind", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "memory_entity",
          columns: [
            { name: "memory_id", type: "string", isIndexed: true },
            { name: "entity_id", type: "string", isIndexed: true },
            { name: "created_at", type: "number" },
          ],
        }),
      ],
    },
    // v29 -> v30: Added event_time_start, event_time_end, event_time_kind
    // columns to memory_vault for the W6 temporal retrieval lane. Auto-
    // extraction emits resolved event times; the ranker uses them to filter
    // and boost memories whose event-time overlaps the query's resolved time
    // window, RRF-fused alongside semantic + BM25 + graph.
    {
      toVersion: 30,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [
            { name: "event_time_start", type: "number", isOptional: true, isIndexed: true },
            { name: "event_time_end", type: "number", isOptional: true },
            { name: "event_time_kind", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    // v30 -> v31: Added user_id to memory_entity so the W5 graph lane is
    // scoped per user in multi-user server deployments. Backfills user_id
    // on pre-v31 rows from the parent memory_vault row so existing links
    // don't vanish from user-scoped queries.
    {
      toVersion: 31,
      steps: [
        addColumns({
          table: "memory_entity",
          columns: [{ name: "user_id", type: "string", isOptional: true, isIndexed: true }],
        }),
        unsafeExecuteSql(
          `UPDATE memory_entity SET user_id = (SELECT user_id FROM memory_vault WHERE memory_vault.id = memory_entity.memory_id) WHERE user_id IS NULL;`
        ),
      ],
    },
    // v31 -> v32: Added pinned_at to conversations for pinning chats
    {
      toVersion: 32,
      steps: [
        addColumns({
          table: "conversations",
          columns: [{ name: "pinned_at", type: "number", isOptional: true }],
        }),
      ],
    },
    // v32 -> v33: Added embedding_model to memory_vault. Existing rows keep
    // embedding_model NULL — they were embedded with the current model, so
    // recall grandfathers NULL as compatible (no mass re-embed on upgrade).
    {
      toVersion: 33,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "embedding_model", type: "string", isOptional: true }],
        }),
      ],
    },
    // v33 -> v34: user-managed topics. `topics_user_managed` marks a memory
    // whose entity links the user has taken manual control of, so
    // auto-extraction stops touching them.
    {
      toVersion: 34,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "topics_user_managed", type: "boolean", isOptional: true }],
        }),
      ],
    },
    // v34 -> v35: conversation_memory table. Records which vault memories a
    // conversation drew on (ids + score only) so the conversation-level Memories
    // panel survives reload. Additive create — no existing data touched.
    {
      toVersion: 35,
      steps: [
        createTable({
          name: "conversation_memory",
          columns: [
            { name: "conversation_id", type: "string", isIndexed: true },
            { name: "memory_id", type: "string", isIndexed: true },
            { name: "score", type: "number" },
            { name: "created_at", type: "number", isIndexed: true },
          ],
        }),
      ],
    },
    // v35 -> v36: typed memory + decay + Tier-0 security foundation.
    //   - fact_type: the extractor's FactType classification (was computed
    //     then discarded; now persisted).
    //   - archived_at: decay archive state (set by the PR2 sweep).
    //   - trust_tier: injection-screen verdict (set by the PR3 write screen).
    // All nullable + plaintext, no backfill — existing rows keep NULL
    // (legacy/untyped, active, un-screened). Content is encrypted, so
    // in-migration classification is impossible; NULL = zero data rewrite =
    // zero risk on LokiJS + SQLite (exact embedding_model precedent).
    {
      toVersion: 36,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [
            { name: "fact_type", type: "string", isOptional: true, isIndexed: true },
            { name: "archived_at", type: "number", isOptional: true, isIndexed: true },
            { name: "trust_tier", type: "string", isOptional: true, isIndexed: true },
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
 * import { sdkSchema, sdkMigrations, sdkModelClasses } from '@anuma/sdk/react';
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
  ConversationSummary,
  Project,
  VaultMemory,
  VaultFolder,
  Entity,
  MemoryEntity,
  Media,
  ModelPreference,
  UserPreference,
  SavedTool,
  AppFile,
  ConversationMemory,
];
