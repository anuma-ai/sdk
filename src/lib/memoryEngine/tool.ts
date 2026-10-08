import type { ToolConfig } from "../chat/useChat/types";
import type { StorageOperationsContext } from "../db/chat/operations";
import { getMessagesOp, searchChunksOp } from "../db/chat/operations";
import { DEFAULT_API_EMBEDDING_MODEL } from "./constants";
import { generateEmbedding } from "./embeddings";
import type { EmbeddingOptions, MemoryEngineSearchOptions } from "./types";

const DEFAULT_SEARCH_OPTIONS: Required<MemoryEngineSearchOptions> = {
  limit: 8,
  topK: 8,
  minSimilarity: 0.3,
  includeAssistant: false,
  conversationId: undefined as unknown as string,
  excludeConversationId: undefined as unknown as string,
  sortBy: "similarity",
  contextMessages: undefined as unknown as number,
};

function formatSessionResults(
  sessions: Array<{
    conversationId: string;
    bestSimilarity: number;
    earliestDate: Date;
    messages: Array<{ role: string; content: string; createdAt: Date }>;
  }>,
  sortBy: "similarity" | "chronological" = "similarity"
): string {
  if (sessions.length === 0) {
    return "No relevant past conversations found.";
  }

  const sorted = [...sessions].sort((a, b) => {
    if (sortBy === "chronological") {
      return a.earliestDate.getTime() - b.earliestDate.getTime();
    }
    return b.bestSimilarity - a.bestSimilarity;
  });

  const sections = sorted.map((session) => {
    const sessionDate = session.earliestDate.toISOString().replace("T", " ").slice(0, 16);
    const lines = session.messages.map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      return `${role}: ${m.content}`;
    });
    return `=== Conversation from ${sessionDate} (relevance: ${session.bestSimilarity.toFixed(2)}) ===\n\n${lines.join("\n\n")}`;
  });

  return `Found ${sessions.length} relevant past conversations:\n\n${sections.join("\n\n---\n\n")}`;
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
  searchOptions?: Partial<MemoryEngineSearchOptions>,
  callbacks?: {
    /** Called after retrieval with the conversation IDs that were actually returned to the LLM. */
    onRetrieve?: (conversationIds: string[]) => void;
  }
): ToolConfig {
  const defaultOpts = { ...DEFAULT_SEARCH_OPTIONS, ...searchOptions };

  return {
    type: "function",
    function: {
      name: "search_memory",
      description:
        "Search past conversations to find relevant context from previous discussions. " +
        "Returns full conversations that match the query, not just fragments. " +
        "Use this tool when you need to recall information from previous conversations, " +
        "such as user preferences, past discussions, or previously mentioned facts. " +
        "The search uses semantic similarity, so phrase your query naturally.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language query to match against past conversations.",
          },
          include_assistant: {
            type: "boolean",
            description: `Include assistant messages in results. Default: ${defaultOpts.includeAssistant}`,
          },
          top_k: {
            type: "integer",
            description: `Max number of matching chunks used to identify relevant conversations. Default: ${defaultOpts.topK}`,
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

      if (!query || typeof query !== "string") {
        return "Error: A search query is required.";
      }

      try {
        const queryEmbedding = await generateEmbedding(query, embeddingOptions);

        const fetchMultiplier =
          3 * (includeAssistant ? 1 : 2) * (defaultOpts.excludeConversationId ? 1.5 : 1);
        const fetchLimit = Math.ceil(topK * fetchMultiplier);

        const results = await searchChunksOp(storageCtx, queryEmbedding, {
          limit: fetchLimit,
          minSimilarity: defaultOpts.minSimilarity,
          conversationId: defaultOpts.conversationId,
          embeddingModel: embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL,
        });

        let filteredResults = defaultOpts.excludeConversationId
          ? results.filter((r) => r.message.conversationId !== defaultOpts.excludeConversationId)
          : results;

        filteredResults = includeAssistant
          ? filteredResults
          : filteredResults.filter((r) => r.message.role === "user");

        const convBuckets = new Map<string, typeof filteredResults>();
        for (const r of filteredResults) {
          const convId = r.message.conversationId;
          const bucket = convBuckets.get(convId);
          if (bucket) {
            bucket.push(r);
          } else {
            convBuckets.set(convId, [r]);
          }
        }

        const dedupedResults: typeof filteredResults = [];
        const bucketArrays = Array.from(convBuckets.values());
        let round = 0;
        while (dedupedResults.length < topK) {
          let added = false;
          for (const bucket of bucketArrays) {
            if (round < bucket.length) {
              dedupedResults.push(bucket[round]);
              added = true;
              if (dedupedResults.length >= topK) break;
            }
          }
          if (!added) break;
          round++;
        }

        const convMeta = new Map<string, { bestSimilarity: number; matchedMsgIds: Set<string> }>();
        for (const r of dedupedResults) {
          const convId = r.message.conversationId;
          const existing = convMeta.get(convId);
          if (existing) {
            if (r.similarity > existing.bestSimilarity) existing.bestSimilarity = r.similarity;
            existing.matchedMsgIds.add(r.message.uniqueId);
          } else {
            convMeta.set(convId, {
              bestSimilarity: r.similarity,
              matchedMsgIds: new Set([r.message.uniqueId]),
            });
          }
        }

        const contextWindow = defaultOpts.contextMessages;

        const convEntries = Array.from(convMeta.entries());
        const allConvMessages = await Promise.all(
          convEntries.map(([convId]) => getMessagesOp(storageCtx, convId))
        );

        const sessionResults: Array<{
          conversationId: string;
          bestSimilarity: number;
          earliestDate: Date;
          messages: Array<{ role: string; content: string; createdAt: Date }>;
        }> = [];

        for (let idx = 0; idx < convEntries.length; idx++) {
          const [convId, meta] = convEntries[idx];
          const allMessages = allConvMessages[idx];

          let selected: typeof allMessages;

          if (contextWindow === undefined || contextWindow === null) {
            selected = allMessages;
          } else if (contextWindow === 0) {
            selected = allMessages.filter((m) => meta.matchedMsgIds.has(m.uniqueId));
          } else {
            const includeIndices = new Set<number>();
            for (let i = 0; i < allMessages.length; i++) {
              if (meta.matchedMsgIds.has(allMessages[i].uniqueId)) {
                const start = Math.max(0, i - contextWindow);
                const end = Math.min(allMessages.length - 1, i + contextWindow);
                for (let j = start; j <= end; j++) {
                  includeIndices.add(j);
                }
              }
            }
            selected = allMessages.filter((_, i) => includeIndices.has(i));
          }

          const filtered = selected.filter(
            (m) => m.role === "user" || (includeAssistant && m.role === "assistant")
          );
          if (filtered.length === 0) continue;

          sessionResults.push({
            conversationId: convId,
            bestSimilarity: meta.bestSimilarity,
            earliestDate: filtered[0].createdAt,
            messages: filtered.map((m) => ({
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
            })),
          });
        }

        callbacks?.onRetrieve?.(sessionResults.map((s) => s.conversationId));

        return formatSessionResults(sessionResults, sortBy);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error searching conversations: ${message}`;
      }
    },
    removeAfterExecution: true,
  };
}
