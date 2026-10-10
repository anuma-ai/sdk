"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LlmapiChatCompletionTool, LlmapiMessage } from "../client";
import { MCP_R2_DOMAIN } from "../clientConfig";
import { assembleMessagesWithHistory } from "../lib/chat/assembleMessages";
import { attachFileContextToLastUserMessage } from "../lib/chat/fileContext";
import { isSendableImageURL } from "../lib/chat/imageParts";
import { extractSourcesFromToolCallEvents } from "../lib/chat/sources";
import {
  cleanupConversationSummary,
  DEFAULT_SUMMARY_MIN_WINDOW_MESSAGES,
  DEFAULT_SUMMARY_MODEL,
  DEFAULT_SUMMARY_TOKEN_THRESHOLD,
  maybeSummarizeHistory,
} from "../lib/chat/summarize";
import { buildToolResultContent } from "../lib/chat/toolResultMessage";
import {
  DISPLAY_CARD_PLACEHOLDER,
  prepareToolResultsForReplay,
  TOOL_RESULT_ORIGIN,
} from "../lib/chat/toolResults";
import { type ApiType, resolveApiType } from "../lib/chat/useChat";
import {
  type ApiResponse,
  extractAssistantText,
  getImageModel,
  getToolCallEvents,
  getToolsChecksum,
} from "../lib/chat/useChat/strategies";
import type { ToolConfig } from "../lib/chat/useChat/types";
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
  finalizeThoughtProcess,
  getAllFilesOp,
  getConversationOp,
  getConversationsOp,
  getMessageCountOp,
  getMessageSkeletonsOp,
  getMessagesOp,
  getMessagesPageOp,
  type GetMessagesPageOptions,
  getToolCallEventIdsOp,
  makeSyntheticStoredConversation,
  makeSyntheticStoredMessage,
  Message,
  type MessageChunk,
  type MessageSkeleton,
  resolveStoredUserContent,
  type SearchSource,
  type ServerToolsFilterFn,
  type StorageOperationsContext,
  type StoredConversation,
  type StoredFileWithContext,
  type StoredMessage,
  updateConversationPinnedOp,
  updateConversationTitleOp,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
  updateMessageErrorOp,
} from "../lib/db/chat";
import { maskScopedEmbeddingCache } from "../lib/db/chat/embeddingCache";
import {
  Entity as EntityModel,
  MemoryEntity as MemoryEntityModel,
} from "../lib/db/entities/models";
import type { EntityOperationsContext } from "../lib/db/entities/operations";
import {
  createMediaBatchOp,
  deleteMediaByConversationOp,
  getMediaByIdsOp,
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
import { getLogger } from "../lib/logger";
import {
  type ChunkVectorCache,
  createChunkVectorCache,
  createRecallTool as createRecallToolBase,
  recall as recallBase,
  type RecallOptions,
  type RecallResult,
  type RecallToolCallbacks,
  type RecallToolOptions,
  retain,
  type RetainResult,
} from "../lib/memory";
import {
  chunkText,
  createMemoryEngineTool as createMemoryEngineToolBase,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MIN_CONTENT_LENGTH,
  generateEmbedding,
  generateEmbeddings,
  type MemoryEngineSearchOptions,
  shouldChunkMessage,
} from "../lib/memoryEngine";
import { DEFAULT_API_EMBEDDING_MODEL } from "../lib/memoryEngine/constants";
import {
  createMemoryVaultSearchTool as createMemoryVaultSearchToolBase,
  createMemoryVaultTool as createMemoryVaultToolBase,
  eagerEmbedContent,
  getVaultEmbeddingCache,
  type MemoryVaultSearchOptions,
  type MemoryVaultToolOptions,
  preEmbedVaultMemories,
  searchVaultMemories as searchVaultMemoriesBase,
  type VaultEmbeddingCache,
  type VaultSearchResult,
  type VaultWriteInput,
} from "../lib/memoryVault";
import type { NerDetector } from "../lib/pii/ner";
import { isPiiRedactor, PiiRedactor } from "../lib/pii/redactor";
import type { FileProcessingStatus } from "../lib/processors";
import { formatFileProcessingNotes, preprocessFiles } from "../lib/processors";
import {
  BlobUrlManager,
  createFilePlaceholder,
  deleteEncryptedFile,
  extractFileIds,
  extractMCPImageUrls,
  isOPFSSupported,
  isR2UrlExpired,
  readEncryptedFile,
} from "../lib/storage";
import { toolOutputForModel } from "../lib/storage/mcpImages";
import {
  autoFilterClientTools,
  computeToolGuidance,
  deferFormattingConfig,
  type DeferLoadingConfig,
  filterServerTools,
  getServerTools,
  getToolName,
  mergeTools,
  MIN_CONTENT_LENGTH_FOR_TOOLS,
  resolveDeferredServerTools,
  type ServerTool,
  shouldRefreshTools,
  type ToolsCacheBackend,
  type ToolSet,
  withActiveToolSetServerTools,
} from "../lib/tools";
import { mergeActiveToolSets } from "../lib/tools/selection/activeToolSets";
import { carriedToolSets, recordToolSetTurn } from "../lib/tools/selection/recentToolSets";
import { useChat } from "./useChat";
import { useChatMedia } from "./useChatMedia";
import type { EmbeddedWalletSignerFn, SignMessageFn } from "./useEncryption";
import { getEncryptionKey, hasEncryptionKey, requestEncryptionKey } from "./useEncryption";
import { onClearAllEncryptionState, onKeyAvailable } from "./useEncryption";

/**
 * Preview which tools `useChatStorage` will include for a given prompt,
 * without making the actual chat request.
 *
 * Runs the exact same client + server tool selection pipeline that
 * `useChatStorage`'s `sendMessage` runs internally — same embedding,
 * same `autoFilterClientTools` call, same server-tools branch — so the
 * returned names are guaranteed to match what a real request would
 * include for that prompt + config.
 *
 * Intended for debug UIs ("show me what the model will see for this
 * prompt"). Pass the same `clientTools`, `serverToolsFilter`,
 * `extraToolSets`, and `activeToolSets` you pass to `useChatStorage`
 * so the result is faithful.
 *
 * Caveats:
 * - For server tools, this only mirrors the dynamic `findMatchingTools`
 *   path (the one used for the responses API in `sendMessage`). If your
 *   serverToolsFilter is a function, it's invoked directly with the
 *   prompt embedding.
 * - Embedding generation hits the same `/embeddings` endpoint as the
 *   real request; pass a shared `clientToolEmbeddingsCache` if you call
 *   this repeatedly to avoid re-embedding tool descriptions.
 * - A real follow-up may also include connector tool sets carried from the
 *   previous two turns of the conversation, which this preview does not model.
 */
export async function previewToolSelection(options: {
  prompt: string;
  clientTools?: LlmapiChatCompletionTool[];
  serverToolsFilter?: string[] | ServerToolsFilterFn;
  serverToolsConfig?: {
    cacheExpirationMs?: number;
    deferLoading?: DeferLoadingConfig;
    cache?: ToolsCacheBackend;
  };
  /** Bearer-token auth (browser sessions). Provide this or `apiKey`. */
  getToken?: () => Promise<string | null>;
  /** X-API-Key auth (server-side / test harnesses). Provide this or `getToken`. */
  apiKey?: string;
  baseUrl?: string;
  embeddingModel?: string;
  extraToolSets?: ToolSet[];
  activeToolSets?: string[];
  /** Optional cache of tool-description embeddings, shared across calls. */
  clientToolEmbeddingsCache?: Map<string, number[]>;
}): Promise<{
  clientToolNames: string[];
  serverToolNames: string[];
}> {
  const {
    prompt,
    clientTools = [],
    serverToolsFilter,
    serverToolsConfig,
    getToken,
    apiKey,
    baseUrl,
    embeddingModel = DEFAULT_API_EMBEDDING_MODEL,
    extraToolSets,
    activeToolSets,
    clientToolEmbeddingsCache,
  } = options;

  if (!getToken && !apiKey) {
    throw new Error(
      "previewToolSelection requires either `getToken` (Bearer auth) or `apiKey` (X-API-Key auth) — without one, embeddings and the server tool catalog cannot be fetched."
    );
  }

  if (!prompt.trim()) {
    return { clientToolNames: [], serverToolNames: [] };
  }

  if (prompt.length < MIN_CONTENT_LENGTH_FOR_TOOLS) {
    const { tools: gatedTools } = await autoFilterClientTools(
      clientTools,
      null,
      clientToolEmbeddingsCache ?? new Map<string, number[]>(),
      { getToken, apiKey, baseUrl, model: embeddingModel },
      extraToolSets ?? [],
      activeToolSets ?? []
    );
    let gatedServerNames: string[] = [];
    const stickyOnly =
      typeof serverToolsFilter === "function" &&
      !!activeToolSets?.length &&
      !serverToolsConfig?.deferLoading?.enabled;
    if ((Array.isArray(serverToolsFilter) && serverToolsFilter.length > 0) || stickyOnly) {
      try {
        const allServerTools = await getServerTools({
          baseUrl,
          cacheExpirationMs: serverToolsConfig?.cacheExpirationMs,
          getToken,
          apiKey,
          cache: serverToolsConfig?.cache,
        });
        if (typeof serverToolsFilter === "function") {
          gatedServerNames = withActiveToolSetServerTools(
            [],
            allServerTools,
            serverToolsFilter,
            activeToolSets,
            extraToolSets
          ).map((t) => t.name);
        } else {
          const allow = new Set(serverToolsFilter);
          const gated = allServerTools.filter((t) => allow.has(t.name));
          gatedServerNames = (
            serverToolsConfig?.deferLoading?.enabled
              ? resolveDeferredServerTools(gated, serverToolsFilter, serverToolsConfig.deferLoading)
              : gated
          ).map((t) => t.name);
        }
      } catch {
        // Server tools optional; leave empty on fetch failure.
      }
    }
    return {
      clientToolNames: gatedTools.map(getToolName).filter(Boolean),
      serverToolNames: gatedServerNames,
    };
  }

  const embeddingOptions = { getToken, apiKey, baseUrl, model: embeddingModel };

  let promptEmbedding: number[];
  try {
    promptEmbedding = await generateEmbedding(prompt, embeddingOptions);
  } catch {
    const { tools: degradedTools } = await autoFilterClientTools(
      clientTools,
      null,
      clientToolEmbeddingsCache ?? new Map<string, number[]>(),
      { getToken, apiKey, baseUrl, model: embeddingModel },
      extraToolSets ?? [],
      activeToolSets ?? [],
      "error"
    );
    return {
      clientToolNames: degradedTools.map(getToolName).filter(Boolean),
      serverToolNames: [],
    };
  }

  const cache = clientToolEmbeddingsCache ?? new Map<string, number[]>();
  const { tools: filteredClientTools } = await autoFilterClientTools(
    clientTools,
    promptEmbedding,
    cache,
    embeddingOptions,
    extraToolSets ?? [],
    activeToolSets ?? []
  );
  const clientToolNames = filteredClientTools.map(getToolName).filter(Boolean);

  let serverToolNames: string[] = [];
  if (
    serverToolsFilter !== undefined &&
    !(Array.isArray(serverToolsFilter) && serverToolsFilter.length === 0)
  ) {
    try {
      const allServerTools = await getServerTools({
        baseUrl,
        cacheExpirationMs: serverToolsConfig?.cacheExpirationMs,
        getToken,
        apiKey,
        cache: serverToolsConfig?.cache,
      });
      if (serverToolsConfig?.deferLoading?.enabled) {
        serverToolNames = resolveDeferredServerTools(
          allServerTools,
          serverToolsFilter,
          serverToolsConfig.deferLoading
        ).map((t) => t.name);
      } else if (typeof serverToolsFilter === "function") {
        const sticky = withActiveToolSetServerTools(
          [],
          allServerTools,
          serverToolsFilter,
          activeToolSets,
          extraToolSets
        ).map((t) => t.name);
        serverToolNames = [
          ...new Set([...serverToolsFilter(promptEmbedding, allServerTools), ...sticky]),
        ];
      } else {
        const allow = new Set(serverToolsFilter);
        serverToolNames = allServerTools.filter((t) => allow.has(t.name)).map((t) => t.name);
      }
    } catch {
      // Server tools optional; leave empty on fetch failure.
    }
  }

  return { clientToolNames, serverToolNames };
}

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
 *
 * Exported for unit testing; not part of the public API.
 */
export async function storedToLlmapiMessage(
  stored: StoredMessage,
  encryptionKey?: CryptoKey,
  resolveMediaByIds?: (ids: string[]) => Promise<Array<{ mediaId: string; sourceUrl?: string }>>
): Promise<LlmapiMessage[]> {
  let textContent = stored.content;

  const fileUrlMap = new Map<string, string>();

  const imageParts: LlmapiMessage["content"] = [];
  if (stored.role !== "assistant" && stored.files?.length) {
    for (const file of stored.files) {
      if (isSendableImageURL(file.url)) {
        imageParts.push({
          type: "image_url",
          image_url: { url: file.url },
        });
      } else if (file.sourceUrl && !isR2UrlExpired(file.sourceUrl, stored.createdAt)) {
        imageParts.push({
          type: "image_url",
          image_url: { url: file.sourceUrl },
        });
        fileUrlMap.set(file.id, file.sourceUrl);
      } else if (encryptionKey && isOPFSSupported()) {
        try {
          const result = await readEncryptedFile(file.id, encryptionKey);
          if (result && result.blob.type.startsWith("image/")) {
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
    const expiredFileIds: string[] = [];
    for (const file of stored.files) {
      if (file.sourceUrl) {
        if (!isR2UrlExpired(file.sourceUrl, stored.createdAt)) {
          fileUrlMap.set(file.id, file.sourceUrl);
        } else {
          expiredFileIds.push(file.id);
        }
      }
    }
    if (expiredFileIds.length > 0) {
      textContent += `\n\n[${expiredFileIds.length} expired image URL${expiredFileIds.length > 1 ? "s" : ""} omitted — the user can still see ${expiredFileIds.length > 1 ? "them" : "it"} locally]`;
    }
  }

  if (stored.fileIds?.length && resolveMediaByIds) {
    try {
      const mediaItems = await resolveMediaByIds(stored.fileIds);
      for (const media of mediaItems) {
        if (media.sourceUrl && !isR2UrlExpired(media.sourceUrl, stored.createdAt)) {
          fileUrlMap.set(media.mediaId, media.sourceUrl);
        }
      }
    } catch {
      // Don't fail message conversion if media resolution fails
    }
  }

  textContent = textContent.replace(/__SDKFILE__([a-zA-Z0-9_-]+)__/g, (_match, fileId: string) => {
    const sourceUrl = fileUrlMap.get(fileId);
    if (sourceUrl) {
      return `![image](${sourceUrl})`;
    }
    return "";
  });

  textContent = textContent.replace(
    /!\[MCP_IMAGE:([a-zA-Z0-9_-]+)\]/g,
    (_match, fileId: string) => {
      const sourceUrl = fileUrlMap.get(fileId);
      if (sourceUrl) {
        return `![image](${sourceUrl})`;
      }
      return "";
    }
  );

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

  textContent = textContent.replace(/\n{3,}/g, "\n\n").trim();

  const content: LlmapiMessage["content"] = [{ type: "text", text: textContent }, ...imageParts];

  const messages: LlmapiMessage[] = [];

  if (stored.role === "assistant" && stored.toolCallEvents?.length) {
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

    for (const event of stored.toolCallEvents) {
      if (event.id && event.output !== undefined && event.output !== null) {
        messages.push({
          role: "tool" as LlmapiMessage["role"],
          tool_call_id: event.id,
          content: [{ type: "text", text: toolOutputForModel(event.name, event.output) }],
        });
      }
    }

    const postToolText = textContent
      .replace(/!\[[^\]]*\]\(https?:\/\/[a-z0-9]+\.r2\.cloudflarestorage\.com\/[^)]+\)/g, "")
      .replace(/https?:\/\/[a-z0-9]+\.r2\.cloudflarestorage\.com\/[^\s)]+/g, "")
      .replace(/!\[[^\]]*\]\(https?:\/\/[^)\s]+\/api\/v1\/media\/[^/)\s]+\/[^)]+\)/g, "")
      .replace(/https?:\/\/[^\s)]+\/api\/v1\/media\/[^/\s)]+\/[^\s)]+/g, "")
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
 * Options for useChatStorage hook (React version)
 *
 * Extends base options with apiType support.
 * @inline
 */
export interface UseChatStorageOptions extends BaseUseChatStorageOptions {
  /** Opt into the portal stream buffer for every generated round. */
  resumable?: boolean;
  /** Inference identifier for each HTTP round, including client-tool continuations. */
  onStreamMeta?: (meta: { inferenceId: string; round: number }) => void;
  /**
   * Which API endpoint to use. Default: "responses"
   * - "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
   * - "completions": OpenAI Chat Completions API (wider model compatibility)
   */
  apiType?: ApiType;

  /**
   * Called once per `sendMessage` with the user prompt and the FINAL tool
   * selection — after semantic filtering, tool-set expansion, and exclusions;
   * exactly the tools the request carries. Intended for debug logging and
   * selection QA (e.g. a prefixed plain-text console line you can filter on).
   * Errors thrown by the callback are swallowed.
   */
  onToolSelection?: (info: {
    prompt: string;
    clientToolNames: string[];
    serverToolNames: string[];
  }) => void;

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

  /**
   * Additional tool sets to apply on top of the built-in ones (app-generation,
   * slides, github). When any anchor tool in a custom set is selected by
   * semantic matching, all members of that set are included automatically.
   *
   * Treated as static config — set once at hook setup. Changing it across
   * renders does not affect in-flight `sendMessage` calls; use
   * `activeToolSets` for dynamic, conversation-state-driven overrides.
   */
  extraToolSets?: ToolSet[];

  /**
   * Tool set names that should expand unconditionally for this request,
   * bypassing the anchor-similarity check. Use when conversation state
   * implies a set should be present regardless of how the prompt is phrased
   * — e.g., pass `["slides"]` when the conversation already contains a slide
   * deck artifact, so short follow-up prompts ("add a thank you slide",
   * "make it bigger") still get the full slide toolkit.
   *
   * Read via a ref so updates are visible to in-flight `sendMessage` calls
   * without rebuilding the callback.
   *
   * Names must match a set's `name` from `BUILT_IN_TOOL_SETS` or
   * `extraToolSets`. Unknown names are ignored.
   */
  activeToolSets?: string[];
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

  /**
   * Per-request override for PII redaction. When set, takes precedence over the
   * hook-level `piiRedaction` for this call only — e.g. pass `false` to disable
   * redaction for a single message, or a `PiiRedactor` instance to use your own.
   *
   * Scope: applies to this call's outbound LLM request, its embedding inputs
   * (tool-filtering and the stored message/chunk embeddings), and the
   * summarization prompt. Vault/memory tool embeddings are governed by the
   * hook-level redactor since the vault spans conversations. `true` resolves to
   * the conversation-shared redactor, matching the hook-level behavior.
   */
  piiRedaction?: boolean | PiiRedactor;

  /**
   * Called once, after the turn's attachments are preprocessed and before the request is sent,
   * with one {@link FileProcessingStatus} per attached file (images sent as `image_url` are left
   * out). Use it to tell the user which attachments the model could not read, or only partly
   * read, and why. Not called when no files are attached. Errors thrown by the callback are
   * logged and ignored.
   */
  onFileProcessingResult?: (statuses: FileProcessingStatus[]) => void;
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
      autoExecutedToolResults?: { name: string; result: unknown }[];
      /**
       * The synthetic `[Tool Execution Results]` row those results were persisted as, so a caller can
       * key its transient overlay on the id the SDK actually wrote instead of deriving one (#5519).
       * Absent when no tool ran, or when that (non-fatal) write failed.
       */
      toolResultsMessage?: StoredMessage;
    }
  | {
      data: ApiResponse;
      error: null;
      userMessage?: undefined;
      assistantMessage?: undefined;
      /** Client-tool output remains available even when no private history is written. */
      autoExecutedToolResults?: { name: string; result: unknown }[];
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
   *   model: "fireworks/accounts/fireworks/models/kimi-k2p5",
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

  /**
   * Create a memory vault tool for LLM to save/update persistent memories.
   * The tool is pre-configured with the hook's vault context and encryption.
   *
   * @param options - Optional configuration (onSave callback for confirmation)
   * @returns A ToolConfig that can be passed to sendMessage's clientTools
   */
  createMemoryVaultTool: (options?: MemoryVaultToolOptions) => ToolConfig;

  /**
   * Write one memory through `retain()` — cosine auto-merge against the vault,
   * so an explicit "save this" from a host surface (selection → memory, a
   * manual add) lands as a re-observation of an existing memory instead of a
   * duplicate row when the vault already holds the fact. The
   * `memory_vault_save` tool writes through this too. Throws without `getToken`.
   */
  retainVaultMemory: (input: VaultWriteInput) => Promise<RetainResult>;

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
   * Create the unified recall_memory tool — single LLM-facing tool that
   * fuses vault facts and conversation chunks via `recall()`. Prefer
   * this over wiring `createMemoryVaultSearchTool` and the chunk tool
   * separately; the LLM no longer has to route between two surfaces.
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
   * the hook's warm embedding cache, so a warmed vault ranks in-memory with
   * a single query-embedding round-trip. Defaults to `budget: 'low'`,
   * `types: ['fact']`. Gracefully returns an empty result when auth is
   * unavailable — pre-retrieval must never crash the submit path.
   *
   * @param query - Natural language recall query
   * @param options - Optional recall configuration (types, budget, limit, scopes, …)
   */
  recall: (query: string, options?: RecallOptions) => Promise<RecallResult>;

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
   *
   * Shared per `(database, walletAddress, embeddingModel)` rather than owned by
   * this hook instance: every `useChatStorage` on the same three gets this exact
   * object, and it outlives their unmounts. Writes and evictions are therefore
   * visible to all of them — which is the point (a memory deleted through one
   * hook stops being served by the others) but does mean `clear()` clears for
   * everyone.
   */
  vaultEmbeddingCache: VaultEmbeddingCache;

  /**
   * Get all vault memories for context injection.
   * Returns memories sorted by creation date (newest first). Soft-deleted
   * memories are excluded unless `includeDeleted` is set.
   * @param options - Optional filtering (scopes to include, whether to
   *   include soft-deleted memories)
   */
  getVaultMemories: (
    options?: Parameters<typeof getAllVaultMemoriesOp>[1]
  ) => Promise<StoredVaultMemory[]>;

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

const CONVERSATION_REDACTOR_LIMIT = 50;
const NO_CONVERSATION_KEY = "__no_conversation__";
const NO_STORE_FOLDERS = "Folders are not supported with a memoryStore";
const conversationRedactors = new Map<string, { redactor: PiiRedactor; detector?: NerDetector }>();

function getConversationRedactor(
  conversationId: string | null,
  nerDetector?: NerDetector
): PiiRedactor {
  const key = conversationId ?? NO_CONVERSATION_KEY;
  const cached = conversationRedactors.get(key);
  if (cached && cached.detector === nerDetector) {
    conversationRedactors.delete(key);
    conversationRedactors.set(key, cached);
    return cached.redactor;
  }
  const redactor = new PiiRedactor({ nerDetector });
  conversationRedactors.set(key, { redactor, detector: nerDetector });
  if (conversationRedactors.size > CONVERSATION_REDACTOR_LIMIT) {
    const oldest = conversationRedactors.keys().next().value;
    if (oldest !== undefined) conversationRedactors.delete(oldest);
  }
  return redactor;
}

/** Resolved PII redaction for a single `sendMessage` call. */
interface CallPiiResolution {
  /**
   * Redactor for this call's embedding masking and summarization prompt.
   * `undefined` means no masking (redaction disabled for this call).
   */
  redactor: PiiRedactor | undefined;
  /**
   * Value forwarded to the inner `useChat` for the LLM request: the resolved
   * redactor instance, or `false` to disable. Always forwarded (never
   * `undefined`) so the LLM call uses the redactor keyed to THIS call's
   * conversation rather than the inner hook's own `currentConversationId`-keyed
   * one — the latter is `null` on the first turn of an auto-created conversation,
   * which would orphan turn-1 placeholder mappings.
   */
  forInnerSend: boolean | PiiRedactor;
}

/**
 * Resolve the effective redactor for one `sendMessage` call.
 *
 * A per-request `piiRedaction` takes precedence over the hook-level option:
 * `false` disables redaction for this call, a `PiiRedactor` instance brings its
 * own, and `true` resolves (like the hook-level `true`) to the conversation
 * redactor — but via `getConversationRedactorFor`, so the caller decides which
 * conversation to key on. Resolving against the conversation actually used for
 * the call (rather than the possibly-stale `currentConversationId`) keeps
 * placeholder mappings consistent across turns.
 *
 * `hookPiiRedaction` is the ORIGINAL hook-level option (not the pre-resolved
 * redactor) so a hook-level `true` can be re-keyed to this call's conversation.
 *
 * Exported for unit testing; not part of the public API.
 */
export function resolveCallPii(
  requestPiiRedaction: boolean | PiiRedactor | undefined,
  hookPiiRedaction: boolean | PiiRedactor | undefined,
  getConversationRedactorFor: () => PiiRedactor
): CallPiiResolution {
  const effective = requestPiiRedaction === undefined ? hookPiiRedaction : requestPiiRedaction;
  const redactor: PiiRedactor | undefined =
    effective === true
      ? getConversationRedactorFor()
      : isPiiRedactor(effective)
        ? effective
        : undefined;
  return { redactor, forInnerSend: redactor ?? false };
}

export { maskScopedEmbeddingCache };

/**
 * A React hook that wraps useChat and persists messages and conversations to WatermelonDB as they are sent and received.
 *
 * @param options - Configuration options
 * @returns Chat state and methods plus storage operations
 *
 * @example
 * ```tsx
 * import { Database } from '@nozbe/watermelondb';
 * import { useChatStorage } from '@anuma/sdk/react';
 *
 * function ChatComponent({ database }: { database: Database }) {
 *   const { isLoading, sendMessage } = useChatStorage({
 *     database,
 *     getToken: async () => getAuthToken(),
 *     onData: (chunk) => setResponse((prev) => prev + chunk),
 *   });
 *
 *   const handleSend = async () => {
 *     const result = await sendMessage({
 *       messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello, how are you?' }] }],
 *       model: 'fireworks/accounts/fireworks/models/kimi-k2p5',
 *       includeHistory: true,
 *     });
 *     if (result.error) console.error(result.error);
 *   };
 *
 *   return <button onClick={handleSend} disabled={isLoading}>Send</button>;
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
    onToolCallArgumentsDelta,
    resumable,
    onStreamMeta,
    apiType,
    walletAddress,
    signMessage,
    embeddedWalletSigner,
    getWalletAddress,
    memoryStore,
    enableQueue = true,
    autoFlushOnKeyAvailable = true,
    extraToolSets,
    activeToolSets,
    fileProcessors,
    fileProcessingOptions,
    onToolSelection,
    serverTools: serverToolsConfig,
    autoEmbedMessages = true,
    embeddingModel = DEFAULT_API_EMBEDDING_MODEL,
    minContentLength = DEFAULT_MIN_CONTENT_LENGTH,
    mcpR2Domain = MCP_R2_DOMAIN,
    preProcessors,
    smoothing,
    piiRedaction,
    onPiiRedacted,
    nerDetector,
    toolResultsHistoryExclude,
    foldToolResultsInHistory,
  } = options;

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );

  const toolResultsHistoryExcludeRef = useRef(toolResultsHistoryExclude);
  toolResultsHistoryExcludeRef.current = toolResultsHistoryExclude;
  const foldToolResultsInHistoryRef = useRef(foldToolResultsInHistory);
  foldToolResultsInHistoryRef.current = foldToolResultsInHistory;

  const nerDetectorRef = useRef(nerDetector);
  nerDetectorRef.current = nerDetector;

  const resolvedPiiRedaction = useMemo(
    () =>
      piiRedaction === true
        ? getConversationRedactor(currentConversationId, nerDetectorRef.current)
        : piiRedaction,
    [piiRedaction, currentConversationId]
  );

  const maskForEmbedding = useCallback(
    (text: string): string =>
      isPiiRedactor(resolvedPiiRedaction) ? resolvedPiiRedaction.maskText(text) : text,
    [resolvedPiiRedaction]
  );

  const maskEmbeddingInput = useMemo(
    () =>
      isPiiRedactor(resolvedPiiRedaction)
        ? (text: string) => resolvedPiiRedaction.maskText(text)
        : undefined,
    [resolvedPiiRedaction]
  );
  const vaultEmbeddingOptions = useMemo(
    () => ({ getToken, baseUrl, model: embeddingModel, maskInput: maskEmbeddingInput }),
    [getToken, baseUrl, embeddingModel, maskEmbeddingInput]
  );

  const blobManagerRef = useRef<BlobUrlManager>(new BlobUrlManager());

  useEffect(() => {
    const manager = blobManagerRef.current;
    return () => {
      manager.revokeAll();
    };
  }, []);

  const messagesCollection = useMemo(() => database.get<Message>("history"), [database]);
  const conversationsCollection = useMemo(
    () => database.get<Conversation>("conversations"),
    [database]
  );

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

  const mediaCtx = useMemo(
    () => ({
      database,
      walletAddress,
      signMessage,
      embeddedWalletSigner,
    }),
    [database, walletAddress, signMessage, embeddedWalletSigner]
  );

  const activeToolSetsRef = useRef<string[] | undefined>(activeToolSets);
  activeToolSetsRef.current = activeToolSets;

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
      singleTenant: true,
    }),
    [database, vaultMemoryCollection, walletAddress, signMessage, embeddedWalletSigner]
  );

  const vaultEmbeddingCache = useMemo(
    () => getVaultEmbeddingCache(database, walletAddress, embeddingModel),
    [database, walletAddress, embeddingModel]
  );

  const entityCollection = useMemo(() => database.get<EntityModel>("entity"), [database]);
  const memoryEntityCollection = useMemo(
    () => database.get<MemoryEntityModel>("memory_entity"),
    [database]
  );
  const entityCtx = useMemo<EntityOperationsContext>(
    () => ({
      database,
      entityCollection,
      memoryEntityCollection,
      ...(walletAddress !== undefined && { userId: walletAddress }),
      allowUnscopedRows: true,
    }),
    [database, entityCollection, memoryEntityCollection, walletAddress]
  );

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
          await createMediaBatchOp(
            mCtx,
            operation.payload.mediaOptions as Parameters<typeof createMediaBatchOp>[1]
          );
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

  useEffect(() => {
    if (!walletAddress) return;
    refreshQueueStatus();
    return queueManager.onQueueChange(walletAddress, refreshQueueStatus);
  }, [walletAddress, refreshQueueStatus]);

  useEffect(() => {
    if (!walletAddress || !enableQueue || !autoFlushOnKeyAvailable || !signMessage) return;

    return onKeyAvailable(walletAddress, () => {
      flushQueue().catch((err) => {
        getLogger().warn("[useChatStorage] Auto-flush failed:", err);
      });
    });
  }, [walletAddress, enableQueue, autoFlushOnKeyAvailable, signMessage, flushQueue]);

  useEffect(() => {
    if (!getWalletAddress || walletAddress) return;

    const poller = new WalletPoller();
    return poller.startPolling(getWalletAddress, () => {
      // Wallet is now available - the parent component should update walletAddress prop
      // which triggers the onKeyAvailable auto-flush above.
      // We don't need to do anything here since state will flow through props.
    });
  }, [getWalletAddress, walletAddress]);

  const isEncryptionReady = useCallback((): boolean => {
    if (!walletAddress || !signMessage) return true;
    return hasEncryptionKey(walletAddress);
  }, [walletAddress, signMessage]);

  const pendingOpsRef = useRef<
    Array<{
      type: QueuedOperationType;
      payload: Record<string, unknown>;
      dependencies: string[];
    }>
  >([]);

  const syntheticConvIdsRef = useRef<Set<string>>(new Set());
  const syntheticConvQueueIdsRef = useRef<Map<string, string>>(new Map());

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

  const embedMessageAsync = useCallback(
    async (message: StoredMessage, mask: (text: string) => string = maskForEmbedding) => {
      if (!autoEmbedMessages || !getToken) return;
      if (message.content.length < minContentLength) return;
      try {
        const embeddingOptions = {
          getToken,
          baseUrl,
          model: embeddingModel,
        };

        if (shouldChunkMessage(message.content, DEFAULT_CHUNK_SIZE)) {
          const textChunks = chunkText(message.content);
          const chunkTexts = textChunks.map((c) => mask(c.text));
          const embeddings = await generateEmbeddings(chunkTexts, embeddingOptions);

          const messageChunks: MessageChunk[] = textChunks.map((chunk, i) => ({
            text: chunk.text,
            vector: embeddings[i],
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
          }));

          await updateMessageChunksOp(storageCtx, message.uniqueId, messageChunks, embeddingModel);
        } else {
          const embedding = await generateEmbedding(mask(message.content), embeddingOptions);
          await updateMessageEmbeddingOp(storageCtx, message.uniqueId, embedding, embeddingModel);
        }
      } catch (err) {
        getLogger().warn("[useChatStorage] Failed to embed message:", err);
      }
    },
    [
      autoEmbedMessages,
      getToken,
      baseUrl,
      embeddingModel,
      storageCtx,
      minContentLength,
      maskForEmbedding,
    ]
  );

  const createMemoryEngineTool = useCallback(
    (searchOptions?: Partial<MemoryEngineSearchOptions>): ToolConfig => {
      if (!getToken) {
        throw new Error("getToken is required for memory engine tool");
      }
      return createMemoryEngineToolBase(storageCtx, vaultEmbeddingOptions, searchOptions);
    },
    [storageCtx, getToken, vaultEmbeddingOptions]
  );

  const retainVaultMemory = useCallback(
    async (input: VaultWriteInput): Promise<RetainResult> => {
      if (memoryStore) {
        if (input.folderId !== undefined) throw new Error(NO_STORE_FOLDERS);
        return memoryStore.retain(input.content, {
          source: "manual",
          scope: input.scope,
          ...(input.factType !== undefined && { factType: input.factType }),
        });
      }
      if (!getToken) {
        throw new Error("getToken is required to retain a vault memory");
      }
      return retain(
        input.content,
        {
          vaultCtx,
          embeddingOptions: vaultEmbeddingOptions,
          vaultCache: vaultEmbeddingCache,
        },
        {
          source: "manual",
          scope: input.scope,
          ...(input.folderId !== undefined && { folderId: input.folderId }),
          ...(input.factType !== undefined && { factType: input.factType }),
        }
      );
    },
    [vaultCtx, getToken, vaultEmbeddingOptions, vaultEmbeddingCache, memoryStore]
  );

  const createMemoryVaultTool = useCallback(
    (options?: MemoryVaultToolOptions): ToolConfig => {
      const embOpts = getToken ? vaultEmbeddingOptions : undefined;
      return createMemoryVaultToolBase(
        memoryStore ?? vaultCtx,
        embOpts || memoryStore ? { write: retainVaultMemory, ...options } : options,
        embOpts,
        embOpts ? vaultEmbeddingCache : undefined
      );
    },
    [vaultCtx, getToken, vaultEmbeddingOptions, vaultEmbeddingCache, retainVaultMemory, memoryStore]
  );

  const getVaultMemories = useCallback(
    (options?: Parameters<typeof getAllVaultMemoriesOp>[1]): Promise<StoredVaultMemory[]> => {
      if (!memoryStore) return getAllVaultMemoriesOp(vaultCtx, options);
      const { folderId, levels, kinds, ...listOptions } = options ?? {};
      if (folderId !== undefined) throw new Error(NO_STORE_FOLDERS);
      if (levels !== undefined || kinds !== undefined)
        throw new Error("level and kind filters are not supported with a memoryStore");
      return memoryStore.list(listOptions);
    },
    [vaultCtx, memoryStore]
  );

  const createVaultMemory = useCallback(
    async (content: string, scope?: string): Promise<StoredVaultMemory> => {
      if (memoryStore) return memoryStore.create({ content, scope });
      const result = await createVaultMemoryOp(vaultCtx, { content, scope });
      if (getToken) {
        eagerEmbedContent(
          content,
          vaultEmbeddingOptions,
          vaultEmbeddingCache,
          vaultCtx,
          result.uniqueId,
          result.updatedAt
        ).catch((err) => {
          getLogger().warn("[useChatStorage] Failed to eagerly embed new vault memory:", err);
        });
      }
      return result;
    },
    [vaultCtx, getToken, vaultEmbeddingOptions, vaultEmbeddingCache, memoryStore]
  );

  const updateVaultMemory = useCallback(
    async (id: string, content: string, scope?: string): Promise<StoredVaultMemory | null> => {
      if (memoryStore) return memoryStore.update(id, { content, scope });
      const existing = await getVaultMemoryOp(vaultCtx, id);
      const result = await updateVaultMemoryOp(vaultCtx, id, { content, scope, embedding: null });
      if (result && getToken) {
        if (existing) {
          vaultEmbeddingCache.delete(id);
        }
        eagerEmbedContent(
          content,
          vaultEmbeddingOptions,
          vaultEmbeddingCache,
          vaultCtx,
          id,
          result.updatedAt
        ).catch((err) => {
          getLogger().warn("[useChatStorage] Failed to eagerly embed updated vault memory:", err);
        });
      }
      return result;
    },
    [vaultCtx, getToken, vaultEmbeddingOptions, vaultEmbeddingCache, memoryStore]
  );

  const deleteVaultMemory = useCallback(
    async (id: string): Promise<boolean> => {
      if (memoryStore) return memoryStore.delete(id);
      const existing = await getVaultMemoryOp(vaultCtx, id);
      const result = await deleteVaultMemoryOp(vaultCtx, id);
      if (result && existing) {
        vaultEmbeddingCache.delete(id);
      }
      return result;
    },
    [vaultCtx, vaultEmbeddingCache, memoryStore]
  );

  const chunkVectorCacheRef = useRef<ChunkVectorCache>(createChunkVectorCache());

  const clientToolEmbeddingsCacheRef = useRef<Map<string, number[]>>(new Map());

  useEffect(() => {
    if (!getToken || memoryStore) return;
    void (async () => {
      try {
        await preEmbedVaultMemories(vaultCtx, vaultEmbeddingOptions, vaultEmbeddingCache);
      } catch {
        // Non-critical: embeddings will be generated on first search
      }
    })();
  }, [vaultCtx, getToken, vaultEmbeddingOptions, vaultEmbeddingCache, memoryStore]);

  useEffect(() => {
    return onClearAllEncryptionState(() => {
      vaultEmbeddingCache.clear();
      chunkVectorCacheRef.current.clear();
    });
  }, [vaultEmbeddingCache]);

  const createMemoryVaultSearchTool = useCallback(
    (searchOptions?: MemoryVaultSearchOptions): ToolConfig => {
      if (!getToken && !memoryStore) {
        throw new Error("getToken is required for memory vault search tool");
      }
      return createMemoryVaultSearchToolBase(
        memoryStore ?? vaultCtx,
        vaultEmbeddingOptions,
        vaultEmbeddingCache,
        searchOptions
      );
    },
    [vaultCtx, getToken, vaultEmbeddingOptions, vaultEmbeddingCache, memoryStore]
  );

  const createRecallTool = useCallback(
    (toolOptions?: RecallToolOptions, callbacks?: RecallToolCallbacks): ToolConfig => {
      if (!getToken && !memoryStore) {
        throw new Error("getToken is required for recall tool");
      }
      const resolvedToolOptions: RecallToolOptions | undefined =
        toolOptions?.excludeConversationId !== undefined || !currentConversationId
          ? toolOptions
          : { ...toolOptions, excludeConversationId: currentConversationId };
      if (memoryStore && resolvedToolOptions?.folderId !== undefined)
        throw new Error(NO_STORE_FOLDERS);
      return createRecallToolBase(
        memoryStore
          ? {
              factSource: memoryStore.factSource,
              ...(getToken && { storageCtx }),
              embeddingOptions: vaultEmbeddingOptions,
              chunkCache: chunkVectorCacheRef.current,
            }
          : {
              vaultCtx,
              storageCtx,
              embeddingOptions: vaultEmbeddingOptions,
              vaultCache: vaultEmbeddingCache,
              chunkCache: chunkVectorCacheRef.current,
              entityCtx,
            },
        memoryStore ? { ...resolvedToolOptions, memoryStore } : resolvedToolOptions,
        callbacks
      );
    },
    [
      vaultCtx,
      storageCtx,
      entityCtx,
      getToken,
      vaultEmbeddingOptions,
      vaultEmbeddingCache,
      currentConversationId,
      memoryStore,
    ]
  );

  const searchVaultMemoriesFn = useCallback(
    async (
      query: string,
      searchOptions?: MemoryVaultSearchOptions
    ): Promise<VaultSearchResult[]> => {
      if (memoryStore) return (await memoryStore.factSource.search(query, searchOptions)).results;
      if (!getToken) return [];
      return searchVaultMemoriesBase(
        query,
        vaultCtx,
        vaultEmbeddingOptions,
        vaultEmbeddingCache,
        searchOptions
      );
    },
    [vaultCtx, getToken, vaultEmbeddingOptions, vaultEmbeddingCache, memoryStore]
  );

  const recallFn = useCallback(
    async (query: string, options?: RecallOptions): Promise<RecallResult> => {
      if (!getToken && !memoryStore) {
        return {
          memories: [],
          usedBudget: options?.budget ?? "low",
          reranked: false,
          candidateCount: 0,
        };
      }
      const resolvedOptions: RecallOptions | undefined =
        options?.excludeConversationId !== undefined || !currentConversationId
          ? options
          : { ...options, excludeConversationId: currentConversationId };
      if (memoryStore && resolvedOptions?.folderId !== undefined) throw new Error(NO_STORE_FOLDERS);
      return recallBase(
        query,
        memoryStore
          ? {
              factSource: memoryStore.factSource,
              ...(getToken && { storageCtx }),
              embeddingOptions: vaultEmbeddingOptions,
              chunkCache: chunkVectorCacheRef.current,
            }
          : {
              vaultCtx,
              storageCtx,
              embeddingOptions: vaultEmbeddingOptions,
              vaultCache: vaultEmbeddingCache,
              chunkCache: chunkVectorCacheRef.current,
              entityCtx,
            },
        resolvedOptions
      );
    },
    [
      vaultCtx,
      storageCtx,
      entityCtx,
      getToken,
      currentConversationId,
      vaultEmbeddingOptions,
      vaultEmbeddingCache,
      memoryStore,
    ]
  );

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
    onToolCallArgumentsDelta,
    resumable,
    onStreamMeta,
    apiType,
    preProcessors,
    smoothing,
    piiRedaction: resolvedPiiRedaction,
    onPiiRedacted,
  });

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

  const getConversation = useCallback(
    async (id: string): Promise<StoredConversation | null> => {
      return getConversationOp(storageCtx, id);
    },
    [storageCtx]
  );

  const getConversations = useCallback(async (): Promise<StoredConversation[]> => {
    return getConversationsOp(storageCtx);
  }, [storageCtx]);

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

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      const deleted = await deleteConversationOp(storageCtx, id);
      if (deleted) {
        await clearMessagesOp(storageCtx, id);
        await deleteMediaByConversationOp(mediaCtx, id);
        await cleanupConversationSummary(database, id);
        if (currentConversationId === id) {
          setCurrentConversationId(null);
        }
      }
      return deleted;
    },
    [storageCtx, mediaCtx, database, currentConversationId]
  );

  const resolveMessageFiles = useCallback(
    async (messages: StoredMessage[]): Promise<StoredMessage[]> => {
      if (walletAddress && hasEncryptionKey(walletAddress) && isOPFSSupported()) {
        try {
          const encryptionKey = await getEncryptionKey(walletAddress);
          const blobManager = blobManagerRef.current;

          const resolvedMessages = await Promise.all(
            messages.map(async (msg) => {
              const contentFileIds = [...new Set(extractFileIds(msg.content))];
              const extraFileIds = (msg.fileIds || []).filter((id) => !contentFileIds.includes(id));
              const allFileIds = [...contentFileIds, ...extraFileIds];

              if (allFileIds.length === 0) {
                return msg;
              }

              const fileIdToUrlMap = new Map<string, string>();
              for (const fileId of allFileIds) {
                let url = blobManager.getUrl(fileId);

                if (!url) {
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

              let resolvedContent = msg.content;
              for (const [fileId, url] of fileIdToUrlMap) {
                const placeholder = createFilePlaceholder(fileId);
                const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const placeholderRegex = new RegExp(escapedPlaceholder, "g");
                const replacement = `![image-${fileId}](${url})`;

                resolvedContent = resolvedContent.replace(placeholderRegex, replacement);
              }

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
          return messages;
        }
      }

      return messages;
    },
    [walletAddress]
  );

  const getMessages = useCallback(
    async (convId: string): Promise<StoredMessage[]> => {
      const messages = await getMessagesOp(storageCtx, convId);
      return resolveMessageFiles(messages);
    },
    [storageCtx, resolveMessageFiles]
  );

  const getMessagesPage = useCallback(
    async (convId: string, options: GetMessagesPageOptions): Promise<StoredMessage[]> => {
      const messages = await getMessagesPageOp(storageCtx, convId, options);
      return resolveMessageFiles(messages);
    },
    [storageCtx, resolveMessageFiles]
  );

  const getMessageSkeletons = useCallback(
    (convId: string): Promise<MessageSkeleton[]> => {
      return getMessageSkeletonsOp(storageCtx, convId);
    },
    [storageCtx]
  );

  const getMessageCount = useCallback(
    (convId: string): Promise<number> => {
      return getMessageCountOp(storageCtx, convId);
    },
    [storageCtx]
  );

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (currentConversationId) {
      if (syntheticConvIdsRef.current.has(currentConversationId)) {
        return currentConversationId;
      }

      const existing = await getConversation(currentConversationId);
      if (existing) {
        return currentConversationId;
      }

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

  const { extractAndStoreEncryptedMCPImages, storeUserFilesInOPFS } = useChatMedia({
    mediaCtx,
    mcpR2Domain,
  });

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
        embeddingCache,
        onData: perRequestOnData,
        headers,
        memoryContext,
        searchContext,
        thoughtProcess,
        getThoughtProcess,
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
        assistantUniqueId,
        piiRedaction: requestPiiRedaction,
        onFileProcessingResult,
      } = args;

      const resolvePiiForCall = (conversationIdForCall: string | null) => {
        const { redactor, forInnerSend } = resolveCallPii(requestPiiRedaction, piiRedaction, () =>
          getConversationRedactor(conversationIdForCall, nerDetectorRef.current)
        );
        return {
          callRedactor: redactor,
          callPiiRedaction: forInnerSend,
          maskForCall: (text: string): string => (redactor ? redactor.maskText(text) : text),
        };
      };

      const resolveThoughtProcess = (): ActivityPhase[] | undefined =>
        finalizeThoughtProcess(getThoughtProcess?.() || thoughtProcess);

      if (walletAddress && signMessage && !hasEncryptionKey(walletAddress)) {
        try {
          await requestEncryptionKey(walletAddress, signMessage, embeddedWalletSigner);
        } catch {
          // Key derivation failed — writes will be queued via writeOrQueue
        }
      }

      if (skipStorage) {
        const effectiveApiType = resolveApiType(requestApiType ?? apiType ?? "auto", model);
        const { callPiiRedaction, maskForCall } = resolvePiiForCall(
          explicitConversationId ?? currentConversationId
        );

        let mergedTools: ReturnType<typeof mergeTools> | undefined = undefined;
        let filteredServerTools: ServerTool[] = [];

        const isServerToolsFunction = typeof serverToolsFilter === "function";
        const needsEmbeddings =
          isServerToolsFunction || !!clientToolsFilter || !!clientTools?.length;

        let skipStorageEmbeddings: number[] | number[][] | null = null;
        let skipStorageEmbeddingsFailed = false;
        if (needsEmbeddings && getToken) {
          const extracted = extractUserMessageFromMessages(messages);
          const messageContent = resolveStoredUserContent(
            storedUserContent,
            extracted?.content ?? ""
          );
          if (messageContent.length >= MIN_CONTENT_LENGTH_FOR_TOOLS) {
            const embeddingOptions = {
              getToken,
              baseUrl,
              model: embeddingModel,
              maskInput: maskForCall,
              cache: embeddingCache
                ? maskScopedEmbeddingCache(embeddingCache, Boolean(callPiiRedaction))
                : undefined,
            };
            try {
              if (shouldChunkMessage(messageContent, DEFAULT_CHUNK_SIZE)) {
                const textChunks = chunkText(messageContent);
                skipStorageEmbeddings = await generateEmbeddings(
                  textChunks.map((c) => c.text),
                  embeddingOptions
                );
              } else {
                skipStorageEmbeddings = await generateEmbedding(messageContent, embeddingOptions);
              }
            } catch {
              skipStorageEmbeddingsFailed = true;
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
              cache: serverToolsConfig?.cache,
            });

            if (serverToolsConfig?.deferLoading?.enabled) {
              filteredServerTools = resolveDeferredServerTools(
                allServerTools,
                serverToolsFilter,
                serverToolsConfig.deferLoading
              );
            } else if (isServerToolsFunction) {
              if (skipStorageEmbeddings) {
                const toolNames = serverToolsFilter(skipStorageEmbeddings, allServerTools);
                filteredServerTools = filterServerTools(allServerTools, toolNames);
              }
              filteredServerTools = withActiveToolSetServerTools(
                filteredServerTools,
                allServerTools,
                serverToolsFilter,
                activeToolSetsRef.current,
                extraToolSets
              );
            } else {
              filteredServerTools = filterServerTools(allServerTools, serverToolsFilter);
            }
          } catch {
            // Server tools are optional
          }
        }

        let filteredClientTools = clientTools;
        let clientActivatedSetNames: ReadonlySet<string> | undefined;
        let matchedToolSets: ReadonlySet<string> = new Set();
        const toolSetConversationId = explicitConversationId ?? currentConversationId;
        if (clientToolsFilter && clientTools?.length) {
          if (!skipStorageEmbeddingsFailed) {
            const clientToolNames = clientToolsFilter(skipStorageEmbeddings, clientTools);
            filteredClientTools = clientTools.filter((t) => {
              const fn = t.function as Record<string, unknown> | undefined;
              const name = (fn?.name as string) || (t.name as string);
              return clientToolNames.includes(name);
            });
          }
        } else if (clientTools?.length && getToken) {
          const clientFilterResult = await autoFilterClientTools(
            clientTools,
            skipStorageEmbeddings,
            clientToolEmbeddingsCacheRef.current,
            { getToken, baseUrl, model: embeddingModel },
            extraToolSets,
            mergeActiveToolSets(
              activeToolSetsRef.current ?? [],
              carriedToolSets(database, toolSetConversationId)
            ),
            skipStorageEmbeddingsFailed ? "error" : "short-prompt"
          );
          filteredClientTools = clientFilterResult.tools;
          clientActivatedSetNames = clientFilterResult.activatedSetNames;
          matchedToolSets = clientFilterResult.matchedSetNames;
        }

        if (
          filteredServerTools.length > 0 ||
          (filteredClientTools && filteredClientTools.length > 0)
        ) {
          mergedTools = mergeTools(
            filteredServerTools,
            filteredClientTools,
            effectiveApiType,
            deferFormattingConfig(serverToolsFilter, serverToolsConfig?.deferLoading)
          );
        }

        if (onToolSelection) {
          try {
            onToolSelection({
              prompt: resolveStoredUserContent(
                storedUserContent,
                extractUserMessageFromMessages(messages)?.content ?? ""
              ),
              clientToolNames: (filteredClientTools ?? []).map(getToolName).filter(Boolean),
              serverToolNames: filteredServerTools.map((t) => t.name),
            });
          } catch {
            // Observability must never break the send path.
          }
        }

        const result = await baseSendMessage({
          messages,
          model,
          onData: perRequestOnData,
          onThinking,
          headers,
          memoryContext,
          searchContext,
          toolGuidance: computeToolGuidance(
            filteredServerTools,
            filteredClientTools,
            extraToolSets ?? [],
            clientActivatedSetNames
          ),
          temperature,
          maxOutputTokens,
          tools: mergedTools,
          toolChoice,
          maxToolRounds,
          reasoning,
          thinking,
          imageModel,
          apiType: effectiveApiType,
          conversationId: explicitConversationId ?? currentConversationId ?? undefined,
          piiRedaction: callPiiRedaction,
        });

        if (result.error || !result.data) {
          return {
            data: null,
            error: result.error || "Unknown error",
          };
        }
        recordToolSetTurn(database, toolSetConversationId, matchedToolSets);

        const refreshResponse = result.data;
        if (getToken) {
          Promise.resolve()
            .then(() =>
              shouldRefreshTools(getToolsChecksum(refreshResponse), serverToolsConfig?.cache)
            )
            .then((refresh) => {
              if (refresh) {
                return getServerTools({
                  baseUrl,
                  getToken,
                  forceRefresh: true,
                  cache: serverToolsConfig?.cache,
                });
              }
            })
            .catch((err) => {
              getLogger().warn("[useChatStorage] Failed to refresh server tools cache:", err);
            });
        }

        return {
          data: result.data,
          error: null,
          autoExecutedToolResults:
            "autoExecutedToolResults" in result ? result.autoExecutedToolResults : undefined,
          skipped: true,
        };
      }

      const extracted = extractUserMessageFromMessages(messages);
      if (!extracted || (!extracted.content && !extracted.files?.length)) {
        return {
          data: null,
          error: "No user message found in messages array",
        };
      }
      const contentForStorage = resolveStoredUserContent(storedUserContent, extracted.content);
      const filesForStorage = files ?? extracted.files;

      let fileContextForRequest: string | undefined;
      let fileContextIsCurrentTurn = false;
      let preprocessedFileIds: string[] = [];
      let imageContentUrls: string[] | undefined;
      let fileProcessingNotes: string | null = null;
      if (filesForStorage && filesForStorage.length > 0) {
        let fileStatuses: FileProcessingStatus[];
        try {
          const preprocessingResult = await preprocessFiles(filesForStorage, {
            processors: fileProcessors,
            ...fileProcessingOptions,
          });

          if (preprocessingResult.extractedContent) {
            fileContextForRequest = preprocessingResult.extractedContent;
            fileContextIsCurrentTurn = true;
            preprocessedFileIds = preprocessingResult.preprocessedFileIds;
          }

          if (preprocessingResult.imageContentUrls?.length) {
            imageContentUrls = preprocessingResult.imageContentUrls;
          }
          fileStatuses = preprocessingResult.fileStatuses;
        } catch (err) {
          getLogger().error(
            "[sendMessage] File preprocessing failed — continuing without file context:",
            err
          );
          fileStatuses = filesForStorage
            .filter((f) => !(f.type ?? "").toLowerCase().startsWith("image/"))
            .map((f) => ({ fileId: f.id, fileName: f.name, status: "failed", reason: "error" }));
        }
        fileProcessingNotes = formatFileProcessingNotes(fileStatuses, {
          maxFileSizeBytes: fileProcessingOptions?.maxFileSizeBytes,
        });
        try {
          onFileProcessingResult?.(fileStatuses);
        } catch (err) {
          getLogger().warn("[sendMessage] onFileProcessingResult threw — ignoring:", err);
        }
      }

      let convId: string;
      if (explicitConversationId) {
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

      const { callRedactor, callPiiRedaction, maskForCall } = resolvePiiForCall(convId);

      const isServerToolsFunction = typeof serverToolsFilter === "function";
      const needsEmbeddings = isServerToolsFunction || !!clientToolsFilter || !!clientTools?.length;

      const embeddingsPromise: Promise<{
        embeddings?: number[] | number[][];
        failed: boolean;
      }> | null =
        needsEmbeddings && getToken
          ? (async () => {
              try {
                const embeddingOptions = {
                  getToken,
                  baseUrl,
                  model: embeddingModel,
                  maskInput: maskForCall,
                  cache: embeddingCache
                    ? maskScopedEmbeddingCache(embeddingCache, Boolean(callPiiRedaction))
                    : undefined,
                };
                if (shouldChunkMessage(contentForStorage, DEFAULT_CHUNK_SIZE)) {
                  const textChunks = chunkText(contentForStorage);
                  return {
                    embeddings: await generateEmbeddings(
                      textChunks.map((c) => c.text),
                      embeddingOptions
                    ),
                    failed: false,
                  };
                }
                if (contentForStorage.length >= MIN_CONTENT_LENGTH_FOR_TOOLS) {
                  return {
                    embeddings: await generateEmbedding(contentForStorage, embeddingOptions),
                    failed: false,
                  };
                }
                return { failed: false };
              } catch {
                return { failed: true };
              }
            })()
          : null;

      const serverToolsPromise: Promise<ServerTool[] | null> | null =
        getToken && !(Array.isArray(serverToolsFilter) && serverToolsFilter.length === 0)
          ? (async () => {
              try {
                return await getServerTools({
                  baseUrl,
                  cacheExpirationMs: serverToolsConfig?.cacheExpirationMs,
                  getToken,
                  cache: serverToolsConfig?.cache,
                });
              } catch {
                return null;
              }
            })()
          : null;

      let messagesToSend: LlmapiMessage[];

      const knownToolCallEventIds = await getToolCallEventIdsOp(storageCtx, convId);

      if (includeHistory) {
        let tail: StoredMessage[] = [];
        let replayableMessages: StoredMessage[] = [];
        let beforeMessageId: number | undefined;
        let boundaryExcludeUniqueIds: string[] | undefined;
        for (;;) {
          const page = await getMessagesPageOp(storageCtx, convId, {
            limit: maxHistoryMessages,
            beforeMessageId,
            boundaryExcludeUniqueIds,
          });
          if (page.length === 0) break;
          tail = [...page, ...tail];

          const validMessages = tail.filter((msg) => !msg.error);
          replayableMessages = prepareToolResultsForReplay(validMessages, {
            fold: foldToolResultsInHistoryRef.current === true,
            exclude: toolResultsHistoryExcludeRef.current,
            placeholder: DISPLAY_CARD_PLACEHOLDER,
          });
          if (replayableMessages.length >= maxHistoryMessages) break;
          if (page.length < maxHistoryMessages) break;
          beforeMessageId = page[0].messageId;
          boundaryExcludeUniqueIds = tail
            .filter((msg) => msg.messageId === beforeMessageId)
            .map((msg) => msg.uniqueId);
        }
        const limitedMessages = replayableMessages.slice(-maxHistoryMessages);

        if (!fileContextForRequest) {
          for (let i = limitedMessages.length - 1; i >= 0; i--) {
            const msg = limitedMessages[i];
            if (msg.thinking && msg.thinking.startsWith("[Extracted content from ")) {
              fileContextForRequest = msg.thinking;
              break;
            }
          }
        }

        const foldedHistory = limitedMessages;

        let encryptionKey: CryptoKey | undefined;
        if (walletAddress && hasEncryptionKey(walletAddress) && isOPFSSupported()) {
          try {
            encryptionKey = await getEncryptionKey(walletAddress);
          } catch {
            // Failed to get encryption key for history
          }
        }

        if (summarizeHistory && !getToken) {
          getLogger().warn(
            "[summarize] summarizeHistory is enabled but getToken is not provided — summarization will be skipped"
          );
        }
        const summaryToken = summarizeHistory && getToken ? await getToken() : null;
        const { messagesToConvert, summarySystemMessage } = await maybeSummarizeHistory({
          database,
          conversationId: convId,
          messages: foldedHistory,
          summarizeHistory,
          summaryTokenThreshold,
          summaryMinWindowMessages,
          summaryModel,
          token: summaryToken ?? "",
          baseUrl,
          redactor: callRedactor,
          onPiiRedacted,
        });

        const allFileIds = messagesToConvert.flatMap((msg) => msg.fileIds ?? []);
        let allMedia: StoredMedia[] = [];
        try {
          allMedia = allFileIds.length ? await getMediaByIdsOp(mediaCtx, allFileIds) : [];
        } catch (err) {
          getLogger().warn(
            "[sendMessage] Failed to resolve media for history (image URLs will be missing):",
            err
          );
        }
        const mediaLookup = new Map(allMedia.map((m) => [m.mediaId, m]));
        const resolveMediaByIds = (ids: string[]) =>
          Promise.resolve(ids.map((id) => mediaLookup.get(id)).filter(Boolean) as StoredMedia[]);
        const historyMessages = (
          await Promise.all(
            messagesToConvert.map((msg) =>
              storedToLlmapiMessage(msg, encryptionKey, resolveMediaByIds)
            )
          )
        ).flat();

        messagesToSend = assembleMessagesWithHistory(
          historyMessages,
          messages,
          summarySystemMessage
        );
      } else {
        messagesToSend = assembleMessagesWithHistory([], messages);
      }

      if (fileContextForRequest) {
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
            messagesToSend[lastUserMessageIndex] = {
              ...lastUserMessage,
              content: lastUserMessage.content.filter((part) => {
                if (part.type === "text") return true;

                if (part.type === "input_file" && part.file) {
                  const fileId = part.file.file_id;
                  if (fileId) return !preprocessedFileIds.includes(fileId);
                  const { file_data: fileData, file_url: fileUrl } = part.file;
                  return !filesForStorage?.some(
                    (f) =>
                      preprocessedFileIds.includes(f.id) &&
                      !!f.url &&
                      (f.url === fileData || f.url === fileUrl)
                  );
                }

                if (part.type === "image_url" && part.image_url?.url) {
                  const matchesPreprocessed = filesForStorage?.some(
                    (f) => preprocessedFileIds.includes(f.id) && f.url === part.image_url?.url
                  );
                  return !matchesPreprocessed;
                }

                return true;
              }),
            };
          }
        }
      }

      if (imageContentUrls && imageContentUrls.length > 0) {
        let lastUserIdx = -1;
        for (let i = messagesToSend.length - 1; i >= 0; i--) {
          if (messagesToSend[i].role === "user") {
            lastUserIdx = i;
            break;
          }
        }
        if (lastUserIdx !== -1) {
          const msg = messagesToSend[lastUserIdx];
          const existingParts = Array.isArray(msg.content)
            ? msg.content
            : [{ type: "text" as const, text: msg.content ?? "" }];
          const imageParts = imageContentUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          }));
          messagesToSend[lastUserIdx] = {
            ...msg,
            content: [...existingParts, ...imageParts],
          };
        }
      }

      const currentTurnFileText = [
        fileContextIsCurrentTurn ? fileContextForRequest : undefined,
        fileProcessingNotes,
      ]
        .filter(Boolean)
        .join("\n\n");
      if (currentTurnFileText) {
        messagesToSend = attachFileContextToLastUserMessage(messagesToSend, currentTurnFileText);
      }

      let userFileIds: string[] = [];
      if (filesForStorage && filesForStorage.length > 0 && walletAddress && isEncryptionReady()) {
        userFileIds = await storeUserFilesInOPFS(filesForStorage, walletAddress, convId);
      }

      const userMsgOpts: CreateMessageOptions = {
        conversationId: convId,
        role: "user",
        content: contentForStorage,
        fileIds: userFileIds.length > 0 ? userFileIds : undefined,
        model,
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
          convId && syntheticConvQueueIdsRef.current.has(convId)
            ? [syntheticConvQueueIdsRef.current.get(convId)!]
            : []
        );
        storedUserMessage = userMsgResult.result;
        userMsgQueueId = userMsgResult.queueId;
      } catch (err) {
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

      if (userFileIds.length > 0 && !userMsgQueueId) {
        try {
          await updateMediaMessageIdBatchOp(mediaCtx, userFileIds, storedUserMessage.uniqueId);
        } catch {
          // Non-fatal - continue without updating messageId
        }
      }

      const startTime = Date.now();

      const effectiveApiType = resolveApiType(requestApiType ?? apiType ?? "auto", model);

      let mergedTools: ReturnType<typeof mergeTools> | undefined = undefined;
      let filteredServerTools: ServerTool[] = [];

      let userMessageEmbeddings: number[] | number[][] | undefined;
      let userMessageEmbeddingsFailed = false;

      if (embeddingsPromise) {
        const embeddingsResult = await embeddingsPromise;
        userMessageEmbeddings = embeddingsResult.embeddings;
        userMessageEmbeddingsFailed = embeddingsResult.failed;
      }

      if (serverToolsPromise) {
        const allServerTools = await serverToolsPromise;
        if (allServerTools) {
          try {
            if (serverToolsConfig?.deferLoading?.enabled && effectiveApiType === "responses") {
              filteredServerTools = resolveDeferredServerTools(
                allServerTools,
                serverToolsFilter,
                serverToolsConfig.deferLoading
              );
            } else if (isServerToolsFunction) {
              if (userMessageEmbeddings) {
                const toolNames = serverToolsFilter(userMessageEmbeddings, allServerTools);
                filteredServerTools = filterServerTools(allServerTools, toolNames);
              }
              filteredServerTools = withActiveToolSetServerTools(
                filteredServerTools,
                allServerTools,
                serverToolsFilter,
                activeToolSetsRef.current,
                extraToolSets
              );
            } else {
              filteredServerTools = filterServerTools(allServerTools, serverToolsFilter);
            }
          } catch {
            // Server tools are optional - continue without them
          }
        }
      }

      let filteredClientTools = clientTools;
      let clientActivatedSetNames: ReadonlySet<string> | undefined;
      let matchedToolSets: ReadonlySet<string> = new Set();
      if (clientToolsFilter && clientTools?.length) {
        if (!userMessageEmbeddingsFailed) {
          const clientToolNames = clientToolsFilter(userMessageEmbeddings ?? null, clientTools);
          filteredClientTools = clientTools.filter((t) => {
            const fn = t.function as Record<string, unknown> | undefined;
            const name = (fn?.name as string) || (t.name as string);
            return clientToolNames.includes(name);
          });
        }
      } else if (clientTools?.length && getToken) {
        const clientFilterResult = await autoFilterClientTools(
          clientTools,
          userMessageEmbeddings ?? null,
          clientToolEmbeddingsCacheRef.current,
          { getToken, baseUrl, model: embeddingModel },
          extraToolSets,
          mergeActiveToolSets(activeToolSetsRef.current ?? [], carriedToolSets(database, convId)),
          userMessageEmbeddingsFailed ? "error" : "short-prompt"
        );
        filteredClientTools = clientFilterResult.tools;
        clientActivatedSetNames = clientFilterResult.activatedSetNames;
        matchedToolSets = clientFilterResult.matchedSetNames;
      }

      if (!userMsgQueueId) {
        if (userMessageEmbeddings && autoEmbedMessages) {
          if (Array.isArray(userMessageEmbeddings[0])) {
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
            ).catch((err) => {
              getLogger().warn(
                "[useChatStorage] Failed to persist chunked embeddings for user message:",
                err
              );
            });
          } else {
            updateMessageEmbeddingOp(
              storageCtx,
              storedUserMessage.uniqueId,
              userMessageEmbeddings as number[],
              embeddingModel
            ).catch((err) => {
              getLogger().warn(
                "[useChatStorage] Failed to persist embedding for user message:",
                err
              );
            });
          }
        } else {
          void embedMessageAsync(storedUserMessage, maskForCall);
        }
      }

      if (
        filteredServerTools.length > 0 ||
        (filteredClientTools && filteredClientTools.length > 0)
      ) {
        mergedTools = mergeTools(
          filteredServerTools,
          filteredClientTools,
          effectiveApiType,
          deferFormattingConfig(serverToolsFilter, serverToolsConfig?.deferLoading)
        );
      }

      if (onToolSelection) {
        try {
          onToolSelection({
            prompt: contentForStorage,
            clientToolNames: (filteredClientTools ?? []).map(getToolName).filter(Boolean),
            serverToolNames: filteredServerTools.map((t) => t.name),
          });
        } catch {
          // Observability must never break the send path.
        }
      }

      const result = await baseSendMessage({
        messages: messagesToSend,
        model,
        onData: perRequestOnData,
        headers,
        memoryContext,
        searchContext,
        fileContext: fileContextIsCurrentTurn ? undefined : fileContextForRequest,
        toolGuidance: computeToolGuidance(
          filteredServerTools,
          filteredClientTools,
          extraToolSets ?? [],
          clientActivatedSetNames
        ),
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
        conversationId: convId,
        piiRedaction: callPiiRedaction,
      });

      const responseDuration = (Date.now() - startTime) / 1000;

      if (result.error || !result.data) {
        const abortedResult = result as {
          data: ApiResponse | null;
          error: string;
        };

        if (abortedResult.error === "Request aborted") {
          const extracted = abortedResult.data
            ? extractAssistantText(abortedResult.data)
            : { content: "", thinking: undefined as string | undefined };
          const assistantContent = extracted.content;
          const abortedThinkingContent = extracted.thinking;

          const responseModel = abortedResult.data?.model || model || "";

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
              thoughtProcess: resolveThoughtProcess(),
              thinking: abortedThinkingContent,
              parentMessageId: storedUserMessage.uniqueId,
              uniqueId: assistantUniqueId,
            });

            void embedMessageAsync(storedAssistantMessage, maskForCall);

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

            recordToolSetTurn(database, convId, matchedToolSets);
            return {
              data: responseData,
              error: null,
              userMessage: storedUserMessage,
              assistantMessage: storedAssistantMessage,
            };
          } catch {
            return {
              data: null,
              error: "Request aborted",
              userMessage: storedUserMessage,
            };
          }
        }

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
            uniqueId: assistantUniqueId,
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
      recordToolSetTurn(database, convId, matchedToolSets);

      const responseData = result.data;
      let assistantContent = "";
      let thinkingContent: string | undefined;

      if ("output" in responseData && Array.isArray(responseData.output)) {
        type OutputItem = { type?: string; content?: Array<{ text?: string }> };
        const outputItems = (responseData.output as OutputItem[]).filter(Boolean);
        const messageOutput = outputItems.find((item) => item?.type === "message");
        assistantContent = messageOutput?.content?.map((part) => part.text || "").join("") || "";

        const reasoningOutput = outputItems.find((item) => item?.type === "reasoning");
        thinkingContent =
          reasoningOutput?.content?.map((part) => part.text || "").join("") || undefined;
      } else if ("choices" in responseData && responseData.choices) {
        const completionsData = responseData;
        const choice = completionsData.choices?.[0];
        const message = choice?.message;
        if (message?.content) {
          if (Array.isArray(message.content)) {
            assistantContent = message.content
              .map((part: { text?: string }) => part.text || "")
              .join("");
          } else {
            assistantContent = String(message.content);
          }
        }
      }

      const currentTurnToolCallEvents = getToolCallEvents(responseData)?.filter(
        (evt) => evt.id !== undefined && evt.id !== null && !knownToolCallEventIds.has(evt.id)
      );

      const extractedSources = extractSourcesFromToolCallEvents(currentTurnToolCallEvents).filter(
        (source: SearchSource) => !source.url?.includes(mcpR2Domain)
      );

      let cleanedContent = assistantContent.replace(/\n{3,}/g, "\n\n");

      let assistantFileIds: string[] = [];
      let mcpImageModel: string | undefined;

      if (walletAddress && isEncryptionReady()) {
        const result = await extractAndStoreEncryptedMCPImages(
          cleanedContent,
          walletAddress,
          convId,
          currentTurnToolCallEvents
        );
        assistantFileIds = result.fileIds;
        cleanedContent = result.cleanedContent;
        mcpImageModel = result.imageModel;
      } else {
        mcpImageModel = extractMCPImageUrls("", currentTurnToolCallEvents, mcpR2Domain).find(
          (u) => u.mediaType === "image"
        )?.model;
      }

      const resolvedImageModel = imageModel || getImageModel(responseData) || mcpImageModel;

      const assistantMsgOpts: CreateMessageOptions = {
        conversationId: convId,
        role: "assistant",
        content: cleanedContent,
        model: responseData.model || model,
        imageModel: resolvedImageModel,
        fileIds: assistantFileIds.length > 0 ? assistantFileIds : undefined,
        usage: convertUsageToStored(responseData),
        responseDuration,
        sources: extractedSources,
        thoughtProcess: resolveThoughtProcess(),
        thinking: thinkingContent,
        parentMessageId: storedUserMessage.uniqueId,
        toolCallEvents:
          currentTurnToolCallEvents && currentTurnToolCallEvents.length > 0
            ? currentTurnToolCallEvents
            : undefined,
        uniqueId: assistantUniqueId,
      };

      let storedAssistantMessage: StoredMessage;
      let assistantMsgQueueId: string | undefined;
      try {
        const assistantMsgResult = await writeOrQueue(
          "createMessage",
          assistantMsgOpts,
          () => createMessageOp(storageCtx, assistantMsgOpts),
          () => makeSyntheticStoredMessage(assistantMsgOpts),
          userMsgQueueId ? [userMsgQueueId] : []
        );
        storedAssistantMessage = assistantMsgResult.result;
        assistantMsgQueueId = assistantMsgResult.queueId;

        if (!assistantMsgResult.queued) {
          void embedMessageAsync(storedAssistantMessage, maskForCall);
        }
      } catch (err) {
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

      const autoToolResults = (result as Record<string, unknown>).autoExecutedToolResults as
        | { name: string; result: unknown }[]
        | undefined;
      let storedToolResultsMessage: StoredMessage | undefined;
      if (autoToolResults && autoToolResults.length > 0) {
        const toolResultsOpts: CreateMessageOptions = {
          conversationId: convId,
          role: "user",
          content: buildToolResultContent(autoToolResults),
          model: "",
          parentMessageId: storedAssistantMessage.uniqueId,
          origin: TOOL_RESULT_ORIGIN,
        };
        try {
          const toolResultsWrite = await writeOrQueue(
            "createMessage",
            toolResultsOpts,
            () => createMessageOp(storageCtx, toolResultsOpts),
            () => makeSyntheticStoredMessage(toolResultsOpts),
            assistantMsgQueueId ? [assistantMsgQueueId] : []
          );
          storedToolResultsMessage = toolResultsWrite.result;
        } catch {
          // Non-critical — the tool result will still be available in memory
        }
      }

      if (getToken) {
        Promise.resolve()
          .then(() => shouldRefreshTools(getToolsChecksum(responseData), serverToolsConfig?.cache))
          .then((refresh) => {
            if (refresh) {
              return getServerTools({
                baseUrl,
                getToken,
                forceRefresh: true,
                cache: serverToolsConfig?.cache,
              });
            }
          })
          .catch((err) => {
            getLogger().warn("[useChatStorage] Failed to refresh server tools cache:", err);
          });
      }

      return {
        data: responseData,
        error: null,
        userMessage: storedUserMessage,
        assistantMessage: storedAssistantMessage,
        autoExecutedToolResults: autoToolResults,
        toolResultsMessage: storedToolResultsMessage,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omitting stable refs and config values that don't change identity
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
    updateConversationPinned,
    deleteConversation,
    getMessages,
    getMessagesPage,
    getMessageSkeletons,
    getMessageCount,
    getAllFiles,
    createMemoryEngineTool,
    createMemoryVaultTool,
    retainVaultMemory,
    createMemoryVaultSearchTool,
    createRecallTool,
    recall: recallFn,
    searchVaultMemories: searchVaultMemoriesFn,
    vaultEmbeddingCache,
    getVaultMemories,
    createVaultMemory,
    updateVaultMemory,
    deleteVaultMemory,
    flushQueue,
    clearQueue,
    queueStatus,
  };
}
