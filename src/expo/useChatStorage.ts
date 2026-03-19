"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LlmapiMessage, LlmapiResponseResponse } from "../client";
import {
  cleanupConversationSummary,
  DEFAULT_SUMMARY_MIN_WINDOW_MESSAGES,
  DEFAULT_SUMMARY_MODEL,
  DEFAULT_SUMMARY_TOKEN_THRESHOLD,
  maybeSummarizeHistory,
} from "../lib/chat/summarize";
import { type ApiType, resolveApiType } from "../lib/chat/useChat";
import type { ToolConfig } from "../lib/chat/useChat/types";
import {
  type BaseSendMessageWithStorageArgs,
  type BaseSendMessageWithStorageResult,
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
  finalizeThoughtProcess,
  getConversationOp,
  getConversationsOp,
  getMessagesOp,
  makeSyntheticStoredConversation,
  makeSyntheticStoredMessage,
  Message,
  type SearchSource,
  type StorageOperationsContext,
  type StoredConversation,
  type StoredMessage,
  updateConversationTitleOp,
  updateMessageErrorOp,
} from "../lib/db/chat";
import { updateMessageEmbeddingOp } from "../lib/db/chat";
import { createMediaBatchOp, deleteMediaByConversationOp } from "../lib/db/media";
import {
  deleteVaultMemoryOp,
  getAllVaultMemoriesOp,
  type StoredVaultMemory,
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
  createMemoryEngineTool as createMemoryEngineToolBase,
  DEFAULT_MIN_CONTENT_LENGTH,
  generateEmbedding,
  type MemoryEngineSearchOptions,
} from "../lib/memoryEngine";
import { DEFAULT_API_EMBEDDING_MODEL } from "../lib/memoryEngine/constants";
import {
  createMemoryVaultTool as createMemoryVaultToolBase,
  type MemoryVaultToolOptions,
} from "../lib/memoryVault";
import { getLogger } from "../lib/logger";
import { filterServerTools, getServerTools, mergeTools, type ServerTool } from "../lib/tools";
import type { EmbeddedWalletSignerFn, SignMessageFn } from "../react/useEncryption";
import { hasEncryptionKey, onKeyAvailable, requestEncryptionKey } from "../react/useEncryption";
import { useChat } from "./useChat";

/** Image tool names recognized by the MCP image pipeline. */
const IMAGE_TOOL_NAMES = new Set([
  "AnumaImageMCP_generate_cloud_image",
  "AnumaImageMCP_edit_cloud_image",
  "AnumaImageMCP-generate_cloud_image",
  "AnumaImageMCP-edit_cloud_image",
  "generate_cloud_image",
  "edit_cloud_image",
]);

/**
 * Extract the image generation model name from tool_call_events.
 * The MCP image tool returns `{ model, url }` in its JSON output.
 */
function extractImageModelFromToolEvents(
  toolCallEvents: Array<{ name?: string; output?: string }> | undefined
): string | undefined {
  if (!toolCallEvents) return undefined;
  for (const event of toolCallEvents) {
    if (event.name && IMAGE_TOOL_NAMES.has(event.name) && event.output) {
      try {
        const output = JSON.parse(event.output);
        if (output.model) return output.model as string;
      } catch {
        // Malformed JSON — skip
      }
    }
  }
  return undefined;
}

/**
 * Convert StoredMessage to LlmapiMessage format.
 * Only adds image_url parts for non-assistant messages.
 * ai-portal doesn't support image_url in assistant messages for /chat/completions.
 */
function storedToLlmapiMessage(stored: StoredMessage): LlmapiMessage {
  const content: LlmapiMessage["content"] = [{ type: "text", text: stored.content }];

  // Add file image parts if present (only for non-assistant messages)
  // ai-portal doesn't support image_url in assistant messages for /chat/completions
  if (stored.role !== "assistant" && stored.files?.length) {
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
 * Options for useChatStorage hook (Expo version)
 *
 * Uses the base options without React-specific features (no local chat, no tools).
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
   * Wallet address for field-level encryption.
   * When provided with signMessage, all sensitive content is encrypted at rest.
   */
  walletAddress?: string;

  /**
   * Function to sign a message for encryption key derivation.
   */
  signMessage?: SignMessageFn;

  /**
   * Function for silent signing with Privy embedded wallets.
   */
  embeddedWalletSigner?: EmbeddedWalletSignerFn;

  /**
   * Async function to poll for wallet address during Privy initialization.
   */
  getWalletAddress?: () => Promise<string | null>;

  /**
   * Enable the in-memory write queue. @default true
   */
  enableQueue?: boolean;

  /**
   * Auto-flush queued operations when key becomes available. @default true
   */
  autoFlushOnKeyAvailable?: boolean;
}

/**
 * Arguments for sendMessage with storage (Expo version)
 *
 * Uses the base arguments without React-specific features (no runTools, no headers).

 */
export type SendMessageWithStorageArgs = BaseSendMessageWithStorageArgs & {
  /**
   * Override the API type for this request only.
   * Useful when different models need different APIs.
   * @default Uses the hook-level apiType or "responses"
   */
  apiType?: ApiType;
};

/**
 * Result from sendMessage with storage (Expo version)
 *
 * Uses the base result without tool execution information.
 */
export type SendMessageWithStorageResult = BaseSendMessageWithStorageResult;

/**
 * Result returned by useChatStorage hook (Expo version)
 *
 * Extends base result with Expo-specific sendMessage signature.
 */
export interface UseChatStorageResult extends BaseUseChatStorageResult {
  /** Send a message and automatically store it (Expo version) */
  sendMessage: (args: SendMessageWithStorageArgs) => Promise<SendMessageWithStorageResult>;
  /**
   * Create a memory engine tool for LLM to search past conversations.
   * The tool is pre-configured with the hook's storage context and auth.
   *
   * @param searchOptions - Optional search configuration (limit, minSimilarity, etc.)
   * @returns A ToolConfig that can be passed to sendMessage's clientTools
   *
   * @example
   * ```ts
   * const memoryTool = createMemoryEngineTool({ limit: 5 });
   * await sendMessage({
   *   messages: [...],
   *   clientTools: [memoryTool],
   * });
   * ```
   */
  createMemoryEngineTool: (searchOptions?: Partial<MemoryEngineSearchOptions>) => ToolConfig;

  /** Create a memory vault tool pre-configured with hook's vault context and encryption. */
  createMemoryVaultTool: (options?: MemoryVaultToolOptions) => ToolConfig;

  /** Get all vault memories for context injection. */
  getVaultMemories: (options?: { scopes?: string[] }) => Promise<StoredVaultMemory[]>;

  /** Delete a vault memory by its ID (soft delete). */
  deleteVaultMemory: (id: string) => Promise<boolean>;

  /** Manually flush all queued operations for the current wallet. */
  flushQueue: () => Promise<FlushResult>;

  /** Clear all queued operations without writing them. */
  clearQueue: () => void;

  /** Current status of the write queue. */
  queueStatus: QueueStatus;
}

/**
 * A React hook that wraps useChat with automatic message persistence using WatermelonDB.
 *
 * **Expo/React Native version** - This is a lightweight version that only supports
 * API-based chat completions. Local chat and client-side tools are not available.
 *
 * @param options - Configuration options
 * @returns An object containing chat state, methods, and storage operations
 *
 * @example
 * ```tsx
 * import { Database } from '@nozbe/watermelondb';
 * import { useChatStorage } from '@anuma/sdk/expo';
 *
 * function ChatScreen({ database }: { database: Database }) {
 *   const {
 *     isLoading,
 *     sendMessage,
 *     conversationId,
 *     getMessages,
 *   } = useChatStorage({
 *     database,
 *     getToken: async () => getAuthToken(),
 *     onData: (chunk) => setResponse((prev) => prev + chunk),
 *   });
 *
 *   const handleSend = async () => {
 *     const result = await sendMessage({
 *       content: 'Hello!',
 *       model: 'gpt-4o-mini',
 *       includeHistory: true,
 *     });
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleSend} disabled={isLoading} title="Send" />
 *     </View>
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
    apiType,
    walletAddress,
    signMessage,
    embeddedWalletSigner,
    getWalletAddress,
    enableQueue = true,
    autoFlushOnKeyAvailable = true,
    serverTools: serverToolsConfig,
    autoEmbedMessages = true,
    embeddingModel = DEFAULT_API_EMBEDDING_MODEL,
    minContentLength = DEFAULT_MIN_CONTENT_LENGTH,
  } = options;

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );

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

  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    failed: 0,
    isFlushing: false,
    isPaused: false,
  });

  const refreshQueueStatus = useCallback(() => {
    if (walletAddress) {
      setQueueStatus(queueManager.getStatus(walletAddress));
    }
  }, [walletAddress]);

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
          getLogger().warn(`[QueueManager] Unknown operation type: ${operation.type}`);
      }
    },
    [storageCtx]
  );

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

  const clearQueue = useCallback(() => {
    if (walletAddress) {
      queueManager.clear(walletAddress);
      refreshQueueStatus();
    }
  }, [walletAddress, refreshQueueStatus]);

  // Subscribe to queue changes
  useEffect(() => {
    if (!walletAddress) return;
    refreshQueueStatus();
    return queueManager.onQueueChange(walletAddress, refreshQueueStatus);
  }, [walletAddress, refreshQueueStatus]);

  // Auto-flush when encryption key becomes available
  useEffect(() => {
    if (!walletAddress || !enableQueue || !autoFlushOnKeyAvailable || !signMessage) return;
    return onKeyAvailable(walletAddress, () => {
      flushQueue().catch((err) => {
        getLogger().warn("[useChatStorage] Auto-flush failed:", err);
      });
    });
  }, [walletAddress, enableQueue, autoFlushOnKeyAvailable, signMessage, flushQueue]);

  // Wallet polling for Privy embedded wallet detection
  useEffect(() => {
    if (!getWalletAddress || walletAddress) return;
    const poller = new WalletPoller();
    return poller.startPolling(getWalletAddress, () => {
      // Wallet available - parent should update walletAddress prop
    });
  }, [getWalletAddress, walletAddress]);

  // ── Write Queue Wiring ──

  const isEncryptionReady = useCallback((): boolean => {
    if (!walletAddress || !signMessage) return true;
    return hasEncryptionKey(walletAddress);
  }, [walletAddress, signMessage]);

  const pendingOpsRef = useRef<
    Array<{
      type: QueuedOperationType;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: Record<string, any>;
      dependencies: string[];
    }>
  >([]);

  const syntheticConvIdsRef = useRef<Set<string>>(new Set());

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

  const writeOrQueue = useCallback(
    async <T>(
      opType: QueuedOperationType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: Record<string, any>,
      directWrite: () => Promise<T>,
      makeSynthetic: () => T,
      dependencies: string[] = []
    ): Promise<{ result: T; queued: boolean; queueId?: string }> => {
      if (isEncryptionReady()) {
        const result = await directWrite();
        return { result, queued: false };
      }
      if (!enableQueue) {
        const result = await directWrite();
        return { result, queued: false };
      }
      if (!walletAddress && getWalletAddress) {
        pendingOpsRef.current.push({ type: opType, payload, dependencies });
        return { result: makeSynthetic(), queued: true };
      }
      if (walletAddress) {
        const queueId = queueManager.queueOperation(walletAddress, opType, payload, dependencies);
        if (queueId === null) {
          getLogger().warn("[useChatStorage] Queue full, falling back to direct write");
          const result = await directWrite();
          return { result, queued: false };
        }
        refreshQueueStatus();
        return { result: makeSynthetic(), queued: true, queueId };
      }
      const result = await directWrite();
      return { result, queued: false };
    },
    [isEncryptionReady, enableQueue, walletAddress, getWalletAddress, refreshQueueStatus]
  );

  /**
   * Embed a message asynchronously (fire and forget)
   * Does not block the main flow or throw errors
   */
  const embedMessageAsync = useCallback(
    async (message: StoredMessage) => {
      if (!autoEmbedMessages || !getToken) return;
      // Skip short messages that won't provide useful search context
      if (message.content.length < minContentLength) return;
      try {
        const embedding = await generateEmbedding(message.content, {
          getToken,
          baseUrl,
          model: embeddingModel,
        });
        await updateMessageEmbeddingOp(storageCtx, message.uniqueId, embedding, embeddingModel);
      } catch (err) {
        // Log but don't block - embedding is optional
        getLogger().warn("[useChatStorage] Failed to embed message:", err);
      }
    },
    [autoEmbedMessages, getToken, baseUrl, embeddingModel, storageCtx, minContentLength]
  );

  /**
   * Create a memory engine tool pre-configured with hook's context and auth
   */
  const createMemoryEngineTool = useCallback(
    (searchOptions?: Partial<MemoryEngineSearchOptions>): ToolConfig => {
      if (!getToken) {
        throw new Error("getToken is required for memory engine tool");
      }
      return createMemoryEngineToolBase(
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
      return createMemoryVaultToolBase(vaultCtx, options);
    },
    [vaultCtx]
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
   * Delete a vault memory by ID (for manual deletion from UI)
   */
  const deleteVaultMemory = useCallback(
    (id: string): Promise<boolean> => {
      return deleteVaultMemoryOp(vaultCtx, id);
    },
    [vaultCtx]
  );

  // Use the underlying useChat hook (Expo version - no tools, no local chat)
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
    apiType,
  });

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(
    async (opts?: CreateConversationOptions): Promise<StoredConversation> => {
      const { result, queued } = await writeOrQueue(
        "createConversation",
        { conversationId: opts?.conversationId, title: opts?.title, projectId: opts?.projectId },
        () => createConversationOp(storageCtx, opts, defaultConversationTitle),
        () => makeSyntheticStoredConversation(opts, defaultConversationTitle)
      );
      if (queued) {
        syntheticConvIdsRef.current.add(result.conversationId);
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
        await deleteMediaByConversationOp(
          { database: storageCtx.database, walletAddress, signMessage, embeddedWalletSigner },
          id
        );
        // Cascade delete conversation summary cache
        await cleanupConversationSummary(storageCtx.database, id);
        if (currentConversationId === id) {
          setCurrentConversationId(null);
        }
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
   * Extracts sources from assistant message content and returns them as SearchSource objects.
   * First attempts to parse a JSON sources block (```json { "sources": [...] }```),
   * then falls back to parsing markdown links [text](url) and plain URLs.
   * Merges extracted sources with any existing sources already attached to the message.
   */
  const extractSourcesFromAssistantMessage = useCallback(
    (assistantMessage: { content: string; sources?: SearchSource[] }): SearchSource[] => {
      try {
        const extractedSources: SearchSource[] = [];
        const seenUrls = new Set<string>();

        // Add existing sources first (they have priority)
        if (assistantMessage.sources) {
          for (const source of assistantMessage.sources) {
            if (source.url) {
              seenUrls.add(source.url);
            }
            extractedSources.push(source);
          }
        }

        const content = assistantMessage.content;
        if (!content) {
          return extractedSources;
        }

        // Try to extract JSON sources blocks first (supports multiple blocks)
        // Matches ```json { "sources": [...] } ``` or ``` { "sources": [...] } ```
        // Uses negative lookahead to avoid crossing triple-backtick boundaries
        const jsonBlockRegex =
          /```(?:json)?\s*(\{(?:(?!```)[^])*?"sources"(?:(?!```)[^])*?\})\s*```/g;
        let jsonMatch: RegExpExecArray | null;
        let foundJsonSources = false;

        while ((jsonMatch = jsonBlockRegex.exec(content)) !== null) {
          if (jsonMatch[1]) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              if (Array.isArray(parsed.sources)) {
                foundJsonSources = true;
                for (const source of parsed.sources) {
                  if (source.url && !seenUrls.has(source.url)) {
                    seenUrls.add(source.url);
                    extractedSources.push({
                      title: source.title || undefined,
                      url: source.url,
                      // Map 'description' from JSON to 'snippet' in SearchSource type
                      snippet: source.description || source.snippet || undefined,
                    });
                  }
                }
              }
            } catch {
              // JSON parsing failed for this block, continue to next
            }
          }
        }

        // If we found any JSON sources, return them without parsing markdown links
        if (foundJsonSources) {
          return extractedSources;
        }

        // Fallback: Extract markdown links and plain URLs
        // Regex to match markdown links: [title](url) with support for balanced parentheses
        const markdownLinkRegex = /\[([^\]]*)\]\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

        // Regex to match plain URLs (http, https) - Hermes-compatible (no lookbehind)
        const plainUrlRegex = /https?:\/\/[^\s<>[\]()'"]+/g;

        // Extract markdown links
        let match: RegExpExecArray | null;
        while ((match = markdownLinkRegex.exec(content)) !== null) {
          const title = match[1].trim();
          const url = match[2].trim();

          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            extractedSources.push({
              title: title || undefined,
              url: url,
            });
          }
        }

        // Extract plain URLs (not already captured in markdown links)
        while ((match = plainUrlRegex.exec(content)) !== null) {
          // Trim trailing punctuation that's not part of the URL
          const url = match[0].replace(/[.,;:!?]+$/, "").trim();

          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            // Try to extract a title from the URL domain
            try {
              const urlObj = new URL(url);
              extractedSources.push({
                title: urlObj.hostname,
                url: url,
              });
            } catch {
              extractedSources.push({
                url: url,
              });
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
        summarizeHistory = false,
        summaryTokenThreshold = DEFAULT_SUMMARY_TOKEN_THRESHOLD,
        summaryMinWindowMessages = DEFAULT_SUMMARY_MIN_WINDOW_MESSAGES,
        summaryModel = DEFAULT_SUMMARY_MODEL,
        files,
        onData: perRequestOnData,
        onThinking: perRequestOnThinking,
        memoryContext,
        searchContext,
        apiType: requestApiType,
        sources,
        thoughtProcess,
        // Responses API options
        temperature,
        maxOutputTokens,
        clientTools,
        serverTools: serverToolsFilter,
        toolChoice,
        reasoning,
        thinking,
        imageModel,
        parentMessageId,
      } = args;

      // Eager key derivation: if wallet is present but key isn't, try to derive it now
      if (walletAddress && signMessage && !hasEncryptionKey(walletAddress)) {
        try {
          await requestEncryptionKey(walletAddress, signMessage, embeddedWalletSigner);
        } catch {
          // Key derivation failed — writes will be queued via writeOrQueue
        }
      }

      // Fast path for skipStorage - bypass all storage operations
      if (skipStorage) {
        const effectiveApiType = resolveApiType(requestApiType ?? apiType ?? "auto", model);

        // Fetch server tools if needed
        let mergedTools: ReturnType<typeof mergeTools> | undefined = undefined;
        let filteredServerTools: ServerTool[] = [];

        // Check if serverTools is a function (dynamic filtering)
        const isServerToolsFunction = typeof serverToolsFilter === "function";

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
              // Function-based filtering: generate embedding and call the function
              const extracted = extractUserMessageFromMessages(messages);
              const messageContent = extracted?.content || "";

              if (messageContent.length >= minContentLength) {
                const embedding = await generateEmbedding(messageContent, {
                  getToken,
                  baseUrl,
                  model: embeddingModel,
                });
                const toolNames = serverToolsFilter(embedding, allServerTools);
                filteredServerTools = filterServerTools(allServerTools, toolNames);
              } else {
                // Message too short - use all tools
                filteredServerTools = allServerTools;
              }
            } else {
              // Static filtering
              filteredServerTools = filterServerTools(allServerTools, serverToolsFilter);
            }
          } catch {
            // Server tools are optional
          }
        }

        if (filteredServerTools.length > 0 || (clientTools && clientTools.length > 0)) {
          mergedTools = mergeTools(filteredServerTools, clientTools, effectiveApiType);
        }

        const result = await baseSendMessage({
          messages,
          model,
          onData: perRequestOnData,
          onThinking: perRequestOnThinking,
          memoryContext,
          searchContext,
          temperature,
          maxOutputTokens,
          tools: mergedTools,
          toolChoice,
          reasoning,
          thinking,
          imageModel,
          apiType: effectiveApiType,
          conversationId: currentConversationId ?? undefined,
        });

        if (result.error || !result.data) {
          return {
            data: null,
            error: result.error || "Unknown error",
          };
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
      const contentForStorage = extracted.content;
      // Use provided files, or fall back to files extracted from the message
      const filesForStorage = files ?? extracted.files;

      // Ensure we have a conversation
      let convId: string;
      try {
        convId = await ensureConversation();
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err.message : "Failed to ensure conversation",
        };
      }

      // Build the messages array
      let messagesToSend: LlmapiMessage[];

      // Include history if requested
      if (includeHistory) {
        const storedMessages = await getMessages(convId);
        // Filter out errored messages and limit history to most recent messages
        const validMessages = storedMessages.filter((msg) => !msg.error);
        const limitedMessages = validMessages.slice(-maxHistoryMessages);

        // Determine which messages to send: summarized + window or all verbatim.
        // Uses a direct fetch for the LLM call (not baseSendMessage) to avoid
        // corrupting isLoading state and abortController during summarization.
        if (summarizeHistory && !getToken) {
          console.warn(
            "[summarize] summarizeHistory is enabled but getToken is not provided — summarization will be skipped"
          );
        }
        const summaryToken = summarizeHistory && getToken ? await getToken() : null;
        const { messagesToConvert, summarySystemMessage } = await maybeSummarizeHistory({
          database,
          conversationId: convId,
          messages: limitedMessages,
          summarizeHistory,
          summaryTokenThreshold,
          summaryMinWindowMessages,
          summaryModel,
          token: summaryToken ?? "",
          baseUrl,
        });

        messagesToSend = [
          ...(summarySystemMessage ? [summarySystemMessage] : []),
          ...messagesToConvert.map(storedToLlmapiMessage),
          ...messages,
        ];
      } else {
        // Use provided messages directly
        messagesToSend = [...messages];
      }

      // Store the user message
      // Sanitize files for storage: remove large data URIs to avoid bloating the database
      const sanitizedFiles = filesForStorage?.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        // Only keep URL if it's not a data URI (e.g., external URLs)
        url: file.url && !file.url.startsWith("data:") ? file.url : undefined,
      }));

      const userMsgOpts: CreateMessageOptions = {
        conversationId: convId,
        role: "user",
        content: contentForStorage,
        files: sanitizedFiles,
        model,
        parentMessageId,
      };

      let storedUserMessage: StoredMessage;
      let userMsgQueueId: string | undefined;
      try {
        const userMsgResult = await writeOrQueue(
          "createMessage",
          userMsgOpts,
          () => createMessageOp(storageCtx, userMsgOpts),
          () => makeSyntheticStoredMessage(userMsgOpts)
        );
        storedUserMessage = userMsgResult.result;
        userMsgQueueId = userMsgResult.queueId;
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err.message : "Failed to store user message",
        };
      }

      // Track response timing
      const startTime = Date.now();

      // Determine effective API type for this request
      const effectiveApiType = resolveApiType(requestApiType ?? apiType ?? "auto", model);

      // Fetch and merge server-side tools with client tools
      let mergedTools = clientTools;

      // Track embeddings for function-based tool filtering (to reuse for message storage)
      let userMessageEmbedding: number[] | undefined;

      // Check if serverTools is a function (dynamic filtering)
      const isServerToolsFunction = typeof serverToolsFilter === "function";

      // Skip server tools fetch if serverTools is explicitly empty array
      if (getToken && !(Array.isArray(serverToolsFilter) && serverToolsFilter.length === 0)) {
        try {
          const allServerTools = await getServerTools({
            baseUrl,
            cacheExpirationMs: serverToolsConfig?.cacheExpirationMs,
            getToken,
          });

          let filteredServerTools: ServerTool[];

          if (isServerToolsFunction) {
            // Function-based filtering: generate embedding and call the function
            if (contentForStorage.length >= minContentLength) {
              userMessageEmbedding = await generateEmbedding(contentForStorage, {
                getToken,
                baseUrl,
                model: embeddingModel,
              });
              const toolNames = serverToolsFilter(userMessageEmbedding, allServerTools);
              filteredServerTools = filterServerTools(allServerTools, toolNames);
            } else {
              // Message too short - use all tools
              filteredServerTools = allServerTools;
            }
          } else {
            // Static filtering
            filteredServerTools = filterServerTools(allServerTools, serverToolsFilter);
          }

          if (filteredServerTools.length > 0) {
            mergedTools = mergeTools(filteredServerTools, clientTools, effectiveApiType);
          }
        } catch (error) {
          // Log but don't block - server tools are optional

          getLogger().warn("[useChatStorage] Failed to fetch server tools:", error);
        }
      }

      // Embed user message (skip for queued messages — embeddings can't be stored on synthetic IDs)
      if (!userMsgQueueId) {
        if (userMessageEmbedding && autoEmbedMessages) {
          // Reuse embedding from tool filtering
          updateMessageEmbeddingOp(
            storageCtx,
            storedUserMessage.uniqueId,
            userMessageEmbedding,
            embeddingModel
          ).catch(() => {
            // Non-fatal
          });
        } else {
          // No embedding to reuse - use async embedding
          // (embedMessageAsync has guards for autoEmbedMessages and minContentLength)
          embedMessageAsync(storedUserMessage);
        }
      }

      // Send the message using the underlying useChat
      const result = await baseSendMessage({
        messages: messagesToSend,
        model,
        onData: perRequestOnData,
        onThinking: perRequestOnThinking,
        memoryContext,
        searchContext,
        apiType: requestApiType,
        // Responses API options
        temperature,
        maxOutputTokens,
        tools: mergedTools,
        toolChoice,
        reasoning,
        thinking,
        imageModel,
        conversationId: convId,
      });

      const responseDuration = (Date.now() - startTime) / 1000;

      if (result.error || !result.data) {
        // If aborted, store the message with wasStopped=true (even without partial data)
        const abortedResult = result as {
          data: LlmapiResponseResponse | null;
          error: string;
        };

        if (abortedResult.error === "Request aborted") {
          // Extract content if we have partial data, otherwise empty string
          // Find the message output item (type: "message") for main content
          const abortOutput = (abortedResult.data?.output ?? []).filter(Boolean);
          const messageOutput = abortOutput.find((item) => item?.type === "message");
          const assistantContent =
            messageOutput?.content?.map((part: { text?: string }) => part.text || "").join("") ||
            "";

          // Find the reasoning output item (type: "reasoning") for thinking content
          const reasoningOutput = abortOutput.find((item) => item?.type === "reasoning");
          const abortedThinkingContent =
            reasoningOutput?.content?.map((part: { text?: string }) => part.text || "").join("") ||
            undefined;

          const responseModel = abortedResult.data?.model || model || "";

          // Store the assistant message as stopped
          let storedAssistantMessage: StoredMessage;
          try {
            storedAssistantMessage = await createMessageOp(storageCtx, {
              conversationId: convId,
              role: "assistant",
              content: assistantContent,
              model: responseModel,
              imageModel,
              usage: convertUsageToStored(abortedResult.data?.usage),
              responseDuration,
              wasStopped: true,
              sources,
              thoughtProcess: finalizeThoughtProcess(thoughtProcess),
              thinking: abortedThinkingContent,
              parentMessageId: storedUserMessage.uniqueId,
            });
            // Embed assistant message asynchronously (non-blocking)
            embedMessageAsync(storedAssistantMessage);

            // Build a valid response for the return (even if original was null)
            const responseData: LlmapiResponseResponse = abortedResult.data || {
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
            sources,
            thoughtProcess: finalizeThoughtProcess(thoughtProcess),
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

      if ("output" in responseData && Array.isArray(responseData.output)) {
        // Responses API format
        type OutputItem = { type?: string; content?: Array<{ text?: string }> };
        const outputItems = (responseData.output as OutputItem[]).filter(Boolean);
        const messageOutput = outputItems.find((item) => item?.type === "message");
        assistantContent = messageOutput?.content?.map((part) => part.text || "").join("") || "";

        const reasoningOutput = outputItems.find((item) => item?.type === "reasoning");
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

      // Extract sources from assistant content and combine with passed sources (deduplicates internally)
      const combinedSources = extractSourcesFromAssistantMessage({
        content: assistantContent,
        sources,
      });

      // Strip JSON sources block from content (if present)
      // Matches ```json { "sources": [...] } ``` or ``` { "sources": [...] } ```
      // Uses negative lookahead to avoid crossing triple-backtick boundaries
      const jsonSourcesBlockRegex =
        /```(?:json)?\s*\{(?:(?!```)[^])*?"sources"(?:(?!```)[^])*?\}\s*```/g;
      let cleanedContent = assistantContent.replace(jsonSourcesBlockRegex, "").trim();
      // Clean up extra newlines left after stripping
      cleanedContent = cleanedContent.replace(/\n{3,}/g, "\n\n");

      // Resolve image model: prefer user-provided, fall back to MCP tool response
      const resolvedImageModel =
        imageModel || extractImageModelFromToolEvents(responseData.tool_call_events);

      // Store the assistant message
      const assistantMsgOpts: CreateMessageOptions = {
        conversationId: convId,
        role: "assistant",
        content: cleanedContent,
        model: responseData.model || model,
        imageModel: resolvedImageModel,
        usage: convertUsageToStored(responseData.usage),
        responseDuration,
        sources: combinedSources,
        thoughtProcess: finalizeThoughtProcess(thoughtProcess),
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
        return {
          data: null,
          error: err instanceof Error ? err.message : "Failed to store assistant message",
          userMessage: storedUserMessage,
        };
      }

      return {
        data: responseData,
        error: null,
        userMessage: storedUserMessage,
        assistantMessage: storedAssistantMessage,
      };
    },
    [
      ensureConversation,
      getMessages,
      storageCtx,
      baseSendMessage,
      embedMessageAsync,
      minContentLength,
      walletAddress,
      signMessage,
      embeddedWalletSigner,
      isEncryptionReady,
      enableQueue,
      getWalletAddress,
      refreshQueueStatus,
    ]
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
    createMemoryEngineTool,
    createMemoryVaultTool,
    getVaultMemories,
    deleteVaultMemory,
    flushQueue,
    clearQueue,
    queueStatus,
  };
}
