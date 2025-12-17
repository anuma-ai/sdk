"use client";

import type { Database } from "@nozbe/watermelondb";
import { useCallback, useMemo } from "react";

import {
  DEFAULT_CONVERSATIONS_FOLDER,
  DEFAULT_ROOT_FOLDER,
  performGoogleDriveExport,
  performGoogleDriveImport,
  type GoogleDriveExportResult,
  type GoogleDriveImportResult,
} from "../lib/backup/google/backup";

export { DEFAULT_ROOT_FOLDER, DEFAULT_CONVERSATIONS_FOLDER };

/**
 * Options for useGoogleDriveBackup hook
 */
export interface UseGoogleDriveBackupOptions {
  /** WatermelonDB database instance */
  database: Database;
  /** Current user address (null if not signed in) */
  userAddress: string | null;
  /** Current Google Drive access token (null if not authenticated) */
  accessToken: string | null;
  /** Request Google Drive access - returns access token */
  requestDriveAccess: () => Promise<string>;
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
  /** Root folder name in Google Drive (default: 'ai-chat-app') */
  rootFolder?: string;
  /** Subfolder for conversations (default: 'conversations') */
  conversationsFolder?: string;
}

/**
 * Result returned by useGoogleDriveBackup hook
 */
export interface UseGoogleDriveBackupResult {
  /** Backup all conversations to Google Drive */
  backup: (options?: {
    onProgress?: (current: number, total: number) => void;
  }) => Promise<GoogleDriveExportResult | { error: string }>;
  /** Restore conversations from Google Drive */
  restore: (options?: {
    onProgress?: (current: number, total: number) => void;
  }) => Promise<GoogleDriveImportResult | { error: string }>;
  /** Whether user has a Google Drive token */
  isAuthenticated: boolean;
}

/**
 * React hook for Google Drive backup and restore functionality.
 *
 * This hook provides methods to backup conversations to Google Drive and restore them.
 * It handles all the logic for checking timestamps, skipping unchanged files,
 * and managing the backup/restore process.
 *
 * Unlike Dropbox, Google Drive auth requires browser-specific setup (Google Identity Services),
 * so the auth provider must be implemented in the app. This hook accepts the auth
 * callbacks as options.
 *
 * @example
 * ```tsx
 * import { useGoogleDriveBackup } from "@reverbia/sdk/react";
 *
 * function BackupButton() {
 *   const { accessToken, requestDriveAccess } = useGoogleAccessToken();
 *   const { backup, restore, isAuthenticated } = useGoogleDriveBackup({
 *     database,
 *     userAddress,
 *     accessToken,
 *     requestDriveAccess,
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
 *   return <button onClick={handleBackup}>Backup</button>;
 * }
 * ```
 *
 * @category Hooks
 */
export function useGoogleDriveBackup(
  options: UseGoogleDriveBackupOptions
): UseGoogleDriveBackupResult {
  const {
    database,
    userAddress,
    accessToken,
    requestDriveAccess,
    requestEncryptionKey,
    exportConversation,
    importConversation,
    rootFolder = DEFAULT_ROOT_FOLDER,
    conversationsFolder = DEFAULT_CONVERSATIONS_FOLDER,
  } = options;

  const deps = useMemo(
    () => ({
      requestDriveAccess,
      requestEncryptionKey,
      exportConversation,
      importConversation,
    }),
    [
      requestDriveAccess,
      requestEncryptionKey,
      exportConversation,
      importConversation,
    ]
  );

  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (accessToken) return accessToken;
    try {
      return await requestDriveAccess();
    } catch {
      return null;
    }
  }, [accessToken, requestDriveAccess]);

  const backup = useCallback(
    async (backupOptions?: {
      onProgress?: (current: number, total: number) => void;
    }): Promise<GoogleDriveExportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to backup to Google Drive" };
      }

      const token = await ensureToken();
      if (!token) {
        return { error: "Google Drive access denied" };
      }

      try {
        return await performGoogleDriveExport(
          database,
          userAddress,
          token,
          deps,
          backupOptions?.onProgress,
          rootFolder,
          conversationsFolder
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
    [database, userAddress, ensureToken, deps, rootFolder, conversationsFolder]
  );

  const restore = useCallback(
    async (restoreOptions?: {
      onProgress?: (current: number, total: number) => void;
    }): Promise<GoogleDriveImportResult | { error: string }> => {
      if (!userAddress) {
        return { error: "Please sign in to restore from Google Drive" };
      }

      const token = await ensureToken();
      if (!token) {
        return { error: "Google Drive access denied" };
      }

      try {
        return await performGoogleDriveImport(
          userAddress,
          token,
          deps,
          restoreOptions?.onProgress,
          rootFolder,
          conversationsFolder
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
    [userAddress, ensureToken, deps, rootFolder, conversationsFolder]
  );

  return {
    backup,
    restore,
    isAuthenticated: !!accessToken,
  };
}
