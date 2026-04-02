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
 * pnpm install @anuma/sdk@next web-streams-polyfill react-native-get-random-values @ethersproject/shims buffer
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

export { xhrTransport } from "../lib/chat/xhrTransport";
export type { UseCreditsOptions, UseCreditsResult } from "../react/useCredits";
export { useCredits } from "../react/useCredits";
export type { UseModelsOptions, UseModelsResult } from "../react/useModels";
export { useModels } from "../react/useModels";
export { useChat } from "./useChat";
export type {
  SendMessageWithStorageArgs,
  SendMessageWithStorageResult,
  UseChatStorageOptions,
  UseChatStorageResult,
} from "./useChatStorage";
export { useChatStorage } from "./useChatStorage";

// Encryption and queue
export type { FlushResult, QueueStatus } from "../lib/db/queue";
export { QueueManager, queueManager, WalletPoller } from "../lib/db/queue";
export type { EmbeddedWalletSignerFn, SignMessageFn } from "../react/useEncryption";
export {
  clearAllEncryptionKeys,
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
  type CreateConversationOptions,
  type CreateMessageOptions,
  type FileMetadata,
  generateConversationId,
  type SearchSource,
  type ChatCompletionUsage as StoredChatCompletionUsage,
  type StoredConversation,
  type StoredMessage,
  type StoredMessageWithSimilarity,
} from "../lib/db/chat";

// Memory vault
export {
  createVaultMemoriesBatchOp,
  createVaultMemoryOp,
  type CreateVaultMemoryOptions,
  deleteAllVaultMemoriesForUserOp,
  deleteVaultMemoryOp,
  getAllVaultMemoriesOp,
  getAllVaultMemoryContentsOp,
  getUnfiledVaultMemoriesOp,
  getVaultMemoryOp,
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
  createMemoryVaultTool,
  type MemoryVaultToolOptions,
  type VaultSaveOperation,
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
  EmbeddingOptions as MemoryEngineEmbeddingOptions,
  MemoryEngineResult,
  MemoryEngineSearchOptions,
} from "../lib/memoryEngine";
export {
  createMemoryEngineTool,
  embedAllMessages,
  embedMessage,
  generateEmbedding,
  generateEmbeddings,
} from "../lib/memoryEngine";

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
