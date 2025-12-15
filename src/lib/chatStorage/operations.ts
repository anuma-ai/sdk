import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";

import { Message, Conversation } from "./models";
import {
  type StoredMessage,
  type StoredMessageWithSimilarity,
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
 * @returns true if update was performed, false if no non-deleted conversation was found
 */
export async function updateConversationTitleOp(
  ctx: StorageOperationsContext,
  id: string,
  title: string
): Promise<boolean> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("title", title);
      });
    });
    return true;
  }
  return false;
}

/**
 * Soft delete a conversation
 * @returns true if delete was performed, false if no non-deleted conversation was found
 */
export async function deleteConversationOp(
  ctx: StorageOperationsContext,
  id: string
): Promise<boolean> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("is_deleted", true);
      });
    });
    return true;
  }
  return false;
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
      if (opts.vector) msg._setRaw("vector", JSON.stringify(opts.vector));
      if (opts.embeddingModel) msg._setRaw("embedding_model", opts.embeddingModel);
    });
  });

  return messageToStored(created);
}

/**
 * Update message embedding in the database
 */
export async function updateMessageEmbeddingOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  vector: number[],
  embeddingModel: string
): Promise<void> {
  const message = await ctx.messagesCollection.find(uniqueId);
  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("vector", JSON.stringify(vector));
      msg._setRaw("embedding_model", embeddingModel);
    });
  });
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Search messages by vector similarity
 * Excludes messages from soft-deleted conversations
 */
export async function searchMessagesOp(
  ctx: StorageOperationsContext,
  queryVector: number[],
  options?: {
    /** Limit the number of results (default: 10) */
    limit?: number;
    /** Minimum similarity threshold (default: 0.5) */
    minSimilarity?: number;
    /** Filter by conversation ID */
    conversationId?: string;
  }
): Promise<StoredMessageWithSimilarity[]> {
  const { limit = 10, minSimilarity = 0.5, conversationId } = options || {};

  // Get IDs of non-deleted conversations to filter messages
  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => c.conversationId)
  );

  // Build query
  const queryConditions = conversationId
    ? [Q.where("conversation_id", conversationId)]
    : [];

  const messages = await ctx.messagesCollection.query(...queryConditions).fetch();

  // Calculate similarity for messages with embeddings
  const resultsWithSimilarity: StoredMessageWithSimilarity[] = [];

  for (const message of messages) {
    // Skip messages from deleted conversations
    if (!activeConversationIds.has(message.conversationId)) continue;

    const messageVector = message.vector;
    if (!messageVector || messageVector.length === 0) continue;

    const similarity = cosineSimilarity(queryVector, messageVector);
    if (similarity >= minSimilarity) {
      resultsWithSimilarity.push({
        ...messageToStored(message),
        similarity,
      });
    }
  }

  // Sort by similarity descending and limit results
  return resultsWithSimilarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Get all messages that have embeddings
 * Excludes messages from soft-deleted conversations
 */
export async function getMessagesWithEmbeddingsOp(
  ctx: StorageOperationsContext,
  conversationId?: string
): Promise<StoredMessage[]> {
  // Get IDs of non-deleted conversations to filter messages
  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => c.conversationId)
  );

  const queryConditions = conversationId
    ? [Q.where("conversation_id", conversationId)]
    : [];

  const messages = await ctx.messagesCollection.query(...queryConditions).fetch();

  return messages
    .filter(
      (m) =>
        m.vector &&
        m.vector.length > 0 &&
        activeConversationIds.has(m.conversationId)
    )
    .map(messageToStored);
}
