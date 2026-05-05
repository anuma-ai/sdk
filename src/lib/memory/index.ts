export { recall } from "./recall.js";
export { retain, type RetainContext } from "./retain.js";
export {
  extractFacts,
  extractAndRetain,
  type AutoExtractMessage,
  type ExtractedCandidate,
  type ExtractFactsOptions,
  type FactType,
} from "./autoExtract.js";
export {
  createAutoExtractor,
  type AutoExtractor,
  type CreateAutoExtractorOptions,
  type MemoryExtractedEvent,
  type TurnCompleteEvent,
  type TurnSkippedEvent,
} from "./autoExtractWorker.js";
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
  upsertEntityOp,
  getEntityByNameOp,
  linkMemoryEntitiesOp,
  getMemoriesByEntityNamesOp,
  getEntitiesForMemoryOp,
  type EntityOperationsContext,
} from "../db/entities/operations.js";
export type {
  CreateEntityOptions,
  EntityKind,
  StoredEntity,
  StoredMemoryEntity,
} from "../db/entities/types.js";
