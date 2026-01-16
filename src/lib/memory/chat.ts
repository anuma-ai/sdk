import type { StoredMemory } from "../db/memory";
import { isEncrypted } from "../db/memory/encryption";

/**
 * Checks if a memory still has encrypted fields after decryption attempts.
 * If any key field is still encrypted, the memory belongs to another user
 * and should be filtered out from context.
 */
function isMemoryEncrypted(memory: StoredMemory): boolean {
  return (
    isEncrypted(memory.namespace) ||
    isEncrypted(memory.key) ||
    isEncrypted(memory.value)
  );
}

/**
 * Format memories into a context string that can be included in chat messages
 * @param memories Array of memories with similarity scores
 * @param format Format style: "compact" (key-value pairs) or "detailed" (includes evidence)
 * @returns Formatted string ready to include in system/user message
 */
export const formatMemoriesForChat = (
  memories: Array<StoredMemory & { similarity?: number }>,
  format: "compact" | "detailed" = "compact"
): string => {
  // Filter out memories that couldn't be decrypted (belong to other users)
  const decryptedMemories = memories.filter(m => !isMemoryEncrypted(m));
  
  if (decryptedMemories.length === 0) {
    return "";
  }

  const sections: string[] = [];

  const byNamespace = new Map<string, typeof decryptedMemories>();
  for (const memory of decryptedMemories) {
    if (!byNamespace.has(memory.namespace)) {
      byNamespace.set(memory.namespace, []);
    }
    byNamespace.get(memory.namespace)!.push(memory);
  }

  for (const [namespace, namespaceMemories] of byNamespace) {
    const items: string[] = [];

    for (const memory of namespaceMemories) {
      if (format === "detailed") {
        items.push(
          `- ${memory.key}: ${memory.value} (${
            memory.type
          }, confidence: ${memory.confidence.toFixed(2)}${
            memory.similarity
              ? `, relevance: ${memory.similarity.toFixed(2)}`
              : ""
          })`
        );
        if (memory.rawEvidence) {
          items.push(`  Evidence: "${memory.rawEvidence}"`);
        }
      } else {
        items.push(`${memory.key}: ${memory.value}`);
      }
    }

    if (items.length > 0) {
      sections.push(`[${namespace}]\n${items.join("\n")}`);
    }
  }

  return sections.join("\n\n");
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
