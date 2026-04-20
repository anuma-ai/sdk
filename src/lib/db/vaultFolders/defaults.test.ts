import { describe, it, expect, vi, beforeEach } from "vitest";

import type { VaultFolderOperationsContext } from "./operations";
import { ensureDefaultFoldersOp } from "./defaults";

// ---------------------------------------------------------------------------
// Shared mock helpers
// ---------------------------------------------------------------------------

function mockFolderRecord(id: string, name: string, isSystem = true) {
  return {
    id,
    uniqueId: id,
    name,
    scope: "private",
    isDeleted: false,
    isSystem,
    context: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    _setRaw: vi.fn(),
    prepareUpdate: vi.fn(),
  };
}

/** Build a mock create function that returns a WatermelonDB-like model record. */
function makeMockCreate(prefix = "created_") {
  let counter = 0;
  return vi.fn(async (builder: (r: Record<string, unknown>) => void) => {
    counter += 1;
    const id = `${prefix}${counter}`;

    // This is the raw mutable state — mirrors how WatermelonDB models work
    const raw: Record<string, unknown> = {
      name: "",
      scope: "private",
      is_deleted: false,
      is_system: true,
      context: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // The record passed to the builder — _setRaw mutates `raw`
    const record = {
      id,
      _setRaw: (key: string, value: unknown) => {
        raw[key] = value;
      },
      prepareUpdate: vi.fn(),
    };

    builder(record);

    // Return the WatermelonDB-like model with getters reading from `raw`
    // folderToStored reads: folder.id, folder.name, folder.scope, folder.isDeleted,
    // folder.isSystem, folder.context, folder.createdAt, folder.updatedAt
    return {
      id,
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
    };
  });
}

function makeCtx(
  existingFolders: Array<ReturnType<typeof mockFolderRecord>> = [],
  overrides: Partial<VaultFolderOperationsContext> = {}
): VaultFolderOperationsContext {
  const createFn = makeMockCreate();
  return {
    database: {
      write: vi.fn(async (cb: () => unknown) => cb()),
      batch: vi.fn(async () => {}),
    } as unknown as VaultFolderOperationsContext["database"],
    vaultFolderCollection: {
      create: createFn,
      find: vi.fn(),
      query: vi.fn((..._conditions: unknown[]) => ({
        fetch: vi.fn(async () => existingFolders),
        fetchCount: vi.fn(async () => existingFolders.length),
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
// ensureDefaultFoldersOp — default folder set
// ---------------------------------------------------------------------------

describe("ensureDefaultFoldersOp — default folder names", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates Personal, Work, and Interests when no folders exist", async () => {
    const ctx = makeCtx([]);
    const folderMap = await ensureDefaultFoldersOp(ctx);

    const names = [...folderMap.keys()];
    expect(names).toContain("Personal");
    expect(names).toContain("Work");
    expect(names).toContain("Interests");
  });

  it("does NOT create Preferences (removed from default set)", async () => {
    const ctx = makeCtx([]);
    const folderMap = await ensureDefaultFoldersOp(ctx);

    const names = [...folderMap.keys()];
    expect(names).not.toContain("Preferences");
  });

  it("creates exactly 3 default folders on a clean database", async () => {
    const ctx = makeCtx([]);
    const folderMap = await ensureDefaultFoldersOp(ctx);

    // Personal, Work, Interests only
    expect(folderMap.size).toBe(3);
  });

  it("skips creating a folder that already exists by name", async () => {
    const existing = [
      mockFolderRecord("folder_1", "Personal"),
      mockFolderRecord("folder_2", "Work"),
    ];
    const ctx = makeCtx(existing);
    const createFn = ctx.vaultFolderCollection.create as ReturnType<typeof vi.fn>;

    await ensureDefaultFoldersOp(ctx);

    // Only "Interests" should be created — the other two already exist
    expect(createFn).toHaveBeenCalledTimes(1);
  });

  it("does not create any folders when all three defaults already exist", async () => {
    const existing = [
      mockFolderRecord("folder_1", "Personal"),
      mockFolderRecord("folder_2", "Work"),
      mockFolderRecord("folder_3", "Interests"),
    ];
    const ctx = makeCtx(existing);
    const createFn = ctx.vaultFolderCollection.create as ReturnType<typeof vi.fn>;

    await ensureDefaultFoldersOp(ctx);

    expect(createFn).not.toHaveBeenCalled();
  });

  it("includes existing user-created folders in the returned map", async () => {
    const existing = [
      mockFolderRecord("folder_1", "Personal"),
      mockFolderRecord("folder_2", "Work"),
      mockFolderRecord("folder_3", "Interests"),
      mockFolderRecord("folder_99", "My Custom Folder", false),
    ];
    const ctx = makeCtx(existing);
    const folderMap = await ensureDefaultFoldersOp(ctx);

    expect(folderMap.has("My Custom Folder")).toBe(true);
    expect(folderMap.get("My Custom Folder")).toBe("folder_99");
  });

  it("maps existing default folder names to their uniqueIds", async () => {
    const existing = [
      mockFolderRecord("known_personal", "Personal"),
      mockFolderRecord("known_work", "Work"),
      mockFolderRecord("known_interests", "Interests"),
    ];
    const ctx = makeCtx(existing);
    const folderMap = await ensureDefaultFoldersOp(ctx);

    expect(folderMap.get("Personal")).toBe("known_personal");
    expect(folderMap.get("Work")).toBe("known_work");
    expect(folderMap.get("Interests")).toBe("known_interests");
  });

  it("new created folders are included in the returned map with correct names", async () => {
    const ctx = makeCtx([]);
    const folderMap = await ensureDefaultFoldersOp(ctx);

    // All three default names should map to some ID
    expect(typeof folderMap.get("Personal")).toBe("string");
    expect(typeof folderMap.get("Work")).toBe("string");
    expect(typeof folderMap.get("Interests")).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// ensureDefaultFoldersOp — idempotency / concurrency lock
// ---------------------------------------------------------------------------

describe("ensureDefaultFoldersOp — concurrency lock", () => {
  it("two concurrent calls share a single in-flight operation (create called only once per missing folder)", async () => {
    // Each time create is called, record it to verify no duplicate creates
    const createCalls: string[] = [];
    let counter = 0;
    const createFn = vi.fn(
      async (builder: (r: { _setRaw: (k: string, v: unknown) => void }) => void) => {
        counter += 1;
        let name = `created_${counter}`;
        builder({
          _setRaw: (k: string, v: unknown) => {
            if (k === "name") name = v as string;
          },
        });
        createCalls.push(name);
        return {
          uniqueId: `id_${counter}`,
          name,
          scope: "private",
          isDeleted: false,
          isSystem: true,
          context: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    );

    // Simulate a fetch that returns no folders
    const fetchFn = vi.fn(async () => []);

    const database = {
      write: vi.fn(async (cb: () => unknown) => cb()),
      batch: vi.fn(async () => {}),
    } as unknown as VaultFolderOperationsContext["database"];

    const ctx: VaultFolderOperationsContext = {
      database,
      vaultFolderCollection: {
        create: createFn,
        find: vi.fn(),
        query: vi.fn(() => ({ fetch: fetchFn })),
      } as unknown as VaultFolderOperationsContext["vaultFolderCollection"],
      vaultMemoryCollection: {
        query: vi.fn(() => ({ fetch: vi.fn(async () => []) })),
      } as unknown as VaultFolderOperationsContext["vaultMemoryCollection"],
    };

    // Fire both concurrently — they share the same database object as the lock key
    const [map1, map2] = await Promise.all([
      ensureDefaultFoldersOp(ctx),
      ensureDefaultFoldersOp(ctx),
    ]);

    // Both results should have the 3 default folders
    expect(map1.size).toBe(3);
    expect(map2.size).toBe(3);

    // The shared lock means create should be called exactly 3 times total,
    // not 6 (3 per concurrent call)
    expect(createFn).toHaveBeenCalledTimes(3);
  });
});
