export interface MemoryItem {
  text: string;
}

export interface MemoryExtractionResult {
  items: MemoryItem[];
}

export const FACT_EXTRACTION_PROMPT = `You are a memory extraction system. Extract durable facts from chat messages.

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, no code blocks, just pure JSON.

Extract memories as simple sentences starting with VERBS (not "User"). Include SPECIFIC details:
- Names: people, places, brands, products, titles
- Numbers: quantities, prices, dates, times, durations
- Actions: what was done, bought, visited, created, attended

Good examples:
- "Works at ZetaChain as a software engineer"
- "Bought a blue Snaggletooth action figure from a thrift store"
- "Attended The Glass Menagerie at the local community theater"
- "Created a Spotify playlist called Summer Vibes"
- "Takes yoga classes at Serenity Yoga studio"
- "Assembled an IKEA bookshelf in 4 hours"
- "Prefers a 3:1 gin-to-vermouth ratio for martinis"

Bad examples (too vague):
- "User likes shopping" (missing what, where)
- "User went somewhere" (missing specific place)
- "User has a hobby" (missing which hobby)

Do not extract sensitive information or temporary things.

If there are no memories to extract, return: {"items": []}

Response format (JSON only, no other text):

{
  "items": [
    {"text": "Named Charlie"},
    {"text": "Works at ZetaChain"},
    {"text": "Lives in San Francisco"},
    {"text": "Travels to Japan frequently"},
    {"text": "Prefers concise, direct answers"},
    {"text": "Located in PST timezone"},
    {"text": "Loves ice cream"}
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
