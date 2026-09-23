/**
 * `memory_vault_search` chat tool — the executor half of the vault search.
 *
 * Split out of `searchTool.ts` to break the `recall` <-> `searchTool` import
 * cycle: `recall()` statically imports the vault search from `searchTool.ts`,
 * and this executor routes through `recall()`. While both lived in one module
 * the executor reached recall through a dynamic `import()`, and the cycle it
 * papered over is what surfaced as the order-dependent
 * `Cannot access 'nowMs' before initialization` flake. With the executor here,
 * the graph is a straight line: executor -> recall -> searchTool.
 *
 * `searchTool.ts` must NOT import (or re-export) from this module, or the
 * cycle comes back. The public name is re-exported from the barrel
 * (`./index.ts`), which is the path every entry point already uses.
 */

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

/**
 * The `useFusion: false` variant. That path ranks through `rankVaultMemories`,
 * which is cosine-ONLY — it doesn't even read the query text — so an embeddings
 * outage leaves no lane running at all.
 *
 * Telling the model to "retry with different keywords" there would be worse than
 * unhelpful: it invites retries this path cannot honor, and each one comes back
 * equally empty for a reason the model can't see.
 */
const EMBEDDINGS_DEGRADED_EMPTY_NO_LEXICAL =
  "Memory search is temporarily unavailable — the semantic lookup failed and this " +
  "search mode has no keyword fallback, so no memory search ran at all. Do not " +
  "conclude the user has no such memory; say the memory lookup was unavailable.";

/** Numbered "[N] (id: …, similarity: …)\n<content>" rendering shared by the
 * chat-tool's recall-delegated and useFusion:false branches. */
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

  // Ranking tuning knobs forwarded verbatim to recall() (fusion path) and
  // searchVaultMemories (legacy cosine path). Only defined fields are
  // forwarded so the downstream defaults stay authoritative.
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
      // LLM-supplied limit: clamp to [1, RECALL_MAX_LIMIT], same rule as the
      // recall_memory tool. Unclamped, `limit: 5000` dumped the whole vault into
      // the model's context past every dump guard, and `limit: 0` sliced the
      // results to nothing and reported "No relevant memories" on a hit.
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
        // Route through the unified recall() API so the chat tool, the
        // SDK's programmatic surface, and any future consumer all share
        // one ranking pipeline. 719/B4: LLM rewrite (when opted in via
        // the deprecated `decompose: "llm"` flag) runs HERE in the tool
        // executor, then passes pre-built `subQueries` into LLM-free recall.
        const wantsDecompose =
          searchOptions?.decompose === "llm" && !!searchOptions.decomposeOptions;
        const budget: "low" | "mid" | "high" = wantsDecompose
          ? "high"
          : searchOptions?.rerank
            ? "mid"
            : "low";
        // Host's configured folder wins — the LLM can't escape a host-
        // imposed scope. When the host has *not* set a folder, the LLM's
        // explicit folder_id (including `null` for unfiled) is used.
        const folderId = searchOptions?.folderId ?? argFolderId;

        // useFusion:false callers want cosine-only — skip recall's fusion.
        if (searchOptions?.useFusion === false) {
          // ...WithSize rather than searchVaultMemories: the wrapper discards
          // `embeddingsUnavailable`, which decides the empty-result wording below.
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

        // Tool-layer decompose (719/B4). Failure degrades to specific-mode
        // (no subQueries) — same contract as the old in-search path.
        let subQueries: string[] | undefined;
        if (wantsDecompose && searchOptions?.decomposeOptions) {
          const decomp = await decomposeQuery(query, searchOptions.decomposeOptions);
          if (decomp.mode === "composite" && decomp.subQueries.length >= 2) {
            subQueries = decomp.subQueries;
          }
        }

        // Read the degradation off the diagnostics seam rather than widening
        // RecallResult: it is the channel that already exists for exactly this.
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

        // Surface whatever ranker score the pipeline produced (fused
        // under useFusion=true, raw cosine when useFusion=false). The
        // LLM sees a single "similarity" number on the same scale the
        // legacy tool returned — the underlying metric just changes
        // with the active ranking mode.
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
