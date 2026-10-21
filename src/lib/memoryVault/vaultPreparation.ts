import {
  getAllVaultMemoriesOp,
  updateVaultMemoryEmbeddingOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants";
import { generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";

type VaultCorpusCache = WeakMap<
  VaultMemoryOperationsContext,
  Map<string, Promise<StoredVaultMemory[]>>
>;
type RowRequests = Map<EmbeddingOptions["maskInput"], Map<string, Promise<number[]>>>;

export interface VaultPreparation {
  corpora: VaultCorpusCache;
  rows: WeakMap<VaultMemoryOperationsContext, RowRequests>;
}

export function createVaultPreparation(): VaultPreparation {
  return { corpora: new WeakMap(), rows: new WeakMap() };
}

const pendingRows = new WeakMap<VaultMemoryOperationsContext, RowRequests>();

export function loadVaultCorpus(
  ctx: VaultMemoryOperationsContext,
  options?: Parameters<typeof getAllVaultMemoriesOp>[1],
  preparation?: VaultPreparation
): Promise<StoredVaultMemory[]> {
  if (!preparation) return getAllVaultMemoriesOp(ctx, options);
  const corpusCache = preparation.corpora;
  let pending = corpusCache.get(ctx);
  if (!pending) {
    pending = new Map();
    corpusCache.set(ctx, pending);
  }
  const key = JSON.stringify(options ?? {});
  let request = pending.get(key);
  if (!request) {
    const entries = pending;
    request = getAllVaultMemoriesOp(ctx, options).catch((error) => {
      entries.delete(key);
      throw error;
    });
    pending.set(key, request);
  }
  return request;
}

function rowRequestsFor(
  registry: WeakMap<VaultMemoryOperationsContext, RowRequests>,
  ctx: VaultMemoryOperationsContext,
  maskInput: EmbeddingOptions["maskInput"]
): Map<string, Promise<number[]>> {
  let byMask = registry.get(ctx);
  if (!byMask) {
    byMask = new Map();
    registry.set(ctx, byMask);
  }
  let requests = byMask.get(maskInput);
  if (!requests) {
    requests = new Map();
    byMask.set(maskInput, requests);
  }
  return requests;
}

export function embedVaultRows(
  ctx: VaultMemoryOperationsContext,
  options: EmbeddingOptions,
  rows: StoredVaultMemory[],
  preparation?: VaultPreparation
): Promise<number[][]> {
  const pending = rowRequestsFor(pendingRows, ctx, options.maskInput);
  const prepared = preparation && rowRequestsFor(preparation.rows, ctx, options.maskInput);
  const model = options.model ?? DEFAULT_API_EMBEDDING_MODEL;
  const keys = rows.map((row) =>
    JSON.stringify([
      row.uniqueId,
      row.updatedAt?.getTime(),
      row.content,
      model,
      options.baseUrl,
      options.timeoutMs,
      options.tokenTimeoutMs,
      options.totalTimeoutMs,
    ])
  );
  const missing = new Map<string, StoredVaultMemory>();
  rows.forEach((row, index) => {
    if (!pending.has(keys[index]) && !prepared?.has(keys[index])) missing.set(keys[index], row);
  });
  if (missing.size > 0) {
    const entries = pending;
    const batch = Promise.resolve().then(() =>
      generateEmbeddings(
        [...missing.values()].map((row) => row.content),
        options
      )
    );
    [...missing].forEach(([key, row], index) => {
      const request = batch
        .then((vectors) => {
          const vector = vectors[index];
          updateVaultMemoryEmbeddingOp(ctx, row.uniqueId, JSON.stringify(vector), model, {
            content: row.content,
            updatedAt: row.updatedAt?.getTime(),
          }).catch(() => {});
          return vector;
        })
        .finally(() => {
          entries.delete(key);
          if (entries.size === 0) pendingRows.get(ctx)?.delete(options.maskInput);
        });
      pending.set(key, request);
    });
  }
  return Promise.all(
    keys.map((key) => {
      const cached = prepared?.get(key);
      if (cached) return cached;
      const request = pending.get(key)!;
      if (!prepared) return request;
      const retained = request.catch((error) => {
        prepared.delete(key);
        throw error;
      });
      prepared.set(key, retained);
      return retained;
    })
  );
}
