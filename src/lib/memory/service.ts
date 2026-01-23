export interface MemoryItem {
  text: string;
}

export interface MemoryExtractionResult {
  items: MemoryItem[];
}

export const FACT_EXTRACTION_PROMPT = `You are a memory extraction system. Extract durable user memories from this chat conversation.

CRITICAL: Respond with ONLY valid JSON. No explanations, no markdown, just pure JSON.

Extract memories as simple, natural sentences that capture facts about the user. Focus on:
- Identity facts (name, location, occupation)
- Stable preferences (food, hobbies, communication style)
- Ongoing projects and work
- Skills and expertise
- Personal constraints or requirements

Response format:
{
  "items": [
    {"text": "User's name is John"},
    {"text": "User works at Acme Corp"},
    {"text": "User prefers tea over coffee"}
  ]
}

If no memories to extract, return: {"items": []}`;

export interface ExtractFactsOptions {
  api: string;
  model: string;
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  getToken?: () => Promise<string | null>;
}

/**
 * Pre-processes memory items to filter invalid entries
 * @param items Array of memory items to preprocess
 * @returns Preprocessed array of memory items
 */
export const preprocessMemories = (items: MemoryItem[]): MemoryItem[] => {
  if (!items || !Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => {
      if (!item.text || typeof item.text !== "string") {
        console.warn("Dropping memory item with invalid text:", item);
        return false;
      }

      const text = item.text.trim();
      if (text === "" || text.length < 3) {
        console.warn(
          "Dropping memory item with empty or too short text:",
          item
        );
        return false;
      }

      return true;
    })
    .map((item) => ({ text: item.text.trim() }));
};
