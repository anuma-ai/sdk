import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";

import { Message, Conversation } from "./models";
import {
  type StoredMessage,
  type StoredConversation,
  type CreateMessageOptions,
  type CreateConversationOptions,
  generateConversationId,
} from "./types";

/**
 * Convert a Message model to StoredMessage
 */
export function messageToStored(message: Message): StoredMessage {
  return {
    uniqueId: message.id,
    messageId: message.messageId,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    model: message.model,
    files: message.files,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    vector: message.vector,
    embeddingModel: message.embeddingModel,
    usage: message.usage,
    sources: message.sources,
    responseDuration: message.responseDuration,
  };
}

/**
 * Convert a Conversation model to StoredConversation
 */
export function conversationToStored(
  conversation: Conversation
): StoredConversation {
  return {
    uniqueId: conversation.id,
    conversationId: conversation.conversationId,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    isDeleted: conversation.isDeleted,
  };
}

/**
 * Storage operations context
 */
export interface StorageOperationsContext {
  database: Database;
  messagesCollection: Collection<Message>;
  conversationsCollection: Collection<Conversation>;
}

/**
 * Create a new conversation
 */
export async function createConversationOp(
  ctx: StorageOperationsContext,
  opts?: CreateConversationOptions,
  defaultTitle: string = "New Conversation"
): Promise<StoredConversation> {
  const convId = opts?.conversationId || generateConversationId();
  const title = opts?.title || defaultTitle;

  const created = await ctx.database.write(async () => {
    return await ctx.conversationsCollection.create((conv) => {
      conv._setRaw("conversation_id", convId);
      conv._setRaw("title", title);
      conv._setRaw("is_deleted", false);
    });
  });

  return conversationToStored(created);
}

/**
 * Get a conversation by ID
 */
export async function getConversationOp(
  ctx: StorageOperationsContext,
  id: string
): Promise<StoredConversation | null> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  return results.length > 0 ? conversationToStored(results[0]) : null;
}

/**
 * Get all conversations (excluding soft-deleted)
 */
export async function getConversationsOp(
  ctx: StorageOperationsContext
): Promise<StoredConversation[]> {
  const results = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return results.map(conversationToStored);
}

/**
 * Update conversation title
 */
export async function updateConversationTitleOp(
  ctx: StorageOperationsContext,
  id: string,
  title: string
): Promise<void> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("title", title);
      });
    });
  }
}

/**
 * Soft delete a conversation
 */
export async function deleteConversationOp(
  ctx: StorageOperationsContext,
  id: string
): Promise<void> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("is_deleted", true);
      });
    });
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessagesOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<StoredMessage[]> {
  const results = await ctx.messagesCollection
    .query(Q.where("conversation_id", convId), Q.sortBy("message_id", Q.asc))
    .fetch();

  return results.map(messageToStored);
}

/**
 * Get message count for a conversation
 */
export async function getMessageCountOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<number> {
  return await ctx.messagesCollection
    .query(Q.where("conversation_id", convId))
    .fetchCount();
}

/**
 * Clear all messages in a conversation
 */
export async function clearMessagesOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<void> {
  const messages = await ctx.messagesCollection
    .query(Q.where("conversation_id", convId))
    .fetch();

  await ctx.database.write(async () => {
    for (const message of messages) {
      await message.destroyPermanently();
    }
  });
}

/**
 * Create a message in the database
 */
export async function createMessageOp(
  ctx: StorageOperationsContext,
  opts: CreateMessageOptions
): Promise<StoredMessage> {
  // Get the next message ID for this conversation
  const existingCount = await getMessageCountOp(ctx, opts.conversationId);
  const messageId = existingCount + 1;

  const created = await ctx.database.write(async () => {
    return await ctx.messagesCollection.create((msg) => {
      msg._setRaw("message_id", messageId);
      msg._setRaw("conversation_id", opts.conversationId);
      msg._setRaw("role", opts.role);
      msg._setRaw("content", opts.content);
      if (opts.model) msg._setRaw("model", opts.model);
      if (opts.files) msg._setRaw("files", JSON.stringify(opts.files));
      if (opts.usage) msg._setRaw("usage", JSON.stringify(opts.usage));
      if (opts.sources) msg._setRaw("sources", JSON.stringify(opts.sources));
      if (opts.responseDuration !== undefined)
        msg._setRaw("response_duration", opts.responseDuration);
      // vector and embeddingModel are not populated for now
    });
  });

  return messageToStored(created);
}
