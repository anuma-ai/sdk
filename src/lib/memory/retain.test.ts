import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/memoryVault/operations", () => ({
  createVaultMemoryOp: vi.fn(),
  createSupersedingMemoryOp: vi.fn(),
  supersedeVaultMemoryOp: vi.fn(),
  getVaultMemoryOp: vi.fn(),
  updateVaultMemoryOp: vi.fn(),
  getAllVaultMemoriesOp: vi.fn(),
}));

vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

vi.mock("../memoryVault/searchTool", () => ({
  prepareVaultCandidates: vi.fn(),
  rankPreparedVaultCandidates: vi.fn(),
}));

vi.mock("./consolidate", () => ({
  consolidateMemory: vi.fn(),
}));

import {
  createSupersedingMemoryOp,
  createVaultMemoryOp,
  getAllVaultMemoriesOp,
  getVaultMemoryOp,
  supersedeVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import { consolidateMemory } from "./consolidate";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants";
import { generateEmbedding } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { prepareVaultCandidates, rankPreparedVaultCandidates } from "../memoryVault/searchTool";

/**
 * retain() now prepares the candidate set ONCE and ranks it per stage, so the
 * mock seam moved from `searchVaultMemories` to
 * `rankPreparedVaultCandidates`. `searchVaultMemories` is the shim these helpers
 * preserve: `mockVaultMatches` stands in for the old
 * `mockResolvedValue([...])`, and `mockVaultMatchesOnce` for
 * `mockResolvedValueOnce([...])`, so each stage still gets its own scripted
 * result in call order.
 */
type VaultMatch = { uniqueId: string; content?: string; similarity?: number };

const PREPARED = {
  memories: [],
  embeddedItems: [],
  queryEmbedding: [0.1, 0.2, 0.3],
  vaultSize: 1,
};

const prepared = (queryEmbedding: number[]) => ({ ...PREPARED, queryEmbedding });

const rankResult = (results: VaultMatch[]) => ({
  results: results as never,
  vaultSize: 1,
  reranked: false,
  hadV2Head: results.length > 0,
});

function mockVaultMatches(results: VaultMatch[], queryEmbedding = [0.1, 0.2, 0.3]) {
  // Keep prepare's query vector aligned with whatever `generateEmbedding` is
  // mocked to return: retain reuses the prepared vector for the create write, and
  // in production they are the same call over the same text. A fixture where they
  // disagree would test a state that cannot occur.
  vi.mocked(prepareVaultCandidates).mockResolvedValue(prepared(queryEmbedding) as never);
  vi.mocked(rankPreparedVaultCandidates).mockResolvedValue(rankResult(results) as never);
}

function mockVaultMatchesOnce(results: VaultMatch[], queryEmbedding = [0.1, 0.2, 0.3]) {
  vi.mocked(prepareVaultCandidates).mockResolvedValue(prepared(queryEmbedding) as never);
  vi.mocked(rankPreparedVaultCandidates).mockResolvedValueOnce(rankResult(results) as never);
}

import { retain } from "./retain";

const mockVaultCtx = {} as VaultMemoryOperationsContext;
const mockEmbeddingOptions: EmbeddingOptions = { apiKey: "test-key" };

const ctx = {
  vaultCtx: mockVaultCtx,
  embeddingOptions: mockEmbeddingOptions,
  vaultCache: new Map<string, Float32Array>(),
};

beforeEach(() => {
  vi.clearAllMocks();
  ctx.vaultCache.clear();
});

describe("retain", () => {
  it("throws on empty content", async () => {
    await expect(retain("", ctx)).rejects.toThrow();
    await expect(retain("   ", ctx)).rejects.toThrow();
  });

  it("creates a new memory when no similar match exists", async () => {
    mockVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({
      uniqueId: "new-id",
      content: "Allergic to shellfish",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: null,
      proofCount: 1,
      source: "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });

    const result = await retain("Allergic to shellfish", ctx);

    expect(result.action).toBe("create");
    expect(result.memoryId).toBe("new-id");
    expect(result.proofCount).toBe(1);
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalled();
    expect(vi.mocked(updateVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("scopes the dedup search to the same scope it writes (H2)", async () => {
    mockVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    // Scope unset → both search and write resolve to the DB default "private",
    // so dedup can't miss a private dupe or match across scopes.
    await retain("a fact", ctx);
    expect(vi.mocked(prepareVaultCandidates).mock.calls[0][4]).toMatchObject({
      scopes: ["private"],
    });
    expect(vi.mocked(createVaultMemoryOp).mock.calls[0][1]).toMatchObject({ scope: "private" });

    vi.clearAllMocks();
    mockVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    // Caller scope → used for both.
    await retain("a fact", ctx, { scope: "shared" });
    expect(vi.mocked(prepareVaultCandidates).mock.calls[0][4]).toMatchObject({
      scopes: ["shared"],
    });
    expect(vi.mocked(createVaultMemoryOp).mock.calls[0][1]).toMatchObject({ scope: "shared" });
  });

  it("merges into the nearest match when cosine ≥ threshold", async () => {
    mockVaultMatches([
      { uniqueId: "existing-id", content: "Allergic to shellfish", similarity: 0.92 },
    ]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "existing-id",
      content: "Allergic to shellfish",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: ["msg-old"],
      proofCount: 3,
      source: "auto-extracted",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });
    vi.mocked(updateVaultMemoryOp).mockResolvedValue({
      uniqueId: "existing-id",
      content: "Allergic to shellfish",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: ["msg-old", "msg-new"],
      proofCount: 4,
      source: "auto-extracted",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });

    const result = await retain("Allergic to shellfish", ctx, {
      sourceChunkIds: ["msg-new"],
    });

    expect(result.action).toBe("merge");
    expect(result.memoryId).toBe("existing-id");
    expect(result.targetId).toBe("existing-id");
    expect(result.proofCount).toBe(4);
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
    expect(vi.mocked(updateVaultMemoryOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      "existing-id",
      expect.objectContaining({
        // Atomic increment, not an absolute proofCount — see
        // proofCountIncrement docstring on UpdateVaultMemoryOptions.
        proofCountIncrement: 1,
        sourceChunkIds: ["msg-old", "msg-new"],
        // C3: a merge is a re-observation — stamps last_observed_at without
        // touching updated_at (preserveUpdatedAt keeps recency pinned).
        preserveUpdatedAt: true,
        lastObservedAt: expect.any(Number),
      })
    );
  });

  it("PR5: un-archives (restores) an archived row on re-observe instead of duplicating", async () => {
    mockVaultMatches([
      { uniqueId: "archived-id", content: "Allergic to shellfish", similarity: 0.95 },
    ]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "archived-id",
      content: "Allergic to shellfish",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: ["msg-old"],
      proofCount: 2,
      source: "auto-extracted",
      archivedAt: Date.now() - 1000, // decayed
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    } as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue({
      uniqueId: "archived-id",
      proofCount: 3,
    } as never);

    const result = await retain("Allergic to shellfish", ctx, { sourceChunkIds: ["msg-new"] });

    expect(result.action).toBe("merge");
    // The dedup search must opt into archived candidates.
    expect(vi.mocked(prepareVaultCandidates).mock.calls[0][4]).toMatchObject({
      includeArchived: true,
    });
    // The merge write restores the row and lets updated_at bump (no preserve).
    const updateArgs = vi.mocked(updateVaultMemoryOp).mock.calls[0][2];
    expect(updateArgs).toMatchObject({ restore: true, proofCountIncrement: 1 });
    expect(updateArgs).not.toHaveProperty("preserveUpdatedAt");
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("PR5: an ACTIVE merge target preserves updated_at and does not set restore", async () => {
    mockVaultMatches([
      { uniqueId: "active-id", content: "Allergic to shellfish", similarity: 0.95 },
    ]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "active-id",
      content: "Allergic to shellfish",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: [],
      proofCount: 1,
      source: "auto-extracted",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    } as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue({
      uniqueId: "active-id",
      proofCount: 2,
    } as never);

    await retain("Allergic to shellfish", ctx);

    const updateArgs = vi.mocked(updateVaultMemoryOp).mock.calls[0][2];
    expect(updateArgs).toMatchObject({ preserveUpdatedAt: true });
    expect(updateArgs).not.toHaveProperty("restore");
  });

  it("PR5 + A2: does NOT resurrect an archived match that is ALSO superseded (main's suppression wins)", async () => {
    // The dedup search surfaces the archived row (includeArchived: true), but the
    // row was already retired by a newer, incompatible-value fact. Decay
    // resurrection must respect main's supersession: no merge, no restore — the
    // new observation falls through to a fresh create instead.
    mockVaultMatches([
      { uniqueId: "archived-superseded-id", content: "Lives in Portland", similarity: 0.95 },
    ]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "archived-superseded-id",
      content: "Lives in Portland",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: ["msg-old"],
      proofCount: 2,
      source: "auto-extracted",
      archivedAt: Date.now() - 1000, // decayed…
      supersededBy: "lives-in-sf-id", // …AND already retired
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    } as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "fresh-id" } as never);

    const result = await retain("Lives in Portland", ctx, { sourceChunkIds: ["msg-new"] });

    // No resurrection: the superseded row is never touched…
    expect(vi.mocked(updateVaultMemoryOp)).not.toHaveBeenCalled();
    // …and the fact is still stored via a fresh create.
    expect(result.action).toBe("create");
    expect(result.memoryId).toBe("fresh-id");
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalled();
  });

  it("PR5 + tombstone: does NOT resurrect a deleted match (search excludes it → tombstone create-gate suppresses)", async () => {
    // A soft-deleted (tombstoned) memory never surfaces from the live dedup
    // search (baseVaultConditions excludes is_deleted), so it can't be a merge/
    // resurrection target. On the create path, respectTombstones then suppresses
    // the re-creation so a user-deleted fact isn't silently resurrected.
    mockVaultMatches([]); // deleted row not returned
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    // getAllVaultMemoriesOp(includeDeleted) backs the tombstone scan.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      {
        uniqueId: "dead-id",
        content: "Allergic to shellfish",
        scope: "private",
        folderId: null,
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
        embeddingModel: DEFAULT_API_EMBEDDING_MODEL,
        isDeleted: true,
      },
    ] as never);

    const result = await retain("Allergic to shellfish", ctx, { respectTombstones: true });

    // No resurrection: neither a merge nor a create happened.
    expect(vi.mocked(updateVaultMemoryOp)).not.toHaveBeenCalled();
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
    expect(result.action).toBe("suppressed");
    expect(result.tombstoneId).toBe("dead-id");
  });

  it("persists factType on the create path (PR1)", async () => {
    mockVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    await retain("Works in engineering", ctx, { factType: "identity" });

    expect(vi.mocked(createVaultMemoryOp).mock.calls[0][1]).toMatchObject({
      factType: "identity",
    });
  });

  it("lazily backfills factType on merge when the target has none (PR1)", async () => {
    mockVaultMatches([{ uniqueId: "id1", content: "Foo", similarity: 0.92 }]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "id1",
      content: "Foo",
      factType: null,
      sourceChunkIds: [],
      proofCount: 1,
    } as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue({ uniqueId: "id1", proofCount: 2 } as never);

    await retain("Foo", ctx, { factType: "preference" });

    expect(vi.mocked(updateVaultMemoryOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      "id1",
      expect.objectContaining({ factType: "preference" })
    );
  });

  it("never overwrites an existing non-null factType on merge (PR1)", async () => {
    mockVaultMatches([{ uniqueId: "id1", content: "Foo", similarity: 0.92 }]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "id1",
      content: "Foo",
      factType: "identity",
      sourceChunkIds: [],
      proofCount: 1,
    } as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue({ uniqueId: "id1", proofCount: 2 } as never);

    await retain("Foo", ctx, { factType: "preference" });

    // First observation is authoritative — the merge update carries no factType.
    const updateArgs = vi.mocked(updateVaultMemoryOp).mock.calls[0][2];
    expect(updateArgs).not.toHaveProperty("factType");
  });

  it("dedupes source chunk ids on merge (no duplicates if already present)", async () => {
    mockVaultMatches([{ uniqueId: "id1", content: "Foo", similarity: 0.9 }]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "id1",
      content: "Foo",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: ["msg-a", "msg-b"],
      proofCount: 1,
      source: "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });
    // Non-null so it stays on the merge path (a null result now falls through
    // to create — covered by the dedicated test below).
    vi.mocked(updateVaultMemoryOp).mockResolvedValue({ uniqueId: "id1", proofCount: 2 } as never);

    await retain("Foo", ctx, { sourceChunkIds: ["msg-b", "msg-c"] });

    expect(vi.mocked(updateVaultMemoryOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      "id1",
      expect.objectContaining({
        sourceChunkIds: ["msg-a", "msg-b", "msg-c"],
      })
    );
  });

  const mergeTarget = {
    uniqueId: "target",
    content: "Foo",
    scope: "private",
    folderId: null,
    userId: null,
    embedding: null,
    sourceChunkIds: [],
    proofCount: 3,
    source: "manual",
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };

  it("falls through to create when the merge target was deleted mid-flight (write → null, target gone)", async () => {
    // Regression (#630): a null update result must NOT report a phantom merge
    // with an optimistic +1. When the target was deleted between search and
    // write (re-probe finds it gone), retain still retains the fact via create.
    mockVaultMatches([{ uniqueId: "target", content: "Foo", similarity: 0.99 }]);
    // First lookup (pre-write) finds the target; the post-null re-probe finds
    // it gone → benign race → create.
    vi.mocked(getVaultMemoryOp).mockResolvedValueOnce(mergeTarget).mockResolvedValue(null);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(null); // write didn't persist
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "created-fresh" } as never);

    const result = await retain("Foo", ctx, { sourceChunkIds: ["msg-x"] });

    expect(vi.mocked(updateVaultMemoryOp)).toHaveBeenCalled();
    // No phantom merge/proofCount=4 — the fact is created instead.
    expect(result.action).toBe("create");
    expect(result.memoryId).toBe("created-fresh");
    expect(result.proofCount).toBe(1);
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalled();
  });

  it("throws (no duplicate create) when the merge write fails but the target still exists", async () => {
    // updateVaultMemoryOp collapses a caught write error into null just like a
    // concurrent delete. If the target is still present, falling through to
    // create would silently duplicate the fact — surface the failure instead.
    mockVaultMatches([{ uniqueId: "target", content: "Foo", similarity: 0.99 }]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue(mergeTarget); // still there on re-probe
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(null); // write threw internally
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "should-not-happen" } as never);

    await expect(retain("Foo", ctx, { sourceChunkIds: ["msg-x"] })).rejects.toThrow(
      /failed to persist/
    );
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("force-creates when enableAutoMerge=false even if similar match exists", async () => {
    mockVaultMatches([{ uniqueId: "near-dup", content: "Foo", similarity: 0.99 }]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({
      uniqueId: "fresh",
      content: "Foo",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: null,
      proofCount: 1,
      source: "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });

    const result = await retain("Foo", ctx, { enableAutoMerge: false });

    expect(result.action).toBe("create");
    expect(result.memoryId).toBe("fresh");
    // searchVaultMemories shouldn't even be called when autoMerge is off
    expect(vi.mocked(prepareVaultCandidates)).not.toHaveBeenCalled();
    expect(vi.mocked(updateVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("respects custom autoMergeThreshold", async () => {
    mockVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({
      uniqueId: "x",
      content: "Foo",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: null,
      proofCount: 1,
      source: "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });

    await retain("Foo", ctx, { autoMergeThreshold: 0.95 });

    // minSimilarity is a RANK-time parameter now: prepare builds the candidate
    // set, rank applies the threshold. Stage 2 is the last rank call.
    const rankCalls = vi.mocked(rankPreparedVaultCandidates).mock.calls;
    expect(rankCalls[rankCalls.length - 1][3]).toMatchObject({ minSimilarity: 0.95 });
  });

  it("creates with source + sourceChunkIds when provided", async () => {
    mockVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({
      uniqueId: "auto",
      content: "Partner's name is Sara",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: ["msg-1"],
      proofCount: 1,
      source: "auto-extracted",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });

    await retain("Partner's name is Sara", ctx, {
      source: "auto-extracted",
      sourceChunkIds: ["msg-1"],
    });

    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      expect.objectContaining({
        source: "auto-extracted",
        sourceChunkIds: ["msg-1"],
        proofCount: 1,
      })
    );
  });

  it("falls through to create when search hits but record fetch fails", async () => {
    // Edge: searchVaultMemories returns a stub but the record was deleted
    // between operations. Should not crash; create new instead.
    mockVaultMatches([{ uniqueId: "ghost", content: "x", similarity: 0.9 }]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue(null);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({
      uniqueId: "fresh",
      content: "x",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: null,
      proofCount: 1,
      source: "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });

    const result = await retain("x", ctx);

    expect(result.action).toBe("create");
  });
});

describe("retain — tombstones (respectTombstones)", () => {
  // ctx passes no model, so retain embeds with the default model; tombstone rows
  // must carry the same model to be comparable (embedding-space guard).
  const MODEL = DEFAULT_API_EMBEDDING_MODEL;
  // Minimal soft-deleted / live row for getAllVaultMemoriesOp results.
  function row(
    uniqueId: string,
    embedding: number[],
    isDeleted: boolean,
    embeddingModel: string | null = MODEL
  ) {
    return {
      uniqueId,
      content: uniqueId,
      scope: "private",
      folderId: null,
      userId: null,
      embedding: JSON.stringify(embedding),
      embeddingModel,
      sourceChunkIds: null,
      proofCount: 1,
      source: "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted,
    } as Awaited<ReturnType<typeof getAllVaultMemoriesOp>>[number];
  }

  beforeEach(() => {
    // No live merge candidate by default — exercise the create path.
    // Prepare's vector matches generateEmbedding's: same text, same call upstream.
    mockVaultMatches([], [1, 0, 0]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
  });

  it("suppresses a create that matches a soft-deleted memory", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([row("dead-1", [1, 0, 0], true)]);

    const result = await retain("Works at Google", ctx, { respectTombstones: true });

    expect(result.action).toBe("suppressed");
    expect(result.tombstoneId).toBe("dead-1");
    expect(result.memoryId).toBe("dead-1");
    expect(createVaultMemoryOp).not.toHaveBeenCalled();
  });

  it("still creates when the nearest tombstone is below threshold", async () => {
    // cosine([1,0,0],[0.6,0.8,0]) = 0.6 < 0.8 (auto-merge threshold)
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([row("dead-1", [0.6, 0.8, 0], true)]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue(row("new-1", [1, 0, 0], false));

    const result = await retain("Likes tea", ctx, { respectTombstones: true });

    expect(result.action).toBe("create");
    expect(createVaultMemoryOp).toHaveBeenCalledOnce();
  });

  it("ignores tombstones embedded with a different model", async () => {
    // Same vector, but a different embedding space → not comparable → create.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      row("dead-1", [1, 0, 0], true, "some/other-embedding-model"),
    ]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue(row("new-1", [1, 0, 0], false));

    const result = await retain("Works at Google", ctx, { respectTombstones: true });

    expect(result.action).toBe("create");
  });

  it("scopes the tombstone query by folderId when provided", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([row("dead-1", [1, 0, 0], true)]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue(row("new-1", [1, 0, 0], false));

    await retain("Works at Google", ctx, { respectTombstones: true, folderId: "folder-b" });

    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ includeDeleted: true, folderId: "folder-b" })
    );
  });

  it("ignores LIVE rows returned alongside deleted ones", async () => {
    // A live row matches exactly, but it's not a tombstone → must not suppress.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([row("live-1", [1, 0, 0], false)]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue(row("new-1", [1, 0, 0], false));

    const result = await retain("Likes tea", ctx, { respectTombstones: true });

    expect(result.action).toBe("create");
  });

  it("does NOT consult tombstones when respectTombstones is off (default)", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([row("dead-1", [1, 0, 0], true)]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue(row("new-1", [1, 0, 0], false));

    const result = await retain("Works at Google", ctx);

    expect(result.action).toBe("create");
    expect(getAllVaultMemoriesOp).not.toHaveBeenCalled();
  });

  it("a live merge still wins and never reaches the tombstone check", async () => {
    mockVaultMatches([{ uniqueId: "live-1" } as never]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue(row("live-1", [1, 0, 0], false));
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(row("live-1", [1, 0, 0], false));

    const result = await retain("Works at Google", ctx, { respectTombstones: true });

    expect(result.action).toBe("merge");
    expect(getAllVaultMemoriesOp).not.toHaveBeenCalled();
  });
});

describe("retain — write-time supersession (A2)", () => {
  const consolidateOptions = { apiKey: "k" };

  it("supersedes the stale fact: creates the new one, stamps superseded_by, skips strict merge", async () => {
    // Consolidate candidate search (0.65 floor) surfaces the stale fact...
    mockVaultMatches([
      { uniqueId: "old-portland", content: "Lives in Portland", similarity: 0.7 } as never,
    ]);
    // ...and the LLM rules it a state change.
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old-portland",
      content: "Lives in San Francisco",
    });
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "old-portland",
      content: "Lives in Portland",
    } as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({
      created: { uniqueId: "new-sf" } as never,
      retired: true,
    });

    const result = await retain("Lives in San Francisco", ctx, { consolidateOptions });

    expect(result).toMatchObject({
      action: "supersede",
      memoryId: "new-sf",
      targetId: "old-portland",
    });
    // Create + retire happen atomically in one op; the successor's content is
    // the consolidator's refined value, and the target is the stale id.
    expect(vi.mocked(createSupersedingMemoryOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      expect.objectContaining({ content: "Lives in San Francisco" }),
      "old-portland"
    );
    // Not a plain create, and strict cosine merge (Stage 2) is skipped — only
    // the one consolidate search ran.
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
    expect(vi.mocked(prepareVaultCandidates)).toHaveBeenCalledTimes(1);
  });

  it("falls through to plain create when the supersede target vanished (race)", async () => {
    // Stage 1 (consolidate) then Stage 2 (strict merge), in rank call order.
    mockVaultMatchesOnce([{ uniqueId: "old", content: "x", similarity: 0.7 }]);
    mockVaultMatchesOnce([]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      content: "new",
    });
    vi.mocked(getVaultMemoryOp).mockResolvedValue(null); // target gone between search and decision
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "new" } as never);

    const result = await retain("new", ctx, { consolidateOptions });

    expect(result.action).toBe("create");
    expect(vi.mocked(createSupersedingMemoryOp)).not.toHaveBeenCalled();
  });

  it("does not retire the old fact when the new one is tombstone-suppressed", async () => {
    mockVaultMatches([{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 } as never]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      content: "Lives in San Francisco",
    });
    vi.mocked(getVaultMemoryOp).mockResolvedValue({ uniqueId: "old" } as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    // The new fact matches a tombstone (user previously deleted "Lives in SF").
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      {
        uniqueId: "tomb",
        isDeleted: true,
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
        embeddingModel: DEFAULT_API_EMBEDDING_MODEL,
      } as never,
    ]);

    const result = await retain("Lives in San Francisco", ctx, {
      consolidateOptions,
      respectTombstones: true,
    });

    expect(result.action).toBe("suppressed");
    // Nothing was created, so the old fact must NOT be retired.
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
    expect(vi.mocked(createSupersedingMemoryOp)).not.toHaveBeenCalled();
  });

  it("falls back to a plain create when the atomic supersede loses the race", async () => {
    // createSupersedingMemoryOp returns { created: null, retired: false } when a
    // concurrent supersession already retired the target inside the write — no
    // orphan successor was created. retain then does a plain create so the fact
    // is still stored (the rare duplicate self-reconciles later).
    // Only the consolidate search runs — Stage 2 is skipped on the supersede
    // path, and the create fall-through goes straight to createVaultMemoryOp
    // (no further search). Queue exactly one value so nothing leaks to the next test.
    mockVaultMatchesOnce([
      { uniqueId: "old", content: "Lives in Portland", similarity: 0.7 } as never,
    ]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      content: "Lives in San Francisco",
    });
    vi.mocked(getVaultMemoryOp).mockResolvedValue({ uniqueId: "old" } as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({ created: null, retired: false });
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "new-sf" } as never);

    const result = await retain("Lives in San Francisco", ctx, { consolidateOptions });

    expect(result).toMatchObject({ action: "create", memoryId: "new-sf" });
    expect(vi.mocked(createSupersedingMemoryOp)).toHaveBeenCalled();
    // Fell back to a plain create — the fact is persisted, no orphan.
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalledTimes(1);
  });

  it("multi-supersede: retires EVERY stale duplicate against the new memory", async () => {
    mockVaultMatchesOnce([
      { uniqueId: "d1", content: "Prefers dark mode in every app", similarity: 0.86 } as never,
      {
        uniqueId: "d2",
        content: "Prefers dark mode in every app they use",
        similarity: 0.84,
      } as never,
      { uniqueId: "d3", content: "Prefers dark mode", similarity: 0.83 } as never,
    ]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "d1",
      targetIds: ["d1", "d2", "d3"],
      content: "Prefers light mode in every app",
    });
    vi.mocked(getVaultMemoryOp).mockResolvedValue({ uniqueId: "x" } as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    // Primary retired atomically with the new memory; the rest retire cleanly.
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({
      created: { uniqueId: "light" } as never,
      retired: true,
    });
    vi.mocked(supersedeVaultMemoryOp).mockResolvedValue(true);

    const result = await retain("Prefers light mode in every app", ctx, { consolidateOptions });

    expect(result).toMatchObject({ action: "supersede", memoryId: "light", targetId: "d1" });
    // Primary (d1) retired atomically; d2 + d3 retired against the new id.
    expect(vi.mocked(createSupersedingMemoryOp)).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "d1"
    );
    expect(vi.mocked(supersedeVaultMemoryOp).mock.calls.map((c) => c[1])).toEqual(["d2", "d3"]);
  });

  it("multi-supersede: primary race-loss falls through to a plain create (no forced retires)", async () => {
    mockVaultMatchesOnce([
      { uniqueId: "d1", content: "Prefers dark mode a", similarity: 0.86 } as never,
      { uniqueId: "d2", content: "Prefers dark mode b", similarity: 0.84 } as never,
    ]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "d1",
      targetIds: ["d1", "d2"],
      content: "Prefers light mode",
    });
    vi.mocked(getVaultMemoryOp).mockResolvedValue({ uniqueId: "x" } as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    // Atomic op loses the race on the primary (a concurrent supersede already
    // retired d1). We must NOT force-retire the rest against a brand-new
    // successor (that would create a second live successor competing with the
    // concurrent winner) — fall through to a plain create and self-reconcile.
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({ created: null, retired: false });
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "light" } as never);

    const result = await retain("Prefers light mode", ctx, { consolidateOptions });

    expect(result).toMatchObject({ action: "create", memoryId: "light" });
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalledTimes(1);
    // No forced secondary retires on the race-loss path.
    expect(vi.mocked(supersedeVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("multi-supersede: a secondary retire that returns false is re-read to check for a live leftover", async () => {
    mockVaultMatchesOnce([
      { uniqueId: "d1", content: "dark a", similarity: 0.86 } as never,
      { uniqueId: "d2", content: "dark b", similarity: 0.84 } as never,
    ]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "d1",
      targetIds: ["d1", "d2"],
      content: "light",
    });
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    // Primary (d1) retired atomically; the d2 secondary retire returns the
    // ambiguous false, so retain re-reads d2 to tell "already gone" from a
    // genuine live leftover. A live (non-superseded) row = genuine leftover.
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({
      created: { uniqueId: "light" } as never,
      retired: true,
    });
    vi.mocked(supersedeVaultMemoryOp).mockResolvedValue(false);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({ uniqueId: "d2" } as never);

    const result = await retain("light", ctx, { consolidateOptions });

    // Primary supersession is atomic + reliable → still a supersede.
    expect(result).toMatchObject({ action: "supersede", memoryId: "light", targetId: "d1" });
    // The false secondary was re-read (not silently ignored) to disambiguate.
    expect(vi.mocked(getVaultMemoryOp)).toHaveBeenCalledWith(mockVaultCtx, "d2");
  });

  it("falls through to plain create when the target is already superseded", async () => {
    // Stage 1 (consolidate) then Stage 2 (strict merge), in rank call order.
    mockVaultMatchesOnce([{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 }]);
    mockVaultMatchesOnce([]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      content: "Lives in San Francisco",
    });
    // Target already retired by a concurrent supersession.
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "old",
      supersededBy: "someone-else",
    } as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "new-sf" } as never);

    const result = await retain("Lives in San Francisco", ctx, { consolidateOptions });

    expect(result.action).toBe("create");
    expect(vi.mocked(createSupersedingMemoryOp)).not.toHaveBeenCalled();
  });
});

/**
 * #630 — a consolidation decision that gets DROPPED has to say so.
 *
 * The applier falls through to create whenever the row a decision named is
 * deleted or superseded between the candidate search and the write. Falling
 * through is the right outcome (the target really is gone —
 * `assertMergeTargetGoneOrThrow` has already separated that from a write that
 * merely failed), but until now it happened in complete silence: no log, no
 * `onFallback`. The consolidator identified a duplicate, the dedup was thrown
 * away, and the only symptom was the vault growing.
 *
 * `target_vanished` is its own reason rather than reusing `invalid_response`
 * because it points somewhere else entirely: the model behaved, the DB moved.
 * A consumer sees "fix write contention", not "fix the prompt".
 *
 * These tests assert on the hook, not the log, because the hook is the contract.
 * The `onFallback` mock passes through the real `consolidationFallback` module —
 * only `./consolidate` is mocked in this file — so the wiring under test is the
 * production wiring.
 */
describe("retain — a dropped consolidation decision is reported (#630)", () => {
  /** A live row: exists, not retired. */
  const liveRow = (uniqueId: string) => ({ uniqueId, content: "existing", proofCount: 1 });

  /**
   * Stage 1 (consolidate, 0.65 floor) sees `matches`; Stage 2 (strict cosine
   * merge) sees nothing.
   *
   * Driven by a call counter rather than two `mockResolvedValueOnce` calls on
   * purpose. `vi.clearAllMocks()` clears recorded calls but does NOT drain a
   * `Once` queue, so a test that throws or returns before Stage 2 leaves its
   * second queued value behind for whichever test runs next — which then gets an
   * empty Stage 1, skips consolidation entirely, and fails claiming the hook was
   * never called. Two of the cases below deliberately abort mid-Stage-1, so this
   * block has to be order-independent.
   */
  function stages(matches: VaultMatch[]) {
    let call = 0;
    vi.mocked(prepareVaultCandidates).mockResolvedValue(prepared([0.1, 0.2, 0.3]) as never);
    vi.mocked(rankPreparedVaultCandidates).mockImplementation(
      async () => rankResult(call++ === 0 ? matches : []) as never
    );
  }

  function stagesFor(id: string) {
    stages([{ uniqueId: id, content: "existing", similarity: 0.7 }]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "fresh" } as never);
  }

  it("reports target_vanished when a noop target was deleted before the write", async () => {
    stagesFor("gone");
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "noop", targetId: "gone" });
    vi.mocked(getVaultMemoryOp).mockResolvedValue(null as never);
    const onFallback = vi.fn();

    const result = await retain("dup fact", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    // Still creates — the outcome is unchanged, only the silence is.
    expect(result.action).toBe("create");
    expect(onFallback).toHaveBeenCalledExactlyOnceWith("target_vanished");
  });

  it("reports target_vanished when a noop target was superseded before the write", async () => {
    stagesFor("retired");
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "noop", targetId: "retired" });
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "retired",
      supersededBy: "newer",
    } as never);
    const onFallback = vi.fn();

    const result = await retain("dup fact", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    expect(result.action).toBe("create");
    expect(onFallback).toHaveBeenCalledExactlyOnceWith("target_vanished");
  });

  it("reports target_vanished when a noop target disappears mid-write", async () => {
    // The row was live at read time, the write came back null, and the re-probe
    // confirms it is gone — so the proof-count bump is lost, not merely delayed.
    stagesFor("racy");
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "noop", targetId: "racy" });
    vi.mocked(getVaultMemoryOp)
      .mockResolvedValueOnce(liveRow("racy") as never)
      .mockResolvedValue(null as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(null as never);
    const onFallback = vi.fn();

    const result = await retain("dup fact", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    expect(result.action).toBe("create");
    expect(onFallback).toHaveBeenCalledExactlyOnceWith("target_vanished");
  });

  it("reports target_vanished when an update target vanished, losing the rewrite", async () => {
    stagesFor("gone");
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "update",
      targetId: "gone",
      content: "richer consolidated form",
    });
    vi.mocked(getVaultMemoryOp).mockResolvedValue(null as never);
    const onFallback = vi.fn();

    const result = await retain("plain fact", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    expect(result.action).toBe("create");
    expect(onFallback).toHaveBeenCalledExactlyOnceWith("target_vanished");
    // The consolidator's richer text is discarded along with the decision: what
    // lands is the caller's original input.
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      expect.objectContaining({ content: "plain fact" })
    );
  });

  it("reports target_vanished when an update target disappears mid-write", async () => {
    stagesFor("racy");
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "update",
      targetId: "racy",
      content: "richer consolidated form",
    });
    vi.mocked(getVaultMemoryOp)
      .mockResolvedValueOnce(liveRow("racy") as never)
      .mockResolvedValue(null as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(null as never);
    const onFallback = vi.fn();

    const result = await retain("plain fact", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    expect(result.action).toBe("create");
    expect(onFallback).toHaveBeenCalledExactlyOnceWith("target_vanished");
  });

  it("reports target_vanished when every supersede target is already retired", async () => {
    stagesFor("old");
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      targetIds: ["old", "older"],
      content: "Lives in San Francisco",
    });
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "old",
      supersededBy: "someone-else",
    } as never);
    const onFallback = vi.fn();

    const result = await retain("Lives in San Francisco", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    expect(result.action).toBe("create");
    expect(vi.mocked(createSupersedingMemoryOp)).not.toHaveBeenCalled();
    expect(onFallback).toHaveBeenCalledExactlyOnceWith("target_vanished");
  });

  it("reports target_vanished when the supersede primary loses the race INSIDE the write", async () => {
    // The one race the applier cannot see: the target was live when it validated,
    // and `createSupersedingMemoryOp`'s own re-check is what lost. It returns
    // `{ created: null, retired: false }` and retain() falls through to a plain
    // create — the supersession the consolidator ruled on never happened.
    stages([{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 }]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      content: "Lives in San Francisco",
    });
    // Live at validation time...
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "old",
      content: "Lives in Portland",
    } as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    // ...but the atomic write's re-check finds it already retired.
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({
      created: null as never,
      retired: false,
    });
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "plain-new" } as never);
    const onFallback = vi.fn();

    const result = await retain("Lives in San Francisco", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    // The fact is still stored, just not as a supersession.
    expect(result).toMatchObject({ action: "create", memoryId: "plain-new" });
    expect(vi.mocked(createSupersedingMemoryOp)).toHaveBeenCalled();
    expect(onFallback).toHaveBeenCalledExactlyOnceWith("target_vanished");
  });

  it("stays silent when a supersede only PARTIALLY races — the decision still applied", async () => {
    // One of two targets is already retired. The supersession still happens over
    // the survivor, so nothing was dropped and nothing should be reported.
    // Without this, any multi-target supersession would look like a fallback.
    stages([{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 }]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      targetIds: ["old", "already-retired"],
      content: "Lives in San Francisco",
    });
    vi.mocked(getVaultMemoryOp).mockImplementation(
      async (_ctx, id) =>
        (id === "old"
          ? { uniqueId: "old", content: "Lives in Portland" }
          : { uniqueId: id, supersededBy: "someone-else" }) as never
    );
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({
      created: { uniqueId: "new-sf" } as never,
      retired: true,
    });
    const onFallback = vi.fn();

    const result = await retain("Lives in San Francisco", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    expect(result.action).toBe("supersede");
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("stays silent on a decision that applied cleanly", async () => {
    // The control. `onFallback` means "a decision was lost"; a successful merge
    // must never touch it, or the rate a consumer alerts on is meaningless.
    stages([{ uniqueId: "live", content: "existing", similarity: 0.7 }]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "noop", targetId: "live" });
    vi.mocked(getVaultMemoryOp).mockResolvedValue(liveRow("live") as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue({
      uniqueId: "live",
      proofCount: 2,
    } as never);
    const onFallback = vi.fn();

    const result = await retain("dup fact", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    expect(result).toMatchObject({ action: "merge", memoryId: "live", proofCount: 2 });
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("a genuine write failure still THROWS rather than reporting a race", async () => {
    // The distinction assertMergeTargetGoneOrThrow exists to draw: the write
    // failed and the target is still there. That is not a vanished target and
    // must not be downgraded to an observability event and a duplicate.
    stagesFor("still-here");
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "noop", targetId: "still-here" });
    vi.mocked(getVaultMemoryOp).mockResolvedValue(liveRow("still-here") as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(null as never);
    const onFallback = vi.fn();

    await expect(
      retain("dup fact", ctx, { consolidateOptions: { apiKey: "k", onFallback } })
    ).rejects.toThrow(/failed to persist/);
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("a throwing onFallback cannot break the write", async () => {
    // Same guarantee consolidate.ts already makes for its own two reasons: a
    // broken metrics sink must not fail the retain it is only observing.
    stagesFor("gone");
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "noop", targetId: "gone" });
    vi.mocked(getVaultMemoryOp).mockResolvedValue(null as never);
    const onFallback = vi.fn(() => {
      throw new Error("metrics sink exploded");
    });

    const result = await retain("dup fact", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    expect(result.action).toBe("create");
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("drops the decision without a hook when the caller wired none", async () => {
    // onFallback is optional; the fallthrough must not depend on it existing.
    stagesFor("gone");
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "noop", targetId: "gone" });
    vi.mocked(getVaultMemoryOp).mockResolvedValue(null as never);

    const result = await retain("dup fact", ctx, { consolidateOptions: { apiKey: "k" } });

    expect(result.action).toBe("create");
  });
});

/**
 * B2 retain half — the two merge stages share ONE prepared candidate set.
 * These pin the three properties that make the sharing sound, all of which are
 * silent if broken: prepare runs once, it is prepared at the WIDEST limit, and
 * each stage still re-ranks rather than filtering the other's output.
 */
describe("retain — shared candidate preparation", () => {
  const ctx = {
    vaultCtx: mockVaultCtx,
    embeddingOptions: mockEmbeddingOptions,
    vaultCache: new Map(),
  } as never;

  beforeEach(() => {
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "new" } as never);
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);
  });

  it("prepares the candidate set ONCE even though both stages rank it", async () => {
    mockVaultMatches([]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "create", content: "Foo" });

    await retain("Foo", ctx, { consolidateOptions: { apiKey: "k" } });

    // One load + decrypt + query-embed for the whole retain, not one per stage.
    expect(vi.mocked(prepareVaultCandidates)).toHaveBeenCalledTimes(1);
    // Both stages still rank: consolidation (Stage 1) and strict merge (Stage 2).
    expect(vi.mocked(rankPreparedVaultCandidates)).toHaveBeenCalledTimes(2);
  });

  it("prepares at the WIDEST limit either stage uses, not the narrowest", async () => {
    mockVaultMatches([]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "create", content: "Foo" });

    await retain("Foo", ctx, { consolidateOptions: { apiKey: "k" }, consolidateTopK: 20 });

    // Under decryptLast the decrypted admission window is
    // max(limit * admitFactor, admitFloor), so preparing at Stage 2's limit of 1
    // would hand Stage 1 a smaller candidate pool than it would have had alone.
    expect(vi.mocked(prepareVaultCandidates).mock.calls[0][4]).toMatchObject({ limit: 20 });
  });

  it("re-ranks per stage at each stage's own limit + threshold", async () => {
    mockVaultMatches([]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "create", content: "Foo" });

    await retain("Foo", ctx, {
      consolidateOptions: { apiKey: "k" },
      consolidateTopK: 20,
      consolidateThreshold: 0.55,
      autoMergeThreshold: 0.8,
    });

    const calls = vi.mocked(rankPreparedVaultCandidates).mock.calls;
    // Stage 1 — loose + wide.
    expect(calls[0][3]).toMatchObject({ limit: 20, minSimilarity: 0.55 });
    // Stage 2 — strict + narrow. NOT derivable by filtering Stage 1: the ranker's
    // supersession window is min(limit * 3, cap), so the stages order differently.
    expect(calls[1][3]).toMatchObject({ limit: 1, minSimilarity: 0.8 });
  });

  /**
   * Pins the three RESOLVED defaults, which nothing did before: the tests above
   * pass `consolidateTopK` / `consolidateThreshold` / `autoMergeThreshold`
   * explicitly, so they prove forwarding works and say nothing about the values
   * used when a caller omits them.
   *
   * That gap is how the published docs came to disagree with the code. After
   * #750 retuned the constants to 0.8 / 0.55 / 20, the JSDoc on `RetainOptions`
   * still advertised 0.85 / 0.65 / 5 and no test noticed — a consumer reading the
   * docs to pick a threshold was reading three wrong numbers.
   *
   * Numbers are written out rather than imported because the constants are
   * module-private and exporting them purely for a test would widen the public
   * surface. The literals are the point: change a constant and this fails, which
   * is the prompt to update the doc sitting next to it.
   */
  it("resolves the documented defaults when the caller passes none (#768-G1)", async () => {
    mockVaultMatches([]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "create", content: "Foo" });
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    // No threshold or topK options — everything below is a DEFAULT.
    await retain("Foo", ctx, { consolidateOptions: { apiKey: "k" } });

    const rankCalls = vi.mocked(rankPreparedVaultCandidates).mock.calls;
    // Stage 1 — consolidation: DEFAULT_CONSOLIDATE_TOP_K / DEFAULT_CONSOLIDATE_THRESHOLD.
    expect(rankCalls[0][3]).toMatchObject({ limit: 20, minSimilarity: 0.55 });
    // Stage 2 — strict cosine merge: DEFAULT_AUTO_MERGE_THRESHOLD.
    expect(rankCalls[1][3]).toMatchObject({ minSimilarity: 0.8 });
    // And prepare is sized by the widest stage, i.e. the same topK default.
    expect(vi.mocked(prepareVaultCandidates).mock.calls[0][4]).toMatchObject({ limit: 20 });
  });

  it("reuses the prepared query vector for the create write instead of re-embedding", async () => {
    mockVaultMatches([], [0.4, 0.5, 0.6]);

    await retain("Foo", ctx, {});

    // Same text, so re-embedding it would be a wasted network call.
    expect(vi.mocked(generateEmbedding)).not.toHaveBeenCalled();
    expect(vi.mocked(createVaultMemoryOp).mock.calls[0][1]).toMatchObject({
      embedding: JSON.stringify([0.4, 0.5, 0.6]),
    });
  });

  it("embeds fresh when superseding — the stored text is the consolidator's rewrite", async () => {
    mockVaultMatches([{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 }]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({ uniqueId: "old" } as never);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetIds: ["old"],
      content: "Lives in San Francisco",
    });
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({
      created: { uniqueId: "new" },
      retired: true,
    } as never);

    await retain("Moved to SF", ctx, { consolidateOptions: { apiKey: "k" } });

    // The prepared vector is for the ORIGINAL text; the row stores the refined
    // content, so reusing it would file the new fact under the wrong vector.
    expect(vi.mocked(generateEmbedding)).toHaveBeenCalledWith(
      "Lives in San Francisco",
      mockEmbeddingOptions
    );
  });

  it("does not prepare at all when auto-merge is off", async () => {
    await retain("Foo", ctx, { enableAutoMerge: false });
    expect(vi.mocked(prepareVaultCandidates)).not.toHaveBeenCalled();
    expect(vi.mocked(generateEmbedding)).toHaveBeenCalled();
  });
});

/**
 * The read path degrades to BM25 on an embeddings outage because partial recall
 * beats none. The WRITE path cannot: both merge stages are cosine-only, so a
 * candidate left without a vector scores 0, clears no threshold, and reads as
 * "no such memory" — retain would create a permanent duplicate of a fact it
 * should have merged into. These pin the gate that keeps that from happening.
 */
describe("retain — embeddings outage must not silently duplicate", () => {
  it("throws instead of creating when a PARTIAL row-batch failure hid the merge target", async () => {
    // The dangerous shape: the query embed landed, so nothing downstream throws
    // on its own, and cosine is not fully inert — `embeddingsUnavailable` is
    // false. Only `embeddingFailure` catches this.
    vi.mocked(prepareVaultCandidates).mockResolvedValue({
      ...PREPARED,
      embeddingsUnavailable: false,
      embeddingFailure: true,
    } as never);
    vi.mocked(rankPreparedVaultCandidates).mockResolvedValue(rankResult([]) as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);

    await expect(retain("Allergic to shellfish", ctx)).rejects.toThrow(/embeddings unavailable/i);
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("throws instead of creating when the cosine lane is fully inert", async () => {
    vi.mocked(prepareVaultCandidates).mockResolvedValue({
      ...PREPARED,
      queryEmbedding: [],
      embeddingsUnavailable: true,
      embeddingFailure: true,
    } as never);
    vi.mocked(rankPreparedVaultCandidates).mockResolvedValue(rankResult([]) as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);

    await expect(retain("Allergic to shellfish", ctx)).rejects.toThrow(/embeddings unavailable/i);
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("does not run the consolidator LLM call before failing", async () => {
    // Fail fast: the gate sits before Stage 1 so an outage doesn't buy a wasted
    // (and billed) consolidation round-trip per retained fact.
    vi.mocked(prepareVaultCandidates).mockResolvedValue({
      ...PREPARED,
      embeddingsUnavailable: false,
      embeddingFailure: true,
    } as never);

    await expect(
      retain("Allergic to shellfish", ctx, { consolidateOptions: { apiKey: "k" } })
    ).rejects.toThrow(/embeddings unavailable/i);
    expect(vi.mocked(consolidateMemory)).not.toHaveBeenCalled();
  });

  it("still force-creates under enableAutoMerge: false", async () => {
    // No merge to lose — the caller already decided to create, so an outage must
    // not block the write.
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "forced" } as never);

    const result = await retain("Allergic to shellfish", ctx, { enableAutoMerge: false });

    expect(result.action).toBe("create");
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalled();
  });

  it("creates as usual when embeddings are healthy", async () => {
    vi.mocked(prepareVaultCandidates).mockResolvedValue({
      ...PREPARED,
      embeddingsUnavailable: false,
      embeddingFailure: false,
    } as never);
    vi.mocked(rankPreparedVaultCandidates).mockResolvedValue(rankResult([]) as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "healthy" } as never);

    const result = await retain("Allergic to shellfish", ctx);

    expect(result.action).toBe("create");
    expect(result.memoryId).toBe("healthy");
  });
});
