export interface MemoryItem {
  type: "identity" | "preference" | "project" | "skill" | "constraint";
  namespace: string;
  key: string;
  value: string;
  rawEvidence: string;
  confidence: number;
  pii: boolean;
}

export interface MemoryExtractionResult {
  items: MemoryItem[];
}

export const FACT_EXTRACTION_PROMPT = `You are a memory extraction system. Extract durable user memories from chat messages.

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, no code blocks, just pure JSON.

Only store clear, factual statements that might be relevant for future context or reference. Extract facts that will be useful in future conversations, such as identity, stable preferences, ongoing projects, skills, locations, favorites, and constraints.

Do not extract sensitive attributes, temporary things, or single-use instructions.

You must also extract stable personal preferences, including food likes/dislikes, hobbies, favorite items, favorite genres, or other enduring tastes. 

If there are no memories to extract, return: {"items": []}

Response format (JSON only, no other text):

{
  "items": [
    {
      "type": "identity",
      "namespace": "identity",
      "key": "name",
      "value": "Charlie",
      "rawEvidence": "I'm Charlie",
      "confidence": 0.98,
      "pii": true
    },
    {
      "type": "identity",
      "namespace": "work",
      "key": "company",
      "value": "ZetaChain",
      "rawEvidence": "called ZetaChain",
      "confidence": 0.99,
      "pii": false
    },
    {
      "type": "identity",
      "namespace": "location",
      "key": "city",
      "value": "San Francisco",
      "rawEvidence": "I live in San Francisco",
      "confidence": 0.99,
      "pii": false
    },
    {
      "type": "preference",
      "namespace": "location",
      "key": "country",
      "value": "Japan",
      "rawEvidence": "I like to travel to the Japan",
      "confidence": 0.94,
      "pii": false
    },
    {
      "type": "preference",
      "namespace": "answer_style",
      "key": "verbosity",
      "value": "concise_direct",
      "rawEvidence": "I prefer concise, direct answers",
      "confidence": 0.96,
      "pii": false
    },
    {
      "type": "identity",
      "namespace": "timezone",
      "key": "tz",
      "value": "America/Los_Angeles",
      "rawEvidence": "I'm in PST",
      "confidence": 0.9,
      "pii": false
    },
    {
      "type": "preference",
      "namespace": "food",
      "key": "likes_ice_cream",
      "value": "ice cream",
      "rawEvidence": "I like ice cream",
      "confidence": 0.95,
      "pii": false
    }
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
 * Pre-processes memory items to filter broken entries and deduplicate
 * @param items Array of memory items to preprocess
 * @param minConfidence Minimum confidence threshold (default: 0.6)
 * @returns Preprocessed array of memory items
 */
export const preprocessMemories = (
  items: MemoryItem[],
  minConfidence: number = 0.6
): MemoryItem[] => {
  if (!items || !Array.isArray(items)) {
    return [];
  }

  const validItems = items.filter((item) => {
    if (item.namespace == null || item.key == null || item.value == null) {
      console.warn(
        "Dropping memory item with null/undefined namespace, key, or value:",
        item
      );
      return false;
    }

    const namespace = String(item.namespace).trim();
    const key = String(item.key).trim();
    const value = String(item.value).trim();

    if (namespace === "" || key === "" || value === "") {
      console.warn(
        "Dropping memory item with empty namespace, key, or value after trimming:",
        item
      );
      return false;
    }

    if (
      typeof item.confidence !== "number" ||
      item.confidence < minConfidence
    ) {
      console.warn(
        `Dropping memory item with confidence ${item.confidence} below threshold ${minConfidence}:`,
        item
      );
      return false;
    }

    return true;
  });

  const deduplicatedMap = new Map<string, MemoryItem>();

  for (const item of validItems) {
    const uniqueKey = `${item.namespace}:${item.key}:${item.value}`;
    const existing = deduplicatedMap.get(uniqueKey);

    if (!existing || item.confidence > existing.confidence) {
      deduplicatedMap.set(uniqueKey, item);
    } else {
      console.debug(
        `Deduplicating memory item: keeping entry with higher confidence (${existing.confidence} > ${item.confidence})`,
        { namespace: item.namespace, key: item.key, value: item.value }
      );
    }
  }

  return Array.from(deduplicatedMap.values());
};
