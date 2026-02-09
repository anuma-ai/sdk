/**
 * iCloud Backup Implementation
 *
 * Generic backup/restore functionality for iCloud storage.
 * Works directly with WatermelonDB database.
 */

import type { Database } from "@nozbe/watermelondb";

import { Conversation } from "../../db/chat";
import { conversationToStoredRaw } from "../../db/chat/operations";
import {
  DEFAULT_BACKUP_FOLDER,
  downloadICloudFile,
  findICloudFile,
  type ICloudFile,
  listICloudFiles,
  uploadFileToICloud,
} from "./api";

export { DEFAULT_BACKUP_FOLDER };

const isAuthError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes("AUTHENTICATION") ||
    err.message.includes("NOT_AUTHENTICATED") ||
    err.message.includes("sign in"));

export interface ICloudBackupDeps {
  requestICloudAccess: () => Promise<void>;
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

export interface ICloudExportResult {
  success: boolean;
  uploaded: number;
  skipped: number;
  total: number;
}

export interface ICloudImportResult {
  success: boolean;
  restored: number;
  failed: number;
  total: number;
  /** True if no backups were found in iCloud */
  noBackupsFound?: boolean;
}

export async function pushConversationToICloud(
  database: Database,
  conversationId: string,
  userAddress: string,
  deps: ICloudBackupDeps,
  _retried: boolean = false
): Promise<"uploaded" | "skipped" | "failed"> {
  try {
    await deps.requestEncryptionKey(userAddress);

    const filename = `${conversationId}.json`;
    const existingFile = await findICloudFile(filename);

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
        const remoteModified = existingFile.modifiedAt.getTime();
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

    await uploadFileToICloud(filename, exportResult.blob);
    return "uploaded";
  } catch (err) {
    if (isAuthError(err) && !_retried) {
      // Try to re-authenticate once
      try {
        await deps.requestICloudAccess();
        return pushConversationToICloud(
          database,
          conversationId,
          userAddress,
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

export async function performICloudExport(
  database: Database,
  userAddress: string,
  deps: ICloudBackupDeps,
  onProgress?: (current: number, total: number) => void
): Promise<ICloudExportResult> {
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

    const result = await pushConversationToICloud(
      database,
      conv.conversationId,
      userAddress,
      deps
    );

    if (result === "uploaded") uploaded++;
    if (result === "skipped") skipped++;
  }

  return { success: true, uploaded, skipped, total };
}

export async function performICloudImport(
  userAddress: string,
  deps: ICloudBackupDeps,
  onProgress?: (current: number, total: number) => void
): Promise<ICloudImportResult> {
  await deps.requestEncryptionKey(userAddress);

  const remoteFiles = await listICloudFiles();
  if (remoteFiles.length === 0) {
    return {
      success: false,
      restored: 0,
      failed: 0,
      total: 0,
      noBackupsFound: true,
    };
  }

  const jsonFiles = remoteFiles.filter((file: ICloudFile) =>
    file.filename.endsWith(".json")
  );
  const total = jsonFiles.length;
  let restored = 0;
  let failed = 0;

  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    onProgress?.(i + 1, total);

    try {
      const blob = await downloadICloudFile(file.recordName);
      const result = await deps.importConversation(blob, userAddress);
      if (result.success) {
        restored++;
      } else {
        failed++;
      }
    } catch (err) {
      // Handle auth errors by refreshing and retrying once
      if (isAuthError(err)) {
        try {
          await deps.requestICloudAccess();
          const blob = await downloadICloudFile(file.recordName);
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
