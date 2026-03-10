import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VaultMemoryOperationsContext } from "./operations";
import {
  createVaultMemoryOp,
  getVaultMemoryOp,
  getAllVaultMemoriesOp,
  updateVaultMemoryOp,
  updateVaultMemoryEmbeddingOp,
  deleteVaultMemoryOp,
  deleteAllVaultMemoriesForUserOp,
  vaultMemoryToStored,
} from "./operations";

// Mock encryption so tests don't need real crypto
vi.mock("./encryption", () => ({
  encryptVaultMemoryContent: vi.fn(async (content: string) => `encrypted:${content}`),
  decryptVaultMemoryFields: vi.fn(async (memory: any) => ({
    ...memory,
    content: memory.content.replace("encrypted:", ""),
  })),
}));

/**
 * Create a mock VaultMemory record that mimics WatermelonDB Model.
 */
function mockRecord(overrides: Record<string, any> = {}) {
  const raw: Record<string, any> = {
    content: "test content",
    scope: "private",
    user_id: null,
    is_deleted: false,
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
  };
  return {
    id: overrides.id ?? "mem_1",
    get content() {
      return raw.content;
    },
    get scope() {
      return raw.scope;
    },
    get createdAt() {
      return raw.created_at;
    },
    get updatedAt() {
      return raw.updated_at;
    },
    get isDeleted() {
      return raw.is_deleted;
    },
    get userId() {
      return raw.user_id;
    },
    _setRaw(key: string, value: any) {
      raw[key] = value;
    },
    update: vi.fn(async (updater: (r: any) => void) => {
      updater({
        _setRaw: (k: string, v: any) => {
          raw[k] = v;
        },
      });
    }),
    prepareUpdate: vi.fn((updater: (r: any) => void) => {
      return {
        _setRaw: (k: string, v: any) => {
          raw[k] = v;
        },
        updater,
      };
    }),
    ...overrides,
  };
}

function makeCtx(
  overrides: Partial<VaultMemoryOperationsContext> = {}
): VaultMemoryOperationsContext {
  return {
    database: {
      write: vi.fn(async (cb: () => any) => cb()),
    } as any,
    vaultMemoryCollection: {
      create: vi.fn(async (builder: (r: any) => void) => {
        const record = mockRecord();
        builder(record);
        return record;
      }),
      find: vi.fn(async (id: string) => mockRecord({ id })),
      query: vi.fn((..._conditions: any[]) => ({
        fetch: vi.fn(async () => [mockRecord({ id: "mem_1" }), mockRecord({ id: "mem_2" })]),
      })),
    } as any,
    ...overrides,
  };
}

describe("createVaultMemoryOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults scope to 'private' when not provided", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, { content: "hello" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    expect(createFn).toHaveBeenCalledTimes(1);

    // Verify the builder sets scope to "private"
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("scope", "private");
  });

  it("uses provided scope", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, { content: "hello", scope: "shared" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("scope", "shared");
  });

  it("sets content and is_deleted via _setRaw", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, { content: "remember this" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("content", "remember this");
    expect(setRawSpy).toHaveBeenCalledWith("is_deleted", false);
  });

  it("encrypts content when wallet context is present", async () => {
    const ctx = makeCtx({
      walletAddress: "0xabc",
      signMessage: vi.fn(async () => "0xsig") as any,
    });

    await createVaultMemoryOp(ctx, { content: "secret", scope: "private" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    // Content should be encrypted
    expect(setRawSpy).toHaveBeenCalledWith("content", "encrypted:secret");
    // Scope should remain unencrypted
    expect(setRawSpy).toHaveBeenCalledWith("scope", "private");
  });

  it("does NOT encrypt content when wallet context is missing", async () => {
    const ctx = makeCtx(); // no walletAddress
    await createVaultMemoryOp(ctx, { content: "plain text" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("content", "plain text");
  });

  it("returns a StoredVaultMemory with correct fields", async () => {
    const ctx = makeCtx();
    const result = await createVaultMemoryOp(ctx, { content: "hi", scope: "shared" });

    expect(result).toHaveProperty("uniqueId");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("scope");
    expect(result).toHaveProperty("createdAt");
    expect(result).toHaveProperty("updatedAt");
    expect(result).toHaveProperty("isDeleted");
  });
});

describe("getVaultMemoryOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the memory when found and not deleted", async () => {
    const ctx = makeCtx();
    const result = await getVaultMemoryOp(ctx, "mem_1");
    expect(result).not.toBeNull();
    expect(result!.uniqueId).toBe("mem_1");
  });

  it("returns null when the memory is soft-deleted", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => mockRecord({ isDeleted: true })),
      } as any,
    });
    const result = await getVaultMemoryOp(ctx, "mem_1");
    expect(result).toBeNull();
  });

  it("returns null when find throws (not found)", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => {
          throw new Error("not found");
        }),
      } as any,
    });
    const result = await getVaultMemoryOp(ctx, "nonexistent");
    expect(result).toBeNull();
  });
});

describe("getAllVaultMemoriesOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all non-deleted memories when no scope filter", async () => {
    const ctx = makeCtx();
    const results = await getAllVaultMemoriesOp(ctx);

    expect(results).toHaveLength(2);
    const queryFn = ctx.vaultMemoryCollection.query as ReturnType<typeof vi.fn>;
    expect(queryFn).toHaveBeenCalled();
  });

  it("passes scope filter when options.scopes is provided", async () => {
    const fetchFn = vi.fn(async () => [mockRecord({ id: "mem_pub" })]);
    const queryFn = vi.fn((..._conditions: any[]) => ({ fetch: fetchFn }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    const results = await getAllVaultMemoriesOp(ctx, { scopes: ["shared"] });

    expect(results).toHaveLength(1);
    // The query should have been called with conditions including Q.where for scope.
    // We check that more than 2 conditions were passed (is_deleted + scope + sortBy).
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(3); // is_deleted, scope, sortBy
  });

  it("does NOT add scope condition when scopes is empty array", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({ fetch: fetchFn }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx, { scopes: [] });

    // Only is_deleted and sortBy — no scope condition
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(2);
  });

  it("does NOT add scope condition when options is undefined", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({ fetch: fetchFn }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx);

    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(2);
  });
});

describe("updateVaultMemoryOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates content and scope when both provided", async () => {
    const updateFn = vi.fn(async (updater: (r: any) => void) => {
      const setRawSpy = vi.fn();
      updater({ _setRaw: setRawSpy });
      return setRawSpy;
    });
    const record = mockRecord({ update: updateFn });
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    const result = await updateVaultMemoryOp(ctx, "mem_1", {
      content: "updated",
      scope: "shared",
    });

    expect(result).not.toBeNull();
    expect(updateFn).toHaveBeenCalledTimes(1);

    // Verify the updater function
    const updater = updateFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    updater({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("content", "updated");
    expect(setRawSpy).toHaveBeenCalledWith("scope", "shared");
  });

  it("does NOT set scope when opts.scope is undefined", async () => {
    const updateFn = vi.fn(async (updater: (r: any) => void) => {
      updater({ _setRaw: vi.fn() });
    });
    const record = mockRecord({ update: updateFn });
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    await updateVaultMemoryOp(ctx, "mem_1", { content: "new content" });

    const updater = updateFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    updater({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("content", "new content");
    expect(setRawSpy).not.toHaveBeenCalledWith("scope", expect.anything());
  });

  it("returns null for soft-deleted records", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => mockRecord({ isDeleted: true })),
      } as any,
    });

    const result = await updateVaultMemoryOp(ctx, "mem_1", { content: "x" });
    expect(result).toBeNull();
  });

  it("returns null when find throws", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => {
          throw new Error("not found");
        }),
      } as any,
    });

    const result = await updateVaultMemoryOp(ctx, "bad_id", { content: "x" });
    expect(result).toBeNull();
  });
});

describe("deleteVaultMemoryOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("soft-deletes a record by setting is_deleted to true", async () => {
    const updateFn = vi.fn(async (updater: (r: any) => void) => {
      updater({ _setRaw: vi.fn() });
    });
    const record = mockRecord({ update: updateFn });
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    const result = await deleteVaultMemoryOp(ctx, "mem_1");
    expect(result).toBe(true);

    const updater = updateFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    updater({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("is_deleted", true);
  });

  it("returns false for already-deleted records", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => mockRecord({ isDeleted: true })),
      } as any,
    });

    const result = await deleteVaultMemoryOp(ctx, "mem_1");
    expect(result).toBe(false);
  });

  it("returns false when find throws", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => {
          throw new Error("nope");
        }),
      } as any,
    });

    const result = await deleteVaultMemoryOp(ctx, "bad_id");
    expect(result).toBe(false);
  });
});

describe("vaultMemoryToStored", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps memory.scope to scope in returned object", async () => {
    const record = mockRecord();
    // Override scope via _setRaw to simulate "shared"
    record._setRaw("scope", "shared");
    const result = await vaultMemoryToStored(record as any);
    expect(result.scope).toBe("shared");
  });

  it("returns raw fields without decryption when no wallet address", async () => {
    const record = mockRecord();
    const result = await vaultMemoryToStored(record as any);
    expect(result.uniqueId).toBe("mem_1");
    expect(result.content).toBe("test content");
    expect(result.scope).toBe("private");
  });

  it("decrypts content when wallet address is provided", async () => {
    const record = mockRecord();
    record._setRaw("content", "encrypted:secret");
    const result = await vaultMemoryToStored(record as any, "0xabc", vi.fn() as any);
    // The mock decryptVaultMemoryFields removes "encrypted:" prefix
    expect(result.content).toBe("secret");
  });
});

describe("userId scoping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets user_id on create when ctx.userId is defined", async () => {
    const ctx = makeCtx({ userId: "user_123" });
    await createVaultMemoryOp(ctx, { content: "hello" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("user_id", "user_123");
  });

  it("sets user_id to null on create when ctx.userId is undefined", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, { content: "hello" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("user_id", null);
  });

  it("filters by user_id in getAllVaultMemoriesOp when ctx.userId is set", async () => {
    const fetchFn = vi.fn(async () => [mockRecord()]);
    const queryFn = vi.fn((..._conditions: any[]) => ({ fetch: fetchFn }));
    const ctx = makeCtx({
      userId: "user_123",
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx);

    // is_deleted + user_id + sortBy = 3 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(3);
  });

  it("does NOT filter by user_id in getAllVaultMemoriesOp when ctx.userId is undefined", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({ fetch: fetchFn }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx);

    // is_deleted + sortBy = 2 conditions (no user_id filter)
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(2);
  });
});

describe("updateVaultMemoryEmbeddingOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true and writes the embedding string to the record", async () => {
    const updateFn = vi.fn(async (updater: (r: any) => void) => {
      updater({ _setRaw: vi.fn() });
    });
    const record = mockRecord({ update: updateFn });
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    const result = await updateVaultMemoryEmbeddingOp(ctx, "mem_1", "[1,0,0]");

    expect(result).toBe(true);
    const updater = updateFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    updater({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("embedding", "[1,0,0]");
  });

  it("returns false for soft-deleted records", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => mockRecord({ isDeleted: true })),
      } as any,
    });

    const result = await updateVaultMemoryEmbeddingOp(ctx, "mem_1", "[1,0,0]");
    expect(result).toBe(false);
  });

  it("returns false when find throws (record not found)", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => {
          throw new Error("not found");
        }),
      } as any,
    });

    const result = await updateVaultMemoryEmbeddingOp(ctx, "nonexistent", "[1,0,0]");
    expect(result).toBe(false);
  });

  it("returns false when database.write throws", async () => {
    const record = mockRecord({
      update: vi.fn(async () => {
        throw new Error("write failed");
      }),
    });
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    const result = await updateVaultMemoryEmbeddingOp(ctx, "mem_1", "[1,0,0]");
    expect(result).toBe(false);
  });
});

describe("updateVaultMemoryOp — embedding field handling", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets embedding to null when opts.embedding is null (clears stale embedding)", async () => {
    const updateFn = vi.fn(async (updater: (r: any) => void) => {
      updater({ _setRaw: vi.fn() });
    });
    const record = mockRecord({ update: updateFn });
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    await updateVaultMemoryOp(ctx, "mem_1", { content: "new content", embedding: null });

    const updater = updateFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    updater({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("embedding", null);
  });

  it("sets embedding to the provided string when opts.embedding is a string", async () => {
    const updateFn = vi.fn(async (updater: (r: any) => void) => {
      updater({ _setRaw: vi.fn() });
    });
    const record = mockRecord({ update: updateFn });
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    await updateVaultMemoryOp(ctx, "mem_1", {
      content: "new content",
      embedding: "[0.5,0.5]",
    });

    const updater = updateFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    updater({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("embedding", "[0.5,0.5]");
  });

  it("does NOT set embedding when opts.embedding is undefined (preserves existing embedding)", async () => {
    const updateFn = vi.fn(async (updater: (r: any) => void) => {
      updater({ _setRaw: vi.fn() });
    });
    const record = mockRecord({ update: updateFn });
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    await updateVaultMemoryOp(ctx, "mem_1", { content: "new content" });

    const updater = updateFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    updater({ _setRaw: setRawSpy });
    expect(setRawSpy).not.toHaveBeenCalledWith("embedding", expect.anything());
  });
});

describe("createVaultMemoryOp — embedding field", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets embedding when opts.embedding is provided", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, { content: "hello", embedding: "[1,2,3]" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("embedding", "[1,2,3]");
  });

  it("does NOT set embedding when opts.embedding is omitted", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, { content: "hello" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).not.toHaveBeenCalledWith("embedding", expect.anything());
  });
});

describe("deleteAllVaultMemoriesForUserOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("soft-deletes all non-deleted memories for a given userId", async () => {
    const records = [mockRecord({ id: "mem_1" }), mockRecord({ id: "mem_2" })];
    const fetchFn = vi.fn(async () => records);
    const queryFn = vi.fn((..._conditions: any[]) => ({ fetch: fetchFn }));
    const batchFn = vi.fn(async () => {});
    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => any) => cb()),
        batch: batchFn,
      } as any,
      vaultMemoryCollection: { query: queryFn } as any,
    });

    const count = await deleteAllVaultMemoriesForUserOp(ctx, "user_123");
    expect(count).toBe(2);
    expect(batchFn).toHaveBeenCalledTimes(1);
  });

  it("returns 0 when no memories exist for the user", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({ fetch: fetchFn }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    const count = await deleteAllVaultMemoriesForUserOp(ctx, "no_such_user");
    expect(count).toBe(0);
  });
});
