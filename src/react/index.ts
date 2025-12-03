export { useChat } from "./useChat";
export {
  useEncryption,
  encryptData,
  decryptData,
  decryptDataBytes,
} from "./useEncryption";

export { useMemory } from "./useMemory";
export { useModels } from "./useModels";
export { useSearch } from "./useSearch";
export { useImageGeneration } from "./useImageGeneration";
export {
  formatMemoriesForChat,
  createMemoryContextSystemMessage,
  extractConversationContext,
} from "../lib/memory/chat";

// Tool types for client-side tools
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
