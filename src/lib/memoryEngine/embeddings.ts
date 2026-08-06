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
  getMessageOp,
  getMessagesOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
} from "../db/chat/operations";
import type { MessageChunk, StoredMessage } from "../db/chat/types";
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
 * Message provenance that is never indexed, at any of the four entry points
 * below (sdk#861). All four are public API, so the skip has to be on each of
 * them rather than only on the ones this repo happens to call: a consumer can
 * hand any message id to `embedMessage` or `chunkAndEmbedMessage`.
 *
 * A turn's auto-executed tool results are persisted as a hidden `role: "user"`
 * row so later turns and other devices keep the context. That row is a
 * machine-readable API dump: no UI renders it, and nobody searches for
 * `assignees_url` templates. The assistant's reply to it IS embedded and is the
 * searchable summary of the same turn, so skipping the dump costs no recall.
 *
 * What it saves is the whole problem. Measured on one real row: 0.21 MB of
 * content against 52.3 MB of chunk vectors (620 chunks), i.e. 99.6% of a row
 * that the user cannot see or delete — and one such row was big enough to wedge
 * the backup uploader in a retry loop.
 *
 * Keyed on the plaintext `origin` column rather than a content prefix because
 * these passes read `content` straight out of the DB, where it is `enc:v3:`
 * ciphertext: a `startsWith("[Tool Execution Results]")` test can never match.
 */
const NON_EMBEDDABLE_ORIGIN = "tool_result";

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
  // O(1) indexed lookup by id — not a scan+decrypt of every conversation's
  // full history (which is quadratic when this runs per message).
  const message = await getMessageOp(ctx, messageId);
  if (!message) {
    return null;
  }

  // Skip if already has embedding
  if (message.vector && message.vector.length > 0) {
    return message;
  }

  // Skip never-rendered tool-result dumps. Returned unchanged, not thrown: to a
  // caller this is "nothing to embed here", the same as an already-embedded row.
  if (message.origin === NON_EMBEDDABLE_ORIGIN) {
    return message;
  }

  // Never embed ciphertext (sdk#864) — see chunkAndEmbedMessage for why the
  // content can still be an `enc:v3:` payload at this point.
  if (isEncrypted(message.content)) {
    getLogger().warn(
      `memoryEngine: message ${messageId} is still encrypted (key unavailable?) — not embedded`
    );
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
  // Two ratios: candidate-scoped and pass-scoped. See chunkAndEmbedAllMessages
  // for why both are needed and why neither can replace the other. Same blind
  // spot here: a row with a ciphertext-derived vector exits at the first gate.
  let stillEncrypted = 0;
  let considered = 0;
  let sealedRowsSeen = 0;
  let rowsSeen = 0;

  // Get all conversations
  const conversations = await getConversationsOp(ctx);
  const targetConversations = filter?.conversationId
    ? conversations.filter((c) => c.conversationId === filter.conversationId)
    : conversations;

  for (const conv of targetConversations) {
    const messages = await getMessagesOp(ctx, conv.conversationId);

    for (const message of messages) {
      rowsSeen++;
      if (isEncrypted(message.content)) sealedRowsSeen++;

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

      // Skip never-rendered tool-result dumps
      if (message.origin === NON_EMBEDDABLE_ORIGIN) {
        continue;
      }

      // Never embed ciphertext (sdk#864) — see chunkAndEmbedMessage. Ahead of
      // the length check because a length test on hex means nothing.
      considered++;
      if (isEncrypted(message.content)) {
        stillEncrypted++;
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

  // Aggregate rather than per-row, on the error channel with the counts as
  // structured fields — see chunkAndEmbedAllMessages for why `error` and not
  // `warn`, and why this fires on either tally.
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

  // O(1) indexed lookup by id (see embedMessage) — not a full-history scan.
  const message = await getMessageOp(ctx, messageId);
  if (!message) {
    return null;
  }

  // Skip if already has chunks
  if (message.chunks && message.chunks.length > 0) {
    return message;
  }

  // Skip never-rendered tool-result dumps. Returned unchanged, not thrown: to a
  // caller this is "nothing to embed here", the same as an already-chunked row.
  if (message.origin === NON_EMBEDDABLE_ORIGIN) {
    return message;
  }

  // Never embed ciphertext (sdk#864). Same guard as the memory vault's search
  // path: `decryptMessageFields` is a silent no-op without a wallet address, so
  // a caller whose storage context lacks one reads back the raw `enc:v3:`
  // payload. Chunking that hard-splits hex into uniform windows and persists
  // vectors that describe the ciphertext — silent, unrecoverable corruption.
  // Warned rather than swallowed so a skipped sweep is diagnosable.
  if (isEncrypted(message.content)) {
    getLogger().warn(
      `memoryEngine: message ${messageId} is still encrypted (key unavailable?) — not embedded`
    );
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
  // Two ratios, because they answer two different questions and they come apart
  // on exactly the accounts that matter.
  //
  // `stillEncrypted / considered` is scoped to EMBEDDABLE CANDIDATES: `considered`
  // counts only rows that survived the already-chunked, has-vector, role and
  // origin gates below. It answers "of the rows this pass could have embedded,
  // how many were sealed", i.e. what this pass refused to do.
  //
  // `sealedRowsSeen / rowsSeen` is scoped to THE WHOLE PASS, counted before any
  // gate. It answers "is this pass reading without a crypto context right now".
  // A device whose sealed rows ALL already carry ciphertext-built chunks exits at
  // the first gate on every one of them, so the candidate ratio stays 0/0 and
  // reports nothing — which is precisely the 25 affected accounts. Without the
  // second pair, a broken context on the accounts we are chasing is invisible.
  //
  // Counting only. Neither tally moves the skip: rows are still refused at the
  // gate below, so behaviour is unchanged and `considered` keeps its meaning.
  let stillEncrypted = 0;
  let considered = 0;
  let sealedRowsSeen = 0;
  let rowsSeen = 0;

  for (const conv of targetConversations) {
    const messages = await getMessagesOp(ctx, conv.conversationId);

    for (const message of messages) {
      rowsSeen++;
      if (isEncrypted(message.content)) sealedRowsSeen++;
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
      // Skip never-rendered tool-result dumps. This is the site that fires in
      // production: consumers run this sweep on every session mount, and it picks
      // up any row lacking chunks — which is exactly how each dump grew to 52 MB.
      if (message.origin === NON_EMBEDDABLE_ORIGIN) continue;
      // Never chunk ciphertext (sdk#864) — see chunkAndEmbedMessage. Ahead of
      // the length check because a length test on hex means nothing.
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

  // Loud, not swallowed: the return value counts what was embedded, so without
  // this a refusal to embed 300 encrypted rows is indistinguishable from a pass
  // that found nothing to do.
  //
  // `error`, not `warn`, despite this being a skip rather than a failure: both
  // consumer LoggerProviders ship only error-level logs in prod, so a `warn`
  // here would be invisible in the one environment where it matters. Counts go
  // in the context object (forwarded as structured fields) rather than the
  // message, so they stay facetable and the message stays groupable.
  //
  // Fires on EITHER tally. `sealedRowsSeen > 0` with `stillEncrypted === 0` is the
  // interesting case, not a contradiction: it means every sealed row was already
  // filtered out before the candidate counter, which is what a device reading
  // wallet-less over an already-damaged history looks like.
  if (stillEncrypted > 0 || sealedRowsSeen > 0) {
    getLogger().error(
      "memoryEngine: messages still encrypted (key unavailable?) — excluded from embedding",
      undefined,
      { stillEncrypted, considered, sealedRowsSeen, rowsSeen }
    );
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
