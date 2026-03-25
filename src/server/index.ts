/**
 * Server-side entry point for `@anuma/sdk/server`.
 *
 * Provides the same database schema, models, and operations that run in the
 * browser via `@anuma/sdk/react`, but without React dependencies. Use this to
 * run the full Anuma data model (conversations, messages, memory vault,
 * projects, media, user preferences) on a Node.js server.
 *
 * @example
 * ```typescript
 * import {
 *   DatabaseManager,
 *   serverPlatformStorage,
 *   sdkSchema,
 *   sdkMigrations,
 *   createConversationOp,
 *   createMessageOp,
 * } from "@anuma/sdk/server";
 * import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
 *
 * const dbManager = new DatabaseManager({
 *   dbNamePrefix: "anuma-server",
 *   createAdapter: (dbName, schema, migrations) =>
 *     new LokiJSAdapter({ schema, migrations, dbName, useWebWorker: false, useIncrementalIndexedDB: false }),
 *   storage: serverPlatformStorage(),
 * });
 *
 * const db = dbManager.getDatabase(walletAddress);
 * ```
 *
 * @module server
 */

// ── Database Manager ──

export type {
  DatabaseManagerLogger,
  DatabaseManagerOptions,
  PlatformStorage,
} from "../lib/db/manager";
export { DatabaseManager } from "../lib/db/manager";

// ── Server Platform Storage ──

export { serverPlatformStorage } from "./storage";

// ── PostgreSQL Adapter ──

export type { PgClientLike, PgPoolLike, PostgreSQLAdapterOptions } from "./pg-adapter";
export { PostgreSQLAdapter, schemaToCreateSQL } from "./pg-adapter";

// ── Schema & Models ──

export { SDK_SCHEMA_VERSION, sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

// ── Chat (conversations + messages) ──

export {
  clearMessagesOp,
  Conversation,
  ConversationSummary,
  createConversationOp,
  createMessageOp,
  createSummaryContext,
  deleteConversationOp,
  deleteConversationSummaryOp,
  getAllFilesOp,
  getConversationOp,
  getConversationsByProjectOp,
  getConversationsOp,
  getConversationSummaryOp,
  getMessagesOp,
  makeSyntheticStoredConversation,
  makeSyntheticStoredMessage,
  Message,
  searchChunksOp,
  searchMessagesOp,
  type StorageOperationsContext,
  updateConversationProjectOp,
  updateConversationTitleOp,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
  updateMessageErrorOp,
  updateMessageFeedbackOp,
  upsertConversationSummaryOp,
} from "../lib/db/chat";
export {
  type ChatCompletionUsage,
  type ChatRole,
  type ChunkSearchResult,
  type CreateConversationOptions,
  type CreateMessageOptions,
  type FileMetadata,
  generateConversationId,
  type MessageChunk,
  type MessageFeedback,
  type SearchSource,
  type StoredConversation,
  type StoredConversationSummary,
  type StoredFileWithContext,
  type StoredMessage,
  type StoredMessageWithSimilarity,
} from "../lib/db/chat";

// ── Summarization ──

export {
  cleanupConversationSummary,
  DEFAULT_SUMMARY_MIN_WINDOW_MESSAGES,
  DEFAULT_SUMMARY_MODEL,
  DEFAULT_SUMMARY_TOKEN_THRESHOLD,
  estimateMessagesTokens,
  estimateTokens,
  MAX_MESSAGES_PER_SUMMARIZATION,
  maybeSummarizeHistory,
  progressiveSummarize,
  splitMessagesAtThreshold,
  summaryToSystemMessage,
} from "../lib/chat/summarize";

// ── Memory Vault ──

export {
  createVaultMemoriesBatchOp,
  createVaultMemoryOp,
  type CreateVaultMemoryOptions,
  deleteAllVaultMemoriesForUserOp,
  deleteVaultMemoryOp,
  getAllVaultMemoriesOp,
  getAllVaultMemoryContentsOp,
  getUnfiledVaultMemoriesOp,
  getVaultMemoryOp,
  type StoredVaultMemory,
  updateVaultMemoryEmbeddingOp,
  updateVaultMemoryOp,
  type UpdateVaultMemoryOptions,
  VaultMemory,
  type VaultMemoryOperationsContext,
} from "../lib/db/memoryVault";

// ── Vault Folders ──

export {
  createVaultFolderOp,
  type CreateVaultFolderOptions,
  deleteVaultFolderOp,
  ensureDefaultFoldersOp,
  getAllVaultFoldersOp,
  getVaultFolderMemoryCountOp,
  moveMemoriesToFolderOp,
  type StoredVaultFolder,
  updateVaultFolderContextOp,
  updateVaultFolderOp,
  type UpdateVaultFolderOptions,
  VaultFolder,
  type VaultFolderOperationsContext,
} from "../lib/db/vaultFolders";

// ── Projects ──

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

// ── Media ──

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
  Media,
  type MediaDimensions,
  type MediaFilterOptions,
  type MediaMetadata,
  type MediaOperationsContext,
  type MediaRole,
  mediaToStored,
  type MediaType,
  searchMediaOp,
  type StoredMedia,
  updateMediaMessageIdBatchOp,
  updateMediaOp,
  type UpdateMediaOptions,
} from "../lib/db/media";

// ── User Preferences ──

export {
  type CreateUserPreferenceOptions,
  DEFAULT_PERSONALITY_SETTINGS,
  deleteUserPreferenceOp,
  getUserPreferenceOp,
  migrateFromModelPreferencesOp,
  type PersonalitySettings,
  type PersonalitySliders,
  type PersonalityStyle,
  type ProfileUpdate,
  setUserPreferenceOp,
  SLIDER_CONFIG,
  type StoredUserPreference,
  updateModelsOp,
  updatePersonalityOp,
  updateProfileOp,
  type UpdateUserPreferenceOptions,
  UserPreference,
  type UserPreferencesStorageOperationsContext,
} from "../lib/db/userPreferences";

// ── Settings (deprecated, use userPreferences) ──

export {
  type CreateModelPreferenceOptions,
  deleteModelPreferenceOp,
  getModelPreferenceOp,
  ModelPreference,
  setModelPreferenceOp,
  type SettingsStorageOperationsContext,
  type StoredModelPreference,
  type UpdateModelPreferenceOptions,
} from "../lib/db/settings";

// ── Memory Engine (semantic search) ──

export type {
  ChunkingOptions,
  EmbeddingOptions as MemoryEngineEmbeddingOptions,
  MemoryEngineResult,
  MemoryEngineSearchOptions,
  TextChunk,
} from "../lib/memoryEngine";
export {
  chunkAndEmbedAllMessages,
  chunkAndEmbedMessage,
  chunkText,
  createMemoryEngineTool,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MIN_CHUNK_SIZE,
  embedAllMessages,
  embedMessage,
  generateEmbedding,
  generateEmbeddings,
  shouldChunkMessage,
} from "../lib/memoryEngine";

// ── Memory Vault Tools ──

export {
  createMemoryVaultSearchTool,
  createMemoryVaultTool,
  createVaultEmbeddingCache,
  DEFAULT_VAULT_CACHE_SIZE,
  eagerEmbedContent,
  type MemoryVaultSearchOptions,
  type MemoryVaultToolOptions,
  preEmbedVaultMemories,
  searchVaultMemories,
  type VaultEmbeddingCache,
  type VaultSaveOperation,
  type VaultSearchResult,
} from "../lib/memoryVault";

// ── Server Tools ──

export type {
  CachedServerTools,
  ParsedServerToolsResponse,
  ServerTool,
  ServerToolsOptions,
  ServerToolsResponse,
  ToolMatchOptions,
  ToolMatchResult,
} from "../lib/tools";
export {
  clearServerToolsCache,
  DEFAULT_CACHE_EXPIRATION_MS,
  findMatchingTools,
  getCachedServerTools,
  getServerTools,
  getToolsChecksum,
  shouldRefreshTools,
} from "../lib/tools";

// ── Encryption (non-React utilities) ──

export type { EmbeddedWalletSignerFn, SignMessageFn } from "../react/useEncryption";
export {
  clearAllEncryptionKeys,
  clearAllKeyPairs,
  clearEncryptionKey,
  clearKeyPair,
  decryptData,
  decryptDataBatch,
  decryptDataBytes,
  decryptDataWithKey,
  encryptData,
  encryptDataBatch,
  encryptDataWithKey,
  exportPublicKey,
  getEncryptionKey,
  hasEncryptionKey,
  hasKeyPair,
  onKeyAvailable,
  requestEncryptionKey,
  requestKeyPair,
} from "../react/useEncryption";

// ── Queue Manager ──

export type {
  FlushResult,
  OperationExecutor,
  QueuedOperation,
  QueuedOperationType,
  QueueEncryptionContext,
  QueueStatus,
} from "../lib/db/queue";
export { QueueManager, queueManager, WalletPoller } from "../lib/db/queue";

// ── File Processors (Node.js-compatible) ──

export type {
  FileProcessor,
  FileWithData,
  PreprocessingOptions,
  PreprocessingResult,
  ProcessedFileResult,
  ZipProcessorOptions,
} from "../lib/processors";
export {
  ExcelProcessor,
  PdfProcessor,
  preprocessFiles,
  ProcessorRegistry,
  WordProcessor,
  ZipProcessor,
} from "../lib/processors";

// ── Tool Loop (framework-agnostic agent core) ──

export type {
  AutoExecutedToolResult,
  RunToolLoopOptions,
  RunToolLoopResult,
  StepFinishEvent,
  StreamingTransport,
  StreamingTransportOptions,
  StreamingTransportResult,
} from "../lib/chat/toolLoop";
export { runToolLoop } from "../lib/chat/toolLoop";
export type { ApiResponse, ApiType } from "../lib/chat/useChat/strategies/types";
export type { StreamSmoothingConfig } from "../lib/chat/useChat/StreamSmoother";
export type { ToolConfig, ToolExecutor } from "../lib/chat/useChat/types";
export type { ServerToolCallEvent } from "../lib/chat/useChat/utils";
