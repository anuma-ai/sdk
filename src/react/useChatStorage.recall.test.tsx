// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

vi.mock("../lib/memory", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/memory")>();
  return {
    ...orig,
    recall: vi.fn(async () => ({
      memories: [{ id: "m1", kind: "fact", content: "hi", score: 1 }],
      usedBudget: "low",
      reranked: false,
      candidateCount: 1,
    })),
  };
});

import { recall as recallBase } from "../lib/memory";
import { useChatStorage } from "./useChatStorage";

const mockRecall = vi.mocked(recallBase);

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `recall-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

describe("useChatStorage bound recall", () => {
  let db: Database;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDatabase();
  });

  it("routes through recall() with the hook's shared embedding cache and forwards options", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_recall",
        getToken: async () => "tok",
      })
    );

    let res: Awaited<ReturnType<typeof result.current.recall>>;
    await act(async () => {
      res = await result.current.recall("where do I live?", {
        types: ["fact"],
        budget: "low",
        limit: 5,
      });
    });

    expect(mockRecall).toHaveBeenCalledTimes(1);
    const [query, ctx, options] = mockRecall.mock.calls[0];
    expect(query).toBe("where do I live?");
    expect(ctx.vaultCache).toBe(result.current.vaultEmbeddingCache);
    expect(ctx.vaultCtx).toBeDefined();
    expect(ctx.embeddingOptions).toBeDefined();
    expect(options).toMatchObject({ types: ["fact"], budget: "low", limit: 5 });
    expect(res!.memories).toHaveLength(1);
  });

  it("defaults excludeConversationId to the active conversation (mirrors createRecallTool)", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_active",
        getToken: async () => "tok",
      })
    );

    await act(async () => {
      await result.current.recall("chunks please", { types: ["fact", "chunk"] });
    });

    const [, , options] = mockRecall.mock.calls[0];
    expect(options?.excludeConversationId).toBe("conv_active");
  });

  it("respects an explicit excludeConversationId override", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_active",
        getToken: async () => "tok",
      })
    );

    await act(async () => {
      await result.current.recall("q", { types: ["chunk"], excludeConversationId: "conv_other" });
    });

    const [, , options] = mockRecall.mock.calls[0];
    expect(options?.excludeConversationId).toBe("conv_other");
  });

  it("masks the query embedding when PII redaction is on", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_recall_pii",
        getToken: async () => "tok",
        piiRedaction: true,
      })
    );

    await act(async () => {
      await result.current.recall("contact me at jane@example.com");
    });

    const [, ctx] = mockRecall.mock.calls[0];
    expect(typeof ctx.embeddingOptions.maskInput).toBe("function");
  });

  it("sets no embedding masker when redaction is off", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_recall_nopii",
        getToken: async () => "tok",
      })
    );

    await act(async () => {
      await result.current.recall("contact me at jane@example.com");
    });

    const [, ctx] = mockRecall.mock.calls[0];
    expect(ctx.embeddingOptions.maskInput).toBeUndefined();
  });

  it("returns an empty result (no throw, no recall() call) when auth is unavailable", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_recall_noauth",
      })
    );

    let res: Awaited<ReturnType<typeof result.current.recall>>;
    await act(async () => {
      res = await result.current.recall("anything", { budget: "mid" });
    });

    expect(mockRecall).not.toHaveBeenCalled();
    expect(res!.memories).toEqual([]);
    expect(res!.candidateCount).toBe(0);
    expect(res!.usedBudget).toBe("mid");
  });
});
