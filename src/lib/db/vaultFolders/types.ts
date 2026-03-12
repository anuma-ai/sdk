export interface StoredVaultFolder {
  /** WatermelonDB internal ID */
  uniqueId: string;
  /** Folder display name */
  name: string;
  /** Scope for partitioning ("private" | "shared") */
  scope: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  /** Whether this is a system-created default folder */
  isSystem: boolean;
}

export interface CreateVaultFolderOptions {
  name: string;
  /** Defaults to "private" if omitted. */
  scope?: string;
  /** Whether this is a system-created default folder */
  isSystem?: boolean;
}

export interface UpdateVaultFolderOptions {
  name?: string;
  /** If provided, updates the folder's scope and cascades to all contained memories. */
  scope?: string;
}
