import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/memoryVault/operations", () => ({
  createVaultMemoryOp: vi.fn(),
  createSupersedingMemoryOp: vi.fn(),
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
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import { consolidateMemory } from "./consolidate";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants";
import { generateEmbedding } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { prepareVaultCandidates, rankPreparedVaultCandidates } from "../memoryVault/searchTool";

import { retain } from "./retain";

const mockVaultCtx = {} as VaultMemoryOperationsContext;
const mockEmbeddingOptions: EmbeddingOptions = { apiKey: "test-key" };

const ctx = {
  vaultCtx: mockVaultCtx,
  embeddingOptions: mockEmbeddingOptions,
  vaultCache: new Map<string, Float32Array>(),
};

// B2 — retain() now prepares the candidate set once (prepareVaultCandidates) and ranks it
// per stage (rankPreparedVaultCandidates: Stage 1 consolidate topK@0.65, Stage 2 merge 1@0.85).
// These helpers keep the tests expressed as "what the vault surfaces": set ranked results, and
// let the prepare mock mirror generateEmbedding so the create-path reused query embedding stays
// consistent with each test's generateEmbedding mock.
type VaultMatch = { uniqueId: string; content?: string; similarity?: number };
function rankResult(results: VaultMatch[]) {
  return {
    results: results as never,
    vaultSize: results.length,
    reranked: false,
    hadV2Head: results.length > 0,
  };
}
/** Set the ranked results returned to every stage (Stage 1 + Stage 2 share the value). */
function setVaultMatches(results: VaultMatch[]) {
  vi.mocked(rankPreparedVaultCandidates).mockResolvedValue(rankResult(results));
}
/** Queue per-stage ranked results in order (Stage 1, then Stage 2, ...). */
function setVaultMatchesOnce(...stages: VaultMatch[][]) {
  const m = vi.mocked(rankPreparedVaultCandidates);
  for (const s of stages) m.mockResolvedValueOnce(rankResult(s));
}

beforeEach(() => {
  vi.clearAllMocks();
  ctx.vaultCache.clear();
  // Prepare mirrors generateEmbedding so `prepared.queryEmbedding` equals each test's embedding
  // mock — the create path reuses it (B2), so tombstone/create assertions stay transparent.
  vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
  vi.mocked(prepareVaultCandidates).mockImplementation((async (query, _vaultCtx, embOpts) => ({
    embeddedItems: [],
    queryEmbedding: await vi.mocked(generateEmbedding)(query as string, embOpts as never),
    vaultSize: 0,
    metaById: new Map(),
    deferDecrypt: true,
  })) as never);
  vi.mocked(rankPreparedVaultCandidates).mockResolvedValue(rankResult([]));
});

describe("retain", () => {
  it("throws on empty content", async () => {
    await expect(retain("", ctx)).rejects.toThrow();
    await expect(retain("   ", ctx)).rejects.toThrow();
  });

  it("creates a new memory when no similar match exists", async () => {
    setVaultMatches([]);
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
    setVaultMatches([]);
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
    setVaultMatches([]);
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
    setVaultMatches([
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
    setVaultMatches([
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
    setVaultMatches([
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
    setVaultMatches([
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
    setVaultMatches([]); // deleted row not returned
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
    setVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    await retain("Works in engineering", ctx, { factType: "identity" });

    expect(vi.mocked(createVaultMemoryOp).mock.calls[0][1]).toMatchObject({
      factType: "identity",
    });
  });

  it("lazily backfills factType on merge when the target has none (PR1)", async () => {
    setVaultMatches([{ uniqueId: "id1", content: "Foo", similarity: 0.92 }]);
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
    setVaultMatches([{ uniqueId: "id1", content: "Foo", similarity: 0.92 }]);
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
    setVaultMatches([{ uniqueId: "id1", content: "Foo", similarity: 0.9 }]);
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
    setVaultMatches([{ uniqueId: "target", content: "Foo", similarity: 0.99 }]);
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
    setVaultMatches([{ uniqueId: "target", content: "Foo", similarity: 0.99 }]);
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
    setVaultMatches([{ uniqueId: "near-dup", content: "Foo", similarity: 0.99 }]);
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
    // no vault load/search at all when autoMerge is off
    expect(vi.mocked(prepareVaultCandidates)).not.toHaveBeenCalled();
    expect(vi.mocked(rankPreparedVaultCandidates)).not.toHaveBeenCalled();
    expect(vi.mocked(updateVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("respects custom autoMergeThreshold", async () => {
    setVaultMatches([]);
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

    // B2 — the threshold is applied at Stage 2's rank of the shared prepared set.
    expect(vi.mocked(rankPreparedVaultCandidates)).toHaveBeenCalledWith(
      "Foo",
      expect.anything(),
      mockVaultCtx,
      mockEmbeddingOptions,
      expect.objectContaining({ minSimilarity: 0.95 })
    );
  });

  it("creates with source + sourceChunkIds when provided", async () => {
    setVaultMatches([]);
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
    setVaultMatches([{ uniqueId: "ghost", content: "x", similarity: 0.9 }]);
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
    setVaultMatches([]);
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
    // cosine([1,0,0],[0.8,0.6,0]) = 0.8 < 0.85
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([row("dead-1", [0.8, 0.6, 0], true)]);
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
    setVaultMatches([{ uniqueId: "live-1" }]);
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
    setVaultMatches([
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
    // Stage 1's rank ran over the single prepared candidate set.
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
    expect(vi.mocked(prepareVaultCandidates)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(rankPreparedVaultCandidates)).toHaveBeenCalledTimes(1);
  });

  it("falls through to plain create when the supersede target vanished (race)", async () => {
    setVaultMatchesOnce(
      [{ uniqueId: "old", content: "x", similarity: 0.7 }], // Stage 1 consolidate candidate
      [] // Stage 2 strict merge on the create fall-through
    );
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
    setVaultMatches([{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 } as never]);
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
    setVaultMatchesOnce([{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 }]);
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

  it("falls through to plain create when the target is already superseded", async () => {
    setVaultMatchesOnce(
      [{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 }], // Stage 1 consolidate candidate
      [] // Stage 2 strict merge on the fall-through
    );
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

describe("retain — B2 shared-fetch call counts", () => {
  const consolidateOptions = { apiKey: "k" };

  it("consolidation enabled, non-supersede: prepares once, embeds once, ranks twice", async () => {
    // Stage 1 surfaces a candidate; the LLM says "create" (→ fall through); Stage 2 finds no
    // strict merge → create. Both stages rank the SAME prepared set.
    setVaultMatchesOnce(
      [{ uniqueId: "cand", content: "similar", similarity: 0.7 }], // Stage 1 consolidate
      [] // Stage 2 strict merge
    );
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "create" } as never);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "new" } as never);

    await retain("a fact", ctx, { consolidateOptions });

    expect(vi.mocked(prepareVaultCandidates)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(rankPreparedVaultCandidates)).toHaveBeenCalledTimes(2);
    // Query embedded once (inside prepare); the create path REUSES prepared.queryEmbedding.
    expect(vi.mocked(generateEmbedding)).toHaveBeenCalledTimes(1);
  });

  it("consolidation disabled: prepares once, embeds once, ranks once (Stage 2 only)", async () => {
    setVaultMatches([]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "new" } as never);

    await retain("a fact", ctx);

    expect(vi.mocked(prepareVaultCandidates)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(rankPreparedVaultCandidates)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generateEmbedding)).toHaveBeenCalledTimes(1);
  });

  it("non-supersede + respectTombstones: reuses the query embedding (one embed, one tombstone load)", async () => {
    setVaultMatches([]);
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]); // tombstone scan finds nothing
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "new" } as never);

    await retain("a fact", ctx, { respectTombstones: true });

    // Query embedded once total: prepare embeds it, and both the create write AND the tombstone
    // scan reuse prepared.queryEmbedding rather than re-embedding.
    expect(vi.mocked(generateEmbedding)).toHaveBeenCalledTimes(1);
    // The live-candidate load (prepare) and the includeDeleted tombstone load are separate
    // universes; folding them into one is deferred cross-call work, so still two loads total —
    // but only the tombstone one goes through getAllVaultMemoriesOp directly here.
    expect(vi.mocked(getAllVaultMemoriesOp)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getAllVaultMemoriesOp).mock.calls[0][1]).toMatchObject({
      includeDeleted: true,
    });
  });

  it("supersede path: skips Stage 2 (ranks once) and re-embeds the refined content", async () => {
    setVaultMatchesOnce([{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 }]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      content: "Lives in San Francisco",
    } as never);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({ uniqueId: "old" } as never);
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({
      created: { uniqueId: "new" } as never,
      retired: true,
    });

    await retain("Lives in San Francisco", ctx, { consolidateOptions });

    // Stage 2 skipped on supersede → only Stage 1 ranked.
    expect(vi.mocked(rankPreparedVaultCandidates)).toHaveBeenCalledTimes(1);
    // Two embeds: prepare (query) + the fresh embed of the consolidator's refined content
    // (differs from the query, so it can't reuse prepared.queryEmbedding).
    expect(vi.mocked(generateEmbedding)).toHaveBeenCalledTimes(2);
  });
});
