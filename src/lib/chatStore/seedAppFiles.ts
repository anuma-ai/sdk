import type { Database } from "@nozbe/watermelondb";

import { normalizePath } from "../../utils/paths.js";
import { appFileId } from "./appFiles.js";
import { type ChatJson, type ChatRecordKind, type ChatStore, ChatStoreError } from "./types.js";

export interface AppFileSeedResult {
  appFiles: number;
  savedTools: number;
  /** Files of conversations vault does not hold, left on the device. */
  orphaned: number;
  /** Files too large for one vault record, left on the device. */
  tooLarge: number;
}

interface RawAppFile {
  conversation_id: string;
  path: string;
  content: string;
  created_at: number;
  updated_at: number;
}

interface RawSavedTool {
  id: string;
  name: string;
  display_name: string;
  description: string;
  parameters: string;
  html: string;
  conversation_id?: string | null;
  created_at: number;
  updated_at: number;
  is_deleted: boolean;
}

const maxSeedAttempts = 3;

async function rawRows<T>(database: Database, table: string): Promise<T[]> {
  const rows = await database.get(table).query().fetch();
  return rows.map((row) => row._raw as unknown as T);
}

async function seedRecord(
  store: ChatStore,
  target: { kind: ChatRecordKind; id: string; conversationId: string },
  device: { data: { [key: string]: ChatJson }; createdAt: number; updatedAt: number },
  signal?: AbortSignal
): Promise<boolean> {
  for (let attempt = 1; ; attempt++) {
    const current = await store.get(target.kind, target.id, signal);
    if (current && (current.record.isDeleted || current.record.updatedAt >= device.updatedAt))
      return false;
    try {
      await store.putMany(
        [
          {
            record: {
              ...target,
              sortKey: 0,
              createdAt: current?.record.createdAt ?? device.createdAt,
              updatedAt: device.updatedAt,
              isDeleted: false,
              data: device.data,
            },
            expectedVersion: current?.version ?? 0,
          },
        ],
        signal
      );
      return true;
    } catch (error) {
      if (
        !(error instanceof ChatStoreError) ||
        error.code !== "version_conflict" ||
        attempt >= maxSeedAttempts
      )
        throw error;
    }
  }
}

function leftOnDevice(error: unknown, result: AppFileSeedResult): boolean {
  if (!(error instanceof ChatStoreError)) return false;
  if (error.code === "conversation_not_found") result.orphaned++;
  else if (error.code === "record_too_large") result.tooLarge++;
  else return false;
  return true;
}

/**
 * Uploads this device's app files and saved tools that vault lacks or holds an older edit of,
 * keeping each one's own edit time so the newest copy across devices wins.
 */
export async function seedAppFilesToVault(
  database: Database,
  store: ChatStore,
  signal?: AbortSignal
): Promise<AppFileSeedResult> {
  const result: AppFileSeedResult = { appFiles: 0, savedTools: 0, orphaned: 0, tooLarge: 0 };
  for (const file of await rawRows<RawAppFile>(database, "app_files")) {
    try {
      const target = {
        kind: "app_file" as const,
        id: await appFileId(file.conversation_id, file.path),
        conversationId: file.conversation_id,
      };
      const data = { path: normalizePath(file.path), content: file.content };
      const device = { data, createdAt: file.created_at, updatedAt: file.updated_at };
      if (await seedRecord(store, target, device, signal)) result.appFiles++;
    } catch (error) {
      if (!leftOnDevice(error, result)) throw error;
    }
  }
  for (const tool of await rawRows<RawSavedTool>(database, "saved_tools")) {
    if (tool.is_deleted) continue;
    try {
      const data = {
        name: tool.name,
        displayName: tool.display_name,
        description: tool.description,
        parameters: tool.parameters,
        html: tool.html,
        conversationId: tool.conversation_id || null,
      };
      const target = { kind: "saved_tool" as const, id: tool.id, conversationId: "" };
      const device = { data, createdAt: tool.created_at, updatedAt: tool.updated_at };
      if (await seedRecord(store, target, device, signal)) result.savedTools++;
    } catch (error) {
      if (!leftOnDevice(error, result)) throw error;
    }
  }
  return result;
}
