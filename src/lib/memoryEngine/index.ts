/**
 * Memory Engine Module
 *
 * Provides semantic search over past conversation messages.
 * This enables LLMs to retrieve relevant context from previous conversations
 * using embeddings and cosine similarity.
 *
 * @example
 * ```ts
 * import {
 *   createMemoryEngineTool,
 *   embedMessage,
 *   embedAllMessages,
 * } from "@anuma/sdk/lib/memoryEngine";
 *
 * // Create a tool for LLM to search past conversations
 * const tool = createMemoryEngineTool(
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

export type { ChunkingOptions, TextChunk } from "./chunking";
export {
  chunkText,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MIN_CHUNK_SIZE,
  shouldChunkMessage,
} from "./chunking";
export {
  chunkAndEmbedAllMessages,
  chunkAndEmbedMessage,
  DEFAULT_MIN_CONTENT_LENGTH,
  embedAllMessages,
  embedMessage,
  generateEmbedding,
  generateEmbeddings,
} from "./embeddings";
export { createMemoryEngineTool } from "./tool";
export type {
  EmbeddingOptions,
  MemoryEngineResult,
  MemoryEngineSearchOptions,
  RerankFunction,
  RerankResult,
} from "./types";
