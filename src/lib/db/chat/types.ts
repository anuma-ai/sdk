import type { Database } from "@nozbe/watermelondb";
import type {
  LlmapiChatCompletionResponse,
  LlmapiChatCompletionUsage,
  LlmapiMessage,
} from "../../../client";

// Core types

export type ChatRole = "user" | "assistant" | "system";

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface ChatCompletionUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costMicroUsd?: number;
}

export interface SearchSource {
  title?: string;
  url?: string;
  snippet?: string;
  date?: string;
}

export interface StoredMessage {
  uniqueId: string;
  messageId: number;
  conversationId: string;
  role: ChatRole;
  content: string;
  model?: string;
  files?: FileMetadata[];
  createdAt: Date;
  updatedAt: Date;
  vector?: number[];
  embeddingModel?: string;
  usage?: ChatCompletionUsage;
  sources?: SearchSource[];
  responseDuration?: number;
  wasStopped?: boolean;
}

export interface StoredConversation {
  uniqueId: string;
  conversationId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface StoredMessageWithSimilarity extends StoredMessage {
  similarity: number;
}

export interface CreateMessageOptions {
  conversationId: string;
  role: ChatRole;
  content: string;
  model?: string;
  files?: FileMetadata[];
  usage?: ChatCompletionUsage;
  sources?: SearchSource[];
  responseDuration?: number;
  vector?: number[];
  embeddingModel?: string;
  wasStopped?: boolean;
}

export interface CreateConversationOptions {
  conversationId: string;
  title: string;
}

// Hook types

export interface BaseUseChatStorageOptions {
  database: Database;
  defaultConversationTitle?: string;
  getToken?: () => Promise<string | null>;
  baseUrl?: string;
  onData?: (chunk: string) => void;
  onFinish?: (response: LlmapiChatCompletionResponse) => void;
  onError?: (error: Error) => void;
}

export interface BaseSendMessageWithStorageArgs {
  conversationId: string;
  content: string;
  model?: string;
  messages?: LlmapiMessage[];
  includeHistory?: boolean;
  maxHistoryMessages?: number;
  files?: FileMetadata[];
  onData?: (chunk: string) => void;
  memoryContext?: string;
  searchContext?: string;
  sources?: SearchSource[];
}

export interface BaseSendMessageSuccessResult {
  data: LlmapiChatCompletionResponse;
  error: null;
  userMessage: StoredMessage;
  assistantMessage: StoredMessage;
}

export interface BaseSendMessageErrorResult {
  data: null;
  error: string;
  userMessage?: StoredMessage;
  assistantMessage?: undefined;
}

export type BaseSendMessageWithStorageResult =
  | BaseSendMessageSuccessResult
  | BaseSendMessageErrorResult;

export interface BaseUseChatStorageResult {
  isLoading: boolean;
  stop: () => void;
  createConversation: (
    options: CreateConversationOptions
  ) => Promise<StoredConversation>;
  getConversation: (id: string) => Promise<StoredConversation | null>;
  getConversations: () => Promise<StoredConversation[]>;
  updateConversationTitle: (id: string, title: string) => Promise<boolean>;
  deleteConversation: (id: string) => Promise<boolean>;
  getMessages: (conversationId: string) => Promise<StoredMessage[]>;
  getMessageCount: (conversationId: string) => Promise<number>;
  clearMessages: (conversationId: string) => Promise<void>;
}

// Utility functions

export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

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
