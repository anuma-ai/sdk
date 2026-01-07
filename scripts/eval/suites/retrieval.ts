/**
 * Retrieval accuracy test suite
 */

import type {
  Memory,
  QueryFixture,
  RetrievalMetrics,
  EvaluationResult,
} from "../types.js";
import {
  cosineSimilarity,
  aggregateRetrievalMetrics,
  calculatePercentiles,
} from "../metrics.js";

export interface RetrievalTestOptions {
  limit: number;
  minSimilarity: number;
  kValues: number[];
  verbose: boolean;
}

const DEFAULT_OPTIONS: RetrievalTestOptions = {
  limit: 10,
  minSimilarity: 0.2, // Lower threshold for real embeddings (max ~0.6)
  kValues: [1, 3, 5, 10],
  verbose: false,
};

/**
 * Run retrieval evaluation using pre-computed embeddings
 */
export async function runRetrievalSuite(
  memories: Memory[],
  embeddings: Record<string, number[]>,
  queries: QueryFixture[],
  options: Partial<RetrievalTestOptions> = {}
): Promise<{
  metrics: RetrievalMetrics;
  results: EvaluationResult[];
  latencyMs: number[];
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: EvaluationResult[] = [];
  const latencyMs: number[] = [];
  const aggregationData: Array<{
    retrieved: string[];
    relevant: Set<string>;
    similarities: number[];
  }> = [];

  for (const query of queries) {
    const startTime = performance.now();

    // Get query embedding
    const queryEmbedding = query.queryEmbedding || embeddings[query.id];
    if (!queryEmbedding) {
      results.push({
        instanceId: query.id,
        category: "retrieval",
        passed: false,
        metrics: {},
        latencyMs: 0,
        details: { error: "Missing query embedding" },
      });
      continue;
    }

    // Search for similar memories
    const searchResults = searchSimilarMemories(
      queryEmbedding,
      memories,
      embeddings,
      opts.limit,
      opts.minSimilarity
    );

    const endTime = performance.now();
    const elapsed = endTime - startTime;
    latencyMs.push(elapsed);

    const retrieved = searchResults.map((r) => r.memoryId);
    const relevant = new Set(query.relevantMemoryIds);
    const similarities = searchResults.map((r) => r.similarity);

    aggregationData.push({ retrieved, relevant, similarities });

    // Check if at least one relevant memory was found
    const foundRelevant = retrieved.some((id) => relevant.has(id));

    results.push({
      instanceId: query.id,
      category: "retrieval",
      passed: foundRelevant,
      metrics: {
        precisionAtK: Object.fromEntries(
          opts.kValues.map((k) => [
            k,
            precisionAtKSingle(retrieved, relevant, k),
          ])
        ),
        recallAtK: Object.fromEntries(
          opts.kValues.map((k) => [k, recallAtKSingle(retrieved, relevant, k)])
        ),
      },
      latencyMs: elapsed,
      details: opts.verbose
        ? {
            query: query.query,
            retrieved,
            relevant: Array.from(relevant),
            similarities,
          }
        : undefined,
    });
  }

  const metrics = aggregateRetrievalMetrics(
    aggregationData,
    opts.kValues,
    opts.minSimilarity
  );

  return { metrics, results, latencyMs };
}

/**
 * Search for similar memories using cosine similarity
 */
function searchSimilarMemories(
  queryEmbedding: number[],
  memories: Memory[],
  embeddings: Record<string, number[]>,
  limit: number,
  minSimilarity: number
): Array<{ memoryId: string; similarity: number }> {
  const results: Array<{ memoryId: string; similarity: number }> = [];

  for (const memory of memories) {
    const memoryEmbedding = memory.embedding || embeddings[memory.id];
    if (!memoryEmbedding) continue;

    const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);

    if (similarity >= minSimilarity) {
      results.push({ memoryId: memory.id, similarity });
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, limit);
}

function precisionAtKSingle(
  retrieved: string[],
  relevant: Set<string>,
  k: number
): number {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
  return topK.length > 0 ? relevantInTopK / topK.length : 0;
}

function recallAtKSingle(
  retrieved: string[],
  relevant: Set<string>,
  k: number
): number {
  const topK = retrieved.slice(0, k);
  const relevantInTopK = topK.filter((id) => relevant.has(id)).length;
  return relevant.size > 0 ? relevantInTopK / relevant.size : 0;
}

/**
 * Generate embeddings for memories and queries using Reverbia API
 *
 * Authentication: Requires an API key passed via:
 * - REVERBIA_API_KEY environment variable, or
 * - apiKey parameter
 *
 * Base URL: Set via REVERBIA_API_URL (defaults to https://ai-portal-dev.zetachain.com)
 */
export async function generateEmbeddings(
  memories: Memory[],
  queries: QueryFixture[],
  apiKey: string,
  baseUrl: string = "https://ai-portal-dev.zetachain.com"
): Promise<Record<string, number[]>> {
  const embeddings: Record<string, number[]> = {};

  // Prepare texts for embedding
  const textsToEmbed: Array<{ id: string; text: string }> = [];

  for (const memory of memories) {
    const text = [
      memory.rawEvidence,
      memory.type,
      memory.namespace,
      memory.key,
      memory.value,
    ]
      .filter(Boolean)
      .join(" ");
    textsToEmbed.push({ id: memory.id, text });
  }

  for (const query of queries) {
    textsToEmbed.push({ id: query.id, text: query.query });
  }

  // Batch embed (in chunks of 100)
  const batchSize = 100;
  for (let i = 0; i < textsToEmbed.length; i += batchSize) {
    const batch = textsToEmbed.slice(i, i + batchSize);
    const texts = batch.map((t) => t.text);

    const response = await fetch(`${baseUrl}/api/v1/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "openai/text-embedding-3-small",
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Embedding API error: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    for (let j = 0; j < batch.length; j++) {
      embeddings[batch[j].id] = data.data[j].embedding;
    }
  }

  return embeddings;
}
