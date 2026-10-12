import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getVaultMemoriesByIdsOp,
  getVaultRankingProjectionsOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import { recall } from "./recall";
import { createRecallTool } from "./recallTool";
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
        emptyReason: "no-candidates",
        truncatedByBudget: false,
      })
    );
    expect(recall).not.toHaveBeenCalled();
    expect(getVaultMemoriesByIdsOp).not.toHaveBeenCalled();
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
