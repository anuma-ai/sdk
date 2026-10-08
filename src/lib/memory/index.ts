export type { CachedChunkVectors, ChunkVectorCache } from "../db/chat/operations.js";
export { INTERNAL_FLOW_MARKER, withInternalFlowMarker } from "../internalFlowMarker.js";
export {
  type AutoExtractMessage,
  extractAndRetain,
  type ExtractedCandidate,
  type ExtractedEntity,
  extractFacts,
  type ExtractFactsOptions,
  type ExtractionFunnel,
  type ExtractionTimings,
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
export {
  DEFAULT_PROFILE_FACT_TYPE_WEIGHTS,
  DEFAULT_PROFILE_PROOF_ALPHA,
  DEFAULT_PROFILE_TREND_MULTIPLIERS,
  type ProfileSalienceInput,
  type RankedProfileCandidate,
  rankProfileCandidates,
  scoreProfileSalience,
  type ScoreProfileSalienceOptions,
} from "./profileSalience.js";
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
export { createLocalMemoryStore, type LocalMemoryStoreOptions } from "./store/local.js";
export {
  createRemoteMemoryPersistence,
  type RemoteMemoryCandidateOptions,
  type RemoteMemoryDecodeFailure,
  RemoteMemoryError,
  type RemoteMemoryListOptions,
  type RemoteMemoryPage,
  type RemoteMemoryPersistence,
  type RemoteMemoryPersistenceOptions,
  type RemoteMemoryReadFilters,
  type RemoteMemoryRecord,
  type RemoteMemoryRow,
} from "./store/remotePersistence.js";
export {
  createRemoteMemoryPipeline,
  type RemoteMemoryPipeline,
  type RemoteMemoryPipelineOptions,
} from "./store/remotePipeline.js";
export type {
  MemoryCreate,
  MemoryListOptions,
  MemoryMaintenance,
  MemoryRecallOptions,
  MemoryRetainOptions,
  MemoryStore,
  MemorySubscribeOptions,
  MemoryUpdate,
} from "./store/types.js";
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
  isDegradedTopicSkip,
  TOPIC_EXTRACTION_BATCH_SIZE,
  type TopicExtractionInput,
  type TopicExtractionRunResult,
  type TopicExtractOptions,
  type TopicSkipReason,
} from "./topicExtract.js";
export type {
  Budget,
  ConsolidationAction,
  ConsolidationFallbackReason,
  MemoryKind,
  PortalLlmAuth,
  PortalLlmFailure,
  PortalLlmFailureReason,
  RankedMemory,
  RecallContext,
  RecallDegradation,
  RecallDiagnostics,
  RecallEmptyReason,
  RecallOptions,
  RecallResult,
  RetainAction,
  RetainOptions,
  RetainResult,
  RetainSource,
  ScoreBreakdown,
} from "./types.js";
/** @public */
export {
  assembleMemoryContext,
  type MemoryContextItem,
  type MemoryContextLane,
  type MemoryContextOptions,
  type MemoryContextResult,
  shouldRecallMemory,
} from "./context.js";
export {
  createDurableAutoExtractor,
  type DurableAutoExtractorOptions,
} from "./durableExtraction.js";
export {
  createMessageSourceResolver,
  type MemoryToVerify,
  type MemoryVerification,
  type UncheckedReason,
  type UnverifiableReason,
  type VerificationSources,
  verifyMemoriesForPublish,
  type VerifyMemoriesForPublishOptions,
} from "./verifySupport.js";
