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

interface ICloudBackupDeps {
  requestICloudAccess: () => Promise<void>;
  requestEncryptionKey: (address: string) => Promise<void>;
  /** Export a conversation to an encrypted blob */
  exportConversation: (
    conversationId: string,
    userAddress: string
  ) => Promise<{ success: boolean; blob?: Blob }>;
  /** Import a conversation from an encrypted blob */
  importConversation: (blob: Blob, userAddress: string) => Promise<{ success: boolean }>;
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

const UNREVISIONED_COLUMNS = new Set([
  "updated_at",
  "vector",
  "embedding_model",
  "chunks",
  "origin",
]);

async function getBackupRevision(database: Database, conversationId: string): Promise<string> {
  const serialized = await database.read(async () => {
    const { Q } = await import("@nozbe/watermelondb");
    const tables = (await Promise.all(
      ["conversations", "history"].map((table) =>
        database
          .get(table)
          .query(Q.where("conversation_id", conversationId), Q.sortBy("id", Q.asc))
          .unsafeFetchRaw()
      )
    )) as Record<string, unknown>[][];
    return JSON.stringify(
      tables.map((rows) =>
        rows.map((row) =>
          Object.entries(row)
            .filter(([key]) => !key.startsWith("_") && !UNREVISIONED_COLUMNS.has(key))
            .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        )
      )
    );
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
  return (
    "v1:" +
    Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}

async function pushConversationToICloud(
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
    const backupRevision = await getBackupRevision(database, conversationId);

    if (existingFile?.backupRevision === backupRevision) {
      return "skipped";
    }

    const exportResult = await deps.exportConversation(conversationId, userAddress);

    if (!exportResult.success || !exportResult.blob) {
      return "failed";
    }

    await uploadFileToICloud(filename, exportResult.blob, backupRevision);
    return "uploaded";
  } catch (err) {
    if (isAuthError(err) && !_retried) {
      try {
        await deps.requestICloudAccess();
        return pushConversationToICloud(database, conversationId, userAddress, deps, true);
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

    const result = await pushConversationToICloud(database, conv.conversationId, userAddress, deps);

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

  const jsonFiles = remoteFiles.filter((file: ICloudFile) => file.filename.endsWith(".json"));
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
