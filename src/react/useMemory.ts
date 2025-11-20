"use client";

import { useCallback, useRef } from "react";
import { postApiV1ChatCompletions } from "../client";
import type { MemoryExtractionResult } from "../lib/memory-service";
import { preprocessMemories } from "../lib/memory-service";
import { saveMemories } from "../lib/memory-db";
import { FACT_EXTRACTION_PROMPT } from "../lib/memory-service";

export type UseMemoryOptions = {
  /**
   * The model to use for fact extraction (default: "openai/gpt-4o")
   */
  memoryModel?: string;
  /**
   * Whether to enable memory extraction (default: true)
   */
  enableMemory?: boolean;
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
};

/**
 * Standalone hook for extracting memories from user messages.
 * Can be composed with other hooks like useChat, useFiles, etc.
 */
export function useMemory(options: UseMemoryOptions = {}): UseMemoryResult {
  const {
    memoryModel = "openai/gpt-4o",
    enableMemory = true,
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

      if (!enableMemory || !getToken || extractionInProgressRef.current) {
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
          // headers: {
          //   Authorization: `Bearer ${token}`,
          // },
        });

        if (!completion.data) {
          console.error(
            "Memory extraction failed:",
            completion.error?.error ?? "API did not return a response"
          );
          return null;
        }

        // Extract the content from the response
        const content =
          completion.data.choices?.[0]?.message?.content?.trim() || "";

        if (!content) {
          console.error("No content in memory extraction response");
          return null;
        }

        // Parse JSON from the response
        let jsonContent = content;

        // Remove any streaming prefixes if present
        jsonContent = jsonContent.replace(/^data:\s*/gm, "").trim();

        // Extract JSON from markdown code blocks if present
        const jsonMatch = jsonContent.match(
          /```(?:json)?\s*(\{[\s\S]*\})\s*```/
        );
        if (jsonMatch) {
          jsonContent = jsonMatch[1];
        }

        // Try to find JSON object in the content
        const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonContent = jsonObjectMatch[0];
        }

        const result: MemoryExtractionResult = JSON.parse(jsonContent);

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

        // Save memories to IndexedDB
        if (result.items && result.items.length > 0) {
          try {
            await saveMemories(result.items);
            console.log(`Saved ${result.items.length} memories to IndexedDB`);
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
    [enableMemory, memoryModel, getToken, onFactsExtracted]
  );

  return {
    extractMemoriesFromMessage,
  };
}
