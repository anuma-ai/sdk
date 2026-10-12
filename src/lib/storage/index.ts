/**
 * Storage utilities for the SDK.
 */

export type {
  ChatStorageAdapter,
  ChatStorageObservable,
  ConversationQueryOptions,
} from "./ChatStorageAdapter";
export { extractMCPImageUrls } from "./mcpImages";
export {
  BlobUrlManager,
  createFilePlaceholder,
  deleteEncryptedFile,
  extractFileIds,
  FILE_PLACEHOLDER_PREFIX,
  FILE_PLACEHOLDER_REGEX,
  fileExists,
  isOPFSSupported,
  readEncryptedFile,
  resolveFilePlaceholders,
  writeEncryptedFile,
} from "./opfs";
export { isR2UrlExpired, R2_DEFAULT_TTL_MS } from "./r2Expiry";
export type { WatermelonChatStorageAdapterOptions } from "./WatermelonChatStorageAdapter";
export { WatermelonChatStorageAdapter } from "./WatermelonChatStorageAdapter";
