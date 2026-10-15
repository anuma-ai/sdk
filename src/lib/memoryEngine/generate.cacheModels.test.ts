import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_API_EMBEDDING_MODEL } from "./constants";
import { generateEmbedding, generateEmbeddings } from "./generate";

const TEXT = "same prompt";
const BASE_URL = "https://portal.example";
const MODELS = { first: [1, 0], second: [0, 1, 0] };
type Mode = "scalar" | "batch";

const modes: [Mode, Mode][] = [
  ["scalar", "scalar"],
  ["scalar", "batch"],
  ["batch", "scalar"],
  ["batch", "batch"],
];

const embed = async (mode: Mode, model: string, cache: Map<string, Float32Array>) => {
  const options = { apiKey: "key", baseUrl: BASE_URL, model, cache };
  return mode === "scalar"
    ? generateEmbedding(TEXT, options)
    : (await generateEmbeddings([TEXT], options))[0];
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const body = (await request.json()) as { input: string | string[]; model: string };
      const vector = MODELS[body.model as keyof typeof MODELS] ?? [1, 1];
      const texts = Array.isArray(body.input) ? body.input : [body.input];
      return new Response(JSON.stringify({ data: texts.map(() => ({ embedding: vector })) }), {
        headers: { "Content-Type": "application/json" },
      });
    })
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("embedding cache model identity", () => {
  it.each(modes)("isolates completed vectors from %s to %s", async (first, second) => {
    const cache = new Map<string, Float32Array>();
    expect(await embed(first, "first", cache)).toEqual(MODELS.first);
    expect(await embed(second, "second", cache)).toEqual(MODELS.second);
    expect(await embed(second, "second", cache)).toEqual(MODELS.second);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect([...cache.keys()]).toEqual([TEXT]);
    expect(cache.get(TEXT)).toEqual(Float32Array.from(MODELS.second));
  });

  it.each(modes)("isolates concurrent %s and %s requests", async (first, second) => {
    const cache = new Map<string, Float32Array>();
    const vectors = await Promise.all([
      embed(first, "first", cache),
      embed(second, "second", cache),
    ]);
    expect(vectors).toEqual([MODELS.first, MODELS.second]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("coalesces an omitted model with the explicit default", async () => {
    const cache = new Map<string, Float32Array>();
    const options = { apiKey: "key", baseUrl: BASE_URL, cache };
    const vectors = await Promise.all([
      generateEmbedding(TEXT, options),
      generateEmbedding(TEXT, { ...options, model: DEFAULT_API_EMBEDDING_MODEL }),
    ]);
    expect(vectors).toEqual([
      [1, 1],
      [1, 1],
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("continues to trust caller-seeded vectors and manual replacements", async () => {
    const cache = new Map([[TEXT, Float32Array.from([9, 9])]]);
    expect(await embed("scalar", "first", cache)).toEqual([9, 9]);
    expect(await embed("batch", "second", cache)).toEqual([9, 9]);
    expect(fetch).not.toHaveBeenCalled();

    cache.clear();
    expect(await embed("scalar", "first", cache)).toEqual(MODELS.first);
    cache.set(TEXT, Float32Array.from([8, 8]));
    expect(await embed("batch", "second", cache)).toEqual([8, 8]);
    cache.delete(TEXT);
    expect(await embed("batch", "second", cache)).toEqual(MODELS.second);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
