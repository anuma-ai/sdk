import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMemoryVaultSearchTool,
  searchVaultMemories,
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

vi.mock("../memoryEngine/constants", () => ({
  DEFAULT_API_EMBEDDING_MODEL: "test-model",
}));

import { getAllVaultMemoriesOp } from "../db/memoryVault/operations";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";

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
    embeddingModel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };
}

describe("searchVaultMemories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    cache.set("cats are great", [1, 0, 0]); // cos = 1.0
    cache.set("dogs are fun", [0.5, 0.5, 0]); // cos ≈ 0.71
    cache.set("birds can fly", [0, 1, 0]); // cos = 0.0

    const results = await searchVaultMemories("cats", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
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
    cache.set("high relevance", [1, 0, 0]); // similarity = 1.0
    cache.set("low relevance", [0, 1, 0]); // similarity = 0.0

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
    cache.set("content a", [1, 0, 0]);
    cache.set("content b", [0.9, 0.1, 0]);
    cache.set("content c", [0.8, 0.2, 0]);

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
    cache.set("private data", [1, 0, 0]);

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
      embeddingModel: "test-model",
    };
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([memWithEmbedding]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache = createVaultEmbeddingCache();
    const results = await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
    });

    expect(results).toHaveLength(1);
    expect(cache.get("db-persisted")).toEqual([1, 0, 0]);
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

    await new Promise((r) => setTimeout(r, 10));

    expect(vi.mocked(updateVaultMemoryEmbeddingOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      "m1",
      JSON.stringify([0.9, 0.1, 0]),
      "test-model"
    );
  });

  it("populates cache for uncached entries", async () => {
    const memories = [makeMemory("m1", "cached"), makeMemory("m2", "uncached")];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[0.9, 0.1, 0]]);

    const cache = createVaultEmbeddingCache();
    cache.set("cached", [1, 0, 0]);

    await searchVaultMemories("test", mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
    });

    expect(cache.has("uncached")).toBe(true);
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
    cache.set("cats are great", [1, 0, 0]); // cos = 1.0
    cache.set("dogs are fun", [0.5, 0.5, 0]); // cos ≈ 0.71
    cache.set("birds can fly", [0, 1, 0]); // cos = 0.0

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
    cache.set("high relevance", [1, 0, 0]); // similarity = 1.0
    cache.set("low relevance", [0, 1, 0]); // similarity = 0.0

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
    cache.set("unrelated", [0, 1, 0]);

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
    cache.set("cached content", [1, 0, 0]);

    const tool = createMemoryVaultSearchTool(mockVaultCtx, mockEmbeddingOptions, cache, {
      minSimilarity: 0,
    });
    const result = (await tool.executor!({ query: "test" })) as string;

    expect(generateEmbeddings).toHaveBeenCalledWith(["uncached content"], mockEmbeddingOptions);
    expect(cache.has("uncached content")).toBe(true);
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
    cache.set("content", [1, 0, 0]);

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

    expect(cache.get("first")).toEqual([1, 0, 0]);
    expect(cache.get("second")).toEqual([0, 1, 0]);
  });

  it("loads persisted embeddings from DB instead of re-embedding", async () => {
    const memWithEmbedding = {
      ...makeMemory("m1", "persisted"),
      embedding: JSON.stringify([9, 8, 7]),
      embeddingModel: "test-model",
    };
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([memWithEmbedding]);

    const cache = createVaultEmbeddingCache();
    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    expect(cache.get("persisted")).toEqual([9, 8, 7]);
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
    expect(cache.get("bad json")).toEqual([1, 1, 1]);
  });

  it("persists newly generated embeddings to DB via updateVaultMemoryEmbeddingOp", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "needs embed")]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[3, 2, 1]]);
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");

    const cache = createVaultEmbeddingCache();
    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    // Allow fire-and-forget promise to settle
    await new Promise((r) => setTimeout(r, 10));

    expect(vi.mocked(updateVaultMemoryEmbeddingOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      "m1",
      JSON.stringify([3, 2, 1]),
      "test-model"
    );
  });

  it("skips already-cached entries", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "cached"),
      makeMemory("m2", "not cached"),
    ]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[0, 1, 0]]);

    const cache = createVaultEmbeddingCache();
    cache.set("cached", [1, 0, 0]);

    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    expect(generateEmbeddings).toHaveBeenCalledWith(["not cached"], mockEmbeddingOptions);
    expect(cache.get("cached")).toEqual([1, 0, 0]); // unchanged
    expect(cache.get("not cached")).toEqual([0, 1, 0]);
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
    expect(cache.get("bad embed content")).toEqual([0.8, 0.2, 0]);
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

    await new Promise((r) => setTimeout(r, 10));

    // Cache should be populated despite DB failure
    expect(cache.get("cache me anyway")).toEqual([1, 2, 3]);
  });
});

describe("eagerEmbedContent", () => {
  it("generates an embedding and stores it in the cache", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([1, 2, 3]);

    const cache = createVaultEmbeddingCache();
    await eagerEmbedContent("new memory text", mockEmbeddingOptions, cache);

    expect(generateEmbedding).toHaveBeenCalledWith("new memory text", mockEmbeddingOptions);
    expect(cache.get("new memory text")).toEqual([1, 2, 3]);
  });

  it("persists embedding to DB when vaultCtx and memoryId are provided", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([4, 5, 6]);
    const { updateVaultMemoryEmbeddingOp } = await import("../db/memoryVault/operations");

    const cache = createVaultEmbeddingCache();
    await eagerEmbedContent("persist me", mockEmbeddingOptions, cache, mockVaultCtx, "mem-99");

    // Allow fire-and-forget promise to settle
    await new Promise((r) => setTimeout(r, 10));

    expect(vi.mocked(updateVaultMemoryEmbeddingOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      "mem-99",
      JSON.stringify([4, 5, 6]),
      "test-model"
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
