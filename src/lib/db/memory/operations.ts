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
import {
  encryptMemoryFields,
  decryptMemoryFields,
  encryptNamespaceForQuery,
  encryptKeyForQuery,
  encryptValueForQuery,
} from "./encryption";
import type { SignMessageFn } from "../../../react/useEncryption";

export async function memoryToStored(
  memory: Memory,
  walletAddress?: string
): Promise<StoredMemory> {
  const baseMemory: StoredMemory = {
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
  
  // Decrypt fields if wallet address provided
  if (walletAddress) {
    return (await decryptMemoryFields(baseMemory, walletAddress)) as StoredMemory;
  }
  
  return baseMemory;
}

export interface MemoryStorageOperationsContext {
  database: Database;
  memoriesCollection: Collection<Memory>;
  walletAddress?: string;
  signMessage?: SignMessageFn;
}

export async function getAllMemoriesOp(
  ctx: MemoryStorageOperationsContext
): Promise<StoredMemory[]> {
  const results = await ctx.memoriesCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return Promise.all(
    results.map((memory) => memoryToStored(memory, ctx.walletAddress))
  );
}

export async function getMemoryByIdOp(
  ctx: MemoryStorageOperationsContext,
  id: string
): Promise<StoredMemory | null> {
  try {
    const memory = await ctx.memoriesCollection.find(id);
    if (memory.isDeleted) return null;
    return await memoryToStored(memory, ctx.walletAddress);
  } catch {
    return null;
  }
}

export async function getMemoriesByNamespaceOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string
): Promise<StoredMemory[]> {
  // Encrypt namespace for querying if encryption is enabled
  const queryNamespace = ctx.walletAddress && ctx.signMessage
    ? await encryptNamespaceForQuery(namespace, ctx.walletAddress, ctx.signMessage)
    : namespace;
  
  const results = await ctx.memoriesCollection
    .query(
      Q.where("namespace", queryNamespace),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .fetch();

  return Promise.all(
    results.map((memory) => memoryToStored(memory, ctx.walletAddress))
  );
}

export async function getMemoriesByKeyOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string,
  key: string
): Promise<StoredMemory[]> {
  // Encrypt namespace and key for querying if encryption is enabled
  const encryptedNamespace = ctx.walletAddress && ctx.signMessage
    ? await encryptNamespaceForQuery(namespace, ctx.walletAddress, ctx.signMessage)
    : namespace;
  const encryptedKey = ctx.walletAddress && ctx.signMessage
    ? await encryptKeyForQuery(key, ctx.walletAddress, ctx.signMessage)
    : key;
  
  const compositeKey = generateCompositeKey(encryptedNamespace, encryptedKey);
  const results = await ctx.memoriesCollection
    .query(
      Q.where("composite_key", compositeKey),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .fetch();

  return Promise.all(
    results.map((memory) => memoryToStored(memory, ctx.walletAddress))
  );
}

export async function getMemoryByUniqueKeyOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string,
  key: string,
  value: string
): Promise<StoredMemory | null> {
  // Encrypt fields for querying if encryption is enabled
  const encryptedNamespace = ctx.walletAddress && ctx.signMessage
    ? await encryptNamespaceForQuery(namespace, ctx.walletAddress, ctx.signMessage)
    : namespace;
  const encryptedKey = ctx.walletAddress && ctx.signMessage
    ? await encryptKeyForQuery(key, ctx.walletAddress, ctx.signMessage)
    : key;
  const encryptedValue = ctx.walletAddress && ctx.signMessage
    ? await encryptValueForQuery(value, ctx.walletAddress, ctx.signMessage)
    : value;
  
  const uniqueKey = generateUniqueKey(encryptedNamespace, encryptedKey, encryptedValue);
  const results = await ctx.memoriesCollection
    .query(Q.where("unique_key", uniqueKey), Q.where("is_deleted", false))
    .fetch();

  if (results.length === 0) return null;
  return await memoryToStored(results[0], ctx.walletAddress);
}

export async function saveMemoryOp(
  ctx: MemoryStorageOperationsContext,
  opts: CreateMemoryOptions
): Promise<StoredMemory> {
  // Encrypt fields before storing if encryption is enabled
  const memoryToStore = ctx.walletAddress && ctx.signMessage
    ? await encryptMemoryFields(opts, ctx.walletAddress, ctx.signMessage)
    : opts;
  
  const compositeKey = generateCompositeKey(memoryToStore.namespace, memoryToStore.key);
  const uniqueKey = generateUniqueKey(memoryToStore.namespace, memoryToStore.key, memoryToStore.value);

  const result = await ctx.database.write(async () => {
    const existing = await ctx.memoriesCollection
      .query(Q.where("unique_key", uniqueKey))
      .fetch();

    if (existing.length > 0) {
      const existingMemory = existing[0];

      // Compare with encrypted values for embedding preservation check
      const shouldPreserveEmbedding =
        existingMemory.value === memoryToStore.value &&
        existingMemory.rawEvidence === memoryToStore.rawEvidence &&
        existingMemory.type === memoryToStore.type &&
        existingMemory.namespace === memoryToStore.namespace &&
        existingMemory.key === memoryToStore.key &&
        existingMemory.embedding !== undefined &&
        existingMemory.embedding.length > 0 &&
        !opts.embedding;

      await existingMemory.update((mem) => {
        mem._setRaw("type", memoryToStore.type);
        mem._setRaw("namespace", memoryToStore.namespace);
        mem._setRaw("key", memoryToStore.key);
        mem._setRaw("value", memoryToStore.value);
        mem._setRaw("raw_evidence", memoryToStore.rawEvidence);
        mem._setRaw("confidence", memoryToStore.confidence);
        mem._setRaw("pii", memoryToStore.pii);
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

    return await ctx.memoriesCollection.create((mem) => {
      mem._setRaw("type", memoryToStore.type);
      mem._setRaw("namespace", memoryToStore.namespace);
      mem._setRaw("key", memoryToStore.key);
      mem._setRaw("value", memoryToStore.value);
      mem._setRaw("raw_evidence", memoryToStore.rawEvidence);
      mem._setRaw("confidence", memoryToStore.confidence);
      mem._setRaw("pii", memoryToStore.pii);
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

  return await memoryToStored(result, ctx.walletAddress);
}

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

export async function updateMemoryOp(
  ctx: MemoryStorageOperationsContext,
  id: string,
  updates: UpdateMemoryOptions
): Promise<UpdateMemoryResult> {
  let memory;
  try {
    memory = await ctx.memoriesCollection.find(id);
  } catch {
    return { ok: false, reason: "not_found" };
  }

  if (memory.isDeleted) {
    return { ok: false, reason: "not_found" };
  }

  // Decrypt existing memory to get plaintext values for merging
  const decryptedMemory = ctx.walletAddress
    ? ((await decryptMemoryFields(memory, ctx.walletAddress)) as Memory)
    : memory;

  // Build complete memory with updates merged
  const completeMemory: CreateMemoryOptions = {
    type: updates.type ?? decryptedMemory.type,
    namespace: updates.namespace ?? decryptedMemory.namespace,
    key: updates.key ?? decryptedMemory.key,
    value: updates.value ?? decryptedMemory.value,
    rawEvidence: updates.rawEvidence ?? decryptedMemory.rawEvidence,
    confidence: updates.confidence ?? decryptedMemory.confidence,
    pii: updates.pii ?? decryptedMemory.pii,
    embedding: updates.embedding,
    embeddingModel: updates.embeddingModel,
  };

  // Encrypt the complete memory if encryption is enabled
  const memoryToStore = ctx.walletAddress && ctx.signMessage
    ? await encryptMemoryFields(completeMemory, ctx.walletAddress, ctx.signMessage)
    : completeMemory;

  const newCompositeKey = generateCompositeKey(memoryToStore.namespace, memoryToStore.key);
  const newUniqueKey = generateUniqueKey(memoryToStore.namespace, memoryToStore.key, memoryToStore.value);

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
        if (updates.type !== undefined) mem._setRaw("type", memoryToStore.type);
        if (updates.namespace !== undefined)
          mem._setRaw("namespace", memoryToStore.namespace);
        if (updates.key !== undefined) mem._setRaw("key", memoryToStore.key);
        if (updates.value !== undefined) mem._setRaw("value", memoryToStore.value);
        if (updates.rawEvidence !== undefined)
          mem._setRaw("raw_evidence", memoryToStore.rawEvidence);
        if (updates.confidence !== undefined)
          mem._setRaw("confidence", memoryToStore.confidence);
        if (updates.pii !== undefined) mem._setRaw("pii", memoryToStore.pii);

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

    return { ok: true, memory: await memoryToStored(updated, ctx.walletAddress) };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

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
    // Memory not found
  }
}

export async function deleteMemoryOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string,
  key: string,
  value: string
): Promise<void> {
  // Encrypt fields for querying if encryption is enabled
  const encryptedNamespace = ctx.walletAddress && ctx.signMessage
    ? await encryptNamespaceForQuery(namespace, ctx.walletAddress, ctx.signMessage)
    : namespace;
  const encryptedKey = ctx.walletAddress && ctx.signMessage
    ? await encryptKeyForQuery(key, ctx.walletAddress, ctx.signMessage)
    : key;
  const encryptedValue = ctx.walletAddress && ctx.signMessage
    ? await encryptValueForQuery(value, ctx.walletAddress, ctx.signMessage)
    : value;
  
  const uniqueKey = generateUniqueKey(encryptedNamespace, encryptedKey, encryptedValue);
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

export async function deleteMemoriesByKeyOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string,
  key: string
): Promise<void> {
  // Encrypt namespace and key for querying if encryption is enabled
  const encryptedNamespace = ctx.walletAddress && ctx.signMessage
    ? await encryptNamespaceForQuery(namespace, ctx.walletAddress, ctx.signMessage)
    : namespace;
  const encryptedKey = ctx.walletAddress && ctx.signMessage
    ? await encryptKeyForQuery(key, ctx.walletAddress, ctx.signMessage)
    : key;
  
  const compositeKey = generateCompositeKey(encryptedNamespace, encryptedKey);
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

  const results = await Promise.all(
    memoriesWithEmbeddings.map(async (memory) => {
      const similarity = cosineSimilarity(queryEmbedding, memory.embedding!);
      const stored = await memoryToStored(memory, ctx.walletAddress);
      return {
        ...stored,
        similarity,
      };
    })
  );

  return results
    .filter((result) => result.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

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
