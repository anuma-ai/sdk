import type { Collection, Database, Model } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import { getLogger } from "../../logger";
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
  /**
   * When set, every folder read/write scopes to this user (server-side
   * multi-user), mirroring `VaultMemoryOperationsContext.userId`. Leaving it
   * `undefined` disables scoping entirely and is correct ONLY for the
   * physically single-tenant client DBs (one wallet per DB, rows written with
   * `user_id = null`). A shared multi-tenant DB MUST set it — without it
   * `getAllVaultFoldersOp` returns every tenant's folders and the mutating ops
   * accept any tenant's folder/memory id.
   *
   * Scope of the guarantee: this closes the folder-side doors only. A memory's
   * `folder_id` is also written by `createVaultMemoryOp` /
   * `updateVaultMemoryOp`, which do NOT validate that the target folder
   * belongs to the same user, so a memory can still be filed into a foreign
   * folder through those paths — where the scoped cascades here will then
   * correctly skip it, leaving it mis-filed. Closing that requires validating
   * ownership at the `folder_id` write sites in `memoryVault`; see #626.
   */
  userId?: string;
}

/**
 * Returns true if the record belongs to the context user (or if no user
 * scoping is active). Accepts both folders and memories — the ownership rule
 * is the same column on both tables.
 */
function isOwnedByCtxUser(
  ctx: VaultFolderOperationsContext,
  record: { userId: string | null }
): boolean {
  return ctx.userId === undefined || record.userId === ctx.userId;
}

/**
 * The `user_id` clause every folder/memory query in this module inherits.
 * Empty when scoping is off, so single-user clients keep their existing
 * unfiltered behavior.
 */
function userScopeConditions(ctx: VaultFolderOperationsContext) {
  return ctx.userId !== undefined ? [Q.where("user_id", ctx.userId)] : [];
}

/**
 * Conditions for the `memory_vault` rows filed under a folder — the three
 * folder-driven memory queries (scope cascade, delete unfile, count) all want
 * exactly this set, and all three are ones a missing user filter would turn
 * into a cross-tenant write.
 */
function folderMemoryConditions(ctx: VaultFolderOperationsContext, folderId: string) {
  return [
    Q.where("folder_id", folderId),
    Q.where("is_deleted", false),
    ...userScopeConditions(ctx),
  ];
}

/**
 * Resolve a folder the context user is allowed to operate on, else null
 * (missing, soft-deleted, and cross-tenant ids are all indistinguishable to
 * the caller by design).
 *
 * Every mutating op funnels through here rather than calling `find` directly,
 * so the ownership check is structural: a future op cannot obtain the record
 * without it. A DB fault still propagates — `find` rejecting is caught by the
 * caller's outer handler, which logs it, keeping a real fault distinguishable
 * from a clean "not found".
 */
async function findOwnedFolder(
  ctx: VaultFolderOperationsContext,
  id: string
): Promise<VaultFolder | null> {
  const record = await ctx.vaultFolderCollection.find(id);
  if (record.isDeleted || !isOwnedByCtxUser(ctx, record)) return null;
  return record;
}

function folderToStored(folder: VaultFolder): StoredVaultFolder {
  return {
    uniqueId: folder.id,
    name: folder.name,
    scope: folder.scope,
    userId: folder.userId ?? null,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    isDeleted: folder.isDeleted,
    isSystem: folder.isSystem ?? false,
    context: folder.context ?? null,
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
      record._setRaw("user_id", ctx.userId ?? null);
      record._setRaw("is_system", opts.isSystem ?? false);
      record._setRaw("is_deleted", false);
    });
  });

  return folderToStored(created);
}

/**
 * Get all non-deleted vault folders belonging to the context user, sorted by
 * creation date (newest first).
 */
export async function getAllVaultFoldersOp(
  ctx: VaultFolderOperationsContext
): Promise<StoredVaultFolder[]> {
  const results = await ctx.vaultFolderCollection
    .query(
      Q.where("is_deleted", false),
      ...userScopeConditions(ctx),
      Q.sortBy("created_at", Q.desc)
    )
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
    const record = await findOwnedFolder(ctx, id);
    if (!record) return null;

    const scopeChanged = opts.scope !== undefined && opts.scope !== record.scope;

    const updated = await ctx.database.write(async () => {
      // Fetch the cascade set BEFORE preparing any update: prepareUpdate →
      // batch must happen within the same tick (an interleaved `await` lets
      // WatermelonDB's dev "wasn't sent to batch() synchronously" diagnostic
      // fire, RedBoxing Debug builds).
      // The user filter also bounds the blast radius: a scope change must
      // never rewrite another tenant's memory, even if a stale `folder_id`
      // points here.
      const memories = scopeChanged
        ? await ctx.vaultMemoryCollection.query(...folderMemoryConditions(ctx, id)).fetch()
        : [];

      const updates: Model[] = [];

      updates.push(
        record.prepareUpdate((r) => {
          if (opts.name !== undefined) r._setRaw("name", opts.name);
          if (opts.scope !== undefined) r._setRaw("scope", opts.scope);
        })
      );

      for (const memory of memories) {
        updates.push(
          memory.prepareUpdate((r) => {
            r._setRaw("scope", opts.scope!);
          })
        );
      }

      await ctx.database.batch(...updates);
      // Re-fetch to get fresh data after batch update
      return ctx.vaultFolderCollection.find(id);
    });

    return folderToStored(updated);
  } catch (err) {
    // Update failed (record not found or write error) – return null to caller.
    getLogger().warn("[vaultFolders] updateVaultFolderOp failed", { id, err });
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
    const record = await findOwnedFolder(ctx, id);
    if (!record) return false;

    await ctx.database.write(async () => {
      const memories = await ctx.vaultMemoryCollection
        .query(...folderMemoryConditions(ctx, id))
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
  } catch (err) {
    // Delete failed (record not found or write error) – return false to caller.
    getLogger().warn("[vaultFolders] deleteVaultFolderOp failed", { id, err });
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
      const folder = await findOwnedFolder(ctx, folderId);
      if (!folder) return false;
      targetScope = folder.scope;
    }

    // Resolve and update memories inside a single write lock to avoid races
    let movedCount = 0;
    await ctx.database.write(async () => {
      const memories: VaultMemory[] = [];
      for (const id of memoryIds) {
        try {
          const m = await ctx.vaultMemoryCollection.find(id);
          // Ownership is load-bearing here, not just a read guard: the move
          // overwrites each memory's `scope` with the folder's, so an
          // unchecked cross-user id would silently flip another tenant's
          // private memory to the target folder's scope.
          if (!m.isDeleted && isOwnedByCtxUser(ctx, m)) memories.push(m);
        } catch {
          // skip invalid/missing IDs
        }
      }

      if (memories.length === 0) return;

      const prepared = memories.map((memory) =>
        memory.prepareUpdate((r) => {
          r._setRaw("folder_id", folderId);
          r._setRaw("scope", targetScope);
        })
      );

      await ctx.database.batch(...prepared);
      movedCount = memories.length;
    });

    return movedCount > 0;
  } catch (err) {
    // Move failed (record not found or write error) – return false to caller.
    getLogger().warn("[vaultFolders] moveMemoriesToFolderOp failed", { folderId, err });
    return false;
  }
}

/**
 * Update a vault folder's context summary.
 */
export async function updateVaultFolderContextOp(
  ctx: VaultFolderOperationsContext,
  id: string,
  context: string | null
): Promise<StoredVaultFolder | null> {
  try {
    const record = await findOwnedFolder(ctx, id);
    if (!record) return null;

    const updated = await ctx.database.write(async () => {
      await ctx.database.batch(
        record.prepareUpdate((r) => {
          r._setRaw("context", context);
        })
      );
      return ctx.vaultFolderCollection.find(id);
    });

    return folderToStored(updated);
  } catch (err) {
    getLogger().warn("[vaultFolders] updateVaultFolderContextOp failed", { id, err });
    return null;
  }
}

/**
 * Get the count of the context user's non-deleted memories in a folder.
 *
 * The user filter is on the memory rows, not the folder, so this counts only
 * the caller's own memories no matter whose folder id is passed — a foreign
 * folder id yields 0 without needing a separate ownership read. Deliberately a
 * pure indexed COUNT with no pre-`find`: a folder list calls this once per row,
 * so an extra round trip here is an N+1 (same posture as
 * {@link ../memoryVault/operations.countActiveVaultMemoriesOp}).
 */
export async function getVaultFolderMemoryCountOp(
  ctx: VaultFolderOperationsContext,
  folderId: string
): Promise<number> {
  return await ctx.vaultMemoryCollection
    .query(...folderMemoryConditions(ctx, folderId))
    .fetchCount();
}
