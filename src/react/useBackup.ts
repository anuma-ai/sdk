"use client";

import type { Database } from "@nozbe/watermelondb";
import { useCallback, useMemo } from "react";

import {
  DEFAULT_BACKUP_FOLDER,
  performDropboxExport,
  performDropboxImport,
  type DropboxExportResult,
  type DropboxImportResult,
} from "../lib/backup/dropbox/backup";
import {
  DEFAULT_CONVERSATIONS_FOLDER,
  DEFAULT_ROOT_FOLDER,
  performGoogleDriveExport,
  performGoogleDriveImport,
  type GoogleDriveExportResult,
  type GoogleDriveImportResult,
} from "../lib/backup/google/backup";
import {
  DEFAULT_BACKUP_FOLDER as DEFAULT_ICLOUD_FOLDER,
  performICloudExport,
  performICloudImport,
  type ICloudExportResult,
  type ICloudImportResult,
} from "../lib/backup/icloud/backup";
import { useBackupAuth } from "./useBackupAuth";

export {
  DEFAULT_BACKUP_FOLDER as DEFAULT_DROPBOX_FOLDER,
  DEFAULT_ROOT_FOLDER as DEFAULT_DRIVE_ROOT_FOLDER,
  DEFAULT_CONVERSATIONS_FOLDER as DEFAULT_DRIVE_CONVERSATIONS_FOLDER,
  DEFAULT_ICLOUD_FOLDER,
};

/**
 * Options for useBackup hook
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
  importConversation: (
    blob: Blob,
    userAddress: string
  ) => Promise<{ success: boolean }>;
  /** Dropbox folder path for backups (default: '/ai-chat-app/conversations') */
  dropboxFolder?: string;
  /** Google Drive root folder name (default: 'ai-chat-app') */
  googleRootFolder?: string;
  /** Google Drive conversations subfolder (default: 'conversations') */
  googleConversationsFolder?: string;
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
  backup: (
    options?: BackupOperationOptions
  ) => Promise<DropboxExportResult | GoogleDriveExportResult | ICloudExportResult | { error: string }>;
  /** Restore conversations from this provider */
  restore: (
    options?: BackupOperationOptions
  ) => Promise<DropboxImportResult | GoogleDriveImportResult | ICloudImportResult | { error: string }>;
  /** Request access to this provider (triggers OAuth if needed) */
  connect: () => Promise<string>;
  /** Disconnect from this provider */
  disconnect: () => Promise<void>;
}

/**
 * Result returned by useBackup hook
 */
export interface UseBackupResult {
  /** Dropbox backup state and methods */
  dropbox: ProviderBackupState;
  /** Google Drive backup state and methods */
  googleDrive: ProviderBackupState;
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
 * This hook provides methods to backup conversations to both Dropbox and Google Drive,
 * and restore them. It handles all the logic for checking timestamps, skipping
 * unchanged files, authentication, and managing the backup/restore process.
 *
 * Must be used within a BackupAuthProvider.
 *
 * @example
 * ```tsx
 * import { useBackup } from "@reverbia/sdk/react";
 *
 * function BackupManager() {
 *   const { dropbox, googleDrive, hasAnyProvider } = useBackup({
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
 *   return (
 *     <div>
 *       {dropbox.isConfigured && (
 *         <div>
 *           <h3>Dropbox</h3>
 *           {dropbox.isAuthenticated ? (
 *             <>
 *               <button onClick={() => dropbox.backup()}>Backup</button>
 *               <button onClick={() => dropbox.restore()}>Restore</button>
 *               <button onClick={dropbox.disconnect}>Disconnect</button>
 *             </>
 *           ) : (
 *             <button onClick={dropbox.connect}>Connect Dropbox</button>
 *           )}
 *         </div>
 *       )}
 *
 *       {googleDrive.isConfigured && (
 *         <div>
 *           <h3>Google Drive</h3>
 *           {googleDrive.isAuthenticated ? (
 *             <>
 *               <button onClick={() => googleDrive.backup()}>Backup</button>
 *               <button onClick={() => googleDrive.restore()}>Restore</button>
 *               <button onClick={googleDrive.disconnect}>Disconnect</button>
 *             </>
 *           ) : (
 *             <button onClick={googleDrive.connect}>Connect Google Drive</button>
 *           )}
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category Hooks
 */
export function useBackup(options: UseBackupOptions): UseBackupResult {
  const {
    database,
    userAddress,
    requestEncryptionKey,
    exportConversation,
    importConversation,
    dropboxFolder = DEFAULT_BACKUP_FOLDER,
    googleRootFolder = DEFAULT_ROOT_FOLDER,
    googleConversationsFolder = DEFAULT_CONVERSATIONS_FOLDER,
  } = options;

  const {
    dropbox: dropboxAuth,
    googleDrive: googleDriveAuth,
    icloud: icloudAuth,
    hasAnyProvider,
    hasAnyAuthentication,
    logoutAll,
  } = useBackupAuth();

  // Dropbox dependencies
  const dropboxDeps = useMemo(
    () => ({
      requestDropboxAccess: dropboxAuth.requestAccess,
      requestEncryptionKey,
      exportConversation,
      importConversation,
    }),
    [dropboxAuth.requestAccess, requestEncryptionKey, exportConversation, importConversation]
  );

  // Google Drive dependencies
  const googleDriveDeps = useMemo(
    () => ({
      requestDriveAccess: googleDriveAuth.requestAccess,
      requestEncryptionKey,
      exportConversation,
      importConversation,
    }),
    [googleDriveAuth.requestAccess, requestEncryptionKey, exportConversation, importConversation]
  );

  // iCloud dependencies
  const icloudDeps = useMemo(
    () => ({
      requestICloudAccess: async () => {
        await icloudAuth.requestAccess();
      },
      requestEncryptionKey,
      exportConversation,
      importConversation,
    }),
    [icloudAuth.requestAccess, requestEncryptionKey, exportConversation, importConversation]
  );

  // Dropbox backup
  const dropboxBackup = useCallback(
    async (
      backupOptions?: BackupOperationOptions
    ): Promise<DropboxExportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to backup to Dropbox" };
      }

      // Always request access to ensure we have a valid (non-expired) token
      // requestAccess() validates expiration and refreshes if needed
      let token: string;
      try {
        token = await dropboxAuth.requestAccess();
      } catch {
        return { error: "Dropbox access denied" };
      }

      try {
        return await performDropboxExport(
          database,
          userAddress,
          token,
          dropboxDeps,
          backupOptions?.onProgress,
          dropboxFolder
        );
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Failed to backup to Dropbox",
        };
      }
    },
    [database, userAddress, dropboxAuth, dropboxDeps, dropboxFolder]
  );

  // Dropbox restore
  const dropboxRestore = useCallback(
    async (
      restoreOptions?: BackupOperationOptions
    ): Promise<DropboxImportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to restore from Dropbox" };
      }

      // Always request access to ensure we have a valid (non-expired) token
      // requestAccess() validates expiration and refreshes if needed
      let token: string;
      try {
        token = await dropboxAuth.requestAccess();
      } catch {
        return { error: "Dropbox access denied" };
      }

      try {
        return await performDropboxImport(
          userAddress,
          token,
          dropboxDeps,
          restoreOptions?.onProgress,
          dropboxFolder
        );
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Failed to restore from Dropbox",
        };
      }
    },
    [userAddress, dropboxAuth, dropboxDeps, dropboxFolder]
  );

  // Google Drive backup
  const googleDriveBackup = useCallback(
    async (
      backupOptions?: BackupOperationOptions
    ): Promise<GoogleDriveExportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to backup to Google Drive" };
      }

      // Always request access to ensure we have a valid (non-expired) token
      // requestAccess() validates expiration and refreshes if needed
      let token: string;
      try {
        token = await googleDriveAuth.requestAccess();
      } catch {
        return { error: "Google Drive access denied" };
      }

      try {
        return await performGoogleDriveExport(
          database,
          userAddress,
          token,
          googleDriveDeps,
          backupOptions?.onProgress,
          googleRootFolder,
          googleConversationsFolder
        );
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err.message
              : "Failed to backup to Google Drive",
        };
      }
    },
    [
      database,
      userAddress,
      googleDriveAuth,
      googleDriveDeps,
      googleRootFolder,
      googleConversationsFolder,
    ]
  );

  // Google Drive restore
  const googleDriveRestore = useCallback(
    async (
      restoreOptions?: BackupOperationOptions
    ): Promise<GoogleDriveImportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to restore from Google Drive" };
      }

      // Always request access to ensure we have a valid (non-expired) token
      // requestAccess() validates expiration and refreshes if needed
      let token: string;
      try {
        token = await googleDriveAuth.requestAccess();
      } catch {
        return { error: "Google Drive access denied" };
      }

      try {
        return await performGoogleDriveImport(
          userAddress,
          token,
          googleDriveDeps,
          restoreOptions?.onProgress,
          googleRootFolder,
          googleConversationsFolder
        );
      } catch (err) {
        return {
          error:
            err instanceof Error
              ? err.message
              : "Failed to restore from Google Drive",
        };
      }
    },
    [
      userAddress,
      googleDriveAuth,
      googleDriveDeps,
      googleRootFolder,
      googleConversationsFolder,
    ]
  );

  const dropboxState: ProviderBackupState = {
    isConfigured: dropboxAuth.isConfigured,
    isAuthenticated: dropboxAuth.isAuthenticated,
    backup: dropboxBackup,
    restore: dropboxRestore,
    connect: dropboxAuth.requestAccess,
    disconnect: dropboxAuth.logout,
  };

  const googleDriveState: ProviderBackupState = {
    isConfigured: googleDriveAuth.isConfigured,
    isAuthenticated: googleDriveAuth.isAuthenticated,
    backup: googleDriveBackup,
    restore: googleDriveRestore,
    connect: googleDriveAuth.requestAccess,
    disconnect: googleDriveAuth.logout,
  };

  // iCloud backup
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
          error:
            err instanceof Error
              ? err.message
              : "Failed to backup to iCloud",
        };
      }
    },
    [database, userAddress, icloudAuth, icloudDeps]
  );

  // iCloud restore
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
        return await performICloudImport(
          userAddress,
          icloudDeps,
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
    dropbox: dropboxState,
    googleDrive: googleDriveState,
    icloud: icloudState,
    hasAnyProvider,
    hasAnyAuthentication,
    disconnectAll: logoutAll,
  };
}
