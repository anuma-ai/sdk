import type { Database } from "@nozbe/watermelondb";
import type {
  LlmapiChatCompletionResponse,
  LlmapiChatCompletionUsage,
} from "../../client";

/**
 * Message role type
 */
export type ChatRole = "user" | "assistant" | "system";

/**
 * File metadata for attached files
 */
export interface FileMetadata {
  /** Unique file identifier */
  id: string;
  /** Original file name */
  name: string;
  /** MIME type */
  type: string;
  /** File size in bytes */
  size: number;
  /** Optional URL or data URI */
  url?: string;
}

/**
 * Token usage and cost information
 */
export interface ChatCompletionUsage {
  /** Number of tokens in the prompt */
  promptTokens?: number;
  /** Number of tokens in the completion */
  completionTokens?: number;
  /** Total tokens used */
  totalTokens?: number;
  /** Cost in micro-dollars (USD × 1,000,000) */
  costMicroUsd?: number;
}

/**
 * Web search source information
 */
export interface SearchSource {
  /** Source title */
  title?: string;
  /** Source URL */
  url?: string;
  /** Text snippet from the source */
  snippet?: string;
  /** Publication or last updated date */
  date?: string;
}

/**
 * Stored message record (what gets persisted to the database)
 */
export interface StoredMessage {
  /** Primary key, unique message identifier (WatermelonDB auto-generated) */
  uniqueId: string;
  /** Sequential message ID within conversation */
  messageId: number;
  /** Links message to its conversation */
  conversationId: string;
  /** Who sent the message */
  role: ChatRole;
  /** The message text */
  content: string;
  /** LLM model used */
  model?: string;
  /** Optional attached files */
  files?: FileMetadata[];
  /** When the message was created */
  createdAt: Date;
  /** When the message was last updated */
  updatedAt: Date;
  /** Embedding vector for semantic search */
  vector?: number[];
  /** Model used to generate embedding */
  embeddingModel?: string;
  /** Token counts and cost */
  usage?: ChatCompletionUsage;
  /** Web search sources */
  sources?: SearchSource[];
  /** Response time in seconds */
  responseDuration?: number;
  /** Whether the message generation was stopped by the user */
  wasStopped?: boolean;
}

/**
 * Stored conversation record
 */
export interface StoredConversation {
  /** Primary key (WatermelonDB auto-generated) */
  uniqueId: string;
  /** Unique conversation identifier */
  conversationId: string;
  /** Conversation title */
  title: string;
  /** When the conversation was created */
  createdAt: Date;
  /** When the conversation was last updated */
  updatedAt: Date;
  /** Soft delete flag */
  isDeleted: boolean;
}

/**
 * Stored message with similarity score (for search results)
 */
export interface StoredMessageWithSimilarity extends StoredMessage {
  /** Cosine similarity score (0 to 1) */
  similarity: number;
}

/**
 * Options for creating a new message
 */
export interface CreateMessageOptions {
  /** Conversation ID to add the message to */
  conversationId: string;
  /** Message role */
  role: ChatRole;
  /** Message content */
  content: string;
  /** LLM model used (for assistant messages) */
  model?: string;
  /** Attached files */
  files?: FileMetadata[];
  /** Token usage information */
  usage?: ChatCompletionUsage;
  /** Web search sources */
  sources?: SearchSource[];
  /** Response duration in seconds */
  responseDuration?: number;
  /** Embedding vector for semantic search */
  vector?: number[];
  /** Model used to generate the embedding */
  embeddingModel?: string;
  /** Whether the message generation was stopped by the user */
  wasStopped?: boolean;
}

/**
 * Options for creating a new conversation
 */
export interface CreateConversationOptions {
  /** Custom conversation ID (auto-generated if not provided) */
  conversationId?: string;
  /** Conversation title */
  title?: string;
}

/**
 * Base options for useChatStorage hook (shared between React and Expo)
 */
export interface BaseUseChatStorageOptions {
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
}

/**
 * Base arguments for sendMessage with storage (shared between React and Expo)
 */
export interface BaseSendMessageWithStorageArgs {
  /** Message content to send */
  content: string;
  /** Model to use for the completion */
  model?: string;
  /** Previous messages to include (if not using stored messages) */
  messages?: import("../../client").LlmapiMessage[];
  /** Whether to include stored messages from conversation */
  includeHistory?: boolean;
  /** Maximum number of history messages to include (default: 50) */
  maxHistoryMessages?: number;
  /** Attached files */
  files?: FileMetadata[];
  /** Per-request data callback */
  onData?: (chunk: string) => void;
  /** Memory context to inject as system message (formatted memories from useMemoryStorage) */
  memoryContext?: string;
}

/**
 * Base success result from sendMessage with storage
 */
export interface BaseSendMessageSuccessResult {
  data: LlmapiChatCompletionResponse;
  error: null;
  userMessage: StoredMessage;
  assistantMessage: StoredMessage;
}

/**
 * Base error result from sendMessage with storage
 */
export interface BaseSendMessageErrorResult {
  data: null;
  error: string;
  userMessage?: StoredMessage;
  assistantMessage?: undefined;
}

/**
 * Base result type from sendMessage with storage
 */
export type BaseSendMessageWithStorageResult =
  | BaseSendMessageSuccessResult
  | BaseSendMessageErrorResult;

/**
 * Base result returned by useChatStorage hook (shared between React and Expo)
 */
export interface BaseUseChatStorageResult {
  /** Whether a chat request is in progress */
  isLoading: boolean;
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
  /** Update conversation title. Returns true if updated, false if not found. */
  updateConversationTitle: (id: string, title: string) => Promise<boolean>;
  /** Soft delete a conversation. Returns true if deleted, false if not found. */
  deleteConversation: (id: string) => Promise<boolean>;
  /** Get messages for a conversation */
  getMessages: (conversationId: string) => Promise<StoredMessage[]>;
  /** Get message count for a conversation */
  getMessageCount: (conversationId: string) => Promise<number>;
  /** Clear all messages in a conversation */
  clearMessages: (conversationId: string) => Promise<void>;
}

/**
 * Convert API usage to stored usage format
 */
export function convertUsageToStored(
  usage?: LlmapiChatCompletionUsage
): ChatCompletionUsage | undefined {
  if (!usage) return undefined;
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    costMicroUsd: usage.cost_micro_usd,
  };
}

/**
 * Generate a unique ID for conversations
 */
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
