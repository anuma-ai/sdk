// @vitest-environment happy-dom
/**
 * Expo parity for the vault embedding cache registry.
 *
 * This hook is the reason the registry exists: the Expo client mounts a
 * `useChatStorage` per active conversation on top of its recall-owning one, so
 * a per-instance cache meant N cold caches and is why the Expo hook never
 * warmed at all. Unlike the React hook it doesn't return the cache, so identity
 * is observed where it actually matters — the ctx handed to `recall()`.
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { __resetVaultEmbeddingCacheRegistryForTests } from "../lib/memoryVault/embeddingCacheRegistry";

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
import { useChatStorage } from "./useChatStorage";

const mockRecall = vi.mocked(recallBase);

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `expo-cache-sharing-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

const MODEL = "text-embedding-3-small";
const OTHER_MODEL = "text-embedding-3-large";

/** Mount a hook, run one recall, and report the vault cache it routed through. */
async function recallVaultCache(props: {
  database: Database;
  conversationId: string;
  walletAddress?: string;
  embeddingModel: string;
}) {
  const { result } = renderHook(() => useChatStorage({ ...props, getToken: async () => "tok" }));
  await act(async () => {
    await result.current.recall("q");
  });
  const call = mockRecall.mock.calls.at(-1)!;
  return call[1].vaultCache;
}

describe("expo useChatStorage vault embedding cache sharing", () => {
  let db: Database;

  beforeEach(() => {
    vi.clearAllMocks();
    __resetVaultEmbeddingCacheRegistryForTests();
    db = makeDatabase();
  });

  it("routes two conversation-scoped hooks through one cache", async () => {
    const first = await recallVaultCache({
      database: db,
      conversationId: "conv_a",
      walletAddress: "0xAAA",
      embeddingModel: MODEL,
    });
    const second = await recallVaultCache({
      database: db,
      conversationId: "conv_b",
      walletAddress: "0xAAA",
      embeddingModel: MODEL,
    });

    expect(second).toBe(first);
  });

  it("keeps a different wallet on its own cache", async () => {
    const mine = await recallVaultCache({
      database: db,
      conversationId: "conv_a",
      walletAddress: "0xAAA",
      embeddingModel: MODEL,
    });
    const theirs = await recallVaultCache({
      database: db,
      conversationId: "conv_b",
      walletAddress: "0xBBB",
      embeddingModel: MODEL,
    });

    expect(theirs).not.toBe(mine);
  });

  it("keeps a different embedding model on its own cache", async () => {
    const small = await recallVaultCache({
      database: db,
      conversationId: "conv_a",
      walletAddress: "0xAAA",
      embeddingModel: MODEL,
    });
    const large = await recallVaultCache({
      database: db,
      conversationId: "conv_b",
      walletAddress: "0xAAA",
      embeddingModel: OTHER_MODEL,
    });

    expect(large).not.toBe(small);
  });
});
