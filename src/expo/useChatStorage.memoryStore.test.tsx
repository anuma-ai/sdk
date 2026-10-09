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
      memories: [],
      usedBudget: "low",
      reranked: false,
      candidateCount: 0,
    })),
  };
});

import { recall as recallBase } from "../lib/memory";
import type { MemoryStore } from "../lib/memory/store/types";
import { useChatStorage } from "./useChatStorage";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `memory-store-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function fakeStore() {
  return {
    list: vi.fn(async () => []),
    create: vi.fn(async () => ({ uniqueId: "m1" })),
    update: vi.fn(async () => ({ uniqueId: "m1" })),
    delete: vi.fn(async () => true),
    retain: vi.fn(async () => ({ action: "create", memoryId: "m1", proofCount: 1 })),
    factSource: {
      search: vi.fn(async () => ({ results: [{ uniqueId: "m2" }], vaultSize: 1 })),
      graphRanking: vi.fn(async () => []),
      temporalRanking: vi.fn(async () => []),
    },
  } as unknown as MemoryStore;
}

describe("useChatStorage with a memoryStore", () => {
  let db: Database;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDatabase();
  });

  it("recalls facts through the store's fact source alongside conversation chunks", async () => {
    const store = fakeStore();
    const { result } = renderHook(() =>
      useChatStorage({ database: db, getToken: async () => "tok", memoryStore: store })
    );
    await act(async () => {
      await result.current.recall("where do I live?", { types: ["fact", "chunk"] });
    });

    const [, ctx] = vi.mocked(recallBase).mock.calls[0];
    expect(ctx.factSource).toBe(store.factSource);
    expect(ctx.vaultCtx).toBeUndefined();
    expect(ctx.storageCtx).toBeDefined();
    await expect(result.current.recall("x", { folderId: "f1" })).rejects.toThrow(/Folders/);
  });

  it("lists, deletes and retains through the store", async () => {
    const store = fakeStore();
    const { result } = renderHook(() =>
      useChatStorage({ database: db, getToken: async () => "tok", memoryStore: store })
    );
    await act(async () => {
      await result.current.getVaultMemories({ scopes: ["shared"] });
      await result.current.deleteVaultMemory("m1");
      await result.current.retainVaultMemory({ content: "Likes tea", scope: "private" });
    });

    expect(store.list).toHaveBeenCalledWith({ scopes: ["shared"] });
    expect(store.delete).toHaveBeenCalledWith("m1");
    expect(store.retain).toHaveBeenCalledWith("Likes tea", { source: "manual", scope: "private" });
    expect(() => result.current.getVaultMemories({ folderId: "f1" })).toThrow(/Folders/);
  });
});
