/**
 * Crypto-Price Classifier
 *
 * Determines whether a user prompt is asking for current price data
 * (crypto, stocks, or FX) before being sent to the LLM. Compares the
 * prompt embedding against two pre-computed centroid vectors
 * (price vs no-price).
 *
 * No LLM calls — one embedding per prompt + two cosine similarities.
 *
 * To regenerate centroids after changing reference phrases:
 *   PORTAL_API_KEY=... npx tsx scripts/generateCryptoPriceCentroids.ts
 */

import type { LlmapiMessage } from "../../client";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { noPriceCentroid, priceCentroid } from "./cryptoPriceCentroids";
import type { PromptPreProcessor } from "./preProcessor";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // Dimension mismatch — likely centroids generated with a different
    // embedding model than the one now in use, or the centroids file
    // hasn't been regenerated yet (placeholder empty arrays). Returning 0
    // makes the classifier fall back to "no price" rather than producing NaN.
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

export interface CryptoPriceClassification {
  /** Whether the prompt likely needs price data. */
  needsCryptoPrice: boolean;
  /** Cosine similarity to the "needs price" centroid. */
  priceScore: number;
  /** Cosine similarity to the "no price" centroid. */
  noPriceScore: number;
}

interface CryptoPriceClassifierOptions extends EmbeddingOptions {
  /**
   * Score margin: the price score must exceed the no-price score
   * by at least this amount to classify as "needs price data".
   * @default 0.02
   */
  margin?: number;
}

function classify(embedding: number[], margin: number): CryptoPriceClassification {
  const priceScore = cosineSimilarity(embedding, priceCentroid);
  const noPriceScore = cosineSimilarity(embedding, noPriceCentroid);

  return {
    needsCryptoPrice: priceScore > noPriceScore + margin,
    priceScore,
    noPriceScore,
  };
}

/**
 * Classify whether a prompt needs crypto / stock / FX price data.
 *
 * Embeds the prompt and compares it against the pre-computed
 * price and no-price centroid vectors.
 */
export async function classifyCryptoPrice(
  prompt: string,
  options: CryptoPriceClassifierOptions
): Promise<CryptoPriceClassification> {
  const { margin = 0.02, ...embeddingOptions } = options;
  const embedding = await generateEmbedding(prompt, embeddingOptions);
  return classify(embedding, margin);
}

/**
 * Batch-classify multiple prompts. Embeds all prompts in one batch
 * call for efficiency.
 */
export async function classifyCryptoPriceBatch(
  prompts: string[],
  options: CryptoPriceClassifierOptions
): Promise<CryptoPriceClassification[]> {
  const { margin = 0.02, ...embeddingOptions } = options;
  const embeddings = await generateEmbeddings(prompts, embeddingOptions);
  return embeddings.map((emb) => classify(emb, margin));
}

export interface CryptoPricePreProcessorOptions {
  /**
   * Called with the caller's price provider when the classifier decides
   * the prompt is asking for price data. Return either a plain string
   * (the SDK will wrap it in a default user message) or a fully-formed
   * message array (full control over role/shape). Omit to run in observer
   * mode — classification still fires but no messages are injected.
   *
   * The `signal` argument is forwarded from the tool loop so long-running
   * price-API requests can be aborted when the caller aborts.
   */
  fetchPriceData?: (
    prompt: string,
    options: { signal?: AbortSignal }
  ) => Promise<string | LlmapiMessage[]>;
  /**
   * Score margin: `priceScore` must exceed `noPriceScore` by at least
   * this amount to classify as "needs price data".
   * @default 0.02
   */
  margin?: number;
  /** Observe the classification without injecting anything. */
  onClassification?: (result: CryptoPriceClassification) => void;
}

/**
 * Build a pre-processor that runs price-data classification on the
 * shared embedding provided by `runToolLoop`, and — if the classifier
 * decides the prompt is asking for prices — invokes the caller-supplied
 * `fetchPriceData` and injects the result into the conversation.
 *
 * The SDK does not run the price lookup itself; the caller wires up
 * whichever provider they want (CoinGecko, DexScreener, an on-chain
 * oracle, a stock-quote API, etc.).
 *
 * @example Basic usage with a price provider
 * ```ts
 * import { runToolLoop, createCryptoPricePreProcessor } from "@anuma/sdk/server";
 *
 * const cryptoPrice = createCryptoPricePreProcessor({
 *   fetchPriceData: async (prompt, { signal }) => {
 *     const tickers = extractTickers(prompt); // caller-supplied
 *     const quotes = await myProvider.getQuotes(tickers, { signal });
 *     return quotes.map((q) => `- ${q.symbol}: $${q.price} (${q.change24h}%)`).join("\n");
 *   },
 * });
 *
 * await runToolLoop({
 *   messages,
 *   model,
 *   token,
 *   preProcessors: [cryptoPrice],
 * });
 * ```
 *
 * @example Observer mode — only log classification, inject nothing
 * ```ts
 * const observer = createCryptoPricePreProcessor({
 *   onClassification: ({ needsCryptoPrice, priceScore, noPriceScore }) => {
 *     metrics.record({ needsCryptoPrice, priceScore, noPriceScore });
 *   },
 * });
 * ```
 */
export function createCryptoPricePreProcessor(
  options: CryptoPricePreProcessorOptions = {}
): PromptPreProcessor {
  const margin = options.margin ?? 0.02;
  return async ({ prompt, embedding, signal }) => {
    const classification = classify(embedding, margin);
    options.onClassification?.(classification);
    if (!classification.needsCryptoPrice || !options.fetchPriceData) return;
    const results = await options.fetchPriceData(prompt, { signal });
    if (typeof results === "string") {
      if (!results) return;
      return [
        {
          role: "user",
          content: [{ type: "text", text: `Current prices:\n${results}` }],
        },
      ];
    }
    if (results.length === 0) return;
    return results;
  };
}
