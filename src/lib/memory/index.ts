export {
  type AutoExtractMessage,
  extractAndRetain,
  type ExtractedCandidate,
  type ExtractedEntity,
  extractFacts,
  type ExtractFactsOptions,
  type ExtractOutcome,
  type FactType,
} from "./autoExtract.js";
export {
  type AutoExtractor,
  createAutoExtractor,
  type CreateAutoExtractorOptions,
  type MemoryExtractedEvent,
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

// W5 — entity-graph ops are consumed internally by extractAndRetain and
// recall(); intentionally not re-exported here because none of the
// SDK's public entry points (server/, react/, expo/) surface them yet.
// Promote individual ops to those entry points when consumers need them.
