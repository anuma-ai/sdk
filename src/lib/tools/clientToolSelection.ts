import type { LlmapiChatCompletionTool } from "../../client";
import { CONFIRM_TOOL_NAME } from "../../tools/confirmConstants";
import { RECALL_TOOL_NAME } from "../memory/recallConstants";
import { generateEmbeddings } from "../memoryEngine/generate";
import {
  activatedToolSetNames,
  BUILT_IN_TOOL_SETS,
  CLIENT_TOOLS_MIN_SIMILARITY,
  CLIENT_TOOLS_RELEVANCE_RATIO,
  expandToolSetsAdditive,
  findMatchingTools,
  MAX_CLIENT_TOOLS_AFTER_FILTER,
  scoreTools,
  type ServerTool,
  type ToolSet,
  toolSetSystemPrompts,
} from "./serverTools";

/** Typed accessor for client tool name (handles function-call style and flat). */
export function getToolName(t: LlmapiChatCompletionTool): string {
  const fn = t.function as Record<string, unknown> | undefined;
  return (fn?.name as string) || (t.name as string) || "";
}

/** Typed accessor for client tool description. */
export function getToolDescription(t: LlmapiChatCompletionTool): string {
  const fn = t.function as Record<string, unknown> | undefined;
  return (fn?.description as string) || (t.description as string) || getToolName(t);
}

/**
 * Build the tool-set guidance to inject for a request: the `systemPrompt` of
 * every tool set whose tools ended up selected (e.g. the App Builder prompt
 * when app-gen tools are pulled in — by an explicit force-include OR an
 * implicit semantic match). Returned as one string for useChat's `toolGuidance`
 * channel, which adds it as a separate system message (additive — composes with
 * the persona, doesn't replace it). `undefined` when no selected set carries a
 * prompt, so non-app turns are unaffected.
 */
export function computeToolGuidance(
  selectedServerTools: ServerTool[],
  selectedClientTools: LlmapiChatCompletionTool[] | undefined,
  extraToolSets: ToolSet[],
  activatedSetNames?: ReadonlySet<string>
): string | undefined {
  const names = [
    ...selectedServerTools.map((t) => t.name),
    ...(selectedClientTools ?? []).map(getToolName),
  ].filter(Boolean);
  const toolSets =
    extraToolSets.length > 0 ? [...BUILT_IN_TOOL_SETS, ...extraToolSets] : BUILT_IN_TOOL_SETS;
  const prompts = toolSetSystemPrompts(names, toolSets, activatedSetNames);
  return prompts.length > 0 ? prompts.join("\n\n") : undefined;
}

/**
 * Automatically filter client tools using embedding-based semantic matching.
 * Generates embeddings for tool descriptions (cached), then selects the most
 * relevant tools for the user's prompt. This prevents sending 20+ tool
 * definitions that eat up the context window.
 *
 * @returns Filtered client tools, or the original array if filtering fails/skips.
 *   `activatedSetNames` is every set that activated, forced ones included.
 *   `matchedSetNames` is only the sets whose anchors cleared their floor on THIS
 *   prompt, ignoring `activeToolSets`; it is empty whenever no scoring ran.
 */
export async function autoFilterClientTools(
  clientTools: LlmapiChatCompletionTool[],
  promptEmbeddings: number[] | number[][] | null,
  cache: Map<string, number[]>,
  embeddingOptions: {
    getToken?: () => Promise<string | null>;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  },
  extraToolSets: ToolSet[] = [],
  activeToolSets: string[] = [],
  /**
   * Why `promptEmbeddings` is null. "short-prompt" (the length gate —
   * deliberate) sends NO tools; "error" (embedding generation failed —
   * transient) degrades to the FULL catalog so an embeddings outage never
   * strips every tool from every request.
   */
  noEmbeddingsReason: "short-prompt" | "error" = "short-prompt"
): Promise<{
  tools: LlmapiChatCompletionTool[];
  activatedSetNames?: ReadonlySet<string>;
  matchedSetNames: ReadonlySet<string>;
}> {
  const isAlwaysIncluded = (t: LlmapiChatCompletionTool) => {
    const name = getToolName(t);
    return (
      name.startsWith("memory_vault_") || name === RECALL_TOOL_NAME || name === CONFIRM_TOOL_NAME
    );
  };
  const alwaysInclude = clientTools.filter(isAlwaysIncluded);
  const filterCandidates = clientTools.filter((t) => !isAlwaysIncluded(t));

  if (filterCandidates.length === 0) {
    return { tools: clientTools, activatedSetNames: new Set(), matchedSetNames: new Set() };
  }

  if (!promptEmbeddings && noEmbeddingsReason === "error") {
    return { tools: clientTools, activatedSetNames: new Set(), matchedSetNames: new Set() };
  }

  if (!promptEmbeddings) {
    if (activeToolSets.length === 0) {
      return { tools: [], activatedSetNames: new Set(), matchedSetNames: new Set() };
    }
    const allSets =
      extraToolSets.length > 0 ? [...BUILT_IN_TOOL_SETS, ...extraToolSets] : BUILT_IN_TOOL_SETS;
    const activeSets = allSets.filter((s) => activeToolSets.includes(s.name));
    const stickyMembers = new Set(activeSets.flatMap((s) => s.members));
    return {
      tools: [
        ...alwaysInclude,
        ...filterCandidates.filter((t) => stickyMembers.has(getToolName(t))),
      ],
      activatedSetNames: new Set(activeSets.map((s) => s.name)),
      matchedSetNames: new Set(),
    };
  }

  const toolsNeedingEmbeddings: { name: string; description: string }[] = [];
  for (const t of filterCandidates) {
    const name = getToolName(t);
    if (name && !cache.has(name)) {
      toolsNeedingEmbeddings.push({ name, description: getToolDescription(t) });
    }
  }

  if (toolsNeedingEmbeddings.length > 0) {
    try {
      const descriptions = toolsNeedingEmbeddings.map((t) => t.description);
      const embeddings = await generateEmbeddings(descriptions, embeddingOptions);
      for (let i = 0; i < toolsNeedingEmbeddings.length; i++) {
        cache.set(toolsNeedingEmbeddings[i].name, embeddings[i]);
      }
    } catch {
      return { tools: clientTools, activatedSetNames: new Set(), matchedSetNames: new Set() };
    }
  }

  const pseudoServerTools: ServerTool[] = [];
  for (const t of filterCandidates) {
    const name = getToolName(t);
    const embedding = cache.get(name);
    if (!embedding) continue;
    const fn = t.function as Record<string, unknown> | undefined;
    const params = (fn?.parameters ||
      fn?.arguments || {
        type: "object",
        properties: {},
        required: [],
      }) as ServerTool["parameters"];
    pseudoServerTools.push({
      type: "function",
      name,
      description: getToolDescription(t),
      parameters: params,
      embedding,
    });
  }

  const matches = findMatchingTools(promptEmbeddings, pseudoServerTools, {
    limit: MAX_CLIENT_TOOLS_AFTER_FILTER,
    minSimilarity: CLIENT_TOOLS_MIN_SIMILARITY,
    filterAmbiguous: true,
    relevanceRatio: CLIENT_TOOLS_RELEVANCE_RATIO,
  });

  const matchedNames = new Set(matches.map((m) => m.tool.name));
  const scores = scoreTools(promptEmbeddings, pseudoServerTools);
  const availableNames = new Set(filterCandidates.map(getToolName));

  const toolSets =
    extraToolSets.length > 0 ? [...BUILT_IN_TOOL_SETS, ...extraToolSets] : BUILT_IN_TOOL_SETS;
  const activeSetNames = activeToolSets.length > 0 ? new Set(activeToolSets) : undefined;
  const finalNames = expandToolSetsAdditive(
    matchedNames,
    availableNames,
    scores,
    toolSets,
    activeSetNames
  );
  const activatedSetNames = activatedToolSetNames(scores, toolSets, activeSetNames);
  const matchedSetNames = activatedToolSetNames(scores, toolSets);

  if (finalNames.size === 0) {
    return { tools: alwaysInclude, activatedSetNames, matchedSetNames };
  }

  const filtered = filterCandidates.filter((t) => {
    const name = getToolName(t);
    return name && finalNames.has(name);
  });
  return { tools: [...alwaysInclude, ...filtered], activatedSetNames, matchedSetNames };
}
