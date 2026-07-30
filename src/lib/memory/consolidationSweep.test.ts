/**
 * Consolidation sweeper (Fix C) unit tests. The vault ops, the decide model
 * (`consolidateMemory`), the embedder (`eagerEmbedContent`) and the logger are
 * mocked (retain.test.ts pattern) — the cosine clustering and the junk gate run
 * for real, so a cluster is formed by genuine vector geometry.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/memoryVault/operations", () => ({
  getConsolidationScanRawOp: vi.fn(),
  getUnembeddedVaultMemoryIdsOp: vi.fn(),
  getVaultMemoriesByIdsOp: vi.fn(),
  getVaultMemoryOp: vi.fn(),
  deleteVaultMemoryOp: vi.fn(),
  updateVaultMemoryOp: vi.fn(),
  supersedeVaultMemoryOp: vi.fn(),
}));

vi.mock("../memoryVault/searchTool", () => ({
  eagerEmbedContent: vi.fn(),
}));

vi.mock("./consolidate", () => ({
  consolidateMemory: vi.fn(),
}));

const warn = vi.fn();
vi.mock("../logger", () => ({
  getLogger: () => ({ warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import {
  type ConsolidationScanRaw,
  deleteVaultMemoryOp,
  getConsolidationScanRawOp,
  getUnembeddedVaultMemoryIdsOp,
  getVaultMemoriesByIdsOp,
  getVaultMemoryOp,
  supersedeVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { eagerEmbedContent } from "../memoryVault/searchTool";
import { consolidateMemory } from "./consolidate";
import { createConsolidationSweeper } from "./consolidationSweep";
import type { CreateConsolidationSweeperOptions } from "./types";

const vaultCtx = {} as VaultMemoryOperationsContext;
const embeddingOptions = {} as EmbeddingOptions;
const consolidateOptions = { apiKey: "k" };

function scanRow(
  uniqueId: string,
  vec: number[],
  extra: Partial<ConsolidationScanRaw> = {}
): ConsolidationScanRaw {
  return {
    uniqueId,
    embedding: JSON.stringify(vec),
    embeddingModel: "m1",
    scope: "private",
    folderId: null,
    updatedAt: 1000,
    proofCount: 1,
    ...extra,
  };
}

function stored(
  uniqueId: string,
  content: string,
  extra: Partial<StoredVaultMemory> = {}
): StoredVaultMemory {
  return {
    uniqueId,
    content,
    proofCount: 1,
    updatedAt: new Date(1000),
    ...extra,
  } as StoredVaultMemory;
}

/** Back both bulk-fetch + single-fetch mocks with one in-memory store. */
function setStore(rows: StoredVaultMemory[]): void {
  const map = new Map(rows.map((r) => [r.uniqueId, r]));
  vi.mocked(getVaultMemoriesByIdsOp).mockImplementation(async (_ctx, ids: string[]) =>
    ids.map((id) => map.get(id)).filter((r): r is StoredVaultMemory => Boolean(r))
  );
  vi.mocked(getVaultMemoryOp).mockImplementation(async (_ctx, id: string) => map.get(id) ?? null);
}

function makeSweeper(overrides: Partial<CreateConsolidationSweeperOptions> = {}) {
  return createConsolidationSweeper({
    vaultCtx,
    embeddingOptions,
    vaultCache: new Map(),
    consolidateOptions,
    // These tests exercise the APPLY path by default. The sweeper's own default
    // is now dryRun:true (log-only) — covered by the dedicated "defaults to
    // dryRun" test below — so opt into applying here.
    dryRun: false,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  warn.mockClear();
  vi.mocked(getUnembeddedVaultMemoryIdsOp).mockResolvedValue([]);
  vi.mocked(getConsolidationScanRawOp).mockResolvedValue([]);
  vi.mocked(getVaultMemoriesByIdsOp).mockResolvedValue([]);
  vi.mocked(getVaultMemoryOp).mockResolvedValue(null);
  vi.mocked(deleteVaultMemoryOp).mockResolvedValue(true);
  vi.mocked(updateVaultMemoryOp).mockResolvedValue(stored("s", "merged"));
  vi.mocked(supersedeVaultMemoryOp).mockResolvedValue(true);
  vi.mocked(eagerEmbedContent).mockResolvedValue(undefined);
  // Default decide-model verdict: retire every candidate under the survivor.
  vi.mocked(consolidateMemory).mockImplementation(
    async (_new: string, cands: Array<{ id: string }>) => ({
      action: "supersede" as const,
      targetIds: cands.map((c) => c.id),
      content: "MERGED",
    })
  );
});

describe("createConsolidationSweeper — dedup", () => {
  it("clusters two near-duplicate rows and supersedes the stale one under the survivor", async () => {
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([
      scanRow("a", [1, 0, 0]),
      scanRow("b", [0.95, 0.05, 0]), // cosine ~0.998 with a → same cluster
      scanRow("c", [0, 0, 1]), // cosine 0 with both → distinct
    ]);
    setStore([
      stored("a", "Prefers light mode for their interface."), // longer → survivor
      stored("b", "Prefers light mode."),
      stored("c", "Allergic to peanuts."),
    ]);

    const result = await makeSweeper().sweep();

    expect(result.clustersFound).toBe(1);
    expect(result.superseded).toBe(1);
    // The shorter paraphrase 'b' is retired under the richer survivor 'a'.
    expect(supersedeVaultMemoryOp).toHaveBeenCalledWith(vaultCtx, "b", "a");
    // Survivor rewritten to the merged content + re-embedded.
    expect(updateVaultMemoryOp).toHaveBeenCalledWith(vaultCtx, "a", { content: "MERGED" });
    expect(eagerEmbedContent).toHaveBeenCalledWith(
      "MERGED",
      embeddingOptions,
      expect.any(Map),
      vaultCtx,
      "a"
    );
  });

  it("leaves distinct facts alone (no cluster, decide model never called)", async () => {
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([
      scanRow("a", [1, 0, 0]),
      scanRow("b", [0, 1, 0]), // cosine 0 → not a duplicate
    ]);
    setStore([stored("a", "Lives in Portland."), stored("b", "Works at Google.")]);

    const result = await makeSweeper().sweep();

    expect(result.clustersFound).toBe(0);
    expect(result.superseded).toBe(0);
    expect(consolidateMemory).not.toHaveBeenCalled();
    expect(supersedeVaultMemoryOp).not.toHaveBeenCalled();
  });

  it("skips dedup entirely when consolidateOptions is absent (no plaintext egress)", async () => {
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([
      scanRow("a", [1, 0, 0]),
      scanRow("b", [0.95, 0.05, 0]),
    ]);
    setStore([stored("a", "Prefers dark mode."), stored("b", "Prefers dark mode overall.")]);

    const result = await makeSweeper({ consolidateOptions: undefined }).sweep();

    expect(consolidateMemory).not.toHaveBeenCalled();
    expect(supersedeVaultMemoryOp).not.toHaveBeenCalled();
    expect(result.superseded).toBe(0);
    // Junk purge still ran (decrypted the rows), so the scan was processed.
    expect(result.scanned).toBe(2);
  });

  it("retries a cluster whose consolidate threw on the next sweep (not memoized on failure)", async () => {
    // A stable cluster that THROWS (portal blip) must not be memoized, or a
    // one-off outage would permanently skip a real duplicate.
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([
      scanRow("a", [1, 0, 0]),
      scanRow("b", [0.95, 0.05, 0]),
    ]);
    setStore([
      stored("a", "Prefers light mode for their interface."),
      stored("b", "Prefers light mode."),
    ]);

    const sweeper = makeSweeper();

    // First sweep: consolidate throws → error reported, cluster NOT memoized.
    vi.mocked(consolidateMemory).mockRejectedValueOnce(new Error("portal blip"));
    await sweeper.sweep();
    expect(consolidateMemory).toHaveBeenCalledTimes(1);
    expect(supersedeVaultMemoryOp).not.toHaveBeenCalled();

    // Second sweep: same stable cluster is retried (it was not memoized) and now
    // the default supersede verdict applies.
    await sweeper.sweep();
    expect(consolidateMemory).toHaveBeenCalledTimes(2);
    expect(supersedeVaultMemoryOp).toHaveBeenCalledWith(vaultCtx, "b", "a");
  });

  it("maps a noop decision's targetId to a retire under the survivor (no survivor rewrite)", async () => {
    // consolidateMemory 'noop' names an existing duplicate (targetId) without
    // merged content — staleIdsFromDecision must map it to a retire of that row
    // under the survivor, and the survivor content must NOT be rewritten.
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([
      scanRow("a", [1, 0, 0]),
      scanRow("b", [0.95, 0.05, 0]),
    ]);
    setStore([
      stored("a", "Prefers light mode for their interface."), // longer → survivor
      stored("b", "Prefers light mode."),
    ]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "noop", targetId: "b" });

    const result = await makeSweeper().sweep();

    expect(result.superseded).toBe(1);
    expect(supersedeVaultMemoryOp).toHaveBeenCalledWith(vaultCtx, "b", "a");
    // noop carries no merged content → the survivor row is left untouched.
    expect(updateVaultMemoryOp).not.toHaveBeenCalled();
  });

  it("does NOT let already-processed clusters starve fresh ones out of the cap", async () => {
    // Regression: the per-sweep cap used to be applied BEFORE already-processed
    // clusters were skipped, so a standing backlog of stable (already-sent)
    // clusters consumed every sweep's slots and fresh duplicate clusters were
    // deferred forever. The skip must happen FIRST so the cap is spent only on
    // clusters that still need a decide-model call.
    const p = [scanRow("p1", [1, 0, 0, 0, 0, 0]), scanRow("p2", [0.95, 0.05, 0, 0, 0, 0])];
    const pStore = [
      stored("p1", "Prefers light mode for their whole interface."),
      stored("p2", "Prefers light mode."),
    ];

    // cap = 2 throughout. Sweep 1 sees ONLY cluster P (1 ≤ 2) → processed + memoized.
    const sweeper = makeSweeper({ maxClustersPerSweep: 2 });
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue(p);
    setStore(pStore);
    await sweeper.sweep();
    expect(supersedeVaultMemoryOp).toHaveBeenCalledWith(vaultCtx, "p2", "p1");

    // Sweep 2: P is now already-processed + two FRESH clusters F1, F2 appear.
    // 1 processed + 2 fresh, cap = 2. Buggy order (cap then skip) would process
    // only ONE fresh cluster and report a drop; correct order (skip then cap)
    // processes BOTH fresh clusters and drops none.
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([
      ...p,
      scanRow("f1a", [0, 1, 0, 0, 0, 0]),
      scanRow("f1b", [0, 0.95, 0.05, 0, 0, 0]),
      scanRow("f2a", [0, 0, 1, 0, 0, 0]),
      scanRow("f2b", [0, 0, 0.95, 0.05, 0, 0]),
    ]);
    setStore([
      ...pStore,
      stored("f1a", "Enjoys hiking in the mountains every weekend."),
      stored("f1b", "Enjoys hiking."),
      stored("f2a", "Works as a software engineer at a startup."),
      stored("f2b", "Works as an engineer."),
    ]);

    const result = await sweeper.sweep();

    expect(result.clustersFound).toBe(3);
    // Both fresh clusters healed; the already-processed one consumed no slot.
    expect(result.clustersDropped).toBe(0);
    expect(supersedeVaultMemoryOp).toHaveBeenCalledWith(vaultCtx, "f1b", "f1a");
    expect(supersedeVaultMemoryOp).toHaveBeenCalledWith(vaultCtx, "f2b", "f2a");
  });

  it("caps clusters per sweep and reports the dropped count (no silent truncation)", async () => {
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([
      scanRow("a1", [1, 0, 0, 0]),
      scanRow("a2", [0.95, 0.05, 0, 0]),
      scanRow("b1", [0, 1, 0, 0]),
      scanRow("b2", [0.05, 0.95, 0, 0]),
      scanRow("c1", [0, 0, 1, 0]),
      scanRow("c2", [0, 0, 0.95, 0.05]),
    ]);
    setStore([
      stored("a1", "Fact A one."),
      stored("a2", "Fact A two."),
      stored("b1", "Fact B one."),
      stored("b2", "Fact B two."),
      stored("c1", "Fact C one."),
      stored("c2", "Fact C two."),
    ]);

    const result = await makeSweeper({ maxClustersPerSweep: 1 }).sweep();

    expect(result.clustersFound).toBe(3);
    expect(result.clustersDropped).toBe(2);
    // Only the one uncapped cluster reached the decide model.
    expect(consolidateMemory).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("cluster cap"));
  });
});

describe("createConsolidationSweeper — junk purge + backfill", () => {
  it("soft-deletes content-free junk rows", async () => {
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([
      scanRow("junk", [1, 0, 0]),
      scanRow("ok", [0, 1, 0]),
    ]);
    setStore([stored("junk", "1"), stored("ok", "Enjoys hiking on weekends.")]);

    const result = await makeSweeper().sweep();

    expect(result.junkDeleted).toBe(1);
    expect(deleteVaultMemoryOp).toHaveBeenCalledWith(vaultCtx, "junk");
    expect(deleteVaultMemoryOp).not.toHaveBeenCalledWith(vaultCtx, "ok");
  });

  it("backfills embeddings for un-embedded rows", async () => {
    vi.mocked(getUnembeddedVaultMemoryIdsOp).mockResolvedValue(["x"]);
    setStore([stored("x", "Recently adopted a dog named Biscuit.")]);

    const result = await makeSweeper().sweep();

    expect(result.embeddedBackfilled).toBe(1);
    expect(eagerEmbedContent).toHaveBeenCalledWith(
      "Recently adopted a dog named Biscuit.",
      embeddingOptions,
      expect.any(Map),
      vaultCtx,
      "x"
    );
  });
});

describe("createConsolidationSweeper — dryRun", () => {
  it("DEFAULTS to dryRun (log-only) when not specified — applies nothing", async () => {
    // Safety default: a caller that does not pass dryRun must NOT mutate the vault.
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([
      scanRow("a", [1, 0, 0]),
      scanRow("b", [0.95, 0.05, 0]),
      scanRow("junk", [0, 0, 1]),
    ]);
    setStore([
      stored("a", "Prefers light mode for their interface."),
      stored("b", "Prefers light mode."),
      stored("junk", "2"),
    ]);

    // Build the sweeper directly (NOT via makeSweeper, which forces dryRun:false).
    const sweeper = createConsolidationSweeper({
      vaultCtx,
      embeddingOptions,
      vaultCache: new Map(),
      consolidateOptions,
    });
    const result = await sweeper.sweep();

    expect(result.dryRun).toBe(true);
    expect(result.junkDeleted).toBe(1);
    expect(result.superseded).toBe(1);
    expect(deleteVaultMemoryOp).not.toHaveBeenCalled();
    expect(supersedeVaultMemoryOp).not.toHaveBeenCalled();
    expect(updateVaultMemoryOp).not.toHaveBeenCalled();
  });

  it("computes counts but applies nothing", async () => {
    vi.mocked(getUnembeddedVaultMemoryIdsOp).mockResolvedValue(["x"]);
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([
      scanRow("a", [1, 0, 0]),
      scanRow("b", [0.95, 0.05, 0]),
      scanRow("junk", [0, 0, 1]),
    ]);
    setStore([
      stored("x", "A brand new memory to embed."),
      stored("a", "Prefers light mode for their interface."),
      stored("b", "Prefers light mode."),
      stored("junk", "2"),
    ]);

    const result = await makeSweeper({ dryRun: true }).sweep();

    expect(result.dryRun).toBe(true);
    expect(result.embeddedBackfilled).toBe(1);
    expect(result.junkDeleted).toBe(1);
    expect(result.superseded).toBe(1);
    // Nothing was actually mutated.
    expect(deleteVaultMemoryOp).not.toHaveBeenCalled();
    expect(supersedeVaultMemoryOp).not.toHaveBeenCalled();
    expect(updateVaultMemoryOp).not.toHaveBeenCalled();
    expect(eagerEmbedContent).not.toHaveBeenCalled();
  });
});

describe("createConsolidationSweeper — lifecycle", () => {
  it("is a no-op after dispose", async () => {
    vi.mocked(getConsolidationScanRawOp).mockResolvedValue([scanRow("a", [1, 0, 0])]);
    setStore([stored("a", "Some fact.")]);

    const sweeper = makeSweeper();
    sweeper.dispose();
    const result = await sweeper.sweep();

    expect(result.scanned).toBe(0);
    expect(getConsolidationScanRawOp).not.toHaveBeenCalled();
    expect(getUnembeddedVaultMemoryIdsOp).not.toHaveBeenCalled();
  });
});
