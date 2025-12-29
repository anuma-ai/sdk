import type { Database } from "@nozbe/watermelondb";
import type {
  LlmapiMessage,
  LlmapiResponseReasoning,
  LlmapiResponseResponse,
  LlmapiResponseUsage,
  LlmapiThinkingOptions,
  LlmapiTool,
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
  /** Reasoning/thinking content from models that support extended thinking */
  thinking?: string;
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
  /** Reasoning/thinking content from models that support extended thinking */
  thinking?: string;
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
  /** Reasoning/thinking content from models that support extended thinking */
  thinking?: string | null;
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
  onFinish?: (response: LlmapiResponseResponse) => void;
  onError?: (error: Error) => void;
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
  // Responses API options
  /**
   * Whether to store the response server-side.
   * When true, the response can be retrieved later using the response ID.
   */
  store?: boolean;
  /**
   * ID of a previous response to continue from.
   * Enables multi-turn conversations without resending full history.
   */
  previousResponseId?: string;
  /**
   * Conversation ID for grouping related responses on the server.
   */
  serverConversation?: string;
  /**
   * Controls randomness in the response (0.0 to 2.0).
   */
  temperature?: number;
  /**
   * Maximum number of tokens to generate in the response.
   */
  maxOutputTokens?: number;
  /**
   * Array of tool definitions available to the model.
   */
  tools?: LlmapiTool[];
  /**
   * Controls which tool to use: "auto", "any", "none", "required", or a specific tool name.
   */
  toolChoice?: string;
  /**
   * Reasoning configuration for o-series and other reasoning models.
   * Controls reasoning effort and summary output.
   */
  reasoning?: LlmapiResponseReasoning;
  /**
   * Extended thinking configuration for Anthropic models (Claude).
   * Enables the model to think through complex problems step by step.
   */
  thinking?: LlmapiThinkingOptions;
  /**
   * Per-request callback for thinking/reasoning chunks.
   * Called with delta chunks as the model "thinks" through a problem.
   */
  onThinking?: (chunk: string) => void;
}

export interface BaseSendMessageSuccessResult {
  data: LlmapiResponseResponse;
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
  usage?: LlmapiResponseUsage
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
