/**
 * Council tool resolution (issue #702, Phase 6).
 *
 * The council path bypasses the per-mode chat switch: each worker sees the full
 * semantic server-tool filter and its OWN per-worker memory tools (built from
 * that worker's model so a private-capable model sees `['private','shared']`
 * and a standard model sees `['shared']` only). The aggregation ("unify")
 * worker must never persist — its `memory_vault_save` is dropped.
 *
 * This module composes each worker's client-tool candidate array and runs it
 * through the SAME `autoFilterClientTools` the chat hook uses, so council and
 * chat share one selection. Building this on the exported selector is what lets
 * mobile council gain per-worker memory tools without re-implementing anything.
 *
 * Pure and node/RN-safe.
 */

import type { LlmapiChatCompletionTool } from "../../../client";
import type { ToolConfig } from "../../chat/useChat/types";
import { autoFilterClientTools } from "../clientToolSelection";
import type { ToolSet } from "../serverTools";
import type { ServerToolsFilter, ToolIntentDescriptor, ToolPlanSpec } from "./intents";
import { resolvePlan, type ResolvePlanContext } from "./plan";
import { MEMORY_SAVE_TOOL_NAME } from "./sendPolicy";

/**
 * Resolve the council/aggregation server-tool plan. This is the chat resolver's
 * council-lane path: a semantic server-tool filter, no per-mode client toolkit,
 * and (for aggregation) a coerced-save strip. Per-worker client tools are added
 * separately via {@link selectCouncilClientTools}.
 */
export function resolveCouncilPlan(
  descriptor: ToolIntentDescriptor,
  ctx: ResolvePlanContext
): ToolPlanSpec {
  const lane = descriptor.lane === "aggregation" ? "aggregation" : "council";
  return resolvePlan({ ...descriptor, lane }, ctx);
}

/** The council/aggregation server-tools filter (a semantic filter, from the catalog). */
export function resolveCouncilServerTools(
  descriptor: ToolIntentDescriptor,
  ctx: ResolvePlanContext
): ServerToolsFilter {
  return resolveCouncilPlan(descriptor, ctx).serverTools;
}

/** Inputs to compose one council worker's client-tool candidate array. */
export interface CouncilClientToolsInput<TTool extends LlmapiChatCompletionTool = ToolConfig> {
  /**
   * Memory tools built from THIS worker's model (via the host's per-model
   * memory-tool factory). Empty for workers that carry no memory tools.
   */
  memoryTools: TTool[];
  /** Model-agnostic shared client tools for council (connectors, saved). */
  sharedTools?: TTool[];
  /**
   * Whether this worker may persist memories. `false` for the aggregation /
   * unify worker — its `memory_vault_save` is dropped.
   */
  canPersistMemory: boolean;
}

/**
 * Compose a council worker's client-tool candidate array: per-worker memory
 * tools first, then the shared tools, with `memory_vault_save` removed when the
 * worker may not persist (aggregation).
 */
export function composeCouncilClientTools<TTool extends LlmapiChatCompletionTool = ToolConfig>(
  input: CouncilClientToolsInput<TTool>
): TTool[] {
  const memory = input.canPersistMemory
    ? input.memoryTools
    : input.memoryTools.filter((t) => {
        const fn = (t as { function?: { name?: string } }).function;
        const name = fn?.name ?? (t as { name?: string }).name ?? "";
        return name !== MEMORY_SAVE_TOOL_NAME;
      });
  return [...memory, ...(input.sharedTools ?? [])];
}

/** Options forwarded to the shared `autoFilterClientTools` selection. */
export interface CouncilClientSelectionOptions {
  promptEmbeddings: number[] | number[][] | null;
  cache: Map<string, number[]>;
  embeddingOptions: {
    getToken?: () => Promise<string | null>;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  extraToolSets?: ToolSet[];
  activeToolSets?: string[];
  noEmbeddingsReason?: "short-prompt" | "error";
}

/**
 * Select a council worker's client tools by composing its candidate array and
 * running the SAME semantic filter the chat hook runs. Returns the filtered
 * tools plus which tool sets genuinely activated (for persona injection).
 */
export async function selectCouncilClientTools<TTool extends LlmapiChatCompletionTool = ToolConfig>(
  input: CouncilClientToolsInput<TTool>,
  options: CouncilClientSelectionOptions
): Promise<{ tools: LlmapiChatCompletionTool[]; activatedSetNames?: ReadonlySet<string> }> {
  const candidates = composeCouncilClientTools(input);
  return autoFilterClientTools(
    candidates,
    options.promptEmbeddings,
    options.cache,
    options.embeddingOptions,
    options.extraToolSets ?? [],
    options.activeToolSets ?? [],
    options.noEmbeddingsReason ?? "short-prompt"
  );
}
