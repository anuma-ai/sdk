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
 * - v46: Added facet_key, facet_value columns to memory_vault recording a
 *   memory's facet slot and value. `facet_key` (indexed) is the closed
 *   `"<factType>:self:<slot>"` shape of a single-valued SELF standing attribute
 *   (e.g. `preference:self:ui_theme`); `facet_value` is the normalized current
 *   value token (e.g. `dark`/`light`). Stamped by retain() on rows it CREATES,
 *   for consumers that want a memory's slot+value. They do NOT drive dedup:
 *   every write is deduped by semantic search + the decide model. Both nullable,
 *   no backfill (null = no facet recorded).
 *   TODO(privacy): both columns are PLAINTEXT for now (TEST). `facet_value`
 *   leaks the actual value ("vegan","sf") in cleartext, defeating content
 *   encryption; `facet_key` leaks the slot shape like `fact_type`. Encrypt (or
 *   otherwise protect) facet_value before ship — needs privacy sign-off.
 */
export const SDK_SCHEMA_VERSION = 46;

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
        { name: "origin", type: "string", isOptional: true }, // MessageOrigin — provenance, NOT encrypted (see v44)
      ],
    }),
    tableSchema({
      name: "conversations",
      columns: [
        { name: "conversation_id", type: "string", isIndexed: true },
        { name: "title", type: "string" },
        { name: "project_id", type: "string", isOptional: true, isIndexed: true },
        // Indexed to match every other list-sorted created_at in this schema.
        // Note this single-column index is NOT what makes the conversation list
        // reads fast on native SQLite — they all filter is_deleted as well, and
        // SQLite will not combine the two indexes, so the composite created by
        // the v42 migration is what its planner actually uses. This declaration
        // still earns its keep on the other two adapters: LokiJS builds its
        // binary indices from `isIndexed` (and ignores `sql` migration steps
        // outright), and Postgres gathers statistics via autovacuum, so its
        // planner can use a single-column index the SQLite planner skips.
        { name: "created_at", type: "number", isIndexed: true },
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
        // The memory's topics as a DURABLE, SYNCED record: a JSON array of
        // `{name, kind?, source}`, `name` in the caller's display casing (unlike
        // `entity.canonical_name`, which is lowercased and has no display
        // column). `entity` / `memory_entity` are a device-local INDEX over this
        // — their ids are locally generated, so they can never sync — and a
        // restored device rebuilds them from these names with no LLM call.
        // Null = predates v42 (backfilled from the row's current links by the
        // sweep's topicsBackfill bucket). See getMemoriesNeedingTopicExtractionOp.
        { name: "topics", type: "string", isOptional: true },
        // Unix ms of the last write to `topics`. A SECOND timestamp is required:
        // every topic writer deliberately pins `updated_at` so a topic change
        // doesn't inflate recall's recency multiplier, and both client sync
        // paths key on `updated_at` — so without this a topic-only change would
        // neither upload nor merge. Null = `topics` never written.
        { name: "topics_updated_at", type: "number", isOptional: true },
        // The photo(s) a SERVER-EXTRACTED memory was read out of, as a JSON
        // array of `{feed_item_id, object_key}` — exactly what
        // GET /api/memories/published returns in `media[]`. Enough to render the
        // source image without a second round-trip per memory.
        //
        // A JSON column rather than a join table: nothing on the client ever
        // queries BY photo (the only direction is memory -> render its image),
        // so a table would add a sync lane and a local-id space to serve a
        // question nobody asks. `topics` and `source_chunk_ids` set the
        // precedent for a list that is only ever read back whole. Null on
        // anything not extracted from a photo.
        { name: "media", type: "string", isOptional: true },
        // Unix ms of the last LLM topic-extraction pass over this memory's
        // content. Null = never extracted standalone (legacy rows with entity
        // links are grandfathered — see getMemoriesNeedingTopicExtractionOp).
        //
        // DEPRECATED (v42) — `topics_updated_at` subsumes this and
        // `topics_extracted_version` both: null there means never processed, and
        // non-null with an empty `topics` means processed and found nothing
        // (today's "answered empty" case), while a release-time
        // EXTRACTOR_CHANGED_AT constant compared against `topics_updated_at`
        // replaces the version check. Both columns are kept only to avoid a
        // column-drop migration in an otherwise additive list; removing them is
        // a follow-up once `topics` is proven in production.
        { name: "topics_extracted_at", type: "number", isOptional: true },
        // Write-time supersession (A2). When set, this fact was replaced by a
        // newer, incompatible-value fact (e.g. "Lives in Portland" superseded by
        // "Lives in SF"); `superseded_by` points at the newer memory's id and
        // `superseded_at` is the Unix ms it happened. Superseded rows stay in
        // the table (history / read-time fallback) but are excluded from recall
        // and dedup by default. Null = live (not superseded). Indexed so the
        // recall filter stays cheap.
        { name: "superseded_by", type: "string", isOptional: true, isIndexed: true },
        { name: "superseded_at", type: "number", isOptional: true },
        // The extraction-logic version this memory was last stamped under. Null
        // (pre-v38) is treated as version 0, so a bump of TOPICS_EXTRACTION_VERSION
        // re-extracts stale rows. See getMemoriesNeedingTopicExtractionOp.
        //
        // DEPRECATED (v42) alongside `topics_extracted_at` — same rationale and
        // same removal follow-up; see that column's note above.
        { name: "topics_extracted_version", type: "number", isOptional: true },
        // Re-observation watermark (C3). Unix ms of the last time retain() merged
        // a duplicate observation into this fact (proof_count++). Distinct from
        // updated_at, which merges deliberately preserve (preserveUpdatedAt) so a
        // re-observation doesn't reorder the vault by edit time. Null = never
        // re-observed since the column was added. Indexed so recency-weighted
        // synthesis can filter/sort on it cheaply.
        { name: "last_observed_at", type: "number", isOptional: true, isIndexed: true },
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
        // People Nearby cross-user visibility axis — ORTHOGONAL to `scope`
        // (which partitions by MODEL access: private vs shared providers).
        // TWO tiers: 'private' (or null, or any unrecognised value —
        // grandfathered / fail-safe) = local-only; 'public' = embedding +
        // plaintext may be published (matching/profile/discovery/twin).
        // The server index is the authority for what IS published; this
        // column records the user's intent.
        { name: "visibility", type: "string", isOptional: true, isIndexed: true },
        // When true, the owner opted this memory into their own digital twin
        // even if it is otherwise private (twin-scoped upload only — never
        // indexed for matching, never displayed). Null/false = follows visibility.
        { name: "twin_opt_in", type: "boolean", isOptional: true },
        // Unix ms when visibility last became non-private. Null when private
        // (cleared on revoke) — the publish reconciler uses it to diff local
        // intent against the server index.
        { name: "published_at", type: "number", isOptional: true },
        // Reserved geo slot (coarse geohash) for landmark/Trail memories.
        // Unused at launch; populated by location-tagged memory sources.
        { name: "geohash", type: "string", isOptional: true },
        // Facet slot+value (v43). `facet_key` is the closed
        // `"<factType>:self:<slot>"` shape of a single-valued SELF standing
        // attribute (e.g. `preference:self:ui_theme`); `facet_value` is the
        // normalized current value token (e.g. `dark`/`light`). Indexed so a
        // same-slot lookup stays cheap for consumers that want it. Stamped on
        // create only; dedup is decided by semantic search + the decide model,
        // NOT by these columns. Null = no facet recorded.
        //
        // TODO(privacy): both columns are PLAINTEXT for now (TEST). `facet_value`
        // leaks the actual value ("vegan","sf") in cleartext, defeating content
        // encryption — encrypt/protect before ship; `facet_key` leaks the slot
        // shape like `fact_type`. Both need privacy sign-off before ship.
        { name: "facet_key", type: "string", isOptional: true, isIndexed: true },
        { name: "facet_value", type: "string", isOptional: true },
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
 * - v35 → v36: Added `topics_extracted_at` column to memory_vault (watermark for the background topic-extraction worker; null + existing links grandfathered as extracted)
 * - v36 → v37: Added `superseded_by` + `superseded_at` columns to memory_vault (write-time supersession; null = live, excluded from recall/dedup when set)
 * - v37 → v38: Added `topics_extracted_version` column to memory_vault (extraction-logic version; null read as 0 so a TOPICS_EXTRACTION_VERSION bump re-extracts stale rows)
 * - v38 → v39: Added `last_observed_at` column to memory_vault (C3 re-observation watermark; stamped on retain merge, distinct from updated_at)
 * - v39 → v40: Added `fact_type`, `archived_at`, `trust_tier` columns to memory_vault for typed memory + decay + Tier-0 security (all nullable + plaintext, NULL backfill)
 * - v40 → v41: Added `visibility`, `twin_opt_in`, `published_at`, `geohash` columns to memory_vault for the People Nearby cross-user visibility axis (two-tier `private | public`; null/unknown grandfathered as 'private')
 * - v41 → v42: Added `topics` + `topics_updated_at` columns to memory_vault, making a memory's topics the durable synced record and `entity`/`memory_entity` a device-local index over it (null `topics` = pre-v42, backfilled from the row's current links by the sweep)
 * - v42 → v43: Added a composite `(is_deleted, created_at)` index to conversations so the list reads stop temp-sorting (structural only, no data rewritten)
 * - v43 → v44: Added `origin` column to history recording which producer synthesised a row, so the embedding sweep can skip never-rendered tool-result dumps (plaintext by design — the sweep has no wallet context; null = legacy, embedded as before)
 * - v45 → v46: Added `facet_key` (indexed) + `facet_value` columns to memory_vault recording a memory's facet slot+value, stamped by retain() on create for other consumers (they do NOT drive dedup — semantic search + the decide model does). All nullable, NO backfill — existing rows keep both NULL (= no facet recorded). Both PLAINTEXT (TEST) and need privacy sign-off before ship — see the column note and SDK_SCHEMA_VERSION doc.
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
    // v35 -> v36: topics_extracted_at watermark on memory_vault. Existing rows
    // keep it NULL — rows that already have entity links are grandfathered as
    // extracted (no mass re-extraction on upgrade), rows without links are the
    // backfill target. See getMemoriesNeedingTopicExtractionOp.
    {
      toVersion: 36,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "topics_extracted_at", type: "number", isOptional: true }],
        }),
      ],
    },
    // v36 -> v37: write-time supersession columns on memory_vault. Existing rows
    // keep both NULL (= live / not superseded), so no backfill — legacy
    // contradictory rows are handled by the read-time supersession fallback.
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
    // v37 -> v38: topics_extracted_version on memory_vault. Existing rows keep it
    // NULL, read as version 0 by getMemoriesNeedingTopicExtractionOp — so the
    // first sweep after a TOPICS_EXTRACTION_VERSION bump re-extracts them (drained
    // across sweeps by the worker's limit). See topicExtract.ts.
    {
      toVersion: 38,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "topics_extracted_version", type: "number", isOptional: true }],
        }),
      ],
    },
    // v38 -> v39: re-observation watermark on memory_vault (C3). Existing rows
    // keep NULL (= never re-observed since the column was added); synthesis
    // treats NULL as "fall back to updated_at" so no backfill is needed.
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
    // v39 -> v40: typed memory + decay + Tier-0 security foundation.
    //   - fact_type: the extractor's FactType classification (was computed
    //     then discarded; now persisted).
    //   - archived_at: decay archive state (set by the PR2 sweep).
    //   - trust_tier: injection-screen verdict (set by the PR3 write screen).
    // All nullable + plaintext, no backfill — existing rows keep NULL
    // (legacy/untyped, active, un-screened). Content is encrypted, so
    // in-migration classification is impossible; NULL = zero data rewrite =
    // zero risk on LokiJS + SQLite (exact embedding_model precedent).
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
    // v40 -> v41: People Nearby visibility axis on memory_vault. Existing rows
    // keep visibility NULL — read as 'private' (nothing pre-existing is ever
    // published without an explicit user action; the consent posture requires
    // opt-in, never a retroactive default).
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
    // v41 -> v42: topics + topics_updated_at on memory_vault — the durable,
    // synced record of a memory's topics. Existing rows keep both NULL: the
    // sweep's topicsBackfill bucket fills them from each row's current entity
    // links (no LLM), capped under the worker's `limit` so the one-time
    // re-upload it triggers drains across sweeps instead of spiking.
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
    // v42 -> v43: Give the conversation list reads an index they can actually
    // sort on. All five of them (getConversationsOp, getConversationsLazyOp,
    // getConversationsByProjectOp, getConversationsByProjectLazyOp and the
    // keyset getConversationsPageOp) emit `where is_deleted is 0 ... order by
    // created_at desc`, so before this they resolved is_deleted through its
    // index and then built a temp B-tree over every live row just to return
    // the newest page.
    //
    // The index is COMPOSITE, and that is the whole point — a bare index on
    // created_at does not fix this. SQLite will not combine two single-column
    // indexes here, so with `is_deleted` indexed and `created_at` indexed
    // separately it still picks conversations_is_deleted and still temp-sorts.
    // It only prefers a lone created_at index once ANALYZE has populated
    // sqlite_stat1, and nothing ever runs ANALYZE: not WatermelonDB, not its
    // native SQLite bindings, not this SDK. Every device is permanently in the
    // no-statistics state, so the index has to satisfy the filter and the sort
    // in one structure. `(is_deleted, created_at)` does: equality on the
    // leading column, ordered scan on the second, and the keyset boundary
    // becomes a range seek on the same index.
    //
    // unsafeExecuteSql, not addColumns: both columns already exist and
    // WatermelonDB has no add-index migration step, so raw SQL is the only way
    // to build one in place (same shape as the v19 -> v20 memory_vault
    // migration). IF NOT EXISTS keeps the step idempotent.
    //
    // Two limits worth knowing before someone re-measures this and finds it
    // missing. First, the LokiJS (web) adapter discards `sql` steps entirely,
    // so existing browser databases gain nothing — web's only lever is the
    // `isIndexed` flag on the column itself. Second, this index reaches
    // MIGRATED databases only: WatermelonDB builds a fresh database purely from
    // the encoded schema, and its schema format cannot express a composite
    // index. The one hook that could (`unsafeSql` on the table) is a function,
    // and the LokiJS adapter posts the schema to its worker, so attaching it
    // makes the whole schema fail structuredClone and takes the database down
    // at setup for anyone on `useWebWorker: true`. Not worth it for an index.
    {
      toVersion: 43,
      steps: [
        unsafeExecuteSql(
          "CREATE INDEX IF NOT EXISTS conversations_is_deleted_created_at ON conversations (is_deleted, created_at);"
        ),
      ],
    },
    // v43 -> v44: Added origin column to history — the provenance tag the embedding
    // sweep reads to skip never-rendered tool-result rows. No backfill: NULL means
    // "legacy, provenance unknown" and keeps the pre-v44 behaviour of embedding the
    // row, so the only rows that stop being embedded are ones a v44+ producer tagged.
    {
      toVersion: 44,
      steps: [
        addColumns({
          table: "history",
          columns: [{ name: "origin", type: "string", isOptional: true }],
        }),
      ],
    },
    // v44 -> v45: `media` on memory_vault — the photo(s) a server-extracted
    // memory was read out of, as JSON `[{feed_item_id, object_key}]`, mirroring
    // the `media[]` that GET /api/memories/published already returns. Existing
    // rows keep NULL, which is the correct value for every memory that did not
    // come from a photo (i.e. all of them until photo ingest runs).
    {
      toVersion: 45,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [{ name: "media", type: "string", isOptional: true }],
        }),
      ],
    },
    // v45 -> v46: facet_key (indexed) + facet_value on memory_vault, recording a
    // memory's facet slot+value for consumers that want it. Existing rows keep
    // both NULL — no backfill: a legacy row's content is encrypted, so its
    // slot/value can't be classified in-migration (exact fact_type /
    // embedding_model precedent). NULL is harmless: dedup never reads these
    // columns, it goes through semantic search + the decide model either way.
    //
    // TODO(privacy): both columns are PLAINTEXT for now (TEST). `facet_value`
    // leaks the actual value ("vegan","sf") in cleartext, defeating content
    // encryption; `facet_key` leaks the slot shape like `fact_type`. Encrypt /
    // protect facet_value before ship — needs privacy sign-off.
    {
      toVersion: 46,
      steps: [
        addColumns({
          table: "memory_vault",
          columns: [
            { name: "facet_key", type: "string", isOptional: true, isIndexed: true },
            { name: "facet_value", type: "string", isOptional: true },
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
