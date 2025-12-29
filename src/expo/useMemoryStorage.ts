"use client";

import { useCallback, useState, useMemo, useRef } from "react";

import { postApiV1ChatCompletions } from "../client";
import { BASE_URL } from "../clientConfig";
import {
  Memory,
  type StoredMemory,
  type StoredMemoryWithSimilarity,
  type CreateMemoryOptions,
  type UpdateMemoryOptions,
  type BaseUseMemoryStorageOptions,
  type BaseUseMemoryStorageResult,
  type MemoryItem,
  type MemoryStorageOperationsContext,
  getAllMemoriesOp,
  getMemoryByIdOp,
  getMemoriesByNamespaceOp,
  getMemoriesByKeyOp,
  saveMemoryOp,
  saveMemoriesOp,
  updateMemoryOp,
  deleteMemoryByIdOp,
  deleteMemoryOp,
  deleteMemoriesByKeyOp,
  clearAllMemoriesOp,
  searchSimilarMemoriesOp,
  updateMemoryEmbeddingOp,
} from "../lib/db/memory";
import {
  FACT_EXTRACTION_PROMPT,
  preprocessMemories,
  type MemoryExtractionResult,
} from "../lib/memory/service";
import {
  DEFAULT_API_EMBEDDING_MODEL,
  DEFAULT_COMPLETION_MODEL,
} from "../lib/memory/constants";
import { postApiV1Embeddings } from "../client";

/**
 * Options for useMemoryStorage hook (Expo version)
 *
 * Uses the base options.
 */
export type UseMemoryStorageOptions = BaseUseMemoryStorageOptions;

/**
 * Result returned by useMemoryStorage hook (Expo version)
 *
 * Uses the base result.
 */
export type UseMemoryStorageResult = BaseUseMemoryStorageResult;

/**
 * Generate embedding using API (Expo-compatible)
 */
async function generateEmbeddingForTextApi(
  text: string,
  options: {
    model: string;
    getToken?: () => Promise<string | null>;
    baseUrl: string;
  }
): Promise<number[]> {
  const token = options.getToken ? await options.getToken() : null;
  if (!token) {
    throw new Error("No auth token available for embedding generation");
  }

  const response = await postApiV1Embeddings({
    baseUrl: options.baseUrl,
    body: {
      input: text,
      model: options.model,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.data || typeof response.data === "string") {
    throw new Error("Failed to generate embedding");
  }

  const embedding = response.data.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("No embedding in response");
  }

  return embedding;
}

/**
 * Generate embedding for a memory item (Expo-compatible)
 */
async function generateEmbeddingForMemoryApi(
  memory: MemoryItem,
  options: {
    model: string;
    getToken?: () => Promise<string | null>;
    baseUrl: string;
  }
): Promise<number[]> {
  const text = `${memory.type}: ${memory.namespace}/${memory.key} = ${memory.value}. Evidence: ${memory.rawEvidence}`;
  return generateEmbeddingForTextApi(text, options);
}

/**
 * A React hook that wraps useMemory with automatic memory persistence using WatermelonDB.
 *
 * **Expo/React Native version** - This is a lightweight version that only supports
 * API-based embeddings. Local embeddings require web APIs not available in React Native.
 *
 * @param options - Configuration options
 * @returns An object containing memory state, methods, and storage operations
 *
 * @example
 * ```tsx
 * import { Database } from '@nozbe/watermelondb';
 * import { useMemoryStorage } from '@reverbia/sdk/expo';
 *
 * function MemoryScreen({ database }: { database: Database }) {
 *   const {
 *     memories,
 *     extractMemoriesFromMessage,
 *     searchMemories,
 *   } = useMemoryStorage({
 *     database,
 *     getToken: async () => getAuthToken(),
 *   });
 *
 *   const handleExtract = async () => {
 *     await extractMemoriesFromMessage({
 *       messages: [{ role: 'user', content: 'My name is John' }],
 *     });
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handleExtract} title="Extract" />
 *       <Text>Memories: {memories.length}</Text>
 *     </View>
 *   );
 * }
 * ```
 *
 * @category Hooks
 */
export function useMemoryStorage(
  options: UseMemoryStorageOptions
): UseMemoryStorageResult {
  const {
    database,
    completionsModel = DEFAULT_COMPLETION_MODEL,
    embeddingModel: userEmbeddingModel,
    generateEmbeddings = true,
    onFactsExtracted,
    getToken,
    baseUrl = BASE_URL,
  } = options;

  // Resolve default model - only API models for Expo
  const embeddingModel =
    userEmbeddingModel === undefined
      ? DEFAULT_API_EMBEDDING_MODEL
      : userEmbeddingModel;

  const [memories, setMemories] = useState<StoredMemory[]>([]);
  const extractionInProgressRef = useRef(false);

  // Get collection
  const memoriesCollection = useMemo(
    () => database.get<Memory>("memories"),
    [database]
  );

  // Storage operations context
  const storageCtx = useMemo<MemoryStorageOperationsContext>(
    () => ({
      database,
      memoriesCollection,
    }),
    [database, memoriesCollection]
  );

  // Embedding options
  const embeddingOptions = useMemo(
    () => ({
      model: embeddingModel ?? DEFAULT_API_EMBEDDING_MODEL,
      getToken: getToken || undefined,
      baseUrl,
    }),
    [embeddingModel, getToken, baseUrl]
  );

  /**
   * Refresh memories from storage
   */
  const refreshMemories = useCallback(async (): Promise<void> => {
    const storedMemories = await getAllMemoriesOp(storageCtx);
    setMemories(storedMemories);
  }, [storageCtx]);

  /**
   * Extract memories from messages and store them
   */
  const extractMemoriesFromMessage = useCallback(
    async (opts: {
      messages: Array<{ role: string; content: string }>;
      model?: string;
    }): Promise<MemoryExtractionResult | null> => {
      const { messages, model } = opts;

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
            "Memory extraction failed: API returned a string response"
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
              console.warn("Memory extraction returned non-JSON response.");
              return { items: [] };
            }
          }
        }

        const trimmedJson = jsonContent.trim();
        if (!trimmedJson.startsWith("{") || !trimmedJson.includes("items")) {
          console.warn("Memory extraction response doesn't appear to be valid JSON.");
          return { items: [] };
        }

        let result: MemoryExtractionResult;
        try {
          result = JSON.parse(jsonContent);

          if (!result || typeof result !== "object") {
            throw new Error("Invalid JSON structure: not an object");
          }

          if (!Array.isArray(result.items)) {
            console.warn("Memory extraction result missing 'items' array.");
            return { items: [] };
          }
        } catch (parseError) {
          console.error(
            "Failed to parse memory extraction JSON:",
            parseError instanceof Error ? parseError.message : "Unknown error"
          );
          return { items: [] };
        }

        if (result.items && Array.isArray(result.items)) {
          result.items = preprocessMemories(result.items);
        }

        if (result.items && result.items.length > 0) {
          try {
            const createOptions: CreateMemoryOptions[] = result.items.map(
              (item: MemoryItem) => ({
                type: item.type,
                namespace: item.namespace,
                key: item.key,
                value: item.value,
                rawEvidence: item.rawEvidence,
                confidence: item.confidence,
                pii: item.pii,
              })
            );

            const savedMemories = await saveMemoriesOp(storageCtx, createOptions);
            console.log(`Saved ${savedMemories.length} memories to WatermelonDB`);

            // Generate embeddings if enabled (API only for Expo)
            if (generateEmbeddings && embeddingModel) {
              try {
                for (const saved of savedMemories) {
                  const memoryItem: MemoryItem = {
                    type: saved.type,
                    namespace: saved.namespace,
                    key: saved.key,
                    value: saved.value,
                    rawEvidence: saved.rawEvidence,
                    confidence: saved.confidence,
                    pii: saved.pii,
                  };
                  const embedding = await generateEmbeddingForMemoryApi(
                    memoryItem,
                    embeddingOptions
                  );
                  await updateMemoryEmbeddingOp(
                    storageCtx,
                    saved.uniqueId,
                    embedding,
                    embeddingOptions.model
                  );
                }
                console.log(`Generated embeddings for ${savedMemories.length} memories`);
              } catch (error) {
                console.error("Failed to generate embeddings:", error);
              }
            }

            await refreshMemories();
          } catch (error) {
            console.error("Failed to save memories to WatermelonDB:", error);
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
      embeddingOptions,
      generateEmbeddings,
      getToken,
      onFactsExtracted,
      baseUrl,
      storageCtx,
      refreshMemories,
    ]
  );

  /**
   * Search for similar memories using semantic search
   */
  const searchMemories = useCallback(
    async (
      query: string,
      limit: number = 10,
      minSimilarity: number = 0.6
    ): Promise<StoredMemoryWithSimilarity[]> => {
      if (!embeddingModel) {
        console.warn("Cannot search memories: embeddingModel not provided");
        return [];
      }

      try {
        const queryEmbedding = await generateEmbeddingForTextApi(
          query,
          embeddingOptions
        );

        const results = await searchSimilarMemoriesOp(
          storageCtx,
          queryEmbedding,
          limit,
          minSimilarity
        );

        if (results.length === 0) {
          console.warn(
            `[Memory Search] No memories found above similarity threshold ${minSimilarity}.`
          );
        } else {
          console.log(
            `[Memory Search] Found ${results.length} memories. ` +
              `Similarity scores: ${results.map((r) => r.similarity.toFixed(3)).join(", ")}`
          );
        }

        return results;
      } catch {
        return [];
      }
    },
    [embeddingModel, embeddingOptions, storageCtx]
  );

  /**
   * Get all memories
   */
  const fetchAllMemories = useCallback(async (): Promise<StoredMemory[]> => {
    try {
      return await getAllMemoriesOp(storageCtx);
    } catch (error) {
      throw new Error(
        "Failed to fetch all memories: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }, [storageCtx]);

  /**
   * Get memories by namespace
   */
  const fetchMemoriesByNamespace = useCallback(
    async (namespace: string): Promise<StoredMemory[]> => {
      if (!namespace) {
        throw new Error("Missing required field: namespace");
      }
      try {
        return await getMemoriesByNamespaceOp(storageCtx, namespace);
      } catch (error) {
        throw new Error(
          `Failed to fetch memories for namespace "${namespace}": ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [storageCtx]
  );

  /**
   * Get memories by namespace and key
   */
  const fetchMemoriesByKey = useCallback(
    async (namespace: string, key: string): Promise<StoredMemory[]> => {
      if (!namespace || !key) {
        throw new Error("Missing required fields: namespace, key");
      }
      try {
        return await getMemoriesByKeyOp(storageCtx, namespace, key);
      } catch (error) {
        throw new Error(
          `Failed to fetch memories for "${namespace}:${key}": ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [storageCtx]
  );

  /**
   * Get a memory by ID
   */
  const getMemoryById = useCallback(
    async (id: string): Promise<StoredMemory | null> => {
      try {
        return await getMemoryByIdOp(storageCtx, id);
      } catch (error) {
        throw new Error(
          `Failed to get memory ${id}: ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [storageCtx]
  );

  /**
   * Save a single memory
   */
  const saveMemory = useCallback(
    async (memory: CreateMemoryOptions): Promise<StoredMemory> => {
      try {
        const saved = await saveMemoryOp(storageCtx, memory);

        if (generateEmbeddings && embeddingModel && !memory.embedding) {
          try {
            const memoryItem: MemoryItem = {
              type: memory.type,
              namespace: memory.namespace,
              key: memory.key,
              value: memory.value,
              rawEvidence: memory.rawEvidence,
              confidence: memory.confidence,
              pii: memory.pii,
            };
            const embedding = await generateEmbeddingForMemoryApi(
              memoryItem,
              embeddingOptions
            );
            await updateMemoryEmbeddingOp(
              storageCtx,
              saved.uniqueId,
              embedding,
              embeddingOptions.model
            );
          } catch (error) {
            console.error("Failed to generate embedding:", error);
          }
        }

        setMemories((prev) => {
          const existing = prev.find((m) => m.uniqueId === saved.uniqueId);
          if (existing) {
            return prev.map((m) => (m.uniqueId === saved.uniqueId ? saved : m));
          }
          return [saved, ...prev];
        });

        return saved;
      } catch (error) {
        throw new Error(
          "Failed to save memory: " +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [storageCtx, generateEmbeddings, embeddingModel, embeddingOptions]
  );

  /**
   * Save multiple memories
   */
  const saveMemories = useCallback(
    async (memoriesToSave: CreateMemoryOptions[]): Promise<StoredMemory[]> => {
      try {
        const saved = await saveMemoriesOp(storageCtx, memoriesToSave);

        if (generateEmbeddings && embeddingModel) {
          for (let i = 0; i < saved.length; i++) {
            const memory = memoriesToSave[i];
            if (!memory.embedding) {
              try {
                const memoryItem: MemoryItem = {
                  type: memory.type,
                  namespace: memory.namespace,
                  key: memory.key,
                  value: memory.value,
                  rawEvidence: memory.rawEvidence,
                  confidence: memory.confidence,
                  pii: memory.pii,
                };
                const embedding = await generateEmbeddingForMemoryApi(
                  memoryItem,
                  embeddingOptions
                );
                await updateMemoryEmbeddingOp(
                  storageCtx,
                  saved[i].uniqueId,
                  embedding,
                  embeddingOptions.model
                );
              } catch (error) {
                console.error("Failed to generate embedding:", error);
              }
            }
          }
        }

        await refreshMemories();
        return saved;
      } catch (error) {
        throw new Error(
          "Failed to save memories: " +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [storageCtx, generateEmbeddings, embeddingModel, embeddingOptions, refreshMemories]
  );

  /**
   * Update a memory
   */
  const updateMemory = useCallback(
    async (id: string, updates: UpdateMemoryOptions): Promise<StoredMemory | null> => {
      const result = await updateMemoryOp(storageCtx, id, updates);

      if (!result.ok) {
        if (result.reason === "not_found") {
          return null;
        }
        if (result.reason === "conflict") {
          throw new Error(
            `Cannot update memory: a memory with key "${result.conflictingKey}" already exists`
          );
        }
        // result.reason === "error"
        throw new Error(
          `Failed to update memory ${id}: ${result.error.message}`
        );
      }

      const updated = result.memory;

      const contentChanged =
        updates.value !== undefined ||
        updates.rawEvidence !== undefined ||
        updates.type !== undefined ||
        updates.namespace !== undefined ||
        updates.key !== undefined;

      if (contentChanged && generateEmbeddings && embeddingModel && !updates.embedding) {
        try {
          const memoryItem: MemoryItem = {
            type: updated.type,
            namespace: updated.namespace,
            key: updated.key,
            value: updated.value,
            rawEvidence: updated.rawEvidence,
            confidence: updated.confidence,
            pii: updated.pii,
          };
          const embedding = await generateEmbeddingForMemoryApi(
            memoryItem,
            embeddingOptions
          );
          await updateMemoryEmbeddingOp(storageCtx, id, embedding, embeddingOptions.model);
        } catch (error) {
          console.error("Failed to regenerate embedding:", error);
        }
      }

      setMemories((prev) => prev.map((m) => (m.uniqueId === id ? updated : m)));

      return updated;
    },
    [storageCtx, generateEmbeddings, embeddingModel, embeddingOptions]
  );

  /**
   * Remove a memory by namespace, key, value
   */
  const removeMemory = useCallback(
    async (namespace: string, key: string, value: string): Promise<void> => {
      if (!namespace || !key || !value) {
        throw new Error("Missing required fields: namespace, key, value");
      }
      try {
        await deleteMemoryOp(storageCtx, namespace, key, value);
        setMemories((prev) =>
          prev.filter(
            (m) => !(m.namespace === namespace && m.key === key && m.value === value)
          )
        );
      } catch (error) {
        throw new Error(
          `Failed to delete memory "${namespace}:${key}:${value}": ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [storageCtx]
  );

  /**
   * Remove a memory by ID
   */
  const removeMemoryById = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteMemoryByIdOp(storageCtx, id);
        setMemories((prev) => prev.filter((m) => m.uniqueId !== id));
      } catch (error) {
        throw new Error(
          `Failed to delete memory with id ${id}: ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [storageCtx]
  );

  /**
   * Remove memories by namespace and key
   */
  const removeMemories = useCallback(
    async (namespace: string, key: string): Promise<void> => {
      if (!namespace || !key) {
        throw new Error("Missing required fields: namespace, key");
      }
      try {
        await deleteMemoriesByKeyOp(storageCtx, namespace, key);
        setMemories((prev) =>
          prev.filter((m) => !(m.namespace === namespace && m.key === key))
        );
      } catch (error) {
        throw new Error(
          `Failed to delete memories for "${namespace}:${key}": ` +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [storageCtx]
  );

  /**
   * Clear all memories
   */
  const clearMemories = useCallback(async (): Promise<void> => {
    try {
      await clearAllMemoriesOp(storageCtx);
      setMemories([]);
    } catch (error) {
      throw new Error(
        "Failed to clear all memories: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }, [storageCtx]);

  return {
    memories,
    refreshMemories,
    extractMemoriesFromMessage,
    searchMemories,
    fetchAllMemories,
    fetchMemoriesByNamespace,
    fetchMemoriesByKey,
    getMemoryById,
    saveMemory,
    saveMemories,
    updateMemory,
    removeMemory,
    removeMemoryById,
    removeMemories,
    clearMemories,
  };
}
