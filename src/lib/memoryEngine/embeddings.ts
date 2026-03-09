/**
 * Memory Retrieval Embeddings
 *
 * Functions for generating and storing embeddings for conversation messages.
 */

import { postApiV1Embeddings } from "../../client";
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

const DEFAULT_EMBEDDING_BATCH_SIZE = 100;
const DEFAULT_EMBEDDING_BATCH_CONCURRENCY = 3;

/**
 * Make a single batch embedding API call.
 */
async function generateEmbeddingsBatch(
  texts: string[],
  headers: Record<string, string>,
  baseUrl: string,
  model: string
): Promise<number[][]> {
  const response = await postApiV1Embeddings({
    baseUrl,
    body: { input: texts, model },
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

  return response.data.data.map((item) => item.embedding ?? []);
}

/**
 * Generate embeddings for multiple texts, automatically chunking large inputs.
 *
 * More efficient than calling generateEmbedding multiple times.
 * Supports the same auth methods as generateEmbedding.
 * For inputs larger than batchSize (default 100), splits into chunks
 * processed with bounded concurrency (3 concurrent batches).
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

  const { baseUrl = BASE_URL, getToken, apiKey, model, batchSize } = options;
  const chunkSize = batchSize ?? DEFAULT_EMBEDDING_BATCH_SIZE;

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

  const embeddingModel = model ?? DEFAULT_API_EMBEDDING_MODEL;

  // Small inputs: single API call (preserves existing behavior)
  if (texts.length <= chunkSize) {
    return generateEmbeddingsBatch(texts, headers, baseUrl, embeddingModel);
  }

  // Large inputs: chunk and process with bounded concurrency
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += chunkSize) {
    chunks.push(texts.slice(i, i + chunkSize));
  }

  const allEmbeddings: number[][][] = new Array(chunks.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < chunks.length) {
      const i = nextIndex++;
      allEmbeddings[i] = await generateEmbeddingsBatch(chunks[i], headers, baseUrl, embeddingModel);
    }
  };

  const workers = Array.from(
    { length: Math.min(DEFAULT_EMBEDDING_BATCH_CONCURRENCY, chunks.length) },
    () => worker()
  );
  await Promise.all(workers);

  return allEmbeddings.flat();
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
        console.error(`Failed to embed message ${message.uniqueId}:`, error);
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
 * Build turn blocks from a chronological list of messages.
 *
 * A turn block is a user message followed by its assistant reply (if any).
 * Each block produces a single combined text that preserves conversational
 * context, which leads to better embeddings than embedding each message
 * in isolation.
 *
 * Chunks are stored on every message in the block so that search results
 * can point back to any participating message.
 */
function buildTurnBlocks(
  messages: StoredMessage[],
  minLength: number,
  rechunkExisting: boolean
): { messageIds: string[]; combinedText: string }[] {
  const blocks: { messageIds: string[]; combinedText: string }[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    // Skip system messages
    if (msg.role === "system") {
      i++;
      continue;
    }

    // Skip already-embedded messages (unless rechunking)
    const alreadyEmbedded =
      (msg.chunks && msg.chunks.length > 0) ||
      (!rechunkExisting && msg.vector && msg.vector.length > 0);
    if (alreadyEmbedded) {
      i++;
      continue;
    }

    // Start a turn block: collect user + following assistant
    const blockMessages: StoredMessage[] = [msg];
    if (
      msg.role === "user" &&
      i + 1 < messages.length &&
      messages[i + 1].role === "assistant"
    ) {
      const next = messages[i + 1];
      const nextAlreadyEmbedded =
        (next.chunks && next.chunks.length > 0) ||
        (!rechunkExisting && next.vector && next.vector.length > 0);
      if (!nextAlreadyEmbedded && next.role !== "system") {
        blockMessages.push(next);
      }
    }

    // Build combined text with role labels
    const parts = blockMessages.map(
      (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
    );
    const combinedText = parts.join("\n");

    // Skip if combined text is too short
    if (combinedText.length < minLength) {
      i += blockMessages.length;
      continue;
    }

    blocks.push({
      messageIds: blockMessages.map((m) => m.uniqueId),
      combinedText,
    });
    i += blockMessages.length;
  }

  return blocks;
}

/**
 * Chunk and embed all messages without embeddings/chunks in the database.
 *
 * Groups consecutive user+assistant messages into turn blocks so that
 * embeddings capture conversational context rather than isolated messages.
 * Long blocks are chunked with sentence-boundary overlap; short blocks get
 * a single whole-message embedding.
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
  const minLength = filter?.minContentLength ?? DEFAULT_MIN_CONTENT_LENGTH;
  const rechunkExisting = filter?.rechunkExisting ?? false;

  const conversations = await getConversationsOp(ctx);
  const targetConversations = filter?.conversationId
    ? conversations.filter((c) => c.conversationId === filter.conversationId)
    : conversations;

  // Collect turn blocks across all conversations
  type ShortBlock = { messageIds: string[]; combinedText: string };
  type LongBlock = {
    messageIds: string[];
    textChunks: { text: string; startOffset: number; endOffset: number }[];
  };
  const shortBlocks: ShortBlock[] = [];
  const longBlocks: LongBlock[] = [];

  for (const conv of targetConversations) {
    let messages = await getMessagesOp(ctx, conv.conversationId);

    // Apply role filter if specified
    if (filter?.roles) {
      const allowedRoles = new Set(filter.roles);
      messages = messages.filter(
        (m) => m.role === "system" || allowedRoles.has(m.role as "user" | "assistant")
      );
    }

    const blocks = buildTurnBlocks(messages, minLength, rechunkExisting);

    for (const block of blocks) {
      if (shouldChunkMessage(block.combinedText, chunkSize)) {
        longBlocks.push({
          messageIds: block.messageIds,
          textChunks: chunkText(block.combinedText, options),
        });
      } else {
        shortBlocks.push(block);
      }
    }
  }

  let embeddedCount = 0;

  // Batch-embed all short blocks in one API call
  if (shortBlocks.length > 0) {
    try {
      const texts = shortBlocks.map((b) => b.combinedText);
      const embeddings = await generateEmbeddings(texts, options);
      for (let i = 0; i < shortBlocks.length; i++) {
        const block = shortBlocks[i];
        // Store the same embedding on every message in the block
        for (const msgId of block.messageIds) {
          try {
            await updateMessageEmbeddingOp(ctx, msgId, embeddings[i], embeddingModel);
            embeddedCount++;
          } catch (error) {
            console.error(`Failed to save embedding for message ${msgId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to batch-embed short blocks:", error);
    }
  }

  // Process long blocks (chunk + embed)
  for (const block of longBlocks) {
    try {
      const chunkTexts = block.textChunks.map((c) => c.text);
      const embeddings = await generateEmbeddings(chunkTexts, options);

      const messageChunks: MessageChunk[] = block.textChunks.map((chunk, i) => ({
        text: chunk.text,
        vector: embeddings[i],
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
      }));

      // Store chunks on every message in the block
      for (const msgId of block.messageIds) {
        try {
          await updateMessageChunksOp(ctx, msgId, messageChunks, embeddingModel);
          embeddedCount++;
        } catch (error) {
          console.error(`Failed to save chunks for message ${msgId}:`, error);
        }
      }
    } catch (error) {
      console.error(`Failed to embed block [${block.messageIds.join(", ")}]:`, error);
    }
  }

  return embeddedCount;
}
