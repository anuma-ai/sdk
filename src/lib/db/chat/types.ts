import type { Database } from "@nozbe/watermelondb";
import { v7 as uuidv7 } from "uuid";

import type {
  LlmapiChatCompletionTool,
  LlmapiMessage,
  LlmapiResponseReasoning,
  LlmapiResponseResponse,
  LlmapiResponseUsage,
  LlmapiThinkingOptions,
  LlmapiToolCallEvent,
} from "../../../client";
import type { ServerToolCallEvent, ToolCallArgumentsDeltaEvent } from "../../chat/useChat/utils";
import type { FileProcessor } from "../../processors/types";
import type { ServerTool } from "../../tools";

/**
 * Function type for dynamic server tools filtering based on prompt embeddings.
 * Receives the prompt embedding(s) and all available tools, returns tool names to include.
 *
 * @param embeddings - Single embedding or array of embeddings (for chunked messages)
 * @param tools - All available server tools with embeddings
 * @returns Array of tool names to include
 */
export type ServerToolsFilterFn = (
  embeddings: number[] | number[][],
  tools: ServerTool[]
) => string[];

/**
 * Server tools filter: static list of names or dynamic function.
 * - string[]: Static list of tool names to include
 * - ServerToolsFilterFn: Dynamic filter based on prompt embeddings
 */
export type ServerToolsFilter = string[] | ServerToolsFilterFn;

/**
 * Function type for dynamic client tools filtering based on prompt embeddings.
 * Receives the prompt embedding(s) (or null for short messages where no embedding
 * was generated) and all client tools, returns tool names to include.
 *
 * @param embeddings - Single embedding, array of embeddings, or null (short message)
 * @param tools - All client tools passed to sendMessage
 * @returns Array of tool names to include
 */
export type ClientToolsFilterFn = (
  embeddings: number[] | number[][] | null,
  tools: LlmapiChatCompletionTool[]
) => string[];

// Core types

export type ChatRole = "user" | "assistant" | "system";

/**
 * Feedback type for message like/dislike.
 * - 'like': User liked the response (thumbs up)
 * - 'dislike': User disliked the response (thumbs down)
 * - null/undefined: No feedback given
 */
export type MessageFeedback = "like" | "dislike" | null;

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
  creditsUsed?: number;
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
  /** Image generation model used for this message (e.g., "nano-banana-flash") */
  imageModel?: string;
  /** @deprecated Use fileIds with media table instead */
  files?: FileMetadata[];
  /** Array of media_id references for direct lookup in media table */
  fileIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  vector?: number[];
  embeddingModel?: string;
  /** Chunks of this message with individual embeddings for fine-grained search */
  chunks?: MessageChunk[];
  usage?: ChatCompletionUsage;
  sources?: SearchSource[];
  responseDuration?: number;
  wasStopped?: boolean;
  /** If set, indicates the message failed with this error */
  error?: string;
  thoughtProcess?: ActivityPhase[];
  /** Reasoning/thinking content from models that support extended thinking */
  thinking?: string;
  /** Parent message ID for branching (edit/regenerate). Null for root messages. */
  parentMessageId?: string;
  /** User feedback: 'like', 'dislike', or null for no feedback */
  feedback?: MessageFeedback;
  /** Tool call events from the backend response (for reconstructing tool call history) */
  toolCallEvents?: LlmapiToolCallEvent[];
}

export interface ActivityPhase {
  id: string;
  label: string;
  timestamp: number;
  status: "pending" | "active" | "completed";
  data?: unknown[];
}

export interface StoredConversation {
  uniqueId: string;
  conversationId: string;
  title: string;
  /** Optional project ID this conversation belongs to */
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface StoredMessageWithSimilarity extends StoredMessage {
  similarity: number;
}

/**
 * Cached conversation summary for progressive history summarization.
 *
 * Instead of sending all conversation history verbatim on every message,
 * older messages are progressively summarized into a compact text.
 * This reduces input tokens by 50-70% for long conversations.
 */
export interface StoredConversationSummary {
  /** WatermelonDB record ID */
  uniqueId: string;
  /** Conversation this summary belongs to */
  conversationId: string;
  /** The progressive summary text */
  summary: string;
  /** uniqueId of the last message included in the summary */
  summarizedUpTo: string;
  /** Approximate token count of the summary (chars / 4) */
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A chunk of a message with its own embedding for fine-grained search
 */
export interface MessageChunk {
  /** The chunk text */
  text: string;
  /** Embedding vector for this chunk */
  vector: number[];
  /** Character offset where this chunk starts in the original message */
  startOffset: number;
  /** Character offset where this chunk ends in the original message */
  endOffset: number;
}

/**
 * Search result from chunk-based search
 */
export interface ChunkSearchResult {
  /** The matching chunk text */
  chunkText: string;
  /** The full message containing this chunk */
  message: StoredMessage;
  /** Similarity score of the chunk */
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
  /** Image generation model used for this message */
  imageModel?: string;
  /** @deprecated Use fileIds with media table instead */
  files?: FileMetadata[];
  /** Array of media_id references for direct lookup in media table */
  fileIds?: string[];
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
  /** Parent message ID for branching (edit/regenerate). */
  parentMessageId?: string;
  /** Tool call events from the backend response (for reconstructing tool call history) */
  toolCallEvents?: LlmapiToolCallEvent[];
}

export interface CreateConversationOptions {
  conversationId?: string;
  title?: string;
  /** Optional project ID to associate this conversation with */
  projectId?: string;
}

export interface UpdateMessageOptions {
  content?: string;
  model?: string;
  /** Image generation model used for this message */
  imageModel?: string;
  /** @deprecated Use fileIds with media table instead */
  files?: FileMetadata[];
  /** Array of media_id references for direct lookup in media table */
  fileIds?: string[];
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
  /** User feedback: 'like', 'dislike', or null for no feedback */
  feedback?: MessageFeedback | null;
  /** Tool call events from the backend response (for reconstructing tool call history) */
  toolCallEvents?: LlmapiToolCallEvent[];
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
  /** Callback invoked when thinking/reasoning content is received (from `<think>` tags or API reasoning) */
  onThinking?: (chunk: string) => void;
  /** Callback invoked when the response completes successfully */
  onFinish?: (response: LlmapiResponseResponse) => void;
  /** Callback invoked when an error occurs during the request */
  onError?: (error: Error) => void;
  /**
   * Callback invoked when a server-side tool (MCP) is called during streaming.
   * Use this to show activity indicators like "Searching..." in the UI.
   */
  onServerToolCall?: (toolCall: ServerToolCallEvent) => void;
  /**
   * Called with partial tool call arguments as they stream in.
   * Use for live preview of artifacts (HTML, slides) being generated.
   */
  onToolCallArgumentsDelta?: (event: ToolCallArgumentsDeltaEvent) => void;
  /**
   * File preprocessors to use for automatic text extraction.
   * - undefined (default): Use all built-in processors (PDF, Excel, Word)
   * - null or []: Disable preprocessing
   * - FileProcessor[]: Use specific processors
   */
  fileProcessors?: FileProcessor[] | null;
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
  /**
   * Configuration for server-side tools fetching and caching.
   * Server tools are fetched from /api/v1/tools and cached in localStorage.
   */
  serverTools?: {
    /** Cache expiration time in milliseconds (default: 86400000 = 1 day) */
    cacheExpirationMs?: number;
  };
  /**
   * Automatically generate embeddings for messages after saving.
   * Enables semantic search over past conversations via searchMessages().
   * @default true
   */
  autoEmbedMessages?: boolean;
  /**
   * Embedding model to use when autoEmbedMessages is enabled.
   * @default DEFAULT_API_EMBEDDING_MODEL
   */
  embeddingModel?: string;
  /**
   * Minimum content length required to generate embeddings.
   * Messages shorter than this are skipped as they provide limited semantic value.
   * @default 10
   */
  minContentLength?: number;
  /**
   * R2 domain for identifying MCP-generated image URLs.
   * When set, enables OPFS caching of generated images.
   * Defaults to the hardcoded MCP_R2_DOMAIN from clientConfig.
   */
  mcpR2Domain?: string;
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
   * The model identifier to use for this request (e.g., "fireworks/accounts/fireworks/models/kimi-k2p5").
   * If not specified, uses the default model configured on the server.
   */
  model?: string;

  /**
   * Skip all storage operations (conversation, messages, embeddings, media).
   * Use this for one-off tasks like title generation where you don't want
   * to pollute the database with utility messages.
   *
   * When true:
   * - No conversation is created or required
   * - Messages are not stored in the database
   * - No embeddings are generated
   * - No media/files are processed for storage
   * - Result will not include userMessage or assistantMessage
   *
   * @default false
   *
   * @example
   * ```ts
   * // Generate a title without storing anything
   * const { data } = await sendMessage({
   *   messages: [{ role: "user", content: [{ type: "text", text: "Generate a title for: ..." }] }],
   *   skipStorage: true,
   *   includeHistory: false,
   * });
   * ```
   */
  skipStorage?: boolean;

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
   * Enable progressive summarization of conversation history.
   *
   * When enabled, older messages are summarized into a compact text using a cheap
   * model, while recent messages are kept verbatim. This reduces input tokens by
   * 50-70% for long conversations.
   *
   * Requires `includeHistory` to be true (default). When `includeHistory` is false
   * or `summarizeHistory` is false, all history is sent verbatim (current behavior).
   *
   * @default false
   */
  summarizeHistory?: boolean;

  /**
   * Token threshold for conversation history before summarization triggers.
   *
   * When the total token count of the cached summary + unsummarized messages
   * exceeds this value, older messages are summarized to fit within the budget.
   *
   * How to choose a value:
   * - Lower (2000-3000): aggressive summarization, lowest cost, less verbatim context.
   * - Default (4000): balanced — keeps history under ~$0.01/message at typical pricing
   *   ($2.50/1M tokens). Triggers for most conversations after 5-10 turns.
   * - Higher (8000-16000): less frequent summarization, more context, higher cost.
   *   Good for code review or legal conversations needing precise recall.
   *
   * The fixed overhead (system prompt + tools + memory ≈ 3,500 tokens) is NOT
   * included — it is additive. Total input ≈ overhead + threshold + current message.
   *
   * @default 4000
   */
  summaryTokenThreshold?: number;

  /**
   * Minimum number of recent messages to always keep verbatim (never summarized).
   * Ensures the LLM always has immediate conversational context.
   * Even if these messages exceed the token threshold, they are kept.
   *
   * @default 4 (2 user-assistant turns)
   */
  summaryMinWindowMessages?: number;

  /**
   * Model to use for generating conversation summaries.
   * Should be a cheap, fast model since summarization is a straightforward task.
   *
   * @default 'cerebras/qwen-3-235b-a22b-instruct-2507' ($0.60/1M input tokens)
   */
  summaryModel?: string;

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
   * Note: Sources are also automatically extracted from tool_call_events in the response.
   */
  sources?: SearchSource[];

  /**
   * Activity phases for tracking the request lifecycle in the UI.
   * Each phase represents a step like "Searching", "Thinking", "Generating".
   * The final phase is automatically marked as completed when stored.
   *
   * Note: If you need activity phases that are added during streaming (e.g., server tool calls),
   * use `getThoughtProcess` callback instead, which captures phases AFTER streaming completes.
   */
  thoughtProcess?: ActivityPhase[];

  /**
   * Callback to get activity phases AFTER streaming completes.
   * Use this instead of `thoughtProcess` when phases are added dynamically during streaming
   * (e.g., via server tool call events like "Searching...", "Generating image...").
   *
   * If both `thoughtProcess` and `getThoughtProcess` are provided, `getThoughtProcess` takes precedence.
   */
  getThoughtProcess?: () => ActivityPhase[];

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
   * Client-side tools with optional executors.
   * These tools run in the browser/app and can have JavaScript executor functions.
   */
  clientTools?: LlmapiChatCompletionTool[];

  /**
   * Server-side tools to include from /api/v1/tools.
   * - undefined: Include all server-side tools (default)
   * - string[]: Include only tools with these names
   * - []: Include no server-side tools
   * - function: Dynamic filter that receives prompt embedding(s) and all tools,
   *   returns tool names to include. Useful for semantic tool matching.
   *
   * @example
   * // Include only specific server tools
   * serverTools: ["generate_cloud_image", "perplexity_search"]
   *
   * // Disable server tools for this request
   * serverTools: []
   *
   * // Semantic tool matching based on prompt
   * serverTools: (embeddings, tools) => {
   *   const matches = findMatchingTools(embeddings, tools, { limit: 5 });
   *   return matches.map(m => m.tool.name);
   * }
   */
  serverTools?: ServerToolsFilter;

  /**
   * Dynamic filter for client-side tools based on prompt embeddings.
   * Receives the prompt embedding(s) (or null for short messages) and all client tools,
   * returns tool names to include. Tools not in the returned list are excluded from the request.
   *
   * @example
   * clientToolsFilter: (embeddings, tools) => {
   *   if (!embeddings) return []; // Short message — no client tools
   *   const matches = findMatchingTools(embeddings, pseudoServerTools);
   *   return matches.map(m => m.tool.name);
   * }
   */
  clientToolsFilter?: ClientToolsFilterFn;

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
   * Maximum number of tool execution rounds before forcing the model to respond with text.
   * After this many rounds, `toolChoice` is set to `"none"` on the next continuation,
   * so the model produces a text answer using whatever tool results it has gathered.
   * @default 3
   */
  maxToolRounds?: number;

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

  /** User-selected image generation model for server-side enforcement. */
  imageModel?: string;

  /**
   * Per-request callback for thinking/reasoning chunks.
   * Called with delta chunks as the model "thinks" through a problem.
   * Use this to display thinking progress in the UI.
   */
  onThinking?: (chunk: string) => void;

  /** Parent message ID for branching (edit/regenerate). Sets on the user message. */
  parentMessageId?: string;
}

export interface BaseSendMessageSuccessResult {
  data: LlmapiResponseResponse;
  error: null;
  userMessage: StoredMessage;
  assistantMessage: StoredMessage;
}

export interface BaseSendMessageSkippedResult {
  data: LlmapiResponseResponse;
  error: null;
  userMessage?: undefined;
  assistantMessage?: undefined;
  /** Indicates this was a skipStorage request - no messages were persisted */
  skipped: true;
}

export interface BaseSendMessageErrorResult {
  data: null;
  error: string;
  userMessage?: StoredMessage;
  assistantMessage?: undefined;
}

export type BaseSendMessageWithStorageResult =
  | BaseSendMessageSuccessResult
  | BaseSendMessageSkippedResult
  | BaseSendMessageErrorResult;

export interface BaseUseChatStorageResult {
  isLoading: boolean;
  stop: () => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  createConversation: (options?: CreateConversationOptions) => Promise<StoredConversation>;
  getConversation: (id: string) => Promise<StoredConversation | null>;
  getConversations: () => Promise<StoredConversation[]>;
  updateConversationTitle: (id: string, title: string) => Promise<boolean>;
  deleteConversation: (id: string) => Promise<boolean>;
  getMessages: (conversationId: string) => Promise<StoredMessage[]>;
}

// Utility functions

export function generateConversationId(): string {
  return `conv_${uuidv7()}`;
}

export function convertUsageToStored(usage?: LlmapiResponseUsage): ChatCompletionUsage | undefined {
  if (!usage) return undefined;
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    costMicroUsd: usage.cost_micro_usd,
    creditsUsed: usage.credits_used,
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
    idx === thoughtProcess.length - 1 ? { ...phase, status: "completed" as const } : phase
  );
}

/**
 * Result of extracting user message content from a messages array.
 */
interface ExtractedUserMessage {
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
          id:
            part.file.file_id || `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
