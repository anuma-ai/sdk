import type { StoredMemory } from "../db/memory";

/**
 * Format memories into a context string that can be included in chat messages
 * @param memories Array of memories with similarity scores
 * @param format Format style: "compact" (simple list) or "detailed" (includes relevance scores)
 * @returns Formatted string ready to include in system/user message
 */
export const formatMemoriesForChat = (
  memories: Array<StoredMemory & { similarity?: number }>,
  format: "compact" | "detailed" = "compact"
): string => {
  if (memories.length === 0) {
    return "";
  }

  if (format === "detailed") {
    return memories
      .map(
        (m) =>
          `- ${m.text}${m.similarity ? ` (relevance: ${m.similarity.toFixed(2)})` : ""}`
      )
      .join("\n");
  }

  // Compact format - just the text
  return memories.map((m) => `- ${m.text}`).join("\n");
};

/**
 * Create a system message that includes relevant memories
 * @param memories Array of memories to include
 * @param baseSystemPrompt Optional base system prompt (memories will be prepended)
 * @returns System message content with memories
 */
export const createMemoryContextSystemMessage = (
  memories: Array<StoredMemory & { similarity?: number }>,
  baseSystemPrompt?: string
): string => {
  const memoryContext = formatMemoriesForChat(memories, "compact");

  if (!memoryContext) {
    return baseSystemPrompt || "";
  }

  const memorySection = `## User Context\n${memoryContext}\n\nUse this information to provide personalized and relevant responses.`;

  if (baseSystemPrompt) {
    return `${baseSystemPrompt}\n\n${memorySection}`;
  }

  return memorySection;
};

/**
 * Extract conversation context from messages for memory search
 * @param messages Array of chat messages
 * @param maxMessages Maximum number of recent messages to include (default: 3)
 * @returns Combined text query for memory search
 */
export const extractConversationContext = (
  messages: Array<{ role: string; content: string }>,
  maxMessages: number = 3
): string => {
  const userMessages = messages
    .filter((msg) => msg.role === "user")
    .slice(-maxMessages)
    .map((msg) => msg.content)
    .join(" ");

  return userMessages.trim();
};
