"use client";

import type { Database } from "@nozbe/watermelondb";
import { useCallback, useMemo } from "react";

import {
  DEFAULT_BACKUP_FOLDER,
  type DropboxExportResult,
  type DropboxImportResult,
  performDropboxExport,
  performDropboxImport,
} from "../lib/backup/dropbox/backup";
import { useDropboxAuth } from "./useDropboxAuth";

export { DEFAULT_BACKUP_FOLDER };

/**
 * Options for useDropboxBackup hook
 * @inline
 */
export interface UseDropboxBackupOptions {
  /** WatermelonDB database instance */
  database: Database;
  /** Current user address (null if not signed in) */
  userAddress: string | null;
  /** Request encryption key for the user address */
  requestEncryptionKey: (address: string) => Promise<void>;
  /** Export a conversation to an encrypted blob */
  exportConversation: (
    conversationId: string,
    userAddress: string
  ) => Promise<{ success: boolean; blob?: Blob }>;
  /** Import a conversation from an encrypted blob */
  importConversation: (blob: Blob, userAddress: string) => Promise<{ success: boolean }>;
  /** Dropbox folder path for backups (default: '/ai-chat-app/conversations') */
  backupFolder?: string;
}

/**
 * Result returned by useDropboxBackup hook
 */
export interface UseDropboxBackupResult {
  /** Backup all conversations to Dropbox */
  backup: (options?: {
    onProgress?: (current: number, total: number) => void;
  }) => Promise<DropboxExportResult | { error: string }>;
  /** Restore conversations from Dropbox */
  restore: (options?: {
    onProgress?: (current: number, total: number) => void;
  }) => Promise<DropboxImportResult | { error: string }>;
  /** Whether Dropbox is configured */
  isConfigured: boolean;
  /** Whether user has a Dropbox token */
  isAuthenticated: boolean;
}

/**
 * React hook for Dropbox backup and restore functionality.
 *
 * This hook provides methods to backup conversations to Dropbox and restore them.
 * It handles all the logic for checking timestamps, skipping unchanged files,
 * authentication, and managing the backup/restore process.
 *
 * Must be used within a DropboxAuthProvider.
 *
 * @example
 * ```tsx
 * import { useDropboxBackup } from "@anuma/sdk/react";
 *
 * function BackupButton() {
 *   const { backup, restore, isConfigured } = useDropboxBackup({
 *     database,
 *     userAddress,
 *     requestEncryptionKey,
 *     exportConversation,
 *     importConversation,
 *   });
 *
 *   const handleBackup = async () => {
 *     const result = await backup({
 *       onProgress: (current, total) => {
 *         console.log(`Progress: ${current}/${total}`);
 *       },
 *     });
 *
 *     if ("error" in result) {
 *       console.error(result.error);
 *     } else {
 *       console.log(`Uploaded: ${result.uploaded}, Skipped: ${result.skipped}`);
 *     }
 *   };
 *
 *   return <button onClick={handleBackup} disabled={!isConfigured}>Backup</button>;
 * }
 * ```
 *
 * @category Hooks
 */
export function useDropboxBackup(options: UseDropboxBackupOptions): UseDropboxBackupResult {
  const {
    database,
    userAddress,
    requestEncryptionKey,
    exportConversation,
    importConversation,
    backupFolder = DEFAULT_BACKUP_FOLDER,
  } = options;

  // Get auth state from DropboxAuthProvider
  const {
    accessToken: dropboxToken,
    isConfigured: isDropboxConfigured,
    requestAccess: requestDropboxAccess,
  } = useDropboxAuth();

  const deps = useMemo(
    () => ({
      requestDropboxAccess,
      requestEncryptionKey,
      exportConversation,
      importConversation,
    }),
    [requestDropboxAccess, requestEncryptionKey, exportConversation, importConversation]
  );

  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (dropboxToken) return dropboxToken;
    try {
      return await requestDropboxAccess();
    } catch {
      return null;
    }
  }, [dropboxToken, requestDropboxAccess]);

  const backup = useCallback(
    async (backupOptions?: {
      onProgress?: (current: number, total: number) => void;
    }): Promise<DropboxExportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to backup to Dropbox" };
      }

      const token = await ensureToken();
      if (!token) {
        return { error: "Dropbox access denied" };
      }

      try {
        return await performDropboxExport(
          database,
          userAddress,
          token,
          deps,
          backupOptions?.onProgress,
          backupFolder
        );
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Failed to backup to Dropbox",
        };
      }
    },
    [database, userAddress, ensureToken, deps, backupFolder]
  );

  const restore = useCallback(
    async (restoreOptions?: {
      onProgress?: (current: number, total: number) => void;
    }): Promise<DropboxImportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to restore from Dropbox" };
      }

      const token = await ensureToken();
      if (!token) {
        return { error: "Dropbox access denied" };
      }

      try {
        return await performDropboxImport(
          userAddress,
          token,
          deps,
          restoreOptions?.onProgress,
          backupFolder
        );
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Failed to restore from Dropbox",
        };
      }
    },
    [userAddress, ensureToken, deps, backupFolder]
  );

  return {
    backup,
    restore,
    isConfigured: isDropboxConfigured,
    isAuthenticated: !!dropboxToken,
  };
}
