import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryVaultTool } from "./tool";
import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import { createVaultEmbeddingCache } from "./lruCache";

vi.mock("../db/memoryVault/operations", () => ({
  createVaultMemoryOp: vi.fn(),
  getVaultMemoryOp: vi.fn(),
  updateVaultMemoryOp: vi.fn(),
}));

vi.mock("./searchTool", () => ({
  eagerEmbedContent: vi.fn().mockResolvedValue(undefined),
}));

import {
  createVaultMemoryOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
} from "../db/memoryVault/operations";
import { eagerEmbedContent } from "./searchTool";

const mockVaultCtx = {} as VaultMemoryOperationsContext;

/** Auto-confirming onSave so the tool gets an executor */
const autoConfirm = { onSave: async () => true as const };

function makeStoredMemory(overrides: Partial<StoredVaultMemory> = {}): StoredVaultMemory {
  return {
    uniqueId: "mem-1",
    content: "User likes cats",
    scope: "private",
    folderId: null,
    userId: null,
    embedding: null,
    embeddingModel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    ...overrides,
  };
}

describe("createMemoryVaultTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has no executor when created without onSave", () => {
    const tool = createMemoryVaultTool(mockVaultCtx);
    expect(tool.executor).toBeUndefined();
    expect(tool.function.name).toBe("memory_vault_save");
  });

  it("creates a new memory with default scope 'private'", async () => {
    const created = makeStoredMemory({ uniqueId: "new-1" });
    vi.mocked(createVaultMemoryOp).mockResolvedValue(created);

    const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm);
    const result = await tool.executor!({ content: "User likes dogs" });

    expect(createVaultMemoryOp).toHaveBeenCalledWith(mockVaultCtx, {
      content: "User likes dogs",
      scope: "private",
    });
    expect(result).toBe("Memory saved successfully (ID: new-1).");
  });

  it("passes explicit scope to createVaultMemoryOp", async () => {
    vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory());

    const tool = createMemoryVaultTool(mockVaultCtx, { ...autoConfirm, scope: "shared" });
    await tool.executor!({ content: "shared fact" });

    expect(createVaultMemoryOp).toHaveBeenCalledWith(mockVaultCtx, {
      content: "shared fact",
      scope: "shared",
    });
  });

  it("does NOT pass scope to updateVaultMemoryOp", async () => {
    const existing = makeStoredMemory({
      uniqueId: "mem-1",
      content: "old content",
    });
    const updated = makeStoredMemory({
      uniqueId: "mem-1",
      content: "new content",
    });

    vi.mocked(getVaultMemoryOp).mockResolvedValue(existing);
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(updated);

    const tool = createMemoryVaultTool(mockVaultCtx, { ...autoConfirm, scope: "shared" });
    const result = await tool.executor!({
      content: "new content",
      id: "mem-1",
    });

    expect(updateVaultMemoryOp).toHaveBeenCalledWith(mockVaultCtx, "mem-1", {
      content: "new content",
      embedding: null,
    });
    expect(result).toBe("Memory updated successfully (ID: mem-1).");
  });

  it("returns an error when updating a non-existent memory", async () => {
    vi.mocked(getVaultMemoryOp).mockResolvedValue(null);

    const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm);
    const result = await tool.executor!({
      content: "new content",
      id: "missing-id",
    });

    expect(result).toContain('Memory with ID "missing-id" not found');
    expect(updateVaultMemoryOp).not.toHaveBeenCalled();
  });

  it("returns an error when updateVaultMemoryOp returns null", async () => {
    vi.mocked(getVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "mem-1" }));
    vi.mocked(updateVaultMemoryOp).mockResolvedValue(null);

    const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm);
    const result = await tool.executor!({
      content: "new content",
      id: "mem-1",
    });

    expect(result).toContain('Failed to update memory "mem-1"');
  });

  it("returns an error when content is missing or invalid", async () => {
    const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm);

    expect(await tool.executor!({})).toBe("Error: content is required and must be a string.");
    expect(await tool.executor!({ content: "" })).toBe(
      "Error: content is required and must be a string."
    );
    expect(await tool.executor!({ content: 123 })).toBe(
      "Error: content is required and must be a string."
    );
  });

  it("catches errors thrown by database operations", async () => {
    vi.mocked(createVaultMemoryOp).mockRejectedValue(new Error("DB write failed"));

    const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm);
    const result = await tool.executor!({ content: "test" });

    expect(result).toBe("Error saving memory: DB write failed");
  });

  // ── folderName handling ─────────────────────────────────────

  describe("folderName handling", () => {
    const autoConfirm = async () => true;

    it("resolves folderName to folderId via folderMap when creating a new memory", async () => {
      vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "new-1" }));

      const folderMap = new Map([["Work", "folder_1"]]);
      const tool = createMemoryVaultTool(mockVaultCtx, { folderMap, onSave: autoConfirm });
      await tool.executor!({ content: "remember this", folderName: "Work" });

      expect(createVaultMemoryOp).toHaveBeenCalledWith(mockVaultCtx, {
        content: "remember this",
        scope: "private",
        folderId: "folder_1",
      });
    });

    it("resolves folderName to folderId via folderMap when updating a memory", async () => {
      const existing = makeStoredMemory({ uniqueId: "mem-1", content: "old" });
      const updated = makeStoredMemory({ uniqueId: "mem-1", content: "new" });
      vi.mocked(getVaultMemoryOp).mockResolvedValue(existing);
      vi.mocked(updateVaultMemoryOp).mockResolvedValue(updated);

      const folderMap = new Map([["Work", "folder_1"]]);
      const tool = createMemoryVaultTool(mockVaultCtx, { folderMap, onSave: autoConfirm });
      await tool.executor!({ content: "new", id: "mem-1", folderName: "Work" });

      expect(updateVaultMemoryOp).toHaveBeenCalledWith(mockVaultCtx, "mem-1", {
        content: "new",
        embedding: null,
        folderId: "folder_1",
      });
    });

    it("creates memory without folderId when folderName is not provided", async () => {
      vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "new-1" }));

      const tool = createMemoryVaultTool(mockVaultCtx, { onSave: autoConfirm });
      await tool.executor!({ content: "test" });

      expect(createVaultMemoryOp).toHaveBeenCalledWith(mockVaultCtx, {
        content: "test",
        scope: "private",
        folderId: undefined,
      });
    });
  });

  // ── onSave confirmation flow ───────────────────────────────

  describe("onSave confirmation flow", () => {
    it("calls onSave with add operation including scope and proceeds when accepted", async () => {
      const onSave = vi.fn().mockResolvedValue(true);
      vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "new-1" }));

      const tool = createMemoryVaultTool(mockVaultCtx, { onSave, scope: "shared" });
      const result = await tool.executor!({
        content: "User prefers dark mode",
      });

      expect(onSave).toHaveBeenCalledWith({
        action: "add",
        content: "User prefers dark mode",
        scope: "shared",
      });
      expect(createVaultMemoryOp).toHaveBeenCalled();
      expect(result).toBe("Memory saved successfully (ID: new-1).");
    });

    it("does NOT include scope in onSave for update operations", async () => {
      const onSave = vi.fn().mockResolvedValue(true);
      vi.mocked(getVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "old preference" })
      );
      vi.mocked(updateVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "new preference" })
      );

      const tool = createMemoryVaultTool(mockVaultCtx, { onSave, scope: "shared" });
      await tool.executor!({ content: "new preference", id: "mem-1" });

      expect(onSave).toHaveBeenCalledWith({
        action: "update",
        content: "new preference",
        id: "mem-1",
        previousContent: "old preference",
      });
    });

    it("cancels add when onSave returns false", async () => {
      const onSave = vi.fn().mockResolvedValue(false);

      const tool = createMemoryVaultTool(mockVaultCtx, { onSave });
      const result = await tool.executor!({ content: "rejected content" });

      expect(createVaultMemoryOp).not.toHaveBeenCalled();
      expect(result).toBe("Memory save was cancelled by the user. No memory was created.");
    });

    it("cancels update when onSave returns false", async () => {
      const onSave = vi.fn().mockResolvedValue(false);
      vi.mocked(getVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "mem-1" }));

      const tool = createMemoryVaultTool(mockVaultCtx, { onSave });
      const result = await tool.executor!({
        content: "rejected update",
        id: "mem-1",
      });

      expect(updateVaultMemoryOp).not.toHaveBeenCalled();
      expect(result).toContain("Memory update was cancelled by the user");
    });
  });

  // ── Eager embedding ────────────────────────────────────────

  describe("eager embedding", () => {
    const embeddingOptions = { apiKey: "test-key" };
    const cache = createVaultEmbeddingCache();

    beforeEach(() => {
      cache.clear();
    });

    it("eagerly embeds content after creating a new memory", async () => {
      vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "new-1" }));

      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);
      await tool.executor!({ content: "embed this" });

      expect(eagerEmbedContent).toHaveBeenCalledWith(
        "embed this",
        embeddingOptions,
        cache,
        mockVaultCtx,
        "new-1"
      );
    });

    it("evicts old cache entry and embeds new content on update", async () => {
      vi.mocked(getVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "old content" })
      );
      vi.mocked(updateVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "new content" })
      );
      cache.set("old content", [1, 2, 3]);

      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);
      await tool.executor!({ content: "new content", id: "mem-1" });

      expect(cache.has("old content")).toBe(false);
      expect(eagerEmbedContent).toHaveBeenCalledWith(
        "new content",
        embeddingOptions,
        cache,
        mockVaultCtx,
        "mem-1"
      );
    });
  });
});
