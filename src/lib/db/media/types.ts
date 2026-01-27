import { v7 as uuidv7 } from "uuid";
import type { Database } from "@nozbe/watermelondb";

/**
 * Media type categorization for library filtering.
 * - image: PNG, JPG, GIF, WebP, SVG, etc.
 * - video: MP4, WebM, MOV, etc.
 * - audio: MP3, WAV, OGG, etc.
 * - document: PDF, DOCX, XLSX, TXT, etc.
 */
export type MediaType = "image" | "video" | "audio" | "document";

/**
 * Role indicating who attached the media.
 * - user: Uploaded by the user
 * - assistant: Generated/attached by the AI
 */
export type MediaRole = "user" | "assistant";

/**
 * Dimensions for images and videos.
 */
export interface MediaDimensions {
  width: number;
  height: number;
}

/**
 * Additional metadata that varies by media type.
 * Stored as JSON for flexibility.
 */
export interface MediaMetadata {
  // Video/Audio specific
  codec?: string;
  bitrate?: number;
  frameRate?: number;

  // Image specific
  colorSpace?: string;
  hasAlpha?: boolean;

  // Document specific
  pageCount?: number;
  author?: string;

  // Generation specific (for AI-generated media)
  prompt?: string;
  seed?: number;
  steps?: number;

  // Any additional metadata
  [key: string]: unknown;
}

/**
 * Stored media record as returned from the database.
 */
export interface StoredMedia {
  /** WatermelonDB record ID */
  id: string;
  /** Unique media ID (used as OPFS key) */
  mediaId: string;
  /** Wallet address of the user who owns this media */
  walletAddress: string;
  /** Associated message ID (if attached to a message) */
  messageId?: string;
  /** Associated conversation ID (for quick filtering) */
  conversationId?: string;

  // Basic info
  /** Display name of the file */
  name: string;
  /** MIME type (e.g., "image/png", "video/mp4") */
  mimeType: string;
  /** Categorized media type for filtering */
  mediaType: MediaType;
  /** File size in bytes */
  size: number;

  // Origin
  /** Role of who attached this media */
  role: MediaRole;
  /** AI model used for generation (if AI-generated) */
  model?: string;

  /** Original external URL for cached files (MCP R2, etc.) */
  sourceUrl?: string;

  // Media-specific
  /** Dimensions for images/videos */
  dimensions?: MediaDimensions;
  /** Duration in seconds for video/audio */
  duration?: number;
  /** Additional metadata */
  metadata?: MediaMetadata;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Soft delete
  isDeleted: boolean;
}

/**
 * Options for creating a new media record.
 */
export interface CreateMediaOptions {
  /** Wallet address of the user */
  walletAddress: string;
  /** Associated message ID (optional) */
  messageId?: string;
  /** Associated conversation ID (optional) */
  conversationId?: string;

  // Required fields
  name: string;
  mimeType: string;
  mediaType: MediaType;
  size: number;
  role: MediaRole;

  // Optional fields
  model?: string;
  sourceUrl?: string;
  dimensions?: MediaDimensions;
  duration?: number;
  metadata?: MediaMetadata;
}

/**
 * Options for updating an existing media record.
 */
export interface UpdateMediaOptions {
  name?: string;
  sourceUrl?: string;
  dimensions?: MediaDimensions;
  duration?: number;
  metadata?: MediaMetadata;
  isDeleted?: boolean;
}

/**
 * Filter options for querying media.
 */
export interface MediaFilterOptions {
  /** Filter by wallet address (required for multi-user) */
  walletAddress: string;
  /** Filter by media type */
  mediaType?: MediaType;
  /** Filter by role (user uploads vs AI generated) */
  role?: MediaRole;
  /** Filter by conversation */
  conversationId?: string;
  /** Filter by AI model */
  model?: string;
  /** Include soft-deleted records */
  includeDeleted?: boolean;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Context required for media database operations.
 */
export interface MediaOperationsContext {
  database: Database;
}

// Utility functions

/**
 * Generate a unique media ID.
 */
export function generateMediaId(): string {
  return `media_${uuidv7()}`;
}

/**
 * Determine MediaType from MIME type string.
 */
export function getMediaTypeFromMime(mimeType: string): MediaType {
  const mime = mimeType.toLowerCase();

  if (mime.startsWith("image/")) {
    return "image";
  }
  if (mime.startsWith("video/")) {
    return "video";
  }
  if (mime.startsWith("audio/")) {
    return "audio";
  }
  // Everything else is a document
  return "document";
}

/**
 * Check if a MIME type is supported for the library.
 */
export function isSupportedMediaType(mimeType: string): boolean {
  const mime = mimeType.toLowerCase();
  return (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime.startsWith("application/pdf") ||
    mime.startsWith("application/vnd.openxmlformats") ||
    mime.startsWith("application/vnd.ms-") ||
    mime.startsWith("text/")
  );
}
