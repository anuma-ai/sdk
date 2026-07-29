import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMemoryVaultSearchTool,
  searchVaultMemories,
  searchVaultMemoriesWithSize,
  preEmbedVaultMemories,
  eagerEmbedContent,
  admitVaultProjections,
  buildProjectedCorpus,
  prepareVaultCandidates,
} from "./searchTool";
import { createVaultEmbeddingCache } from "./lruCache";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import type { EmbeddingOptions } from "../memoryEngine/types";

vi.mock("../db/memoryVault/operations", () => ({
  getAllVaultMemoriesOp: vi.fn(),
  updateVaultMemoryEmbeddingOp: vi.fn().mockResolvedValue(undefined),
  getVaultCandidateKeysOp: vi.fn(),
  getVaultEmbeddingsByIdsOp: vi.fn(),
  getVaultMemoriesByIdsOp: vi.fn(),
}));

vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

vi.mock("../memory/reranker", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../memory/reranker")>()),
  rerankPairs: vi.fn(),
}));

vi.mock("./decomposeQuery", () => ({
  decomposeQuery: vi.fn(),
}));

import * as ops from "../db/memoryVault/operations";
import * as embed from "../memoryEngine/embeddings";
import { getAllVaultMemoriesOp } from "../db/memoryVault/operations";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import { rerankPairs } from "../memory/reranker";
import { setLogger, noopLogger, type Logger } from "../logger";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants";

const mockVaultCtx = {} as VaultMemoryOperationsContext;
const mockEmbeddingOptions: EmbeddingOptions = { apiKey: "test-key" };

function makeMemory(id: string, content: string, scope = "private"): StoredVaultMemory {
  return {
    uniqueId: id,
    content,
    scope,
    folderId: null,
    userId: null,
    embedding: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };
}

describe("searchVaultMemories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes still-encrypted content from search (key unavailable)", async () => {
    // decryptField is best-effort: when the key is unavailable it returns
    // the raw enc:vN: payload. Such content must never reach ranking —
    // BM25 would tokenize hex, the embedder would embed ciphertext, and
    // the recall tool would emit enc:vN: blocks to the answer model.
    const memories = [
      makeMemory("m1", "cats are great"),
      makeMemory("m2", "enc:v3:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef00"),
    ];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));

    const results = await searchVaultMemories("cats", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
      useFusion: false,
    });

    expect(results).toHaveLength(1);
    expect(results[0].uniqueId).toBe("m1");
    // The ciphertext row was never sent for embedding either.
    expect(vi.mocked(generateEmbeddings)).not.toHaveBeenCalled();
  });

  it("reports vaultSize from rows that EXIST when all content is still encrypted", async () => {
    // vaultSize === 0 means "vault is empty — nothing saved yet" to tool
    // callers, which would tell the LLM so and invite duplicate saves
    // while decryption is temporarily unavailable.
    const memories = [
      makeMemory("m1", "enc:v3:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef00"),
      makeMemory("m2", "enc:v3:cafebabecafebabecafebabecafebabecafebabecafebabecafebabe00"),
    ];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    const { results, vaultSize } = await searchVaultMemoriesWithSize(
      "cats",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0, useFusion: false }
    );

    expect(results).toHaveLength(0);
    expect(vaultSize).toBe(2);
  });

  it("eagerEmbedContent refuses to embed ciphertext", async () => {
    const cache = createVaultEmbeddingCache();
    await eagerEmbedContent(
      "enc:v3:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef00",
      mockEmbeddingOptions,
      cache
    );
    expect(vi.mocked(generateEmbedding)).not.toHaveBeenCalled();
    expect(cache.size).toBe(0);
  });

  it("returns structured VaultSearchResult[] sorted by similarity", async () => {
    const memories = [
      makeMemory("m1", "cats are great"),
      makeMemory("m2", "dogs are fun"),
      makeMemory("m3", "birds can fly"),
    ];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0])); // cos = 1.0
    cache.set("m2", new Float32Array([0.5, 0.5, 0])); // cos ≈ 0.71
    cache.set("m3", new Float32Array([0, 1, 0])); // cos = 0.0

    // Test cosine-ranker semantics directly; the fusion ranker has its
    // own coverage in rankFusedVaultMemories.test.ts.
    const results = await searchVaultMemories("cats", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
      useFusion: false,
    });

    expect(results).toHaveLength(3);
    expect(results[0].uniqueId).toBe("m1");
    expect(results[0].content).toBe("cats are great");
    expect(results[0].similarity).toBeCloseTo(1.0);
    expect(results[1].uniqueId).toBe("m2");
    expect(results[2].uniqueId).toBe("m3");
    // Verify descending similarity order
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    expect(results[1].similarity).toBeGreaterThan(results[2].similarity);
  });

  it("returns [] for empty vault", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    const cache = createVaultEmbeddingCache();
    const results = await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache);

    expect(results).toEqual([]);
  });

  it("returns [] for empty query", async () => {
    const cache = createVaultEmbeddingCache();
    const results = await searchVaultMemories("", mockVaultCtx, mockEmbeddingOptions, cache);

    expect(results).toEqual([]);
    expect(getAllVaultMemoriesOp).not.toHaveBeenCalled();
  });

  it("returns [] for invalid query", async () => {
    const cache = createVaultEmbeddingCache();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await searchVaultMemories(
      null as any,
      mockVaultCtx,
      mockEmbeddingOptions,
      cache
    );

    expect(results).toEqual([]);
  });

  it("respects minSimilarity threshold", async () => {
    const memories = [makeMemory("m1", "high relevance"), makeMemory("m2", "low relevance")];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0])); // similarity = 1.0
    cache.set("m2", new Float32Array([0, 1, 0])); // similarity = 0.0

    const results = await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0.5,
    });

    expect(results).toHaveLength(1);
    expect(results[0].uniqueId).toBe("m1");
  });

  it("respects limit", async () => {
    const memories = [
      makeMemory("m1", "content a"),
      makeMemory("m2", "content b"),
      makeMemory("m3", "content c"),
    ];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));
    cache.set("m2", new Float32Array([0.9, 0.1, 0]));
    cache.set("m3", new Float32Array([0.8, 0.2, 0]));

    const results = await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache, {
      limit: 2,
      minSimilarity: 0,
    });

    expect(results).toHaveLength(2);
  });

  it("respects scopes — only returns memories matching given scopes", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "private data", "private"),
    ]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));

    await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache, {
      scopes: ["private"],
    });

    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(mockVaultCtx, {
      scopes: ["private"],
    });
  });

  it("loads persisted embeddings from DB during search instead of re-embedding", async () => {
    const memWithEmbedding = {
      ...makeMemory("m1", "db-persisted"),
      embedding: JSON.stringify([1, 0, 0]),
    };
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([memWithEmbedding]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    const results = await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
    });

    expect(results).toHaveLength(1);
    expect(Array.from(cache.get("m1")!)).toEqual([1, 0, 0]);
    expect(generateEmbeddings).not.toHaveBeenCalled();
  });

  it("persists fallback-generated embeddings to DB during search", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "fallback")]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[0.9, 0.1, 0]]);
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");

    const cache = createVaultEmbeddingCache();
    await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
    });

    await vi.waitFor(() =>
      expect(vi.mocked(updateVaultMemoryEmbeddingOp)).toHaveBeenCalledWith(
        mockVaultCtx,
        "m1",
        JSON.stringify([0.9, 0.1, 0]),
        DEFAULT_API_EMBEDDING_MODEL
      )
    );
  });

  it("populates cache for uncached entries", async () => {
    const memories = [makeMemory("m1", "cached"), makeMemory("m2", "uncached")];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[0.9, 0.1, 0]]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));

    await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
    });

    expect(cache.has("m2")).toBe(true);
    expect(generateEmbeddings).toHaveBeenCalledWith(["uncached"], mockEmbeddingOptions);
  });
});

describe("createMemoryVaultSearchTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ranks results by cosine similarity (highest first)", async () => {
    const memories = [
      makeMemory("m1", "cats are great"),
      makeMemory("m2", "dogs are fun"),
      makeMemory("m3", "birds can fly"),
    ];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0])); // cos = 1.0
    cache.set("m2", new Float32Array([0.5, 0.5, 0])); // cos ≈ 0.71
    cache.set("m3", new Float32Array([0, 1, 0])); // cos = 0.0

    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
    });
    const result = (await tool.executor!({ query: "cats" })) as string;

    expect(result).toContain("Found 3 vault memories");
    const m1Idx = result.indexOf("m1");
    const m2Idx = result.indexOf("m2");
    const m3Idx = result.indexOf("m3");
    expect(m1Idx).toBeLessThan(m2Idx);
    expect(m2Idx).toBeLessThan(m3Idx);
  });

  it("filters out results below minSimilarity threshold", async () => {
    const memories = [makeMemory("m1", "high relevance"), makeMemory("m2", "low relevance")];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0])); // similarity = 1.0
    cache.set("m2", new Float32Array([0, 1, 0])); // similarity = 0.0

    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0.5,
    });
    const result = (await tool.executor!({ query: "test" })) as string;

    expect(result).toContain("Found 1 vault memories");
    expect(result).toContain("high relevance");
    expect(result).not.toContain("low relevance");
  });

  it("returns 'no relevant memories' when all results are below threshold", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "unrelated")]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([0, 1, 0]));

    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0.5,
    });
    const result = await tool.executor!({ query: "test" });

    expect(result).toBe("No relevant memories found in the vault.");
  });

  it("batch-embeds uncached entries on the fly as fallback", async () => {
    const memories = [makeMemory("m1", "cached content"), makeMemory("m2", "uncached content")];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[0.9, 0.1, 0]]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));

    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
    });
    const result = (await tool.executor!({ query: "test" })) as string;

    expect(generateEmbeddings).toHaveBeenCalledWith(["uncached content"], mockEmbeddingOptions);
    expect(cache.has("m2")).toBe(true);
    expect(result).toContain("Found 2 vault memories");
  });

  it("passes scopes to getAllVaultMemoriesOp when configured", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache, {
      scopes: ["private"],
    });
    await tool.executor!({ query: "test" });

    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(mockVaultCtx, {
      scopes: ["private"],
    });
  });

  it("calls getAllVaultMemoriesOp with no scopes when not configured", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache);
    await tool.executor!({ query: "test" });

    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(mockVaultCtx, undefined);
  });

  // A3 — an embeddings outage degrades to BM25 instead of failing the search.
  // The provider is a single upstream with no fallback, so the old behavior
  // (propagate and return "Error searching vault") meant one outage removed
  // memory from every turn for its duration.
  it("degrades to BM25 and still returns a lexical hit when the query embed fails", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
      makeMemory("m2", "prefers window seats"),
    ]);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("API rate limit"));

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache);
    const result = await tool.executor!({ query: "shellfish" });

    // Cosine is inert (no query vector), but BM25 admits the lexical match.
    expect(result).toContain("allergic to shellfish");
    expect(result).not.toContain("Error searching vault");
  });

  it("tells the model the lookup was DEGRADED, not that no memory exists", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "allergic to shellfish")]);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("API rate limit"));

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache);
    // No lexical overlap either, so the result set is genuinely empty.
    const result = await tool.executor!({ query: "zzzz nonexistent" });

    // "No relevant memories found" here would invite the model to assert the
    // user has no such memory, when in fact only keyword matching ran.
    expect(result).not.toBe("No relevant memories found in the vault.");
    expect(result).toContain("temporarily unavailable");
  });

  // useFusion:false ranks through rankVaultMemories, which is cosine-ONLY (it
  // doesn't even read the query text). Telling the model to "retry with different
  // keywords" there invites retries the path cannot honor.
  it("does not claim keyword matching ran on the cosine-only (useFusion:false) path", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "allergic to shellfish")]);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("API rate limit"));

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache, {
      useFusion: false,
    });
    const result = await tool.executor!({ query: "shellfish" });

    // Must not claim a keyword pass ran, and must not send the model back for a
    // keyword retry that this path has no lane to serve.
    expect(result).not.toContain("only keyword matching ran");
    expect(result).not.toContain("retry with different keywords");
    // ...but still must not read as "the user has no such memory".
    expect(result).not.toBe("No relevant memories found in the vault.");
    expect(result).toContain("temporarily unavailable");
  });

  it("still reports a genuinely empty result normally when embeddings work", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "prefers window seats")]);
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0])); // orthogonal → no cosine hit
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache);
    const result = await tool.executor!({ query: "zzzz nonexistent" });

    expect(result).toBe("No relevant memories found in the vault.");
  });
});

describe("preEmbedVaultMemories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes scopes through to getAllVaultMemoriesOp", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    const cache = createVaultEmbeddingCache();
    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache, {
      scopes: ["private", "shared"],
    });

    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(mockVaultCtx, {
      scopes: ["private", "shared"],
    });
  });

  it("calls getAllVaultMemoriesOp with undefined when no options", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    const cache = createVaultEmbeddingCache();
    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(mockVaultCtx, undefined);
  });

  it("embeds all vault memories and populates the cache", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "first"),
      makeMemory("m2", "second"),
    ]);
    vi.mocked(generateEmbeddings).mockResolvedValue([
      [1, 0, 0],
      [0, 1, 0],
    ]);

    const cache = createVaultEmbeddingCache();
    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    expect(Array.from(cache.get("m1")!)).toEqual([1, 0, 0]);
    expect(Array.from(cache.get("m2")!)).toEqual([0, 1, 0]);
  });

  it("loads persisted embeddings from DB instead of re-embedding", async () => {
    const memWithEmbedding = {
      ...makeMemory("m1", "persisted"),
      embedding: JSON.stringify([9, 8, 7]),
    };
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([memWithEmbedding]);

    const cache = createVaultEmbeddingCache();
    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    expect(Array.from(cache.get("m1")!)).toEqual([9, 8, 7]);
    expect(generateEmbeddings).not.toHaveBeenCalled();
  });

  it("re-embeds when persisted embedding is invalid JSON", async () => {
    const memWithBadEmbedding = {
      ...makeMemory("m1", "bad json"),
      embedding: "not valid json",
    };
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([memWithBadEmbedding]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[1, 1, 1]]);

    const cache = createVaultEmbeddingCache();
    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    expect(generateEmbeddings).toHaveBeenCalledWith(["bad json"], mockEmbeddingOptions);
    expect(Array.from(cache.get("m1")!)).toEqual([1, 1, 1]);
  });

  it("persists newly generated embeddings to DB via updateVaultMemoryEmbeddingOp", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "needs embed")]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[3, 2, 1]]);
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");

    const cache = createVaultEmbeddingCache();
    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    await vi.waitFor(() =>
      expect(vi.mocked(updateVaultMemoryEmbeddingOp)).toHaveBeenCalledWith(
        mockVaultCtx,
        "m1",
        JSON.stringify([3, 2, 1]),
        DEFAULT_API_EMBEDDING_MODEL
      )
    );
  });

  it("skips already-cached entries", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "cached"),
      makeMemory("m2", "not cached"),
    ]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[0, 1, 0]]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));

    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    expect(generateEmbeddings).toHaveBeenCalledWith(["not cached"], mockEmbeddingOptions);
    expect(Array.from(cache.get("m1")!)).toEqual([1, 0, 0]); // unchanged
    expect(Array.from(cache.get("m2")!)).toEqual([0, 1, 0]);
  });
});

describe("searchVaultMemories — folderId filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes folderId through search options to getAllVaultMemoriesOp", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    const cache = createVaultEmbeddingCache();
    await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache, {
      folderId: "folder_1",
    });

    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(mockVaultCtx, {
      folderId: "folder_1",
    });
  });
});

describe("createMemoryVaultSearchTool — folderId scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("host-app searchOptions.folderId cannot be overridden by LLM's folder_id", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache, {
      folderId: "host_folder",
    });
    await tool.executor!({ query: "test", folder_id: "llm_folder" });

    // The host's folderId should win — LLM's folder_id is ignored
    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(
      mockVaultCtx,
      expect.objectContaining({ folderId: "host_folder" })
    );
  });

  it("uses LLM's folder_id when host-app has not set folderId", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache);
    await tool.executor!({ query: "test", folder_id: "llm_folder" });

    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(
      mockVaultCtx,
      expect.objectContaining({ folderId: "llm_folder" })
    );
  });

  it("returns folder-specific message when folder is empty, not 'vault is empty'", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache, {
      folderId: "empty_folder",
    });
    const result = await tool.executor!({ query: "test" });

    expect(result).toBe("No memories found in this folder.");
  });

  it("returns folder-specific message when LLM provides folder_id for empty folder", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache);
    const result = await tool.executor!({ query: "test", folder_id: "empty_folder" });

    expect(result).toBe("No memories found in this folder.");
  });
});

describe("searchVaultMemories — invalid JSON in persisted embedding during search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to re-embedding when persisted embedding is invalid JSON during search", async () => {
    const memWithBadJson = {
      ...makeMemory("m1", "bad embed content"),
      embedding: "not-valid-json",
    };
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([memWithBadJson]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[0.8, 0.2, 0]]);

    const cache = createVaultEmbeddingCache();
    const results = await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
    });

    // Should have re-embedded because JSON parse failed
    expect(generateEmbeddings).toHaveBeenCalledWith(["bad embed content"], mockEmbeddingOptions);
    expect(results).toHaveLength(1);
    // Compare against the float32-roundtripped expected — the cache stores
    // Float32Array, so 0.8/0.2 won't equal their float64 literals exactly.
    expect(Array.from(cache.get("m1")!)).toEqual(Array.from(new Float32Array([0.8, 0.2, 0])));
  });
});

describe("eagerEmbedContent — failure resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("still populates cache even when updateVaultMemoryEmbeddingOp rejects", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([1, 2, 3]);
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");
    vi.mocked(updateVaultMemoryEmbeddingOp).mockRejectedValue(new Error("DB write failed"));

    const cache = createVaultEmbeddingCache();
    // Should not throw — DB failure is fire-and-forget
    await expect(
      eagerEmbedContent("cache me anyway", mockEmbeddingOptions, cache, mockVaultCtx, "mem-1")
    ).resolves.toBeUndefined();

    // Cache should be populated despite DB failure (keyed by memory id).
    await vi.waitFor(() => expect(Array.from(cache.get("mem-1")!)).toEqual([1, 2, 3]));
  });
});

describe("eagerEmbedContent", () => {
  it("generates an embedding and stores it in the cache (keyed by memory id)", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([1, 2, 3]);

    const cache = createVaultEmbeddingCache();
    await eagerEmbedContent("new memory text", mockEmbeddingOptions, cache, undefined, "mem-42");

    expect(generateEmbedding).toHaveBeenCalledWith("new memory text", mockEmbeddingOptions);
    expect(Array.from(cache.get("mem-42")!)).toEqual([1, 2, 3]);
  });

  it("persists embedding to DB when vaultCtx and memoryId are provided", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([4, 5, 6]);
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");

    const cache = createVaultEmbeddingCache();
    await eagerEmbedContent("persist me", mockEmbeddingOptions, cache, mockVaultCtx, "mem-99");

    await vi.waitFor(() =>
      expect(vi.mocked(updateVaultMemoryEmbeddingOp)).toHaveBeenCalledWith(
        mockVaultCtx,
        "mem-99",
        JSON.stringify([4, 5, 6]),
        DEFAULT_API_EMBEDDING_MODEL
      )
    );
  });

  it("does not call updateVaultMemoryEmbeddingOp when vaultCtx is omitted", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([7, 8, 9]);
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");
    vi.mocked(updateVaultMemoryEmbeddingOp).mockClear();

    const cache = createVaultEmbeddingCache();
    await eagerEmbedContent("no persist", mockEmbeddingOptions, cache);

    // Negative assertion: a real settle window is needed here, not vi.waitFor
    // (which would resolve on the first tick and never prove the op stayed
    // uncalled). Give the fire-and-forget path time to (not) fire.
    await new Promise((r) => setTimeout(r, 10));

    expect(vi.mocked(updateVaultMemoryEmbeddingOp)).not.toHaveBeenCalled();
  });
});

describe("rerank graceful degradation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("falls back to the V2 ranking when the cross-encoder rerank throws", async () => {
    // A rerank failure is a transient network/portal hiccup; the search must
    // degrade to the already-computed V2 ordering rather than reject (which
    // the recall tool would surface as "Error searching memory").
    vi.mocked(rerankPairs).mockRejectedValue(new Error("portal 503"));
    const memories = [makeMemory("m1", "cats are great"), makeMemory("m2", "dogs are loyal")];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));
    cache.set("m2", new Float32Array([0, 1, 0]));

    const { results } = await searchVaultMemoriesWithSize(
      "cats",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0, useFusion: true, rerank: true }
    );

    // Did not throw; the cosine-aligned candidate still ranks first.
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].uniqueId).toBe("m1");
  });
});

describe("embedding dimension-mismatch guard", () => {
  let warnings: string[];
  beforeEach(() => {
    vi.clearAllMocks();
    warnings = [];
    const spy: Logger = { ...noopLogger, warn: (msg: string) => warnings.push(String(msg)) };
    setLogger(spy);
  });
  afterEach(() => setLogger(noopLogger));

  it("warns when a re-embed returns an inconsistent dimension (post-re-embed drift)", async () => {
    // The net's remaining role: stale/wrong-dim vectors are re-embedded first,
    // so the only way an item still mismatches is a re-embed that itself
    // returns the wrong dim (model/API drift). Query is 3-dim; the re-embed
    // returns a 2-dim vector.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "drifted")]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[1, 0]]); // wrong dim from re-embed

    const cache = createVaultEmbeddingCache();
    await searchVaultMemoriesWithSize("anything", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
      useFusion: false,
    });

    expect(warnings.some((w) => w.includes("mismatch the query dimension"))).toBe(true);
  });

  it("does not warn when dimensions match", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "good dim")]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));

    await searchVaultMemoriesWithSize("anything", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
      useFusion: false,
    });

    expect(warnings.some((w) => w.includes("mismatch the query dimension"))).toBe(false);
  });
});

describe("embedding model versioning", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses a grandfathered (null-model) DB embedding without re-embedding", async () => {
    // Legacy rows have a vector but embedding_model = null. They were embedded
    // with the current model, so recall must use them as-is — re-embedding the
    // whole vault on rollout of this change would be a needless cost spike.
    const mem: StoredVaultMemory = {
      ...makeMemory("m1", "grandfathered fact"),
      embedding: JSON.stringify([1, 0, 0]),
      embeddingModel: null,
    };
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([mem]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]); // query: same dim

    const cache = createVaultEmbeddingCache();
    const { results } = await searchVaultMemoriesWithSize(
      "q",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0, useFusion: false }
    );

    expect(results).toHaveLength(1);
    // No re-embed: the grandfathered vector was used directly.
    expect(vi.mocked(generateEmbeddings)).not.toHaveBeenCalled();
  });

  it("re-embeds a stale-model DB embedding and persists the current model", async () => {
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");
    vi.mocked(updateVaultMemoryEmbeddingOp).mockClear();
    // Row was embedded by a different model than the current one → stale.
    const mem: StoredVaultMemory = {
      ...makeMemory("m1", "stale fact"),
      embedding: JSON.stringify([0, 1, 0]),
      embeddingModel: "old/embedding-model-v1",
    };
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([mem]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[1, 0, 0]]);

    const cache = createVaultEmbeddingCache();
    await searchVaultMemoriesWithSize("q", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
      useFusion: false,
    });

    // Stale vector was re-embedded (not loaded from DB) ...
    expect(vi.mocked(generateEmbeddings)).toHaveBeenCalledWith(
      ["stale fact"],
      mockEmbeddingOptions
    );
    // ... and persisted with the current model stamped.
    await vi.waitFor(() =>
      expect(vi.mocked(updateVaultMemoryEmbeddingOp)).toHaveBeenCalledWith(
        mockVaultCtx,
        "m1",
        JSON.stringify([1, 0, 0]),
        DEFAULT_API_EMBEDDING_MODEL
      )
    );
  });

  it("re-embeds a wrong-dimension cache hit instead of ranking with it", async () => {
    // The content-keyed cache can be seeded (e.g. by preEmbedVaultMemories,
    // which has no query vector to dim-check) with a grandfathered wrong-dim
    // vector. Search must validate the cached vector's dimension, not trust the
    // cache hit blindly, or a model dim change would rank at cosine 0 forever.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "seeded wrong dim")]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]); // query is 3-dim
    vi.mocked(generateEmbeddings).mockResolvedValue([[1, 0, 0]]);

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0])); // 2-dim — stale from an old model

    const { results } = await searchVaultMemoriesWithSize(
      "q",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0, useFusion: false }
    );

    // The wrong-dim cache entry was dropped and re-embedded, then ranked.
    expect(vi.mocked(generateEmbeddings)).toHaveBeenCalledWith(
      ["seeded wrong dim"],
      mockEmbeddingOptions
    );
    expect(results).toHaveLength(1);
    expect(results[0].similarity).toBeCloseTo(1);
  });
});

describe("admitVaultProjections", () => {
  const v = (id: string, e: number[], u = "2026-05-01") => ({
    uniqueId: id,
    embedding: Float32Array.from(e),
    updatedAt: new Date(u),
  });
  it("ranks by cosine desc, caps at k, ties by recency", () => {
    expect(admitVaultProjections([1, 0], [v("mid", [0.6, 0.8]), v("top", [1, 0])], 2)).toEqual([
      "top",
      "mid",
    ]);
    expect(
      admitVaultProjections([1, 0], [v("o", [1, 0], "2026-05"), v("n", [1, 0], "2026-06")], 5)
    ).toEqual(["n", "o"]);
  });

  it("admits low/zero/negative-cosine rows within K (no sign gate) so BM25 can promote them", () => {
    // orthogonal (cosine 0) and opposite (cosine -1) rows must still enter the
    // admission window — the fusion ranker's BM25 lane may promote a lexical
    // match the cosine ranks poorly. Parity with the legacy whole-vault path.
    expect(
      admitVaultProjections(
        [1, 0],
        [v("pos", [1, 0]), v("orthogonal", [0, 1]), v("opposite", [-1, 0])],
        3
      )
    ).toEqual(["pos", "orthogonal", "opposite"]);
    // K still caps: with K=1 only the best-cosine row is admitted.
    expect(admitVaultProjections([1, 0], [v("pos", [1, 0]), v("orthogonal", [0, 1])], 1)).toEqual([
      "pos",
    ]);
  });
});

describe("buildProjectedCorpus", () => {
  const embOpts = { model: "m" } as any;
  beforeEach(() => {
    // restoreAllMocks drops any mockResolvedValue left behind by earlier
    // describe blocks in this file; clearAllMocks resets call history so
    // "not called" assertions here aren't polluted by prior tests sharing
    // the same auto-mocked module.
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });
  it("loads embeddings only for cache misses; decrypts only the admission set", async () => {
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      {
        uniqueId: "cached",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
      {
        uniqueId: "miss",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
    ] as any);
    const embByIds = vi
      .spyOn(ops, "getVaultEmbeddingsByIdsOp")
      .mockResolvedValue([
        { uniqueId: "miss", embedding: "[0.6,0.8]", embeddingModel: "m" },
      ] as any);
    const byIds = vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockResolvedValue([
      {
        uniqueId: "cached",
        content: "alpha",
        embedding: "[1,0]",
        embeddingModel: "m",
        scope: "private",
        folderId: null,
        userId: null,
        isDeleted: false,
        proofCount: 1,
        sourceChunkIds: null,
        eventTimeStart: null,
        eventTimeEnd: null,
        eventTimeKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);
    const getAll = vi.spyOn(ops, "getAllVaultMemoriesOp");
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache = new Map([["cached", Float32Array.from([1, 0])]]); // warm hit
    const out = await buildProjectedCorpus(
      "q",
      {} as any,
      embOpts,
      cache,
      {},
      {
        limit: 2,
        admitFactor: 1,
        admitFloor: 2,
        unembeddedCap: 100,
      }
    );

    expect(getAll).not.toHaveBeenCalled(); // no whole-vault load
    // Only the miss is embedded-loaded. The third arg is the hydration filter
    // (#779) — undefined here because this query didn't opt into archived rows,
    // which is what keeps the default exclusion in force.
    expect(embByIds).toHaveBeenCalledWith({} as any, ["miss"], undefined);
    expect(out.vaultSize).toBe(2);
    expect(byIds.mock.calls[0][1]).toContain("cached"); // admission decrypt
  });

  // #779: the key scan honoring includeArchived is only half the path. If the
  // by-id hydration steps re-apply their default archived exclusion, admitted
  // archived rows are silently dropped again (after consuming admission slots).
  it("forwards includeArchived to BOTH hydration steps, not just the key scan", async () => {
    const keys = vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      {
        uniqueId: "arch",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
    ] as any);
    const embByIds = vi
      .spyOn(ops, "getVaultEmbeddingsByIdsOp")
      .mockResolvedValue([{ uniqueId: "arch", embedding: "[1,0]", embeddingModel: "m" }] as any);
    const byIds = vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockResolvedValue([
      {
        uniqueId: "arch",
        content: "archived fact",
        embedding: "[1,0]",
        embeddingModel: "m",
        scope: "private",
        folderId: null,
        userId: null,
        isDeleted: false,
        proofCount: 1,
        sourceChunkIds: null,
        eventTimeStart: null,
        eventTimeEnd: null,
        eventTimeKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const out = await buildProjectedCorpus(
      "q",
      {} as any,
      embOpts,
      new Map(),
      {
        includeArchived: true,
      },
      {
        limit: 2,
        admitFactor: 1,
        admitFloor: 2,
        unembeddedCap: 100,
      }
    );

    // Key scan opts in — already fixed by the first half of #779.
    expect(keys.mock.calls[0][1]).toMatchObject({ includeArchived: true });
    // ...and BOTH hydration steps must opt in too, or the row vanishes here.
    expect(embByIds.mock.calls[0][2]).toEqual({ includeArchived: true });
    expect(byIds.mock.calls[0][2]).toEqual({ includeArchived: true });
    expect(out.memories.map((m: any) => m.uniqueId)).toContain("arch");
  });

  it("empty candidate set: returns empty WITHOUT embedding the query", async () => {
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([] as any);
    const genEmb = vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const out = await buildProjectedCorpus(
      "q",
      {} as any,
      embOpts,
      new Map(),
      {},
      {
        limit: 5,
        admitFactor: 3,
        admitFloor: 30,
        unembeddedCap: 100,
      }
    );

    // No candidate keys → nothing to search → skip the embedding call entirely.
    expect(genEmb).not.toHaveBeenCalled();
    expect(out).toEqual({
      memories: [],
      embeddedItems: [],
      queryEmbedding: [],
      vaultSize: 0,
      laneEmbedFailed: false,
    });
  });

  it("forceIncludeIds: decrypts side-lane candidates outside the cosine admission window", async () => {
    // "top" is cosine 1 (admitted at K=1); "sidehit" is cosine 0 (outside the
    // window). A graph/temporal side lane names "sidehit" — it must still be
    // decrypted so the RRF lane can promote it, mirroring the legacy path
    // where every row is available to the ranker.
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      {
        uniqueId: "top",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
      {
        uniqueId: "sidehit",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
    ] as any);
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([] as any); // both cached
    const byIds = vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockImplementation(
      async (_ctx: any, ids: string[]) =>
        ids.map((id) => ({
          uniqueId: id,
          content: id,
          embedding: null,
          embeddingModel: "m",
          scope: "private",
          folderId: null,
          userId: null,
          isDeleted: false,
          proofCount: 1,
          sourceChunkIds: null,
          eventTimeStart: null,
          eventTimeEnd: null,
          eventTimeKind: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache = new Map([
      ["top", Float32Array.from([1, 0])], // cosine 1
      ["sidehit", Float32Array.from([0, 1])], // cosine 0 — outside K=1 window
    ]);
    const out = await buildProjectedCorpus(
      "q",
      {} as any,
      embOpts,
      cache,
      {},
      {
        limit: 1,
        admitFactor: 1,
        admitFloor: 1,
        unembeddedCap: 100,
        forceIncludeIds: ["sidehit"],
      }
    );

    const decryptedIds = byIds.mock.calls.flatMap((c) => c[1] as string[]);
    expect(decryptedIds).toContain("sidehit");
    expect(out.memories.map((m) => m.uniqueId)).toContain("sidehit");
  });

  it("forceIncludeIds: ignores ids absent from the candidate-key set (out of scope)", async () => {
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      {
        uniqueId: "top",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
    ] as any);
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([] as any);
    const byIds = vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockImplementation(
      async (_ctx: any, ids: string[]) =>
        ids.map((id) => ({
          uniqueId: id,
          content: id,
          embedding: null,
          embeddingModel: "m",
          scope: "private",
          folderId: null,
          userId: null,
          isDeleted: false,
          proofCount: 1,
          sourceChunkIds: null,
          eventTimeStart: null,
          eventTimeEnd: null,
          eventTimeKind: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache = new Map([["top", Float32Array.from([1, 0])]]);
    await buildProjectedCorpus(
      "q",
      {} as any,
      embOpts,
      cache,
      {},
      {
        limit: 1,
        admitFactor: 1,
        admitFloor: 1,
        unembeddedCap: 100,
        forceIncludeIds: ["ghost"], // not a candidate key
      }
    );

    const decryptedIds = byIds.mock.calls.flatMap((c) => c[1] as string[]);
    expect(decryptedIds).not.toContain("ghost");
  });

  // A3 follow-up. Cosine admission is what picks the decrypt window here, so a
  // failed query embed doesn't just flatten the ordering — nothing dim-matches a
  // length-0 vector, so NOTHING gets vectored and the window came back empty:
  // BM25 then ranked an empty corpus and the outage still cost all recall on this
  // path. Fall back to admitting the most-recently-updated candidates.
  it("degraded: admits the most recent candidates by recency instead of nothing", async () => {
    const older = new Date("2026-01-01T00:00:00Z");
    const newer = new Date("2026-06-01T00:00:00Z");
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      { uniqueId: "old", folderId: null, scope: "private", embeddingModel: "m", updatedAt: older },
      { uniqueId: "new", folderId: null, scope: "private", embeddingModel: "m", updatedAt: newer },
    ] as any);
    const embByIds = vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([] as any);
    const byIds = vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockImplementation(
      async (_ctx: any, ids: string[]) =>
        ids.map((id) => ({
          uniqueId: id,
          content: id === "new" ? "allergic to shellfish" : "prefers window seats",
          embedding: null,
          embeddingModel: "m",
          scope: "private",
          folderId: null,
          userId: null,
          isDeleted: false,
          proofCount: 1,
          sourceChunkIds: null,
          eventTimeStart: null,
          eventTimeEnd: null,
          eventTimeKind: null,
          createdAt: new Date(),
          updatedAt: id === "new" ? newer : older,
        })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockRejectedValue(new Error("API rate limit"));
    const onEmbeddingDegraded = vi.fn();

    // A warm cache entry must NOT rescue this: it can't dim-match the empty query
    // vector either, which is exactly why the window came back empty before.
    const cache = new Map([["old", Float32Array.from([1, 0])]]);
    const out = await buildProjectedCorpus(
      "q",
      {} as any,
      embOpts,
      cache,
      {},
      { limit: 1, admitFactor: 1, admitFloor: 1, unembeddedCap: 100, onEmbeddingDegraded }
    );

    // k=1, so the recency fallback admits "new" — and it reaches BM25 decrypted.
    expect(out.memories.map((m) => m.uniqueId)).toEqual(["new"]);
    expect(byIds.mock.calls.flatMap((c) => c[1] as string[])).toEqual(["new"]);
    expect(onEmbeddingDegraded).toHaveBeenCalled();
    // No point loading embedding columns nothing can dim-match against.
    expect(embByIds).not.toHaveBeenCalled();
  });

  // The partial version of the same failure: the query embed works and a couple
  // of warm cache entries survive, but the lane batch that would have vectored
  // the REST fails. Admission is then sized by the handful that happened to be
  // cached, so BM25 ranks a window far short of k.
  it("tops the admission window up to k when the un-embedded lane batch fails", async () => {
    const t = (iso: string) => new Date(iso);
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      {
        uniqueId: "warm",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: t("2026-01-01T00:00:00Z"),
      },
      {
        uniqueId: "cold1",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: t("2026-06-01T00:00:00Z"),
      },
      {
        uniqueId: "cold2",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: t("2026-05-01T00:00:00Z"),
      },
    ] as any);
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([] as any); // no stored vectors
    const byIds = vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockImplementation(
      async (_ctx: any, ids: string[]) =>
        ids.map((id) => ({
          uniqueId: id,
          content: id,
          embedding: null,
          embeddingModel: "m",
          scope: "private",
          folderId: null,
          userId: null,
          isDeleted: false,
          proofCount: 1,
          sourceChunkIds: null,
          eventTimeStart: null,
          eventTimeEnd: null,
          eventTimeKind: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as any
    );
    // Query embed fine; the lane batch that would vector cold1/cold2 is what fails.
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);
    vi.spyOn(embed, "generateEmbeddings").mockRejectedValue(new Error("429 rate limited"));

    const cache = new Map([["warm", Float32Array.from([1, 0])]]);
    const out = await buildProjectedCorpus(
      "q",
      {} as any,
      embOpts,
      cache,
      {},
      { limit: 3, admitFactor: 1, admitFloor: 3, unembeddedCap: 100 }
    );

    // Without the top-up only "warm" is vectored, so only "warm" gets decrypted
    // and a lexical hit in cold1/cold2 is unreachable. k=3, so all three admit.
    const finalDecrypt = byIds.mock.calls[byIds.mock.calls.length - 1][1] as string[];
    expect(finalDecrypt).toEqual(expect.arrayContaining(["warm", "cold1", "cold2"]));
    expect(out.memories.map((m) => m.uniqueId).sort()).toEqual(["cold1", "cold2", "warm"]);
  });
});

// A3 follow-up: the query embed was the only guarded embedding call, but it is
// not the only one on the read path — and it is the SMALLEST, so it is the least
// likely of them to be the one that fails.
describe("searchVaultMemoriesWithSize — embedding failures beyond the query embed", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("row (re)embed batch failure degrades instead of throwing out of the search", async () => {
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
      makeMemory("m2", "prefers window seats"),
    ] as any);
    // Query embed succeeds; the larger row batch is what 429s.
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0, 0]);
    vi.spyOn(embed, "generateEmbeddings").mockRejectedValue(new Error("429 rate limited"));

    const out = await searchVaultMemoriesWithSize(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      createVaultEmbeddingCache(),
      { limit: 5 }
    );

    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
    // No row ended up with a vector, so cosine is as inert as a failed query
    // embed — the caller must be able to tell the model that.
    expect(out.embeddingsUnavailable).toBe(true);
  });

  it("does NOT report an outage when the batch fails but some row vectors survive", async () => {
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
      makeMemory("m2", "prefers window seats"),
    ] as any);
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0, 0]);
    vi.spyOn(embed, "generateEmbeddings").mockRejectedValue(new Error("429 rate limited"));

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0])); // m1 still has a usable vector
    const out = await searchVaultMemoriesWithSize(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { limit: 5 }
    );

    // Cosine ranked m1 for real, so "only keyword matching ran" would be false —
    // and would raise outage telemetry on a partial, self-healing degradation.
    expect(out.embeddingsUnavailable).toBe(false);
    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
  });

  it("does NOT report an outage when only the composite sub-query embed fails", async () => {
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
    ] as any);
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0, 0]);
    // Only the sub-query batch fails — the row vectors are already cached.
    vi.spyOn(embed, "generateEmbeddings").mockRejectedValue(new Error("429 rate limited"));

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));
    const out = await searchVaultMemoriesWithSize(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      {
        limit: 5,
        useFusion: true,
        subQueries: ["allergies", "food"],
      }
    );

    // Falls through to the single-query ranker, which runs a REAL cosine lane on
    // the original query vector — the multi-facet decomposition is all that's lost.
    expect(out.embeddingsUnavailable).toBe(false);
    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
  });

  it("treats a successful-but-empty query embedding as degraded", async () => {
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
    ] as any);
    // Resolves rather than rejects — a malformed provider response must not read
    // as a healthy search, or an empty result gets reported as "no such memory".
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([]);

    const out = await searchVaultMemoriesWithSize(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      createVaultEmbeddingCache(),
      { limit: 5 }
    );

    expect(out.embeddingsUnavailable).toBe(true);
  });
});

describe("prepareVaultCandidates — embeddingFailure", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("reports a PARTIAL row-batch failure that embeddingsUnavailable cannot see", async () => {
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
      makeMemory("m2", "prefers window seats"),
    ] as any);
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0, 0]);
    vi.spyOn(embed, "generateEmbeddings").mockRejectedValue(new Error("429 rate limited"));

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0])); // m1 keeps a usable vector, m2 does not

    const prepared = await prepareVaultCandidates(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { limit: 5 }
    );

    // Cosine still ran for real on m1, so this is NOT an outage for a reader...
    expect(prepared.embeddingsUnavailable).toBe(false);
    // ...but m2 scores 0 only because its vector is missing, which a writer
    // gating a merge on cosine has to know about. This is the flag retain reads.
    expect(prepared.embeddingFailure).toBe(true);
  });

  it("reports a failed query embed on both flags", async () => {
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
    ] as any);
    vi.spyOn(embed, "generateEmbedding").mockRejectedValue(new Error("503"));

    const prepared = await prepareVaultCandidates(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      createVaultEmbeddingCache(),
      { limit: 5 }
    );

    expect(prepared.embeddingsUnavailable).toBe(true);
    expect(prepared.embeddingFailure).toBe(true);
  });

  it("stays false on a healthy pass", async () => {
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
    ] as any);
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0, 0]);
    vi.spyOn(embed, "generateEmbeddings").mockResolvedValue([[1, 0, 0]]);

    const prepared = await prepareVaultCandidates(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      createVaultEmbeddingCache(),
      { limit: 5 }
    );

    expect(prepared.embeddingsUnavailable).toBe(false);
    expect(prepared.embeddingFailure).toBe(false);
  });

  it("reports the projected un-embedded lane's batch failure", async () => {
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      { uniqueId: "m1", updatedAt: new Date(), embeddingModel: null },
    ] as any);
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([
      { uniqueId: "m1", embedding: null },
    ] as any);
    vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
    ] as any);
    // Query embed lands; the lane batch for the un-embedded row is what fails.
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0, 0]);
    vi.spyOn(embed, "generateEmbeddings").mockRejectedValue(new Error("429 rate limited"));

    const prepared = await prepareVaultCandidates(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      createVaultEmbeddingCache(),
      { limit: 5, decryptLast: true }
    );

    expect(prepared.embeddingFailure).toBe(true);
  });
});

describe("searchVaultMemoriesWithSize — decryptLast branch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("decryptLast ON: projected path, no whole-vault load", async () => {
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      {
        uniqueId: "a",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
    ] as any);
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([
      { uniqueId: "a", embedding: "[1,0]", embeddingModel: "m" },
    ] as any);
    vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockResolvedValue([
      {
        uniqueId: "a",
        content: "alpha",
        embedding: "[1,0]",
        embeddingModel: "m",
        scope: "private",
        folderId: null,
        userId: null,
        isDeleted: false,
        proofCount: 1,
        sourceChunkIds: null,
        eventTimeStart: null,
        eventTimeEnd: null,
        eventTimeKind: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);
    const getAll = vi.spyOn(ops, "getAllVaultMemoriesOp");
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache = createVaultEmbeddingCache();
    const out = await searchVaultMemoriesWithSize("q", {} as any, { model: "m" } as any, cache, {
      limit: 5,
      decryptLast: true,
    });

    expect(getAll).not.toHaveBeenCalled();
    expect(out.results.map((r) => r.uniqueId)).toContain("a");
  });

  it("decryptLast OFF: legacy whole-vault path", async () => {
    const getAll = vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([] as any);
    const keys = vi.spyOn(ops, "getVaultCandidateKeysOp");
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache = createVaultEmbeddingCache();
    const out = await searchVaultMemoriesWithSize("q", {} as any, { model: "m" } as any, cache, {
      limit: 5,
    });

    expect(getAll).toHaveBeenCalledTimes(1);
    expect(keys).not.toHaveBeenCalled();
    expect(out.results).toEqual([]);
  });

  it("decryptLast ranking parity: same top-N uniqueIds + order as legacy, on a fully-embedded vault", async () => {
    // Fixture: 4 rows, ALL with a stored/cached embedding, cosine-unambiguous
    // relative to the query vector [1,0,0,0] (m1 > m2 > m3 > m4). BM25 term
    // overlap with the "cats" query is deliberately monotonic with cosine too
    // (m1 repeats "cats", m2 mentions it once, m3/m4 don't) so the fusion
    // ranker's RRF combination isn't fighting itself — this isolates the
    // thing under test (does decryptLast's projected corpus feed the SAME
    // ranker the SAME candidate set as the legacy whole-vault load) from
    // fusion-ranker tie-breaking, which has its own coverage elsewhere.
    const FIXTURE: Array<{ uniqueId: string; content: string; vec: number[] }> = [
      { uniqueId: "m1", content: "cats cats cats are wonderful pets", vec: [1, 0, 0, 0] },
      { uniqueId: "m2", content: "cats are okay I guess", vec: [0.8, 0.6, 0, 0] },
      { uniqueId: "m3", content: "dogs are loyal companions", vec: [0.6, 0.8, 0, 0] },
      { uniqueId: "m4", content: "fish swim quietly in ponds", vec: [0.3, 0.95, 0, 0] },
    ];
    const now = new Date("2026-01-01T00:00:00Z");
    const toRow = (f: (typeof FIXTURE)[number]) => ({
      uniqueId: f.uniqueId,
      content: f.content,
      embedding: JSON.stringify(f.vec),
      embeddingModel: "m",
      scope: "private",
      folderId: null,
      userId: null,
      isDeleted: false,
      proofCount: 1,
      sourceChunkIds: null,
      eventTimeStart: null,
      eventTimeEnd: null,
      eventTimeKind: null,
      createdAt: now,
      updatedAt: now,
    });

    const embOpts = { model: "m" } as any;
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0, 0, 0]);

    // --- decryptLast path: projected candidate scan + admission decrypt ---
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue(
      FIXTURE.map((f) => ({
        uniqueId: f.uniqueId,
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: now,
      })) as any
    );
    vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockImplementation(
      async (_ctx: any, ids: string[]) =>
        FIXTURE.filter((f) => ids.includes(f.uniqueId)).map(toRow) as any
    );
    const cacheA = createVaultEmbeddingCache();
    FIXTURE.forEach((f) => cacheA.set(f.uniqueId, Float32Array.from(f.vec)));

    const decryptLastOut = await searchVaultMemoriesWithSize("cats", {} as any, embOpts, cacheA, {
      limit: 3,
      decryptLast: true,
      // Admission window wide enough to admit the whole 4-row vault — this
      // is the "fair fixture" requirement: nothing gets truncated before it
      // reaches the ranker, so a divergence would be a real bug, not a
      // window-size artifact.
      admitFactor: 10,
      admitFloor: 10,
    });

    // --- legacy path: same fixture, same query, whole-vault load ---
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue(FIXTURE.map(toRow) as any);
    const cacheB = createVaultEmbeddingCache();
    FIXTURE.forEach((f) => cacheB.set(f.uniqueId, Float32Array.from(f.vec)));

    const legacyOut = await searchVaultMemoriesWithSize("cats", {} as any, embOpts, cacheB, {
      limit: 3,
    });

    expect(legacyOut.results.length).toBeGreaterThan(0);
    expect(decryptLastOut.results.map((r) => r.uniqueId)).toEqual(
      legacyOut.results.map((r) => r.uniqueId)
    );
    // Same top-N size too, not just a matching prefix.
    expect(decryptLastOut.results.length).toBe(legacyOut.results.length);
  });

  it("forwards entityRanking as forceIncludeIds so cosine-miss side-lane candidates are decrypted + surfaced", async () => {
    // "top" (cosine 1) is admitted at K=1; "sidehit" (cosine 0) is outside the
    // window. entityRanking names "sidehit" — recall's graph lane found it
    // via entity overlap, not cosine. It must be decrypted and surfaced.
    const rows = [
      {
        uniqueId: "top",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
      {
        uniqueId: "sidehit",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
    ];
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue(rows as any);
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([] as any);
    const byIds = vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockImplementation(
      async (_ctx: any, ids: string[]) =>
        ids.map((id) => ({
          uniqueId: id,
          content: id === "top" ? "cats are great" : "sidehit content",
          embedding: null,
          embeddingModel: "m",
          scope: "private",
          folderId: null,
          userId: null,
          isDeleted: false,
          proofCount: 1,
          sourceChunkIds: null,
          eventTimeStart: null,
          eventTimeEnd: null,
          eventTimeKind: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("top", Float32Array.from([1, 0]));
    cache.set("sidehit", Float32Array.from([0, 1]));

    const out = await searchVaultMemoriesWithSize("cats", {} as any, { model: "m" } as any, cache, {
      limit: 5,
      minSimilarity: 0,
      decryptLast: true,
      admitFactor: 0.2, // limit*0.2 = 1 → K=1, sidehit outside the window
      admitFloor: 1,
      entityRanking: ["sidehit"],
    });

    const decryptedIds = byIds.mock.calls.flatMap((c) => c[1] as string[]);
    expect(decryptedIds).toContain("sidehit");
    expect(out.results.map((r) => r.uniqueId)).toContain("sidehit");
  });

  it("keys present but admission decrypt yields 0 rows → empty return, ranker/decompose skipped", async () => {
    // vaultSize > 0 (keys exist) but every admitted row is still encrypted, so
    // the searchable corpus is empty. Must early-return (like the legacy path)
    // instead of falling through into decompose/LLM ranking on an empty head.
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      {
        uniqueId: "a",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
      {
        uniqueId: "b",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date(),
      },
    ] as any);
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([] as any);
    vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockImplementation(
      async (_ctx: any, ids: string[]) =>
        ids.map((id) => ({
          uniqueId: id,
          // Still-encrypted content → filtered out of the corpus.
          content: "enc:v3:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef00",
          embedding: null,
          embeddingModel: "m",
          scope: "private",
          folderId: null,
          userId: null,
          isDeleted: false,
          proofCount: 1,
          sourceChunkIds: null,
          eventTimeStart: null,
          eventTimeEnd: null,
          eventTimeKind: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache = createVaultEmbeddingCache();
    cache.set("a", Float32Array.from([1, 0]));
    cache.set("b", Float32Array.from([0, 1]));

    const out = await searchVaultMemoriesWithSize("q", {} as any, { model: "m" } as any, cache, {
      limit: 5,
      decryptLast: true,
      // If the corpus weren't empty-checked, this would drive the composite path.
      subQueries: ["facet a", "facet b"],
    });

    expect(out.results).toEqual([]);
    expect(out.vaultSize).toBe(2);
    expect(out.reranked).toBe(false);
    expect(out.hadV2Head).toBe(false);
  });
});

/**
 * The composite fall-through guards a throw and an empty batch, but the batch's
 * outer length can't see a degenerate response: `[[], []]` for two facets has
 * length 2. Fusing those runs the multi-facet ranker over all-zero cosine lanes.
 */
describe("composite sub-query embeds — degenerate responses fall through", () => {
  let warnings: string[];
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    warnings = [];
    setLogger({ ...noopLogger, warn: (msg: string) => warnings.push(String(msg)) });
  });
  afterEach(() => setLogger(noopLogger));

  const search = () =>
    searchVaultMemoriesWithSize("shellfish", mockVaultCtx, mockEmbeddingOptions, seededCache(), {
      limit: 5,
      useFusion: true,
      subQueries: ["allergies", "food"],
    });

  // Both rows are pre-seeded so the row-(re)embed batch has nothing to do and the
  // mocked `generateEmbeddings` below answers only the sub-query call.
  // m2 is reachable ONLY through the second facet: cosine 0 against the query
  // vector and no lexical overlap with "shellfish".
  function seededCache() {
    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));
    cache.set("m2", new Float32Array([0, 1, 0]));
    return cache;
  }

  beforeEach(() => {
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
      makeMemory("m2", "prefers window seats"),
    ] as any);
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0, 0]);
  });

  it("falls through when every facet vector comes back empty", async () => {
    vi.spyOn(embed, "generateEmbeddings").mockResolvedValue([[], []]);

    const out = await search();

    expect(warnings.some((w) => /falling back to single-query ranking/.test(w))).toBe(true);
    // The original query vector is still good, so this is NOT an outage — the
    // single-query path runs a real cosine lane.
    expect(out.embeddingsUnavailable).toBe(false);
    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
  });

  it("falls through when the response is short of the sub-query count", async () => {
    // Would otherwise index past the end and hand rankComposite `undefined`.
    vi.spyOn(embed, "generateEmbeddings").mockResolvedValue([[1, 0, 0]]);

    const out = await search();

    expect(warnings.some((w) => /falling back to single-query ranking/.test(w))).toBe(true);
    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
  });

  it("falls through when a facet vector comes back at the wrong dimension", async () => {
    // Non-empty and complete, so count-and-emptiness alone reads it as healthy —
    // but cosineSimilarity bails on the length mismatch and returns 0, which is
    // the same dead facet lane. Real trigger: the embedding cache keys on text,
    // not model, so vectors written under a previous model survive a model change
    // at the old dimension.
    vi.spyOn(embed, "generateEmbeddings").mockResolvedValue([
      [1, 0, 0],
      [0, 1],
    ]);

    const out = await search();

    expect(warnings.some((w) => /falling back to single-query ranking/.test(w))).toBe(true);
    expect(out.embeddingsUnavailable).toBe(false);
    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
  });

  it("falls through on a zero-facet list instead of returning nothing", async () => {
    // A zero-facet list must not enter the composite path: without the
    // `length >= 2` gate, `0 === 0` and `[].every()` would read as usable and
    // `rankComposite` would return [] — flipping degrade into a total miss.
    vi.spyOn(embed, "generateEmbeddings").mockResolvedValue([]);

    const out = await searchVaultMemoriesWithSize(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      seededCache(),
      {
        limit: 5,
        useFusion: true,
        subQueries: [],
      }
    );

    expect(vi.mocked(embed.generateEmbeddings)).not.toHaveBeenCalled();
    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
  });

  it("still runs composite on a healthy response", async () => {
    vi.spyOn(embed, "generateEmbeddings").mockResolvedValue([
      [1, 0, 0],
      [0, 1, 0],
    ]);

    const out = await search();

    expect(warnings.some((w) => /falling back to single-query ranking/.test(w))).toBe(false);
    // Pin that the facet lanes actually ran. "No warning fired" alone also holds
    // if composite stopped running entirely — the one regression an over-strict
    // guard would cause — so assert the facet-only row got ranked: m2 can only
    // reach the results through the second facet's vector.
    expect(out.results.map((r) => r.uniqueId)).toContain("m2");
  });
});
