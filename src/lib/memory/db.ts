import Dexie, { type Table } from "dexie";
import type { MemoryItem } from "./service";

/**
 * Extended MemoryItem with database fields
 */
export interface StoredMemoryItem extends MemoryItem {
  id?: number; // Auto-increment primary key
  createdAt: number; // Timestamp when memory was created
  updatedAt: number; // Timestamp when memory was last updated
  // Composite key for querying: namespace + key (allows multiple values)
  compositeKey: string; // Format: `${namespace}:${key}`
  // Unique key for exact duplicates: namespace + key + value
  uniqueKey: string; // Format: `${namespace}:${key}:${value}`
  // Embedding vector for semantic search (optional, generated on demand)
  embedding?: number[];
  // Model used to generate the embedding
  embeddingModel?: string;
}

/**
 * Dexie database for storing user memories
 */
class MemoryDatabase extends Dexie {
  memories!: Table<StoredMemoryItem>;

  constructor() {
    super("MemoryDatabase");

    // Version 2: Supports multiple values per namespace:key combination
    // uniqueKey ensures exact duplicates (namespace:key:value) are updated, not duplicated
    this.version(2).stores({
      memories:
        "++id, uniqueKey, compositeKey, namespace, key, type, createdAt, updatedAt",
    });

    // Version 3: Adds embedding support for semantic search
    this.version(3).stores({
      memories:
        "++id, uniqueKey, compositeKey, namespace, key, type, createdAt, updatedAt",
    });
  }
}

// Create and export a singleton instance
export const memoryDb = new MemoryDatabase();

/**
 * Save a memory item to IndexedDB
 * If a memory with the same namespace:key:value exists, it will be updated
 * Multiple entries with the same namespace:key but different values are allowed
 */
export const saveMemory = async (memory: MemoryItem): Promise<void> => {
  const compositeKey = `${memory.namespace}:${memory.key}`;
  const uniqueKey = `${memory.namespace}:${memory.key}:${memory.value}`;
  const now = Date.now();

  // Check if exact duplicate exists (same namespace:key:value)
  const existing = await memoryDb.memories
    .where("uniqueKey")
    .equals(uniqueKey)
    .first();

  if (existing) {
    // Update existing memory (same namespace:key:value combination)
    // Preserve embedding fields if they exist and memory value hasn't changed
    const shouldPreserveEmbedding = existing.value === memory.value;
    await memoryDb.memories.update(existing.id!, {
      ...memory,
      compositeKey,
      uniqueKey,
      updatedAt: now,
      // Preserve createdAt
      createdAt: existing.createdAt,
      // Preserve embedding fields if value hasn't changed (embedding is still valid)
      // If value changed, embedding will be cleared and should be regenerated
      ...(shouldPreserveEmbedding && existing.embedding
        ? {
            embedding: existing.embedding,
            embeddingModel: existing.embeddingModel,
          }
        : {}),
    });
  } else {
    // Insert new memory (allows multiple entries with same namespace:key)
    await memoryDb.memories.add({
      ...memory,
      compositeKey,
      uniqueKey,
      createdAt: now,
      updatedAt: now,
    });
  }
};

/**
 * Save multiple memory items to IndexedDB
 */
export const saveMemories = async (memories: MemoryItem[]): Promise<void> => {
  await Promise.all(memories.map((memory) => saveMemory(memory)));
};

/**
 * Get all memories from IndexedDB
 */
export const getAllMemories = async (): Promise<StoredMemoryItem[]> => {
  return memoryDb.memories.toArray();
};

/**
 * Get memories by namespace
 */
export const getMemoriesByNamespace = async (
  namespace: string
): Promise<StoredMemoryItem[]> => {
  return memoryDb.memories.where("namespace").equals(namespace).toArray();
};

/**
 * Get all memories by namespace and key
 * Returns all entries with the same namespace:key (e.g., all food likes)
 */
export const getMemories = async (
  namespace: string,
  key: string
): Promise<StoredMemoryItem[]> => {
  const compositeKey = `${namespace}:${key}`;
  return memoryDb.memories.where("compositeKey").equals(compositeKey).toArray();
};

/**
 * Get a specific memory by namespace, key, and value
 */
export const getMemory = async (
  namespace: string,
  key: string,
  value: string
): Promise<StoredMemoryItem | undefined> => {
  const uniqueKey = `${namespace}:${key}:${value}`;
  return memoryDb.memories.where("uniqueKey").equals(uniqueKey).first();
};

/**
 * Delete all memories by namespace and key
 */
export const deleteMemories = async (
  namespace: string,
  key: string
): Promise<void> => {
  const compositeKey = `${namespace}:${key}`;
  await memoryDb.memories.where("compositeKey").equals(compositeKey).delete();
};

/**
 * Delete a specific memory by namespace, key, and value
 */
export const deleteMemory = async (
  namespace: string,
  key: string,
  value: string
): Promise<void> => {
  const uniqueKey = `${namespace}:${key}:${value}`;
  const existing = await memoryDb.memories
    .where("uniqueKey")
    .equals(uniqueKey)
    .first();

  if (existing?.id) {
    await memoryDb.memories.delete(existing.id);
  }
};

/**
 * Clear all memories from IndexedDB
 */
export const clearAllMemories = async (): Promise<void> => {
  await memoryDb.memories.clear();
};

/**
 * Calculate cosine similarity between two vectors
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
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
};

/**
 * Search for similar memories using vector similarity
 * @param queryEmbedding The embedding vector to search for
 * @param limit Maximum number of results to return
 * @param minSimilarity Minimum similarity threshold (0-1, default: 0.6)
 *   Note: Embedding similarity scores are typically lower than expected.
 *   A score of 0.6-0.7 is usually a good match, 0.5-0.6 is moderate.
 * @returns Array of memories sorted by similarity (highest first)
 */
export const searchSimilarMemories = async (
  queryEmbedding: number[],
  limit: number = 10,
  minSimilarity: number = 0.6
): Promise<Array<StoredMemoryItem & { similarity: number }>> => {
  const allMemories = await getAllMemories();
  const memoriesWithEmbeddings = allMemories.filter(
    (m) => m.embedding && m.embedding.length > 0
  );

  // Debug logging
  console.log(
    `[Memory Search] Total memories: ${allMemories.length}, ` +
      `memories with embeddings: ${memoriesWithEmbeddings.length}`
  );

  if (memoriesWithEmbeddings.length === 0) {
    console.warn(
      "[Memory Search] No memories with embeddings found. " +
        "Memories may need embeddings generated. " +
        "Use generateAndStoreEmbeddings() to generate embeddings for existing memories."
    );
    return [];
  }

  // Calculate similarities for all memories
  const allResults = memoriesWithEmbeddings
    .map((memory) => {
      const similarity = cosineSimilarity(queryEmbedding, memory.embedding!);
      return {
        ...memory,
        similarity,
      };
    })
    .sort((a, b) => b.similarity - a.similarity);

  // Log all similarity scores for debugging
  console.log(
    `[Memory Search] All similarity scores:`,
    allResults.map((r) => ({
      key: `${r.namespace}:${r.key}`,
      value: r.value,
      similarity: r.similarity.toFixed(4),
    }))
  );

  // Filter by threshold
  const results = allResults
    .filter((result) => result.similarity >= minSimilarity)
    .slice(0, limit);

  if (results.length === 0 && allResults.length > 0) {
    const topSimilarity = allResults[0].similarity;
    const suggestedThreshold = Math.max(0.3, topSimilarity - 0.1);
    console.warn(
      `[Memory Search] No memories above threshold ${minSimilarity}. ` +
        `Highest similarity was ${topSimilarity.toFixed(4)}. ` +
        `Consider lowering the threshold to ${suggestedThreshold.toFixed(2)}`
    );
  } else {
    console.log(
      `[Memory Search] Found ${results.length} memories above similarity threshold ${minSimilarity}. ` +
        `Top similarity: ${results[0]?.similarity.toFixed(4) || "N/A"}`
    );
  }

  return results;
};
