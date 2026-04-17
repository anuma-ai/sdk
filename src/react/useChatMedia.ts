"use client";

import { useCallback } from "react";

import type { LlmapiToolCallEvent } from "../client";
import type { FileMetadata } from "../lib/db/chat";
import {
  createMediaBatchOp,
  type CreateMediaOptions,
  generateMediaId,
  getMediaTypeFromMime,
  type MediaOperationsContext,
} from "../lib/db/media";
import { getLogger } from "../lib/logger";
import {
  deleteEncryptedFile,
  extractMCPImageUrls,
  isOPFSSupported,
  writeEncryptedFile,
} from "../lib/storage";
import { getEncryptionKey, hasEncryptionKey } from "./useEncryption";

/**
 * Options for {@link useChatMedia}.
 */
interface UseChatMediaOptions {
  /**
   * Context used for media CRUD operations. Typically derived from
   * `useChatStorage`'s database + wallet state.
   */
  mediaCtx: MediaOperationsContext;

  /**
   * The MCP R2 domain used to detect assistant-generated image URLs
   * that should be pulled into encrypted OPFS storage.
   */
  mcpR2Domain: string;
}

/**
 * Return shape of {@link useChatMedia}.
 */
interface UseChatMediaResult {
  /**
   * Extract natural dimensions from an image blob. Returns `undefined`
   * for non-image blobs or when dimensions can't be determined.
   */
  getImageDimensions: (blob: Blob) => Promise<{ width: number; height: number } | undefined>;

  /**
   * Extract MCP-hosted image URLs from assistant content, download the
   * images, encrypt and store them in OPFS, and create media records.
   * The original presigned URLs are kept in the returned `cleanedContent`
   * so the UI can render them until they expire.
   */
  extractAndStoreEncryptedMCPImages: (
    content: string,
    address: string,
    conversationId: string,
    toolCallEvents?: LlmapiToolCallEvent[]
  ) => Promise<{ fileIds: string[]; cleanedContent: string }>;

  /**
   * Persist user-attached files. When OPFS + encryption are available,
   * files are stored encrypted and a media record is created. Otherwise
   * a media record is created with `sourceUrl` (external URLs only —
   * data URIs are skipped in that fallback).
   */
  storeUserFilesInOPFS: (
    files: FileMetadata[],
    address: string,
    conversationId: string
  ) => Promise<string[]>;
}

/**
 * Hook that encapsulates client-side media persistence for chat storage:
 * image dimension extraction, MCP image ingestion, and user file uploads
 * into encrypted OPFS + the media table.
 *
 * This is an internal composition helper for `useChatStorage` — it is
 * exported to keep the file small and to make the media concern testable
 * in isolation, not to add a new public surface.
 *
 * @internal
 */
export function useChatMedia(options: UseChatMediaOptions): UseChatMediaResult {
  const { mediaCtx, mcpR2Domain } = options;

  /**
   * Extract dimensions from an image blob.
   */
  const getImageDimensions = useCallback(
    async (blob: Blob): Promise<{ width: number; height: number } | undefined> => {
      if (!blob.type.startsWith("image/")) {
        return undefined;
      }
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        const timeoutId = setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve(undefined);
        }, 10_000);

        img.onload = () => {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(url);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(url);
          resolve(undefined);
        };
        img.src = url;
      });
    },
    []
  );

  /**
   * Extract and store MCP images using encrypted OPFS storage.
   * Creates media records and uses wallet-derived encryption keys.
   *
   * @param content - The message content containing MCP image URLs
   * @param address - Wallet address for encryption and media record ownership
   * @param conversationId - Conversation ID for media record association
   * @param toolCallEvents - Tool call events used to tag images with the source model
   * @returns Object with fileIds (mediaIds) and cleaned content with placeholders
   */
  const extractAndStoreEncryptedMCPImages = useCallback(
    async (
      content: string,
      address: string,
      conversationId: string,
      toolCallEvents?: LlmapiToolCallEvent[]
    ): Promise<{
      fileIds: string[];
      cleanedContent: string;
    }> => {
      try {
        // 1. Extract image URLs using pure function
        const urls = extractMCPImageUrls(content, toolCallEvents, mcpR2Domain);

        // No MCP images found — return content as-is (presigned URLs stay for inline rendering)
        if (urls.length === 0) {
          return { fileIds: [], cleanedContent: content };
        }

        // 2. Download images → get mediaIds
        const encryptionKey = await getEncryptionKey(address);
        const mediaOptions: CreateMediaOptions[] = [];
        const urlToMediaIdMap = new Map<string, string>();

        const results = await Promise.allSettled(
          urls.map(async ({ url }) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60_000);

            try {
              const response = await fetch(url, {
                signal: controller.signal,
                cache: "no-store",
              });

              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
              }

              const blob = await response.blob();

              const mediaId = generateMediaId();
              const urlPath = url.split("?")[0] ?? url;
              const extension = urlPath.match(/\.([a-zA-Z0-9]+)$/)?.[1] || "png";
              const mimeType = blob.type || `image/${extension}`;
              const fileName = `mcp-image-${Date.now()}-${mediaId.slice(6, 14)}.${extension}`;

              const dimensions = await getImageDimensions(blob);

              await writeEncryptedFile(mediaId, blob, encryptionKey, {
                name: fileName,
                sourceUrl: url,
              });

              return {
                mediaId,
                fileName,
                mimeType,
                size: blob.size,
                url,
                dimensions,
              };
            } finally {
              clearTimeout(timeoutId);
            }
          })
        );

        // 3. Build urlToMediaId map from successful downloads
        results.forEach((result, i) => {
          const { url, model } = urls[i];

          if (result.status === "fulfilled") {
            const { mediaId, fileName, mimeType, size, dimensions } = result.value;

            urlToMediaIdMap.set(url, mediaId);

            mediaOptions.push({
              mediaId,
              walletAddress: address,
              conversationId,
              name: fileName,
              mimeType,
              mediaType: "image",
              size,
              role: "assistant",
              model,
              sourceUrl: url,
              dimensions,
            });
          } else {
            getLogger().warn(
              "[extractAndStoreEncryptedMCPImages] Failed to download image:",
              url,
              result.reason
            );
          }
        });

        // 4. Keep original presigned URLs in content for inline rendering.
        // Images are stored in OPFS as a fallback — the client renders them
        // via ResponseImagePreview only after the presigned URL expires
        // (detected at render time by isR2UrlExpired in ChatContainer).
        const cleanedContent = content;

        // 5. Batch create media records
        let createdMediaIds: string[] = [];
        if (mediaOptions.length > 0) {
          try {
            const createdMedia = await createMediaBatchOp(mediaCtx, mediaOptions);
            createdMediaIds = createdMedia.map((m) => m.mediaId);
          } catch (err) {
            getLogger().error(
              "[extractAndStoreEncryptedMCPImages] Failed to create media records:",
              err
            );
            // Clean up orphaned OPFS files since media records weren't created
            for (const opt of mediaOptions) {
              if (opt.mediaId) {
                try {
                  await deleteEncryptedFile(opt.mediaId);
                } catch {
                  // Ignore cleanup errors
                }
              }
            }
            // Return original content to avoid orphaned __SDKFILE__ placeholders
            return { fileIds: [], cleanedContent: content };
          }
        }

        return { fileIds: createdMediaIds, cleanedContent };
      } catch {
        // Preserve URLs as fallback — presigned URLs remain valid for 3 days,
        // so the LLM can still reference them for editing even if OPFS storage fails.
        return { fileIds: [], cleanedContent: content };
      }
    },
    [mediaCtx, getImageDimensions, mcpR2Domain]
  );

  /**
   * Store user-attached files and create media records.
   * - If OPFS is supported with encryption: Store encrypted in OPFS, create media record
   * - If OPFS not available: Create media record with sourceUrl (external URL only, not data URIs)
   *
   * @param files - Array of file metadata with URLs (data URIs or external URLs)
   * @param address - Wallet address for encryption key derivation and media record ownership
   * @param conversationId - Conversation ID for media record association
   * @returns Array of mediaIds for the created media records
   */
  const storeUserFilesInOPFS = useCallback(
    async (files: FileMetadata[], address: string, conversationId: string): Promise<string[]> => {
      const canUseOPFS = isOPFSSupported() && hasEncryptionKey(address);
      let encryptionKey: CryptoKey | undefined;

      if (canUseOPFS) {
        try {
          encryptionKey = await getEncryptionKey(address);
        } catch {
          // Failed to get encryption key - will skip OPFS storage
        }
      }

      const mediaOptions: CreateMediaOptions[] = [];

      for (const file of files) {
        // Skip files without URLs (already stored or metadata-only)
        if (!file.url) {
          continue;
        }

        // Generate a media ID
        const mediaId = generateMediaId();
        const mimeType = file.type || "application/octet-stream";
        let size = file.size || 0;
        let storedInOPFS = false;
        let sourceUrl: string | undefined;
        let dimensions: { width: number; height: number } | undefined;

        // Try to store in OPFS if available
        if (encryptionKey) {
          try {
            let blob: Blob;

            if (file.url.startsWith("data:")) {
              // Convert data URI to Blob
              const response = await fetch(file.url);
              blob = await response.blob();
            } else {
              // Fetch external URL
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 60_000);
              try {
                const response = await fetch(file.url, {
                  signal: controller.signal,
                  cache: "no-store",
                });
                if (!response.ok) {
                  throw new Error(`Failed to fetch: ${response.status}`);
                }
                blob = await response.blob();
              } finally {
                clearTimeout(timeoutId);
              }
            }

            size = blob.size;

            // Extract dimensions for images
            dimensions = await getImageDimensions(blob);

            // Encrypt and store in OPFS using mediaId
            await writeEncryptedFile(mediaId, blob, encryptionKey, {
              name: file.name,
            });

            storedInOPFS = true;
          } catch {
            // Will fall back to sourceUrl below
          }
        }

        // If not stored in OPFS, use sourceUrl (only for external URLs, not data URIs)
        if (!storedInOPFS) {
          sourceUrl = file.url && !file.url.startsWith("data:") ? file.url : undefined;
          // If it's a data URI and we can't store in OPFS, we can't persist the file content
          if (!sourceUrl) {
            continue; // Skip this file - no way to store it
          }
        }

        // Prepare media record
        mediaOptions.push({
          mediaId,
          walletAddress: address,
          conversationId,
          name: file.name,
          mimeType,
          mediaType: getMediaTypeFromMime(mimeType),
          size,
          role: "user",
          sourceUrl,
          dimensions,
        });
      }

      // Batch create media records
      if (mediaOptions.length === 0) {
        return [];
      }

      try {
        const createdMedia = await createMediaBatchOp(mediaCtx, mediaOptions);
        return createdMedia.map((m) => m.mediaId);
      } catch {
        // Clean up orphaned OPFS files since media records weren't created
        for (const opt of mediaOptions) {
          if (opt.mediaId) {
            try {
              await deleteEncryptedFile(opt.mediaId);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
        return [];
      }
    },
    [mediaCtx, getImageDimensions]
  );

  return {
    getImageDimensions,
    extractAndStoreEncryptedMCPImages,
    storeUserFilesInOPFS,
  };
}
