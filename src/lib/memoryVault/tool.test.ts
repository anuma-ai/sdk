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

// The CREATE path dynamically imports retain() when embeddings are available;
// mock it so we can assert routing/consolidation/fallback without the real
// merge pipeline. Default resolve is set per-test (an undefined resolve would
// make the tool fall through to the raw-create fallback).
vi.mock("../memory/retain", () => ({
  retain: vi.fn(),
}));

import {
  createVaultMemoryOp,
  getVaultMemoryOp,
  updateVaultMemoryOp,
} from "../db/memoryVault/operations";
import { retain } from "../memory/retain";
import type { RetainResult } from "../memory/types";
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

  // ── Junk gate ──────────────────────────────────────────────

  describe("junk gate", () => {
    it("rejects low-signal content before any create/update/retain", async () => {
      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm);

      for (const junk of ["1", "2", "42", "---"]) {
        const result = await tool.executor!({ content: junk });
        expect(result).toBe("Error: content too short or low-signal to save.");
      }
      expect(createVaultMemoryOp).not.toHaveBeenCalled();
      expect(updateVaultMemoryOp).not.toHaveBeenCalled();
      expect(retain).not.toHaveBeenCalled();
    });
  });

  // ── CREATE routes through retain() (Fix A) ─────────────────

  describe("create via retain (dedup)", () => {
    const embeddingOptions = { apiKey: "test-key" };
    const cache = createVaultEmbeddingCache();

    const retainResult = (over: Partial<RetainResult> = {}): RetainResult => ({
      action: "create",
      memoryId: "ret-1",
      proofCount: 1,
      ...over,
    });

    beforeEach(() => {
      cache.clear();
    });

    it("routes a new save through retain() (not a raw create) when embeddings are available", async () => {
      vi.mocked(retain).mockResolvedValue(retainResult({ memoryId: "ret-1" }));

      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);
      const result = await tool.executor!({ content: "User likes dogs" });

      expect(retain).toHaveBeenCalledWith(
        "User likes dogs",
        { vaultCtx: mockVaultCtx, embeddingOptions, vaultCache: cache },
        expect.objectContaining({ source: "manual", scope: "private" })
      );
      // The raw create + fire-and-forget embed path is bypassed entirely.
      expect(createVaultMemoryOp).not.toHaveBeenCalled();
      expect(eagerEmbedContent).not.toHaveBeenCalled();
      expect(result).toBe("Memory saved successfully (ID: ret-1).");
    });

    it("threads folderId and factType into retain options but NEVER consolidateOptions (strict cosine only)", async () => {
      vi.mocked(retain).mockResolvedValue(retainResult());

      const folderMap = new Map([["Work", "folder_1"]]);
      const tool = createMemoryVaultTool(
        mockVaultCtx,
        { onSave: async () => true, folderMap },
        embeddingOptions,
        cache
      );
      await tool.executor!({
        content: "Allergic to shellfish",
        type: "constraint",
        folderName: "Work",
      });

      expect(retain).toHaveBeenCalledWith(
        "Allergic to shellfish",
        expect.anything(),
        expect.objectContaining({
          source: "manual",
          scope: "private",
          folderId: "folder_1",
          factType: "constraint",
        })
      );
      // The create path must run retain's cosine auto-merge ONLY — passing
      // consolidateOptions would re-enable Stage-1 LLM consolidation, which can
      // noop-drop the new fact or rewrite a different row (the data-integrity
      // footgun). Assert the option is never threaded.
      const retainOpts = vi.mocked(retain).mock.calls[0][2];
      expect(retainOpts).not.toHaveProperty("consolidateOptions");
    });

    it("merges into a true near-duplicate (retain 'merge') instead of storing twice", async () => {
      // retain with no consolidateOptions folds a ≥0.8 cosine dup into the
      // existing row and reports its id — the new content is not stored twice.
      vi.mocked(retain).mockResolvedValue(retainResult({ action: "merge", memoryId: "dup-1" }));

      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);
      const result = await tool.executor!({ content: "User likes dogs" });

      expect(createVaultMemoryOp).not.toHaveBeenCalled();
      expect(result).toBe("Memory merged into an existing memory (ID: dup-1).");
    });

    it("creates + reports the new id for a genuinely distinct fact (never success without persisting)", async () => {
      // A distinct fact clears no cosine threshold, so retain creates a new row
      // and hands back its id — the tool never reports success without a persisted id.
      vi.mocked(retain).mockResolvedValue(retainResult({ action: "create", memoryId: "fresh-1" }));

      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);
      const result = await tool.executor!({ content: "User is allergic to shellfish" });

      expect(result).toBe("Memory saved successfully (ID: fresh-1).");
    });

    it("maps a retain merge/supersede result to an accurate message", async () => {
      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);

      vi.mocked(retain).mockResolvedValue(retainResult({ action: "merge", memoryId: "dup-1" }));
      expect(await tool.executor!({ content: "User likes dogs and cats" })).toBe(
        "Memory merged into an existing memory (ID: dup-1)."
      );

      vi.mocked(retain).mockResolvedValue(retainResult({ action: "supersede", memoryId: "new-2" }));
      expect(await tool.executor!({ content: "User now prefers cats" })).toBe(
        "Memory saved, replacing an outdated memory (ID: new-2)."
      );
    });

    it("FALLS BACK to a raw create + eager embed when retain() throws (never lose a confirmed save)", async () => {
      // retain() throws on an embedding outage; a user-confirmed save must still land.
      vi.mocked(retain).mockRejectedValue(new Error("embeddings unavailable"));
      vi.mocked(createVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "fallback-1" })
      );

      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);
      const result = await tool.executor!({ content: "important fact" });

      expect(createVaultMemoryOp).toHaveBeenCalledWith(mockVaultCtx, {
        content: "important fact",
        scope: "private",
        folderId: undefined,
      });
      expect(eagerEmbedContent).toHaveBeenCalledWith(
        "important fact",
        embeddingOptions,
        cache,
        mockVaultCtx,
        "fallback-1"
      );
      expect(result).toBe("Memory saved successfully (ID: fallback-1).");
    });

    it("writes exactly ONCE when the embedding aborts/times out (no double-write)", async () => {
      // Regression: the old timeout RACE abandoned retain() without cancelling
      // it, so retain could complete its OWN create AFTER the fallback raw-create
      // already ran → a duplicate row. The embeddings fetch now aborts fast, so
      // retain() rejects and the SINGLE catch runs the raw-create exactly once.
      vi.mocked(retain).mockRejectedValue(
        Object.assign(new Error("The operation was aborted"), { name: "AbortError" })
      );
      vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "once-1" }));

      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);
      const result = await tool.executor!({ content: "a fact whose embedding hangs" });

      // Retain was attempted, then the fallback ran — but the vault was written
      // to exactly once (no lingering retain create racing the fallback).
      expect(retain).toHaveBeenCalledTimes(1);
      expect(createVaultMemoryOp).toHaveBeenCalledTimes(1);
      expect(result).toBe("Memory saved successfully (ID: once-1).");
    });

    it("keeps the raw create path when no embeddings are configured (back-compat)", async () => {
      vi.mocked(createVaultMemoryOp).mockResolvedValue(makeStoredMemory({ uniqueId: "raw-1" }));

      // No embeddingOptions/cache → retain is never reached.
      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm);
      const result = await tool.executor!({ content: "no-embed fact" });

      expect(retain).not.toHaveBeenCalled();
      expect(createVaultMemoryOp).toHaveBeenCalled();
      expect(result).toBe("Memory saved successfully (ID: raw-1).");
    });
  });

  // ── Eager embedding (UPDATE path stays direct) ─────────────

  describe("eager embedding", () => {
    const embeddingOptions = { apiKey: "test-key" };
    const cache = createVaultEmbeddingCache();

    beforeEach(() => {
      cache.clear();
    });

    it("awaits re-embed of new content on update (id-update stays direct, no retain/consolidation)", async () => {
      vi.mocked(getVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "old content" })
      );
      vi.mocked(updateVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "new content" })
      );
      // Cache invalidation is by id: eagerEmbedContent overwrites the id-keyed
      // entry with the new vector — no separate delete-by-content step. An
      // explicit id-update never routes through retain().
      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);
      const result = await tool.executor!({ content: "new content", id: "mem-1" });

      expect(retain).not.toHaveBeenCalled();
      expect(eagerEmbedContent).toHaveBeenCalledWith(
        "new content",
        embeddingOptions,
        cache,
        mockVaultCtx,
        "mem-1"
      );
      expect(result).toBe("Memory updated successfully (ID: mem-1).");
    });

    it("still reports update success if the awaited re-embed fails (row already persisted)", async () => {
      vi.mocked(getVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "old content" })
      );
      vi.mocked(updateVaultMemoryOp).mockResolvedValue(
        makeStoredMemory({ uniqueId: "mem-1", content: "new content" })
      );
      vi.mocked(eagerEmbedContent).mockRejectedValueOnce(new Error("embed failed"));

      const tool = createMemoryVaultTool(mockVaultCtx, autoConfirm, embeddingOptions, cache);
      const result = await tool.executor!({ content: "new content", id: "mem-1" });

      expect(result).toBe("Memory updated successfully (ID: mem-1).");
    });
  });
});
