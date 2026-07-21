export type { CachedChunkVectors, ChunkVectorCache } from "../db/chat/operations.js";
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
  createPlatformCursorStore,
  type ExtractionCursorStore,
  type MemoryExtractedEvent,
  type TurnCompleteEvent,
  type TurnSkippedEvent,
} from "./autoExtractWorker.js";
export { createChunkVectorCache, DEFAULT_CHUNK_CACHE_SIZE } from "./chunkVectorCache.js";
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
export { isRerankerAvailable, RerankerUnavailableError } from "./reranker.js";
export { retain, type RetainContext } from "./retain.js";
export {
  DEFAULT_PROFILE_FACETS,
  PROFILE_DOC_VERSION,
  type ProfileConfigFingerprint,
  type ProfileDoc,
  type ProfileFacet,
  type ProfileFacetKey,
  type ProfileSection,
  synthesizeProfile,
  type SynthesizeProfileOptions,
} from "./synthesizeProfile.js";
export {
  extractAndLinkEntitiesForMemoriesOp,
  extractEntitiesForMemories,
  TOPIC_EXTRACTION_BATCH_SIZE,
  type TopicExtractionInput,
  type TopicExtractionRunResult,
  type TopicExtractOptions,
} from "./topicExtract.js";
export type {
  Budget,
  ConsolidationFallbackReason,
  MemoryKind,
  PortalLlmAuth,
  RankedMemory,
  RecallContext,
  RecallDegradation,
  RecallDiagnostics,
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
