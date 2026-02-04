/**
 * Memory Retrieval Tool
 *
 * Provides a tool for LLMs to search through past conversation messages
 * using semantic similarity.
 */

import type { ToolConfig } from "../chat/useChat/types";
import type { StorageOperationsContext } from "../db/chat/operations";
import { searchChunksOp } from "../db/chat/operations";
import type { EmbeddingOptions, MemoryRetrievalSearchOptions } from "./types";
import { generateEmbedding } from "./embeddings";

/**
 * Default search options
 */
const DEFAULT_SEARCH_OPTIONS: Required<MemoryRetrievalSearchOptions> = {
  limit: 8,
  topK: 8,
  minSimilarity: 0.3,
  includeAssistant: false,
  conversationId: undefined as unknown as string,
  excludeConversationId: undefined as unknown as string,
  startDate: undefined as unknown as string,
  endDate: undefined as unknown as string,
};

/**
 * Format search results for LLM consumption
 * Results are sorted chronologically with timestamps
 */
function formatSearchResults(
  results: Array<{
    content: string;
    role: string;
    conversationId: string;
    similarity: number;
    createdAt: Date;
  }>
): string {
  if (results.length === 0) {
    return "No relevant past conversation chunks found.";
  }

  // Sort chronologically (oldest first)
  const sortedResults = [...results].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  const formatted = sortedResults.map((r, i) => {
    const date = r.createdAt.toISOString().replace("T", " ").slice(0, 16);
    return `[${i + 1}] (${r.role}, ${date}, similarity: ${r.similarity.toFixed(2)})\n${r.content}`;
  });

  return `Found ${results.length} relevant past conversation chunks:\n\n${formatted.join("\n\n---\n\n")}`;
}

/**
 * Creates a memory retrieval tool for use with chat completions.
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
 * const tool = createMemoryRetrievalTool(
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
export function createMemoryRetrievalTool(
  storageCtx: StorageOperationsContext,
  embeddingOptions: EmbeddingOptions,
  searchOptions?: Partial<MemoryRetrievalSearchOptions>
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
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<string> => {
      const query = args.query as string;
      const topK = (args.top_k as number) ?? defaultOpts.topK;
      const includeAssistant =
        (args.include_assistant as boolean) ?? defaultOpts.includeAssistant;
      // Date filters are currently disabled but parsed for future use
      // const startDate = args.start_date as string | undefined;
      // const endDate = args.end_date as string | undefined;

      if (!query || typeof query !== "string") {
        return "Error: A search query is required.";
      }

      try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query, embeddingOptions);

        // Search through message chunks for better precision
        const results = await searchChunksOp(storageCtx, queryEmbedding, {
          limit: topK,
          minSimilarity: defaultOpts.minSimilarity,
          conversationId: defaultOpts.conversationId,
        });

        // DEBUG: Log filtering info
        console.log("[MEMORY_TOOL] excludeConversationId:", defaultOpts.excludeConversationId);
        console.log("[MEMORY_TOOL] results count:", results.length);
        console.log("[MEMORY_TOOL] results conversationIds:", results.map(r => r.message.conversationId));

        // Filter out excluded conversation (e.g., current conversation)
        let filteredResults = defaultOpts.excludeConversationId
          ? results.filter(
              (r) => r.message.conversationId !== defaultOpts.excludeConversationId
            )
          : results;

        console.log("[MEMORY_TOOL] filteredResults count:", filteredResults.length);

        // Filter by role if needed
        filteredResults = includeAssistant
          ? filteredResults
          : filteredResults.filter((r) => r.message.role === "user");

        // Format results for LLM - use chunk text, not full message
        return formatSearchResults(
          filteredResults.map((r) => ({
            content: r.chunkText,
            role: r.message.role,
            conversationId: r.message.conversationId,
            similarity: r.similarity,
            createdAt: r.message.createdAt,
          }))
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error searching conversation chunks: ${message}`;
      }
    },
    autoExecute: true,
  };
}
