/**
 * Memory Retrieval Embeddings
 *
 * Message-level embedding + persistence helpers: find messages via the
 * WatermelonDB-backed `db/chat/operations`, embed their content, and store the
 * vectors/chunks back. The raw "text → embedding" calls live in `./generate`
 * (dependency-free so the tool-selection engine can import them without the DB
 * layer) and are re-exported here so existing importers of
 * `../memoryEngine/embeddings` and the `../memoryEngine` barrel keep working.
 */

import {
  getConversationsOp,
  getMessagesOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
} from "../db/chat/operations";
import type { MessageChunk, StoredMessage } from "../db/chat/types";
import { getLogger } from "../logger";
import {
  type ChunkingOptions,
  chunkText,
  DEFAULT_CHUNK_SIZE,
  shouldChunkMessage,
} from "./chunking";
import { DEFAULT_API_EMBEDDING_MODEL } from "./constants";
import { generateEmbedding, generateEmbeddings, isFatalEmbeddingError } from "./generate";
import type { EmbeddingOptions } from "./types";

// Re-exported so `../memoryEngine/embeddings` and the `../memoryEngine` barrel
// remain the public home of these symbols after the db-free core was split out.
export {
  EmbeddingHttpError,
  generateEmbedding,
  generateEmbeddings,
  isFatalEmbeddingError,
} from "./generate";

/**
 * Default minimum content length for embedding.
 * Messages shorter than this are typically too short to provide
 * meaningful semantic search results (e.g., "ok", "thanks").
 */
export const DEFAULT_MIN_CONTENT_LENGTH = 10;

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
        // 401/402/403 recurs for every remaining message and persists nothing —
        // abort the whole pass rather than re-firing one request per message.
        if (isFatalEmbeddingError(error)) throw error;
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
 * Requires embedding auth: `options` must carry `apiKey` or `getToken` (see
 * {@link EmbeddingOptions}). `EmbeddingOptions` keeps both optional for the
 * dual-auth pattern, so this is enforced at runtime — with neither, the
 * embedding call rejects with `"Either apiKey or getToken must be provided"`.
 *
 * @param ctx - Storage operations context
 * @param messageId - Unique ID of the message to chunk and embed
 * @param options - Embedding and chunking options (auth required — see above)
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
 * Chunk and embed messages that don't yet have embeddings/chunks in the
 * database. Uses chunking for long messages, whole-message embedding for short
 * ones.
 *
 * Upgrade note: by default this SKIPS messages that already have a whole-message
 * vector. An app migrating from whole-message embeddings to chunk-based search
 * must pass `filter.rechunkExisting: true` to (re)chunk those existing messages
 * — otherwise they get no chunk rows and chunk search stays incomplete for the
 * back-catalog.
 *
 * Requires embedding auth (`apiKey` or `getToken` in `options`; see
 * {@link EmbeddingOptions}) — rejects with `"Either apiKey or getToken must be
 * provided"` if neither is set.
 *
 * @param ctx - Storage operations context
 * @param options - Embedding and chunking options (auth required — see above)
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

  // Collect all eligible messages first
  const conversations = await getConversationsOp(ctx);
  const targetConversations = filter?.conversationId
    ? conversations.filter((c) => c.conversationId === filter.conversationId)
    : conversations;

  type ShortMessage = { uniqueId: string; content: string };
  type LongMessage = {
    uniqueId: string;
    textChunks: { text: string; startOffset: number; endOffset: number }[];
  };
  const shortMessages: ShortMessage[] = [];
  const longMessages: LongMessage[] = [];

  for (const conv of targetConversations) {
    const messages = await getMessagesOp(ctx, conv.conversationId);

    for (const message of messages) {
      // A message whose stored embedding model differs from the current one is
      // stale — its vectors live in an incompatible space (and searchChunksOp
      // now skips them), so re-embed it even if it already has chunks/vector.
      // Null embeddingModel is grandfathered as current-model-compatible.
      const isStale =
        message.embeddingModel !== undefined &&
        message.embeddingModel !== null &&
        message.embeddingModel !== embeddingModel;
      if (message.chunks && message.chunks.length > 0 && !isStale) continue;
      const hasVector = message.vector && message.vector.length > 0;
      if (hasVector && !filter?.rechunkExisting && !isStale) continue;
      if (filter?.roles && !filter.roles.includes(message.role as "user" | "assistant")) continue;
      if (message.role === "system") continue;
      if (message.content.length < minLength) continue;

      if (shouldChunkMessage(message.content, chunkSize)) {
        longMessages.push({
          uniqueId: message.uniqueId,
          textChunks: chunkText(message.content, options),
        });
      } else {
        shortMessages.push({ uniqueId: message.uniqueId, content: message.content });
      }
    }
  }

  let embeddedCount = 0;

  // Batch-embed all short messages in one API call
  if (shortMessages.length > 0) {
    try {
      const texts = shortMessages.map((m) => m.content);
      const embeddings = await generateEmbeddings(texts, options);
      for (let i = 0; i < shortMessages.length; i++) {
        try {
          await updateMessageEmbeddingOp(
            ctx,
            shortMessages[i].uniqueId,
            embeddings[i],
            embeddingModel
          );
          embeddedCount++;
        } catch (error) {
          getLogger().error(
            `Failed to save embedding for message ${shortMessages[i].uniqueId}:`,
            error
          );
        }
      }
    } catch (error) {
      if (isFatalEmbeddingError(error)) throw error;
      getLogger().error("Failed to batch-embed short messages:", error);
    }
  }

  // Process long messages in batches (chunk + embed)
  for (const msg of longMessages) {
    try {
      const chunkTexts = msg.textChunks.map((c) => c.text);
      const embeddings = await generateEmbeddings(chunkTexts, options);

      const messageChunks: MessageChunk[] = msg.textChunks.map((chunk, i) => ({
        text: chunk.text,
        vector: embeddings[i],
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
      }));

      await updateMessageChunksOp(ctx, msg.uniqueId, messageChunks, embeddingModel);
      embeddedCount++;
    } catch (error) {
      if (isFatalEmbeddingError(error)) throw error;
      getLogger().error(`Failed to embed message ${msg.uniqueId}:`, error);
    }
  }

  return embeddedCount;
}
