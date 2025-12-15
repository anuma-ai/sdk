import type { Database } from "@nozbe/watermelondb";
import type { MemoryExtractionResult } from "../memory/service";

/**
 * Memory type classification
 */
export type MemoryType =
  | "identity"
  | "preference"
  | "project"
  | "skill"
  | "constraint";

/**
 * Base memory item (matches existing MemoryItem from memory/service.ts)
 */
export interface MemoryItem {
  type: MemoryType;
  namespace: string;
  key: string;
  value: string;
  rawEvidence: string;
  confidence: number;
  pii: boolean;
}

/**
 * Stored memory record (what gets persisted to the database)
 */
export interface StoredMemory {
  /** Primary key, unique memory identifier (WatermelonDB auto-generated) */
  uniqueId: string;
  /** Memory type classification */
  type: MemoryType;
  /** Namespace for grouping related memories */
  namespace: string;
  /** Key within the namespace */
  key: string;
  /** The memory value/content */
  value: string;
  /** Raw evidence from which this memory was extracted */
  rawEvidence: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether this memory contains PII */
  pii: boolean;
  /** Composite key (namespace:key) for efficient lookups */
  compositeKey: string;
  /** Unique key (namespace:key:value) for deduplication */
  uniqueKey: string;
  /** ISO timestamp */
  createdAt: Date;
  /** ISO timestamp */
  updatedAt: Date;
  /** Embedding vector for semantic search */
  embedding?: number[];
  /** Model used to generate embedding */
  embeddingModel?: string;
  /** Soft delete flag */
  isDeleted: boolean;
}

/**
 * Memory with similarity score (returned from semantic search)
 */
export interface StoredMemoryWithSimilarity extends StoredMemory {
  /** Cosine similarity score (0-1) */
  similarity: number;
}

/**
 * Options for creating a new memory
 */
export interface CreateMemoryOptions {
  /** Memory type */
  type: MemoryType;
  /** Namespace for grouping */
  namespace: string;
  /** Key within namespace */
  key: string;
  /** Memory value/content */
  value: string;
  /** Raw evidence text */
  rawEvidence: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether this contains PII */
  pii: boolean;
  /** Optional embedding vector */
  embedding?: number[];
  /** Optional embedding model name */
  embeddingModel?: string;
}

/**
 * Options for updating a memory
 */
export interface UpdateMemoryOptions {
  /** Memory type */
  type?: MemoryType;
  /** Namespace for grouping */
  namespace?: string;
  /** Key within namespace */
  key?: string;
  /** Memory value/content */
  value?: string;
  /** Raw evidence text */
  rawEvidence?: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Whether this contains PII */
  pii?: boolean;
  /** Optional embedding vector */
  embedding?: number[];
  /** Optional embedding model name */
  embeddingModel?: string;
}

/**
 * Result type for updateMemoryOp - discriminated union for different outcomes
 */
export type UpdateMemoryResult =
  | { ok: true; memory: StoredMemory }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "conflict"; conflictingKey: string }
  | { ok: false; reason: "error"; error: Error };

/**
 * Base options for useMemoryStorage hook (shared between React and Expo)
 */
export interface BaseUseMemoryStorageOptions {
  /** WatermelonDB database instance */
  database: Database;
  /** The model to use for fact extraction (default: "openai/gpt-4o") */
  completionsModel?: string;
  /**
   * The model to use for generating embeddings
   * For local: default is "Snowflake/snowflake-arctic-embed-xs"
   * For api: default is "openai/text-embedding-3-small"
   * Set to null to disable embedding generation
   */
  embeddingModel?: string | null;
  /**
   * The provider to use for generating embeddings (default: "local")
   * "local": Uses a local HuggingFace model (in-browser)
   * "api": Uses the backend API
   */
  embeddingProvider?: "local" | "api";
  /** Whether to automatically generate embeddings for extracted memories (default: true) */
  generateEmbeddings?: boolean;
  /** Callback when facts are extracted */
  onFactsExtracted?: (facts: MemoryExtractionResult) => void;
  /** Custom function to get auth token for API calls */
  getToken?: () => Promise<string | null>;
  /** Optional base URL for the API requests */
  baseUrl?: string;
}

/**
 * Base result returned by useMemoryStorage hook (shared between React and Expo)
 */
export interface BaseUseMemoryStorageResult {
  /** Current memories in state (reactive) */
  memories: StoredMemory[];
  /** Refresh memories from storage */
  refreshMemories: () => Promise<void>;
  /**
   * Extract memories from messages and store them
   * @param options Messages and model to use for extraction
   * @returns Extraction result or null if failed
   */
  extractMemoriesFromMessage: (options: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
  }) => Promise<MemoryExtractionResult | null>;
  /**
   * Search for similar memories using semantic search
   * @param query The text query to search for
   * @param limit Maximum number of results (default: 10)
   * @param minSimilarity Minimum similarity threshold 0-1 (default: 0.6)
   * @returns Array of memories with similarity scores, sorted by relevance
   */
  searchMemories: (
    query: string,
    limit?: number,
    minSimilarity?: number
  ) => Promise<StoredMemoryWithSimilarity[]>;
  /**
   * Get all memories stored in the database
   * @returns Array of all stored memories
   */
  fetchAllMemories: () => Promise<StoredMemory[]>;
  /**
   * Get memories filtered by namespace
   * @param namespace The namespace to filter by
   * @returns Array of memories in the specified namespace
   */
  fetchMemoriesByNamespace: (namespace: string) => Promise<StoredMemory[]>;
  /**
   * Get memories by namespace and key
   * @param namespace The namespace
   * @param key The key within the namespace
   * @returns Array of memories matching the namespace and key
   */
  fetchMemoriesByKey: (
    namespace: string,
    key: string
  ) => Promise<StoredMemory[]>;
  /**
   * Get a memory by its unique ID
   * @param id The memory unique ID
   * @returns The memory or null if not found
   */
  getMemoryById: (id: string) => Promise<StoredMemory | null>;
  /**
   * Save a single memory to storage
   * @param memory The memory to save
   * @returns The stored memory
   */
  saveMemory: (memory: CreateMemoryOptions) => Promise<StoredMemory>;
  /**
   * Save multiple memories to storage
   * @param memories Array of memories to save
   * @returns Array of stored memories
   */
  saveMemories: (memories: CreateMemoryOptions[]) => Promise<StoredMemory[]>;
  /**
   * Update a memory by its ID
   * @param id The memory ID
   * @param updates Partial memory fields to update
   * @returns The updated memory or null if not found
   */
  updateMemory: (
    id: string,
    updates: UpdateMemoryOptions
  ) => Promise<StoredMemory | null>;
  /**
   * Delete a specific memory by namespace, key, and value
   * @param namespace The namespace
   * @param key The key
   * @param value The value
   */
  removeMemory: (
    namespace: string,
    key: string,
    value: string
  ) => Promise<void>;
  /**
   * Delete a memory by its ID (soft delete)
   * @param id The memory ID
   */
  removeMemoryById: (id: string) => Promise<void>;
  /**
   * Delete all memories by namespace and key
   * @param namespace The namespace
   * @param key The key
   */
  removeMemories: (namespace: string, key: string) => Promise<void>;
  /**
   * Clear all memories from storage
   */
  clearMemories: () => Promise<void>;
}

/**
 * Generate composite key from namespace and key
 */
export function generateCompositeKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

/**
 * Generate unique key from namespace, key, and value
 */
export function generateUniqueKey(
  namespace: string,
  key: string,
  value: string
): string {
  return `${namespace}:${key}:${value}`;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}
