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
  vi.mocked(prepareVaultCandidates).mockResolvedValue(prepared(queryEmbedding) as never);
  vi.mocked(rankPreparedVaultCandidates).mockResolvedValue(rankResult(results) as never);
}

function mockVaultMatchesOnce(results: VaultMatch[], queryEmbedding = [0.1, 0.2, 0.3]) {
  vi.mocked(prepareVaultCandidates).mockResolvedValue(prepared(queryEmbedding) as never);
  vi.mocked(rankPreparedVaultCandidates).mockResolvedValueOnce(rankResult(results) as never);
}

import { cachedRowVector } from "../memoryVault/vectorVersion";
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

  it("tags its cache write with the committed row's version", async () => {
    mockVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    const committedAt = new Date("2026-09-01T00:00:00Z");
    vi.mocked(createVaultMemoryOp).mockResolvedValue({
      uniqueId: "new-id",
      updatedAt: committedAt,
    } as never);

    await retain("Allergic to shellfish", ctx);

    expect(cachedRowVector(ctx.vaultCache, "new-id", committedAt)).toBeDefined();
  });

  it("scopes the dedup search to the same scope it writes (H2)", async () => {
    mockVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    await retain("a fact", ctx);
    expect(vi.mocked(prepareVaultCandidates).mock.calls[0][4]).toMatchObject({
      scopes: ["private"],
    });
    expect(vi.mocked(createVaultMemoryOp).mock.calls[0][1]).toMatchObject({ scope: "private" });

    vi.clearAllMocks();
    mockVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    await retain("a fact", ctx, { scope: "shared" });
    expect(vi.mocked(prepareVaultCandidates).mock.calls[0][4]).toMatchObject({
      scopes: ["shared"],
    });
    expect(vi.mocked(createVaultMemoryOp).mock.calls[0][1]).toMatchObject({ scope: "shared" });
  });

  it("never offers a kinded (profile) memory as a merge or supersede candidate", async () => {
    vi.mocked(prepareVaultCandidates).mockResolvedValue({
      ...PREPARED,
      memories: [
        { uniqueId: "kinded", kind: "occupation" },
        { uniqueId: "free", kind: null },
      ],
      embeddedItems: [
        { id: "kinded", content: "Works at Google", embedding: [0.1, 0.2, 0.3] },
        { id: "free", content: "Likes Google products", embedding: [0.1, 0.2, 0.3] },
      ],
    } as never);
    vi.mocked(rankPreparedVaultCandidates).mockResolvedValue(rankResult([]) as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "new" } as never);

    await retain("Works at Riverbend", ctx, {
      consolidateOptions: {} as never,
    });

    const rankedSets = vi.mocked(rankPreparedVaultCandidates).mock.calls.map((c) => c[1]);
    expect(rankedSets.length).toBeGreaterThan(0);
    for (const set of rankedSets) {
      expect(set.memories.map((m) => m.uniqueId)).toEqual(["free"]);
      expect(set.embeddedItems.map((item) => item.id)).toEqual(["free"]);
    }
  });

  it("creates instead of merging when the target became a profile memory mid-retain", async () => {
    mockVaultMatches([{ uniqueId: "turned", content: "Works at Google", similarity: 0.95 }]);
    const row = {
      uniqueId: "turned",
      content: "Works at Google",
      scope: "private",
      folderId: null,
      userId: null,
      embedding: null,
      sourceChunkIds: [],
      proofCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };
    vi.mocked(getVaultMemoryOp)
      .mockResolvedValueOnce({ ...row, kind: null } as never)
      .mockResolvedValueOnce({ ...row, kind: "occupation" } as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(null);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "new" } as never);

    const result = await retain("Works at Google", ctx);

    expect(vi.mocked(updateVaultMemoryOp).mock.calls[0][2]).toMatchObject({ freeFormOnly: true });
    expect(result).toMatchObject({ action: "create", memoryId: "new" });
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
    expect(result.similarity).toBe(0.92);
    expect(result.consolidation).toBeUndefined();
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
    expect(vi.mocked(updateVaultMemoryOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      "existing-id",
      expect.objectContaining({
        proofCountIncrement: 1,
        sourceChunkIds: ["msg-old", "msg-new"],
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
      archivedAt: Date.now() - 1000,
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
    expect(vi.mocked(prepareVaultCandidates).mock.calls[0][4]).toMatchObject({
      includeArchived: true,
    });
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
      archivedAt: Date.now() - 1000,
      supersededBy: "lives-in-sf-id",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    } as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "fresh-id" } as never);

    const result = await retain("Lives in Portland", ctx, { sourceChunkIds: ["msg-new"] });

    expect(vi.mocked(updateVaultMemoryOp)).not.toHaveBeenCalled();
    expect(result.action).toBe("create");
    expect(result.memoryId).toBe("fresh-id");
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalled();
  });

  it("PR5 + tombstone: does NOT resurrect a deleted match (search excludes it → tombstone create-gate suppresses)", async () => {
    mockVaultMatches([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
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

    expect(vi.mocked(updateVaultMemoryOp)).not.toHaveBeenCalled();
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
    expect(result.action).toBe("suppressed");
    expect(result.tombstoneId).toBe("dead-id");
    expect(result.similarity).toBeCloseTo(1, 5);
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
    mockVaultMatches([{ uniqueId: "target", content: "Foo", similarity: 0.99 }]);
    vi.mocked(getVaultMemoryOp).mockResolvedValueOnce(mergeTarget).mockResolvedValue(null);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(null);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "created-fresh" } as never);

    const result = await retain("Foo", ctx, { sourceChunkIds: ["msg-x"] });

    expect(vi.mocked(updateVaultMemoryOp)).toHaveBeenCalled();
    expect(result.action).toBe("create");
    expect(result.memoryId).toBe("created-fresh");
    expect(result.proofCount).toBe(1);
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalled();
  });

  it("throws (no duplicate create) when the merge write fails but the target still exists", async () => {
    mockVaultMatches([{ uniqueId: "target", content: "Foo", similarity: 0.99 }]);
    vi.mocked(getVaultMemoryOp).mockResolvedValue(mergeTarget);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(null);
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
  const MODEL = DEFAULT_API_EMBEDDING_MODEL;
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
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([row("dead-1", [0.6, 0.8, 0], true)]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue(row("new-1", [1, 0, 0], false));

    const result = await retain("Likes tea", ctx, { respectTombstones: true });

    expect(result.action).toBe("create");
    expect(createVaultMemoryOp).toHaveBeenCalledOnce();
  });

  it("ignores tombstones embedded with a different model", async () => {
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
    mockVaultMatches([
      { uniqueId: "old-portland", content: "Lives in Portland", similarity: 0.7 } as never,
    ]);
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
      consolidation: "supersede",
    });
    expect(vi.mocked(createSupersedingMemoryOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      expect.objectContaining({ content: "Lives in San Francisco" }),
      "old-portland"
    );
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
    expect(vi.mocked(prepareVaultCandidates)).toHaveBeenCalledTimes(1);
  });

  it("falls through to plain create when the supersede target vanished (race)", async () => {
    mockVaultMatchesOnce([{ uniqueId: "old", content: "x", similarity: 0.7 }]);
    mockVaultMatchesOnce([]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      content: "new",
    });
    vi.mocked(getVaultMemoryOp).mockResolvedValue(null);
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
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
    expect(vi.mocked(createSupersedingMemoryOp)).not.toHaveBeenCalled();
  });

  it("falls back to a plain create when the atomic supersede loses the race", async () => {
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
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({
      created: { uniqueId: "light" } as never,
      retired: true,
    });
    vi.mocked(supersedeVaultMemoryOp).mockResolvedValue(true);

    const result = await retain("Prefers light mode in every app", ctx, { consolidateOptions });

    expect(result).toMatchObject({ action: "supersede", memoryId: "light", targetId: "d1" });
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
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({ created: null, retired: false });
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "light" } as never);

    const result = await retain("Prefers light mode", ctx, { consolidateOptions });

    expect(result).toMatchObject({ action: "create", memoryId: "light" });
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalledTimes(1);
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
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({
      created: { uniqueId: "light" } as never,
      retired: true,
    });
    vi.mocked(supersedeVaultMemoryOp).mockResolvedValue(false);
    vi.mocked(getVaultMemoryOp).mockResolvedValue({ uniqueId: "d2" } as never);

    const result = await retain("light", ctx, { consolidateOptions });

    expect(result).toMatchObject({ action: "supersede", memoryId: "light", targetId: "d1" });
    expect(vi.mocked(getVaultMemoryOp)).toHaveBeenCalledWith(mockVaultCtx, "d2");
  });

  it("falls through to plain create when the target is already superseded", async () => {
    mockVaultMatchesOnce([{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 }]);
    mockVaultMatchesOnce([]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      content: "Lives in San Francisco",
    });
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

describe("retain — a dropped consolidation decision is reported (#630)", () => {
  const liveRow = (uniqueId: string) => ({ uniqueId, content: "existing", proofCount: 1 });

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
    stages([{ uniqueId: "old", content: "Lives in Portland", similarity: 0.7 }]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "supersede",
      targetId: "old",
      content: "Lives in San Francisco",
    });
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "old",
      content: "Lives in Portland",
    } as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createSupersedingMemoryOp).mockResolvedValue({
      created: null as never,
      retired: false,
    });
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "plain-new" } as never);
    const onFallback = vi.fn();

    const result = await retain("Lives in San Francisco", ctx, {
      consolidateOptions: { apiKey: "k", onFallback },
    });

    expect(result).toMatchObject({ action: "create", memoryId: "plain-new" });
    expect(vi.mocked(createSupersedingMemoryOp)).toHaveBeenCalled();
    expect(onFallback).toHaveBeenCalledExactlyOnceWith("target_vanished");
  });

  it("stays silent when a supersede only PARTIALLY races — the decision still applied", async () => {
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
    stagesFor("gone");
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "noop", targetId: "gone" });
    vi.mocked(getVaultMemoryOp).mockResolvedValue(null as never);

    const result = await retain("dup fact", ctx, { consolidateOptions: { apiKey: "k" } });

    expect(result.action).toBe("create");
  });
});

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

    expect(vi.mocked(prepareVaultCandidates)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(rankPreparedVaultCandidates)).toHaveBeenCalledTimes(2);
  });

  it("prepares at the WIDEST limit either stage uses, not the narrowest", async () => {
    mockVaultMatches([]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "create", content: "Foo" });

    await retain("Foo", ctx, { consolidateOptions: { apiKey: "k" }, consolidateTopK: 20 });

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
    expect(calls[0][3]).toMatchObject({ limit: 20, minSimilarity: 0.55 });
    expect(calls[1][3]).toMatchObject({ limit: 1, minSimilarity: 0.8 });
  });

  it("resolves the documented defaults when the caller passes none (#768-G1)", async () => {
    mockVaultMatches([]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "create", content: "Foo" });
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    await retain("Foo", ctx, { consolidateOptions: { apiKey: "k" } });

    const rankCalls = vi.mocked(rankPreparedVaultCandidates).mock.calls;
    expect(rankCalls[0][3]).toMatchObject({ limit: 20, minSimilarity: 0.55 });
    expect(rankCalls[1][3]).toMatchObject({ minSimilarity: 0.8 });
    expect(vi.mocked(prepareVaultCandidates).mock.calls[0][4]).toMatchObject({ limit: 20 });
  });

  it("reuses the prepared query vector for the create write instead of re-embedding", async () => {
    mockVaultMatches([], [0.4, 0.5, 0.6]);

    await retain("Foo", ctx, {});

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

describe("retain — embeddings outage must not silently duplicate", () => {
  it("throws instead of creating when a PARTIAL row-batch failure hid the merge target", async () => {
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

describe("retain — the consolidation decision is reported on the result", () => {
  const consolidateOptions = { apiKey: "k" };

  it("stamps noop on the merge the consolidator asked for", async () => {
    mockVaultMatches([{ uniqueId: "live", content: "Lives in Portland", similarity: 0.7 }]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "noop", targetId: "live" });
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "live",
      content: "Lives in Portland",
      proofCount: 2,
      sourceChunkIds: [],
      eventTimeStart: null,
    } as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue({ proofCount: 3 } as never);

    const result = await retain("Lives in Portland, OR", ctx, { consolidateOptions });

    expect(result).toMatchObject({ action: "merge", memoryId: "live", consolidation: "noop" });
    expect(result.similarity).toBeUndefined();
  });

  it("stamps create when the consolidator explicitly chose it", async () => {
    mockVaultMatchesOnce([{ uniqueId: "other", content: "Owns a rope", similarity: 0.6 }]);
    mockVaultMatchesOnce([]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "create" });
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "fresh" } as never);

    const result = await retain("Climbs at Movement", ctx, { consolidateOptions });

    expect(result).toMatchObject({ action: "create", memoryId: "fresh", consolidation: "create" });
  });

  it("leaves a degraded fallback create unstamped — onFallback owns that signal", async () => {
    mockVaultMatchesOnce([{ uniqueId: "other", content: "Owns a rope", similarity: 0.6 }]);
    mockVaultMatchesOnce([]);
    vi.mocked(consolidateMemory).mockResolvedValue({
      action: "create",
      fallbackReason: "llm_error",
    });
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "fresh" } as never);

    const result = await retain("Climbs at Movement", ctx, { consolidateOptions });

    expect(result.action).toBe("create");
    expect(result.consolidation).toBeUndefined();
  });
});

describe("retain — a consolidator `create` survives the strict cosine stage", () => {
  it("stamps the decision on a Stage-2 merge, so the two stages' disagreement is visible", async () => {
    mockVaultMatchesOnce([{ uniqueId: "other", content: "Owns a rope", similarity: 0.6 }]);
    mockVaultMatchesOnce([{ uniqueId: "close", content: "Climbs at Movement", similarity: 0.93 }]);
    vi.mocked(consolidateMemory).mockResolvedValue({ action: "create" });
    vi.mocked(getVaultMemoryOp).mockResolvedValue({
      uniqueId: "close",
      content: "Climbs at Movement",
      proofCount: 1,
      sourceChunkIds: [],
      eventTimeStart: null,
    } as never);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue({ proofCount: 2 } as never);

    const result = await retain("Climbs at Movement gym", ctx, {
      consolidateOptions: { apiKey: "k" },
    });

    expect(result).toMatchObject({
      action: "merge",
      memoryId: "close",
      consolidation: "create",
    });
  });
});
