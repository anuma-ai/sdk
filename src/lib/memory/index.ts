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

// W5 — entity graph ops (used by extractAndRetain on the write path
// and by recall() on the read path).
export {
  type EntityGraphNode,
  type EntityOperationsContext,
  getEntitiesForMemoryOp,
  getEntityByNameOp,
  getMemoriesByEntityNamesOp,
  linkMemoryEntitiesOp,
  listEntityGraphOp,
  upsertEntityOp,
} from "../db/entities/operations.js";
export type {
  CreateEntityOptions,
  EntityKind,
  StoredEntity,
  StoredMemoryEntity,
} from "../db/entities/types.js";
