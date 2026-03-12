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
}

export interface UpdateVaultMemoryOptions {
  content: string;
  /** If provided, updates the memory's scope. */
  scope?: string;
  /** JSON-stringified embedding vector to persist, or null to clear stale embedding */
  embedding?: string | null;
}
