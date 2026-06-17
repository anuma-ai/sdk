// @vitest-environment happy-dom
/**
 * Expo parity coverage for the bound `recall` exposed by useChatStorage.
 * Mirrors the react suite: recall routes through the unified recall() pipeline
 * with a shared cache, defaults excludeConversationId to the active
 * conversation (matching createRecallTool), and degrades to an empty result
 * when auth is unavailable.
 */

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
    dbName: `expo-recall-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

describe("expo useChatStorage bound recall", () => {
  let db: Database;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDatabase();
  });

  it("routes through recall() with a cache and defaults excludeConversationId to the active conversation", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_expo",
        getToken: async () => "tok",
      })
    );

    await act(async () => {
      await result.current.recall("where do I live?", { types: ["fact", "chunk"], budget: "low" });
    });

    expect(mockRecall).toHaveBeenCalledTimes(1);
    const [query, ctx, options] = mockRecall.mock.calls[0];
    expect(query).toBe("where do I live?");
    expect(ctx.vaultCache).toBeDefined();
    expect(ctx.vaultCtx).toBeDefined();
    expect(options?.excludeConversationId).toBe("conv_expo");
  });

  it("returns an empty result (no throw, no recall() call) when auth is unavailable", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_expo_noauth",
      })
    );

    let res: Awaited<ReturnType<typeof result.current.recall>>;
    await act(async () => {
      res = await result.current.recall("anything");
    });

    expect(mockRecall).not.toHaveBeenCalled();
    expect(res!.memories).toEqual([]);
    expect(res!.candidateCount).toBe(0);
  });
});
