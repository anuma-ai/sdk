import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAllVaultMemoriesOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import { generateEmbedding } from "../memoryEngine/embeddings";
import { createVaultEmbeddingCache } from "./lruCache";
import { createMemoryVaultSearchTool } from "./searchToolExecutor";
import { cacheRowVector } from "./vectorVersion";

vi.mock("../db/memoryVault/operations", () => ({
  getAllVaultMemoriesOp: vi.fn(),
  updateVaultMemoryEmbeddingOp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

const ROW_VERSION = new Date("2026-06-01T00:00:00Z");

function makeMemory(uniqueId: string, content: string): StoredVaultMemory {
  return {
    uniqueId,
    content,
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
    topics: null,
    topicsUpdatedAt: null,
    topicsExtractedAt: null,
    supersededBy: null,
    supersededAt: null,
    topicsExtractedVersion: null,
    lastObservedAt: null,
    factType: null,
    archivedAt: null,
    trustTier: null,
    visibility: "private",
    twinOptIn: false,
    publishedAt: null,
    geohash: null,
    createdAt: ROW_VERSION,
    updatedAt: ROW_VERSION,
    isDeleted: false,
  };
}

describe("legacy vault search diagnostics", () => {
  beforeEach(() => vi.resetAllMocks());

  it("reports the eligible count and limit cut before the result slice", async () => {
    const memories = [makeMemory("a", "tea"), makeMemory("b", "coffee")];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    const cache = createVaultEmbeddingCache();
    cacheRowVector(cache, "a", new Float32Array([1, 0, 0]), ROW_VERSION, "tea");
    cacheRowVector(cache, "b", new Float32Array([0.8, 0.2, 0]), ROW_VERSION, "coffee");
    const onDiagnostics = vi.fn();
    const onTruncated = vi.fn();
    const tool = createMemoryVaultSearchTool(
      {} as VaultMemoryOperationsContext,
      { apiKey: "test-key" },
      cache,
      { useFusion: false },
      { onDiagnostics, onTruncated }
    );
    expect(await tool.executor!({ query: "drink", limit: 1 })).toContain("tea");
    expect(onDiagnostics).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        candidateCount: 2,
        admittedCount: 1,
        truncated: true,
        vaultRowsDecrypted: 2,
      })
    );
    expect(onTruncated).toHaveBeenCalledExactlyOnceWith({
      requestedLimit: 1,
      effectiveLimit: 1,
      truncatedByBudget: false,
    });
  });
});
