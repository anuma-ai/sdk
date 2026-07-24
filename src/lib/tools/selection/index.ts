/**
 * Tool-selection resolver — the orchestration layer the SDK owns so `apps/web`
 * and `apps/mobile` share one "which tools this turn" implementation instead of
 * hand-duplicating it (issue #702).
 *
 * Everything here is pure and node/RN/RSC-safe; it is surfaced publicly via the
 * `@anuma/sdk/tools/selection` subpath.
 */

export {
  deriveActiveToolSets,
  mergeActiveToolSets,
  type ToolActivationEvent,
} from "./activeToolSets";
export {
  assembleClientTools,
  type ClientFactoryBuilder,
  filterAssembledClientTools,
  type SelectionLogger,
  type ToolSelectionAdapters,
} from "./assembleClientTools";
export {
  composeCouncilClientTools,
  type CouncilClientSelectionOptions,
  type CouncilClientToolsInput,
  resolveCouncilPlan,
  resolveCouncilServerTools,
  selectCouncilClientTools,
} from "./council";
export {
  type AssembledToolsFilterFn,
  type ClientFactoryKey,
  type ClientToolsFilterMode,
  CREATION_INTENT_CLIENT_FACTORIES,
  CREATION_INTENT_CLIENT_FILTER,
  CREATION_INTENT_TOOL_SET,
  type CreationIntent,
  FULL_GENERATIVE_CLIENT_FACTORIES,
  type PostFilterKey,
  type ServerToolCatalog,
  type ServerToolCatalogEntry,
  type ServerToolsFilter,
  type ServerToolsFilterContext,
  type ThinkingModeHint,
  type ToolChoice,
  type ToolIntentDescriptor,
  type ToolLane,
  type ToolPlanSpec,
} from "./intents";
export { resolvePlan, type ResolvePlanContext } from "./plan";
export {
  getMaxToolRounds,
  getThinkingMode,
  MEMORY_SAVE_TOOL_NAME,
  resolveToolChoice,
  stripCoercedMemoryWrite,
} from "./sendPolicy";
export { getCatalogEntry, isCoercingIntent, resolveServerTools } from "./serverToolsPolicy";
