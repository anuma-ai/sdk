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
  ) => Promise<{ fileIds: string[]; cleanedContent: string; imageModel?: string }>;

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

/** Kind-dependent metadata for a downloaded MCP media blob. */
interface ResolvedMediaMeta {
  isVideo: boolean;
  extension: string;
  mimeType: string;
  namePrefix: string;
}

function resolveMediaMeta(
  extractedKind: "image" | "video",
  urlPath: string,
  reportedType: string
): ResolvedMediaMeta {
  const isVideo = extractedKind === "video";
  const extension = urlPath.match(/\.([a-zA-Z0-9]+)$/)?.[1] || (isVideo ? "mp4" : "png");
  return {
    isVideo,
    extension,
    mimeType: reportedType || `${isVideo ? "video" : "image"}/${extension}`,
    namePrefix: isVideo ? "mcp-video" : "mcp-image",
  };
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

  const extractAndStoreEncryptedMCPImages = useCallback(
    async (
      content: string,
      address: string,
      conversationId: string,
      toolCallEvents?: LlmapiToolCallEvent[]
    ): Promise<{
      fileIds: string[];
      cleanedContent: string;
      imageModel?: string;
    }> => {
      let imageModel: string | undefined;
      try {
        const urls = extractMCPImageUrls(content, toolCallEvents, mcpR2Domain);

        imageModel = urls.find((u) => u.mediaType === "image")?.model;

        if (urls.length === 0) {
          return { fileIds: [], cleanedContent: content, imageModel };
        }

        const encryptionKey = await getEncryptionKey(address);
        const mediaOptions: CreateMediaOptions[] = [];

        const results = await Promise.allSettled(
          urls.map(async ({ url, mediaType: extractedKind }) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60_000);

            try {
              const response = await fetch(url, {
                signal: controller.signal,
                cache: "no-store",
              });

              if (!response.ok) {
                throw new Error(`Failed to fetch media: ${response.status}`);
              }

              const blob = await response.blob();

              const mediaId = generateMediaId();
              const urlPath = url.split("?")[0] ?? url;
              const reportedType =
                blob.type && blob.type !== "application/octet-stream" ? blob.type : "";
              const { isVideo, extension, mimeType, namePrefix } = resolveMediaMeta(
                extractedKind,
                urlPath,
                reportedType
              );
              const fileName = `${namePrefix}-${Date.now()}-${mediaId.slice(6, 14)}.${extension}`;

              const dimensions = isVideo ? undefined : await getImageDimensions(blob);

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

        results.forEach((result, i) => {
          const { url, model, mediaType: extractedKind } = urls[i];

          if (result.status === "fulfilled") {
            const { mediaId, fileName, mimeType, size, dimensions } = result.value;

            mediaOptions.push({
              mediaId,
              walletAddress: address,
              conversationId,
              name: fileName,
              mimeType,
              mediaType: extractedKind,
              size,
              role: "assistant",
              model,
              sourceUrl: url,
              dimensions,
            });
          } else {
            getLogger().warn(
              "[extractAndStoreEncryptedMCPImages] Failed to download media:",
              url,
              result.reason
            );
          }
        });

        const cleanedContent = content;

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
            for (const opt of mediaOptions) {
              if (opt.mediaId) {
                try {
                  await deleteEncryptedFile(opt.mediaId);
                } catch {
                  // Ignore cleanup errors
                }
              }
            }
            return { fileIds: [], cleanedContent: content, imageModel };
          }
        }

        return { fileIds: createdMediaIds, cleanedContent, imageModel };
      } catch {
        return { fileIds: [], cleanedContent: content, imageModel };
      }
    },
    [mediaCtx, getImageDimensions, mcpR2Domain]
  );

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
        if (!file.url) {
          continue;
        }

        const mediaId = generateMediaId();
        const mimeType = file.type || "application/octet-stream";
        let size = file.size || 0;
        let storedInOPFS = false;
        let sourceUrl: string | undefined;
        let dimensions: { width: number; height: number } | undefined;

        if (encryptionKey) {
          try {
            let blob: Blob;

            if (file.url.startsWith("data:")) {
              const response = await fetch(file.url);
              blob = await response.blob();
            } else {
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

            dimensions = await getImageDimensions(blob);

            await writeEncryptedFile(mediaId, blob, encryptionKey, {
              name: file.name,
            });

            storedInOPFS = true;
          } catch {
            // Will fall back to sourceUrl below
          }
        }

        if (!storedInOPFS) {
          sourceUrl = file.url && !file.url.startsWith("data:") ? file.url : undefined;
          if (!sourceUrl) {
            continue;
          }
        }

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

      if (mediaOptions.length === 0) {
        return [];
      }

      try {
        const createdMedia = await createMediaBatchOp(mediaCtx, mediaOptions);
        return createdMedia.map((m) => m.mediaId);
      } catch {
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
