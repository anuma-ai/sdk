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

export type { PgPoolLike, PostgreSQLAdapterOptions } from "./pg-adapter";
export { PostgreSQLAdapter, schemaToCreateSQL } from "./pg-adapter";

// ── Schema & Models ──

export { SDK_SCHEMA_VERSION, sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

// ── Chat (conversations + messages) ──

export {
  Conversation,
  Message,
  clearMessagesOp,
  createConversationOp,
  createMessageOp,
  deleteConversationOp,
  getAllFilesOp,
  getConversationOp,
  getConversationsByProjectOp,
  getConversationsOp,
  getMessagesOp,
  makeSyntheticStoredConversation,
  makeSyntheticStoredMessage,
  searchChunksOp,
  searchMessagesOp,
  type StorageOperationsContext,
  updateConversationProjectOp,
  updateConversationTitleOp,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
  updateMessageErrorOp,
  updateMessageFeedbackOp,
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
  type StoredFileWithContext,
  type StoredMessage,
  type StoredMessageWithSimilarity,
} from "../lib/db/chat";

// ── Memory Vault ──

export {
  VaultMemory,
  createVaultMemoriesBatchOp,
  createVaultMemoryOp,
  deleteVaultMemoryOp,
  getAllVaultMemoriesOp,
  getAllVaultMemoryContentsOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
  type CreateVaultMemoryOptions,
  type StoredVaultMemory,
  type UpdateVaultMemoryOptions,
} from "../lib/db/memoryVault";

// ── Projects ──

export {
  Project,
  createProjectOp,
  deleteProjectOp,
  getProjectConversationCountOp,
  getProjectConversationsOp,
  getProjectOp,
  getProjectsOp,
  type ProjectOperationsContext,
  projectToStored,
  updateProjectNameOp,
  updateProjectOp,
  type CreateProjectOptions,
  generateProjectId,
  type StoredProject,
  type UpdateProjectOptions,
} from "../lib/db/project";

// ── Media ──

export {
  Media,
  createMediaBatchOp,
  createMediaOp,
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
  searchMediaOp,
  type StoredMedia,
  type CreateMediaOptions,
  updateMediaMessageIdBatchOp,
  updateMediaOp,
  type UpdateMediaOptions,
} from "../lib/db/media";

// ── User Preferences ──

export {
  UserPreference,
  deleteUserPreferenceOp,
  getUserPreferenceOp,
  migrateFromModelPreferencesOp,
  setUserPreferenceOp,
  updateModelsOp,
  updatePersonalityOp,
  updateProfileOp,
  type UserPreferencesStorageOperationsContext,
  type CreateUserPreferenceOptions,
  DEFAULT_PERSONALITY_SETTINGS,
  type PersonalitySettings,
  type PersonalitySliders,
  type PersonalityStyle,
  type ProfileUpdate,
  SLIDER_CONFIG,
  type StoredUserPreference,
  type UpdateUserPreferenceOptions,
} from "../lib/db/userPreferences";

// ── Settings (deprecated, use userPreferences) ──

export {
  ModelPreference,
  deleteModelPreferenceOp,
  getModelPreferenceOp,
  setModelPreferenceOp,
  type SettingsStorageOperationsContext,
  type CreateModelPreferenceOptions,
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
