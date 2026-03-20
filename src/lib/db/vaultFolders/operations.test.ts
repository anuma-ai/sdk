import { describe, it, expect, vi, beforeEach } from "vitest";

import type { VaultFolderOperationsContext } from "./operations";
import {
  createVaultFolderOp,
  getAllVaultFoldersOp,
  updateVaultFolderContextOp,
} from "./operations";

// ---------------------------------------------------------------------------
// Shared mock helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock VaultFolder record that mimics a WatermelonDB Model.
 *
 * `raw` is mutated by `_setRaw` so that getter-based properties like
 * `isDeleted` reflect updates made inside `prepareUpdate` callbacks —
 * the same pattern used in memoryVault/operations.test.ts.
 */
function mockFolderRecord(overrides: Record<string, unknown> = {}) {
  // Seed raw from overrides so that getter-based properties reflect initial
  // override values AND remain properly mutable via _setRaw.
  const raw: Record<string, unknown> = {
    name: (overrides.name as string) ?? "My Folder",
    scope: (overrides.scope as string) ?? "private",
    is_deleted: (overrides.isDeleted as boolean) ?? false,
    is_system: (overrides.isSystem as boolean) ?? false,
    context: "context" in overrides ? (overrides.context ?? null) : null,
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
  };

  return {
    id: (overrides.id as string) ?? "folder_1",
    get name() {
      return raw.name as string;
    },
    get scope() {
      return raw.scope as string;
    },
    get isDeleted() {
      return raw.is_deleted as boolean;
    },
    get isSystem() {
      return raw.is_system as boolean;
    },
    get context() {
      return raw.context as string | null;
    },
    get createdAt() {
      return raw.created_at as Date;
    },
    get updatedAt() {
      return raw.updated_at as Date;
    },
    _setRaw(key: string, value: unknown) {
      raw[key] = value;
    },
    prepareUpdate: vi.fn((updater: (r: Record<string, unknown>) => void) => {
      const proxy = {
        _setRaw: (k: string, v: unknown) => {
          raw[k] = v;
        },
      };
      updater(proxy as unknown as Record<string, unknown>);
      return { __prepared: true, updater };
    }),
    update: vi.fn(async (updater: (r: Record<string, unknown>) => void) => {
      const proxy = {
        _setRaw: (k: string, v: unknown) => {
          raw[k] = v;
        },
      };
      updater(proxy as unknown as Record<string, unknown>);
    }),
  };
}

function makeCtx(
  overrides: Partial<VaultFolderOperationsContext> = {}
): VaultFolderOperationsContext {
  return {
    database: {
      write: vi.fn(async (cb: () => unknown) => cb()),
      batch: vi.fn(async () => {}),
    } as unknown as VaultFolderOperationsContext["database"],
    vaultFolderCollection: {
      create: vi.fn(async (builder: (r: ReturnType<typeof mockFolderRecord>) => void) => {
        const record = mockFolderRecord();
        builder(record);
        return record;
      }),
      find: vi.fn(async (id: string) => mockFolderRecord({ id })),
      query: vi.fn((..._conditions: unknown[]) => ({
        fetch: vi.fn(async () => [mockFolderRecord({ id: "folder_1" }), mockFolderRecord({ id: "folder_2" })]),
      })),
    } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    vaultMemoryCollection: {
      query: vi.fn((..._conditions: unknown[]) => ({
        fetch: vi.fn(async () => []),
        fetchCount: vi.fn(async () => 0),
      })),
    } as unknown as VaultFolderOperationsContext["vaultMemoryCollection"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// folderToStored — context field uses ?? null (not || "")
// ---------------------------------------------------------------------------

describe("folderToStored — context field ?? semantics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves empty string context ('' stays '', not coerced to null)", async () => {
    // folderToStored uses `folder.context ?? null`.
    // If the model returns "" (empty string), ?? passes it through unchanged.
    // The old || would have coerced "" to null.
    const emptyContextFolder = mockFolderRecord({ context: "" });
    const ctx = makeCtx({
      vaultFolderCollection: {
        find: vi.fn(async () => emptyContextFolder),
        query: vi.fn((..._conditions: unknown[]) => ({
          fetch: vi.fn(async () => [emptyContextFolder]),
        })),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const folders = await getAllVaultFoldersOp(ctx);
    // The context field must survive as "" — not be coerced to null
    expect(folders[0].context).toBe("");
  });

  it("maps null context to null in the stored shape", async () => {
    const nullContextFolder = mockFolderRecord({ context: null });
    const ctx = makeCtx({
      vaultFolderCollection: {
        find: vi.fn(async () => nullContextFolder),
        query: vi.fn((..._conditions: unknown[]) => ({
          fetch: vi.fn(async () => [nullContextFolder]),
        })),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const folders = await getAllVaultFoldersOp(ctx);
    expect(folders[0].context).toBeNull();
  });

  it("maps a non-empty context string to that string", async () => {
    const contextFolder = mockFolderRecord({ context: "Work-related memories." });
    const ctx = makeCtx({
      vaultFolderCollection: {
        find: vi.fn(async () => contextFolder),
        query: vi.fn((..._conditions: unknown[]) => ({
          fetch: vi.fn(async () => [contextFolder]),
        })),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const folders = await getAllVaultFoldersOp(ctx);
    expect(folders[0].context).toBe("Work-related memories.");
  });
});

// ---------------------------------------------------------------------------
// updateVaultFolderContextOp
// ---------------------------------------------------------------------------

describe("updateVaultFolderContextOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: sets context on a live folder and returns the updated StoredVaultFolder", async () => {
    const record = mockFolderRecord({ id: "folder_42" });

    // Re-fetch after batch must return the updated record
    const findFn = vi
      .fn()
      .mockResolvedValueOnce(record) // initial find
      .mockResolvedValueOnce({ ...record, context: "Work memories" }); // re-fetch

    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => unknown) => cb()),
        batch: vi.fn(async () => {}),
      } as unknown as VaultFolderOperationsContext["database"],
      vaultFolderCollection: {
        find: findFn,
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const result = await updateVaultFolderContextOp(ctx, "folder_42", "Work memories");

    expect(result).not.toBeNull();
    expect(result!.uniqueId).toBe("folder_42");
    // The prepareUpdate should have been called with the new context value
    const preparedCalls = record.prepareUpdate.mock.calls;
    expect(preparedCalls.length).toBe(1);
    // Verify the raw context was set
    expect(record.context).toBe("Work memories");
  });

  it("returns null when the folder is soft-deleted", async () => {
    const deletedRecord = mockFolderRecord({ isDeleted: true });
    const ctx = makeCtx({
      vaultFolderCollection: {
        find: vi.fn(async () => deletedRecord),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const result = await updateVaultFolderContextOp(ctx, "folder_1", "some context");
    expect(result).toBeNull();
  });

  it("returns null when find throws (folder not found)", async () => {
    const ctx = makeCtx({
      vaultFolderCollection: {
        find: vi.fn(async () => {
          throw new Error("not found");
        }),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const result = await updateVaultFolderContextOp(ctx, "nonexistent", "ctx");
    expect(result).toBeNull();
  });

  it("sets context to null (clears the context)", async () => {
    const record = mockFolderRecord({ id: "folder_5", context: "Old context" });

    const findFn = vi
      .fn()
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce({ ...record, context: null });

    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => unknown) => cb()),
        batch: vi.fn(async () => {}),
      } as unknown as VaultFolderOperationsContext["database"],
      vaultFolderCollection: {
        find: findFn,
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const result = await updateVaultFolderContextOp(ctx, "folder_5", null);

    expect(result).not.toBeNull();
    // After writing null, the raw context field should be null
    expect(record.context).toBeNull();
  });

  it("calls _setRaw('context', ...) inside the prepareUpdate callback", async () => {
    const setRawSpy = vi.fn();
    const record = {
      ...mockFolderRecord({ id: "folder_7" }),
      isDeleted: false,
      prepareUpdate: vi.fn((updater: (r: { _setRaw: typeof setRawSpy }) => void) => {
        updater({ _setRaw: setRawSpy });
        return { __prepared: true };
      }),
    };

    // Re-fetch returns a simple stored-like shape
    const resFetch = { id: "folder_7", name: "Test", scope: "private", isDeleted: false, isSystem: false, context: "ctx value", createdAt: new Date(), updatedAt: new Date() };

    const findFn = vi
      .fn()
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce(resFetch);

    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => unknown) => cb()),
        batch: vi.fn(async () => {}),
      } as unknown as VaultFolderOperationsContext["database"],
      vaultFolderCollection: {
        find: findFn,
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    await updateVaultFolderContextOp(ctx, "folder_7", "ctx value");

    expect(setRawSpy).toHaveBeenCalledWith("context", "ctx value");
  });

  it("returns null when database.write throws", async () => {
    const record = mockFolderRecord({ id: "folder_8" });
    const ctx = makeCtx({
      database: {
        write: vi.fn(async () => {
          throw new Error("write failed");
        }),
        batch: vi.fn(async () => {}),
      } as unknown as VaultFolderOperationsContext["database"],
      vaultFolderCollection: {
        find: vi.fn(async () => record),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const result = await updateVaultFolderContextOp(ctx, "folder_8", "ctx");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createVaultFolderOp — sanity check that isSystem flag is wired
// ---------------------------------------------------------------------------

describe("createVaultFolderOp — isSystem flag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets is_system to true when isSystem option is provided", async () => {
    const ctx = makeCtx();
    await createVaultFolderOp(ctx, { name: "Work", scope: "private", isSystem: true });

    const createFn = ctx.vaultFolderCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("is_system", true);
  });

  it("defaults is_system to false when not provided", async () => {
    const ctx = makeCtx();
    await createVaultFolderOp(ctx, { name: "Custom", scope: "private" });

    const createFn = ctx.vaultFolderCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("is_system", false);
  });
});
