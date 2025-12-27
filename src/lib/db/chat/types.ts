import type { Database } from "@nozbe/watermelondb";
import type {
  LlmapiChatCompletionResponse,
  LlmapiChatCompletionUsage,
  LlmapiMessage,
} from "../../../client";
import type { StoredMemory } from "../memory/types";

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
  /** If set, indicates the message failed with this error */
  error?: string;
  thoughtProcess?: ActivityPhase[];
}

export interface ActivityPhase {
  id: string;
  label: string;
  timestamp: number;
  status: "pending" | "active" | "completed";
  data?: StoredMemory[];
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
  /** If set, indicates the message failed with this error */
  error?: string;
  thoughtProcess?: ActivityPhase[];
}

export interface CreateConversationOptions {
  conversationId?: string;
  title?: string;
}

export interface UpdateMessageOptions {
  content?: string;
  model?: string;
  files?: FileMetadata[];
  usage?: ChatCompletionUsage;
  sources?: SearchSource[];
  responseDuration?: number;
  vector?: number[];
  embeddingModel?: string;
  wasStopped?: boolean;
  error?: string | null;
  thoughtProcess?: ActivityPhase[];
}

// Hook types

export interface BaseUseChatStorageOptions {
  database: Database;
  conversationId?: string;
  autoCreateConversation?: boolean;
  defaultConversationTitle?: string;
  getToken?: () => Promise<string | null>;
  baseUrl?: string;
  onData?: (chunk: string) => void;
  onFinish?: (response: LlmapiChatCompletionResponse) => void;
  onError?: (error: Error) => void;
  /** Wallet address for encryption (optional - encryption disabled if not provided) */
  walletAddress?: string | null;
  /** Function to request encryption key (optional - encryption disabled if not provided) */
  requestEncryptionKey?: (address: string) => Promise<void>;
  /** Function to sign message for migration (optional - required for migrating old encrypted data) */
  signMessage?: (message: string) => Promise<string>;
}

export interface BaseSendMessageWithStorageArgs {
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
  thoughtProcess?: ActivityPhase[];
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
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  createConversation: (
    options?: CreateConversationOptions
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

/**
 * Marks the last phase in a thought process as completed.
 * Used when storing messages to finalize the activity tracking state.
 */
export function finalizeThoughtProcess(
  thoughtProcess?: ActivityPhase[]
): ActivityPhase[] | undefined {
  if (!thoughtProcess?.length) return thoughtProcess;
  return thoughtProcess.map((phase, idx) =>
    idx === thoughtProcess.length - 1
      ? { ...phase, status: "completed" as const }
      : phase
  );
}
