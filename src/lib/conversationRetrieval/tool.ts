/**
 * Conversation Retrieval Tool
 *
 * Provides a tool for LLMs to search through past conversation messages
 * using semantic similarity.
 */

import type { ToolConfig } from "../chat/useChat/types";
import type { StorageOperationsContext } from "../db/chat/operations";
import { searchMessagesOp } from "../db/chat/operations";
import type { EmbeddingOptions, ConversationRetrievalSearchOptions } from "./types";
import { generateEmbedding } from "./embeddings";

/**
 * Default search options
 */
const DEFAULT_SEARCH_OPTIONS: Required<ConversationRetrievalSearchOptions> = {
  limit: 10,
  minSimilarity: 0.3,
  includeAssistant: true,
  conversationId: undefined as unknown as string,
};

/**
 * Format search results for LLM consumption
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
    return "No relevant past conversations found.";
  }

  const formatted = results.map((r, i) => {
    const date = r.createdAt.toISOString().split("T")[0];
    return `[${i + 1}] (${r.role}, ${date}, similarity: ${r.similarity.toFixed(2)})\n${r.content}`;
  });

  return `Found ${results.length} relevant past messages:\n\n${formatted.join("\n\n---\n\n")}`;
}

/**
 * Creates a conversation retrieval tool for use with chat completions.
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
 * const tool = createConversationRetrievalTool(
 *   storageCtx,
 *   { apiKey: process.env.PORTAL_API_KEY },
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
export function createConversationRetrievalTool(
  storageCtx: StorageOperationsContext,
  embeddingOptions: EmbeddingOptions,
  searchOptions?: Partial<ConversationRetrievalSearchOptions>
): ToolConfig {
  const defaultOpts = { ...DEFAULT_SEARCH_OPTIONS, ...searchOptions };

  return {
    type: "function",
    function: {
      name: "search_past_conversations",
      description:
        "Search through past conversation messages to find relevant context. " +
        "Use this tool when you need to recall information from previous conversations, " +
        "such as user preferences, past discussions, or previously mentioned facts. " +
        "The search uses semantic similarity, so phrase your query naturally.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The search query describing what information you're looking for. " +
              "Can be a question or keywords related to the topic.",
          },
          limit: {
            type: "number",
            description: `Maximum number of results to return. Default: ${defaultOpts.limit}`,
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<string> => {
      const query = args.query as string;
      const limit = (args.limit as number) ?? defaultOpts.limit;

      if (!query || typeof query !== "string") {
        return "Error: A search query is required.";
      }

      try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query, embeddingOptions);

        // Search for similar messages
        const results = await searchMessagesOp(storageCtx, queryEmbedding, {
          limit,
          minSimilarity: defaultOpts.minSimilarity,
          conversationId: defaultOpts.conversationId,
        });

        // Filter by role if needed
        const filteredResults = defaultOpts.includeAssistant
          ? results
          : results.filter((r) => r.role === "user");

        // Format results for LLM
        return formatSearchResults(
          filteredResults.map((r) => ({
            content: r.content,
            role: r.role,
            conversationId: r.conversationId,
            similarity: r.similarity,
            createdAt: r.createdAt,
          }))
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error searching conversations: ${message}`;
      }
    },
    autoExecute: true,
  };
}
