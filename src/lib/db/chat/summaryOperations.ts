import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import { ConversationSummary } from "./models";
import type { StoredConversationSummary } from "./types";

/** Context needed for summary operations */
export interface SummaryOperationsContext {
  database: Database;
  summariesCollection: Collection<ConversationSummary>;
}

/** Create a summary operations context from a database instance */
export function createSummaryContext(database: Database): SummaryOperationsContext {
  return {
    database,
    summariesCollection: database.get<ConversationSummary>("conversation_summaries"),
  };
}

function modelToStored(record: ConversationSummary): StoredConversationSummary {
  return {
    uniqueId: record.id,
    conversationId: record.conversationId,
    summary: record.summary,
    summarizedUpTo: record.summarizedUpTo,
    tokenCount: record.tokenCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Get the cached summary for a conversation.
 * Returns null if no summary exists yet.
 */
export async function getConversationSummaryOp(
  ctx: SummaryOperationsContext,
  conversationId: string
): Promise<StoredConversationSummary | null> {
  const results = await ctx.summariesCollection
    .query(Q.where("conversation_id", conversationId))
    .fetch();

  if (results.length === 0) return null;
  return modelToStored(results[0]);
}

/**
 * Create or update the summary cache for a conversation.
 * Upserts: creates if not exists, updates if exists.
 */
export async function upsertConversationSummaryOp(
  ctx: SummaryOperationsContext,
  conversationId: string,
  summary: string,
  summarizedUpTo: string,
  tokenCount: number
): Promise<StoredConversationSummary> {
  let record: ConversationSummary;

  await ctx.database.write(async () => {
    // Query inside write() to prevent race conditions (two rapid sends
    // both seeing length === 0 and creating duplicate rows).
    const existing = await ctx.summariesCollection
      .query(Q.where("conversation_id", conversationId))
      .fetch();

    if (existing.length > 0) {
      record = await existing[0].update((rec) => {
        rec.summary = summary;
        rec.summarizedUpTo = summarizedUpTo;
        rec.tokenCount = tokenCount;
      });
    } else {
      record = await ctx.summariesCollection.create((rec) => {
        rec.conversationId = conversationId;
        rec.summary = summary;
        rec.summarizedUpTo = summarizedUpTo;
        rec.tokenCount = tokenCount;
      });
    }
  });

  return modelToStored(record!);
}

/**
 * Delete the summary cache for a conversation.
 * Called when a conversation is deleted or when the summary needs to be invalidated.
 */
export async function deleteConversationSummaryOp(
  ctx: SummaryOperationsContext,
  conversationId: string
): Promise<void> {
  await ctx.database.write(async () => {
    // Query inside write() to prevent TOCTOU race with concurrent deletes.
    const existing = await ctx.summariesCollection
      .query(Q.where("conversation_id", conversationId))
      .fetch();

    for (const record of existing) {
      await record.destroyPermanently();
    }
  });
}
