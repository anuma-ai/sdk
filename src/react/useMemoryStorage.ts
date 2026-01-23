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
  type MemoryStorageOperationsContext,
  getAllMemoriesOp,
  getMemoryByIdOp,
  saveMemoryOp,
  saveMemoriesOp,
  updateMemoryOp,
  deleteMemoryByIdOp,
  clearAllMemoriesOp,
  searchSimilarMemoriesOp,
  updateMemoryEmbeddingOp,
} from "../lib/db/memory";
import {
  FACT_EXTRACTION_PROMPT,
  preprocessMemories,
  type MemoryExtractionResult,
  type MemoryItem,
} from "../lib/memory/service";
import {
  generateEmbeddingForText,
  type GenerateEmbeddingOptions,
} from "../lib/memory/embeddings";
import {
  DEFAULT_API_EMBEDDING_MODEL,
  DEFAULT_COMPLETION_MODEL,
} from "../lib/memory/constants";

/**
 * Options for useMemoryStorage hook (React version)
 *
 * Uses the base options. React-specific features can be added here if needed.
 * @inline
 */
export interface UseMemoryStorageOptions extends BaseUseMemoryStorageOptions {}

/**
 * Result returned by useMemoryStorage hook (React version)
 *
 * Uses the base result. React-specific features can be added here if needed.
 */
export type UseMemoryStorageResult = BaseUseMemoryStorageResult;

/**
 * A React hook that wraps useMemory with automatic memory persistence using WatermelonDB.
 *
 * This hook provides all the functionality of useMemory plus automatic storage of
 * memories to a WatermelonDB database. Memories are automatically saved when extracted
 * and can be searched using semantic similarity.
 *
 * @param options - Configuration options
 * @returns An object containing memory state, methods, and storage operations
 *
 * @example
 * ```tsx
 * import { Database } from '@nozbe/watermelondb';
 * import { useMemoryStorage } from '@reverbia/sdk/react';
 *
 * function MemoryComponent({ database }: { database: Database }) {
 *   const {
 *     memories,
 *     extractMemoriesFromMessage,
 *     searchMemories,
 *     fetchAllMemories,
 *   } = useMemoryStorage({
 *     database,
 *     getToken: async () => getAuthToken(),
 *     onFactsExtracted: (facts) => console.log('Extracted:', facts),
 *   });
 *
 *   const handleExtract = async () => {
 *     const result = await extractMemoriesFromMessage({
 *       messages: [{ role: 'user', content: 'My name is John and I live in NYC' }],
 *       model: 'gpt-4o-mini',
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleExtract}>Extract Memories</button>
 *       <p>Total memories: {memories.length}</p>
 *     </div>
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

  // Resolve default model if undefined, preserve null if set explicitly to disable
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
      walletAddress: options.walletAddress,
      signMessage: options.signMessage,
      embeddedWalletSigner: options.embeddedWalletSigner,
    }),
    [
      database,
      memoriesCollection,
      options.walletAddress,
      options.signMessage,
      options.embeddedWalletSigner,
    ]
  );

  // Get the effective embedding model (used when embeddings are enabled)
  const effectiveEmbeddingModel = useMemo(
    () => embeddingModel ?? DEFAULT_API_EMBEDDING_MODEL,
    [embeddingModel]
  );

  // Embedding options
  const embeddingOptions = useMemo<GenerateEmbeddingOptions>(
    () => ({
      model: effectiveEmbeddingModel,
      getToken: getToken || undefined,
      baseUrl,
    }),
    [effectiveEmbeddingModel, getToken, baseUrl]
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
              console.warn("Memory extraction returned non-JSON response");
              return { items: [] };
            }
          }
        }

        const trimmedJson = jsonContent.trim();
        if (!trimmedJson.startsWith("{") || !trimmedJson.includes("items")) {
          console.warn(
            "Memory extraction response doesn't appear to be valid JSON"
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
            console.warn("Memory extraction result missing 'items' array");
            return { items: [] };
          }
        } catch (parseError) {
          console.error(
            "Failed to parse memory extraction JSON:",
            parseError instanceof Error ? parseError.message : parseError
          );
          return { items: [] };
        }

        if (result.items && Array.isArray(result.items)) {
          result.items = preprocessMemories(result.items);
        }

        if (result.items && result.items.length > 0) {
          try {
            // Convert MemoryItem to CreateMemoryOptions with embeddings
            const createOptions: CreateMemoryOptions[] = [];

            for (const item of result.items) {
              const memoryOption: CreateMemoryOptions = {
                text: item.text,
              };

              // Generate embedding from text
              if (generateEmbeddings && embeddingModel) {
                try {
                  const embedding = await generateEmbeddingForText(
                    item.text,
                    embeddingOptions
                  );
                  memoryOption.embedding = embedding;
                  memoryOption.embeddingModel = effectiveEmbeddingModel;
                } catch (error) {
                  console.error("Failed to generate embedding:", error);
                }
              }

              createOptions.push(memoryOption);
            }

            if (generateEmbeddings && embeddingModel) {
              console.log(
                `Generated embeddings for ${createOptions.length} memories`
              );
            }

            const savedMemories = await saveMemoriesOp(
              storageCtx,
              createOptions
            );
            console.log(
              `Saved ${savedMemories.length} memories to WatermelonDB`
            );

            // Refresh memories state
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
      effectiveEmbeddingModel,
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
        const queryEmbedding = await generateEmbeddingForText(
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
              `Similarity scores: ${results
                .map((r) => r.similarity.toFixed(3))
                .join(", ")}`
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
        // Generate embedding from text before saving if not already provided
        const memoryToSave = { ...memory };
        if (generateEmbeddings && embeddingModel && !memory.embedding) {
          try {
            const embedding = await generateEmbeddingForText(
              memory.text,
              embeddingOptions
            );
            memoryToSave.embedding = embedding;
            memoryToSave.embeddingModel = effectiveEmbeddingModel;
          } catch (error) {
            console.error("Failed to generate embedding:", error);
          }
        }

        const saved = await saveMemoryOp(storageCtx, memoryToSave);

        // Update local state
        setMemories((prev) => [saved, ...prev]);

        return saved;
      } catch (error) {
        throw new Error(
          "Failed to save memory: " +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [
      storageCtx,
      generateEmbeddings,
      embeddingModel,
      embeddingOptions,
      effectiveEmbeddingModel,
    ]
  );

  /**
   * Save multiple memories
   */
  const saveMemories = useCallback(
    async (memoriesToSave: CreateMemoryOptions[]): Promise<StoredMemory[]> => {
      try {
        // Generate embeddings from text before saving
        const memoriesWithEmbeddings = await Promise.all(
          memoriesToSave.map(async (memory) => {
            if (generateEmbeddings && embeddingModel && !memory.embedding) {
              try {
                const embedding = await generateEmbeddingForText(
                  memory.text,
                  embeddingOptions
                );
                return {
                  ...memory,
                  embedding,
                  embeddingModel: effectiveEmbeddingModel,
                };
              } catch (error) {
                console.error("Failed to generate embedding:", error);
                return memory;
              }
            }
            return memory;
          })
        );

        const saved = await saveMemoriesOp(storageCtx, memoriesWithEmbeddings);

        // Refresh state
        await refreshMemories();

        return saved;
      } catch (error) {
        throw new Error(
          "Failed to save memories: " +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [
      storageCtx,
      generateEmbeddings,
      embeddingModel,
      embeddingOptions,
      effectiveEmbeddingModel,
      refreshMemories,
    ]
  );

  /**
   * Update a memory
   */
  const updateMemory = useCallback(
    async (
      id: string,
      updates: UpdateMemoryOptions
    ): Promise<StoredMemory | null> => {
      const result = await updateMemoryOp(storageCtx, id, updates);

      if (!result.ok) {
        if (result.reason === "not_found") {
          return null;
        }
        // result.reason === "error"
        throw new Error(
          `Failed to update memory ${id}: ${result.error.message}`
        );
      }

      const updated = result.memory;

      // Regenerate embedding if text changed and embeddings are enabled
      if (updates.text && generateEmbeddings && embeddingModel && !updates.embedding) {
        try {
          const embedding = await generateEmbeddingForText(
            updated.text,
            embeddingOptions
          );
          await updateMemoryEmbeddingOp(
            storageCtx,
            id,
            embedding,
            effectiveEmbeddingModel
          );
        } catch (error) {
          console.error("Failed to regenerate embedding:", error);
        }
      }

      // Update local state
      setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));

      return updated;
    },
    [
      storageCtx,
      generateEmbeddings,
      embeddingModel,
      embeddingOptions,
      effectiveEmbeddingModel,
    ]
  );

  /**
   * Remove a memory by ID
   */
  const removeMemoryById = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteMemoryByIdOp(storageCtx, id);
        // Update local state
        setMemories((prev) => prev.filter((m) => m.id !== id));
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
    getMemoryById,
    saveMemory,
    saveMemories,
    updateMemory,
    removeMemoryById,
    clearMemories,
  };
}
