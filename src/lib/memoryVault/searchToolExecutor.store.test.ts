import { describe, expect, it, vi } from "vitest";

vi.mock("../memory/recall", () => ({
  recall: vi.fn(() =>
    Promise.resolve({
      memories: [{ id: "m1", kind: "fact", content: "Likes tea", score: 0.9 }],
      usedBudget: "low",
      reranked: false,
      candidateCount: 1,
      vaultSize: 1,
    })
  ),
}));

vi.mock("./searchTool", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./searchTool")>()),
  searchVaultMemoriesWithSize: vi.fn(),
}));

import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import { recall } from "../memory/recall";
import type { MemoryStore } from "../memory/store/types";
import type { RecallDiagnostics } from "../memory/types";
import { createVaultEmbeddingCache } from "./lruCache";
import { searchVaultMemoriesWithSize } from "./searchTool";
import { createMemoryVaultSearchTool } from "./searchToolExecutor";

function fakeStore() {
  return {
    retain: vi.fn(),
    factSource: {
      search: vi.fn(() =>
        Promise.resolve({
          results: [{ uniqueId: "m2", content: "Drinks coffee", similarity: 0.8 }],
          vaultSize: 1,
        })
      ),
      graphRanking: vi.fn(() => Promise.resolve([])),
      temporalRanking: vi.fn(() => Promise.resolve([])),
    },
  } as unknown as MemoryStore;
}

describe("createMemoryVaultSearchTool with a MemoryStore", () => {
  it("recalls through the store's fact source", async () => {
    const store = fakeStore();
    const tool = createMemoryVaultSearchTool(store, { apiKey: "k" }, createVaultEmbeddingCache());
    const out = await tool.executor!({ query: "tea" });

    expect(vi.mocked(recall).mock.calls[0][1]).toEqual({
      factSource: store.factSource,
      embeddingOptions: { apiKey: "k" },
    });
    expect(out).toContain("Likes tea");
  });

  it("serves the legacy cosine path from the store's fact search", async () => {
    const store = fakeStore();
    const tool = createMemoryVaultSearchTool(store, { apiKey: "k" }, createVaultEmbeddingCache(), {
      useFusion: false,
    });
    const out = await tool.executor!({ query: "coffee" });

    expect(store.factSource.search).toHaveBeenCalledWith(
      "coffee",
      expect.objectContaining({ useFusion: false })
    );
    expect(searchVaultMemoriesWithSize).not.toHaveBeenCalled();
    expect(out).toContain("Drinks coffee");
  });

  it("declares the recall task type on the legacy vault search", async () => {
    const emptyOutcome = { results: [], vaultSize: 0 } as never;
    vi.mocked(searchVaultMemoriesWithSize).mockResolvedValue(emptyOutcome);
    const vaultCtx = {} as VaultMemoryOperationsContext;
    const cache = createVaultEmbeddingCache();
    const tool = createMemoryVaultSearchTool(vaultCtx, { apiKey: "k" }, cache, {
      useFusion: false,
    });
    await tool.executor!({ query: "coffee" });

    expect(searchVaultMemoriesWithSize).toHaveBeenCalledWith(
      "coffee",
      vaultCtx,
      { apiKey: "k", taskType: "memory_recall_embed" },
      cache,
      expect.objectContaining({ useFusion: false })
    );
  });
});

describe("vault search telemetry", () => {
  it("forwards diagnostics, the empty reason, and a result limit cut", async () => {
    const onDiagnostics = vi.fn();
    const onTruncated = vi.fn();
    const diagnostics: RecallDiagnostics = {
      usedBudget: "low",
      reranked: false,
      candidateCount: 0,
      factCount: 0,
      chunkCount: 0,
      admittedCount: 0,
      topScore: -1,
      lowestAdmittedScore: -1,
      minScoreApplied: -1,
      graphLaneCount: 0,
      temporalLaneCount: 0,
      emptyReason: "no-candidates",
      truncated: true,
      timings: { total: 0, prep: 0, factLane: 0, rerank: 0, queryEmbed: 0, chunkLane: 0, fuse: 0 },
      degraded: [],
    };
    vi.mocked(recall).mockImplementationOnce((_query, _ctx, options) => {
      options?.onDiagnostics?.(diagnostics);
      return Promise.resolve({
        memories: [],
        vaultSize: 1,
        usedBudget: "low",
        reranked: false,
        candidateCount: 0,
      });
    });
    const tool = createMemoryVaultSearchTool(
      fakeStore(),
      { apiKey: "k" },
      createVaultEmbeddingCache(),
      undefined,
      { onDiagnostics, onTruncated }
    );
    expect(await tool.executor!({ query: "tea" })).toContain("No relevant");
    expect(onDiagnostics).toHaveBeenCalledWith(diagnostics);
    expect(onTruncated).toHaveBeenCalledWith({
      requestedLimit: 5,
      effectiveLimit: 5,
      truncatedByBudget: false,
    });
  });

  it("reports legacy empty searches and caught errors without changing tool output", async () => {
    const store = fakeStore();
    vi.mocked(store.factSource.search)
      .mockResolvedValueOnce({ results: [], vaultSize: 0 } as never)
      .mockRejectedValueOnce(new Error("offline"));
    const onDiagnostics = vi.fn();
    const onError = vi.fn();
    const tool = createMemoryVaultSearchTool(
      store,
      { apiKey: "k" },
      createVaultEmbeddingCache(),
      { useFusion: false },
      { onDiagnostics, onError }
    );
    expect(await tool.executor!({ query: "tea" })).toContain("No relevant");
    expect(onDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ admittedCount: 0, emptyReason: "vault-empty" })
    );
    expect(await tool.executor!({ query: "tea" })).toBe("Error searching vault: offline");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "offline" }));
  });
});
