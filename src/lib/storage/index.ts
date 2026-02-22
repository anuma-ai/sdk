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
  FILE_PLACEHOLDER_SUFFIX,
  FILE_PLACEHOLDER_REGEX,
  createFilePlaceholder,
  extractFileIds,
  resolveFilePlaceholders,
  // Blob URL management
  BlobUrlManager,
} from "./opfs";

export {
  // MCP image URL extraction and placeholder replacement
  extractMCPImageUrls,
  replaceMCPUrlsWithPlaceholders,
  type ToolCallEvent,
  type ExtractedImageUrl,
} from "./mcpImages";
