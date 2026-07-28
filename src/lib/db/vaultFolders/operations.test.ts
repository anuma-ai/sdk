import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

import { getLogger, noopLogger, setLogger } from "../../logger";
import type { VaultFolderOperationsContext } from "./operations";
import {
  createVaultFolderOp,
  deleteVaultFolderOp,
  getAllVaultFoldersOp,
  getVaultFolderMemoryCountOp,
  moveMemoriesToFolderOp,
  updateVaultFolderContextOp,
  updateVaultFolderOp,
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
    user_id: "userId" in overrides ? (overrides.userId ?? null) : null,
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
    get userId() {
      return raw.user_id as string | null;
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
        fetch: vi.fn(async () => [
          mockFolderRecord({ id: "folder_1" }),
          mockFolderRecord({ id: "folder_2" }),
        ]),
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
// updateVaultFolderOp
// ---------------------------------------------------------------------------

describe("updateVaultFolderOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never yields the event loop between prepareUpdate and batch on scope change", async () => {
    // WatermelonDB's dev diagnostic throws (uncaught → RedBox on RN Debug
    // builds) when a prepared update is still pending as the event loop turns.
    // The scope-change cascade must therefore fetch the folder's memories
    // BEFORE preparing the folder update — an interleaved fetch left the
    // folder record prepared across an await.
    const pending = new Set<string>();
    const violations: string[] = [];
    const folder = mockFolderRecord({ id: "folder_1", scope: "private" });
    (folder.prepareUpdate as ReturnType<typeof vi.fn>).mockImplementation(() => {
      pending.add("folder_1");
      return { __prepared: true };
    });
    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => unknown) => cb()),
        batch: vi.fn(async () => pending.clear()),
      } as unknown as VaultFolderOperationsContext["database"],
      vaultFolderCollection: {
        find: vi.fn(async () => folder),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
      vaultMemoryCollection: {
        query: vi.fn(() => ({
          fetch: vi.fn(async () => {
            if (pending.size > 0) violations.push(...pending);
            return [];
          }),
        })),
      } as unknown as VaultFolderOperationsContext["vaultMemoryCollection"],
    });

    await updateVaultFolderOp(ctx, "folder_1", { scope: "shared" });

    expect(violations).toEqual([]);
    expect(folder.prepareUpdate).toHaveBeenCalledTimes(1);
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
    const resFetch = {
      id: "folder_7",
      name: "Test",
      scope: "private",
      isDeleted: false,
      isSystem: false,
      context: "ctx value",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const findFn = vi.fn().mockResolvedValueOnce(record).mockResolvedValueOnce(resFetch);

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

// ---------------------------------------------------------------------------
// Multi-user scoping (#626) — folder ops must not cross tenant boundaries
// ---------------------------------------------------------------------------

/** A minimal VaultMemory-like mock carrying the owner + mutable raw scope. */
function mockMemoryRecord(id: string, userId: string | null, scope = "private") {
  const raw: Record<string, unknown> = { scope, folder_id: null, is_deleted: false };
  return {
    id,
    userId,
    get scope() {
      return raw.scope as string;
    },
    get folderId() {
      return raw.folder_id as string | null;
    },
    get isDeleted() {
      return raw.is_deleted as boolean;
    },
    prepareUpdate: vi.fn((updater: (r: Record<string, unknown>) => void) => {
      updater({ _setRaw: (k: string, v: unknown) => (raw[k] = v) } as never);
      return { __prepared: true };
    }),
  };
}

/** True when the Q conditions passed to a query include a `user_id` filter. */
function hasUserIdFilter(conditions: unknown[]): boolean {
  return JSON.stringify(conditions).includes('"user_id"');
}

describe("vault folder ops — user scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getAllVaultFoldersOp filters by user_id when ctx.userId is set", async () => {
    const ctx = makeCtx({ userId: "user_a" });
    await getAllVaultFoldersOp(ctx);

    const queryFn = ctx.vaultFolderCollection.query as ReturnType<typeof vi.fn>;
    expect(hasUserIdFilter(queryFn.mock.calls[0])).toBe(true);
  });

  it("getAllVaultFoldersOp omits the user_id filter on an unscoped (single-user) ctx", async () => {
    const ctx = makeCtx();
    await getAllVaultFoldersOp(ctx);

    const queryFn = ctx.vaultFolderCollection.query as ReturnType<typeof vi.fn>;
    expect(hasUserIdFilter(queryFn.mock.calls[0])).toBe(false);
  });

  it("createVaultFolderOp stamps user_id from the context", async () => {
    const ctx = makeCtx({ userId: "user_a" });
    await createVaultFolderOp(ctx, { name: "Work" });

    const createFn = ctx.vaultFolderCollection.create as ReturnType<typeof vi.fn>;
    const setRawSpy = vi.fn();
    createFn.mock.calls[0][0]({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("user_id", "user_a");
  });

  it("createVaultFolderOp writes a null user_id when unscoped", async () => {
    const ctx = makeCtx();
    await createVaultFolderOp(ctx, { name: "Work" });

    const createFn = ctx.vaultFolderCollection.create as ReturnType<typeof vi.fn>;
    const setRawSpy = vi.fn();
    createFn.mock.calls[0][0]({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("user_id", null);
  });

  it("updateVaultFolderOp refuses another user's folder without writing", async () => {
    const foreign = mockFolderRecord({ id: "folder_b", userId: "user_b" });
    const ctx = makeCtx({
      userId: "user_a",
      vaultFolderCollection: {
        find: vi.fn(async () => foreign),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const result = await updateVaultFolderOp(ctx, "folder_b", { name: "pwned" });

    expect(result).toBeNull();
    expect(foreign.prepareUpdate).not.toHaveBeenCalled();
    expect(ctx.database.write).not.toHaveBeenCalled();
  });

  it("updateVaultFolderOp still updates a foreign-owned folder on an unscoped ctx (client behavior preserved)", async () => {
    const record = mockFolderRecord({ id: "folder_b", userId: "user_b" });
    const ctx = makeCtx({
      vaultFolderCollection: {
        find: vi.fn(async () => record),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const result = await updateVaultFolderOp(ctx, "folder_b", { name: "renamed" });

    expect(result).not.toBeNull();
    expect(record.name).toBe("renamed");
  });

  it("deleteVaultFolderOp refuses another user's folder", async () => {
    const foreign = mockFolderRecord({ id: "folder_b", userId: "user_b" });
    const ctx = makeCtx({
      userId: "user_a",
      vaultFolderCollection: {
        find: vi.fn(async () => foreign),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    expect(await deleteVaultFolderOp(ctx, "folder_b")).toBe(false);
    expect(ctx.database.write).not.toHaveBeenCalled();
  });

  it("updateVaultFolderContextOp refuses another user's folder", async () => {
    const foreign = mockFolderRecord({ id: "folder_b", userId: "user_b" });
    const ctx = makeCtx({
      userId: "user_a",
      vaultFolderCollection: {
        find: vi.fn(async () => foreign),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    expect(await updateVaultFolderContextOp(ctx, "folder_b", "leaked")).toBeNull();
    expect(foreign.context).toBeNull();
  });

  it("updateVaultFolderOp scope cascade only queries the ctx user's memories", async () => {
    const record = mockFolderRecord({ id: "folder_a", userId: "user_a", scope: "private" });
    const memQuery = vi.fn(() => ({ fetch: vi.fn(async () => []) }));
    const ctx = makeCtx({
      userId: "user_a",
      vaultFolderCollection: {
        find: vi.fn(async () => record),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
      vaultMemoryCollection: {
        query: memQuery,
      } as unknown as VaultFolderOperationsContext["vaultMemoryCollection"],
    });

    await updateVaultFolderOp(ctx, "folder_a", { scope: "shared" });

    expect(memQuery).toHaveBeenCalled();
    expect(hasUserIdFilter(memQuery.mock.calls[0])).toBe(true);
  });

  it("moveMemoriesToFolderOp refuses a target folder owned by another user", async () => {
    const foreign = mockFolderRecord({ id: "folder_b", userId: "user_b", scope: "shared" });
    const ctx = makeCtx({
      userId: "user_a",
      vaultFolderCollection: {
        find: vi.fn(async () => foreign),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    expect(await moveMemoriesToFolderOp(ctx, ["mem_1"], "folder_b")).toBe(false);
    expect(ctx.database.write).not.toHaveBeenCalled();
  });

  it("moveMemoriesToFolderOp never flips another user's memory scope", async () => {
    // The core #626 leak: the move overwrites each memory's scope with the
    // folder's. An unchecked cross-user id would silently turn user B's
    // `private` memory into `shared`.
    const folder = mockFolderRecord({ id: "folder_a", userId: "user_a", scope: "shared" });
    const mine = mockMemoryRecord("mem_a", "user_a", "private");
    const theirs = mockMemoryRecord("mem_b", "user_b", "private");
    const byId: Record<string, typeof mine> = { mem_a: mine, mem_b: theirs };

    const ctx = makeCtx({
      userId: "user_a",
      vaultFolderCollection: {
        find: vi.fn(async () => folder),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
      vaultMemoryCollection: {
        find: vi.fn(async (id: string) => byId[id]),
        query: vi.fn(() => ({ fetch: vi.fn(async () => []) })),
      } as unknown as VaultFolderOperationsContext["vaultMemoryCollection"],
    });

    const moved = await moveMemoriesToFolderOp(ctx, ["mem_a", "mem_b"], "folder_a");

    expect(moved).toBe(true);
    expect(mine.scope).toBe("shared");
    expect(mine.folderId).toBe("folder_a");
    // user B's memory is untouched — scope NOT flipped, still unfiled
    expect(theirs.prepareUpdate).not.toHaveBeenCalled();
    expect(theirs.scope).toBe("private");
    expect(theirs.folderId).toBeNull();
  });

  it("moveMemoriesToFolderOp returns false when every id belongs to another user", async () => {
    const folder = mockFolderRecord({ id: "folder_a", userId: "user_a", scope: "shared" });
    const theirs = mockMemoryRecord("mem_b", "user_b", "private");

    const ctx = makeCtx({
      userId: "user_a",
      vaultFolderCollection: {
        find: vi.fn(async () => folder),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
      vaultMemoryCollection: {
        find: vi.fn(async () => theirs),
        query: vi.fn(() => ({ fetch: vi.fn(async () => []) })),
      } as unknown as VaultFolderOperationsContext["vaultMemoryCollection"],
    });

    expect(await moveMemoriesToFolderOp(ctx, ["mem_b"], "folder_a")).toBe(false);
    expect(theirs.scope).toBe("private");
  });

  it("getVaultFolderMemoryCountOp returns 0 for another user's folder", async () => {
    const foreign = mockFolderRecord({ id: "folder_b", userId: "user_b" });
    const fetchCount = vi.fn(async () => 42);
    const ctx = makeCtx({
      userId: "user_a",
      vaultFolderCollection: {
        find: vi.fn(async () => foreign),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
      vaultMemoryCollection: {
        query: vi.fn(() => ({ fetchCount })),
      } as unknown as VaultFolderOperationsContext["vaultMemoryCollection"],
    });

    expect(await getVaultFolderMemoryCountOp(ctx, "folder_b")).toBe(0);
    expect(fetchCount).not.toHaveBeenCalled();
  });

  it("getVaultFolderMemoryCountOp scopes the count query to the ctx user", async () => {
    const own = mockFolderRecord({ id: "folder_a", userId: "user_a" });
    const memQuery = vi.fn(() => ({ fetchCount: vi.fn(async () => 3) }));
    const ctx = makeCtx({
      userId: "user_a",
      vaultFolderCollection: {
        find: vi.fn(async () => own),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
      vaultMemoryCollection: {
        query: memQuery,
      } as unknown as VaultFolderOperationsContext["vaultMemoryCollection"],
    });

    expect(await getVaultFolderMemoryCountOp(ctx, "folder_a")).toBe(3);
    expect(hasUserIdFilter(memQuery.mock.calls[0])).toBe(true);
  });

  it("folderToStored surfaces the owning userId", async () => {
    const owned = mockFolderRecord({ id: "folder_a", userId: "user_a" });
    const ctx = makeCtx({
      userId: "user_a",
      vaultFolderCollection: {
        query: vi.fn(() => ({ fetch: vi.fn(async () => [owned]) })),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
    });

    const [folder] = await getAllVaultFoldersOp(ctx);
    expect(folder.userId).toBe("user_a");
  });
});

// ---------------------------------------------------------------------------
// Swallowed write errors are logged (#626) — a transient DB fault must be
// distinguishable from "not found", both of which return null/false.
// ---------------------------------------------------------------------------

describe("vault folder ops — swallowed errors are logged", () => {
  const original = getLogger();
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => setLogger(original));

  function spyLogger() {
    const warn = vi.fn();
    setLogger({ ...noopLogger, warn });
    return warn;
  }

  it("updateVaultFolderOp logs when the write throws", async () => {
    const warn = spyLogger();
    const ctx = makeCtx({
      database: {
        write: vi.fn(async () => {
          throw new Error("disk full");
        }),
        batch: vi.fn(async () => {}),
      } as unknown as VaultFolderOperationsContext["database"],
    });

    expect(await updateVaultFolderOp(ctx, "folder_1", { name: "x" })).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("deleteVaultFolderOp logs when the write throws", async () => {
    const warn = spyLogger();
    const ctx = makeCtx({
      database: {
        write: vi.fn(async () => {
          throw new Error("disk full");
        }),
        batch: vi.fn(async () => {}),
      } as unknown as VaultFolderOperationsContext["database"],
    });

    expect(await deleteVaultFolderOp(ctx, "folder_1")).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("moveMemoriesToFolderOp logs when the write throws", async () => {
    const warn = spyLogger();
    const ctx = makeCtx({
      database: {
        write: vi.fn(async () => {
          throw new Error("disk full");
        }),
        batch: vi.fn(async () => {}),
      } as unknown as VaultFolderOperationsContext["database"],
    });

    expect(await moveMemoriesToFolderOp(ctx, ["mem_1"], null)).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("updateVaultFolderContextOp logs when the write throws", async () => {
    const warn = spyLogger();
    const ctx = makeCtx({
      database: {
        write: vi.fn(async () => {
          throw new Error("disk full");
        }),
        batch: vi.fn(async () => {}),
      } as unknown as VaultFolderOperationsContext["database"],
    });

    expect(await updateVaultFolderContextOp(ctx, "folder_1", "ctx")).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });
});
