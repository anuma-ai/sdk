import {
  type AssembledToolsFilterFn,
  type ClientFactoryKey,
  type ClientToolsFilterMode,
  CREATION_INTENT_CLIENT_FACTORIES,
  CREATION_INTENT_CLIENT_FILTER,
  CREATION_INTENT_TOOL_SET,
  type PostFilterKey,
  type ServerToolCatalog,
  type ServerToolsFilter,
  type ThinkingModeHint,
  type ToolIntentDescriptor,
  type ToolPlanSpec,
} from "./intents";
import { getMaxToolRounds, getThinkingMode, resolveToolChoice } from "./sendPolicy";
import { getCatalogEntry, resolveServerTools } from "./serverToolsPolicy";

/** Context for {@link resolvePlan}: the injected catalog plus host defaults. */
export interface ResolvePlanContext {
  /** The app-built per-intent/-lane server-tool catalog. */
  catalog: ServerToolCatalog;
  /** Fallback max tool rounds when a catalog entry doesn't set one (web: 35). */
  defaultMaxToolRounds?: number;
  /** Fallback thinking hint when a catalog entry doesn't set one. */
  defaultThinkingMode?: ThinkingModeHint;
  /**
   * App-detected memory intents for the turn (web only today). When present,
   * they add the corresponding post-filters so the host strips the vault-save
   * tool on a retrieval-intent prompt and the server tools on a save-intent
   * prompt. Mobile omits this.
   */
  memoryIntent?: { retrieval?: boolean; save?: boolean };
}

const BUILDER_INTENTS = new Set<string>(["app", "slides"]);

/**
 * Resolve the complete tool plan for a turn.
 *
 * Chat lane: keys on the creation intent — client factories from the neutral
 * SDK mapping, server tools + send-policy knobs from the catalog, tool-choice
 * shape-derived unless the intent is a builder mode or a slide-deck intent
 * (both forced `auto`). Council/aggregation lanes carry no per-mode client
 * toolkit here — `resolveCouncilPlan` (council.ts) adds per-worker memory tools
 * on top of this server-tool plan.
 */
export function resolvePlan(
  descriptor: ToolIntentDescriptor,
  ctx: ResolvePlanContext
): ToolPlanSpec {
  const { catalog } = ctx;
  const entry = getCatalogEntry(descriptor, catalog);

  if (descriptor.lane === "council" || descriptor.lane === "aggregation") {
    const serverTools = resolveServerTools(descriptor, catalog);
    return {
      clientFactories: [],
      clientToolsFilter: "auto",
      serverTools,
      forcedServerTools: entry?.forcedServerTools,
      activeToolSets: descriptor.activeToolSets ? [...descriptor.activeToolSets] : [],
      toolChoice: resolveToolChoice(serverTools, entry?.toolChoice),
      maxToolRounds: getMaxToolRounds(entry, ctx.defaultMaxToolRounds),
      thinkingMode: getThinkingMode(entry, ctx.defaultThinkingMode),
      systemPromptRiders: entry?.systemPrompt ? [entry.systemPrompt] : [],
      postFilters: [],
    };
  }

  const { creation } = descriptor;
  const isBuilder = BUILDER_INTENTS.has(creation);
  const editorSlideOverlay = descriptor.editorPinned === "slides" && !isBuilder;

  const slideDeckIntent =
    descriptor.slideDeckIntent === true && descriptor.imageEditIntent !== true;

  let serverTools: ServerToolsFilter = resolveServerTools(descriptor, catalog);
  const clientFactories: ClientFactoryKey[] = [...CREATION_INTENT_CLIENT_FACTORIES[creation]];
  let clientToolsFilter: ClientToolsFilterMode | AssembledToolsFilterFn =
    entry?.clientToolsFilter ?? CREATION_INTENT_CLIENT_FILTER[creation];

  const slideEntry = catalog.slides;
  if (editorSlideOverlay && slideEntry) {
    clientToolsFilter = "slide-editor";
    serverTools = resolveServerTools({ ...descriptor, creation: "slides" }, catalog);
  }

  const effectiveEntry = editorSlideOverlay && slideEntry ? slideEntry : entry;

  const activeToolSets = new Set(descriptor.activeToolSets ?? []);
  const builderSet = CREATION_INTENT_TOOL_SET[creation];
  if (builderSet) activeToolSets.add(builderSet);
  if (slideDeckIntent) activeToolSets.add("slides");
  if (editorSlideOverlay) activeToolSets.add("slides");

  const forceAuto = isBuilder || slideDeckIntent || editorSlideOverlay;
  const toolChoice = forceAuto
    ? "auto"
    : resolveToolChoice(serverTools, effectiveEntry?.toolChoice);

  const systemPromptRiders: string[] = [];
  if (effectiveEntry?.systemPrompt) systemPromptRiders.push(effectiveEntry.systemPrompt);
  if (
    slideDeckIntent &&
    slideEntry?.systemPrompt &&
    creation !== "slides" &&
    !systemPromptRiders.includes(slideEntry.systemPrompt)
  ) {
    systemPromptRiders.push(slideEntry.systemPrompt);
  }

  const postFilters: PostFilterKey[] = [];
  if (toolChoice === "required") postFilters.push("strip-memory-save-when-coerced");
  if (ctx.memoryIntent?.retrieval) postFilters.push("strip-memory-save-on-retrieval-intent");
  if (ctx.memoryIntent?.save) postFilters.push("strip-server-tools-on-save-intent");

  return {
    clientFactories,
    clientToolsFilter,
    serverTools,
    forcedServerTools: effectiveEntry?.forcedServerTools,
    activeToolSets: [...activeToolSets],
    toolChoice,
    maxToolRounds: getMaxToolRounds(effectiveEntry, ctx.defaultMaxToolRounds),
    thinkingMode: getThinkingMode(effectiveEntry, ctx.defaultThinkingMode),
    systemPromptRiders,
    postFilters,
  };
}
