export {
  type AutoExtractMessage,
  extractAndRetain,
  type ExtractedCandidate,
  extractFacts,
  type ExtractFactsOptions,
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
export { recall } from "./recall.js";
export {
  createRecallTool,
  type RecallToolCallbacks,
  type RecallToolOptions,
} from "./recallTool.js";
export { reflect, type ReflectOptions, type ReflectResult } from "./reflect.js";
export { retain, type RetainContext } from "./retain.js";
export type {
  Budget,
  MemoryKind,
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
