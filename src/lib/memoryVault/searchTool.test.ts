import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMemoryVaultSearchTool,
  searchVaultMemories,
  searchVaultMemoriesWithSize,
  preEmbedVaultMemories,
  eagerEmbedContent,
} from "./searchTool";
import { createVaultEmbeddingCache } from "./lruCache";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import type { EmbeddingOptions } from "../memoryEngine/types";

vi.mock("../db/memoryVault/operations", () => ({
  getAllVaultMemoriesOp: vi.fn(),
  updateVaultMemoryEmbeddingOp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

vi.mock("../memory/reranker", () => ({
  rerankPairs: vi.fn(),
}));

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

  it("returns error message when embedding generation fails", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "content")]);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("API rate limit"));

    const cache = createVaultEmbeddingCache();
    cache.set("m1", new Float32Array([1, 0, 0]));

    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache);
    const result = await tool.executor!({ query: "test" });

    expect(result).toBe("Error searching vault: API rate limit");
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
