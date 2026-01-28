/**
 * Conversation Retrieval Module
 *
 * Provides semantic search over past conversation messages.
 * This enables LLMs to retrieve relevant context from previous conversations
 * using embeddings and cosine similarity.
 *
 * @example
 * ```ts
 * import {
 *   createConversationRetrievalTool,
 *   embedMessage,
 *   embedAllMessages,
 * } from "@anthropic/sdk/lib/conversationRetrieval";
 *
 * // Create a tool for LLM to search past conversations
 * const tool = createConversationRetrievalTool(
 *   storageCtx,
 *   { apiKey: process.env.PORTAL_API_KEY }
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
  createConversationRetrievalTool,
} from "./tool";

export {
  generateEmbedding,
  embedMessage,
  embedAllMessages,
} from "./embeddings";

export type {
  ConversationRetrievalSearchOptions,
  ConversationRetrievalResult,
  ConversationRetrievalContext,
  ConversationRetrievalToolConfig,
  EmbeddingOptions,
} from "./types";
