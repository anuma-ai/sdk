import type { Database } from "@nozbe/watermelondb";

import { appFileId, saveAppFile, saveSavedTool } from "./appFiles.js";
import { type ChatStore, ChatStoreError } from "./types.js";

export interface AppFileSeedResult {
  appFiles: number;
  savedTools: number;
  /** Files of conversations vault does not hold, left on the device. */
  orphaned: number;
}

interface RawAppFile {
  conversation_id: string;
  path: string;
  content: string;
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
  updated_at: number;
  is_deleted: boolean;
}

async function rawRows<T>(database: Database, table: string): Promise<T[]> {
  const rows = await database.get(table).query().fetch();
  return rows.map((row) => row._raw as unknown as T);
}

async function newerOnDevice(
  store: ChatStore,
  kind: "app_file" | "saved_tool",
  id: string,
  updatedAt: number,
  signal?: AbortSignal
): Promise<boolean> {
  const current = await store.get(kind, id, signal);
  return !current || (!current.record.isDeleted && current.record.updatedAt < updatedAt);
}

/** Uploads this device's app files and saved tools that vault lacks or holds an older copy of. */
export async function seedAppFilesToVault(
  database: Database,
  store: ChatStore,
  signal?: AbortSignal
): Promise<AppFileSeedResult> {
  const result: AppFileSeedResult = { appFiles: 0, savedTools: 0, orphaned: 0 };
  for (const file of await rawRows<RawAppFile>(database, "app_files")) {
    const id = await appFileId(file.conversation_id, file.path);
    if (!(await newerOnDevice(store, "app_file", id, file.updated_at, signal))) continue;
    try {
      await saveAppFile(
        store,
        { conversationId: file.conversation_id, path: file.path, content: file.content },
        signal
      );
      result.appFiles++;
    } catch (error) {
      if (!(error instanceof ChatStoreError) || error.code !== "conversation_not_found")
        throw error;
      result.orphaned++;
    }
  }
  for (const tool of await rawRows<RawSavedTool>(database, "saved_tools")) {
    if (tool.is_deleted) continue;
    if (!(await newerOnDevice(store, "saved_tool", tool.id, tool.updated_at, signal))) continue;
    await saveSavedTool(
      store,
      tool.id,
      {
        name: tool.name,
        displayName: tool.display_name,
        description: tool.description,
        parameters: tool.parameters,
        html: tool.html,
        conversationId: tool.conversation_id || null,
      },
      signal
    );
    result.savedTools++;
  }
  return result;
}
