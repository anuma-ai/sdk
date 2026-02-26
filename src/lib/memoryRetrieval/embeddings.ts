/**
 * Memory Retrieval Embeddings
 *
 * Functions for generating and storing embeddings for conversation messages.
 */

import { postApiV1Embeddings } from "../../client";
import { getLogger } from "../logger";
import { BASE_URL } from "../../clientConfig";
import {
  getConversationsOp,
  getMessagesOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
} from "../db/chat/operations";
import type { MessageChunk, StoredMessage } from "../db/chat/types";
import {
  type ChunkingOptions,
  chunkText,
  DEFAULT_CHUNK_SIZE,
  shouldChunkMessage,
} from "./chunking";
import { DEFAULT_API_EMBEDDING_MODEL } from "./constants";
import type { EmbeddingOptions } from "./types";

/**
 * Default minimum content length for embedding.
 * Messages shorter than this are typically too short to provide
 * meaningful semantic search results (e.g., "ok", "thanks").
 */
export const DEFAULT_MIN_CONTENT_LENGTH = 10;

/**
 * Generate an embedding for text using the API
 *
 * Supports two auth methods:
 * - `apiKey`: Uses X-API-Key header (for server-side/CLI usage)
 * - `getToken`: Uses Authorization: Bearer header (for Privy identity tokens)
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions
): Promise<number[]> {
  const { baseUrl = BASE_URL, getToken, apiKey, model } = options;

  // Build auth headers - prefer apiKey if provided
  let headers: Record<string, string>;
  if (apiKey) {
    headers = { "X-API-Key": apiKey };
  } else if (getToken) {
    const token = await getToken();
    if (!token) {
      throw new Error("No token available for embedding generation");
    }
    headers = { Authorization: `Bearer ${token}` };
  } else {
    throw new Error("Either apiKey or getToken must be provided");
  }

  const response = await postApiV1Embeddings({
    baseUrl,
    body: {
      input: text,
      model: model ?? DEFAULT_API_EMBEDDING_MODEL,
    },
    headers,
  });

  if (response.error) {
    throw new Error(
      typeof response.error === "object" && response.error && "error" in response.error
        ? (response.error as { error: string }).error
        : "API embedding failed"
    );
  }

  if (!response.data?.data?.[0]?.embedding) {
    throw new Error("No embedding returned from API");
  }

  return response.data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call
 *
 * More efficient than calling generateEmbedding multiple times.
 * Supports the same auth methods as generateEmbedding.
 *
 * @param texts - Array of texts to embed
 * @param options - Embedding options
 * @returns Array of embeddings in the same order as input texts
 */
export async function generateEmbeddings(
  texts: string[],
  options: EmbeddingOptions
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const { baseUrl = BASE_URL, getToken, apiKey, model } = options;

  // Build auth headers - prefer apiKey if provided
  let headers: Record<string, string>;
  if (apiKey) {
    headers = { "X-API-Key": apiKey };
  } else if (getToken) {
    const token = await getToken();
    if (!token) {
      throw new Error("No token available for embedding generation");
    }
    headers = { Authorization: `Bearer ${token}` };
  } else {
    throw new Error("Either apiKey or getToken must be provided");
  }

  const response = await postApiV1Embeddings({
    baseUrl,
    body: {
      input: texts,
      model: model ?? DEFAULT_API_EMBEDDING_MODEL,
    },
    headers,
  });

  if (response.error) {
    throw new Error(
      typeof response.error === "object" && response.error && "error" in response.error
        ? (response.error as { error: string }).error
        : "API embedding failed"
    );
  }

  if (!response.data?.data) {
    throw new Error("No embeddings returned from API");
  }

  // Return embeddings in the same order as input texts
  return response.data.data.map((item) => item.embedding ?? []);
}

/**
 * Embed a single message and store the embedding in the database
 *
 * @param ctx - Storage operations context
 * @param messageId - Unique ID of the message to embed
 * @param options - Embedding options
 * @returns The updated message with embedding, or null if message not found
 */
export async function embedMessage(
  ctx: StorageOperationsContext,
  messageId: string,
  options: EmbeddingOptions
): Promise<StoredMessage | null> {
  // Find the message by uniqueId
  let message: StoredMessage | undefined;

  const conversations = await getConversationsOp(ctx);
  for (const conv of conversations) {
    const messages = await getMessagesOp(ctx, conv.conversationId);
    message = messages.find((m) => m.uniqueId === messageId);
    if (message) break;
  }

  if (!message) {
    return null;
  }

  // Skip if already has embedding
  if (message.vector && message.vector.length > 0) {
    return message;
  }

  // Generate embedding for message content
  const embedding = await generateEmbedding(message.content, options);
  const embeddingModel = options.model ?? DEFAULT_API_EMBEDDING_MODEL;

  // Update message with embedding
  return updateMessageEmbeddingOp(ctx, messageId, embedding, embeddingModel);
}

/**
 * Embed all messages without embeddings in the database
 *
 * @param ctx - Storage operations context
 * @param options - Embedding options
 * @param filter - Optional filter for which messages to embed
 * @returns Number of messages embedded
 */
export async function embedAllMessages(
  ctx: StorageOperationsContext,
  options: EmbeddingOptions,
  filter?: {
    /** Only embed messages from this conversation */
    conversationId?: string;
    /** Only embed messages with these roles */
    roles?: ("user" | "assistant")[];
    /** Minimum content length to embed (default: 30). Shorter messages are skipped. */
    minContentLength?: number;
  }
): Promise<number> {
  const embeddingModel = options.model ?? DEFAULT_API_EMBEDDING_MODEL;
  let embeddedCount = 0;

  // Get all conversations
  const conversations = await getConversationsOp(ctx);
  const targetConversations = filter?.conversationId
    ? conversations.filter((c) => c.conversationId === filter.conversationId)
    : conversations;

  for (const conv of targetConversations) {
    const messages = await getMessagesOp(ctx, conv.conversationId);

    for (const message of messages) {
      // Skip if already has embedding
      if (message.vector && message.vector.length > 0) {
        continue;
      }

      // Skip if role filter doesn't match
      if (filter?.roles && !filter.roles.includes(message.role as "user" | "assistant")) {
        continue;
      }

      // Skip system messages
      if (message.role === "system") {
        continue;
      }

      // Skip short messages that won't provide useful search context
      const minLength = filter?.minContentLength ?? DEFAULT_MIN_CONTENT_LENGTH;
      if (message.content.length < minLength) {
        continue;
      }

      try {
        const embedding = await generateEmbedding(message.content, options);
        await updateMessageEmbeddingOp(ctx, message.uniqueId, embedding, embeddingModel);
        embeddedCount++;
      } catch (error) {
        getLogger().error(`Failed to embed message ${message.uniqueId}:`, error);
      }
    }
  }

  return embeddedCount;
}

/**
 * Chunk and embed a single message, storing chunk embeddings in the database.
 * For messages shorter than chunkSize, falls back to whole-message embedding.
 *
 * @param ctx - Storage operations context
 * @param messageId - Unique ID of the message to chunk and embed
 * @param options - Embedding and chunking options
 * @returns The updated message, or null if message not found
 */
export async function chunkAndEmbedMessage(
  ctx: StorageOperationsContext,
  messageId: string,
  options: EmbeddingOptions & ChunkingOptions
): Promise<StoredMessage | null> {
  const { chunkSize = DEFAULT_CHUNK_SIZE } = options;

  // Find the message by uniqueId
  let message: StoredMessage | undefined;

  const conversations = await getConversationsOp(ctx);
  for (const conv of conversations) {
    const messages = await getMessagesOp(ctx, conv.conversationId);
    message = messages.find((m) => m.uniqueId === messageId);
    if (message) break;
  }

  if (!message) {
    return null;
  }

  // Skip if already has chunks
  if (message.chunks && message.chunks.length > 0) {
    return message;
  }

  const embeddingModel = options.model ?? DEFAULT_API_EMBEDDING_MODEL;

  // If message is short, use whole-message embedding
  if (!shouldChunkMessage(message.content, chunkSize)) {
    const embedding = await generateEmbedding(message.content, options);
    return updateMessageEmbeddingOp(ctx, messageId, embedding, embeddingModel);
  }

  // Chunk the message
  const textChunks = chunkText(message.content, options);

  // Generate embeddings for all chunks in batch
  const chunkTexts = textChunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(chunkTexts, options);

  // Build chunk objects with embeddings
  const messageChunks: MessageChunk[] = textChunks.map((chunk, i) => ({
    text: chunk.text,
    vector: embeddings[i],
    startOffset: chunk.startOffset,
    endOffset: chunk.endOffset,
  }));

  // Update message with chunks
  return updateMessageChunksOp(ctx, messageId, messageChunks, embeddingModel);
}

/**
 * Chunk and embed all messages without embeddings/chunks in the database.
 * Uses chunking for long messages, whole-message embedding for short ones.
 *
 * @param ctx - Storage operations context
 * @param options - Embedding and chunking options
 * @param filter - Optional filter for which messages to embed
 * @returns Number of messages embedded
 */
export async function chunkAndEmbedAllMessages(
  ctx: StorageOperationsContext,
  options: EmbeddingOptions & ChunkingOptions,
  filter?: {
    /** Only embed messages from this conversation */
    conversationId?: string;
    /** Only embed messages with these roles */
    roles?: ("user" | "assistant")[];
    /** Re-chunk messages that have whole-message embeddings but no chunks */
    rechunkExisting?: boolean;
    /** Minimum content length to embed (default: 30). Shorter messages are skipped. */
    minContentLength?: number;
  }
): Promise<number> {
  const embeddingModel = options.model ?? DEFAULT_API_EMBEDDING_MODEL;
  const { chunkSize = DEFAULT_CHUNK_SIZE } = options;
  let embeddedCount = 0;

  // Get all conversations
  const conversations = await getConversationsOp(ctx);
  const targetConversations = filter?.conversationId
    ? conversations.filter((c) => c.conversationId === filter.conversationId)
    : conversations;

  for (const conv of targetConversations) {
    const messages = await getMessagesOp(ctx, conv.conversationId);

    for (const message of messages) {
      // Skip if already has chunks
      if (message.chunks && message.chunks.length > 0) {
        continue;
      }

      // Skip if has embedding and not rechunking
      const hasVector = message.vector && message.vector.length > 0;
      if (hasVector && !filter?.rechunkExisting) {
        continue;
      }

      // Skip if role filter doesn't match
      if (filter?.roles && !filter.roles.includes(message.role as "user" | "assistant")) {
        continue;
      }

      // Skip system messages
      if (message.role === "system") {
        continue;
      }

      // Skip short messages that won't provide useful search context
      const minLength = filter?.minContentLength ?? DEFAULT_MIN_CONTENT_LENGTH;
      if (message.content.length < minLength) {
        continue;
      }

      try {
        // Use chunking for long messages
        if (shouldChunkMessage(message.content, chunkSize)) {
          const textChunks = chunkText(message.content, options);
          const chunkTexts = textChunks.map((c) => c.text);
          const embeddings = await generateEmbeddings(chunkTexts, options);

          const messageChunks: MessageChunk[] = textChunks.map((chunk, i) => ({
            text: chunk.text,
            vector: embeddings[i],
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
          }));

          await updateMessageChunksOp(ctx, message.uniqueId, messageChunks, embeddingModel);
        } else {
          // Use whole-message embedding for short messages
          const embedding = await generateEmbedding(message.content, options);
          await updateMessageEmbeddingOp(ctx, message.uniqueId, embedding, embeddingModel);
        }
        embeddedCount++;
      } catch (error) {
        getLogger().error(`Failed to embed message ${message.uniqueId}:`, error);
      }
    }
  }

  return embeddedCount;
}
