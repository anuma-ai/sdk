import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../client", () => ({ postApiV1Embeddings: vi.fn() }));
vi.mock("../db/chat/operations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../db/chat/operations")>()),
  searchChunksOp: vi.fn(async () => []),
}));

import { postApiV1Embeddings } from "../../client";
import { maskScopedEmbeddingCache } from "../db/chat/embeddingCache";
import type { StorageOperationsContext } from "../db/chat/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import { generateEmbedding } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { recall } from "./recall";
import { createLocalMemoryStore } from "./store/local";
import type { RemoteMemoryPersistence } from "./store/remotePersistence";
import { createRemoteMemoryPipeline } from "./store/remotePipeline";
import type { RecallDiagnostics } from "./types";

const QUERY = "Drinks tea";
const VECTOR = [1, 0];
const embeddingOptions = { apiKey: "store-key", model: "test-model" };

async function setup(options: Partial<EmbeddingOptions> = {}) {
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `recall-cache-${Math.random()}`,
    }),
    modelClasses: sdkModelClasses,
  });
  const store = createLocalMemoryStore({
    database,
    embeddingOptions: { ...embeddingOptions, ...options },
  });
  await store.create({
    content: QUERY,
    embedding: JSON.stringify(VECTOR),
    embeddingModel: embeddingOptions.model,
  });
  return { factSource: store.factSource, embeddingOptions };
}

beforeEach(() => {
  vi.mocked(postApiV1Embeddings).mockReset();
  vi.mocked(postApiV1Embeddings).mockResolvedValue({
    data: { data: [{ embedding: VECTOR }] },
  } as Awaited<ReturnType<typeof postApiV1Embeddings>>);
});

describe("recall embedding cache through a local fact source", () => {
  it.each([false, true])(
    "coalesces concurrent fact, chunk and caller embeddings (decryptLast=%s)",
    async (decryptLast) => {
      const ctx = await setup();
      const embeddingCache = new Map<string, Float32Array>();
      const results = await Promise.all([
        recall(QUERY, ctx, { embeddingCache, decryptLast }),
        recall(
          QUERY,
          { ...ctx, storageCtx: {} as StorageOperationsContext },
          { types: ["chunk"], embeddingCache }
        ),
        generateEmbedding(QUERY, {
          ...embeddingOptions,
          cache: maskScopedEmbeddingCache(embeddingCache, false),
        }),
      ]);

      expect(results[0].memories).toHaveLength(1);
      expect(postApiV1Embeddings).toHaveBeenCalledTimes(1);
      expect(embeddingCache.get(`r:${QUERY}`)).toEqual(Float32Array.from(VECTOR));
      await recall(QUERY, ctx, { embeddingCache, decryptLast });
      expect(postApiV1Embeddings).toHaveBeenCalledTimes(1);
      await recall(QUERY, ctx, { embeddingCache: new Map(), decryptLast });
      expect(postApiV1Embeddings).toHaveBeenCalledTimes(2);
    }
  );

  it.each([false, true])("does not embed an empty scope (decryptLast=%s)", async (decryptLast) => {
    const ctx = await setup();
    for (const scope of [{ memoryIds: [] }, { scopes: ["shared"] }]) {
      const result = await recall(QUERY, ctx, {
        ...scope,
        embeddingCache: new Map(),
        decryptLast,
      });
      expect(result.memories).toEqual([]);
    }
    expect(postApiV1Embeddings).not.toHaveBeenCalled();
  });

  it("scopes the cache by the source's actual masking and retains source credentials", async () => {
    const embeddingCache = new Map<string, Float32Array>();
    embeddingCache.set(`r:${QUERY}`, Float32Array.from([0, 1]));
    const maskInput = vi.fn(() => "[masked]");
    const ctx = await setup({ maskInput });

    await recall(
      QUERY,
      { ...ctx, embeddingOptions: { apiKey: "caller-key", model: "caller-model" } },
      { embeddingCache }
    );

    expect(postApiV1Embeddings).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        body: { input: "[masked]", model: "test-model" },
        headers: expect.objectContaining({ "X-API-Key": "store-key" }),
      })
    );
    expect(embeddingCache.get(`m:${QUERY}`)).toEqual(Float32Array.from(VECTOR));
    expect(embeddingCache.get(`r:${QUERY}`)).toEqual(Float32Array.from([0, 1]));
    await generateEmbedding(QUERY, {
      ...embeddingOptions,
      maskInput,
      cache: maskScopedEmbeddingCache(embeddingCache, true),
    });
    expect(postApiV1Embeddings).toHaveBeenCalledTimes(1);
  });

  it("keeps a source-configured cache authoritative", async () => {
    const sourceCache = new Map([[QUERY, Float32Array.from(VECTOR)]]);
    const ctx = await setup({ cache: sourceCache });
    const result = await recall(QUERY, ctx, { embeddingCache: new Map() });
    expect(result.memories).toHaveLength(1);
    expect(postApiV1Embeddings).not.toHaveBeenCalled();
  });

  it("preserves uncached requests when no shared cache is supplied", async () => {
    const ctx = await setup();
    await recall(QUERY, ctx);
    await recall(QUERY, ctx);
    expect(postApiV1Embeddings).toHaveBeenCalledTimes(2);
  });

  it("does not serve a source vector to a caller using a different model", async () => {
    const ctx = await setup();
    const embeddingCache = new Map<string, Float32Array>();
    await recall(QUERY, ctx, { embeddingCache });
    vi.mocked(postApiV1Embeddings).mockResolvedValueOnce({
      data: { data: [{ embedding: [0, 1, 0] }] },
    } as Awaited<ReturnType<typeof postApiV1Embeddings>>);

    const callerVector = await generateEmbedding(QUERY, {
      ...embeddingOptions,
      model: "other-model",
      cache: maskScopedEmbeddingCache(embeddingCache, false),
    });
    expect(callerVector).toEqual([0, 1, 0]);
    const recalled = await recall(QUERY, ctx, { embeddingCache });
    expect(recalled.memories).toHaveLength(1);
    expect(postApiV1Embeddings).toHaveBeenCalledTimes(3);
  });

  it("recovers on the same cache after a query embedding failure", async () => {
    const ctx = await setup();
    const embeddingCache = new Map<string, Float32Array>();
    const seen: RecallDiagnostics[] = [];
    vi.mocked(postApiV1Embeddings).mockResolvedValueOnce({
      error: { error: "expired credentials" },
      response: new Response(null, { status: 401 }),
    } as Awaited<ReturnType<typeof postApiV1Embeddings>>);

    const degraded = await recall(QUERY, ctx, {
      embeddingCache,
      onDiagnostics: (diagnostics) => seen.push(diagnostics),
    });
    expect(degraded.memories).toHaveLength(1);
    expect(seen[0].degraded).toContain("embeddings-unavailable");
    expect(embeddingCache.size).toBe(0);
    const recovered = await recall(QUERY, ctx, { embeddingCache });
    expect(recovered.memories).toHaveLength(1);
    expect(embeddingCache.get(`r:${QUERY}`)).toEqual(Float32Array.from(VECTOR));
    expect(postApiV1Embeddings).toHaveBeenCalledTimes(2);
  });

  it("shares the cache with facet embeddings", async () => {
    const ctx = await setup();
    const embeddingCache = new Map<string, Float32Array>();
    const subQueries = ["tea preference", "coffee preference"];
    vi.mocked(postApiV1Embeddings).mockResolvedValueOnce({
      data: { data: [{ embedding: VECTOR }] },
    } as Awaited<ReturnType<typeof postApiV1Embeddings>>);
    vi.mocked(postApiV1Embeddings).mockResolvedValueOnce({
      data: { data: subQueries.map(() => ({ embedding: VECTOR })) },
    } as Awaited<ReturnType<typeof postApiV1Embeddings>>);

    await recall(QUERY, ctx, { embeddingCache, subQueries });
    await recall(QUERY, ctx, { embeddingCache, subQueries });

    expect(postApiV1Embeddings).toHaveBeenCalledTimes(2);
    expect(vi.mocked(postApiV1Embeddings).mock.calls[1][0].body?.input).toEqual(subQueries);
    for (const query of [QUERY, ...subQueries]) {
      expect(embeddingCache.get(`r:${query}`)).toEqual(Float32Array.from(VECTOR));
    }
  });

  it("retains the query deadline and retries after a timed-out request", async () => {
    const ctx = await setup();
    const embeddingCache = new Map<string, Float32Array>();
    const seen: RecallDiagnostics[] = [];
    vi.mocked(postApiV1Embeddings).mockImplementationOnce(
      ({ signal }) =>
        new Promise<never>((_, reject) => {
          signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
        })
    );

    await recall(QUERY, ctx, {
      embeddingCache,
      queryEmbedTotalTimeoutMs: 10,
      onDiagnostics: (diagnostics) => seen.push(diagnostics),
    });
    expect(seen[0].degraded).toContain("embeddings-unavailable");
    expect(embeddingCache.size).toBe(0);
    await recall(QUERY, ctx, { embeddingCache });
    expect(embeddingCache.get(`r:${QUERY}`)).toEqual(Float32Array.from(VECTOR));
    expect(postApiV1Embeddings).toHaveBeenCalledTimes(2);
  });
});

describe("recall embedding cache through a remote fact source", () => {
  it.each([false, true])(
    "coalesces caller embeddings with the source (masked=%s)",
    async (masked) => {
      const embeddingCache = new Map<string, Float32Array>();
      const remoteVector = [1, ...new Array<number>(1535).fill(0)];
      const options: EmbeddingOptions = {
        ...embeddingOptions,
        ...(masked && { maskInput: () => "[masked]" }),
      };
      const persistence: RemoteMemoryPersistence = {
        counts: vi.fn(async () => ({ live: 0, archived: 0, quarantined: 0 })),
        temporal: vi.fn(async () => []),
        get: vi.fn(),
        list: vi.fn(),
        query: vi.fn(),
        queryMetadata: vi.fn(),
        put: vi.fn(),
        putMany: vi.fn(),
        candidateSet: vi.fn(),
        candidates: vi.fn(async () => ({ items: [], failed: [] })),
      };
      const pipeline = createRemoteMemoryPipeline({
        persistence,
        embeddingOptions: options,
        graphRanking: async () => [],
        temporalRanking: async () => [],
      });
      vi.mocked(postApiV1Embeddings).mockResolvedValue({
        data: { data: [{ embedding: remoteVector }] },
      } as Awaited<ReturnType<typeof postApiV1Embeddings>>);

      await Promise.all([
        pipeline.recall(QUERY, { embeddingCache }),
        generateEmbedding(QUERY, {
          ...options,
          cache: maskScopedEmbeddingCache(embeddingCache, masked),
        }),
      ]);
      expect(postApiV1Embeddings).toHaveBeenCalledTimes(1);
      expect(vi.mocked(postApiV1Embeddings).mock.calls[0][0].body?.input).toBe(
        masked ? "[masked]" : QUERY
      );
      await pipeline.recall(QUERY, { embeddingCache });
      expect(postApiV1Embeddings).toHaveBeenCalledTimes(1);
      expect(persistence.candidates).toHaveBeenCalledTimes(2);
    }
  );
});
