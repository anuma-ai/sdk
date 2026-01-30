/**
 * Memory Retrieval Embeddings
 *
 * Functions for generating and storing embeddings for conversation messages.
 */

import { postApiV1Embeddings } from "../../client";
import { BASE_URL } from "../../clientConfig";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memory/constants";
import {
  type StorageOperationsContext,
  updateMessageEmbeddingOp,
  getMessagesOp,
  getConversationsOp,
} from "../db/chat/operations";
import type { StoredMessage } from "../db/chat/types";
import type { EmbeddingOptions } from "./types";

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
      typeof response.error === "object" &&
      response.error &&
      "error" in response.error
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
      typeof response.error === "object" &&
      response.error &&
      "error" in response.error
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

      try {
        const embedding = await generateEmbedding(message.content, options);
        await updateMessageEmbeddingOp(
          ctx,
          message.uniqueId,
          embedding,
          embeddingModel
        );
        embeddedCount++;
      } catch (error) {
        console.error(
          `Failed to embed message ${message.uniqueId}:`,
          error
        );
      }
    }
  }

  return embeddedCount;
}
