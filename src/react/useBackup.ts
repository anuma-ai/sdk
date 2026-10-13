"use client";

import type { Database } from "@nozbe/watermelondb";
import { useCallback, useMemo } from "react";

import {
  DEFAULT_BACKUP_FOLDER as DEFAULT_ICLOUD_FOLDER,
  type ICloudExportResult,
  type ICloudImportResult,
  performICloudExport,
  performICloudImport,
} from "../lib/backup/icloud/backup";
import { useBackupAuth } from "./useBackupAuth";

export { DEFAULT_ICLOUD_FOLDER };

/**
 * Options for useBackup hook
 * @inline
 */
export interface UseBackupOptions {
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
}

/**
 * Progress callback type
 */
export type ProgressCallback = (current: number, total: number) => void;

/**
 * Backup options for individual operations
 */
export interface BackupOperationOptions {
  onProgress?: ProgressCallback;
}

/**
 * Provider-specific backup state
 */
export interface ProviderBackupState {
  /** Whether the provider is configured */
  isConfigured: boolean;
  /** Whether user has authenticated with this provider */
  isAuthenticated: boolean;
  /** Backup all conversations to this provider */
  backup: (options?: BackupOperationOptions) => Promise<ICloudExportResult | { error: string }>;
  /** Restore conversations from this provider */
  restore: (options?: BackupOperationOptions) => Promise<ICloudImportResult | { error: string }>;
  /** Request access to this provider (triggers iCloud sign-in if needed) */
  connect: () => Promise<string>;
  /** Disconnect from this provider */
  disconnect: () => Promise<void>;
}

/**
 * Result returned by useBackup hook
 */
export interface UseBackupResult {
  /** iCloud backup state and methods */
  icloud: ProviderBackupState;
  /** Whether any backup provider is configured */
  hasAnyProvider: boolean;
  /** Whether any backup provider is authenticated */
  hasAnyAuthentication: boolean;
  /** Disconnect from all providers */
  disconnectAll: () => Promise<void>;
}

/**
 * Unified React hook for backup and restore functionality.
 *
 * This hook provides methods to backup conversations to iCloud and restore them.
 * It handles all the logic for checking timestamps, skipping unchanged files,
 * authentication, and managing the backup/restore process.
 *
 * Must be used within a BackupAuthProvider.
 *
 * @example
 * ```tsx
 * import { useBackup } from "@anuma/sdk/react";
 *
 * function BackupManager() {
 *   const { icloud, hasAnyProvider } = useBackup({
 *     database,
 *     userAddress,
 *     requestEncryptionKey,
 *     exportConversation,
 *     importConversation,
 *   });
 *
 *   if (!hasAnyProvider) {
 *     return <p>No backup providers configured</p>;
 *   }
 *
 *   return icloud.isAuthenticated ? (
 *     <>
 *       <button onClick={() => icloud.backup()}>Backup</button>
 *       <button onClick={() => icloud.restore()}>Restore</button>
 *       <button onClick={icloud.disconnect}>Disconnect</button>
 *     </>
 *   ) : (
 *     <button onClick={icloud.connect}>Connect iCloud</button>
 *   );
 * }
 * ```
 *
 * @category Hooks
 */
export function useBackup(options: UseBackupOptions): UseBackupResult {
  const { database, userAddress, requestEncryptionKey, exportConversation, importConversation } =
    options;

  const { icloud: icloudAuth, hasAnyProvider, hasAnyAuthentication, logoutAll } = useBackupAuth();

  const icloudDeps = useMemo(
    () => ({
      requestICloudAccess: async () => {
        await icloudAuth.requestAccess();
      },
      requestEncryptionKey,
      exportConversation,
      importConversation,
    }),
    [icloudAuth, requestEncryptionKey, exportConversation, importConversation]
  );

  const icloudBackup = useCallback(
    async (
      backupOptions?: BackupOperationOptions
    ): Promise<ICloudExportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to backup to iCloud" };
      }

      if (!icloudAuth.isConfigured) {
        return { error: "iCloud is not configured" };
      }

      if (!icloudAuth.isAuthenticated) {
        try {
          await icloudAuth.requestAccess();
        } catch {
          return { error: "iCloud access denied" };
        }
      }

      try {
        return await performICloudExport(
          database,
          userAddress,
          icloudDeps,
          backupOptions?.onProgress
        );
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Failed to backup to iCloud",
        };
      }
    },
    [database, userAddress, icloudAuth, icloudDeps]
  );

  const icloudRestore = useCallback(
    async (
      restoreOptions?: BackupOperationOptions
    ): Promise<ICloudImportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to restore from iCloud" };
      }

      if (!icloudAuth.isConfigured) {
        return { error: "iCloud is not configured" };
      }

      if (!icloudAuth.isAuthenticated) {
        try {
          await icloudAuth.requestAccess();
        } catch {
          return { error: "iCloud access denied" };
        }
      }

      try {
        return await performICloudImport(userAddress, icloudDeps, restoreOptions?.onProgress);
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Failed to restore from iCloud",
        };
      }
    },
    [userAddress, icloudAuth, icloudDeps]
  );

  const icloudState: ProviderBackupState = {
    isConfigured: icloudAuth.isConfigured,
    isAuthenticated: icloudAuth.isAuthenticated,
    backup: icloudBackup,
    restore: icloudRestore,
    connect: icloudAuth.requestAccess,
    disconnect: icloudAuth.logout,
  };

  return {
    icloud: icloudState,
    hasAnyProvider,
    hasAnyAuthentication,
    disconnectAll: logoutAll,
  };
}
