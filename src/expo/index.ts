/**
 * React Native hooks for building AI-powered mobile applications.
 *
 * The `@anuma/sdk/expo` package provides React hooks optimized for
 * Expo and React Native environments. These hooks exclude web-only
 * dependencies (like pdfjs-dist) that aren't compatible with React Native.
 *
 * ## Installation & Setup
 *
 * Before using this package, you must set up polyfills for React Native compatibility.
 * See the {@link polyfills} module documentation for complete setup instructions.
 *
 * Quick setup summary:
 *
 * ```bash
 * pnpm install @anuma/sdk web-streams-polyfill react-native-get-random-values @ethersproject/shims buffer
 * ```
 *
 * Then create an entrypoint file with all required polyfills. See
 * [ai-example-expo](https://github.com/zeta-chain/ai-example-expo) for a complete
 * working example.
 *
 * ## Differences from React Package
 *
 * The Expo package is a lightweight subset of `@anuma/sdk/react`:
 *
 * - No PDF text extraction (pdfjs-dist is web-only)
 * - Uses XMLHttpRequest for streaming (fetch streaming isn't supported in RN)
 *
 * ## Authentication
 *
 * Use `@privy-io/expo` for authentication in React Native:
 *
 * ```typescript
 * import { PrivyProvider, usePrivy } from "@privy-io/expo";
 * import { useIdentityToken } from "@privy-io/expo";
 *
 * // Wrap your app with PrivyProvider
 * <PrivyProvider appId="your-app-id" clientId="your-client-id">
 *   <App />
 * </PrivyProvider>;
 *
 * // Get identity token for API calls
 * const { getIdentityToken } = useIdentityToken();
 * ```
 *
 * ## Quick Start
 *
 * ```tsx
 * import { useIdentityToken } from "@privy-io/expo";
 * import { useChat } from "@anuma/sdk/expo";
 *
 * function ChatScreen() {
 *   const { getIdentityToken } = useIdentityToken();
 *
 *   const { isLoading, sendMessage, stop } = useChat({
 *     getToken: getIdentityToken,
 *     baseUrl: "https://portal.anuma-dev.ai",
 *     onData: (chunk) => {
 *       // Handle streaming chunks
 *       const content =
 *         typeof chunk === "string"
 *           ? chunk
 *           : chunk.choices?.[0]?.delta?.content || "";
 *       console.log("Received:", content);
 *     },
 *     onFinish: () => console.log("Stream finished"),
 *     onError: (error) => console.error("Error:", error),
 *   });
 *
 *   const handleSend = async () => {
 *     await sendMessage({
 *       messages: [{ role: "user", content: [{ type: "text", text: "Hello!" }] }],
 *       model: "fireworks/accounts/fireworks/models/kimi-k2p5",
 *     });
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleSend} disabled={isLoading} title="Send" />
 *       {isLoading && <Button onPress={stop} title="Stop" />}
 *     </View>
 *   );
 * }
 * ```
 *
 * @module
 */

export type {
  NotionAuthUrlParams,
  NotionClientRegistration,
  NotionExchangeCodeParams,
  NotionOAuthEndpoints,
  NotionPKCEChallenge,
  NotionRefreshTokenParams,
  NotionTokenResponse,
} from "../lib/auth/notion-primitives";
export {
  buildNotionAuthUrl,
  discoverNotionOAuthEndpoints,
  exchangeNotionCode,
  generateNotionPKCE,
  NOTION_OAUTH_CONFIG,
  refreshNotionAccessToken,
  registerNotionClient,
} from "../lib/auth/notion-primitives";
export type {
  CryptoPriceClassification,
  CryptoPricePreProcessorOptions,
} from "../lib/chat/cryptoPriceClassifier";
export {
  classifyCryptoPrice,
  classifyCryptoPriceBatch,
  createCryptoPricePreProcessor,
} from "../lib/chat/cryptoPriceClassifier";
export {
  attachFileContextToLastUserMessage,
  buildAttachedFilesText,
  isAttachedFilesText,
} from "../lib/chat/fileContext";
export type { PromptPreProcessor, PromptPreProcessorContext } from "../lib/chat/preProcessor";
export type { ResumeStreamOptions, ResumeStreamResult } from "../lib/chat/resumeStream";
export {
  INFERENCE_ID_HEADER,
  resumeStream,
  STREAM_RESUMABLE_HEADER,
  streamCancelPath,
  StreamExpiredError,
  streamReplayPath,
} from "../lib/chat/resumeStream";
export type {
  StockPriceClassification,
  StockPricePreProcessorOptions,
} from "../lib/chat/stockPriceClassifier";
export {
  classifyStockPrice,
  classifyStockPriceBatch,
  createStockPricePreProcessor,
} from "../lib/chat/stockPriceClassifier";
export type { StreamMetaEvent, StreamResumeHandle } from "../lib/chat/toolLoop";
export { TOOL_RESULT_ORIGIN } from "../lib/chat/toolResults";
export type { StreamSmoothingConfig } from "../lib/chat/useChat/StreamSmoother";
export type {
  WeatherClassification,
  WeatherPreProcessorOptions,
} from "../lib/chat/weatherClassifier";
export {
  classifyWeather,
  classifyWeatherBatch,
  createWeatherPreProcessor,
} from "../lib/chat/weatherClassifier";
export type {
  WebSearchClassification,
  WebSearchPreProcessorOptions,
} from "../lib/chat/webSearchClassifier";
export {
  classifyWebSearch,
  classifyWebSearchBatch,
  createWebSearchPreProcessor,
} from "../lib/chat/webSearchClassifier";
export { xhrTransport } from "../lib/chat/xhrTransport";
export {
  Conversation as ChatConversation,
  Message as ChatMessage,
  type ChatRole,
  /** @deprecated Use sdkMigrations instead */
  chatStorageMigrations,
  /** @deprecated Use sdkSchema instead */
  chatStorageSchema,
  clearLazyTitleCache,
  type CreateConversationOptions,
  type CreateMessageOptions,
  decryptConversationTitle,
  deleteMessageOp,
  type FileMetadata,
  generateConversationId,
  getConversationsByProjectLazyOp,
  getConversationsLazyOp,
  getConversationsPageOp,
  type GetConversationsPageOptions,
  type GetMessagesPageOptions,
  type LazyStoredConversation,
  type MessageSkeleton,
  type SearchSource,
  type ChatCompletionUsage as StoredChatCompletionUsage,
  type StoredConversation,
  type StoredMessage,
  type StoredMessageWithSimilarity,
  stripLegacyChunkTextOp,
  upsertMessageOp,
} from "../lib/db/chat";
export { maskScopedEmbeddingCache } from "../lib/db/chat/embeddingCache";
export {
  addConversationMemoriesOp,
  clearConversationMemoriesOp,
  type ConversationMemoryInput,
  ConversationMemory as ConversationMemoryModel,
  type ConversationMemoryOperationsContext,
  conversationMemoryToStored,
  getConversationMemoriesOp,
  type StoredConversationMemory,
} from "../lib/db/conversationMemory";
export { isEncrypted } from "../lib/db/encryption-utils";
export type {
  DatabaseManagerLogger,
  DatabaseManagerOptions,
  PlatformStorage,
} from "../lib/db/manager";
export { DatabaseManager } from "../lib/db/manager";
export {
  archiveVaultMemoryOp,
  backfillMemoryTopicsOp,
  createVaultMemoriesBatchOp,
  createVaultMemoryOp,
  type CreateVaultMemoryOptions,
  type DecayCandidateRaw,
  deleteAllVaultMemoriesForUserOp,
  deleteVaultMemoryOp,
  getAllVaultMemoriesOp,
  getAllVaultMemoryContentsOp,
  getDecayCandidatesRawOp,
  getMemoriesNeedingTopicExtractionOp,
  getUnfiledVaultMemoriesOp,
  getVaultMemoriesByIdsOp,
  getVaultMemoryOp,
  getVaultRankingProjectionsOp,
  hardDeleteDecayedOp,
  ingestPublishedPhotoMemoriesOp,
  type MemoriesNeedingTopicExtraction,
  parseMedia,
  type PhotoIngestResult,
  type PhotoMediaRef,
  type PublishedPhotoMemory,
  type RankableVaultMemory,
  relinkMemoryTopicsOp,
  restoreVaultMemoryOp,
  setMemoryVisibilityOp,
  stampTopicsExtractedAtOp,
  type StoredVaultMemory,
  VaultMemory as StoredVaultMemoryModel,
  supersedeVaultMemoryOp,
  TOPICS_EXTRACTION_VERSION,
  updateVaultMemoryEmbeddingOp,
  updateVaultMemoryOp,
  type UpdateVaultMemoryOptions,
  type VaultEmbeddingExpectation,
  type VaultMemoryOperationsContext,
  type VaultMemoryVisibility,
} from "../lib/db/memoryVault";
export type { FlushResult, QueueStatus } from "../lib/db/queue";
export { QueueManager, queueManager, WalletPoller } from "../lib/db/queue";
export { SDK_SCHEMA_VERSION, sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
export {
  createVaultFolderOp,
  type CreateVaultFolderOptions,
  deleteVaultFolderOp,
  ensureDefaultFoldersOp,
  getAllVaultFoldersOp,
  getVaultFolderMemoryCountOp,
  moveMemoriesToFolderOp,
  type StoredVaultFolder,
  VaultFolder as StoredVaultFolderModel,
  updateVaultFolderContextOp,
  updateVaultFolderOp,
  type UpdateVaultFolderOptions,
  type VaultFolderOperationsContext,
} from "../lib/db/vaultFolders";
export type { Logger } from "../lib/logger";
export { consoleLogger, getLogger, noopLogger, setLogger } from "../lib/logger";
export type {
  AutoExtractMessage,
  AutoExtractor,
  Budget,
  CachedChunkVectors,
  ChunkVectorCache,
  ConsolidationAction,
  ConsolidationFallbackReason,
  CreateAutoExtractorOptions,
  CreateDecaySweeperOptions,
  DecayClassifier,
  DecayInput,
  DecayPolicy,
  DecaySweeper,
  DecaySweepResult,
  DecayVerdict,
  ExtractedCandidate,
  ExtractedEntity,
  ExtractFactsOptions,
  ExtractionCursorStore,
  ExtractionFunnel,
  ExtractionTimings,
  ExtractOutcome,
  FactType,
  GraphTraversalOptions,
  InjectionClassifierOptions,
  InjectionReason,
  LlmDecayClassifierOptions,
  LlmNeighborRefinerOptions,
  MemoryExtractedEvent,
  MemoryKind,
  MemoryQuarantinedEvent,
  MemoryToVerify,
  MemoryVerification,
  NeighborRefiner,
  NowSource,
  ObservationTrend,
  ObservationTrendInput,
  PortalLlmAuth,
  PortalLlmFailure,
  PortalLlmFailureReason,
  ProfileConfigFingerprint,
  ProfileDoc,
  ProfileFacet,
  ProfileFacetKey,
  ProfileSalienceInput,
  ProfileSection,
  QuarantinedMemoryInfo,
  RankedMemory,
  RankedProfileCandidate,
  RecallContext,
  RecallDegradation,
  RecallDiagnostics,
  RecallEmptyReason,
  RecallOptions,
  RecallResult,
  RecallToolCallbacks,
  RecallToolOptions,
  RecencyOptions,
  ReflectOptions,
  ReflectResult,
  RetainAction,
  RetainContext,
  RetainOptions,
  RetainResult,
  RetainSource,
  ScoreBreakdown,
  ScoreProfileSalienceOptions,
  ScreenedCandidate,
  ScreenResult,
  SynthesizeProfileOptions,
  TopicExtractionInput,
  TopicExtractionRunResult,
  TopicExtractOptions,
  TopicSkipReason,
  TurnCompleteEvent,
  TurnSkippedEvent,
  UncheckedReason,
  UnverifiableReason,
  VerificationSources,
  VerifyMemoriesForPublishOptions,
} from "../lib/memory";
export {
  createLocalMemoryStore,
  createRemoteMemoryPersistence,
  createRemoteMemoryPipeline,
  type LocalMemoryStoreOptions,
  type MemoryCreate,
  type MemoryListOptions,
  type MemoryMaintenance,
  type MemoryRecallOptions,
  type MemoryRetainOptions,
  type MemoryStore,
  type MemorySubscribeOptions,
  type MemoryUpdate,
  type RemoteMemoryCandidateOptions,
  type RemoteMemoryDecodeFailure,
  RemoteMemoryError,
  type RemoteMemoryListOptions,
  type RemoteMemoryPage,
  type RemoteMemoryPersistence,
  type RemoteMemoryPersistenceOptions,
  type RemoteMemoryPipeline,
  type RemoteMemoryPipelineOptions,
  type RemoteMemoryReadFilters,
  type RemoteMemoryRecord,
  type RemoteMemoryRow,
} from "../lib/memory";
export {
  capHopsForDensity,
  classifyDecay,
  classifyInjectionCandidates,
  classifyObservationTrend,
  createAutoExtractor,
  createChunkVectorCache,
  createDecaySweeper,
  createLlmDecayClassifier,
  createLlmNeighborRefiner,
  createMessageSourceResolver,
  createPlatformCursorStore,
  createRecallTool,
  DEFAULT_CHUNK_CACHE_SIZE,
  DEFAULT_DECAY_POLICY,
  DEFAULT_MAX_CLASSIFIER_CALLS_PER_SWEEP,
  DEFAULT_PROFILE_FACETS,
  DEFAULT_PROFILE_FACT_TYPE_WEIGHTS,
  DEFAULT_PROFILE_PROOF_ALPHA,
  DEFAULT_PROFILE_TREND_MULTIPLIERS,
  ENTITY_FANOUT,
  extractAndLinkEntitiesForMemoriesOp,
  extractAndRetain,
  extractEntitiesForMemories,
  extractFacts,
  HARD_DELETE_WINDOW_MS,
  injectionSignatureCatalog,
  isDegradedTopicSkip,
  isRerankerAvailable,
  MAX_HOPS,
  MEDIUM_TTL_MS,
  NEVER_TTL_MS,
  NODE_BUDGET,
  PAST_EVENT_GRACE_MS,
  PROFILE_DOC_VERSION,
  rankProfileCandidates,
  recall,
  RECALL_MAX_LIMIT,
  RECALL_TOOL_NAME,
  reflect,
  RerankerUnavailableError,
  retain,
  scoreProfileSalience,
  screenCandidatesForInjection,
  SHORT_TTL_MS,
  summarizeObservationTrends,
  synthesizeProfile,
  TOPIC_EXTRACTION_BATCH_SIZE,
  traverseGraphLane,
  TREND_RECENT_WINDOW_DAYS,
  TREND_STALE_WINDOW_DAYS,
  ttlForType,
  VAULT_SIZE_HOP_CAP,
  verifyMemoriesForPublish,
} from "../lib/memory";
export {
  assembleMemoryContext,
  type MemoryContextItem,
  type MemoryContextLane,
  type MemoryContextOptions,
  type MemoryContextResult,
  shouldRecallMemory,
} from "../lib/memory";
export { createDurableAutoExtractor, type DurableAutoExtractorOptions } from "../lib/memory";
export type {
  ChunkingOptions,
  EmbeddingOptions as MemoryEngineEmbeddingOptions,
  MemoryEngineResult,
  MemoryEngineSearchOptions,
  QuantizedEmbedding,
  TextChunk,
} from "../lib/memoryEngine";
export {
  chunkAndEmbedAllMessages,
  chunkAndEmbedMessage,
  CHUNKS_DISCARDED_ORIGIN,
  chunkText,
  cosineInt8,
  createMemoryEngineTool,
  decodeChunkVector,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MIN_CHUNK_SIZE,
  dequantizeEmbedding,
  embedAllMessages,
  embedMessage,
  encodeChunkVector,
  generateEmbedding,
  generateEmbeddings,
  quantizeEmbedding,
  shouldChunkMessage,
} from "../lib/memoryEngine";
export {
  createMemoryVaultSearchTool,
  createMemoryVaultTool,
  createVaultEmbeddingCache,
  DEFAULT_VAULT_CACHE_SIZE,
  eagerEmbedContent,
  type ManualFactType,
  type MemoryVaultSearchOptions,
  type MemoryVaultToolOptions,
  preEmbedVaultMemories,
  searchVaultMemories,
  type VaultEmbeddingCache,
  type VaultMemoryWriter,
  type VaultSaveOperation,
  type VaultSearchResult,
  type VaultWriteAction,
  type VaultWriteInput,
  type VaultWriteOutcome,
} from "../lib/memoryVault";
export type {
  MessageRedactionResult,
  PiiCategory,
  PiiMatch,
  PiiPattern,
  PiiRedactorOptions,
  RedactionResult,
} from "../lib/pii";
export {
  createStreamingDeAnonymizer,
  isPiiRedactor,
  PII_PATTERNS,
  PiiRedactor,
  resolvePiiRedactor,
} from "../lib/pii";
export { formatFileProcessingNotes } from "../lib/processors/fileStatusNotes";
export type { FileProcessingReason, FileProcessingStatus } from "../lib/processors/types";
export type { CachedServerTools, ServerToolsOptions, ServerToolsResponse } from "../lib/tools";
export {
  clearServerToolsCache,
  DEFAULT_CACHE_EXPIRATION_MS,
  getCachedServerTools,
  getServerTools,
} from "../lib/tools";
export type { LoggerProviderProps } from "../react/LoggerProvider";
export { LoggerProvider } from "../react/LoggerProvider";
export type { UseCreditsOptions, UseCreditsResult } from "../react/useCredits";
export { useCredits } from "../react/useCredits";
export type { EmbeddedWalletSignerFn, SignMessageFn } from "../react/useEncryption";
export type { RequestEncryptionKeyOptions } from "../react/useEncryption";
export {
  clearAllEncryptionKeys,
  clearAllEncryptionState,
  clearEncryptionKey,
  deriveKeyFromSignatureBytes,
  EncryptionKeyMissingError,
  hasEncryptionKey,
  onKeyAvailable,
  refreshEncryptionKeyIfMatches,
  requestEncryptionKey,
  seedEncryptionKeys,
  useEncryption,
} from "../react/useEncryption";
export type { UseModelsOptions, UseModelsResult } from "../react/useModels";
export { useModels } from "../react/useModels";
export { createNotionProxyTools, createNotionTools, type NotionMcpCaller } from "../tools/notion";
export { useChat } from "./useChat";
export type {
  ResumeStreamWithStorageResult,
  SendMessageWithStorageArgs,
  SendMessageWithStorageDetachedResult,
  SendMessageWithStorageResult,
  UseChatStorageOptions,
  UseChatStorageResult,
} from "./useChatStorage";
export { useChatStorage } from "./useChatStorage";
