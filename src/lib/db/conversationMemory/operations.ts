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

  // Read existing rows, dedupe, prune, and write all inside a single
  // database.write() so two concurrent calls for the same conversation can't
  // both act on a stale snapshot — that would let duplicate
  // (conversation_id, memory_id) pairs slip in or push the row count past the
  // cap (mirrors linkMemoryEntitiesOp, which reads inside the writer for the
  // same reason).
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

    // Enforce the per-conversation cap over the RESULTING set (existing + new),
    // keeping the newest. New rows are newest, so if a single batch alone
    // exceeds the cap, keep only its newest MAX and drop every existing row;
    // otherwise keep all new rows plus the newest existing that still fit.
    const keptNew =
      deduped.length > MAX_PER_CONVERSATION
        ? deduped.slice(deduped.length - MAX_PER_CONVERSATION)
        : deduped;
    const keepExistingCount = MAX_PER_CONVERSATION - keptNew.length;
    const pruneCount = Math.max(0, existing.length - keepExistingCount);
    const toPrune = existing.slice(0, pruneCount);

    const ops = [
      ...toPrune.map((r) => r.prepareDestroyPermanently()),
      // Stagger created_at by index within the batch: a turn records several
      // memories at once, so a single shared timestamp would make their order
      // ambiguous under the created_at sort (getConversationMemoriesOp, the cap
      // prune). `now + i` keeps insertion order stable and stays well below the
      // next turn's timestamp.
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
  // Fetch the rows to destroy INSIDE the writer (same reason as
  // addConversationMemoriesOp): a concurrent add committing between a read-then-
  // write here would otherwise survive the clear.
  await ctx.database.write(async () => {
    const rows = await ctx.conversationMemoryCollection
      .query(Q.where("conversation_id", conversationId))
      .fetch();
    if (rows.length === 0) return;
    await ctx.database.batch(...rows.map((r) => r.prepareDestroyPermanently()));
  });
}
