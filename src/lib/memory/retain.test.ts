import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/memoryVault/operations", () => ({
  createVaultMemoryOp: vi.fn(),
  getVaultMemoryOp: vi.fn(),
  updateVaultMemoryOp: vi.fn(),
  getAllVaultMemoriesOp: vi.fn(),
  supersedeVaultMemoryOp: vi.fn(),
}));

vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

vi.mock("../memoryVault/searchTool", () => ({
  searchVaultMemories: vi.fn(),
}));

vi.mock("./consolidate", () => ({
  consolidateMemory: vi.fn(),
}));

import {
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
import { searchVaultMemories } from "../memoryVault/searchTool";

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
    vi.mocked(searchVaultMemories).mockResolvedValue([]);
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
    vi.mocked(searchVaultMemories).mockResolvedValue([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    // Scope unset → both search and write resolve to the DB default "private",
    // so dedup can't miss a private dupe or match across scopes.
    await retain("a fact", ctx);
    expect(vi.mocked(searchVaultMemories).mock.calls[0][4]).toMatchObject({
      scopes: ["private"],
    });
    expect(vi.mocked(createVaultMemoryOp).mock.calls[0][1]).toMatchObject({ scope: "private" });

    vi.clearAllMocks();
    vi.mocked(searchVaultMemories).mockResolvedValue([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    // Caller scope → used for both.
    await retain("a fact", ctx, { scope: "shared" });
    expect(vi.mocked(searchVaultMemories).mock.calls[0][4]).toMatchObject({ scopes: ["shared"] });
    expect(vi.mocked(createVaultMemoryOp).mock.calls[0][1]).toMatchObject({ scope: "shared" });
  });

  it("merges into the nearest match when cosine ≥ threshold", async () => {
    vi.mocked(searchVaultMemories).mockResolvedValue([
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
      })
    );
  });

  it("dedupes source chunk ids on merge (no duplicates if already present)", async () => {
    vi.mocked(searchVaultMemories).mockResolvedValue([
      { uniqueId: "id1", content: "Foo", similarity: 0.9 },
    ]);
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
    vi.mocked(searchVaultMemories).mockResolvedValue([
      { uniqueId: "target", content: "Foo", similarity: 0.99 },
    ]);
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
    vi.mocked(searchVaultMemories).mockResolvedValue([
      { uniqueId: "target", content: "Foo", similarity: 0.99 },
    ]);
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
    vi.mocked(searchVaultMemories).mockResolvedValue([
      { uniqueId: "near-dup", content: "Foo", similarity: 0.99 },
    ]);
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
    expect(vi.mocked(searchVaultMemories)).not.toHaveBeenCalled();
    expect(vi.mocked(updateVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("respects custom autoMergeThreshold", async () => {
    vi.mocked(searchVaultMemories).mockResolvedValue([]);
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

    expect(vi.mocked(searchVaultMemories)).toHaveBeenCalledWith(
      "Foo",
      mockVaultCtx,
      mockEmbeddingOptions,
      ctx.vaultCache,
      expect.objectContaining({ minSimilarity: 0.95 })
    );
  });

  it("creates with source + sourceChunkIds when provided", async () => {
    vi.mocked(searchVaultMemories).mockResolvedValue([]);
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
    vi.mocked(searchVaultMemories).mockResolvedValue([
      { uniqueId: "ghost", content: "x", similarity: 0.9 },
    ]);
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
    vi.mocked(searchVaultMemories).mockResolvedValue([]);
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
    vi.mocked(searchVaultMemories).mockResolvedValue([
      { uniqueId: "live-1" } as Awaited<ReturnType<typeof searchVaultMemories>>[number],
    ]);
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
    vi.mocked(searchVaultMemories).mockResolvedValue([
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
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "new-sf" } as never);
    vi.mocked(supersedeVaultMemoryOp).mockResolvedValue(true);

    const result = await retain("Lives in San Francisco", ctx, { consolidateOptions });

    expect(result).toMatchObject({
      action: "supersede",
      memoryId: "new-sf",
      targetId: "old-portland",
    });
    // New fact created fresh, old fact retired pointing at the new id.
    expect(vi.mocked(createVaultMemoryOp)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(supersedeVaultMemoryOp)).toHaveBeenCalledWith(
      mockVaultCtx,
      "old-portland",
      "new-sf"
    );
    // Strict cosine merge (Stage 2) must be skipped — only the one consolidate
    // search ran, so a changed value can't merge into some other row.
    expect(vi.mocked(searchVaultMemories)).toHaveBeenCalledTimes(1);
  });

  it("falls through to plain create when the supersede target vanished (race)", async () => {
    vi.mocked(searchVaultMemories)
      .mockResolvedValueOnce([{ uniqueId: "old", content: "x", similarity: 0.7 } as never]) // consolidate candidate search
      .mockResolvedValueOnce([]); // Stage-2 strict merge search on the create fall-through
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
    expect(vi.mocked(supersedeVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("does not retire the old fact when the new one is tombstone-suppressed", async () => {
    vi.mocked(searchVaultMemories).mockResolvedValue([
      { uniqueId: "old", content: "Lives in Portland", similarity: 0.7 } as never,
    ]);
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
    expect(vi.mocked(supersedeVaultMemoryOp)).not.toHaveBeenCalled();
  });
});
