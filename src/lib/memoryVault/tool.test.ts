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

  it("opts into runToolLoop PII de-anonymization and passes real content to onSave + storage", async () => {
    // De-anonymization of saved content is delegated to runToolLoop: it restores
    // placeholders in the arguments (with the call's redactor) BEFORE the executor
    // runs — proven by toolLoop.piiRedaction.test.ts ("de-anonymizes tool arguments
    // for tools that opt in via deAnonymizeArgs"). The tool just opts in; the
    // executor then forwards the already-real content to both onSave and storage.
    // (executor-receives-real-content + this passthrough = onSave/storage see real
    // values, the guarantee the old per-tool deAnonymize option used to provide.)
    const onSave = vi.fn().mockResolvedValue(true);
    vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "new-1" }));

    const tool = createMemoryVaultTool(mockVaultCtx, { onSave });
    expect(tool.deAnonymizeArgs).toBe(true);

    await tool.executor!({ content: "User's email is bob@acme.com" });

    // The confirmation callback and the vault both receive the real value verbatim.
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ content: "User's email is bob@acme.com" })
    );
    expect(createVaultMemoryOp).toHaveBeenCalledWith(mockVaultCtx, {
      content: "User's email is bob@acme.com",
      scope: "private",
    });
  });

  it("PR5: threads a valid `type` arg to createVaultMemoryOp as factType", async () => {
    vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "typed-1" }));

    const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm);
    await tool.executor!({ content: "Allergic to shellfish", type: "constraint" });

    expect(createVaultMemoryOp).toHaveBeenCalledWith(mockVaultCtx, {
      content: "Allergic to shellfish",
      scope: "private",
      factType: "constraint",
    });
  });

  it("PR5: drops an unknown `type` arg (persists untyped, no factType)", async () => {
    vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "untyped-1" }));

    const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm);
    await tool.executor!({ content: "some fact", type: "banana" });

    expect(createVaultMemoryOp).toHaveBeenCalledWith(mockVaultCtx, {
      content: "some fact",
      scope: "private",
    });
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

  describe("write seam (retain-backed hosts)", () => {
    it("routes a NEW memory through `write` instead of createVaultMemoryOp, with folder + type", async () => {
      const write = vi.fn().mockResolvedValue({ memoryId: "kept-1", action: "create" });
      const folderMap = new Map([["Work", "folder-work"]]);
      const tool = createMemoryVaultTool(mockVaultCtx, {
        ...autoConfirm,
        write,
        folderMap,
        scope: "shared",
      });

      const result = await tool.executor!({
        content: "User works at Riverbend",
        folderName: "Work",
        type: "identity",
      });

      expect(write).toHaveBeenCalledWith({
        content: "User works at Riverbend",
        scope: "shared",
        folderId: "folder-work",
        factType: "identity",
      });
      expect(createVaultMemoryOp).not.toHaveBeenCalled();
      expect(eagerEmbedContent).not.toHaveBeenCalled();
      expect(result).toBe("Memory saved successfully (ID: kept-1).");
    });

    it("tells the model a merge is 'already known', not a new save", async () => {
      // The two documented failure loops (re-saving a search result, save→verify→
      // save) both run on the model believing each call created something.
      const write = vi.fn().mockResolvedValue({ memoryId: "existing-7", action: "merge" });
      const tool = createMemoryVaultTool(mockVaultCtx, { ...autoConfirm, write });

      const result = await tool.executor!({ content: "User likes cats" });

      expect(result).toContain("already holds this fact (ID: existing-7)");
      expect(result).toContain("do not save it again");
      expect(result).not.toMatch(/^Memory saved/);
    });

    it("reports a suppressed write as refused, and a supersede as a replacement", async () => {
      const write = vi
        .fn()
        .mockResolvedValueOnce({ memoryId: "tomb-1", action: "suppressed" })
        .mockResolvedValueOnce({ memoryId: "new-2", action: "supersede" });
      const tool = createMemoryVaultTool(mockVaultCtx, { ...autoConfirm, write });

      expect(await tool.executor!({ content: "A" })).toBe(
        "Not saved: this matches a memory the user previously deleted. Do not re-save it."
      );
      expect(await tool.executor!({ content: "B" })).toBe(
        "Memory saved successfully (ID: new-2); it replaces an earlier version of this fact."
      );
    });

    it("still asks onSave first and honours a cancel before writing", async () => {
      const write = vi.fn();
      const onSave = vi.fn().mockResolvedValue(false);
      const tool = createMemoryVaultTool(mockVaultCtx, { onSave, write });

      const result = await tool.executor!({ content: "User likes cats" });

      expect(onSave).toHaveBeenCalledWith({
        action: "add",
        content: "User likes cats",
        scope: "private",
      });
      expect(write).not.toHaveBeenCalled();
      expect(result).toContain("cancelled");
    });

    it("does NOT use `write` for an id-addressed update", async () => {
      const write = vi.fn();
      vi.mocked(getVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "mem-1" }));
      vi.mocked(updateVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "new" })
      );
      const tool = createMemoryVaultTool(mockVaultCtx, { ...autoConfirm, write });

      await tool.executor!({ id: "mem-1", content: "new" });

      expect(write).not.toHaveBeenCalled();
      expect(updateVaultMemoryOp).toHaveBeenCalled();
    });

    it("reports the settled outcome to onWritten, and a rejecting async listener cannot fail the save", async () => {
      const write = vi.fn().mockResolvedValue({ memoryId: "kept-9", action: "merge" });
      // Async so the rejection would surface as an unhandled promise if the
      // tool did not await it (greptile P1 on #931).
      const onWritten = vi.fn(async () => {
        throw new Error("listener bug");
      });
      const tool = createMemoryVaultTool(mockVaultCtx, { ...autoConfirm, write, onWritten });

      const result = await tool.executor!({ content: "User likes cats" });

      expect(onWritten).toHaveBeenCalledWith({
        input: { content: "User likes cats", scope: "private" },
        outcome: { memoryId: "kept-9", action: "merge" },
      });
      expect(result).toContain("already holds this fact");
    });

    it("fires onWritten as `create` on the direct-insert path too, so a bare caller's analytics see every save", async () => {
      vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "direct-3" }));
      const onWritten = vi.fn();
      const tool = createMemoryVaultTool(mockVaultCtx, { ...autoConfirm, onWritten });

      const result = await tool.executor!({ content: "User likes dogs", type: "preference" });

      expect(onWritten).toHaveBeenCalledWith({
        input: { content: "User likes dogs", scope: "private", factType: "preference" },
        outcome: { memoryId: "direct-3", action: "create" },
      });
      expect(result).toBe("Memory saved successfully (ID: direct-3).");
    });

    it("surfaces a writer failure as the tool's error string", async () => {
      const write = vi.fn().mockRejectedValue(new Error("embedding endpoint down"));
      const tool = createMemoryVaultTool(mockVaultCtx, { ...autoConfirm, write });

      expect(await tool.executor!({ content: "X" })).toBe(
        "Error saving memory: embedding endpoint down"
      );
    });
  });

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

    it("re-embeds new content on update (cache invalidation is by id via eagerEmbedContent)", async () => {
      vi.mocked(getVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "old content" })
      );
      vi.mocked(updateVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "new content" })
      );
      // Cache invalidation is by id: eagerEmbedContent overwrites the id-keyed
      // entry with the new vector — no separate delete-by-content step.
      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);
      await tool.executor!({ content: "new content", id: "mem-1" });

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
