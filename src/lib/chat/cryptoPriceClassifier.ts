/**
 * Crypto Price Classifier
 *
 * Determines whether a user prompt is asking for current crypto price data
 * (Bitcoin, Ethereum, ZRC-20s, token quotes) before being sent to the LLM.
 * Compares the prompt embedding against two pre-computed centroid vectors
 * (crypto-price vs no-crypto-price).
 *
 * No LLM calls — one embedding per prompt + two cosine similarities.
 *
 * To regenerate centroids after changing reference phrases:
 *   PORTAL_API_KEY=... npx tsx scripts/generateCryptoPriceCentroids.ts
 */

import type { LlmapiMessage } from "../../client";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { cryptoPriceCentroid, noCryptoPriceCentroid } from "./cryptoPriceCentroids";
import type { EnrichedPreProcessorResult, PromptPreProcessor } from "./preProcessor";
import { isEnrichedPreProcessorResult, wrapAsUserText } from "./preProcessor";
import { cosineSimilarity } from "./preProcessorMath";

export interface CryptoPriceClassification {
  /** Whether the prompt likely asks for crypto price data. */
  needsCryptoPrice: boolean;
  /** Cosine similarity to the "needs crypto price" centroid. */
  cryptoPriceScore: number;
  /** Cosine similarity to the "no crypto price" centroid. */
  noCryptoPriceScore: number;
}

interface CryptoPriceClassifierOptions extends EmbeddingOptions {
  /**
   * Score margin: the crypto-price score must exceed the no-crypto-price
   * score by at least this amount to classify as "needs crypto price data".
   * @default 0.02
   */
  margin?: number;
}

function classify(embedding: number[], margin: number): CryptoPriceClassification {
  const cryptoPriceScore = cosineSimilarity(embedding, cryptoPriceCentroid);
  const noCryptoPriceScore = cosineSimilarity(embedding, noCryptoPriceCentroid);

  return {
    needsCryptoPrice: cryptoPriceScore > noCryptoPriceScore + margin,
    cryptoPriceScore,
    noCryptoPriceScore,
  };
}

/**
 * Classify whether a prompt needs crypto price data.
 *
 * Embeds the prompt and compares it against the pre-computed centroid
 * vectors. Domain is crypto only — stocks and FX are handled by
 * `classifyStockPrice`. Ambiguous prompts (e.g. *"gold price"*) may fire
 * both crypto and stock classifiers — that's expected; the caller can
 * inject both sets of results.
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
   * Called with the caller's crypto-price provider when the classifier
   * decides the prompt is asking for crypto prices. Return either a plain
   * string (wrapped by the SDK in a default user message) or a fully-formed
   * `LlmapiMessage[]` (full control over role/shape). Omit to run in
   * observer mode — classification still fires but nothing is injected.
   *
   * The `signal` argument is forwarded from the tool loop so long-running
   * price-API requests can be aborted when the caller aborts.
   */
  fetchCryptoPriceData?: (
    prompt: string,
    options: { signal?: AbortSignal }
  ) => Promise<string | LlmapiMessage[] | EnrichedPreProcessorResult>;
  /**
   * Score margin: `cryptoPriceScore` must exceed `noCryptoPriceScore` by at
   * least this amount to classify as "needs crypto price data".
   * @default 0.02
   */
  margin?: number;
  /** Observe the classification without injecting anything. */
  onClassification?: (result: CryptoPriceClassification) => void;
}

/**
 * Build a pre-processor that runs crypto-price classification on the shared
 * embedding provided by `runToolLoop`, and — if the classifier decides the
 * prompt is asking for prices — invokes the caller-supplied
 * `fetchCryptoPriceData` and injects the result into the conversation.
 *
 * Domain: crypto only. For stocks/ETFs/FX use `createStockPricePreProcessor`.
 * The SDK does not run the price lookup itself; the caller wires up
 * whichever provider they want (CoinGecko, DexScreener, an on-chain
 * oracle, etc.).
 */
export function createCryptoPricePreProcessor(
  options: CryptoPricePreProcessorOptions = {}
): PromptPreProcessor {
  const margin = options.margin ?? 0.02;
  return async ({ prompt, embedding, signal }) => {
    const classification = classify(embedding, margin);
    options.onClassification?.(classification);
    if (!classification.needsCryptoPrice || !options.fetchCryptoPriceData) return;
    const result = await options.fetchCryptoPriceData(prompt, { signal });
    if (isEnrichedPreProcessorResult(result)) return result;
    if (typeof result === "string") {
      const wrapped = wrapAsUserText("Current crypto prices:", result);
      return wrapped.length === 0 ? undefined : wrapped;
    }
    if (result.length === 0) return;
    return result;
  };
}
