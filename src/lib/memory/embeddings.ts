/**
 * Embedding utilities for memory items
 */

import { postApiV1Embeddings } from "../../client";
import type { MemoryItem } from "./service";
import { memoryDb, type StoredMemoryItem } from "./db";

export interface GenerateEmbeddingOptions {
  /**
   * The model to use for generating embeddings (default: "openai/text-embedding-3-small")
   */
  model?: string;
  /**
   * Custom function to get auth token for API calls
   */
  getToken?: () => Promise<string | null>;
}

/**
 * Generate text representation of a memory item for embedding
 * This creates a searchable text string from the memory's key fields
 */
export const memoryToText = (memory: MemoryItem): string => {
  // Combine key information into a searchable text
  // This format helps with semantic search by including context
  const parts = [
    memory.type,
    memory.namespace,
    memory.key,
    memory.value,
    memory.rawEvidence,
  ].filter(Boolean);

  return parts.join(" ");
};

/**
 * Generate embeddings for a single memory item
 */
export const generateEmbeddingForMemory = async (
  memory: MemoryItem,
  options: GenerateEmbeddingOptions = {}
): Promise<number[]> => {
  const { model = "openai/text-embedding-3-small", getToken } = options;

  const text = memoryToText(memory);

  try {
    const token = getToken ? await getToken() : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await postApiV1Embeddings({
      body: {
        input: text,
        model,
      },
      // headers,
    });

    if (
      !response.data ||
      !response.data.data ||
      response.data.data.length === 0
    ) {
      throw new Error(
        `Failed to generate embedding: ${
          response.error?.error ?? "No data returned"
        }`
      );
    }

    const embedding = response.data.data[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding format returned from API");
    }

    return embedding;
  } catch (error) {
    console.error("Failed to generate embedding for memory:", error);
    throw error;
  }
};

/**
 * Generate embeddings for multiple memory items
 * Processes them in batches to avoid overwhelming the API
 */
export const generateEmbeddingsForMemories = async (
  memories: MemoryItem[],
  options: GenerateEmbeddingOptions = {}
): Promise<Map<string, number[]>> => {
  const { model = "openai/text-embedding-3-small", getToken } = options;
  const embeddings = new Map<string, number[]>();

  // Process memories one at a time to avoid rate limits
  // In production, you might want to batch these
  for (const memory of memories) {
    const uniqueKey = `${memory.namespace}:${memory.key}:${memory.value}`;
    try {
      const embedding = await generateEmbeddingForMemory(memory, {
        model,
        getToken,
      });
      embeddings.set(uniqueKey, embedding);
    } catch (error) {
      console.error(
        `Failed to generate embedding for memory ${uniqueKey}:`,
        error
      );
      // Continue with other memories even if one fails
    }
  }

  return embeddings;
};

/**
 * Update memory items in the database with their embeddings
 */
export const updateMemoriesWithEmbeddings = async (
  embeddings: Map<string, number[]>,
  embeddingModel: string
): Promise<void> => {
  const updates = Array.from(embeddings.entries()).map(
    async ([uniqueKey, embedding]) => {
      const existing = await memoryDb.memories
        .where("uniqueKey")
        .equals(uniqueKey)
        .first();

      if (existing?.id) {
        await memoryDb.memories.update(existing.id, {
          embedding,
          embeddingModel,
          updatedAt: Date.now(),
        });
      }
    }
  );

  await Promise.all(updates);
};

/**
 * Generate and store embeddings for memory items
 * This is the main function to call when you want to add embeddings to memories
 */
export const generateAndStoreEmbeddings = async (
  memories: MemoryItem[],
  options: GenerateEmbeddingOptions = {}
): Promise<void> => {
  const { model = "openai/text-embedding-3-small" } = options;

  if (memories.length === 0) {
    return;
  }

  console.log(`Generating embeddings for ${memories.length} memories...`);

  const embeddings = await generateEmbeddingsForMemories(memories, options);
  await updateMemoriesWithEmbeddings(embeddings, model);

  console.log(`Generated and stored ${embeddings.size} embeddings`);
};

/**
 * Generate embedding for a query string (e.g., user's current message)
 * This can be used to search for similar memories
 */
export const generateQueryEmbedding = async (
  query: string,
  options: GenerateEmbeddingOptions = {}
): Promise<number[]> => {
  const { model = "openai/text-embedding-3-small", getToken } = options;

  try {
    const token = getToken ? await getToken() : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await postApiV1Embeddings({
      body: {
        input: query,
        model,
      },
      // headers,
    });

    if (
      !response.data ||
      !response.data.data ||
      response.data.data.length === 0
    ) {
      throw new Error(
        `Failed to generate query embedding: ${
          response.error?.error ?? "No data returned"
        }`
      );
    }

    const embedding = response.data.data[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding format returned from API");
    }

    return embedding;
  } catch (error) {
    console.error("Failed to generate query embedding:", error);
    throw error;
  }
};
