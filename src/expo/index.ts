/**
 * React Native hooks for building AI-powered mobile applications.
 *
 * The `@anuma/sdk/expo` package provides React hooks optimized for
 * Expo and React Native environments. These hooks exclude web-only
 * dependencies (like pdfjs-dist) that aren't compatible with React Native.
 *
 * ## Installation & Setup
 *
 * Before using this package, you must set up polyfills for React Native compatibility.
 * See the {@link polyfills} module documentation for complete setup instructions.
 *
 * Quick setup summary:
 *
 * ```bash
 * pnpm install @anuma/sdk web-streams-polyfill react-native-get-random-values @ethersproject/shims buffer
 * ```
 *
 * Then create an entrypoint file with all required polyfills. See
 * [ai-example-expo](https://github.com/zeta-chain/ai-example-expo) for a complete
 * working example.
 *
 * ## Differences from React Package
 *
 * The Expo package is a lightweight subset of `@anuma/sdk/react`:
 *
 * - No PDF text extraction (pdfjs-dist is web-only)
 * - Uses XMLHttpRequest for streaming (fetch streaming isn't supported in RN)
 *
 * ## Authentication
 *
 * Use `@privy-io/expo` for authentication in React Native:
 *
 * ```typescript
 * import { PrivyProvider, usePrivy } from "@privy-io/expo";
 * import { useIdentityToken } from "@privy-io/expo";
 *
 * // Wrap your app with PrivyProvider
 * <PrivyProvider appId="your-app-id" clientId="your-client-id">
 *   <App />
 * </PrivyProvider>;
 *
 * // Get identity token for API calls
 * const { getIdentityToken } = useIdentityToken();
 * ```
 *
 * ## Quick Start
 *
 * ```tsx
 * import { useIdentityToken } from "@privy-io/expo";
 * import { useChat } from "@anuma/sdk/expo";
 *
 * function ChatScreen() {
 *   const { getIdentityToken } = useIdentityToken();
 *
 *   const { isLoading, sendMessage, stop } = useChat({
 *     getToken: getIdentityToken,
 *     baseUrl: "https://portal.anuma-dev.ai",
 *     onData: (chunk) => {
 *       // Handle streaming chunks
 *       const content =
 *         typeof chunk === "string"
 *           ? chunk
 *           : chunk.choices?.[0]?.delta?.content || "";
 *       console.log("Received:", content);
 *     },
 *     onFinish: () => console.log("Stream finished"),
 *     onError: (error) => console.error("Error:", error),
 *   });
 *
 *   const handleSend = async () => {
 *     await sendMessage({
 *       messages: [{ role: "user", content: [{ type: "text", text: "Hello!" }] }],
 *       model: "fireworks/accounts/fireworks/models/kimi-k2p5",
 *     });
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleSend} disabled={isLoading} title="Send" />
 *       {isLoading && <Button onPress={stop} title="Stop" />}
 *     </View>
 *   );
 * }
 * ```
 *
 * @module
 */

// ── Prompt pre-processors (classify-then-fetch enrichment) ──
// Parity with /server and /react — see src/react/index.ts for the rationale
// (native apps can't load the /server barrel; Metro redirects it to /react).
export type {
  CryptoPriceClassification,
  CryptoPricePreProcessorOptions,
} from "../lib/chat/cryptoPriceClassifier";
export {
  classifyCryptoPrice,
  classifyCryptoPriceBatch,
  createCryptoPricePreProcessor,
} from "../lib/chat/cryptoPriceClassifier";
export type { PromptPreProcessor, PromptPreProcessorContext } from "../lib/chat/preProcessor";
export type {
  StockPriceClassification,
  StockPricePreProcessorOptions,
} from "../lib/chat/stockPriceClassifier";
export {
  classifyStockPrice,
  classifyStockPriceBatch,
  createStockPricePreProcessor,
} from "../lib/chat/stockPriceClassifier";
export type {
  WeatherClassification,
  WeatherPreProcessorOptions,
} from "../lib/chat/weatherClassifier";
export {
  classifyWeather,
  classifyWeatherBatch,
  createWeatherPreProcessor,
} from "../lib/chat/weatherClassifier";
export type {
  WebSearchClassification,
  WebSearchPreProcessorOptions,
} from "../lib/chat/webSearchClassifier";
export {
  classifyWebSearch,
  classifyWebSearchBatch,
  createWebSearchPreProcessor,
} from "../lib/chat/webSearchClassifier";

// Resumable streaming primitives (resume handles are persisted by apps, so the
// types and header constants are part of the public surface here).
export type { ResumeStreamOptions, ResumeStreamResult } from "../lib/chat/resumeStream";
export {
  INFERENCE_ID_HEADER,
  resumeStream,
  STREAM_RESUMABLE_HEADER,
  streamCancelPath,
  StreamExpiredError,
  streamReplayPath,
} from "../lib/chat/resumeStream";
export type { StreamMetaEvent, StreamResumeHandle } from "../lib/chat/toolLoop";
export { xhrTransport } from "../lib/chat/xhrTransport";
export type { UseCreditsOptions, UseCreditsResult } from "../react/useCredits";
export { useCredits } from "../react/useCredits";
export type { UseModelsOptions, UseModelsResult } from "../react/useModels";
export { useModels } from "../react/useModels";
export { useChat } from "./useChat";
export type {
  ResumeStreamWithStorageResult,
  SendMessageWithStorageArgs,
  SendMessageWithStorageDetachedResult,
  SendMessageWithStorageResult,
  UseChatStorageOptions,
  UseChatStorageResult,
} from "./useChatStorage";
export { useChatStorage } from "./useChatStorage";

// PII redaction — mask personally identifiable information before prompts leave
// the device. Regex-based, so it is NOT a compliance guarantee: it does not
// detect names and does not scan non-text content (images/files) or tool-call
// arguments. Exported here (mirrors the root/web entry) so React Native apps
// can construct a `PiiRedactor` — e.g. to mask embedding inputs in their own
// auto-extraction wiring — since the root `@anuma/sdk` barrel is not React
// Native-safe.
export type {
  MessageRedactionResult,
  PiiCategory,
  PiiMatch,
  PiiPattern,
  PiiRedactorOptions,
  RedactionResult,
} from "../lib/pii";
export {
  createStreamingDeAnonymizer,
  isPiiRedactor,
  PII_PATTERNS,
  PiiRedactor,
  resolvePiiRedactor,
} from "../lib/pii";

// Encryption and queue
export type { FlushResult, QueueStatus } from "../lib/db/queue";
export { QueueManager, queueManager, WalletPoller } from "../lib/db/queue";
export type { EmbeddedWalletSignerFn, SignMessageFn } from "../react/useEncryption";
export {
  clearAllEncryptionKeys,
  clearAllEncryptionState,
  clearEncryptionKey,
  hasEncryptionKey,
  onKeyAvailable,
  requestEncryptionKey,
  useEncryption,
} from "../react/useEncryption";

// Consolidated SDK schema exports (recommended)
export { SDK_SCHEMA_VERSION, sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

// Database manager for per-wallet isolation
export type {
  DatabaseManagerLogger,
  DatabaseManagerOptions,
  PlatformStorage,
} from "../lib/db/manager";
export { DatabaseManager } from "../lib/db/manager";

// Re-export chat storage schema and types for database setup
export {
  Conversation as ChatConversation,
  Message as ChatMessage,
  type ChatRole,
  /** @deprecated Use sdkMigrations instead */
  chatStorageMigrations,
  /** @deprecated Use sdkSchema instead */
  chatStorageSchema,
  clearLazyTitleCache,
  type CreateConversationOptions,
  type CreateMessageOptions,
  decryptConversationTitle,
  type FileMetadata,
  generateConversationId,
  getConversationsByProjectLazyOp,
  getConversationsLazyOp,
  type GetMessagesPageOptions,
  type LazyStoredConversation,
  type MessageSkeleton,
  type SearchSource,
  type ChatCompletionUsage as StoredChatCompletionUsage,
  type StoredConversation,
  type StoredMessage,
  type StoredMessageWithSimilarity,
  upsertMessageOp,
} from "../lib/db/chat";

// Memory vault
export {
  archiveVaultMemoryOp,
  createVaultMemoriesBatchOp,
  createVaultMemoryOp,
  type CreateVaultMemoryOptions,
  type DecayCandidateRaw,
  deleteAllVaultMemoriesForUserOp,
  deleteVaultMemoryOp,
  getAllVaultMemoriesOp,
  getAllVaultMemoryContentsOp,
  getDecayCandidatesRawOp,
  getUnfiledVaultMemoriesOp,
  getVaultMemoryOp,
  restoreVaultMemoryOp,
  type StoredVaultMemory,
  VaultMemory as StoredVaultMemoryModel,
  updateVaultMemoryEmbeddingOp,
  updateVaultMemoryOp,
  type UpdateVaultMemoryOptions,
  type VaultMemoryOperationsContext,
} from "../lib/db/memoryVault";
// Vault folders
export {
  createVaultFolderOp,
  type CreateVaultFolderOptions,
  deleteVaultFolderOp,
  ensureDefaultFoldersOp,
  getAllVaultFoldersOp,
  getVaultFolderMemoryCountOp,
  moveMemoriesToFolderOp,
  type StoredVaultFolder,
  VaultFolder as StoredVaultFolderModel,
  updateVaultFolderContextOp,
  updateVaultFolderOp,
  type UpdateVaultFolderOptions,
  type VaultFolderOperationsContext,
} from "../lib/db/vaultFolders";
export {
  createMemoryVaultSearchTool,
  createMemoryVaultTool,
  createVaultEmbeddingCache,
  DEFAULT_VAULT_CACHE_SIZE,
  eagerEmbedContent,
  type MemoryVaultSearchOptions,
  type MemoryVaultToolOptions,
  preEmbedVaultMemories,
  searchVaultMemories,
  type VaultEmbeddingCache,
  type VaultSaveOperation,
  type VaultSearchResult,
} from "../lib/memoryVault";

// Server-side tools caching utilities
export type { CachedServerTools, ServerToolsOptions, ServerToolsResponse } from "../lib/tools";
export {
  clearServerToolsCache,
  DEFAULT_CACHE_EXPIRATION_MS,
  getCachedServerTools,
  getServerTools,
} from "../lib/tools";

// Memory engine (semantic search over past messages)
export type {
  ChunkingOptions,
  EmbeddingOptions as MemoryEngineEmbeddingOptions,
  MemoryEngineResult,
  MemoryEngineSearchOptions,
  QuantizedEmbedding,
  TextChunk,
} from "../lib/memoryEngine";
export {
  chunkAndEmbedAllMessages,
  // Chunking functions for sub-message semantic search
  chunkAndEmbedMessage,
  chunkText,
  // Int8 embedding quantization helpers (RAM reduction for client caches)
  cosineInt8,
  createMemoryEngineTool,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MIN_CHUNK_SIZE,
  dequantizeEmbedding,
  embedAllMessages,
  embedMessage,
  generateEmbedding,
  generateEmbeddings,
  quantizeEmbedding,
  shouldChunkMessage,
} from "../lib/memoryEngine";

// Structured logger — set a custom sink via setLogger (mobile must import
// from this entrypoint or "@anuma/sdk/react", NOT the bare barrel, which
// pulls server code and crashes under Hermes). Mirrors the react barrel.
export type { Logger } from "../lib/logger";
export { consoleLogger, getLogger, noopLogger, setLogger } from "../lib/logger";
export type { LoggerProviderProps } from "../react/LoggerProvider";
export { LoggerProvider } from "../react/LoggerProvider";

// Unified memory API surface — recall + retain + reflect + auto-extraction.
// Mirrors the react and server barrels so Expo consumers can call the
// programmatic API (recall/retain/reflect/...) in addition to wiring the
// recall_memory tool.
export type {
  AutoExtractMessage,
  AutoExtractor,
  Budget,
  ConsolidationFallbackReason,
  CreateAutoExtractorOptions,
  CreateDecaySweeperOptions,
  DecayClassifier,
  DecayInput,
  DecayPolicy,
  DecaySweeper,
  DecaySweepResult,
  DecayVerdict,
  ExtractedCandidate,
  ExtractedEntity,
  ExtractFactsOptions,
  ExtractOutcome,
  FactType,
  MemoryExtractedEvent,
  MemoryKind,
  NowSource,
  PortalLlmAuth,
  RankedMemory,
  RecallContext,
  RecallOptions,
  RecallResult,
  RecallToolCallbacks,
  RecallToolOptions,
  RecencyOptions,
  ReflectOptions,
  ReflectResult,
  RetainAction,
  RetainContext,
  RetainOptions,
  RetainResult,
  RetainSource,
  ScoreBreakdown,
  TurnCompleteEvent,
  TurnSkippedEvent,
} from "../lib/memory";
export {
  classifyDecay,
  createAutoExtractor,
  createDecaySweeper,
  createRecallTool,
  DEFAULT_DECAY_POLICY,
  extractAndRetain,
  extractFacts,
  HARD_DELETE_WINDOW_MS,
  MEDIUM_TTL_MS,
  NEVER_TTL_MS,
  PAST_EVENT_GRACE_MS,
  recall,
  RECALL_MAX_LIMIT,
  RECALL_TOOL_NAME,
  reflect,
  retain,
  SHORT_TTL_MS,
  ttlForType,
} from "../lib/memory";

// Notion OAuth primitives (platform-agnostic, no browser globals)
export type {
  NotionAuthUrlParams,
  NotionClientRegistration,
  NotionExchangeCodeParams,
  NotionOAuthEndpoints,
  NotionPKCEChallenge,
  NotionRefreshTokenParams,
  NotionTokenResponse,
} from "../lib/auth/notion-primitives";
export {
  buildNotionAuthUrl,
  discoverNotionOAuthEndpoints,
  exchangeNotionCode,
  generateNotionPKCE,
  NOTION_OAUTH_CONFIG,
  refreshNotionAccessToken,
  registerNotionClient,
} from "../lib/auth/notion-primitives";

// Notion MCP tools (platform-agnostic)
export { createNotionTools } from "../tools/notion";
