import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VaultMemoryOperationsContext } from "./operations";
import {
  createVaultMemoryOp,
  createVaultMemoriesBatchOp,
  getVaultMemoryOp,
  getAllVaultMemoriesOp,
  getAllVaultMemoryContentsOp,
  updateVaultMemoryOp,
  updateVaultMemoryEmbeddingOp,
  deleteVaultMemoryOp,
  supersedeVaultMemoryOp,
  deleteAllVaultMemoriesForUserOp,
  setMemoryEntitiesOp,
  clearMemoryTopicsOverrideOp,
  getMemoriesNeedingTopicExtractionOp,
  stampTopicsExtractedAtOp,
  TOPICS_EXTRACTION_VERSION,
  vaultMemoryToStored,
} from "./operations";
import { linkMemoryEntitiesOp } from "../entities/operations";

// Mock encryption so tests don't need real crypto
vi.mock("./encryption", () => ({
  encryptVaultMemoryContent: vi.fn(async (content: string) => `encrypted:${content}`),
  decryptVaultMemoryFields: vi.fn(async (memory: any) => ({
    ...memory,
    content: memory.content.replace("encrypted:", ""),
  })),
}));

// Mock the entity ops so setMemoryEntitiesOp's link/unlink calls are observable
// without a real WatermelonDB.
vi.mock("../entities/operations", () => ({
  linkMemoryEntitiesOp: vi.fn(async () => []),
  unlinkMemoryEntitiesOp: vi.fn(async () => undefined),
  unlinkAllMemoryEntitiesForUserOp: vi.fn(async () => undefined),
}));

/**
 * Create a mock VaultMemory record that mimics WatermelonDB Model.
 */
function mockRecord(overrides: Record<string, any> = {}) {
  const raw: Record<string, any> = {
    content: "test content",
    scope: "private",
    user_id: null,
    folder_id: null,
    is_deleted: false,
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
    ...overrides,
  };
  return {
    id: overrides.id ?? "mem_1",
    // Snake_case raw row, as WatermelonDB's `unsafeFetchRaw` returns (incl. `id`). The bulk
    // read ops now use unsafeFetchRaw, so the query mocks below serve `r._raw`.
    _raw: { id: overrides.id ?? "mem_1", ...raw },
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
    get folderId() {
      return raw.folder_id ?? null;
    },
    get topicsUserManaged() {
      return raw.topics_user_managed ?? null;
    },
    get topicsExtractedAt() {
      return raw.topics_extracted_at ?? null;
    },
    get supersededBy() {
      return raw.superseded_by ?? null;
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
        unsafeFetchRaw: vi.fn(async () =>
          [mockRecord({ id: "mem_1" }), mockRecord({ id: "mem_2" })].map((r) => r._raw)
        ),
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
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    const results = await getAllVaultMemoriesOp(ctx, { scopes: ["shared"] });

    expect(results).toHaveLength(1);
    // The query should have been called with conditions including Q.where for scope.
    // We check that more than 2 conditions were passed (is_deleted + scope + sortBy).
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(4); // is_deleted, superseded_by, scope, sortBy
  });

  it("drops the is_deleted filter and returns deleted rows when includeDeleted is true", async () => {
    const live = mockRecord({ id: "mem_live" });
    const gone = mockRecord({ id: "mem_gone" });
    // unsafeFetchRaw serves _raw, so set the soft-delete flag on the raw row.
    gone._raw.is_deleted = true;
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: vi.fn(async () => [live, gone]),
      unsafeFetchRaw: vi.fn(async () => [live._raw, gone._raw]),
    }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    const results = await getAllVaultMemoriesOp(ctx, { includeDeleted: true });

    // is_deleted clause omitted → superseded_by + sortBy remain.
    expect(queryFn.mock.calls[0].length).toBe(2);
    expect(results).toHaveLength(2);
    expect(results.find((m) => m.uniqueId === "mem_gone")?.isDeleted).toBe(true);
    expect(results.find((m) => m.uniqueId === "mem_live")?.isDeleted).toBe(false);
  });

  it("keeps the is_deleted filter when includeDeleted is false", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    await getAllVaultMemoriesOp(ctx, { includeDeleted: false });

    // is_deleted + superseded_by + sortBy — the filter is retained.
    expect(queryFn.mock.calls[0].length).toBe(3);
  });

  it("does NOT add scope condition when scopes is empty array", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx, { scopes: [] });

    // is_deleted + superseded_by + sortBy — no scope condition
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(3);
  });

  it("does NOT add scope condition when options is undefined", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx);

    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(3);
  });

  it("adds since condition when options.since is provided", async () => {
    const fetchFn = vi.fn(async () => [mockRecord()]);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx, { since: new Date("2025-06-01") });

    // is_deleted + superseded_by + since + sortBy = 4 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(4);
  });

  it("adds limit condition when options.limit is provided", async () => {
    const fetchFn = vi.fn(async () => [mockRecord()]);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx, { limit: 5 });

    // is_deleted + superseded_by + sortBy + take = 4 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(4);
  });

  it("adds both since and limit conditions together", async () => {
    const fetchFn = vi.fn(async () => [mockRecord()]);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx, { since: new Date("2025-06-01"), limit: 10 });

    // is_deleted + superseded_by + since + sortBy + take = 5 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(5);
  });

  it("combines since with scopes and userId", async () => {
    const fetchFn = vi.fn(async () => [mockRecord()]);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      userId: "user_123",
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx, { scopes: ["shared"], since: new Date("2025-06-01") });

    // is_deleted + superseded_by + scope + user_id + since + sortBy = 6 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(6);
  });

  it("returns empty array when since is in the future", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    const results = await getAllVaultMemoriesOp(ctx, { since: new Date("2099-01-01") });
    expect(results).toHaveLength(0);
  });

  it("returns all memories when since is omitted (backward compat)", async () => {
    const ctx = makeCtx();
    const results = await getAllVaultMemoriesOp(ctx);
    expect(results).toHaveLength(2);
  });
});

describe("getAllVaultMemoryContentsOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all contents when since is omitted", async () => {
    const ctx = makeCtx();
    const results = await getAllVaultMemoryContentsOp(ctx);
    expect(results).toHaveLength(2);
    expect(typeof results[0]).toBe("string");
  });

  it("adds since condition when options.since is provided", async () => {
    const fetchFn = vi.fn(async () => [mockRecord()]);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoryContentsOp(ctx, { since: new Date("2025-06-01") });

    // is_deleted + superseded_by + since = 3 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(3);
  });

  it("adds both userId and since conditions together", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      userId: "user_123",
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoryContentsOp(ctx, { since: new Date("2025-06-01") });

    // is_deleted + superseded_by + user_id + since = 4 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(4);
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

describe("supersedeVaultMemoryOp (A2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stamps superseded_by + superseded_at on the retired row", async () => {
    const updateFn = vi.fn(async (updater: (r: any) => void) => {
      updater({ _setRaw: vi.fn() });
    });
    const record = mockRecord({ update: updateFn });
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    const result = await supersedeVaultMemoryOp(ctx, "old", "new");
    expect(result).toBe(true);

    const setRawSpy = vi.fn();
    updateFn.mock.calls[0][0]({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("superseded_by", "new");
    expect(setRawSpy).toHaveBeenCalledWith("superseded_at", expect.any(Number));
  });

  it("returns false (no-op) for an already-superseded row", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => mockRecord({ superseded_by: "someone-else" })),
      } as any,
    });
    expect(await supersedeVaultMemoryOp(ctx, "old", "new")).toBe(false);
  });

  it("returns false when the successor id does not exist (no dangling pointer)", async () => {
    const target = mockRecord({ id: "old", update: vi.fn() });
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async (id: string) => {
          if (id === "old") return target;
          throw new Error("not found");
        }),
      } as any,
    });
    expect(await supersedeVaultMemoryOp(ctx, "old", "missing")).toBe(false);
    expect(target.update).not.toHaveBeenCalled();
  });

  it("returns false when the successor is deleted or already superseded", async () => {
    const target = mockRecord({ id: "old", update: vi.fn() });
    for (const bad of [{ isDeleted: true }, { superseded_by: "x" }]) {
      const successor = mockRecord({ id: "new", ...bad });
      const ctx = makeCtx({
        vaultMemoryCollection: {
          find: vi.fn(async (id: string) => (id === "old" ? target : successor)),
        } as any,
      });
      expect(await supersedeVaultMemoryOp(ctx, "old", "new")).toBe(false);
    }
    expect(target.update).not.toHaveBeenCalled();
  });

  it("returns false for a soft-deleted row", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => mockRecord({ isDeleted: true })),
      } as any,
    });
    expect(await supersedeVaultMemoryOp(ctx, "old", "new")).toBe(false);
  });

  it("refuses to let a memory supersede itself", async () => {
    const find = vi.fn(async () => mockRecord());
    const ctx = makeCtx({ vaultMemoryCollection: { find } as any });
    expect(await supersedeVaultMemoryOp(ctx, "same", "same")).toBe(false);
    expect(find).not.toHaveBeenCalled();
  });

  it("returns false when find throws", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => {
          throw new Error("nope");
        }),
      } as any,
    });
    expect(await supersedeVaultMemoryOp(ctx, "old", "new")).toBe(false);
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
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      userId: "user_123",
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx);

    // is_deleted + superseded_by + user_id + sortBy = 4 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(4);
  });

  it("does NOT filter by user_id in getAllVaultMemoriesOp when ctx.userId is undefined", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx);

    // is_deleted + superseded_by + sortBy = 3 conditions (no user_id filter)
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(3);
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
    // deleteAllVaultMemoriesForUserOp uses .fetch() (needs Models for prepareUpdate), NOT
    // unsafeFetchRaw — so no unsafeFetchRaw mock here.
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
    // deleteAllVaultMemoriesForUserOp uses .fetch(), not unsafeFetchRaw — no mock needed.
    const queryFn = vi.fn((..._conditions: any[]) => ({ fetch: fetchFn }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    const count = await deleteAllVaultMemoriesForUserOp(ctx, "no_such_user");
    expect(count).toBe(0);
  });
});

describe("createVaultMemoryOp — folderId field", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets folder_id when folderId is provided", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, { content: "hello", folderId: "folder_1" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("folder_id", "folder_1");
  });

  it("sets folder_id to null when folderId is omitted", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, { content: "hello" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("folder_id", null);
  });
});

describe("createVaultMemoriesBatchOp — folderId propagation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("propagates per-item folderId to each record", async () => {
    const setRawSpies: ReturnType<typeof vi.fn>[] = [];
    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => any) => cb()),
        batch: vi.fn(async () => {}),
      } as any,
      vaultMemoryCollection: {
        prepareCreate: vi.fn((builder: (r: any) => void) => {
          const spy = vi.fn();
          setRawSpies.push(spy);
          builder({ _setRaw: spy });
          // Return a mock record for vaultMemoryToStored
          return mockRecord();
        }),
      } as any,
    });

    await createVaultMemoriesBatchOp(ctx, [
      { content: "mem a", folderId: "folder_x" },
      { content: "mem b" },
    ]);

    expect(setRawSpies[0]).toHaveBeenCalledWith("folder_id", "folder_x");
    expect(setRawSpies[1]).toHaveBeenCalledWith("folder_id", null);
  });
});

describe("getAllVaultMemoriesOp — folderId filtering", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds folderId WHERE clause when folderId is a string", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx, { folderId: "folder_1" });

    // is_deleted + superseded_by + folder_id + sortBy = 4 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(4);
  });

  it("adds folderId WHERE clause when folderId is null (unfiled)", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx, { folderId: null });

    // is_deleted + superseded_by + folder_id + sortBy = 4 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(4);
  });

  it("does NOT add folderId clause when folderId is undefined", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
    });

    await getAllVaultMemoriesOp(ctx);

    // is_deleted + superseded_by + sortBy = 3 conditions (no folder_id)
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(3);
  });
});

describe("setMemoryEntitiesOp", () => {
  beforeEach(() => vi.clearAllMocks());

  /** Mock a memory_entity link row with a destroy spy. */
  function linkRow(entityId: string) {
    return { entityId, prepareDestroyPermanently: vi.fn(() => ({ _op: "destroy", entityId })) };
  }

  /** ctx whose entityCtx serves `existing` links and records batch deletes. */
  function ctxWithEntity(record = mockRecord(), existing: ReturnType<typeof linkRow>[] = []) {
    const batch = vi.fn(async () => undefined);
    const ctx = makeCtx({
      database: { write: vi.fn(async (cb: () => any) => cb()), batch } as any,
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
      entityCtx: {
        memoryEntityCollection: {
          query: vi.fn(() => ({ fetch: vi.fn(async () => existing) })),
        },
      } as any,
    });
    return { ctx, batch };
  }

  it("adds new links, removes only stale ones, and marks user-managed", async () => {
    // Existing links: one to keep (tokyo), one stale (paris → removed).
    const { ctx, batch } = ctxWithEntity(mockRecord({ id: "mem_1" }), [
      linkRow("ent_tokyo"),
      linkRow("ent_paris"),
    ]);
    // linkMemoryEntitiesOp returns the (now-linked) entity set.
    vi.mocked(linkMemoryEntitiesOp).mockResolvedValueOnce([
      { uniqueId: "ent_tokyo" },
      { uniqueId: "ent_berlin" },
    ] as any);

    const result = await setMemoryEntitiesOp(ctx, "mem_1", [
      "tokyo",
      { name: "berlin", kind: "place" },
    ]);

    expect(linkMemoryEntitiesOp).toHaveBeenCalledWith(ctx.entityCtx, "mem_1", [
      "tokyo",
      { name: "berlin", kind: "place" },
    ]);
    // Only the stale link (ent_paris) is destroyed; ent_tokyo is kept.
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0]).toHaveLength(1);
    expect(result?.topicsUserManaged).toBe(true);
  });

  it("links are added before stale removal (no wipe on partial failure)", async () => {
    const { ctx } = ctxWithEntity(mockRecord({ id: "mem_1" }), [linkRow("ent_old")]);
    const order: string[] = [];
    vi.mocked(linkMemoryEntitiesOp).mockImplementationOnce(async () => {
      order.push("link");
      return [{ uniqueId: "ent_new" }] as any;
    });
    (ctx.database.batch as any).mockImplementationOnce(async () => {
      order.push("removeStale");
    });
    await setMemoryEntitiesOp(ctx, "mem_1", ["new"]);
    expect(order).toEqual(["link", "removeStale"]);
  });

  it("clears all topics (empty set) but stays user-managed", async () => {
    const { ctx, batch } = ctxWithEntity(mockRecord({ id: "mem_1" }), [linkRow("ent_a")]);
    const result = await setMemoryEntitiesOp(ctx, "mem_1", []);
    // No link call for an empty set; the lone existing link is removed.
    expect(linkMemoryEntitiesOp).not.toHaveBeenCalled();
    expect(batch).toHaveBeenCalledTimes(1);
    expect(result?.topicsUserManaged).toBe(true);
  });

  it("preserves updated_at so a topic edit doesn't inflate recency", async () => {
    const record = mockRecord({ id: "mem_1" });
    const before = record.updatedAt.getTime(); // Date on read; op restores this ms value
    const { ctx } = ctxWithEntity(record);
    vi.mocked(linkMemoryEntitiesOp).mockResolvedValueOnce([{ uniqueId: "ent_tokyo" }] as any);
    await setMemoryEntitiesOp(ctx, "mem_1", ["tokyo"]);
    expect(record.updatedAt).toBe(before);
  });

  it("throws when ctx.entityCtx is missing", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => mockRecord()) } as any,
    });
    await expect(setMemoryEntitiesOp(ctx, "mem_1", ["tokyo"])).rejects.toThrow(/entityCtx/);
  });

  it("returns null for a soft-deleted memory (no link changes)", async () => {
    const { ctx, batch } = ctxWithEntity(mockRecord({ id: "mem_1", isDeleted: true }));
    const result = await setMemoryEntitiesOp(ctx, "mem_1", ["tokyo"]);
    expect(result).toBeNull();
    expect(linkMemoryEntitiesOp).not.toHaveBeenCalled();
    expect(batch).not.toHaveBeenCalled();
  });
});

describe("clearMemoryTopicsOverrideOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears the user-managed flag and returns true", async () => {
    const record = mockRecord({ id: "mem_1" });
    record._setRaw("topics_user_managed", true);
    const ctx = makeCtx({ vaultMemoryCollection: { find: vi.fn(async () => record) } as any });
    const ok = await clearMemoryTopicsOverrideOp(ctx, "mem_1");
    expect(ok).toBe(true);
    expect(record.topicsUserManaged).toBe(false);
  });

  it("nulls the version and preserves an existing stamp (routes to stale-version path)", async () => {
    const setRawSpy = vi.fn();
    const updateFn = vi.fn(async (updater: (r: any) => void) => updater({ _setRaw: setRawSpy }));
    const record = mockRecord({ id: "mem_1", topics_extracted_at: 3_000, update: updateFn });
    const ctx = makeCtx({ vaultMemoryCollection: { find: vi.fn(async () => record) } as any });

    await clearMemoryTopicsOverrideOp(ctx, "mem_1");

    expect(setRawSpy).toHaveBeenCalledWith("topics_extracted_version", null);
    // An existing stamp is left untouched (never overwritten, never nulled) — the
    // stale version alone routes it to the pending/LLM path.
    expect(setRawSpy.mock.calls.every((c) => c[0] !== "topics_extracted_at")).toBe(true);
  });

  it("forces a stamp when the row was never LLM-stamped (re-extract, not grandfather)", async () => {
    const setRawSpy = vi.fn();
    const updateFn = vi.fn(async (updater: (r: any) => void) => updater({ _setRaw: setRawSpy }));
    // No topics_extracted_at → the getter returns null (user curated topics
    // before any LLM pass). Clear must force a stamp so the sweep re-extracts it.
    const record = mockRecord({
      id: "mem_1",
      updated_at: new Date("2025-06-01"),
      update: updateFn,
    });
    const ctx = makeCtx({ vaultMemoryCollection: { find: vi.fn(async () => record) } as any });

    await clearMemoryTopicsOverrideOp(ctx, "mem_1");

    expect(setRawSpy).toHaveBeenCalledWith("topics_extracted_version", null);
    expect(setRawSpy).toHaveBeenCalledWith("topics_extracted_at", new Date("2025-06-01").getTime());
  });
});

describe("getMemoriesNeedingTopicExtractionOp", () => {
  beforeEach(() => vi.clearAllMocks());

  /** Raw row as unsafeFetchRaw returns it (snake_case, numeric timestamps). */
  function rawRow(id: string, overrides: Record<string, any> = {}) {
    return {
      id,
      content: `content of ${id}`,
      scope: "private",
      folder_id: null,
      user_id: null,
      is_deleted: false,
      created_at: 1_000,
      updated_at: 2_000,
      topics_extracted_at: null,
      ...overrides,
    };
  }

  function sweepCtx(rows: any[], linkRows: Array<{ memory_id: string }>) {
    // Raw link rows (snake_case) — the op uses unsafeFetchRaw to avoid pinning
    // link Models into the RecordCache.
    const memoryEntityQuery = vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => linkRows) }));
    return {
      ctx: makeCtx({
        vaultMemoryCollection: {
          query: vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => rows) })),
        } as any,
        entityCtx: {
          database: {} as any,
          entityCollection: {} as any,
          memoryEntityCollection: { query: memoryEntityQuery } as any,
        },
      }),
      memoryEntityQuery,
    };
  }

  it("throws without ctx.entityCtx", async () => {
    const ctx = makeCtx();
    await expect(getMemoriesNeedingTopicExtractionOp(ctx)).rejects.toThrow(/entityCtx/);
  });

  it("partitions rows: unlinked-unstamped pending, linked-unstamped grandfathered, edited-since-stamp pending, up-to-date excluded", async () => {
    const rows = [
      rawRow("mem_backfill"), // no stamp, no links → pending
      rawRow("mem_legacy"), // no stamp, HAS links → linkedUnstamped
      rawRow("mem_edited", { topics_extracted_at: 1_500, updated_at: 2_000 }), // edited after stamp → pending
      rawRow("mem_current", {
        topics_extracted_at: 3_000,
        updated_at: 2_000,
        topics_extracted_version: TOPICS_EXTRACTION_VERSION, // fresh stamp AT current version → excluded
      }),
    ];
    const { ctx } = sweepCtx(rows, [{ memory_id: "mem_legacy" }]);

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.pending.map((m) => m.uniqueId).sort()).toEqual(["mem_backfill", "mem_edited"]);
    expect(result.linkedUnstamped).toEqual(["mem_legacy"]);
  });

  it("re-extracts stamped rows behind the current extraction version (incl. legacy null-version rows)", async () => {
    // A TOPICS_EXTRACTION_VERSION bump (or a pre-v37 null-version row, read as 0)
    // makes an already-stamped, unedited memory pending again so prompt/model
    // improvements propagate across the vault.
    const rows = [
      rawRow("mem_nullver", { topics_extracted_at: 3_000, updated_at: 2_000 }), // null version → 0 < current → pending
      rawRow("mem_stalever", {
        topics_extracted_at: 3_000,
        updated_at: 2_000,
        topics_extracted_version: TOPICS_EXTRACTION_VERSION - 1, // behind → pending
      }),
      rawRow("mem_curver", {
        topics_extracted_at: 3_000,
        updated_at: 2_000,
        topics_extracted_version: TOPICS_EXTRACTION_VERSION, // current → excluded
      }),
    ];
    const { ctx } = sweepCtx(rows, []);

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.pending.map((m) => m.uniqueId).sort()).toEqual(["mem_nullver", "mem_stalever"]);
  });

  it("applies limit to pending", async () => {
    const rows = [rawRow("mem_a"), rawRow("mem_b"), rawRow("mem_c")];
    const { ctx } = sweepCtx(rows, []);

    const result = await getMemoriesNeedingTopicExtractionOp(ctx, { limit: 2 });
    expect(result.pending.length).toBe(2);
  });

  it("also caps linkedUnstamped under limit (grandfather backlog drains across sweeps)", async () => {
    // All linked + unstamped → all grandfathered. Stamping loads a Model per
    // row, so an uncapped list would spike the RecordCache on a legacy vault.
    const rows = [rawRow("mem_1"), rawRow("mem_2"), rawRow("mem_3")];
    const { ctx } = sweepCtx(rows, [
      { memory_id: "mem_1" },
      { memory_id: "mem_2" },
      { memory_id: "mem_3" },
    ]);

    const result = await getMemoriesNeedingTopicExtractionOp(ctx, { limit: 2 });
    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped.length).toBe(2);
  });

  it("excludes user-managed rows via the query conditions", async () => {
    const queryFn = vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => []) }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
      entityCtx: {
        database: {} as any,
        entityCollection: {} as any,
        memoryEntityCollection: { query: vi.fn() } as any,
      },
    });
    await getMemoriesNeedingTopicExtractionOp(ctx);
    // user-managed OR-clause + is_deleted + superseded_by + sortBy = 4 conditions
    expect(queryFn.mock.calls[0].length).toBe(4);
  });
});

describe("stampTopicsExtractedAtOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stamps eligible rows, preserves updated_at, and returns stamped ids", async () => {
    const record = mockRecord({ id: "mem_1" });
    const batchFn = vi.fn(async () => {});
    const queryFn = vi.fn(() => ({
      unsafeFetchRaw: vi.fn(async () => [record._raw]),
    }));
    const ctx = makeCtx({
      database: { write: vi.fn(async (cb: () => any) => cb()), batch: batchFn } as any,
      vaultMemoryCollection: { find: vi.fn(async () => record), query: queryFn } as any,
    });

    const stamped = await stampTopicsExtractedAtOp(ctx, ["mem_1"], 5_000);

    expect(stamped).toEqual(["mem_1"]);
    expect(batchFn).toHaveBeenCalledTimes(1);
    // Run the prepared updater against a spy to verify the raw writes.
    const prepared = (record.prepareUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const setRawSpy = vi.fn();
    prepared({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("topics_extracted_at", 5_000);
    // Defaults to the current extraction version so the row isn't re-extracted
    // until a future version bump.
    expect(setRawSpy).toHaveBeenCalledWith("topics_extracted_version", TOPICS_EXTRACTION_VERSION);
    expect(setRawSpy).toHaveBeenCalledWith("updated_at", new Date("2025-01-01").getTime());
  });

  it("writes an explicit version when provided", async () => {
    const record = mockRecord({ id: "mem_1" });
    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => any) => cb()),
        batch: vi.fn(async () => {}),
      } as any,
      vaultMemoryCollection: {
        find: vi.fn(async () => record),
        query: vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => [record._raw]) })),
      } as any,
    });

    await stampTopicsExtractedAtOp(ctx, ["mem_1"], 5_000, 42);

    const prepared = (record.prepareUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const setRawSpy = vi.fn();
    prepared({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("topics_extracted_version", 42);
  });

  it("reads updated_at from the LIVE model in-writer, not a stale pre-fetch", async () => {
    // Concurrent-edit guard: the value written back must be the live Model's
    // updated_at (an edit that committed before the writer), never a snapshot
    // taken earlier — otherwise updated_at could fall behind topics_extracted_at
    // and the edited memory would never re-enter the sweep.
    const liveUpdatedAt = new Date("2026-03-03").getTime();
    const record = mockRecord({ id: "mem_1", updated_at: new Date("2026-03-03") });
    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => any) => cb()),
        batch: vi.fn(async () => {}),
      } as any,
      // A raw snapshot with a DIFFERENT (older) updated_at — the op must ignore it.
      vaultMemoryCollection: {
        find: vi.fn(async () => record),
        query: vi.fn(() => ({
          unsafeFetchRaw: vi.fn(async () => [{ ...record._raw, updated_at: 1 }]),
        })),
      } as any,
    });

    await stampTopicsExtractedAtOp(ctx, ["mem_1"], 9_999);

    const prepared = (record.prepareUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const setRawSpy = vi.fn();
    prepared({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("updated_at", liveUpdatedAt);
    expect(setRawSpy).not.toHaveBeenCalledWith("updated_at", 1);
  });

  it("never yields the event loop between prepareUpdate and batch (same-tick contract)", async () => {
    // WatermelonDB's dev diagnostic throws (uncaught → RedBox on RN Debug
    // builds) when a prepared update is still pending as the event loop turns
    // — i.e. when any `await` sits between prepareUpdate() and batch().
    // Simulate the diagnostic: each awaited find() is an event-loop yield, so
    // any record prepared before it must already have been batched.
    // Regression: the topic sweep emitted one "wasn't sent to batch()
    // synchronously" error per stamped memory (interleaved find/prepare loop).
    const pending = new Set<string>();
    const violations: string[] = [];
    const makeTracked = (id: string) => {
      const record = mockRecord({ id });
      (record.prepareUpdate as ReturnType<typeof vi.fn>).mockImplementation((updater: any) => {
        pending.add(id);
        return { updater };
      });
      return record;
    };
    const records: Record<string, any> = {
      mem_a: makeTracked("mem_a"),
      mem_b: makeTracked("mem_b"),
    };
    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => any) => cb()),
        batch: vi.fn(async () => pending.clear()),
      } as any,
      vaultMemoryCollection: {
        find: vi.fn(async (id: string) => {
          if (pending.size > 0) violations.push(...pending);
          return records[id];
        }),
      } as any,
    });

    const stamped = await stampTopicsExtractedAtOp(ctx, ["mem_a", "mem_b"], 5_000);

    expect(stamped).toEqual(["mem_a", "mem_b"]);
    expect(violations).toEqual([]);
  });

  it("skips deleted and user-managed rows (re-checked in the writer)", async () => {
    const managed = mockRecord({ id: "mem_managed", topics_user_managed: true });
    const deleted = mockRecord({ id: "mem_deleted", is_deleted: true });
    const ok = mockRecord({ id: "mem_ok" });
    const records: Record<string, any> = {
      mem_managed: managed,
      mem_deleted: deleted,
      mem_ok: ok,
    };
    const queryFn = vi.fn(() => ({
      unsafeFetchRaw: vi.fn(async () => [managed._raw, deleted._raw, ok._raw]),
    }));
    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => any) => cb()),
        batch: vi.fn(async () => {}),
      } as any,
      vaultMemoryCollection: {
        find: vi.fn(async (id: string) => records[id]),
        query: queryFn,
      } as any,
    });

    const stamped = await stampTopicsExtractedAtOp(
      ctx,
      ["mem_managed", "mem_deleted", "mem_ok"],
      5_000
    );

    expect(stamped).toEqual(["mem_ok"]);
    expect(managed.prepareUpdate).not.toHaveBeenCalled();
    expect(deleted.prepareUpdate).not.toHaveBeenCalled();
  });

  it("returns [] for missing rows and empty input", async () => {
    const queryFn = vi.fn(() => ({
      unsafeFetchRaw: vi.fn(async () => []),
    }));
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => {
          throw new Error("not found");
        }),
        query: queryFn,
      } as any,
    });
    expect(await stampTopicsExtractedAtOp(ctx, [], 1)).toEqual([]);
    expect(await stampTopicsExtractedAtOp(ctx, ["mem_gone"], 1)).toEqual([]);
  });
});
