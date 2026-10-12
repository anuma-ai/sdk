import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getVaultMemoriesByIdsOp,
  getVaultRankingProjectionsOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import { recall } from "./recall";
import { createRecallTool, type RecallToolCallbacks } from "./recallTool";
import type { MemoryStore } from "./store/types";
import type { RankedMemory, RecallContext, RecallDiagnostics, RecallResult } from "./types";

vi.mock("./recall", () => ({ recall: vi.fn() }));
vi.mock("../db/memoryVault/operations", () => ({
  getVaultRankingProjectionsOp: vi.fn(),
  getVaultMemoriesByIdsOp: vi.fn(),
}));

const ctx: RecallContext = { embeddingOptions: { apiKey: "test-key" } };

function fact(id: string, content: string): RankedMemory {
  return {
    id,
    kind: "fact",
    content,
    score: 1,
    createdAt: new Date("2026-06-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
  };
}

function recallResult(memories: RankedMemory[]): RecallResult {
  return { memories, usedBudget: "low", reranked: false, candidateCount: memories.length };
}

function diagnostics(overrides: Partial<RecallDiagnostics> = {}): RecallDiagnostics {
  return {
    usedBudget: "low",
    reranked: false,
    candidateCount: 0,
    factCount: 0,
    chunkCount: 0,
    admittedCount: 0,
    topScore: -1,
    lowestAdmittedScore: -1,
    minScoreApplied: -1,
    truncated: false,
    graphLaneCount: 0,
    temporalLaneCount: 0,
    emptyReason: "",
    timings: { total: 0, prep: 0, factLane: 0, rerank: 0, queryEmbed: 0, chunkLane: 0, fuse: 0 },
    degraded: [],
    ...overrides,
  };
}

function storedFact(id: string, content: string): StoredVaultMemory {
  return {
    uniqueId: id,
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
    createdAt: new Date("2026-06-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    isDeleted: false,
  };
}

function recentTool(
  source: "vault" | "store",
  rows: StoredVaultMemory[],
  callbacks: RecallToolCallbacks,
  missingIds: string[] = []
) {
  const read = (ids: string[]) =>
    Promise.resolve(
      rows
        .filter((row) => ids.includes(row.uniqueId) && !missingIds.includes(row.uniqueId))
        .reverse()
    );
  if (source === "vault") {
    vi.mocked(getVaultRankingProjectionsOp).mockResolvedValue(rows);
    vi.mocked(getVaultMemoriesByIdsOp).mockImplementation((_ctx, ids) => read(ids));
    return createRecallTool(
      { ...ctx, vaultCtx: {} as VaultMemoryOperationsContext },
      undefined,
      callbacks
    );
  }
  const memoryStore = {
    listProjections: vi.fn((options?: { limit?: number }) =>
      Promise.resolve(rows.slice(0, options?.limit))
    ),
    list: vi.fn((options: { memoryIds: string[] }) => read(options.memoryIds)),
  } as unknown as MemoryStore;
  return createRecallTool(ctx, { memoryStore }, callbacks);
}

describe("recall tool telemetry", () => {
  beforeEach(() => vi.resetAllMocks());

  it("forwards diagnostics and reports the turn budget cut", async () => {
    vi.mocked(recall).mockImplementation((_query, _ctx, options) => {
      const count = options?.limit ?? 0;
      options?.onDiagnostics?.(diagnostics({ admittedCount: count }));
      return Promise.resolve(
        recallResult(Array.from({ length: count }, (_, i) => fact(String(i), "tea")))
      );
    });
    const onDiagnostics = vi.fn();
    const onTruncated = vi.fn();
    const tool = createRecallTool(ctx, undefined, { onDiagnostics, onTruncated });
    await tool.executor!({ query: "tea", limit: 30 });
    await tool.executor!({ query: "coffee", limit: 30 });
    expect(onDiagnostics).toHaveBeenLastCalledWith(
      expect.objectContaining({ admittedCount: 10, truncatedByBudget: true })
    );
    expect(onTruncated).toHaveBeenLastCalledWith({
      requestedLimit: 30,
      effectiveLimit: 10,
      truncatedByBudget: true,
    });
    await tool.executor!({ query: "books", limit: 8 });
    expect(onTruncated).toHaveBeenLastCalledWith({
      requestedLimit: 8,
      effectiveLimit: 0,
      truncatedByBudget: true,
    });
  });

  it("keeps the result and budget when telemetry callbacks throw", async () => {
    vi.mocked(recall).mockImplementation((_query, _ctx, options) => {
      const count = options?.limit ?? 0;
      options?.onDiagnostics?.(diagnostics({ admittedCount: count }));
      return Promise.resolve(
        recallResult(Array.from({ length: count }, (_, i) => fact(String(i), "tea")))
      );
    });
    const fail = () => {
      throw new Error("metrics offline");
    };
    const onDiagnostics = vi.fn(fail);
    const onTruncated = vi.fn(fail);
    const tool = createRecallTool(ctx, undefined, { onDiagnostics, onTruncated });
    expect(await tool.executor!({ query: "tea", limit: 30 })).toContain("Found 30");
    expect(await tool.executor!({ query: "tea", limit: 30 })).toContain("Found 10");
    expect(await tool.executor!({ query: "tea" })).toContain("budget");
    expect(onDiagnostics).toHaveBeenCalledTimes(2);
    expect(onTruncated).toHaveBeenCalledTimes(2);
  });

  it("reports diagnostics for the recent facts path", async () => {
    vi.mocked(getVaultRankingProjectionsOp).mockResolvedValue([]);
    const onDiagnostics = vi.fn();
    const tool = createRecallTool(
      { ...ctx, vaultCtx: {} as VaultMemoryOperationsContext },
      undefined,
      { onDiagnostics }
    );
    expect(await tool.executor!({ query: "recent facts", sort: "recent" })).toContain(
      "No relevant"
    );
    expect(onDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({
        admittedCount: 0,
        minScoreApplied: -1,
        vaultSize: 0,
        emptyReason: "vault-empty",
        truncatedByBudget: false,
      })
    );
    expect(recall).not.toHaveBeenCalled();
    expect(getVaultMemoriesByIdsOp).not.toHaveBeenCalled();
  });

  describe.each(["vault", "store"] as const)("recent %s truncation", (source) => {
    const locked = `enc:v3:${"a".repeat(64)}`;

    it("reports a result limit cut through both callbacks", async () => {
      const onDiagnostics = vi.fn();
      const onTruncated = vi.fn();
      const onFactsRetrieved = vi.fn();
      const tool = recentTool(
        source,
        [storedFact("m1", "tea"), storedFact("m2", "coffee"), storedFact("m3", "books")],
        { onDiagnostics, onTruncated, onFactsRetrieved }
      );

      const output = await tool.executor!({ query: "recent facts", sort: "recent", limit: 2 });

      expect(output).toContain("Found 2 relevant memories");
      expect(output).not.toContain("id: m3");
      expect(onFactsRetrieved).toHaveBeenCalledExactlyOnceWith(["m1", "m2"]);
      expect(onDiagnostics).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ admittedCount: 2, truncated: true, truncatedByBudget: false })
      );
      expect(onTruncated).toHaveBeenCalledExactlyOnceWith({
        requestedLimit: 2,
        effectiveLimit: 2,
        truncatedByBudget: false,
      });
      expect(recall).not.toHaveBeenCalled();
    });

    it.each([
      { contents: [], count: 0 },
      { contents: ["tea"], count: 1 },
      { contents: ["tea", "coffee"], count: 2 },
      { contents: ["tea", "coffee", locked, locked, locked], count: 2 },
    ])("does not report a cut for $count readable facts", async ({ contents, count }) => {
      const onDiagnostics = vi.fn();
      const onTruncated = vi.fn();
      const tool = recentTool(
        source,
        contents.map((content, index) => storedFact(`m${index}`, content)),
        { onDiagnostics, onTruncated }
      );

      await tool.executor!({ query: "recent facts", sort: "recent", limit: 2 });

      expect(onDiagnostics).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          admittedCount: count,
          emptyReason: count ? "" : "vault-empty",
          truncated: false,
          truncatedByBudget: false,
        })
      );
      expect(onTruncated).not.toHaveBeenCalled();
    });

    it("finds an extra readable fact after encrypted and missing rows", async () => {
      const onDiagnostics = vi.fn();
      const onTruncated = vi.fn();
      const tool = recentTool(
        source,
        ["tea", "coffee", locked, "missing", locked, "books"].map((content, index) =>
          storedFact(`m${index}`, content)
        ),
        { onDiagnostics, onTruncated },
        ["m3"]
      );

      const output = await tool.executor!({ query: "recent facts", sort: "recent", limit: 2 });

      expect(output).toContain("Found 2 relevant memories");
      expect(output).not.toContain("id: m5");
      expect(onDiagnostics).toHaveBeenCalledWith(expect.objectContaining({ truncated: true }));
      expect(onTruncated).toHaveBeenCalledTimes(1);
    });

    it("does not report a cut for a missing extra fact", async () => {
      const onDiagnostics = vi.fn();
      const onTruncated = vi.fn();
      const tool = recentTool(
        source,
        [storedFact("m1", "tea"), storedFact("m2", "coffee"), storedFact("m3", "books")],
        { onDiagnostics, onTruncated },
        ["m3"]
      );

      await tool.executor!({ query: "recent facts", sort: "recent", limit: 2 });

      expect(onDiagnostics).toHaveBeenCalledWith(expect.objectContaining({ truncated: false }));
      expect(onTruncated).not.toHaveBeenCalled();
    });

    it("reports the budget and result cuts with one truncation callback", async () => {
      const onDiagnostics = vi.fn();
      const onTruncated = vi.fn();
      const rows = Array.from({ length: 41 }, (_, index) => storedFact(`m${index}`, "tea"));
      const tool = recentTool(source, rows, { onDiagnostics, onTruncated });

      const output = await tool.executor!({ query: "recent facts", sort: "recent", limit: 50 });

      expect(output).toContain("Found 40 relevant memories");
      expect(output).not.toContain("id: m40");
      expect(onDiagnostics).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ admittedCount: 40, truncated: true, truncatedByBudget: true })
      );
      expect(onTruncated).toHaveBeenCalledExactlyOnceWith({
        requestedLimit: 50,
        effectiveLimit: 40,
        truncatedByBudget: true,
      });
    });
  });

  it("reports an empty reason and a search error to the host", async () => {
    const onDiagnostics = vi.fn();
    const onError = vi.fn();
    const failure = new Error("storage unavailable");
    vi.mocked(recall)
      .mockImplementationOnce((_query, _ctx, options) => {
        options?.onDiagnostics?.(diagnostics({ emptyReason: "vault-empty" }));
        return Promise.resolve(recallResult([]));
      })
      .mockRejectedValueOnce(failure);
    const tool = createRecallTool(ctx, undefined, { onDiagnostics, onError });
    expect(await tool.executor!({ query: "tea" })).toContain("No relevant");
    expect(onDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ emptyReason: "vault-empty" })
    );
    await expect(tool.executor!({ query: "coffee" })).rejects.toThrow("storage unavailable");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ cause: failure }));
  });

  it("preserves the diagnostics and reports a result limit cut", async () => {
    const event = diagnostics({
      candidateCount: 2,
      emptyReason: "no-candidates",
      truncated: true,
    });
    vi.mocked(recall).mockImplementationOnce((_query, _ctx, options) => {
      options?.onDiagnostics?.(event);
      return Promise.resolve(recallResult([]));
    });
    const onDiagnostics = vi.fn();
    const onTruncated = vi.fn();
    const tool = createRecallTool(ctx, undefined, { onDiagnostics, onTruncated });
    expect(await tool.executor!({ query: "tea" })).toBe("No relevant memories found.");
    expect(onDiagnostics).toHaveBeenCalledExactlyOnceWith({
      ...event,
      truncatedByBudget: false,
    });
    expect(onTruncated).toHaveBeenCalledExactlyOnceWith({
      requestedLimit: 8,
      effectiveLimit: 8,
      truncatedByBudget: false,
    });
  });
});
