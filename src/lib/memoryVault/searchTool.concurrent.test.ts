import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/memoryVault/operations", () => ({
  getAllVaultMemoriesOp: vi.fn(),
  getMemoriesByEventTimeOp: vi.fn(),
  getVaultCandidateKeysOp: vi.fn(),
  getVaultEmbeddingsByIdsOp: vi.fn(),
  getVaultMemoriesByIdsOp: vi.fn(),
  updateVaultMemoryEmbeddingOp: vi.fn(),
}));
vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));
vi.mock("../memory/reflect", () => ({ reflect: vi.fn() }));

import {
  getAllVaultMemoriesOp,
  getMemoriesByEventTimeOp,
  getVaultCandidateKeysOp,
  getVaultEmbeddingsByIdsOp,
  getVaultMemoriesByIdsOp,
  updateVaultMemoryEmbeddingOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import { reflect } from "../memory/reflect";
import { DEFAULT_PROFILE_FACETS, synthesizeProfile } from "../memory/synthesizeProfile";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import {
  createVaultEmbeddingCache,
  preEmbedVaultMemories,
  prepareVaultCandidates,
  searchVaultMemoriesWithSize,
} from "./searchTool";
import { createVaultPreparation } from "./vaultPreparation";

const embeddingOptions = { apiKey: "test-key", model: "current-model" };

function memory(id: string, overrides: Partial<StoredVaultMemory> = {}): StoredVaultMemory {
  return {
    uniqueId: id,
    content: id,
    scope: "private",
    folderId: null,
    userId: null,
    embedding: null,
    embeddingModel: null,
    sourceChunkIds: null,
    proofCount: null,
    source: null,
    eventTimeStart: null,
    eventTimeEnd: null,
    eventTimeKind: null,
    topicsUserManaged: false,
    topicsExtractedAt: null,
    topicsExtractedVersion: null,
    supersededBy: null,
    supersededAt: null,
    lastObservedAt: null,
    factType: null,
    archivedAt: null,
    trustTier: null,
    topics: null,
    topicsUpdatedAt: null,
    visibility: "private",
    twinOptIn: false,
    publishedAt: null,
    geohash: null,
    createdAt: new Date(1000),
    updatedAt: new Date(2000),
    isDeleted: false,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([memory("alpha")]);
  vi.mocked(getMemoriesByEventTimeOp).mockResolvedValue([]);
  vi.mocked(generateEmbedding).mockResolvedValue([1, 0]);
  vi.mocked(generateEmbeddings).mockImplementation((texts) =>
    Promise.resolve(texts.map(() => [1, 0]))
  );
  vi.mocked(updateVaultMemoryEmbeddingOp).mockResolvedValue(true);
});

describe("concurrent vault preparation", () => {
  it.each([false, true])("shares the corpus across all six facets (store=%s)", async (useStore) => {
    const rows = [
      memory("alpha"),
      memory("beta", { embedding: "[0,1]", embeddingModel: "old-model" }),
    ];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(rows);
    vi.mocked(generateEmbedding).mockImplementation((query) => {
      const index = DEFAULT_PROFILE_FACETS.findIndex((facet) => facet.query === query);
      return Promise.resolve(index % 2 === 0 ? [1, 0] : [0, 1]);
    });
    const batch = deferred<number[][]>();
    const delayedFacet = deferred<void>();
    vi.mocked(generateEmbeddings).mockReturnValue(batch.promise);
    vi.mocked(reflect).mockImplementation((_query, _ctx, options) => {
      const ids = options.memories!.map((row) => row.id);
      delayedFacet.resolve();
      return Promise.resolve({
        text: ids.join(","),
        structuredOutput: { summary: ids.join(","), hasEvidence: true },
        basedOn: { memoryIds: ids },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      });
    });

    const vaultCtx = {} as VaultMemoryOperationsContext;
    const vaultCache = createVaultEmbeddingCache();
    const synthesis = synthesizeProfile(
      {
        vaultCtx,
        vaultCache,
        embeddingOptions,
      },
      {
        apiKey: "test-key",
        limit: 1,
        ...(useStore && {
          store: {
            list: () => Promise.resolve(rows),
            listProjections: () => Promise.resolve([]),
            factSource: {
              search: (query, options) =>
                searchVaultMemoriesWithSize(query, vaultCtx, embeddingOptions, vaultCache, options),
              graphRanking: async (query) => {
                if (query === DEFAULT_PROFILE_FACETS[5].query) await delayedFacet.promise;
                return [];
              },
              temporalRanking: () => Promise.resolve([]),
            },
          },
        }),
      }
    );
    await vi.waitFor(() => expect(generateEmbedding).toHaveBeenCalledTimes(useStore ? 5 : 6));
    batch.resolve([
      [1, 0],
      [0, 1],
    ]);
    const doc = await synthesis;

    expect(doc.sections.map((section) => section.sourceMemoryIds)).toEqual(
      DEFAULT_PROFILE_FACETS.map((_, index) => [index % 2 === 0 ? "alpha" : "beta"])
    );
    expect(getAllVaultMemoriesOp).toHaveBeenCalledTimes(useStore ? 1 : 2);
    expect(generateEmbedding).toHaveBeenCalledTimes(6);
    expect(generateEmbeddings).toHaveBeenCalledExactlyOnceWith(
      ["alpha", "beta"],
      expect.objectContaining(embeddingOptions)
    );
    expect(updateVaultMemoryEmbeddingOp).toHaveBeenCalledTimes(2);
  });

  it("shares row requests with projected search and vault pre-embedding", async () => {
    const row = memory("alpha");
    vi.mocked(getVaultCandidateKeysOp).mockResolvedValue([
      {
        uniqueId: row.uniqueId,
        updatedAt: row.updatedAt,
        embeddingModel: null,
        folderId: null,
        scope: "private",
      },
    ]);
    vi.mocked(getVaultEmbeddingsByIdsOp).mockResolvedValue([]);
    vi.mocked(getVaultMemoriesByIdsOp).mockResolvedValue([row]);
    const batch = deferred<number[][]>();
    vi.mocked(generateEmbeddings).mockReturnValue(batch.promise);
    const ctx = {} as VaultMemoryOperationsContext;
    const cache = createVaultEmbeddingCache();

    const searches = [
      prepareVaultCandidates("one", ctx, embeddingOptions, cache),
      prepareVaultCandidates("two", ctx, embeddingOptions, cache, { decryptLast: true }),
      preEmbedVaultMemories(ctx, embeddingOptions, cache),
    ];
    await vi.waitFor(() => expect(getVaultMemoriesByIdsOp).toHaveBeenCalled());
    batch.resolve([[1, 0]]);
    const [legacy, projected] = await Promise.all(searches);

    expect(legacy!.embeddedItems[0].embedding).toEqual(Float32Array.from([1, 0]));
    expect(projected!.embeddedItems[0].embedding).toEqual(Float32Array.from([1, 0]));
    expect(generateEmbeddings).toHaveBeenCalledTimes(1);
    expect(updateVaultMemoryEmbeddingOp).toHaveBeenCalledExactlyOnceWith(
      ctx,
      row.uniqueId,
      "[1,0]",
      embeddingOptions.model,
      { content: row.content, updatedAt: row.updatedAt.getTime() }
    );
  });

  it("shares only the overlapping rows from different scopes", async () => {
    const shared = memory("shared");
    vi.mocked(getAllVaultMemoriesOp).mockImplementation((_ctx, options) =>
      Promise.resolve(options?.folderId === "a" ? [shared, memory("a")] : [shared, memory("b")])
    );
    const batch = deferred<number[][]>();
    vi.mocked(generateEmbeddings).mockImplementation(async (texts) => {
      await batch.promise;
      return texts.map(() => [1, 0]);
    });
    const ctx = {} as VaultMemoryOperationsContext;
    const cache = createVaultEmbeddingCache();
    const searches = ["a", "b"].map((folderId) =>
      prepareVaultCandidates("query", ctx, embeddingOptions, cache, { folderId })
    );
    await vi.waitFor(() => expect(generateEmbedding).toHaveBeenCalledTimes(2));
    batch.resolve([]);
    const prepared = await Promise.all(searches);

    expect(prepared.map((result) => result.memories.map((row) => row.uniqueId))).toEqual([
      ["shared", "a"],
      ["shared", "b"],
    ]);
    expect(
      vi
        .mocked(generateEmbeddings)
        .mock.calls.flatMap(([texts]) => texts)
        .sort()
    ).toEqual(["a", "b", "shared"]);
    expect(updateVaultMemoryEmbeddingOp).toHaveBeenCalledTimes(3);
  });

  it("retains row preparation for later facets after cache eviction", async () => {
    const ctx = {} as VaultMemoryOperationsContext;
    const cache = createVaultEmbeddingCache();
    const options = { vaultPreparation: createVaultPreparation() };
    await prepareVaultCandidates("one", ctx, embeddingOptions, cache, options);
    cache.clear();

    const prepared = await prepareVaultCandidates("two", ctx, embeddingOptions, cache, options);

    expect(prepared.embeddedItems[0].embedding).toEqual(Float32Array.from([1, 0]));
    expect(getAllVaultMemoriesOp).toHaveBeenCalledTimes(1);
    expect(generateEmbeddings).toHaveBeenCalledTimes(1);
    expect(updateVaultMemoryEmbeddingOp).toHaveBeenCalledTimes(1);
  });

  it.each(["content", "revision", "model", "context", "mask", "base URL"])(
    "keeps a different %s separate from a pending row request",
    async (difference) => {
      const batch = deferred<number[][]>();
      vi.mocked(generateEmbeddings).mockReturnValue(batch.promise);
      const ctx = {} as VaultMemoryOperationsContext;
      const first = prepareVaultCandidates(
        "query",
        ctx,
        embeddingOptions,
        createVaultEmbeddingCache()
      );
      await vi.waitFor(() => expect(generateEmbeddings).toHaveBeenCalledTimes(1));
      vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
        memory("alpha", {
          ...(difference === "content" && { content: "changed" }),
          ...(difference === "revision" && { updatedAt: new Date(3000) }),
        }),
      ]);
      const second = prepareVaultCandidates(
        "query",
        difference === "context" ? ({} as VaultMemoryOperationsContext) : ctx,
        {
          ...embeddingOptions,
          ...(difference === "model" && { model: "other-model" }),
          ...(difference === "mask" && { maskInput: () => "[masked]" }),
          ...(difference === "base URL" && { baseUrl: "https://other.example" }),
        },
        createVaultEmbeddingCache()
      );
      await vi.waitFor(() => expect(generateEmbedding).toHaveBeenCalledTimes(2));
      batch.resolve([[1, 0]]);
      await Promise.all([first, second]);

      expect(generateEmbeddings).toHaveBeenCalledTimes(2);
      expect(updateVaultMemoryEmbeddingOp).toHaveBeenCalledTimes(2);
      expect(getAllVaultMemoriesOp).toHaveBeenCalledTimes(2);
    }
  );

  it("retries a failed row batch without duplicate writes", async () => {
    const batch = deferred<number[][]>();
    vi.mocked(generateEmbeddings).mockReturnValueOnce(batch.promise);
    const ctx = {} as VaultMemoryOperationsContext;
    const cache = createVaultEmbeddingCache();
    const options = { vaultPreparation: createVaultPreparation() };
    const searches = ["one", "two"].map((query) =>
      prepareVaultCandidates(query, ctx, embeddingOptions, cache, options)
    );
    await vi.waitFor(() => expect(generateEmbedding).toHaveBeenCalledTimes(2));
    batch.reject(new Error("embedding request failed"));
    const failed = await Promise.all(searches);

    expect(failed.every((result) => result.embeddingFailure)).toBe(true);
    expect(generateEmbeddings).toHaveBeenCalledTimes(1);
    expect(updateVaultMemoryEmbeddingOp).not.toHaveBeenCalled();
    const recovered = await prepareVaultCandidates("three", ctx, embeddingOptions, cache, options);
    expect(recovered.embeddingFailure).toBe(false);
    expect(recovered.embeddedItems[0].embedding).toEqual(Float32Array.from([1, 0]));
    expect(generateEmbeddings).toHaveBeenCalledTimes(2);
    expect(updateVaultMemoryEmbeddingOp).toHaveBeenCalledTimes(1);
  });

  it("retries a failed corpus read in the same preparation", async () => {
    const ctx = {} as VaultMemoryOperationsContext;
    const cache = createVaultEmbeddingCache();
    const options = { vaultPreparation: createVaultPreparation() };
    vi.mocked(getAllVaultMemoriesOp).mockRejectedValueOnce(new Error("read failed"));

    await expect(
      prepareVaultCandidates("one", ctx, embeddingOptions, cache, options)
    ).rejects.toThrow("read failed");
    const prepared = await prepareVaultCandidates("two", ctx, embeddingOptions, cache, options);

    expect(prepared.memories).toHaveLength(1);
    expect(getAllVaultMemoriesOp).toHaveBeenCalledTimes(2);
  });
});
