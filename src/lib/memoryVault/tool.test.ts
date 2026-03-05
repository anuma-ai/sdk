import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryVaultTool } from "./tool";
import type { MemoryStore } from "./memoryStore";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import { createVaultEmbeddingCache } from "./lruCache";

vi.mock("./searchTool", () => ({
  eagerEmbedContent: vi.fn().mockResolvedValue(undefined),
}));

import { eagerEmbedContent } from "./searchTool";

const mockStore: MemoryStore = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

function makeStoredMemory(overrides: Partial<StoredVaultMemory> = {}): StoredVaultMemory {
  return {
    uniqueId: "mem-1",
    content: "User likes cats",
    scope: "private",
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

  it("creates a new memory with default scope 'private'", async () => {
    const created = makeStoredMemory({ uniqueId: "new-1" });
    vi.mocked(mockStore.create).mockResolvedValue(created);

    const tool = createMemoryVaultTool(mockStore);
    const result = await tool.executor!({ content: "User likes dogs" });

    expect(mockStore.create).toHaveBeenCalledWith({
      content: "User likes dogs",
      scope: "private",
    });
    expect(result).toBe("Memory saved successfully (ID: new-1).");
  });

  it("passes explicit scope to store.create", async () => {
    vi.mocked(mockStore.create).mockResolvedValue(makeStoredMemory());

    const tool = createMemoryVaultTool(mockStore, { scope: "shared" });
    await tool.executor!({ content: "shared fact" });

    expect(mockStore.create).toHaveBeenCalledWith({
      content: "shared fact",
      scope: "shared",
    });
  });

  it("does NOT pass scope to store.update", async () => {
    const existing = makeStoredMemory({
      uniqueId: "mem-1",
      content: "old content",
    });
    const updated = makeStoredMemory({
      uniqueId: "mem-1",
      content: "new content",
    });

    vi.mocked(mockStore.getById).mockResolvedValue(existing);
    vi.mocked(mockStore.update).mockResolvedValue(updated);

    const tool = createMemoryVaultTool(mockStore, { scope: "shared" });
    const result = await tool.executor!({
      content: "new content",
      id: "mem-1",
    });

    expect(mockStore.update).toHaveBeenCalledWith("mem-1", {
      content: "new content",
    });
    expect(result).toBe("Memory updated successfully (ID: mem-1).");
  });

  it("returns an error when updating a non-existent memory", async () => {
    vi.mocked(mockStore.getById).mockResolvedValue(null);

    const tool = createMemoryVaultTool(mockStore);
    const result = await tool.executor!({
      content: "new content",
      id: "missing-id",
    });

    expect(result).toContain('Memory with ID "missing-id" not found');
    expect(mockStore.update).not.toHaveBeenCalled();
  });

  it("returns an error when store.update returns null", async () => {
    vi.mocked(mockStore.getById).mockResolvedValue(makeStoredMemory({ uniqueId: "mem-1" }));
    vi.mocked(mockStore.update).mockResolvedValue(null);

    const tool = createMemoryVaultTool(mockStore);
    const result = await tool.executor!({
      content: "new content",
      id: "mem-1",
    });

    expect(result).toContain('Failed to update memory "mem-1"');
  });

  it("returns an error when content is missing or invalid", async () => {
    const tool = createMemoryVaultTool(mockStore);

    expect(await tool.executor!({})).toBe("Error: content is required and must be a string.");
    expect(await tool.executor!({ content: "" })).toBe(
      "Error: content is required and must be a string."
    );
    expect(await tool.executor!({ content: 123 })).toBe(
      "Error: content is required and must be a string."
    );
  });

  it("catches errors thrown by database operations", async () => {
    vi.mocked(mockStore.create).mockRejectedValue(new Error("DB write failed"));

    const tool = createMemoryVaultTool(mockStore);
    const result = await tool.executor!({ content: "test" });

    expect(result).toBe("Error saving memory: DB write failed");
  });

  // ── onSave confirmation flow ───────────────────────────────

  describe("onSave confirmation flow", () => {
    it("calls onSave with add operation including scope and proceeds when accepted", async () => {
      const onSave = vi.fn().mockResolvedValue(true);
      vi.mocked(mockStore.create).mockResolvedValue(makeStoredMemory({ uniqueId: "new-1" }));

      const tool = createMemoryVaultTool(mockStore, { onSave, scope: "shared" });
      const result = await tool.executor!({
        content: "User prefers dark mode",
      });

      expect(onSave).toHaveBeenCalledWith({
        action: "add",
        content: "User prefers dark mode",
        scope: "shared",
      });
      expect(mockStore.create).toHaveBeenCalled();
      expect(result).toBe("Memory saved successfully (ID: new-1).");
    });

    it("does NOT include scope in onSave for update operations", async () => {
      const onSave = vi.fn().mockResolvedValue(true);
      vi.mocked(mockStore.getById).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "old preference" })
      );
      vi.mocked(mockStore.update).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "new preference" })
      );

      const tool = createMemoryVaultTool(mockStore, { onSave, scope: "shared" });
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

      const tool = createMemoryVaultTool(mockStore, { onSave });
      const result = await tool.executor!({ content: "rejected content" });

      expect(mockStore.create).not.toHaveBeenCalled();
      expect(result).toBe("Memory save was cancelled by the user. No memory was created.");
    });

    it("cancels update when onSave returns false", async () => {
      const onSave = vi.fn().mockResolvedValue(false);
      vi.mocked(mockStore.getById).mockResolvedValue(makeStoredMemory({ uniqueId: "mem-1" }));

      const tool = createMemoryVaultTool(mockStore, { onSave });
      const result = await tool.executor!({
        content: "rejected update",
        id: "mem-1",
      });

      expect(mockStore.update).not.toHaveBeenCalled();
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
      vi.mocked(mockStore.create).mockResolvedValue(makeStoredMemory({ uniqueId: "new-1" }));

      const tool = createMemoryVaultTool(mockStore, undefined, embeddingOptions, cache);
      await tool.executor!({ content: "embed this" });

      expect(eagerEmbedContent).toHaveBeenCalledWith("embed this", embeddingOptions, cache);
    });

    it("evicts old cache entry and embeds new content on update", async () => {
      vi.mocked(mockStore.getById).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "old content" })
      );
      vi.mocked(mockStore.update).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "new content" })
      );
      cache.set("old content", [1, 2, 3]);

      const tool = createMemoryVaultTool(mockStore, undefined, embeddingOptions, cache);
      await tool.executor!({ content: "new content", id: "mem-1" });

      expect(cache.has("old content")).toBe(false);
      expect(eagerEmbedContent).toHaveBeenCalledWith("new content", embeddingOptions, cache);
    });
  });
});
