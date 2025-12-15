"use client";

import { useCallback, useState, useMemo } from "react";

import { useChat } from "./useChat";
import type { LlmapiMessage, LlmapiMessageContentPart } from "../client";
import type { ClientTool, ToolExecutionResult } from "../lib/tools/types";
import { Message, Conversation } from "../lib/chatStorage/models";
import {
  type StoredMessage,
  type StoredMessageWithSimilarity,
  type StoredConversation,
  type CreateConversationOptions,
  type BaseUseChatStorageOptions,
  type BaseSendMessageWithStorageArgs,
  type BaseUseChatStorageResult,
  type FileMetadata,
  convertUsageToStored,
} from "../lib/chatStorage/types";
import {
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
  searchMessagesOp,
} from "../lib/chatStorage/operations";

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
 * Extends base options with React-specific features like local chat and tools.
 */
export interface UseChatStorageOptions extends BaseUseChatStorageOptions {
  /** Chat provider: "api" or "local" */
  chatProvider?: "api" | "local";
  /** Model for local chat */
  localModel?: string;
  /** Client-side tools */
  tools?: ClientTool[];
  /** Tool selector model */
  toolSelectorModel?: string;
  /** Callback when tool is executed */
  onToolExecution?: (result: ToolExecutionResult) => void;
}

/**
 * Arguments for sendMessage with storage (React version)
 *
 * Extends base arguments with React-specific features like tools and headers.
 */
export interface SendMessageWithStorageArgs
  extends BaseSendMessageWithStorageArgs {
  /** Whether to run tool selection */
  runTools?: boolean;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Result from sendMessage with storage (React version)
 *
 * Extends base result with tool execution information.
 */
export type SendMessageWithStorageResult =
  | {
      data: import("../client").LlmapiChatCompletionResponse;
      error: null;
      toolExecution?: ToolExecutionResult;
      userMessage: StoredMessage;
      assistantMessage: StoredMessage;
    }
  | {
      data: null;
      error: string;
      toolExecution?: ToolExecutionResult;
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
 * Extends base result with tool selection state and React-specific sendMessage signature.
 */
export interface UseChatStorageResult extends BaseUseChatStorageResult {
  /** Whether tool selection is in progress */
  isSelectingTool: boolean;
  /** Send a message and automatically store it (React version with tool support) */
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
    chatProvider,
    localModel,
    tools,
    toolSelectorModel,
    onToolExecution,
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
    isSelectingTool,
    sendMessage: baseSendMessage,
    stop,
  } = useChat({
    getToken,
    baseUrl,
    onData,
    onFinish,
    onError,
    chatProvider,
    localModel,
    tools,
    toolSelectorModel,
    onToolExecution,
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
        runTools,
        headers,
        memoryContext,
      } = args;

      // Ensure we have a conversation
      let convId: string;
      try {
        convId = await ensureConversation();
      } catch (err) {
        return {
          data: null,
          error:
            err instanceof Error ? err.message : "Failed to ensure conversation",
        };
      }

      // Build the messages array
      let messagesToSend: LlmapiMessage[] = [];

      // Include history if requested
      if (includeHistory && !providedMessages) {
        const storedMessages = await getMessages(convId);
        // Limit history to most recent messages to avoid unbounded growth
        const limitedMessages = storedMessages.slice(-maxHistoryMessages);
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
        });
      } catch (err) {
        return {
          data: null,
          error:
            err instanceof Error
              ? err.message
              : "Failed to store user message",
        };
      }

      // Track response timing
      const startTime = Date.now();

      // Send the message using the underlying useChat
      const result = await baseSendMessage({
        messages: messagesToSend,
        model,
        onData: perRequestOnData,
        runTools,
        headers,
        memoryContext,
      });

      const responseDuration = (Date.now() - startTime) / 1000;

      if (result.error || !result.data) {
        return {
          data: null,
          error: result.error || "No response data received",
          toolExecution: result.toolExecution,
          userMessage: storedUserMessage,
        };
      }

      // Extract assistant response content
      const responseData = result.data;
      const assistantContent =
        responseData.choices?.[0]?.message?.content
          ?.map((part) => part.text || "")
          .join("") || "";

      // Store the assistant message
      let storedAssistantMessage: StoredMessage;
      try {
        storedAssistantMessage = await createMessageOp(storageCtx, {
          conversationId: convId,
          role: "assistant",
          content: assistantContent,
          model: responseData.model,
          usage: convertUsageToStored(responseData.usage),
          responseDuration,
        });
      } catch (err) {
        return {
          data: null,
          error:
            err instanceof Error
              ? err.message
              : "Failed to store assistant message",
          toolExecution: result.toolExecution,
          userMessage: storedUserMessage,
        };
      }

      return {
        data: responseData,
        error: null,
        toolExecution: result.toolExecution,
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
      return updateMessageEmbeddingOp(storageCtx, uniqueId, vector, embeddingModel);
    },
    [storageCtx]
  );

  return {
    isLoading,
    isSelectingTool,
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
  };
}
