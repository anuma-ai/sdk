/**
 *
 * The `@reverbia/sdk/react` package provides a collection of React hooks
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
 * import { useChat } from "@reverbia/sdk/react";
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
 *       model: "gpt-4o-mini",
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
export { useChat } from "./useChat";
export {
  useEncryption,
  requestEncryptionKey,
  getEncryptionKey,
  hasEncryptionKey,
  encryptData,
  decryptData,
  decryptDataBytes,
  clearEncryptionKey,
  clearAllEncryptionKeys,
  requestKeyPair,
  exportPublicKey,
  hasKeyPair,
  clearKeyPair,
  clearAllKeyPairs,
} from "./useEncryption";
export type {
  SignMessageFn,
  SignMessageOptions,
  EmbeddedWalletSignerFn,
  UseEncryptionResult,
} from "./useEncryption";

export {
  useChatStorage,
  replaceUrlWithMCPPlaceholder,
  findFileIdBySourceUrl,
} from "./useChatStorage";
export type {
  UseChatStorageOptions,
  UseChatStorageResult,
  SendMessageWithStorageArgs,
  SendMessageWithStorageResult,
  SearchMessagesOptions,
} from "./useChatStorage";

// OPFS encrypted storage utilities
export {
  isOPFSSupported,
  writeEncryptedFile,
  readEncryptedFile,
  deleteEncryptedFile,
  fileExists,
  BlobUrlManager,
} from "../lib/storage";

// Consolidated SDK schema exports (recommended)
export {
  sdkSchema,
  sdkMigrations,
  sdkModelClasses,
} from "../lib/db/schema";

// Individual schema exports (deprecated - use sdkSchema instead)
export {
  /** @deprecated Use sdkSchema instead */
  chatStorageSchema,
  /** @deprecated Use sdkMigrations instead */
  chatStorageMigrations,
  Message as ChatMessage,
  Conversation as ChatConversation,
  type ChatRole,
  type FileMetadata,
  type ChatCompletionUsage as StoredChatCompletionUsage,
  type SearchSource,
  type StoredMessage,
  type StoredMessageWithSimilarity,
  type StoredConversation,
  type StoredFileWithContext,
  type CreateMessageOptions,
  type CreateConversationOptions,
  generateConversationId,
  updateConversationProjectOp,
  getConversationsByProjectOp,
} from "../lib/db/chat";

// Project storage exports
export {
  Project,
  type StoredProject,
  type CreateProjectOptions,
  type UpdateProjectOptions,
  generateProjectId,
  type ProjectOperationsContext,
  projectToStored,
  createProjectOp,
  getProjectOp,
  getProjectsOp,
  updateProjectNameOp,
  updateProjectOp,
  deleteProjectOp,
  getProjectConversationsOp,
  getProjectConversationCountOp,
} from "../lib/db/project";
export { useMemoryStorage } from "./useMemoryStorage";
export type {
  UseMemoryStorageOptions,
  UseMemoryStorageResult,
} from "./useMemoryStorage";
export {
  /** @deprecated Use sdkSchema instead */
  memoryStorageSchema,
  Memory as StoredMemoryModel,
  type MemoryType,
  type MemoryItem,
  type StoredMemory,
  type StoredMemoryWithSimilarity,
  type CreateMemoryOptions,
  type UpdateMemoryOptions,
  generateCompositeKey,
  generateUniqueKey,
} from "../lib/db/memory";
export { useSettings } from "./useSettings";
export type { UseSettingsOptions, UseSettingsResult } from "./useSettings";
export {
  /** @deprecated Use sdkSchema instead */
  settingsStorageSchema,
  ModelPreference as StoredModelPreferenceModel,
  type StoredModelPreference,
  type CreateModelPreferenceOptions,
  type UpdateModelPreferenceOptions,
} from "../lib/db/settings";

// User preferences (unified settings storage)
export {
  /** @deprecated Use sdkSchema instead */
  userPreferencesStorageSchema,
  UserPreference as StoredUserPreferenceModel,
  // Personality types
  type PersonalitySliders,
  type PersonalityStyle,
  type PersonalitySettings,
  DEFAULT_PERSONALITY_SETTINGS,
  SLIDER_CONFIG,
  // User preference types
  type StoredUserPreference,
  type CreateUserPreferenceOptions,
  type UpdateUserPreferenceOptions,
  type ProfileUpdate,
} from "../lib/db/userPreferences";
export { usePdf } from "./usePdf";
export type { PdfFile, UsePdfResult } from "./usePdf";
export { useOCR } from "./useOCR";
export type { OCRFile, UseOCRResult } from "./useOCR";

// File processors for preprocessing attachments
export {
  PdfProcessor,
  ExcelProcessor,
  WordProcessor,
  ZipProcessor,
  ProcessorRegistry,
  preprocessFiles,
} from "../lib/processors";
export type {
  FileProcessor,
  FileWithData,
  ProcessedFileResult,
  PreprocessingOptions,
  PreprocessingResult,
  ZipProcessorOptions,
} from "../lib/processors";
export { useModels } from "./useModels";
export type { UseModelsResult } from "./useModels";
export {
  formatMemoriesForChat,
  createMemoryContextSystemMessage,
  extractConversationContext,
} from "../lib/memory/chat";

// Server-side tools caching utilities
export {
  clearServerToolsCache,
  getServerTools,
  getCachedServerTools,
  DEFAULT_CACHE_EXPIRATION_MS,
} from "../lib/tools";
export type {
  ServerToolsOptions,
  CachedServerTools,
  ServerToolsResponse,
} from "../lib/tools";

export { useDropboxBackup, DEFAULT_BACKUP_FOLDER } from "./useDropboxBackup";
export type {
  UseDropboxBackupOptions,
  UseDropboxBackupResult,
} from "./useDropboxBackup";
export type {
  DropboxExportResult,
  DropboxImportResult,
} from "../lib/backup/dropbox/backup";

export {
  DropboxAuthProvider,
  useDropboxAuth,
  clearToken as clearDropboxToken,
  hasDropboxCredentials,
} from "./useDropboxAuth";
export type {
  DropboxAuthProviderProps,
  DropboxAuthContextValue,
} from "./useDropboxAuth";

export {
  GoogleDriveAuthProvider,
  useGoogleDriveAuth,
  getGoogleDriveStoredToken,
  clearGoogleDriveToken,
  hasGoogleDriveCredentials,
} from "./useGoogleDriveAuth";
export type {
  GoogleDriveAuthProviderProps,
  GoogleDriveAuthContextValue,
} from "./useGoogleDriveAuth";

export {
  useGoogleDriveBackup,
  DEFAULT_ROOT_FOLDER as DEFAULT_DRIVE_ROOT_FOLDER,
  DEFAULT_CONVERSATIONS_FOLDER as DEFAULT_DRIVE_CONVERSATIONS_FOLDER,
} from "./useGoogleDriveBackup";
export type {
  UseGoogleDriveBackupOptions,
  UseGoogleDriveBackupResult,
} from "./useGoogleDriveBackup";
export type {
  GoogleDriveExportResult,
  GoogleDriveImportResult,
} from "../lib/backup/google/backup";

// iCloud backup
export {
  ICloudAuthProvider,
  useICloudAuth,
  hasICloudCredentials,
  clearICloudAuth,
} from "./useICloudAuth";
export type {
  ICloudAuthProviderProps,
  ICloudAuthContextValue,
} from "./useICloudAuth";

export {
  useICloudBackup,
  DEFAULT_ICLOUD_BACKUP_FOLDER,
} from "./useICloudBackup";
export type {
  UseICloudBackupOptions,
  UseICloudBackupResult,
} from "./useICloudBackup";
export type {
  ICloudExportResult,
  ICloudImportResult,
} from "../lib/backup/icloud/backup";

// Unified backup providers and hooks
export { BackupAuthProvider, useBackupAuth } from "./useBackupAuth";
export type {
  BackupAuthProviderProps,
  BackupAuthContextValue,
  ProviderAuthState,
} from "./useBackupAuth";

export {
  useBackup,
  DEFAULT_DROPBOX_FOLDER,
  DEFAULT_DRIVE_ROOT_FOLDER as BACKUP_DRIVE_ROOT_FOLDER,
  DEFAULT_DRIVE_CONVERSATIONS_FOLDER as BACKUP_DRIVE_CONVERSATIONS_FOLDER,
  DEFAULT_ICLOUD_FOLDER as BACKUP_ICLOUD_FOLDER,
} from "./useBackup";
export type {
  UseBackupOptions,
  UseBackupResult,
  ProviderBackupState,
  BackupOperationOptions,
  ProgressCallback,
} from "./useBackup";

// Google Calendar Auth (with calendar scopes for full calendar access)
export {
  startCalendarAuth,
  handleCalendarCallback,
  isCalendarCallback,
  getValidCalendarToken,
  getCalendarAccessToken,
  refreshCalendarToken,
  revokeCalendarToken,
  clearCalendarToken,
  storeCalendarToken,
  hasCalendarCredentials,
  storeCalendarReturnUrl,
  getAndClearCalendarReturnUrl,
  storeCalendarPendingMessage,
  getAndClearCalendarPendingMessage,
} from "../lib/auth/google-calendar";

// Google Drive Auth (with drive.readonly scope for full read access)
// Note: This is different from GoogleDriveAuthProvider which uses drive.file scope
export {
  startDriveAuth,
  handleDriveCallback,
  isDriveCallback,
  getValidDriveToken,
  getDriveAccessToken,
  refreshDriveToken,
  revokeDriveToken,
  clearDriveToken,
  storeDriveToken,
  hasDriveCredentials,
  storeDriveReturnUrl,
  getAndClearDriveReturnUrl,
  storeDrivePendingMessage,
  getAndClearDrivePendingMessage,
} from "../lib/auth/google-drive";
