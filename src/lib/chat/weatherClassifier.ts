/**
 * Weather Classifier
 *
 * Determines whether a user prompt is asking for weather data (forecasts,
 * temperature, precipitation, air quality, marine, etc.) before being sent
 * to the LLM. Compares the prompt embedding against two pre-computed
 * centroid vectors (weather vs no-weather).
 *
 * No LLM calls — one embedding per prompt + two cosine similarities.
 *
 * To regenerate centroids after changing reference phrases:
 *   PORTAL_API_KEY=... npx tsx scripts/generateWeatherCentroids.ts
 */

import type { LlmapiMessage } from "../../client";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import type { PromptPreProcessor } from "./preProcessor";
import { cosineSimilarity } from "./preProcessorMath";
import { noWeatherCentroid, weatherCentroid } from "./weatherCentroids";

export interface WeatherClassification {
  /** Whether the prompt likely asks for weather data. */
  needsWeather: boolean;
  /** Cosine similarity to the "needs weather" centroid. */
  weatherScore: number;
  /** Cosine similarity to the "no weather" centroid. */
  noWeatherScore: number;
}

interface WeatherClassifierOptions extends EmbeddingOptions {
  /**
   * Score margin: the weather score must exceed the no-weather score by at
   * least this amount to classify as "needs weather data".
   * @default 0.02
   */
  margin?: number;
}

function classify(embedding: number[], margin: number): WeatherClassification {
  const weatherScore = cosineSimilarity(embedding, weatherCentroid);
  const noWeatherScore = cosineSimilarity(embedding, noWeatherCentroid);

  return {
    needsWeather: weatherScore > noWeatherScore + margin,
    weatherScore,
    noWeatherScore,
  };
}

/**
 * Classify whether a prompt needs weather data.
 *
 * Covers forecasts, temperature, precipitation, wind, humidity, UV, AQI,
 * marine, flood, climate — anything OpenMeteo-shaped.
 */
export async function classifyWeather(
  prompt: string,
  options: WeatherClassifierOptions
): Promise<WeatherClassification> {
  const { margin = 0.02, ...embeddingOptions } = options;
  const embedding = await generateEmbedding(prompt, embeddingOptions);
  return classify(embedding, margin);
}

/**
 * Batch-classify multiple prompts. Embeds all prompts in one batch
 * call for efficiency.
 */
export async function classifyWeatherBatch(
  prompts: string[],
  options: WeatherClassifierOptions
): Promise<WeatherClassification[]> {
  const { margin = 0.02, ...embeddingOptions } = options;
  const embeddings = await generateEmbeddings(prompts, embeddingOptions);
  return embeddings.map((emb) => classify(emb, margin));
}

export interface WeatherPreProcessorOptions {
  /**
   * Called with the caller's weather provider when the classifier decides
   * the prompt is asking for weather. Return either a plain string
   * (wrapped by the SDK in a default user message) or a fully-formed
   * `LlmapiMessage[]` (full control over role/shape). Omit to run in
   * observer mode — classification still fires but nothing is injected.
   *
   * The `signal` argument is forwarded from the tool loop so long-running
   * provider requests can be aborted when the caller aborts.
   */
  fetchWeatherData?: (
    prompt: string,
    options: { signal?: AbortSignal }
  ) => Promise<string | LlmapiMessage[]>;
  /**
   * Score margin: `weatherScore` must exceed `noWeatherScore` by at least
   * this amount to classify as "needs weather data".
   * @default 0.02
   */
  margin?: number;
  /** Observe the classification without injecting anything. */
  onClassification?: (result: WeatherClassification) => void;
}

/**
 * Build a pre-processor that runs weather classification on the shared
 * embedding provided by `runToolLoop`, and — if the classifier decides
 * the prompt is asking for weather — invokes the caller-supplied
 * `fetchWeatherData` and injects the result into the conversation.
 *
 * The SDK does not run the weather lookup itself; the caller wires up
 * whichever provider they want (OpenMeteo, AccuWeather, weather.gov, etc.).
 */
export function createWeatherPreProcessor(
  options: WeatherPreProcessorOptions = {}
): PromptPreProcessor {
  const margin = options.margin ?? 0.02;
  return async ({ prompt, embedding, signal }) => {
    const classification = classify(embedding, margin);
    options.onClassification?.(classification);
    if (!classification.needsWeather || !options.fetchWeatherData) return;
    const results = await options.fetchWeatherData(prompt, { signal });
    if (typeof results === "string") {
      if (!results) return;
      return [
        {
          role: "user",
          content: [{ type: "text", text: `Weather data:\n${results}` }],
        },
      ];
    }
    if (results.length === 0) return;
    return results;
  };
}
