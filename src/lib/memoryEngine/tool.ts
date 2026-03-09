/**
 * Memory Engine Tool
 *
 * Provides a tool for LLMs to search through past conversation messages
 * using semantic similarity.
 */

import type { ToolConfig } from "../chat/useChat/types";
import type { StorageOperationsContext } from "../db/chat/operations";
import { searchChunksOp } from "../db/chat/operations";
import { generateEmbedding } from "./embeddings";
import type { EmbeddingOptions, MemoryEngineSearchOptions } from "./types";

/**
 * Default search options
 */
const DEFAULT_SEARCH_OPTIONS: Required<MemoryEngineSearchOptions> = {
  limit: 8,
  topK: 8,
  minSimilarity: 0.3,
  includeAssistant: false,
  conversationId: undefined as unknown as string,
  excludeConversationId: undefined as unknown as string,
  startDate: undefined as unknown as string,
  endDate: undefined as unknown as string,
  sortBy: "similarity",
};

/**
 * Format search results for LLM consumption, grouped by conversation session.
 */
function formatSearchResults(
  results: Array<{
    content: string;
    role: string;
    conversationId: string;
    similarity: number;
    createdAt: Date;
  }>,
  sortBy: "similarity" | "chronological" = "similarity"
): string {
  if (results.length === 0) {
    return "No relevant past conversation chunks found.";
  }

  // Group results by conversation session
  const groups = new Map<
    string,
    { chunks: typeof results; earliestDate: Date; bestSimilarity: number }
  >();

  for (const r of results) {
    const group = groups.get(r.conversationId);
    if (group) {
      group.chunks.push(r);
      if (r.createdAt < group.earliestDate) group.earliestDate = r.createdAt;
      if (r.similarity > group.bestSimilarity) group.bestSimilarity = r.similarity;
    } else {
      groups.set(r.conversationId, {
        chunks: [r],
        earliestDate: r.createdAt,
        bestSimilarity: r.similarity,
      });
    }
  }

  // Sort groups
  const sortedGroups = [...groups.values()].sort((a, b) => {
    if (sortBy === "chronological") {
      return a.earliestDate.getTime() - b.earliestDate.getTime();
    }
    return b.bestSimilarity - a.bestSimilarity;
  });

  // Format each group
  let chunkIndex = 1;
  const sections = sortedGroups.map((group) => {
    // Sort chunks within a group chronologically for readability
    const sorted = [...group.chunks].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const sessionDate = group.earliestDate.toISOString().replace("T", " ").slice(0, 16);

    const lines = sorted.map((r) => {
      const date = r.createdAt.toISOString().replace("T", " ").slice(0, 16);
      return `[${chunkIndex++}] (${r.role}, ${date}, similarity: ${r.similarity.toFixed(2)})\n${r.content}`;
    });

    return `=== Session from ${sessionDate} ===\n\n${lines.join("\n\n")}`;
  });

  return `Found ${results.length} relevant chunks across ${groups.size} sessions:\n\n${sections.join("\n\n---\n\n")}`;
}

/**
 * Creates a memory engine tool for use with chat completions.
 *
 * The tool allows the LLM to search through past conversation messages
 * using semantic similarity. Messages must have embeddings stored to be searchable.
 *
 * @param storageCtx - Storage operations context for database access
 * @param embeddingOptions - Options for embedding generation
 * @param searchOptions - Default search options (can be overridden per-call)
 * @returns A ToolConfig that can be passed to chat completion tools
 *
 * @example
 * ```ts
 * const tool = createMemoryEngineTool(
 *   storageCtx,
 *   { getToken: () => getIdentityToken() },
 *   { limit: 5, minSimilarity: 0.4 }
 * );
 *
 * // Use with chat completion
 * const result = await sendMessage({
 *   messages: [...],
 *   tools: [tool],
 * });
 * ```
 */
export function createMemoryEngineTool(
  storageCtx: StorageOperationsContext,
  embeddingOptions: EmbeddingOptions,
  searchOptions?: Partial<MemoryEngineSearchOptions>
): ToolConfig {
  const defaultOpts = { ...DEFAULT_SEARCH_OPTIONS, ...searchOptions };

  return {
    type: "function",
    function: {
      name: "search_memory",
      description:
        "Search past conversation chunks to find relevant context from previous discussions. " +
        "Use this tool when you need to recall information from previous conversations, " +
        "such as user preferences, past discussions, or previously mentioned facts. " +
        "The search uses semantic similarity, so phrase your query naturally.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "User question to match against past chunks.",
          },
          include_assistant: {
            type: "boolean",
            description: `Include assistant message chunks. Default: ${defaultOpts.includeAssistant}`,
          },
          top_k: {
            type: "integer",
            description: `Number of chunks to return. Default: ${defaultOpts.topK}`,
          },
          start_date: {
            type: "string",
            description: "Inclusive start date/time (currently disabled).",
          },
          end_date: {
            type: "string",
            description: "Inclusive end date/time (currently disabled).",
          },
          sort_by: {
            type: "string",
            enum: ["similarity", "chronological"],
            description: `Sort order: "similarity" (most relevant first) or "chronological" (oldest first). Default: ${defaultOpts.sortBy}`,
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<string> => {
      const query = args.query as string;
      const topK = (args.top_k as number) ?? defaultOpts.topK;
      const includeAssistant = (args.include_assistant as boolean) ?? defaultOpts.includeAssistant;
      const sortBy = (args.sort_by as "similarity" | "chronological") ?? defaultOpts.sortBy;
      // Date filters are currently disabled but parsed for future use
      // const startDate = args.start_date as string | undefined;
      // const endDate = args.end_date as string | undefined;

      if (!query || typeof query !== "string") {
        return "Error: A search query is required.";
      }

      try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query, embeddingOptions);

        // Calculate fetch multiplier to account for post-filtering
        // Fetch more results when filtering by role or excluding conversations
        const fetchMultiplier =
          (includeAssistant ? 1 : 2) * (defaultOpts.excludeConversationId ? 1.5 : 1);
        const fetchLimit = Math.ceil(topK * fetchMultiplier);

        // Search through message chunks for better precision
        const results = await searchChunksOp(storageCtx, queryEmbedding, {
          limit: fetchLimit,
          minSimilarity: defaultOpts.minSimilarity,
          conversationId: defaultOpts.conversationId,
        });

        // Filter out excluded conversation (e.g., current conversation)
        let filteredResults = defaultOpts.excludeConversationId
          ? results.filter((r) => r.message.conversationId !== defaultOpts.excludeConversationId)
          : results;

        // Filter by role if needed
        filteredResults = includeAssistant
          ? filteredResults
          : filteredResults.filter((r) => r.message.role === "user");

        // Limit to requested topK after filtering
        filteredResults = filteredResults.slice(0, topK);

        // Format results for LLM - use chunk text, not full message
        return formatSearchResults(
          filteredResults.map((r) => ({
            content: r.chunkText,
            role: r.message.role,
            conversationId: r.message.conversationId,
            similarity: r.similarity,
            createdAt: r.message.createdAt,
          })),
          sortBy
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error searching conversation chunks: ${message}`;
      }
    },
    autoExecute: true,
    removeAfterExecution: true,
  };
}
