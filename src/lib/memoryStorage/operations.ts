import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";

import { Memory } from "./models";
import {
  type StoredMemory,
  type StoredMemoryWithSimilarity,
  type CreateMemoryOptions,
  type UpdateMemoryOptions,
  type UpdateMemoryResult,
  generateCompositeKey,
  generateUniqueKey,
  cosineSimilarity,
} from "./types";

/**
 * Convert a Memory model to StoredMemory
 */
export function memoryToStored(memory: Memory): StoredMemory {
  return {
    uniqueId: memory.id,
    type: memory.type,
    namespace: memory.namespace,
    key: memory.key,
    value: memory.value,
    rawEvidence: memory.rawEvidence,
    confidence: memory.confidence,
    pii: memory.pii,
    compositeKey: memory.compositeKey,
    uniqueKey: memory.uniqueKey,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    embedding: memory.embedding,
    embeddingModel: memory.embeddingModel,
    isDeleted: memory.isDeleted,
  };
}

/**
 * Storage operations context
 */
export interface MemoryStorageOperationsContext {
  database: Database;
  memoriesCollection: Collection<Memory>;
}

/**
 * Get all memories (excluding soft-deleted)
 */
export async function getAllMemoriesOp(
  ctx: MemoryStorageOperationsContext
): Promise<StoredMemory[]> {
  const results = await ctx.memoriesCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return results.map(memoryToStored);
}

/**
 * Get a memory by ID
 */
export async function getMemoryByIdOp(
  ctx: MemoryStorageOperationsContext,
  id: string
): Promise<StoredMemory | null> {
  try {
    const memory = await ctx.memoriesCollection.find(id);
    if (memory.isDeleted) return null;
    return memoryToStored(memory);
  } catch {
    return null;
  }
}

/**
 * Get memories by namespace
 */
export async function getMemoriesByNamespaceOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string
): Promise<StoredMemory[]> {
  const results = await ctx.memoriesCollection
    .query(
      Q.where("namespace", namespace),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .fetch();

  return results.map(memoryToStored);
}

/**
 * Get memories by namespace and key
 */
export async function getMemoriesByKeyOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string,
  key: string
): Promise<StoredMemory[]> {
  const compositeKey = generateCompositeKey(namespace, key);
  const results = await ctx.memoriesCollection
    .query(
      Q.where("composite_key", compositeKey),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .fetch();

  return results.map(memoryToStored);
}

/**
 * Get a memory by unique key (namespace:key:value)
 */
export async function getMemoryByUniqueKeyOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string,
  key: string,
  value: string
): Promise<StoredMemory | null> {
  const uniqueKey = generateUniqueKey(namespace, key, value);
  const results = await ctx.memoriesCollection
    .query(Q.where("unique_key", uniqueKey), Q.where("is_deleted", false))
    .fetch();

  return results.length > 0 ? memoryToStored(results[0]) : null;
}

/**
 * Create or update a memory (upsert by unique key)
 * The existence check and create/update are performed atomically within a single transaction
 */
export async function saveMemoryOp(
  ctx: MemoryStorageOperationsContext,
  opts: CreateMemoryOptions
): Promise<StoredMemory> {
  const compositeKey = generateCompositeKey(opts.namespace, opts.key);
  const uniqueKey = generateUniqueKey(opts.namespace, opts.key, opts.value);

  // Perform existence check and create/update atomically within a single transaction
  const result = await ctx.database.write(async () => {
    // Check if memory with this unique key already exists
    const existing = await ctx.memoriesCollection
      .query(Q.where("unique_key", uniqueKey))
      .fetch();

    if (existing.length > 0) {
      // Update existing memory
      const existingMemory = existing[0];

      // Determine if we should preserve existing embedding
      const shouldPreserveEmbedding =
        existingMemory.value === opts.value &&
        existingMemory.rawEvidence === opts.rawEvidence &&
        existingMemory.type === opts.type &&
        existingMemory.namespace === opts.namespace &&
        existingMemory.key === opts.key &&
        existingMemory.embedding !== undefined &&
        existingMemory.embedding.length > 0 &&
        !opts.embedding;

      await existingMemory.update((mem) => {
        mem._setRaw("type", opts.type);
        mem._setRaw("namespace", opts.namespace);
        mem._setRaw("key", opts.key);
        mem._setRaw("value", opts.value);
        mem._setRaw("raw_evidence", opts.rawEvidence);
        mem._setRaw("confidence", opts.confidence);
        mem._setRaw("pii", opts.pii);
        mem._setRaw("composite_key", compositeKey);
        mem._setRaw("unique_key", uniqueKey);
        mem._setRaw("is_deleted", false);

        if (shouldPreserveEmbedding) {
          // Keep existing embedding
        } else if (opts.embedding) {
          mem._setRaw("embedding", JSON.stringify(opts.embedding));
          if (opts.embeddingModel) {
            mem._setRaw("embedding_model", opts.embeddingModel);
          }
        } else {
          mem._setRaw("embedding", null);
          mem._setRaw("embedding_model", null);
        }
      });

      return existingMemory;
    }

    // Create new memory
    return await ctx.memoriesCollection.create((mem) => {
      mem._setRaw("type", opts.type);
      mem._setRaw("namespace", opts.namespace);
      mem._setRaw("key", opts.key);
      mem._setRaw("value", opts.value);
      mem._setRaw("raw_evidence", opts.rawEvidence);
      mem._setRaw("confidence", opts.confidence);
      mem._setRaw("pii", opts.pii);
      mem._setRaw("composite_key", compositeKey);
      mem._setRaw("unique_key", uniqueKey);
      mem._setRaw("is_deleted", false);

      if (opts.embedding) {
        mem._setRaw("embedding", JSON.stringify(opts.embedding));
        if (opts.embeddingModel) {
          mem._setRaw("embedding_model", opts.embeddingModel);
        }
      }
    });
  });

  return memoryToStored(result);
}

/**
 * Save multiple memories
 */
export async function saveMemoriesOp(
  ctx: MemoryStorageOperationsContext,
  memories: CreateMemoryOptions[]
): Promise<StoredMemory[]> {
  const results: StoredMemory[] = [];
  for (const memory of memories) {
    const saved = await saveMemoryOp(ctx, memory);
    results.push(saved);
  }
  return results;
}

/**
 * Update a memory by ID
 * Returns a discriminated union result to distinguish between not_found, conflict, and error cases
 */
export async function updateMemoryOp(
  ctx: MemoryStorageOperationsContext,
  id: string,
  updates: UpdateMemoryOptions
): Promise<UpdateMemoryResult> {
  let memory;
  try {
    memory = await ctx.memoriesCollection.find(id);
  } catch {
    // Memory not found
    return { ok: false, reason: "not_found" };
  }

  if (memory.isDeleted) {
    return { ok: false, reason: "not_found" };
  }

  // If namespace, key, or value is changing, recalculate keys
  const newNamespace = updates.namespace ?? memory.namespace;
  const newKey = updates.key ?? memory.key;
  const newValue = updates.value ?? memory.value;
  const newCompositeKey = generateCompositeKey(newNamespace, newKey);
  const newUniqueKey = generateUniqueKey(newNamespace, newKey, newValue);

  // Check for unique key conflict if key is changing
  if (newUniqueKey !== memory.uniqueKey) {
    const existing = await ctx.memoriesCollection
      .query(Q.where("unique_key", newUniqueKey), Q.where("is_deleted", false))
      .fetch();

    if (existing.length > 0) {
      return { ok: false, reason: "conflict", conflictingKey: newUniqueKey };
    }
  }

  try {
    const updated = await ctx.database.write(async () => {
      await memory.update((mem) => {
        if (updates.type !== undefined) mem._setRaw("type", updates.type);
        if (updates.namespace !== undefined)
          mem._setRaw("namespace", updates.namespace);
        if (updates.key !== undefined) mem._setRaw("key", updates.key);
        if (updates.value !== undefined) mem._setRaw("value", updates.value);
        if (updates.rawEvidence !== undefined)
          mem._setRaw("raw_evidence", updates.rawEvidence);
        if (updates.confidence !== undefined)
          mem._setRaw("confidence", updates.confidence);
        if (updates.pii !== undefined) mem._setRaw("pii", updates.pii);

        // Update composite keys if any key components changed
        if (
          updates.namespace !== undefined ||
          updates.key !== undefined ||
          updates.value !== undefined
        ) {
          mem._setRaw("composite_key", newCompositeKey);
          mem._setRaw("unique_key", newUniqueKey);
        }

        if (updates.embedding !== undefined) {
          mem._setRaw(
            "embedding",
            updates.embedding ? JSON.stringify(updates.embedding) : null
          );
        }
        if (updates.embeddingModel !== undefined) {
          mem._setRaw("embedding_model", updates.embeddingModel || null);
        }
      });
      return memory;
    });

    return { ok: true, memory: memoryToStored(updated) };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Soft delete a memory by ID
 */
export async function deleteMemoryByIdOp(
  ctx: MemoryStorageOperationsContext,
  id: string
): Promise<void> {
  try {
    const memory = await ctx.memoriesCollection.find(id);
    await ctx.database.write(async () => {
      await memory.update((mem) => {
        mem._setRaw("is_deleted", true);
      });
    });
  } catch {
    // Memory not found, nothing to delete
  }
}

/**
 * Soft delete a memory by unique key
 */
export async function deleteMemoryOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string,
  key: string,
  value: string
): Promise<void> {
  const uniqueKey = generateUniqueKey(namespace, key, value);
  const results = await ctx.memoriesCollection
    .query(Q.where("unique_key", uniqueKey))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((mem) => {
        mem._setRaw("is_deleted", true);
      });
    });
  }
}

/**
 * Soft delete all memories by namespace and key
 */
export async function deleteMemoriesByKeyOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string,
  key: string
): Promise<void> {
  const compositeKey = generateCompositeKey(namespace, key);
  const results = await ctx.memoriesCollection
    .query(Q.where("composite_key", compositeKey), Q.where("is_deleted", false))
    .fetch();

  await ctx.database.write(async () => {
    for (const memory of results) {
      await memory.update((mem) => {
        mem._setRaw("is_deleted", true);
      });
    }
  });
}

/**
 * Clear all memories (soft delete all)
 */
export async function clearAllMemoriesOp(
  ctx: MemoryStorageOperationsContext
): Promise<void> {
  const results = await ctx.memoriesCollection
    .query(Q.where("is_deleted", false))
    .fetch();

  await ctx.database.write(async () => {
    for (const memory of results) {
      await memory.update((mem) => {
        mem._setRaw("is_deleted", true);
      });
    }
  });
}

/**
 * Search for similar memories using vector similarity
 */
export async function searchSimilarMemoriesOp(
  ctx: MemoryStorageOperationsContext,
  queryEmbedding: number[],
  limit: number = 10,
  minSimilarity: number = 0.6
): Promise<StoredMemoryWithSimilarity[]> {
  const allMemories = await ctx.memoriesCollection
    .query(Q.where("is_deleted", false))
    .fetch();

  const memoriesWithEmbeddings = allMemories.filter(
    (m) => m.embedding && m.embedding.length > 0
  );

  if (memoriesWithEmbeddings.length === 0) {
    return [];
  }

  const results = memoriesWithEmbeddings
    .map((memory) => {
      const similarity = cosineSimilarity(queryEmbedding, memory.embedding!);
      return {
        ...memoryToStored(memory),
        similarity,
      };
    })
    .filter((result) => result.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}

/**
 * Update embedding for a memory
 */
export async function updateMemoryEmbeddingOp(
  ctx: MemoryStorageOperationsContext,
  id: string,
  embedding: number[],
  embeddingModel: string
): Promise<void> {
  try {
    const memory = await ctx.memoriesCollection.find(id);
    await ctx.database.write(async () => {
      await memory.update((mem) => {
        mem._setRaw("embedding", JSON.stringify(embedding));
        mem._setRaw("embedding_model", embeddingModel);
      });
    });
  } catch {
    // Memory not found
  }
}
