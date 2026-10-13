import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import {
  extractAndLinkEntitiesForMemoriesOp,
  extractEntitiesForMemories,
  type TopicExtractionBatchDiagnostics,
} from "./topicExtract";

vi.mock("../db/entities/operations", () => ({
  replaceMemoryEntitiesGuardedOp: vi.fn((_ctx: unknown, _id: string, entities: unknown[]) =>
    Promise.resolve(entities)
  ),
}));

vi.mock("../db/memoryVault/operations", () => ({
  vaultMemoryToStored: vi.fn((record: { content: string }) =>
    Promise.resolve({ content: record.content })
  ),
  stampTopicsExtractedAtOp: vi.fn((_ctx: unknown, ids: readonly string[]) =>
    Promise.resolve([...ids])
  ),
}));

function topicResponse(id: string): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ memories: [{ id, entities: [] }] }) } }],
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

function makeOpCtx(ids: string[]): VaultMemoryOperationsContext {
  const records = new Map(
    ids.map((id) => [
      id,
      {
        id,
        content: "Works at ZetaChain",
        isDeleted: false,
        userId: null,
        topicsUserManaged: false,
      },
    ])
  );
  return {
    database: { write: vi.fn((cb: () => unknown) => Promise.resolve().then(cb)) },
    vaultMemoryCollection: {
      find: vi.fn((id: string) => {
        const record = records.get(id);
        return record ? Promise.resolve(record) : Promise.reject(new Error("not found"));
      }),
    },
    entityCtx: {},
  } as unknown as VaultMemoryOperationsContext;
}

describe("topic extraction telemetry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports failed attempts before a successful batch and isolates callback errors", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(topicResponse("mem_1"));
    const onBatch = vi.fn((_diagnostics: TopicExtractionBatchDiagnostics) => {
      throw new Error("metrics offline");
    });
    const result = await extractEntitiesForMemories([{ id: "mem_1", content: "tea" }], {
      apiKey: "k",
      fetchFn,
      maxAttempts: 2,
      backoffMs: () => 0,
      onBatch,
    });
    expect(result.get("mem_1")).toEqual([]);
    expect(onBatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ attempts: 2, unansweredCount: 0 })
    );
    expect(onBatch.mock.calls[0][0]).not.toHaveProperty("failure");
  });

  it("reports batch counts, latency, and the HTTP failure for unanswered memories", async () => {
    const ids = Array.from({ length: 11 }, (_, i) => String(i));
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(topicResponse("10"));
    const onBatch = vi.fn<(diagnostics: TopicExtractionBatchDiagnostics) => void>();
    const result = await extractAndLinkEntitiesForMemoriesOp(makeOpCtx(ids), ids, {
      apiKey: "k",
      fetchFn,
      maxAttempts: 1,
      onBatch,
    });
    expect(result.batchCount).toBe(2);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(onBatch).toHaveBeenCalledTimes(2);
    expect(result.batches[0]).toMatchObject({
      attempts: 1,
      unansweredCount: 10,
      failure: { reason: "http-retryable", httpStatus: 503, attempts: 1 },
    });
    expect(result.batches[1]).toMatchObject({ attempts: 1, unansweredCount: 0 });
    expect(result.llmFailures.get("0")).toEqual({
      reason: "http-retryable",
      httpStatus: 503,
      attempts: 1,
    });
    expect(result.llmFailures.has("10")).toBe(false);
    expect(result.stampedIds).toEqual(["10"]);
  });
});
