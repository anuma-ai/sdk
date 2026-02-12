"use client";

import type { Database } from "@nozbe/watermelondb";
import { useCallback, useMemo } from "react";

import {
  DEFAULT_BACKUP_FOLDER,
  performICloudExport,
  performICloudImport,
  type ICloudExportResult,
  type ICloudImportResult,
} from "../lib/backup/icloud/backup";
import { useICloudAuth } from "./useICloudAuth";

export { DEFAULT_BACKUP_FOLDER as DEFAULT_ICLOUD_BACKUP_FOLDER };

/**
 * Options for useICloudBackup hook
 * @inline
 */
export interface UseICloudBackupOptions {
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
  importConversation: (
    blob: Blob,
    userAddress: string
  ) => Promise<{ success: boolean }>;
}

/**
 * Result returned by useICloudBackup hook
 */
export interface UseICloudBackupResult {
  /** Backup all conversations to iCloud */
  backup: (options?: {
    onProgress?: (current: number, total: number) => void;
  }) => Promise<ICloudExportResult | { error: string }>;
  /** Restore conversations from iCloud */
  restore: (options?: {
    onProgress?: (current: number, total: number) => void;
  }) => Promise<ICloudImportResult | { error: string }>;
  /** Whether iCloud is configured */
  isConfigured: boolean;
  /** Whether user has signed in to iCloud */
  isAuthenticated: boolean;
  /** Whether CloudKit JS is available */
  isAvailable: boolean;
}

/**
 * React hook for iCloud backup and restore functionality.
 *
 * This hook provides methods to backup conversations to iCloud and restore them.
 * It handles all the logic for checking timestamps, skipping unchanged files,
 * authentication, and managing the backup/restore process.
 *
 * Must be used within an ICloudAuthProvider.
 *
 * @example
 * ```tsx
 * import { useICloudBackup } from "@anuma/sdk/react";
 *
 * function BackupButton() {
 *   const { backup, restore, isConfigured, isAuthenticated, isAvailable } = useICloudBackup({
 *     database,
 *     userAddress,
 *     requestEncryptionKey,
 *     exportConversation,
 *     importConversation,
 *   });
 *
 *   if (!isAvailable) {
 *     return <p>CloudKit JS not loaded</p>;
 *   }
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
 *   return <button onClick={handleBackup} disabled={!isConfigured}>Backup to iCloud</button>;
 * }
 * ```
 *
 * @category Hooks
 */
export function useICloudBackup(
  options: UseICloudBackupOptions
): UseICloudBackupResult {
  const {
    database,
    userAddress,
    requestEncryptionKey,
    exportConversation,
    importConversation,
  } = options;

  // Get auth state from ICloudAuthProvider
  const {
    isAuthenticated,
    isConfigured,
    isAvailable,
    requestAccess,
  } = useICloudAuth();

  const deps = useMemo(
    () => ({
      requestICloudAccess: requestAccess,
      requestEncryptionKey,
      exportConversation,
      importConversation,
    }),
    [requestAccess, requestEncryptionKey, exportConversation, importConversation]
  );

  const ensureAuthenticated = useCallback(async (): Promise<boolean> => {
    if (isAuthenticated) return true;
    try {
      await requestAccess();
      return true;
    } catch {
      return false;
    }
  }, [isAuthenticated, requestAccess]);

  const backup = useCallback(
    async (backupOptions?: {
      onProgress?: (current: number, total: number) => void;
    }): Promise<ICloudExportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to backup to iCloud" };
      }

      if (!isAvailable) {
        return { error: "CloudKit JS is not loaded" };
      }

      if (!isConfigured) {
        return { error: "iCloud is not configured" };
      }

      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        return { error: "iCloud access denied" };
      }

      try {
        return await performICloudExport(
          database,
          userAddress,
          deps,
          backupOptions?.onProgress
        );
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err.message
              : "Failed to backup to iCloud",
        };
      }
    },
    [database, userAddress, isAvailable, isConfigured, ensureAuthenticated, deps]
  );

  const restore = useCallback(
    async (restoreOptions?: {
      onProgress?: (current: number, total: number) => void;
    }): Promise<ICloudImportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to restore from iCloud" };
      }

      if (!isAvailable) {
        return { error: "CloudKit JS is not loaded" };
      }

      if (!isConfigured) {
        return { error: "iCloud is not configured" };
      }

      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        return { error: "iCloud access denied" };
      }

      try {
        return await performICloudImport(
          userAddress,
          deps,
          restoreOptions?.onProgress
        );
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err.message
              : "Failed to restore from iCloud",
        };
      }
    },
    [userAddress, isAvailable, isConfigured, ensureAuthenticated, deps]
  );

  return {
    backup,
    restore,
    isConfigured,
    isAuthenticated,
    isAvailable,
  };
}
