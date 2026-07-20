/**
 * Memory Retrieval Embeddings
 *
 * Functions for generating and storing embeddings for conversation messages.
 */

import { postApiV1Embeddings } from "../../client";
import { BASE_URL } from "../../clientConfig";
import {
  getConversationsOp,
  getMessageOp,
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

/** Bounded retry for the embeddings endpoint. Transient 429/5xx blips
 * under sustained load were observed killing entire eval questions (and
 * production saves/lazy backfills) on the first error — mirror the
 * extraction path's retry discipline: exponential backoff with jitter,
 * a few attempts, then surface the final error. */
const EMBED_MAX_ATTEMPTS = 4;

async function withEmbeddingRetry<T extends { error?: unknown; response?: Response }>(
  call: () => Promise<T>
): Promise<T> {
  let last: T | undefined;
  let lastThrown: unknown;
  let threw = false;
  for (let attempt = 1; attempt <= EMBED_MAX_ATTEMPTS; attempt++) {
    try {
      threw = false;
      last = await call();
      if (!last.error) return last;
      // Resolved with an HTTP-level error ({ error } set). Only transient
      // statuses are worth retrying — a non-429 4xx (bad auth / bad request)
      // fails identically every attempt, so surface it immediately.
      const status = last.response?.status;
      const retryable = status === undefined || status === 429 || status >= 500;
      if (!retryable) return last;
    } catch (err) {
      // fetch itself rejected — ECONNRESET, DNS failure, connection timeout.
      // These never come back as a `{ error }` object, so without this catch
      // a real network fault would skip the retry entirely and hard-fail on
      // the first attempt. Always transient: retry, then re-throw if we
      // exhaust attempts (preserving the throw contract for callers).
      threw = true;
      lastThrown = err;
    }
    if (attempt < EMBED_MAX_ATTEMPTS) {
      const base = 250 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, base + Math.random() * 0.4 * base));
    }
  }
  if (threw) throw lastThrown;
  return last as T;
}

/**
 * HTTP-level failure from the embeddings endpoint, carrying the status code so
 * callers can distinguish a permanent client error (401/402/403) from a
 * transient one. The generated client exposes the status on `response.response`
 * but the previous bare `Error` discarded it, forcing bulk callers to treat a
 * standing 402 the same as a one-off 5xx.
 */
export class EmbeddingHttpError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "EmbeddingHttpError";
    this.status = status;
  }
}

/**
 * A non-retryable client error that fails identically for every message in a
 * bulk pass — auth (401), payment / out-of-credits (402), forbidden (403).
 * A corpus walk must abort the whole pass on these instead of re-firing one
 * request per message: a 402 persists nothing, so the walk would otherwise
 * repeat the full storm every session/import (the prod embeddings-402 flood).
 */
export function isFatalEmbeddingError(err: unknown): boolean {
  return (
    err instanceof EmbeddingHttpError &&
    (err.status === 401 || err.status === 402 || err.status === 403)
  );
}

/**
 * Build an EmbeddingHttpError from a failed postApiV1Embeddings response,
 * preserving the server's error message and the HTTP status.
 */
function embeddingErrorFrom(response: {
  error?: unknown;
  response?: Response;
}): EmbeddingHttpError {
  const message =
    typeof response.error === "object" && response.error && "error" in response.error
      ? (response.error as { error: string }).error
      : "API embedding failed";
  return new EmbeddingHttpError(message, response.response?.status);
}

export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions
): Promise<number[]> {
  const { baseUrl = BASE_URL, getToken, apiKey, model, cache } = options;

  // Check cache first
  if (cache) {
    const cached = cache.get(text);
    if (cached) return cached;
  }

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

  const response = await withEmbeddingRetry(() =>
    postApiV1Embeddings({
      baseUrl,
      body: {
        // Mask PII from the request body only — the cache above still keys on
        // the original `text`, so callers keep their original values.
        input: options.maskInput ? options.maskInput(text) : text,
        model: model ?? DEFAULT_API_EMBEDDING_MODEL,
      },
      headers,
    })
  );

  if (response.error) {
    throw embeddingErrorFrom(response);
  }

  if (!response.data?.data?.[0]?.embedding) {
    throw new Error("No embedding returned from API");
  }

  const embedding = response.data.data[0].embedding;

  // Report usage if callback provided
  if (options.onUsage && response.data.usage) {
    options.onUsage({
      promptTokens: response.data.usage.prompt_tokens ?? 0,
      totalTokens: response.data.usage.total_tokens ?? 0,
    });
  }

  // Store in cache
  if (cache) {
    cache.set(text, embedding);
  }

  return embedding;
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
  model: string,
  onUsage?: EmbeddingOptions["onUsage"],
  maskInput?: EmbeddingOptions["maskInput"]
): Promise<number[][]> {
  const response = await withEmbeddingRetry(() =>
    postApiV1Embeddings({
      baseUrl,
      // Mask PII from the request body only; cache/order still key on originals.
      body: { input: maskInput ? texts.map(maskInput) : texts, model },
      headers,
    })
  );

  if (response.error) {
    throw embeddingErrorFrom(response);
  }

  if (!response.data?.data) {
    throw new Error("No embeddings returned from API");
  }

  if (onUsage && response.data.usage) {
    onUsage({
      promptTokens: response.data.usage.prompt_tokens ?? 0,
      totalTokens: response.data.usage.total_tokens ?? 0,
    });
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

  const { baseUrl = BASE_URL, getToken, apiKey, model, batchSize, cache } = options;
  const chunkSize = batchSize ?? DEFAULT_EMBEDDING_BATCH_SIZE;

  // Separate cached and uncached texts
  const results: (number[] | null)[] = new Array<number[] | null>(texts.length).fill(null);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    if (cache) {
      const cached = cache.get(texts[i]);
      if (cached) {
        results[i] = cached;
        continue;
      }
    }
    uncachedIndices.push(i);
    uncachedTexts.push(texts[i]);
  }

  // If everything was cached, return immediately
  if (uncachedTexts.length === 0) {
    return results as number[][];
  }

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

  let newEmbeddings: number[][];

  // Small inputs: single API call (preserves existing behavior)
  if (uncachedTexts.length <= chunkSize) {
    newEmbeddings = await generateEmbeddingsBatch(
      uncachedTexts,
      headers,
      baseUrl,
      embeddingModel,
      options.onUsage,
      options.maskInput
    );
  } else {
    // Large inputs: chunk and process with bounded concurrency
    const chunks: string[][] = [];
    for (let i = 0; i < uncachedTexts.length; i += chunkSize) {
      chunks.push(uncachedTexts.slice(i, i + chunkSize));
    }

    const allEmbeddings: number[][][] = new Array<number[][]>(chunks.length);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < chunks.length) {
        const idx = nextIndex++;
        allEmbeddings[idx] = await generateEmbeddingsBatch(
          chunks[idx],
          headers,
          baseUrl,
          embeddingModel,
          options.onUsage,
          options.maskInput
        );
      }
    };

    const workers = Array.from(
      { length: Math.min(DEFAULT_EMBEDDING_BATCH_CONCURRENCY, chunks.length) },
      () => worker()
    );
    await Promise.all(workers);

    newEmbeddings = allEmbeddings.flat();
  }

  // Merge new embeddings into results and populate cache
  for (let i = 0; i < uncachedIndices.length; i++) {
    results[uncachedIndices[i]] = newEmbeddings[i];
    if (cache) {
      cache.set(uncachedTexts[i], newEmbeddings[i]);
    }
  }

  return results as number[][];
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

  // O(1) indexed lookup by id (see embedMessage) — not a full-history scan.
  const message = await getMessageOp(ctx, messageId);
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
