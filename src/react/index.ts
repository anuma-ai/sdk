/**
 *
 * The `@anuma/sdk/react` package provides a collection of React hooks
 * designed to simplify building AI features in your applications. These hooks
 * abstract away the complexity of managing streaming responses, loading states,
 * authentication, and real-time updates, letting you focus on creating great
 * user experiences.
 *
 * ## Why Use These Hooks?
 *
 * Building AI-powered interfaces involves handling many concerns: streaming
 * responses token-by-token, managing conversation state, coordinating tool
 * execution, processing file attachments, and more. These hooks provide
 * production-ready abstractions that handle these complexities out of the box.
 *
 * **Key benefits:**
 *
 * - **Streaming-first**: Built-in support for real-time streaming with
 *   automatic UI updates as content arrives
 * - **State management**: Automatic handling of loading states, errors, and
 *   request lifecycle
 * - **File processing**: Extract text from PDFs and images (OCR) to provide
 *   document context to your AI
 * - **Memory & context**: Extract and retrieve relevant memories using semantic
 *   search to make your AI context-aware
 * - **Wallet-based encryption**: Secure data encryption using wallet signatures
 *   for Web3 applications
 *
 * ## Quick Start
 *
 * ```tsx
 * import { useChat } from "@anuma/sdk/react";
 *
 * function ChatComponent() {
 *   const { isLoading, sendMessage, stop } = useChat({
 *     getToken: async () => getAuthToken(),
 *     onData: (chunk) => setResponse((prev) => prev + chunk),
 *   });
 *
 *   const handleSend = async () => {
 *     await sendMessage({
 *       messages: [{ role: "user", content: [{ type: "text", text: input }] }],
 *       model: "fireworks/accounts/fireworks/models/kimi-k2p5",
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleSend} disabled={isLoading}>Send</button>
 *       {isLoading && <button onClick={stop}>Stop</button>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @module react
 */
export {
  clearGithubToken,
  getAndClearGithubPendingMessage,
  getAndClearGithubReturnUrl,
  getGithubAccessToken,
  getValidGithubToken,
  handleGithubCallback,
  hasGithubCredentials,
  isGithubCallback,
  migrateGithubToken,
  refreshGithubToken,
  revokeGithubToken,
  startGithubAuth,
  storeGithubPendingMessage,
  storeGithubReturnUrl,
  storeGithubToken,
} from "../lib/auth/github";
export {
  clearCalendarToken,
  getAndClearCalendarPendingMessage,
  getAndClearCalendarReturnUrl,
  getCalendarAccessToken,
  getValidCalendarToken,
  handleCalendarCallback,
  hasCalendarCredentials,
  isCalendarCallback,
  migrateCalendarToken,
  refreshCalendarToken,
  revokeCalendarToken,
  storeCalendarPendingMessage,
  storeCalendarReturnUrl,
  storeCalendarToken,
} from "../lib/auth/google-calendar";
export {
  clearDriveToken,
  getAndClearDrivePendingMessage,
  getAndClearDriveReturnUrl,
  getDriveAccessToken,
  getValidDriveToken,
  handleDriveCallback,
  hasDriveCredentials,
  isDriveCallback,
  migrateDriveToken,
  refreshDriveToken,
  revokeDriveToken,
  storeDrivePendingMessage,
  storeDriveReturnUrl,
  storeDriveToken,
} from "../lib/auth/google-drive";
export {
  clearNotionToken,
  getAndClearNotionPendingMessage,
  getAndClearNotionReturnUrl,
  getNotionAccessToken,
  getNotionMCPUrl,
  getValidNotionToken,
  handleNotionCallback,
  hasNotionCredentials,
  isNotionCallback,
  migrateNotionClientRegistration,
  migrateNotionToken,
  refreshNotionToken,
  revokeNotionAccess,
  startNotionAuth,
  storeNotionPendingMessage,
  storeNotionReturnUrl,
} from "../lib/auth/notion";
export type { DropboxExportResult, DropboxImportResult } from "../lib/backup/dropbox/backup";
export type { GoogleDriveExportResult, GoogleDriveImportResult } from "../lib/backup/google/backup";
export type { ICloudExportResult, ICloudImportResult } from "../lib/backup/icloud/backup";
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
export type { StepFinishEvent, StreamMetaEvent, StreamResumeHandle } from "../lib/chat/toolLoop";
export { ProviderStreamError } from "../lib/chat/toolLoop";
export { TOOL_RESULT_ORIGIN } from "../lib/chat/toolResults";
export type { StreamSmoothingConfig } from "../lib/chat/useChat/StreamSmoother";
export type { ToolCallArgumentsDeltaEvent } from "../lib/chat/useChat/utils";
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
export {
  AppFile as AppFileModel,
  type AppFileOperationsContext,
  appFileToStored,
  deleteAllAppFilesOp,
  deleteAppFileOp,
  getAppFileMapOp,
  getAppFileOp,
  getAppFilesOp,
  putAppFileOp,
  type StoredAppFile,
} from "../lib/db/appFiles";
export {
  Conversation as ChatConversation,
  Message as ChatMessage,
  type ChatRole,
  /** @deprecated Use sdkMigrations instead */
  chatStorageMigrations,
  /** @deprecated Use sdkSchema instead */
  chatStorageSchema,
  type ChunkSearchResult,
  clearLazyTitleCache,
  type ClientToolsFilterFn,
  type CreateConversationOptions,
  type CreateMessageOptions,
  decryptConversationTitle,
  deleteMessageOp,
  type FileMetadata,
  generateConversationId,
  getConversationsByProjectLazyOp,
  getConversationsByProjectOp,
  getConversationsLazyOp,
  getConversationsPageOp,
  type GetConversationsPageOptions,
  type GetMessagesPageOptions,
  type LazyStoredConversation,
  type MessageChunk,
  type MessageFeedback,
  type MessageOrigin,
  type MessageSkeleton,
  searchChunksOp,
  searchMessagesOp,
  type SearchSource,
  type ServerToolsFilter,
  type ServerToolsFilterFn,
  type StorageOperationsContext,
  type ChatCompletionUsage as StoredChatCompletionUsage,
  type StoredConversation,
  type StoredFileWithContext,
  type StoredMessage,
  type StoredMessageWithSimilarity,
  stripLegacyChunkTextOp,
  updateConversationProjectOp,
  updateMessageFeedbackOp,
} from "../lib/db/chat";
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
export {
  Entity as EntityModel,
  MemoryEntity as MemoryEntityModel,
} from "../lib/db/entities/models";
export {
  backfillMemoryEntityUserIdsOp,
  type EntityInput,
  type EntityOperationsContext,
  getEntitiesByMemoryIdsOp,
  getMemoriesByEntityNamesOp,
  linkMemoryEntitiesOp,
  replaceMemoryEntitiesGuardedOp,
} from "../lib/db/entities/operations";
export type {
  CreateEntityOptions,
  EntityKind,
  StoredEntity,
  StoredTopic,
  TopicSource,
} from "../lib/db/entities/types";
export { ENTITY_KINDS } from "../lib/db/entities/types";
export type {
  DatabaseManagerLogger,
  DatabaseManagerOptions,
  PlatformStorage,
} from "../lib/db/manager";
export { DatabaseManager, webPlatformStorage } from "../lib/db/manager";
export {
  createMediaBatchOp,
  createMediaOp,
  type CreateMediaOptions,
  deleteMediaByConversationOp,
  deleteMediaByMessageOp,
  deleteMediaOp,
  generateMediaId,
  getAIGeneratedMediaOp,
  getAudioOp,
  getDocumentsOp,
  getImagesOp,
  getMediaByConversationOp,
  getMediaByIdOp,
  getMediaByIdsOp,
  getMediaByMessageOp,
  getMediaByModelOp,
  getMediaByRoleOp,
  getMediaBySourceUrlOp,
  getMediaByTypeOp,
  getMediaCountOp,
  getMediaCountsByTypeOp,
  getMediaOp,
  getMediaTypeFromMime,
  getRecentMediaOp,
  getUserUploadedMediaOp,
  getVideosOp,
  hardDeleteMediaOp,
  isSupportedMediaType,
  type MediaDimensions,
  type MediaFilterOptions,
  type MediaMetadata,
  type MediaOperationsContext,
  type MediaRole,
  mediaToStored,
  type MediaType,
  relinkMisclassifiedVideosOp,
  searchMediaOp,
  type StoredMedia,
  Media as StoredMediaModel,
  updateMediaMessageIdBatchOp,
  updateMediaOp,
  type UpdateMediaOptions,
} from "../lib/db/media";
export {
  archiveVaultMemoryOp,
  backfillMemoryTopicsOp,
  clearMemoryTopicsOverrideOp,
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
  getVaultCandidateKeysOp,
  getVaultEmbeddingsByIdsOp,
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
  setMemoryEntitiesOp,
  setMemoryVisibilityOp,
  stampTopicsExtractedAtOp,
  type StoredVaultMemory,
  VaultMemory as StoredVaultMemoryModel,
  supersedeVaultMemoryOp,
  TOPICS_EXTRACTION_VERSION,
  updateVaultMemoryEmbeddingOp,
  updateVaultMemoryOp,
  type UpdateVaultMemoryOptions,
  type VaultCandidateKey,
  type VaultEmbeddingExpectation,
  type VaultMemoryOperationsContext,
  type VaultMemoryVisibility,
} from "../lib/db/memoryVault";
export {
  createProjectOp,
  type CreateProjectOptions,
  deleteProjectOp,
  generateProjectId,
  getProjectConversationCountOp,
  getProjectConversationsOp,
  getProjectOp,
  getProjectsOp,
  Project,
  type ProjectOperationsContext,
  projectToStored,
  type StoredProject,
  updateProjectNameOp,
  updateProjectOp,
  type UpdateProjectOptions,
} from "../lib/db/project";
export type {
  FlushResult,
  OperationExecutor,
  QueuedOperation,
  QueuedOperationType,
  QueueEncryptionContext,
  QueueStatus,
} from "../lib/db/queue";
export { QueueManager, queueManager, WalletPoller } from "../lib/db/queue";
export {
  createSavedToolOp,
  type CreateSavedToolOptions,
  deleteSavedToolOp,
  getAllSavedToolsOp,
  getSavedToolByIdOp,
  SavedTool as SavedToolModel,
  type SavedToolOperationsContext,
  type SavedToolParameter,
  savedToolToStored,
  type StoredSavedTool,
  updateSavedToolOp,
  type UpdateSavedToolOptions,
} from "../lib/db/savedTools";
export { SDK_SCHEMA_VERSION, sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
export {
  type CreateModelPreferenceOptions,
  /** @deprecated Use sdkSchema instead */
  settingsStorageSchema,
  type StoredModelPreference,
  ModelPreference as StoredModelPreferenceModel,
  type UpdateModelPreferenceOptions,
} from "../lib/db/settings";
export {
  type CreateUserPreferenceOptions,
  DEFAULT_PERSONALITY_SETTINGS,
  type PersonalitySettings,
  type PersonalitySliders,
  type PersonalityStyle,
  type ProfileUpdate,
  SLIDER_CONFIG,
  type StoredUserPreference,
  UserPreference as StoredUserPreferenceModel,
  type UpdateUserPreferenceOptions,
  /** @deprecated Use sdkSchema instead */
  userPreferencesStorageSchema,
} from "../lib/db/userPreferences";
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
  TopicSkipReason,
  TurnCompleteEvent,
  TurnSkippedEvent,
} from "../lib/memory";
export type {
  MemoryToVerify,
  MemoryVerification,
  TopicExtractionInput,
  TopicExtractionRunResult,
  TopicExtractOptions,
  UncheckedReason,
  UnverifiableReason,
  VerificationSources,
  VerifyMemoriesForPublishOptions,
} from "../lib/memory";
export {
  createLocalMemoryStore,
  type LocalMemoryStoreOptions,
  type MemoryCreate,
  type MemoryListOptions,
  type MemoryMaintenance,
  type MemoryRecallOptions,
  type MemoryRetainOptions,
  type MemoryStore,
  type MemorySubscribeOptions,
  type MemoryUpdate,
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
  INTERNAL_FLOW_MARKER,
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
  withInternalFlowMarker,
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
export type { PdfExportOptions, PdfExportProgress, PdfExportStage } from "../lib/pdf-export";
export { exportElementToPdf, exportMarkdownToPdf, renderElementToCanvas } from "../lib/pdf-export";
export type {
  FileProcessingReason,
  FileProcessingStatus,
  FileProcessor,
  FileTypeQuery,
  FileWithData,
  PreprocessingOptions,
  PreprocessingResult,
  ProcessedFileResult,
  ZipProcessorOptions,
} from "../lib/processors";
export {
  ExcelProcessor,
  formatFileProcessingNotes,
  getSupportedFileTypes,
  isSupportedFile,
  PdfProcessor,
  preprocessFiles,
  ProcessorRegistry,
  TextProcessor,
  WordProcessor,
  ZipProcessor,
} from "../lib/processors";
export type {
  ChatStorageAdapter,
  ChatStorageObservable,
  ConversationQueryOptions,
  WatermelonChatStorageAdapterOptions,
} from "../lib/storage";
export {
  BlobUrlManager,
  deleteEncryptedFile,
  extractFileIds,
  extractMCPImageUrls,
  FILE_PLACEHOLDER_PREFIX,
  FILE_PLACEHOLDER_REGEX,
  fileExists,
  isOPFSSupported,
  isR2UrlExpired,
  R2_DEFAULT_TTL_MS,
  readEncryptedFile,
  resolveFilePlaceholders,
  writeEncryptedFile,
} from "../lib/storage";
export { WatermelonChatStorageAdapter } from "../lib/storage";
export type {
  CachedServerTools,
  CreateServerToolsFilterOptions,
  ParsedServerToolsResponse,
  ServerTool,
  ServerToolsOptions,
  ServerToolsResponse,
  ToolMatchOptions,
  ToolMatchResult,
  ToolSet,
} from "../lib/tools";
export type { SelectServerToolsForPromptOptions, ServerToolsFilterFunction } from "../lib/tools";
export {
  BUILT_IN_TOOL_SETS,
  clearServerToolsCache,
  createServerToolsFilter,
  DEFAULT_CACHE_EXPIRATION_MS,
  DEFAULT_EXCLUDED_SERVER_TOOLS,
  DEFAULT_SERVER_TOOLS_MATCH_OPTIONS,
  defaultServerToolsFilter,
  expandToolSetsAdditive,
  findMatchingTools,
  getCachedServerTools,
  getServerTools,
  getToolsChecksum,
  selectServerToolsForPrompt,
  SERVER_TOOL_DEPENDENCY_SETS,
  shouldRefreshTools,
  withActiveToolSetServerTools,
} from "../lib/tools";
export type {
  ModelLoadProgress,
  TranscriptionResult,
  VoiceRecording,
  WhisperModel,
} from "../lib/voice";
export { createGitHubTools } from "../tools/github";
export type { AnumaChild, AnumaNode, AttrValue, KnownTag, ThemeAttr } from "../tools/slides";
export {
  AnumaJsxError,
  findById,
  findParentOfId,
  getId,
  getNumberAttr,
  getStringAttr,
  insertAfterId,
  insertChild,
  isAnumaTag,
  isHtmlTag,
  parseJsx,
  removeById,
  replaceById,
  serializeJsx,
  SLIDE_CANVAS_HEIGHT,
  SLIDE_CANVAS_WIDTH,
  SLIDES_FILE_PATH,
  THEME_ATTRS,
  updateAttrs,
  walk,
} from "../tools/slides";
export type { DisplayToolMigrations } from "../tools/uiInteraction";
export { migrateDisplayResult } from "../tools/uiInteraction";
export type {
  AnumaShadowIsolationProviderProps,
  AnumaTheme,
  AnumaThemeProviderProps,
  CircleProps,
  DeckProps,
  GroupProps,
  IconProps,
  ImageProps,
  LineProps,
  RectProps,
  ScreenProps,
  SlideProps,
  TextProps,
} from "./anumaRuntime";
export {
  Anuma,
  AnumaShadowIsolationProvider,
  AnumaThemeProvider,
  renderAnumaJsx,
  renderAnumaTree,
  resolveThemeColor,
  useAnumaTheme,
} from "./anumaRuntime";
export type { ChartCardProps, ChartConfig } from "./chart";
export {
  ChartCard,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "./chart";
export type { LoggerProviderProps } from "./LoggerProvider";
export { LoggerProvider } from "./LoggerProvider";
export type {
  BackupOperationOptions,
  ProgressCallback,
  ProviderBackupState,
  UseBackupOptions,
  UseBackupResult,
} from "./useBackup";
export {
  DEFAULT_DRIVE_CONVERSATIONS_FOLDER as BACKUP_DRIVE_CONVERSATIONS_FOLDER,
  DEFAULT_DRIVE_ROOT_FOLDER as BACKUP_DRIVE_ROOT_FOLDER,
  DEFAULT_ICLOUD_FOLDER as BACKUP_ICLOUD_FOLDER,
  DEFAULT_DROPBOX_FOLDER,
  useBackup,
} from "./useBackup";
export type {
  BackupAuthContextValue,
  BackupAuthProviderProps,
  ProviderAuthState,
} from "./useBackupAuth";
export { BackupAuthProvider, useBackupAuth } from "./useBackupAuth";
export { useChat } from "./useChat";
export type {
  SearchMessagesOptions,
  SendMessageWithStorageArgs,
  SendMessageWithStorageResult,
  UseChatStorageOptions,
  UseChatStorageResult,
} from "./useChatStorage";
export { maskScopedEmbeddingCache, previewToolSelection, useChatStorage } from "./useChatStorage";
export type { UseCreditsOptions, UseCreditsResult } from "./useCredits";
export { useCredits } from "./useCredits";
export { useDatabaseManager } from "./useDatabaseManager";
export type { DropboxAuthContextValue, DropboxAuthProviderProps } from "./useDropboxAuth";
export {
  clearToken as clearDropboxToken,
  DropboxAuthProvider,
  hasDropboxCredentials,
  useDropboxAuth,
} from "./useDropboxAuth";
export type { UseDropboxBackupOptions, UseDropboxBackupResult } from "./useDropboxBackup";
export { DEFAULT_BACKUP_FOLDER, useDropboxBackup } from "./useDropboxBackup";
export type {
  EmbeddedWalletSignerFn,
  EncryptionKeyVersion,
  RequestEncryptionKeyOptions,
  SignMessageFn,
  SignMessageOptions,
  UseEncryptionResult,
} from "./useEncryption";
export {
  clearAllEncryptionKeys,
  clearAllEncryptionState,
  clearAllKeyPairs,
  clearEncryptionKey,
  clearKeyPair,
  decryptData,
  decryptDataBatch,
  decryptDataBytes,
  decryptDataBytesFromBytes,
  decryptDataWithKey,
  deriveKeyFromSignatureBytes,
  encryptData,
  encryptDataBatch,
  encryptDataBytes,
  encryptDataWithKey,
  EncryptionKeyMissingError,
  exportPublicKey,
  getEncryptionKey,
  hasEncryptionKey,
  hasKeyPair,
  onKeyAvailable,
  refreshEncryptionKeyIfMatches,
  requestEncryptionKey,
  requestKeyPair,
  seedEncryptionKeys,
  useEncryption,
} from "./useEncryption";
export type { UseExportPdfResult } from "./useExportPdf";
export { useExportPdf } from "./useExportPdf";
export type { UseFilesOptions, UseFilesResult } from "./useFiles";
export { useFiles } from "./useFiles";
export type {
  GoogleDriveAuthContextValue,
  GoogleDriveAuthProviderProps,
} from "./useGoogleDriveAuth";
export {
  clearGoogleDriveToken,
  getGoogleDriveStoredToken,
  GoogleDriveAuthProvider,
  hasGoogleDriveCredentials,
  useGoogleDriveAuth,
} from "./useGoogleDriveAuth";
export type {
  UseGoogleDriveBackupOptions,
  UseGoogleDriveBackupResult,
} from "./useGoogleDriveBackup";
export {
  DEFAULT_CONVERSATIONS_FOLDER as DEFAULT_DRIVE_CONVERSATIONS_FOLDER,
  DEFAULT_ROOT_FOLDER as DEFAULT_DRIVE_ROOT_FOLDER,
  useGoogleDriveBackup,
} from "./useGoogleDriveBackup";
export type { ICloudAuthContextValue, ICloudAuthProviderProps } from "./useICloudAuth";
export {
  clearICloudAuth,
  hasICloudCredentials,
  ICloudAuthProvider,
  useICloudAuth,
} from "./useICloudAuth";
export type { UseICloudBackupOptions, UseICloudBackupResult } from "./useICloudBackup";
export { DEFAULT_ICLOUD_BACKUP_FOLDER, useICloudBackup } from "./useICloudBackup";
export type { UseModelsResult } from "./useModels";
export { useModels } from "./useModels";
export type { OCRFile, UseOCRResult } from "./useOCR";
export { useOCR } from "./useOCR";
export type { PdfFile, UsePdfResult } from "./usePdf";
export { usePdf } from "./usePdf";
export type {
  PhoneCallPollingOptions,
  UsePhoneCallsOptions,
  UsePhoneCallsResult,
} from "./usePhoneCalls";
export { usePhoneCalls } from "./usePhoneCalls";
export type { UseProjectsOptions, UseProjectsResult } from "./useProjects";
export { useProjects } from "./useProjects";
export type { UseSettingsOptions, UseSettingsResult } from "./useSettings";
export { useSettings } from "./useSettings";
export type { UseSubscriptionOptions, UseSubscriptionResult } from "./useSubscription";
export { useSubscription } from "./useSubscription";
export type { UseToolsOptions, UseToolsResult } from "./useTools";
export { useTools } from "./useTools";
export type {
  InteractionType,
  PendingInteraction,
  UIInteractionContextValue,
  UIInteractionProviderProps,
} from "./useUIInteraction";
export { UIInteractionProvider, useUIInteraction } from "./useUIInteraction";
export type { UseVoiceOptions, UseVoiceResult } from "./useVoice";
export { useVoice } from "./useVoice";
export type { UseWalletBindingOptions, UseWalletBindingResult } from "./useWalletBinding";
export { useWalletBinding } from "./useWalletBinding";
