// @vitest-environment happy-dom
/**
 * The vault embedding cache the hook exposes used to be `useRef`-owned, so an
 * app with more than one mounted `useChatStorage` paid the full cold warm (a
 * whole-vault read, a decrypt per row, a JSON.parse per persisted vector) once
 * per instance and evicted a deleted memory from only the instance that did the
 * deleting. It is now resolved from a registry keyed by
 * `(database, walletAddress, embeddingModel)`.
 *
 * Sharing is the latency win; the isolation half is the correctness one — the
 * cache carries no wallet or model discriminator inside it, so an instance
 * handed to the wrong identity is silently wrong rather than loudly broken.
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { __resetVaultEmbeddingCacheRegistryForTests } from "../lib/memoryVault/embeddingCacheRegistry";
import { clearAllEncryptionState } from "./useEncryption";
import { useChatStorage } from "./useChatStorage";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `cache-sharing-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

const MODEL = "text-embedding-3-small";
const OTHER_MODEL = "text-embedding-3-large";

describe("useChatStorage vault embedding cache sharing", () => {
  let db: Database;

  beforeEach(() => {
    vi.clearAllMocks();
    // Module-level registry state outlives a test file's modules; reset it so
    // each case starts from an empty registry.
    __resetVaultEmbeddingCacheRegistryForTests();
    db = makeDatabase();
  });

  it("hands two hooks on the same database, wallet and model one cache", () => {
    const { result: a } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_a",
        getToken: async () => "tok",
        walletAddress: "0xAAA",
        embeddingModel: MODEL,
      })
    );
    const { result: b } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_b",
        getToken: async () => "tok",
        walletAddress: "0xAAA",
        embeddingModel: MODEL,
      })
    );

    expect(b.current.vaultEmbeddingCache).toBe(a.current.vaultEmbeddingCache);

    // Shared instance means shared warmth: whichever hook pays for a vector,
    // the others read it — and an eviction through one is an eviction for all.
    a.current.vaultEmbeddingCache.set("mem_1", Float32Array.from([0.1, 0.2]));
    expect(b.current.vaultEmbeddingCache.get("mem_1")).toEqual(Float32Array.from([0.1, 0.2]));
    b.current.vaultEmbeddingCache.delete("mem_1");
    expect(a.current.vaultEmbeddingCache.has("mem_1")).toBe(false);
  });

  it("keeps a different wallet on its own cache", () => {
    const { result: mine } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_a",
        getToken: async () => "tok",
        walletAddress: "0xAAA",
        embeddingModel: MODEL,
      })
    );
    const { result: theirs } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_b",
        getToken: async () => "tok",
        walletAddress: "0xBBB",
        embeddingModel: MODEL,
      })
    );

    expect(theirs.current.vaultEmbeddingCache).not.toBe(mine.current.vaultEmbeddingCache);
  });

  it("keeps a different embedding model on its own cache", () => {
    const { result: small } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_a",
        getToken: async () => "tok",
        walletAddress: "0xAAA",
        embeddingModel: MODEL,
      })
    );
    const { result: large } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_b",
        getToken: async () => "tok",
        walletAddress: "0xAAA",
        embeddingModel: OTHER_MODEL,
      })
    );

    expect(large.current.vaultEmbeddingCache).not.toBe(small.current.vaultEmbeddingCache);
  });

  it("keeps a different database on its own cache", () => {
    const { result: first } = renderHook(() =>
      useChatStorage({ database: db, getToken: async () => "tok", embeddingModel: MODEL })
    );
    const { result: second } = renderHook(() =>
      useChatStorage({
        database: makeDatabase(),
        getToken: async () => "tok",
        embeddingModel: MODEL,
      })
    );

    expect(second.current.vaultEmbeddingCache).not.toBe(first.current.vaultEmbeddingCache);
  });

  it("re-keys to a fresh cache when the wallet prop changes", () => {
    // The `useRef` this replaced initialized once and was reused verbatim
    // across an in-place wallet swap — a switch that skipped
    // `clearAllEncryptionState` kept serving the previous account's vectors.
    const { result, rerender } = renderHook(
      ({ wallet }: { wallet: string }) =>
        useChatStorage({
          database: db,
          conversationId: "conv_a",
          getToken: async () => "tok",
          walletAddress: wallet,
          embeddingModel: MODEL,
        }),
      { initialProps: { wallet: "0xAAA" } }
    );

    const before = result.current.vaultEmbeddingCache;
    before.set("mem_1", Float32Array.from([0.1, 0.2]));

    rerender({ wallet: "0xBBB" });

    expect(result.current.vaultEmbeddingCache).not.toBe(before);
    expect(result.current.vaultEmbeddingCache.has("mem_1")).toBe(false);
  });

  it("still empties the shared cache on encryption-state teardown", async () => {
    const { result: a } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_a",
        getToken: async () => "tok",
        walletAddress: "0xAAA",
        embeddingModel: MODEL,
      })
    );
    const { result: b } = renderHook(() =>
      useChatStorage({
        database: db,
        conversationId: "conv_b",
        getToken: async () => "tok",
        walletAddress: "0xAAA",
        embeddingModel: MODEL,
      })
    );

    const shared = a.current.vaultEmbeddingCache;
    shared.set("mem_1", Float32Array.from([0.1, 0.2]));

    await act(async () => {
      clearAllEncryptionState();
    });

    // Clearing is idempotent across sharers — each mounted hook wipes the same
    // instance — and no hook is left holding a populated one.
    expect(shared.size).toBe(0);
    expect(b.current.vaultEmbeddingCache.size).toBe(0);
  });
});
