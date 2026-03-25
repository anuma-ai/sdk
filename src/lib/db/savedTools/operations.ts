import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import { SavedTool } from "./models";
import type { CreateSavedToolOptions, StoredSavedTool, UpdateSavedToolOptions } from "./types";

/** Context required by saved tool operations. */
export interface SavedToolOperationsContext {
  database: Database;
  savedToolsCollection: Collection<SavedTool>;
}

/** Convert a WatermelonDB SavedTool model to a plain StoredSavedTool object. */
export function savedToolToStored(tool: SavedTool): StoredSavedTool {
  return {
    uniqueId: tool.id,
    name: tool.name,
    displayName: tool.displayName,
    description: tool.description,
    parameters: tool.parameters,
    html: tool.html,
    conversationId: tool.conversationId,
    createdAt: tool.createdAt,
    updatedAt: tool.updatedAt,
    isDeleted: tool.isDeleted,
  };
}

/** Create a new saved tool record. */
export async function createSavedToolOp(
  ctx: SavedToolOperationsContext,
  opts: CreateSavedToolOptions
): Promise<StoredSavedTool> {
  const now = Date.now();

  const created = await ctx.database.write(async () => {
    return await ctx.savedToolsCollection.create((tool) => {
      tool._setRaw("name", opts.name);
      tool._setRaw("display_name", opts.displayName);
      tool._setRaw("description", opts.description);
      tool._setRaw("parameters", JSON.stringify(opts.parameters));
      tool._setRaw("html", opts.html);
      if (opts.conversationId) tool._setRaw("conversation_id", opts.conversationId);
      tool._setRaw("created_at", now);
      tool._setRaw("updated_at", now);
      tool._setRaw("is_deleted", false);
    });
  });

  return savedToolToStored(created);
}

/** Fetch all non-deleted saved tools, sorted by creation date (newest first). */
export async function getAllSavedToolsOp(ctx: SavedToolOperationsContext): Promise<StoredSavedTool[]> {
  const results = await ctx.savedToolsCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return results.map(savedToolToStored);
}

/** Fetch a single saved tool by its WatermelonDB ID. Returns null if not found or deleted. */
export async function getSavedToolByIdOp(
  ctx: SavedToolOperationsContext,
  uniqueId: string
): Promise<StoredSavedTool | null> {
  try {
    const tool = await ctx.savedToolsCollection.find(uniqueId);
    if (tool.isDeleted) return null;
    return savedToolToStored(tool);
  } catch {
    return null;
  }
}

/** Update an existing saved tool. Returns true if the record was found and updated. */
export async function updateSavedToolOp(
  ctx: SavedToolOperationsContext,
  uniqueId: string,
  opts: UpdateSavedToolOptions
): Promise<boolean> {
  try {
    const tool = await ctx.savedToolsCollection.find(uniqueId);
    const now = Date.now();

    await ctx.database.write(async () => {
      await tool.update((t) => {
        if (opts.name !== undefined) t._setRaw("name", opts.name);
        if (opts.displayName !== undefined) t._setRaw("display_name", opts.displayName);
        if (opts.description !== undefined) t._setRaw("description", opts.description);
        if (opts.parameters !== undefined) t._setRaw("parameters", JSON.stringify(opts.parameters));
        if (opts.html !== undefined) t._setRaw("html", opts.html);
        t._setRaw("updated_at", now);
      });
    });

    return true;
  } catch {
    return false;
  }
}

/** Soft-delete a saved tool. Returns true if the record was found and deleted. */
export async function deleteSavedToolOp(
  ctx: SavedToolOperationsContext,
  uniqueId: string
): Promise<boolean> {
  try {
    const tool = await ctx.savedToolsCollection.find(uniqueId);
    const now = Date.now();

    await ctx.database.write(async () => {
      await tool.update((t) => {
        t._setRaw("is_deleted", true);
        t._setRaw("updated_at", now);
      });
    });

    return true;
  } catch {
    return false;
  }
}
