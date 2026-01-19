"use client";

import { useCallback, useState, useMemo } from "react";

import { useChat } from "./useChat";
import type { LlmapiMessage, LlmapiResponseResponse } from "../client";
import type { ApiType } from "../lib/chat/useChat";
import {
  Message,
  Conversation,
  type StoredMessage,
  type StoredConversation,
  type CreateConversationOptions,
  type UpdateMessageOptions,
  type BaseUseChatStorageOptions,
  type BaseSendMessageWithStorageArgs,
  type BaseSendMessageWithStorageResult,
  type BaseUseChatStorageResult,
  type SearchSource,
  type FileMetadata,
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
  updateMessageErrorOp,
  updateMessageOp,
} from "../lib/db/chat";
import {
  getServerTools,
  filterServerTools,
  mergeTools,
} from "../lib/tools";

/**
 * Convert StoredMessage to LlmapiMessage format.
 * Only adds image_url parts for non-assistant messages.
 * ai-portal doesn't support image_url in assistant messages for /chat/completions.
 */
function storedToLlmapiMessage(stored: StoredMessage): LlmapiMessage {
  const content: LlmapiMessage["content"] = [
    { type: "text", text: stored.content },
  ];

  // Add file image parts if present (only for non-assistant messages)
  // ai-portal doesn't support image_url in assistant messages for /chat/completions
  if (stored.role !== "assistant" && stored.files?.length) {
    for (const file of stored.files) {
      if (file.url) {
        content.push({
          type: "image_url",
          image_url: { url: file.url },
        });
      }
    }
  }

  return {
    role: stored.role,
    content,
  };
}

/**
 * Options for useChatStorage hook (Expo version)
 *
 * Uses the base options without React-specific features (no local chat, no tools).
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
 * Arguments for sendMessage with storage (Expo version)
 *
 * Uses the base arguments without React-specific features (no runTools, no headers).

 */
export type SendMessageWithStorageArgs = BaseSendMessageWithStorageArgs & {
  /**
   * Override the API type for this request only.
   * Useful when different models need different APIs.
   * @default Uses the hook-level apiType or "responses"
   */
  apiType?: ApiType;
};

/**
 * Result from sendMessage with storage (Expo version)
 *
 * Uses the base result without tool execution information.
 */
export type SendMessageWithStorageResult = BaseSendMessageWithStorageResult;

/**
 * Result returned by useChatStorage hook (Expo version)
 *
 * Extends base result with Expo-specific sendMessage signature.
 */
export interface UseChatStorageResult extends BaseUseChatStorageResult {
  /** Send a message and automatically store it (Expo version) */
  sendMessage: (
    args: SendMessageWithStorageArgs
  ) => Promise<SendMessageWithStorageResult>;
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
 * **Expo/React Native version** - This is a lightweight version that only supports
 * API-based chat completions. Local chat and client-side tools are not available.
 *
 * @param options - Configuration options
 * @returns An object containing chat state, methods, and storage operations
 *
 * @example
 * ```tsx
 * import { Database } from '@nozbe/watermelondb';
 * import { useChatStorage } from '@reverbia/sdk/expo';
 *
 * function ChatScreen({ database }: { database: Database }) {
 *   const {
 *     isLoading,
 *     sendMessage,
 *     conversationId,
 *     getMessages,
 *   } = useChatStorage({
 *     database,
 *     getToken: async () => getAuthToken(),
 *     onData: (chunk) => setResponse((prev) => prev + chunk),
 *   });
 *
 *   const handleSend = async () => {
 *     const result = await sendMessage({
 *       content: 'Hello!',
 *       model: 'gpt-4o-mini',
 *       includeHistory: true,
 *     });
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleSend} disabled={isLoading} title="Send" />
 *     </View>
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
    serverTools: serverToolsConfig,
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

  // Use the underlying useChat hook (Expo version - no tools, no local chat)
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

        // Regex to match plain URLs (http, https) - Hermes-compatible (no lookbehind)
        const plainUrlRegex = /https?:\/\/[^\s<>\[\]()'"]+/g;

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
          // Trim trailing punctuation that's not part of the URL
          const url = match[0].replace(/[.,;:!?]+$/, "").trim();

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
      } catch {
        return []; // Return empty array if error occurs
      }
    },
    []
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
        onThinking: perRequestOnThinking,
        memoryContext,
        searchContext,
        apiType: requestApiType,
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
        messagesToSend = [
          ...limitedMessages.map(storedToLlmapiMessage),
          ...messages,
        ];
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

      // Determine effective API type for this request
      const effectiveApiType = requestApiType ?? apiType ?? "responses";

      // Fetch and merge server-side tools with client tools
      let mergedTools = clientTools;
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
          const filteredServerTools = filterServerTools(
            allServerTools,
            serverToolsFilter
          );
          if (filteredServerTools.length > 0) {
            mergedTools = mergeTools(
              filteredServerTools,
              clientTools,
              effectiveApiType
            );
          }
        } catch (error) {
          // Log but don't block - server tools are optional
          // eslint-disable-next-line no-console
          console.warn(
            "[useChatStorage] Failed to fetch server tools:",
            error
          );
        }
      }

      // Send the message using the underlying useChat
      const result = await baseSendMessage({
        messages: messagesToSend,
        model,
        onData: perRequestOnData,
        onThinking: perRequestOnThinking,
        memoryContext,
        searchContext,
        apiType: requestApiType,
        // Responses API options
        temperature,
        maxOutputTokens,
        tools: mergedTools,
        toolChoice,
        reasoning,
        thinking,
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
      const combinedSources = extractSourcesFromAssistantMessage({
        content: assistantContent,
        sources,
      });

      // Strip JSON sources block from content (if present)
      // Matches ```json { "sources": [...] } ``` or ``` { "sources": [...] } ```
      // Uses negative lookahead to avoid crossing triple-backtick boundaries
      const jsonSourcesBlockRegex =
        /```(?:json)?\s*\{(?:(?!```)[^])*?"sources"(?:(?!```)[^])*?\}\s*```/g;
      let cleanedContent = assistantContent
        .replace(jsonSourcesBlockRegex, "")
        .trim();
      // Clean up extra newlines left after stripping
      cleanedContent = cleanedContent.replace(/\n{3,}/g, "\n\n");

      // Store the assistant message
      let storedAssistantMessage: StoredMessage;
      try {
        storedAssistantMessage = await createMessageOp(storageCtx, {
          conversationId: convId,
          role: "assistant",
          content: cleanedContent,
          model: responseData.model || model,
          usage: convertUsageToStored(responseData.usage),
          responseDuration,
          sources: combinedSources,
          thoughtProcess: finalizeThoughtProcess(thoughtProcess),
          // thinking: thinkingContent,
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
    extractSourcesFromAssistantMessage,
    updateMessage,
  };
}
