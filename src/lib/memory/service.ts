export interface MemoryItem {
  text: string;
}

export interface MemoryExtractionResult {
  items: MemoryItem[];
}

export const FACT_EXTRACTION_PROMPT = `You are a memory extraction system. Extract durable user memories from chat messages.

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, no code blocks, just pure JSON.

Extract memories as simple, natural sentences that capture facts about the user. Focus on:
- Identity facts (name, location, occupation)
- Stable preferences (food, hobbies, communication style)
- Ongoing projects and work
- Skills and expertise
- Personal constraints or requirements

Do not extract sensitive information, temporary things, or single-use instructions.

If there are no memories to extract, return: {"items": []}

Response format (JSON only, no other text):

{
  "items": [
    {"text": "Charlie's name is Charlie"},
    {"text": "Charlie works at ZetaChain"},
    {"text": "Charlie lives in San Francisco"},
    {"text": "Charlie likes to travel to Japan"},
    {"text": "Charlie prefers concise, direct answers"},
    {"text": "Charlie is in the PST timezone"},
    {"text": "Charlie likes ice cream"}
  ]
}`;

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
