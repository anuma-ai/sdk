/**
 * Memory Vault Search Tool
 *
 * Provides a tool for LLMs to search the user's memory vault
 * using semantic similarity over pre-computed embeddings.
 */

import type { ToolConfig } from "../chat/useChat/types";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import { getAllVaultMemoriesOp, updateVaultMemoryEmbeddingOp } from "../db/memoryVault/operations";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { HybridSearchWeights } from "../memoryEngine/hybridSearch";
import { keywordSearch, mergeWithRRF } from "../memoryEngine/hybridSearch";
import type { EmbeddingOptions } from "../memoryEngine/types";

export { createVaultEmbeddingCache, DEFAULT_VAULT_CACHE_SIZE } from "./lruCache";

/**
 * Embedding cache keyed by content string. Stores pre-computed embeddings
 * so that search only needs to embed the query, not the vault entries.
 */
export type VaultEmbeddingCache = Map<string, number[]>;

/**
 * Options for the vault search tool.
 */
export interface MemoryVaultSearchOptions {
  /** Maximum number of results to return (default: 5) */
  limit?: number;
  /** Minimum similarity threshold below which results are discarded (default: 0.1) */
  minSimilarity?: number;
  /** When provided, only search memories with these scopes */
  scopes?: string[];
  /** When provided, only search memories in this folder (null for unfiled) */
  folderId?: string | null;
  /** Weights for semantic vs keyword ranking. Default: 0.85 semantic, 0.15 keyword. */
  hybridWeights?: HybridSearchWeights;
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * An item with a pre-computed embedding, ready for ranking.
 */
interface EmbeddedItem {
  id: string;
  content: string;
  embedding: number[];
}

/**
 * Pure ranking function: scores, filters, and ranks items using hybrid search
 * (cosine similarity + BM25 keyword search merged via RRF). This contains no
 * database or I/O dependencies, making it testable and usable in benchmarks.
 *
 * @param query - The search query text
 * @param queryEmbedding - Pre-computed embedding for the query
 * @param items - Items with pre-computed embeddings to rank
 * @param options - Ranking options (limit, minSimilarity, hybridWeights)
 * @returns Ranked results sorted by hybrid RRF score
 */
export function rankVaultMemories(
  query: string,
  queryEmbedding: number[],
  items: EmbeddedItem[],
  options?: {
    limit?: number;
    minSimilarity?: number;
    hybridWeights?: HybridSearchWeights;
  }
): VaultSearchResult[] {
  const limit = options?.limit ?? 5;
  const minSimilarity = options?.minSimilarity ?? 0.1;

  const scored = items.map((item) => ({
    uniqueId: item.id,
    content: item.content,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  const semanticRanked = scored
    .filter((r) => r.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity);

  const keywordRanked = keywordSearch(query, scored, (r) => r.content);

  return mergeWithRRF(
    semanticRanked,
    keywordRanked,
    (r) => r.uniqueId,
    options?.hybridWeights
  ).slice(0, limit);
}

/**
 * Pre-embed all vault memories that are not yet in the cache.
 * Call this at init time so searches are instant.
 */
export async function preEmbedVaultMemories(
  vaultCtx: VaultMemoryOperationsContext,
  embeddingOptions: EmbeddingOptions,
  cache: VaultEmbeddingCache,
  options?: { scopes?: string[] }
): Promise<void> {
  const memories = await getAllVaultMemoriesOp(vaultCtx, options);
  const uncachedTexts: string[] = [];
  const uncachedKeys: string[] = [];
  const uncachedIds: string[] = [];
  for (const m of memories) {
    const key = m.content;
    if (!cache.has(key)) {
      // Check for persisted embedding in DB first
      if (m.embedding) {
        try {
          const parsed = JSON.parse(m.embedding) as number[];
          cache.set(key, parsed);
          continue;
        } catch {
          // Invalid JSON, re-embed
        }
      }
      uncachedTexts.push(m.content);
      uncachedKeys.push(key);
      uncachedIds.push(m.uniqueId);
    }
  }
  if (uncachedTexts.length > 0) {
    const embeddings = await generateEmbeddings(uncachedTexts, embeddingOptions);
    for (let i = 0; i < uncachedKeys.length; i++) {
      cache.set(uncachedKeys[i], embeddings[i]);
      // Persist embedding to DB (fire-and-forget)
      updateVaultMemoryEmbeddingOp(vaultCtx, uncachedIds[i], JSON.stringify(embeddings[i])).catch(
        () => {}
      );
    }
  }
}

/**
 * Eagerly embed a single piece of content and store it in the cache.
 * Call this when a vault memory is created or updated.
 */
export async function eagerEmbedContent(
  content: string,
  embeddingOptions: EmbeddingOptions,
  cache: VaultEmbeddingCache,
  vaultCtx?: VaultMemoryOperationsContext,
  memoryId?: string
): Promise<void> {
  const embedding = await generateEmbedding(content, embeddingOptions);
  cache.set(content, embedding);
  if (vaultCtx && memoryId) {
    updateVaultMemoryEmbeddingOp(vaultCtx, memoryId, JSON.stringify(embedding)).catch(
      // Silently swallow – SDK must not use console.*; embedding will be retried on next search
      () => {}
    );
  }
}

/**
 * A single vault search result with its similarity score.
 */
export interface VaultSearchResult {
  uniqueId: string;
  content: string;
  similarity: number;
}

/**
 * Internal search that also returns the vault size, avoiding a second vault load.
 */
async function searchVaultMemoriesWithSize(
  query: string,
  vaultCtx: VaultMemoryOperationsContext,
  embeddingOptions: EmbeddingOptions,
  cache: VaultEmbeddingCache,
  searchOptions?: MemoryVaultSearchOptions
): Promise<{ results: VaultSearchResult[]; vaultSize: number }> {
  const limit = searchOptions?.limit ?? 5;
  const minSimilarity = searchOptions?.minSimilarity ?? 0.1;
  const scopes = searchOptions?.scopes;

  if (!query || typeof query !== "string") {
    return { results: [], vaultSize: 0 };
  }

  const folderId = searchOptions?.folderId;

  const queryOpts: { scopes?: string[]; folderId?: string | null } = {};
  if (scopes?.length) queryOpts.scopes = scopes;
  if (folderId !== undefined) queryOpts.folderId = folderId;

  const memories = await getAllVaultMemoriesOp(
    vaultCtx,
    Object.keys(queryOpts).length > 0 ? queryOpts : undefined
  );
  if (memories.length === 0) {
    return { results: [], vaultSize: 0 };
  }

  // Embed the query
  const queryEmbedding = await generateEmbedding(query, embeddingOptions);

  // Batch-embed any vault entries missing from cache (fallback)
  const uncachedTexts: string[] = [];
  const uncachedIndices: number[] = [];
  for (let i = 0; i < memories.length; i++) {
    if (!cache.has(memories[i].content)) {
      // Check for persisted embedding in DB first
      if (memories[i].embedding) {
        try {
          const parsed = JSON.parse(memories[i].embedding!) as number[];
          cache.set(memories[i].content, parsed);
          continue;
        } catch {
          // Invalid JSON, re-embed
        }
      }
      uncachedTexts.push(memories[i].content);
      uncachedIndices.push(i);
    }
  }
  if (uncachedTexts.length > 0) {
    const newEmbeddings = await generateEmbeddings(uncachedTexts, embeddingOptions);
    for (let j = 0; j < uncachedTexts.length; j++) {
      cache.set(memories[uncachedIndices[j]].content, newEmbeddings[j]);
      // Persist embedding to DB (fire-and-forget)
      updateVaultMemoryEmbeddingOp(
        vaultCtx,
        memories[uncachedIndices[j]].uniqueId,
        JSON.stringify(newEmbeddings[j])
      ).catch(
        // Silently swallow – SDK must not use console.*; embedding will be retried on next search
        () => {}
      );
    }
  }

  // Build embedded items for the pure ranking function
  const embeddedItems: EmbeddedItem[] = [];
  for (const m of memories) {
    const embedding = cache.get(m.content);
    if (embedding) {
      embeddedItems.push({ id: m.uniqueId, content: m.content, embedding });
    }
  }

  const results = rankVaultMemories(query, queryEmbedding, embeddedItems, {
    limit,
    minSimilarity,
    hybridWeights: searchOptions?.hybridWeights,
  });

  return { results, vaultSize: memories.length };
}

/**
 * Search vault memories by semantic similarity. Returns structured results
 * sorted by descending similarity, filtered by threshold and limit.
 *
 * This is the standalone search logic extracted from `createMemoryVaultSearchTool`
 * so it can be called programmatically (e.g., for pre-retrieval injection).
 *
 * @returns Sorted results (empty array on invalid input or empty vault)
 */
export async function searchVaultMemories(
  query: string,
  vaultCtx: VaultMemoryOperationsContext,
  embeddingOptions: EmbeddingOptions,
  cache: VaultEmbeddingCache,
  searchOptions?: MemoryVaultSearchOptions
): Promise<VaultSearchResult[]> {
  const { results } = await searchVaultMemoriesWithSize(
    query,
    vaultCtx,
    embeddingOptions,
    cache,
    searchOptions
  );
  return results;
}

/**
 * Creates a memory vault search tool for use with chat completions.
 *
 * The tool allows the LLM to search through vault memories using semantic
 * similarity. Vault entries should have their embeddings pre-computed in the
 * cache (via preEmbedVaultMemories or eagerEmbedContent). Any missing
 * embeddings are computed on the fly as a fallback.
 *
 * @param vaultCtx - Vault operations context for database access
 * @param embeddingOptions - Options for embedding generation (auth, base URL)
 * @param cache - Pre-populated embedding cache
 * @param searchOptions - Optional search configuration
 * @returns A ToolConfig that can be passed to chat completion tools
 */
export function createMemoryVaultSearchTool(
  vaultCtx: VaultMemoryOperationsContext,
  embeddingOptions: EmbeddingOptions,
  cache: VaultEmbeddingCache,
  searchOptions?: MemoryVaultSearchOptions
): ToolConfig {
  const limit = searchOptions?.limit ?? 5;
  const minSimilarity = searchOptions?.minSimilarity ?? 0.1;

  return {
    type: "function",
    function: {
      name: "memory_vault_search",
      description:
        "Search the user's memory vault for stored facts and preferences using semantic similarity. " +
        "Use this before saving a new vault memory to check for duplicates, and whenever the user's " +
        "question might relate to something previously stored (their name, preferences, important facts). " +
        "Returns matching entries with their IDs for reference or updates.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language search query to match against vault memories.",
          },
          limit: {
            type: "integer",
            description: `Maximum number of results to return. Default: ${limit}.`,
          },
          folder_id: {
            type: ["string", "null"],
            description:
              "Optional folder ID to scope the search to a specific folder. " +
              "Pass null to search only unfiled memories. " +
              "Omit to search all folders.",
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<string> => {
      const query = args.query as string;
      const requestLimit = (args.limit as number) ?? limit;
      const argFolderId = args.folder_id as string | null | undefined;

      if (!query || typeof query !== "string") {
        return "Error: A search query is required.";
      }

      try {
        const { results, vaultSize } = await searchVaultMemoriesWithSize(
          query,
          vaultCtx,
          embeddingOptions,
          cache,
          {
            ...searchOptions,
            limit: requestLimit,
            minSimilarity,
            // Only use LLM's folder_id when the host app hasn't set one
            ...(searchOptions?.folderId === undefined &&
              argFolderId !== undefined && { folderId: argFolderId }),
          }
        );

        if (vaultSize === 0) {
          // Distinguish between a truly empty vault and an empty folder-scoped query
          const hasFolderFilter =
            searchOptions?.folderId !== undefined || argFolderId !== undefined;
          if (hasFolderFilter) {
            return "No memories found in this folder.";
          }
          return "The memory vault is empty. No memories have been saved yet.";
        }

        if (results.length === 0) {
          return "No relevant memories found in the vault.";
        }

        const formatted = results
          .map(
            (r, i) =>
              `[${i + 1}] (id: ${r.uniqueId}, similarity: ${r.similarity.toFixed(2)})\n${r.content}`
          )
          .join("\n\n");

        return `Found ${results.length} vault memories:\n\n${formatted}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error searching vault: ${message}`;
      }
    },
  };
}
