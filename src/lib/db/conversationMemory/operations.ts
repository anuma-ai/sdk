import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import { ConversationMemory } from "./models";
import type { ConversationMemoryInput, StoredConversationMemory } from "./types";

/**
 * Bounded per conversation so a very long session can't grow a bucket
 * unboundedly; oldest rows age out by created_at.
 */
export const MAX_PER_CONVERSATION = 200;

/** Context required by conversation-memory operations. */
export interface ConversationMemoryOperationsContext {
  database: Database;
  conversationMemoryCollection: Collection<ConversationMemory>;
}

/** Convert a WatermelonDB ConversationMemory model to a plain object. */
export function conversationMemoryToStored(row: ConversationMemory): StoredConversationMemory {
  return {
    uniqueId: row.id,
    conversationId: row.conversationId,
    memoryId: row.memoryId,
    score: row.score,
    createdAt: row.createdAt,
  };
}

/**
 * Record the memories a turn drew on for a conversation. Dedupes on
 * (conversation_id, memory_id) against existing rows, keeps insertion order, and
 * prunes the oldest rows beyond MAX_PER_CONVERSATION. No-ops on an empty
 * conversation id or empty item list.
 */
export async function addConversationMemoriesOp(
  ctx: ConversationMemoryOperationsContext,
  conversationId: string,
  items: ConversationMemoryInput[]
): Promise<void> {
  if (!conversationId || items.length === 0) return;

  const existing = await ctx.conversationMemoryCollection
    .query(Q.where("conversation_id", conversationId), Q.sortBy("created_at", Q.asc))
    .fetch();

  const seen = new Set(existing.map((r) => r.memoryId));
  const additions = items.filter((it) => it.memoryId && !seen.has(it.memoryId));
  // Dedupe within this turn's batch too.
  const deduped: ConversationMemoryInput[] = [];
  const batchSeen = new Set<string>();
  for (const it of additions) {
    if (batchSeen.has(it.memoryId)) continue;
    batchSeen.add(it.memoryId);
    deduped.push(it);
  }
  if (deduped.length === 0) return;

  const now = Date.now();
  const total = existing.length + deduped.length;
  // Oldest-first rows to prune so the conversation stays within the cap.
  const overflow = Math.max(0, total - MAX_PER_CONVERSATION);
  const toPrune = existing.slice(0, overflow);

  await ctx.database.write(async () => {
    const ops = [
      ...toPrune.map((r) => r.prepareDestroyPermanently()),
      ...deduped.map((it) =>
        ctx.conversationMemoryCollection.prepareCreate((r) => {
          r._setRaw("conversation_id", conversationId);
          r._setRaw("memory_id", it.memoryId);
          r._setRaw("score", it.score);
          r._setRaw("created_at", now);
        })
      ),
    ];
    await ctx.database.batch(...ops);
  });
}

/** List a conversation's recorded memories, oldest first. */
export async function getConversationMemoriesOp(
  ctx: ConversationMemoryOperationsContext,
  conversationId: string
): Promise<StoredConversationMemory[]> {
  if (!conversationId) return [];
  const rows = await ctx.conversationMemoryCollection
    .query(Q.where("conversation_id", conversationId), Q.sortBy("created_at", Q.asc))
    .fetch();
  return rows.map(conversationMemoryToStored);
}

/** Delete all recorded memories for a conversation (e.g. incognito purge). */
export async function clearConversationMemoriesOp(
  ctx: ConversationMemoryOperationsContext,
  conversationId: string
): Promise<void> {
  if (!conversationId) return;
  const rows = await ctx.conversationMemoryCollection
    .query(Q.where("conversation_id", conversationId))
    .fetch();
  if (rows.length === 0) return;
  await ctx.database.write(async () => {
    await ctx.database.batch(...rows.map((r) => r.prepareDestroyPermanently()));
  });
}
