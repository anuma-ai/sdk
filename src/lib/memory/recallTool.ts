/**
 * Unified Recall Tool
 *
 * Single chat-completion tool that searches both vault facts and
 * conversation chunks via `recall()`. Replaces the legacy pair of
 * `memory_vault_search` (facts) + `search_memory` (chunks) — the LLM no
 * longer has to route between two tools.
 */

import type { ToolConfig } from "../chat/useChat/types.js";
import { recall } from "./recall.js";
import type { Budget, MemoryKind, RankedMemory, RecallContext, RecallOptions } from "./types.js";

/** Tool name surfaced to the LLM. Exported so bench harnesses and chat
 * clients reference the same string — drift between prod and bench would
 * mask tool-routing bugs in eval. */
export const RECALL_TOOL_NAME = "recall_memory";
/** Maximum results the executor will return to the LLM, regardless of
 * the LLM-supplied `limit`. */
export const RECALL_MAX_LIMIT = 50;

const DEFAULT_LIMIT = 8;
const DEFAULT_BUDGET: Budget = "low";

export interface RecallToolOptions {
  /** Lanes to search. Default: ["fact", "chunk"]. */
  types?: MemoryKind[];
  /** Max items returned to the LLM. Default: 8. */
  limit?: number;
  /** Retrieval depth. Default: "low". */
  budget?: Budget;
  /** Min score threshold. Defaults to recall()'s per-lane defaults. */
  minScore?: number;
  /** Vault scope filter. */
  scopes?: string[];
  /** Vault folder filter. */
  folderId?: string | null;
  /** Exclude one conversation from chunk results (typically the active one). */
  excludeConversationId?: string;
  /** LLM-decompose options; only used at budget="high". */
  decomposeOptions?: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  };
}

export interface RecallToolCallbacks {
  /** Called with the conversation IDs returned via the chunk lane. */
  onChunksRetrieved?: (conversationIds: string[]) => void;
  /** Called with the fact IDs returned via the fact lane. */
  onFactsRetrieved?: (factIds: string[]) => void;
}

function formatRecallResult(memories: RankedMemory[]): string {
  if (memories.length === 0) {
    return "No relevant memories found.";
  }

  const lines = memories.map((m, i) => {
    const score = (m.scoreBreakdown?.fused ?? m.scoreBreakdown?.cosine ?? m.score).toFixed(2);
    if (m.kind === "fact") {
      return `[${i + 1}] fact (id: ${m.id}, score: ${score})\n${m.content}`;
    }
    const date = m.createdAt.toISOString().slice(0, 10);
    const who = m.role === "assistant" ? "assistant" : "user";
    return `[${i + 1}] conversation excerpt (${who}, ${date}, score: ${score})\n${m.content}`;
  });

  return `Found ${memories.length} relevant memories:\n\n${lines.join("\n\n")}`;
}

/**
 * Creates the unified recall tool. Routes through `recall()` so vault
 * facts and conversation chunks are fused into a single ranked list via
 * RRF.
 */
export function createRecallTool(
  ctx: RecallContext,
  toolOptions?: RecallToolOptions,
  callbacks?: RecallToolCallbacks
): ToolConfig {
  const defaultTypes: MemoryKind[] = toolOptions?.types ?? ["fact", "chunk"];
  const defaultLimit = toolOptions?.limit ?? DEFAULT_LIMIT;
  const defaultBudget = toolOptions?.budget ?? DEFAULT_BUDGET;

  return {
    type: "function",
    function: {
      name: RECALL_TOOL_NAME,
      description:
        "Search the user's memory across stored facts/preferences and past conversation excerpts. " +
        "Returns a unified ranked list — facts carry an `id` you can reference; conversation excerpts " +
        "carry a date and role. Use this whenever the user's question may relate to anything previously " +
        "discussed or saved (preferences, prior decisions, past topics). Phrase the query naturally.",
      arguments: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language search query.",
          },
          limit: {
            type: "integer",
            description: `Max number of results. Default: ${defaultLimit}.`,
          },
        },
        required: ["query"],
      },
    },
    executor: async (args: Record<string, unknown>): Promise<string> => {
      // Throw (not return) on invalid args so the tool-loop treats it as
      // "invalid args, retry" rather than as a successful tool result —
      // returning a string answer leaks the error back into the model's
      // visible context, where it gets paraphrased to the user.
      if (typeof args.query !== "string" || args.query.length === 0) {
        throw new Error("recall_memory: `query` is required and must be a non-empty string.");
      }
      const query = args.query;

      // LLM-supplied limit: tolerate string / number / missing; clamp to
      // [1, RECALL_MAX_LIMIT] so a hallucinated 0 / negative / huge value
      // doesn't blow up downstream sorts or starve the executor.
      const rawLimit =
        typeof args.limit === "number"
          ? args.limit
          : typeof args.limit === "string"
            ? parseInt(args.limit, 10)
            : NaN;
      const requestLimit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(Math.floor(rawLimit), 1), RECALL_MAX_LIMIT)
        : defaultLimit;

      try {
        const recallOpts: RecallOptions = {
          types: defaultTypes,
          limit: requestLimit,
          budget: defaultBudget,
          ...(toolOptions?.minScore !== undefined && { minScore: toolOptions.minScore }),
          ...(toolOptions?.scopes && { scopes: toolOptions.scopes }),
          ...(toolOptions?.folderId !== undefined && { folderId: toolOptions.folderId }),
          ...(toolOptions?.excludeConversationId && {
            excludeConversationId: toolOptions.excludeConversationId,
          }),
          ...(toolOptions?.decomposeOptions && {
            decomposeOptions: toolOptions.decomposeOptions,
          }),
        };

        const result = await recall(query, ctx, recallOpts);

        if (callbacks?.onChunksRetrieved) {
          const convIds = Array.from(
            new Set(
              result.memories
                .filter((m) => m.kind === "chunk" && m.conversationId)
                .map((m) => m.conversationId as string)
            )
          );
          if (convIds.length > 0) callbacks.onChunksRetrieved(convIds);
        }
        if (callbacks?.onFactsRetrieved) {
          const factIds = result.memories.filter((m) => m.kind === "fact").map((m) => m.id);
          if (factIds.length > 0) callbacks.onFactsRetrieved(factIds);
        }

        return formatRecallResult(result.memories);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Error searching memory: ${message}`;
      }
    },
  };
}
