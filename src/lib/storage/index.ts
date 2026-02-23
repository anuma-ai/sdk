/**
 * Storage utilities for the SDK.
 */

export {
  // OPFS utilities
  isOPFSSupported,
  writeEncryptedFile,
  readEncryptedFile,
  deleteEncryptedFile,
  fileExists,
  // Placeholder utilities
  FILE_PLACEHOLDER_PREFIX,
  FILE_PLACEHOLDER_REGEX,
  createFilePlaceholder,
  extractFileIds,
  resolveFilePlaceholders,
  // Blob URL management
  BlobUrlManager,
} from "./opfs";
