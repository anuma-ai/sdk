import type { Database } from "@nozbe/watermelondb";

import type { VaultFolderOperationsContext } from "./operations";
import { createVaultFolderOp, getAllVaultFoldersOp } from "./operations";

/**
 * Default system folders for auto-sorting memories.
 * These are created on first use and used by the LLM to classify memories.
 */
const DEFAULT_FOLDER_NAMES = ["Personal", "Work", "Interests"] as const;

/**
 * Per-database, per-user lock preventing concurrent calls from creating
 * duplicate system folders. Keyed by user as well as database: on a shared
 * multi-tenant DB a single per-database lock would hand user B the in-flight
 * promise for user A's folder set, so B would get A's folder IDs.
 */
const ensureDefaultFoldersLocks = new WeakMap<
  Database,
  // An `undefined` key covers the unscoped single-user case; it can't collide
  // with a real userId, so no sentinel string is needed.
  Map<string | undefined, Promise<Map<string, string>>>
>();

/**
 * Ensure all default system folders exist for the context user. Idempotent —
 * skips folders that already exist. Uses a per-database/per-user promise lock
 * so concurrent callers share a single in-flight operation.
 * Returns a map of ALL of that user's folder names (system + user-created) to
 * their IDs.
 */
export async function ensureDefaultFoldersOp(
  ctx: VaultFolderOperationsContext
): Promise<Map<string, string>> {
  let byUser = ensureDefaultFoldersLocks.get(ctx.database);
  if (!byUser) {
    byUser = new Map();
    ensureDefaultFoldersLocks.set(ctx.database, byUser);
  }

  const existing = byUser.get(ctx.userId);
  if (existing) return existing;

  const promise = _ensureDefaultFoldersImpl(ctx);
  byUser.set(ctx.userId, promise);
  try {
    return await promise;
  } finally {
    byUser.delete(ctx.userId);
  }
}

async function _ensureDefaultFoldersImpl(
  ctx: VaultFolderOperationsContext
): Promise<Map<string, string>> {
  const existing = await getAllVaultFoldersOp(ctx);
  const folderMap = new Map<string, string>();

  // Index existing folders by name
  const existingByName = new Map(existing.map((f) => [f.name, f]));

  // Create missing system folders
  for (const name of DEFAULT_FOLDER_NAMES) {
    const found = existingByName.get(name);
    if (found) {
      folderMap.set(found.name, found.uniqueId);
    } else {
      const created = await createVaultFolderOp(ctx, {
        name,
        scope: "private",
        isSystem: true,
      });
      folderMap.set(created.name, created.uniqueId);
    }
  }

  // Include all user-created folders too
  for (const folder of existing) {
    if (!folderMap.has(folder.name)) {
      folderMap.set(folder.name, folder.uniqueId);
    }
  }

  return folderMap;
}
