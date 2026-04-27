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
export type { StepFinishEvent } from "../lib/chat/toolLoop";
export { ProviderStreamError } from "../lib/chat/toolLoop";
export type { ToolCallArgumentsDeltaEvent } from "../lib/chat/useChat/utils";
export { useChat } from "./useChat";

// Pluggable logger
export type { Logger } from "../lib/logger";
export { consoleLogger, getLogger, noopLogger, setLogger } from "../lib/logger";
export type { LoggerProviderProps } from "./LoggerProvider";
export { LoggerProvider } from "./LoggerProvider";

// Chart display components
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

// UI Interaction infrastructure
export type { DisplayToolMigrations } from "../tools/uiInteraction";
export { migrateDisplayResult } from "../tools/uiInteraction";
export type {
  EmbeddedWalletSignerFn,
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
  decryptDataWithKey,
  encryptData,
  // Batch operations for performance (single key lookup)
  encryptDataBatch,
  encryptDataWithKey,
  exportPublicKey,
  getEncryptionKey,
  hasEncryptionKey,
  hasKeyPair,
  onKeyAvailable,
  requestEncryptionKey,
  requestKeyPair,
  useEncryption,
} from "./useEncryption";
export type {
  InteractionType,
  PendingInteraction,
  UIInteractionContextValue,
  UIInteractionProviderProps,
} from "./useUIInteraction";
export { UIInteractionProvider, useUIInteraction } from "./useUIInteraction";

// Write queue for encryption-pending operations
export type {
  FlushResult,
  OperationExecutor,
  QueuedOperation,
  QueuedOperationType,
  QueueEncryptionContext,
  QueueStatus,
} from "../lib/db/queue";
export { QueueManager, queueManager, WalletPoller } from "../lib/db/queue";
export type {
  SearchMessagesOptions,
  SendMessageWithStorageArgs,
  SendMessageWithStorageResult,
  UseChatStorageOptions,
  UseChatStorageResult,
} from "./useChatStorage";
export { useChatStorage } from "./useChatStorage";

// OPFS encrypted storage utilities
export {
  BlobUrlManager,
  deleteEncryptedFile,
  extractFileIds,
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

// Consolidated SDK schema exports (recommended)
export { SDK_SCHEMA_VERSION, sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

// Database manager for per-wallet isolation
export type {
  DatabaseManagerLogger,
  DatabaseManagerOptions,
  PlatformStorage,
} from "../lib/db/manager";
export { DatabaseManager, webPlatformStorage } from "../lib/db/manager";
export { useDatabaseManager } from "./useDatabaseManager";

// Individual schema exports (deprecated - use sdkSchema instead)
export {
  Conversation as ChatConversation,
  Message as ChatMessage,
  type ChatRole,
  /** @deprecated Use sdkMigrations instead */
  chatStorageMigrations,
  /** @deprecated Use sdkSchema instead */
  chatStorageSchema,
  type ChunkSearchResult,
  type ClientToolsFilterFn,
  type CreateConversationOptions,
  type CreateMessageOptions,
  type FileMetadata,
  generateConversationId,
  getConversationsByProjectOp,
  type MessageChunk,
  type MessageFeedback,
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
  updateConversationProjectOp,
  updateMessageFeedbackOp,
} from "../lib/db/chat";

// Project storage exports
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
export type { UseFilesOptions, UseFilesResult } from "./useFiles";
export { useFiles } from "./useFiles";
export type { UseProjectsOptions, UseProjectsResult } from "./useProjects";
export { useProjects } from "./useProjects";
// Memory vault
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
  VaultMemory as StoredVaultMemoryModel,
  updateVaultMemoryEmbeddingOp,
  updateVaultMemoryOp,
  type UpdateVaultMemoryOptions,
  type VaultMemoryOperationsContext,
} from "../lib/db/memoryVault";
// Vault folders
export {
  type CreateModelPreferenceOptions,
  /** @deprecated Use sdkSchema instead */
  settingsStorageSchema,
  type StoredModelPreference,
  ModelPreference as StoredModelPreferenceModel,
  type UpdateModelPreferenceOptions,
} from "../lib/db/settings";
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
export type { UseSettingsOptions, UseSettingsResult } from "./useSettings";
export { useSettings } from "./useSettings";

// User preferences (unified settings storage)
export {
  type CreateUserPreferenceOptions,
  DEFAULT_PERSONALITY_SETTINGS,
  type PersonalitySettings,
  // Personality types
  type PersonalitySliders,
  type PersonalityStyle,
  type ProfileUpdate,
  SLIDER_CONFIG,
  // User preference types
  type StoredUserPreference,
  UserPreference as StoredUserPreferenceModel,
  type UpdateUserPreferenceOptions,
  /** @deprecated Use sdkSchema instead */
  userPreferencesStorageSchema,
} from "../lib/db/userPreferences";

// Media library storage
export {
  createMediaBatchOp,
  createMediaOp,
  type CreateMediaOptions,
  deleteMediaByConversationOp,
  deleteMediaByMessageOp,
  deleteMediaOp,
  // Utility functions
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
  // Library query operations
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
  // CRUD operations
  mediaToStored,
  // Types
  type MediaType,
  searchMediaOp,
  type StoredMedia,
  Media as StoredMediaModel,
  updateMediaMessageIdBatchOp,
  updateMediaOp,
  type UpdateMediaOptions,
} from "../lib/db/media";

// App files storage (LLM-generated app source files)
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

// Saved tools storage
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
export type { PdfExportOptions, PdfExportProgress, PdfExportStage } from "../lib/pdf-export";
export { exportElementToPdf, exportMarkdownToPdf, renderElementToCanvas } from "../lib/pdf-export";
export type {
  ModelLoadProgress,
  TranscriptionResult,
  VoiceRecording,
  WhisperModel,
} from "../lib/voice";
export type { UseExportPdfResult } from "./useExportPdf";
export { useExportPdf } from "./useExportPdf";
export type { OCRFile, UseOCRResult } from "./useOCR";
export { useOCR } from "./useOCR";
export type { PdfFile, UsePdfResult } from "./usePdf";
export { usePdf } from "./usePdf";
export type { UseVoiceOptions, UseVoiceResult } from "./useVoice";
export { useVoice } from "./useVoice";

// File processors for preprocessing attachments
export type {
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
  getSupportedFileTypes,
  isSupportedFile,
  PdfProcessor,
  preprocessFiles,
  ProcessorRegistry,
  TextProcessor,
  WordProcessor,
  ZipProcessor,
} from "../lib/processors";
export type { UseCreditsOptions, UseCreditsResult } from "./useCredits";
export { useCredits } from "./useCredits";
export type { UseModelsResult } from "./useModels";
export { useModels } from "./useModels";
export type {
  PhoneCallPollingOptions,
  UsePhoneCallsOptions,
  UsePhoneCallsResult,
} from "./usePhoneCalls";
export { usePhoneCalls } from "./usePhoneCalls";
export type { UseSubscriptionOptions, UseSubscriptionResult } from "./useSubscription";
export { useSubscription } from "./useSubscription";

// Memory engine (semantic search over past messages)
export type {
  ChunkingOptions,
  EmbeddingOptions as MemoryEngineEmbeddingOptions,
  MemoryEngineResult,
  MemoryEngineSearchOptions,
  TextChunk,
} from "../lib/memoryEngine";
export {
  chunkAndEmbedAllMessages,
  // Chunking functions for sub-message semantic search
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

// Server-side tools caching utilities
export type { DropboxExportResult, DropboxImportResult } from "../lib/backup/dropbox/backup";
export type { GoogleDriveExportResult, GoogleDriveImportResult } from "../lib/backup/google/backup";
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
export type { UseToolsOptions, UseToolsResult } from "./useTools";
export { useTools } from "./useTools";

// iCloud backup
export type { ICloudExportResult, ICloudImportResult } from "../lib/backup/icloud/backup";
export type { ICloudAuthContextValue, ICloudAuthProviderProps } from "./useICloudAuth";
export {
  clearICloudAuth,
  hasICloudCredentials,
  ICloudAuthProvider,
  useICloudAuth,
} from "./useICloudAuth";
export type { UseICloudBackupOptions, UseICloudBackupResult } from "./useICloudBackup";
export { DEFAULT_ICLOUD_BACKUP_FOLDER, useICloudBackup } from "./useICloudBackup";

// Unified backup providers and hooks
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

// Google Calendar Auth (with calendar scopes for full calendar access)
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
  startCalendarAuth,
  storeCalendarPendingMessage,
  storeCalendarReturnUrl,
  storeCalendarToken,
} from "../lib/auth/google-calendar";

// Google Drive Auth (with drive.readonly scope for full read access)
// Note: This is different from GoogleDriveAuthProvider which uses drive.file scope
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
  startDriveAuth,
  storeDrivePendingMessage,
  storeDriveReturnUrl,
  storeDriveToken,
} from "../lib/auth/google-drive";

// Notion MCP Auth (with PKCE - fully client-side, no backend needed)
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

// GitHub Auth (with repo scope for full repository access)
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

// GitHub Tools (repo access: search, read, issues, PRs, reviews, commits)
export { createGitHubTools } from "../tools/github";

// Anuma JSX runtime — React components that render <Anuma.*> primitives
// and parsed AnumaNode trees. Pair with AnumaThemeProvider.
export type {
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
  AnumaThemeProvider,
  renderAnumaJsx,
  renderAnumaTree,
  resolveThemeColor,
  useAnumaTheme,
} from "./anumaRuntime";
