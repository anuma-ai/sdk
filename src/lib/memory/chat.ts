import type { StoredMemory, StoredMemoryWithSimilarity } from "../db/memory";

type MemoryWithScores = StoredMemory & {
  similarity?: number;
  finalScore?: number;
  recencyBoost?: number;
};

/**
 * Get confidence level based on similarity score
 */
const getConfidenceLevel = (
  similarity: number | undefined
): "high" | "medium" | "low" => {
  if (!similarity) return "medium";
  if (similarity >= 0.75) return "high";
  if (similarity >= 0.5) return "medium";
  return "low";
};

/**
 * Get relative time description for a date
 */
const getRelativeTime = (date: Date): string => {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

/**
 * Format memories into a context string that can be included in chat messages
 * @param memories Array of memories with similarity scores
 * @param format Format style: "compact" (simple list), "detailed" (includes relevance scores), or "grouped" (grouped by confidence)
 * @returns Formatted string ready to include in system/user message
 */
export const formatMemoriesForChat = (
  memories: Array<MemoryWithScores>,
  format: "compact" | "detailed" | "grouped" = "compact"
): string => {
  if (memories.length === 0) {
    return "";
  }

  if (format === "grouped") {
    // Group by confidence level
    const high: MemoryWithScores[] = [];
    const medium: MemoryWithScores[] = [];
    const low: MemoryWithScores[] = [];

    for (const m of memories) {
      const level = getConfidenceLevel(m.similarity);
      if (level === "high") high.push(m);
      else if (level === "medium") medium.push(m);
      else low.push(m);
    }

    const sections: string[] = [];

    if (high.length > 0) {
      sections.push(
        `[HIGH RELEVANCE]\n${high.map((m) => `- ${m.text}`).join("\n")}`
      );
    }
    if (medium.length > 0) {
      sections.push(
        `[RELATED]\n${medium.map((m) => `- ${m.text}`).join("\n")}`
      );
    }
    if (low.length > 0) {
      sections.push(
        `[POSSIBLY RELATED]\n${low.map((m) => `- ${m.text}`).join("\n")}`
      );
    }

    return sections.join("\n\n");
  }

  if (format === "detailed") {
    return memories
      .map((m) => {
        const relevance = m.similarity
          ? ` (relevance: ${m.similarity.toFixed(2)})`
          : "";
        const age = m.createdAt ? ` [${getRelativeTime(m.createdAt)}]` : "";
        return `- ${m.text}${relevance}${age}`;
      })
      .join("\n");
  }

  // Compact format - just the text
  return memories.map((m) => `- ${m.text}`).join("\n");
};

/**
 * Create a system message that includes relevant memories
 * @param memories Array of memories to include
 * @param baseSystemPrompt Optional base system prompt (memories will be prepended)
 * @param format Format style for memories (default: "grouped")
 * @returns System message content with memories
 */
export const createMemoryContextSystemMessage = (
  memories: Array<MemoryWithScores>,
  baseSystemPrompt?: string,
  format: "compact" | "detailed" | "grouped" = "grouped"
): string => {
  const memoryContext = formatMemoriesForChat(memories, format);

  if (!memoryContext) {
    return baseSystemPrompt || "";
  }

  const memorySection = `## What You Know About the User
${memoryContext}

Use these facts to provide personalized responses. Higher relevance items are more likely to be relevant to the current conversation.`;

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
