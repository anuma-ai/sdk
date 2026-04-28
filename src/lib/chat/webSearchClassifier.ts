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

import type { LlmapiMessage } from "../../client";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import type { PromptPreProcessor } from "./preProcessor";
import { noSearchCentroid, searchCentroid } from "./webSearchCentroids";

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

export interface WebSearchClassification {
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

export interface WebSearchPreProcessorOptions {
  /**
   * Called with the caller's search provider when the classifier decides
   * a web search is needed. Return either a plain string (the SDK will
   * wrap it in a default user message) or a fully-formed message array
   * (full control over role/shape). Omit to run in observer mode —
   * classification still fires but no messages are injected.
   *
   * The `signal` argument is forwarded from the tool loop so long-running
   * search requests can be aborted when the caller aborts.
   */
  fetchSearchResults?: (
    prompt: string,
    options: { signal?: AbortSignal }
  ) => Promise<string | LlmapiMessage[]>;
  /**
   * Score margin: `searchScore` must exceed `noSearchScore` by at least
   * this amount to classify as "needs web search".
   * @default 0.02
   */
  margin?: number;
  /** Observe the classification without injecting anything. */
  onClassification?: (result: WebSearchClassification) => void;
}

/**
 * Build a pre-processor that runs web-search classification on the
 * shared embedding provided by `runToolLoop`, and — if the classifier
 * decides a search is warranted — invokes the caller-supplied
 * `fetchSearchResults` and injects the result into the conversation.
 *
 * @example Basic usage with a search provider
 * ```ts
 * import { runToolLoop, createWebSearchPreProcessor } from "@anuma/sdk/server";
 *
 * const webSearch = createWebSearchPreProcessor({
 *   fetchSearchResults: async (prompt, { signal }) => {
 *     const res = await mySearchProvider.query(prompt, { signal });
 *     return res.results.map((r) => `- ${r.title}: ${r.snippet}`).join("\n");
 *   },
 * });
 *
 * await runToolLoop({
 *   messages,
 *   model,
 *   token,
 *   preProcessors: [webSearch],
 * });
 * ```
 *
 * @example Observer mode — only log classification, inject nothing
 * ```ts
 * const observer = createWebSearchPreProcessor({
 *   onClassification: ({ needsWebSearch, searchScore, noSearchScore }) => {
 *     metrics.record({ needsWebSearch, searchScore, noSearchScore });
 *   },
 * });
 * ```
 *
 * @example Full control — return a custom message shape
 * ```ts
 * const webSearch = createWebSearchPreProcessor({
 *   fetchSearchResults: async (prompt, { signal }) => {
 *     const results = await mySearchProvider.query(prompt, { signal });
 *     return [
 *       {
 *         role: "system",
 *         content: [{ type: "text", text: `Search results for "${prompt}":\n${formatResults(results)}` }],
 *       },
 *     ];
 *   },
 * });
 * ```
 */
export function createWebSearchPreProcessor(
  options: WebSearchPreProcessorOptions = {}
): PromptPreProcessor {
  const margin = options.margin ?? 0.02;
  return async ({ prompt, embedding, signal }) => {
    const classification = classify(embedding, margin);
    options.onClassification?.(classification);
    if (!classification.needsWebSearch || !options.fetchSearchResults) return;
    const results = await options.fetchSearchResults(prompt, { signal });
    if (typeof results === "string") {
      if (!results) return;
      return [
        {
          role: "user",
          content: [{ type: "text", text: `Web search context:\n${results}` }],
        },
      ];
    }
    if (results.length === 0) return;
    return results;
  };
}
