"use client";

import { useCallback, useState, useMemo } from "react";

import { useChat } from "./useChat";
import type {
  LlmapiMessage,
  LlmapiMessageContentPart,
  LlmapiResponseResponse,
} from "../client";
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

/**
 * Convert StoredMessage to LlmapiMessage format
 */
function storedToLlmapiMessage(stored: StoredMessage): LlmapiMessage {
  const content: LlmapiMessage["content"] = [
    { type: "text", text: stored.content },
  ];

  // Add file image parts if present
  if (stored.files?.length) {
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
 * Options for useChatStorage hook (React version)
 *
 * Uses base options.
 */
export type UseChatStorageOptions = BaseUseChatStorageOptions;

/**
 * Arguments for sendMessage with storage (React version)
 *
 * Extends base arguments with headers support.
 */
export interface SendMessageWithStorageArgs
  extends BaseSendMessageWithStorageArgs {
  /** Custom headers */
  headers?: Record<string, string>;
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
  /** Send a message and automatically store it */
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
   * Extracts all links from assistant message content and returns them as SearchSource objects.
   * Parses both markdown links [text](url) and plain URLs from the message content,
   * then merges them with any existing sources already attached to the message.
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

  /**
   * Send a message with automatic storage
   */
  const sendMessage = useCallback(
    async (
      args: SendMessageWithStorageArgs
    ): Promise<SendMessageWithStorageResult> => {
      const {
        content,
        model,
        messages: providedMessages,
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
      } = args;

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
      if (includeHistory && !providedMessages) {
        const storedMessages = await getMessages(convId);
        // Filter out errored messages and limit history to most recent messages
        const validMessages = storedMessages.filter((msg) => !msg.error);
        const limitedMessages = validMessages.slice(-maxHistoryMessages);
        messagesToSend = limitedMessages.map(storedToLlmapiMessage);
      } else if (providedMessages) {
        messagesToSend = providedMessages;
      }

      // Add the user's new message
      const userMessageContent: LlmapiMessageContentPart[] = [
        { type: "text", text: content },
      ];

      // Add image content parts for files with URLs (data URIs)
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.url && file.type.startsWith("image/")) {
            userMessageContent.push({
              type: "image_url",
              image_url: { url: file.url },
            });
          }
        }
      }

      const userMessage: LlmapiMessage = {
        role: "user",
        content: userMessageContent,
      };
      messagesToSend.push(userMessage);

      // Store the user message
      // Sanitize files for storage: remove large data URIs to avoid bloating the database
      const sanitizedFiles = files?.map((file) => ({
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
          content,
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
            const responseData: LlmapiResponseResponse =
              abortedResult.data || {
                id: `aborted-${Date.now()}`,
                model: responseModel,
                object: "response",
                output: [
                  {
                    type: "message",
                    role: "assistant",
                    content: [
                      { type: "output_text", text: assistantContent },
                    ],
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

      // Extract assistant response content
      const responseData = result.data;
      const assistantContent =
        responseData.output?.[0]?.content
          ?.map((part: { text?: string }) => part.text || "")
          .join("") || "";

      // Extract sources from assistant content and combine with passed sources (deduplicates internally)
      const combinedSources = extractSourcesFromAssistantMessage({
        content: assistantContent,
        sources,
      });

      // Store the assistant message
      let storedAssistantMessage: StoredMessage;
      try {
        storedAssistantMessage = await createMessageOp(storageCtx, {
          conversationId: convId,
          role: "assistant",
          content: assistantContent,
          model: responseData.model || model,
          usage: convertUsageToStored(responseData.usage),
          responseDuration,
          sources: combinedSources,
          thoughtProcess: finalizeThoughtProcess(thoughtProcess),
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
