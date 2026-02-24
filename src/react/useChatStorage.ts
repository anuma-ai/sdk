"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LlmapiChatCompletionResponse, LlmapiMessage, LlmapiToolCallEvent } from "../client";
import { MCP_R2_DOMAIN } from "../clientConfig";
import type { ApiType } from "../lib/chat/useChat";
import type { ApiResponse } from "../lib/chat/useChat/strategies/types";
import {
  type ActivityPhase,
  type BaseSendMessageWithStorageArgs,
  type BaseUseChatStorageOptions,
  type BaseUseChatStorageResult,
  clearMessagesOp,
  Conversation,
  convertUsageToStored,
  createConversationOp,
  type CreateConversationOptions,
  createMessageOp,
  type CreateMessageOptions,
  deleteConversationOp,
  extractUserMessageFromMessages,
  type FileMetadata,
  finalizeThoughtProcess,
  getAllFilesOp,
  getConversationOp,
  getConversationsOp,
  getMessagesOp,
  makeSyntheticStoredConversation,
  makeSyntheticStoredMessage,
  Message,
  type MessageChunk,
  type SearchSource,
  type StorageOperationsContext,
  type StoredConversation,
  type StoredFileWithContext,
  type StoredMessage,
  updateConversationTitleOp,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
  updateMessageErrorOp,
} from "../lib/db/chat";
import {
  isOPFSSupported,
  writeEncryptedFile,
  readEncryptedFile,
  deleteEncryptedFile,
  createFilePlaceholder,
  extractFileIds,
  BlobUrlManager,
  extractMCPImageUrls,
  replaceMCPUrlsWithPlaceholders,
} from "../lib/storage";
import {
  deleteMediaByConversationOp,
  createMediaBatchOp,
  type CreateMediaOptions,
  generateMediaId,
  getMediaByIdsOp,
  getMediaTypeFromMime,
  hardDeleteMediaOp,
  type StoredMedia,
  updateMediaMessageIdBatchOp,
} from "../lib/db/media";
import {
  createVaultMemoryOp,
  deleteVaultMemoryOp,
  getAllVaultMemoriesOp,
  getVaultMemoryOp,
  type StoredVaultMemory,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../lib/db/memoryVault";
import { VaultMemory } from "../lib/db/memoryVault/models";
import {
  type FlushResult,
  type QueuedOperation,
  type QueuedOperationType,
  type QueueEncryptionContext,
  queueManager,
  type QueueStatus,
  WalletPoller,
} from "../lib/db/queue";
import {
  chunkText,
  createMemoryRetrievalTool as createMemoryRetrievalToolBase,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MIN_CONTENT_LENGTH,
  generateEmbedding,
  generateEmbeddings,
  type MemoryRetrievalSearchOptions,
  shouldChunkMessage,
} from "../lib/memoryRetrieval";
import {
  createMemoryVaultSearchTool as createMemoryVaultSearchToolBase,
  createMemoryVaultTool as createMemoryVaultToolBase,
  createVaultEmbeddingCache,
  eagerEmbedContent,
  type MemoryVaultSearchOptions,
  type MemoryVaultToolOptions,
  preEmbedVaultMemories,
  searchVaultMemories as searchVaultMemoriesBase,
  type VaultEmbeddingCache,
  type VaultSearchResult,
} from "../lib/memoryVault";
import { preprocessFiles } from "../lib/processors";
import {
  filterServerTools,
  findMatchingTools,
  getServerTools,
  mergeTools,
  type ServerTool,
  shouldRefreshTools,
} from "../lib/tools";
import { useChat } from "./useChat";
import type { EmbeddedWalletSignerFn, SignMessageFn } from "./useEncryption";
import { getEncryptionKey, hasEncryptionKey, requestEncryptionKey } from "./useEncryption";
import { onKeyAvailable } from "./useEncryption";

// Lower threshold for tool filtering - short prompts like "draw a cat" should work
const MIN_CONTENT_LENGTH_FOR_TOOLS = 5;
// Max client tools to include after automatic semantic filtering
const MAX_CLIENT_TOOLS_AFTER_FILTER = 3;
// Minimum similarity for client tool semantic matching
const CLIENT_TOOLS_MIN_SIMILARITY = 0.25;
import type { ToolConfig } from "../lib/chat/useChat/types";
import { DEFAULT_API_EMBEDDING_MODEL } from "../lib/memoryRetrieval/constants";

/**
 * Automatically filter client tools using embedding-based semantic matching.
 * Generates embeddings for tool descriptions (cached), then selects the most
 * relevant tools for the user's prompt. This prevents sending 20+ tool
 * definitions that eat up the context window.
 *
 * @returns Filtered client tools, or the original array if filtering fails/skips.
 */
async function autoFilterClientTools(
  clientTools: any[],
  promptEmbeddings: number[] | number[][] | null,
  cache: Map<string, number[]>,
  embeddingOptions: { getToken: () => Promise<string | null>; baseUrl?: string; model?: string }
): Promise<any[]> {
  // Memory tools are always included — only filter connector tools (Notion, Google)
  const isMemoryTool = (t: any) => {
    const name: string = t.function?.name || t.name || "";
    return name.startsWith("memory_vault_");
  };
  const alwaysInclude = clientTools.filter(isMemoryTool);
  const filterCandidates = clientTools.filter((t) => !isMemoryTool(t));

  // Skip if no embeddings or too few filterable tools
  if (!promptEmbeddings || filterCandidates.length <= MAX_CLIENT_TOOLS_AFTER_FILTER) {
    return clientTools;
  }

  // Generate embeddings for tool descriptions that aren't cached yet
  const toolsNeedingEmbeddings: { name: string; description: string }[] = [];
  for (const t of filterCandidates) {
    const name: string = t.function?.name || t.name || "";
    if (name && !cache.has(name)) {
      const desc: string = t.function?.description || t.description || name;
      toolsNeedingEmbeddings.push({ name, description: desc });
    }
  }

  if (toolsNeedingEmbeddings.length > 0) {
    try {
      const descriptions = toolsNeedingEmbeddings.map((t) => t.description);
      const embeddings = await generateEmbeddings(descriptions, embeddingOptions);
      for (let i = 0; i < toolsNeedingEmbeddings.length; i++) {
        cache.set(toolsNeedingEmbeddings[i].name, embeddings[i]);
      }
    } catch {
      // Embedding generation failed — skip filtering, send all tools
      return clientTools;
    }
  }

  // Build pseudo-ServerTool objects with cached embeddings for findMatchingTools
  const pseudoServerTools: ServerTool[] = [];
  for (const t of filterCandidates) {
    const name: string = t.function?.name || t.name || "";
    const embedding = cache.get(name);
    if (!embedding) continue;
    pseudoServerTools.push({
      type: "function",
      name,
      description: t.function?.description || t.description || name,
      parameters: t.function?.parameters ||
        t.function?.arguments || { type: "object", properties: {}, required: [] },
      embedding,
    });
  }

  const matches = findMatchingTools(promptEmbeddings, pseudoServerTools, {
    limit: MAX_CLIENT_TOOLS_AFTER_FILTER,
    minSimilarity: CLIENT_TOOLS_MIN_SIMILARITY,
  });

  if (matches.length === 0) {
    // No matches above threshold — send all filterable tools + memory
    return clientTools;
  }

  const matchedNames = new Set(matches.map((m) => m.tool.name));
  const filtered = filterCandidates.filter((t: any) => {
    const name = t.function?.name || t.name;
    return name && matchedNames.has(name);
  });
  const result = [...alwaysInclude, ...filtered];
  console.log(
    `[useChatStorage] Auto-filtered client tools: ${clientTools.length} → ${result.length}`,
    `| always: [${alwaysInclude.map((t: any) => t.function?.name || t.name).join(", ")}]`,
    `| filtered: [${[...matchedNames].join(", ")}]`
  );
  return result;
}

/**
 * Helper to convert a Blob to a data URI.
 */
async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert StoredMessage to LlmapiMessage format.
 * If a file has a sourceUrl, includes it as an image_url part (only for non-assistant messages).
 * If encryptionKey is provided and files are stored in OPFS, reads them and converts to data URIs.
 * Internal placeholders are replaced with sourceUrls or removed.
 */
async function storedToLlmapiMessage(
  stored: StoredMessage,
  encryptionKey?: CryptoKey,
  resolveMediaByIds?: (ids: string[]) => Promise<Array<{ mediaId: string; sourceUrl?: string }>>
): Promise<LlmapiMessage> {
  let textContent = stored.content;

  // Build a map of fileId -> sourceUrl for replacement
  const fileUrlMap = new Map<string, string>();

  // Add file image parts if present (only for non-assistant messages)
  // ai-portal doesn't support image_url in assistant messages for /chat/completions
  const imageParts: LlmapiMessage["content"] = [];
  if (stored.role !== "assistant" && stored.files?.length) {
    for (const file of stored.files) {
      // First check if there's a direct url (user uploads with data URIs or external URLs)
      if (file.url) {
        imageParts.push({
          type: "image_url",
          image_url: { url: file.url },
        });
      } else if (file.sourceUrl) {
        // For MCP-cached files, include the sourceUrl
        // If expired, AI simply won't see the image (local OPFS copy is for display only)
        imageParts.push({
          type: "image_url",
          image_url: { url: file.sourceUrl },
        });
        // Track sourceUrl for placeholder replacement
        fileUrlMap.set(file.id, file.sourceUrl);
      } else if (encryptionKey && isOPFSSupported()) {
        // No URL but we have encryption key - try to read from OPFS
        // This handles user-uploaded files stored in OPFS for history replay
        try {
          const result = await readEncryptedFile(file.id, encryptionKey);
          if (result) {
            // Convert blob to data URI for sending to API
            const dataUri = await blobToDataUri(result.blob);
            imageParts.push({
              type: "image_url",
              image_url: { url: dataUri },
            });
          }
        } catch {
          // Failed to read file from OPFS - skip silently
        }
      }
    }
  } else if (stored.role === "assistant" && stored.files?.length) {
    // For assistant messages, track sourceUrls for placeholder replacement only
    // URLs are already in text as markdown images, so model can get them from context
    for (const file of stored.files) {
      if (file.sourceUrl) {
        fileUrlMap.set(file.id, file.sourceUrl);
      }
    }
  }

  // Resolve fileIds from media table for messages using the new storage format
  // (where the deprecated stored.files is empty and fileIds references the media table)
  if (stored.fileIds?.length && resolveMediaByIds) {
    try {
      const mediaItems = await resolveMediaByIds(stored.fileIds);
      for (const media of mediaItems) {
        if (media.sourceUrl) {
          fileUrlMap.set(media.mediaId, media.sourceUrl);
        }
      }
    } catch {
      // Don't fail message conversion if media resolution fails
    }
  }

  // Replace internal __SDKFILE__ placeholders with sourceUrls or remove them
  // Pattern matches both legacy hex UUIDs and new media_UUID format from generateMediaId()
  textContent = textContent.replace(/__SDKFILE__([a-zA-Z0-9_-]+)__/g, (_match, fileId) => {
    const sourceUrl = fileUrlMap.get(fileId);
    if (sourceUrl) {
      // Replace with markdown image pointing to sourceUrl
      return `![image](${sourceUrl})`;
    }
    // Remove placeholder if no URL available
    return "";
  });

  // Also handle legacy ![MCP_IMAGE:fileId] placeholders for backward compatibility
  // This supports old messages that may still contain MCP_IMAGE placeholders
  // Pattern matches both legacy hex UUIDs and new media_UUID format from generateMediaId()
  textContent = textContent.replace(/!\[MCP_IMAGE:([a-zA-Z0-9_-]+)\]/g, (_match, fileId) => {
    const sourceUrl = fileUrlMap.get(fileId);
    if (sourceUrl) {
      return `![image](${sourceUrl})`;
    }
    return "";
  });

  // For assistant messages with resolved image URLs that aren't already in the content,
  // append them as markdown images so the LLM can reference them
  // (e.g., when user asks to edit a previously generated image)
  if (stored.role === "assistant" && fileUrlMap.size > 0) {
    const unreferencedImages = [...fileUrlMap.entries()].filter(
      ([, url]) => !textContent.includes(url)
    );
    if (unreferencedImages.length > 0) {
      const imageMarkdown = unreferencedImages
        .map(([, url]) => `![Generated image](${url})`)
        .join("\n");
      textContent = textContent + "\n\n" + imageMarkdown;
    }
  }

  // Clean up extra whitespace from removed placeholders
  textContent = textContent.replace(/\n{3,}/g, "\n\n").trim();

  const content: LlmapiMessage["content"] = [{ type: "text", text: textContent }, ...imageParts];

  return {
    role: stored.role,
    content,
  };
}

/**
 * Options for useChatStorage hook (React version)
 *
 * Extends base options with apiType support.
 * @inline
 */
export interface UseChatStorageOptions extends BaseUseChatStorageOptions {
  /**
   * Which API endpoint to use. Default: "responses"
   * - "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
   * - "completions": OpenAI Chat Completions API (wider model compatibility)
   */
  apiType?: ApiType;

  /**
   * Wallet address for encrypted file storage and field-level encryption.
   * When provided with signMessage, all sensitive message content, conversation titles,
   * and media metadata are encrypted at rest using AES-GCM with wallet-derived keys.
   *
   * Requires:
   * - OPFS browser support (for file storage)
   * - signMessage function (for encryption key derivation)
   *
   * When not provided, data is stored in plaintext (backwards compatible).
   */
  walletAddress?: string;

  /**
   * Function to sign a message for encryption key derivation.
   * Typically from Privy's useSignMessage hook.
   * Required together with walletAddress for field-level encryption.
   */
  signMessage?: SignMessageFn;

  /**
   * Function for silent signing with Privy embedded wallets.
   * When provided, enables automatic encryption key derivation without
   * user confirmation modals.
   */
  embeddedWalletSigner?: EmbeddedWalletSignerFn;

  /**
   * Async function that returns the wallet address when available.
   * Used for polling during Privy embedded wallet initialization.
   * When the wallet isn't ready yet, should return null.
   */
  getWalletAddress?: () => Promise<string | null>;

  /**
   * Enable the in-memory write queue for operations when encryption key
   * isn't yet available. When enabled, operations are held in memory and
   * flushed to encrypted storage once the key becomes available.
   * @default true
   */
  enableQueue?: boolean;

  /**
   * Automatically flush queued operations when the encryption key becomes
   * available. Requires `enableQueue` to be true.
   * @default true
   */
  autoFlushOnKeyAvailable?: boolean;
}

/**
 * Arguments for sendMessage with storage (React version)
 *
 * Extends base arguments with headers and apiType support.
 * @inline
 */
export interface SendMessageWithStorageArgs extends BaseSendMessageWithStorageArgs {
  /**
   * Custom HTTP headers to include with the API request.
   * Useful for passing additional authentication, tracking, or feature flags.
   */
  headers?: Record<string, string>;

  /**
   * Override the API type for this specific request.
   * - "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
   * - "completions": OpenAI Chat Completions API (wider model compatibility)
   *
   * Useful when different models need different APIs within the same hook instance.
   */
  apiType?: ApiType;

  /**
   * Explicitly specify the conversation ID to send this message to.
   * If provided, bypasses the automatic conversation detection/creation.
   * Useful when sending a message immediately after creating a conversation,
   * to avoid race conditions with React state updates.
   */
  conversationId?: string;
}

/**
 * Result from sendMessage with storage (React version)
 * The `data` field contains the raw server response which includes `tools_checksum`.
 */
export type SendMessageWithStorageResult =
  | {
      data: ApiResponse;
      error: null;
      userMessage: StoredMessage;
      assistantMessage: StoredMessage;
      /** Results from tools that were auto-executed by the SDK (e.g. display tools) */
      autoExecutedToolResults?: { name: string; result: any }[];
    }
  | {
      data: ApiResponse;
      error: null;
      userMessage?: undefined;
      assistantMessage?: undefined;
      /** Indicates this was a skipStorage request - no messages were persisted */
      skipped: true;
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
  /**
   * Sends a message to the AI and automatically persists both the user message
   * and assistant response to the database.
   *
   * This method handles the complete message lifecycle:
   * 1. Ensures a conversation exists (creates one if `autoCreateConversation` is enabled)
   * 2. Optionally includes conversation history for context
   * 3. Stores the user message before sending
   * 4. Streams the response via the underlying `useChat` hook
   * 5. Stores the assistant response (including usage stats, sources, and thinking)
   * 6. Handles abort/error states gracefully
   *
   * @example
   * ```ts
   * const result = await sendMessage({
   *   content: "Explain quantum computing",
   *   model: "gpt-4o",
   *   includeHistory: true,
   *   onData: (chunk) => setStreamingText(prev => prev + chunk),
   * });
   *
   * if (result.error) {
   *   console.error("Failed:", result.error);
   * } else {
   *   console.log("Stored message ID:", result.assistantMessage.uniqueId);
   * }
   * ```
   */
  sendMessage: (args: SendMessageWithStorageArgs) => Promise<SendMessageWithStorageResult>;
  /**
   * Get all files from all conversations, sorted by creation date (newest first).
   * Returns files with conversation context for building file browser UIs.
   */
  getAllFiles: (options?: {
    conversationId?: string;
    limit?: number;
  }) => Promise<StoredFileWithContext[]>;
  /**
   * Create a memory retrieval tool for LLM to search past conversations.
   * The tool is pre-configured with the hook's storage context and auth.
   *
   * @param searchOptions - Optional search configuration (limit, minSimilarity, etc.)
   * @returns A ToolConfig that can be passed to sendMessage's clientTools
   *
   * @example
   * ```ts
   * const memoryTool = createMemoryRetrievalTool({ limit: 5 });
   * await sendMessage({
   *   messages: [...],
   *   clientTools: [memoryTool],
   * });
   * ```
   */
  createMemoryRetrievalTool: (searchOptions?: Partial<MemoryRetrievalSearchOptions>) => ToolConfig;

  /**
   * Create a memory vault tool for LLM to save/update persistent memories.
   * The tool is pre-configured with the hook's vault context and encryption.
   *
   * @param options - Optional configuration (onSave callback for confirmation)
   * @returns A ToolConfig that can be passed to sendMessage's clientTools
   */
  createMemoryVaultTool: (options?: MemoryVaultToolOptions) => ToolConfig;

  /**
   * Create a memory vault search tool for LLM to search vault memories
   * using semantic similarity. Pre-configured with vault context, auth, and
   * a shared embedding cache that is pre-populated on init.
   *
   * @param searchOptions - Optional search configuration (limit, minSimilarity)
   * @returns A ToolConfig that can be passed to sendMessage's clientTools
   */
  createMemoryVaultSearchTool: (searchOptions?: MemoryVaultSearchOptions) => ToolConfig;

  /**
   * Search vault memories programmatically using semantic similarity.
   * Returns structured results sorted by descending similarity.
   * Gracefully returns [] when auth is unavailable.
   *
   * @param query - Natural language search query
   * @param searchOptions - Optional search configuration (limit, minSimilarity, scopes)
   */
  searchVaultMemories: (
    query: string,
    searchOptions?: MemoryVaultSearchOptions
  ) => Promise<VaultSearchResult[]>;

  /**
   * The shared vault embedding cache. Use this to eagerly embed content
   * when saving vault memories (via eagerEmbedContent).
   */
  vaultEmbeddingCache: VaultEmbeddingCache;

  /**
   * Get all vault memories for context injection.
   * Returns non-deleted memories sorted by creation date (newest first).
   * @param options - Optional filtering (scopes to include)
   */
  getVaultMemories: (options?: { scopes?: string[] }) => Promise<StoredVaultMemory[]>;

  /**
   * Create a new vault memory with the given content.
   * @param content - The memory text
   * @param scope - Optional scope (defaults to "private")
   */
  createVaultMemory: (content: string, scope?: string) => Promise<StoredVaultMemory>;

  /**
   * Update an existing vault memory's content.
   * @param scope - Optional new scope for the memory
   * @returns the updated memory, or null if not found
   */
  updateVaultMemory: (
    id: string,
    content: string,
    scope?: string
  ) => Promise<StoredVaultMemory | null>;

  /**
   * Delete a vault memory by its ID (soft delete).
   * @returns true if the memory was found and deleted
   */
  deleteVaultMemory: (id: string) => Promise<boolean>;

  /**
   * Manually flush all queued operations for the current wallet.
   * Operations are encrypted and written to the database.
   * Requires the encryption key to be available.
   */
  flushQueue: () => Promise<FlushResult>;

  /**
   * Clear all queued operations for the current wallet.
   * Discards pending operations without writing them.
   */
  clearQueue: () => void;

  /**
   * Current status of the write queue.
   */
  queueStatus: QueueStatus;
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

export function useChatStorage(options: UseChatStorageOptions): UseChatStorageResult {
  const {
    database,
    conversationId: initialConversationId,
    autoCreateConversation = true,
    defaultConversationTitle = "New Conversation",
    getToken,
    baseUrl,
    onData,
    onThinking,
    onFinish,
    onError,
    onServerToolCall,
    apiType,
    walletAddress,
    signMessage,
    embeddedWalletSigner,
    getWalletAddress,
    enableQueue = true,
    autoFlushOnKeyAvailable = true,
    fileProcessors,
    fileProcessingOptions,
    serverTools: serverToolsConfig,
    autoEmbedMessages = true,
    embeddingModel = DEFAULT_API_EMBEDDING_MODEL,
    minContentLength = DEFAULT_MIN_CONTENT_LENGTH,
    mcpR2Domain = MCP_R2_DOMAIN,
  } = options;

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );

  // Blob URL manager for encrypted file storage
  const blobManagerRef = useRef<BlobUrlManager>(new BlobUrlManager());

  // Clean up blob URLs on unmount
  useEffect(() => {
    const manager = blobManagerRef.current;
    return () => {
      manager.revokeAll();
    };
  }, []);

  // Get collections
  const messagesCollection = useMemo(() => database.get<Message>("history"), [database]);
  const conversationsCollection = useMemo(
    () => database.get<Conversation>("conversations"),
    [database]
  );

  // Storage operations context (includes encryption context when wallet is available)
  const storageCtx = useMemo<StorageOperationsContext>(
    () => ({
      database,
      messagesCollection,
      conversationsCollection,
      walletAddress,
      signMessage,
      embeddedWalletSigner,
    }),
    [
      database,
      messagesCollection,
      conversationsCollection,
      walletAddress,
      signMessage,
      embeddedWalletSigner,
    ]
  );

  // Media operations context (includes encryption context for media field encryption)
  const mediaCtx = useMemo(
    () => ({
      database,
      walletAddress,
      signMessage,
      embeddedWalletSigner,
    }),
    [database, walletAddress, signMessage, embeddedWalletSigner]
  );

  // Memory vault operations context
  const vaultMemoryCollection = useMemo(
    () => database.get<VaultMemory>("memory_vault"),
    [database]
  );
  const vaultCtx = useMemo<VaultMemoryOperationsContext>(
    () => ({
      database,
      vaultMemoryCollection,
      walletAddress,
      signMessage,
      embeddedWalletSigner,
    }),
    [database, vaultMemoryCollection, walletAddress, signMessage, embeddedWalletSigner]
  );

  // ── Queue Management ──

  // Track queue status as React state so UI can react to changes
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    failed: 0,
    isFlushing: false,
    isPaused: false,
  });

  // Refresh queue status from the manager
  const refreshQueueStatus = useCallback(() => {
    if (walletAddress) {
      setQueueStatus(queueManager.getStatus(walletAddress));
    }
  }, [walletAddress]);

  // Operation executor: runs a queued operation against the real database
  const executeQueuedOperation = useCallback(
    async (operation: QueuedOperation, encCtx: QueueEncryptionContext) => {
      const ctx = {
        ...storageCtx,
        walletAddress: encCtx.walletAddress,
        signMessage: encCtx.signMessage,
        embeddedWalletSigner: encCtx.embeddedWalletSigner,
      };

      const mCtx = {
        database: ctx.database,
        walletAddress: encCtx.walletAddress,
        signMessage: encCtx.signMessage,
        embeddedWalletSigner: encCtx.embeddedWalletSigner,
      };

      switch (operation.type) {
        case "createConversation":
          await createConversationOp(
            ctx,
            operation.payload as Parameters<typeof createConversationOp>[1]
          );
          break;
        case "updateConversationTitle":
          await updateConversationTitleOp(
            ctx,
            operation.payload.conversationId,
            operation.payload.title
          );
          break;
        case "createMessage":
          await createMessageOp(ctx, operation.payload as Parameters<typeof createMessageOp>[1]);
          break;
        case "createMediaBatch":
          await createMediaBatchOp(mCtx, operation.payload.mediaOptions);
          break;
        default:
          console.warn(`[QueueManager] Unknown operation type: ${operation.type}`);
      }
    },
    [storageCtx]
  );

  // Flush the queue
  const flushQueue = useCallback(async (): Promise<FlushResult> => {
    if (!walletAddress || !signMessage) {
      return { succeeded: [], failed: [], total: 0 };
    }

    const encCtx: QueueEncryptionContext = {
      walletAddress,
      signMessage,
      embeddedWalletSigner,
    };

    const result = await queueManager.flush(encCtx, executeQueuedOperation);
    refreshQueueStatus();
    return result;
  }, [
    walletAddress,
    signMessage,
    embeddedWalletSigner,
    executeQueuedOperation,
    refreshQueueStatus,
  ]);

  // Clear the queue
  const clearQueue = useCallback(() => {
    if (walletAddress) {
      queueManager.clear(walletAddress);
      refreshQueueStatus();
    }
  }, [walletAddress, refreshQueueStatus]);

  // Subscribe to queue changes for this wallet
  useEffect(() => {
    if (!walletAddress) return;
    refreshQueueStatus();
    return queueManager.onQueueChange(walletAddress, refreshQueueStatus);
  }, [walletAddress, refreshQueueStatus]);

  // Auto-flush when encryption key becomes available
  useEffect(() => {
    if (!walletAddress || !enableQueue || !autoFlushOnKeyAvailable || !signMessage) return;

    return onKeyAvailable(walletAddress, () => {
      // Fire and forget the flush
      flushQueue().catch((err) => {
        console.warn("[useChatStorage] Auto-flush failed:", err);
      });
    });
  }, [walletAddress, enableQueue, autoFlushOnKeyAvailable, signMessage, flushQueue]);

  // Wallet polling for Privy embedded wallet detection
  useEffect(() => {
    if (!getWalletAddress || walletAddress) return; // Already have address, or no poller provided

    const poller = new WalletPoller();
    return poller.startPolling(getWalletAddress, () => {
      // Wallet is now available - the parent component should update walletAddress prop
      // which triggers the onKeyAvailable auto-flush above.
      // We don't need to do anything here since state will flow through props.
    });
  }, [getWalletAddress, walletAddress]);

  // ── Write Queue Wiring ──

  // Check if encryption is ready for direct writes
  const isEncryptionReady = useCallback((): boolean => {
    if (!walletAddress || !signMessage) return true; // No encryption configured
    return hasEncryptionKey(walletAddress); // Key derived and in memory
  }, [walletAddress, signMessage]);

  // Pre-wallet pending buffer: holds operations when walletAddress is undefined
  // but getWalletAddress is provided (signaling encryption intent during Privy init)
  const pendingOpsRef = useRef<
    Array<{
      type: QueuedOperationType;
      payload: Record<string, any>;
      dependencies: string[];
    }>
  >([]);

  // Track synthetic conversation IDs so ensureConversation doesn't fail for queued conversations
  const syntheticConvIdsRef = useRef<Set<string>>(new Set());
  // Track convId -> queueId so message creation can depend on the queued conversation
  const syntheticConvQueueIdsRef = useRef<Map<string, string>>(new Map());

  // Transfer pending ops to QueueManager when walletAddress becomes available
  useEffect(() => {
    if (!walletAddress || !enableQueue) return;
    const pending = pendingOpsRef.current;
    if (pending.length === 0) return;
    for (const op of pending) {
      queueManager.queueOperation(walletAddress, op.type, op.payload, op.dependencies);
    }
    pendingOpsRef.current = [];
    refreshQueueStatus();
  }, [walletAddress, enableQueue, refreshQueueStatus]);

  /**
   * Routes a DB write through the queue when encryption key isn't ready,
   * or executes it directly when the key is available.
   */
  const writeOrQueue = useCallback(
    async <T>(
      opType: QueuedOperationType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: Record<string, any>,
      directWrite: () => Promise<T>,
      makeSynthetic: () => T,
      dependencies: string[] = []
    ): Promise<{ result: T; queued: boolean; queueId?: string }> => {
      // Key available — direct write
      if (isEncryptionReady()) {
        const result = await directWrite();
        return { result, queued: false };
      }

      // Queue disabled — plaintext fallback (existing behavior)
      if (!enableQueue) {
        const result = await directWrite();
        return { result, queued: false };
      }

      // walletAddress undefined but getWalletAddress provided — buffer in ref
      if (!walletAddress && getWalletAddress) {
        pendingOpsRef.current.push({ type: opType, payload, dependencies });
        return { result: makeSynthetic(), queued: true };
      }

      // walletAddress present but key not derived — queue in QueueManager
      if (walletAddress) {
        const queueId = queueManager.queueOperation(walletAddress, opType, payload, dependencies);
        if (queueId === null) {
          // Queue full — fall back to direct write with warning
          console.warn("[useChatStorage] Queue full, falling back to direct write");
          const result = await directWrite();
          return { result, queued: false };
        }
        refreshQueueStatus();
        return { result: makeSynthetic(), queued: true, queueId };
      }

      // No encryption context at all — direct write
      const result = await directWrite();
      return { result, queued: false };
    },
    [isEncryptionReady, enableQueue, walletAddress, getWalletAddress, refreshQueueStatus]
  );

  // Helper to embed a message after creation (non-blocking)
  // Uses chunking for long messages to improve semantic search precision
  const embedMessageAsync = useCallback(
    async (message: StoredMessage) => {
      if (!autoEmbedMessages || !getToken) return;
      // Skip short messages that won't provide useful search context
      if (message.content.length < minContentLength) return;
      try {
        const embeddingOptions = {
          getToken,
          baseUrl,
          model: embeddingModel,
        };

        // Use chunking for long messages
        if (shouldChunkMessage(message.content, DEFAULT_CHUNK_SIZE)) {
          const textChunks = chunkText(message.content);
          const chunkTexts = textChunks.map((c) => c.text);
          const embeddings = await generateEmbeddings(chunkTexts, embeddingOptions);

          const messageChunks: MessageChunk[] = textChunks.map((chunk, i) => ({
            text: chunk.text,
            vector: embeddings[i],
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
          }));

          await updateMessageChunksOp(storageCtx, message.uniqueId, messageChunks, embeddingModel);
        } else {
          // Use whole-message embedding for short messages
          const embedding = await generateEmbedding(message.content, embeddingOptions);
          await updateMessageEmbeddingOp(storageCtx, message.uniqueId, embedding, embeddingModel);
        }
      } catch (err) {
        // Non-fatal: log but don't fail the message save
        console.warn("[useChatStorage] Failed to embed message:", err);
      }
    },
    [autoEmbedMessages, getToken, baseUrl, embeddingModel, storageCtx, minContentLength]
  );

  /**
   * Create a memory retrieval tool pre-configured with hook's context and auth
   */
  const createMemoryRetrievalTool = useCallback(
    (searchOptions?: Partial<MemoryRetrievalSearchOptions>): ToolConfig => {
      if (!getToken) {
        throw new Error("getToken is required for memory retrieval tool");
      }
      return createMemoryRetrievalToolBase(
        storageCtx,
        { getToken, baseUrl, model: embeddingModel },
        searchOptions
      );
    },
    [storageCtx, getToken, baseUrl, embeddingModel]
  );

  /**
   * Create a memory vault tool pre-configured with hook's vault context and encryption
   */
  const createMemoryVaultTool = useCallback(
    (options?: MemoryVaultToolOptions): ToolConfig => {
      const embOpts = getToken ? { getToken, baseUrl, model: embeddingModel } : undefined;
      return createMemoryVaultToolBase(
        vaultCtx,
        options,
        embOpts,
        embOpts ? vaultEmbeddingCacheRef.current : undefined
      );
    },
    [vaultCtx, getToken, baseUrl, embeddingModel]
  );

  /**
   * Get all vault memories (for injecting as context into messages)
   */
  const getVaultMemories = useCallback(
    (options?: { scopes?: string[] }): Promise<StoredVaultMemory[]> => {
      return getAllVaultMemoriesOp(vaultCtx, options);
    },
    [vaultCtx]
  );

  /**
   * Create a new vault memory (for manual creation from UI)
   */
  const createVaultMemory = useCallback(
    async (content: string, scope?: string): Promise<StoredVaultMemory> => {
      const result = await createVaultMemoryOp(vaultCtx, { content, scope });
      if (getToken) {
        eagerEmbedContent(
          content,
          { getToken, baseUrl, model: embeddingModel },
          vaultEmbeddingCacheRef.current
        ).catch(() => {});
      }
      return result;
    },
    [vaultCtx, getToken, baseUrl, embeddingModel]
  );

  /**
   * Update a vault memory's content (for manual editing from UI)
   */
  const updateVaultMemory = useCallback(
    async (id: string, content: string, scope?: string): Promise<StoredVaultMemory | null> => {
      const existing = await getVaultMemoryOp(vaultCtx, id);
      const result = await updateVaultMemoryOp(vaultCtx, id, { content, scope });
      if (result && getToken) {
        if (existing) {
          vaultEmbeddingCacheRef.current.delete(existing.content);
        }
        eagerEmbedContent(
          content,
          { getToken, baseUrl, model: embeddingModel },
          vaultEmbeddingCacheRef.current
        ).catch(() => {});
      }
      return result;
    },
    [vaultCtx, getToken, baseUrl, embeddingModel]
  );

  /**
   * Delete a vault memory by ID (for manual deletion from UI)
   */
  const deleteVaultMemory = useCallback(
    async (id: string): Promise<boolean> => {
      const existing = await getVaultMemoryOp(vaultCtx, id);
      const result = await deleteVaultMemoryOp(vaultCtx, id);
      if (result && existing) {
        vaultEmbeddingCacheRef.current.delete(existing.content);
      }
      return result;
    },
    [vaultCtx]
  );

  /**
   * Shared embedding cache for vault memories.
   * Pre-populated on init so that search only needs to embed the query.
   */
  const vaultEmbeddingCacheRef = useRef<VaultEmbeddingCache>(createVaultEmbeddingCache());

  /**
   * Cache for client tool description embeddings.
   * Maps tool name → embedding vector. Populated lazily on first message
   * and reused across messages (tool descriptions don't change).
   */
  const clientToolEmbeddingsCacheRef = useRef<Map<string, number[]>>(new Map());

  // Pre-embed vault memories on mount
  useEffect(() => {
    if (!getToken) return;
    (async () => {
      try {
        await preEmbedVaultMemories(
          vaultCtx,
          { getToken, baseUrl, model: embeddingModel },
          vaultEmbeddingCacheRef.current
        );
      } catch {
        // Non-critical: embeddings will be generated on first search
      }
    })();
  }, [vaultCtx, getToken, baseUrl, embeddingModel]);

  /**
   * Create a vault search tool pre-configured with hook's context, auth, and cache
   */
  const createMemoryVaultSearchTool = useCallback(
    (searchOptions?: MemoryVaultSearchOptions): ToolConfig => {
      if (!getToken) {
        throw new Error("getToken is required for memory vault search tool");
      }
      return createMemoryVaultSearchToolBase(
        vaultCtx,
        { getToken, baseUrl, model: embeddingModel },
        vaultEmbeddingCacheRef.current,
        searchOptions
      );
    },
    [vaultCtx, getToken, baseUrl, embeddingModel]
  );

  /**
   * Search vault memories programmatically (e.g., for pre-retrieval injection).
   * Returns [] instead of throwing when getToken is null — pre-retrieval should
   * never crash the submit path.
   */
  const searchVaultMemoriesFn = useCallback(
    async (
      query: string,
      searchOptions?: MemoryVaultSearchOptions
    ): Promise<VaultSearchResult[]> => {
      if (!getToken) return [];
      return searchVaultMemoriesBase(
        query,
        vaultCtx,
        { getToken, baseUrl, model: embeddingModel },
        vaultEmbeddingCacheRef.current,
        searchOptions
      );
    },
    [vaultCtx, getToken, baseUrl, embeddingModel]
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
    onThinking,
    onFinish,
    onError,
    onServerToolCall,
    apiType,
  });

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(
    async (opts?: CreateConversationOptions): Promise<StoredConversation> => {
      const { result, queued, queueId } = await writeOrQueue(
        "createConversation",
        { conversationId: opts?.conversationId, title: opts?.title, projectId: opts?.projectId },
        () => createConversationOp(storageCtx, opts, defaultConversationTitle),
        () => makeSyntheticStoredConversation(opts, defaultConversationTitle)
      );
      if (queued) {
        syntheticConvIdsRef.current.add(result.conversationId);
        if (queueId) {
          syntheticConvQueueIdsRef.current.set(result.conversationId, queueId);
        }
      }
      setCurrentConversationId(result.conversationId);
      return result;
    },
    [storageCtx, defaultConversationTitle, writeOrQueue]
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
  const getConversations = useCallback(async (): Promise<StoredConversation[]> => {
    return getConversationsOp(storageCtx);
  }, [storageCtx]);

  /**
   * Update conversation title
   * @returns true if updated, false if conversation not found
   */
  const updateConversationTitle = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      const { result } = await writeOrQueue(
        "updateConversationTitle",
        { conversationId: id, title },
        () => updateConversationTitleOp(storageCtx, id, title),
        () => true
      );
      return result;
    },
    [storageCtx, writeOrQueue]
  );

  /**
   * Soft delete a conversation and cascade delete messages and media
   * @returns true if deleted, false if conversation not found
   */
  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      const deleted = await deleteConversationOp(storageCtx, id);
      if (deleted) {
        // Cascade delete messages
        await clearMessagesOp(storageCtx, id);
        // Cascade delete media for this conversation
        await deleteMediaByConversationOp(mediaCtx, id);
        if (currentConversationId === id) {
          setCurrentConversationId(null);
        }
      }
      return deleted;
    },
    [storageCtx, mediaCtx, currentConversationId]
  );

  /**
   * Get messages for a conversation
   */
  const getMessages = useCallback(
    async (convId: string): Promise<StoredMessage[]> => {
      const messages = await getMessagesOp(storageCtx, convId);

      // If wallet address is provided, resolve file placeholders to blob URLs
      if (walletAddress && hasEncryptionKey(walletAddress) && isOPFSSupported()) {
        try {
          const encryptionKey = await getEncryptionKey(walletAddress);
          const blobManager = blobManagerRef.current;

          // Resolve placeholders in all messages in parallel
          const resolvedMessages = await Promise.all(
            messages.map(async (msg) => {
              // Collect file IDs from both content placeholders and msg.fileIds
              const contentFileIds = [...new Set(extractFileIds(msg.content))];
              const extraFileIds = (msg.fileIds || []).filter((id) => !contentFileIds.includes(id));
              const allFileIds = [...contentFileIds, ...extraFileIds];

              if (allFileIds.length === 0) {
                return msg;
              }

              // Resolve all files to blob URLs and build a map
              const fileIdToUrlMap = new Map<string, string>();
              for (const fileId of allFileIds) {
                let url = blobManager.getUrl(fileId);

                if (!url) {
                  // Read and decrypt the file (try current key, fall back to legacy)
                  let result = await readEncryptedFile(fileId, encryptionKey);
                  if (!result) {
                    try {
                      const legacyKey = await getEncryptionKey(walletAddress, "v2");
                      result = await readEncryptedFile(fileId, legacyKey);
                    } catch {
                      // Legacy key not available or decrypt failed
                    }
                  }
                  if (result) {
                    url = blobManager.createUrl(fileId, result.blob);
                  }
                }

                if (url) {
                  fileIdToUrlMap.set(fileId, url);
                }
              }

              // Replace placeholders in content
              let resolvedContent = msg.content;
              for (const [fileId, url] of fileIdToUrlMap) {
                const placeholder = createFilePlaceholder(fileId);
                const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const placeholderRegex = new RegExp(escapedPlaceholder, "g");
                const replacement = `![image-${fileId}](${url})`;

                resolvedContent = resolvedContent.replace(placeholderRegex, replacement);
              }

              // Append images from msg.fileIds that weren't in content placeholders
              // (messages stored before placeholder support was added)
              for (const fileId of extraFileIds) {
                const url = fileIdToUrlMap.get(fileId);
                if (url) {
                  resolvedContent += `\n\n![image-${fileId}](${url})`;
                }
              }

              return { ...msg, content: resolvedContent };
            })
          );

          return resolvedMessages;
        } catch {
          // Return messages without resolving placeholders
          return messages;
        }
      }

      return messages;
    },
    [storageCtx, walletAddress]
  );

  /**
   * Ensure a conversation exists for the current ID or create a new one
   */
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (currentConversationId) {
      // Trust synthetic conversation IDs — they were queued and will be flushed
      if (syntheticConvIdsRef.current.has(currentConversationId)) {
        return currentConversationId;
      }

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

    throw new Error("No conversation ID provided and autoCreateConversation is disabled");
  }, [currentConversationId, getConversation, autoCreateConversation, createConversation]);

  /**
   * Extracts SearchSource objects from tool call events (e.g., BraveSearchMCP results).
   *
   * Note: Currently only handles BraveSearchMCP tool calls. Other search tools
   * (e.g., PerplexityMCP) would need to be added here if they return structured sources.
   */
  const extractSourcesFromToolCallEvents = useCallback(
    (toolCallEvents?: LlmapiToolCallEvent[]): SearchSource[] => {
      try {
        const extractedSources: SearchSource[] = [];
        const seenUrls = new Set<string>();

        if (toolCallEvents) {
          for (const toolCallEvent of toolCallEvents) {
            const outputStr = toolCallEvent.output || "";

            // BraveSearchMCP returns concatenated JSON objects
            if (toolCallEvent.name?.includes("BraveSearchMCP")) {
              try {
                // Note: Assumes flat JSON objects from BraveSearch output (no nested braces)
                const jsonObjectRegex = /\{[^{}]*"url"[^{}]*\}/g;
                let match: RegExpExecArray | null;

                while ((match = jsonObjectRegex.exec(outputStr)) !== null) {
                  try {
                    const result = JSON.parse(match[0]);
                    if (result.url && !seenUrls.has(result.url)) {
                      seenUrls.add(result.url);
                      // Strip HTML tags and decode entities from description
                      const rawDescription = result.description || "";
                      const cleanDescription = rawDescription
                        .replace(/<[^>]*>/g, "") // Remove HTML tags
                        .replace(/&amp;/g, "&")
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/&quot;/g, '"')
                        .replace(/&#x27;/g, "'")
                        .replace(/&#39;/g, "'")
                        .replace(/&apos;/g, "'")
                        .replace(/&nbsp;/g, " ")
                        .trim();
                      extractedSources.push({
                        title: result.title || undefined,
                        url: result.url,
                        snippet: cleanDescription || undefined,
                      });
                    }
                  } catch {
                    // Ignore individual JSON parse errors
                  }
                }
              } catch {
                // Ignore tool call event parse errors
              }
            }

            // PerplexityMCP returns markdown-formatted text:
            // 1. **Title**
            //    URL: https://...
            //    [description]
            //    Date: YYYY-MM-DD
            if (toolCallEvent.name?.includes("PerplexityMCP")) {
              try {
                // Match each numbered result block
                // Pattern: digit(s). **title**\n   URL: url
                const resultPattern =
                  /(\d+)\.\s+\*\*([^*]+)\*\*\s*\n\s*URL:\s*(https?:\/\/[^\s\n]+)/g;
                let match: RegExpExecArray | null;

                while ((match = resultPattern.exec(outputStr)) !== null) {
                  const title = match[2]?.trim();
                  const url = match[3]?.trim();

                  if (url && !seenUrls.has(url)) {
                    seenUrls.add(url);

                    // Find the snippet - text between URL and next numbered item or Date line
                    const matchEnd = match.index + match[0].length;
                    const nextResultMatch = outputStr.slice(matchEnd).match(/\n\d+\.\s+\*\*/);
                    const dateMatch = outputStr
                      .slice(matchEnd)
                      .match(/\n\s*Date:\s*\d{4}-\d{2}-\d{2}/);

                    let snippetEnd = outputStr.length;
                    if (nextResultMatch?.index !== undefined) {
                      snippetEnd = Math.min(snippetEnd, matchEnd + nextResultMatch.index);
                    }
                    if (dateMatch?.index !== undefined) {
                      snippetEnd = Math.min(snippetEnd, matchEnd + dateMatch.index);
                    }

                    let snippet = outputStr
                      .slice(matchEnd, snippetEnd)
                      .replace(/\{ts:\d+\}/g, "") // Remove timestamps like {ts:123}
                      .replace(/^#{1,6}\s*/gm, "") // Remove markdown headers (anchored to line start)
                      .replace(/\*{1,2}/g, "") // Remove bold/italic markers
                      .replace(/\|[^|\n]+\|/g, "") // Remove table cells
                      .replace(/\n{2,}/g, " ") // Collapse multiple newlines
                      .replace(/\s{2,}/g, " ") // Collapse multiple spaces
                      .trim();

                    // Limit snippet length and add ellipsis if truncated
                    if (snippet.length > 250) {
                      snippet = snippet.slice(0, 250).trim() + "...";
                    }

                    extractedSources.push({
                      title: title || undefined,
                      url,
                      snippet: snippet || undefined,
                    });
                  }
                }
              } catch {
                // Ignore Perplexity parse errors
              }
            }
          }
        }

        return extractedSources;
      } catch {
        return []; // Return empty array if error occurs
      }
    },
    []
  );

  /**
   * Extract dimensions from an image blob.
   */
  const getImageDimensions = useCallback(
    async (blob: Blob): Promise<{ width: number; height: number } | undefined> => {
      if (!blob.type.startsWith("image/")) {
        return undefined;
      }
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        const timeoutId = setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve(undefined);
        }, 10_000);

        img.onload = () => {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(url);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(url);
          resolve(undefined);
        };
        img.src = url;
      });
    },
    []
  );

  /**
   * Extract and store MCP images using encrypted OPFS storage.
   * Creates media records and uses wallet-derived encryption keys.
   *
   * @param content - The message content containing MCP image URLs
   * @param address - Wallet address for encryption and media record ownership
   * @param conversationId - Conversation ID for media record association
   * @param responseModel - AI model that generated the images
   * @returns Object with fileIds (mediaIds) and cleaned content with placeholders
   */
  const extractAndStoreEncryptedMCPImages = useCallback(
    async (
      content: string,
      address: string,
      conversationId: string,
      toolCallEvents?: LlmapiToolCallEvent[]
    ): Promise<{
      fileIds: string[];
      cleanedContent: string;
    }> => {
      try {
        // 1. Extract image URLs using pure function
        const urls = extractMCPImageUrls(content, toolCallEvents, mcpR2Domain);

        // No MCP images found — strip any stale MCP URLs and return
        if (urls.length === 0) {
          const cleanedContent = replaceMCPUrlsWithPlaceholders(content, new Map(), mcpR2Domain);
          return { fileIds: [], cleanedContent };
        }

        // 2. Download images → get mediaIds
        const encryptionKey = await getEncryptionKey(address);
        const mediaOptions: CreateMediaOptions[] = [];
        const urlToMediaIdMap = new Map<string, string>();

        const results = await Promise.allSettled(
          urls.map(async ({ url }) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60_000);

            try {
              const response = await fetch(url, {
                signal: controller.signal,
                cache: "no-store",
              });

              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
              }

              const blob = await response.blob();

              const mediaId = generateMediaId();
              const urlPath = url.split("?")[0] ?? url;
              const extension = urlPath.match(/\.([a-zA-Z0-9]+)$/)?.[1] || "png";
              const mimeType = blob.type || `image/${extension}`;
              const fileName = `mcp-image-${Date.now()}-${mediaId.slice(6, 14)}.${extension}`;

              const dimensions = await getImageDimensions(blob);

              await writeEncryptedFile(mediaId, blob, encryptionKey, {
                name: fileName,
                sourceUrl: url,
              });

              return {
                mediaId,
                fileName,
                mimeType,
                size: blob.size,
                url,
                dimensions,
              };
            } finally {
              clearTimeout(timeoutId);
            }
          })
        );

        // 3. Build urlToMediaId map from successful downloads
        results.forEach((result, i) => {
          const { url, model } = urls[i];

          if (result.status === "fulfilled") {
            const { mediaId, fileName, mimeType, size, dimensions } = result.value;

            urlToMediaIdMap.set(url, mediaId);

            mediaOptions.push({
              mediaId,
              walletAddress: address,
              conversationId,
              name: fileName,
              mimeType,
              mediaType: "image",
              size,
              role: "assistant",
              model,
              sourceUrl: url,
              dimensions,
            });
          } else {
            console.warn(
              "[extractAndStoreEncryptedMCPImages] Failed to download image:",
              url,
              result.reason
            );
          }
        });

        // 4. Replace MCP URLs with __SDKFILE__ placeholders (strips failed downloads)
        const cleanedContent = replaceMCPUrlsWithPlaceholders(
          content,
          urlToMediaIdMap,
          mcpR2Domain
        );

        // 5. Batch create media records
        let createdMediaIds: string[] = [];
        if (mediaOptions.length > 0) {
          try {
            const createdMedia = await createMediaBatchOp(mediaCtx, mediaOptions);
            createdMediaIds = createdMedia.map((m) => m.mediaId);
          } catch (err) {
            console.error(
              "[extractAndStoreEncryptedMCPImages] Failed to create media records:",
              err
            );
            // Clean up orphaned OPFS files since media records weren't created
            for (const opt of mediaOptions) {
              if (opt.mediaId) {
                try {
                  await deleteEncryptedFile(opt.mediaId);
                } catch {
                  // Ignore cleanup errors
                }
              }
            }
            // Return original content to avoid orphaned __SDKFILE__ placeholders
            return { fileIds: [], cleanedContent: content };
          }
        }

        return { fileIds: createdMediaIds, cleanedContent };
      } catch (err) {
        // Preserve URLs as fallback — presigned URLs remain valid for 3 days,
        // so the LLM can still reference them for editing even if OPFS storage fails.
        return { fileIds: [], cleanedContent: content };
      }
    },
    [mediaCtx, getImageDimensions, mcpR2Domain]
  );

  /**
   * Store user-attached files and create media records.
   * - If OPFS is supported with encryption: Store encrypted in OPFS, create media record
   * - If OPFS not available: Create media record with sourceUrl (external URL only, not data URIs)
   *
   * @param files - Array of file metadata with URLs (data URIs or external URLs)
   * @param address - Wallet address for encryption key derivation and media record ownership
   * @param conversationId - Conversation ID for media record association
   * @returns Array of mediaIds for the created media records
   */
  const storeUserFilesInOPFS = useCallback(
    async (files: FileMetadata[], address: string, conversationId: string): Promise<string[]> => {
      const canUseOPFS = isOPFSSupported() && hasEncryptionKey(address);
      let encryptionKey: CryptoKey | undefined;

      if (canUseOPFS) {
        try {
          encryptionKey = await getEncryptionKey(address);
        } catch {
          // Failed to get encryption key - will skip OPFS storage
        }
      }

      const mediaOptions: CreateMediaOptions[] = [];

      for (const file of files) {
        // Skip files without URLs (already stored or metadata-only)
        if (!file.url) {
          continue;
        }

        // Generate a media ID
        const mediaId = generateMediaId();
        const mimeType = file.type || "application/octet-stream";
        let size = file.size || 0;
        let storedInOPFS = false;
        let sourceUrl: string | undefined;
        let dimensions: { width: number; height: number } | undefined;

        // Try to store in OPFS if available
        if (encryptionKey) {
          try {
            let blob: Blob;

            if (file.url.startsWith("data:")) {
              // Convert data URI to Blob
              const response = await fetch(file.url);
              blob = await response.blob();
            } else {
              // Fetch external URL
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 60_000);
              try {
                const response = await fetch(file.url, {
                  signal: controller.signal,
                  cache: "no-store",
                });
                if (!response.ok) {
                  throw new Error(`Failed to fetch: ${response.status}`);
                }
                blob = await response.blob();
              } finally {
                clearTimeout(timeoutId);
              }
            }

            size = blob.size;

            // Extract dimensions for images
            dimensions = await getImageDimensions(blob);

            // Encrypt and store in OPFS using mediaId
            await writeEncryptedFile(mediaId, blob, encryptionKey, {
              name: file.name,
            });

            storedInOPFS = true;
          } catch {
            // Will fall back to sourceUrl below
          }
        }

        // If not stored in OPFS, use sourceUrl (only for external URLs, not data URIs)
        if (!storedInOPFS) {
          sourceUrl = file.url && !file.url.startsWith("data:") ? file.url : undefined;
          // If it's a data URI and we can't store in OPFS, we can't persist the file content
          if (!sourceUrl) {
            continue; // Skip this file - no way to store it
          }
        }

        // Prepare media record
        mediaOptions.push({
          mediaId,
          walletAddress: address,
          conversationId,
          name: file.name,
          mimeType,
          mediaType: getMediaTypeFromMime(mimeType),
          size,
          role: "user",
          sourceUrl,
          dimensions,
        });
      }

      // Batch create media records
      if (mediaOptions.length === 0) {
        return [];
      }

      try {
        const createdMedia = await createMediaBatchOp(mediaCtx, mediaOptions);
        return createdMedia.map((m) => m.mediaId);
      } catch {
        // Clean up orphaned OPFS files since media records weren't created
        for (const opt of mediaOptions) {
          if (opt.mediaId) {
            try {
              await deleteEncryptedFile(opt.mediaId);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
        return [];
      }
    },
    [mediaCtx, getImageDimensions]
  );

  /**
   * Send a message with automatic storage
   */
  const sendMessage = useCallback(
    async (args: SendMessageWithStorageArgs): Promise<SendMessageWithStorageResult> => {
      const {
        messages,
        model,
        skipStorage = false,
        includeHistory = true,
        maxHistoryMessages = 50,
        files,
        onData: perRequestOnData,
        headers,
        memoryContext,
        searchContext,
        thoughtProcess,
        getThoughtProcess,
        // Responses API options
        temperature,
        maxOutputTokens,
        clientTools,
        clientToolsFilter,
        serverTools: serverToolsFilter,
        toolChoice,
        maxToolRounds,
        reasoning,
        thinking,
        onThinking,
        imageModel,
        apiType: requestApiType,
        conversationId: explicitConversationId,
        parentMessageId,
      } = args;

      // Helper to resolve thought process from callback or static value
      const resolveThoughtProcess = (): ActivityPhase[] | undefined =>
        finalizeThoughtProcess(getThoughtProcess?.() || thoughtProcess);

      // Eager key derivation: if wallet is present but key isn't, try to derive it now.
      // This eliminates the queueing path in the common case (embedded wallet signing is silent and fast).
      if (walletAddress && signMessage && !hasEncryptionKey(walletAddress)) {
        try {
          await requestEncryptionKey(walletAddress, signMessage, embeddedWalletSigner);
        } catch {
          // Key derivation failed — writes will be queued via writeOrQueue
        }
      }

      // Fast path for skipStorage - bypass all storage operations
      if (skipStorage) {
        const effectiveApiType = requestApiType ?? apiType ?? "responses";

        // Fetch server tools if needed (still useful for one-off requests)
        let mergedTools: ReturnType<typeof mergeTools> | undefined = undefined;
        let filteredServerTools: ServerTool[] = [];

        // Check if serverTools is a function (dynamic filtering)
        const isServerToolsFunction = typeof serverToolsFilter === "function";
        const needsEmbeddings =
          isServerToolsFunction || !!clientToolsFilter || !!clientTools?.length;

        // Generate embeddings once for both server and client tool filtering
        let skipStorageEmbeddings: number[] | number[][] | null = null;
        if (needsEmbeddings && getToken) {
          const extracted = extractUserMessageFromMessages(messages);
          const messageContent = extracted?.content || "";
          if (messageContent.length >= MIN_CONTENT_LENGTH_FOR_TOOLS) {
            const embeddingOptions = { getToken, baseUrl, model: embeddingModel };
            if (shouldChunkMessage(messageContent, DEFAULT_CHUNK_SIZE)) {
              const textChunks = chunkText(messageContent);
              skipStorageEmbeddings = await generateEmbeddings(
                textChunks.map((c) => c.text),
                embeddingOptions
              );
            } else {
              skipStorageEmbeddings = await generateEmbedding(messageContent, embeddingOptions);
            }
          }
        }

        if (
          getToken &&
          effectiveApiType === "responses" &&
          !(Array.isArray(serverToolsFilter) && serverToolsFilter.length === 0)
        ) {
          try {
            const allServerTools = await getServerTools({
              baseUrl,
              cacheExpirationMs: serverToolsConfig?.cacheExpirationMs,
              getToken,
            });

            if (isServerToolsFunction) {
              if (skipStorageEmbeddings) {
                const toolNames = serverToolsFilter(skipStorageEmbeddings, allServerTools);
                filteredServerTools = filterServerTools(allServerTools, toolNames);
              }
              // If message is too short for embeddings, don't include any server tools
              // (user explicitly provided a filter function for semantic matching)
            } else {
              // Static filtering
              filteredServerTools = filterServerTools(allServerTools, serverToolsFilter);
            }
          } catch {
            // Server tools are optional
          }
        }

        // Filter client tools: use explicit filter if provided, otherwise auto-filter using embeddings
        let filteredClientTools = clientTools;
        if (clientToolsFilter && clientTools?.length) {
          const clientToolNames = clientToolsFilter(skipStorageEmbeddings, clientTools);
          filteredClientTools = clientTools.filter((t: any) => {
            const name = t.function?.name || t.name;
            return clientToolNames.includes(name);
          });
        } else if (clientTools?.length && getToken) {
          // Auto-filter client tools using semantic matching (no explicit filter provided)
          filteredClientTools = await autoFilterClientTools(
            clientTools,
            skipStorageEmbeddings,
            clientToolEmbeddingsCacheRef.current,
            { getToken, baseUrl, model: embeddingModel }
          );
        }

        if (
          filteredServerTools.length > 0 ||
          (filteredClientTools && filteredClientTools.length > 0)
        ) {
          mergedTools = mergeTools(filteredServerTools, filteredClientTools, effectiveApiType);
        }

        const result = await baseSendMessage({
          messages,
          model,
          onData: perRequestOnData,
          onThinking,
          headers,
          memoryContext,
          searchContext,
          temperature,
          maxOutputTokens,
          tools: mergedTools,
          toolChoice,
          maxToolRounds,
          reasoning,
          thinking,
          imageModel,
          apiType: effectiveApiType,
        });

        if (result.error || !result.data) {
          return {
            data: null,
            error: result.error || "Unknown error",
          };
        }

        // Auto-refresh server tools cache if checksum changed
        if (getToken && shouldRefreshTools(result.data.tools_checksum)) {
          getServerTools({ baseUrl, getToken, forceRefresh: true }).catch(() => {});
        }

        return {
          data: result.data,
          error: null,
          skipped: true,
        };
      }

      // Extract user message content for storage
      const extracted = extractUserMessageFromMessages(messages);
      if (!extracted || (!extracted.content && !extracted.files?.length)) {
        return {
          data: null,
          error: "No user message found in messages array",
        };
      }
      const contentForStorage = extracted.content; // Original content for DB storage
      // Use provided files, or fall back to files extracted from the message
      const filesForStorage = files ?? extracted.files;

      // Preprocess files if present to generate file context
      let fileContextForRequest: string | undefined;
      let preprocessedFileIds: string[] = [];
      if (filesForStorage && filesForStorage.length > 0) {
        try {
          const preprocessingResult = await preprocessFiles(filesForStorage, {
            processors: fileProcessors,
            ...fileProcessingOptions,
          });

          // Store extracted content as file context (will be injected as system message)
          if (preprocessingResult.extractedContent) {
            fileContextForRequest = preprocessingResult.extractedContent;
            preprocessedFileIds = preprocessingResult.preprocessedFileIds;
          }
        } catch {
          // Non-fatal error - continue without preprocessing
        }
      }

      // Ensure we have a conversation
      // If an explicit conversationId is provided, use it directly (bypasses state timing issues)
      let convId: string;
      if (explicitConversationId) {
        // Verify the conversation exists
        const existing = await getConversation(explicitConversationId);
        if (existing) {
          convId = explicitConversationId;
        } else {
          return {
            data: null,
            error: `Conversation ${explicitConversationId} not found`,
          };
        }
      } else {
        try {
          convId = await ensureConversation();
        } catch (err) {
          return {
            data: null,
            error: err instanceof Error ? err.message : "Failed to ensure conversation",
          };
        }
      }

      // Build the messages array
      let messagesToSend: LlmapiMessage[] = [];

      // Include history if requested
      if (includeHistory) {
        // Get raw messages from database (not transformed for client display)
        // This ensures we have the original placeholders, not blob URLs
        const storedMessages = await getMessagesOp(storageCtx, convId);
        // Filter out errored messages and limit history to most recent messages
        const validMessages = storedMessages.filter((msg) => !msg.error);
        const limitedMessages = validMessages.slice(-maxHistoryMessages);

        // Collect file context from conversation history if we don't have it from current message
        // Look for the most recent message with extracted file content (stored in thinking field)
        if (!fileContextForRequest) {
          for (let i = limitedMessages.length - 1; i >= 0; i--) {
            const msg = limitedMessages[i];
            if (msg.thinking && msg.thinking.startsWith("[Extracted content from ")) {
              fileContextForRequest = msg.thinking;
              break;
            }
          }
        }

        // Convert stored messages to API format
        // Get encryption key if available for reading user files from OPFS
        let encryptionKey: CryptoKey | undefined;
        if (walletAddress && hasEncryptionKey(walletAddress) && isOPFSSupported()) {
          try {
            encryptionKey = await getEncryptionKey(walletAddress);
          } catch {
            // Failed to get encryption key for history
          }
        }
        // Batch: collect all fileIds across all messages, resolve once
        const allFileIds = limitedMessages.flatMap((msg) => msg.fileIds ?? []);
        let allMedia: StoredMedia[] = [];
        try {
          allMedia = allFileIds.length ? await getMediaByIdsOp(mediaCtx, allFileIds) : [];
        } catch (err) {
          console.warn(
            "[sendMessage] Failed to resolve media for history (image URLs will be missing):",
            err
          );
        }
        const mediaLookup = new Map(allMedia.map((m) => [m.mediaId, m]));
        const resolveMediaByIds = (ids: string[]) =>
          Promise.resolve(ids.map((id) => mediaLookup.get(id)).filter(Boolean) as StoredMedia[]);
        const historyMessages = await Promise.all(
          limitedMessages.map((msg) => storedToLlmapiMessage(msg, encryptionKey, resolveMediaByIds))
        );
        messagesToSend = [...historyMessages, ...messages];
      } else {
        // Use provided messages directly
        messagesToSend = [...messages];
      }

      // If we have file context, remove file attachments from the user message to avoid sending large base64 data
      if (fileContextForRequest) {
        // Find the last user message in messagesToSend
        let lastUserMessageIndex = -1;
        for (let i = messagesToSend.length - 1; i >= 0; i--) {
          if (messagesToSend[i].role === "user") {
            lastUserMessageIndex = i;
            break;
          }
        }

        if (lastUserMessageIndex !== -1) {
          const lastUserMessage = messagesToSend[lastUserMessageIndex];
          if (lastUserMessage.content && Array.isArray(lastUserMessage.content)) {
            // Remove only the files that were actually preprocessed
            // Keep images and other files that weren't processed (e.g., for vision)
            messagesToSend[lastUserMessageIndex] = {
              ...lastUserMessage,
              content: lastUserMessage.content.filter((part) => {
                // Keep text parts
                if (part.type === "text") return true;

                // For input_file parts, check if this specific file was preprocessed
                if (part.type === "input_file" && part.file) {
                  const fileId = part.file.file_id;
                  return !fileId || !preprocessedFileIds.includes(fileId);
                }

                // For image_url parts, check if the URL matches a preprocessed file
                if (part.type === "image_url" && part.image_url?.url) {
                  // Only remove if this specific image was preprocessed
                  // Images without matching IDs are kept for vision
                  const matchesPreprocessed = filesForStorage?.some(
                    (f) => preprocessedFileIds.includes(f.id) && f.url === part.image_url?.url
                  );
                  return !matchesPreprocessed;
                }

                // Keep all other content types
                return true;
              }),
            };
          }
        }
      }

      // Store the user message
      // If wallet address is available and encryption is ready, store files in media table and OPFS
      // Skip file/media storage when encryption key isn't ready (queue window is 1-3s during signup)
      let userFileIds: string[] = [];
      if (filesForStorage && filesForStorage.length > 0 && walletAddress && isEncryptionReady()) {
        // Store files and create media records
        userFileIds = await storeUserFilesInOPFS(filesForStorage, walletAddress, convId);
      }

      const userMsgOpts: CreateMessageOptions = {
        conversationId: convId,
        role: "user",
        content: contentForStorage,
        fileIds: userFileIds.length > 0 ? userFileIds : undefined,
        model,
        // Store extracted file content in thinking field for retrieval in follow-up messages
        thinking: fileContextForRequest,
        parentMessageId,
      };

      let storedUserMessage: StoredMessage;
      let userMsgQueueId: string | undefined;
      try {
        const userMsgResult = await writeOrQueue(
          "createMessage",
          userMsgOpts,
          () => createMessageOp(storageCtx, userMsgOpts),
          () => makeSyntheticStoredMessage(userMsgOpts),
          // Depend on queued conversation if applicable
          convId && syntheticConvQueueIdsRef.current.has(convId)
            ? [syntheticConvQueueIdsRef.current.get(convId)!]
            : []
        );
        storedUserMessage = userMsgResult.result;
        userMsgQueueId = userMsgResult.queueId;
      } catch (err) {
        // Clean up OPFS files if message creation failed to avoid orphaned files
        if (userFileIds.length > 0) {
          for (const mediaId of userFileIds) {
            try {
              await deleteEncryptedFile(mediaId);
              await hardDeleteMediaOp(mediaCtx, mediaId);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
        return {
          data: null,
          error: err instanceof Error ? err.message : "Failed to store user message",
        };
      }

      // Update media records with the messageId now that we have it (only for direct writes)
      if (userFileIds.length > 0 && !userMsgQueueId) {
        try {
          await updateMediaMessageIdBatchOp(mediaCtx, userFileIds, storedUserMessage.uniqueId);
        } catch {
          // Non-fatal - continue without updating messageId
        }
      }

      // Track response timing
      const startTime = Date.now();

      // Determine effective API type for this request
      const effectiveApiType = requestApiType ?? apiType ?? "responses";

      // Fetch and merge server-side tools with client tools
      let mergedTools: ReturnType<typeof mergeTools> | undefined = undefined;
      let filteredServerTools: ServerTool[] = [];

      // Track embeddings generated for tool filtering (to reuse for message storage)
      let userMessageEmbeddings: number[] | number[][] | undefined;

      // Check if serverTools is a function (dynamic filtering)
      const isServerToolsFunction = typeof serverToolsFilter === "function";
      const needsEmbeddings =
        isServerToolsFunction || !!clientToolsFilter || !!clientTools?.length;

      // Generate embeddings once for both server and client tool filtering
      if (needsEmbeddings && getToken) {
        try {
          const embeddingOptions = { getToken, baseUrl, model: embeddingModel };
          if (shouldChunkMessage(contentForStorage, DEFAULT_CHUNK_SIZE)) {
            const textChunks = chunkText(contentForStorage);
            const chunkTexts = textChunks.map((c) => c.text);
            userMessageEmbeddings = await generateEmbeddings(chunkTexts, embeddingOptions);
          } else if (contentForStorage.length >= MIN_CONTENT_LENGTH_FOR_TOOLS) {
            userMessageEmbeddings = await generateEmbedding(contentForStorage, embeddingOptions);
          }
        } catch {
          // Embedding generation failed — continue without semantic filtering
        }
      }

      // Skip server tools fetch if serverTools is explicitly empty array
      if (getToken && !(Array.isArray(serverToolsFilter) && serverToolsFilter.length === 0)) {
        try {
          const allServerTools = await getServerTools({
            baseUrl,
            cacheExpirationMs: serverToolsConfig?.cacheExpirationMs,
            getToken,
          });

          if (isServerToolsFunction) {
            // Call the filter function with embeddings and all tools
            if (userMessageEmbeddings) {
              const toolNames = serverToolsFilter(userMessageEmbeddings, allServerTools);
              filteredServerTools = filterServerTools(allServerTools, toolNames);
            }
            // If message is too short for embeddings, don't include any server tools
            // (user explicitly provided a filter, so sending all tools defeats the purpose)
          } else {
            // Static filtering: use string array directly
            filteredServerTools = filterServerTools(allServerTools, serverToolsFilter);
          }
        } catch {
          // Server tools are optional - continue without them
        }
      }

      // Filter client tools: use explicit filter if provided, otherwise auto-filter using embeddings
      let filteredClientTools = clientTools;
      if (clientToolsFilter && clientTools?.length) {
        const clientToolNames = clientToolsFilter(userMessageEmbeddings ?? null, clientTools);
        filteredClientTools = clientTools.filter((t: any) => {
          const name = t.function?.name || t.name;
          return clientToolNames.includes(name);
        });
      } else if (clientTools?.length && getToken) {
        // Auto-filter client tools using semantic matching (no explicit filter provided)
        filteredClientTools = await autoFilterClientTools(
          clientTools,
          userMessageEmbeddings ?? null,
          clientToolEmbeddingsCacheRef.current,
          { getToken, baseUrl, model: embeddingModel }
        );
      }

      // Embed user message (skip for queued messages — embeddings can't be stored on synthetic IDs)
      if (!userMsgQueueId) {
        if (userMessageEmbeddings && autoEmbedMessages) {
          // Reuse embeddings from tool filtering
          if (Array.isArray(userMessageEmbeddings[0])) {
            // Chunked embeddings
            const textChunks = chunkText(contentForStorage);
            const messageChunks: MessageChunk[] = textChunks.map((chunk, i) => ({
              text: chunk.text,
              vector: (userMessageEmbeddings as number[][])[i],
              startOffset: chunk.startOffset,
              endOffset: chunk.endOffset,
            }));
            updateMessageChunksOp(
              storageCtx,
              storedUserMessage.uniqueId,
              messageChunks,
              embeddingModel
            ).catch(() => {
              // Non-fatal
            });
          } else {
            // Single embedding
            updateMessageEmbeddingOp(
              storageCtx,
              storedUserMessage.uniqueId,
              userMessageEmbeddings as number[],
              embeddingModel
            ).catch(() => {
              // Non-fatal
            });
          }
        } else {
          // No embedding to reuse - use async embedding
          // (embedMessageAsync has guards for autoEmbedMessages and minContentLength)
          embedMessageAsync(storedUserMessage);
        }
      }

      // Merge and format tools (handles both server and client tools)
      if (
        filteredServerTools.length > 0 ||
        (filteredClientTools && filteredClientTools.length > 0)
      ) {
        mergedTools = mergeTools(filteredServerTools, filteredClientTools, effectiveApiType);
      }

      // Send the message using the underlying useChat
      const result = await baseSendMessage({
        messages: messagesToSend,
        model,
        onData: perRequestOnData,
        headers,
        memoryContext,
        searchContext,
        fileContext: fileContextForRequest,
        // Responses API options
        temperature,
        maxOutputTokens,
        tools: mergedTools,
        toolChoice,
        maxToolRounds,
        reasoning,
        thinking,
        imageModel,
        onThinking,
        apiType: requestApiType,
      });

      const responseDuration = (Date.now() - startTime) / 1000;

      if (result.error || !result.data) {
        // If aborted, store the message with wasStopped=true (even without partial data)
        const abortedResult = result as {
          data: ApiResponse | null;
          error: string;
        };

        if (abortedResult.error === "Request aborted") {
          // Extract content if we have partial data, otherwise empty string
          let assistantContent = "";
          let abortedThinkingContent: string | undefined;

          if (abortedResult.data && "output" in abortedResult.data && abortedResult.data.output) {
            type OutputItem = { type?: string; content?: Array<{ text?: string }> };
            // Find the message output item (type: "message") for main content
            const messageOutput = (abortedResult.data.output as OutputItem[]).find(
              (item) => item.type === "message"
            );
            assistantContent =
              messageOutput?.content?.map((part) => part.text || "").join("") || "";

            // Find the reasoning output item (type: "reasoning") for thinking content
            const reasoningOutput = (abortedResult.data.output as OutputItem[]).find(
              (item) => item.type === "reasoning"
            );
            abortedThinkingContent =
              reasoningOutput?.content?.map((part) => part.text || "").join("") || undefined;
          }

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
              thoughtProcess: resolveThoughtProcess(),
              thinking: abortedThinkingContent,
              parentMessageId: storedUserMessage.uniqueId,
            });

            // Embed assistant message (non-blocking)
            embedMessageAsync(storedAssistantMessage);

            // Build a valid response for the return (even if original was null)
            const responseData: ApiResponse = abortedResult.data || {
              id: `aborted-${Date.now()}`,
              model: responseModel,
              object: "response",
              output: [
                {
                  type: "message",
                  role: "assistant",
                  content: [{ type: "output_text", text: assistantContent }],
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
          await updateMessageErrorOp(storageCtx, storedUserMessage.uniqueId, errorMessage);
          await createMessageOp(storageCtx, {
            conversationId: convId,
            role: "assistant",
            content: "",
            model: model || "",
            responseDuration,
            thoughtProcess: resolveThoughtProcess(),
            error: errorMessage,
            parentMessageId: storedUserMessage.uniqueId,
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

      // Extract assistant response content and thinking/reasoning
      // Handle both Responses API (output[]) and Completions API (choices[]) formats
      const responseData = result.data;
      let assistantContent = "";
      let thinkingContent: string | undefined;

      if ("output" in responseData && responseData.output) {
        // Responses API format
        type OutputItem = { type?: string; content?: Array<{ text?: string }> };
        const messageOutput = (responseData.output as OutputItem[]).find(
          (item) => item.type === "message"
        );
        assistantContent = messageOutput?.content?.map((part) => part.text || "").join("") || "";

        const reasoningOutput = (responseData.output as OutputItem[]).find(
          (item) => item.type === "reasoning"
        );
        thinkingContent =
          reasoningOutput?.content?.map((part) => part.text || "").join("") || undefined;
      } else if ("choices" in responseData && responseData.choices) {
        // Completions API format
        const completionsData = responseData;
        const choice = completionsData.choices?.[0];
        const message = choice?.message;
        if (message?.content) {
          // Content can be string or array
          if (Array.isArray(message.content)) {
            assistantContent = message.content
              .map((part: { text?: string }) => part.text || "")
              .join("");
          } else {
            assistantContent = String(message.content);
          }
        }
      }

      // Extract sources from tool_call_events (e.g., search results from MCP tools)
      // Filter out MCP image URLs from sources (they are handled separately as files)
      const extractedSources = extractSourcesFromToolCallEvents(
        responseData.tool_call_events
      ).filter((source: SearchSource) => !source.url?.includes(mcpR2Domain));

      // Clean up extra newlines left after stripping
      let cleanedContent = assistantContent.replace(/\n{3,}/g, "\n\n");

      // Extract and store MCP images using encrypted OPFS with media records
      // Skip file/media storage when encryption key isn't ready (queue window is 1-3s during signup)
      let assistantFileIds: string[] = [];

      if (walletAddress && isEncryptionReady()) {
        const result = await extractAndStoreEncryptedMCPImages(
          cleanedContent,
          walletAddress,
          convId,
          responseData.tool_call_events
        );
        assistantFileIds = result.fileIds;
        cleanedContent = result.cleanedContent;
      }
      // When encryption isn't ready, leave R2 URLs in content.
      // They remain valid for 3 days (presigned) and let the LLM
      // reference images for editing. No permanent data loss.

      // Store auto-executed tool results (e.g. display_chart) as a user message
      // so they persist across page refreshes and can be rendered by the app.
      const autoToolResults = (result as any).autoExecutedToolResults as
        | { name: string; result: any }[]
        | undefined;
      if (autoToolResults && autoToolResults.length > 0) {
        const toolSummary = autoToolResults
          .map((r) => `Tool "${r.name}" returned: ${JSON.stringify(r.result)}`)
          .join("\n\n");
        const toolResultContent = `[Tool Execution Results]\n\n${toolSummary}\n\nBased on these results, continue with the task.`;
        try {
          await writeOrQueue(
            "createMessage",
            {
              conversationId: convId,
              role: "user",
              content: toolResultContent,
              model: "",
              parentMessageId: storedUserMessage.uniqueId,
            },
            () =>
              createMessageOp(storageCtx, {
                conversationId: convId,
                role: "user",
                content: toolResultContent,
                model: "",
                parentMessageId: storedUserMessage.uniqueId,
              }),
            () =>
              makeSyntheticStoredMessage({
                conversationId: convId,
                role: "user",
                content: toolResultContent,
                model: "",
                parentMessageId: storedUserMessage.uniqueId,
              }),
            userMsgQueueId ? [userMsgQueueId] : []
          );
        } catch {
          // Non-critical — the tool result will still be available in memory
        }
      }

      // Store the assistant message
      const assistantMsgOpts: CreateMessageOptions = {
        conversationId: convId,
        role: "assistant",
        content: cleanedContent,
        model: responseData.model || model,
        fileIds: assistantFileIds.length > 0 ? assistantFileIds : undefined,
        usage: convertUsageToStored(responseData.usage),
        responseDuration,
        sources: extractedSources,
        thoughtProcess: resolveThoughtProcess(),
        thinking: thinkingContent,
        // Note: when queued (encryption key not ready), storedUserMessage.uniqueId is a
        // synthetic "queued_*" ID. The real DB ID is assigned on flush, but this reference
        // isn't updated. The client-side mergeParentMessageIds handles this on reload.
        parentMessageId: storedUserMessage.uniqueId,
      };

      let storedAssistantMessage: StoredMessage;
      try {
        const assistantMsgResult = await writeOrQueue(
          "createMessage",
          assistantMsgOpts,
          () => createMessageOp(storageCtx, assistantMsgOpts),
          () => makeSyntheticStoredMessage(assistantMsgOpts),
          userMsgQueueId ? [userMsgQueueId] : []
        );
        storedAssistantMessage = assistantMsgResult.result;

        // Embed assistant message (non-blocking, only for direct writes)
        if (!assistantMsgResult.queued) {
          embedMessageAsync(storedAssistantMessage);
        }
      } catch (err) {
        // Clean up OPFS files and media records if message creation failed
        if (assistantFileIds.length > 0) {
          for (const mediaId of assistantFileIds) {
            try {
              await deleteEncryptedFile(mediaId);
              await hardDeleteMediaOp(mediaCtx, mediaId);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
        return {
          data: null,
          error: err instanceof Error ? err.message : "Failed to store assistant message",
          userMessage: storedUserMessage,
        };
      }

      // Update assistant media records with the messageId now that we have it (only for direct writes)
      if (assistantFileIds.length > 0 && !userMsgQueueId) {
        try {
          await updateMediaMessageIdBatchOp(
            mediaCtx,
            assistantFileIds,
            storedAssistantMessage.uniqueId
          );
        } catch {
          // Non-fatal - continue without updating messageId
        }
      }

      // Auto-refresh server tools cache if checksum changed
      if (getToken && shouldRefreshTools(responseData.tools_checksum)) {
        getServerTools({ baseUrl, getToken, forceRefresh: true }).catch(() => {});
      }

      return {
        data: responseData,
        error: null,
        userMessage: storedUserMessage,
        assistantMessage: storedAssistantMessage,
        autoExecutedToolResults: (result as any).autoExecutedToolResults,
      };
    },
    [
      ensureConversation,
      getMessages,
      storageCtx,
      baseSendMessage,
      walletAddress,
      signMessage,
      embeddedWalletSigner,
      extractAndStoreEncryptedMCPImages,
      mcpR2Domain,
      embedMessageAsync,
      isEncryptionReady,
      enableQueue,
      getWalletAddress,
      refreshQueueStatus,
    ]
  );

  /**
   * Get all files from all conversations, sorted by creation date (newest first).
   * Returns files with conversation context for building file browser UIs.
   */
  const getAllFiles = useCallback(
    async (options?: {
      conversationId?: string;
      limit?: number;
    }): Promise<StoredFileWithContext[]> => {
      return getAllFilesOp(storageCtx, options);
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
    getAllFiles,
    createMemoryRetrievalTool,
    createMemoryVaultTool,
    createMemoryVaultSearchTool,
    searchVaultMemories: searchVaultMemoriesFn,
    vaultEmbeddingCache: vaultEmbeddingCacheRef.current,
    getVaultMemories,
    createVaultMemory,
    updateVaultMemory,
    deleteVaultMemory,
    flushQueue,
    clearQueue,
    queueStatus,
  };
}
