/**
 * `resolvePlan` — the single source of truth for "which tools this turn"
 * (issue #702, Phase 2). Given a neutral {@link ToolIntentDescriptor} and an
 * app-injected {@link ServerToolCatalog}, it produces a fully-resolved
 * {@link ToolPlanSpec} that both web and mobile consume, replacing each app's
 * hand-written per-mode switch.
 *
 * Pure and node/RN-safe. The plan is data — the host feeds `clientFactories`
 * into `assembleClientTools`, and `serverTools`/`toolChoice`/`maxToolRounds`/
 * `thinkingMode` into its send layer.
 */

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

  // Council / aggregation: no per-mode client toolkit; the server tools are a
  // semantic filter (resolveToolChoice → auto). Per-worker client tools — and
  // the aggregation worker's never-persist invariant — are handled by
  // composeCouncilClientTools(canPersistMemory) in council.ts, NOT by a
  // plan-level post-filter (which would be a no-op here: the plan produces no
  // client tools and toolChoice is `auto`, so `strip-memory-save-when-coerced`
  // could never fire). Hence postFilters is empty for these lanes.
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

  // A prompt that reads as an image edit suppresses slide-deck escalation: the
  // user is editing an image, not requesting a deck, so we must not re-route the
  // turn into the slide builder. Mirrors web's live path, which gates slide-deck
  // intent on `!imageEditActive`.
  const slideDeckIntent =
    descriptor.slideDeckIntent === true && descriptor.imageEditIntent !== true;

  let serverTools: ServerToolsFilter = resolveServerTools(descriptor, catalog);
  const clientFactories: ClientFactoryKey[] = [...CREATION_INTENT_CLIENT_FACTORIES[creation]];
  let clientToolsFilter: ClientToolsFilterMode | AssembledToolsFilterFn =
    entry?.clientToolsFilter ?? CREATION_INTENT_CLIENT_FILTER[creation];

  // Fullscreen slide-editor overlay behind an ordinary chat turn: keep the full
  // generative toolkit registered but restrict the sent tools to the slide
  // editor, and swap the server tools to the slide entry's. Tool-choice stays
  // `auto` — an open editor must not force image generation on every keystroke.
  const slideEntry = catalog.slides;
  if (editorSlideOverlay && slideEntry) {
    clientToolsFilter = "slide-editor";
    serverTools = resolveServerTools({ ...descriptor, creation: "slides" }, catalog);
  }

  // A fullscreen slide-editor overlay is effectively a slides turn: its
  // send-policy knobs (max rounds, thinking mode, forced server tools) and its
  // persona come from the slide catalog entry, NOT the underlying chat intent —
  // which carries neither the slide prompt nor the slide knobs. (We already
  // swapped the server tools + client filter to slides above.)
  const effectiveEntry = editorSlideOverlay && slideEntry ? slideEntry : entry;

  // Sticky sets: carry conversation history forward, and force-activate the
  // builder/slide-deck set so its persona and toolkit ride in (and follow-ups
  // stay in that lane).
  const activeToolSets = new Set(descriptor.activeToolSets ?? []);
  const builderSet = CREATION_INTENT_TOOL_SET[creation];
  if (builderSet) activeToolSets.add(builderSet);
  if (slideDeckIntent) activeToolSets.add("slides");
  if (editorSlideOverlay) activeToolSets.add("slides");

  // Tool-choice: builder modes and a detected slide-deck intent force `auto`
  // (let the model decide when to call plan_deck / create_file); everything
  // else is shape-derived from the server-tools filter.
  const forceAuto = isBuilder || slideDeckIntent || editorSlideOverlay;
  const toolChoice = forceAuto
    ? "auto"
    : resolveToolChoice(serverTools, effectiveEntry?.toolChoice);

  // System-prompt riders: the effective intent's authoritative prompt (the slide
  // entry's for a slide-editor overlay), plus the slide prompt when a slide-deck
  // intent is detected in plain chat — de-duplicated so the overlay + deck-intent
  // case doesn't inject the slide prompt twice.
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

  // Post-filters: strip the vault-save tool on a coerced turn; add web's
  // intent-gated filters when the host reports them.
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
