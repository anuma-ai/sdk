"use client";

import { useCallback, useRef } from "react";
import { postApiV1ChatCompletions } from "../client";
import type { MemoryExtractionResult } from "../lib/memory/service";
import { preprocessMemories } from "../lib/memory/service";
import { saveMemories } from "../lib/memory/db";
import { FACT_EXTRACTION_PROMPT } from "../lib/memory/service";
import {
  generateAndStoreEmbeddings,
  generateQueryEmbedding,
} from "../lib/memory/embeddings";
import { searchSimilarMemories } from "../lib/memory/db";

export type UseMemoryOptions = {
  /**
   * The model to use for fact extraction (default: "openai/gpt-4o")
   */
  memoryModel?: string;
  /**
   * The model to use for generating embeddings (default: "openai/text-embedding-3-small")
   * Set to null/undefined to disable embedding generation
   */
  embeddingModel?: string | null;
  /**
   * Whether to automatically generate embeddings for extracted memories (default: true)
   */
  generateEmbeddings?: boolean;
  /**
   * Callback when facts are extracted
   */
  onFactsExtracted?: (facts: MemoryExtractionResult) => void;
  /**
   * Custom function to get auth token for API calls
   */
  getToken?: () => Promise<string | null>;
};

export type UseMemoryResult = {
  extractMemoriesFromMessage: (options: {
    messages: Array<{ role: string; content: string }>;
    model: string;
  }) => Promise<MemoryExtractionResult | null>;
  /**
   * Search for similar memories using semantic search
   * @param query The text query to search for
   * @param limit Maximum number of results (default: 10)
   * @param minSimilarity Minimum similarity threshold 0-1 (default: 0.6)
   *   Note: Embedding similarity scores are typically lower than expected.
   *   A score of 0.6-0.7 is usually a good match, 0.5-0.6 is moderate.
   * @returns Array of memories with similarity scores, sorted by relevance
   */
  searchMemories: (
    query: string,
    limit?: number,
    minSimilarity?: number
  ) => Promise<
    Array<import("../lib/memory/db").StoredMemoryItem & { similarity: number }>
  >;
};

/**
 * Standalone hook for extracting memories from user messages.
 * Can be composed with other hooks like useChat, useFiles, etc.
 */
export function useMemory(options: UseMemoryOptions = {}): UseMemoryResult {
  const {
    memoryModel = "openai/gpt-4o",
    embeddingModel = "openai/text-embedding-3-small",
    generateEmbeddings = true,
    onFactsExtracted,
    getToken,
  } = options;

  const extractionInProgressRef = useRef(false);

  const extractMemoriesFromMessage = useCallback(
    async (options: {
      messages: Array<{ role: string; content: string }>;
      model: string;
    }): Promise<MemoryExtractionResult | null> => {
      const { messages, model } = options;

      if (!getToken || extractionInProgressRef.current) {
        return null;
      }

      extractionInProgressRef.current = true;

      try {
        const token = await getToken();
        if (!token) {
          console.error("No access token available for memory extraction");
          return null;
        }

        const completion = await postApiV1ChatCompletions({
          body: {
            messages: [
              {
                role: "system",
                content: FACT_EXTRACTION_PROMPT,
              },
              ...messages,
            ],
            model: model || memoryModel,
          },
        });

        if (!completion.data) {
          console.error(
            "Memory extraction failed:",
            completion.error?.error ?? "API did not return a response"
          );
          return null;
        }

        const content =
          completion.data.choices?.[0]?.message?.content?.trim() || "";

        if (!content) {
          console.error("No content in memory extraction response");
          return null;
        }

        let jsonContent = content;

        jsonContent = jsonContent.replace(/^data:\s*/gm, "").trim();

        if (jsonContent.startsWith("{")) {
          let braceCount = 0;
          let jsonStart = -1;
          let jsonEnd = -1;

          for (let i = 0; i < jsonContent.length; i++) {
            if (jsonContent[i] === "{") {
              if (jsonStart === -1) jsonStart = i;
              braceCount++;
            } else if (jsonContent[i] === "}") {
              braceCount--;
              if (braceCount === 0 && jsonStart !== -1) {
                jsonEnd = i + 1;
                break;
              }
            }
          }

          if (jsonStart !== -1 && jsonEnd !== -1) {
            jsonContent = jsonContent.substring(jsonStart, jsonEnd);
          }
        } else {
          const jsonMatch = jsonContent.match(
            /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
          );
          if (jsonMatch && jsonMatch[1]) {
            jsonContent = jsonMatch[1].trim();
          } else {
            const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
            if (jsonObjectMatch && jsonObjectMatch[0]) {
              jsonContent = jsonObjectMatch[0];
            } else {
              console.warn(
                "Memory extraction returned non-JSON response. The model may not have found any memories to extract, or it returned natural language instead of JSON.",
                "\nFirst 200 chars of response:",
                content.substring(0, 200)
              );
              return { items: [] };
            }
          }
        }

        const trimmedJson = jsonContent.trim();
        if (!trimmedJson.startsWith("{") || !trimmedJson.includes("items")) {
          console.warn(
            "Memory extraction response doesn't appear to be valid JSON. " +
              "The model may not have found any memories to extract, or returned natural language instead of JSON.",
            "\nResponse preview:",
            content.substring(0, 200)
          );
          return { items: [] };
        }

        let result: MemoryExtractionResult;
        try {
          result = JSON.parse(jsonContent);

          if (!result || typeof result !== "object") {
            throw new Error("Invalid JSON structure: not an object");
          }

          if (!Array.isArray(result.items)) {
            console.warn(
              "Memory extraction result missing 'items' array. Result:",
              result
            );
            return { items: [] };
          }
        } catch (parseError) {
          console.error(
            "Failed to parse memory extraction JSON:",
            parseError instanceof Error ? parseError.message : parseError
          );
          console.error("Attempted to parse:", jsonContent.substring(0, 200));
          console.error("Full raw content:", content.substring(0, 500));
          return { items: [] };
        }

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

        console.log("Extracted memories:", JSON.stringify(result, null, 2));

        if (result.items && result.items.length > 0) {
          try {
            await saveMemories(result.items);
            console.log(`Saved ${result.items.length} memories to IndexedDB`);

            if (generateEmbeddings && embeddingModel) {
              try {
                await generateAndStoreEmbeddings(result.items, {
                  model: embeddingModel,
                  getToken: getToken || undefined,
                });
                console.log(
                  `Generated embeddings for ${result.items.length} memories`
                );
              } catch (error) {
                console.error("Failed to generate embeddings:", error);
              }
            }
          } catch (error) {
            console.error("Failed to save memories to IndexedDB:", error);
          }
        }

        if (onFactsExtracted) {
          onFactsExtracted(result);
        }

        return result;
      } catch (error) {
        console.error("Failed to extract facts:", error);
        return null;
      } finally {
        extractionInProgressRef.current = false;
      }
    },
    [
      memoryModel,
      embeddingModel,
      generateEmbeddings,
      getToken,
      onFactsExtracted,
    ]
  );

  const searchMemories = useCallback(
    async (query: string, limit: number = 10, minSimilarity: number = 0.6) => {
      if (!getToken || !embeddingModel) {
        console.warn(
          "Cannot search memories: getToken or embeddingModel not provided"
        );
        return [];
      }

      try {
        console.log(`[Memory Search] Searching for: "${query}"`);

        const queryEmbedding = await generateQueryEmbedding(query, {
          model: embeddingModel,
          getToken,
        });

        console.log(
          `[Memory Search] Generated query embedding (${queryEmbedding.length} dimensions)`
        );

        const results = await searchSimilarMemories(
          queryEmbedding,
          limit,
          minSimilarity
        );

        if (results.length === 0) {
          console.warn(
            `[Memory Search] No memories found above similarity threshold ${minSimilarity}. ` +
              `Try lowering the threshold or ensure memories have embeddings generated.`
          );
        } else {
          console.log(
            `[Memory Search] Found ${results.length} memories. ` +
              `Similarity scores: ${results
                .map((r) => r.similarity.toFixed(3))
                .join(", ")}`
          );
        }

        return results;
      } catch (error) {
        console.error("Failed to search memories:", error);
        return [];
      }
    },
    [embeddingModel, getToken]
  );

  return {
    extractMemoriesFromMessage,
    searchMemories,
  };
}
