/**
 * Dropbox Backup Implementation
 *
 * Generic backup/restore functionality for Dropbox storage.
 * Works directly with WatermelonDB database.
 */

import type { Database } from "@nozbe/watermelondb";

import { Conversation } from "../../db/chat";
import { conversationToStoredRaw } from "../../db/chat/operations";
import {
  DEFAULT_BACKUP_FOLDER,
  downloadDropboxFile,
  type DropboxFile,
  findDropboxFile,
  listDropboxFiles,
  uploadFileToDropbox,
} from "./api";

export { DEFAULT_BACKUP_FOLDER };

const isAuthError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes("401") || err.message.includes("invalid_access_token"));

export interface DropboxBackupDeps {
  requestDropboxAccess: () => Promise<string>;
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

export interface DropboxExportResult {
  success: boolean;
  uploaded: number;
  skipped: number;
  total: number;
}

export interface DropboxImportResult {
  success: boolean;
  restored: number;
  failed: number;
  total: number;
  /** True if no backups were found in Dropbox */
  noBackupsFound?: boolean;
}

export async function pushConversationToDropbox(
  database: Database,
  conversationId: string,
  userAddress: string,
  token: string,
  deps: DropboxBackupDeps,
  backupFolder: string = DEFAULT_BACKUP_FOLDER,
  _retried: boolean = false
): Promise<"uploaded" | "skipped" | "failed"> {
  try {
    await deps.requestEncryptionKey(userAddress);

    const filename = `${conversationId}.json`;
    const existingFile = await findDropboxFile(token, filename, backupFolder);

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
        const remoteModified = new Date(existingFile.server_modified).getTime();
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

    await uploadFileToDropbox(token, filename, exportResult.blob, backupFolder);
    return "uploaded";
  } catch (err) {
    if (isAuthError(err) && !_retried) {
      // Try to re-authenticate once
      try {
        const newToken = await deps.requestDropboxAccess();
        return pushConversationToDropbox(
          database,
          conversationId,
          userAddress,
          newToken,
          deps,
          backupFolder,
          true
        );
      } catch {
        return "failed";
      }
    }
    return "failed";
  }
}

export async function performDropboxExport(
  database: Database,
  userAddress: string,
  token: string,
  deps: DropboxBackupDeps,
  onProgress?: (current: number, total: number) => void,
  backupFolder: string = DEFAULT_BACKUP_FOLDER
): Promise<DropboxExportResult> {
  await deps.requestEncryptionKey(userAddress);

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

    const result = await pushConversationToDropbox(
      database,
      conv.conversationId,
      userAddress,
      token,
      deps,
      backupFolder
    );

    if (result === "uploaded") uploaded++;
    if (result === "skipped") skipped++;
  }

  return { success: true, uploaded, skipped, total };
}

export async function performDropboxImport(
  userAddress: string,
  token: string,
  deps: DropboxBackupDeps,
  onProgress?: (current: number, total: number) => void,
  backupFolder: string = DEFAULT_BACKUP_FOLDER
): Promise<DropboxImportResult> {
  await deps.requestEncryptionKey(userAddress);

  const remoteFiles = await listDropboxFiles(token, backupFolder);
  if (remoteFiles.length === 0) {
    return {
      success: false,
      restored: 0,
      failed: 0,
      total: 0,
      noBackupsFound: true,
    };
  }

  const jsonFiles = remoteFiles.filter((file: DropboxFile) =>
    file.name.endsWith(".json")
  );
  const total = jsonFiles.length;
  let restored = 0;
  let failed = 0;

  let currentToken = token;

  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    onProgress?.(i + 1, total);

    try {
      const blob = await downloadDropboxFile(currentToken, file.path_lower);
      const result = await deps.importConversation(blob, userAddress);
      if (result.success) {
        restored++;
      } else {
        failed++;
      }
    } catch (err) {
      // Handle auth errors by refreshing token and retrying once
      if (isAuthError(err)) {
        try {
          currentToken = await deps.requestDropboxAccess();
          const blob = await downloadDropboxFile(currentToken, file.path_lower);
          const result = await deps.importConversation(blob, userAddress);
          if (result.success) {
            restored++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      } else {
        failed++;
      }
    }
  }

  return { success: true, restored, failed, total };
}
