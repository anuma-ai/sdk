import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryVaultTool } from "./tool";
import { preEmbedVaultMemories } from "./searchTool";
import { createMemoryVaultSearchTool } from "./searchToolExecutor";
import { createVaultEmbeddingCache } from "./lruCache";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import type { EmbeddingOptions } from "../memoryEngine/types";

vi.mock("../db/memoryVault/operations", () => ({
  createVaultMemoryOp: vi.fn(),
  getVaultMemoryOp: vi.fn(),
  updateVaultMemoryOp: vi.fn(),
  getAllVaultMemoriesOp: vi.fn(),
  updateVaultMemoryEmbeddingOp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

import {
  createVaultMemoryOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
  getAllVaultMemoriesOp,
} from "../db/memoryVault/operations";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";

const mockVaultCtx = {} as VaultMemoryOperationsContext;
const embeddingOptions: EmbeddingOptions = { apiKey: "test-key" };

function makeMemory(id: string, content: string): StoredVaultMemory {
  return {
    uniqueId: id,
    content,
    scope: "private",
    folderId: null,
    userId: null,
    embedding: null,
    embeddingModel: null,
    sourceChunkIds: null,
    proofCount: 1,
    source: "manual",
    eventTimeStart: null,
    eventTimeEnd: null,
    eventTimeKind: null,
    topicsUserManaged: false,
    topics: null,
    topicsUpdatedAt: null,
    topicsExtractedAt: null,
    topicsExtractedVersion: null,
    supersededBy: null,
    supersededAt: null,
    lastObservedAt: null,
    factType: null,
    archivedAt: null,
    trustTier: null,
    visibility: "private",
    twinOptIn: false,
    publishedAt: null,
    geohash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };
}

describe("embedding cache lifecycle", () => {
  it("maintains cache consistency across pre-embed → create → update → search", async () => {
    const cache = createVaultEmbeddingCache();

    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "original fact")]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[1, 0, 0]]);

    await preEmbedVaultMemories(mockVaultCtx, embeddingOptions, cache);
    expect(cache.size).toBe(1);
    expect(Array.from(cache.get("m1")!)).toEqual([1, 0, 0]);

    vi.mocked(createVaultMemoryOp).mockResolvedValue(makeMemory("m2", "new fact"));
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);

    const saveTool = createMemoryVaultTool(
      mockVaultCtx,
      { onSave: async () => true },
      embeddingOptions,
      cache
    );
    await saveTool.executor!({ content: "new fact" });
    await new Promise((r) => setTimeout(r, 10));

    expect(Array.from(cache.get("m2")!)).toEqual([0, 1, 0]);
    expect(cache.size).toBe(2);

    vi.mocked(getVaultMemoryOp).mockResolvedValue(makeMemory("m1", "original fact"));
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(makeMemory("m1", "updated fact"));
    vi.mocked(generateEmbedding).mockResolvedValue([0, 0, 1]);

    await saveTool.executor!({ content: "updated fact", id: "m1" });
    await new Promise((r) => setTimeout(r, 10));

    expect(cache.has("m1")).toBe(true);
    expect(Array.from(cache.get("m1")!)).toEqual([0, 0, 1]);
    expect(cache.size).toBe(2);

    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      { ...makeMemory("m1", "updated fact"), embedding: "[0,0,1]" },
      { ...makeMemory("m2", "new fact"), embedding: "[0,1,0]" },
    ]);
    vi.mocked(generateEmbedding).mockResolvedValue([0, 0, 1]);
    vi.mocked(generateEmbeddings).mockClear();

    const searchTool = createMemoryVaultSearchTool(mockVaultCtx, embeddingOptions, cache, {
      minSimilarity: 0,
    });
    const result = (await searchTool.executor!({
      query: "updated",
    })) as string;

    expect(generateEmbeddings).not.toHaveBeenCalled();
    expect(result).toContain("Found 2 vault memories");
  });
});

describe("eager warming is served from the cache", () => {
  it("save then search before the persist lands: cache hit, no extra embeddings call", async () => {
    const cache = createVaultEmbeddingCache();
    const committedAt = new Date("2026-09-01T00:00:00Z");
    const saved = { ...makeMemory("m9", "prefers window seats"), updatedAt: committedAt };
    vi.mocked(createVaultMemoryOp).mockResolvedValue(saved);
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);

    const saveTool = createMemoryVaultTool(
      mockVaultCtx,
      { onSave: async () => true },
      embeddingOptions,
      cache
    );
    await saveTool.executor!({ content: "prefers window seats" });
    await new Promise((r) => setTimeout(r, 10));

    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([{ ...saved, embedding: null }]);
    vi.mocked(generateEmbeddings).mockClear();
    const searchTool = createMemoryVaultSearchTool(mockVaultCtx, embeddingOptions, cache, {
      minSimilarity: 0.5,
    });
    const result = (await searchTool.executor!({ query: "seats" })) as string;

    expect(generateEmbeddings).not.toHaveBeenCalled();
    expect(result).toContain("Found 1 vault memories");
  });
});
