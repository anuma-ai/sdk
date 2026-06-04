/**
 * Covers the `EnrichedPreProcessorResult` return shape across the four
 * built-in classifier factories. Per-classifier tests live in one file to
 * keep the mock setup (`cosineSimilarity` override → force the "yes" branch)
 * in one place.
 *
 * Classifier factories pass `EnrichedPreProcessorResult` through unchanged —
 * the user-supplied fetch fully controls message shape (role, content).
 * String returns still get wrapped with the per-classifier prefix for
 * backward compatibility.
 */

import { describe, expect, it, vi } from "vitest";

import * as mathModule from "./preProcessorMath";
import type { EnrichedPreProcessorResult, PreProcessorArtifact } from "./preProcessor";

vi.mock("./preProcessorMath", async (importOriginal) => {
  const orig = await importOriginal<typeof mathModule>();
  return { ...orig, cosineSimilarity: vi.fn() };
});

const mockCosine = vi.mocked(mathModule.cosineSimilarity);
function forceClassifyYes(): void {
  mockCosine.mockReset();
  mockCosine.mockReturnValueOnce(0.95).mockReturnValueOnce(0.1);
}

const sharedEmbedding = [0.1, 0.2, 0.3];

const sampleArtifact = (type: string): PreProcessorArtifact => ({
  type,
  payload: { sample: true },
});

const enrichedFor = (type: string): EnrichedPreProcessorResult => ({
  messages: [{ role: "user", content: [{ type: "text", text: `${type} payload` }] }],
  artifacts: [sampleArtifact(type)],
});

describe("classifier factories — EnrichedPreProcessorResult passthrough", () => {
  it("weather: forwards the enriched result verbatim", async () => {
    const { createWeatherPreProcessor } = await import("./weatherClassifier");
    forceClassifyYes();
    const enriched = enrichedFor("weather");
    const fetchWeatherData = vi.fn(async () => enriched);
    const p = createWeatherPreProcessor({ fetchWeatherData });

    const out = await p({ prompt: "weather lisbon", embedding: sharedEmbedding });

    expect(out).toBe(enriched);
  });

  it("cryptoPrice: forwards the enriched result verbatim", async () => {
    const { createCryptoPricePreProcessor } = await import("./cryptoPriceClassifier");
    forceClassifyYes();
    const enriched = enrichedFor("crypto_chart");
    const fetchCryptoPriceData = vi.fn(async () => enriched);
    const p = createCryptoPricePreProcessor({ fetchCryptoPriceData });

    const out = await p({ prompt: "btc price", embedding: sharedEmbedding });

    expect(out).toBe(enriched);
  });

  it("stockPrice: forwards the enriched result verbatim", async () => {
    const { createStockPricePreProcessor } = await import("./stockPriceClassifier");
    forceClassifyYes();
    const enriched = enrichedFor("stock_chart");
    const fetchStockPriceData = vi.fn(async () => enriched);
    const p = createStockPricePreProcessor({ fetchStockPriceData });

    const out = await p({ prompt: "nvda price", embedding: sharedEmbedding });

    expect(out).toBe(enriched);
  });

  it("webSearch: forwards the enriched result verbatim", async () => {
    const { createWebSearchPreProcessor } = await import("./webSearchClassifier");
    forceClassifyYes();
    const enriched = enrichedFor("search_citations");
    const fetchSearchResults = vi.fn(async () => enriched);
    const p = createWebSearchPreProcessor({ fetchSearchResults });

    const out = await p({ prompt: "latest news", embedding: sharedEmbedding });

    expect(out).toBe(enriched);
  });

  it("string fetch return — wraps with the classifier's prefix (backward compat)", async () => {
    const { createWeatherPreProcessor } = await import("./weatherClassifier");
    forceClassifyYes();
    const fetchWeatherData = vi.fn(async () => "sunny");
    const p = createWeatherPreProcessor({ fetchWeatherData });

    const out = await p({ prompt: "q", embedding: sharedEmbedding });

    expect(Array.isArray(out)).toBe(true);
    expect(JSON.stringify(out)).toContain("Weather data:");
    expect(JSON.stringify(out)).toContain("sunny");
  });

  it("empty messages + empty artifacts is a valid passthrough (no-op enrichment)", async () => {
    const { createWeatherPreProcessor } = await import("./weatherClassifier");
    forceClassifyYes();
    const enriched: EnrichedPreProcessorResult = { messages: [] };
    const fetchWeatherData = vi.fn(async () => enriched);
    const p = createWeatherPreProcessor({ fetchWeatherData });

    const out = await p({ prompt: "q", embedding: sharedEmbedding });

    expect(out).toBe(enriched);
  });
});
