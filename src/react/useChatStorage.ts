"use client";

import { useCallback, useState, useMemo, useRef, useEffect } from "react";

import { useChat } from "./useChat";
import type { LlmapiMessage, LlmapiResponseResponse, LlmapiChatCompletionResponse } from "../client";
import {
  Message,
  Conversation,
  type StoredMessage,
  type StoredMessageWithSimilarity,
  type StoredConversation,
  type StoredFileWithContext,
  type CreateConversationOptions,
  type UpdateMessageOptions,
  type BaseUseChatStorageOptions,
  type BaseSendMessageWithStorageArgs,
  type BaseUseChatStorageResult,
  type FileMetadata,
  type SearchSource,
  convertUsageToStored,
  finalizeThoughtProcess,
  extractUserMessageFromMessages,
  type StorageOperationsContext,
  createConversationOp,
  getConversationOp,
  getConversationsOp,
  updateConversationTitleOp,
  deleteConversationOp,
  getMessagesOp,
  getMessageCountOp,
  clearMessagesOp,
  createMessageOp,
  updateMessageEmbeddingOp,
  updateMessageChunksOp,
  updateMessageErrorOp,
  updateMessageOp,
  searchMessagesOp,
  getAllFilesOp,
  type MessageChunk,
} from "../lib/db/chat";
import type { ApiType } from "../lib/chat/useChat";
import { MCP_R2_DOMAIN } from "../clientConfig";
import { getEncryptionKey, hasEncryptionKey } from "./useEncryption";
import {
  isOPFSSupported,
  writeEncryptedFile,
  readEncryptedFile,
  deleteEncryptedFile,
  createFilePlaceholder,
  extractFileIds,
  FILE_PLACEHOLDER_REGEX,
  BlobUrlManager,
} from "../lib/storage";
import {
  deleteMediaByConversationOp,
  deleteMediaByMessageOp,
  createMediaOp,
  createMediaBatchOp,
  updateMediaMessageIdBatchOp,
  hardDeleteMediaOp,
  generateMediaId,
  getMediaTypeFromMime,
  type MediaOperationsContext,
  type CreateMediaOptions,
} from "../lib/db/media";
import { preprocessFiles } from "../lib/processors";
import {
  getServerTools,
  filterServerTools,
  mergeTools,
  type ServerTool,
} from "../lib/tools";
import {
  generateEmbedding,
  generateEmbeddings,
  createMemoryRetrievalTool as createMemoryRetrievalToolBase,
  type MemoryRetrievalSearchOptions,
  chunkText,
  shouldChunkMessage,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MIN_CONTENT_LENGTH,
} from "../lib/memoryRetrieval";
import type { ToolConfig } from "../lib/chat/useChat/types";
import { DEFAULT_API_EMBEDDING_MODEL } from "../lib/memory/constants";

/**
 * Replace a URL in content with an internal file placeholder.
 * This is used to swap external URLs with locally-stored file references.
 *
 * @param content - The message content containing the URL
 * @param url - The URL to replace
 * @param fileId - The OPFS file ID to reference
 * @returns The content with the URL replaced by __SDKFILE__fileId__
 *
 * @example
 * ```ts
 * // Replace a URL that returned 404 with local file reference
 * const newContent = replaceUrlWithMCPPlaceholder(
 *   message.content,
 *   "https://example.com/image.png",
 *   "abc-123-def"
 * );
 * await updateMessage(message.uniqueId, { content: newContent });
 * ```
 */
export function replaceUrlWithMCPPlaceholder(
  content: string,
  url: string,
  fileId: string
): string {
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const placeholder = createFilePlaceholder(fileId);
  let result = content;

  // eslint-disable-next-line no-console
  console.log(
    `[replaceUrlWithMCPPlaceholder] Replacing URL with placeholder:`,
    url,
    "->",
    placeholder
  );

  // Replace HTML img tags with double-quoted src
  const htmlImgPatternDouble = new RegExp(
    `<img[^>]*src="${escapedUrl}"[^>]*>`,
    "gi"
  );
  const doubleMatches = result.match(htmlImgPatternDouble);
  if (doubleMatches) {
    // eslint-disable-next-line no-console
    console.log(
      `[replaceUrlWithMCPPlaceholder] Replacing ${doubleMatches.length} HTML img tag(s) with double quotes:`,
      doubleMatches,
      "->",
      placeholder
    );
  }
  result = result.replace(htmlImgPatternDouble, placeholder);

  // Replace HTML img tags with single-quoted src
  const htmlImgPatternSingle = new RegExp(
    `<img[^>]*src='${escapedUrl}'[^>]*>`,
    "gi"
  );
  const singleMatches = result.match(htmlImgPatternSingle);
  if (singleMatches) {
    // eslint-disable-next-line no-console
    console.log(
      `[replaceUrlWithMCPPlaceholder] Replacing ${singleMatches.length} HTML img tag(s) with single quotes:`,
      singleMatches,
      "->",
      placeholder
    );
  }
  result = result.replace(htmlImgPatternSingle, placeholder);

  // Replace markdown image syntax: ![alt](url) -> placeholder
  const markdownImagePattern = new RegExp(
    `!\\[[^\\]]*\\]\\([\\s]*${escapedUrl}[\\s]*\\)`,
    "g"
  );
  const markdownMatches = result.match(markdownImagePattern);
  if (markdownMatches) {
    // eslint-disable-next-line no-console
    console.log(
      `[replaceUrlWithMCPPlaceholder] Replacing ${markdownMatches.length} markdown image(s):`,
      markdownMatches,
      "->",
      placeholder
    );
  }
  result = result.replace(markdownImagePattern, placeholder);

  // Replace raw URLs with placeholder (only if not already replaced by markdown pattern or HTML tags)
  const rawUrlPattern = new RegExp(escapedUrl, "g");
  const rawMatches = result.match(rawUrlPattern);
  if (rawMatches) {
    // eslint-disable-next-line no-console
    console.log(
      `[replaceUrlWithMCPPlaceholder] Replacing ${rawMatches.length} raw URL(s):`,
      rawMatches,
      "->",
      placeholder
    );
  }
  result = result.replace(rawUrlPattern, placeholder);

  // eslint-disable-next-line no-console
  console.log(
    `[replaceUrlWithMCPPlaceholder] Final result length: ${result.length}, original length: ${content.length}`
  );

  return result;
}

/**
 * Find the OPFS file ID for a given source URL from a message's files.
 * Used to look up local file storage when an external URL fails (e.g., 404).
 *
 * @param files - Array of FileMetadata from a stored message
 * @param sourceUrl - The original URL to look up
 * @returns The file ID if found, or undefined
 */
export function findFileIdBySourceUrl(
  files: { id: string; sourceUrl?: string }[] | undefined,
  sourceUrl: string
): string | undefined {
  return files?.find((f) => f.sourceUrl === sourceUrl)?.id;
}

/**
 * Helper to convert a Blob to a data URI.
 */
async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert StoredMessage to LlmapiMessage format.
 * If a file has a sourceUrl, includes it as an image_url part (only for non-assistant messages).
 * If encryptionKey is provided and files are stored in OPFS, reads them and converts to data URIs.
 * Internal placeholders are replaced with sourceUrls or removed.
 */
async function storedToLlmapiMessage(
  stored: StoredMessage,
  encryptionKey?: CryptoKey
): Promise<LlmapiMessage> {
  let textContent = stored.content;

  // Build a map of fileId -> sourceUrl for replacement
  const fileUrlMap = new Map<string, string>();

  // Add file image parts if present (only for non-assistant messages)
  // ai-portal doesn't support image_url in assistant messages for /chat/completions
  const imageParts: LlmapiMessage["content"] = [];
  if (stored.role !== "assistant" && stored.files?.length) {
    for (const file of stored.files) {
      // First check if there's a direct url (user uploads with data URIs or external URLs)
      if (file.url) {
        imageParts.push({
          type: "image_url",
          image_url: { url: file.url },
        });
      } else if (file.sourceUrl) {
        // For MCP-cached files, include the sourceUrl
        // If expired, AI simply won't see the image (local OPFS copy is for display only)
        imageParts.push({
          type: "image_url",
          image_url: { url: file.sourceUrl },
        });
        // Track sourceUrl for placeholder replacement
        fileUrlMap.set(file.id, file.sourceUrl);
      } else if (encryptionKey && isOPFSSupported()) {
        // No URL but we have encryption key - try to read from OPFS
        // This handles user-uploaded files stored in OPFS for history replay
        try {
          const result = await readEncryptedFile(file.id, encryptionKey);
          if (result) {
            // Convert blob to data URI for sending to API
            const dataUri = await blobToDataUri(result.blob);
            imageParts.push({
              type: "image_url",
              image_url: { url: dataUri },
            });
            // eslint-disable-next-line no-console
            console.log(
              `[storedToLlmapiMessage] Loaded file ${file.id} from OPFS for history replay`
            );
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            `[storedToLlmapiMessage] Failed to read file ${file.id} from OPFS:`,
            err
          );
        }
      }
    }
  } else if (stored.role === "assistant" && stored.files?.length) {
    // For assistant messages, track sourceUrls for placeholder replacement only
    // URLs are already in text as markdown images, so model can get them from context
    for (const file of stored.files) {
      if (file.sourceUrl) {
        fileUrlMap.set(file.id, file.sourceUrl);
      }
    }
  }

  // Replace internal __SDKFILE__ placeholders with sourceUrls or remove them
  // Pattern matches both legacy hex UUIDs and new media_UUID format from generateMediaId()
  textContent = textContent.replace(
    /__SDKFILE__([a-zA-Z0-9_-]+)__/g,
    (_match, fileId) => {
      const sourceUrl = fileUrlMap.get(fileId);
      if (sourceUrl) {
        // Replace with markdown image pointing to sourceUrl
        return `![image](${sourceUrl})`;
      }
      // Remove placeholder if no URL available
      return "";
    }
  );

  // Also handle legacy ![MCP_IMAGE:fileId] placeholders for backward compatibility
  // This supports old messages that may still contain MCP_IMAGE placeholders
  // Pattern matches both legacy hex UUIDs and new media_UUID format from generateMediaId()
  textContent = textContent.replace(
    /!\[MCP_IMAGE:([a-zA-Z0-9_-]+)\]/g,
    (match, fileId) => {
      const sourceUrl = fileUrlMap.get(fileId);
      if (sourceUrl) {
        return `![image](${sourceUrl})`;
      }
      return "";
    }
  );

  // Clean up extra whitespace from removed placeholders
  textContent = textContent.replace(/\n{3,}/g, "\n\n").trim();

  const content: LlmapiMessage["content"] = [
    { type: "text", text: textContent },
    ...imageParts,
  ];

  return {
    role: stored.role,
    content,
  };
}

/**
 * Options for useChatStorage hook (React version)
 *
 * Extends base options with apiType support.
 * @inline
 */
export interface UseChatStorageOptions extends BaseUseChatStorageOptions {
  /**
   * Which API endpoint to use. Default: "responses"
   * - "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
   * - "completions": OpenAI Chat Completions API (wider model compatibility)
   */
  apiType?: ApiType;

  /**
   * Wallet address for encrypted file storage.
   * When provided, MCP-generated images are automatically encrypted and stored
   * in OPFS using wallet-derived keys. Messages are returned with working blob URLs.
   *
   * Requires:
   * - OPFS browser support
   * - Encryption key to be requested via `requestEncryptionKey` first
   *
   * When not provided, falls back to the `writeFile` callback in sendMessage args.
   */
  walletAddress?: string;
}

/**
 * Arguments for sendMessage with storage (React version)
 *
 * Extends base arguments with headers and apiType support.
 * @inline
 */
export interface SendMessageWithStorageArgs
  extends BaseSendMessageWithStorageArgs {
  /**
   * Custom HTTP headers to include with the API request.
   * Useful for passing additional authentication, tracking, or feature flags.
   */
  headers?: Record<string, string>;

  /**
   * Override the API type for this specific request.
   * - "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
   * - "completions": OpenAI Chat Completions API (wider model compatibility)
   *
   * Useful when different models need different APIs within the same hook instance.
   */
  apiType?: ApiType;

  /**
   * Explicitly specify the conversation ID to send this message to.
   * If provided, bypasses the automatic conversation detection/creation.
   * Useful when sending a message immediately after creating a conversation,
   * to avoid race conditions with React state updates.
   */
  conversationId?: string;

  /**
   * Function to write files to storage (for MCP image processing).
   * When provided, MCP-generated images in the response are automatically
   * downloaded and stored locally via this function. The content is updated
   * with placeholders that can be resolved to the stored files.
   *
   * If not provided, MCP images remain as URLs in the response content.
   *
   * @param fileId - Unique identifier for the file
   * @param blob - The file content as a Blob
   * @param options - Optional progress callback and abort signal
   * @returns Promise resolving to the stored file URL/path
   */
  writeFile?: (
    fileId: string,
    blob: Blob,
    options?: {
      onProgress?: (progress: number) => void;
      signal?: AbortSignal;
    }
  ) => Promise<string>;
}

/**
 * Result from sendMessage with storage (React version)
 * The `data` field contains the raw server response which includes `tools_checksum`.
 */
export type SendMessageWithStorageResult =
  | {
      data: LlmapiResponseResponse | LlmapiChatCompletionResponse;
      error: null;
      userMessage: StoredMessage;
      assistantMessage: StoredMessage;
    }
  | {
      data: null;
      error: string;
      userMessage?: StoredMessage;
      assistantMessage?: undefined;
    };

/**
 * Options for searching messages
 */
export interface SearchMessagesOptions {
  /** Limit the number of results (default: 10) */
  limit?: number;
  /** Minimum similarity threshold (default: 0.5) */
  minSimilarity?: number;
  /** Filter by conversation ID */
  conversationId?: string;
}

/**
 * Result returned by useChatStorage hook (React version)
 *
 * Extends base result with React-specific sendMessage signature.
 */
export interface UseChatStorageResult extends BaseUseChatStorageResult {
  /**
   * Sends a message to the AI and automatically persists both the user message
   * and assistant response to the database.
   *
   * This method handles the complete message lifecycle:
   * 1. Ensures a conversation exists (creates one if `autoCreateConversation` is enabled)
   * 2. Optionally includes conversation history for context
   * 3. Stores the user message before sending
   * 4. Streams the response via the underlying `useChat` hook
   * 5. Stores the assistant response (including usage stats, sources, and thinking)
   * 6. Handles abort/error states gracefully
   *
   * @example
   * ```ts
   * const result = await sendMessage({
   *   content: "Explain quantum computing",
   *   model: "gpt-4o",
   *   includeHistory: true,
   *   onData: (chunk) => setStreamingText(prev => prev + chunk),
   * });
   *
   * if (result.error) {
   *   console.error("Failed:", result.error);
   * } else {
   *   console.log("Stored message ID:", result.assistantMessage.uniqueId);
   * }
   * ```
   */
  sendMessage: (
    args: SendMessageWithStorageArgs
  ) => Promise<SendMessageWithStorageResult>;
  /** Search messages by vector similarity */
  searchMessages: (
    queryVector: number[],
    options?: SearchMessagesOptions
  ) => Promise<StoredMessageWithSimilarity[]>;
  /** Update a message's embedding vector. Returns updated message or null if not found. */
  updateMessageEmbedding: (
    uniqueId: string,
    vector: number[],
    embeddingModel: string
  ) => Promise<StoredMessage | null>;
  /** Extract all links from assistant message content as SearchSource objects */
  extractSourcesFromAssistantMessage: (assistantMessage: {
    content: string;
    sources?: SearchSource[];
  }) => SearchSource[];
  /** Update a message's fields (content, embedding, files, etc). Returns updated message or null if not found. */
  updateMessage: (
    uniqueId: string,
    options: UpdateMessageOptions
  ) => Promise<StoredMessage | null>;
  /**
   * Get all files from all conversations, sorted by creation date (newest first).
   * Returns files with conversation context for building file browser UIs.
   */
  getAllFiles: (options?: {
    conversationId?: string;
    limit?: number;
  }) => Promise<StoredFileWithContext[]>;
  /**
   * Create a memory retrieval tool for LLM to search past conversations.
   * The tool is pre-configured with the hook's storage context and auth.
   *
   * @param searchOptions - Optional search configuration (limit, minSimilarity, etc.)
   * @returns A ToolConfig that can be passed to sendMessage's clientTools
   *
   * @example
   * ```ts
   * const memoryTool = createMemoryRetrievalTool({ limit: 5 });
   * await sendMessage({
   *   messages: [...],
   *   clientTools: [memoryTool],
   * });
   * ```
   */
  createMemoryRetrievalTool: (
    searchOptions?: Partial<MemoryRetrievalSearchOptions>
  ) => ToolConfig;
}

/**
 * A React hook that wraps useChat with automatic message persistence using WatermelonDB.
 *
 * This hook provides all the functionality of useChat plus automatic storage of
 * messages and conversations to a WatermelonDB database. Messages are automatically
 * saved when sent and when responses are received.
 *
 * @param options - Configuration options
 * @returns An object containing chat state, methods, and storage operations
 *
 * @example
 * ```tsx
 * import { Database } from '@nozbe/watermelondb';
 * import { useChatStorage } from '@reverbia/sdk/react';
 *
 * function ChatComponent({ database }: { database: Database }) {
 *   const {
 *     isLoading,
 *     sendMessage,
 *     conversationId,
 *     getMessages,
 *     createConversation,
 *   } = useChatStorage({
 *     database,
 *     getToken: async () => getAuthToken(),
 *     onData: (chunk) => setResponse((prev) => prev + chunk),
 *   });
 *
 *   const handleSend = async () => {
 *     const result = await sendMessage({
 *       content: 'Hello, how are you?',
 *       model: 'gpt-4o-mini',
 *       includeHistory: true, // Include previous messages from this conversation
 *     });
 *
 *     if (result.error) {
 *       console.error('Error:', result.error);
 *     } else {
 *       console.log('User message stored:', result.userMessage);
 *       console.log('Assistant message stored:', result.assistantMessage);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleSend} disabled={isLoading}>Send</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @category Hooks
 */
export function useChatStorage(
  options: UseChatStorageOptions
): UseChatStorageResult {
  const {
    database,
    conversationId: initialConversationId,
    autoCreateConversation = true,
    defaultConversationTitle = "New Conversation",
    getToken,
    baseUrl,
    onData,
    onThinking,
    onFinish,
    onError,
    apiType,
    walletAddress,
    fileProcessors,
    fileProcessingOptions,
    serverTools: serverToolsConfig,
    autoEmbedMessages = true,
    embeddingModel = DEFAULT_API_EMBEDDING_MODEL,
  } = options;

  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(initialConversationId || null);

  // Blob URL manager for encrypted file storage
  const blobManagerRef = useRef<BlobUrlManager>(new BlobUrlManager());

  // Clean up blob URLs on unmount
  useEffect(() => {
    const manager = blobManagerRef.current;
    return () => {
      manager.revokeAll();
    };
  }, []);

  // Get collections
  const messagesCollection = useMemo(
    () => database.get<Message>("history"),
    [database]
  );
  const conversationsCollection = useMemo(
    () => database.get<Conversation>("conversations"),
    [database]
  );

  // Storage operations context
  const storageCtx = useMemo<StorageOperationsContext>(
    () => ({
      database,
      messagesCollection,
      conversationsCollection,
    }),
    [database, messagesCollection, conversationsCollection]
  );

  // Helper to embed a message after creation (non-blocking)
  // Uses chunking for long messages to improve semantic search precision
  const embedMessageAsync = useCallback(
    async (message: StoredMessage) => {
      if (!autoEmbedMessages || !getToken) return;
      // Skip short messages that won't provide useful search context
      if (message.content.length < DEFAULT_MIN_CONTENT_LENGTH) return;
      try {
        const embeddingOptions = {
          getToken,
          baseUrl,
          model: embeddingModel,
        };

        // Use chunking for long messages
        if (shouldChunkMessage(message.content, DEFAULT_CHUNK_SIZE)) {
          const textChunks = chunkText(message.content);
          const chunkTexts = textChunks.map((c) => c.text);
          const embeddings = await generateEmbeddings(chunkTexts, embeddingOptions);

          const messageChunks: MessageChunk[] = textChunks.map((chunk, i) => ({
            text: chunk.text,
            vector: embeddings[i],
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
          }));

          await updateMessageChunksOp(
            storageCtx,
            message.uniqueId,
            messageChunks,
            embeddingModel
          );
        } else {
          // Use whole-message embedding for short messages
          const embedding = await generateEmbedding(message.content, embeddingOptions);
          await updateMessageEmbeddingOp(
            storageCtx,
            message.uniqueId,
            embedding,
            embeddingModel
          );
        }
      } catch (err) {
        // Non-fatal: log but don't fail the message save
        console.warn("[useChatStorage] Failed to embed message:", err);
      }
    },
    [autoEmbedMessages, getToken, baseUrl, embeddingModel, storageCtx]
  );

  /**
   * Create a memory retrieval tool pre-configured with hook's context and auth
   */
  const createMemoryRetrievalTool = useCallback(
    (searchOptions?: Partial<MemoryRetrievalSearchOptions>): ToolConfig => {
      if (!getToken) {
        throw new Error("getToken is required for memory retrieval tool");
      }
      return createMemoryRetrievalToolBase(
        storageCtx,
        { getToken, baseUrl, model: embeddingModel },
        searchOptions
      );
    },
    [storageCtx, getToken, baseUrl, embeddingModel]
  );

  // Use the underlying useChat hook
  const {
    isLoading,
    sendMessage: baseSendMessage,
    stop,
  } = useChat({
    getToken,
    baseUrl,
    onData,
    onThinking,
    onFinish,
    onError,
    apiType,
  });

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(
    async (opts?: CreateConversationOptions): Promise<StoredConversation> => {
      const created = await createConversationOp(
        storageCtx,
        opts,
        defaultConversationTitle
      );
      setCurrentConversationId(created.conversationId);
      return created;
    },
    [storageCtx, defaultConversationTitle]
  );

  /**
   * Get a conversation by ID
   */
  const getConversation = useCallback(
    async (id: string): Promise<StoredConversation | null> => {
      return getConversationOp(storageCtx, id);
    },
    [storageCtx]
  );

  /**
   * Get all conversations (excluding soft-deleted)
   */
  const getConversations = useCallback(async (): Promise<
    StoredConversation[]
  > => {
    return getConversationsOp(storageCtx);
  }, [storageCtx]);

  /**
   * Update conversation title
   * @returns true if updated, false if conversation not found
   */
  const updateConversationTitle = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      return updateConversationTitleOp(storageCtx, id, title);
    },
    [storageCtx]
  );

  /**
   * Soft delete a conversation and cascade delete messages and media
   * @returns true if deleted, false if conversation not found
   */
  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      const deleted = await deleteConversationOp(storageCtx, id);
      if (deleted) {
        // Cascade delete messages
        await clearMessagesOp(storageCtx, id);
        // Cascade delete media for this conversation
        await deleteMediaByConversationOp({ database: storageCtx.database }, id);
        if (currentConversationId === id) {
          setCurrentConversationId(null);
        }
      }
      return deleted;
    },
    [storageCtx, currentConversationId]
  );

  /**
   * Get messages for a conversation
   */
  const getMessages = useCallback(
    async (convId: string): Promise<StoredMessage[]> => {
      const messages = await getMessagesOp(storageCtx, convId);

      // If wallet address is provided, resolve file placeholders to blob URLs
      if (
        walletAddress &&
        hasEncryptionKey(walletAddress) &&
        isOPFSSupported()
      ) {
        try {
          const encryptionKey = await getEncryptionKey(walletAddress);
          const blobManager = blobManagerRef.current;

          // Resolve placeholders in all messages in parallel
          const resolvedMessages = await Promise.all(
            messages.map(async (msg) => {
              const fileIds = [...new Set(extractFileIds(msg.content))];
              if (fileIds.length === 0) {
                return msg;
              }

             

              // Resolve all files to blob URLs and build a map
              const fileIdToUrlMap = new Map<string, string>();
              for (const fileId of fileIds) {
                const placeholder = createFilePlaceholder(fileId);
                

                // Check if we already have a URL for this file
                let url = blobManager.getUrl(fileId);

                if (!url) {
                  
                  // Read and decrypt the file
                  const result = await readEncryptedFile(fileId, encryptionKey);
                  if (result) {
                    url = blobManager.createUrl(fileId, result.blob);
                    
                  } else {
                    // eslint-disable-next-line no-console
                    console.warn(
                      `[getMessages] Failed to read file ${fileId} from OPFS`
                    );
                  }
                } 

                if (url) {
                  fileIdToUrlMap.set(fileId, url);
                } else {
                  // eslint-disable-next-line no-console
                  console.warn(
                    `[getMessages] No URL available for file, placeholder will remain in content`
                  );
                }
              }

              // Replace placeholders one at a time in order to ensure correct mapping
              // This avoids any potential issues with regex callback processing order
              let resolvedContent = msg.content;
              for (const [fileId, url] of fileIdToUrlMap) {
                const placeholder = createFilePlaceholder(fileId);
                // Escape the placeholder for use in regex
                const escapedPlaceholder = placeholder.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  "\\$&"
                );
                // Create a non-global regex for this specific placeholder
                const placeholderRegex = new RegExp(escapedPlaceholder, "g");
                // Use unique alt text with fileId to prevent UI blobUrlMap collisions
                const replacement = `![image-${fileId}](${url})`;

                resolvedContent = resolvedContent.replace(
                  placeholderRegex,
                  replacement
                );
              }

              return { ...msg, content: resolvedContent };
            })
          );

          return resolvedMessages;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            "[useChatStorage] Failed to resolve file placeholders:",
            error
          );
          // Return messages without resolving placeholders
          return messages;
        }
      }

      return messages;
    },
    [storageCtx, walletAddress]
  );

  /**
   * Get message count for a conversation
   */
  const getMessageCount = useCallback(
    async (convId: string): Promise<number> => {
      return getMessageCountOp(storageCtx, convId);
    },
    [storageCtx]
  );

  /**
   * Clear all messages in a conversation and cascade delete associated media
   */
  const clearMessages = useCallback(
    async (convId: string): Promise<void> => {
      await clearMessagesOp(storageCtx, convId);
      // Cascade delete media for this conversation
      await deleteMediaByConversationOp({ database: storageCtx.database }, convId);
    },
    [storageCtx]
  );

  /**
   * Ensure a conversation exists for the current ID or create a new one
   */
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (currentConversationId) {
      const existing = await getConversation(currentConversationId);
      if (existing) {
        return currentConversationId;
      }

      // Conversation ID is provided but doesn't exist in storage yet
      // Create it with the provided ID to maintain consistency
      if (autoCreateConversation) {
        const newConv = await createConversation({
          conversationId: currentConversationId,
        });
        return newConv.conversationId;
      }
    }

    if (autoCreateConversation) {
      const newConv = await createConversation();
      return newConv.conversationId;
    }

    throw new Error(
      "No conversation ID provided and autoCreateConversation is disabled"
    );
  }, [
    currentConversationId,
    getConversation,
    autoCreateConversation,
    createConversation,
  ]);

  /**
   * Extracts sources from assistant message content and returns them as SearchSource objects.
   * First attempts to parse a JSON sources block (```json { "sources": [...] }```),
   * then falls back to parsing markdown links [text](url) and plain URLs.
   * Merges extracted sources with any existing sources already attached to the message.
   */
  const extractSourcesFromAssistantMessage = useCallback(
    (assistantMessage: {
      content: string;
      sources?: SearchSource[];
    }): SearchSource[] => {
      try {
        const extractedSources: SearchSource[] = [];
        const seenUrls = new Set<string>();

        // Add existing sources first (they have priority)
        if (assistantMessage.sources) {
          for (const source of assistantMessage.sources) {
            if (source.url) {
              seenUrls.add(source.url);
            }
            extractedSources.push(source);
          }
        }

        const content = assistantMessage.content;
        if (!content) {
          return extractedSources;
        }

        // Try to extract JSON sources blocks first (supports multiple blocks)
        // Matches ```json { "sources": [...] } ``` or ``` { "sources": [...] } ```
        // Uses negative lookahead to avoid crossing triple-backtick boundaries
        const jsonBlockRegex =
          /```(?:json)?\s*(\{(?:(?!```)[^])*?"sources"(?:(?!```)[^])*?\})\s*```/g;
        let jsonMatch: RegExpExecArray | null;
        let foundJsonSources = false;

        while ((jsonMatch = jsonBlockRegex.exec(content)) !== null) {
          if (jsonMatch[1]) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              if (Array.isArray(parsed.sources)) {
                foundJsonSources = true;
                for (const source of parsed.sources) {
                  if (source.url && !seenUrls.has(source.url)) {
                    seenUrls.add(source.url);
                    extractedSources.push({
                      title: source.title || undefined,
                      url: source.url,
                      // Map 'description' from JSON to 'snippet' in SearchSource type
                      snippet:
                        source.description || source.snippet || undefined,
                    });
                  }
                }
              }
            } catch {
              // JSON parsing failed for this block, continue to next
            }
          }
        }

        // If we found any JSON sources, return them without parsing markdown links
        if (foundJsonSources) {
          return extractedSources;
        }

        // Fallback: Extract markdown links and plain URLs
        // Regex to match markdown links: [title](url) with support for balanced parentheses
        const markdownLinkRegex =
          /\[([^\]]*)\]\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

        // Regex to match plain URLs (http, https)
        const plainUrlRegex =
          /(?<![(\[])https?:\/\/[^\s<>\[\]()'"]+(?<![.,;:!?])/g;

        // Extract markdown links
        let match: RegExpExecArray | null;
        while ((match = markdownLinkRegex.exec(content)) !== null) {
          const title = match[1].trim();
          const url = match[2].trim();

          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            extractedSources.push({
              title: title || undefined,
              url: url,
            });
          }
        }

        // Extract plain URLs (not already captured in markdown links)
        while ((match = plainUrlRegex.exec(content)) !== null) {
          const url = match[0].trim();

          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            // Try to extract a title from the URL domain
            try {
              const urlObj = new URL(url);
              extractedSources.push({
                title: urlObj.hostname,
                url: url,
              });
            } catch {
              extractedSources.push({
                url: url,
              });
            }
          }
        }

        return extractedSources;
      } catch (err) {
        return []; // Return empty array if error occurs
      }
    },
    []
  );

  const extractAndStoreMCPImages = useCallback(
    async (
      content: string,
      writeFile: (
        fileId: string,
        blob: Blob,
        options?: {
          onProgress?: (progress: number) => void;
          signal?: AbortSignal;
        }
      ) => Promise<string>,
      options?: {
        /** Whether to replace URLs with placeholders in the content. Default: true */
        replaceUrls?: boolean;
      }
    ): Promise<{
      processedFiles: {
        id: string;
        name: string;
        type: string;
        size: number;
        /** Original source URL for URL→OPFS mapping */
        sourceUrl: string;
      }[];
      cleanedContent: string;
    }> => {
      const { replaceUrls = true } = options ?? {};
      try {
        // Pattern to match any URL from the MCP R2 domain
        // Stops at quotes, angle brackets, whitespace, or closing parens to handle HTML attributes
        const MCP_IMAGE_URL_PATTERN = new RegExp(
          `https://${MCP_R2_DOMAIN.replace(/\./g, "\\.")}[^\\s"'<>)]*`,
          "g"
        );
        // Find all MCP image URLs in the content
        const urlMatches = content.match(MCP_IMAGE_URL_PATTERN);
        if (!urlMatches || urlMatches.length === 0) {
          return { processedFiles: [], cleanedContent: content };
        }

        // Clean URLs by removing any trailing quotes or invalid characters
        const cleanedUrls = urlMatches.map((url) => url.replace(/["']+$/, ""));
        // Deduplicate URLs (same image might appear multiple times)
        const uniqueUrls = [...new Set(cleanedUrls)];

        const processedFiles: {
          id: string;
          name: string;
          type: string;
          size: number;
          sourceUrl: string;
        }[] = [];
        let cleanedContent = content;

        // Track expected URL occurrences for verification
        const urlOccurrenceCounts = new Map<string, number>();
        uniqueUrls.forEach((url) => {
          const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          // Count all occurrences: HTML img tags, markdown images, and raw URLs
          const htmlDoublePattern = new RegExp(
            `<img[^>]*src="${escapedUrl}"[^>]*>`,
            "gi"
          );
          const htmlSinglePattern = new RegExp(
            `<img[^>]*src='${escapedUrl}'[^>]*>`,
            "gi"
          );
          const markdownPattern = new RegExp(
            `!\\[[^\\]]*\\]\\([\\s]*${escapedUrl}[\\s]*\\)`,
            "g"
          );
          const rawPattern = new RegExp(escapedUrl, "g");

          const htmlDoubleMatches =
            content.match(htmlDoublePattern)?.length || 0;
          const htmlSingleMatches =
            content.match(htmlSinglePattern)?.length || 0;
          const markdownMatches = content.match(markdownPattern)?.length || 0;
          // For raw URLs, subtract already counted ones to avoid double counting
          const rawMatches =
            (content.match(rawPattern)?.length || 0) -
            htmlDoubleMatches -
            htmlSingleMatches -
            markdownMatches;

          urlOccurrenceCounts.set(
            url,
            htmlDoubleMatches + htmlSingleMatches + markdownMatches + rawMatches
          );
        });

        // Process all images in parallel
        const results = await Promise.allSettled(
          uniqueUrls.map(async (imageUrl) => {
            // Add timeout to prevent indefinite hangs
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            try {
              const response = await fetch(imageUrl, {
                signal: controller.signal,
                cache: "no-store", // Prevent caching issues with CORS
              });

              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
              }

              const blob = await response.blob();
              const fileId = crypto.randomUUID();
              // Infer extension from URL path (before query params) or fallback to png
              const urlPath = imageUrl.split("?")[0] ?? imageUrl;
              const extension =
                urlPath.match(/\.([a-zA-Z0-9]+)$/)?.[1] || "png";
              const mimeType = blob.type || `image/${extension}`;
              const fileName = `mcp-generated-image-${Date.now()}-${fileId.slice(
                0,
                8
              )}.${extension}`;

              // Store in OPFS
              await writeFile(fileId, blob);

              return { fileId, fileName, mimeType, size: blob.size, imageUrl };
            } finally {
              clearTimeout(timeoutId);
            }
          })
        );

        // Helper to replace URL with placeholder (only used on success)
        // Returns the number of replacements made for verification
        const replaceUrlWithPlaceholder = (
          imageUrl: string,
          fileId: string
        ): number => {
          const escapedUrl = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          // Create internal placeholder (never shown to clients)
          const placeholder = createFilePlaceholder(fileId);
          let replacementCount = 0;

          // Replace HTML img tags with double-quoted src
          const htmlImgPatternDouble = new RegExp(
            `<img[^>]*src="${escapedUrl}"[^>]*>`,
            "gi"
          );
          const doubleMatches = cleanedContent.match(htmlImgPatternDouble);
          if (doubleMatches) {
            replacementCount += doubleMatches.length;
            cleanedContent = cleanedContent.replace(
              htmlImgPatternDouble,
              placeholder
            );
          }

          // Replace HTML img tags with single-quoted src
          const htmlImgPatternSingle = new RegExp(
            `<img[^>]*src='${escapedUrl}'[^>]*>`,
            "gi"
          );
          const singleMatches = cleanedContent.match(htmlImgPatternSingle);
          if (singleMatches) {
            replacementCount += singleMatches.length;
            cleanedContent = cleanedContent.replace(
              htmlImgPatternSingle,
              placeholder
            );
          }

          // Replace markdown image syntax: ![alt](url) -> placeholder
          // This pattern allows for optional whitespace/newlines around the URL
          const markdownImagePattern = new RegExp(
            `!\\[[^\\]]*\\]\\([\\s]*${escapedUrl}[\\s]*\\)`,
            "g"
          );
          const markdownMatches = cleanedContent.match(markdownImagePattern);
          if (markdownMatches) {
            replacementCount += markdownMatches.length;
            cleanedContent = cleanedContent.replace(
              markdownImagePattern,
              placeholder
            );
          }

          // Replace raw URLs with placeholder (only if not already replaced)
          // This handles cases where the URL appears without markdown syntax or HTML tags
          const rawUrlPattern = new RegExp(escapedUrl, "g");
          const rawMatches = cleanedContent.match(rawUrlPattern);
          if (rawMatches) {
            replacementCount += rawMatches.length;
            cleanedContent = cleanedContent.replace(rawUrlPattern, placeholder);
          }

          return replacementCount;
        };

        // Process results and optionally replace URLs with placeholders
        results.forEach((result, i) => {
          const imageUrl = uniqueUrls[i];

          if (result.status === "fulfilled") {
            const { fileId, fileName, mimeType, size } = result.value;
            processedFiles.push({
              id: fileId,
              name: fileName,
              type: mimeType,
              size,
              sourceUrl: imageUrl,
            });

            // Replace URL with placeholder on SUCCESS (only if replaceUrls is enabled)
            // Placeholders will be resolved to blob URLs when messages are retrieved
            if (replaceUrls && imageUrl) {
              const replacementCount = replaceUrlWithPlaceholder(
                imageUrl,
                fileId
              );
              const expectedCount = urlOccurrenceCounts.get(imageUrl) || 0;

              // Verify all instances were replaced
              if (replacementCount < expectedCount) {
                // eslint-disable-next-line no-console
                console.warn(
                  `[extractAndStoreMCPImages] Not all instances of URL replaced. Expected ${expectedCount}, replaced ${replacementCount}`
                );
              }

              // Double-check: verify no remaining instances of the URL
              const escapedUrl = imageUrl.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              );
              const remainingPattern = new RegExp(escapedUrl, "g");
              const remainingMatches = cleanedContent.match(remainingPattern);
              if (remainingMatches && remainingMatches.length > 0) {
                // eslint-disable-next-line no-console
                console.warn(
                  `[extractAndStoreMCPImages] Found ${remainingMatches.length} remaining instance(s) of URL after replacement`
                );
              }
            }
          } else {
            // eslint-disable-next-line no-console
            console.error(
              "[handleMcpImageUrl] Failed to process image:",
              result.reason
            );
            // On FAILURE: Keep URL in content so user can still click it
            // MarkdownRenderer will show it as a clickable link
          }
        });

        // Clean up extra newlines
        cleanedContent = cleanedContent.replace(/\n{3,}/g, "\n\n").trim();

        return {
          processedFiles: processedFiles.length > 0 ? processedFiles : [],
          cleanedContent,
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[handleMcpImageUrl] Unexpected error:", err);
        // Don't throw - let the original message remain as-is if processing fails completely
        return { processedFiles: [], cleanedContent: content };
      }
    },
    []
  );

  /**
   * Extract dimensions from an image blob.
   */
  const getImageDimensions = useCallback(
    async (
      blob: Blob
    ): Promise<{ width: number; height: number } | undefined> => {
      if (!blob.type.startsWith("image/")) {
        return undefined;
      }
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
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
   * @param responseModel - AI model that generated the images
   * @returns Object with fileIds (mediaIds) and cleaned content with placeholders
   */
  const extractAndStoreEncryptedMCPImages = useCallback(
    async (
      content: string,
      address: string,
      conversationId: string,
      responseModel?: string
    ): Promise<{
      fileIds: string[];
      cleanedContent: string;
    }> => {
      try {
        // Check prerequisites
        if (!isOPFSSupported()) {
          return { fileIds: [], cleanedContent: content };
        }

        if (!hasEncryptionKey(address)) {
          return { fileIds: [], cleanedContent: content };
        }

        // Pattern to match any URL from the MCP R2 domain
        // Stops at quotes, angle brackets, whitespace, or closing parens to handle HTML attributes
        const MCP_IMAGE_URL_PATTERN = new RegExp(
          `https://${MCP_R2_DOMAIN.replace(/\./g, "\\.")}[^\\s"'<>)]*`,
          "g"
        );

        const urlMatches = content.match(MCP_IMAGE_URL_PATTERN);
        if (!urlMatches || urlMatches.length === 0) {
          return { fileIds: [], cleanedContent: content };
        }

        // Clean URLs by removing any trailing quotes or invalid characters
        const cleanedUrls = urlMatches.map((url) => url.replace(/["']+$/, ""));
        const uniqueUrls = [...new Set(cleanedUrls)];
        const encryptionKey = await getEncryptionKey(address);

        const mediaOptions: CreateMediaOptions[] = [];
        const mediaIdToPlaceholder: Map<string, string> = new Map();
        let cleanedContent = content;

        // Track expected URL occurrences for verification
        const urlOccurrenceCounts = new Map<string, number>();
        uniqueUrls.forEach((url) => {
          const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          // Count all occurrences: HTML img tags, markdown images, and raw URLs
          const htmlDoublePattern = new RegExp(
            `<img[^>]*src="${escapedUrl}"[^>]*>`,
            "gi"
          );
          const htmlSinglePattern = new RegExp(
            `<img[^>]*src='${escapedUrl}'[^>]*>`,
            "gi"
          );
          const markdownPattern = new RegExp(
            `!\\[[^\\]]*\\]\\([\\s]*${escapedUrl}[\\s]*\\)`,
            "g"
          );
          const rawPattern = new RegExp(escapedUrl, "g");

          const htmlDoubleMatches =
            content.match(htmlDoublePattern)?.length || 0;
          const htmlSingleMatches =
            content.match(htmlSinglePattern)?.length || 0;
          const markdownMatches = content.match(markdownPattern)?.length || 0;
          // For raw URLs, subtract already counted ones to avoid double counting
          const rawMatches =
            (content.match(rawPattern)?.length || 0) -
            htmlDoubleMatches -
            htmlSingleMatches -
            markdownMatches;

          urlOccurrenceCounts.set(
            url,
            htmlDoubleMatches + htmlSingleMatches + markdownMatches + rawMatches
          );
        });

        // Process all images in parallel
        const results = await Promise.allSettled(
          uniqueUrls.map(async (imageUrl) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
              const response = await fetch(imageUrl, {
                signal: controller.signal,
                cache: "no-store",
              });

              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
              }

              const blob = await response.blob();
              const mediaId = generateMediaId();
              const urlPath = imageUrl.split("?")[0] ?? imageUrl;
              const extension =
                urlPath.match(/\.([a-zA-Z0-9]+)$/)?.[1] || "png";
              const mimeType = blob.type || `image/${extension}`;
              const fileName = `mcp-image-${Date.now()}-${mediaId.slice(
                6,
                14
              )}.${extension}`;

              // Extract dimensions
              const dimensions = await getImageDimensions(blob);

              // Encrypt and store in OPFS using mediaId
              await writeEncryptedFile(mediaId, blob, encryptionKey, {
                name: fileName,
                sourceUrl: imageUrl,
              });

              return {
                mediaId,
                fileName,
                mimeType,
                size: blob.size,
                imageUrl,
                dimensions,
              };
            } finally {
              clearTimeout(timeoutId);
            }
          })
        );

        // Replace URLs with internal placeholders and collect media options
        results.forEach((result, i) => {
          const imageUrl = uniqueUrls[i];

          if (result.status === "fulfilled") {
            const { mediaId, fileName, mimeType, size, dimensions } =
              result.value;

            // Prepare media record
            mediaOptions.push({
              mediaId,
              walletAddress: address,
              conversationId,
              name: fileName,
              mimeType,
              mediaType: "image",
              size,
              role: "assistant",
              model: responseModel,
              sourceUrl: imageUrl,
              dimensions,
            });

            // Create internal placeholder (never shown to clients)
            const placeholder = createFilePlaceholder(mediaId);
            mediaIdToPlaceholder.set(mediaId, placeholder);
            const escapedUrl = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            let replacementCount = 0;

            // Replace HTML img tags with double-quoted src
            const htmlImgPatternDouble = new RegExp(
              `<img[^>]*src="${escapedUrl}"[^>]*>`,
              "gi"
            );
            const doubleMatches = cleanedContent.match(htmlImgPatternDouble);
            if (doubleMatches) {
              replacementCount += doubleMatches.length;
              cleanedContent = cleanedContent.replace(
                htmlImgPatternDouble,
                placeholder
              );
            }

            // Replace HTML img tags with single-quoted src
            const htmlImgPatternSingle = new RegExp(
              `<img[^>]*src='${escapedUrl}'[^>]*>`,
              "gi"
            );
            const singleMatches = cleanedContent.match(htmlImgPatternSingle);
            if (singleMatches) {
              replacementCount += singleMatches.length;
              cleanedContent = cleanedContent.replace(
                htmlImgPatternSingle,
                placeholder
              );
            }

            // Replace markdown image syntax
            const markdownImagePattern = new RegExp(
              `!\\[[^\\]]*\\]\\([\\s]*${escapedUrl}[\\s]*\\)`,
              "g"
            );
            const markdownMatches = cleanedContent.match(markdownImagePattern);
            if (markdownMatches) {
              replacementCount += markdownMatches.length;
              cleanedContent = cleanedContent.replace(
                markdownImagePattern,
                placeholder
              );
            }

            // Replace raw URLs (only if not already replaced)
            const rawUrlPattern = new RegExp(escapedUrl, "g");
            const rawMatches = cleanedContent.match(rawUrlPattern);
            if (rawMatches) {
              replacementCount += rawMatches.length;
              cleanedContent = cleanedContent.replace(
                rawUrlPattern,
                placeholder
              );
            }

            // Verify all instances were replaced
            const expectedCount = urlOccurrenceCounts.get(imageUrl) || 0;
            if (replacementCount < expectedCount) {
              // eslint-disable-next-line no-console
              console.warn(
                `[extractAndStoreEncryptedMCPImages] Not all instances replaced. Expected ${expectedCount}, replaced ${replacementCount}`
              );
            }
          }
        });

        cleanedContent = cleanedContent.replace(/\n{3,}/g, "\n\n").trim();

        // Batch create media records
        let createdMediaIds: string[] = [];
        if (mediaOptions.length > 0) {
          
          try {
            const createdMedia = await createMediaBatchOp(
              { database },
              mediaOptions
            );
            createdMediaIds = createdMedia.map((m) => m.mediaId);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(
              "[extractAndStoreEncryptedMCPImages] ❌ Failed to create media records:",
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
          }
        }
        return { fileIds: createdMediaIds, cleanedContent };
      } catch (err) {
        return { fileIds: [], cleanedContent: content };
      }
    },
    [database, getImageDimensions]
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
    async (
      files: FileMetadata[],
      address: string,
      conversationId: string
    ): Promise<string[]> => {
      const canUseOPFS = isOPFSSupported() && hasEncryptionKey(address);
      let encryptionKey: CryptoKey | undefined;

      if (canUseOPFS) {
        try {
          encryptionKey = await getEncryptionKey(address);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            "[storeUserFilesInOPFS] Failed to get encryption key:",
            err
          );
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
              const timeoutId = setTimeout(() => controller.abort(), 30000);
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
            // eslint-disable-next-line no-console
            console.log(
              `[storeUserFilesInOPFS] Stored file ${mediaId} (${file.name}) in OPFS`
            );
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(
              `[storeUserFilesInOPFS] Failed to store file in OPFS:`,
              err
            );
            // Will fall back to sourceUrl below
          }
        }

        // If not stored in OPFS, use sourceUrl (only for external URLs, not data URIs)
        if (!storedInOPFS) {
          sourceUrl =
            file.url && !file.url.startsWith("data:") ? file.url : undefined;
          // If it's a data URI and we can't store in OPFS, we can't persist the file content
          if (!sourceUrl) {
            // eslint-disable-next-line no-console
            console.warn(
              `[storeUserFilesInOPFS] Cannot persist data URI without OPFS: ${file.name}`
            );
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
        const createdMedia = await createMediaBatchOp({ database }, mediaOptions);
        const mediaIds = createdMedia.map((m) => m.mediaId);
        // eslint-disable-next-line no-console
        console.log(
          `[storeUserFilesInOPFS] Created ${mediaIds.length} media record(s)`
        );
        return mediaIds;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "[storeUserFilesInOPFS] Failed to create media records:",
          err
        );
        // Clean up orphaned OPFS files since media records weren't created
        for (const opt of mediaOptions) {
          if (opt.mediaId) {
            try {
              await deleteEncryptedFile(opt.mediaId);
              // eslint-disable-next-line no-console
              console.log(
                `[storeUserFilesInOPFS] Cleaned up orphaned OPFS file ${opt.mediaId}`
              );
            } catch {
              // Ignore cleanup errors
            }
          }
        }
        return [];
      }
    },
    [database, getImageDimensions]
  );

  /**
   * Send a message with automatic storage
   */
  const sendMessage = useCallback(
    async (
      args: SendMessageWithStorageArgs
    ): Promise<SendMessageWithStorageResult> => {
      const {
        messages,
        model,
        includeHistory = true,
        maxHistoryMessages = 50,
        files,
        onData: perRequestOnData,
        headers,
        memoryContext,
        searchContext,
        sources,
        thoughtProcess,
        // Responses API options
        temperature,
        maxOutputTokens,
        clientTools,
        serverTools: serverToolsFilter,
        toolChoice,
        reasoning,
        thinking,
        onThinking,
        apiType: requestApiType,
        writeFile,
        conversationId: explicitConversationId,
      } = args;

      // Extract user message content for storage
      const extracted = extractUserMessageFromMessages(messages);
      if (!extracted || !extracted.content) {
        return {
          data: null,
          error: "No user message found in messages array",
        };
      }
      const contentForStorage = extracted.content; // Original content for DB storage
      // Use provided files, or fall back to files extracted from the message
      const filesForStorage = files ?? extracted.files;

      // Preprocess files if present to generate file context
      let fileContextForRequest: string | undefined;
      let preprocessedFileIds: string[] = [];
      if (filesForStorage && filesForStorage.length > 0) {
        try {
          const preprocessingResult = await preprocessFiles(filesForStorage, {
            processors: fileProcessors,
            ...fileProcessingOptions,
          });

          // Store extracted content as file context (will be injected as system message)
          if (preprocessingResult.extractedContent) {
            fileContextForRequest = preprocessingResult.extractedContent;
            preprocessedFileIds = preprocessingResult.preprocessedFileIds;
            console.log('[Preprocessing] Preprocessed file IDs:', preprocessedFileIds);
            console.log('[Preprocessing] Extracted content length:', fileContextForRequest.length);
          }
        } catch (error) {
          // Non-fatal error - log and continue without preprocessing
          console.error("File preprocessing error:", error);
        }
      }

      // Ensure we have a conversation
      // If an explicit conversationId is provided, use it directly (bypasses state timing issues)
      let convId: string;
      if (explicitConversationId) {
        // Verify the conversation exists
        const existing = await getConversation(explicitConversationId);
        if (existing) {
          convId = explicitConversationId;
        } else {
          return {
            data: null,
            error: `Conversation ${explicitConversationId} not found`,
          };
        }
      } else {
        try {
          convId = await ensureConversation();
        } catch (err) {
          return {
            data: null,
            error:
              err instanceof Error
                ? err.message
                : "Failed to ensure conversation",
          };
        }
      }

      // Build the messages array
      let messagesToSend: LlmapiMessage[] = [];

      // Include history if requested
      if (includeHistory) {
        // Get raw messages from database (not transformed for client display)
        // This ensures we have the original placeholders, not blob URLs
        const storedMessages = await getMessagesOp(storageCtx, convId);
        // Filter out errored messages and limit history to most recent messages
        const validMessages = storedMessages.filter((msg) => !msg.error);
        const limitedMessages = validMessages.slice(-maxHistoryMessages);

        // Collect file context from conversation history if we don't have it from current message
        // Look for the most recent message with extracted file content (stored in thinking field)
        if (!fileContextForRequest) {
          for (let i = limitedMessages.length - 1; i >= 0; i--) {
            const msg = limitedMessages[i];
            if (msg.thinking && msg.thinking.startsWith("[Extracted content from ")) {
              fileContextForRequest = msg.thinking;
              break;
            }
          }
        }

        // Convert stored messages to API format
        // Get encryption key if available for reading user files from OPFS
        let encryptionKey: CryptoKey | undefined;
        if (walletAddress && hasEncryptionKey(walletAddress) && isOPFSSupported()) {
          try {
            encryptionKey = await getEncryptionKey(walletAddress);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[sendMessage] Failed to get encryption key for history:", err);
          }
        }
        const historyMessages = await Promise.all(
          limitedMessages.map((msg) => storedToLlmapiMessage(msg, encryptionKey))
        );
        messagesToSend = [...historyMessages, ...messages];
      } else {
        // Use provided messages directly
        messagesToSend = [...messages];
      }

      // If we have file context, remove file attachments from the user message to avoid sending large base64 data
      if (fileContextForRequest) {
        console.log('[Preprocessing] File context exists, filtering files from message');
        // Find the last user message in messagesToSend
        let lastUserMessageIndex = -1;
        for (let i = messagesToSend.length - 1; i >= 0; i--) {
          if (messagesToSend[i].role === "user") {
            lastUserMessageIndex = i;
            break;
          }
        }

        if (lastUserMessageIndex !== -1) {
          const lastUserMessage = messagesToSend[lastUserMessageIndex];
          console.log('[Preprocessing] Last user message content parts:', lastUserMessage.content?.length);
          if (lastUserMessage.content && Array.isArray(lastUserMessage.content)) {
            // Remove only the files that were actually preprocessed
            // Keep images and other files that weren't processed (e.g., for vision)
            messagesToSend[lastUserMessageIndex] = {
              ...lastUserMessage,
              content: lastUserMessage.content.filter((part) => {
                // Keep text parts
                if (part.type === "text") return true;

                // For input_file parts, check if this specific file was preprocessed
                if (part.type === "input_file" && part.file) {
                  const fileId = part.file.file_id;
                  const shouldKeep = !fileId || !preprocessedFileIds.includes(fileId);
                  console.log('[Preprocessing] input_file part, file_id:', fileId, 'shouldKeep:', shouldKeep);
                  return shouldKeep;
                }

                // For image_url parts, check if the URL matches a preprocessed file
                if (part.type === "image_url" && part.image_url?.url) {
                  // Only remove if this specific image was preprocessed
                  // Images without matching IDs are kept for vision
                  const matchesPreprocessed = filesForStorage?.some(
                    (f) => preprocessedFileIds.includes(f.id) && f.url === part.image_url?.url
                  );
                  return !matchesPreprocessed;
                }

                // Keep all other content types
                return true;
              }),
            };
          }
        }
      }

      // Store the user message
      // If wallet address is available, store files in media table and OPFS
      // The new approach uses fileIds referencing the media table
      let userFileIds: string[] = [];
      if (filesForStorage && filesForStorage.length > 0 && walletAddress) {
        // Store files and create media records
        userFileIds = await storeUserFilesInOPFS(
          filesForStorage,
          walletAddress,
          convId
        );
      }

      let storedUserMessage: StoredMessage;
      try {
        storedUserMessage = await createMessageOp(storageCtx, {
          conversationId: convId,
          role: "user",
          content: contentForStorage,
          fileIds: userFileIds.length > 0 ? userFileIds : undefined,
          model,
          // Store extracted file content in thinking field for retrieval in follow-up messages
          thinking: fileContextForRequest,
        });
      } catch (err) {
        // Clean up OPFS files if message creation failed to avoid orphaned files
        if (userFileIds.length > 0) {
          for (const mediaId of userFileIds) {
            try {
              await deleteEncryptedFile(mediaId);
              await hardDeleteMediaOp({ database }, mediaId);
              
            } catch {
              // Ignore cleanup errors
            }
          }
        }
        return {
          data: null,
          error:
            err instanceof Error ? err.message : "Failed to store user message",
        };
      }

      // Embed user message (non-blocking)
      embedMessageAsync(storedUserMessage);

      // Update media records with the messageId now that we have it
      if (userFileIds.length > 0) {
        try {
          await updateMediaMessageIdBatchOp(
            { database },
            userFileIds,
            storedUserMessage.uniqueId
          );
        } catch (err) {
          // Non-fatal - log but continue
          // eslint-disable-next-line no-console
          console.warn(
            "[sendMessage] Failed to update user media records with messageId:",
            err
          );
        }
      }

      // Track response timing
      const startTime = Date.now();

      // Determine effective API type for this request
      const effectiveApiType = requestApiType ?? apiType ?? "responses";

      // Fetch and merge server-side tools with client tools
      let mergedTools: ReturnType<typeof mergeTools> | undefined = undefined;
      let filteredServerTools: ServerTool[] = [];

      // Skip server tools fetch if serverTools is explicitly empty array
      if (
        getToken &&
        !(serverToolsFilter && serverToolsFilter.length === 0)
      ) {
        try {
          const allServerTools = await getServerTools({
            baseUrl,
            cacheExpirationMs: serverToolsConfig?.cacheExpirationMs,
            getToken,
          });
          filteredServerTools = filterServerTools(
            allServerTools,
            serverToolsFilter
          );
        } catch (error) {
          // Log but don't block - server tools are optional
          // eslint-disable-next-line no-console
          console.warn(
            "[useChatStorage] Failed to fetch server tools:",
            error
          );
        }
      }

      // Merge and format tools (handles both server and client tools)
      if (filteredServerTools.length > 0 || (clientTools && clientTools.length > 0)) {
        mergedTools = mergeTools(
          filteredServerTools,
          clientTools,
          effectiveApiType
        );
      }

      // Send the message using the underlying useChat
      const result = await baseSendMessage({
        messages: messagesToSend,
        model,
        onData: perRequestOnData,
        headers,
        memoryContext,
        searchContext,
        fileContext: fileContextForRequest,
        // Responses API options
        temperature,
        maxOutputTokens,
        tools: mergedTools,
        toolChoice,
        reasoning,
        thinking,
        onThinking,
        apiType: requestApiType,
      });

      const responseDuration = (Date.now() - startTime) / 1000;

      if (result.error || !result.data) {
        // If aborted, store the message with wasStopped=true (even without partial data)
        const abortedResult = result as {
          data: LlmapiResponseResponse | null;
          error: string;
        };

        if (abortedResult.error === "Request aborted") {
          // Extract content if we have partial data, otherwise empty string
          // Find the message output item (type: "message") for main content
          const messageOutput = abortedResult.data?.output?.find(
            (item) => item.type === "message"
          );
          const assistantContent =
            messageOutput?.content
              ?.map((part: { text?: string }) => part.text || "")
              .join("") || "";

          // Find the reasoning output item (type: "reasoning") for thinking content
          const reasoningOutput = abortedResult.data?.output?.find(
            (item) => item.type === "reasoning"
          );
          const abortedThinkingContent =
            reasoningOutput?.content
              ?.map((part: { text?: string }) => part.text || "")
              .join("") || undefined;

          const responseModel = abortedResult.data?.model || model || "";

          // Store the assistant message as stopped
          let storedAssistantMessage: StoredMessage;
          try {
            storedAssistantMessage = await createMessageOp(storageCtx, {
              conversationId: convId,
              role: "assistant",
              content: assistantContent,
              model: responseModel,
              usage: convertUsageToStored(abortedResult.data?.usage),
              responseDuration,
              wasStopped: true,
              sources,
              thoughtProcess: finalizeThoughtProcess(thoughtProcess),
              thinking: abortedThinkingContent,
            });

            // Embed assistant message (non-blocking)
            embedMessageAsync(storedAssistantMessage);

            // Build a valid response for the return (even if original was null)
            const responseData: LlmapiResponseResponse = abortedResult.data || {
              id: `aborted-${Date.now()}`,
              model: responseModel,
              object: "response",
              output: [
                {
                  type: "message",
                  role: "assistant",
                  content: [{ type: "output_text", text: assistantContent }],
                  status: "completed",
                },
              ],
              usage: undefined,
            };

            return {
              data: responseData,
              error: null, // Treat as success to the caller
              userMessage: storedUserMessage,
              assistantMessage: storedAssistantMessage,
            };
          } catch {
            // Storage failed for abort - don't set error field on stored messages
            // so they won't be filtered from history. Aborts are intentional, not failures.
            // The return value's `error` informs the caller, but StoredMessage.error stays unset.
            return {
              data: null,
              error: "Request aborted",
              userMessage: storedUserMessage,
            };
          }
        }

        // Store an assistant message with error for non-abort errors
        // Also update the user message with the error so both are filtered from history
        const errorMessage = result.error || "No response data received";
        try {
          await updateMessageErrorOp(
            storageCtx,
            storedUserMessage.uniqueId,
            errorMessage
          );
          await createMessageOp(storageCtx, {
            conversationId: convId,
            role: "assistant",
            content: "",
            model: model || "",
            responseDuration,
            sources,
            thoughtProcess: finalizeThoughtProcess(thoughtProcess),
            error: errorMessage,
          });
        } catch {
          // Ignore storage failure for error message
        }

        return {
          data: null,
          error: errorMessage,
          userMessage: { ...storedUserMessage, error: errorMessage },
        };
      }

      // Extract assistant response content and thinking/reasoning
      // Handle both Responses API (output[]) and Completions API (choices[]) formats
      const responseData = result.data;
      let assistantContent = "";
      let thinkingContent: string | undefined;

      if ("output" in responseData && responseData.output) {
        // Responses API format
        type OutputItem = { type?: string; content?: Array<{ text?: string }> };
        const messageOutput = (responseData.output as OutputItem[]).find(
          (item) => item.type === "message"
        );
        assistantContent =
          messageOutput?.content
            ?.map((part) => part.text || "")
            .join("") || "";

        const reasoningOutput = (responseData.output as OutputItem[]).find(
          (item) => item.type === "reasoning"
        );
        thinkingContent =
          reasoningOutput?.content
            ?.map((part) => part.text || "")
            .join("") || undefined;
      } else if ("choices" in responseData && responseData.choices) {
        // Completions API format
        const completionsData = responseData as LlmapiChatCompletionResponse;
        const choice = completionsData.choices?.[0];
        const message = choice?.message;
        if (message?.content) {
          // Content can be string or array
          if (Array.isArray(message.content)) {
            assistantContent = message.content
              .map((part: { text?: string }) => part.text || "")
              .join("");
          } else {
            assistantContent = String(message.content);
          }
        }
      }

      // Extract sources from assistant content and combine with passed sources (deduplicates internally)
      // Filter out MCP image URLs from sources (they are handled separately as files)
      const combinedSources = extractSourcesFromAssistantMessage({
        content: assistantContent,
        sources,
      }).filter((source) => !source.url?.includes(MCP_R2_DOMAIN));

      // Strip JSON sources block from content (if present)
      // Matches ```json { "sources": [...] } ``` or ``` { "sources": [...] } ```
      const jsonSourcesBlockRegex =
        /```(?:json)?\s*\{(?:(?!```)[^])*?"sources"(?:(?!```)[^])*?\}\s*```/g;
      let cleanedContent = assistantContent
        .replace(jsonSourcesBlockRegex, "")
        .trim();
      // Clean up extra newlines left after stripping
      cleanedContent = cleanedContent.replace(/\n{3,}/g, "\n\n");

      // Extract and store MCP images
      // Priority: walletAddress (encrypted OPFS with media records) > writeFile callback > skip
      let assistantFileIds: string[] = [];

      if (walletAddress) {
        // Use encrypted OPFS storage with media records
        const result = await extractAndStoreEncryptedMCPImages(
          cleanedContent,
          walletAddress,
          convId,
          responseData.model || model
        );
        assistantFileIds = result.fileIds;
        cleanedContent = result.cleanedContent;
      } else if (writeFile) {
        // Fall back to writeFile callback with __SDKFILE__ placeholders (no media records)
        const result = await extractAndStoreMCPImages(
          cleanedContent,
          writeFile
        );
        // Don't set assistantFileIds here - writeFile handles storage externally
        // and no media records are created, so lookups via getMediaByIds() would fail
        cleanedContent = result.cleanedContent;
      }

      // Store the assistant message
      
      let storedAssistantMessage: StoredMessage;
      try {
        storedAssistantMessage = await createMessageOp(storageCtx, {
          conversationId: convId,
          role: "assistant",
          content: cleanedContent,
          model: responseData.model || model,
          fileIds: assistantFileIds.length > 0 ? assistantFileIds : undefined,
          usage: convertUsageToStored(responseData.usage),
          responseDuration,
          sources: combinedSources,
          thoughtProcess: finalizeThoughtProcess(thoughtProcess),
          thinking: thinkingContent,
        });

        // Embed assistant message (non-blocking)
        embedMessageAsync(storedAssistantMessage);
      } catch (err) {
        // Clean up OPFS files and media records if message creation failed
        if (assistantFileIds.length > 0) {
          for (const mediaId of assistantFileIds) {
            try {
              await deleteEncryptedFile(mediaId);
              await hardDeleteMediaOp({ database }, mediaId);
              
            } catch {
              // Ignore cleanup errors
            }
          }
        }
        return {
          data: null,
          error:
            err instanceof Error
              ? err.message
              : "Failed to store assistant message",
          userMessage: storedUserMessage,
        };
      }

      // Update assistant media records with the messageId now that we have it
      if (assistantFileIds.length > 0) {
        try {
          await updateMediaMessageIdBatchOp(
            { database },
            assistantFileIds,
            storedAssistantMessage.uniqueId
          );
        } catch (err) {
          // Non-fatal - log but continue
          // eslint-disable-next-line no-console
          console.warn(
            "[sendMessage] Failed to update assistant media records with messageId:",
            err
          );
        }
      }

      return {
        data: responseData,
        error: null,
        userMessage: storedUserMessage,
        assistantMessage: storedAssistantMessage,
      };
    },
    [
      ensureConversation,
      getMessages,
      storageCtx,
      baseSendMessage,
      walletAddress,
      extractAndStoreEncryptedMCPImages,
      embedMessageAsync,
    ]
  );

  /**
   * Search messages by vector similarity
   */
  const searchMessages = useCallback(
    async (
      queryVector: number[],
      options?: SearchMessagesOptions
    ): Promise<StoredMessageWithSimilarity[]> => {
      return searchMessagesOp(storageCtx, queryVector, options);
    },
    [storageCtx]
  );

  /**
   * Update message embedding
   * @returns The updated message, or null if message not found
   */
  const updateMessageEmbedding = useCallback(
    async (
      uniqueId: string,
      vector: number[],
      embeddingModel: string
    ): Promise<StoredMessage | null> => {
      return updateMessageEmbeddingOp(
        storageCtx,
        uniqueId,
        vector,
        embeddingModel
      );
    },
    [storageCtx]
  );

  /**
   * Update message fields (content, embedding, files, etc)
   * @returns The updated message, or null if message not found
   */
  const updateMessage = useCallback(
    async (
      uniqueId: string,
      options: UpdateMessageOptions
    ): Promise<StoredMessage | null> => {
      return updateMessageOp(storageCtx, uniqueId, options);
    },
    [storageCtx]
  );

  /**
   * Get all files from all conversations, sorted by creation date (newest first).
   * Returns files with conversation context for building file browser UIs.
   */
  const getAllFiles = useCallback(
    async (options?: {
      conversationId?: string;
      limit?: number;
    }): Promise<StoredFileWithContext[]> => {
      return getAllFilesOp(storageCtx, options);
    },
    [storageCtx]
  );

  return {
    isLoading,
    sendMessage,
    stop,
    conversationId: currentConversationId,
    setConversationId: setCurrentConversationId,
    createConversation,
    getConversation,
    getConversations,
    updateConversationTitle,
    deleteConversation,
    getMessages,
    getMessageCount,
    clearMessages,
    searchMessages,
    updateMessageEmbedding,
    extractSourcesFromAssistantMessage,
    updateMessage,
    getAllFiles,
    createMemoryRetrievalTool,
  };
}
