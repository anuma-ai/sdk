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

/**
 * A complete, default-valued row. Only `uniqueId`/`content` vary across these
 * tests, but the fixture spells out every column so it stays a real
 * `StoredVaultMemory` — a partial one silently stops representing the shape the
 * cache actually reads.
 */
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

    // Step 1: Pre-embed existing memories (simulates mount)
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "original fact")]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[1, 0, 0]]);

    await preEmbedVaultMemories(mockVaultCtx, embeddingOptions, cache);
    expect(cache.size).toBe(1);
    // Cache keyed by memory id; values are Float32Array (model-native precision).
    expect(Array.from(cache.get("m1")!)).toEqual([1, 0, 0]);

    // Step 2: Create a new memory via tool (eager embed fires)
    vi.mocked(createVaultMemoryOp).mockResolvedValue(makeMemory("m2", "new fact"));
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);

    const saveTool = createMemoryVaultTool(
      mockVaultCtx,
      { onSave: async () => true },
      embeddingOptions,
      cache
    );
    await saveTool.executor!({ content: "new fact" });
    await new Promise((r) => setTimeout(r, 10)); // fire-and-forget

    expect(Array.from(cache.get("m2")!)).toEqual([0, 1, 0]);
    expect(cache.size).toBe(2);

    // Step 3: Update existing memory — same id overwrites its vector in place
    // (edit-invalidation is by id, not a content-key eviction).
    vi.mocked(getVaultMemoryOp).mockResolvedValue(makeMemory("m1", "original fact"));
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(makeMemory("m1", "updated fact"));
    vi.mocked(generateEmbedding).mockResolvedValue([0, 0, 1]);

    await saveTool.executor!({ content: "updated fact", id: "m1" });
    await new Promise((r) => setTimeout(r, 10));

    expect(cache.has("m1")).toBe(true);
    expect(Array.from(cache.get("m1")!)).toEqual([0, 0, 1]); // vector replaced
    expect(cache.size).toBe(2); // m1 (updated) + m2

    // Step 4: Search needs no batch re-embedding. The tool's eager cache write
    // doesn't know which row version it belongs to, so the search re-resolves
    // it from the vector eagerEmbedContent PERSISTED on the row (a DB read, not
    // an embeddings call) rather than trusting an unversioned entry.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      { ...makeMemory("m1", "updated fact"), embedding: "[0,0,1]" },
      { ...makeMemory("m2", "new fact"), embedding: "[0,1,0]" },
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

describe("eager warming is served from the cache", () => {
  // Untagged entries are a miss, so an eager write that doesn't name the
  // committed row's version would never be hit: a search that runs before the
  // fire-and-forget persist lands finds no stored vector either, and pays an
  // embeddings call — the exact cost eager embedding exists to avoid.
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
    await new Promise((r) => setTimeout(r, 10)); // let the eager embed settle

    // The row as the search reads it: persist not landed yet (no stored vector).
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
