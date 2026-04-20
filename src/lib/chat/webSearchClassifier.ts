/**
 * Web Search Classifier
 *
 * Determines whether a user prompt would benefit from a web search
 * before being sent to the LLM. Compares the prompt embedding against
 * two pre-computed centroid vectors (search vs no-search).
 *
 * No LLM calls — one embedding per prompt + two cosine similarities.
 *
 * To regenerate centroids after changing reference phrases:
 *   PORTAL_API_KEY=... npx tsx scripts/generateSearchCentroids.ts
 */

import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { searchCentroid, noSearchCentroid } from "./webSearchCentroids";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // Dimension mismatch — likely centroids generated with a different
    // embedding model than the one now in use. Returning 0 makes the
    // classifier fall back to "no search" rather than producing NaN.
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

interface WebSearchClassification {
  /** Whether the prompt likely needs a web search. */
  needsWebSearch: boolean;
  /** Cosine similarity to the "needs search" centroid. */
  searchScore: number;
  /** Cosine similarity to the "no search" centroid. */
  noSearchScore: number;
}

interface WebSearchClassifierOptions extends EmbeddingOptions {
  /**
   * Score margin: the search score must exceed the no-search score
   * by at least this amount to classify as "needs web search".
   * @default 0.02
   */
  margin?: number;
}

function classify(embedding: number[], margin: number): WebSearchClassification {
  const searchScore = cosineSimilarity(embedding, searchCentroid);
  const noSearchScore = cosineSimilarity(embedding, noSearchCentroid);

  return {
    needsWebSearch: searchScore > noSearchScore + margin,
    searchScore,
    noSearchScore,
  };
}

/**
 * Classify whether a prompt needs a web search.
 *
 * Embeds the prompt and compares it against the pre-computed
 * search and no-search centroid vectors.
 */
export async function classifyWebSearch(
  prompt: string,
  options: WebSearchClassifierOptions
): Promise<WebSearchClassification> {
  const { margin = 0.02, ...embeddingOptions } = options;
  const embedding = await generateEmbedding(prompt, embeddingOptions);
  return classify(embedding, margin);
}

/**
 * Batch-classify multiple prompts. Embeds all prompts in one batch
 * call for efficiency.
 */
export async function classifyWebSearchBatch(
  prompts: string[],
  options: WebSearchClassifierOptions
): Promise<WebSearchClassification[]> {
  const { margin = 0.02, ...embeddingOptions } = options;
  const embeddings = await generateEmbeddings(prompts, embeddingOptions);
  return embeddings.map((emb) => classify(emb, margin));
}
