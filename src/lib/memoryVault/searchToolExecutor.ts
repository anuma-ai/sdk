import type { ToolConfig } from "../chat/useChat/types";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import { recall } from "../memory/recall";
import { EMBEDDINGS_DEGRADED_EMPTY, RECALL_MAX_LIMIT } from "../memory/recallConstants";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { decomposeQuery } from "./decomposeQuery";
import {
  type MemoryVaultSearchOptions,
  searchVaultMemoriesWithSize,
  type VaultEmbeddingCache,
} from "./searchTool";

const EMBEDDINGS_DEGRADED_EMPTY_NO_LEXICAL =
  "Memory search is temporarily unavailable — the semantic lookup failed and this " +
  "search mode has no keyword fallback, so no memory search ran at all. Do not " +
  "conclude the user has no such memory; say the memory lookup was unavailable.";

function formatVaultHits(hits: Array<{ id: string; content: string; score: number }>): string {
  return hits
    .map((h, i) => `[${i + 1}] (id: ${h.id}, similarity: ${h.score.toFixed(2)})\n${h.content}`)
    .join("\n\n");
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

  const tuningForward = {
    ...(searchOptions?.rerankTopN !== undefined && { rerankTopN: searchOptions.rerankTopN }),
    ...(searchOptions?.ceWeight !== undefined && { ceWeight: searchOptions.ceWeight }),
    ...(searchOptions?.rerankLoadTimeoutMs !== undefined && {
      rerankLoadTimeoutMs: searchOptions.rerankLoadTimeoutMs,
    }),
    ...(searchOptions?.recencyAlpha !== undefined && { recencyAlpha: searchOptions.recencyAlpha }),
    ...(searchOptions?.recency && { recency: searchOptions.recency }),
    ...(searchOptions?.mmr !== undefined && { mmr: searchOptions.mmr }),
    ...(searchOptions?.supersessionBoost !== undefined && {
      supersessionBoost: searchOptions.supersessionBoost,
    }),
    ...(searchOptions?.supersessionWindow !== undefined && {
      supersessionWindow: searchOptions.supersessionWindow,
    }),
    ...(searchOptions?.proofCountAlpha !== undefined && {
      proofCountAlpha: searchOptions.proofCountAlpha,
    }),
    ...(searchOptions?.bm25AdmissionDivisor !== undefined && {
      bm25AdmissionDivisor: searchOptions.bm25AdmissionDivisor,
    }),
    ...(searchOptions?.rrfK !== undefined && { rrfK: searchOptions.rrfK }),
  };

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
            description: `Maximum number of results to return (1-${RECALL_MAX_LIMIT}). Default: ${limit}.`,
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
      const rawLimit =
        typeof args.limit === "number"
          ? args.limit
          : typeof args.limit === "string"
            ? parseInt(args.limit, 10)
            : NaN;
      const requestLimit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(Math.floor(rawLimit), 1), RECALL_MAX_LIMIT)
        : limit;
      const argFolderId = args.folder_id as string | null | undefined;

      if (!query || typeof query !== "string") {
        return "Error: A search query is required.";
      }

      try {
        const wantsDecompose =
          searchOptions?.decompose === "llm" && !!searchOptions.decomposeOptions;
        const budget: "low" | "mid" | "high" = wantsDecompose
          ? "high"
          : searchOptions?.rerank
            ? "mid"
            : "low";
        const folderId = searchOptions?.folderId ?? argFolderId;

        if (searchOptions?.useFusion === false) {
          const { results: legacy, embeddingsUnavailable } = await searchVaultMemoriesWithSize(
            query,
            vaultCtx,
            embeddingOptions,
            cache,
            {
              limit: requestLimit,
              minSimilarity,
              useFusion: false,
              ...tuningForward,
              ...(folderId !== undefined && { folderId }),
              ...(searchOptions?.scopes && { scopes: searchOptions.scopes }),
            }
          );
          if (legacy.length === 0) {
            return embeddingsUnavailable
              ? EMBEDDINGS_DEGRADED_EMPTY_NO_LEXICAL
              : "No relevant memories found in the vault.";
          }
          return formatVaultHits(
            legacy.map((r) => ({ id: r.uniqueId, content: r.content, score: r.similarity }))
          );
        }

        let subQueries: string[] | undefined;
        if (wantsDecompose && searchOptions?.decomposeOptions) {
          const decomp = await decomposeQuery(query, searchOptions.decomposeOptions);
          if (decomp.mode === "composite" && decomp.subQueries.length >= 2) {
            subQueries = decomp.subQueries;
          }
        }

        let recallDegraded: readonly string[] = [];
        const result = await recall(
          query,
          { vaultCtx, embeddingOptions, vaultCache: cache },
          {
            onDiagnostics: (d) => {
              recallDegraded = d.degraded;
            },
            types: ["fact"],
            limit: requestLimit,
            minScore: minSimilarity,
            budget,
            ...tuningForward,
            ...(folderId !== undefined && { folderId }),
            ...(searchOptions?.scopes && { scopes: searchOptions.scopes }),
            ...(subQueries && { subQueries }),
          }
        );

        if (result.vaultSize === 0) {
          const hasFolderFilter =
            searchOptions?.folderId !== undefined || argFolderId !== undefined;
          if (hasFolderFilter) {
            return "No memories found in this folder.";
          }
          return "The memory vault is empty. No memories have been saved yet.";
        }

        if (result.memories.length === 0) {
          return recallDegraded.includes("embeddings-unavailable")
            ? EMBEDDINGS_DEGRADED_EMPTY
            : "No relevant memories found in the vault.";
        }

        const formatted = formatVaultHits(
          result.memories.map((m) => ({
            id: m.id,
            content: m.content,
            score: m.scoreBreakdown?.fused ?? m.scoreBreakdown?.cosine ?? m.score,
          }))
        );
        return `Found ${result.memories.length} vault memories:\n\n${formatted}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error searching vault: ${message}`;
      }
    },
  };
}
