/**
 * Stock Price Classifier
 *
 * Determines whether a user prompt is asking for current stock, ETF, index,
 * or FX quote data (Twelve Data territory) before being sent to the LLM.
 * Compares the prompt embedding against two pre-computed centroid vectors
 * (stock-price vs no-stock-price).
 *
 * No LLM calls — one embedding per prompt + two cosine similarities.
 *
 * To regenerate centroids after changing reference phrases:
 *   PORTAL_API_KEY=... npx tsx scripts/generateStockPriceCentroids.ts
 */

import type { LlmapiMessage } from "../../client";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import type { PromptPreProcessor } from "./preProcessor";
import { wrapAsUserText } from "./preProcessor";
import { cosineSimilarity } from "./preProcessorMath";
import { noStockPriceCentroid, stockPriceCentroid } from "./stockPriceCentroids";

export interface StockPriceClassification {
  /** Whether the prompt likely asks for stock/ETF/FX quote data. */
  needsStockPrice: boolean;
  /** Cosine similarity to the "needs stock price" centroid. */
  stockPriceScore: number;
  /** Cosine similarity to the "no stock price" centroid. */
  noStockPriceScore: number;
}

interface StockPriceClassifierOptions extends EmbeddingOptions {
  /**
   * Score margin: the stock-price score must exceed the no-stock-price
   * score by at least this amount to classify as "needs stock price data".
   * @default 0.02
   */
  margin?: number;
}

function classify(embedding: number[], margin: number): StockPriceClassification {
  const stockPriceScore = cosineSimilarity(embedding, stockPriceCentroid);
  const noStockPriceScore = cosineSimilarity(embedding, noStockPriceCentroid);

  return {
    needsStockPrice: stockPriceScore > noStockPriceScore + margin,
    stockPriceScore,
    noStockPriceScore,
  };
}

/**
 * Classify whether a prompt needs stock/ETF/index/FX price data.
 *
 * Domain: traditional financial instruments (equities, indices, ETFs, FX).
 * Crypto is handled by `classifyCryptoPrice`. Ambiguous prompts
 * (e.g. *"gold price"*) may fire both — that's expected; the caller can
 * inject both sets of results.
 */
export async function classifyStockPrice(
  prompt: string,
  options: StockPriceClassifierOptions
): Promise<StockPriceClassification> {
  const { margin = 0.02, ...embeddingOptions } = options;
  const embedding = await generateEmbedding(prompt, embeddingOptions);
  return classify(embedding, margin);
}

/**
 * Batch-classify multiple prompts. Embeds all prompts in one batch
 * call for efficiency.
 */
export async function classifyStockPriceBatch(
  prompts: string[],
  options: StockPriceClassifierOptions
): Promise<StockPriceClassification[]> {
  const { margin = 0.02, ...embeddingOptions } = options;
  const embeddings = await generateEmbeddings(prompts, embeddingOptions);
  return embeddings.map((emb) => classify(emb, margin));
}

export interface StockPricePreProcessorOptions {
  /**
   * Called with the caller's stock-quote provider when the classifier
   * decides the prompt is asking for stock/ETF/FX data. Return either a
   * plain string (wrapped by the SDK in a default user message) or a
   * fully-formed `LlmapiMessage[]` (full control over role/shape). Omit
   * to run in observer mode — classification still fires but nothing is
   * injected.
   *
   * The `signal` argument is forwarded from the tool loop so long-running
   * provider requests can be aborted when the caller aborts.
   */
  fetchStockPriceData?: (
    prompt: string,
    options: { signal?: AbortSignal }
  ) => Promise<string | LlmapiMessage[]>;
  /**
   * Score margin: `stockPriceScore` must exceed `noStockPriceScore` by at
   * least this amount to classify as "needs stock price data".
   * @default 0.02
   */
  margin?: number;
  /** Observe the classification without injecting anything. */
  onClassification?: (result: StockPriceClassification) => void;
}

/**
 * Build a pre-processor that runs stock-price classification on the shared
 * embedding provided by `runToolLoop`, and — if the classifier decides the
 * prompt is asking for quotes — invokes the caller-supplied
 * `fetchStockPriceData` and injects the result into the conversation.
 *
 * Domain: stocks, ETFs, indices, FX. For crypto use
 * `createCryptoPricePreProcessor`. The SDK does not run the lookup itself;
 * the caller wires up whichever provider they want (Twelve Data, Alpha
 * Vantage, Finnhub, etc.).
 */
export function createStockPricePreProcessor(
  options: StockPricePreProcessorOptions = {}
): PromptPreProcessor {
  const margin = options.margin ?? 0.02;
  return async ({ prompt, embedding, signal }) => {
    const classification = classify(embedding, margin);
    options.onClassification?.(classification);
    if (!classification.needsStockPrice || !options.fetchStockPriceData) return;
    const results = await options.fetchStockPriceData(prompt, { signal });
    if (typeof results === "string") {
      const wrapped = wrapAsUserText("Current stock/ETF/FX quotes:", results);
      return wrapped.length === 0 ? undefined : wrapped;
    }
    if (results.length === 0) return;
    return results;
  };
}
