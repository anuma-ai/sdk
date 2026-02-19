import { Q } from "@nozbe/watermelondb";
import { DisplayInteraction } from "./models";
import type {
  StoredDisplayInteraction,
  CreateDisplayInteractionOptions,
  DisplayInteractionOperationsContext,
} from "./types";
import { generateDisplayInteractionId } from "./types";

/**
 * Convert a DisplayInteraction model instance to a plain object.
 */
function toStored(record: DisplayInteraction): StoredDisplayInteraction {
  return {
    id: record.id,
    interactionId: record.interactionId,
    conversationId: record.conversationId,
    messageId: record.messageId,
    displayType: record.displayType,
    toolVersion: record.toolVersion,
    result: record.result,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Persist a new display interaction to the database.
 */
export async function createDisplayInteractionOp(
  ctx: DisplayInteractionOperationsContext,
  options: CreateDisplayInteractionOptions
): Promise<StoredDisplayInteraction> {
  const collection = ctx.database.get<DisplayInteraction>("display_interactions");
  let record!: DisplayInteraction;
  await ctx.database.write(async () => {
    record = await collection.create((r) => {
      r.interactionId = options.interactionId ?? generateDisplayInteractionId();
      r.conversationId = options.conversationId;
      r.messageId = options.messageId;
      r.displayType = options.displayType;
      r.toolVersion = options.toolVersion;
      r.result = options.result;
    });
  });
  return toStored(record);
}

/**
 * Fetch all display interactions for a conversation, ordered by creation time.
 */
export async function getDisplayInteractionsByConversationOp(
  ctx: DisplayInteractionOperationsContext,
  conversationId: string
): Promise<StoredDisplayInteraction[]> {
  const collection = ctx.database.get<DisplayInteraction>("display_interactions");
  const records = await collection
    .query(
      Q.where("conversation_id", conversationId),
      Q.sortBy("created_at", Q.asc)
    )
    .fetch();
  return records.map(toStored);
}

/**
 * Delete all display interactions for a conversation.
 * Used when a conversation is deleted or its display data should be cleared.
 */
export async function deleteDisplayInteractionsByConversationOp(
  ctx: DisplayInteractionOperationsContext,
  conversationId: string
): Promise<void> {
  const collection = ctx.database.get<DisplayInteraction>("display_interactions");
  const records = await collection
    .query(Q.where("conversation_id", conversationId))
    .fetch();
  await ctx.database.write(async () => {
    await Promise.all(records.map((r) => r.destroyPermanently()));
  });
}
