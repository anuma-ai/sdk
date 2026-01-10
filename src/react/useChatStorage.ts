"use client";

import { useCallback, useState, useMemo } from "react";

import { useChat } from "./useChat";
import type { LlmapiMessage, LlmapiResponseResponse } from "../client";
import {
  Message,
  Conversation,
  type StoredMessage,
  type StoredMessageWithSimilarity,
  type StoredConversation,
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
  updateMessageErrorOp,
  updateMessageOp,
  searchMessagesOp,
} from "../lib/db/chat";
import type { ApiType } from "../lib/chat/useChat";
import { MCP_R2_DOMAIN } from "../clientConfig";

/**
 * Replace a URL in content with an MCP_IMAGE placeholder.
 * This is used to swap external URLs with locally-stored file references.
 *
 * @param content - The message content containing the URL
 * @param url - The URL to replace
 * @param fileId - The OPFS file ID to reference
 * @returns The content with the URL replaced by ![MCP_IMAGE:fileId]
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
  const placeholder = `![MCP_IMAGE:${fileId}]`;
  let result = content;

  // Replace markdown image syntax: ![alt](url) -> placeholder
  const markdownImagePattern = new RegExp(
    `!\\[[^\\]]*\\]\\([\\s]*${escapedUrl}[\\s]*\\)`,
    "g"
  );
  result = result.replace(markdownImagePattern, placeholder);

  // Replace raw URLs with placeholder (only if not already replaced by markdown pattern)
  result = result.replace(new RegExp(escapedUrl, "g"), placeholder);

  // Clean up any orphaned markdown image syntax left behind
  const orphanedMarkdownPattern = new RegExp(
    `!\\[[^\\]]*\\]\\([\\s]*\\!\\[MCP_IMAGE:${fileId}\\][\\s]*\\)`,
    "g"
  );
  result = result.replace(orphanedMarkdownPattern, placeholder);

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
 * Check if a URL is still valid/accessible.
 * Uses GET with Range header (bytes=0-0) instead of HEAD because
 * HEAD requests don't work with R2 pre-signed URLs.
 */
async function isUrlValid(url: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    // 200 OK or 206 Partial Content both indicate the URL is valid
    return response.ok || response.status === 206;
  } catch {
    return false;
  }
}

/**
 * Convert StoredMessage to LlmapiMessage format.
 * If a file has a sourceUrl, validates it and includes it as an image_url part.
 */
async function storedToLlmapiMessage(
  stored: StoredMessage
): Promise<LlmapiMessage> {
  const content: LlmapiMessage["content"] = [
    { type: "text", text: stored.content },
  ];

  // Add file image parts if present
  if (stored.files?.length) {
    for (const file of stored.files) {
      // First check if there's a direct url (user uploads with data URIs)
      if (file.url) {
        content.push({
          type: "image_url",
          image_url: { url: file.url },
        });
      } else if (file.sourceUrl) {
        // For MCP-cached files, check if sourceUrl is still valid
        const isValid = await isUrlValid(file.sourceUrl);
        if (isValid) {
          content.push({
            type: "image_url",
            image_url: { url: file.sourceUrl },
          });
        }
        // If sourceUrl is invalid (404), don't include it - the content
        // already has the ![MCP_IMAGE:fileId] placeholder for local rendering
      }
    }
  }

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
 */
export type SendMessageWithStorageResult =
  | {
      data: import("../client").LlmapiResponseResponse;
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
    onFinish,
    onError,
    apiType,
  } = options;

  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(initialConversationId || null);

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

  // Use the underlying useChat hook
  const {
    isLoading,
    sendMessage: baseSendMessage,
    stop,
  } = useChat({
    getToken,
    baseUrl,
    onData,
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
   * Soft delete a conversation
   * @returns true if deleted, false if conversation not found
   */
  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      const deleted = await deleteConversationOp(storageCtx, id);
      if (deleted && currentConversationId === id) {
        setCurrentConversationId(null);
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
      return getMessagesOp(storageCtx, convId);
    },
    [storageCtx]
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
   * Clear all messages in a conversation
   */
  const clearMessages = useCallback(
    async (convId: string): Promise<void> => {
      return clearMessagesOp(storageCtx, convId);
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
        const jsonBlockRegex = /```(?:json)?\s*(\{(?:(?!```)[^])*?"sources"(?:(?!```)[^])*?\})\s*```/g;
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
                      snippet: source.description || source.snippet || undefined,
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
        // Pattern to match any URL from the MCP R2 domain (with optional query params for signed URLs)
        const MCP_IMAGE_URL_PATTERN = new RegExp(
          `https://${MCP_R2_DOMAIN.replace(/\./g, "\\.")}[^\\s)]*`,
          "g"
        );
        // Find all MCP image URLs in the content
        const urlMatches = content.match(MCP_IMAGE_URL_PATTERN);
        if (!urlMatches || urlMatches.length === 0) {
          return { processedFiles: [], cleanedContent: content };
        }

        // Deduplicate URLs (same image might appear multiple times)
        const uniqueUrls = [...new Set(urlMatches)];

        const processedFiles: {
          id: string;
          name: string;
          type: string;
          size: number;
          sourceUrl: string;
        }[] = [];
        let cleanedContent = content;

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
        const replaceUrlWithPlaceholder = (
          imageUrl: string,
          fileId: string
        ) => {
          const escapedUrl = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          // Placeholder format: ![MCP_IMAGE:fileId]
          const placeholder = `![MCP_IMAGE:${fileId}]`;

          // Replace markdown image syntax: ![alt](url) -> placeholder
          // This pattern allows for optional whitespace/newlines around the URL
          // Using [\s\S] to match any character including newlines
          const markdownImagePattern = new RegExp(
            `!\\[[^\\]]*\\]\\([\\s]*${escapedUrl}[\\s]*\\)`,
            "g"
          );
          cleanedContent = cleanedContent.replace(
            markdownImagePattern,
            placeholder
          );

          // Replace raw URLs with placeholder (only if not already replaced by markdown pattern)
          // This handles cases where the URL appears without markdown syntax
          cleanedContent = cleanedContent.replace(
            new RegExp(escapedUrl, "g"),
            placeholder
          );

          // Clean up any orphaned markdown image syntax left behind
          // Pattern: ![alt](\nplaceholder\n) -> placeholder (normalize)
          // This handles cases where the placeholder ended up inside broken markdown syntax
          const orphanedMarkdownPattern = new RegExp(
            `!\\[[^\\]]*\\]\\([\\s]*\\!\\[MCP_IMAGE:${fileId}\\][\\s]*\\)`,
            "g"
          );
          cleanedContent = cleanedContent.replace(
            orphanedMarkdownPattern,
            placeholder
          );
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
            // MarkdownRenderer will detect ![MCP_IMAGE:fileId] and render from OPFS
            if (replaceUrls && imageUrl) {
              replaceUrlWithPlaceholder(imageUrl, fileId);
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
        store,
        previousResponseId,
        serverConversation,
        temperature,
        maxOutputTokens,
        tools,
        toolChoice,
        reasoning,
        thinking,
        onThinking,
        apiType: requestApiType,
        writeFile,
      } = args;

      // Extract user message content for storage
      const extracted = extractUserMessageFromMessages(messages);
      if (!extracted || !extracted.content) {
        return {
          data: null,
          error: "No user message found in messages array",
        };
      }
      const contentForStorage = extracted.content;
      // Use provided files, or fall back to files extracted from the message
      const filesForStorage = files ?? extracted.files;

      // Ensure we have a conversation
      let convId: string;
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

      // Build the messages array
      let messagesToSend: LlmapiMessage[] = [];

      // Include history if requested
      if (includeHistory) {
        const storedMessages = await getMessages(convId);
        // Filter out errored messages and limit history to most recent messages
        const validMessages = storedMessages.filter((msg) => !msg.error);
        const limitedMessages = validMessages.slice(-maxHistoryMessages);
        // Convert stored messages to API format (validates sourceUrls in parallel)
        const historyMessages = await Promise.all(
          limitedMessages.map(storedToLlmapiMessage)
        );
        messagesToSend = [...historyMessages, ...messages];
      } else {
        // Use provided messages directly
        messagesToSend = [...messages];
      }

      // Store the user message
      // Sanitize files for storage: remove large data URIs to avoid bloating the database
      const sanitizedFiles = filesForStorage?.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        // Only keep URL if it's not a data URI (e.g., external URLs)
        url: file.url && !file.url.startsWith("data:") ? file.url : undefined,
      }));

      let storedUserMessage: StoredMessage;
      try {
        storedUserMessage = await createMessageOp(storageCtx, {
          conversationId: convId,
          role: "user",
          content: contentForStorage,
          files: sanitizedFiles,
          model,
        });
      } catch (err) {
        return {
          data: null,
          error:
            err instanceof Error ? err.message : "Failed to store user message",
        };
      }

      // Track response timing
      const startTime = Date.now();

      // Send the message using the underlying useChat
      const result = await baseSendMessage({
        messages: messagesToSend,
        model,
        onData: perRequestOnData,
        headers,
        memoryContext,
        searchContext,
        // Responses API options
        store,
        previousResponseId,
        conversation: serverConversation,
        temperature,
        maxOutputTokens,
        tools,
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
          const assistantContent =
            abortedResult.data?.output?.[0]?.content
              ?.map((part: { text?: string }) => part.text || "")
              .join("") || "";

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
            });

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
      const responseData = result.data;

      // Find the message output item (type: "message") for main content
      const messageOutput = responseData.output?.find(
        (item) => item.type === "message"
      );
      const assistantContent =
        messageOutput?.content
          ?.map((part: { text?: string }) => part.text || "")
          .join("") || "";

      // Find the reasoning output item (type: "reasoning") for thinking content
      const reasoningOutput = responseData.output?.find(
        (item) => item.type === "reasoning"
      );
      const thinkingContent =
        reasoningOutput?.content
          ?.map((part: { text?: string }) => part.text || "")
          .join("") || undefined;

      // Extract sources from assistant content and combine with passed sources (deduplicates internally)
      // Filter out MCP image URLs from sources (they are handled separately as files)
      const combinedSources = extractSourcesFromAssistantMessage({
        content: assistantContent,
        sources,
      }).filter((source) => !source.url?.includes(MCP_R2_DOMAIN));

      // Strip JSON sources block from content (if present)
      // Matches ```json { "sources": [...] } ``` or ``` { "sources": [...] } ```
      // Uses negative lookahead to avoid crossing triple-backtick boundaries
      const jsonSourcesBlockRegex = /```(?:json)?\s*\{(?:(?!```)[^])*?"sources"(?:(?!```)[^])*?\}\s*```/g;
      let cleanedContent = assistantContent.replace(jsonSourcesBlockRegex, "").trim();
      // Clean up extra newlines left after stripping
      cleanedContent = cleanedContent.replace(/\n{3,}/g, "\n\n");

      // Extract and store MCP images (only if writeFile is provided)
      let processedFiles: {
        id: string;
        name: string;
        type: string;
        size: number;
      }[] = [];
      if (writeFile) {
        const result = await extractAndStoreMCPImages(
          cleanedContent,
          writeFile
        );
        processedFiles = result.processedFiles;
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
          files: processedFiles.length > 0 ? processedFiles : undefined,
          usage: convertUsageToStored(responseData.usage),
          responseDuration,
          sources: combinedSources,
          thoughtProcess: finalizeThoughtProcess(thoughtProcess),
          thinking: thinkingContent,
        });
      } catch (err) {
        return {
          data: null,
          error:
            err instanceof Error
              ? err.message
              : "Failed to store assistant message",
          userMessage: storedUserMessage,
        };
      }

      return {
        data: responseData,
        error: null,
        userMessage: storedUserMessage,
        assistantMessage: storedAssistantMessage,
      };
    },
    [ensureConversation, getMessages, storageCtx, baseSendMessage]
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
  };
}
