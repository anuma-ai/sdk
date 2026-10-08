import type { Database } from "@nozbe/watermelondb";

import { Conversation } from "../../db/chat";
import { conversationToStoredRaw } from "../../db/chat/operations";
import {
  DEFAULT_BACKUP_FOLDER,
  downloadDropboxFile,
  type DropboxFile,
  getDropboxFileMetadata,
  listDropboxFiles,
  uploadFileToDropbox,
} from "./api";

export { DEFAULT_BACKUP_FOLDER };

const isAuthError = (err: unknown): boolean =>
  err instanceof Error &&
  (err.message.includes("401") || err.message.includes("invalid_access_token"));

interface DropboxBackupDeps {
  requestDropboxAccess: () => Promise<string>;
  requestEncryptionKey: (address: string) => Promise<void>;
  exportConversation: (
    conversationId: string,
    userAddress: string
  ) => Promise<{ success: boolean; blob?: Blob }>;
  importConversation: (blob: Blob, userAddress: string) => Promise<{ success: boolean }>;
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

const MAX_LISTING_FAILURES = 3;

interface DropboxFileIndex {
  get(token: string): Promise<Map<string, DropboxFile>>;
}

function createDropboxFileIndex(backupFolder: string): DropboxFileIndex {
  let pending: Promise<Map<string, DropboxFile>> | undefined;
  let failures = 0;

  return {
    get(token) {
      if (!pending) {
        if (failures >= MAX_LISTING_FAILURES) {
          return Promise.reject(
            new Error("The backup folder listing failed repeatedly; skipped for this run")
          );
        }
        pending = listDropboxFiles(token, backupFolder)
          .then((files) => {
            const byName = new Map<string, DropboxFile>();
            for (const file of files) {
              if (!byName.has(file.name)) byName.set(file.name, file);
            }
            return byName;
          })
          .catch((err: unknown) => {
            pending = undefined;
            failures++;
            throw err;
          });
      }
      return pending;
    },
  };
}

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

async function pushConversationToDropbox(
  database: Database,
  conversationId: string,
  userAddress: string,
  token: string,
  fileIndex: DropboxFileIndex,
  deps: DropboxBackupDeps,
  backupFolder: string = DEFAULT_BACKUP_FOLDER,
  _retried: boolean = false
): Promise<"uploaded" | "skipped" | "failed"> {
  try {
    await deps.requestEncryptionKey(userAddress);

    const filename = `${conversationId}.json`;
    const index = await fileIndex.get(token);
    const existingFile = index.get(filename);

    if (existingFile) {
      const localUpdatedAt = await readLocalUpdatedAt(database, conversationId);
      const localUpdated = localUpdatedAt ? localUpdatedAt.getTime() : null;

      if (
        localUpdated !== null &&
        localUpdated <= new Date(existingFile.server_modified).getTime()
      ) {
        return "skipped";
      }

      const current = await getDropboxFileMetadata(token, filename, backupFolder);
      if (!current) {
        index.delete(filename);
      } else {
        index.set(filename, current);
        if (localUpdated !== null && localUpdated <= new Date(current.server_modified).getTime()) {
          return "skipped";
        }
      }
    }

    const exportResult = await deps.exportConversation(conversationId, userAddress);

    if (!exportResult.success || !exportResult.blob) {
      return "failed";
    }

    const uploaded = await uploadFileToDropbox(token, filename, exportResult.blob, backupFolder);
    index.set(filename, uploaded);
    return "uploaded";
  } catch (err) {
    if (isAuthError(err) && !_retried) {
      try {
        const newToken = await deps.requestDropboxAccess();
        return pushConversationToDropbox(
          database,
          conversationId,
          userAddress,
          newToken,
          fileIndex,
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
  const records = await conversationsCollection.query(Q.where("is_deleted", false)).fetch();

  const conversations = records.map(conversationToStoredRaw);
  const total = conversations.length;

  if (total === 0) {
    return { success: true, uploaded: 0, skipped: 0, total: 0 };
  }

  let uploaded = 0;
  let skipped = 0;
  const fileIndex = createDropboxFileIndex(backupFolder);

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    onProgress?.(i + 1, total);

    const result = await pushConversationToDropbox(
      database,
      conv.conversationId,
      userAddress,
      token,
      fileIndex,
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

  const jsonFiles = remoteFiles.filter((file: DropboxFile) => file.name.endsWith(".json"));
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
