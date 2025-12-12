"use client";

import { useCallback, useState, useMemo } from "react";
import { Q } from "@nozbe/watermelondb";
import type { Database } from "@nozbe/watermelondb";

import { useChat } from "./useChat";
import type { LlmapiChatCompletionResponse, LlmapiMessage } from "../client";
import type { ClientTool, ToolExecutionResult } from "../lib/tools/types";
import { Message, Conversation } from "../lib/chatStorage/models";
import {
  type StoredMessage,
  type StoredConversation,
  type CreateMessageOptions,
  type CreateConversationOptions,
  type FileMetadata,
  convertUsageToStored,
  generateConversationId,
} from "../lib/chatStorage/types";

/**
 * Options for useChatStorage hook
 */
export interface UseChatStorageOptions {
  /** WatermelonDB database instance */
  database: Database;
  /** Current conversation ID (will create new if not provided) */
  conversationId?: string;
  /** Auto-create conversation if it doesn't exist (default: true) */
  autoCreateConversation?: boolean;
  /** Default title for auto-created conversations */
  defaultConversationTitle?: string;
  /** Authentication token getter */
  getToken?: () => Promise<string | null>;
  /** Base URL for API requests */
  baseUrl?: string;
  /** Callback when data chunk is received */
  onData?: (chunk: string) => void;
  /** Callback when chat completion finishes */
  onFinish?: (response: LlmapiChatCompletionResponse) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
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
 * Arguments for sendMessage with storage
 */
export interface SendMessageWithStorageArgs {
  /** Message content to send */
  content: string;
  /** Model to use for the completion */
  model?: string;
  /** Previous messages to include (if not using stored messages) */
  messages?: LlmapiMessage[];
  /** Whether to include stored messages from conversation */
  includeHistory?: boolean;
  /** Attached files */
  files?: FileMetadata[];
  /** Per-request data callback */
  onData?: (chunk: string) => void;
  /** Whether to run tool selection */
  runTools?: boolean;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Result from sendMessage with storage
 */
export type SendMessageWithStorageResult =
  | {
      data: LlmapiChatCompletionResponse;
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
 * Result returned by useChatStorage hook
 */
export interface UseChatStorageResult {
  /** Whether a chat request is in progress */
  isLoading: boolean;
  /** Whether tool selection is in progress */
  isSelectingTool: boolean;
  /** Send a message and automatically store it */
  sendMessage: (
    args: SendMessageWithStorageArgs
  ) => Promise<SendMessageWithStorageResult>;
  /** Stop the current request */
  stop: () => void;
  /** Current conversation ID */
  conversationId: string | null;
  /** Set the current conversation ID */
  setConversationId: (id: string | null) => void;
  /** Create a new conversation */
  createConversation: (
    options?: CreateConversationOptions
  ) => Promise<StoredConversation>;
  /** Get a conversation by ID */
  getConversation: (id: string) => Promise<StoredConversation | null>;
  /** Get all conversations (excluding soft-deleted) */
  getConversations: () => Promise<StoredConversation[]>;
  /** Update conversation title */
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  /** Soft delete a conversation */
  deleteConversation: (id: string) => Promise<void>;
  /** Get messages for a conversation */
  getMessages: (conversationId: string) => Promise<StoredMessage[]>;
  /** Get message count for a conversation */
  getMessageCount: (conversationId: string) => Promise<number>;
  /** Clear all messages in a conversation */
  clearMessages: (conversationId: string) => Promise<void>;
}

/**
 * Convert a Message model to StoredMessage
 */
function messageToStored(message: Message): StoredMessage {
  return {
    uniqueId: message.id,
    messageId: message.messageId,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    model: message.model,
    files: message.files,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    vector: message.vector,
    embeddingModel: message.embeddingModel,
    usage: message.usage,
    sources: message.sources,
    responseDuration: message.responseDuration,
  };
}

/**
 * Convert a Conversation model to StoredConversation
 */
function conversationToStored(conversation: Conversation): StoredConversation {
  return {
    uniqueId: conversation.id,
    conversationId: conversation.conversationId,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    isDeleted: conversation.isDeleted,
  };
}

/**
 * Convert StoredMessage to LlmapiMessage format
 */
function storedToLlmapiMessage(stored: StoredMessage): LlmapiMessage {
  return {
    role: stored.role,
    content: [{ type: "text", text: stored.content }],
  };
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
      const convId = opts?.conversationId || generateConversationId();
      const title = opts?.title || defaultConversationTitle;

      const created = await database.write(async () => {
        return await conversationsCollection.create((conv) => {
          conv._setRaw("conversation_id", convId);
          conv._setRaw("title", title);
          conv._setRaw("is_deleted", false);
        });
      });

      setCurrentConversationId(convId);
      return conversationToStored(created);
    },
    [database, conversationsCollection, defaultConversationTitle]
  );

  /**
   * Get a conversation by ID
   */
  const getConversation = useCallback(
    async (id: string): Promise<StoredConversation | null> => {
      const results = await conversationsCollection
        .query(Q.where("conversation_id", id), Q.where("is_deleted", false))
        .fetch();

      return results.length > 0 ? conversationToStored(results[0]) : null;
    },
    [conversationsCollection]
  );

  /**
   * Get all conversations (excluding soft-deleted)
   */
  const getConversations = useCallback(async (): Promise<
    StoredConversation[]
  > => {
    const results = await conversationsCollection
      .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
      .fetch();

    return results.map(conversationToStored);
  }, [conversationsCollection]);

  /**
   * Update conversation title
   */
  const updateConversationTitle = useCallback(
    async (id: string, title: string): Promise<void> => {
      const results = await conversationsCollection
        .query(Q.where("conversation_id", id))
        .fetch();

      if (results.length > 0) {
        await database.write(async () => {
          await results[0].update((conv) => {
            conv._setRaw("title", title);
          });
        });
      }
    },
    [database, conversationsCollection]
  );

  /**
   * Soft delete a conversation
   */
  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      const results = await conversationsCollection
        .query(Q.where("conversation_id", id))
        .fetch();

      if (results.length > 0) {
        await database.write(async () => {
          await results[0].update((conv) => {
            conv._setRaw("is_deleted", true);
          });
        });
      }

      if (currentConversationId === id) {
        setCurrentConversationId(null);
      }
    },
    [database, conversationsCollection, currentConversationId]
  );

  /**
   * Get messages for a conversation
   */
  const getMessages = useCallback(
    async (convId: string): Promise<StoredMessage[]> => {
      const results = await messagesCollection
        .query(
          Q.where("conversation_id", convId),
          Q.sortBy("message_id", Q.asc)
        )
        .fetch();

      return results.map(messageToStored);
    },
    [messagesCollection]
  );

  /**
   * Get message count for a conversation
   */
  const getMessageCount = useCallback(
    async (convId: string): Promise<number> => {
      return await messagesCollection
        .query(Q.where("conversation_id", convId))
        .fetchCount();
    },
    [messagesCollection]
  );

  /**
   * Clear all messages in a conversation
   */
  const clearMessages = useCallback(
    async (convId: string): Promise<void> => {
      const messages = await messagesCollection
        .query(Q.where("conversation_id", convId))
        .fetch();

      await database.write(async () => {
        for (const message of messages) {
          await message.destroyPermanently();
        }
      });
    },
    [database, messagesCollection]
  );

  /**
   * Create a message in the database
   */
  const createMessage = useCallback(
    async (opts: CreateMessageOptions): Promise<StoredMessage> => {
      // Get the next message ID for this conversation
      const existingCount = await getMessageCount(opts.conversationId);
      const messageId = existingCount + 1;

      const created = await database.write(async () => {
        return await messagesCollection.create((msg) => {
          msg._setRaw("message_id", messageId);
          msg._setRaw("conversation_id", opts.conversationId);
          msg._setRaw("role", opts.role);
          msg._setRaw("content", opts.content);
          if (opts.model) msg._setRaw("model", opts.model);
          if (opts.files) msg._setRaw("files", JSON.stringify(opts.files));
          if (opts.usage) msg._setRaw("usage", JSON.stringify(opts.usage));
          if (opts.sources) msg._setRaw("sources", JSON.stringify(opts.sources));
          if (opts.responseDuration !== undefined)
            msg._setRaw("response_duration", opts.responseDuration);
          // vector and embeddingModel are not populated for now
        });
      });

      return messageToStored(created);
    },
    [database, messagesCollection, getMessageCount]
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
        files,
        onData: perRequestOnData,
        runTools,
        headers,
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
        messagesToSend = storedMessages.map(storedToLlmapiMessage);
      } else if (providedMessages) {
        messagesToSend = providedMessages;
      }

      // Add the user's new message
      const userMessage: LlmapiMessage = {
        role: "user",
        content: [{ type: "text", text: content }],
      };
      messagesToSend.push(userMessage);

      // Store the user message
      let storedUserMessage: StoredMessage;
      try {
        storedUserMessage = await createMessage({
          conversationId: convId,
          role: "user",
          content,
          files,
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
        storedAssistantMessage = await createMessage({
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
    [
      ensureConversation,
      getMessages,
      createMessage,
      baseSendMessage,
    ]
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
  };
}
