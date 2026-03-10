import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";

import { PhoneCall } from "./models";
import type {
  StoredPhoneCall,
  PhoneCallStatus,
  CreatePhoneCallOptions,
  UpdatePhoneCallOptions,
} from "./types";

export function phoneCallToStored(record: PhoneCall): StoredPhoneCall {
  return {
    uniqueId: record.id,
    callId: record.callId,
    conversationId: record.conversationId,
    offerMessageId: record.offerMessageId,
    status: record.status as PhoneCallStatus,
    request: record.request,
    response: record.response,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export interface PhoneCallOperationsContext {
  database: Database;
  phoneCallsCollection: Collection<PhoneCall>;
}

/**
 * Create a new phone call record.
 */
export async function createPhoneCallOp(
  ctx: PhoneCallOperationsContext,
  opts: CreatePhoneCallOptions
): Promise<StoredPhoneCall> {
  const created = await ctx.database.write(async () => {
    return await ctx.phoneCallsCollection.create((record) => {
      record._setRaw("call_id", opts.callId);
      record._setRaw("conversation_id", opts.conversationId);
      record._setRaw("offer_message_id", opts.offerMessageId);
      record._setRaw("status", opts.status);
      record._setRaw("request", opts.request ?? "");
      record._setRaw("response", opts.response ?? "");
    });
  });

  return phoneCallToStored(created);
}

/**
 * Get a phone call record by the offer message ID that created it.
 */
export async function getPhoneCallByOfferOp(
  ctx: PhoneCallOperationsContext,
  offerMessageId: string
): Promise<StoredPhoneCall | null> {
  const results = await ctx.phoneCallsCollection
    .query(Q.where("offer_message_id", offerMessageId))
    .fetch();

  return results.length > 0 ? phoneCallToStored(results[0]) : null;
}

/**
 * Get all phone call records for a conversation, newest first.
 */
export async function getPhoneCallsByConversationOp(
  ctx: PhoneCallOperationsContext,
  conversationId: string
): Promise<StoredPhoneCall[]> {
  const results = await ctx.phoneCallsCollection
    .query(
      Q.where("conversation_id", conversationId),
      Q.sortBy("created_at", Q.desc)
    )
    .fetch();

  return results.map(phoneCallToStored);
}

/**
 * Update a phone call record looked up by offer message ID.
 */
export async function updatePhoneCallOp(
  ctx: PhoneCallOperationsContext,
  offerMessageId: string,
  opts: UpdatePhoneCallOptions
): Promise<boolean> {
  const results = await ctx.phoneCallsCollection
    .query(Q.where("offer_message_id", offerMessageId))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((record) => {
        if (opts.status !== undefined) record._setRaw("status", opts.status);
        if (opts.response !== undefined)
          record._setRaw("response", opts.response);
      });
    });
    return true;
  }
  return false;
}

/**
 * Delete all phone call records for a conversation.
 */
export async function deletePhoneCallsByConversationOp(
  ctx: PhoneCallOperationsContext,
  conversationId: string
): Promise<number> {
  const results = await ctx.phoneCallsCollection
    .query(Q.where("conversation_id", conversationId))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      for (const record of results) {
        await record.destroyPermanently();
      }
    });
  }
  return results.length;
}
