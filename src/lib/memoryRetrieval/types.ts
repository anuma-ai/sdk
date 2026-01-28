/**
 * Memory Retrieval Types
 *
 * Types for the memory retrieval feature that allows semantic search
 * across past conversation messages.
 */

import type { StorageOperationsContext } from "../db/chat/operations";

/**
 * Options for memory retrieval search
 */
export interface MemoryRetrievalSearchOptions {
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default: 0.3) */
  minSimilarity?: number;
  /** Include assistant messages in results (default: true) */
  includeAssistant?: boolean;
  /** Filter to a specific conversation */
  conversationId?: string;
}

/**
 * A retrieved message with similarity score
 */
export interface MemoryRetrievalResult {
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
}

/**
 * Context required for memory retrieval operations
 */
export interface MemoryRetrievalContext {
  /** Storage operations context */
  storageCtx: StorageOperationsContext;
  /** Embedding options */
  embeddingOptions: EmbeddingOptions;
}

/**
 * Tool configuration for memory retrieval
 */
export interface MemoryRetrievalToolConfig {
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
