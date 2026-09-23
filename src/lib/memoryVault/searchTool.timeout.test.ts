/**
 * A hung embeddings endpoint degrades recall; it does not hang it.
 *
 * End to end over the REAL embedding client (only `fetch` is faked, and it never
 * answers): the query embed hits its per-attempt deadline, the vault search's
 * degrade path turns the rejection into a BM25-only search, and recall reports
 * `embeddings-unavailable` — instead of the turn waiting forever on a promise
 * that never settles.
 *
 * Fake timers go in BEFORE the call under test so every deadline and backoff it
 * schedules is advanceable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/chat/operations", () => ({ searchChunksOp: vi.fn() }));

vi.mock("../db/memoryVault/operations", () => ({
  getAllVaultMemoriesOp: vi.fn(),
  updateVaultMemoryEmbeddingOp: vi.fn().mockResolvedValue(undefined),
  getVaultCandidateKeysOp: vi.fn(),
  getVaultEmbeddingsByIdsOp: vi.fn(),
  getVaultMemoriesByIdsOp: vi.fn(),
  getMemoriesByEventTimeOp: vi.fn().mockResolvedValue([]),
  countActiveVaultMemoriesOp: vi.fn().mockResolvedValue(1),
  getActiveVaultMemoryIdsOp: vi.fn(),
}));

import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import { getAllVaultMemoriesOp } from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import { recall } from "../memory/recall";
import type { RecallDiagnostics } from "../memory/types";
import { createVaultEmbeddingCache } from "./lruCache";
import { searchVaultMemoriesWithSize } from "./searchTool";

const vaultCtx = {} as VaultMemoryOperationsContext;
const embeddingOptions = { apiKey: "k", baseUrl: "https://portal.test", timeoutMs: 1000 };

function makeMemory(id: string, content: string): StoredVaultMemory {
  return {
    uniqueId: id,
    content,
    scope: "private",
    folderId: null,
    userId: null,
    embedding: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  } as StoredVaultMemory;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => {}))
  );
  vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
    makeMemory("m1", "allergic to shellfish"),
    makeMemory("m2", "likes hiking"),
  ]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("hung embeddings endpoint", () => {
  it("vault search degrades to BM25 and says so", async () => {
    let done: Awaited<ReturnType<typeof searchVaultMemoriesWithSize>> | undefined;
    void searchVaultMemoriesWithSize(
      "shellfish",
      vaultCtx,
      embeddingOptions,
      createVaultEmbeddingCache()
    ).then((r) => (done = r));

    await vi.advanceTimersByTimeAsync(30_000);

    expect(done).toBeDefined();
    expect(done!.embeddingsUnavailable).toBe(true);
    expect(done!.results.map((r) => r.uniqueId)).toEqual(["m1"]);
  });

  it("recall returns the lexical hit and reports embeddings-unavailable", async () => {
    const seen: RecallDiagnostics[] = [];
    let done: Awaited<ReturnType<typeof recall>> | undefined;
    void recall(
      "shellfish",
      { vaultCtx, embeddingOptions, vaultCache: createVaultEmbeddingCache() },
      { onDiagnostics: (d) => seen.push(d) }
    ).then((r) => (done = r));

    await vi.advanceTimersByTimeAsync(30_000);

    expect(done?.memories.map((m) => m.id)).toEqual(["m1"]);
    expect(seen[0]?.degraded).toContain("embeddings-unavailable");
  });

  // The per-attempt deadline alone still lets an outage cost ~4 x 15s + backoff.
  // recall() puts ONE budget (default 8s) on the query embed so a chat turn
  // degrades within it.
  it("recall degrades within the default 8s query-embed budget at the default per-attempt timeout", async () => {
    const seen: RecallDiagnostics[] = [];
    let done: Awaited<ReturnType<typeof recall>> | undefined;
    void recall(
      "shellfish",
      {
        vaultCtx,
        embeddingOptions: { apiKey: "k", baseUrl: "https://portal.test" },
        vaultCache: createVaultEmbeddingCache(),
      },
      { onDiagnostics: (d) => seen.push(d) }
    ).then((r) => (done = r));

    await vi.advanceTimersByTimeAsync(8_000);

    expect(done?.memories.map((m) => m.id)).toEqual(["m1"]);
    expect(seen[0]?.degraded).toContain("embeddings-unavailable");
  });

  it("leaves a direct vault search without a budget on the per-attempt deadlines", async () => {
    let done = false;
    void searchVaultMemoriesWithSize(
      "shellfish",
      vaultCtx,
      { apiKey: "k", baseUrl: "https://portal.test" },
      createVaultEmbeddingCache()
    ).then(() => (done = true));

    await vi.advanceTimersByTimeAsync(8_000);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(done).toBe(true);
  });
});
