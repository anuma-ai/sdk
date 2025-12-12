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
  /** ISO timestamp */
  createdAt: Date;
  /** ISO timestamp */
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
  /** ISO timestamp */
  createdAt: Date;
  /** ISO timestamp */
  updatedAt: Date;
  /** Soft delete flag */
  isDeleted: boolean;
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
 * Options for useChatStorage hook
 */
export interface UseChatStorageOptions {
  /** WatermelonDB database instance */
  database: Database;
  /** Current conversation ID (will create new if not provided) */
  conversationId?: string;
  /** Auto-create conversation if it doesn't exist */
  autoCreateConversation?: boolean;
  /** Default title for auto-created conversations */
  defaultConversationTitle?: string;
}

/**
 * Result returned by useChatStorage hook
 */
export interface UseChatStorageResult {
  /** Current conversation ID */
  conversationId: string | null;
  /** Set the current conversation ID */
  setConversationId: (id: string) => void;
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
