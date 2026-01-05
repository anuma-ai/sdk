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
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";

export async function memoryToStored(
  memory: Memory,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
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
    return (await decryptMemoryFields(baseMemory, walletAddress, signMessage, embeddedWalletSigner)) as StoredMemory;
  }
  
  return baseMemory;
}

export interface MemoryStorageOperationsContext {
  database: Database;
  memoriesCollection: Collection<Memory>;
  walletAddress?: string;
  signMessage?: SignMessageFn;
  embeddedWalletSigner?: EmbeddedWalletSignerFn;
}

export async function getAllMemoriesOp(
  ctx: MemoryStorageOperationsContext
): Promise<StoredMemory[]> {
  const results = await ctx.memoriesCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return Promise.all(
    results.map((memory) => memoryToStored(memory, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
}

export async function getMemoryByIdOp(
  ctx: MemoryStorageOperationsContext,
  id: string
): Promise<StoredMemory | null> {
  try {
    const memory = await ctx.memoriesCollection.find(id);
    if (memory.isDeleted) return null;
    return await memoryToStored(memory, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
  } catch {
    return null;
  }
}

export async function getMemoriesByNamespaceOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string
): Promise<StoredMemory[]> {
  // Query for both encrypted and plaintext namespaces when encryption is enabled
  // to maintain backwards compatibility with legacy plaintext data
  const queries = [];
  
  if (ctx.walletAddress && ctx.signMessage) {
    // Query for encrypted namespace
    const encryptedNamespace = await encryptNamespaceForQuery(namespace, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    queries.push(
      ctx.memoriesCollection
        .query(
          Q.where("namespace", encryptedNamespace),
          Q.where("is_deleted", false),
          Q.sortBy("created_at", Q.desc)
        )
        .fetch()
    );
    // Also query for plaintext namespace (legacy data)
    queries.push(
      ctx.memoriesCollection
        .query(
          Q.where("namespace", namespace),
          Q.where("is_deleted", false),
          Q.sortBy("created_at", Q.desc)
        )
        .fetch()
    );
  } else {
    // No encryption - only query plaintext
    queries.push(
      ctx.memoriesCollection
        .query(
          Q.where("namespace", namespace),
          Q.where("is_deleted", false),
          Q.sortBy("created_at", Q.desc)
        )
        .fetch()
    );
  }

  const allResults = await Promise.all(queries);
  // Deduplicate by uniqueId (in case same memory exists in both formats)
  const uniqueResults = Array.from(
    new Map(allResults.flat().map((m) => [m.id, m])).values()
  );

  return Promise.all(
    uniqueResults.map((memory) => memoryToStored(memory, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
}

export async function getMemoriesByKeyOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string,
  key: string
): Promise<StoredMemory[]> {
  // Query for both encrypted and plaintext composite keys when encryption is enabled
  // to maintain backwards compatibility with legacy plaintext data
  const queries = [];
  
  if (ctx.walletAddress && ctx.signMessage) {
    // Query for encrypted composite key
    const encryptedNamespace = await encryptNamespaceForQuery(namespace, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    const encryptedKey = await encryptKeyForQuery(key, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    const encryptedCompositeKey = generateCompositeKey(encryptedNamespace, encryptedKey);
    queries.push(
      ctx.memoriesCollection
        .query(
          Q.where("composite_key", encryptedCompositeKey),
          Q.where("is_deleted", false),
          Q.sortBy("created_at", Q.desc)
        )
        .fetch()
    );
    // Also query for plaintext composite key (legacy data)
    const plaintextCompositeKey = generateCompositeKey(namespace, key);
    queries.push(
      ctx.memoriesCollection
        .query(
          Q.where("composite_key", plaintextCompositeKey),
          Q.where("is_deleted", false),
          Q.sortBy("created_at", Q.desc)
        )
        .fetch()
    );
  } else {
    // No encryption - only query plaintext
    const compositeKey = generateCompositeKey(namespace, key);
    queries.push(
      ctx.memoriesCollection
        .query(
          Q.where("composite_key", compositeKey),
          Q.where("is_deleted", false),
          Q.sortBy("created_at", Q.desc)
        )
        .fetch()
    );
  }

  const allResults = await Promise.all(queries);
  // Deduplicate by uniqueId (in case same memory exists in both formats)
  const uniqueResults = Array.from(
    new Map(allResults.flat().map((m) => [m.id, m])).values()
  );

  return Promise.all(
    uniqueResults.map((memory) => memoryToStored(memory, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner))
  );
}

export async function getMemoryByUniqueKeyOp(
  ctx: MemoryStorageOperationsContext,
  namespace: string,
  key: string,
  value: string
): Promise<StoredMemory | null> {
  // Query for both encrypted and plaintext unique keys when encryption is enabled
  // to maintain backwards compatibility with legacy plaintext data
  if (ctx.walletAddress && ctx.signMessage) {
    // Query for encrypted unique key
    const encryptedNamespace = await encryptNamespaceForQuery(namespace, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    const encryptedKey = await encryptKeyForQuery(key, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    const encryptedValue = await encryptValueForQuery(value, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    const encryptedUniqueKey = generateUniqueKey(encryptedNamespace, encryptedKey, encryptedValue);
    
    let results = await ctx.memoriesCollection
      .query(Q.where("unique_key", encryptedUniqueKey), Q.where("is_deleted", false))
      .fetch();

    // If no encrypted match, also check plaintext unique key (legacy data)
    if (results.length === 0) {
      const plaintextUniqueKey = generateUniqueKey(namespace, key, value);
      results = await ctx.memoriesCollection
        .query(Q.where("unique_key", plaintextUniqueKey), Q.where("is_deleted", false))
        .fetch();
    }

    if (results.length === 0) return null;
    return await memoryToStored(results[0], ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
  } else {
    // No encryption - only query plaintext
    const uniqueKey = generateUniqueKey(namespace, key, value);
    const results = await ctx.memoriesCollection
      .query(Q.where("unique_key", uniqueKey), Q.where("is_deleted", false))
      .fetch();

    if (results.length === 0) return null;
    return await memoryToStored(results[0], ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
  }
}

export async function saveMemoryOp(
  ctx: MemoryStorageOperationsContext,
  opts: CreateMemoryOptions
): Promise<StoredMemory> {
  // Encrypt fields before storing if encryption is enabled
  const memoryToStore = ctx.walletAddress && ctx.signMessage
    ? await encryptMemoryFields(opts, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : opts;
  
  const compositeKey = generateCompositeKey(memoryToStore.namespace, memoryToStore.key);
  const uniqueKey = generateUniqueKey(memoryToStore.namespace, memoryToStore.key, memoryToStore.value);

  const result = await ctx.database.write(async () => {
    // Check for existing memory with encrypted unique key
    let existing = await ctx.memoriesCollection
      .query(Q.where("unique_key", uniqueKey))
      .fetch();

    // If encryption enabled and no encrypted match, also check plaintext unique key (legacy data)
    if (existing.length === 0 && ctx.walletAddress && ctx.signMessage) {
      const plaintextUniqueKey = generateUniqueKey(opts.namespace, opts.key, opts.value);
      existing = await ctx.memoriesCollection
        .query(Q.where("unique_key", plaintextUniqueKey))
        .fetch();
    }

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

  return await memoryToStored(result, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
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

  // Convert Memory model to plain object before decryption
  // WatermelonDB decorators define fields as prototype getters, so spread operator
  // doesn't copy them. Extract fields explicitly like memoryToStored does.
  const memoryPlain: StoredMemory = {
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

  // Decrypt existing memory to get plaintext values for merging
  // Pass signMessage so decryption can request key if needed
  const decryptedMemory = (ctx.walletAddress
    ? await decryptMemoryFields(memoryPlain, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
    : memoryPlain) as StoredMemory;

  // Build complete memory with updates merged
  const completeMemory: CreateMemoryOptions = {
    type: updates.type ?? decryptedMemory.type,
    namespace: updates.namespace ?? decryptedMemory.namespace,
    key: updates.key ?? decryptedMemory.key,
    value: updates.value ?? decryptedMemory.value,
    rawEvidence: updates.rawEvidence ?? decryptedMemory.rawEvidence,
    confidence: updates.confidence ?? decryptedMemory.confidence,
    pii: updates.pii ?? decryptedMemory.pii,
    embedding: updates.embedding ?? decryptedMemory.embedding,
    embeddingModel: updates.embeddingModel ?? decryptedMemory.embeddingModel,
  };

  // Encrypt the complete memory if encryption is enabled
  const memoryToStore = ctx.walletAddress && ctx.signMessage
    ? await encryptMemoryFields(completeMemory, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner)
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

  // Compare with encrypted values for embedding preservation check
  // Check if content fields (value, rawEvidence, type, namespace, key) are unchanged
  const contentFieldsUnchanged =
    memory.value === memoryToStore.value &&
    memory.rawEvidence === memoryToStore.rawEvidence &&
    memory.type === memoryToStore.type &&
    memory.namespace === memoryToStore.namespace &&
    memory.key === memoryToStore.key;

  const shouldPreserveEmbedding =
    contentFieldsUnchanged &&
    memory.embedding !== undefined &&
    memory.embedding.length > 0 &&
    updates.embedding === undefined;

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

        if (shouldPreserveEmbedding) {
          // Keep existing embedding when content fields are unchanged
        } else if (updates.embedding !== undefined) {
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

    return { ok: true, memory: await memoryToStored(updated, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner) };
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
  // Query for both encrypted and plaintext unique keys when encryption is enabled
  // to maintain backwards compatibility with legacy plaintext data
  let results: Memory[] = [];
  
  if (ctx.walletAddress && ctx.signMessage) {
    // Query for encrypted unique key
    const encryptedNamespace = await encryptNamespaceForQuery(namespace, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    const encryptedKey = await encryptKeyForQuery(key, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    const encryptedValue = await encryptValueForQuery(value, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    const encryptedUniqueKey = generateUniqueKey(encryptedNamespace, encryptedKey, encryptedValue);
    
    results = await ctx.memoriesCollection
      .query(Q.where("unique_key", encryptedUniqueKey))
      .fetch();

    // If no encrypted match, also check plaintext unique key (legacy data)
    if (results.length === 0) {
      const plaintextUniqueKey = generateUniqueKey(namespace, key, value);
      results = await ctx.memoriesCollection
        .query(Q.where("unique_key", plaintextUniqueKey))
        .fetch();
    }
  } else {
    // No encryption - only query plaintext
    const uniqueKey = generateUniqueKey(namespace, key, value);
    results = await ctx.memoriesCollection
      .query(Q.where("unique_key", uniqueKey))
      .fetch();
  }

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
  // Query for both encrypted and plaintext composite keys when encryption is enabled
  // to maintain backwards compatibility with legacy plaintext data
  const queries = [];
  
  if (ctx.walletAddress && ctx.signMessage) {
    // Query for encrypted composite key
    const encryptedNamespace = await encryptNamespaceForQuery(namespace, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    const encryptedKey = await encryptKeyForQuery(key, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
    const encryptedCompositeKey = generateCompositeKey(encryptedNamespace, encryptedKey);
    queries.push(
      ctx.memoriesCollection
        .query(Q.where("composite_key", encryptedCompositeKey), Q.where("is_deleted", false))
        .fetch()
    );
    // Also query for plaintext composite key (legacy data)
    const plaintextCompositeKey = generateCompositeKey(namespace, key);
    queries.push(
      ctx.memoriesCollection
        .query(Q.where("composite_key", plaintextCompositeKey), Q.where("is_deleted", false))
        .fetch()
    );
  } else {
    // No encryption - only query plaintext
    const compositeKey = generateCompositeKey(namespace, key);
    queries.push(
      ctx.memoriesCollection
        .query(Q.where("composite_key", compositeKey), Q.where("is_deleted", false))
        .fetch()
    );
  }

  const allResults = await Promise.all(queries);
  // Deduplicate by uniqueId (in case same memory exists in both formats)
  const uniqueResults = Array.from(
    new Map(allResults.flat().map((m) => [m.id, m])).values()
  );

  await ctx.database.write(async () => {
    for (const memory of uniqueResults) {
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
      const stored = await memoryToStored(memory, ctx.walletAddress, ctx.signMessage, ctx.embeddedWalletSigner);
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
