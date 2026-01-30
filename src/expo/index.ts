/**
 * React Native hooks for building AI-powered mobile applications.
 *
 * The `@reverbia/sdk/expo` package provides React hooks optimized for
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
 * pnpm install @reverbia/sdk@next web-streams-polyfill react-native-get-random-values @ethersproject/shims buffer
 * ```
 *
 * Then create an entrypoint file with all required polyfills. See
 * [ai-example-expo](https://github.com/zeta-chain/ai-example-expo) for a complete
 * working example.
 *
 * ## Differences from React Package
 *
 * The Expo package is a lightweight subset of `@reverbia/sdk/react`:
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
 * import { useChat } from "@reverbia/sdk/expo";
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
 *       model: "openai/gpt-4o",
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

export { useChat } from "./useChat";
export { useChatStorage } from "./useChatStorage";
export type {
  UseChatStorageOptions,
  UseChatStorageResult,
  SendMessageWithStorageArgs,
  SendMessageWithStorageResult,
} from "./useChatStorage";
export { useModels } from "../react/useModels";
export type { UseModelsOptions, UseModelsResult } from "../react/useModels";

// Memory storage hooks
export { useMemoryStorage } from "./useMemoryStorage";
export type {
  UseMemoryStorageOptions,
  UseMemoryStorageResult,
} from "./useMemoryStorage";

// Consolidated SDK schema exports (recommended)
export {
  sdkSchema,
  sdkMigrations,
  sdkModelClasses,
} from "../lib/db/schema";

// Re-export chat storage schema and types for database setup
export {
  /** @deprecated Use sdkSchema instead */
  chatStorageSchema,
  /** @deprecated Use sdkMigrations instead */
  chatStorageMigrations,
  Message as ChatMessage,
  Conversation as ChatConversation,
  type ChatRole,
  type FileMetadata,
  type ChatCompletionUsage as StoredChatCompletionUsage,
  type SearchSource,
  type StoredMessage,
  type StoredMessageWithSimilarity,
  type StoredConversation,
  type CreateMessageOptions,
  type CreateConversationOptions,
  generateConversationId,
} from "../lib/db/chat";

// Re-export memory storage schema and types for database setup
export {
  /** @deprecated Use sdkSchema instead */
  memoryStorageSchema,
  Memory as StoredMemoryModel,
  type MemoryType,
  type MemoryItem,
  type StoredMemory,
  type StoredMemoryWithSimilarity,
  type CreateMemoryOptions,
  type UpdateMemoryOptions,
  generateCompositeKey,
  generateUniqueKey,
} from "../lib/db/memory";

// Server-side tools caching utilities
export {
  clearServerToolsCache,
  getServerTools,
  getCachedServerTools,
  DEFAULT_CACHE_EXPIRATION_MS,
} from "../lib/tools";
export type {
  ServerToolsOptions,
  CachedServerTools,
  ServerToolsResponse,
} from "../lib/tools";

// Memory retrieval (semantic search over past messages)
export {
  createMemoryRetrievalTool,
  embedMessage,
  embedAllMessages,
  generateEmbedding,
  generateEmbeddings,
} from "../lib/memoryRetrieval";
export type {
  MemoryRetrievalSearchOptions,
  MemoryRetrievalResult,
  EmbeddingOptions as MemoryRetrievalEmbeddingOptions,
} from "../lib/memoryRetrieval";
