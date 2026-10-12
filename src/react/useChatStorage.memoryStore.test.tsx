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

  it("routes the vault CRUD helpers and search through the store", async () => {
    const store = fakeStore();
    const { result } = renderHook(() =>
      useChatStorage({ database: db, getToken: async () => "tok", memoryStore: store })
    );
    await act(async () => {
      await result.current.createVaultMemory("Likes tea", "private");
      await result.current.updateVaultMemory("m1", "Likes green tea");
      expect((await result.current.searchVaultMemories("tea")).map((r) => r.uniqueId)).toEqual([
        "m2",
      ]);
    });
    expect(store.create).toHaveBeenCalledWith({ content: "Likes tea", scope: "private" });
    expect(store.update).toHaveBeenCalledWith("m1", {
      content: "Likes green tea",
      scope: undefined,
    });
  });

  it("works without getToken, skipping conversation chunks", async () => {
    const store = fakeStore();
    const { result } = renderHook(() => useChatStorage({ database: db, memoryStore: store }));
    await act(async () => {
      await result.current.retainVaultMemory({ content: "Likes tea", scope: "private" });
      await result.current.recall("tea", { types: ["fact", "chunk"] });
    });

    expect(store.retain).toHaveBeenCalled();
    const [, ctx] = vi.mocked(recallBase).mock.calls[0];
    expect(ctx.factSource).toBe(store.factSource);
    expect(ctx.storageCtx).toBeUndefined();
    expect(() => result.current.createRecallTool()).not.toThrow();
    expect(() => result.current.createMemoryVaultSearchTool()).not.toThrow();
    expect((await result.current.searchVaultMemories("tea")).map((r) => r.uniqueId)).toEqual([
      "m2",
    ]);
  });

  it("refuses an unmasked store while piiRedaction is on, and uses a masked one", async () => {
    const unmasked = fakeStore();
    const { result } = renderHook(() =>
      useChatStorage({ database: db, memoryStore: unmasked, piiRedaction: true })
    );

    await expect(
      result.current.retainVaultMemory({ content: "Mail ann@example.com", scope: "private" })
    ).rejects.toThrow(/maskInput/);
    await expect(result.current.createVaultMemory("Mail ann@example.com")).rejects.toThrow(
      /maskInput/
    );
    await expect(result.current.updateVaultMemory("m1", "Mail ann@example.com")).rejects.toThrow(
      /maskInput/
    );
    await expect(result.current.searchVaultMemories("ann@example.com")).rejects.toThrow(
      /maskInput/
    );
    await expect(result.current.recall("ann@example.com")).rejects.toThrow(/maskInput/);
    expect(() => result.current.createRecallTool()).toThrow(/maskInput/);
    expect(() => result.current.createMemoryVaultSearchTool()).toThrow(/maskInput/);
    expect(() => result.current.createMemoryVaultTool()).toThrow(/maskInput/);
    expect(unmasked.retain).not.toHaveBeenCalled();
    expect(unmasked.create).not.toHaveBeenCalled();
    expect(unmasked.update).not.toHaveBeenCalled();
    expect(unmasked.factSource.search).not.toHaveBeenCalled();

    const masked = { ...fakeStore(), masksEmbeddingInput: true } as MemoryStore;
    const { result: maskedResult } = renderHook(() =>
      useChatStorage({ database: db, memoryStore: masked, piiRedaction: true })
    );
    await act(async () => {
      await maskedResult.current.retainVaultMemory({ content: "Likes tea", scope: "private" });
      await maskedResult.current.createVaultMemory("Likes tea");
      await maskedResult.current.searchVaultMemories("tea");
    });
    expect(masked.retain).toHaveBeenCalled();
    expect(masked.create).toHaveBeenCalled();
    expect(() => maskedResult.current.createRecallTool()).not.toThrow();
    expect(() => maskedResult.current.createMemoryVaultTool()).not.toThrow();
  });
});
