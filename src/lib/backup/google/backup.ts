/**
 * Google Drive Backup Implementation
 *
 * Generic backup/restore functionality for Google Drive storage.
 * Works directly with WatermelonDB database.
 */

import type { Database } from "@nozbe/watermelondb";

import { Conversation } from "../../db/chat";
import { conversationToStoredRaw } from "../../db/chat/operations";
import {
  DEFAULT_CONVERSATIONS_FOLDER,
  DEFAULT_ROOT_FOLDER,
  downloadDriveFile,
  type DriveFile,
  findDriveFile,
  getBackupFolder,
  listDriveFiles,
  updateDriveFile,
  uploadFileToDrive,
} from "./api";

export { DEFAULT_ROOT_FOLDER, DEFAULT_CONVERSATIONS_FOLDER };

const isAuthError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes("401") || err.message.includes("403"));

export interface GoogleDriveBackupDeps {
  requestDriveAccess: () => Promise<string>;
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

export interface GoogleDriveExportResult {
  success: boolean;
  uploaded: number;
  skipped: number;
  total: number;
}

export interface GoogleDriveImportResult {
  success: boolean;
  restored: number;
  failed: number;
  total: number;
  /** True if no backups were found in Google Drive */
  noBackupsFound?: boolean;
}

async function getConversationsFolder(
  token: string,
  requestDriveAccess: () => Promise<string>,
  rootFolder: string,
  subfolder: string
): Promise<{ folderId: string; token: string } | null> {
  try {
    const folderId = await getBackupFolder(token, rootFolder, subfolder);
    return { folderId, token };
  } catch (err: unknown) {
    if (isAuthError(err)) {
      try {
        const newToken = await requestDriveAccess();
        const folderId = await getBackupFolder(newToken, rootFolder, subfolder);
        return { folderId, token: newToken };
      } catch {
        return null;
      }
    }
    throw err;
  }
}

export async function pushConversationToDrive(
  database: Database,
  conversationId: string,
  userAddress: string,
  token: string,
  deps: GoogleDriveBackupDeps,
  rootFolder: string = DEFAULT_ROOT_FOLDER,
  subfolder: string = DEFAULT_CONVERSATIONS_FOLDER,
  _retried: boolean = false
): Promise<"uploaded" | "skipped" | "failed"> {
  try {
    await deps.requestEncryptionKey(userAddress);

    const folderResult = await getConversationsFolder(
      token,
      deps.requestDriveAccess,
      rootFolder,
      subfolder
    );
    if (!folderResult) return "failed";
    const { folderId, token: activeToken } = folderResult;

    const filename = `${conversationId}.json`;
    const existingFile = await findDriveFile(activeToken, folderId, filename);

    // Check if we can skip upload based on timestamps
    if (existingFile) {
      const { Q } = await import("@nozbe/watermelondb");
      const conversationsCollection =
        database.get<Conversation>("conversations");
      const records = await conversationsCollection
        .query(Q.where("conversation_id", conversationId))
        .fetch();

      if (records.length > 0) {
        const conversation = conversationToStoredRaw(records[0]);
        const localUpdated = conversation.updatedAt.getTime();
        const remoteModified = new Date(existingFile.modifiedTime).getTime();
        if (localUpdated <= remoteModified) {
          return "skipped";
        }
      }
    }

    const exportResult = await deps.exportConversation(
      conversationId,
      userAddress
    );

    if (!exportResult.success || !exportResult.blob) {
      return "failed";
    }

    if (existingFile) {
      await updateDriveFile(activeToken, existingFile.id, exportResult.blob);
    } else {
      await uploadFileToDrive(
        activeToken,
        folderId,
        exportResult.blob,
        filename
      );
    }
    return "uploaded";
  } catch (err) {
    if (isAuthError(err) && !_retried) {
      // Try to re-authenticate once
      try {
        const newToken = await deps.requestDriveAccess();
        return pushConversationToDrive(
          database,
          conversationId,
          userAddress,
          newToken,
          deps,
          rootFolder,
          subfolder,
          true
        );
      } catch {
        return "failed";
      }
    }
    return "failed";
  }
}

export async function performGoogleDriveExport(
  database: Database,
  userAddress: string,
  token: string,
  deps: GoogleDriveBackupDeps,
  onProgress?: (current: number, total: number) => void,
  rootFolder: string = DEFAULT_ROOT_FOLDER,
  subfolder: string = DEFAULT_CONVERSATIONS_FOLDER
): Promise<GoogleDriveExportResult> {
  await deps.requestEncryptionKey(userAddress);

  const folderResult = await getConversationsFolder(
    token,
    deps.requestDriveAccess,
    rootFolder,
    subfolder
  );
  if (!folderResult) {
    return { success: false, uploaded: 0, skipped: 0, total: 0 };
  }
  const { token: activeToken } = folderResult;

  const { Q } = await import("@nozbe/watermelondb");
  const conversationsCollection = database.get<Conversation>("conversations");
  const records = await conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();

  const conversations = records.map(conversationToStoredRaw);
  const total = conversations.length;

  if (total === 0) {
    return { success: true, uploaded: 0, skipped: 0, total: 0 };
  }

  let uploaded = 0;
  let skipped = 0;

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    onProgress?.(i + 1, total);

    const result = await pushConversationToDrive(
      database,
      conv.conversationId,
      userAddress,
      activeToken,
      deps,
      rootFolder,
      subfolder
    );

    if (result === "uploaded") uploaded++;
    if (result === "skipped") skipped++;
  }

  return { success: true, uploaded, skipped, total };
}

export async function performGoogleDriveImport(
  userAddress: string,
  token: string,
  deps: GoogleDriveBackupDeps,
  onProgress?: (current: number, total: number) => void,
  rootFolder: string = DEFAULT_ROOT_FOLDER,
  subfolder: string = DEFAULT_CONVERSATIONS_FOLDER
): Promise<GoogleDriveImportResult> {
  await deps.requestEncryptionKey(userAddress);

  const folderResult = await getConversationsFolder(
    token,
    deps.requestDriveAccess,
    rootFolder,
    subfolder
  );
  if (!folderResult) {
    return {
      success: false,
      restored: 0,
      failed: 0,
      total: 0,
      noBackupsFound: true,
    };
  }
  const { folderId, token: activeToken } = folderResult;

  const remoteFiles = await listDriveFiles(activeToken, folderId);
  if (remoteFiles.length === 0) {
    return {
      success: false,
      restored: 0,
      failed: 0,
      total: 0,
      noBackupsFound: true,
    };
  }

  const jsonFiles = remoteFiles.filter((file: DriveFile) =>
    file.name.endsWith(".json")
  );
  const total = jsonFiles.length;
  let restored = 0;
  let failed = 0;

  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    onProgress?.(i + 1, total);

    try {
      const blob = await downloadDriveFile(activeToken, file.id);
      const result = await deps.importConversation(blob, userAddress);
      if (result.success) {
        restored++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { success: true, restored, failed, total };
}
