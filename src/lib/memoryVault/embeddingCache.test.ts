import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryVaultTool } from "./tool";
import { createMemoryVaultSearchTool, preEmbedVaultMemories } from "./searchTool";
import { createVaultEmbeddingCache } from "./lruCache";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import type { EmbeddingOptions } from "../memoryRetrieval/types";

vi.mock("../db/memoryVault/operations", () => ({
  createVaultMemoryOp: vi.fn(),
  getVaultMemoryOp: vi.fn(),
  updateVaultMemoryOp: vi.fn(),
  getAllVaultMemoriesOp: vi.fn(),
}));

vi.mock("../memoryRetrieval/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

import {
  createVaultMemoryOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
  getAllVaultMemoriesOp,
} from "../db/memoryVault/operations";
import { generateEmbedding, generateEmbeddings } from "../memoryRetrieval/embeddings";

const mockVaultCtx = {} as VaultMemoryOperationsContext;
const embeddingOptions: EmbeddingOptions = { apiKey: "test-key" };

function makeMemory(id: string, content: string): StoredVaultMemory {
  return {
    uniqueId: id,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };
}

describe("embedding cache lifecycle", () => {
  it("maintains cache consistency across pre-embed → create → update → search", async () => {
    const cache = createVaultEmbeddingCache();

    // Step 1: Pre-embed existing memories (simulates mount)
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "original fact")]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[1, 0, 0]]);

    await preEmbedVaultMemories(mockVaultCtx, embeddingOptions, cache);
    expect(cache.size).toBe(1);
    expect(cache.get("original fact")).toEqual([1, 0, 0]);

    // Step 2: Create a new memory via tool (eager embed fires)
    vi.mocked(createVaultMemoryOp).mockResolvedValue(makeMemory("m2", "new fact"));
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);

    const saveTool = createMemoryVaultTool(mockVaultCtx, undefined, embeddingOptions, cache);
    await saveTool.executor!({ content: "new fact" });
    await new Promise((r) => setTimeout(r, 10)); // fire-and-forget

    expect(cache.get("new fact")).toEqual([0, 1, 0]);
    expect(cache.size).toBe(2);

    // Step 3: Update existing memory (evicts old key, embeds new)
    vi.mocked(getVaultMemoryOp).mockResolvedValue(makeMemory("m1", "original fact"));
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(makeMemory("m1", "updated fact"));
    vi.mocked(generateEmbedding).mockResolvedValue([0, 0, 1]);

    await saveTool.executor!({ content: "updated fact", id: "m1" });
    await new Promise((r) => setTimeout(r, 10));

    expect(cache.has("original fact")).toBe(false);
    expect(cache.get("updated fact")).toEqual([0, 0, 1]);
    expect(cache.size).toBe(2); // "new fact" + "updated fact"

    // Step 4: Search uses cached embeddings — no batch re-embedding
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "updated fact"),
      makeMemory("m2", "new fact"),
    ]);
    vi.mocked(generateEmbedding).mockResolvedValue([0, 0, 1]); // query
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
