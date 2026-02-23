/**
 * Storage utilities for the SDK.
 */

export {
  // Blob URL management
  BlobUrlManager,
  createFilePlaceholder,
  deleteEncryptedFile,
  extractFileIds,
  // Placeholder utilities
  FILE_PLACEHOLDER_PREFIX,
  FILE_PLACEHOLDER_REGEX,
  fileExists,
  // OPFS utilities
  isOPFSSupported,
  readEncryptedFile,
  resolveFilePlaceholders,
  writeEncryptedFile,
} from "./opfs";
