export {
  type AutoExtractMessage,
  extractAndRetain,
  type ExtractedCandidate,
  type ExtractedEntity,
  extractFacts,
  type ExtractFactsOptions,
  type ExtractOutcome,
  type FactType,
  type QuarantinedMemoryInfo,
} from "./autoExtract.js";
export {
  type AutoExtractor,
  createAutoExtractor,
  type CreateAutoExtractorOptions,
  type MemoryExtractedEvent,
  type MemoryQuarantinedEvent,
  type TurnCompleteEvent,
  type TurnSkippedEvent,
} from "./autoExtractWorker.js";
export {
  classifyDecay,
  type DecayInput,
  type DecayPolicy,
  type DecayVerdict,
  DEFAULT_DECAY_POLICY,
  HARD_DELETE_WINDOW_MS,
  MEDIUM_TTL_MS,
  NEVER_TTL_MS,
  PAST_EVENT_GRACE_MS,
  SHORT_TTL_MS,
  ttlForType,
} from "./decay.js";
export {
  createDecaySweeper,
  type CreateDecaySweeperOptions,
  type DecayClassifier,
  type DecaySweeper,
  type DecaySweepResult,
  type NowSource,
} from "./decayWorker.js";
export {
  capHopsForDensity,
  ENTITY_FANOUT,
  type GraphTraversalOptions,
  MAX_HOPS,
  NODE_BUDGET,
  traverseGraphLane,
  VAULT_SIZE_HOP_CAP,
} from "./graphTraversal.js";
export {
  classifyInjectionCandidates,
  type InjectionClassifierOptions,
} from "./injectionClassifier.js";
export {
  type InjectionReason,
  injectionSignatureCatalog,
  screenCandidatesForInjection,
  type ScreenedCandidate,
  type ScreenResult,
} from "./injectionScreen.js";
export { recall } from "./recall.js";
export {
  createRecallTool,
  RECALL_MAX_LIMIT,
  RECALL_TOOL_NAME,
  type RecallToolCallbacks,
  type RecallToolOptions,
} from "./recallTool.js";
export type { RecencyOptions } from "./recency.js";
export { reflect, type ReflectOptions, type ReflectResult } from "./reflect.js";
export { retain, type RetainContext } from "./retain.js";
export type {
  Budget,
  ConsolidationFallbackReason,
  MemoryKind,
  PortalLlmAuth,
  RankedMemory,
  RecallContext,
  RecallOptions,
  RecallResult,
  RetainAction,
  RetainOptions,
  RetainResult,
  RetainSource,
  ScoreBreakdown,
} from "./types.js";

// W5 — the low-level entity-graph DB ops (getMemoriesByEntityNamesOp,
// getEntitiesByMemoryIdsOp, link/unlink) live in db/entities/operations and
// are surfaced from the react entry point directly, next to the Entity models.
// The recall-time traversal built on them (traverseGraphLane, PR4) is a
// memory-layer concern and IS re-exported above.
