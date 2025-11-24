import { postApiV1Embeddings } from "../../client";
import type { MemoryItem } from "./service";
import { memoryDb, getAllMemories, type StoredMemoryItem } from "./db";

export interface GenerateEmbeddingOptions {
  /**
   * The model to use for generating embeddings (default: "openai/text-embedding-3-small")
   */
  model?: string;
  /**
   * Custom function to get auth token for API calls
   */
  getToken?: () => Promise<string | null>;
  /**
   * Optional base URL for the API requests.
   */
  baseUrl?: string;
}

const generateEmbeddingForText = async (
  text: string,
  options: GenerateEmbeddingOptions = {}
): Promise<number[]> => {
  const {
    model = "openai/text-embedding-3-small",
    getToken,
    baseUrl,
  } = options;

  try {
    const token = getToken ? await getToken() : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await postApiV1Embeddings({
      baseUrl,
      body: {
        input: text,
        model,
      },
      headers,
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
    console.error("Failed to generate embedding:", error);
    throw error;
  }
};

/**
 * Generate embeddings for a single memory item
 */
export const generateEmbeddingForMemory = async (
  memory: MemoryItem,
  options: GenerateEmbeddingOptions = {}
): Promise<number[]> => {
  const text = [
    memory.rawEvidence,
    memory.type,
    memory.namespace,
    memory.key,
    memory.value,
  ]
    .filter(Boolean)
    .join(" ");
  return generateEmbeddingForText(text, options);
};

/**
 * Generate embeddings for multiple memory items
 */
export const generateEmbeddingsForMemories = async (
  memories: MemoryItem[],
  options: GenerateEmbeddingOptions = {}
): Promise<Map<string, number[]>> => {
  const {
    model = "openai/text-embedding-3-small",
    getToken,
    baseUrl,
  } = options;
  const embeddings = new Map<string, number[]>();

  for (const memory of memories) {
    const uniqueKey = `${memory.namespace}:${memory.key}:${memory.value}`;
    try {
      const embedding = await generateEmbeddingForMemory(memory, {
        model,
        getToken,
        baseUrl,
      });
      embeddings.set(uniqueKey, embedding);
    } catch (error) {
      console.error(
        `Failed to generate embedding for memory ${uniqueKey}:`,
        error
      );
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
          createdAt: existing.createdAt,
        });
      } else {
        console.warn(
          `[Embeddings] Memory with uniqueKey ${uniqueKey} not found. ` +
            `It may have been updated or deleted before embedding was generated.`
        );
      }
    }
  );

  await Promise.all(updates);
};

/**
 * Generate and store embeddings for memory items
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
 * Generate embeddings for all memories in the database that don't have embeddings yet
 * Useful for retroactively adding embeddings to memories saved before embedding support
 *
 * @example
 * ```ts
 * import { generateEmbeddingsForAllMemories } from '@your-sdk/lib/memory/embeddings';
 *
 * // Generate embeddings for all memories without them
 * await generateEmbeddingsForAllMemories({
 *   model: "openai/text-embedding-3-small",
 *   getToken: async () => await getAuthToken()
 * });
 * ```
 */
export const generateEmbeddingsForAllMemories = async (
  options: GenerateEmbeddingOptions = {}
): Promise<void> => {
  const allMemories = await getAllMemories();

  const memoriesWithoutEmbeddings = allMemories.filter(
    (m) => !m.embedding || m.embedding.length === 0
  );

  if (memoriesWithoutEmbeddings.length === 0) {
    console.log("All memories already have embeddings");
    return;
  }

  console.log(
    `Found ${memoriesWithoutEmbeddings.length} memories without embeddings. Generating...`
  );

  const memoryItems: MemoryItem[] = memoriesWithoutEmbeddings.map((m) => ({
    type: m.type,
    namespace: m.namespace,
    key: m.key,
    value: m.value,
    rawEvidence: m.rawEvidence,
    confidence: m.confidence,
    pii: m.pii,
  }));

  await generateAndStoreEmbeddings(memoryItems, options);
};

/**
 * Generate embedding for a query string
 */
export const generateQueryEmbedding = async (
  query: string,
  options: GenerateEmbeddingOptions = {}
): Promise<number[]> => {
  return generateEmbeddingForText(query, options);
};
