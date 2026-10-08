"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v7 as uuidv7 } from "uuid";

import type { LlmapiMessage } from "../client";
import { MCP_R2_DOMAIN } from "../clientConfig";
import { assembleMessagesWithHistory } from "../lib/chat/assembleMessages";
import { isSendableImageURL } from "../lib/chat/imageParts";
import type { StreamResumeHandle } from "../lib/chat/resumeStream";
import { StreamExpiredError } from "../lib/chat/resumeStream";
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
import { type ApiType, resolveApiType, type RunToolLoopResult } from "../lib/chat/useChat";
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
  type StorageOperationsContext,
  type StoredConversation,
  type StoredMessage,
  updateConversationPinnedOp,
  updateConversationTitleOp,
  updateMessageChunksOp,
  updateMessageErrorOp,
  upsertMessageOp,
} from "../lib/db/chat";
import { updateMessageEmbeddingOp } from "../lib/db/chat";
import { maskScopedEmbeddingCache } from "../lib/db/chat/embeddingCache";
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
  createMemoryVaultTool as createMemoryVaultToolBase,
  getVaultEmbeddingCache,
  type MemoryVaultToolOptions,
  type VaultWriteInput,
} from "../lib/memoryVault";
import type { NerDetector } from "../lib/pii/ner";
import { isPiiRedactor, PiiRedactor } from "../lib/pii/redactor";
import { IMAGE_TOOL_NAMES, toolOutputForModel } from "../lib/storage/mcpImages";
import {
  autoFilterClientTools,
  computeToolGuidance,
  deferFormattingConfig,
  filterServerTools,
  getServerTools,
  getToolName,
  mergeTools,
  MIN_CONTENT_LENGTH_FOR_TOOLS,
  resolveDeferredServerTools,
  type ServerTool,
  shouldRefreshTools,
  type ToolSet,
  withActiveToolSetServerTools,
} from "../lib/tools";
import { mergeActiveToolSets } from "../lib/tools/selection/activeToolSets";
import { carriedToolSets, recordToolSetTurn } from "../lib/tools/selection/recentToolSets";
import type { EmbeddedWalletSignerFn, SignMessageFn } from "../react/useEncryption";
import {
  hasEncryptionKey,
  onClearAllEncryptionState,
  onKeyAvailable,
  requestEncryptionKey,
} from "../react/useEncryption";
import { useChat } from "./useChat";

const CONVERSATION_REDACTOR_LIMIT = 50;
const NO_CONVERSATION_KEY = "__no_conversation__";
const conversationRedactors = new Map<string, { redactor: PiiRedactor; detector?: NerDetector }>();

const clientToolFilterCache = new Map<string, number[]>();

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
  /** Redactor for this call's summary-prompt redaction. `undefined` = off. */
  redactor: PiiRedactor | undefined;
  /**
   * Value forwarded to the inner `useChat` for the LLM request: the resolved
   * redactor instance, or `false` to disable. Always forwarded so the LLM call
   * uses the redactor keyed to THIS call's conversation rather than the inner
   * hook's own `currentConversationId`-keyed one (null on the first turn of an
   * auto-created conversation, which would orphan turn-1 placeholder mappings).
   */
  forInnerSend: boolean | PiiRedactor;
}

function resolveCallPii(
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

function storedToLlmapiMessage(stored: StoredMessage): LlmapiMessage[] {
  const content: LlmapiMessage["content"] = [{ type: "text", text: stored.content }];

  if (stored.role !== "assistant" && stored.files?.length) {
    for (const file of stored.files) {
      if (isSendableImageURL(file.url)) {
        content.push({
          type: "image_url",
          image_url: { url: file.url },
        });
      }
    }
  }

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

    const postToolText = stored.content
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
   * — e.g., pass `["documents"]` when the conversation already contains a
   * generated document, so short follow-up prompts ("make the background red")
   * still get the full document toolkit.
   *
   * Read via a ref so updates are visible to in-flight `sendMessage` calls
   * without rebuilding the callback.
   *
   * Names must match a set's `name` from `BUILT_IN_TOOL_SETS` or
   * `extraToolSets`. Unknown names are ignored.
   */
  activeToolSets?: string[];

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
  /**
   * Observability hook fired once per send with the tools actually selected for
   * the turn (after server + client filtering). Never throws into the send path.
   * Mirrors react's onToolSelection.
   */
  onToolSelection?: (info: {
    prompt: string;
    clientToolNames: string[];
    serverToolNames: string[];
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
  /**
   * Per-request PII redaction override. Takes precedence over the hook-level
   * `piiRedaction` for this call only — e.g. `false` to disable redaction for a
   * single message, or a `PiiRedactor` instance to use your own.
   */
  piiRedaction?: boolean | PiiRedactor;
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
 * - clean but EMPTY replay → `{ error: null, empty: true, assistantMessage }`
 *   (zero content replayed — the stowed partial is finalized as `wasStopped`;
 *   `assistantMessage` is null when there was no partial to fall back to)
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
  /**
   * True for a clean terminal whose replay carried NO content (a [DONE]-only
   * replay — buffered frames lost server-side). The stowed partial was
   * finalized as `wasStopped` instead of the blank; nothing was persisted when
   * there was no partial. Callers should message this as an interruption, not
   * a successful restore.
   */
  empty?: boolean;
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
   * Write one memory through `retain()` — cosine auto-merge against the vault,
   * so an explicit "save this" from a host surface (selection → memory, a
   * manual add) lands as a re-observation of an existing memory instead of a
   * duplicate row when the vault already holds the fact. The
   * `memory_vault_save` tool writes through this too. Throws without `getToken`.
   */
  retainVaultMemory: (input: VaultWriteInput) => Promise<RetainResult>;

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

  /** Get all vault memories for context injection. Soft-deleted memories are
   * excluded unless `includeDeleted` is set. */
  getVaultMemories: (
    options?: Parameters<typeof getAllVaultMemoriesOp>[1]
  ) => Promise<StoredVaultMemory[]>;

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
    extraToolSets,
    activeToolSets,
    serverTools: serverToolsConfig,
    autoEmbedMessages = true,
    embeddingModel = DEFAULT_API_EMBEDDING_MODEL,
    minContentLength = DEFAULT_MIN_CONTENT_LENGTH,
    preProcessors,
    smoothing,
    resumable = false,
    onCancelResult,
    onStreamMeta,
    onToolSelection,
    piiRedaction,
    onPiiRedacted,
    nerDetector,
    onServerToolCall,
    onToolCallArgumentsDelta,
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
  const maskEmbeddingInput = isPiiRedactor(resolvedPiiRedaction) ? maskForEmbedding : undefined;

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
      // Wallet available - parent should update walletAddress prop
    });
  }, [getWalletAddress, walletAddress]);

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
        const opts = { getToken, baseUrl, model: embeddingModel };
        if (shouldChunkMessage(message.content, DEFAULT_CHUNK_SIZE)) {
          const textChunks = chunkText(message.content);
          const embeddings = await generateEmbeddings(
            textChunks.map((c) => mask(c.text)),
            opts
          );
          const messageChunks: MessageChunk[] = textChunks.map((chunk, i) => ({
            text: chunk.text,
            vector: embeddings[i],
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
          }));
          await updateMessageChunksOp(storageCtx, message.uniqueId, messageChunks, embeddingModel);
        } else {
          const embedding = await generateEmbedding(mask(message.content), opts);
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
      return createMemoryEngineToolBase(
        storageCtx,
        { getToken, baseUrl, model: embeddingModel, maskInput: maskEmbeddingInput },
        searchOptions
      );
    },
    [storageCtx, getToken, baseUrl, embeddingModel, maskEmbeddingInput]
  );

  const vaultEmbeddingCache = useMemo(
    () => getVaultEmbeddingCache(database, walletAddress, embeddingModel),
    [database, walletAddress, embeddingModel]
  );

  const chunkVectorCacheRef = useRef<ChunkVectorCache>(createChunkVectorCache());

  useEffect(() => {
    return onClearAllEncryptionState(() => {
      vaultEmbeddingCache.clear();
      chunkVectorCacheRef.current.clear();
    });
  }, [vaultEmbeddingCache]);

  const retainVaultMemory = useCallback(
    async (input: VaultWriteInput): Promise<RetainResult> => {
      if (!getToken) {
        throw new Error("getToken is required to retain a vault memory");
      }
      return retain(
        input.content,
        {
          vaultCtx,
          embeddingOptions: {
            getToken,
            baseUrl,
            model: embeddingModel,
            maskInput: maskEmbeddingInput,
          },
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
    [vaultCtx, getToken, baseUrl, embeddingModel, maskEmbeddingInput, vaultEmbeddingCache]
  );

  const createMemoryVaultTool = useCallback(
    (options?: MemoryVaultToolOptions): ToolConfig => {
      return createMemoryVaultToolBase(
        vaultCtx,
        getToken ? { write: retainVaultMemory, ...options } : options
      );
    },
    [vaultCtx, getToken, retainVaultMemory]
  );

  const createRecallTool = useCallback(
    (toolOptions?: RecallToolOptions, callbacks?: RecallToolCallbacks): ToolConfig => {
      if (!getToken) {
        throw new Error("getToken is required for recall tool");
      }
      const resolvedToolOptions: RecallToolOptions | undefined =
        toolOptions?.excludeConversationId !== undefined || !currentConversationId
          ? toolOptions
          : { ...toolOptions, excludeConversationId: currentConversationId };
      return createRecallToolBase(
        {
          vaultCtx,
          storageCtx,
          embeddingOptions: {
            getToken,
            baseUrl,
            model: embeddingModel,
            maskInput: maskEmbeddingInput,
          },
          vaultCache: vaultEmbeddingCache,
          chunkCache: chunkVectorCacheRef.current,
        },
        resolvedToolOptions,
        callbacks
      );
    },
    [
      vaultCtx,
      storageCtx,
      getToken,
      baseUrl,
      embeddingModel,
      currentConversationId,
      maskEmbeddingInput,
      vaultEmbeddingCache,
    ]
  );

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
      const resolvedOptions: RecallOptions | undefined =
        options?.excludeConversationId !== undefined || !currentConversationId
          ? options
          : { ...options, excludeConversationId: currentConversationId };
      return recallBase(
        query,
        {
          vaultCtx,
          storageCtx,
          embeddingOptions: {
            getToken,
            baseUrl,
            model: embeddingModel,
            maskInput: maskEmbeddingInput,
          },
          vaultCache: vaultEmbeddingCache,
          chunkCache: chunkVectorCacheRef.current,
        },
        resolvedOptions
      );
    },
    [
      vaultCtx,
      storageCtx,
      getToken,
      baseUrl,
      embeddingModel,
      currentConversationId,
      maskEmbeddingInput,
      vaultEmbeddingCache,
    ]
  );

  const getVaultMemories = useCallback(
    (options?: Parameters<typeof getAllVaultMemoriesOp>[1]): Promise<StoredVaultMemory[]> => {
      return getAllVaultMemoriesOp(vaultCtx, options);
    },
    [vaultCtx]
  );

  const deleteVaultMemory = useCallback(
    (id: string): Promise<boolean> => {
      return deleteVaultMemoryOp(vaultCtx, id);
    },
    [vaultCtx]
  );

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
    smoothing,
    resumable,
    onCancelResult,
    onStreamMeta,
    piiRedaction: resolvedPiiRedaction,
    onPiiRedacted,
    onServerToolCall,
    onToolCallArgumentsDelta,
  });

  const pendingResumeRef = useRef<{
    handle: StreamResumeHandle | null;
    convId: string;
    userMessageUniqueId: string;
    assistantUniqueId?: string;
    model?: string;
    imageModel?: string;
    sources?: SearchSource[];
    thoughtProcess?: ActivityPhase[];
    embeddingMask?: (text: string) => string;
    startTime: number;
    partialData: ApiResponse | null;
    knownToolCallEventIds?: Set<string>;
  } | null>(null);
  const isResumingRef = useRef(false);

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
        await deleteMediaByConversationOp(
          { database: storageCtx.database, walletAddress, signMessage, embeddedWalletSigner },
          id
        );
        await cleanupConversationSummary(storageCtx.database, id);
        if (currentConversationId === id) {
          setCurrentConversationId(null);
        }
      }
      return deleted;
    },
    [storageCtx, currentConversationId]
  );

  const getMessages = useCallback(
    async (convId: string): Promise<StoredMessage[]> => {
      return getMessagesOp(storageCtx, convId);
    },
    [storageCtx]
  );

  const getMessagesPage = useCallback(
    async (convId: string, options: GetMessagesPageOptions): Promise<StoredMessage[]> => {
      return getMessagesPageOp(storageCtx, convId, options);
    },
    [storageCtx]
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

  const extractSourcesFromAssistantMessage = useCallback(
    (assistantMessage: { content: string; sources?: SearchSource[] }): SearchSource[] => {
      try {
        const extractedSources: SearchSource[] = [];
        const seenUrls = new Set<string>();

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

        if (foundJsonSources) {
          return extractedSources;
        }

        const markdownLinkRegex = /\[([^\]]*)\]\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

        const plainUrlRegex = /https?:\/\/[^\s<>[\]()'"]+/g;

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

        while ((match = plainUrlRegex.exec(content)) !== null) {
          const url = match[0].replace(/[.,;:!?]+$/, "").trim();

          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
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
        return [];
      }
    },
    []
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

  const activeToolSetsRef = useRef<string[] | undefined>(activeToolSets);
  activeToolSetsRef.current = activeToolSets;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

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
        onThinking: perRequestOnThinking,
        memoryContext,
        searchContext,
        apiType: requestApiType,
        sources,
        thoughtProcess,
        temperature,
        maxOutputTokens,
        clientTools,
        serverTools: serverToolsFilter,
        clientToolsFilter,
        toolChoice,
        reasoning,
        thinking,
        imageModel,
        parentMessageId,
        assistantUniqueId,
        maxToolRounds,
        getThoughtProcess,
        fileContext,
        piiRedaction: requestPiiRedaction,
        headers,
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

      pendingResumeRef.current = null;

      const effectiveAssistantUniqueId =
        assistantUniqueId ?? (resumable ? `msg_${uuidv7()}` : undefined);

      const embedToolText = (
        text: string,
        mask: (t: string) => string,
        masked: boolean,
        token: (() => Promise<string | null>) | undefined
      ): Promise<number[] | number[][]> => {
        const opts = {
          getToken: token,
          baseUrl,
          model: embeddingModel,
          maskInput: mask,
          cache: embeddingCache ? maskScopedEmbeddingCache(embeddingCache, masked) : undefined,
        };
        return shouldChunkMessage(text, DEFAULT_CHUNK_SIZE)
          ? generateEmbeddings(
              chunkText(text).map((c) => c.text),
              opts
            )
          : generateEmbedding(text, opts);
      };

      if (walletAddress && signMessage && !hasEncryptionKey(walletAddress)) {
        try {
          await requestEncryptionKey(walletAddress, signMessage, embeddedWalletSigner);
        } catch {
          // Key derivation failed — writes will be queued via writeOrQueue
        }
      }

      if (skipStorage) {
        const effectiveApiType = resolveApiType(requestApiType ?? apiType ?? "auto", model);
        const { callPiiRedaction, maskForCall } = resolvePiiForCall(currentConversationId);

        let mergedTools: ReturnType<typeof mergeTools> | undefined = undefined;
        let filteredServerTools: ServerTool[] = [];

        const isServerToolsFunction = typeof serverToolsFilter === "function";

        const extracted = extractUserMessageFromMessages(messages);
        const messageContent = resolveStoredUserContent(
          storedUserContent,
          extracted?.content ?? ""
        );
        let skipUserEmbedding: number[] | number[][] | undefined;
        let skipEmbeddingFailed = false;

        if (
          getTokenRef.current &&
          effectiveApiType === "responses" &&
          !(Array.isArray(serverToolsFilter) && serverToolsFilter.length === 0)
        ) {
          try {
            const allServerTools = await getServerTools({
              baseUrl,
              cacheExpirationMs: serverToolsConfig?.cacheExpirationMs,
              getToken: getTokenRef.current,
              cache: serverToolsConfig?.cache,
            });

            if (serverToolsConfig?.deferLoading?.enabled) {
              filteredServerTools = resolveDeferredServerTools(
                allServerTools,
                serverToolsFilter,
                serverToolsConfig.deferLoading
              );
            } else if (isServerToolsFunction) {
              if (messageContent.length >= MIN_CONTENT_LENGTH_FOR_TOOLS) {
                try {
                  skipUserEmbedding = await embedToolText(
                    messageContent,
                    maskForCall,
                    Boolean(callPiiRedaction),
                    getTokenRef.current
                  );
                  const toolNames = serverToolsFilter(skipUserEmbedding, allServerTools);
                  filteredServerTools = filterServerTools(allServerTools, toolNames);
                } catch {
                  // Embedding failed: no semantic server tools, but the sticky sets'
                  // still go (parity with react). skipEmbeddingFailed stays unset so
                  // the client block below retries the embedding.
                }
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

        let narrowedClientTools = clientTools;
        let clientActivatedSetNames: ReadonlySet<string> | undefined;
        let matchedToolSets: ReadonlySet<string> = new Set();
        if (clientTools?.length) {
          try {
            if (
              !skipUserEmbedding &&
              getTokenRef.current &&
              messageContent.length >= MIN_CONTENT_LENGTH_FOR_TOOLS
            ) {
              try {
                skipUserEmbedding = await embedToolText(
                  messageContent,
                  maskForCall,
                  Boolean(callPiiRedaction),
                  getTokenRef.current
                );
              } catch {
                skipEmbeddingFailed = true;
              }
            }
            if (typeof clientToolsFilter === "function") {
              if (!skipEmbeddingFailed) {
                const keep = new Set(clientToolsFilter(skipUserEmbedding ?? null, clientTools));
                narrowedClientTools = clientTools.filter((t) => keep.has(getToolName(t)));
              }
            } else if (getTokenRef.current) {
              const {
                tools: autoTools,
                activatedSetNames,
                matchedSetNames,
              } = await autoFilterClientTools(
                clientTools,
                skipUserEmbedding ?? null,
                clientToolFilterCache,
                { getToken: getTokenRef.current, baseUrl, model: embeddingModel },
                extraToolSets ?? [],
                mergeActiveToolSets(
                  activeToolSetsRef.current ?? [],
                  carriedToolSets(database, currentConversationId)
                ),
                skipEmbeddingFailed ? "error" : "short-prompt"
              );
              narrowedClientTools = autoTools;
              clientActivatedSetNames = activatedSetNames;
              matchedToolSets = matchedSetNames;
            }
          } catch (error) {
            getLogger().warn("[useChatStorage] client tool filtering failed (skipStorage):", error);
          }
        }

        if (
          filteredServerTools.length > 0 ||
          (narrowedClientTools && narrowedClientTools.length > 0)
        ) {
          mergedTools = mergeTools(
            filteredServerTools,
            narrowedClientTools,
            effectiveApiType,
            deferFormattingConfig(serverToolsFilter, serverToolsConfig?.deferLoading)
          );
        }

        if (onToolSelection) {
          try {
            onToolSelection({
              prompt: messageContent,
              clientToolNames: (narrowedClientTools ?? []).map(getToolName).filter(Boolean),
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
          onThinking: perRequestOnThinking,
          memoryContext,
          searchContext,
          fileContext,
          toolGuidance: computeToolGuidance(
            filteredServerTools,
            narrowedClientTools,
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
          conversationId: currentConversationId ?? undefined,
          piiRedaction: callPiiRedaction,
          headers,
        });

        if ("detached" in result && result.detached) {
          recordToolSetTurn(database, currentConversationId, matchedToolSets);
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
        recordToolSetTurn(database, currentConversationId, matchedToolSets);

        const skipRefreshGetToken = getTokenRef.current;
        const skipRefreshData = result.data;
        if (skipRefreshGetToken) {
          Promise.resolve()
            .then(() =>
              shouldRefreshTools(getToolsChecksum(skipRefreshData), serverToolsConfig?.cache)
            )
            .then((refresh) => {
              if (refresh) {
                return getServerTools({
                  baseUrl,
                  getToken: skipRefreshGetToken,
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

      let convId: string;
      try {
        convId = await ensureConversation();
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err.message : "Failed to ensure conversation",
        };
      }

      const { callRedactor, callPiiRedaction, maskForCall } = resolvePiiForCall(convId);

      const effectiveApiType = resolveApiType(requestApiType ?? apiType ?? "auto", model);

      const isServerToolsFunction = typeof serverToolsFilter === "function";

      const fetchServerToolsSettled = async (
        token: () => Promise<string | null>
      ): Promise<{ tools: ServerTool[] } | { error: unknown }> => {
        try {
          return {
            tools: await getServerTools({
              baseUrl,
              cacheExpirationMs: serverToolsConfig?.cacheExpirationMs,
              getToken: token,
              cache: serverToolsConfig?.cache,
            }),
          };
        } catch (error) {
          return { error };
        }
      };
      const embedForToolsSettled = async (
        token: () => Promise<string | null>
      ): Promise<{ embedding: number[] | number[][] } | { error: unknown }> => {
        try {
          return {
            embedding: await embedToolText(
              contentForStorage,
              maskForCall,
              Boolean(callPiiRedaction),
              token
            ),
          };
        } catch (error) {
          return { error };
        }
      };

      const serverToolsPromise =
        getTokenRef.current && !(Array.isArray(serverToolsFilter) && serverToolsFilter.length === 0)
          ? fetchServerToolsSettled(getTokenRef.current)
          : null;

      const userMessageEmbeddingPromise =
        getTokenRef.current &&
        contentForStorage.length >= MIN_CONTENT_LENGTH_FOR_TOOLS &&
        ((isServerToolsFunction &&
          !(serverToolsConfig?.deferLoading?.enabled && effectiveApiType === "responses")) ||
          !!clientTools?.length)
          ? embedForToolsSettled(getTokenRef.current)
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
        const foldedHistory = limitedMessages;

        if (summarizeHistory && !getTokenRef.current) {
          getLogger().warn(
            "[summarize] summarizeHistory is enabled but getToken is not provided — summarization will be skipped"
          );
        }
        const summaryToken =
          summarizeHistory && getTokenRef.current ? await getTokenRef.current() : null;
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

        messagesToSend = assembleMessagesWithHistory(
          messagesToConvert.flatMap(storedToLlmapiMessage),
          messages,
          summarySystemMessage
        );
      } else {
        messagesToSend = assembleMessagesWithHistory([], messages);
      }

      const sanitizedFiles = filesForStorage?.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
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

      const startTime = Date.now();

      let mergedTools = clientTools;

      let userMessageEmbedding: number[] | number[][] | undefined;
      let userMessageEmbeddingFailed = false;
      let serverFilterEmbeddingFailed = false;
      let filteredServerTools: ServerTool[] = [];

      if (
        getTokenRef.current &&
        !(Array.isArray(serverToolsFilter) && serverToolsFilter.length === 0)
      ) {
        try {
          const settledTools = await (serverToolsPromise ??
            fetchServerToolsSettled(getTokenRef.current));
          if ("error" in settledTools) throw settledTools.error;
          const allServerTools = settledTools.tools;

          if (serverToolsConfig?.deferLoading?.enabled && effectiveApiType === "responses") {
            filteredServerTools = resolveDeferredServerTools(
              allServerTools,
              serverToolsFilter,
              serverToolsConfig.deferLoading
            );
          } else if (isServerToolsFunction) {
            if (contentForStorage.length >= MIN_CONTENT_LENGTH_FOR_TOOLS) {
              const settledEmbedding = await (userMessageEmbeddingPromise ??
                embedForToolsSettled(getTokenRef.current));
              if ("error" in settledEmbedding) {
                serverFilterEmbeddingFailed = true;
              } else {
                userMessageEmbedding = settledEmbedding.embedding;
                const toolNames = serverToolsFilter(userMessageEmbedding, allServerTools);
                filteredServerTools = filterServerTools(allServerTools, toolNames);
              }
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

          if (filteredServerTools.length > 0) {
            mergedTools = mergeTools(
              filteredServerTools,
              clientTools,
              effectiveApiType,
              deferFormattingConfig(serverToolsFilter, serverToolsConfig?.deferLoading)
            );
          }
        } catch (error) {
          getLogger().warn("[useChatStorage] Failed to fetch server tools:", error);
        }
      }

      let narrowedClientTools = clientTools;
      let clientActivatedSetNames: ReadonlySet<string> | undefined;
      let matchedToolSets: ReadonlySet<string> = new Set();
      if (clientTools?.length) {
        try {
          if (
            !userMessageEmbedding &&
            getTokenRef.current &&
            contentForStorage.length >= MIN_CONTENT_LENGTH_FOR_TOOLS
          ) {
            const settledEmbedding =
              !userMessageEmbeddingPromise || serverFilterEmbeddingFailed
                ? await embedForToolsSettled(getTokenRef.current)
                : await userMessageEmbeddingPromise;
            if ("error" in settledEmbedding) {
              userMessageEmbeddingFailed = true;
            } else {
              userMessageEmbedding = settledEmbedding.embedding;
            }
          }
          if (typeof clientToolsFilter === "function") {
            if (!userMessageEmbeddingFailed) {
              const keep = new Set(clientToolsFilter(userMessageEmbedding ?? null, clientTools));
              narrowedClientTools = clientTools.filter((t) => keep.has(getToolName(t)));
            }
          } else if (getTokenRef.current) {
            const {
              tools: autoTools,
              activatedSetNames,
              matchedSetNames,
            } = await autoFilterClientTools(
              clientTools,
              userMessageEmbedding ?? null,
              clientToolFilterCache,
              { getToken: getTokenRef.current, baseUrl, model: embeddingModel },
              extraToolSets ?? [],
              mergeActiveToolSets(
                activeToolSetsRef.current ?? [],
                carriedToolSets(database, convId)
              ),
              userMessageEmbeddingFailed ? "error" : "short-prompt"
            );
            narrowedClientTools = autoTools;
            clientActivatedSetNames = activatedSetNames;
            matchedToolSets = matchedSetNames;
          }
          mergedTools =
            filteredServerTools.length > 0 || (narrowedClientTools?.length ?? 0) > 0
              ? mergeTools(
                  filteredServerTools,
                  narrowedClientTools,
                  effectiveApiType,
                  deferFormattingConfig(serverToolsFilter, serverToolsConfig?.deferLoading)
                )
              : undefined;
        } catch (error) {
          getLogger().warn("[useChatStorage] client tool filtering failed:", error);
        }
      }

      if (!userMsgQueueId) {
        if (userMessageEmbedding && autoEmbedMessages) {
          if (Array.isArray(userMessageEmbedding[0])) {
            const textChunks = chunkText(contentForStorage);
            const messageChunks: MessageChunk[] = textChunks.map((chunk, i) => ({
              text: chunk.text,
              vector: (userMessageEmbedding as number[][])[i],
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
              userMessageEmbedding as number[],
              embeddingModel
            ).catch(() => {
              // Non-fatal
            });
          }
        } else {
          void embedMessageAsync(storedUserMessage, maskForCall);
        }
      }

      if (onToolSelection) {
        try {
          onToolSelection({
            prompt: contentForStorage,
            clientToolNames: (narrowedClientTools ?? []).map(getToolName).filter(Boolean),
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
        onThinking: perRequestOnThinking,
        memoryContext,
        searchContext,
        fileContext,
        toolGuidance: computeToolGuidance(
          filteredServerTools,
          narrowedClientTools,
          extraToolSets ?? [],
          clientActivatedSetNames
        ),
        apiType: requestApiType,
        temperature,
        maxOutputTokens,
        tools: mergedTools,
        toolChoice,
        maxToolRounds,
        reasoning,
        thinking,
        imageModel,
        conversationId: convId,
        piiRedaction: callPiiRedaction,
        headers,
      });

      const responseDuration = (Date.now() - startTime) / 1000;

      const detachedResult = result as RunToolLoopResult & {
        detached?: true;
        resume?: StreamResumeHandle | null;
      };
      if (detachedResult.detached) {
        recordToolSetTurn(database, convId, matchedToolSets);
        const rowId = effectiveAssistantUniqueId ?? `msg_${uuidv7()}`;
        pendingResumeRef.current = {
          handle: detachedResult.resume ?? null,
          convId,
          userMessageUniqueId: storedUserMessage.uniqueId,
          assistantUniqueId: rowId,
          model,
          imageModel,
          sources,
          thoughtProcess: getThoughtProcess?.() || thoughtProcess,
          embeddingMask: maskForCall,
          startTime,
          partialData: detachedResult.data ?? null,
          knownToolCallEventIds,
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
              sources,
              thoughtProcess: finalizeThoughtProcess(getThoughtProcess?.() || thoughtProcess),
              thinking: abortedThinkingContent,
              parentMessageId: storedUserMessage.uniqueId,
              uniqueId: effectiveAssistantUniqueId,
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
            sources,
            thoughtProcess: finalizeThoughtProcess(getThoughtProcess?.() || thoughtProcess),
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

      const combinedSources = extractSourcesFromAssistantMessage({
        content: assistantContent,
        sources,
      });

      const jsonSourcesBlockRegex =
        /```(?:json)?\s*\{(?:(?!```)[^])*?"sources"(?:(?!```)[^])*?\}\s*```/g;
      let cleanedContent = assistantContent.replace(jsonSourcesBlockRegex, "").trim();
      cleanedContent = cleanedContent.replace(/\n{3,}/g, "\n\n");

      const currentTurnToolCallEvents = getToolCallEvents(responseData)?.filter(
        (evt) => evt.id !== undefined && evt.id !== null && !knownToolCallEventIds.has(evt.id)
      );

      const toolEventSources = extractSourcesFromToolCallEvents(currentTurnToolCallEvents);
      const seenSourceUrls = new Set(
        combinedSources.map((s) => s.url).filter((url): url is string => !!url)
      );
      const allSources = [
        ...combinedSources,
        ...toolEventSources.filter((s) => !s.url || !seenSourceUrls.has(s.url)),
      ].filter((source) => !source.url?.includes(MCP_R2_DOMAIN));

      const resolvedImageModel =
        imageModel ||
        getImageModel(responseData) ||
        extractImageModelFromToolEvents(currentTurnToolCallEvents);

      const assistantMsgOpts: CreateMessageOptions = {
        conversationId: convId,
        role: "assistant",
        content: cleanedContent,
        model: responseData.model || model,
        imageModel: resolvedImageModel,
        usage: convertUsageToStored(responseData),
        responseDuration,
        sources: allSources,
        thoughtProcess: finalizeThoughtProcess(getThoughtProcess?.() || thoughtProcess),
        thinking: thinkingContent,
        parentMessageId: storedUserMessage.uniqueId,
        toolCallEvents:
          currentTurnToolCallEvents && currentTurnToolCallEvents.length > 0
            ? currentTurnToolCallEvents
            : undefined,
        uniqueId: effectiveAssistantUniqueId,
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
        return {
          data: null,
          error: err instanceof Error ? err.message : "Failed to store assistant message",
          userMessage: storedUserMessage,
        };
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
          // Non-critical — the results are still returned in memory for this turn; only the reload
          // render loses them. Failing the send here would discard an assistant reply that is
          // already persisted.
        }
      }

      const refreshGetToken = getTokenRef.current;
      if (refreshGetToken) {
        Promise.resolve()
          .then(() => shouldRefreshTools(getToolsChecksum(responseData), serverToolsConfig?.cache))
          .then((refresh) => {
            if (refresh) {
              return getServerTools({
                baseUrl,
                getToken: refreshGetToken,
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
      maskForEmbedding,
      onPiiRedacted,
    ]
  );

  const finalizeResumedRow = useCallback(
    async (
      ctx: NonNullable<typeof pendingResumeRef.current>,
      data: ApiResponse,
      wasStopped: boolean,
      responseDuration: number
    ): Promise<StoredMessage> => {
      const { content, thinking } = extractAssistantText(data);

      let parentMessageId = ctx.userMessageUniqueId;
      let knownIds = ctx.knownToolCallEventIds;
      if (ctx.convId && (!knownIds || !parentMessageId)) {
        let storedMessages: StoredMessage[] | null = null;
        try {
          storedMessages = await getMessages(ctx.convId);
        } catch {
          // Fetch failed: no dedup possible and no parent anchor — proceed
          // with all events and (only in that failure case) a parentless row.
        }
        if (storedMessages) {
          if (!knownIds) {
            knownIds = new Set<string>();
            for (const msg of storedMessages) {
              if (msg.toolCallEvents) {
                for (const evt of msg.toolCallEvents) {
                  if (evt.id) knownIds.add(evt.id);
                }
              }
            }
          }
          if (!parentMessageId) {
            for (let i = storedMessages.length - 1; i >= 0; i--) {
              if (storedMessages[i].uniqueId !== ctx.assistantUniqueId) {
                parentMessageId = storedMessages[i].uniqueId;
                break;
              }
            }
          }
        }
      }
      const allToolCallEvents = getToolCallEvents(data);
      const currentTurnToolCallEvents = knownIds
        ? allToolCallEvents?.filter(
            (evt) => evt.id !== undefined && evt.id !== null && !knownIds.has(evt.id)
          )
        : allToolCallEvents;

      const baseSources = ctx.sources ?? [];
      const seenSourceUrls = new Set(
        baseSources.map((s) => s.url).filter((url): url is string => !!url)
      );
      const toolEventSources = extractSourcesFromToolCallEvents(currentTurnToolCallEvents);
      const sources = [
        ...baseSources,
        ...toolEventSources.filter((s) => !s.url || !seenSourceUrls.has(s.url)),
      ].filter((source) => !source.url?.includes(MCP_R2_DOMAIN));

      return upsertMessageOp(storageCtx, {
        conversationId: ctx.convId,
        role: "assistant",
        content,
        model: data.model || ctx.model || "",
        imageModel: ctx.imageModel || getImageModel(data),
        usage: convertUsageToStored(data),
        responseDuration,
        sources,
        thoughtProcess: finalizeThoughtProcess(ctx.thoughtProcess),
        thinking,
        wasStopped,
        parentMessageId,
        uniqueId: ctx.assistantUniqueId!,
      });
    },
    [storageCtx, getMessages]
  );

  const resumeStream = useCallback(
    async (
      handleOverride?: StreamResumeHandle,
      opts?: { headless?: boolean }
    ): Promise<ResumeStreamWithStorageResult> => {
      if (isResumingRef.current) {
        return { data: null, error: "Resume already in progress", assistantMessage: null };
      }
      const pending = pendingResumeRef.current;
      const pendingMatchesOverride =
        !handleOverride || pending?.handle?.inferenceId === handleOverride.inferenceId;
      const ctx: NonNullable<typeof pendingResumeRef.current> | null =
        pending && pendingMatchesOverride
          ? pending
          : handleOverride
            ? {
                handle: handleOverride,
                convId: handleOverride.conversationId ?? currentConversationId ?? "",
                userMessageUniqueId: "",
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
      const adoptedPending = pending !== null && ctx === pending;
      const foreignPending = pending !== null && !adoptedPending;
      if (!foreignPending) pendingResumeRef.current = ctx;
      const rctx = ctx;
      const clearOwnCtx = () => {
        if (pendingResumeRef.current === rctx) pendingResumeRef.current = null;
      };

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
        const result = await baseResumeStream(handle, { headless: opts?.headless });
        const responseDuration = (Date.now() - rctx.startTime) / 1000;

        const hasReplayedOutput = (data: ApiResponse | null): boolean => {
          if (!data) return false;
          const { content, thinking } = extractAssistantText(data);
          return !!content || !!thinking || (getToolCallEvents(data)?.length ?? 0) > 0;
        };

        if (result.error === null) {
          if (!hasReplayedOutput(result.data)) {
            if (hasReplayedOutput(rctx.partialData)) {
              const written = await safeFinalize(rctx.partialData!, true, responseDuration);
              if ("error" in written) {
                return { data: rctx.partialData, error: written.error, assistantMessage: null };
              }
              clearOwnCtx();
              return {
                data: rctx.partialData,
                error: null,
                empty: true,
                assistantMessage: written.message,
              };
            }
            clearOwnCtx();
            return { data: result.data, error: null, empty: true, assistantMessage: null };
          }

          const written = await safeFinalize(result.data, false, responseDuration);
          if ("error" in written) {
            return { data: result.data, error: written.error, assistantMessage: null };
          }
          clearOwnCtx();
          void embedMessageAsync(written.message, rctx.embeddingMask);
          return { data: result.data, error: null, assistantMessage: written.message };
        }

        if (result.interrupted) {
          const data = hasReplayedOutput(result.data)
            ? result.data
            : hasReplayedOutput(rctx.partialData)
              ? rctx.partialData
              : null;
          let assistantMessage: StoredMessage | null = null;
          if (data) {
            const written = await safeFinalize(data, true, responseDuration);
            if ("error" in written) {
              return { data, error: written.error, interrupted: true, assistantMessage: null };
            }
            assistantMessage = written.message;
          }
          clearOwnCtx();
          return { data, error: result.error, interrupted: true, assistantMessage };
        }

        if (!adoptedPending) clearOwnCtx();
        return {
          data: result.data,
          error: result.error,
          statusCode: result.statusCode,
          assistantMessage: null,
        };
      } catch (err) {
        if (err instanceof StreamExpiredError) {
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
          clearOwnCtx();
          return { data: rctx.partialData, error: null, expired: true, assistantMessage };
        }
        throw err;
      } finally {
        isResumingRef.current = false;
      }
    },
    [baseResumeStream, currentConversationId, finalizeResumedRow, embedMessageAsync]
  );

  const stop = useCallback(() => {
    const pending = pendingResumeRef.current;
    if (pending && pending.assistantUniqueId && !isResumingRef.current) {
      const finalize = pending;
      pendingResumeRef.current = null;
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
    getMessagesPage,
    getMessageSkeletons,
    getMessageCount,
    createMemoryEngineTool,
    createMemoryVaultTool,
    retainVaultMemory,
    createRecallTool,
    recall: recallFn,
    getVaultMemories,
    deleteVaultMemory,
    flushQueue,
    clearQueue,
    queueStatus,
  };
}
