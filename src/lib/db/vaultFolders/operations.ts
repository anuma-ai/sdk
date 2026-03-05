import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import type { VaultMemory } from "../memoryVault/models";
import type { VaultFolder } from "./models";
import type {
  CreateVaultFolderOptions,
  StoredVaultFolder,
  UpdateVaultFolderOptions,
} from "./types";

export interface VaultFolderOperationsContext {
  database: Database;
  vaultFolderCollection: Collection<VaultFolder>;
  vaultMemoryCollection: Collection<VaultMemory>;
}

function folderToStored(folder: VaultFolder): StoredVaultFolder {
  return {
    uniqueId: folder.id,
    name: folder.name,
    scope: folder.scope,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    isDeleted: folder.isDeleted,
  };
}

/**
 * Create a new vault folder.
 */
export async function createVaultFolderOp(
  ctx: VaultFolderOperationsContext,
  opts: CreateVaultFolderOptions
): Promise<StoredVaultFolder> {
  const created = await ctx.database.write(async () => {
    return ctx.vaultFolderCollection.create((record) => {
      record._setRaw("name", opts.name);
      record._setRaw("scope", opts.scope ?? "private");
      record._setRaw("is_deleted", false);
    });
  });

  return folderToStored(created);
}

/**
 * Get all non-deleted vault folders, sorted by creation date (newest first).
 */
export async function getAllVaultFoldersOp(
  ctx: VaultFolderOperationsContext
): Promise<StoredVaultFolder[]> {
  const results = await ctx.vaultFolderCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return results.map(folderToStored);
}

/**
 * Update a vault folder's name and/or scope.
 * When scope changes, cascades to all contained memories atomically.
 */
export async function updateVaultFolderOp(
  ctx: VaultFolderOperationsContext,
  id: string,
  opts: UpdateVaultFolderOptions
): Promise<StoredVaultFolder | null> {
  try {
    const record = await ctx.vaultFolderCollection.find(id);
    if (record.isDeleted) return null;

    const scopeChanged = opts.scope !== undefined && opts.scope !== record.scope;

    const updated = await ctx.database.write(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed model types in batch
      const updates: any[] = [];

      updates.push(
        record.prepareUpdate((r) => {
          if (opts.name !== undefined) r._setRaw("name", opts.name);
          if (opts.scope !== undefined) r._setRaw("scope", opts.scope);
        })
      );

      if (scopeChanged) {
        const memories = await ctx.vaultMemoryCollection
          .query(Q.where("folder_id", id), Q.where("is_deleted", false))
          .fetch();

        for (const memory of memories) {
          updates.push(
            memory.prepareUpdate((r) => {
              r._setRaw("scope", opts.scope!);
            })
          );
        }
      }

      await ctx.database.batch(...updates);
      // Re-fetch to get fresh data after batch update
      return ctx.vaultFolderCollection.find(id);
    });

    return folderToStored(updated);
  } catch (error) {
    console.error("[VaultFolders] updateVaultFolderOp failed:", error);
    return null;
  }
}

/**
 * Soft-delete a vault folder and unfile all its memories in a single write.
 */
export async function deleteVaultFolderOp(
  ctx: VaultFolderOperationsContext,
  id: string
): Promise<boolean> {
  try {
    const record = await ctx.vaultFolderCollection.find(id);
    if (record.isDeleted) return false;

    await ctx.database.write(async () => {
      const memories = await ctx.vaultMemoryCollection
        .query(Q.where("folder_id", id), Q.where("is_deleted", false))
        .fetch();

      const preparedMemories = memories.map((memory) =>
        memory.prepareUpdate((r) => {
          r._setRaw("folder_id", null);
          r._setRaw("scope", "private");
        })
      );

      const preparedFolder = record.prepareUpdate((r) => {
        r._setRaw("is_deleted", true);
      });

      await ctx.database.batch(...preparedMemories, preparedFolder);
    });

    return true;
  } catch (error) {
    console.error("[VaultFolders] deleteVaultFolderOp failed:", error);
    return false;
  }
}

/**
 * Move memories to a folder (or unfile them by passing null).
 */
export async function moveMemoriesToFolderOp(
  ctx: VaultFolderOperationsContext,
  memoryIds: string[],
  folderId: string | null
): Promise<boolean> {
  if (memoryIds.length === 0) return true;

  try {
    // If moving to a folder, inherit the folder's scope; if unfiling, revert to "private"
    let targetScope: string = "private";
    if (folderId) {
      const folder = await ctx.vaultFolderCollection.find(folderId);
      if (folder.isDeleted) return false;
      targetScope = folder.scope;
    }

    await ctx.database.write(async () => {
      const memories = await Promise.all(memoryIds.map((id) => ctx.vaultMemoryCollection.find(id)));

      const prepared = memories.map((memory) =>
        memory.prepareUpdate((r) => {
          r._setRaw("folder_id", folderId);
          r._setRaw("scope", targetScope);
        })
      );

      await ctx.database.batch(...prepared);
    });

    return true;
  } catch (error) {
    console.error("[VaultFolders] moveMemoriesToFolderOp failed:", error);
    return false;
  }
}

/**
 * Get the count of non-deleted memories in a folder.
 */
export async function getVaultFolderMemoryCountOp(
  ctx: VaultFolderOperationsContext,
  folderId: string
): Promise<number> {
  return await ctx.vaultMemoryCollection
    .query(Q.where("folder_id", folderId), Q.where("is_deleted", false))
    .fetchCount();
}
