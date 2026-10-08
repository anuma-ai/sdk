import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMemoryVaultSearchTool } from "./searchToolExecutor";
import {
  searchVaultMemories,
  searchVaultMemoriesWithSize,
  preEmbedVaultMemories,
  eagerEmbedContent,
  admitVaultProjections,
  buildProjectedCorpus,
  prepareVaultCandidates,
} from "./searchTool";
import { createVaultEmbeddingCache } from "./lruCache";
import type { VaultEmbeddingCache } from "./searchTool";
import { cacheRowVector } from "./vectorVersion";
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

vi.mock("./decomposeQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./decomposeQuery")>();
  return {
    ...actual,
    decomposeQuery: vi.fn(),
  };
});

import * as ops from "../db/memoryVault/operations";
import * as embed from "../memoryEngine/embeddings";
import { getAllVaultMemoriesOp } from "../db/memoryVault/operations";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import { rerankPairs } from "../memory/reranker";
import { setLogger, noopLogger, type Logger } from "../logger";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants";

const mockVaultCtx = {} as VaultMemoryOperationsContext;

const ROW_VERSION = new Date("2026-06-01T00:00:00Z");
const fixtureContent = new Map<string, string>();
function seedVector(
  cache: VaultEmbeddingCache,
  id: string,
  vec: Float32Array,
  version: Date = ROW_VERSION
): void {
  cacheRowVector(cache, id, vec, version, fixtureContent.get(id));
}
const mockEmbeddingOptions: EmbeddingOptions = { apiKey: "test-key" };

function makeMemory(id: string, content: string, scope = "private"): StoredVaultMemory {
  fixtureContent.set(id, content);
  return {
    uniqueId: id,
    content,
    scope,
    folderId: null,
    userId: null,
    embedding: null,
    createdAt: ROW_VERSION,
    updatedAt: ROW_VERSION,
    isDeleted: false,
  };
}

describe("searchVaultMemories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes still-encrypted content from search (key unavailable)", async () => {
    const memories = [
      makeMemory("m1", "cats are great"),
      makeMemory("m2", "enc:v3:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef00"),
    ];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));

    const results = await searchVaultMemories("cats", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
      useFusion: false,
    });

    expect(results).toHaveLength(1);
    expect(results[0].uniqueId).toBe("m1");
    expect(vi.mocked(generateEmbeddings)).not.toHaveBeenCalled();
  });

  it("reports vaultSize from rows that EXIST when all content is still encrypted", async () => {
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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));
    seedVector(cache, "m2", new Float32Array([0.5, 0.5, 0]));
    seedVector(cache, "m3", new Float32Array([0, 1, 0]));

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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));
    seedVector(cache, "m2", new Float32Array([0, 1, 0]));

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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));
    seedVector(cache, "m2", new Float32Array([0.9, 0.1, 0]));
    seedVector(cache, "m3", new Float32Array([0.8, 0.2, 0]));

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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));

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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));

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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));
    seedVector(cache, "m2", new Float32Array([0.5, 0.5, 0]));
    seedVector(cache, "m3", new Float32Array([0, 1, 0]));

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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));
    seedVector(cache, "m2", new Float32Array([0, 1, 0]));

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
    seedVector(cache, "m1", new Float32Array([0, 1, 0]));

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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));

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

  it("degrades to BM25 and still returns a lexical hit when the query embed fails", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
      makeMemory("m2", "prefers window seats"),
    ]);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("API rate limit"));

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache);
    const result = await tool.executor!({ query: "shellfish" });

    expect(result).toContain("allergic to shellfish");
    expect(result).not.toContain("Error searching vault");
  });

  it("tells the model the lookup was DEGRADED, not that no memory exists", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "allergic to shellfish")]);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("API rate limit"));

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache);
    const result = await tool.executor!({ query: "zzzz nonexistent" });

    expect(result).not.toBe("No relevant memories found in the vault.");
    expect(result).toContain("temporarily unavailable");
  });

  it("does not claim keyword matching ran on the cosine-only (useFusion:false) path", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "allergic to shellfish")]);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("API rate limit"));

    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache, {
      useFusion: false,
    });
    const result = await tool.executor!({ query: "shellfish" });

    expect(result).not.toContain("only keyword matching ran");
    expect(result).not.toContain("retry with different keywords");
    expect(result).not.toBe("No relevant memories found in the vault.");
    expect(result).toContain("temporarily unavailable");
  });

  it("still reports a genuinely empty result normally when embeddings work", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "prefers window seats")]);
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);

    const cache = createVaultEmbeddingCache();
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));
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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));

    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    expect(generateEmbeddings).toHaveBeenCalledWith(["not cached"], mockEmbeddingOptions);
    expect(Array.from(cache.get("m1")!)).toEqual([1, 0, 0]);
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

    expect(generateEmbeddings).toHaveBeenCalledWith(["bad embed content"], mockEmbeddingOptions);
    expect(results).toHaveLength(1);
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
    await expect(
      eagerEmbedContent("cache me anyway", mockEmbeddingOptions, cache, mockVaultCtx, "mem-1")
    ).resolves.toBeUndefined();

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
        DEFAULT_API_EMBEDDING_MODEL,
        { content: "persist me" }
      )
    );
  });

  it("pins the persisted vector to the row version it was given", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([4, 5, 6]);
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");

    const updatedAt = new Date(1_700_000_000_000);
    const cache = createVaultEmbeddingCache();
    await eagerEmbedContent(
      "pin me",
      mockEmbeddingOptions,
      cache,
      mockVaultCtx,
      "mem-7",
      updatedAt
    );

    await vi.waitFor(() =>
      expect(vi.mocked(updateVaultMemoryEmbeddingOp)).toHaveBeenCalledWith(
        mockVaultCtx,
        "mem-7",
        JSON.stringify([4, 5, 6]),
        DEFAULT_API_EMBEDDING_MODEL,
        { content: "pin me", updatedAt: updatedAt.getTime() }
      )
    );
  });

  it("does not call updateVaultMemoryEmbeddingOp when vaultCtx is omitted", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([7, 8, 9]);
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");
    vi.mocked(updateVaultMemoryEmbeddingOp).mockClear();

    const cache = createVaultEmbeddingCache();
    await eagerEmbedContent("no persist", mockEmbeddingOptions, cache);

    await new Promise((r) => setTimeout(r, 10));

    expect(vi.mocked(updateVaultMemoryEmbeddingOp)).not.toHaveBeenCalled();
  });
});

describe("rerank graceful degradation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("falls back to the V2 ranking when the cross-encoder rerank throws", async () => {
    vi.mocked(rerankPairs).mockRejectedValue(new Error("portal 503"));
    const memories = [makeMemory("m1", "cats are great"), makeMemory("m2", "dogs are loyal")];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));
    seedVector(cache, "m2", new Float32Array([0, 1, 0]));

    const { results } = await searchVaultMemoriesWithSize(
      "cats",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0, useFusion: true, rerank: true }
    );

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
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "drifted")]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[1, 0]]);

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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));

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
    const mem: StoredVaultMemory = {
      ...makeMemory("m1", "grandfathered fact"),
      embedding: JSON.stringify([1, 0, 0]),
      embeddingModel: null,
    };
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([mem]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    const { results } = await searchVaultMemoriesWithSize(
      "q",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0, useFusion: false }
    );

    expect(results).toHaveLength(1);
    expect(vi.mocked(generateEmbeddings)).not.toHaveBeenCalled();
  });

  it("re-embeds a stale-model DB embedding and persists the current model", async () => {
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");
    vi.mocked(updateVaultMemoryEmbeddingOp).mockClear();
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

    expect(vi.mocked(generateEmbeddings)).toHaveBeenCalledWith(
      ["stale fact"],
      mockEmbeddingOptions
    );
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
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "seeded wrong dim")]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[1, 0, 0]]);

    const cache = createVaultEmbeddingCache();
    seedVector(cache, "m1", new Float32Array([1, 0]));

    const { results } = await searchVaultMemoriesWithSize(
      "q",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0, useFusion: false }
    );

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
    expect(
      admitVaultProjections(
        [1, 0],
        [v("pos", [1, 0]), v("orthogonal", [0, 1]), v("opposite", [-1, 0])],
        3
      )
    ).toEqual(["pos", "orthogonal", "opposite"]);
    expect(admitVaultProjections([1, 0], [v("pos", [1, 0]), v("orthogonal", [0, 1])], 1)).toEqual([
      "pos",
    ]);
  });
});

describe("buildProjectedCorpus", () => {
  const embOpts = { model: "m" } as any;
  beforeEach(() => {
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
        updatedAt: ROW_VERSION,
      },
      {
        uniqueId: "miss",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: ROW_VERSION,
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
        updatedAt: ROW_VERSION,
      },
    ] as any);
    const getAll = vi.spyOn(ops, "getAllVaultMemoriesOp");
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache: VaultEmbeddingCache = new Map();
    seedVector(cache, "cached", Float32Array.from([1, 0]));
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

    expect(getAll).not.toHaveBeenCalled();
    expect(embByIds).toHaveBeenCalledWith({} as any, ["miss"], undefined);
    expect(out.vaultSize).toBe(2);
    expect(byIds.mock.calls[0][1]).toContain("cached");
  });

  it("forwards includeArchived to BOTH hydration steps, not just the key scan", async () => {
    const keys = vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      {
        uniqueId: "arch",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: ROW_VERSION,
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
        updatedAt: ROW_VERSION,
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

    expect(keys.mock.calls[0][1]).toMatchObject({ includeArchived: true });
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

    expect(genEmb).not.toHaveBeenCalled();
    expect(out).toEqual({
      memories: [],
      embeddedItems: [],
      queryEmbedding: [],
      vaultSize: 0,
      laneEmbedFailed: false,
      rowsDecrypted: 0,
    });
  });

  it("forceIncludeIds: decrypts side-lane candidates outside the cosine admission window", async () => {
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      {
        uniqueId: "top",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: ROW_VERSION,
      },
      {
        uniqueId: "sidehit",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: ROW_VERSION,
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
          updatedAt: ROW_VERSION,
        })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache: VaultEmbeddingCache = new Map();
    seedVector(cache, "top", Float32Array.from([1, 0]));
    seedVector(cache, "sidehit", Float32Array.from([0, 1]));
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
        updatedAt: ROW_VERSION,
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
          updatedAt: ROW_VERSION,
        })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache: VaultEmbeddingCache = new Map();
    seedVector(cache, "top", Float32Array.from([1, 0]));
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
        forceIncludeIds: ["ghost"],
      }
    );

    const decryptedIds = byIds.mock.calls.flatMap((c) => c[1] as string[]);
    expect(decryptedIds).not.toContain("ghost");
  });

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

    const cache: VaultEmbeddingCache = new Map();
    seedVector(cache, "old", Float32Array.from([1, 0]));
    const out = await buildProjectedCorpus(
      "q",
      {} as any,
      embOpts,
      cache,
      {},
      { limit: 1, admitFactor: 1, admitFloor: 1, unembeddedCap: 100, onEmbeddingDegraded }
    );

    expect(out.memories.map((m) => m.uniqueId)).toEqual(["new"]);
    expect(byIds.mock.calls.flatMap((c) => c[1] as string[])).toEqual(["new"]);
    expect(onEmbeddingDegraded).toHaveBeenCalled();
    expect(embByIds).not.toHaveBeenCalled();
  });

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
          updatedAt: ROW_VERSION,
        })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);
    vi.spyOn(embed, "generateEmbeddings").mockRejectedValue(new Error("429 rate limited"));

    const cache: VaultEmbeddingCache = new Map();
    seedVector(cache, "warm", Float32Array.from([1, 0]));
    const out = await buildProjectedCorpus(
      "q",
      {} as any,
      embOpts,
      cache,
      {},
      { limit: 3, admitFactor: 1, admitFloor: 3, unembeddedCap: 100 }
    );

    const decryptedIds = byIds.mock.calls.flatMap((c) => c[1] as string[]);
    expect(decryptedIds).toEqual(expect.arrayContaining(["warm", "cold1", "cold2"]));
    expect(decryptedIds.length).toBe(new Set(decryptedIds).size);
    expect(out.memories.map((m) => m.uniqueId).sort()).toEqual(["cold1", "cold2", "warm"]);
    expect(out.rowsDecrypted).toBe(3);
  });
});

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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));
    const out = await searchVaultMemoriesWithSize(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { limit: 5 }
    );

    expect(out.embeddingsUnavailable).toBe(false);
    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
  });

  it("does NOT report an outage when only the composite sub-query embed fails", async () => {
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
    ] as any);
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0, 0]);
    vi.spyOn(embed, "generateEmbeddings").mockRejectedValue(new Error("429 rate limited"));

    const cache = createVaultEmbeddingCache();
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));
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

    expect(out.embeddingsUnavailable).toBe(false);
    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
  });

  it("treats a successful-but-empty query embedding as degraded", async () => {
    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
    ] as any);
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
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));

    const prepared = await prepareVaultCandidates(
      "shellfish",
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { limit: 5 }
    );

    expect(prepared.embeddingsUnavailable).toBe(false);
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
      { uniqueId: "m1", updatedAt: ROW_VERSION, embeddingModel: null },
    ] as any);
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([
      { uniqueId: "m1", embedding: null },
    ] as any);
    vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockResolvedValue([
      makeMemory("m1", "allergic to shellfish"),
    ] as any);
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
        updatedAt: ROW_VERSION,
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
        updatedAt: ROW_VERSION,
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

  it("counts an admitted row that came back ENCRYPTED as decrypt work", async () => {
    const rows = [
      { uniqueId: "a", content: "alpha" },
      {
        uniqueId: "b",
        content: "enc:v3:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef00",
      },
    ];
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue(
      rows.map((r) => ({
        uniqueId: r.uniqueId,
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: ROW_VERSION,
      })) as any
    );
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue(
      rows.map((r) => ({ uniqueId: r.uniqueId, embedding: "[1,0]", embeddingModel: "m" })) as any
    );
    vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockResolvedValue(
      rows.map((r) => ({
        uniqueId: r.uniqueId,
        content: r.content,
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
        updatedAt: ROW_VERSION,
      })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache = createVaultEmbeddingCache();
    const out = await searchVaultMemoriesWithSize("q", {} as any, { model: "m" } as any, cache, {
      limit: 5,
      decryptLast: true,
    });

    expect(out.results.map((r) => r.uniqueId)).toEqual(["a"]);
    expect(out.decryptLast).toBe(true);
    expect(out.rowsDecrypted).toBe(2);
  });

  it("counts a row in BOTH the un-embedded lane and the admission window ONCE", async () => {
    const keys = [{ uniqueId: "novec" }].map((r) => ({
      uniqueId: r.uniqueId,
      folderId: null,
      scope: "private",
      embeddingModel: "m",
      updatedAt: ROW_VERSION,
    }));
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue(keys as any);
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([
      { uniqueId: "novec", embedding: null, embeddingModel: "m" },
    ] as any);
    const row = {
      uniqueId: "novec",
      content: "alpha",
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
      updatedAt: ROW_VERSION,
    };
    const byIds = vi
      .spyOn(ops, "getVaultMemoriesByIdsOp")
      .mockImplementation(async (_ctx: any, ids: string[]) =>
        ids.includes("novec") ? ([row] as any) : ([] as any)
      );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);
    vi.spyOn(embed, "generateEmbeddings").mockResolvedValue([[1, 0]]);
    vi.spyOn(ops, "updateVaultMemoryEmbeddingOp").mockResolvedValue(undefined as any);

    const cache = createVaultEmbeddingCache();
    const out = await searchVaultMemoriesWithSize("q", {} as any, { model: "m" } as any, cache, {
      limit: 5,
      decryptLast: true,
    });

    expect(out.vaultSize).toBe(1);
    expect(out.rowsDecrypted).toBe(1);
    expect(out.rowsDecrypted).toBeLessThanOrEqual(out.vaultSize);
    const fetchedIdBatches = byIds.mock.calls.map((c) => (c[1] as string[]).length);
    expect(fetchedIdBatches).toEqual([1]);
    expect(out.results.map((r) => r.uniqueId)).toEqual(["novec"]);
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
    FIXTURE.forEach((f) =>
      cacheRowVector(cacheA, f.uniqueId, Float32Array.from(f.vec), now, f.content)
    );

    const decryptLastOut = await searchVaultMemoriesWithSize("cats", {} as any, embOpts, cacheA, {
      limit: 3,
      decryptLast: true,
      admitFactor: 10,
      admitFloor: 10,
    });

    vi.spyOn(ops, "getAllVaultMemoriesOp").mockResolvedValue(FIXTURE.map(toRow) as any);
    const cacheB = createVaultEmbeddingCache();
    FIXTURE.forEach((f) =>
      cacheRowVector(cacheB, f.uniqueId, Float32Array.from(f.vec), now, f.content)
    );

    const legacyOut = await searchVaultMemoriesWithSize("cats", {} as any, embOpts, cacheB, {
      limit: 3,
    });

    expect(legacyOut.results.length).toBeGreaterThan(0);
    expect(decryptLastOut.results.map((r) => r.uniqueId)).toEqual(
      legacyOut.results.map((r) => r.uniqueId)
    );
    expect(decryptLastOut.results.length).toBe(legacyOut.results.length);
  });

  it("forwards entityRanking as forceIncludeIds so cosine-miss side-lane candidates are decrypted + surfaced", async () => {
    const rows = [
      {
        uniqueId: "top",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: ROW_VERSION,
      },
      {
        uniqueId: "sidehit",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: ROW_VERSION,
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
          updatedAt: ROW_VERSION,
        })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache = createVaultEmbeddingCache();
    seedVector(cache, "top", Float32Array.from([1, 0]));
    seedVector(cache, "sidehit", Float32Array.from([0, 1]));

    const out = await searchVaultMemoriesWithSize("cats", {} as any, { model: "m" } as any, cache, {
      limit: 5,
      minSimilarity: 0,
      decryptLast: true,
      admitFactor: 0.2,
      admitFloor: 1,
      entityRanking: ["sidehit"],
    });

    const decryptedIds = byIds.mock.calls.flatMap((c) => c[1] as string[]);
    expect(decryptedIds).toContain("sidehit");
    expect(out.results.map((r) => r.uniqueId)).toContain("sidehit");
  });

  it("keys present but admission decrypt yields 0 rows → empty return, ranker/decompose skipped", async () => {
    vi.spyOn(ops, "getVaultCandidateKeysOp").mockResolvedValue([
      {
        uniqueId: "a",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: ROW_VERSION,
      },
      {
        uniqueId: "b",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: ROW_VERSION,
      },
    ] as any);
    vi.spyOn(ops, "getVaultEmbeddingsByIdsOp").mockResolvedValue([] as any);
    vi.spyOn(ops, "getVaultMemoriesByIdsOp").mockImplementation(
      async (_ctx: any, ids: string[]) =>
        ids.map((id) => ({
          uniqueId: id,
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
          updatedAt: ROW_VERSION,
        })) as any
    );
    vi.spyOn(embed, "generateEmbedding").mockResolvedValue([1, 0]);

    const cache = createVaultEmbeddingCache();
    seedVector(cache, "a", Float32Array.from([1, 0]));
    seedVector(cache, "b", Float32Array.from([0, 1]));

    const out = await searchVaultMemoriesWithSize("q", {} as any, { model: "m" } as any, cache, {
      limit: 5,
      decryptLast: true,
      subQueries: ["facet a", "facet b"],
    });

    expect(out.results).toEqual([]);
    expect(out.vaultSize).toBe(2);
    expect(out.reranked).toBe(false);
    expect(out.hadV2Head).toBe(false);
  });
});

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

  function seededCache() {
    const cache = createVaultEmbeddingCache();
    seedVector(cache, "m1", new Float32Array([1, 0, 0]));
    seedVector(cache, "m2", new Float32Array([0, 1, 0]));
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
    expect(out.embeddingsUnavailable).toBe(false);
    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
  });

  it("falls through when the response is short of the sub-query count", async () => {
    vi.spyOn(embed, "generateEmbeddings").mockResolvedValue([[1, 0, 0]]);

    const out = await search();

    expect(warnings.some((w) => /falling back to single-query ranking/.test(w))).toBe(true);
    expect(out.results.map((r) => r.uniqueId)).toContain("m1");
  });

  it("falls through when a facet vector comes back at the wrong dimension", async () => {
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
    expect(out.results.map((r) => r.uniqueId)).toContain("m2");
  });
});
