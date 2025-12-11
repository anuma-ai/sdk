import Dexie, { type Table } from "dexie";
import type { MemoryItem } from "./service";

/**
 * Extended MemoryItem with database fields
 */
export interface StoredMemoryItem extends MemoryItem {
  id?: number;
  createdAt: number;
  updatedAt: number;
  compositeKey: string;
  uniqueKey: string;
  embedding?: number[];
  embeddingModel?: string;
}

/**
 * Dexie database for storing user memories
 */
class MemoryDatabase extends Dexie {
  memories!: Table<StoredMemoryItem>;

  constructor() {
    super("MemoryDatabase");

    this.version(2).stores({
      memories:
        "++id, uniqueKey, compositeKey, namespace, key, type, createdAt, updatedAt",
    });

    this.version(3).stores({
      memories:
        "++id, uniqueKey, compositeKey, namespace, key, type, createdAt, updatedAt",
    });
  }
}

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

  const existing = await memoryDb.memories
    .where("uniqueKey")
    .equals(uniqueKey)
    .first();

  if (existing) {
    const shouldPreserveEmbedding =
      existing.value === memory.value &&
      existing.rawEvidence === memory.rawEvidence &&
      existing.type === memory.type &&
      existing.namespace === memory.namespace &&
      existing.key === memory.key &&
      existing.embedding !== undefined &&
      existing.embedding.length > 0;

    const updateData: Partial<StoredMemoryItem> = {
      ...memory,
      compositeKey,
      uniqueKey,
      updatedAt: now,
      createdAt: existing.createdAt,
    };

    if (shouldPreserveEmbedding) {
      updateData.embedding = existing.embedding;
      updateData.embeddingModel = existing.embeddingModel;
    } else {
      updateData.embedding = [];
      updateData.embeddingModel = undefined;
    }

    await memoryDb.memories.update(existing.id!, updateData);
  } else {
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
 * Update a memory item in IndexedDB
 */
export const updateMemoryById = async (
  id: number,
  updates: Partial<StoredMemoryItem & MemoryItem>,
  existingMemory: StoredMemoryItem,
  embedding: number[],
  embeddingModel: string
): Promise<StoredMemoryItem | undefined> => {
  const now = Date.now();
  const updatedMemory: Partial<StoredMemoryItem & MemoryItem> = {
    ...updates,
    updatedAt: now,
  };

  // Update composite keys if namespace, key, or value changed
  if ("namespace" in updates || "key" in updates || "value" in updates) {
    const namespace = updates.namespace ?? existingMemory.namespace;
    const key = updates.key ?? existingMemory.key;
    const value = updates.value ?? existingMemory.value;
    updatedMemory.compositeKey = `${namespace}:${key}`;
    updatedMemory.uniqueKey = `${namespace}:${key}:${value}`;
  }

  updatedMemory.embedding = embedding;
  updatedMemory.embeddingModel = embeddingModel;

  await memoryDb.memories.update(id, updatedMemory);
  return await memoryDb.memories.get(id);
};

/**
 * Get all memories from IndexedDB
 */
export const getAllMemories = async (): Promise<StoredMemoryItem[]> => {
  return memoryDb.memories.toArray();
};

export const getMemoryById = async (
  id: number
): Promise<StoredMemoryItem | undefined> => {
  return memoryDb.memories.get(id);
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

export const deleteMemoryById = async (id: number): Promise<void> => {
  await memoryDb.memories.delete(id);
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

  const allResults = memoriesWithEmbeddings
    .map((memory) => {
      const similarity = cosineSimilarity(queryEmbedding, memory.embedding!);
      return {
        ...memory,
        similarity,
      };
    })
    .sort((a, b) => b.similarity - a.similarity);

  console.log(
    `[Memory Search] All similarity scores:`,
    allResults.map((r) => ({
      key: `${r.namespace}:${r.key}`,
      value: r.value,
      similarity: r.similarity.toFixed(4),
    }))
  );

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
