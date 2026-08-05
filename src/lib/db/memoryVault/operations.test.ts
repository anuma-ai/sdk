import { Database, Q } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VaultMemoryOperationsContext } from "./operations";
import {
  archiveVaultMemoryOp,
  createVaultMemoryOp,
  createVaultMemoriesBatchOp,
  getVaultMemoryOp,
  getVaultMemoriesByIdsOp,
  getVaultMemoriesByFacetKeyOp,
  normalizeFacetKey,
  normalizeFacetValue,
  getAllVaultMemoriesOp,
  getVaultRankingProjectionsOp,
  getVaultCandidateKeysOp,
  getVaultEmbeddingsByIdsOp,
  getAllVaultMemoryContentsOp,
  updateVaultMemoryOp,
  updateVaultMemoryEmbeddingOp,
  deleteVaultMemoryOp,
  supersedeVaultMemoryOp,
  deleteAllVaultMemoriesForUserOp,
  setMemoryEntitiesOp,
  setMemoryVisibilityOp,
  clearMemoryTopicsOverrideOp,
  getMemoriesNeedingTopicExtractionOp,
  stampTopicsExtractedAtOp,
  TOPICS_EXTRACTION_VERSION,
  vaultMemoryToStored,
} from "./operations";
import { linkMemoryEntitiesOp, prepareMemoryTopicsUpdate } from "../entities/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import type { VaultMemory } from "./models";

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
  prepareMemoryTopicsUpdate: vi.fn(async () => ({ _op: "vault-topics" })),
  relinkMemoryEntitiesFromTopicsOp: vi.fn(async () => []),
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
  // Snake_case raw row, as WatermelonDB's `unsafeFetchRaw` returns (incl. `id`). The bulk
  // read ops now use unsafeFetchRaw, so the query mocks below serve `r._raw`.
  // Annotated rather than inferred: spreading an index-signature type into an
  // object literal contributes no known keys, so the inferred type would be
  // `{ id: any }` and tests that poke a column on `_raw` would not compile.
  const rawRow: Record<string, any> = { id: overrides.id ?? "mem_1", ...raw };
  return {
    id: overrides.id ?? "mem_1",
    _raw: rawRow,
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
    get visibility() {
      return raw.visibility ?? null;
    },
    get twinOptIn() {
      return raw.twin_opt_in ?? null;
    },
    get publishedAt() {
      return raw.published_at ?? null;
    },
    get geohash() {
      return raw.geohash ?? null;
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
    // is_deleted + archived_at + trust_tier (choke point) + scope + sortBy.
    const callArgs = queryFn.mock.calls[0];
    // is_deleted, archived_at, trust_tier, superseded_by, scope, sortBy
    expect(callArgs.length).toBe(6);
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

    // is_deleted clause omitted → archived_at + trust_tier + superseded_by + sortBy remain.
    expect(queryFn.mock.calls[0].length).toBe(4);
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

    // is_deleted + archived_at + trust_tier + superseded_by + sortBy — the filter is retained.
    expect(queryFn.mock.calls[0].length).toBe(5);
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

    // is_deleted + archived_at + trust_tier + superseded_by + sortBy — no scope condition
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(5);
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

    // is_deleted + archived_at + trust_tier + superseded_by + sortBy — no scope condition
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(5);
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

    // is_deleted + archived_at + trust_tier + superseded_by + since + sortBy = 6 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(6);
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

    // is_deleted + archived_at + trust_tier + superseded_by + sortBy + take = 6 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(6);
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

    // is_deleted + archived_at + trust_tier + superseded_by + since + sortBy + take = 7 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(7);
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

    // is_deleted + archived_at + trust_tier + superseded_by + scope + user_id + since + sortBy = 8 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(8);
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

    // is_deleted + archived_at + trust_tier + superseded_by + since = 5 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(5);
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

    // is_deleted + archived_at + trust_tier + superseded_by + user_id + since = 6 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(6);
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

    // is_deleted + archived_at + trust_tier + superseded_by + user_id + sortBy = 6 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(6);
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

    // is_deleted + archived_at + trust_tier + superseded_by + sortBy = 5 conditions (no user_id filter)
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(5);
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

    const result = await updateVaultMemoryEmbeddingOp(ctx, "mem_1", "[1,0,0]", "test-embed-model");

    expect(result).toBe(true);
    const updater = updateFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    updater({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("embedding", "[1,0,0]");
    // The model tag is written alongside the vector — a stale tag would make
    // search re-embed the row on every query.
    expect(setRawSpy).toHaveBeenCalledWith("embedding_model", "test-embed-model");
  });

  it("returns false for soft-deleted records", async () => {
    const ctx = makeCtx({
      vaultMemoryCollection: {
        find: vi.fn(async () => mockRecord({ isDeleted: true })),
      } as any,
    });

    const result = await updateVaultMemoryEmbeddingOp(ctx, "mem_1", "[1,0,0]", "test-embed-model");
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

    const result = await updateVaultMemoryEmbeddingOp(
      ctx,
      "nonexistent",
      "[1,0,0]",
      "test-embed-model"
    );
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

    const result = await updateVaultMemoryEmbeddingOp(ctx, "mem_1", "[1,0,0]", "test-embed-model");
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

    // is_deleted + archived_at + trust_tier + superseded_by + folder_id + sortBy = 6 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(6);
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

    // is_deleted + archived_at + trust_tier + superseded_by + folder_id + sortBy = 6 conditions
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(6);
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

    // is_deleted + archived_at + trust_tier + superseded_by + sortBy = 5 conditions (no folder_id)
    const callArgs = queryFn.mock.calls[0];
    expect(callArgs.length).toBe(5);
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
    // The op runs the link call through `writer.callWriter` so flag, links and
    // `topics` share one writer, so the stub has to hand one out.
    const writer = { callWriter: (work: () => any) => work() };
    const ctx = makeCtx({
      database: { write: vi.fn(async (cb: (w: any) => any) => cb(writer)), batch } as any,
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

    expect(linkMemoryEntitiesOp).toHaveBeenCalledWith(
      ctx.entityCtx,
      "mem_1",
      ["tokyo", { name: "berlin", kind: "place" }],
      { topicsSource: "user" }
    );
    // Only the stale link (ent_paris) is destroyed; ent_tokyo is kept. The
    // `topics` write rides in the same batch, narrowing the record from the
    // old ∪ new set the link op wrote to the user's set.
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0]).toHaveLength(2);
    expect(vi.mocked(prepareMemoryTopicsUpdate).mock.calls[0]?.[4]).toBe("user");
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
    // No link call for an empty set; the lone existing link is removed and
    // `topics` is recorded as an explicit [] in the same batch.
    expect(linkMemoryEntitiesOp).not.toHaveBeenCalled();
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0]).toHaveLength(2);
    expect(vi.mocked(prepareMemoryTopicsUpdate).mock.calls[0]?.[2]).toEqual([]);
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

  /**
   * `linkRows` are raw memory_entity rows; `entityRows` the `entity` rows they
   * point at (defaulted from the link ids so a test that only cares about
   * "has links" can pass names it doesn't spell out). Both are served via
   * unsafeFetchRaw, matching the op — it must not pin Models into the
   * RecordCache on a whole-vault sweep.
   */
  function sweepCtx(
    rows: any[],
    linkRows: Array<{ memory_id: string; entity_id?: string }>,
    entityRows?: Array<{ id: string; canonical_name: string }>
  ) {
    const links = linkRows.map((l, i) => ({ entity_id: l.entity_id ?? `ent_${i}`, ...l }));
    const entities =
      entityRows ??
      links.map((l) => ({ id: l.entity_id, canonical_name: `name_of_${l.entity_id}` }));
    const memoryEntityQuery = vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => links) }));
    const entityQuery = vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => entities) }));
    return {
      ctx: makeCtx({
        vaultMemoryCollection: {
          query: vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => rows) })),
        } as any,
        entityCtx: {
          database: {} as any,
          entityCollection: { query: entityQuery } as any,
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
        // Links + a record that matches them: what a HEALTHY extracted row looks
        // like. Stamped with neither, it would be the pre-v42-restore shape the
        // partition now repairs through `pending`.
        topics: '[{"name":"name_of_ent_cur","source":"auto"}]',
      }),
    ];
    const { ctx } = sweepCtx(rows, [
      { memory_id: "mem_legacy" },
      { memory_id: "mem_current", entity_id: "ent_cur" },
    ]);

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
        // Healthy: links + a matching record (see the partition test above).
        topics: '[{"name":"name_of_ent_cur","source":"auto"}]',
      }),
    ];
    const { ctx } = sweepCtx(rows, [{ memory_id: "mem_curver", entity_id: "ent_cur" }]);

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

  it("keeps user-managed rows out of the LLM buckets (filtered in the partition, not the query)", async () => {
    // The query no longer filters on topics_user_managed — topicsToRelink and
    // topicsBackfill need curated rows, so ownership is applied per-bucket.
    //
    // Both curated rows carry links on purpose: a curated row with NO links and
    // no `topics` record is a provably-empty curation the sweep repairs instead
    // of gating (real-database coverage in topicsSync.test.ts).
    const rows = [
      rawRow("mem_curated", { topics_user_managed: true }),
      rawRow("mem_curated_sqlite_bool", { topics_user_managed: 1 }),
      rawRow("mem_auto"),
    ];
    const { ctx } = sweepCtx(rows, [
      { memory_id: "mem_curated" },
      { memory_id: "mem_curated_sqlite_bool" },
    ]);

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.pending.map((m) => m.uniqueId)).toEqual(["mem_auto"]);
    expect(result.linkedUnstamped).toEqual([]);
    // Their topics live only in the index, so they're backfill candidates.
    expect(result.topicsBackfill.sort()).toEqual(["mem_curated", "mem_curated_sqlite_bool"]);
  });

  it("does not pass a topics_user_managed clause to the query", async () => {
    const queryFn = vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => []) }));
    const ctx = makeCtx({
      vaultMemoryCollection: { query: queryFn } as any,
      entityCtx: {
        database: {} as any,
        entityCollection: { query: vi.fn() } as any,
        memoryEntityCollection: { query: vi.fn() } as any,
      },
    });
    await getMemoriesNeedingTopicExtractionOp(ctx);
    // is_deleted + archived_at + trust_tier + superseded_by + sortBy = 5.
    expect(queryFn.mock.calls[0].length).toBe(5);
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

describe("getVaultRankingProjectionsOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns content-free projections (no decrypted content field)", async () => {
    const ctx = makeCtx();
    const results = await getVaultRankingProjectionsOp(ctx);

    expect(results).toHaveLength(2);
    // The whole point of #5017: the ranking projection must never carry content.
    expect(results[0]).not.toHaveProperty("content");
    expect(results[0]).toHaveProperty("uniqueId");
    expect(results[0]).toHaveProperty("embedding");
    expect(results[0]).toHaveProperty("folderId");
    // Never decrypt on this path.
    const { decryptVaultMemoryFields } = await import("./encryption");
    expect(decryptVaultMemoryFields).not.toHaveBeenCalled();
  });

  it("carries the plaintext embedding through untouched", async () => {
    const embedded = mockRecord({ id: "mem_vec" });
    embedded._raw.embedding = "[0.1,0.2,0.3]";
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: vi.fn(async () => [embedded]),
      unsafeFetchRaw: vi.fn(async () => [embedded._raw]),
    }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    const results = await getVaultRankingProjectionsOp(ctx, { scopes: ["private"] });

    expect(results[0].embedding).toBe("[0.1,0.2,0.3]");
    expect(results[0].uniqueId).toBe("mem_vec");
  });

  it("reuses baseVaultConditions — excludes deleted + superseded like the recall read", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    await getVaultRankingProjectionsOp(ctx, { scopes: ["private"] });

    // is_deleted + archived_at + trust_tier + superseded_by + scope + sortBy —
    // identical shape to getAllVaultMemoriesOp so the candidate set matches, minus
    // the decrypt.
    expect(queryFn.mock.calls[0].length).toBe(6);
  });

  it("does NOT add a scope condition when scopes is empty", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    await getVaultRankingProjectionsOp(ctx, { scopes: [] });

    // is_deleted + archived_at + trust_tier + superseded_by + sortBy — no scope clause.
    expect(queryFn.mock.calls[0].length).toBe(5);
  });
});

describe("getVaultMemoriesByIdsOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] without querying for an empty id list", async () => {
    const ctx = makeCtx();
    const results = await getVaultMemoriesByIdsOp(ctx, []);

    expect(results).toEqual([]);
    expect(ctx.vaultMemoryCollection.query as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it("bulk-decrypts the requested rows via unsafeFetchRaw (no per-row find)", async () => {
    const rows = [mockRecord({ id: "mem_1" }), mockRecord({ id: "mem_2" })];
    const unsafeFetchRaw = vi.fn(async () => rows.map((r) => r._raw));
    const findFn = vi.fn();
    const queryFn = vi.fn((..._conditions: any[]) => ({ fetch: vi.fn(), unsafeFetchRaw }));
    const ctx = makeCtx({
      walletAddress: "0xabc",
      signMessage: vi.fn(async () => "0xsig") as any,
      vaultMemoryCollection: { query: queryFn, find: findFn } as any,
    });

    const results = await getVaultMemoriesByIdsOp(ctx, ["mem_1", "mem_2"]);

    expect(results.map((r) => r.uniqueId)).toEqual(["mem_1", "mem_2"]);
    expect(unsafeFetchRaw).toHaveBeenCalledTimes(1);
    // Must NOT use the Model-pinning .find() path.
    expect(findFn).not.toHaveBeenCalled();
  });

  it("reuses baseVaultConditions (is_deleted + superseded) plus the id oneOf", async () => {
    const queryFn = vi.fn((..._conditions: any[]) => ({
      fetch: vi.fn(),
      unsafeFetchRaw: vi.fn(async () => []),
    }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    await getVaultMemoriesByIdsOp(ctx, ["mem_1"]);

    // is_deleted + archived_at + trust_tier + superseded_by + id oneOf
    // (no user_id — makeCtx sets none).
    expect(queryFn.mock.calls[0].length).toBe(5);
  });
});

describe("getVaultCandidateKeysOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps projected candidate keys and excludes deleted/superseded via conditions", async () => {
    const raws = [
      {
        id: "a",
        scope: "private",
        folder_id: null,
        embedding_model: "m",
        updated_at: new Date("2026-05-01").getTime(),
      },
    ];
    // Loki path: unsafeSqlQuery throws → falls back to Q query + unsafeFetchRaw.
    // The mock must actually throw on the first (SQL) call to drive that fallback —
    // a bare object mock never throws on its own, so simulate the real Loki adapter
    // behavior (Q.unsafeSqlQuery unsupported) explicitly.
    let calls = 0;
    const queryFn = vi.fn((..._c: any[]) => {
      calls += 1;
      if (calls === 1) throw new Error("unsafeSqlQuery not supported");
      return {
        unsafeFetchRaw: vi.fn(async () => raws),
        fetch: vi.fn(),
      };
    });
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    const keys = await getVaultCandidateKeysOp(ctx, { scopes: ["private"] });

    expect(keys).toEqual([
      {
        uniqueId: "a",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date("2026-05-01"),
      },
    ]);
    // conditions include is_deleted + archived_at + trust_tier + superseded_by + scope
    // (baseVaultConditions parity). calls[0] is the try-path SQL call (throws);
    // calls[1] is the Loki fallback's Q query with the spread condition list:
    // is_deleted, archived_at, trust_tier, superseded_by, scope (no user_id —
    // makeCtx sets none; no folder_id — not requested here).
    expect(queryFn.mock.calls[1].length).toBe(5);
  });

  it("falls back to the Loki path when the projected SQL query throws", async () => {
    const raws = [
      {
        id: "b",
        scope: "shared",
        folder_id: "f1",
        embedding_model: null,
        updated_at: new Date("2026-06-01").getTime(),
      },
    ];
    let callCount = 0;
    const queryFn = vi.fn((..._c: any[]) => {
      callCount += 1;
      if (callCount === 1) {
        // Simulate the OPFS-SQLite projected SELECT path throwing (e.g. Q.unsafeSqlQuery
        // unsupported on this adapter) so the catch block's Loki fallback runs.
        throw new Error("unsafeSqlQuery not supported");
      }
      return {
        unsafeFetchRaw: vi.fn(async () => raws),
        fetch: vi.fn(),
      };
    });
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    const keys = await getVaultCandidateKeysOp(ctx, { folderId: "f1" });

    expect(keys).toEqual([
      {
        uniqueId: "b",
        folderId: "f1",
        scope: "shared",
        embeddingModel: null,
        updatedAt: new Date("2026-06-01"),
      },
    ]);
    // First call = try path (throws), second call = fallback Q query.
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it("uses the projected SQL SELECT on the OPFS-SQLite path when unsafeSqlQuery does not throw", async () => {
    const raws = [
      {
        id: "a",
        scope: "private",
        folder_id: null,
        embedding_model: "m",
        updated_at: new Date("2026-05-01").getTime(),
      },
    ];
    // Non-throwing queryFn — mirrors the real OPFS-SQLite adapter, where
    // Q.unsafeSqlQuery is supported and the try-branch completes without
    // ever falling back to the Loki path.
    const queryFn = vi.fn((..._c: any[]) => ({
      unsafeFetchRaw: vi.fn(async () => raws),
      fetch: vi.fn(),
    }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    const keys = await getVaultCandidateKeysOp(ctx, { scopes: ["private", "shared"] });

    expect(keys).toEqual([
      {
        uniqueId: "a",
        folderId: null,
        scope: "private",
        embeddingModel: "m",
        updatedAt: new Date("2026-05-01"),
      },
    ]);

    // Only one call — the try-path succeeds, so there's no Loki fallback call.
    expect(queryFn).toHaveBeenCalledTimes(1);

    const sqlQueryArg = queryFn.mock.calls[0][0] as {
      type: string;
      sql: string;
      values: unknown[];
    };
    expect(sqlQueryArg.type).toBe("sqlQuery");
    // Strict column projection — id/scope/folder_id/embedding_model/updated_at
    // ONLY, no content and no embedding blob.
    expect(sqlQueryArg.sql).toMatch(
      /^select "id", "scope", "folder_id", "embedding_model", "updated_at" from "memory_vault" where /
    );
    expect(sqlQueryArg.sql).toContain('"is_deleted" = 0');
    expect(sqlQueryArg.sql).toContain('"superseded_by" is null');
    // Lockstep with baseVaultConditions: archived + quarantined rows are excluded
    // from search candidates on the SQL path too (null-safe IS NOT keeps NULL tiers).
    expect(sqlQueryArg.sql).toContain('"archived_at" is null');
    expect(sqlQueryArg.sql).toContain(`"trust_tier" is not 'quarantined'`);
    expect(sqlQueryArg.sql).toContain('"scope" in (?,?)');
    expect(sqlQueryArg.values).toEqual(["private", "shared"]);
  });

  it("enforces user_id scoping on both the SQL path and the Loki fallback path", async () => {
    const rows = [
      {
        id: "a",
        scope: "private",
        folder_id: null,
        embedding_model: null,
        updated_at: new Date("2026-05-01").getTime(),
      },
    ];

    // --- SQL path: user_id lands in the WHERE clause AND the bound args. ---
    const sqlQueryFn = vi.fn((..._c: any[]) => ({
      unsafeFetchRaw: vi.fn(async () => rows),
      fetch: vi.fn(),
    }));
    const sqlCtx = makeCtx({ userId: "u1", vaultMemoryCollection: { query: sqlQueryFn } as any });

    const sqlKeys = await getVaultCandidateKeysOp(sqlCtx);
    expect(sqlKeys).toHaveLength(1);

    const sqlQueryArg = sqlQueryFn.mock.calls[0][0] as { sql: string; values: unknown[] };
    expect(sqlQueryArg.sql).toContain('"user_id" = ?');
    expect(sqlQueryArg.values).toEqual(["u1"]);

    // --- Loki fallback path: user_id comes through baseVaultConditions. ---
    let calls = 0;
    const lokiQueryFn = vi.fn((...conditions: any[]) => {
      calls += 1;
      if (calls === 1) throw new Error("unsafeSqlQuery not supported");
      // Fallback Q query conditions: is_deleted + archived_at + trust_tier +
      // superseded_by + user_id = 5 (no scopes/folderId requested here).
      expect(conditions.length).toBe(5);
      return {
        unsafeFetchRaw: vi.fn(async () => rows),
        fetch: vi.fn(),
      };
    });
    const lokiCtx = makeCtx({ userId: "u1", vaultMemoryCollection: { query: lokiQueryFn } as any });

    const lokiKeys = await getVaultCandidateKeysOp(lokiCtx);
    expect(lokiKeys).toHaveLength(1);
    expect(lokiQueryFn).toHaveBeenCalledTimes(2);
  });
});

describe("getVaultEmbeddingsByIdsOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] for empty ids without querying", async () => {
    const ctx = makeCtx();
    expect(await getVaultEmbeddingsByIdsOp(ctx, [])).toEqual([]);
    expect(ctx.vaultMemoryCollection.query as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it("projects id+embedding for the requested ids", async () => {
    const raws = [{ id: "a", embedding: "[1,0]", embedding_model: "m" }];
    const queryFn = vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => raws), fetch: vi.fn() }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });
    const out = await getVaultEmbeddingsByIdsOp(ctx, ["a"]);
    expect(out).toEqual([{ uniqueId: "a", embedding: "[1,0]", embeddingModel: "m" }]);
  });

  it("uses the projected SQL SELECT on the OPFS-SQLite path when unsafeSqlQuery does not throw", async () => {
    const raws = [{ id: "a", embedding: "[1,0]", embedding_model: "m" }];
    // Non-throwing queryFn — mirrors the real OPFS-SQLite adapter, where
    // Q.unsafeSqlQuery is supported and the try-branch completes without
    // ever falling back to the Loki path.
    const queryFn = vi.fn((..._c: any[]) => ({
      unsafeFetchRaw: vi.fn(async () => raws),
      fetch: vi.fn(),
    }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    const out = await getVaultEmbeddingsByIdsOp(ctx, ["a", "b"]);

    expect(out).toEqual([{ uniqueId: "a", embedding: "[1,0]", embeddingModel: "m" }]);
    // Only one call — the try-path succeeds, so there's no Loki fallback call.
    expect(queryFn).toHaveBeenCalledTimes(1);

    const sqlQueryArg = queryFn.mock.calls[0][0] as {
      type: string;
      sql: string;
      values: unknown[];
    };
    expect(sqlQueryArg.type).toBe("sqlQuery");
    // Strict column projection — id/embedding/embedding_model ONLY, no content.
    expect(sqlQueryArg.sql).toMatch(
      /^select "id", "embedding", "embedding_model" from "memory_vault" where /
    );
    expect(sqlQueryArg.sql).toContain('"is_deleted" = 0');
    expect(sqlQueryArg.sql).toContain('"superseded_by" is null');
    // Lockstep with baseVaultConditions: archived + quarantined rows excluded here too.
    expect(sqlQueryArg.sql).toContain('"archived_at" is null');
    expect(sqlQueryArg.sql).toContain(`"trust_tier" is not 'quarantined'`);
    expect(sqlQueryArg.sql).toContain('"id" in (?,?)');
    expect(sqlQueryArg.values).toEqual(["a", "b"]);
  });

  it("falls back to the Loki path when the projected SQL query throws", async () => {
    const raws = [{ id: "a", embedding: "[1,0]", embedding_model: "m" }];
    let calls = 0;
    const queryFn = vi.fn((..._c: any[]) => {
      calls += 1;
      if (calls === 1) throw new Error("unsafeSqlQuery not supported");
      return {
        unsafeFetchRaw: vi.fn(async () => raws),
        fetch: vi.fn(),
      };
    });
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    const out = await getVaultEmbeddingsByIdsOp(ctx, ["a"]);

    expect(out).toEqual([{ uniqueId: "a", embedding: "[1,0]", embeddingModel: "m" }]);
    // First call = try path (throws), second call = Loki fallback's Q query
    // (baseVaultConditions + id oneOf = 5 conditions with no user_id set:
    // is_deleted + archived_at + trust_tier + superseded_by + id oneOf).
    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(queryFn.mock.calls[1].length).toBe(5);
  });

  it("enforces user_id scoping on both the SQL path and the Loki fallback path", async () => {
    const rows = [{ id: "a", embedding: "[1,0]", embedding_model: null }];

    // --- SQL path: user_id lands in the WHERE clause AND the bound args. ---
    const sqlQueryFn = vi.fn((..._c: any[]) => ({
      unsafeFetchRaw: vi.fn(async () => rows),
      fetch: vi.fn(),
    }));
    const sqlCtx = makeCtx({ userId: "u1", vaultMemoryCollection: { query: sqlQueryFn } as any });

    const sqlOut = await getVaultEmbeddingsByIdsOp(sqlCtx, ["a"]);
    expect(sqlOut).toHaveLength(1);

    const sqlQueryArg = sqlQueryFn.mock.calls[0][0] as { sql: string; values: unknown[] };
    expect(sqlQueryArg.sql).toContain('"user_id" = ?');
    expect(sqlQueryArg.values).toEqual(["u1", "a"]);

    // --- Loki fallback path: user_id comes through baseVaultConditions. ---
    let calls = 0;
    const lokiQueryFn = vi.fn((...conditions: any[]) => {
      calls += 1;
      if (calls === 1) throw new Error("unsafeSqlQuery not supported");
      // Fallback Q query conditions: is_deleted + archived_at + trust_tier +
      // superseded_by + user_id + id-oneOf = 6.
      expect(conditions.length).toBe(6);
      return {
        unsafeFetchRaw: vi.fn(async () => rows),
        fetch: vi.fn(),
      };
    });
    const lokiCtx = makeCtx({ userId: "u1", vaultMemoryCollection: { query: lokiQueryFn } as any });

    const lokiOut = await getVaultEmbeddingsByIdsOp(lokiCtx, ["a"]);
    expect(lokiOut).toHaveLength(1);
    expect(lokiQueryFn).toHaveBeenCalledTimes(2);
  });
});

describe("typed memory (PR1)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists fact_type and trust_tier on create when provided", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, {
      content: "prefers tea",
      factType: "preference",
      trustTier: "quarantined",
    });
    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("fact_type", "preference");
    expect(setRawSpy).toHaveBeenCalledWith("trust_tier", "quarantined");
  });

  it("does NOT set fact_type / trust_tier / archived_at on a plain create", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, { content: "plain" });
    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    const keys = setRawSpy.mock.calls.map((c) => c[0]);
    expect(keys).not.toContain("fact_type");
    expect(keys).not.toContain("trust_tier");
    // A fresh memory is always active — archived_at is never set on create.
    expect(keys).not.toContain("archived_at");
  });

  it("persists fact_type on update when provided (retain lazy backfill)", async () => {
    const record = mockRecord({ id: "mem_bf" });
    const setRawSpy = vi.fn();
    record.update = vi.fn(async (updater: (r: any) => void) => updater({ _setRaw: setRawSpy }));
    const ctx = makeCtx({ vaultMemoryCollection: { find: vi.fn(async () => record) } as any });
    await updateVaultMemoryOp(ctx, "mem_bf", { content: "x", factType: "identity" });
    expect(setRawSpy).toHaveBeenCalledWith("fact_type", "identity");
  });

  it("round-trips fact_type / archived_at / trust_tier through the Model mapper", async () => {
    const record = mockRecord({ id: "mem_typed" });
    (record as any).factType = "identity";
    (record as any).archivedAt = 123;
    (record as any).trustTier = "trusted";
    const stored = await vaultMemoryToStored(record as any);
    expect(stored.factType).toBe("identity");
    expect(stored.archivedAt).toBe(123);
    expect(stored.trustTier).toBe("trusted");
  });

  it("maps absent typed columns to null (legacy row)", async () => {
    const stored = await vaultMemoryToStored(mockRecord({ id: "mem_legacy" }) as any);
    expect(stored.factType).toBeNull();
    expect(stored.archivedAt).toBeNull();
    expect(stored.trustTier).toBeNull();
  });

  it("drops both choke-point conditions when include flags are set", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._c: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });
    await getAllVaultMemoriesOp(ctx, { includeArchived: true, includeQuarantined: true });
    // is_deleted + superseded_by + sortBy — archived_at + trust_tier conditions dropped
    // (includeSuperseded not set, so the supersession filter stays).
    expect(queryFn.mock.calls[0].length).toBe(3);
  });

  it("adds a fact_type condition when factTypes is provided", async () => {
    const fetchFn = vi.fn(async () => []);
    const queryFn = vi.fn((..._c: any[]) => ({
      fetch: fetchFn,
      unsafeFetchRaw: async () => (await fetchFn()).map((r: any) => r._raw),
    }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });
    await getAllVaultMemoriesOp(ctx, { factTypes: ["plan", "identity"] });
    // is_deleted + archived_at + trust_tier + superseded_by + fact_type + sortBy = 6 conditions.
    expect(queryFn.mock.calls[0].length).toBe(6);
  });

  // getAllVaultMemoriesOp reads via unsafeFetchRaw, so the raw snake_case
  // mapper (vaultMemoryRawToStoredRaw) — NOT the Model mapper — is the code
  // path in production. These exercise it with real raw rows so a snake_case
  // typo (raw.fact_type -> raw.facttype) fails CI instead of passing.
  function ctxReturningRaw(raws: Record<string, unknown>[]) {
    const queryFn = vi.fn(() => ({
      fetch: vi.fn(async () => []),
      unsafeFetchRaw: vi.fn(async () => raws),
    }));
    return makeCtx({ vaultMemoryCollection: { query: queryFn } as any });
  }

  it("raw unsafeFetchRaw mapper round-trips fact_type / trust_tier / archived_at with real values", async () => {
    const ctx = ctxReturningRaw([
      {
        id: "mem_typed",
        content: "prefers dark roast",
        scope: "private",
        is_deleted: false,
        created_at: 1_700_000_000_000,
        updated_at: 1_700_000_000_000,
        fact_type: "preference",
        trust_tier: "trusted",
        archived_at: 1_234_567_890,
      },
    ]);
    const [stored] = await getAllVaultMemoriesOp(ctx);
    expect(stored.factType).toBe("preference");
    expect(stored.trustTier).toBe("trusted");
    expect(stored.archivedAt).toBe(1_234_567_890);
  });

  it("raw unsafeFetchRaw mapper maps a legacy row (typed columns absent) to null", async () => {
    const ctx = ctxReturningRaw([
      {
        id: "mem_legacy",
        content: "plain legacy row",
        scope: "private",
        is_deleted: false,
        created_at: 1_700_000_000_000,
        updated_at: 1_700_000_000_000,
      },
    ]);
    const [stored] = await getAllVaultMemoriesOp(ctx);
    expect(stored.factType).toBeNull();
    expect(stored.trustTier).toBeNull();
    expect(stored.archivedAt).toBeNull();
  });
});

// Behavioral choke-point test against a REAL in-memory WatermelonDB (LokiJS) —
// asserts the INVARIANT the condition-count tests above only approximate: what
// the default read actually keeps vs drops. This is the guard that would catch a
// `Q.notEq("quarantined")` regression that silently excludes NULL trust_tier
// rows (the exact hazard the choke-point comment warns about).
describe("baseVaultConditions — real read semantics (in-memory LokiJS)", () => {
  function makeRealDatabase(): Database {
    const adapter = new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `ops-choke-test-${Math.random().toString(36).slice(2)}`,
    });
    return new Database({ adapter, modelClasses: sdkModelClasses });
  }

  let db: Database;
  let ctx: VaultMemoryOperationsContext;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeRealDatabase();
    // No wallet → content stored/read as plaintext (encryption never invoked).
    ctx = { database: db, vaultMemoryCollection: db.get<VaultMemory>("memory_vault") };
  });

  it("keeps NULL trust_tier, drops quarantined, hides archived by default; include flags surface them", async () => {
    // Active, untyped: trust_tier is NULL (the legacy / normal row).
    const active = await createVaultMemoryOp(ctx, { content: "active null-tier fact" });
    // Quarantined: trust_tier === "quarantined" — must be dropped by default.
    const quarantined = await createVaultMemoryOp(ctx, {
      content: "quarantined fact",
      trustTier: "quarantined",
    });
    // Archived: archived_at set — dropped by default, returned with includeArchived.
    const archived = await createVaultMemoryOp(ctx, { content: "archived fact" });
    await archiveVaultMemoryOp(ctx, archived.uniqueId, { now: Date.now() });

    const defaultIds = (await getAllVaultMemoriesOp(ctx)).map((m) => m.uniqueId);
    // The NULL-tier row SURVIVES `Q.notEq("quarantined")` and the active read.
    expect(defaultIds).toContain(active.uniqueId);
    // Quarantined + archived are dropped by the shared choke point.
    expect(defaultIds).not.toContain(quarantined.uniqueId);
    expect(defaultIds).not.toContain(archived.uniqueId);

    // Sanity: the surviving row genuinely has a NULL tier (not coerced to a string).
    const activeRow = await getVaultMemoryOp(ctx, active.uniqueId);
    expect(activeRow?.trustTier).toBeNull();

    // includeArchived surfaces the archived row (still excludes quarantined).
    const withArchived = (await getAllVaultMemoriesOp(ctx, { includeArchived: true })).map(
      (m) => m.uniqueId
    );
    expect(withArchived).toContain(archived.uniqueId);
    expect(withArchived).toContain(active.uniqueId);
    expect(withArchived).not.toContain(quarantined.uniqueId);

    // includeQuarantined surfaces the quarantined row.
    const withQuarantined = (await getAllVaultMemoriesOp(ctx, { includeQuarantined: true })).map(
      (m) => m.uniqueId
    );
    expect(withQuarantined).toContain(quarantined.uniqueId);
  });
});

/**
 * #779 — the decrypt-last search path routes its filters through
 * `getVaultCandidateKeysOp`, which originally accepted only `scopes`/`folderId`.
 * `factTypes` and `includeArchived` were therefore honored on the legacy
 * whole-vault path and silently dropped here, so the same query returned
 * different candidate sets depending on which path was active.
 */
describe("getVaultCandidateKeysOp — filter parity with the legacy path (#779)", () => {
  beforeEach(() => vi.restoreAllMocks());

  /** Drive the projected-SQL path and return the [sql, args] it built. */
  async function captureSql(
    options?: Parameters<typeof getVaultCandidateKeysOp>[1]
  ): Promise<{ sql: string; args: unknown[] }> {
    const spy = vi.spyOn(Q, "unsafeSqlQuery");
    const queryFn = vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => []), fetch: vi.fn() }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });
    await getVaultCandidateKeysOp(ctx, options);
    const call = spy.mock.calls[0]!;
    return { sql: call[0] as string, args: (call[1] ?? []) as unknown[] };
  }

  it("filters by fact_type when factTypes is passed", async () => {
    const { sql, args } = await captureSql({ factTypes: ["preference", "identity"] });
    expect(sql).toContain('"fact_type" in (?,?)');
    expect(args).toEqual(expect.arrayContaining(["preference", "identity"]));
  });

  it("omits the fact_type clause when factTypes is absent or empty", async () => {
    expect((await captureSql()).sql).not.toContain("fact_type");
    expect((await captureSql({ factTypes: [] })).sql).not.toContain("fact_type");
  });

  it("excludes archived rows by default", async () => {
    expect((await captureSql()).sql).toContain('"archived_at" is null');
  });

  // The bug's sharpest edge: `baseVaultSql` hardcoded this clause, so
  // includeArchived could not be satisfied on this path even in principle.
  it("drops the archived filter when includeArchived is set", async () => {
    const { sql } = await captureSql({ includeArchived: true });
    expect(sql).not.toContain("archived_at");
    // The other safety filters must survive — only archiving is opted out of.
    expect(sql).toContain('"is_deleted" = 0');
    expect(sql).toContain('"superseded_by" is null');
  });

  /** Drive the LokiJS fallback (first call throws) and count its Q conditions. */
  async function lokiConditionCount(
    options?: Parameters<typeof getVaultCandidateKeysOp>[1]
  ): Promise<number> {
    let calls = 0;
    const queryFn = vi.fn((..._c: any[]) => {
      calls += 1;
      if (calls === 1) throw new Error("unsafeSqlQuery not supported");
      return { unsafeFetchRaw: vi.fn(async () => []), fetch: vi.fn() };
    });
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });
    await getVaultCandidateKeysOp(ctx, options);
    return queryFn.mock.calls[1]!.length;
  }

  // Each case is chosen so the COUNT differs between fixed and unfixed code —
  // asserting a count that happens to match on both (e.g. swapping archived_at
  // for fact_type) would pass for the wrong reason.
  it("applies both filters on the LokiJS fallback too", async () => {
    // Baseline: is_deleted + archived_at + trust_tier + superseded_by.
    // (no user_id — makeCtx sets none; no scope/folder_id — not requested.)
    expect(await lokiConditionCount()).toBe(4);
    // + fact_type ⇒ 5. Unfixed code drops it and stays at 4.
    expect(await lokiConditionCount({ factTypes: ["preference"] })).toBe(5);
    // − archived_at ⇒ 3. Unfixed code keeps it and stays at 4.
    expect(await lokiConditionCount({ includeArchived: true })).toBe(3);
  });
});

/**
 * #779, second half. Fixing only the key scan was not enough: the decrypt-last
 * path admits candidates via `getVaultCandidateKeysOp`, then hydrates them by id
 * through these two ops. Both re-applied the default archived exclusion, so
 * archived rows passed the scan and were silently dropped at hydration — while
 * still consuming admission slots on the way.
 */
describe("by-id hydration ops honor includeArchived (#779)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("getVaultEmbeddingsByIdsOp keeps the archived filter by default and drops it on request", async () => {
    const spy = vi.spyOn(Q, "unsafeSqlQuery");
    const queryFn = vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => []), fetch: vi.fn() }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    await getVaultEmbeddingsByIdsOp(ctx, ["a"]);
    expect(spy.mock.calls[0]![0] as string).toContain('"archived_at" is null');

    await getVaultEmbeddingsByIdsOp(ctx, ["a"], { includeArchived: true });
    const withArchived = spy.mock.calls[1]![0] as string;
    expect(withArchived).not.toContain("archived_at");
    // The id restriction and the other safety filters must survive.
    expect(withArchived).toContain('"id" in (?)');
    expect(withArchived).toContain('"is_deleted" = 0');
  });

  it("getVaultMemoriesByIdsOp keeps the archived filter by default and drops it on request", async () => {
    const queryFn = vi.fn(() => ({ unsafeFetchRaw: vi.fn(async () => []) }));
    const ctx = makeCtx({ vaultMemoryCollection: { query: queryFn } as any });

    // is_deleted + archived_at + trust_tier + superseded_by + id oneOf = 5.
    await getVaultMemoriesByIdsOp(ctx, ["a"]);
    expect(queryFn.mock.calls[0]!.length).toBe(5);

    // − archived_at ⇒ 4. Unfixed code stays at 5.
    await getVaultMemoriesByIdsOp(ctx, ["a"], { includeArchived: true });
    expect(queryFn.mock.calls[1]!.length).toBe(4);
  });
});

describe("visibility defaults", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createVaultMemoryOp defaults visibility to 'private' with no published_at", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, { content: "hello" });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("visibility", "private");
    expect(setRawSpy).toHaveBeenCalledWith("published_at", null);
  });

  it("createVaultMemoryOp round-trips visibility + publishedAt (restore path)", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, {
      content: "hello",
      visibility: "public",
      publishedAt: 1750000000000,
    });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("visibility", "public");
    expect(setRawSpy).toHaveBeenCalledWith("published_at", 1750000000000);
  });

  it("createVaultMemoryOp ignores publishedAt when visibility is private", async () => {
    const ctx = makeCtx();
    await createVaultMemoryOp(ctx, {
      content: "hello",
      visibility: "private",
      publishedAt: 1750000000000,
    });

    const createFn = ctx.vaultMemoryCollection.create as ReturnType<typeof vi.fn>;
    const builder = createFn.mock.calls[0][0];
    const setRawSpy = vi.fn();
    builder({ _setRaw: setRawSpy });
    expect(setRawSpy).toHaveBeenCalledWith("published_at", null);
  });

  it("vaultMemoryToStored grandfathers NULL visibility as 'private'", async () => {
    const record = mockRecord({ id: "mem_1" });
    const stored = await vaultMemoryToStored(record as any);
    expect(stored.visibility).toBe("private");
    expect(stored.twinOptIn).toBe(false);
    expect(stored.publishedAt).toBe(null);
    expect(stored.geohash).toBe(null);
  });
});

describe("setMemoryVisibilityOp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("publishes: sets visibility and stamps published_at, preserving updated_at", async () => {
    const record = mockRecord({ id: "mem_1" });
    const ctx = makeCtx({ vaultMemoryCollection: { find: vi.fn(async () => record) } as any });

    const before = Date.now();
    const result = await setMemoryVisibilityOp(ctx, "mem_1", { visibility: "public" });

    expect(result).not.toBeNull();
    expect(record.visibility).toBe("public");
    expect(record.publishedAt).toBeGreaterThanOrEqual(before);
    // updated_at restored — a visibility change is not a re-observation.
    // (The mock getter returns the raw value the op wrote: original ms.)
    expect(record.updatedAt).toBe(new Date("2025-01-01").getTime());
  });

  it("keeps an existing published_at when re-publishing an already-public memory", async () => {
    const record = mockRecord({ id: "mem_1" });
    record._setRaw("visibility", "public");
    record._setRaw("published_at", 1750000000000);
    const ctx = makeCtx({ vaultMemoryCollection: { find: vi.fn(async () => record) } as any });

    await setMemoryVisibilityOp(ctx, "mem_1", { visibility: "public" });

    expect(record.visibility).toBe("public");
    expect(record.publishedAt).toBe(1750000000000);
  });

  it("re-stamps published_at when a revoke commits between probe and write", async () => {
    // The invariant (published_at non-null iff visibility non-private) must
    // survive a concurrent revoke. Emulate the interleaving WatermelonDB's
    // serialized writer allows: the row is public with a stamp when we probe
    // it, but a revoke commits first and clears both before our writer runs.
    const record = mockRecord({ id: "mem_1" });
    record._setRaw("visibility", "public");
    record._setRaw("published_at", 1750000000000);
    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => any) => {
          record._setRaw("visibility", "private");
          record._setRaw("published_at", null);
          return cb();
        }),
      } as any,
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    const before = Date.now();
    await setMemoryVisibilityOp(ctx, "mem_1", { visibility: "public" });

    expect(record.visibility).toBe("public");
    // Must be freshly stamped, NOT left null from the revoke that won the race.
    expect(record.publishedAt).toBeGreaterThanOrEqual(before);
  });

  it("revokes: visibility 'private' clears published_at", async () => {
    const record = mockRecord({ id: "mem_1" });
    record._setRaw("visibility", "public");
    record._setRaw("published_at", 1750000000000);
    const ctx = makeCtx({ vaultMemoryCollection: { find: vi.fn(async () => record) } as any });

    await setMemoryVisibilityOp(ctx, "mem_1", { visibility: "private" });

    expect(record.visibility).toBe("private");
    expect(record.publishedAt).toBe(null);
  });

  it("sets twin_opt_in when provided", async () => {
    const record = mockRecord({ id: "mem_1" });
    const ctx = makeCtx({ vaultMemoryCollection: { find: vi.fn(async () => record) } as any });

    await setMemoryVisibilityOp(ctx, "mem_1", { visibility: "private", twinOptIn: true });
    expect(record.twinOptIn).toBe(true);
  });

  it("leaves twin_opt_in untouched when omitted", async () => {
    const record = mockRecord({ id: "mem_1" });
    record._setRaw("twin_opt_in", true);
    const ctx = makeCtx({ vaultMemoryCollection: { find: vi.fn(async () => record) } as any });

    await setMemoryVisibilityOp(ctx, "mem_1", { visibility: "public" });
    expect(record.twinOptIn).toBe(true);
  });

  it("returns null for a soft-deleted memory", async () => {
    const record = mockRecord({ id: "mem_1" });
    record._setRaw("is_deleted", true);
    const ctx = makeCtx({ vaultMemoryCollection: { find: vi.fn(async () => record) } as any });

    const result = await setMemoryVisibilityOp(ctx, "mem_1", { visibility: "public" });
    expect(result).toBeNull();
    expect(record.visibility).toBe(null);
  });

  it("returns null for a record owned by another user (ctx.userId scoping)", async () => {
    const record = mockRecord({ id: "mem_1" });
    record._setRaw("user_id", "user_b");
    const ctx = makeCtx({
      userId: "user_a",
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    const result = await setMemoryVisibilityOp(ctx, "mem_1", { visibility: "public" });
    expect(result).toBeNull();
    expect(record.visibility).toBe(null);
  });
});

describe("visibility coercion (two-tier fail-safe)", () => {
  beforeEach(() => vi.clearAllMocks());

  // The tier model is `private | public`. An earlier design had a middle
  // `matchable` tier; a row written by a pre-release build carrying it — or any
  // value a future schema adds — must read as PRIVATE, never as published.
  // Coercing the other way would expose content the user never consented to.
  it.each([["matchable"], ["future_tier"], [""], [null]])(
    "reads a stored %p visibility as 'private'",
    async (stored) => {
      const record = mockRecord({ id: "mem_1" });
      record._setRaw("visibility", stored);
      const ctx = makeCtx({
        vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
      });

      const result = await getVaultMemoryOp(ctx, "mem_1");
      expect(result?.visibility).toBe("private");
    }
  );

  it("reads a stored 'public' visibility as 'public'", async () => {
    const record = mockRecord({ id: "mem_1" });
    record._setRaw("visibility", "public");
    const ctx = makeCtx({
      vaultMemoryCollection: { find: vi.fn(async () => record) } as any,
    });

    const result = await getVaultMemoryOp(ctx, "mem_1");
    expect(result?.visibility).toBe("public");
  });
});

describe("getAllVaultMemoriesOp — visibility filtering", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by non-private visibility with a plain oneOf", async () => {
    const ctx = makeCtx();
    await getAllVaultMemoriesOp(ctx, { visibility: ["public"] });

    const queryFn = ctx.vaultMemoryCollection.query as ReturnType<typeof vi.fn>;
    const conditions = JSON.stringify(queryFn.mock.calls[0]);
    expect(conditions).toContain("public");
    // No null-OR branch needed when 'private' is not requested.
    expect(conditions).not.toContain('"or"');
  });

  it("filtering for 'private' matches NULL and non-enum rows (NOT IN the excluded values)", async () => {
    const ctx = makeCtx();
    await getAllVaultMemoriesOp(ctx, { visibility: ["private"] });

    const queryFn = ctx.vaultMemoryCollection.query as ReturnType<typeof vi.fn>;
    const conditions = JSON.stringify(queryFn.mock.calls[0]);
    // NULL legacy rows OR anything outside the excluded non-private values —
    // mirrors visibilityOrPrivate (unknown values read as private).
    expect(conditions).toContain('"or"');
    expect(conditions).toContain("notIn");
    expect(conditions).toContain("public");
  });

  it("requesting every visibility tier applies no condition (matches all rows)", async () => {
    const ctx = makeCtx();
    await getAllVaultMemoriesOp(ctx, { visibility: ["private", "public"] });

    const queryFn = ctx.vaultMemoryCollection.query as ReturnType<typeof vi.fn>;
    const conditions = JSON.stringify(queryFn.mock.calls[0]);
    expect(conditions).not.toContain("visibility");
  });

  it("applies no visibility condition when the option is omitted", async () => {
    const ctx = makeCtx();
    await getAllVaultMemoriesOp(ctx);

    const queryFn = ctx.vaultMemoryCollection.query as ReturnType<typeof vi.fn>;
    const conditions = JSON.stringify(queryFn.mock.calls[0]);
    expect(conditions).not.toContain("visibility");
  });
});

describe("visibility — batch create + raw mapper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createVaultMemoriesBatchOp defaults visibility to 'private' with published_at null", async () => {
    const prepared: Array<Record<string, any>> = [];
    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => any) => cb()),
        batch: vi.fn(async () => undefined),
      } as any,
      vaultMemoryCollection: {
        prepareCreate: vi.fn((builder: (r: any) => void) => {
          const record = mockRecord();
          builder(record);
          prepared.push(record);
          return record;
        }),
      } as any,
    });

    await createVaultMemoriesBatchOp(ctx, [{ content: "a" }, { content: "b" }]);

    expect(prepared).toHaveLength(2);
    for (const record of prepared) {
      expect(record.visibility).toBe("private");
      expect(record.publishedAt).toBe(null);
    }
  });

  it("createVaultMemoriesBatchOp stamps published_at for a non-private create without one", async () => {
    const prepared: Array<Record<string, any>> = [];
    const ctx = makeCtx({
      database: {
        write: vi.fn(async (cb: () => any) => cb()),
        batch: vi.fn(async () => undefined),
      } as any,
      vaultMemoryCollection: {
        prepareCreate: vi.fn((builder: (r: any) => void) => {
          const record = mockRecord();
          builder(record);
          prepared.push(record);
          return record;
        }),
      } as any,
    });

    const before = Date.now();
    await createVaultMemoriesBatchOp(ctx, [{ content: "a", visibility: "public" }]);

    // Invariant: published_at non-null iff visibility non-private.
    expect(prepared[0].visibility).toBe("public");
    expect(prepared[0].publishedAt).toBeGreaterThanOrEqual(before);
  });

  it("raw (unsafeFetchRaw) read path grandfathers NULL visibility as 'private'", async () => {
    const ctx = makeCtx();
    // makeCtx's unsafeFetchRaw serves raws without the new columns (legacy rows).
    const results = await getAllVaultMemoriesOp(ctx);

    expect(results.length).toBeGreaterThan(0);
    for (const stored of results) {
      expect(stored.visibility).toBe("private");
      expect(stored.twinOptIn).toBe(false);
      expect(stored.publishedAt).toBe(null);
    }
  });
});

describe("normalizeFacetKey / normalizeFacetValue (facet slot+value supersede, v43)", () => {
  it("normalizeFacetKey accepts the closed <type>:self:<slot> shape and lowercases it", () => {
    expect(normalizeFacetKey("preference:self:ui_theme")).toBe("preference:self:ui_theme");
    expect(normalizeFacetKey("  PREFERENCE:SELF:UI_THEME  ")).toBe("preference:self:ui_theme");
    expect(normalizeFacetKey("identity:self:residence")).toBe("identity:self:residence");
  });

  it("normalizeFacetKey rejects malformed keys → null", () => {
    // Off-enum slot.
    expect(normalizeFacetKey("preference:self:favorite_color")).toBeNull();
    // Non-self subject (SELF-ONLY in this increment).
    expect(normalizeFacetKey("preference:sara:ui_theme")).toBeNull();
    // Wrong part count.
    expect(normalizeFacetKey("preference:ui_theme")).toBeNull();
    expect(normalizeFacetKey("ui_theme")).toBeNull();
    expect(normalizeFacetKey("a:self:ui_theme:extra")).toBeNull();
    // Empty / garbage factType.
    expect(normalizeFacetKey(":self:ui_theme")).toBeNull();
    expect(normalizeFacetKey("pref 1:self:ui_theme")).toBeNull();
    // Nullish.
    expect(normalizeFacetKey(null)).toBeNull();
    expect(normalizeFacetKey(undefined)).toBeNull();
    expect(normalizeFacetKey("")).toBeNull();
  });

  it("normalizeFacetValue lowercases/trims a token and rejects garbage → null", () => {
    expect(normalizeFacetValue("Dark")).toBe("dark");
    expect(normalizeFacetValue("  SF ")).toBe("sf");
    expect(normalizeFacetValue("new york")).toBe("new york");
    expect(normalizeFacetValue("single")).toBe("single");
    // Garbage: empty, colon (would corrupt the key shape), over-cap, punctuation-only.
    expect(normalizeFacetValue("")).toBeNull();
    expect(normalizeFacetValue("   ")).toBeNull();
    expect(normalizeFacetValue("a:b")).toBeNull();
    expect(normalizeFacetValue("!!!")).toBeNull();
    expect(normalizeFacetValue("x".repeat(65))).toBeNull();
    expect(normalizeFacetValue(null)).toBeNull();
    expect(normalizeFacetValue(undefined)).toBeNull();
  });
});

describe("getVaultMemoriesByFacetKeyOp — real read semantics (in-memory LokiJS)", () => {
  function makeRealDatabase(): Database {
    const adapter = new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `facet-test-${Math.random().toString(36).slice(2)}`,
    });
    return new Database({ adapter, modelClasses: sdkModelClasses });
  }

  let db: Database;
  let ctx: VaultMemoryOperationsContext;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeRealDatabase();
    ctx = { database: db, vaultMemoryCollection: db.get<VaultMemory>("memory_vault") };
  });

  const UI_THEME = "preference:self:ui_theme";

  it("round-trips facet_key/facet_value on create and returns only live same-key rows", async () => {
    const dark = await createVaultMemoryOp(ctx, {
      content: "Prefers dark mode",
      facetKey: UI_THEME,
      facetValue: "dark",
    });
    // Different key — must NOT match.
    await createVaultMemoryOp(ctx, {
      content: "Lives in SF",
      facetKey: "identity:self:residence",
      facetValue: "sf",
    });
    // No facet at all — must NOT match.
    await createVaultMemoryOp(ctx, { content: "Allergic to shellfish" });

    // Round-trip through getVaultMemoryOp.
    const stored = await getVaultMemoryOp(ctx, dark.uniqueId);
    expect(stored?.facetKey).toBe(UI_THEME);
    expect(stored?.facetValue).toBe("dark");

    const rows = await getVaultMemoriesByFacetKeyOp(ctx, UI_THEME);
    expect(rows.map((r) => r.uniqueId)).toEqual([dark.uniqueId]);
    expect(rows[0].facetValue).toBe("dark");
  });

  it("drops garbage facet pairs on create (off-enum slot → no facet written)", async () => {
    const bad = await createVaultMemoryOp(ctx, {
      content: "Favorite color is blue",
      facetKey: "preference:self:favorite_color",
      facetValue: "blue",
    });
    const stored = await getVaultMemoryOp(ctx, bad.uniqueId);
    expect(stored?.facetKey).toBeNull();
    expect(stored?.facetValue).toBeNull();
    expect(await getVaultMemoriesByFacetKeyOp(ctx, "preference:self:favorite_color")).toEqual([]);
  });

  it("excludes superseded same-key rows (default) so a retired value is never re-collided", async () => {
    const dark = await createVaultMemoryOp(ctx, {
      content: "Prefers dark mode",
      facetKey: UI_THEME,
      facetValue: "dark",
    });
    const light = await createVaultMemoryOp(ctx, {
      content: "Prefers light mode",
      facetKey: UI_THEME,
      facetValue: "light",
    });
    await supersedeVaultMemoryOp(ctx, dark.uniqueId, light.uniqueId);

    const rows = await getVaultMemoriesByFacetKeyOp(ctx, UI_THEME);
    // Only the live (light) row survives the superseded_by filter.
    expect(rows.map((r) => r.uniqueId)).toEqual([light.uniqueId]);
  });

  it("scope filter narrows the same-key set", async () => {
    const priv = await createVaultMemoryOp(ctx, {
      content: "Prefers dark mode",
      scope: "private",
      facetKey: UI_THEME,
      facetValue: "dark",
    });
    await createVaultMemoryOp(ctx, {
      content: "Prefers dark mode (shared)",
      scope: "shared",
      facetKey: UI_THEME,
      facetValue: "dark",
    });
    const rows = await getVaultMemoriesByFacetKeyOp(ctx, UI_THEME, { scope: "private" });
    expect(rows.map((r) => r.uniqueId)).toEqual([priv.uniqueId]);
  });

  it("normalizes the queried key so a differently-cased / padded key still matches", async () => {
    // Writes store the normalized closed shape, so the read must normalize the
    // caller's key the same way or it silently returns nothing.
    const dark = await createVaultMemoryOp(ctx, {
      content: "Prefers dark mode",
      facetKey: UI_THEME,
      facetValue: "dark",
    });
    for (const variant of [UI_THEME.toUpperCase(), `  ${UI_THEME}  `, "Preference:self:UI_Theme"]) {
      const rows = await getVaultMemoriesByFacetKeyOp(ctx, variant);
      expect(rows.map((r) => r.uniqueId)).toEqual([dark.uniqueId]);
    }
    // A key that cannot normalize (off-enum slot) matches nothing by definition.
    expect(await getVaultMemoriesByFacetKeyOp(ctx, "preference:self:not_a_slot")).toEqual([]);
    expect(await getVaultMemoriesByFacetKeyOp(ctx, "malformed")).toEqual([]);
  });

  it("updateVaultMemoryOp adopts a facet ONLY when the row has none (never overwrites)", async () => {
    // Legacy keyless row adopts a facet on a facet-carrying update.
    const keyless = await createVaultMemoryOp(ctx, { content: "Prefers dark mode" });
    await updateVaultMemoryOp(ctx, keyless.uniqueId, {
      content: "Prefers dark mode",
      facetKey: UI_THEME,
      facetValue: "dark",
    });
    const adopted = await getVaultMemoryOp(ctx, keyless.uniqueId);
    expect(adopted?.facetKey).toBe(UI_THEME);
    expect(adopted?.facetValue).toBe("dark");

    // A subsequent update with a DIFFERENT value must NOT overwrite the facet.
    await updateVaultMemoryOp(ctx, keyless.uniqueId, {
      content: "Prefers dark mode",
      facetKey: UI_THEME,
      facetValue: "light",
    });
    const unchanged = await getVaultMemoryOp(ctx, keyless.uniqueId);
    expect(unchanged?.facetValue).toBe("dark");
  });
});
