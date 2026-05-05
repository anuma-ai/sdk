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
  /** Set absolute proof count. Used during merge to increment. */
  proofCount?: number;
  /** Set source ("manual" | "auto-extracted" | "capsule"). */
  source?: string;
}
