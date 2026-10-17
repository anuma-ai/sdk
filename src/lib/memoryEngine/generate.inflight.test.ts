import { afterEach, describe, expect, it, vi } from "vitest";

import { maskScopedEmbeddingCache } from "../db/chat/embeddingCache";
import { generateEmbedding } from "./generate";

const BASE = "https://portal.test";

function stubFetch(delayMs = 0): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { input: string };
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, delayMs);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(init.signal?.reason ?? new Error("aborted"));
      });
    });
    return new Response(
      JSON.stringify({ data: [{ embedding: [body.input.length, 1, 0], index: 0 }] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("generateEmbedding — shared requests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends one request for parallel callers sharing a cache and text", async () => {
    const fetchMock = stubFetch(5);
    const cache = new Map<string, Float32Array>();

    const [a, b] = await Promise.all([
      generateEmbedding("coffee rn", { apiKey: "k", baseUrl: BASE, cache }),
      generateEmbedding("coffee rn", { apiKey: "k", baseUrl: BASE, cache }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(b).toEqual(a);
  });

  it("shares across callers that each build the same mask-scoped view", async () => {
    const fetchMock = stubFetch(5);
    const shared = new Map<string, Float32Array>();

    await Promise.all([
      generateEmbedding("coffee rn", {
        apiKey: "k",
        baseUrl: BASE,
        cache: maskScopedEmbeddingCache(shared, false),
      }),
      generateEmbedding("coffee rn", {
        apiKey: "k",
        baseUrl: BASE,
        cache: maskScopedEmbeddingCache(shared, false),
      }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps masked and unmasked embeddings of the same text apart", async () => {
    const fetchMock = stubFetch(5);
    const shared = new Map<string, Float32Array>();

    await Promise.all([
      generateEmbedding("coffee rn", {
        apiKey: "k",
        baseUrl: BASE,
        cache: maskScopedEmbeddingCache(shared, false),
      }),
      generateEmbedding("coffee rn", {
        apiKey: "k",
        baseUrl: BASE,
        cache: maskScopedEmbeddingCache(shared, true),
      }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("still answers a waiting caller when the caller that started the request times out", async () => {
    const fetchMock = stubFetch(40);
    const cache = new Map<string, Float32Array>();

    const first = generateEmbedding("coffee rn", {
      apiKey: "k",
      baseUrl: BASE,
      cache,
      totalTimeoutMs: 5,
    });
    const second = generateEmbedding("coffee rn", { apiKey: "k", baseUrl: BASE, cache });

    await expect(first).rejects.toThrow();
    await expect(second).resolves.toEqual([9, 1, 0]);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("sends separate requests without a cache", async () => {
    const fetchMock = stubFetch(5);

    await Promise.all([
      generateEmbedding("coffee rn", { apiKey: "k", baseUrl: BASE }),
      generateEmbedding("coffee rn", { apiKey: "k", baseUrl: BASE }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
