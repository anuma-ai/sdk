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
import { ExtractionJob } from "./extractionJobs/models";
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
 * - v36: Added topics_extracted_at column to memory_vault — watermark of the last
 *   LLM topic-extraction pass, so the background topic worker re-extracts only
 *   memories edited since (updated_at > topics_extracted_at) instead of
 *   re-running the whole vault
 * - v37: Added superseded_by + superseded_at columns to memory_vault for
 *   write-time supersession — a changed fact retires the stale one (points at
 *   the newer memory) instead of both surviving; superseded rows are excluded
 *   from recall/dedup by default
 * - v38: Added topics_extracted_version column to memory_vault — the extraction
 *   logic version a memory was last stamped under. Bumping TOPICS_EXTRACTION_VERSION
 *   (new prompt/model) makes the worker re-extract every row whose stored version
 *   is behind, so topic-quality improvements propagate across the existing vault
 * - v39: Added last_observed_at column to memory_vault (C3) — a re-observation
 *   watermark stamped each time retain() merges into an existing fact, kept
 *   distinct from updated_at (which merges preserve). Lets profile synthesis
 *   weight facts by recency of reinforcement rather than last edit.
 * - v40: Added fact_type, archived_at, trust_tier columns to memory_vault for
 *   typed memory + decay + Tier-0 security. All nullable + plaintext, no
 *   backfill (null = legacy/untyped, active, un-screened — content is
 *   encrypted so in-migration classification is impossible; NULL = zero-risk,
 *   exact embedding_model precedent)
 * - v41: Added visibility, twin_opt_in, published_at, geohash columns to
 *   memory_vault for the People Nearby cross-user visibility axis. Visibility
 *   is TWO-tier (`private | public`); null — and any unrecognised value —
 *   reads as 'private', so nothing pre-existing is ever published without an
 *   explicit visibility write
 * - v42: Added topics, topics_updated_at columns to memory_vault so a memory's
 *   topics become the DURABLE record and `entity` / `memory_entity` become a
 *   device-local index over it. Those two tables never sync (entity ids are
 *   locally generated), so a restored device used to receive "curated" /
 *   "already extracted" flags on memories with zero topic links and the graph
 *   recall lane stayed dead. `topics` carries the names across devices;
 *   `topics_updated_at` is a SECOND timestamp because every topic writer pins
 *   `updated_at` on purpose (recall's recency multiplier) and both sync paths
 *   key on `updated_at`, so a topic-only change would neither upload nor merge
 * - v43: Added a (is_deleted, created_at) index to conversations. Every
 *   conversation list read filters is_deleted and orders by created_at DESC,
 *   which previously meant a temp B-tree sort of the whole live set on every
 *   read. Structural only — no column added, no data rewritten
 * - v44: Added origin column to history — provenance of a row, set by the
 *   producer that synthesised it (`tool_result` = the hidden
 *   `[Tool Execution Results]` message written from autoExecutedToolResults).
 *   The embedding sweep skips those rows: they are machine-readable API dumps
 *   that are never rendered, and chunking one cost 52 MB of vectors (620
 *   chunks) against 0.2 MB of content. A content-prefix test cannot do this
 *   job — `content` is `enc:v3:` ciphertext by the time the sweep reads it, so
 *   provenance has to be recorded at write time. Deliberately NOT encrypted:
 *   the sweep that must honour it runs with no wallet context, and an
 *   unreadable flag would fail open. Existing rows stay NULL (= legacy,
 *   unknown provenance, embedded as before) with no backfill, matching the v37
 *   read-time-fallback precedent
 * - v45: Added `media` to memory_vault — the photo(s) a server-extracted
 *   memory came from, as JSON `[{feed_item_id, object_key}]`. Null on every
 *   row that did not come from a photo, which is all of them before this
 *   migration ran
 * - v46: Added device-local memory_extraction_jobs outbox for restart-safe
 *   extraction. Additive (a single createTable, no backfill), so a v45 database
 *   upgrades cleanly. NOT reversible: WatermelonDB has no downgrade path, so
 *   rolling a release back past v46 after a device has run it resets that
 *   device's local database. Relevant to OTA, where a JS-only rollback can
 *   land on a database the newer build already migrated
 * - v47: Added failed_sessions, failed_head, failed_at to
 *   memory_extraction_jobs — the persisted poison count for a job's head batch
 *   (how many worker sessions it failed in, which batch that count belongs to,
 *   and when the last one was counted, so sessions minutes apart count once). Without it the retry
 *   budget was in memory and reset on every turn, so one batch that could never
 *   extract blocked its conversation's extraction forever. Additive, both
 *   nullable, no backfill: NULL reads as "never failed"
 */
export const SDK_SCHEMA_VERSION = 47;

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
    tableSchema({
      name: "memory_extraction_jobs",
      columns: [
        { name: "owner_key", type: "string", isIndexed: true },
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "scope", type: "string" },
        { name: "message_ids", type: "string" },
        { name: "watermark", type: "string", isOptional: true },
        { name: "watermark_seq", type: "number", isOptional: true },
        { name: "folder_id", type: "string", isOptional: true },
        { name: "failed_sessions", type: "number", isOptional: true },
        { name: "failed_head", type: "string", isOptional: true },
        { name: "failed_at", type: "number", isOptional: true },
      ],
    }),
    tableSchema({
      name: "history",
      columns: [
        { name: "message_id", type: "number" },
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "role", type: "string", isIndexed: true },
        { name: "content", type: "string" },
        { name: "model", type: "string", isOptional: true },
        { name: "image_model", type: "string", isOptional: true },
        { name: "files", type: "string", isOptional: true },
        { name: "file_ids", type: "string", isOptional: true },
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        { name: "vector", type: "string", isOptional: true },
        { name: "embedding_model", type: "string", isOptional: true },
        { name: "chunks", type: "string", isOptional: true },
        { name: "usage", type: "string", isOptional: true },
        { name: "sources", type: "string", isOptional: true },
        { name: "response_duration", type: "number", isOptional: true },
        { name: "was_stopped", type: "boolean", isOptional: true },
        { name: "error", type: "string", isOptional: true },
        { name: "thought_process", type: "string", isOptional: true },
        { name: "thinking", type: "string", isOptional: true },
        { name: "parent_message_id", type: "string", isOptional: true },
        { name: "feedback", type: "string", isOptional: true },
        { name: "tool_call_events", type: "string", isOptional: true },
        { name: "origin", type: "string", isOptional: true },
      ],
    }),
    tableSchema({
      name: "conversations",
      columns: [
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "title", type: "string" },
        { name: "project_id", type: "string", isOptional: true, isIndexed: true },
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        { name: "is_deleted", type: "boolean", isIndexed: true },
        { name: "pinned_at", type: "number", isOptional: true },
      ],
    }),
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
    tableSchema({
      name: "modelPreferences",
      columns: [
        { name: "wallet_address", type: "string", isIndexed: true },
        { name: "models", type: "string", isOptional: true },
      ],
    }),
    tableSchema({
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
        { name: "embedding_model", type: "string", isOptional: true },
        { name: "source_chunk_ids", type: "string", isOptional: true },
        { name: "proof_count", type: "number", isOptional: true },
        { name: "source", type: "string", isOptional: true },
        { name: "event_time_start", type: "number", isOptional: true, isIndexed: true },
        { name: "event_time_end", type: "number", isOptional: true },
        { name: "event_time_kind", type: "string", isOptional: true },
        { name: "topics_user_managed", type: "boolean", isOptional: true },
        { name: "topics", type: "string", isOptional: true },
        { name: "topics_updated_at", type: "number", isOptional: true },
        { name: "media", type: "string", isOptional: true },
        { name: "topics_extracted_at", type: "number", isOptional: true },
        { name: "superseded_by", type: "string", isOptional: true, isIndexed: true },
        { name: "superseded_at", type: "number", isOptional: true },
        { name: "topics_extracted_version", type: "number", isOptional: true },
        { name: "last_observed_at", type: "number", isOptional: true, isIndexed: true },
        { name: "fact_type", type: "string", isOptional: true, isIndexed: true },
        { name: "archived_at", type: "number", isOptional: true, isIndexed: true },
        { name: "trust_tier", type: "string", isOptional: true, isIndexed: true },
        { name: "visibility", type: "string", isOptional: true, isIndexed: true },
        { name: "twin_opt_in", type: "boolean", isOptional: true },
        { name: "published_at", type: "number", isOptional: true },
        { name: "geohash", type: "string", isOptional: true },
      ],
    }),
    tableSchema({
      name: "entity",
      columns: [
        { name: "canonical_name", type: "string", isIndexed: true },
        { name: "kind", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "memory_entity",
      columns: [
        { name: "memory_id", type: "string", isIndexed: true },
        { name: "entity_id", type: "string", isIndexed: true },
        { name: "user_id", type: "string", isOptional: true, isIndexed: true },
        { name: "created_at", type: "number" },
      ],
    }),
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
    tableSchema({
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
    tableSchema({
      name: "media",
      columns: [
        { name: "media_id", type: "string", isIndexed: true },
        { name: "wallet_address", type: "string", isIndexed: true },
        { name: "message_id", type: "string", isOptional: true, isIndexed: true },
        { name: "conversation_id", type: "string", isOptional: true, isIndexed: true },
        { name: "name", type: "string" },
        { name: "mime_type", type: "string", isIndexed: true },
        { name: "media_type", type: "string", isIndexed: true },
        { name: "size", type: "number" },
        { name: "role", type: "string", isIndexed: true },
        { name: "model", type: "string", isOptional: true, isIndexed: true },
        { name: "source_url", type: "string", isOptional: true },
        { name: "dimensions", type: "string", isOptional: true },
        { name: "duration", type: "number", isOptional: true },
        { name: "metadata", type: "string", isOptional: true },
        { name: "created_at", type: "number", isIndexed: true },
        { name: "updated_at", type: "number" },
        { name: "is_deleted", type: "boolean", isIndexed: true },
      ],
    }),
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
    tableSchema({
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
 * - v35 → v36: Added `topics_extracted_at` column to memory_vault (watermark for the background topic-extraction worker; null + existing links grandfathered as extracted)
 * - v36 → v37: Added `superseded_by` + `superseded_at` columns to memory_vault (write-time supersession; null = live, excluded from recall/dedup when set)
 * - v37 → v38: Added `topics_extracted_version` column to memory_vault (extraction-logic version; null read as 0 so a TOPICS_EXTRACTION_VERSION bump re-extracts stale rows)
 * - v38 → v39: Added `last_observed_at` column to memory_vault (C3 re-observation watermark; stamped on retain merge, distinct from updated_at)
 * - v39 → v40: Added `fact_type`, `archived_at`, `trust_tier` columns to memory_vault for typed memory + decay + Tier-0 security (all nullable + plaintext, NULL backfill)
 * - v40 → v41: Added `visibility`, `twin_opt_in`, `published_at`, `geohash` columns to memory_vault for the People Nearby cross-user visibility axis (two-tier `private | public`; null/unknown grandfathered as 'private')
 * - v41 → v42: Added `topics` + `topics_updated_at` columns to memory_vault, making a memory's topics the durable synced record and `entity`/`memory_entity` a device-local index over it (null `topics` = pre-v42, backfilled from the row's current links by the sweep)
 * - v42 → v43: Added a composite `(is_deleted, created_at)` index to conversations so the list reads stop temp-sorting (structural only, no data rewritten)
 * - v43 → v44: Added `origin` column to history recording which producer synthesised a row, so the embedding sweep can skip never-rendered tool-result dumps (plaintext by design — the sweep has no wallet context; null = legacy, embedded as before)
 */
export const sdkMigrations = schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "was_stopped", type: "boolean", isOptional: true }],
        }),
      ],
    },
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
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "error", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "thought_process", type: "string", isOptional: true }],
        }),
      ],
    },
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
    {
      toVersion: 8,
      steps: [
        unsafeExecuteSql("DELETE FROM history;"),
        unsafeExecuteSql("DELETE FROM conversations;"),
        unsafeExecuteSql("DELETE FROM memories;"),
      ],
    },
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "thinking", type: "string", isOptional: true }],
        }),
      ],
    },
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
    {
      toVersion: 11,
      steps: [
        createTable({
          name: "media",
          columns: [
            { name: "media_id", type: "string", isIndexed: true },
            { name: "wallet_address", type: "string", isIndexed: true },
            { name: "message_id", type: "string", isOptional: true, isIndexed: true },
            { name: "conversation_id", type: "string", isOptional: true, isIndexed: true },
            { name: "name", type: "string" },
            { name: "mime_type", type: "string", isIndexed: true },
            { name: "media_type", type: "string", isIndexed: true },
            { name: "size", type: "number" },
            { name: "role", type: "string", isIndexed: true },
            { name: "model", type: "string", isOptional: true, isIndexed: true },
            { name: "source_url", type: "string", isOptional: true },
            { name: "dimensions", type: "string", isOptional: true },
            { name: "duration", type: "number", isOptional: true },
            { name: "metadata", type: "string", isOptional: true },
            { name: "created_at", type: "number", isIndexed: true },
            { name: "updated_at", type: "number" },
            { name: "is_deleted", type: "boolean", isIndexed: true },
          ],
        }),
        addColumns({
          table: "history",
          columns: [{ name: "file_ids", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 12,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "chunks", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 13,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "parent_message_id", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 14,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "feedback", type: "string", isOptional: true }],
        }),
      ],
    },
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
    {
      toVersion: 17,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "image_model", type: "string", isOptional: true }],
        }),
      ],
    },
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
    {
      toVersion: 19,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "user_id", type: "string", isOptional: true, isIndexed: true }],
        }),
      ],
    },
    {
      toVersion: 20,
      steps: [
        unsafeExecuteSql(
          "CREATE INDEX IF NOT EXISTS memory_vault_updated_at ON memory_vault (updated_at);"
        ),
      ],
    },
    {
      toVersion: 21,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "embedding", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 22,
      steps: [
        addColumns({
          table: "vault_folders",
          columns: [{ name: "is_system", type: "boolean", isOptional: true }],
        }),
      ],
    },
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
    {
      toVersion: 24,
      steps: [
        addColumns({
          table: "vault_folders",
          columns: [{ name: "context", type: "string", isOptional: true }],
        }),
      ],
    },
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
    {
      toVersion: 27,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "tool_call_events", type: "string", isOptional: true }],
        }),
      ],
    },
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
    {
      toVersion: 32,
      steps: [
        addColumns({
          table: "conversations",
          columns: [{ name: "pinned_at", type: "number", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 33,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "embedding_model", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 34,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "topics_user_managed", type: "boolean", isOptional: true }],
        }),
      ],
    },
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
    {
      toVersion: 36,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "topics_extracted_at", type: "number", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 37,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [
            { name: "superseded_by", type: "string", isOptional: true, isIndexed: true },
            { name: "superseded_at", type: "number", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 38,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "topics_extracted_version", type: "number", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 39,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [
            { name: "last_observed_at", type: "number", isOptional: true, isIndexed: true },
          ],
        }),
      ],
    },
    {
      toVersion: 40,
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
    {
      toVersion: 41,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [
            { name: "visibility", type: "string", isOptional: true, isIndexed: true },
            { name: "twin_opt_in", type: "boolean", isOptional: true },
            { name: "published_at", type: "number", isOptional: true },
            { name: "geohash", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 42,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [
            { name: "topics", type: "string", isOptional: true },
            { name: "topics_updated_at", type: "number", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 43,
      steps: [
        unsafeExecuteSql(
          "CREATE INDEX IF NOT EXISTS conversations_is_deleted_created_at ON conversations (is_deleted, created_at);"
        ),
      ],
    },
    {
      toVersion: 44,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "origin", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 45,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "media", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 46,
      steps: [
        createTable({
          name: "memory_extraction_jobs",
          columns: [
            { name: "owner_key", type: "string", isIndexed: true },
            { name: "conversation_id", type: "string", isIndexed: true },
            { name: "scope", type: "string" },
            { name: "message_ids", type: "string" },
            { name: "watermark", type: "string", isOptional: true },
            { name: "watermark_seq", type: "number", isOptional: true },
            { name: "folder_id", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 47,
      steps: [
        addColumns({
          table: "memory_extraction_jobs",
          columns: [
            { name: "failed_sessions", type: "number", isOptional: true },
            { name: "failed_head", type: "string", isOptional: true },
            { name: "failed_at", type: "number", isOptional: true },
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
  ExtractionJob,
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
