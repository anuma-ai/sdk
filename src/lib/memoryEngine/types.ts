/**
 * Memory Engine Types
 *
 * Types for the memory engine that allows semantic search
 * across past conversation messages.
 */

import type { StorageOperationsContext } from "../db/chat/operations";

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
  /**
   * Optional in-memory cache for embedding vectors. When provided, texts
   * are looked up in this map before calling the API, and new embeddings
   * are stored after generation. Useful when the same texts are embedded
   * repeatedly (e.g., across eval iterations or re-indexing runs).
   */
  cache?: Map<string, number[]>;
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
