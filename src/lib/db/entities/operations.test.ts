import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type EntityOperationsContext,
  linkMemoryEntitiesOp,
  replaceMemoryEntitiesGuardedOp,
} from "./operations";

/**
 * Mock a stored Entity row (WatermelonDB Model-ish). `prepareUpdate` mutates
 * the backing raw so the `kind` getter reflects a back-fill.
 */
function makeEntityRecord(canonicalName: string, kind: string | null = null, id?: string) {
  const raw: Record<string, unknown> = { canonical_name: canonicalName, kind };
  return {
    id: id ?? `ent_${canonicalName}`,
    get canonicalName() {
      return raw.canonical_name as string;
    },
    get kind() {
      return (raw.kind as string | null) ?? null;
    },
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    prepareUpdate: vi.fn((updater: (r: { _setRaw: (k: string, v: unknown) => void }) => void) => {
      updater({
        _setRaw: (k: string, v: unknown) => {
          raw[k] = v;
        },
      });
      return { _op: "update" };
    }),
  };
}

let created: Array<{ id: string; canonicalName: string; kind: string | null }>;

/** Build a context whose entity collection returns `existing` on lookup and
 * records every prepareCreate into `created`. */
function makeCtx(existing: ReturnType<typeof makeEntityRecord>[] = []) {
  created = [];
  let createCounter = 0;
  const entityCollection = {
    query: vi.fn(() => ({ fetch: vi.fn(async () => existing) })),
    prepareCreate: vi.fn((builder: (r: { _setRaw: (k: string, v: unknown) => void }) => void) => {
      const raw: Record<string, unknown> = {};
      const record = {
        id: `ent_new_${createCounter++}`,
        get canonicalName() {
          return raw.canonical_name as string;
        },
        get kind() {
          return (raw.kind as string | null) ?? null;
        },
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        _setRaw: (k: string, v: unknown) => {
          raw[k] = v;
        },
      };
      builder(record);
      created.push({ id: record.id, canonicalName: record.canonicalName, kind: record.kind });
      return record;
    }),
  };
  const memoryEntityCollection = {
    // No pre-existing (memory_id, entity_id) links.
    query: vi.fn(() => ({ fetch: vi.fn(async () => []) })),
    prepareCreate: vi.fn(() => ({ _op: "link" })),
  };
  const ctx: EntityOperationsContext = {
    database: {
      write: vi.fn(async (cb: () => unknown) => cb()),
      batch: vi.fn(async () => undefined),
    } as never,
    entityCollection: entityCollection as never,
    memoryEntityCollection: memoryEntityCollection as never,
  };
  return { ctx, entityCollection, memoryEntityCollection };
}

describe("linkMemoryEntitiesOp — entity kinds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists the kind on a newly created entity", async () => {
    const { ctx } = makeCtx();

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", [{ name: "Sara", kind: "person" }]);

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ canonicalName: "sara", kind: "person" });
    expect(result[0].kind).toBe("person");
  });

  it("leaves kind null when a bare-string name is linked", async () => {
    const { ctx } = makeCtx();

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", ["Sara"]);

    expect(created[0]).toMatchObject({ canonicalName: "sara", kind: null });
    expect(result[0].kind).toBeNull();
  });

  it("does NOT overwrite a non-null kind on an existing entity", async () => {
    const existing = makeEntityRecord("sara", "person");
    const { ctx } = makeCtx([existing]);

    // Incoming (wrong) kind must not clobber the stored one.
    const result = await linkMemoryEntitiesOp(ctx, "mem_1", [{ name: "Sara", kind: "place" }]);

    expect(existing.prepareUpdate).not.toHaveBeenCalled();
    expect(created).toHaveLength(0);
    expect(result[0].kind).toBe("person");
  });

  it("back-fills kind on an existing entity whose kind is null", async () => {
    const existing = makeEntityRecord("sara", null);
    const { ctx } = makeCtx([existing]);

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", [{ name: "Sara", kind: "person" }]);

    expect(existing.prepareUpdate).toHaveBeenCalledTimes(1);
    expect(existing.kind).toBe("person");
    expect(result[0].kind).toBe("person");
  });

  it("keeps the first non-null kind when the same name repeats with different kinds", async () => {
    const { ctx } = makeCtx();

    await linkMemoryEntitiesOp(ctx, "mem_1", [
      { name: "Sara", kind: "person" },
      { name: "sara", kind: "place" },
    ]);

    // One entity, first kind wins.
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ canonicalName: "sara", kind: "person" });
  });
});

describe("linkMemoryEntitiesOp — unlessTopicsUserManaged guard", () => {
  beforeEach(() => vi.clearAllMocks());

  /** Attach a memory_vault lookup to the mocked database so the in-write
   * guard can read the flag. */
  function withVaultRow(
    ctx: EntityOperationsContext,
    row: { topicsUserManaged: boolean | null } | undefined,
    opts?: { throws?: boolean }
  ) {
    (ctx.database as unknown as { get: unknown }).get = vi.fn(() => ({
      query: vi.fn(() => ({
        fetch: vi.fn(async () => {
          if (opts?.throws) throw new Error("adapter fault");
          return row ? [row] : [];
        }),
      })),
    }));
  }

  it("skips link creation and returns [] when the memory is user-managed", async () => {
    const { ctx, memoryEntityCollection } = makeCtx();
    withVaultRow(ctx, { topicsUserManaged: true });

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", ["zetachain"], {
      unlessTopicsUserManaged: true,
    });

    expect(result).toEqual([]);
    expect(memoryEntityCollection.prepareCreate).not.toHaveBeenCalled();
    // Entity upsert still ran — vocabulary is global.
    expect(created.length).toBe(1);
  });

  it("links normally when the flag is unset/false", async () => {
    const { ctx, memoryEntityCollection } = makeCtx();
    withVaultRow(ctx, { topicsUserManaged: null });

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", ["zetachain"], {
      unlessTopicsUserManaged: true,
    });

    expect(result.length).toBe(1);
    expect(memoryEntityCollection.prepareCreate).toHaveBeenCalledTimes(1);
  });

  it("skips linking for an absent row (deleted mid-call — no orphan links)", async () => {
    // Auto paths always link a row that exists (retain() commits before the
    // link), so an absent row here means it was deleted during the LLM
    // round-trip — linking would orphan memory_entity rows the delete
    // cascade already swept.
    const { ctx, memoryEntityCollection } = makeCtx();
    withVaultRow(ctx, undefined);

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", ["zetachain"], {
      unlessTopicsUserManaged: true,
    });

    expect(result).toEqual([]);
    expect(memoryEntityCollection.prepareCreate).not.toHaveBeenCalled();
  });

  it("fails CLOSED: a flag-read fault skips linking", async () => {
    const { ctx, memoryEntityCollection } = makeCtx();
    withVaultRow(ctx, { topicsUserManaged: null }, { throws: true });

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", ["zetachain"], {
      unlessTopicsUserManaged: true,
    });

    expect(result).toEqual([]);
    expect(memoryEntityCollection.prepareCreate).not.toHaveBeenCalled();
  });

  it("does not read the flag at all when the option is absent (default path)", async () => {
    const { ctx, memoryEntityCollection } = makeCtx();
    const getSpy = vi.fn();
    (ctx.database as unknown as { get: unknown }).get = getSpy;

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", ["zetachain"]);

    expect(result.length).toBe(1);
    expect(getSpy).not.toHaveBeenCalled();
    expect(memoryEntityCollection.prepareCreate).toHaveBeenCalledTimes(1);
  });
});

describe("linkMemoryEntitiesOp — guard also covers deleted rows and raw SQLite booleans", () => {
  beforeEach(() => vi.clearAllMocks());

  function withVaultRow2(ctx: EntityOperationsContext, row: Record<string, unknown> | undefined) {
    (ctx.database as unknown as { get: unknown }).get = vi.fn(() => ({
      query: vi.fn(() => ({ fetch: vi.fn(async () => (row ? [row] : [])) })),
    }));
  }

  it("skips linking when the memory was soft-deleted mid-call", async () => {
    const { ctx, memoryEntityCollection } = makeCtx();
    withVaultRow2(ctx, { isDeleted: true, topicsUserManaged: null });

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", ["zetachain"], {
      unlessTopicsUserManaged: true,
    });

    expect(result).toEqual([]);
    expect(memoryEntityCollection.prepareCreate).not.toHaveBeenCalled();
  });

  it("skips linking when the flag is a raw SQLite 1 (unsanitized)", async () => {
    const { ctx, memoryEntityCollection } = makeCtx();
    withVaultRow2(ctx, { isDeleted: false, topicsUserManaged: 1 });

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", ["zetachain"], {
      unlessTopicsUserManaged: true,
    });

    expect(result).toEqual([]);
    expect(memoryEntityCollection.prepareCreate).not.toHaveBeenCalled();
  });
});

describe("replaceMemoryEntitiesGuardedOp", () => {
  beforeEach(() => vi.clearAllMocks());

  /** Existing memory_entity link row with a destroy hook. */
  function makeLink(entityId: string) {
    return {
      entityId,
      memoryId: "mem_1",
      prepareDestroyPermanently: vi.fn(() => ({ _op: "destroy", entityId })),
    };
  }

  function makeReplaceCtx(
    existingEntities: ReturnType<typeof makeEntityRecord>[],
    existingLinks: ReturnType<typeof makeLink>[],
    vaultRow: Record<string, unknown> | undefined
  ) {
    const { ctx, memoryEntityCollection } = makeCtx(existingEntities);
    (memoryEntityCollection.query as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      fetch: vi.fn(async () => existingLinks),
    }));
    (ctx.database as unknown as { get: unknown }).get = vi.fn(() => ({
      query: vi.fn(() => ({ fetch: vi.fn(async () => (vaultRow ? [vaultRow] : [])) })),
    }));
    return { ctx, memoryEntityCollection };
  }

  const liveRow = { isDeleted: false, topicsUserManaged: null };

  it("creates missing links and destroys stale ones in one batch", async () => {
    const keep = makeEntityRecord("zetachain", null, "ent_keep");
    const stale = makeLink("ent_stale");
    const kept = makeLink("ent_keep");
    const { ctx } = makeReplaceCtx([keep], [kept, stale], liveRow);

    const result = await replaceMemoryEntitiesGuardedOp(ctx, "mem_1", ["zetachain", "new entity"]);

    expect(result).not.toBeNull();
    expect(result!.map((e) => e.canonicalName).sort()).toEqual(["new entity", "zetachain"]);
    // Stale link destroyed, kept link untouched.
    expect(stale.prepareDestroyPermanently).toHaveBeenCalledTimes(1);
    expect(kept.prepareDestroyPermanently).not.toHaveBeenCalled();
    // One batch write carried both the create and the destroy.
    const batchFn = (ctx.database as unknown as { batch: ReturnType<typeof vi.fn> }).batch;
    expect(batchFn).toHaveBeenCalled();
  });

  it("an empty set removes ALL existing links (answered-empty replace)", async () => {
    const a = makeLink("ent_a");
    const b = makeLink("ent_b");
    const { ctx } = makeReplaceCtx([], [a, b], liveRow);

    const result = await replaceMemoryEntitiesGuardedOp(ctx, "mem_1", []);

    expect(result).toEqual([]);
    expect(a.prepareDestroyPermanently).toHaveBeenCalledTimes(1);
    expect(b.prepareDestroyPermanently).toHaveBeenCalledTimes(1);
  });

  it("returns null and touches nothing when the row is user-managed", async () => {
    const stale = makeLink("ent_stale");
    const { ctx, memoryEntityCollection } = makeReplaceCtx([], [stale], {
      isDeleted: false,
      topicsUserManaged: true,
    });

    const result = await replaceMemoryEntitiesGuardedOp(ctx, "mem_1", ["zetachain"]);

    expect(result).toBeNull();
    expect(stale.prepareDestroyPermanently).not.toHaveBeenCalled();
    expect(memoryEntityCollection.prepareCreate).not.toHaveBeenCalled();
  });

  it("returns null for deleted and absent rows (guard, fail closed)", async () => {
    for (const vaultRow of [{ isDeleted: true, topicsUserManaged: null }, undefined]) {
      const stale = makeLink("ent_stale");
      const { ctx } = makeReplaceCtx([], [stale], vaultRow);
      const result = await replaceMemoryEntitiesGuardedOp(ctx, "mem_1", ["zetachain"]);
      expect(result).toBeNull();
      expect(stale.prepareDestroyPermanently).not.toHaveBeenCalled();
    }
  });
});
