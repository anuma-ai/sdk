import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";

import { Memory } from "./models";
import {
  type StoredMemory,
  type StoredMemoryWithSimilarity,
  type CreateMemoryOptions,
  type UpdateMemoryOptions,
  type UpdateMemoryResult,
  cosineSimilarity,
} from "./types";
import { encryptMemoryText, decryptMemoryText } from "./encryption";
import type {
  SignMessageFn,
  EmbeddedWalletSignerFn,
} from "../../../react/useEncryption";

export async function memoryToStored(
  memory: Memory,
  walletAddress?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredMemory> {
  let text = memory.text;

  // Decrypt text field if wallet address provided
  if (walletAddress) {
    try {
      text = await decryptMemoryText(memory.text, walletAddress);
    } catch {
      // If decryption fails, use the raw text (might be plaintext)
    }
  }

  return {
    id: memory.id,
    text,
    conversationId: memory.conversationId,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    embedding: memory.embedding,
    embeddingModel: memory.embeddingModel,
    isDeleted: memory.isDeleted,
  };
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
    results.map((memory) =>
      memoryToStored(
        memory,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      )
    )
  );
}

export async function getMemoryByIdOp(
  ctx: MemoryStorageOperationsContext,
  id: string
): Promise<StoredMemory | null> {
  try {
    const memory = await ctx.memoriesCollection.find(id);
    if (memory.isDeleted) return null;
    return await memoryToStored(
      memory,
      ctx.walletAddress,
      ctx.signMessage,
      ctx.embeddedWalletSigner
    );
  } catch {
    return null;
  }
}

export async function saveMemoryOp(
  ctx: MemoryStorageOperationsContext,
  opts: CreateMemoryOptions
): Promise<StoredMemory> {
  // Encrypt text field if encryption is enabled
  let textToStore = opts.text;
  if (ctx.walletAddress && ctx.signMessage) {
    try {
      textToStore = await encryptMemoryText(
        opts.text,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
    } catch {
      // If encryption fails, store plaintext
    }
  }

  const result = await ctx.database.write(async () => {
    return await ctx.memoriesCollection.create((mem) => {
      mem._setRaw("text", textToStore);
      mem._setRaw("conversation_id", opts.conversationId || null);
      mem._setRaw("is_deleted", false);

      if (opts.embedding) {
        mem._setRaw("embedding", JSON.stringify(opts.embedding));
        if (opts.embeddingModel) {
          mem._setRaw("embedding_model", opts.embeddingModel);
        }
      }
    });
  });

  return await memoryToStored(
    result,
    ctx.walletAddress,
    ctx.signMessage,
    ctx.embeddedWalletSigner
  );
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

  // Encrypt text if provided and encryption is enabled
  let textToStore = updates.text;
  if (textToStore && ctx.walletAddress && ctx.signMessage) {
    try {
      textToStore = await encryptMemoryText(
        textToStore,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
    } catch {
      // If encryption fails, store plaintext
    }
  }

  try {
    const updated = await ctx.database.write(async () => {
      await memory.update((mem) => {
        if (textToStore !== undefined) {
          mem._setRaw("text", textToStore);
        }
        if (updates.conversationId !== undefined) {
          mem._setRaw("conversation_id", updates.conversationId || null);
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

    return {
      ok: true,
      memory: await memoryToStored(
        updated,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      ),
    };
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
      const stored = await memoryToStored(
        memory,
        ctx.walletAddress,
        ctx.signMessage,
        ctx.embeddedWalletSigner
      );
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
