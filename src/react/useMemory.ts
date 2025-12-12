"use client";

import { useCallback, useRef } from "react";
import { postApiV1ChatCompletions } from "../client";
import { BASE_URL } from "../clientConfig";
import type { MemoryExtractionResult } from "../lib/memory/service";
import { preprocessMemories } from "../lib/memory/service";
import {
  saveMemories,
  getAllMemories,
  getMemoriesByNamespace,
  getMemories,
  deleteMemory,
  deleteMemories,
  deleteMemoryById,
  clearAllMemories,
  updateMemoryById,
  getMemoryById,
  type StoredMemoryItem,
} from "../lib/memory/db";
import { FACT_EXTRACTION_PROMPT } from "../lib/memory/service";
import {
  generateAndStoreEmbeddings,
  generateEmbeddingForText,
} from "../lib/memory/embeddings";
import { searchSimilarMemories } from "../lib/memory/db";
import {
  DEFAULT_API_EMBEDDING_MODEL,
  DEFAULT_COMPLETION_MODEL,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
} from "../lib/memory/constants";
import {
  generateEmbeddingForMemory,
  type GenerateEmbeddingOptions,
} from "../lib/memory/embeddings";
import type { MemoryItem } from "../lib/memory/service";
export type UseMemoryOptions = {
  /**
   * The model to use for fact extraction (default: "openai/gpt-4o")
   */
  completionsModel?: string;
  /**
   * The model to use for generating embeddings
   * For local: default is "Snowflake/snowflake-arctic-embed-xs"
   * For api: default is "openai/text-embedding-3-small"
   * Set to null to disable embedding generation
   */
  embeddingModel?: string | null;
  /**
   * The provider to use for generating embeddings (default: "local")
   * "local": Uses a local HuggingFace model (in-browser)
   * "api": Uses the backend API
   */
  embeddingProvider?: "local" | "api";
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
  /**
   * Optional base URL for the API requests.
   */
  baseUrl?: string;
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
  ) => Promise<Array<StoredMemoryItem & { similarity: number }>>;
  /**
   * Get all memories stored in IndexedDB
   * @returns Array of all stored memories
   */
  fetchAllMemories: () => Promise<StoredMemoryItem[]>;
  /**
   * Get memories filtered by namespace
   * @param namespace The namespace to filter by
   * @returns Array of memories in the specified namespace
   */
  fetchMemoriesByNamespace: (namespace: string) => Promise<StoredMemoryItem[]>;
  /**
   * Get memories by namespace and key
   * @param namespace The namespace
   * @param key The key within the namespace
   * @returns Array of memories matching the namespace and key
   */
  fetchMemoriesByKey: (
    namespace: string,
    key: string
  ) => Promise<StoredMemoryItem[]>;
  /**
   * Update a memory by its ID
   * @param id The memory ID
   * @param updates Partial memory fields to update
   * @returns The updated memory or undefined if not found
   */
  updateMemory: (
    id: number,
    updates: Partial<StoredMemoryItem & MemoryItem>
  ) => Promise<StoredMemoryItem | undefined>;
  /**
   * Delete a specific memory by namespace, key, and value
   * @param namespace The namespace
   * @param key The key
   * @param value The value
   */
  removeMemory: (
    namespace: string,
    key: string,
    value: string
  ) => Promise<void>;
  /**
   * Delete a memory by its ID
   * @param id The memory ID
   */
  removeMemoryById: (id: number) => Promise<void>;
  /**
   * Delete all memories by namespace and key
   * @param namespace The namespace
   * @param key The key
   */
  removeMemories: (namespace: string, key: string) => Promise<void>;
  /**
   * Clear all memories from IndexedDB
   */
  clearMemories: () => Promise<void>;
};

/**
 * Standalone hook for extracting memories from user messages.
 * Can be composed with other hooks like useChat, useFiles, etc.
 */
export function useMemory(options: UseMemoryOptions = {}): UseMemoryResult {
  const {
    completionsModel = DEFAULT_COMPLETION_MODEL,
    embeddingModel: userEmbeddingModel,
    embeddingProvider = "local",
    generateEmbeddings = true,
    onFactsExtracted,
    getToken,
    baseUrl = BASE_URL,
  } = options;

  // Resolve default model if undefined, preserve null if set explicitly to disable
  const embeddingModel =
    userEmbeddingModel === undefined
      ? embeddingProvider === "local"
        ? DEFAULT_LOCAL_EMBEDDING_MODEL
        : DEFAULT_API_EMBEDDING_MODEL
      : userEmbeddingModel;

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
          baseUrl,
          body: {
            messages: [
              {
                role: "system",
                content: [{ type: "text", text: FACT_EXTRACTION_PROMPT }],
              },
              ...messages.map((m) => ({
                role: m.role,
                content: [{ type: "text", text: m.content }],
              })),
            ],
            model: model || completionsModel,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!completion.data) {
          console.error(
            "Memory extraction failed:",
            completion.error?.error ?? "API did not return a response"
          );
          return null;
        }

        if (typeof completion.data === "string") {
          console.error(
            "Memory extraction failed: API returned a string response instead of a completion object"
          );
          return null;
        }

        const messageContent = completion.data.choices?.[0]?.message?.content;
        let content = "";

        if (Array.isArray(messageContent)) {
          content = messageContent
            .map((p) => p.text || "")
            .join("")
            .trim();
        } else if (typeof messageContent === "string") {
          content = (messageContent as string).trim();
        }

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
                  provider: embeddingProvider,
                  getToken: getToken || undefined,
                  baseUrl,
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
      completionsModel,
      embeddingModel,
      embeddingProvider,
      generateEmbeddings,
      getToken,
      onFactsExtracted,
      baseUrl,
    ]
  );

  const searchMemories = useCallback(
    async (query: string, limit: number = 10, minSimilarity: number = 0.6) => {
      if (!embeddingModel) {
        console.warn("Cannot search memories: embeddingModel not provided");
        return [];
      }

      try {
        console.log(`[Memory Search] Searching for: "${query}"`);

        const queryEmbedding = await generateEmbeddingForText(query, {
          model: embeddingModel,
          provider: embeddingProvider,
          getToken,
          baseUrl,
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
    [embeddingModel, embeddingProvider, getToken, baseUrl]
  );

  const fetchAllMemories = useCallback(async (): Promise<
    StoredMemoryItem[]
  > => {
    try {
      return await getAllMemories();
    } catch (error) {
      throw new Error(
        "Failed to fetch all memories: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }, []);

  const fetchMemoriesByNamespace = useCallback(
    async (namespace: string): Promise<StoredMemoryItem[]> => {
      if (!namespace) {
        throw new Error("Missing required field: namespace");
      }
      try {
        return await getMemoriesByNamespace(namespace);
      } catch (error) {
        throw new Error(
          `Failed to fetch memories for namespace "${namespace}": ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    []
  );

  const fetchMemoriesByKey = useCallback(
    async (namespace: string, key: string): Promise<StoredMemoryItem[]> => {
      if (!namespace || !key) {
        throw new Error("Missing required fields: namespace, key");
      }
      try {
        return await getMemories(namespace, key);
      } catch (error) {
        throw new Error(
          `Failed to fetch memories for "${namespace}:${key}": ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    []
  );

  /**
   * Update a memory by its ID
   * @param id The memory ID
   * @param updates All memory fields (complete replacement, not partial)
   * @returns The updated memory or undefined if not found
   */
  const updateMemory = useCallback(
    async (
      id: number,
      updates: Partial<StoredMemoryItem & MemoryItem>
    ): Promise<StoredMemoryItem | undefined> => {
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error("id must be a non-negative integer");
      }
      try {
        const embeddingModelToUse =
          embeddingProvider === "api"
            ? embeddingModel ?? DEFAULT_API_EMBEDDING_MODEL
            : embeddingModel && embeddingModel !== DEFAULT_API_EMBEDDING_MODEL
            ? embeddingModel
            : DEFAULT_LOCAL_EMBEDDING_MODEL;

        const embeddingOptions: GenerateEmbeddingOptions = {
          model: embeddingModelToUse,
          provider: embeddingProvider,
          getToken: getToken || undefined,
          baseUrl,
        };

        if (
          !updates.type ||
          !updates.namespace ||
          !updates.key ||
          !updates.value ||
          !updates.rawEvidence ||
          updates.confidence === undefined ||
          updates.confidence === null ||
          updates.pii === undefined ||
          updates.pii === null
        ) {
          throw new Error(
            "Missing required fields: type, namespace, key, value, rawEvidence, confidence, pii"
          );
        }

        const existingMemory = await getMemoryById(id);
        if (!existingMemory) {
          throw new Error(`Memory with id ${id} not found`);
        }

        const embeddingFieldsChanged =
          (updates.value !== undefined &&
            updates.value !== existingMemory.value) ||
          (updates.rawEvidence !== undefined &&
            updates.rawEvidence !== existingMemory.rawEvidence) ||
          (updates.type !== undefined &&
            updates.type !== existingMemory.type) ||
          (updates.namespace !== undefined &&
            updates.namespace !== existingMemory.namespace) ||
          (updates.key !== undefined && updates.key !== existingMemory.key);

        if (!embeddingFieldsChanged) {
          return existingMemory;
        }

        const memory: MemoryItem = {
          type: updates.type as MemoryItem["type"],
          namespace: updates.namespace as MemoryItem["namespace"],
          key: updates.key as MemoryItem["key"],
          value: updates.value as MemoryItem["value"],
          rawEvidence: updates.rawEvidence as MemoryItem["rawEvidence"],
          confidence: updates.confidence as MemoryItem["confidence"],
          pii: updates.pii as MemoryItem["pii"],
        };

        let embedding = existingMemory.embedding ?? [];
        let embeddingModelToStore = existingMemory.embeddingModel ?? "";

        if (generateEmbeddings && embeddingModelToUse) {
          try {
            embedding = await generateEmbeddingForMemory(
              memory,
              embeddingOptions
            );
            embeddingModelToStore = embeddingModelToUse;
          } catch (embeddingError) {
            console.error(
              "Failed to generate embedding, keeping existing:",
              embeddingError
            );
            // Keep existing embedding on failure
          }
        }

        return await updateMemoryById(
          id,
          updates as StoredMemoryItem & MemoryItem,
          existingMemory as StoredMemoryItem,
          embedding,
          embeddingModelToStore
        );
      } catch (error) {
        throw new Error(
          `Failed to update memory ${id}: ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [embeddingModel, embeddingProvider, generateEmbeddings, getToken, baseUrl]
  );

  const removeMemory = useCallback(
    async (namespace: string, key: string, value: string): Promise<void> => {
      if (!namespace || !key || !value) {
        throw new Error("Missing required fields: namespace, key, value");
      }
      try {
        await deleteMemory(namespace, key, value);
      } catch (error) {
        throw new Error(
          `Failed to delete memory "${namespace}:${key}:${value}": ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    []
  );

  const removeMemoryById = useCallback(async (id: number): Promise<void> => {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("id must be a non-negative integer");
    }
    try {
      await deleteMemoryById(id);
    } catch (error) {
      throw new Error(
        `Failed to delete memory with id ${id}: ` +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }, []);

  const removeMemories = useCallback(
    async (namespace: string, key: string): Promise<void> => {
      if (!namespace || !key) {
        throw new Error("Missing required fields: namespace, key");
      }
      try {
        await deleteMemories(namespace, key);
      } catch (error) {
        throw new Error(
          `Failed to delete memories for "${namespace}:${key}": ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    []
  );

  const clearMemories = useCallback(async (): Promise<void> => {
    try {
      await clearAllMemories();
    } catch (error) {
      throw new Error(
        "Failed to clear all memories: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }, []);

  return {
    extractMemoriesFromMessage,
    searchMemories,
    fetchAllMemories,
    fetchMemoriesByNamespace,
    fetchMemoriesByKey,
    updateMemory,
    removeMemory,
    removeMemoryById,
    removeMemories,
    clearMemories,
  };
}
