/**
 * Memory Engine Types
 *
 * Types for the memory engine that allows semantic search
 * across past conversation messages.
 */

import type { StorageOperationsContext } from "../db/chat/operations";

/**
 * A single document scored by a reranker.
 */
export interface RerankResult {
  /** Index of the document in the original input array */
  index: number;
  /** Relevance score assigned by the reranker (higher = more relevant) */
  relevanceScore: number;
}

/**
 * Function that reranks documents against a query.
 *
 * Accepts a query and an array of document strings, returns scored results
 * sorted by relevance. Implementations can call any reranking provider
 * (Jina, Cohere, a local cross-encoder, etc.).
 *
 * @example
 * ```ts
 * const rerank: RerankFunction = async (query, documents) => {
 *   const response = await fetch("https://api.jina.ai/v1/rerank", {
 *     method: "POST",
 *     headers: { Authorization: `Bearer ${JINA_API_KEY}` },
 *     body: JSON.stringify({ query, documents, top_n: documents.length }),
 *   });
 *   const data = await response.json();
 *   return data.results.map((r) => ({
 *     index: r.index,
 *     relevanceScore: r.relevance_score,
 *   }));
 * };
 * ```
 */
export type RerankFunction = (
  query: string,
  documents: string[]
) => Promise<RerankResult[]>;

/**
 * Options for memory engine search
 */
export interface MemoryEngineSearchOptions {
  /** Maximum number of results to return (default: 8) */
  limit?: number;
  /** Alias for limit - number of chunks to return (default: 8) */
  topK?: number;
  /** Minimum similarity threshold 0-1 (default: 0.3) */
  minSimilarity?: number;
  /** Include assistant messages in results (default: false) */
  includeAssistant?: boolean;
  /** Filter to a specific conversation */
  conversationId?: string;
  /** Exclude messages from this conversation (e.g., the current conversation) */
  excludeConversationId?: string;
  /** Inclusive start date filter (currently disabled) */
  startDate?: string;
  /** Inclusive end date filter (currently disabled) */
  endDate?: string;
  /** Sort order for results: "similarity" (most relevant first) or "chronological" (oldest first). Default: "similarity" */
  sortBy?: "similarity" | "chronological";
  /** Number of surrounding messages to include around each match when expanding to full sessions. 0 returns only matched chunks (no expansion), undefined returns the entire conversation. Default: undefined (full session). */
  contextMessages?: number;
  /**
   * Optional reranking function applied after initial bi-encoder retrieval.
   * When provided, the initial retrieval fetches 3× topK candidates, reranks
   * them with this function, then keeps the top topK results.
   */
  rerank?: RerankFunction;
}

/**
 * A retrieved message with similarity score
 */
export interface MemoryEngineResult {
  /** Message content */
  content: string;
  /** Role of the message sender */
  role: "user" | "assistant";
  /** Conversation this message belongs to */
  conversationId: string;
  /** Cosine similarity score (0-1) */
  similarity: number;
  /** When the message was created */
  createdAt: Date;
  /** Unique message ID */
  uniqueId: string;
}

/**
 * Options for embedding generation
 *
 * Supports two auth methods:
 * - `getToken`: For Privy identity tokens (uses Authorization: Bearer header)
 * - `apiKey`: For direct API keys (uses X-API-Key header)
 *
 * At least one of `getToken` or `apiKey` must be provided.
 */
export interface EmbeddingOptions {
  /** Function to get auth token (e.g., Privy's getIdentityToken). Uses Authorization: Bearer header. */
  getToken?: () => Promise<string | null>;
  /** Direct API key for server-side usage. Uses X-API-Key header. */
  apiKey?: string;
  /** Base URL for the API */
  baseUrl?: string;
  /** Embedding model to use */
  model?: string;
  /** Max texts per API call for batch embeddings (default: 100). Larger arrays are split into chunks. */
  batchSize?: number;
}

/**
 * Context required for memory engine operations
 */
interface MemoryEngineContext {
  /** Storage operations context */
  storageCtx: StorageOperationsContext;
  /** Embedding options */
  embeddingOptions: EmbeddingOptions;
}

/**
 * Tool configuration for memory engine
 */
interface MemoryEngineToolConfig {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** JSON schema for parameters */
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
  /** Executor function that runs when tool is called */
  executor: (args: { query: string; limit?: number }) => Promise<string>;
}
