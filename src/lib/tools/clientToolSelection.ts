/**
 * Client-tool selection — the per-turn semantic filter over a client-tool
 * catalog.
 *
 * Extracted out of `../../react/useChatStorage` (a `"use client"` React +
 * WatermelonDB file) so the identical selection can run anywhere the engine
 * runs: the standalone council path that bypasses the hook, Node unit tests,
 * and the node/RN-safe `@anuma/sdk/tools/selection` subpath. The hook re-imports
 * these — behavior is unchanged from when they lived inline.
 *
 * Dependency-safe by construction: `generateEmbeddings` comes from the db-free
 * `../memoryEngine/generate` core and `RECALL_TOOL_NAME` from the
 * dependency-free `../memory/recallConstants`, so nothing here drags in the
 * WatermelonDB data layer.
 */

import type { LlmapiChatCompletionTool } from "../../client";
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
  // Gate on genuine activation (from the client-tool selection) so a set's
  // persona rides in only when the set actually activated — not on a borderline
  // anchor kept in the selection by recall-over-precision. Falls back to anchor
  // presence when activation info isn't available (e.g. an explicit host filter).
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
): Promise<{ tools: LlmapiChatCompletionTool[]; activatedSetNames?: ReadonlySet<string> }> {
  // Memory tools are always included — only filter connector tools
  // (Notion, Google). Matches both the legacy memory_vault_* surface and
  // the unified recall_memory tool from createRecallTool. The
  // memory_engine_* prefix is intentionally NOT matched — it is not an
  // owned SDK namespace and would let any third-party tool bypass the
  // similarity filter by name alone.
  const isMemoryTool = (t: LlmapiChatCompletionTool) => {
    const name = getToolName(t);
    return name.startsWith("memory_vault_") || name === RECALL_TOOL_NAME;
  };
  const alwaysInclude = clientTools.filter(isMemoryTool);
  const filterCandidates = clientTools.filter((t) => !isMemoryTool(t));

  // Nothing to filter (e.g. a memory-tools-only catalog): pass everything
  // through. Distinct from the no-embeddings case below.
  if (filterCandidates.length === 0) {
    return { tools: clientTools, activatedSetNames: new Set() };
  }

  // No embeddings because generation FAILED (not the length gate): degrade
  // to the full catalog, the pre-gate behavior — the model stays fully
  // functional through a transient embeddings outage, just without semantic
  // trimming. Empty activation set: no set genuinely activated, no persona.
  if (!promptEmbeddings && noEmbeddingsReason === "error") {
    return { tools: clientTools, activatedSetNames: new Set() };
  }

  // No embeddings — a prompt below MIN_CONTENT_LENGTH_FOR_TOOLS like "hey".
  // Send NO tools: a sub-5-char prompt can't express a tool-shaped request,
  // and the previous behavior (pass ALL tools through unfiltered) paid full
  // tool-definition tokens on every "ok"/"thx". The one exception is sticky
  // tool sets from conversation state: a terse confirmation ("yes", "fix")
  // inside an app/slide conversation must keep that toolkit (plus the memory
  // tools that accompany every tool-carrying request), or the model cannot
  // act on what was just discussed. Those sets count as genuinely activated
  // (forced), so their persona rides in — same as the semantic path treats
  // `activeToolSets`.
  if (!promptEmbeddings) {
    if (activeToolSets.length === 0) {
      return { tools: [], activatedSetNames: new Set() };
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
    };
  }

  // Generate embeddings for tool descriptions that aren't cached yet
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
      // Embedding generation failed — skip filtering, send all tools. No
      // semantic selection ran, so no set activated (empty, not undefined —
      // see the guard above) and no tool-set persona should be injected.
      return { tools: clientTools, activatedSetNames: new Set() };
    }
  }

  // Build pseudo-ServerTool objects with cached embeddings for findMatchingTools
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
    // See CLIENT_TOOLS_RELEVANCE_RATIO: 0.75 admits the second intent of a
    // multi-intent prompt (which lands ~75-80% of the dominant match), while
    // still trimming the loose tail. The earlier 0.9 made a second intent
    // structurally unselectable; the anchorMinSimilarity gates (0.53-0.55)
    // remain the guard against borderline anchors activating a whole set.
    relevanceRatio: CLIENT_TOOLS_RELEVANCE_RATIO,
  });

  const matchedNames = new Set(matches.map((m) => m.tool.name));
  // Build the score map from raw similarities (no relevance / limit /
  // ambiguity cuts) so anchor activation in expandToolSetsAdditive sees
  // anchors that scored above anchorMinSimilarity even when a dominant
  // non-anchor pushed them below the 0.9 relevance cutoff above.
  const scores = scoreTools(promptEmbeddings, pseudoServerTools);
  const availableNames = new Set(filterCandidates.map(getToolName));

  // Apply tool sets additively: if an anchor matches OR a set is marked
  // active by the consumer, add set members alongside the original matches.
  // Recall over precision — a few extra tool defs in the request are cheap;
  // missing a tool the model needs (e.g. display_chart for a dashboard prompt)
  // is what we can't afford.
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
  // Which sets genuinely activated (anchor cleared anchorMinSimilarity, or
  // forced active). This drives toolSetSystemPrompts so a set's persona (e.g.
  // APP_BUILDER_PROMPT) rides in only on real activation — not on a borderline
  // anchor that expandToolSetsAdditive kept in the selection for recall.
  const activatedSetNames = activatedToolSetNames(scores, toolSets, activeSetNames);

  // If nothing semantically matched AND no active sets pulled anything in,
  // return only always-included tools (e.g. memory).
  if (finalNames.size === 0) {
    return { tools: alwaysInclude, activatedSetNames };
  }

  const filtered = filterCandidates.filter((t) => {
    const name = getToolName(t);
    return name && finalNames.has(name);
  });
  return { tools: [...alwaysInclude, ...filtered], activatedSetNames };
}
