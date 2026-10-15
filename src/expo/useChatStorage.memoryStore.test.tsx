// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { createVaultMemoryOp } from "../lib/db/memoryVault";
import type { VaultMemory } from "../lib/db/memoryVault/models";

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

  it("keeps the local vault available when memoryStore is undefined", async () => {
    const local = await createVaultMemoryOp(
      { database: db, vaultMemoryCollection: db.get<VaultMemory>("memory_vault") },
      { content: "Legacy local memory" }
    );
    const { result } = renderHook(() => useChatStorage({ database: db }));
    expect(await result.current.getVaultMemories()).toMatchObject([
      { uniqueId: local.uniqueId, content: "Legacy local memory" },
    ]);
    expect(await result.current.deleteVaultMemory(local.uniqueId)).toBe(true);
  });

  it("fails closed for null without reading or writing the local vault", async () => {
    const local = await createVaultMemoryOp(
      { database: db, vaultMemoryCollection: db.get<VaultMemory>("memory_vault") },
      { content: "Legacy local memory" }
    );
    const { result } = renderHook(() =>
      useChatStorage({
        database: db,
        memoryStore: null,
        getToken: async () => "tok",
        piiRedaction: true,
        enableQueue: false,
      })
    );
    expect(await result.current.getVaultMemories()).toEqual([]);
    expect(await result.current.recall("legacy", { budget: "high" })).toEqual({
      memories: [],
      usedBudget: "high",
      reranked: false,
      candidateCount: 0,
    });
    await expect(result.current.deleteVaultMemory(local.uniqueId)).rejects.toThrow(
      "Memory store is not ready"
    );
    await expect(
      result.current.retainVaultMemory({ content: "New memory", scope: "private" })
    ).rejects.toThrow("Memory store is not ready");
    expect(() => result.current.createRecallTool()).toThrow("Memory store is not ready");
    expect(() => result.current.createMemoryVaultTool()).toThrow("Memory store is not ready");
    expect(() => result.current.createMemoryEngineTool()).not.toThrow();
    expect(recallBase).not.toHaveBeenCalled();
    expect(await db.get<VaultMemory>("memory_vault").query().fetchCount()).toBe(1);

    await act(async () => {
      const conversation = await result.current.createConversation({ title: "Still usable" });
      expect(await result.current.getConversation(conversation.conversationId)).toMatchObject({
        title: "Still usable",
      });
    });
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
  });

  it("refuses an unmasked store while piiRedaction is on, and uses a masked one", async () => {
    const unmasked = fakeStore();
    const { result } = renderHook(() =>
      useChatStorage({ database: db, memoryStore: unmasked, piiRedaction: true })
    );

    await expect(
      result.current.retainVaultMemory({ content: "Mail ann@example.com", scope: "private" })
    ).rejects.toThrow(/maskInput/);
    await expect(result.current.recall("ann@example.com")).rejects.toThrow(/maskInput/);
    expect(() => result.current.createRecallTool()).toThrow(/maskInput/);
    expect(() => result.current.createMemoryVaultTool()).toThrow(/maskInput/);
    expect(unmasked.retain).not.toHaveBeenCalled();

    const masked = { ...fakeStore(), masksEmbeddingInput: true } as MemoryStore;
    const { result: maskedResult } = renderHook(() =>
      useChatStorage({ database: db, memoryStore: masked, piiRedaction: true })
    );
    await act(async () => {
      await maskedResult.current.retainVaultMemory({ content: "Likes tea", scope: "private" });
    });
    expect(masked.retain).toHaveBeenCalled();
    expect(() => maskedResult.current.createRecallTool()).not.toThrow();
    expect(() => maskedResult.current.createMemoryVaultTool()).not.toThrow();
  });
});
