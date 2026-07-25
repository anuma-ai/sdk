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
    prepareDestroyPermanently: vi.fn(() => ({ _op: "destroy-entity", canonicalName })),
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
  function makeLink(entityId: string, memoryId = "mem_1") {
    return {
      entityId,
      memoryId,
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

describe("replaceMemoryEntitiesGuardedOp — orphan entity prune", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeLink(entityId: string, memoryId = "mem_1") {
    return {
      entityId,
      memoryId,
      prepareDestroyPermanently: vi.fn(() => ({ _op: "destroy-link", entityId })),
    };
  }

  /**
   * The op runs two memory_entity queries: the memory's own links, then the
   * links of every entity whose link is going away. `linkQueries` supplies them
   * in order so a test can say "this entity is still referenced elsewhere".
   */
  function makePruneCtx(
    orphanCandidates: ReturnType<typeof makeEntityRecord>[],
    linkQueries: ReturnType<typeof makeLink>[][]
  ) {
    const { ctx, memoryEntityCollection, entityCollection } = makeCtx(orphanCandidates);
    let call = 0;
    (memoryEntityCollection.query as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const rows = linkQueries[Math.min(call, linkQueries.length - 1)] ?? [];
      call += 1;
      return { fetch: vi.fn(async () => rows) };
    });
    (ctx.database as unknown as { get: unknown }).get = vi.fn(() => ({
      query: vi.fn(() => ({
        fetch: vi.fn(async () => [{ isDeleted: false, topicsUserManaged: null }]),
      })),
    }));
    return { ctx, entityCollection };
  }

  it("destroys an entity row whose last link just went away", async () => {
    const home = makeEntityRecord("home", "place", "ent_home");
    const link = makeLink("ent_home");
    // Answered-empty replace: the re-extraction pass no longer mentions "home".
    const { ctx } = makePruneCtx([home], [[link], [link]]);

    const result = await replaceMemoryEntitiesGuardedOp(ctx, "mem_1", []);

    expect(result).toEqual([]);
    expect(link.prepareDestroyPermanently).toHaveBeenCalledTimes(1);
    expect(home.prepareDestroyPermanently).toHaveBeenCalledTimes(1);
  });

  it("keeps an entity another memory still links", async () => {
    const home = makeEntityRecord("home", "place", "ent_home");
    const mine = makeLink("ent_home");
    const theirs = makeLink("ent_home", "mem_2");
    const { ctx, entityCollection } = makePruneCtx([home], [[mine], [mine, theirs]]);

    await replaceMemoryEntitiesGuardedOp(ctx, "mem_1", []);

    expect(mine.prepareDestroyPermanently).toHaveBeenCalledTimes(1);
    expect(home.prepareDestroyPermanently).not.toHaveBeenCalled();
    // Nothing orphaned ⇒ the entity lookup is skipped entirely.
    expect(entityCollection.query).not.toHaveBeenCalled();
  });

  it("keeps an entity a DIFFERENT USER still links", async () => {
    // `entity` rows are global vocabulary with no owner, so the prune must not
    // be user-scoped — deleting a row another user references is data loss.
    const shared = makeEntityRecord("zetachain", "organization", "ent_zeta");
    const mine = makeLink("ent_zeta");
    const otherUser = makeLink("ent_zeta", "mem_other_user");
    const { ctx } = makePruneCtx([shared], [[mine], [mine, otherUser]]);

    await replaceMemoryEntitiesGuardedOp(ctx, "mem_1", []);

    expect(shared.prepareDestroyPermanently).not.toHaveBeenCalled();
  });

  it("prunes nothing when no link was destroyed", async () => {
    const keep = makeEntityRecord("zetachain", null, "ent_keep");
    const kept = makeLink("ent_keep");
    const { ctx } = makePruneCtx([keep], [[kept], [kept]]);

    // "zetachain" is still extracted, so its link survives and so must the row.
    await replaceMemoryEntitiesGuardedOp(ctx, "mem_1", ["zetachain"]);

    expect(kept.prepareDestroyPermanently).not.toHaveBeenCalled();
    expect(keep.prepareDestroyPermanently).not.toHaveBeenCalled();
  });

  it("does not run at all when the guard skips the memory", async () => {
    const home = makeEntityRecord("home", "place", "ent_home");
    const link = makeLink("ent_home");
    const { ctx } = makePruneCtx([home], [[link], [link]]);
    (ctx.database as unknown as { get: ReturnType<typeof vi.fn> }).get = vi.fn(() => ({
      query: vi.fn(() => ({
        fetch: vi.fn(async () => [{ isDeleted: false, topicsUserManaged: true }]),
      })),
    }));

    const result = await replaceMemoryEntitiesGuardedOp(ctx, "mem_1", []);

    expect(result).toBeNull();
    expect(home.prepareDestroyPermanently).not.toHaveBeenCalled();
  });
});

describe("entity upsert + link atomicity", () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * The upsert must NOT commit in its own writer. When it did, the caller's link
   * insert landed in a second writer, and a concurrent
   * `replaceMemoryEntitiesGuardedOp` could slip into the gap, see the new entity
   * at zero links, prune it, and leave a memory_entity row pointing at a deleted
   * entity. WatermelonDB serializes writers, so "one writer" IS the fix.
   */
  it("linkMemoryEntitiesOp opens exactly ONE writer", async () => {
    const { ctx } = makeCtx();

    await linkMemoryEntitiesOp(ctx, "mem_1", [{ name: "Sara", kind: "person" }]);

    const write = (ctx.database as unknown as { write: ReturnType<typeof vi.fn> }).write;
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("batches the entity create together with the link create", async () => {
    const { ctx } = makeCtx();

    await linkMemoryEntitiesOp(ctx, "mem_1", ["Sara"]);

    // One batch carrying both, not an entity batch followed by a link batch.
    const batch = (ctx.database as unknown as { batch: ReturnType<typeof vi.fn> }).batch;
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0]!.length).toBe(2);
  });

  it("replaceMemoryEntitiesGuardedOp also opens exactly ONE writer", async () => {
    const { ctx } = makeCtx();
    (ctx.database as unknown as { get: unknown }).get = vi.fn(() => ({
      query: vi.fn(() => ({
        fetch: vi.fn(async () => [{ isDeleted: false, topicsUserManaged: null }]),
      })),
    }));

    await replaceMemoryEntitiesGuardedOp(ctx, "mem_1", ["zetachain"]);

    const write = (ctx.database as unknown as { write: ReturnType<typeof vi.fn> }).write;
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("still records vocabulary when the guard skips the links", async () => {
    // Entity rows are global vocabulary, so a user-managed memory blocks the
    // LINKS but not the upsert — asserted here because the atomicity refactor
    // moved the upsert inside the writer, next to the guard.
    const { ctx } = makeCtx();
    (ctx.database as unknown as { get: unknown }).get = vi.fn(() => ({
      query: vi.fn(() => ({
        fetch: vi.fn(async () => [{ isDeleted: false, topicsUserManaged: true }]),
      })),
    }));

    const result = await linkMemoryEntitiesOp(ctx, "mem_1", ["zetachain"], {
      unlessTopicsUserManaged: true,
    });

    expect(result).toEqual([]);
    expect(created).toHaveLength(1);
  });
});
