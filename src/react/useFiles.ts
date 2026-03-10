"use client";

import type { Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createMediaBatchOp,
  createMediaOp,
  type CreateMediaOptions,
  deleteMediaByConversationOp,
  deleteMediaByMessageOp,
  deleteMediaOp,
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
  getRecentMediaOp,
  getUserUploadedMediaOp,
  getVideosOp,
  hardDeleteMediaOp,
  Media,
  type MediaFilterOptions,
  type MediaOperationsContext,
  type MediaRole,
  type MediaType,
  searchMediaOp,
  type StoredMedia,
  updateMediaMessageIdBatchOp,
  updateMediaOp,
  type UpdateMediaOptions,
} from "../lib/db/media";
import {
  BlobUrlManager,
  isOPFSSupported,
  readEncryptedFile,
  resolveFilePlaceholders as resolveFilePlaceholdersOp,
} from "../lib/storage";
import { getEncryptionKey, hasEncryptionKey, onKeyAvailable } from "./useEncryption";

/**
 * Options for useFiles hook.
 */
export interface UseFilesOptions {
  /** WatermelonDB database instance */
  database: Database;
  /** Wallet address for user context (required for most operations and file decryption) */
  walletAddress?: string;
}

/**
 * Result returned by useFiles hook.
 */
export interface UseFilesResult {
  // State
  /** Whether the file system is ready (database table exists) */
  isReady: boolean;
  /** Whether files are being loaded */
  isLoading: boolean;

  // CRUD Operations
  /** Create a new file record */
  createMedia: (options: CreateMediaOptions) => Promise<StoredMedia>;
  /** Create multiple file records in a batch */
  createMediaBatch: (optionsArray: CreateMediaOptions[]) => Promise<StoredMedia[]>;
  /** Get a file record by its media_id */
  getMediaById: (mediaId: string) => Promise<StoredMedia | null>;
  /** Get a file record by its source URL */
  getMediaBySourceUrl: (sourceUrl: string) => Promise<StoredMedia | null>;
  /** Get files by an array of media IDs */
  getMediaByIds: (mediaIds: string[], includeDeleted?: boolean) => Promise<StoredMedia[]>;
  /** Get files by message ID */
  getMediaByMessage: (messageId: string) => Promise<StoredMedia[]>;
  /** Update a file record */
  updateMedia: (mediaId: string, options: UpdateMediaOptions) => Promise<StoredMedia | null>;
  /** Batch update file records with a messageId */
  updateMediaMessageIdBatch: (mediaIds: string[], messageId: string) => Promise<number>;
  /** Soft delete a file record */
  deleteMedia: (mediaId: string) => Promise<boolean>;
  /** Permanently delete a file record */
  hardDeleteMedia: (mediaId: string) => Promise<boolean>;

  // Library Query Operations
  /** Get all files with optional filters */
  getMedia: (filters: MediaFilterOptions) => Promise<StoredMedia[]>;
  /** Get files by type */
  getMediaByType: (mediaType: MediaType, limit?: number) => Promise<StoredMedia[]>;
  /** Get all images */
  getImages: (limit?: number) => Promise<StoredMedia[]>;
  /** Get all videos */
  getVideos: (limit?: number) => Promise<StoredMedia[]>;
  /** Get all audio files */
  getAudio: (limit?: number) => Promise<StoredMedia[]>;
  /** Get all documents */
  getDocuments: (limit?: number) => Promise<StoredMedia[]>;
  /** Get files by conversation */
  getMediaByConversation: (conversationId: string, limit?: number) => Promise<StoredMedia[]>;
  /** Get files by role (user uploads vs AI generated) */
  getMediaByRole: (role: MediaRole, limit?: number) => Promise<StoredMedia[]>;
  /** Get AI-generated files */
  getAIGeneratedMedia: (limit?: number) => Promise<StoredMedia[]>;
  /** Get user-uploaded files */
  getUserUploadedMedia: (limit?: number) => Promise<StoredMedia[]>;
  /** Get files by AI model */
  getMediaByModel: (model: string, limit?: number) => Promise<StoredMedia[]>;
  /** Get recent files for library homepage */
  getRecentMedia: (limit?: number) => Promise<StoredMedia[]>;
  /** Search files by name */
  searchMedia: (query: string, limit?: number) => Promise<StoredMedia[]>;
  /** Get file count */
  getMediaCount: (mediaType?: MediaType) => Promise<number>;
  /** Get file counts by type */
  getMediaCountsByType: () => Promise<Record<MediaType, number>>;
  /** Delete all files for a conversation */
  deleteMediaByConversation: (conversationId: string) => Promise<number>;
  /** Delete all files for a message */
  deleteMediaByMessage: (messageId: string) => Promise<number>;

  // File Operations
  /** Read a file from OPFS by its media ID */
  readFile: (mediaId: string) => Promise<File>;
  /** Create a blob URL for a file (auto-managed lifecycle) */
  createBlobUrl: (mediaId: string) => Promise<string | null>;
  /** Revoke a specific blob URL */
  revokeBlobUrl: (mediaId: string) => void;
  /** Revoke all blob URLs (cleanup) */
  revokeAllBlobUrls: () => void;
  /** Resolve __SDKFILE__ placeholders in content to blob URLs */
  resolveFilePlaceholders: (content: string) => Promise<string>;
}

/**
 * A React hook for managing files (images, videos, audio, documents).
 *
 * This hook provides comprehensive CRUD operations for file records stored in
 * WatermelonDB, along with file reading capabilities from OPFS encrypted storage.
 * It supports both user-uploaded files and AI-generated files (e.g., DALL-E images).
 *
 * @param options - Configuration options
 * @returns An object containing file state and methods
 *
 * @example
 * ```tsx
 * import { useFiles } from '@anthropic-ai/sdk/react';
 *
 * function FileGallery({ database, walletAddress }) {
 *   const {
 *     getImages,
 *     readFile,
 *     createBlobUrl,
 *     isReady,
 *   } = useFiles({ database, walletAddress });
 *
 *   const [images, setImages] = useState<StoredMedia[]>([]);
 *
 *   useEffect(() => {
 *     if (isReady && walletAddress) {
 *       getImages(20).then(setImages);
 *     }
 *   }, [isReady, walletAddress, getImages]);
 *
 *   return (
 *     <div>
 *       {images.map((img) => (
 *         <FileImage key={img.mediaId} file={img} createBlobUrl={createBlobUrl} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category Hooks
 */
export function useFiles(options: UseFilesOptions): UseFilesResult {
  const { database, walletAddress } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [mediaCollection, setMediaCollection] = useState<ReturnType<
    typeof database.get<Media>
  > | null>(null);

  // Blob URL manager for memory-safe blob URL tracking
  const blobUrlManager = useMemo(() => new BlobUrlManager(), []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlManager.revokeAll();
    };
  }, [blobUrlManager]);

  // Initialize collection asynchronously
  useEffect(() => {
    const initCollection = async () => {
      setIsLoading(true);
      try {
        const coll = database.get<Media>("media");

        // Test query to ensure database is initialized and table exists
        await coll.query(Q.take(1)).fetch();

        setMediaCollection(coll);
        setIsReady(true);
      } catch (error) {
        console.error("[useFiles] Failed to initialize collection:", error);
        setIsReady(false);
      } finally {
        setIsLoading(false);
      }
    };

    initCollection();
  }, [database]);

  // Media operations context - only valid when isReady is true
  const ctx = useMemo<MediaOperationsContext | null>(() => {
    if (!isReady || !mediaCollection) {
      return null;
    }
    return { database, walletAddress };
  }, [database, mediaCollection, isReady, walletAddress]);

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  const createMedia = useCallback(
    async (createOptions: CreateMediaOptions): Promise<StoredMedia> => {
      if (!ctx) {
        throw new Error("Files not available. Database may need to be initialized.");
      }
      return createMediaOp(ctx, createOptions);
    },
    [ctx]
  );

  const createMediaBatch = useCallback(
    async (optionsArray: CreateMediaOptions[]): Promise<StoredMedia[]> => {
      if (!ctx) {
        throw new Error("Files not available. Database may need to be initialized.");
      }
      return createMediaBatchOp(ctx, optionsArray);
    },
    [ctx]
  );

  const getMediaById = useCallback(
    async (mediaId: string): Promise<StoredMedia | null> => {
      if (!ctx) {
        return null;
      }
      return getMediaByIdOp(ctx, mediaId);
    },
    [ctx]
  );

  const getMediaBySourceUrl = useCallback(
    async (sourceUrl: string): Promise<StoredMedia | null> => {
      if (!ctx || !walletAddress) {
        return null;
      }
      return getMediaBySourceUrlOp(ctx, sourceUrl, walletAddress);
    },
    [ctx, walletAddress]
  );

  const getMediaByIds = useCallback(
    async (mediaIds: string[], includeDeleted: boolean = false): Promise<StoredMedia[]> => {
      if (!ctx) {
        return [];
      }
      return getMediaByIdsOp(ctx, mediaIds, includeDeleted);
    },
    [ctx]
  );

  const getMediaByMessage = useCallback(
    async (messageId: string): Promise<StoredMedia[]> => {
      if (!ctx) {
        return [];
      }
      return getMediaByMessageOp(ctx, messageId);
    },
    [ctx]
  );

  const updateMedia = useCallback(
    async (mediaId: string, updateOptions: UpdateMediaOptions): Promise<StoredMedia | null> => {
      if (!ctx) {
        return null;
      }
      return updateMediaOp(ctx, mediaId, updateOptions);
    },
    [ctx]
  );

  const updateMediaMessageIdBatch = useCallback(
    async (mediaIds: string[], messageId: string): Promise<number> => {
      if (!ctx) {
        return 0;
      }
      return updateMediaMessageIdBatchOp(ctx, mediaIds, messageId);
    },
    [ctx]
  );

  const deleteMedia = useCallback(
    async (mediaId: string): Promise<boolean> => {
      if (!ctx) {
        return false;
      }
      const result = await deleteMediaOp(ctx, mediaId);
      // Revoke blob URL if it exists
      blobUrlManager.revokeUrl(mediaId);
      return result;
    },
    [ctx, blobUrlManager]
  );

  const hardDeleteMedia = useCallback(
    async (mediaId: string): Promise<boolean> => {
      if (!ctx) {
        return false;
      }
      const result = await hardDeleteMediaOp(ctx, mediaId);
      // Revoke blob URL if it exists
      blobUrlManager.revokeUrl(mediaId);
      return result;
    },
    [ctx, blobUrlManager]
  );

  // ============================================================================
  // Library Query Operations
  // ============================================================================

  const getMedia = useCallback(
    async (filters: MediaFilterOptions): Promise<StoredMedia[]> => {
      if (!ctx) {
        return [];
      }
      return getMediaOp(ctx, filters);
    },
    [ctx]
  );

  const getMediaByType = useCallback(
    async (mediaType: MediaType, limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getMediaByTypeOp(ctx, walletAddress, mediaType, limit);
    },
    [ctx, walletAddress]
  );

  const getImages = useCallback(
    async (limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getImagesOp(ctx, walletAddress, limit);
    },
    [ctx, walletAddress]
  );

  const getVideos = useCallback(
    async (limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getVideosOp(ctx, walletAddress, limit);
    },
    [ctx, walletAddress]
  );

  const getAudio = useCallback(
    async (limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getAudioOp(ctx, walletAddress, limit);
    },
    [ctx, walletAddress]
  );

  const getDocuments = useCallback(
    async (limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getDocumentsOp(ctx, walletAddress, limit);
    },
    [ctx, walletAddress]
  );

  const getMediaByConversation = useCallback(
    async (conversationId: string, limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getMediaByConversationOp(ctx, walletAddress, conversationId, limit);
    },
    [ctx, walletAddress]
  );

  const getMediaByRole = useCallback(
    async (role: MediaRole, limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getMediaByRoleOp(ctx, walletAddress, role, limit);
    },
    [ctx, walletAddress]
  );

  const getAIGeneratedMedia = useCallback(
    async (limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getAIGeneratedMediaOp(ctx, walletAddress, limit);
    },
    [ctx, walletAddress]
  );

  const getUserUploadedMedia = useCallback(
    async (limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getUserUploadedMediaOp(ctx, walletAddress, limit);
    },
    [ctx, walletAddress]
  );

  const getMediaByModel = useCallback(
    async (model: string, limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getMediaByModelOp(ctx, walletAddress, model, limit);
    },
    [ctx, walletAddress]
  );

  const getRecentMedia = useCallback(
    async (limit: number = 20): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return getRecentMediaOp(ctx, walletAddress, limit);
    },
    [ctx, walletAddress]
  );

  const searchMedia = useCallback(
    async (query: string, limit?: number): Promise<StoredMedia[]> => {
      if (!ctx || !walletAddress) {
        return [];
      }
      return searchMediaOp(ctx, walletAddress, query, limit);
    },
    [ctx, walletAddress]
  );

  const getMediaCount = useCallback(
    async (mediaType?: MediaType): Promise<number> => {
      if (!ctx || !walletAddress) {
        return 0;
      }
      return getMediaCountOp(ctx, walletAddress, mediaType);
    },
    [ctx, walletAddress]
  );

  const getMediaCountsByType = useCallback(async (): Promise<Record<MediaType, number>> => {
    if (!ctx || !walletAddress) {
      return { image: 0, video: 0, audio: 0, document: 0 };
    }
    return getMediaCountsByTypeOp(ctx, walletAddress);
  }, [ctx, walletAddress]);

  const deleteMediaByConversation = useCallback(
    async (conversationId: string): Promise<number> => {
      if (!ctx) {
        return 0;
      }
      return deleteMediaByConversationOp(ctx, conversationId);
    },
    [ctx]
  );

  const deleteMediaByMessage = useCallback(
    async (messageId: string): Promise<number> => {
      if (!ctx) {
        return 0;
      }
      return deleteMediaByMessageOp(ctx, messageId);
    },
    [ctx]
  );

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * Read a file from OPFS by its media ID.
   * Supports both encrypted (SDK) and unencrypted (legacy) storage.
   * Encryption key is automatically retrieved from the wallet address.
   */
  const readFile = useCallback(
    async (mediaId: string): Promise<File> => {
      if (!isOPFSSupported()) {
        throw new Error("OPFS is not supported in this browser.");
      }

      // If we have a wallet address, use encrypted storage
      // Wait for the encryption key if it hasn't been derived yet
      if (walletAddress) {
        if (!hasEncryptionKey(walletAddress)) {
          await new Promise<void>((resolve, reject) => {
            const cleanup = { fn: () => {} };
            const timeout = setTimeout(() => {
              cleanup.fn();
              reject(new Error("Encryption key not available within timeout"));
            }, 10_000);
            cleanup.fn = onKeyAvailable(walletAddress, () => {
              clearTimeout(timeout);
              cleanup.fn();
              resolve();
            });
          });
        }

        try {
          const encryptionKey = await getEncryptionKey(walletAddress);
          const result = await readEncryptedFile(mediaId, encryptionKey);
          if (!result) {
            throw new Error(`File could not be found: ${mediaId}`);
          }
          return new File([result.blob], result.metadata?.name || mediaId, {
            type: result.metadata?.type || "application/octet-stream",
          });
        } catch (error) {
          // If encrypted read fails, fall back to legacy storage
          console.warn(`[useFiles] Encrypted read failed for ${mediaId}, trying legacy storage`);
        }
      }

      // Fallback: try to read from unencrypted OPFS (legacy)
      try {
        const root = await navigator.storage.getDirectory();
        const filesDir = await root.getDirectoryHandle("files", { create: false });
        const fileHandle = await filesDir.getFileHandle(mediaId);
        return await fileHandle.getFile();
      } catch (error) {
        throw new Error(`File could not be found: ${mediaId}`);
      }
    },
    [walletAddress]
  );

  /**
   * Create a blob URL for a file.
   * The URL is tracked and will be auto-revoked on cleanup.
   */
  const createBlobUrl = useCallback(
    async (mediaId: string): Promise<string | null> => {
      // Check if we already have a URL for this file
      const existingUrl = blobUrlManager.getUrl(mediaId);
      if (existingUrl) {
        return existingUrl;
      }

      try {
        const file = await readFile(mediaId);
        return blobUrlManager.createUrl(mediaId, file);
      } catch (error) {
        console.error(`[useFiles] Failed to create blob URL for ${mediaId}:`, error);
        return null;
      }
    },
    [readFile, blobUrlManager]
  );

  /**
   * Revoke a specific blob URL.
   */
  const revokeBlobUrl = useCallback(
    (mediaId: string): void => {
      blobUrlManager.revokeUrl(mediaId);
    },
    [blobUrlManager]
  );

  /**
   * Revoke all blob URLs (cleanup).
   */
  const revokeAllBlobUrls = useCallback((): void => {
    blobUrlManager.revokeAll();
  }, [blobUrlManager]);

  /**
   * Resolve __SDKFILE__ placeholders in content to blob URLs.
   * This converts placeholders like __SDKFILE__media_xxx__ to actual blob URLs.
   */
  const resolveFilePlaceholders = useCallback(
    async (content: string): Promise<string> => {
      if (!walletAddress || !hasEncryptionKey(walletAddress)) {
        return content;
      }

      try {
        const encryptionKey = await getEncryptionKey(walletAddress);
        return resolveFilePlaceholdersOp(content, encryptionKey, blobUrlManager);
      } catch (error) {
        console.error("[useFiles] Failed to resolve file placeholders:", error);
        return content;
      }
    },
    [walletAddress, blobUrlManager]
  );

  return {
    // State
    isReady,
    isLoading,

    // CRUD Operations
    createMedia,
    createMediaBatch,
    getMediaById,
    getMediaBySourceUrl,
    getMediaByIds,
    getMediaByMessage,
    updateMedia,
    updateMediaMessageIdBatch,
    deleteMedia,
    hardDeleteMedia,

    // Library Query Operations
    getMedia,
    getMediaByType,
    getImages,
    getVideos,
    getAudio,
    getDocuments,
    getMediaByConversation,
    getMediaByRole,
    getAIGeneratedMedia,
    getUserUploadedMedia,
    getMediaByModel,
    getRecentMedia,
    searchMedia,
    getMediaCount,
    getMediaCountsByType,
    deleteMediaByConversation,
    deleteMediaByMessage,

    // File Operations
    readFile,
    createBlobUrl,
    revokeBlobUrl,
    revokeAllBlobUrls,
    resolveFilePlaceholders,
  };
}
