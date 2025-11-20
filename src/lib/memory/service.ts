/**
 * Memory Service - Extracts durable user memories from chat messages
 */

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

Only extract facts that will be useful in future conversations, such as identity, stable preferences, ongoing projects, skills, and constraints.

Do not extract sensitive attributes, temporary things, or single-use instructions.

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

  // Step 1: Filter out broken entries
  const validItems = items.filter((item) => {
    // Check for missing namespace, key, or value
    if (
      !item.namespace ||
      !item.key ||
      !item.value ||
      item.namespace.trim() === "" ||
      item.key.trim() === "" ||
      item.value.trim() === ""
    ) {
      console.warn(
        "Dropping memory item with missing namespace, key, or value:",
        item
      );
      return false;
    }

    // Check confidence threshold
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

  // Step 2: Deduplicate entries with same namespace + key + value
  // Keep the entry with the highest confidence
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

/**
 * Extracts facts from a user message using an LLM
 */
export const extractFacts = async (
  options: ExtractFactsOptions
): Promise<MemoryExtractionResult | null> => {
  const { api, model, message, conversationHistory = [], getToken } = options;

  try {
    // Build the prompt with conversation context
    const conversationContext = conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const fullPrompt = `${FACT_EXTRACTION_PROMPT}

Conversation context:
${conversationContext}

User message to extract facts from:
${message}

Extract facts from the user message above. Return only valid JSON.`;

    // Prepare headers
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add authorization token if provided
    if (getToken) {
      const token = await getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    // Call the API
    const response = await fetch(api, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        // Request non-streaming response for JSON parsing
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("Memory extraction failed:", response.statusText);
      return null;
    }

    // Check if response is streaming
    const contentType = response.headers.get("content-type") || "";
    const isStreaming =
      contentType.includes("text/event-stream") ||
      contentType.includes("text/plain");

    let content = "";

    if (isStreaming) {
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        console.error("No response body for streaming");
        return null;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
    } else {
      // Handle JSON response
      const data = await response.json();
      content =
        data.choices?.[0]?.message?.content?.trim() ||
        data.data?.choices?.[0]?.message?.content?.trim() ||
        data.content?.trim() ||
        "";
    }

    if (!content) {
      console.error("No content in memory extraction response");
      return null;
    }

    // Try to parse JSON from the response
    // Sometimes the response might be wrapped in markdown code blocks
    let jsonContent = content;

    // Remove any streaming prefixes if present
    jsonContent = jsonContent.replace(/^data:\s*/gm, "").trim();

    // Extract JSON from markdown code blocks if present
    const jsonMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    // Try to find JSON object in the content
    const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      jsonContent = jsonObjectMatch[0];
    }

    try {
      const result: MemoryExtractionResult = JSON.parse(jsonContent);

      // Preprocess memories: filter broken entries and deduplicate
      if (result.items && Array.isArray(result.items)) {
        const originalCount = result.items.length;
        result.items = preprocessMemories(result.items);
        const filteredCount = result.items.length;

        if (originalCount !== filteredCount) {
          console.log(
            `Preprocessed memories: ${originalCount} -> ${filteredCount} (dropped ${
              originalCount - filteredCount
            } entries)`
          );
        }
      }

      // Console log the result as requested
      console.log("Extracted memories:", JSON.stringify(result, null, 2));

      return result;
    } catch (parseError) {
      console.error("Failed to parse memory extraction JSON:", parseError);
      console.error("Raw content:", content);
      return null;
    }
  } catch (error) {
    console.error("Error extracting facts:", error);
    return null;
  }
};
