/**
 * Memory Retrieval Module
 *
 * Provides semantic search over past conversation messages.
 * This enables LLMs to retrieve relevant context from previous conversations
 * using embeddings and cosine similarity.
 *
 * @example
 * ```ts
 * import {
 *   createMemoryRetrievalTool,
 *   embedMessage,
 *   embedAllMessages,
 * } from "@anthropic/sdk/lib/memoryRetrieval";
 *
 * // Create a tool for LLM to search past conversations
 * const tool = createMemoryRetrievalTool(
 *   storageCtx,
 *   { getToken: () => getIdentityToken() }
 * );
 *
 * // Embed a single message
 * await embedMessage(storageCtx, messageId, embeddingOptions);
 *
 * // Embed all messages without embeddings
 * const count = await embedAllMessages(storageCtx, embeddingOptions);
 * ```
 */

export {
  createMemoryRetrievalTool,
} from "./tool";

export { DEFAULT_API_EMBEDDING_MODEL } from "./constants";

export {
  generateEmbedding,
  generateEmbeddings,
  embedMessage,
  embedAllMessages,
  chunkAndEmbedMessage,
  chunkAndEmbedAllMessages,
  DEFAULT_MIN_CONTENT_LENGTH,
} from "./embeddings";

export {
  chunkText,
  shouldChunkMessage,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_MIN_CHUNK_SIZE,
} from "./chunking";

export type {
  ChunkingOptions,
  TextChunk,
} from "./chunking";

export type {
  MemoryRetrievalSearchOptions,
  MemoryRetrievalResult,
  MemoryRetrievalContext,
  MemoryRetrievalToolConfig,
  EmbeddingOptions,
} from "./types";
