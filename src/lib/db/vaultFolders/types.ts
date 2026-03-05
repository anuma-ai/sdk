export interface StoredVaultFolder {
  /** WatermelonDB internal ID */
  uniqueId: string;
  /** Folder display name */
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface CreateVaultFolderOptions {
  name: string;
}

export interface UpdateVaultFolderOptions {
  name: string;
}
