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
  type QuarantinedMemoryInfo,
} from "./autoExtract.js";
export {
  type AutoExtractor,
  createAutoExtractor,
  type CreateAutoExtractorOptions,
  createPlatformCursorStore,
  type ExtractionCursorStore,
  type MemoryExtractedEvent,
  type MemoryQuarantinedEvent,
  type TurnCompleteEvent,
  type TurnSkippedEvent,
} from "./autoExtractWorker.js";
export { createChunkVectorCache, DEFAULT_CHUNK_CACHE_SIZE } from "./chunkVectorCache.js";
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
export { createLlmDecayClassifier, type LlmDecayClassifierOptions } from "./decayClassifier.js";
export {
  createDecaySweeper,
  type CreateDecaySweeperOptions,
  type DecayClassifier,
  type DecaySweeper,
  type DecaySweepResult,
  DEFAULT_MAX_CLASSIFIER_CALLS_PER_SWEEP,
  type NowSource,
} from "./decayWorker.js";
export {
  capHopsForDensity,
  createLlmNeighborRefiner,
  ENTITY_FANOUT,
  type GraphTraversalOptions,
  type LlmNeighborRefinerOptions,
  MAX_HOPS,
  type NeighborRefiner,
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
export {
  classifyObservationTrend,
  type ObservationTrend,
  type ObservationTrendInput,
  summarizeObservationTrends,
  TREND_RECENT_WINDOW_DAYS,
  TREND_STALE_WINDOW_DAYS,
} from "./observationTrend.js";
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

// W5 — the low-level entity-graph DB ops (getMemoriesByEntityNamesOp,
// getEntitiesByMemoryIdsOp, link/unlink) live in db/entities/operations and
// are surfaced from the react entry point directly, next to the Entity models.
// The recall-time traversal built on them (traverseGraphLane, PR4) is a
// memory-layer concern and IS re-exported above.
