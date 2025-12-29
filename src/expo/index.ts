/**
 * React Native hooks for building AI-powered mobile applications.
 *
 * The `@reverbia/sdk/expo` package provides React hooks optimized for
 * Expo and React Native environments. These hooks exclude web-only
 * dependencies (like pdfjs-dist) that aren't compatible with React Native.
 *
 * ## Differences from React Package
 *
 * The Expo package is a lightweight subset of `@reverbia/sdk/react`:
 *
 * - No PDF text extraction (pdfjs-dist is web-only)
 * - Uses XMLHttpRequest for streaming (fetch streaming isn't supported in RN)
 *
 * ## Quick Start
 *
 * ```tsx
 * import { useChat } from "@reverbia/sdk/expo";
 *
 * function ChatScreen() {
 *   const { isLoading, sendMessage, stop } = useChat({
 *     getToken: async () => getAuthToken(),
 *     onData: (chunk) => setResponse((prev) => prev + chunk),
 *   });
 *
 *   const handleSend = async () => {
 *     await sendMessage({
 *       messages: [{ role: "user", content: [{ type: "text", text: input }] }],
 *       model: "gpt-4o-mini",
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
export { useImageGeneration } from "../react/useImageGeneration";
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
