import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/memoryVault/operations", () => ({
  createVaultMemoryOp: vi.fn(),
  getVaultMemoryOp: vi.fn(),
  updateVaultMemoryOp: vi.fn(),
}));

vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

vi.mock("../memoryVault/searchTool", () => ({
  searchVaultMemories: vi.fn(),
}));

import {
  createVaultMemoryOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
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

  it("PR5: un-archives (restores) an archived row on re-observe instead of duplicating", async () => {
    vi.mocked(searchVaultMemories).mockResolvedValue([
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
    expect(vi.mocked(searchVaultMemories).mock.calls[0][4]).toMatchObject({
      includeArchived: true,
    });
    // The merge write restores the row and lets updated_at bump (no preserve).
    const updateArgs = vi.mocked(updateVaultMemoryOp).mock.calls[0][2];
    expect(updateArgs).toMatchObject({ restore: true, proofCountIncrement: 1 });
    expect(updateArgs).not.toHaveProperty("preserveUpdatedAt");
    expect(vi.mocked(createVaultMemoryOp)).not.toHaveBeenCalled();
  });

  it("PR5: an ACTIVE merge target preserves updated_at and does not set restore", async () => {
    vi.mocked(searchVaultMemories).mockResolvedValue([
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

  it("persists factType on the create path (PR1)", async () => {
    vi.mocked(searchVaultMemories).mockResolvedValue([]);
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(createVaultMemoryOp).mockResolvedValue({ uniqueId: "id" } as never);

    await retain("Works in engineering", ctx, { factType: "identity" });

    expect(vi.mocked(createVaultMemoryOp).mock.calls[0][1]).toMatchObject({
      factType: "identity",
    });
  });

  it("lazily backfills factType on merge when the target has none (PR1)", async () => {
    vi.mocked(searchVaultMemories).mockResolvedValue([
      { uniqueId: "id1", content: "Foo", similarity: 0.92 },
    ]);
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
    vi.mocked(searchVaultMemories).mockResolvedValue([
      { uniqueId: "id1", content: "Foo", similarity: 0.92 },
    ]);
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
