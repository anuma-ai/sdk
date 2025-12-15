/**
 *
 * The `@reverbia/sdk/react` package provides a collection of React hooks
 * designed to simplify building AI features in your applications. These hooks
 * abstract away the complexity of managing streaming responses, loading states,
 * authentication, and real-time updates, letting you focus on creating great
 * user experiences.
 *
 * ## Why Use These Hooks?
 *
 * Building AI-powered interfaces involves handling many concerns: streaming
 * responses token-by-token, managing conversation state, coordinating tool
 * execution, processing file attachments, and more. These hooks provide
 * production-ready abstractions that handle these complexities out of the box.
 *
 * **Key benefits:**
 *
 * - **Streaming-first**: Built-in support for real-time streaming with
 *   automatic UI updates as content arrives
 * - **State management**: Automatic handling of loading states, errors, and
 *   request lifecycle
 * - **Flexible providers**: Choose between API-based inference or local
 *   in-browser models for privacy-sensitive use cases
 * - **Client-side tools**: Execute tools directly in the browser with automatic
 *   context injection into LLM responses
 * - **File processing**: Extract text from PDFs and images (OCR) to provide
 *   document context to your AI
 * - **Memory & context**: Extract and retrieve relevant memories using semantic
 *   search to make your AI context-aware
 * - **Wallet-based encryption**: Secure data encryption using wallet signatures
 *   for Web3 applications
 *
 * ## Quick Start
 *
 * ```tsx
 * import { useChat } from "@reverbia/sdk/react";
 *
 * function ChatComponent() {
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
 *     <div>
 *       <button onClick={handleSend} disabled={isLoading}>Send</button>
 *       {isLoading && <button onClick={stop}>Stop</button>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @module react
 */
export { useChat } from "./useChat";
export { useChatStorage } from "./useChatStorage";
export type {
  UseChatStorageOptions,
  UseChatStorageResult,
  SendMessageWithStorageArgs,
  SendMessageWithStorageResult,
  SearchMessagesOptions,
} from "./useChatStorage";
export {
  chatStorageSchema,
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
} from "../lib/chatStorage";
export {
  useEncryption,
  requestEncryptionKey,
  hasEncryptionKey,
  encryptData,
  decryptData,
  decryptDataBytes,
} from "./useEncryption";
export type { SignMessageFn } from "./useEncryption";

export { useMemoryStorage } from "./useMemoryStorage";
export type {
  UseMemoryStorageOptions,
  UseMemoryStorageResult,
} from "./useMemoryStorage";
export {
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
} from "../lib/memoryStorage";
export { usePdf } from "./usePdf";
export type { PdfFile } from "./usePdf";
export { useOCR } from "./useOCR";
export type { OCRFile } from "./useOCR";
export { useModels } from "./useModels";
export { useSearch } from "./useSearch";
export { useImageGeneration } from "./useImageGeneration";
export {
  formatMemoriesForChat,
  createMemoryContextSystemMessage,
  extractConversationContext,
} from "../lib/memory/chat";

export type {
  ClientTool,
  ToolParameter,
  ToolExecutionResult,
  ToolSelectionResult,
} from "../lib/tools/types";
export {
  selectTool,
  executeTool,
  DEFAULT_TOOL_SELECTOR_MODEL,
} from "../lib/tools/selector";
