"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v7 as uuidv7 } from "uuid";

import type { LlmapiMessage } from "../client";
import { assembleMessagesWithHistory } from "../lib/chat/assembleMessages";
import type { StreamResumeHandle } from "../lib/chat/resumeStream";
import { StreamExpiredError } from "../lib/chat/resumeStream";
import {
  cleanupConversationSummary,
  DEFAULT_SUMMARY_MIN_WINDOW_MESSAGES,
  DEFAULT_SUMMARY_MODEL,
  DEFAULT_SUMMARY_TOKEN_THRESHOLD,
  maybeSummarizeHistory,
} from "../lib/chat/summarize";
import { type ApiType, resolveApiType, type RunToolLoopResult } from "../lib/chat/useChat";
import {
  type ApiResponse,
  extractAssistantText,
  getImageModel,
  getToolCallEvents,
} from "../lib/chat/useChat/strategies";
import type { ToolConfig } from "../lib/chat/useChat/types";
import {
  type ActivityPhase,
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
  updateConversationPinnedOp,
  updateConversationTitleOp,
  updateMessageErrorOp,
  upsertMessageOp,
} from "../lib/db/chat";
import { updateMessageEmbeddingOp } from "../lib/db/chat";
import {
  createMediaBatchOp,
  type CreateMediaOptions,
  deleteMediaByConversationOp,
} from "../lib/db/media";
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
import { getLogger } from "../lib/logger";
import {
  createRecallTool as createRecallToolBase,
  recall as recallBase,
  type RecallOptions,
  type RecallResult,
  type RecallToolCallbacks,
  type RecallToolOptions,
} from "../lib/memory";
import {
  createMemoryEngineTool as createMemoryEngineToolBase,
  DEFAULT_MIN_CONTENT_LENGTH,
  generateEmbedding,
  type MemoryEngineSearchOptions,
} from "../lib/memoryEngine";
import { DEFAULT_API_EMBEDDING_MODEL } from "../lib/memoryEngine/constants";
import {
  createMemoryVaultTool as createMemoryVaultToolBase,
  createVaultEmbeddingCache,
  type MemoryVaultToolOptions,
  type VaultEmbeddingCache,
} from "../lib/memoryVault";
import { IMAGE_TOOL_NAMES } from "../lib/storage/mcpImages";
import { filterServerTools, getServerTools, mergeTools, type ServerTool } from "../lib/tools";
import type { EmbeddedWalletSignerFn, SignMessageFn } from "../react/useEncryption";
import { hasEncryptionKey, onKeyAvailable, requestEncryptionKey } from "../react/useEncryption";
import { useChat } from "./useChat";

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
        const output = JSON.parse(event.output) as { model?: string };
        if (output.model) return output.model;
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
function storedToLlmapiMessage(stored: StoredMessage): LlmapiMessage[] {
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

  const messages: LlmapiMessage[] = [];

  // For assistant messages with tool call events, reconstruct the tool call chain.
  // The chain must be: assistant(tool_calls) → tool(results) → assistant(final text)
  // because the assistant text is the *post-tool* response that references tool results.
  if (stored.role === "assistant" && stored.toolCallEvents?.length) {
    // 1. Assistant message that decided to call tools (no text content)
    messages.push({
      role: stored.role,
      content: undefined,
      tool_calls: stored.toolCallEvents.map((event) => ({
        id: event.id,
        type: "function",
        function: {
          name: event.name ?? "",
          arguments: event.arguments ?? "",
        },
      })),
    });

    // 2. Tool result messages
    for (const event of stored.toolCallEvents) {
      if (event.id && event.output !== undefined && event.output !== null) {
        // For image tools, strip the URL from the output to prevent the model
        // from echoing previous images and causing duplicate storage in the library.
        let toolOutput = event.output;
        if (event.name && IMAGE_TOOL_NAMES.has(event.name)) {
          try {
            const parsed = JSON.parse(toolOutput) as Record<string, unknown>;
            const { imageUrl: _imageUrl, url: _url, ...rest } = parsed;
            toolOutput = JSON.stringify(rest);
          } catch {
            // Not JSON — use as-is
          }
        }

        messages.push({
          role: "tool" as LlmapiMessage["role"],
          tool_call_id: event.id,
          content: [{ type: "text", text: toolOutput }],
        });
      }
    }

    // 3. Assistant message with the final text response (post-tool).
    // Strip R2-hosted image markdown AND plain R2 URLs so the model doesn't echo previous
    // images in subsequent turns (which causes duplicate images and URL streaming).
    // Only strips R2 URLs — external image references are preserved.
    const postToolText = stored.content
      .replace(/!\[[^\]]*\]\(https?:\/\/[a-z0-9]+\.r2\.cloudflarestorage\.com\/[^)]+\)/g, "")
      .replace(/https?:\/\/[a-z0-9]+\.r2\.cloudflarestorage\.com\/[^\s)]+/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    messages.push({
      role: stored.role,
      content: [{ type: "text", text: postToolText }],
    });
  } else {
    messages.push({
      role: stored.role,
      content,
    });
  }

  return messages;
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

  /**
   * Opt into resumable streaming. When `true`, `sendMessage` sends the
   * resumable capability header, a stable `assistantUniqueId` is allocated for
   * every turn (so the partial and the resumed completion reconcile onto ONE
   * row), and `detach()` / `resumeStream()` become usable. Off by default.
   * @default false
   */
  resumable?: boolean;

  /**
   * Observability for the fire-and-forget cancel POST that `stop()` issues for
   * a resumable stream. Forwarded to the underlying `useChat`. The
   * stop-without-cancel billing risk must be visible: once the capability
   * header ships, the portal no longer treats a dropped socket as cancellation,
   * so a `stop()` whose cancel POST silently fails bills the full generation.
   */
  onCancelResult?: (result: {
    inferenceId: string;
    ok: boolean;
    status?: number;
    error?: Error;
  }) => void;

  /**
   * Observe the stream metadata the portal issues at HEADERS_RECEIVED, once per
   * round. Forwarded to the underlying `useChat`. The enriched payload carries
   * the RESOLVED `apiType` and `model` alongside `inferenceId`, so a consumer
   * can persist a rebuildable {@link StreamResumeHandle} for a cold-launch
   * resume registry (mobile PR5). Additive — never alters the internal
   * resume-handle capture.
   */
  onStreamMeta?: (meta: {
    inferenceId: string;
    apiType: "responses" | "completions";
    model?: string;
    round?: number;
  }) => void;
}

/**
 * Arguments for sendMessage with storage (Expo version)
 *
 * Uses the base arguments without React-specific features (no runTools).

 */
export type SendMessageWithStorageArgs = BaseSendMessageWithStorageArgs & {
  /**
   * Override the API type for this request only.
   * Useful when different models need different APIs.
   * @default Uses the hook-level apiType or "responses"
   */
  apiType?: ApiType;
  /**
   * Custom HTTP headers to include with the API request (e.g. X-Privacy-Mode).
   */
  headers?: Record<string, string>;
};

/**
 * Detached variant of the storage send result.
 *
 * Returned only when `resumable` is on and the stream was torn down via
 * `detach()` before completing. The partial assistant row is already persisted
 * (under `assistantUniqueId`); call `resumeStream` with `handle` +
 * `assistantUniqueId` to complete that SAME row.
 */
export interface SendMessageWithStorageDetachedResult {
  data: ApiResponse | null;
  error: "Request detached";
  detached: true;
  /** Pass to `resumeStream` to replay; null when nothing was resumable. */
  resume: StreamResumeHandle | null;
  /**
   * The id the resumed/expired/interrupted completion reconciles onto. Nothing
   * is persisted on detach — the row materializes when resumeStream() (or
   * stop()) finalizes the turn under this id.
   *
   * Present whenever storage is active. Absent under `skipStorage`: there is no
   * persisted row to reconcile, so drive `resumeStream(resume)` on the handle
   * directly and manage the row yourself.
   */
  assistantUniqueId?: string;
  /** The persisted user message. Absent under `skipStorage` (nothing is stored). */
  userMessage?: StoredMessage;
}

/**
 * Result from sendMessage with storage (Expo version).
 *
 * Adds the detached variant on top of the base success/skipped/error shapes.
 */
export type SendMessageWithStorageResult =
  | BaseSendMessageWithStorageResult
  | SendMessageWithStorageDetachedResult;

/**
 * Result of `resumeStream` on the storage hook.
 *
 * Mirrors the lib taxonomy onto the storage outcome:
 * - clean completion → `{ error: null, assistantMessage }`
 * - 410 expired → `{ error: null, expired: true, assistantMessage }` (the
 *   stowed partial is finalized as `wasStopped`)
 * - in-stream-interrupted → `{ error: <message>, interrupted: true,
 *   assistantMessage }` (replayed content finalized as `wasStopped`)
 * - transient (401/network) → `{ error, statusCode, assistantMessage: null }`
 *   — nothing persisted, the handle is RETAINED for retry
 * - no resumable stream → `{ error: "No resumable stream", assistantMessage: null }`
 */
export interface ResumeStreamWithStorageResult {
  data: ApiResponse | null;
  error: string | null;
  /** True only for a 410: the buffer was gone and the stowed partial was finalized. */
  expired?: boolean;
  /** True for an in-stream/tool-request terminal: replayed content finalized as stopped. */
  interrupted?: boolean;
  /** HTTP status for a transient failure (e.g. 401) — retryable, handle retained. */
  statusCode?: number;
  /** The single reconciled assistant row, or null when nothing was persisted. */
  assistantMessage: StoredMessage | null;
}

/**
 * Result returned by useChatStorage hook (Expo version)
 *
 * Extends base result with Expo-specific sendMessage signature.
 */
export interface UseChatStorageResult extends BaseUseChatStorageResult {
  /** Send a message and automatically store it (Expo version) */
  sendMessage: (args: SendMessageWithStorageArgs) => Promise<SendMessageWithStorageResult>;
  /**
   * Detach the in-flight stream (keep generating server-side). Resolves to the
   * resume handle, or null when nothing is resumable. The partial assistant row
   * is persisted by `sendMessage`'s detached branch — pair the handle with that
   * row's `assistantUniqueId` to complete it via `resumeStream`.
   */
  detach: () => StreamResumeHandle | null;
  /**
   * Replay a detached stream and reconcile the result onto the SAME assistant
   * row (find→update via upsertMessageOp). Never creates a second row for the
   * same `assistantUniqueId`.
   *
   * Uses the pending-resume context stowed by the detached `sendMessage` by
   * default; pass `handleOverride` for a cold-launch resume (mobile PR5) where
   * a deserialized handle has no in-memory context (the row is then created
   * fresh). Replay is always from seq 0 — consumers reset accumulated streaming
   * text before calling.
   *
   * Pass `{ headless: true }` for a cold-launch replay of a conversation that is
   * NOT the one on screen: the row is still reconciled + PERSISTED exactly as
   * normal, but NOTHING is emitted to ANY consumer callback — `onData` /
   * `onThinking` / `onFinish` / `onError` are all withheld (forwarded into the
   * inner `useChat`, which spreads `{}` in place of all four). `isLoading` is
   * also left untouched, so reusing the on-screen chat's hook for an off-screen
   * recovery can't flicker the visible loading state. A headless resume also
   * does NOT touch the inner hook's shared abort controller, so the visible UI's
   * `stop()` can't abort it and it can't clobber a concurrently-visible stream's
   * controller. Recovered text can't bleed into the visible chat's streaming
   * buffer, nor can the recovered response (onFinish) or a transient error
   * (onError) reach the on-screen consumer; the caller uses the returned result
   * instead (mobile PR5 worker).
   */
  resumeStream: (
    handleOverride?: StreamResumeHandle,
    opts?: { headless?: boolean }
  ) => Promise<ResumeStreamWithStorageResult>;
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

  /**
   * Create the unified recall tool — single chat-completion tool that
   * searches both vault facts and conversation chunks via recall().
   * Replaces the legacy createMemoryEngineTool / vault search pair.
   */
  createRecallTool: (
    toolOptions?: RecallToolOptions,
    callbacks?: RecallToolCallbacks
  ) => ToolConfig;

  /**
   * Recall memories programmatically via the unified ranked pipeline — the
   * programmatic twin of {@link createRecallTool}. Returns ranked memories
   * for callers that inject memory into the prompt themselves (e.g.
   * pre-retrieval injection) instead of exposing a tool to the LLM. Shares
   * the hook's warm embedding cache. Defaults to `budget: 'low'`,
   * `types: ['fact']`. Gracefully returns an empty result when auth is
   * unavailable — pre-retrieval must never crash the submit path.
   */
  recall: (query: string, options?: RecallOptions) => Promise<RecallResult>;

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
 *       model: 'fireworks/accounts/fireworks/models/kimi-k2p5',
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
    preProcessors,
    resumable = false,
    onCancelResult,
    onStreamMeta,
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
            operation.payload.conversationId as string,
            operation.payload.title as string
          );
          break;
        case "updateConversationPinned":
          await updateConversationPinnedOp(
            ctx,
            operation.payload.conversationId as string,
            operation.payload.pinned as boolean
          );
          break;
        case "createMessage":
          await createMessageOp(ctx, operation.payload as Parameters<typeof createMessageOp>[1]);
          break;
        case "createMediaBatch":
          await createMediaBatchOp(mCtx, operation.payload.mediaOptions as CreateMediaOptions[]);
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

  /** Shared embedding cache for vault memories on the recall path. */
  const vaultEmbeddingCacheRef = useRef<VaultEmbeddingCache>(createVaultEmbeddingCache());

  /**
   * Create the unified recall tool — fact + chunk fused via RRF in one
   * tool. Replaces createMemoryEngineTool / createMemoryVaultSearchTool.
   */
  const createRecallTool = useCallback(
    (toolOptions?: RecallToolOptions, callbacks?: RecallToolCallbacks): ToolConfig => {
      if (!getToken) {
        throw new Error("getToken is required for recall tool");
      }
      // Default excludeConversationId to the active conversation so
      // recall doesn't surface chunks from the user's own current turns
      // back as "memory". Caller can still override explicitly.
      const resolvedToolOptions: RecallToolOptions | undefined =
        toolOptions?.excludeConversationId !== undefined || !currentConversationId
          ? toolOptions
          : { ...toolOptions, excludeConversationId: currentConversationId };
      return createRecallToolBase(
        {
          vaultCtx,
          storageCtx,
          embeddingOptions: { getToken, baseUrl, model: embeddingModel },
          vaultCache: vaultEmbeddingCacheRef.current,
          // entityCtx is intentionally omitted on Expo for now — the
          // W5 graph lane is a no-op without it (recall falls through
          // to fact + chunk lanes). Wire it up when the Expo client
          // grows an entity-extraction surface.
        },
        resolvedToolOptions,
        callbacks
      );
    },
    [vaultCtx, storageCtx, getToken, baseUrl, embeddingModel, currentConversationId]
  );

  /**
   * Recall memories programmatically via the unified ranked pipeline.
   * Shares vaultCtx / storageCtx and the warm embedding cache with
   * {@link createRecallTool}, so the ranking matches the recall_memory tool.
   * Returns an empty result (not a throw) when auth is unavailable so
   * pre-retrieval can't crash the submit path. entityCtx is omitted on Expo
   * (W5 graph lane no-op) to match createRecallTool above.
   */
  const recallFn = useCallback(
    async (query: string, options?: RecallOptions): Promise<RecallResult> => {
      if (!getToken) {
        return {
          memories: [],
          usedBudget: options?.budget ?? "low",
          reranked: false,
          candidateCount: 0,
        };
      }
      // Mirror createRecallTool: default excludeConversationId to the active
      // conversation so a chunk-including recall can't surface the user's own
      // current turns back as "memory". Caller can still override explicitly.
      const resolvedOptions: RecallOptions | undefined =
        options?.excludeConversationId !== undefined || !currentConversationId
          ? options
          : { ...options, excludeConversationId: currentConversationId };
      return recallBase(
        query,
        {
          vaultCtx,
          storageCtx,
          embeddingOptions: { getToken, baseUrl, model: embeddingModel },
          vaultCache: vaultEmbeddingCacheRef.current,
        },
        resolvedOptions
      );
    },
    [vaultCtx, storageCtx, getToken, baseUrl, embeddingModel, currentConversationId]
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
    stop: baseStop,
    detach,
    resumeStream: baseResumeStream,
  } = useChat({
    getToken,
    baseUrl,
    onData,
    onThinking,
    onFinish,
    onError,
    apiType,
    preProcessors,
    resumable,
    onCancelResult,
    onStreamMeta,
  });

  // Pending-resume context: everything needed to FINISH a detached turn after
  // the in-flight sendMessage promise has settled. Nothing is persisted on
  // detach — the partial lives here in memory until a resumeStream() (or a
  // stop()) finalizes it onto `assistantUniqueId`. Cleared at: the top of every
  // sendMessage (a stale handle bleeding into a new turn is the prev+chunk
  // corruption class — clear FIRST, before any await), a successful resume, an
  // expired/interrupted finalization, and stop().
  const pendingResumeRef = useRef<{
    handle: StreamResumeHandle | null;
    convId: string;
    userMessageUniqueId: string;
    assistantUniqueId?: string;
    model?: string;
    imageModel?: string;
    sources?: SearchSource[];
    thoughtProcess?: ActivityPhase[];
    startTime: number;
    partialData: ApiResponse | null;
  } | null>(null);
  // True while a storage resumeStream() is awaiting its terminal. stop() reads
  // this to avoid racing a parallel finalize write against the resume's own
  // stopped-finalization (base stop() aborts the in-flight resume, which then
  // finalizes as stopped on its own).
  const isResumingRef = useRef(false);

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
   * Pin or unpin a conversation. Pinning stamps `pinnedAt`; list queries are
   * NOT reordered — consumers sort pinned chats first using `pinnedAt`.
   * @returns true if updated, false if conversation not found
   */
  const updateConversationPinned = useCallback(
    async (id: string, pinned: boolean): Promise<boolean> => {
      const { result } = await writeOrQueue(
        "updateConversationPinned",
        { conversationId: id, pinned },
        () => updateConversationPinnedOp(storageCtx, id, pinned),
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
              const parsed = JSON.parse(jsonMatch[1]) as {
                sources?: Array<{
                  url?: string;
                  title?: string;
                  description?: string;
                  snippet?: string;
                }>;
              };
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
        storedUserContent,
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
        assistantUniqueId,
        headers,
      } = args;

      // Clear any pending resume FIRST, before any await: a stale handle from a
      // previous detached turn bleeding into this one is the prev+chunk
      // duplication class. A new send supersedes an unfinished detach.
      pendingResumeRef.current = null;

      // When resumable, the assistant row MUST have a stable id before the
      // stream starts so a detach and the later resume reconcile onto the SAME
      // id via upsertMessageOp. Without a caller-supplied id we mint one so the
      // single-bubble invariant holds either way.
      const effectiveAssistantUniqueId =
        assistantUniqueId ?? (resumable ? `msg_${uuidv7()}` : undefined);

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
          headers,
        });

        // A detached resumable stream surfaces as error:"Request detached" while
        // still carrying the partial data + resume handle. Forward it intact —
        // collapsing it into the generic error below would null the data and
        // drop the handle, leaving a skipStorage+resumable caller unable to
        // resume. skipStorage persists nothing, so there is no row to reconcile;
        // the caller drives resumeStream(resume) on the handle directly.
        if ("detached" in result && result.detached) {
          return {
            data: result.data,
            error: result.error,
            detached: true,
            resume: result.resume,
          };
        }

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
      // Persist the caller-supplied user text when provided, so injected
      // per-request context (memory, precise time) reaches the wire via
      // `messages` but never lands in the DB row / bubble / embedding. Falls
      // back to the extracted last-user text. See `storedUserContent` docs.
      const contentForStorage = storedUserContent ?? extracted.content;
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

      // Collect tool call event IDs already stored on earlier messages so we can
      // deduplicate the backend's accumulated tool_call_events later.
      // This must run unconditionally — even when includeHistory is false, the
      // backend still returns accumulated events across the entire conversation.
      const storedMessages = await getMessages(convId);
      const knownToolCallEventIds = new Set<string>();
      for (const msg of storedMessages) {
        if (msg.toolCallEvents) {
          for (const evt of msg.toolCallEvents) {
            if (evt.id) knownToolCallEventIds.add(evt.id);
          }
        }
      }

      // Include history if requested
      if (includeHistory) {
        // Filter out errored messages and limit history to most recent messages
        const validMessages = storedMessages.filter((msg) => !msg.error);
        const limitedMessages = validMessages.slice(-maxHistoryMessages);

        // Determine which messages to send: summarized + window or all verbatim.
        // Uses a direct fetch for the LLM call (not baseSendMessage) to avoid
        // corrupting isLoading state and abortController during summarization.
        if (summarizeHistory && !getToken) {
          getLogger().warn(
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

        messagesToSend = assembleMessagesWithHistory(
          messagesToConvert.flatMap(storedToLlmapiMessage),
          messages,
          summarySystemMessage
        );
      } else {
        // Hoist system messages to the front even without history
        messagesToSend = assembleMessagesWithHistory([], messages);
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
          void embedMessageAsync(storedUserMessage);
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
        headers,
      });

      const responseDuration = (Date.now() - startTime) / 1000;

      // Detached: the stream was torn down via detach() but the portal keeps
      // generating server-side. PERSIST NOTHING here — stow everything needed to
      // finish the turn in pendingResumeRef and let resumeStream()/stop()
      // reconcile onto `assistantUniqueId` later. This branch MUST come before
      // the "Request aborted" branch below: routing a still-generating turn into
      // the abort branch would write a wasStopped row, and routing it into the
      // generic error branch would mark the USER message errored (filtering both
      // from history). "Request detached" enters neither.
      const detachedResult = result as RunToolLoopResult & {
        detached?: true;
        resume?: StreamResumeHandle | null;
      };
      if (detachedResult.detached) {
        const rowId = effectiveAssistantUniqueId ?? `msg_${uuidv7()}`;
        pendingResumeRef.current = {
          handle: detachedResult.resume ?? null,
          convId,
          userMessageUniqueId: storedUserMessage.uniqueId,
          assistantUniqueId: rowId,
          model,
          imageModel,
          sources,
          thoughtProcess,
          startTime,
          partialData: detachedResult.data ?? null,
        };
        return {
          data: detachedResult.data ?? null,
          error: "Request detached",
          detached: true,
          resume: detachedResult.resume ?? null,
          assistantUniqueId: rowId,
          userMessage: storedUserMessage,
        };
      }

      if (result.error || !result.data) {
        // If aborted, store the message with wasStopped=true (even without partial data)
        const abortedResult = result as {
          data: ApiResponse | null;
          error: string;
        };

        if (abortedResult.error === "Request aborted") {
          // Extract partial content from whichever response shape the strategy
          // produced — Responses API ships it under output[], Chat Completions
          // under choices[0].message.content.
          const extracted = abortedResult.data
            ? extractAssistantText(abortedResult.data)
            : { content: "", thinking: undefined as string | undefined };
          const assistantContent = extracted.content;
          const abortedThinkingContent = extracted.thinking;

          const responseModel = abortedResult.data?.model || model || "";

          // Store the assistant message as stopped
          let storedAssistantMessage: StoredMessage;
          try {
            storedAssistantMessage = await createMessageOp(storageCtx, {
              conversationId: convId,
              role: "assistant",
              content: assistantContent,
              model: responseModel,
              imageModel:
                imageModel || (abortedResult.data ? getImageModel(abortedResult.data) : undefined),
              usage: convertUsageToStored(abortedResult.data),
              responseDuration,
              wasStopped: true,
              sources,
              thoughtProcess: finalizeThoughtProcess(thoughtProcess),
              thinking: abortedThinkingContent,
              parentMessageId: storedUserMessage.uniqueId,
              uniqueId: effectiveAssistantUniqueId,
            });
            // Embed assistant message asynchronously (non-blocking)
            void embedMessageAsync(storedAssistantMessage);

            // Build a valid response for the return (even if original was null).
            // Typed `ApiResponse`: when the strategy was Chat Completions,
            // `abortedResult.data` is a `LlmapiChatCompletionResponse`, not the
            // Responses shape — the synthesized fallback below is Responses-shaped.
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
            sources,
            thoughtProcess: finalizeThoughtProcess(thoughtProcess),
            error: errorMessage,
            parentMessageId: storedUserMessage.uniqueId,
            uniqueId: effectiveAssistantUniqueId,
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

      // Deduplicate tool_call_events: the backend returns accumulated events across
      // the entire conversation. Filter to only new events from this turn so we don't
      // re-extract images (or other artifacts) that already belong to earlier messages.
      const currentTurnToolCallEvents = getToolCallEvents(responseData)?.filter(
        (evt) => evt.id !== undefined && evt.id !== null && !knownToolCallEventIds.has(evt.id)
      );

      // Resolve image model: prefer the caller's selection, then the portal's
      // resolved `image_model` on the response, then MCP tool-event scraping.
      const resolvedImageModel =
        imageModel ||
        getImageModel(responseData) ||
        extractImageModelFromToolEvents(currentTurnToolCallEvents);

      // Store the assistant message
      const assistantMsgOpts: CreateMessageOptions = {
        conversationId: convId,
        role: "assistant",
        content: cleanedContent,
        model: responseData.model || model,
        imageModel: resolvedImageModel,
        usage: convertUsageToStored(responseData),
        responseDuration,
        sources: combinedSources,
        thoughtProcess: finalizeThoughtProcess(thoughtProcess),
        thinking: thinkingContent,
        // Note: when queued (encryption key not ready), storedUserMessage.uniqueId is a
        // synthetic "queued_*" ID. The real DB ID is assigned on flush, but this reference
        // isn't updated. The client-side mergeParentMessageIds handles this on reload.
        parentMessageId: storedUserMessage.uniqueId,
        toolCallEvents:
          currentTurnToolCallEvents && currentTurnToolCallEvents.length > 0
            ? currentTurnToolCallEvents
            : undefined,
        uniqueId: effectiveAssistantUniqueId,
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
          void embedMessageAsync(storedAssistantMessage);
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
      resumable,
    ]
  );

  /**
   * Upsert the reconciled assistant row onto `assistantUniqueId`. The partial
   * was NOT persisted on detach, so the FIRST finalization for an id creates
   * the row (where the `was_stopped` column defaults false), and any SUBSEQUENT
   * finalization updates it in place — exactly one row either way. On the update
   * path `wasStopped: false` actively CLEARS a prior interrupted finalization's
   * stopped flag, because the upsert→_updateMessageOp path writes it on the
   * `!== undefined` guard.
   *
   * Fidelity note (deliberate, out of §3 scope): this persists the raw
   * `extractAssistantText(data).content`. The live send path additionally
   * extracts/strips inline `sources` JSON blocks, strips R2 image markdown/URLs,
   * and scrapes `image_model` + tool-call events. resumeStream structurally
   * rejects tool streams, so the tool-event omission is moot; but a plain-text
   * answer that embeds a sources block or an R2 URL stores it un-normalized on
   * the resume path. Acceptable for the reconnect surface (the spec never
   * promises content-normalization parity); tracked as a follow-up, not a §3
   * contract gap.
   */
  const finalizeResumedRow = useCallback(
    async (
      ctx: NonNullable<typeof pendingResumeRef.current>,
      data: ApiResponse,
      wasStopped: boolean,
      responseDuration: number
    ): Promise<StoredMessage> => {
      const { content, thinking } = extractAssistantText(data);
      return upsertMessageOp(storageCtx, {
        conversationId: ctx.convId,
        role: "assistant",
        content,
        model: data.model || ctx.model || "",
        imageModel: ctx.imageModel || getImageModel(data),
        usage: convertUsageToStored(data),
        responseDuration,
        sources: ctx.sources,
        thoughtProcess: finalizeThoughtProcess(ctx.thoughtProcess),
        thinking,
        wasStopped,
        parentMessageId: ctx.userMessageUniqueId,
        uniqueId: ctx.assistantUniqueId!,
      });
    },
    [storageCtx]
  );

  /**
   * Replay a detached stream and reconcile onto the SAME assistant row.
   *
   * The replay rebuilds content from seq 0 (fresh accumulator inside the lib
   * resumeStream); we then upsert onto `assistantUniqueId` — one row, completed
   * (or finalized as stopped) in place, never a second bubble.
   *
   * Outcome taxonomy:
   * - clean completion → upsert with `wasStopped: false`, clear the ref.
   * - 410 `StreamExpiredError` (thrown by the lib) → finalize the stowed
   *   partial as `wasStopped: true`, clear the ref, return `expired: true`.
   * - interrupted terminal → finalize the REPLAYED content (≥ the partial) as
   *   `wasStopped: true`, clear the ref.
   * - transient (401/network, `interrupted: false`) → persist nothing, KEEP the
   *   ref so the caller can retry with a force-refreshed token.
   */
  const resumeStream = useCallback(
    async (
      handleOverride?: StreamResumeHandle,
      opts?: { headless?: boolean }
    ): Promise<ResumeStreamWithStorageResult> => {
      // Serialize concurrent resumes: a second resumeStream() while one is in
      // flight would race the first (two replay GETs, two finalizations on the
      // same id — the second replay would clobber the first). Reject it; the
      // caller retries after the in-flight resume settles.
      if (isResumingRef.current) {
        return { data: null, error: "Resume already in progress", assistantMessage: null };
      }
      // Resolve context: the stowed pending-resume, or synthesize from an
      // override (cold-launch: no in-memory context, so assistantUniqueId is
      // undefined and the row is simply created on finalize).
      const pending = pendingResumeRef.current;
      const ctx: NonNullable<typeof pendingResumeRef.current> | null = pending
        ? pending
        : handleOverride
          ? {
              handle: handleOverride,
              // The handle is authoritative for the resumed turn's thread: it
              // carries the conversationId the original stream was sent under.
              // On a relaunch/deep-link the app may already be viewing a
              // DIFFERENT conversation (currentConversationId), so preferring
              // current would misfile the reconciled row into the wrong thread
              // (or "" if neither is set). currentConversationId only backfills
              // a handle that predates the conversationId field.
              convId: handleOverride.conversationId ?? currentConversationId ?? "",
              userMessageUniqueId: "",
              // Cold-launch (mobile PR5): no in-memory context, so the id must be
              // STABLE across calls. Derive it deterministically from the
              // inferenceId — the only anchor available cold — so every resume of
              // the SAME buffered stream (re-tap, re-render, relaunch, retry after
              // a transient) reconciles onto the SAME row. A random id per
              // invocation would mint a second assistant bubble on any re-resume,
              // breaking the one-row-per-stream invariant. The stowed ctx (below)
              // keeps it stable within one session; this keeps it stable even
              // after a clean terminal cleared the ref.
              assistantUniqueId: `msg_resume_${handleOverride.inferenceId}`,
              model: handleOverride.model,
              imageModel: undefined,
              sources: undefined,
              thoughtProcess: undefined,
              startTime: Date.now(),
              partialData: null,
            }
          : null;

      const handle = handleOverride ?? ctx?.handle ?? null;
      if (!ctx || !handle) {
        return { data: null, error: "No resumable stream", assistantMessage: null };
      }
      // Stow the (possibly freshly synthesized cold-launch) context BEFORE the
      // await so the minted assistantUniqueId is reused on every subsequent call
      // until a terminal clears it. Without this, a cold-launch resume mints a
      // NEW id per invocation → a re-tap/re-render/relaunch creates a SECOND
      // assistant row (breaking the one-row invariant), and a transient (401)
      // terminal leaves nothing to retry ("No resumable stream"). The warm path
      // assigns the same object back (no-op). Terminal branches below clear it
      // (clean/410/interrupted) or retain it (transient) exactly as before.
      pendingResumeRef.current = ctx;
      // Stable, non-null context for use after the awaits.
      const rctx = ctx;

      // Finalize-write wrapper: a DB failure must surface as the structured
      // result shape, never as a raw throw out of resumeStream. On failure the
      // ref is RETAINED so the caller can retry the reconciliation.
      const safeFinalize = async (
        data: ApiResponse,
        wasStopped: boolean,
        responseDuration: number
      ): Promise<{ message: StoredMessage } | { error: string }> => {
        try {
          return { message: await finalizeResumedRow(rctx, data, wasStopped, responseDuration) };
        } catch (writeErr) {
          return {
            error:
              writeErr instanceof Error ? writeErr.message : "Failed to reconcile resumed message",
          };
        }
      };

      isResumingRef.current = true;
      try {
        // baseResumeStream fetches a fresh token internally (at invocation time).
        // Headless forwards through to useChat.resumeStream, which withholds the
        // hook-level onData/onThinking so a cold-launch replay of an off-screen
        // conversation reconciles + persists the row WITHOUT feeding the visible
        // chat's streaming buffer (mobile PR5). The DB reconciliation below is
        // unchanged — the row still lands.
        const result = await baseResumeStream(handle, { headless: opts?.headless });
        const responseDuration = (Date.now() - rctx.startTime) / 1000;

        if (result.error === null) {
          // Clean completion.
          const written = await safeFinalize(result.data, false, responseDuration);
          if ("error" in written) {
            return { data: result.data, error: written.error, assistantMessage: null };
          }
          pendingResumeRef.current = null;
          void embedMessageAsync(written.message);
          return { data: result.data, error: null, assistantMessage: written.message };
        }

        if (result.interrupted) {
          // In-stream/tool-request terminal: persist the replayed content
          // (which is ≥ the detached partial) as a stopped message.
          const data = result.data ?? rctx.partialData;
          let assistantMessage: StoredMessage | null = null;
          if (data) {
            const written = await safeFinalize(data, true, responseDuration);
            if ("error" in written) {
              return { data, error: written.error, interrupted: true, assistantMessage: null };
            }
            assistantMessage = written.message;
          }
          pendingResumeRef.current = null;
          return { data, error: result.error, interrupted: true, assistantMessage };
        }

        // Transient (401/network): persist nothing, KEEP the handle for retry.
        return {
          data: result.data,
          error: result.error,
          statusCode: result.statusCode,
          assistantMessage: null,
        };
      } catch (err) {
        if (err instanceof StreamExpiredError) {
          // Buffer gone: finalize the stowed partial as stopped so the UI shows
          // its interrupted state without a hard failure.
          const responseDuration = (Date.now() - rctx.startTime) / 1000;
          let assistantMessage: StoredMessage | null = null;
          if (rctx.partialData) {
            const written = await safeFinalize(rctx.partialData, true, responseDuration);
            if ("error" in written) {
              return {
                data: rctx.partialData,
                error: written.error,
                expired: true,
                assistantMessage: null,
              };
            }
            assistantMessage = written.message;
          }
          pendingResumeRef.current = null;
          return { data: rctx.partialData, error: null, expired: true, assistantMessage };
        }
        throw err;
      } finally {
        isResumingRef.current = false;
      }
    },
    [baseResumeStream, currentConversationId, finalizeResumedRow, embedMessageAsync]
  );

  /**
   * Stop wrapper: when a resume is pending AND idle (detached, nothing in flight
   * to abort), finalize the stowed partial as a stopped message on the same
   * `assistantUniqueId` and clear the ref. If a resumeStream() is currently in
   * flight we do NOT finalize here — base stop() aborts that resume, whose own
   * terminal finalizes the row as stopped, so a parallel write here would race
   * the same id. The underlying useChat.stop() still fires the cancel POST (its
   * streamMeta ref survives the detach).
   */
  const stop = useCallback(() => {
    const pending = pendingResumeRef.current;
    if (pending && pending.assistantUniqueId && !isResumingRef.current) {
      const finalize = pending;
      pendingResumeRef.current = null;
      // Hold the resume guard across the fire-and-forget finalize. baseStop()
      // below fires the cancel POST, which evicts the portal buffer; a
      // resumeStream() racing this window (e.g. a cold-launch override on the
      // same inferenceId) would otherwise 410 and double-upsert the same
      // assistantUniqueId. With the guard set, that concurrent resume is
      // rejected ("Resume already in progress") until this write commits.
      isResumingRef.current = true;
      void (async () => {
        const responseDuration = (Date.now() - finalize.startTime) / 1000;
        const data: ApiResponse = finalize.partialData ?? {
          id: `stopped-${Date.now()}`,
          model: finalize.model || "",
          object: "response",
          output: [],
          usage: undefined,
        };
        try {
          await finalizeResumedRow(finalize, data, true, responseDuration);
        } catch (err) {
          // Best-effort: a failed finalize must not break local stop, but a
          // dropped stopped-row would vanish from history with no signal — log.
          getLogger().warn("[useChatStorage] stop() finalize of detached partial failed:", err);
        } finally {
          isResumingRef.current = false;
        }
      })();
    }
    baseStop();
  }, [baseStop, finalizeResumedRow]);

  return {
    isLoading,
    sendMessage,
    stop,
    detach,
    resumeStream,
    conversationId: currentConversationId,
    setConversationId: setCurrentConversationId,
    createConversation,
    getConversation,
    getConversations,
    updateConversationTitle,
    updateConversationPinned,
    deleteConversation,
    getMessages,
    createMemoryEngineTool,
    createMemoryVaultTool,
    createRecallTool,
    recall: recallFn,
    getVaultMemories,
    deleteVaultMemory,
    flushQueue,
    clearQueue,
    queueStatus,
  };
}
