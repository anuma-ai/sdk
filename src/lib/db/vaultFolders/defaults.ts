import type { VaultFolderOperationsContext } from "./operations";
import { createVaultFolderOp, getAllVaultFoldersOp } from "./operations";

/**
 * Default system folders for auto-sorting memories.
 * These are created on first use and used by the LLM to classify memories.
 */
export const DEFAULT_FOLDER_NAMES = ["Personal", "Work", "Interests", "Preferences"] as const;

export type DefaultFolderName = (typeof DEFAULT_FOLDER_NAMES)[number];

/**
 * Ensure all default system folders exist. Idempotent — skips folders that already exist.
 * Returns a map of ALL folder names (system + user-created) to their IDs.
 */
export async function ensureDefaultFoldersOp(
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
