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
}

export interface UpdateVaultMemoryOptions {
  content: string;
  /** If provided, updates the memory's scope. */
  scope?: string;
  /** If provided, moves the memory to this folder. */
  folderId?: string | null;
  /** JSON-stringified embedding vector to persist, or null to clear stale embedding */
  embedding?: string | null;
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
}
