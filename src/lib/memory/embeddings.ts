import { postApiV1Embeddings } from "../../client";
import { BASE_URL } from "../../clientConfig";
import type { MemoryItem } from "./service";
import { DEFAULT_API_EMBEDDING_MODEL } from "./constants";
import {
  type MemoryStorageOperationsContext,
  getAllMemoriesOp,
  updateMemoryEmbeddingOp,
  type StoredMemory,
} from "../db/memory";

export interface GenerateEmbeddingOptions {
  /**
   * The model to use for generating embeddings
   * Default is provided by the backend
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

export const generateEmbeddingForText = async (
  text: string,
  options: GenerateEmbeddingOptions = {}
): Promise<number[]> => {
  const { baseUrl = BASE_URL, getToken, model } = options;

  if (!getToken) {
    throw new Error("getToken is required for API embeddings");
  }

  const token = await getToken();
  if (!token) {
    throw new Error("No access token available for API embeddings");
  }

  const response = await postApiV1Embeddings({
    baseUrl,
    body: {
      input: text,
      model: model ?? DEFAULT_API_EMBEDDING_MODEL,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    throw new Error(
      typeof response.error === "object" &&
      response.error &&
      "error" in response.error
        ? (response.error as any).error
        : "API embedding failed"
    );
  }

  if (!response.data?.data?.[0]?.embedding) {
    throw new Error("No embedding returned from API");
  }

  return response.data.data[0].embedding;
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
  const embeddings = new Map<string, number[]>();

  for (const memory of memories) {
    const uniqueKey = `${memory.namespace}:${memory.key}:${memory.value}`;
    try {
      const embedding = await generateEmbeddingForMemory(memory, options);
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
  ctx: MemoryStorageOperationsContext,
  embeddings: Map<string, number[]>,
  embeddingModel: string
): Promise<void> => {
  // Get all memories to find by unique key
  const allMemories = await getAllMemoriesOp(ctx);
  const memoryByUniqueKey = new Map(
    allMemories.map((m) => [m.uniqueKey, m])
  );

  const updates = Array.from(embeddings.entries()).map(
    async ([uniqueKey, embedding]) => {
      const existing = memoryByUniqueKey.get(uniqueKey);

      if (existing?.uniqueId) {
        await updateMemoryEmbeddingOp(
          ctx,
          existing.uniqueId,
          embedding,
          embeddingModel
        );
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
  ctx: MemoryStorageOperationsContext,
  memories: MemoryItem[],
  options: GenerateEmbeddingOptions = {}
): Promise<void> => {
  const model = options.model ?? DEFAULT_API_EMBEDDING_MODEL;

  if (memories.length === 0) {
    return;
  }

  console.log(`Generating embeddings for ${memories.length} memories...`);

  const embeddings = await generateEmbeddingsForMemories(memories, {
    ...options,
    model,
  });
  await updateMemoriesWithEmbeddings(ctx, embeddings, model);

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
 * await generateEmbeddingsForAllMemories(ctx, {
 *   getToken: async () => token,
 *   model: "openai/text-embedding-3-small"
 * });
 * ```
 */
export const generateEmbeddingsForAllMemories = async (
  ctx: MemoryStorageOperationsContext,
  options: GenerateEmbeddingOptions = {}
): Promise<void> => {
  const allMemories = await getAllMemoriesOp(ctx);

  const memoriesWithoutEmbeddings = allMemories.filter(
    (m: StoredMemory) => !m.embedding || m.embedding.length === 0
  );

  if (memoriesWithoutEmbeddings.length === 0) {
    console.log("All memories already have embeddings");
    return;
  }

  console.log(
    `Found ${memoriesWithoutEmbeddings.length} memories without embeddings. Generating...`
  );

  const memoryItems: MemoryItem[] = memoriesWithoutEmbeddings.map(
    (m: StoredMemory) => ({
      type: m.type,
      namespace: m.namespace,
      key: m.key,
      value: m.value,
      rawEvidence: m.rawEvidence,
      confidence: m.confidence,
      pii: m.pii,
    })
  );

  await generateAndStoreEmbeddings(ctx, memoryItems, options);
};
