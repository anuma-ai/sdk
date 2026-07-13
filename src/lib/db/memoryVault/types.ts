import type { FactType } from "../../memory/autoExtract.js";

export interface StoredVaultMemory {
  /** WatermelonDB internal ID */
  uniqueId: string;
  /** Plain text memory content */
  content: string;
  /** Scope for partitioning memories (e.g., "private", "shared") */
  scope: string;
  /** Folder ID for organization, null if unfiled */
  folderId: string | null;
  /** User ID for multi-user server-side scoping, null on client */
  userId: string | null;
  /** JSON-stringified embedding vector, null if not yet computed */
  embedding: string | null;
  /** Model that produced `embedding`. Null on legacy rows (grandfathered as
   * compatible with the current model). */
  embeddingModel: string | null;
  /** JSON-stringified array of source message IDs this fact was extracted from. */
  sourceChunkIds: string[] | null;
  /** Times this fact has been re-observed (for ranking + UX badges). */
  proofCount: number | null;
  /** How the memory was created: manual | auto-extracted | capsule. */
  source: string | null;
  /** W6 temporal lane — Unix ms when the event occurred (point/start of range). */
  eventTimeStart: number | null;
  /** W6 temporal lane — Unix ms when the event ended (range only). */
  eventTimeEnd: number | null;
  /** W6 temporal lane — `point | range | ongoing | null`. */
  eventTimeKind: string | null;
  /** When true, the user has manually set this memory's topics (entity links);
   * auto-extraction leaves them alone. False on legacy/auto rows. */
  topicsUserManaged: boolean;
  /** Typed memory (PR1) — the extractor's FactType for this fact, or null on
   * legacy/manual/untyped rows. Plaintext string (not narrowed to FactType
   * here since the DB can hold any stored value). */
  factType: string | null;
  /** Decay archive state (PR2) — Unix ms when archived, or null when active. */
  archivedAt: number | null;
  /** Tier-0 security (PR3) — "quarantined" | "trusted" | null. */
  trustTier: string | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface CreateVaultMemoryOptions {
  content: string;
  /** Scope for the memory. Defaults to "private" if omitted. */
  scope?: string;
  /** Folder ID for organization, null or omitted if unfiled */
  folderId?: string | null;
  /** JSON-stringified embedding vector to persist */
  embedding?: string;
  /** Model that produced `embedding`. Persisted alongside it so a later
   * model change can detect and re-embed stale vectors. */
  embeddingModel?: string;
  /** Source message IDs that produced this fact (auto-extraction provenance). */
  sourceChunkIds?: string[];
  /** Initial proof count. Defaults to 1 if omitted. */
  proofCount?: number;
  /** How the memory was created. Defaults to "manual" if omitted. */
  source?: string;
  /** W6 temporal lane — when the event in this memory occurred. */
  eventTime?: {
    /** Unix ms timestamp of event start (or point). */
    start: number | null;
    /** Unix ms timestamp of event end (range only). */
    end: number | null;
    /** Kind: 'point' | 'range' | 'ongoing' | null (or omit). */
    kind: "point" | "range" | "ongoing" | null;
  };
  /** Typed memory (PR1) — the extractor's classification for this fact.
   * Omit for manual/untyped saves (persisted as null). */
  factType?: FactType;
  /** Tier-0 security (PR3) — set "quarantined" when the injection screen
   * flagged this fact. Omit for the default (null/trusted). */
  trustTier?: string;
}

export interface UpdateVaultMemoryOptions {
  content: string;
  /** If provided, updates the memory's scope. */
  scope?: string;
  /** If provided, moves the memory to this folder. */
  folderId?: string | null;
  /** JSON-stringified embedding vector to persist, or null to clear stale embedding */
  embedding?: string | null;
  /** Model that produced `embedding`. Set whenever `embedding` is written so
   * the stored model tag stays in sync with the vector. */
  embeddingModel?: string | null;
  /** Replace source-chunk-ids list (used during merge to accumulate provenance). */
  sourceChunkIds?: string[];
  /** Set an absolute proof count. Prefer {@link proofCountIncrement} for
   * re-observation paths so the read+write happens inside the writer
   * and concurrent retains can't lose updates. */
  proofCount?: number;
  /** Atomically bump proof_count by this delta inside the write block.
   * Reads the current value from the in-memory record at write time, so
   * two parallel retain() calls observe each other's commits and neither
   * loses its increment. Wins over `proofCount` when both are set. */
  proofCountIncrement?: number;
  /** Set source ("manual" | "auto-extracted" | "capsule"). */
  source?: string;
  /**
   * W6 temporal lane — write the event-time fields on update. Use during
   * auto-merge to preserve (or refine) the original event-time signal when
   * a new observation lands on an existing fact. Omit to leave the
   * existing values untouched.
   */
  eventTime?: {
    start: number | null;
    end: number | null;
    kind: "point" | "range" | "ongoing" | null;
  };
  /**
   * When true, restore the existing `updated_at` after the write so the
   * recency multiplier doesn't see a re-observation as a brand-new fact.
   * Set by auto-merge/consolidate paths — they want proof_count to bump
   * without inflating recency on top.
   */
  preserveUpdatedAt?: boolean;
  /** If provided, sets whether the user has taken manual control of this
   * memory's topics. Set by {@link setMemoryEntitiesOp}. */
  topicsUserManaged?: boolean;
  /** Typed memory (PR1) — set/refine the fact's classification on update.
   * Used by retain()'s lazy backfill (adopt an incoming type only when the
   * existing row has none). Omit to leave the existing value untouched. */
  factType?: FactType;
  /** Tier-0 security (PR3) — set the trust tier on update ("quarantined" |
   * "trusted"). Omit to leave the existing value untouched. */
  trustTier?: string;
}
