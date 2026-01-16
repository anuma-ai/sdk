import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";

import { Message, Conversation } from "./models";
import {
  type StoredMessage,
  type StoredMessageWithSimilarity,
  type StoredConversation,
  type StoredFileWithContext,
  type CreateMessageOptions,
  type CreateConversationOptions,
  type UpdateMessageOptions,
  generateConversationId,
} from "./types";

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
    wasStopped: message.wasStopped,
    error: message.error,
    thoughtProcess: message.thoughtProcess,
    thinking: message.thinking,
  };
}

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

export interface StorageOperationsContext {
  database: Database;
  messagesCollection: Collection<Message>;
  conversationsCollection: Collection<Conversation>;
}

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

export async function getConversationOp(
  ctx: StorageOperationsContext,
  id: string
): Promise<StoredConversation | null> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  return results.length > 0 ? conversationToStored(results[0]) : null;
}

export async function getConversationsOp(
  ctx: StorageOperationsContext
): Promise<StoredConversation[]> {
  const results = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return results.map(conversationToStored);
}

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

export async function getMessagesOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<StoredMessage[]> {
  const results = await ctx.messagesCollection
    .query(Q.where("conversation_id", convId), Q.sortBy("message_id", Q.asc))
    .fetch();

  return results.map(messageToStored);
}

export async function getMessageCountOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<number> {
  return await ctx.messagesCollection
    .query(Q.where("conversation_id", convId))
    .fetchCount();
}

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

export async function createMessageOp(
  ctx: StorageOperationsContext,
  opts: CreateMessageOptions
): Promise<StoredMessage> {
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
      if (opts.embeddingModel)
        msg._setRaw("embedding_model", opts.embeddingModel);
      if (opts.wasStopped) msg._setRaw("was_stopped", opts.wasStopped);
      if (opts.error) msg._setRaw("error", opts.error);
      if (opts.thoughtProcess)
        msg._setRaw("thought_process", JSON.stringify(opts.thoughtProcess));
      if (opts.thinking) msg._setRaw("thinking", opts.thinking);
    });
  });

  return messageToStored(created);
}

export async function updateMessageEmbeddingOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  vector: number[],
  embeddingModel: string
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("vector", JSON.stringify(vector));
      msg._setRaw("embedding_model", embeddingModel);
    });
  });

  return messageToStored(message);
}

export async function updateMessageErrorOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  error: string
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("error", error);
    });
  });

  return messageToStored(message);
}

export async function updateMessageOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  opts: UpdateMessageOptions
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  await ctx.database.write(async () => {
    await message.update((msg) => {
      if (opts.content !== undefined) msg._setRaw("content", opts.content);
      if (opts.model !== undefined) msg._setRaw("model", opts.model);
      if (opts.files !== undefined)
        msg._setRaw("files", JSON.stringify(opts.files));
      if (opts.usage !== undefined)
        msg._setRaw("usage", JSON.stringify(opts.usage));
      if (opts.sources !== undefined)
        msg._setRaw("sources", JSON.stringify(opts.sources));
      if (opts.responseDuration !== undefined)
        msg._setRaw("response_duration", opts.responseDuration);
      if (opts.vector !== undefined)
        msg._setRaw("vector", JSON.stringify(opts.vector));
      if (opts.embeddingModel !== undefined)
        msg._setRaw("embedding_model", opts.embeddingModel);
      if (opts.wasStopped !== undefined)
        msg._setRaw("was_stopped", opts.wasStopped);
      if (opts.error !== undefined)
        msg._setRaw("error", opts.error === null ? "" : opts.error);
      if (opts.thoughtProcess !== undefined)
        msg._setRaw("thought_process", JSON.stringify(opts.thoughtProcess));
      if (opts.thinking !== undefined)
        msg._setRaw("thinking", opts.thinking === null ? "" : opts.thinking);
    });
  });

  return messageToStored(message);
}

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

export async function searchMessagesOp(
  ctx: StorageOperationsContext,
  queryVector: number[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    conversationId?: string;
  }
): Promise<StoredMessageWithSimilarity[]> {
  const { limit = 10, minSimilarity = 0.5, conversationId } = options || {};

  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => c.conversationId)
  );

  const queryConditions = conversationId
    ? [Q.where("conversation_id", conversationId)]
    : [];

  const messages = await ctx.messagesCollection
    .query(...queryConditions)
    .fetch();

  const resultsWithSimilarity: StoredMessageWithSimilarity[] = [];

  for (const message of messages) {
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

  return resultsWithSimilarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export async function getMessagesWithEmbeddingsOp(
  ctx: StorageOperationsContext,
  conversationId?: string
): Promise<StoredMessage[]> {
  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => c.conversationId)
  );

  const queryConditions = conversationId
    ? [Q.where("conversation_id", conversationId)]
    : [];

  const messages = await ctx.messagesCollection
    .query(...queryConditions)
    .fetch();

  return messages
    .filter(
      (m) =>
        m.vector &&
        m.vector.length > 0 &&
        activeConversationIds.has(m.conversationId)
    )
    .map(messageToStored);
}

/**
 * Get all files from all conversations, sorted by creation date (newest first).
 * Returns files with conversation context for building file browser UIs.
 */
export async function getAllFilesOp(
  ctx: StorageOperationsContext,
  options?: {
    /** Filter files by conversation ID */
    conversationId?: string;
    /** Maximum number of files to return */
    limit?: number;
  }
): Promise<StoredFileWithContext[]> {
  const { conversationId, limit } = options || {};

  // Get active conversations
  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    activeConversations.map((c) => c.conversationId)
  );

  // Build query conditions
  const queryConditions = conversationId
    ? [Q.where("conversation_id", conversationId)]
    : [];

  // Fetch all messages, sorted by creation date descending
  const messages = await ctx.messagesCollection
    .query(...queryConditions, Q.sortBy("created_at", Q.desc))
    .fetch();

  // Extract files from messages
  const filesWithContext: StoredFileWithContext[] = [];

  for (const message of messages) {
    // Skip messages from deleted conversations
    if (!activeConversationIds.has(message.conversationId)) continue;

    // Skip messages without files
    const files = message.files;
    if (!files || files.length === 0) continue;

    // Add each file with conversation context
    for (const file of files) {
      filesWithContext.push({
        ...file,
        conversationId: message.conversationId,
        createdAt: message.createdAt,
        messageRole: message.role,
      });
    }

    // Check limit
    if (limit && filesWithContext.length >= limit) {
      return filesWithContext.slice(0, limit);
    }
  }

  return filesWithContext;
}
