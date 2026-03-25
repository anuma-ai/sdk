import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import { AppFile } from "./models";
import type { StoredAppFile } from "./types";

/** Context required by app file operations. */
export interface AppFileOperationsContext {
  database: Database;
  appFilesCollection: Collection<AppFile>;
}

/** Normalize a file path: strip leading slashes, collapse double slashes. */
function normalizePath(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/\/+/g, "/");
}

/** Convert a WatermelonDB AppFile model to a plain StoredAppFile object. */
export function appFileToStored(file: AppFile): StoredAppFile {
  return {
    uniqueId: file.id,
    conversationId: file.conversationId,
    path: file.path,
    content: file.content,
    updatedAt: file.updatedAt,
  };
}

/**
 * Create or overwrite a file. If a file with the same conversationId + path
 * already exists, it is updated in place.
 */
export async function putAppFileOp(
  ctx: AppFileOperationsContext,
  conversationId: string,
  path: string,
  content: string
): Promise<StoredAppFile> {
  const normalized = normalizePath(path);
  const now = Date.now();

  const result = await ctx.database.write(async () => {
    const existing = await ctx.appFilesCollection
      .query(Q.where("conversation_id", conversationId), Q.where("path", normalized))
      .fetch();

    if (existing.length > 0) {
      await existing[0].update((f) => {
        f._setRaw("content", content);
        f._setRaw("updated_at", now);
      });
      return existing[0];
    }

    return await ctx.appFilesCollection.create((f) => {
      f._setRaw("conversation_id", conversationId);
      f._setRaw("path", normalized);
      f._setRaw("content", content);
      f._setRaw("updated_at", now);
    });
  });

  return appFileToStored(result);
}

/** Read a single file by conversationId and path. Returns null if not found. */
export async function getAppFileOp(
  ctx: AppFileOperationsContext,
  conversationId: string,
  path: string
): Promise<StoredAppFile | null> {
  const normalized = normalizePath(path);
  const results = await ctx.appFilesCollection
    .query(Q.where("conversation_id", conversationId), Q.where("path", normalized))
    .fetch();

  return results.length > 0 ? appFileToStored(results[0]) : null;
}

/** List all files for a conversation. */
export async function getAppFilesOp(
  ctx: AppFileOperationsContext,
  conversationId: string
): Promise<StoredAppFile[]> {
  const results = await ctx.appFilesCollection
    .query(Q.where("conversation_id", conversationId))
    .fetch();

  return results.map(appFileToStored);
}

/** Get all files for a conversation as a path → content map (for sending to the runner). */
export async function getAppFileMapOp(
  ctx: AppFileOperationsContext,
  conversationId: string
): Promise<Record<string, string>> {
  const files = await getAppFilesOp(ctx, conversationId);
  const map: Record<string, string> = {};
  for (const f of files) map[f.path] = f.content;
  return map;
}

/** Delete a single file by conversationId and path. */
export async function deleteAppFileOp(
  ctx: AppFileOperationsContext,
  conversationId: string,
  path: string
): Promise<boolean> {
  const normalized = normalizePath(path);
  const results = await ctx.appFilesCollection
    .query(Q.where("conversation_id", conversationId), Q.where("path", normalized))
    .fetch();

  if (results.length === 0) return false;

  await ctx.database.write(async () => {
    await results[0].destroyPermanently();
  });

  return true;
}

/** Delete all files for a conversation. */
export async function deleteAllAppFilesOp(
  ctx: AppFileOperationsContext,
  conversationId: string
): Promise<void> {
  const results = await ctx.appFilesCollection
    .query(Q.where("conversation_id", conversationId))
    .fetch();

  if (results.length === 0) return;

  await ctx.database.write(async () => {
    const batch = results.map((file) => file.prepareDestroyPermanently());
    await ctx.database.batch(...batch);
  });
}
