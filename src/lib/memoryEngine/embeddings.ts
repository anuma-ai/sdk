import { TOOL_RESULT_ORIGIN } from "../chat/toolResults";
import {
  getConversationsOp,
  getMessageOp,
  getMessagesOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
} from "../db/chat/operations";
import type { MessageChunk, MessageOrigin, StoredMessage } from "../db/chat/types";
import { isEncrypted } from "../db/encryption-utils";
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
 * An ordinary message whose chunk vectors were built over `enc:v3:` ciphertext
 * (sdk#864) and have been discarded instead of re-embedded.
 *
 * Re-embedding is the obvious repair and is the wrong one: the sweep calls the
 * embedder with the user's own identity token, so healing these rows would
 * silently spend a user's own credits — up to ~9k embedding calls on the
 * worst-hit account — on a background repair nobody asked for (client#5618).
 * Discarding costs semantic recall on rows whose vectors describe hex, i.e. on
 * search that is already broken for them.
 *
 * Deliberately NOT `tool_result`, because that value does two jobs: it
 * suppresses embedding AND hides the row (`isToolResultsRow` returns true on it
 * alone, with no content check, and the clients render nothing for such a row).
 * These are ~2k real user and assistant messages that must keep rendering, so
 * they need the first job without the second.
 *
 * Suppression is "never automatically", not "never": `filter.reembedDiscarded`
 * on either sweep re-opens these rows for an explicit, caller-initiated
 * re-index. Off by default, so no background pass can spend a user's credits
 * without being asked to.
 *
 * A successful repair replaces the marker with `message` in the index write.
 * The new marker preserves ordinary message provenance during chat replay.
 * Later model migrations can then include the repaired row without this flag.
 * Failed embedding requests and empty index data do not clear the marker.
 *
 * `satisfies MessageOrigin` so the constant and the union cannot drift apart
 * silently — the column's type is the union, and a typo here would otherwise
 * only surface as a marker nothing matches.
 */
export const CHUNKS_DISCARDED_ORIGIN = "chunks_discarded" satisfies MessageOrigin;

const NON_EMBEDDABLE_ORIGINS = new Set<string>([TOOL_RESULT_ORIGIN, CHUNKS_DISCARDED_ORIGIN]);

function isNonEmbeddableOrigin(
  origin: string | null | undefined,
  reembedDiscarded = false
): boolean {
  if (typeof origin !== "string") return false;
  if (reembedDiscarded && origin === CHUNKS_DISCARDED_ORIGIN) return false;
  return NON_EMBEDDABLE_ORIGINS.has(origin);
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
  const message = await getMessageOp(ctx, messageId);
  if (!message) {
    return null;
  }

  if (message.vector && message.vector.length > 0) {
    return message;
  }

  if (isNonEmbeddableOrigin(message.origin)) {
    return message;
  }

  if (isEncrypted(message.content)) {
    getLogger().warn(
      `memoryEngine: message ${messageId} is still encrypted (key unavailable?) — not embedded`
    );
    return message;
  }

  const embedding = await generateEmbedding(message.content, options);
  const embeddingModel = options.model ?? DEFAULT_API_EMBEDDING_MODEL;

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
    /**
     * Re-index rows the ciphertext sweep marked {@link CHUNKS_DISCARDED_ORIGIN}.
     * Off by default: this spends the user's own embedding credits, so it belongs
     * to an explicit user action, never to a background pass. Opens that marker
     * only — `tool_result` rows stay excluded.
     *
     * A successful repair clears the marker. Later model migrations include
     * the repaired row without this flag. See {@link CHUNKS_DISCARDED_ORIGIN}.
     */
    reembedDiscarded?: boolean;
  }
): Promise<number> {
  const embeddingModel = options.model ?? DEFAULT_API_EMBEDDING_MODEL;
  let embeddedCount = 0;
  let stillEncrypted = 0;
  let considered = 0;
  let sealedRowsSeen = 0;
  let rowsSeen = 0;

  const conversations = await getConversationsOp(ctx);
  const targetConversations = filter?.conversationId
    ? conversations.filter((c) => c.conversationId === filter.conversationId)
    : conversations;

  for (const conv of targetConversations) {
    const messages = await getMessagesOp(ctx, conv.conversationId);

    for (const message of messages) {
      rowsSeen++;
      if (isEncrypted(message.content)) sealedRowsSeen++;

      if (message.vector && message.vector.length > 0) {
        continue;
      }

      if (filter?.roles && !filter.roles.includes(message.role as "user" | "assistant")) {
        continue;
      }

      if (message.role === "system") {
        continue;
      }

      if (isNonEmbeddableOrigin(message.origin, filter?.reembedDiscarded)) {
        continue;
      }

      considered++;
      if (isEncrypted(message.content)) {
        stillEncrypted++;
        continue;
      }

      const minLength = filter?.minContentLength ?? DEFAULT_MIN_CONTENT_LENGTH;
      if (message.content.length < minLength) {
        continue;
      }

      try {
        const embedding = await generateEmbedding(message.content, options);
        await updateMessageEmbeddingOp(ctx, message.uniqueId, embedding, embeddingModel);
        embeddedCount++;
      } catch (error) {
        if (isFatalEmbeddingError(error)) throw error;
        getLogger().error(`Failed to embed message ${message.uniqueId}:`, error);
      }
    }
  }

  if (stillEncrypted > 0 || sealedRowsSeen > 0) {
    getLogger().error(
      "memoryEngine: messages still encrypted (key unavailable?) — excluded from embedding",
      undefined,
      { stillEncrypted, considered, sealedRowsSeen, rowsSeen }
    );
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

  const message = await getMessageOp(ctx, messageId);
  if (!message) {
    return null;
  }

  if (message.chunks && message.chunks.length > 0) {
    return message;
  }

  if (isNonEmbeddableOrigin(message.origin)) {
    return message;
  }

  if (isEncrypted(message.content)) {
    getLogger().warn(
      `memoryEngine: message ${messageId} is still encrypted (key unavailable?) — not embedded`
    );
    return message;
  }

  const embeddingModel = options.model ?? DEFAULT_API_EMBEDDING_MODEL;

  if (!shouldChunkMessage(message.content, chunkSize)) {
    const embedding = await generateEmbedding(message.content, options);
    return updateMessageEmbeddingOp(ctx, messageId, embedding, embeddingModel);
  }

  const textChunks = chunkText(message.content, options);

  const chunkTexts = textChunks.map((c) => c.text);
  const embeddings = await generateEmbeddings(chunkTexts, options);

  const messageChunks: MessageChunk[] = textChunks.map((chunk, i) => ({
    text: chunk.text,
    vector: embeddings[i],
    startOffset: chunk.startOffset,
    endOffset: chunk.endOffset,
  }));

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
    /**
     * Re-index rows the ciphertext sweep marked {@link CHUNKS_DISCARDED_ORIGIN}.
     * Off by default: this spends the user's own embedding credits, so it belongs
     * to an explicit user action, never to a background pass. Opens that marker
     * only — `tool_result` rows stay excluded.
     *
     * `rechunkExisting` cannot substitute for it: a discarded row has neither
     * chunks nor vector, so it never reaches that check and falls straight to the
     * origin gate.
     *
     * A successful repair clears the marker. Later model migrations include
     * the repaired row without this flag. See {@link CHUNKS_DISCARDED_ORIGIN}.
     */
    reembedDiscarded?: boolean;
  }
): Promise<number> {
  const embeddingModel = options.model ?? DEFAULT_API_EMBEDDING_MODEL;
  const { chunkSize = DEFAULT_CHUNK_SIZE } = options;
  const minLength = filter?.minContentLength ?? DEFAULT_MIN_CONTENT_LENGTH;

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
  let stillEncrypted = 0;
  let considered = 0;
  let sealedRowsSeen = 0;
  let rowsSeen = 0;

  for (const conv of targetConversations) {
    const messages = await getMessagesOp(ctx, conv.conversationId);

    for (const message of messages) {
      rowsSeen++;
      if (isEncrypted(message.content)) sealedRowsSeen++;
      const isStale =
        message.embeddingModel !== undefined &&
        message.embeddingModel !== null &&
        message.embeddingModel !== embeddingModel;
      if (message.chunks && message.chunks.length > 0 && !isStale) continue;
      const hasVector = message.vector && message.vector.length > 0;
      if (hasVector && !filter?.rechunkExisting && !isStale) continue;
      if (filter?.roles && !filter.roles.includes(message.role as "user" | "assistant")) continue;
      if (message.role === "system") continue;
      if (isNonEmbeddableOrigin(message.origin, filter?.reembedDiscarded)) continue;
      considered++;
      if (isEncrypted(message.content)) {
        stillEncrypted++;
        continue;
      }
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

  if (stillEncrypted > 0 || sealedRowsSeen > 0) {
    getLogger().error(
      "memoryEngine: messages still encrypted (key unavailable?) — excluded from embedding",
      undefined,
      { stillEncrypted, considered, sealedRowsSeen, rowsSeen }
    );
  }

  let embeddedCount = 0;

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
