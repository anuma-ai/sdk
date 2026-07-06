import { beforeEach, describe, expect, it, vi } from "vitest";

import { type EntityOperationsContext, linkMemoryEntitiesOp } from "./operations";

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
