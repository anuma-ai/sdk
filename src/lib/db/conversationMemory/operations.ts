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

  const now = Date.now();

  await ctx.database.write(async () => {
    const existing = await ctx.conversationMemoryCollection
      .query(Q.where("conversation_id", conversationId), Q.sortBy("created_at", Q.asc))
      .fetch();

    const seen = new Set(existing.map((r) => r.memoryId));
    const batchSeen = new Set<string>();
    const deduped: ConversationMemoryInput[] = [];
    for (const it of items) {
      if (!it.memoryId || seen.has(it.memoryId) || batchSeen.has(it.memoryId)) continue;
      batchSeen.add(it.memoryId);
      deduped.push(it);
    }
    if (deduped.length === 0) return;

    const keptNew =
      deduped.length > MAX_PER_CONVERSATION
        ? deduped.slice(deduped.length - MAX_PER_CONVERSATION)
        : deduped;
    const keepExistingCount = MAX_PER_CONVERSATION - keptNew.length;
    const pruneCount = Math.max(0, existing.length - keepExistingCount);
    const toPrune = existing.slice(0, pruneCount);

    const ops = [
      ...toPrune.map((r) => r.prepareDestroyPermanently()),
      ...keptNew.map((it, i) =>
        ctx.conversationMemoryCollection.prepareCreate((r) => {
          r._setRaw("conversation_id", conversationId);
          r._setRaw("memory_id", it.memoryId);
          r._setRaw("score", it.score);
          r._setRaw("created_at", now + i);
        })
      ),
    ];
    await ctx.database.batch(...ops);
  });
}

/** Records the memories a turn drew on in recall order, moving already-linked ones to this turn with their new score. */
export async function recordConversationMemoriesOp(
  ctx: ConversationMemoryOperationsContext,
  conversationId: string,
  items: ConversationMemoryInput[],
  now = Date.now()
): Promise<void> {
  const turn = new Map<string, { score: number; createdAt: number }>();
  items.forEach((item, i) => {
    if (item.memoryId && !turn.has(item.memoryId))
      turn.set(item.memoryId, { score: item.score, createdAt: now + i });
  });
  if (!conversationId || turn.size === 0) return;
  const kept = new Map([...turn].slice(-MAX_PER_CONVERSATION));

  await ctx.database.write(async () => {
    const existing = await ctx.conversationMemoryCollection
      .query(Q.where("conversation_id", conversationId), Q.sortBy("created_at", Q.asc))
      .fetch();
    const earlier = existing.filter((r) => !turn.has(r.memoryId));
    const linked = new Set(existing.map((r) => r.memoryId));
    await ctx.database.batch(
      ...earlier
        .slice(0, Math.max(0, earlier.length - (MAX_PER_CONVERSATION - kept.size)))
        .map((r) => r.prepareDestroyPermanently()),
      ...existing
        .filter((r) => turn.has(r.memoryId) && !kept.has(r.memoryId))
        .map((r) => r.prepareDestroyPermanently()),
      ...existing
        .filter((r) => kept.has(r.memoryId))
        .map((r) =>
          r.prepareUpdate((row) => {
            row._setRaw("score", kept.get(r.memoryId)!.score);
            row._setRaw("created_at", kept.get(r.memoryId)!.createdAt);
          })
        ),
      ...[...kept]
        .filter(([memoryId]) => !linked.has(memoryId))
        .map(([memoryId, link]) =>
          ctx.conversationMemoryCollection.prepareCreate((row) => {
            row._setRaw("conversation_id", conversationId);
            row._setRaw("memory_id", memoryId);
            row._setRaw("score", link.score);
            row._setRaw("created_at", link.createdAt);
          })
        )
    );
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
  await ctx.database.write(async () => {
    const rows = await ctx.conversationMemoryCollection
      .query(Q.where("conversation_id", conversationId))
      .fetch();
    if (rows.length === 0) return;
    await ctx.database.batch(...rows.map((r) => r.prepareDestroyPermanently()));
  });
}
