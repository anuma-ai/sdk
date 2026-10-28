import type { Collection, Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";

import { requestEncryptionKey } from "../../../react/useEncryption";
import { getLogger } from "../../logger";
import { decryptField, encryptField, isEncrypted } from "../encryption-utils";
import { ConversationSummary } from "./models";
import type { StorageOperationsContext } from "./operations";
import { assertConversationRevision, getConversationRevision } from "./summaryRevision";
import type { StoredConversationSummary } from "./types";

/** Context needed for summary operations */
interface SummaryOperationsContext extends Pick<
  StorageOperationsContext,
  "walletAddress" | "signMessage" | "embeddedWalletSigner"
> {
  database: Database;
  summariesCollection: Collection<ConversationSummary>;
}

/** Create a summary operations context from a database instance */
export function createSummaryContext(
  database: Database,
  encryption: Pick<
    SummaryOperationsContext,
    "walletAddress" | "signMessage" | "embeddedWalletSigner"
  > = {}
): SummaryOperationsContext {
  return {
    ...encryption,
    database,
    summariesCollection: database.get<ConversationSummary>("conversation_summaries"),
  };
}

function modelToStored(record: ConversationSummary, summary: string): StoredConversationSummary {
  return {
    uniqueId: record.id,
    conversationId: record.conversationId,
    summary,
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
  const record = results[0];
  const stored = modelToStored(record, record.summary);
  if (ctx.walletAddress && isEncrypted(stored.summary)) {
    if (ctx.signMessage) {
      try {
        await requestEncryptionKey(ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
      } catch (error) {
        getLogger().warn("Failed to request the encryption key for the summary:", error);
      }
    }
    stored.summary = await decryptField(stored.summary, ctx.walletAddress);
  } else if (ctx.walletAddress && ctx.signMessage && stored.summary) {
    try {
      const encryptedSummary = await encryptField(
        stored.summary,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
      await ctx.database.write(async () => {
        const current = await ctx.summariesCollection.query(Q.where("id", record.id)).fetch();
        if (current[0]?.summary === stored.summary) {
          await current[0].update((rec) => {
            rec.summary = encryptedSummary;
          });
        }
      });
    } catch (error) {
      getLogger().warn("Failed to encrypt the legacy summary:", error);
    }
  }
  return stored;
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
  const revision = getConversationRevision(ctx.database, conversationId);
  let record: ConversationSummary;
  const encryptedSummary = ctx.walletAddress
    ? await encryptField(summary, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : summary;

  await ctx.database.write(async () => {
    assertConversationRevision(ctx.database, conversationId, revision);
    const existing = await ctx.summariesCollection
      .query(Q.where("conversation_id", conversationId))
      .fetch();

    if (existing.length > 0) {
      record = await existing[0].update((rec) => {
        rec.summary = encryptedSummary;
        rec.summarizedUpTo = summarizedUpTo;
        rec.tokenCount = tokenCount;
      });
    } else {
      record = await ctx.summariesCollection.create((rec) => {
        rec.conversationId = conversationId;
        rec.summary = encryptedSummary;
        rec.summarizedUpTo = summarizedUpTo;
        rec.tokenCount = tokenCount;
      });
    }
  });

  return modelToStored(record!, summary);
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
    const existing = await ctx.summariesCollection
      .query(Q.where("conversation_id", conversationId))
      .fetch();

    for (const record of existing) {
      await record.destroyPermanently();
    }
  });
}
