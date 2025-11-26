import { postApiV1Embeddings } from "../../client";
import type { MemoryItem } from "./service";
import { memoryDb, getAllMemories } from "./db";
import {
  DEFAULT_API_EMBEDDING_MODEL,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
} from "./constants";

// Cache the pipeline instance
let embeddingPipeline: any = null;

export interface GenerateEmbeddingOptions {
  /**
   * The model to use for generating embeddings
   * For local: default is "Snowflake/snowflake-arctic-embed-xs"
   * For api: default is provided by the backend
   */
  model?: string;
  /**
   * The provider to use for generating embeddings (default: "local")
   */
  provider?: "local" | "api";
  /**
   * Custom function to get auth token for API calls
   * Required if provider is "api"
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
  const { provider = "local" } = options;

  if (provider === "api") {
    const { getToken, model } = options;
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
        model: model,
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
  }

  // Default to a transformers.js compatible model if not provided or if it's the old default
  let { model } = options;
  if (!model || model === DEFAULT_API_EMBEDDING_MODEL) {
    model = DEFAULT_LOCAL_EMBEDDING_MODEL;
  }

  try {
    if (!embeddingPipeline) {
      const { pipeline } = await import("@huggingface/transformers");
      embeddingPipeline = await pipeline("feature-extraction", model);
    }

    const output = await embeddingPipeline(text, {
      pooling: "cls",
      normalize: true,
    });

    // output is a Tensor, access data property
    if (output?.data) {
      return Array.from(output.data);
    }

    throw new Error("Invalid embedding output from transformers.js");
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
  let { model } = options;
  const { provider = "local" } = options;

  if (!model) {
    if (provider === "local") {
      model = DEFAULT_LOCAL_EMBEDDING_MODEL;
    } else {
      model = DEFAULT_API_EMBEDDING_MODEL; // Default for API
    }
  }

  if (provider === "local" && model === DEFAULT_API_EMBEDDING_MODEL) {
    model = DEFAULT_LOCAL_EMBEDDING_MODEL;
  }

  if (memories.length === 0) {
    return;
  }

  console.log(`Generating embeddings for ${memories.length} memories...`);

  const embeddings = await generateEmbeddingsForMemories(memories, {
    ...options,
    model,
  });
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
 *   model: "Snowflake/snowflake-arctic-embed-xs"
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
