export interface StoredVaultMemory {
  /** WatermelonDB internal ID */
  uniqueId: string;
  /** Plain text memory content */
  content: string;
  /** Scope for partitioning memories (e.g., "private", "shared") */
  scope: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface CreateVaultMemoryOptions {
  content: string;
  /** Scope for the memory. Defaults to "private" if omitted. */
  scope?: string;
}

export interface UpdateVaultMemoryOptions {
  content: string;
  /** If provided, updates the memory's scope. */
  scope?: string;
}
