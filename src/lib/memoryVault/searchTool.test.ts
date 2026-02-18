import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMemoryVaultSearchTool,
  preEmbedVaultMemories,
  eagerEmbedContent,
  type VaultEmbeddingCache,
} from "./searchTool";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import type { EmbeddingOptions } from "../memoryRetrieval/types";

vi.mock("../db/memoryVault/operations", () => ({
  getAllVaultMemoriesOp: vi.fn(),
}));

vi.mock("../memoryRetrieval/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

import { getAllVaultMemoriesOp } from "../db/memoryVault/operations";
import {
  generateEmbedding,
  generateEmbeddings,
} from "../memoryRetrieval/embeddings";

const mockVaultCtx = {} as VaultMemoryOperationsContext;
const mockEmbeddingOptions: EmbeddingOptions = { apiKey: "test-key" };

function makeMemory(id: string, content: string): StoredVaultMemory {
  return {
    uniqueId: id,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };
}

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

    const cache: VaultEmbeddingCache = new Map();
    cache.set("cats are great", [1, 0, 0]); // cos = 1.0
    cache.set("dogs are fun", [0.5, 0.5, 0]); // cos ≈ 0.71
    cache.set("birds can fly", [0, 1, 0]); // cos = 0.0

    const tool = createMemoryVaultSearchTool(
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0 }
    );
    const result = (await tool.executor!({ query: "cats" })) as string;

    expect(result).toContain("Found 3 vault memories");
    const m1Idx = result.indexOf("m1");
    const m2Idx = result.indexOf("m2");
    const m3Idx = result.indexOf("m3");
    expect(m1Idx).toBeLessThan(m2Idx);
    expect(m2Idx).toBeLessThan(m3Idx);
  });

  it("filters out results below minSimilarity threshold", async () => {
    const memories = [
      makeMemory("m1", "high relevance"),
      makeMemory("m2", "low relevance"),
    ];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache: VaultEmbeddingCache = new Map();
    cache.set("high relevance", [1, 0, 0]); // similarity = 1.0
    cache.set("low relevance", [0, 1, 0]); // similarity = 0.0

    const tool = createMemoryVaultSearchTool(
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0.5 }
    );
    const result = (await tool.executor!({ query: "test" })) as string;

    expect(result).toContain("Found 1 vault memories");
    expect(result).toContain("high relevance");
    expect(result).not.toContain("low relevance");
  });

  it("returns 'no relevant memories' when all results are below threshold", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "unrelated"),
    ]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);

    const cache: VaultEmbeddingCache = new Map();
    cache.set("unrelated", [0, 1, 0]);

    const tool = createMemoryVaultSearchTool(
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0.5 }
    );
    const result = await tool.executor!({ query: "test" });

    expect(result).toBe("No relevant memories found in the vault.");
  });

  it("batch-embeds uncached entries on the fly as fallback", async () => {
    const memories = [
      makeMemory("m1", "cached content"),
      makeMemory("m2", "uncached content"),
    ];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[0.9, 0.1, 0]]);

    const cache: VaultEmbeddingCache = new Map();
    cache.set("cached content", [1, 0, 0]);

    const tool = createMemoryVaultSearchTool(
      mockVaultCtx,
      mockEmbeddingOptions,
      cache,
      { minSimilarity: 0 }
    );
    const result = (await tool.executor!({ query: "test" })) as string;

    expect(generateEmbeddings).toHaveBeenCalledWith(
      ["uncached content"],
      mockEmbeddingOptions
    );
    expect(cache.has("uncached content")).toBe(true);
    expect(result).toContain("Found 2 vault memories");
  });

  it("returns error message when embedding generation fails", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "content"),
    ]);
    vi.mocked(generateEmbedding).mockRejectedValue(
      new Error("API rate limit")
    );

    const cache: VaultEmbeddingCache = new Map();
    cache.set("content", [1, 0, 0]);

    const tool = createMemoryVaultSearchTool(
      mockVaultCtx,
      mockEmbeddingOptions,
      cache
    );
    const result = await tool.executor!({ query: "test" });

    expect(result).toBe("Error searching vault: API rate limit");
  });
});

describe("preEmbedVaultMemories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const cache: VaultEmbeddingCache = new Map();
    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    expect(cache.get("first")).toEqual([1, 0, 0]);
    expect(cache.get("second")).toEqual([0, 1, 0]);
  });

  it("skips already-cached entries", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "cached"),
      makeMemory("m2", "not cached"),
    ]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[0, 1, 0]]);

    const cache: VaultEmbeddingCache = new Map();
    cache.set("cached", [1, 0, 0]);

    await preEmbedVaultMemories(mockVaultCtx, mockEmbeddingOptions, cache);

    expect(generateEmbeddings).toHaveBeenCalledWith(
      ["not cached"],
      mockEmbeddingOptions
    );
    expect(cache.get("cached")).toEqual([1, 0, 0]); // unchanged
    expect(cache.get("not cached")).toEqual([0, 1, 0]);
  });
});

describe("eagerEmbedContent", () => {
  it("generates an embedding and stores it in the cache", async () => {
    vi.mocked(generateEmbedding).mockResolvedValue([1, 2, 3]);

    const cache: VaultEmbeddingCache = new Map();
    await eagerEmbedContent("new memory text", mockEmbeddingOptions, cache);

    expect(generateEmbedding).toHaveBeenCalledWith(
      "new memory text",
      mockEmbeddingOptions
    );
    expect(cache.get("new memory text")).toEqual([1, 2, 3]);
  });
});
