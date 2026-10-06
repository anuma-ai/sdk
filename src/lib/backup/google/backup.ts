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
  getBackupFolder,
  getDriveFileMetadata,
  listAllDriveFiles,
  listDriveFiles,
  updateDriveFile,
  uploadFileToDrive,
} from "./api";

export { DEFAULT_CONVERSATIONS_FOLDER, DEFAULT_ROOT_FOLDER };

const isAuthError = (err: unknown): boolean =>
  err instanceof Error && (err.message.includes("401") || err.message.includes("403"));

interface GoogleDriveBackupDeps {
  requestDriveAccess: () => Promise<string>;
  requestEncryptionKey: (address: string) => Promise<void>;
  /** Export a conversation to an encrypted blob */
  exportConversation: (
    conversationId: string,
    userAddress: string
  ) => Promise<{ success: boolean; blob?: Blob }>;
  /** Import a conversation from an encrypted blob */
  importConversation: (blob: Blob, userAddress: string) => Promise<{ success: boolean }>;
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

/**
 * Index of the files in the backup folder, keyed by file name.
 * One export run lists the folder once and reuses the result for every conversation.
 */
interface DriveFileIndex {
  get(token: string): Promise<Map<string, DriveFile>>;
}

function createDriveFileIndex(folderId: string): DriveFileIndex {
  let pending: Promise<Map<string, DriveFile>> | undefined;

  return {
    get(token) {
      if (!pending) {
        pending = listAllDriveFiles(token, folderId)
          .then((files) => {
            const byName = new Map<string, DriveFile>();
            for (const file of files) {
              // Keep the first file for a name, as a single-result name lookup does.
              if (!byName.has(file.name)) byName.set(file.name, file);
            }
            return byName;
          })
          .catch((err: unknown) => {
            // Do not keep a failed listing. The next conversation lists again,
            // so each conversation fails or succeeds on its own.
            pending = undefined;
            throw err;
          });
      }
      return pending;
    },
  };
}

/** Read the stored update time of one conversation from the local database now. */
async function readLocalUpdatedAt(
  database: Database,
  conversationId: string
): Promise<Date | null> {
  const { Q } = await import("@nozbe/watermelondb");
  const records = await database
    .get<Conversation>("conversations")
    .query(Q.where("conversation_id", conversationId))
    .fetch();
  const match = records
    .map(conversationToStoredRaw)
    .find((c) => c.conversationId === conversationId);
  return match ? match.updatedAt : null;
}

async function pushConversationToDrive(
  database: Database,
  conversationId: string,
  userAddress: string,
  token: string,
  folderId: string,
  fileIndex: DriveFileIndex,
  deps: GoogleDriveBackupDeps,
  _retried: boolean = false
): Promise<"uploaded" | "skipped" | "failed"> {
  try {
    await deps.requestEncryptionKey(userAddress);

    const filename = `${conversationId}.json`;
    const index = await fileIndex.get(token);
    let existingFile = index.get(filename);

    if (existingFile) {
      // Read the update time now. A conversation edited after the run began must still upload.
      const localUpdatedAt = await readLocalUpdatedAt(database, conversationId);
      const localUpdated = localUpdatedAt ? localUpdatedAt.getTime() : null;

      // Check if we can skip upload based on timestamps
      if (localUpdated !== null && localUpdated <= new Date(existingFile.modifiedTime).getTime()) {
        return "skipped";
      }

      // Another client can write the file after the run listed the folder. Read the file time
      // again before the run replaces the file, so a newer backup is not overwritten.
      const current = await getDriveFileMetadata(token, existingFile.id);
      if (!current) {
        // The file is gone. Upload a new one.
        index.delete(filename);
        existingFile = undefined;
      } else {
        index.set(filename, current);
        if (localUpdated !== null && localUpdated <= new Date(current.modifiedTime).getTime()) {
          return "skipped";
        }
      }
    }

    const exportResult = await deps.exportConversation(conversationId, userAddress);

    if (!exportResult.success || !exportResult.blob) {
      return "failed";
    }

    // Keep the index current. A later row with the same conversation id then finds this file and
    // does not create a second backup.
    const now = new Date().toISOString();
    if (existingFile) {
      await updateDriveFile(token, existingFile.id, exportResult.blob);
      index.set(filename, { ...existingFile, modifiedTime: now });
    } else {
      const created = await uploadFileToDrive(token, folderId, exportResult.blob, filename);
      index.set(filename, {
        id: created.id,
        name: created.name,
        createdTime: now,
        modifiedTime: now,
        size: String(exportResult.blob.size),
      });
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
          folderId,
          fileIndex,
          deps,
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
  const { folderId, token: activeToken } = folderResult;
  const fileIndex = createDriveFileIndex(folderId);

  const { Q } = await import("@nozbe/watermelondb");
  const conversationsCollection = database.get<Conversation>("conversations");
  const records = await conversationsCollection.query(Q.where("is_deleted", false)).fetch();

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
      folderId,
      fileIndex,
      deps
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

  const jsonFiles = remoteFiles.filter((file: DriveFile) => file.name.endsWith(".json"));
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
