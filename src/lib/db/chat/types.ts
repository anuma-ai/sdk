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

/**
 * Metadata for files attached to messages.
 *
 * Note the distinction between `url` and `sourceUrl`:
 * - `url`: Content URL that gets sent to the AI as part of the message (e.g., data URIs for user uploads)
 * - `sourceUrl`: Original external URL for locally-cached files (for lookup only, never sent to AI)
 */
export interface FileMetadata {
  /** Unique identifier for the file (used as OPFS key for cached files) */
  id: string;
  /** Display name of the file */
  name: string;
  /** MIME type (e.g., "image/png") */
  type: string;
  /** File size in bytes */
  size: number;
  /**
   * Content URL to include when sending this message to the AI.
   * When present, this URL is added as an `image_url` content part.
   * Typically used for user-uploaded files (data URIs) that should be sent with the message.
   *
   * NOT used for MCP-cached files - those use `sourceUrl` for lookup and render from OPFS.
   */
  url?: string;
  /**
   * Original external URL for files downloaded and cached locally (e.g., from MCP R2).
   * Used purely for URL→OPFS mapping to enable fallback when the source returns 404.
   *
   * This is metadata for local lookup only - it is NOT sent to the AI or rendered directly.
   * The file content is served from OPFS using the `id` field.
   */
  sourceUrl?: string;
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

/**
 * File metadata with conversation context for file browsing.
 * Extends FileMetadata with information about where the file was used.
 */
export interface StoredFileWithContext extends FileMetadata {
  /** ID of the conversation where this file was attached */
  conversationId: string;
  /** Timestamp when the file was stored (from the message) */
  createdAt: Date;
  /** Role of the message that contains this file */
  messageRole: ChatRole;
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
/**
 * Base options for useChatStorage hook
 * @inline
 */
export interface BaseUseChatStorageOptions {
  /** WatermelonDB database instance for storing conversations and messages */
  database: Database;
  /** ID of an existing conversation to load and continue */
  conversationId?: string;
  /** Automatically create a new conversation if none is set (default: true) */
  autoCreateConversation?: boolean;
  /** Title for auto-created conversations (default: "New conversation") */
  defaultConversationTitle?: string;
  /** Function to retrieve the auth token for API requests */
  getToken?: () => Promise<string | null>;
  /** Base URL for the chat API endpoint */
  baseUrl?: string;
  /** Callback invoked with each streamed response chunk */
  onData?: (chunk: string) => void;
  /** Callback invoked when thinking/reasoning content is received (from <think> tags or API reasoning) */
  onThinking?: (chunk: string) => void;
  /** Callback invoked when the response completes successfully */
  onFinish?: (response: LlmapiResponseResponse) => void;
  /** Callback invoked when an error occurs during the request */
  onError?: (error: Error) => void;
  /**
   * File preprocessors to use for automatic text extraction.
   * - undefined (default): Use all built-in processors (PDF, Excel, Word)
   * - null or []: Disable preprocessing
   * - FileProcessor[]: Use specific processors
   */
  fileProcessors?: any[] | null;
  /**
   * Options for file preprocessing behavior
   */
  fileProcessingOptions?: {
    /** Whether to keep original file attachments (default: true) */
    keepOriginalFiles?: boolean;
    /** Max file size to process in bytes (default: 10MB) */
    maxFileSizeBytes?: number;
    /** Callback for progress updates */
    onProgress?: (current: number, total: number, fileName: string) => void;
    /** Callback for errors (non-fatal) */
    onError?: (fileName: string, error: Error) => void;
  };
}

/**
 * Base arguments for sending a message with automatic storage.
 *
 * These arguments control both the AI request and how the message
 * is persisted to the local database.
 * @inline
 */
export interface BaseSendMessageWithStorageArgs {
  /**
   * The message array to send to the AI.
   *
   * Uses the modern array format that supports multimodal content (text, images, files).
   * The last user message in this array will be extracted and stored in the database.
   *
   * When `includeHistory` is true (default), conversation history is prepended.
   * When `includeHistory` is false, only these messages are sent.
   *
   * @example
   * ```ts
   * // Simple usage
   * sendMessage({
   *   messages: [
   *     { role: "user", content: [{ type: "text", text: "Hello!" }] }
   *   ]
   * })
   *
   * // With system prompt and history disabled
   * sendMessage({
   *   messages: [
   *     { role: "system", content: [{ type: "text", text: "You are helpful" }] },
   *     { role: "user", content: [{ type: "text", text: "Question" }] },
   *   ],
   *   includeHistory: false
   * })
   *
   * // With images
   * sendMessage({
   *   messages: [
   *     { role: "user", content: [
   *       { type: "text", text: "What's in this image?" },
   *       { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
   *     ]}
   *   ]
   * })
   * ```
   */
  messages: LlmapiMessage[];

  /**
   * The model identifier to use for this request (e.g., "gpt-4o", "claude-sonnet-4-20250514").
   * If not specified, uses the default model configured on the server.
   */
  model?: string;

  /**
   * Whether to automatically include previous messages from the conversation as context.
   * When true, fetches stored messages and prepends them to the request.
   * Ignored if `messages` is provided.
   * @default true
   */
  includeHistory?: boolean;

  /**
   * Maximum number of historical messages to include when `includeHistory` is true.
   * Only the most recent N messages are included to manage context window size.
   * @default 50
   */
  maxHistoryMessages?: number;

  /**
   * File attachments to include with the message (images, documents, etc.).
   * Files with image MIME types and URLs are sent as image content parts.
   * File metadata is stored with the message (URLs are stripped if they're data URIs).
   */
  files?: FileMetadata[];

  /**
   * Per-request callback invoked with each streamed response chunk.
   * Overrides the hook-level `onData` callback for this request only.
   * Use this to update UI as the response streams in.
   */
  onData?: (chunk: string) => void;

  /**
   * Additional context from memory/RAG system to include in the request.
   * Typically contains retrieved relevant information from past conversations.
   */
  memoryContext?: string;

  /**
   * Additional context from search results to include in the request.
   * Typically contains relevant information from web or document searches.
   */
  searchContext?: string;

  /**
   * Additional context from preprocessed file attachments.
   * Contains extracted text from Excel, Word, PDF, and other document files.
   * Injected as a system message so it's available throughout the conversation.
   */
  fileContext?: string;

  /**
   * Search sources to attach to the stored message for citation/reference.
   * These are combined with any sources extracted from the assistant's response.
   */
  sources?: SearchSource[];

  /**
   * Activity phases for tracking the request lifecycle in the UI.
   * Each phase represents a step like "Searching", "Thinking", "Generating".
   * The final phase is automatically marked as completed when stored.
   */
  thoughtProcess?: ActivityPhase[];

  // Responses API options

  /**
   * Controls randomness in the response (0.0 to 2.0).
   * Lower values make output more deterministic, higher values more creative.
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate in the response.
   * Use this to limit response length and control costs.
   */
  maxOutputTokens?: number;

  /**
   * Array of tool definitions available to the model.
   * Tools enable the model to call functions, search, execute code, etc.
   */
  tools?: LlmapiTool[];

  /**
   * Controls which tool the model should use:
   * - "auto": Model decides whether to use a tool (default)
   * - "any": Model must use one of the provided tools
   * - "none": Model cannot use any tools
   * - "required": Model must use a tool
   * - Specific tool name: Model must use that specific tool
   */
  toolChoice?: string;

  /**
   * Reasoning configuration for o-series and other reasoning models.
   * Controls reasoning effort level and whether to include reasoning summary.
   */
  reasoning?: LlmapiResponseReasoning;

  /**
   * Extended thinking configuration for Anthropic models (Claude).
   * Enables the model to think through complex problems step by step
   * before generating the final response.
   */
  thinking?: LlmapiThinkingOptions;

  /**
   * Per-request callback for thinking/reasoning chunks.
   * Called with delta chunks as the model "thinks" through a problem.
   * Use this to display thinking progress in the UI.
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

/**
 * Result of extracting user message content from a messages array.
 */
export interface ExtractedUserMessage {
  /** The extracted text content */
  content: string;
  /** File metadata extracted from image_url parts */
  files?: FileMetadata[];
}

/**
 * Extracts the text content and files from the last user message in a messages array.
 * Used for storing the user's message when `content` is not provided.
 *
 * @param messages - The messages array to extract from
 * @returns The extracted content and files, or null if no user message found
 */
export function extractUserMessageFromMessages(
  messages?: LlmapiMessage[]
): ExtractedUserMessage | null {
  if (!messages || messages.length === 0) {
    return null;
  }

  // Find the last user message
  const userMessages = messages.filter((m) => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1];

  if (!lastUserMessage || !lastUserMessage.content) {
    return null;
  }

  // Extract text parts
  const textParts: string[] = [];
  const files: FileMetadata[] = [];

  for (const part of lastUserMessage.content) {
    if (part.type === "text" && part.text) {
      textParts.push(part.text);
    } else if (part.type === "image_url" && part.image_url?.url) {
      // Generate a file ID for the image
      files.push({
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: "image",
        type: "image/unknown",
        size: 0,
        url: part.image_url.url,
      });
    } else if (part.type === "input_file" && part.file) {
      // Extract input_file parts (Word, Excel, etc.)
      const fileUrl = part.file.file_url || part.file.file_data;
      if (fileUrl) {
        files.push({
          id: part.file.file_id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: part.file.filename || "file",
          type: "application/octet-stream", // Will be determined by processor
          size: 0,
          url: fileUrl,
        });
      }
    }
  }

  const content = textParts.join("\n");

  return {
    content,
    files: files.length > 0 ? files : undefined,
  };
}
