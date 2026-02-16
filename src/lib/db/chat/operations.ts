import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";
import { v7 as uuidv7 } from "uuid";

import { Message, Conversation } from "./models";
import {
  type StoredMessage,
  type StoredMessageWithSimilarity,
  type StoredConversation,
  type StoredFileWithContext,
  type CreateMessageOptions,
  type CreateConversationOptions,
  type UpdateMessageOptions,
  type MessageChunk,
  type ChunkSearchResult,
  generateConversationId,
} from "./types";
import { encryptMessageFields, decryptMessageFields } from "./encryption";
import { encryptConversationFields, decryptConversationFields } from "./conversationEncryption";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";

export function messageToStoredRaw(message: Message): StoredMessage {
  // Use _getRaw for fields that may be encrypted - the @json decorator fails on encrypted strings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = message as any;
  const convId = raw._getRaw("conversation_id") as string;

  // For JSON fields that may be encrypted, get raw value and parse if not encrypted
  const parseJsonField = <T>(rawValue: unknown): T | undefined => {
    if (!rawValue) return undefined;
    if (typeof rawValue === 'string') {
      // If encrypted, return the string for later decryption
      if (rawValue.startsWith('enc:')) return rawValue as T;
      // Otherwise parse as JSON
      try {
        return JSON.parse(rawValue) as T;
      } catch {
        return undefined;
      }
    }
    return rawValue as T;
  };

  const sourcesRaw = raw._getRaw("sources");
  const vectorRaw = raw._getRaw("vector");
  const chunksRaw = raw._getRaw("chunks");
  const thoughtProcessRaw = raw._getRaw("thought_process");

  return {
    uniqueId: message.id,
    messageId: message.messageId,
    conversationId: convId,
    role: message.role,
    content: message.content,
    model: message.model,
    files: message.files,
    fileIds: message.fileIds,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    vector: parseJsonField(vectorRaw),
    embeddingModel: message.embeddingModel,
    chunks: parseJsonField(chunksRaw),
    usage: message.usage,
    sources: parseJsonField(sourcesRaw),
    responseDuration: message.responseDuration,
    wasStopped: message.wasStopped,
    error: message.error,
    thoughtProcess: parseJsonField(thoughtProcessRaw),
    thinking: message.thinking,
    parentMessageId: message.parentMessageId,
  };
}

/**
 * Converts a Message model to StoredMessage, decrypting fields if encryption context is available.
 */
export async function messageToStored(
  message: Message,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredMessage> {
  const baseMessage = messageToStoredRaw(message);

  // Decrypt fields if wallet address provided
  if (walletAddress) {
    return await decryptMessageFields(baseMessage, walletAddress, signMessage, embeddedWalletSigner);
  }

  return baseMessage;
}

export function conversationToStoredRaw(
  conversation: Conversation
): StoredConversation {
  return {
    uniqueId: conversation.id,
    conversationId: conversation.conversationId,
    title: conversation.title,
    projectId: conversation.projectId,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    isDeleted: conversation.isDeleted,
  };
}

/**
 * Converts a Conversation model to StoredConversation, decrypting fields if encryption context is available.
 */
export async function conversationToStored(
  conversation: Conversation,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredConversation> {
  const baseConversation = conversationToStoredRaw(conversation);

  // Decrypt fields if wallet address provided
  if (walletAddress) {
    return await decryptConversationFields(baseConversation, walletAddress, signMessage, embeddedWalletSigner);
  }

  return baseConversation;
}

export interface StorageOperationsContext {
  database: Database;
  messagesCollection: Collection<Message>;
  conversationsCollection: Collection<Conversation>;
  /** Wallet address for encryption (optional - when present, enables field-level encryption) */
  walletAddress?: string;
  /** Function to sign a message for encryption key derivation */
  signMessage?: SignMessageFn;
  /** Function for silent signing with embedded wallets */
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
}

export async function createConversationOp(
  ctx: StorageOperationsContext,
  opts?: CreateConversationOptions,
  defaultTitle: string = "New Conversation"
): Promise<StoredConversation> {
  const convId = opts?.conversationId || generateConversationId();
  const title = opts?.title || defaultTitle;

  // Encrypt conversation fields if encryption context is available
  const convOpts: CreateConversationOptions = { conversationId: convId, title, projectId: opts?.projectId };
  const encryptedOpts = ctx.walletAddress && ctx.signMessage
    ? await encryptConversationFields(convOpts, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : convOpts;

  const created = await ctx.database.write(async () => {
    return await ctx.conversationsCollection.create((conv) => {
      conv._setRaw("conversation_id", convId);
      conv._setRaw("title", encryptedOpts.title || title);
      if (opts?.projectId) conv._setRaw("project_id", opts.projectId);
      conv._setRaw("is_deleted", false);
    });
  });

  return conversationToStored(created, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

export async function getConversationOp(
  ctx: StorageOperationsContext,
  id: string
): Promise<StoredConversation | null> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  return results.length > 0
    ? await conversationToStored(results[0], ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : null;
}

export async function getConversationsOp(
  ctx: StorageOperationsContext
): Promise<StoredConversation[]> {
  const results = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return Promise.all(
    results.map((conv) => conversationToStored(conv, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
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
    // Encrypt title if encryption context is available
    const encryptedOpts = ctx.walletAddress && ctx.signMessage
      ? await encryptConversationFields({ title }, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
      : { title };
    const encryptedTitle = encryptedOpts.title || title;

    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("title", encryptedTitle);
      });
    });
    return true;
  }
  return false;
}

/**
 * Soft delete a conversation.
 * Note: useChatStorage hooks automatically cascade delete messages and media.
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
 * Update a conversation's project assignment.
 * Pass null to remove the conversation from any project.
 */
export async function updateConversationProjectOp(
  ctx: StorageOperationsContext,
  id: string,
  projectId: string | null
): Promise<boolean> {
  const results = await ctx.conversationsCollection
    .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((conv) => {
        conv._setRaw("project_id", projectId === null ? "" : projectId);
      });
    });
    return true;
  }
  return false;
}

/**
 * Get conversations filtered by project ID.
 * Pass null to get conversations that don't belong to any project.
 */
export async function getConversationsByProjectOp(
  ctx: StorageOperationsContext,
  projectId: string | null
): Promise<StoredConversation[]> {
  const results = await ctx.conversationsCollection
    .query(
      Q.where("project_id", projectId === null ? "" : projectId),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .fetch();

  return Promise.all(
    results.map((conv) => conversationToStored(conv, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
}

export async function getMessagesOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<StoredMessage[]> {
  const results = await ctx.messagesCollection
    .query(Q.where("conversation_id", convId), Q.sortBy("message_id", Q.asc))
    .fetch();

  return Promise.all(
    results.map((msg) => messageToStored(msg, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
}


export async function getMessageCountOp(
  ctx: StorageOperationsContext,
  convId: string
): Promise<number> {
  return await ctx.messagesCollection
    .query(Q.where("conversation_id", convId))
    .fetchCount();
}

/**
 * Clear all messages in a conversation.
 * Clears file_ids before deletion.
 * Note: useChatStorage hooks automatically cascade delete media.
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
      // Clear file references before deletion
      await message.update((msg) => {
        msg._setRaw("file_ids", null);
        msg._setRaw("files", null);
      });
      await message.destroyPermanently();
    }
  });
}

/**
 * Delete a single message by its unique ID.
 * Clears file_ids before deletion and returns the unique ID.
 * Note: Callers should use deleteMediaByMessageOp to cascade delete media.
 */
export async function deleteMessageOp(
  ctx: StorageOperationsContext,
  uniqueId: string
): Promise<string | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  await ctx.database.write(async () => {
    // Clear file references before deletion
    await message.update((msg) => {
      msg._setRaw("file_ids", null);
      msg._setRaw("files", null);
    });
    await message.destroyPermanently();
  });

  return uniqueId;
}

export async function createMessageOp(
  ctx: StorageOperationsContext,
  opts: CreateMessageOptions
): Promise<StoredMessage> {
  const existingCount = await getMessageCountOp(ctx, opts.conversationId);
  const messageId = existingCount + 1;

  // Encrypt message fields if encryption context is available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encryptedOpts: any = ctx.walletAddress && ctx.signMessage
    ? await encryptMessageFields(opts, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : opts;

  const created = await ctx.database.write(async () => {
    return await ctx.messagesCollection.create((msg) => {
      msg._setRaw("message_id", messageId);
      msg._setRaw("conversation_id", encryptedOpts.conversationId);
      msg._setRaw("role", encryptedOpts.role);
      msg._setRaw("content", encryptedOpts.content);
      if (encryptedOpts.model) msg._setRaw("model", encryptedOpts.model);
      if (encryptedOpts.files) msg._setRaw("files", JSON.stringify(encryptedOpts.files));
      if (encryptedOpts.fileIds) msg._setRaw("file_ids", JSON.stringify(encryptedOpts.fileIds));
      if (encryptedOpts.usage) msg._setRaw("usage", JSON.stringify(encryptedOpts.usage));
      if (encryptedOpts.sources) {
        // Sources may already be encrypted as a string, or may be an object to serialize
        const sourcesValue = typeof encryptedOpts.sources === 'string'
          ? encryptedOpts.sources
          : JSON.stringify(encryptedOpts.sources);
        msg._setRaw("sources", sourcesValue);
      }
      if (encryptedOpts.responseDuration !== undefined)
        msg._setRaw("response_duration", encryptedOpts.responseDuration);
      if (encryptedOpts.vector) {
        // Vector may already be encrypted as a string, or may be an array to serialize
        const vectorValue = typeof encryptedOpts.vector === 'string'
          ? encryptedOpts.vector
          : JSON.stringify(encryptedOpts.vector);
        msg._setRaw("vector", vectorValue);
      }
      if (encryptedOpts.embeddingModel)
        msg._setRaw("embedding_model", encryptedOpts.embeddingModel);
      if (encryptedOpts.wasStopped) msg._setRaw("was_stopped", encryptedOpts.wasStopped);
      if (encryptedOpts.error) msg._setRaw("error", encryptedOpts.error);
      if (encryptedOpts.thoughtProcess) {
        // ThoughtProcess may already be encrypted as a string, or may be an object to serialize
        const tpValue = typeof encryptedOpts.thoughtProcess === 'string'
          ? encryptedOpts.thoughtProcess
          : JSON.stringify(encryptedOpts.thoughtProcess);
        msg._setRaw("thought_process", tpValue);
      }
      if (encryptedOpts.thinking) msg._setRaw("thinking", encryptedOpts.thinking);
      if (encryptedOpts.parentMessageId) msg._setRaw("parent_message_id", encryptedOpts.parentMessageId);
    });
  });

  return messageToStored(created, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
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

  // Note: Embeddings are stored unencrypted as they are not user-generated content
  // and are used for vector similarity search. They are only encrypted when stored
  // as part of a full message via createMessageOp/updateMessageOp.
  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("vector", JSON.stringify(vector));
      msg._setRaw("embedding_model", embeddingModel);
    });
  });

  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
}

export async function updateMessageChunksOp(
  ctx: StorageOperationsContext,
  uniqueId: string,
  chunks: MessageChunk[],
  embeddingModel: string
): Promise<StoredMessage | null> {
  let message;
  try {
    message = await ctx.messagesCollection.find(uniqueId);
  } catch {
    return null;
  }

  // Note: Chunks contain embeddings used for vector search, stored unencrypted
  // for the same reasons as updateMessageEmbeddingOp.
  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("chunks", JSON.stringify(chunks));
      msg._setRaw("embedding_model", embeddingModel);
    });
  });

  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
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

  // Error strings are not encrypted (they are system-generated, not user content)
  await ctx.database.write(async () => {
    await message.update((msg) => {
      msg._setRaw("error", error);
    });
  });

  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
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

  // Encrypt update fields if encryption context is available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encryptedOpts: any = ctx.walletAddress && ctx.signMessage
    ? await encryptMessageFields(opts, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : opts;

  await ctx.database.write(async () => {
    await message.update((msg) => {
      if (encryptedOpts.content !== undefined) msg._setRaw("content", encryptedOpts.content);
      if (encryptedOpts.model !== undefined) msg._setRaw("model", encryptedOpts.model);
      if (encryptedOpts.files !== undefined)
        msg._setRaw("files", JSON.stringify(encryptedOpts.files));
      if (encryptedOpts.fileIds !== undefined)
        msg._setRaw("file_ids", JSON.stringify(encryptedOpts.fileIds));
      if (encryptedOpts.usage !== undefined)
        msg._setRaw("usage", JSON.stringify(encryptedOpts.usage));
      if (encryptedOpts.sources !== undefined) {
        const sourcesValue = typeof encryptedOpts.sources === 'string'
          ? encryptedOpts.sources
          : JSON.stringify(encryptedOpts.sources);
        msg._setRaw("sources", sourcesValue);
      }
      if (encryptedOpts.responseDuration !== undefined)
        msg._setRaw("response_duration", encryptedOpts.responseDuration);
      if (encryptedOpts.vector !== undefined) {
        const vectorValue = typeof encryptedOpts.vector === 'string'
          ? encryptedOpts.vector
          : JSON.stringify(encryptedOpts.vector);
        msg._setRaw("vector", vectorValue);
      }
      if (encryptedOpts.embeddingModel !== undefined)
        msg._setRaw("embedding_model", encryptedOpts.embeddingModel);
      if (encryptedOpts.wasStopped !== undefined)
        msg._setRaw("was_stopped", encryptedOpts.wasStopped);
      if (encryptedOpts.error !== undefined)
        msg._setRaw("error", encryptedOpts.error === null ? "" : encryptedOpts.error);
      if (encryptedOpts.thoughtProcess !== undefined) {
        const tpValue = typeof encryptedOpts.thoughtProcess === 'string'
          ? encryptedOpts.thoughtProcess
          : JSON.stringify(encryptedOpts.thoughtProcess);
        msg._setRaw("thought_process", tpValue);
      }
      if (encryptedOpts.thinking !== undefined)
        msg._setRaw("thinking", encryptedOpts.thinking === null ? "" : encryptedOpts.thinking);
    });
  });

  return messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
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
    // Use _getRaw for reliable raw column access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeConversations.map((c) => (c as any)._getRaw("conversation_id") as string)
  );

  const queryConditions = conversationId
    ? [Q.where("conversation_id", conversationId)]
    : [];

  const messages = await ctx.messagesCollection
    .query(...queryConditions)
    .fetch();

  const resultsWithSimilarity: StoredMessageWithSimilarity[] = [];

  const matchPromises: Promise<StoredMessageWithSimilarity | null>[] = [];

  for (const message of messages) {
    // Use _getRaw for reliable raw column access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgConvId = (message as any)._getRaw("conversation_id") as string;
    if (!activeConversationIds.has(msgConvId)) continue;

    const messageVector = message.vector;
    if (!messageVector || messageVector.length === 0) continue;

    const similarity = cosineSimilarity(queryVector, messageVector);
    if (similarity >= minSimilarity) {
      matchPromises.push(
        messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner).then(
          (stored) => ({ ...stored, similarity })
        )
      );
    }
  }

  const resolvedResults = await Promise.all(matchPromises);
  const validResults = resolvedResults.filter((r): r is StoredMessageWithSimilarity => r !== null);

  return validResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Search through message chunks for fine-grained semantic search.
 * Returns the matching chunk text along with the parent message.
 */
export async function searchChunksOp(
  ctx: StorageOperationsContext,
  queryVector: number[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    conversationId?: string;
  }
): Promise<ChunkSearchResult[]> {
  const { limit = 10, minSimilarity = 0.5, conversationId } = options || {};

  const activeConversations = await ctx.conversationsCollection
    .query(Q.where("is_deleted", false))
    .fetch();
  const activeConversationIds = new Set(
    // Use _getRaw for reliable raw column access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeConversations.map((c) => (c as any)._getRaw("conversation_id") as string)
  );

  const queryConditions = conversationId
    ? [Q.where("conversation_id", conversationId)]
    : [];

  const messages = await ctx.messagesCollection
    .query(...queryConditions)
    .fetch();

  const chunkMatchPromises: Promise<ChunkSearchResult>[] = [];

  for (const message of messages) {
    // Use _getRaw for reliable raw column access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgConvId = (message as any)._getRaw("conversation_id") as string;
    if (!activeConversationIds.has(msgConvId)) continue;

    const chunks = message.chunks;

    // If message has chunks, search through them
    if (chunks && chunks.length > 0) {
      for (const chunk of chunks) {
        if (!chunk.vector || chunk.vector.length === 0) continue;

        const similarity = cosineSimilarity(queryVector, chunk.vector);
        if (similarity >= minSimilarity) {
          chunkMatchPromises.push(
            messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner).then(
              (stored) => ({ chunkText: chunk.text, message: stored, similarity })
            )
          );
        }
      }
    } else {
      // Fallback to whole message vector if no chunks
      const messageVector = message.vector;
      if (!messageVector || messageVector.length === 0) continue;

      const similarity = cosineSimilarity(queryVector, messageVector);
      if (similarity >= minSimilarity) {
        chunkMatchPromises.push(
          messageToStored(message, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner).then(
            (stored) => ({ chunkText: message.content, message: stored, similarity })
          )
        );
      }
    }
  }

  const results = await Promise.all(chunkMatchPromises);

  return results
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
    // Use _getRaw for reliable raw column access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeConversations.map((c) => (c as any)._getRaw("conversation_id") as string)
  );

  const queryConditions = conversationId
    ? [Q.where("conversation_id", conversationId)]
    : [];

  const messages = await ctx.messagesCollection
    .query(...queryConditions)
    .fetch();

  const filtered = messages.filter((m) => {
    // Use _getRaw for reliable raw column access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgConvId = (m as any)._getRaw("conversation_id") as string;
    return m.vector && m.vector.length > 0 && activeConversationIds.has(msgConvId);
  });

  return Promise.all(
    filtered.map((msg) => messageToStored(msg, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
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
    // Use _getRaw for reliable raw column access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeConversations.map((c) => (c as any)._getRaw("conversation_id") as string)
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
    // Use _getRaw for reliable raw column access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgConvId = (message as any)._getRaw("conversation_id") as string;
    if (!activeConversationIds.has(msgConvId)) continue;

    // Skip messages without files
    const files = message.files;
    if (!files || files.length === 0) continue;

    // Add each file with conversation context
    for (const file of files) {
      filesWithContext.push({
        ...file,
        conversationId: msgConvId,
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

/**
 * Create a synthetic StoredMessage from CreateMessageOptions without a DB round-trip.
 * Used when writes are queued (encryption key not yet available).
 * The uniqueId is temporary and will be replaced when the operation is flushed.
 */
export function makeSyntheticStoredMessage(opts: CreateMessageOptions): StoredMessage {
  const now = new Date();
  return {
    uniqueId: `queued_${uuidv7()}`,
    messageId: Number.MAX_SAFE_INTEGER, // Placeholder — DB assigns real sequential ID on flush
    conversationId: opts.conversationId,
    role: opts.role,
    content: opts.content,
    model: opts.model,
    files: opts.files,
    fileIds: opts.fileIds,
    createdAt: now,
    updatedAt: now,
    vector: opts.vector,
    embeddingModel: opts.embeddingModel,
    usage: opts.usage,
    sources: opts.sources,
    responseDuration: opts.responseDuration,
    wasStopped: opts.wasStopped,
    error: opts.error,
    thoughtProcess: opts.thoughtProcess,
    thinking: opts.thinking,
    parentMessageId: opts.parentMessageId,
  };
}

/**
 * Create a synthetic StoredConversation from CreateConversationOptions without a DB round-trip.
 * Used when writes are queued (encryption key not yet available).
 */
export function makeSyntheticStoredConversation(
  opts?: CreateConversationOptions,
  defaultTitle?: string
): StoredConversation {
  const now = new Date();
  return {
    uniqueId: `queued_${uuidv7()}`,
    conversationId: opts?.conversationId || generateConversationId(),
    title: opts?.title || defaultTitle || "New Conversation",
    projectId: opts?.projectId,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };
}
