/**
 * Memory Vault Search Tool
 *
 * Provides a tool for LLMs to search the user's memory vault
 * using semantic similarity over pre-computed embeddings.
 */

import type { ToolConfig } from "../chat/useChat/types";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import { getAllVaultMemoriesOp, updateVaultMemoryEmbeddingOp } from "../db/memoryVault/operations";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";

function resolveModel(options: EmbeddingOptions): string {
  return options.model ?? DEFAULT_API_EMBEDDING_MODEL;
}

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
  /** Last update timestamp — used for supersession detection. */
  updatedAt?: Date;
}

/**
 * Minimum pairwise cosine similarity between two memories for the older
 * one to be considered superseded by the newer one.
 */
const SUPERSESSION_SIMILARITY_THRESHOLD = 0.6;

/**
 * Minimum time gap (in milliseconds) between two memories for supersession
 * to apply. Memories created close together are likely complementary, not
 * superseding. Default: 30 days.
 */
const SUPERSESSION_MIN_AGE_GAP_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * How much of the score gap to transfer from the older memory to the newer
 * one. At 1.0 this is equivalent to a full swap; at 0.0 no adjustment
 * happens. A value around 0.5–0.8 boosts the newer memory while keeping
 * the older one in contention for recall.
 */
const SUPERSESSION_BOOST_FACTOR = 0.8;

/**
 * Supersession adjustment for a single pair. Returns the score delta to
 * add to the newer item (and subtract from the older item).
 */
function supersessionDelta(olderScore: number, newerScore: number): number {
  const gap = olderScore - newerScore;
  return gap * SUPERSESSION_BOOST_FACTOR;
}

/**
 * Find supersession pairs among scored candidates. When two items have
 * pairwise embedding similarity above the threshold and the older one
 * outranks the newer one, they form a supersession pair whose scores
 * should be adjusted via boost/penalty.
 *
 * Candidate pairs are scored by confidence (pairwise similarity * time gap
 * weight) and assigned greedily highest-confidence-first so that the
 * strongest supersession signals aren't blocked by weaker pairs that
 * happen to iterate first.
 *
 * Returns an array of [oldId, newId] pairs to adjust.
 */
function findSupersessionPairs(
  candidates: Array<{ id: string; embedding: number[]; updatedAt?: Date; similarity: number }>
): Array<[string, string]> {
  // Collect all valid pairs with confidence scores
  const allPairs: Array<{ oldId: string; newId: string; confidence: number }> = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      if (!a.updatedAt || !b.updatedAt) continue;

      const sim = cosineSimilarity(a.embedding, b.embedding);
      if (sim < SUPERSESSION_SIMILARITY_THRESHOLD) continue;

      const gap = Math.abs(a.updatedAt.getTime() - b.updatedAt.getTime());
      if (gap < SUPERSESSION_MIN_AGE_GAP_MS) continue;

      const [older, newer] = a.updatedAt < b.updatedAt ? [a, b] : [b, a];
      if (older.similarity <= newer.similarity) continue;

      // Higher pairwise similarity + larger time gap = more confident supersession
      const gapDays = gap / (24 * 60 * 60 * 1000);
      const confidence = sim * Math.min(gapDays / 30, 3);
      allPairs.push({ oldId: older.id, newId: newer.id, confidence });
    }
  }

  // Greedy assignment: highest confidence first, each ID used at most once
  allPairs.sort((a, b) => b.confidence - a.confidence);
  const claimed = new Set<string>();
  const result: Array<[string, string]> = [];
  for (const pair of allPairs) {
    if (claimed.has(pair.oldId) || claimed.has(pair.newId)) continue;
    result.push([pair.oldId, pair.newId]);
    claimed.add(pair.oldId);
    claimed.add(pair.newId);
  }
  return result;
}

/**
 * Pure ranking function: scores, filters, and ranks items using cosine
 * similarity with supersession detection. When items include `updatedAt`
 * timestamps, pairs of highly similar items are checked for supersession —
 * a fraction of the score gap is transferred from the older item to the
 * newer one, boosting the replacement without fully evicting the original.
 *
 * @param queryEmbedding - Pre-computed embedding for the query
 * @param items - Items with pre-computed embeddings to rank
 * @param options - Ranking options (limit, minSimilarity)
 * @returns Ranked results sorted by descending similarity
 */
export function rankVaultMemories(
  _query: string,
  queryEmbedding: number[],
  items: EmbeddedItem[],
  options?: {
    limit?: number;
    minSimilarity?: number;
  }
): VaultSearchResult[] {
  const limit = options?.limit ?? 5;
  const minSimilarity = options?.minSimilarity ?? 0.1;

  const scored = items.map((item) => ({
    uniqueId: item.id,
    content: item.content,
    embedding: item.embedding,
    updatedAt: item.updatedAt,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  const filtered = scored.filter((r) => r.similarity >= minSimilarity);
  filtered.sort((a, b) => b.similarity - a.similarity);

  // Check top candidates for supersession — boost newer items and penalize
  // older ones when they are highly similar and the older one outranks
  const window = filtered.slice(0, limit * 3);
  const pairs = findSupersessionPairs(
    window.map((r) => ({
      id: r.uniqueId,
      embedding: r.embedding,
      updatedAt: r.updatedAt,
      similarity: r.similarity,
    }))
  );

  if (pairs.length > 0) {
    const scoreMap = new Map(filtered.map((r) => [r.uniqueId, r.similarity]));
    const itemMap = new Map(filtered.map((r) => [r.uniqueId, r]));
    for (const [oldId, newId] of pairs) {
      const oldScore = scoreMap.get(oldId)!;
      const newScore = scoreMap.get(newId)!;
      const delta = supersessionDelta(oldScore, newScore);
      const oldItem = itemMap.get(oldId);
      const newItem = itemMap.get(newId);
      if (oldItem && newItem) {
        oldItem.similarity = oldScore - delta;
        newItem.similarity = newScore + delta;
        scoreMap.set(oldId, oldItem.similarity);
        scoreMap.set(newId, newItem.similarity);
      }
    }
    filtered.sort((a, b) => b.similarity - a.similarity);
  }

  return filtered.slice(0, limit).map((r) => ({
    uniqueId: r.uniqueId,
    content: r.content,
    similarity: r.similarity,
  }));
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
  const currentModel = resolveModel(embeddingOptions);
  for (const m of memories) {
    const key = m.content;
    if (!cache.has(key)) {
      // Check for persisted embedding in DB first, but only if it was
      // generated by the same model — vectors from different models are
      // incompatible and must be re-generated. A null embeddingModel
      // means the embedding was provided externally; trust it as-is.
      if (m.embedding && (m.embeddingModel === currentModel || m.embeddingModel === null)) {
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
      updateVaultMemoryEmbeddingOp(
        vaultCtx,
        uncachedIds[i],
        JSON.stringify(embeddings[i]),
        currentModel
      ).catch(() => {});
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
    const model = resolveModel(embeddingOptions);
    updateVaultMemoryEmbeddingOp(vaultCtx, memoryId, JSON.stringify(embedding), model).catch(
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
  const currentModel = resolveModel(embeddingOptions);
  const uncachedTexts: string[] = [];
  const uncachedIndices: number[] = [];
  for (let i = 0; i < memories.length; i++) {
    if (!cache.has(memories[i].content)) {
      // Check for persisted embedding in DB first, but only if same model
      // (null embeddingModel means externally provided — trust it)
      if (memories[i].embedding && (memories[i].embeddingModel === currentModel || memories[i].embeddingModel === null)) {
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
        JSON.stringify(newEmbeddings[j]),
        currentModel
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
      embeddedItems.push({ id: m.uniqueId, content: m.content, embedding, updatedAt: m.updatedAt });
    }
  }

  const results = rankVaultMemories(query, queryEmbedding, embeddedItems, {
    limit,
    minSimilarity,
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
