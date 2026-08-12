// @vitest-environment happy-dom
/**
 * Schema v42 topic sync: `memory_vault.topics` is the durable record and
 * `entity` / `memory_entity` are a device-local index over it.
 *
 * Deliberately runs against a REAL LokiJS database rather than the hand-rolled
 * mocks in `operations.test.ts`. The invariant under test is "the record and the
 * index agree after every write", which only means something end-to-end — a
 * mocked collection would let a broken writer pass by returning whatever the
 * assertion wanted.
 */
import { Database, Q } from "@nozbe/watermelondb";
import type { WriterInterface } from "@nozbe/watermelondb/Database/WorkQueue";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { extractAndLinkEntitiesForMemoriesOp } from "../../memory/topicExtract";
import * as entityOps from "../entities/operations";
import {
  type EntityOperationsContext,
  linkMemoryEntitiesOp,
  replaceMemoryEntitiesGuardedOp,
} from "../entities/operations";
import type { Entity, MemoryEntity } from "../entities/models";
import { parseTopics, type StoredTopic } from "../entities/types";
import { SDK_SCHEMA_VERSION, sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import type { VaultMemory } from "./models";
import {
  backfillMemoryTopicsOp,
  clearMemoryTopicsOverrideOp,
  createVaultMemoryOp,
  getMemoriesNeedingTopicExtractionOp,
  relinkMemoryTopicsOp,
  setMemoryEntitiesOp,
  TOPICS_EXTRACTION_VERSION,
  type VaultMemoryOperationsContext,
} from "./operations";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `topics-sync-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

let db: Database;
let ctx: VaultMemoryOperationsContext;
let entityCtx: EntityOperationsContext;

beforeEach(() => {
  db = makeDatabase();
  entityCtx = {
    database: db,
    entityCollection: db.get<Entity>("entity"),
    memoryEntityCollection: db.get<MemoryEntity>("memory_entity"),
  };
  ctx = {
    database: db,
    vaultMemoryCollection: db.get<VaultMemory>("memory_vault"),
    entityCtx,
  };
  // Every op under test must reach its result from data already on the row.
  // A fetch here would mean an LLM call crept into a no-LLM path.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("no network call expected in a topics-sync path");
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function seedMemory(content: string): Promise<string> {
  const created = await createVaultMemoryOp(ctx, { content });
  return created.uniqueId;
}

async function rowOf(memoryId: string): Promise<VaultMemory> {
  return ctx.vaultMemoryCollection.find(memoryId);
}

/** The `topics` record on a memory, or null when the column is still unset. */
async function topicsOf(memoryId: string): Promise<StoredTopic[] | null> {
  return parseTopics((await rowOf(memoryId)).topics);
}

/** The canonical names the memory's `memory_entity` rows actually point at. */
async function linkedNamesOf(memoryId: string): Promise<string[]> {
  const links = await entityCtx.memoryEntityCollection
    .query(Q.where("memory_id", memoryId))
    .fetch();
  const names: string[] = [];
  for (const link of links) {
    const entity = await entityCtx.entityCollection.find(String(link.entityId));
    names.push(entity.canonicalName);
  }
  return names.sort();
}

/** Normalized `topics` names — what the index is supposed to mirror. */
function topicNames(topics: StoredTopic[] | null): string[] {
  return (topics ?? []).map((t) => t.name.toLowerCase()).sort();
}

/** Rewrite a memory's timestamps + sync status to look like a synced row that
 * arrived from another device. `_raw` is poked directly because the only API
 * that sets these is the client's restore path, which lives in another repo. */
async function markAsRestored(
  memoryId: string,
  fields: Partial<Record<string, unknown>>
): Promise<void> {
  const record = await rowOf(memoryId);
  const originalUpdatedAt = record.updatedAt.getTime();
  await db.write(async () => {
    await record.update((r) => {
      r._setRaw("updated_at", originalUpdatedAt);
      for (const [key, value] of Object.entries(fields)) r._setRaw(key, value as never);
    });
  });
  (record._raw as Record<string, unknown>)._status = "synced";
}

// ---------------------------------------------------------------------------
// T1 — schema v42
// ---------------------------------------------------------------------------

describe("schema v42", () => {
  // The topics columns arrived in v42; the version constant has since moved on
  // (v43 added a conversations index). What matters to this suite is that the
  // v42 migration step is still there and still additive, not that it is the
  // newest — so the constant is only checked to be at or past v42.
  it("keeps SDK_SCHEMA_VERSION at or past the v42 topics bump", () => {
    expect(SDK_SCHEMA_VERSION).toBeGreaterThanOrEqual(42);
    expect(sdkSchema.version).toBe(SDK_SCHEMA_VERSION);
  });

  it("exposes topics + topics_updated_at on a fresh database", async () => {
    const columns = sdkSchema.tables.memory_vault!.columns;
    expect(columns.topics).toMatchObject({ name: "topics", type: "string", isOptional: true });
    expect(columns.topics_updated_at).toMatchObject({
      name: "topics_updated_at",
      type: "number",
      isOptional: true,
    });

    // ...and they survive a real round-trip, not just the schema literal.
    const id = await seedMemory("round trip");
    const record = await rowOf(id);
    await db.write(async () =>
      record.update((r) => {
        r._setRaw("topics", '[{"name":"Acme","source":"auto"}]');
        r._setRaw("topics_updated_at", 4_242);
      })
    );
    const reread = await rowOf(id);
    expect(reread.topicsUpdatedAt).toBe(4_242);
    expect(parseTopics(reread.topics)).toEqual([{ name: "Acme", source: "auto" }]);
  });

  it("adds both columns in an ADDITIVE v41 → v42 migration", () => {
    const v42 = sdkMigrations.sortedMigrations.find((m) => m.toVersion === 42);
    expect(v42).toBeDefined();
    // One add_columns step on memory_vault carrying exactly these two columns.
    // `add_columns` (not create_table / unsafe_execute_sql) is what keeps the
    // list additive: nothing existing is dropped or rewritten.
    expect(v42!.steps).toEqual([
      {
        type: "add_columns",
        table: "memory_vault",
        columns: [
          { name: "topics", type: "string", isOptional: true },
          { name: "topics_updated_at", type: "number", isOptional: true },
        ],
        unsafeSql: undefined,
      },
    ]);
    // A v41 database reaches v42 through that step and nothing else:
    // WatermelonDB rejects a migration list with gaps or duplicates at load
    // time, so a contiguous list containing 42 IS the v41 → v42 path. The list
    // now extends past 42 (v43 indexes conversations), so this asserts the
    // ladder still reaches at least 42 rather than ending there.
    expect(sdkMigrations.maxVersion).toBeGreaterThanOrEqual(42);
    expect(sdkMigrations.minVersion).toBeLessThan(41);
  });
});

// ---------------------------------------------------------------------------
// T2 — one shared writer for `topics`
// ---------------------------------------------------------------------------

describe("topics is written by every link path", () => {
  it("linkMemoryEntitiesOp records the auto set and pins updated_at", async () => {
    const id = await seedMemory("works at Acme");
    const before = (await rowOf(id)).updatedAt.getTime();

    await linkMemoryEntitiesOp(entityCtx, id, [{ name: "Acme", kind: "organization" }]);

    const topics = await topicsOf(id);
    expect(topics).toEqual([{ name: "Acme", kind: "organization", source: "auto" }]);
    expect(topicNames(topics)).toEqual(await linkedNamesOf(id));
    const after = await rowOf(id);
    expect(after.topicsUpdatedAt).not.toBeNull();
    expect(after.updatedAt.getTime()).toBe(before);
  });

  it("linkMemoryEntitiesOp's add semantics record old ∪ new", async () => {
    const id = await seedMemory("works at Acme with Sara");
    await linkMemoryEntitiesOp(entityCtx, id, ["Acme"]);
    await linkMemoryEntitiesOp(entityCtx, id, ["Sara"]);

    const topics = await topicsOf(id);
    expect(topicNames(topics)).toEqual(["acme", "sara"]);
    expect(topicNames(topics)).toEqual(await linkedNamesOf(id));
  });

  it("a no-op link call leaves topics_updated_at alone (no spurious re-upload)", async () => {
    const id = await seedMemory("works at Acme");
    await linkMemoryEntitiesOp(entityCtx, id, ["Acme"]);
    const stamp = (await rowOf(id)).topicsUpdatedAt;

    // Strictly increasing clock, so a write can't hide behind ms granularity and
    // make this assertion pass by luck.
    let clock = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => ++clock);
    try {
      // Auto-extraction re-linking a memory to entities it already carries must
      // not touch the record: `topics_updated_at` is what the push scan keys on,
      // so bumping it here would re-upload the row (embedding included) for
      // nothing, every sweep.
      await linkMemoryEntitiesOp(entityCtx, id, ["Acme"]);
      await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Acme"]);
    } finally {
      nowSpy.mockRestore();
    }

    expect((await rowOf(id)).topicsUpdatedAt).toBe(stamp);
  });

  it("replaceMemoryEntitiesGuardedOp narrows the record when links go away", async () => {
    const id = await seedMemory("works at Acme");
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Acme"]);
    const before = (await rowOf(id)).updatedAt.getTime();

    // "works at Acme" → "works at Globex": Acme must leave both the index and
    // the record, and its now-orphaned entity row is pruned in the same batch.
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Globex"]);

    const topics = await topicsOf(id);
    expect(topicNames(topics)).toEqual(["globex"]);
    expect(topicNames(topics)).toEqual(await linkedNamesOf(id));
    const orphans = await entityCtx.entityCollection
      .query(Q.where("canonical_name", "acme"))
      .fetch();
    expect(orphans).toEqual([]);
    expect((await rowOf(id)).updatedAt.getTime()).toBe(before);
  });

  it("an answered-empty replace records [] rather than leaving a stale record", async () => {
    const id = await seedMemory("likes tea");
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Acme"]);

    await replaceMemoryEntitiesGuardedOp(entityCtx, id, []);

    expect(await topicsOf(id)).toEqual([]);
    expect(await linkedNamesOf(id)).toEqual([]);
  });

  it("setMemoryEntitiesOp records the user set with display casing", async () => {
    const id = await seedMemory("follows ZetaChain");
    const before = (await rowOf(id)).updatedAt.getTime();

    await setMemoryEntitiesOp(ctx, id, ["ZetaChain"]);

    const topics = await topicsOf(id);
    // The name keeps the caller's casing even though the entity row is
    // lowercased — carrying display casing across devices is the point.
    expect(topics).toEqual([{ name: "ZetaChain", source: "user" }]);
    expect(await linkedNamesOf(id)).toEqual(["zetachain"]);
    const after = await rowOf(id);
    expect(after.topicsUserManaged).toBe(true);
    expect(after.topicsUpdatedAt).not.toBeNull();
    expect(after.updatedAt.getTime()).toBe(before);
  });

  it("setMemoryEntitiesOp narrows the record to the user's set, dropping stale links", async () => {
    const id = await seedMemory("works at Acme");
    await linkMemoryEntitiesOp(entityCtx, id, ["Acme", "Sara"]);

    await setMemoryEntitiesOp(ctx, id, ["Sara"]);

    const topics = await topicsOf(id);
    expect(topics).toEqual([{ name: "Sara", source: "user" }]);
    expect(topicNames(topics)).toEqual(await linkedNamesOf(id));
  });

  it("clearing every topic records an explicit [], not a null column", async () => {
    const id = await seedMemory("prefers dark mode");
    await linkMemoryEntitiesOp(entityCtx, id, ["Acme"]);

    await setMemoryEntitiesOp(ctx, id, []);

    // [] is a RECORD of "no topics" — distinct from the null that means "no
    // record yet", which would make this row a permanent backfill candidate.
    expect(await topicsOf(id)).toEqual([]);
    expect(await linkedNamesOf(id)).toEqual([]);
  });

  /**
   * Drift guard for PLAN.md failure point #1: four writers, one helper. A fifth
   * link path that forgets `topics` silently desynchronizes the durable record
   * from the device-local index, and nothing else would catch it — the index
   * still works on THIS device, and the damage only shows up after a migration.
   */
  it("DRIFT: every link-writing op leaves topics matching memory_entity", async () => {
    const writers: Array<{ name: string; run: (memoryId: string) => Promise<unknown> }> = [
      {
        name: "linkMemoryEntitiesOp",
        run: (id) =>
          linkMemoryEntitiesOp(entityCtx, id, ["Acme", { name: "Sara", kind: "person" }]),
      },
      {
        name: "linkMemoryEntitiesOp (guarded)",
        run: (id) =>
          linkMemoryEntitiesOp(entityCtx, id, ["Acme"], { unlessTopicsUserManaged: true }),
      },
      {
        name: "replaceMemoryEntitiesGuardedOp",
        run: (id) => replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Globex"]),
      },
      {
        name: "setMemoryEntitiesOp",
        run: (id) => setMemoryEntitiesOp(ctx, id, ["Sara", "Globex"]),
      },
      {
        name: "setMemoryEntitiesOp (clear)",
        run: (id) => setMemoryEntitiesOp(ctx, id, []),
      },
    ];

    // Strictly increasing clock. Real `Date.now()` has ms granularity, so the
    // seed write and the writer under test land on the same value and neither
    // timestamp assertion below can tell a write from a skip. This is the ONLY
    // place all five paths are checked against a deterministic clock — the
    // per-writer tests above assert the same two properties, but a bump or a
    // skip can hide inside one millisecond there.
    let clock = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => ++clock);
    try {
      for (const writer of writers) {
        const id = await seedMemory(`drift ${writer.name}`);
        // Pre-existing links, so replace/clear paths have something to remove.
        await linkMemoryEntitiesOp(entityCtx, id, ["Preexisting"]);
        const stampBefore = (await rowOf(id)).topicsUpdatedAt;
        const updatedAtBefore = (await rowOf(id)).updatedAt.getTime();
        await writer.run(id);
        expect(topicNames(await topicsOf(id)), `${writer.name} desynchronized topics`).toEqual(
          await linkedNamesOf(id)
        );
        // The internal skip-flag must be OFF here. Only relink turns it on — and
        // only relink is exempt from this table (see the export-surface test).
        expect(
          (await rowOf(id)).topicsUpdatedAt,
          `${writer.name} skipped the topics write`
        ).not.toBe(stampBefore);
        // `updated_at` must stay pinned in EVERY writer. An accidental bump is
        // silent — nothing fails, recall ranking just degrades on every topic
        // edit, which is the exact thing `topics_updated_at` exists to avoid.
        expect((await rowOf(id)).updatedAt.getTime(), `${writer.name} bumped updated_at`).toBe(
          updatedAtBefore
        );
      }
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("DRIFT: relink is the ONLY path that skips the topics write", async () => {
    // The other side of the assertion in the drift table: exactly one link path
    // is allowed to leave `topics` alone, and it's the one whose input IS
    // `topics`. If a second path ever turns the skip-flag on, the record stops
    // tracking the index and #796 comes back — silently, on migrated devices.
    const id = await seedMemory("works at Acme");
    await markAsRestored(id, {
      topics: JSON.stringify([{ name: "Acme", source: "auto" }]),
      topics_updated_at: 5_000,
    });

    await relinkMemoryTopicsOp(ctx, [id]);

    // Links changed (that's the point) while the record stayed put.
    expect(await linkedNamesOf(id)).toEqual(["acme"]);
    expect((await rowOf(id)).topicsUpdatedAt).toBe(5_000);
  });

  /**
   * The behavioral guards above can only check writers they know about. This one
   * fails the moment `entities/operations` grows or loses an export, forcing the
   * author to classify it: does it change a memory's links, and if so is it in
   * the drift table or in the exempt list with a reason? Update BOTH together.
   */
  it("DRIFT: the entity-ops export surface is unchanged", () => {
    // Covered by the drift table above (directly or via setMemoryEntitiesOp).
    const writesLinksAndTopics = [
      "linkMemoryEntitiesOp",
      "replaceMemoryEntitiesGuardedOp",
      "prepareMemoryTopicsUpdateFromRow",
    ];
    // Exempt, each for a stated reason:
    //  - relinkMemoryEntitiesFromTopicsOp: `topics` is its INPUT; writing the
    //    vault row would dirty a restored memory and re-upload the vault.
    //  - unlink* : the memory is being deleted, so there is no record to keep.
    //  - backfillMemoryEntityUserIdsOp: stamps user_id on existing links only.
    //  - findMemoryTopicsRow: a READ. It resolves the row that
    //    prepareMemoryTopicsUpdateFromRow then prepares, split out so the
    //    prepare stays synchronous with batch (#891).
    const exempt = [
      "findMemoryTopicsRow",
      "relinkMemoryEntitiesFromTopicsOp",
      "unlinkMemoryEntitiesOp",
      "unlinkAllMemoryEntitiesForUserOp",
      "backfillMemoryEntityUserIdsOp",
    ];
    // Read-only.
    const readers = ["getMemoriesByEntityNamesOp", "getEntitiesByMemoryIdsOp"];

    expect(Object.keys(entityOps).sort()).toEqual(
      [...writesLinksAndTopics, ...exempt, ...readers].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// T3 — the topicsToRelink bucket
// ---------------------------------------------------------------------------

/**
 * Moving the ownership filter out of the query and into the partition means the
 * partition now carries it — and it has to gate BOTH LLM-facing buckets. Missing
 * the `pending` gate LLM-extracts over a user's curated topics; missing the
 * `linkedUnstamped` gate grandfather-stamps one. Either is the same bug class
 * #796 is about, so this is asserted on its own rather than as a side effect of
 * the relink tests.
 */
describe("getMemoriesNeedingTopicExtractionOp — the curated gate survived the filter move", () => {
  it("keeps a curated, deliberately topicless row out of pending", async () => {
    // No links + no stamp is the shape that would otherwise be sent to the LLM,
    // and an EMPTY record is what makes this row the user's choice rather than
    // restore damage: parseTopics keeps `[]` ("recorded as topicless") distinct
    // from null ("no record yet"), and only null is repaired — see the pre-v42
    // restore-damage suite.
    const id = await seedMemory("follows ZetaChain");
    await markAsRestored(id, {
      topics: "[]",
      topics_updated_at: 5_000,
      topics_user_managed: true,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped).toEqual([]);
    // ...and it isn't a relink candidate either: no names to rebuild from.
    expect(result.topicsToRelink).toEqual([]);
    // The flag survives — the user asked for no topics on this memory.
    expect((await rowOf(id)).topicsUserManaged).toBe(true);
  });

  it("keeps a curated LINKED-UNSTAMPED row out of linkedUnstamped", async () => {
    // Links + no stamp is the grandfather shape. Stamping a curated row would
    // hand it to the version gate, which re-extracts over the user's topics on
    // the next TOPICS_EXTRACTION_VERSION bump.
    const id = await seedMemory("follows ZetaChain");
    await setMemoryEntitiesOp(ctx, id, ["ZetaChain"]);
    await markAsRestored(id, { topics_extracted_at: null, topics_extracted_version: null });
    expect((await rowOf(id)).topicsUserManaged).toBe(true);
    expect(await linkedNamesOf(id)).toEqual(["zetachain"]);

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.linkedUnstamped).toEqual([]);
    expect(result.pending).toEqual([]);
  });

  it("keeps a curated row whose stamp is behind the current version out of pending", async () => {
    // The version gate is the other door into `pending` — a curated row must not
    // walk through it when TOPICS_EXTRACTION_VERSION is bumped.
    const id = await seedMemory("follows ZetaChain");
    await setMemoryEntitiesOp(ctx, id, ["ZetaChain"]);
    await markAsRestored(id, {
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION - 1,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped).toEqual([]);
  });

  it("still gates on a raw SQLite 1, not just a real boolean", async () => {
    // Links + a record, so the row is curated in every sense — the flag is the
    // only thing keeping it out of `linkedUnstamped`.
    const id = await seedMemory("follows ZetaChain");
    await setMemoryEntitiesOp(ctx, id, ["ZetaChain"]);
    await markAsRestored(id, {
      topics_user_managed: 1,
      topics_extracted_at: null,
      topics_extracted_version: null,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped).toEqual([]);
  });
});

describe("getMemoriesNeedingTopicExtractionOp — links that resolve to nothing", () => {
  /** A memory whose `memory_entity` rows point at `entity` rows that are gone.
   * The join rows outlive a lost or partially-rebuilt entity table, so the row
   * still LOOKS linked while carrying no usable topic at all. */
  async function seedDanglingLinks(content: string, names: string[]): Promise<string> {
    const id = await seedMemory(content);
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, names);
    const links = await entityCtx.memoryEntityCollection.query(Q.where("memory_id", id)).fetch();
    await db.write(async () => {
      for (const link of links) {
        const entity = await entityCtx.entityCollection.find(link.entityId);
        await entity.destroyPermanently();
      }
    });
    // Pre-v42 shape, unstamped: the sweep has to classify it on its links alone.
    await markAsRestored(id, {
      topics: null,
      topics_updated_at: null,
      topics_extracted_at: null,
      topics_extracted_version: null,
    });
    return id;
  }

  async function linkCountOf(memoryId: string): Promise<number> {
    return entityCtx.memoryEntityCollection.query(Q.where("memory_id", memoryId)).fetchCount();
  }

  it("sends the row to the LLM instead of grandfather-stamping it", async () => {
    const id = await seedDanglingLinks("works at Acme", ["Acme"]);
    // Still linked as far as the join table knows — that's the trap.
    expect(await linkCountOf(id)).toBe(1);

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    // Grandfathering it would stamp "extracted" over zero topics, and the stamp
    // hides the row from every later sweep until its content changes — exactly
    // the permanent recall loss this path exists to prevent.
    expect(sweep.linkedUnstamped).toEqual([]);
    expect(sweep.pending.map((m) => m.uniqueId)).toEqual([id]);
    expect(sweep.topicsToRelink).toEqual([]);
  });

  it("keeps the row out of a backfill that could never fill it", async () => {
    const id = await seedDanglingLinks("works at Acme", ["Acme"]);

    expect((await getMemoriesNeedingTopicExtractionOp(ctx)).topicsBackfill).toEqual([]);

    // Why it has to stay out: backfill derives the record from the entity rows,
    // and there are none — so it writes nothing, and an offered row comes back
    // every sweep forever, holding a slot under `limit`.
    expect(await backfillMemoryTopicsOp(ctx, [id])).toEqual([]);
    expect(await topicsOf(id)).toBeNull();
  });
});

describe("getMemoriesNeedingTopicExtractionOp — topicsToRelink", () => {
  /** A memory as it lands on a freshly restored device: the synced `topics`
   * record and its extraction stamp arrived, the device-local links did not. */
  async function seedRestored(
    content: string,
    topics: StoredTopic[],
    extra: Record<string, unknown> = {}
  ): Promise<string> {
    const id = await seedMemory(content);
    await markAsRestored(id, {
      topics: JSON.stringify(topics),
      topics_updated_at: 5_000,
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
      ...extra,
    });
    return id;
  }

  it("routes a restored row to topicsToRelink, never to the LLM bucket", async () => {
    const id = await seedRestored("works at Acme", [{ name: "Acme", source: "auto" }]);

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.topicsToRelink).toEqual([id]);
    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped).toEqual([]);
    expect(result.topicsBackfill).toEqual([]);
  });

  it("keeps an UNSTAMPED restored row out of the LLM bucket too", async () => {
    // The auto path (`linkMemoryEntitiesOp`) writes `topics` without stamping,
    // so a restored auto-tagged memory arrives with a record, no links, and no
    // stamp — which also reads as "never extracted, no links". Without the
    // relink bucket winning, it would be sent to the LLM to re-derive topics
    // the row is already carrying.
    const id = await seedMemory("works at Acme");
    await markAsRestored(id, {
      topics: JSON.stringify([{ name: "Acme", source: "auto" }]),
      topics_updated_at: 5_000,
      topics_extracted_at: null,
      topics_extracted_version: null,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.topicsToRelink).toEqual([id]);
    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped).toEqual([]);
  });

  it("includes a CURATED restored row — the flag must not filter it out", async () => {
    // This is the bug: a curated memory arrives saying "don't touch my topics"
    // with zero links, and the old query dropped it before any bucket.
    const id = await seedRestored("follows ZetaChain", [{ name: "ZetaChain", source: "user" }], {
      topics_user_managed: true,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.topicsToRelink).toEqual([id]);
    expect(result.pending).toEqual([]);
  });

  it("leaves a row whose index already matches its record in no bucket", async () => {
    const id = await seedMemory("works at Acme");
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Acme"]);
    await markAsRestored(id, {
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.topicsToRelink).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped).toEqual([]);
    expect(result.topicsBackfill).toEqual([]);
  });

  it("catches divergence in the other direction too (an extra link)", async () => {
    const id = await seedMemory("works at Acme");
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Acme", "Globex"]);
    // Record says one topic; the index still carries two.
    await markAsRestored(id, {
      topics: JSON.stringify([{ name: "Acme", source: "auto" }]),
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.topicsToRelink).toEqual([id]);
  });

  it("caps topicsToRelink under limit", async () => {
    for (let i = 0; i < 5; i++) {
      await seedRestored(`memory ${i}`, [{ name: `Entity${i}`, source: "auto" }]);
    }

    const result = await getMemoriesNeedingTopicExtractionOp(ctx, { limit: 2 });

    expect(result.topicsToRelink).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// T4 — rebuilding the index
// ---------------------------------------------------------------------------

describe("relinkMemoryTopicsOp", () => {
  it("rebuilds the entity + link set the origin device had", async () => {
    // Origin device: extract topics, then read off what its index looked like.
    const origin = await seedMemory("works at Acme with Sara");
    await replaceMemoryEntitiesGuardedOp(entityCtx, origin, [
      { name: "Acme", kind: "organization" },
      { name: "Sara", kind: "person" },
    ]);
    const originNames = await linkedNamesOf(origin);
    const record = await topicsOf(origin);

    // Restored device: same record, no links.
    const restored = await seedMemory("works at Acme with Sara");
    await markAsRestored(restored, {
      topics: JSON.stringify(record),
      topics_updated_at: 5_000,
      topics_extracted_at: Date.now() + 10_000,
    });
    expect(await linkedNamesOf(restored)).toEqual([]);

    const relinked = await relinkMemoryTopicsOp(ctx, [restored]);

    expect(relinked).toEqual([restored]);
    expect(await linkedNamesOf(restored)).toEqual(originNames);
    // Kinds round-trip too, so the graph isn't rebuilt as untyped vocabulary.
    const acme = await entityCtx.entityCollection.query(Q.where("canonical_name", "acme")).fetch();
    expect(acme[0]!.kind).toBe("organization");
  });

  it("relinks a curated memory and leaves topics_user_managed alone", async () => {
    const id = await seedMemory("follows ZetaChain");
    await markAsRestored(id, {
      topics: JSON.stringify([{ name: "ZetaChain", source: "user" }]),
      topics_updated_at: 5_000,
      topics_user_managed: true,
    });

    await relinkMemoryTopicsOp(ctx, [id]);

    expect(await linkedNamesOf(id)).toEqual(["zetachain"]);
    // Still curated — the autotagger must keep its hands off the row.
    expect((await rowOf(id)).topicsUserManaged).toBe(true);
  });

  it("does NOT dirty the memory_vault row (a restore must not re-upload)", async () => {
    const id = await seedMemory("works at Acme");
    await markAsRestored(id, {
      topics: JSON.stringify([{ name: "Acme", source: "auto" }]),
      topics_updated_at: 5_000,
    });
    const before = await rowOf(id);
    const updatedAtBefore = before.updatedAt.getTime();
    // The COLUMN, not the Model: WatermelonDB's RecordCache hands out the same
    // instance for every `find`, so holding the Model and comparing `.topics`
    // after the op would compare the value to itself and never fail.
    const topicsBefore = before.topics;

    await relinkMemoryTopicsOp(ctx, [id]);

    const after = await rowOf(id);
    // The push scan keys on these two; moving either re-uploads the row (and
    // its embedding) for every memory on every device migration.
    expect(after.topicsUpdatedAt).toBe(5_000);
    expect(after.updatedAt.getTime()).toBe(updatedAtBefore);
    expect(after.topics).toBe(topicsBefore);
    expect((after._raw as Record<string, unknown>)._status).toBe("synced");
  });

  it("skips rows with no record to rebuild from", async () => {
    const noRecord = await seedMemory("no topics record");
    const emptyRecord = await seedMemory("deliberately topicless");
    await markAsRestored(emptyRecord, { topics: "[]", topics_updated_at: 5_000 });

    expect(await relinkMemoryTopicsOp(ctx, [noRecord, emptyRecord])).toEqual([]);
    expect(await linkedNamesOf(noRecord)).toEqual([]);
    expect(await linkedNamesOf(emptyRecord)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// T5 — backfilling pre-v42 rows
// ---------------------------------------------------------------------------

describe("topics backfill", () => {
  /** A pre-v42 row: entity links exist, no `topics` record. */
  async function seedLegacy(content: string, names: string[]): Promise<string> {
    const id = await seedMemory(content);
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, names);
    await markAsRestored(id, {
      topics: null,
      topics_updated_at: null,
      // Stamped at the current version so the row isn't ALSO an LLM candidate.
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });
    return id;
  }

  it("offers a legacy row for backfill and fills it from its links", async () => {
    const id = await seedLegacy("works at Acme", ["Acme"]);
    const before = (await rowOf(id)).updatedAt.getTime();

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);
    expect(sweep.topicsBackfill).toEqual([id]);
    expect(sweep.pending).toEqual([]);

    expect(await backfillMemoryTopicsOp(ctx, sweep.topicsBackfill)).toEqual([id]);

    const topics = await topicsOf(id);
    expect(topics).toEqual([{ name: "acme", source: "auto" }]);
    expect(topicNames(topics)).toEqual(await linkedNamesOf(id));
    const after = await rowOf(id);
    // The bumped topics_updated_at is the point — it's what uploads the row.
    expect(after.topicsUpdatedAt).not.toBeNull();
    expect(after.updatedAt.getTime()).toBe(before);
  });

  it("records a curated legacy row's topics as user-sourced", async () => {
    const id = await seedLegacy("follows ZetaChain", ["ZetaChain"]);
    await markAsRestored(id, { topics_user_managed: true });

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);
    expect(sweep.topicsBackfill).toEqual([id]);

    await backfillMemoryTopicsOp(ctx, sweep.topicsBackfill);

    expect(await topicsOf(id)).toEqual([{ name: "zetachain", source: "user" }]);
  });

  it("is idempotent — a filled row stops being offered", async () => {
    const id = await seedLegacy("works at Acme", ["Acme"]);
    await backfillMemoryTopicsOp(ctx, [id]);

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);
    expect(sweep.topicsBackfill).toEqual([]);
    expect(await backfillMemoryTopicsOp(ctx, [id])).toEqual([]);
  });

  it("never offers a row already headed for an LLM pass", async () => {
    // Legacy links, but edited since its stamp → `pending`. Backfilling it
    // would just buy a second upload of a row the LLM pass is about to write.
    const id = await seedMemory("works at Acme");
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Acme"]);
    await markAsRestored(id, {
      topics: null,
      topics_updated_at: null,
      topics_extracted_at: 1_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
      updated_at: 9_000,
    });

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(sweep.pending.map((m) => m.uniqueId)).toEqual([id]);
    expect(sweep.topicsBackfill).toEqual([]);
  });

  it("caps the backlog under limit and drains it across sweeps", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 7; i++) ids.push(await seedLegacy(`memory ${i}`, [`Entity${i}`]));

    // Uncapped this would rewrite the whole vault in one pass, re-uploading
    // every embedding at once. Each sweep takes a bounded bite instead.
    let drained = 0;
    for (let pass = 0; pass < 4; pass++) {
      const sweep = await getMemoriesNeedingTopicExtractionOp(ctx, { limit: 2 });
      if (sweep.topicsBackfill.length === 0) break;
      expect(sweep.topicsBackfill.length).toBeLessThanOrEqual(2);
      drained += (await backfillMemoryTopicsOp(ctx, sweep.topicsBackfill)).length;
    }
    expect(drained).toBe(7);
    for (const id of ids) expect(await topicsOf(id)).not.toBeNull();
  });

  it("reports only the rows it actually wrote", async () => {
    const id = await seedLegacy("works at Acme", ["Acme"]);
    // Stubbed because the skip is unreachable today: every earlier guard leaves
    // `topics` null with entity rows present, and a null record never compares
    // equal to a computed one, so the writer always has something to write. The
    // contract ("returns the ids filled") still has to hold if that changes —
    // callers log this list as the migration's progress.
    // Now SYNCHRONOUS (#891), so a return value rather than a resolved promise.
    const prepareSpy = vi
      .spyOn(entityOps, "prepareMemoryTopicsUpdateFromRow")
      .mockReturnValue(null);
    try {
      expect(await backfillMemoryTopicsOp(ctx, [id])).toEqual([]);
    } finally {
      prepareSpy.mockRestore();
    }
    expect(await topicsOf(id)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T6 — rows a PRE-v42 restore damaged
// ---------------------------------------------------------------------------

/**
 * v42 makes `topics` the durable record the index is rebuilt from, which fixes
 * the mechanism going forward but repairs nothing on a device restored BEFORE
 * it: those rows have no record to rebuild from. Two shapes reach no bucket at
 * all and so sit outside entity-graph recall permanently (#796) — a curated row
 * whose curation is empty, and a stamped auto row at the current extraction
 * version. Both are healed here, and the healing must not touch a row whose
 * topics the user really does own.
 */
describe("pre-v42 restore damage", () => {
  /** No `topics` record and no links — the state a pre-v42 restore leaves. */
  async function seedDamaged(
    content: string,
    extra: Record<string, unknown> = {}
  ): Promise<string> {
    const id = await seedMemory(content);
    await markAsRestored(id, { topics: null, topics_updated_at: null, ...extra });
    return id;
  }

  /** A portal completion returning a fixed extraction result, injected via
   * `fetchFn` so the suite's global no-network stub stays in force. */
  function llmReturning(memories: Array<{ id: string; entities: unknown[] }>): typeof fetch {
    return vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ memories }) } }],
      }),
    }) as unknown as typeof fetch;
  }

  it("re-extracts a stamped row left with neither links nor a record", async () => {
    // Stamped at the CURRENT version and unedited, so every other check passes
    // it over: relink has no record to read, backfill no links to derive from.
    // The LLM is the only way back, and this narrow route is how it gets there.
    const id = await seedDamaged("works at Acme", {
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(sweep.pending.map((m) => m.uniqueId)).toEqual([id]);
  });

  it("leaves a healthy extracted row alone", async () => {
    // The reason the repair is scoped this tightly rather than done with a
    // TOPICS_EXTRACTION_VERSION bump: that gate is unconditional across every
    // stamped row, so it would have sent each user's whole extracted vault back
    // to the LLM to reach the handful of damaged ones.
    const id = await seedMemory("works at Acme");
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Acme"]);
    await markAsRestored(id, {
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });
    expect(await topicsOf(id)).not.toBeNull();

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(sweep.pending).toEqual([]);
    expect(sweep.linkedUnstamped).toEqual([]);
    expect(sweep.topicsToRelink).toEqual([]);
    expect(sweep.topicsBackfill).toEqual([]);
  });

  it("never re-asks about a row extraction already answered empty", async () => {
    // `[]` is a RECORD ("no topics here"), not damage, and it looks identical to
    // a damaged row from the links alone. Re-offering it would leak an LLM call
    // per quiet memory per sweep, forever — the exact thing the watermark exists
    // to prevent.
    const id = await seedDamaged("likes tea", {
      topics: "[]",
      topics_updated_at: 5_000,
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    for (let pass = 0; pass < 3; pass++) {
      const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);
      expect(sweep.pending).toEqual([]);
      expect(sweep.linkedUnstamped).toEqual([]);
      expect(sweep.topicsToRelink).toEqual([]);
      expect(sweep.topicsBackfill).toEqual([]);
    }
    expect(await topicsOf(id)).toEqual([]);
  });

  it("terminates when the repair extraction itself finds nothing", async () => {
    // The repair has to be self-limiting: an answered-empty pass writes `[]`
    // (topicsEqual never matches a null record, so the write always lands), and
    // `[]` no longer matches the repair. Without that, a memory with no entities
    // in it would be re-extracted on every sweep for the rest of its life.
    const id = await seedDamaged("likes tea", {
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    const first = await getMemoriesNeedingTopicExtractionOp(ctx);
    expect(first.pending.map((m) => m.uniqueId)).toEqual([id]);
    await extractAndLinkEntitiesForMemoriesOp(ctx, [id], {
      apiKey: "k",
      fetchFn: llmReturning([{ id, entities: [] }]),
      now: Date.now(),
    });

    expect(await topicsOf(id)).toEqual([]);
    expect((await getMemoriesNeedingTopicExtractionOp(ctx)).pending).toEqual([]);
  });

  it("leaves a row with a record but no links to the relink bucket", async () => {
    // A non-empty record with no index is repairable without the LLM, and
    // topicsToRelink claims it before the repair check is reached.
    const id = await seedMemory("works at Acme");
    await markAsRestored(id, {
      topics: JSON.stringify([{ name: "Acme", source: "auto" }]),
      topics_updated_at: 5_000,
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(sweep.topicsToRelink).toEqual([id]);
    expect(sweep.pending).toEqual([]);
  });

  it("clears a provably-empty curation and sends the row to the LLM bucket", async () => {
    // The flag says the user owns this memory's topics, but there is no record
    // to own and no link either, so it is protecting nothing while blocking
    // every repair path.
    const id = await seedDamaged("follows ZetaChain", { topics_user_managed: true });
    const updatedAtBefore = (await rowOf(id)).updatedAt.getTime();

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(sweep.pending.map((m) => m.uniqueId)).toEqual([id]);
    // The flag has to actually go, not just be ignored by the partition: the
    // extraction path checks it up front and replaceMemoryEntitiesGuardedOp
    // re-checks it inside its writer, so a still-flagged row would be selected
    // and then discarded on every sweep, forever.
    expect((await rowOf(id)).topicsUserManaged).toBe(false);
    // A repair is not a re-observation — recency must not move.
    expect((await rowOf(id)).updatedAt.getTime()).toBe(updatedAtBefore);
  });

  it("persists what the extraction found instead of losing it to the guard", async () => {
    const id = await seedDamaged("works at Acme", { topics_user_managed: true });

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);
    const run = await extractAndLinkEntitiesForMemoriesOp(
      ctx,
      sweep.pending.map((m) => m.uniqueId),
      {
        apiKey: "k",
        fetchFn: llmReturning([{ id, entities: [{ name: "Acme", kind: "organization" }] }]),
        now: Date.now(),
      }
    );

    expect(run.skippedIds).toEqual([]);
    expect(run.stampedIds).toEqual([id]);
    // Both halves landed: the device-local index and the durable record.
    expect(await linkedNamesOf(id)).toEqual(["acme"]);
    const topics = await topicsOf(id);
    expect(topicNames(topics)).toEqual(["acme"]);
    expect(topics!.map((t) => t.source)).toEqual(["auto"]);
  });

  it("leaves a curated row that still has links alone", async () => {
    const id = await seedMemory("follows ZetaChain");
    await setMemoryEntitiesOp(ctx, id, ["ZetaChain"]);
    await markAsRestored(id, { topics: null, topics_updated_at: null });

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    // Its topics are recoverable from the index, so it belongs to backfill —
    // never to the LLM, and the flag stays.
    expect(sweep.topicsBackfill).toEqual([id]);
    expect(sweep.pending).toEqual([]);
    expect((await rowOf(id)).topicsUserManaged).toBe(true);
  });

  it("leaves a curated row that has a topics record alone", async () => {
    const id = await seedMemory("follows ZetaChain");
    await markAsRestored(id, {
      topics: JSON.stringify([{ name: "ZetaChain", source: "user" }]),
      topics_updated_at: 5_000,
      topics_user_managed: true,
    });

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    // Record but no index: the post-v42 restore case, which relink repairs
    // without touching the vault row at all.
    expect(sweep.topicsToRelink).toEqual([id]);
    expect(sweep.pending).toEqual([]);
    expect((await rowOf(id)).topicsUserManaged).toBe(true);
  });

  it("declines the repair reset when a topics record exists", async () => {
    // The race the `unlessTopicsRecorded` guard closes: a real curation landing
    // between the sweep's read and its clear. Resetting then would hand the
    // user's chosen topics to the autotagger.
    const id = await seedMemory("follows ZetaChain");
    await setMemoryEntitiesOp(ctx, id, ["ZetaChain"]);

    expect(await clearMemoryTopicsOverrideOp(ctx, id, { unlessTopicsRecorded: true })).toBe(false);
    expect((await rowOf(id)).topicsUserManaged).toBe(true);

    // The user-facing reset is unaffected — resetting a curated row is its job.
    expect(await clearMemoryTopicsOverrideOp(ctx, id)).toBe(true);
    expect((await rowOf(id)).topicsUserManaged).toBe(false);
  });

  it("keeps the curation when the repair sweep runs mid-write", async () => {
    // The interleave the `unlessTopicsRecorded` guard cannot catch on its own:
    // the clear landing between a curation's flag write and its topics write.
    // While those were two writers the row spent that gap reading exactly like
    // damage — flag set, no record, no links — and the guard only looks at
    // `topics`, so it waved the reset through.
    const id = await seedDamaged("follows ZetaChain", {
      topics_user_managed: true,
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    // Run the repair sweep the first time the curation releases the write queue.
    // That is the whole window a second writer gets: with the flag and the topics
    // split across two writers it falls between them, with one writer it can only
    // land after the curation is whole. Both ops run for real.
    const realWrite = db.write.bind(db);
    let depth = 0;
    let swept = false;
    const track =
      (work: (writer: WriterInterface) => Promise<unknown>) => async (writer: WriterInterface) => {
        depth++;
        try {
          return await work(writer);
        } finally {
          depth--;
        }
      };
    const writeSpy = vi.spyOn(db, "write").mockImplementation((work, description) => {
      // A writer nested via callWriter has to reach the queue in the same tick or
      // WatermelonDB rejects it, so only top-level writers are gated.
      if (depth > 0) return realWrite(track(work), description);
      const committed = realWrite(track(work), description);
      return (async () => {
        const result = await committed;
        if (!swept) {
          swept = true;
          await getMemoriesNeedingTopicExtractionOp(ctx);
        }
        return result;
      })();
    });

    await setMemoryEntitiesOp(ctx, id, ["ZetaChain"]);
    writeSpy.mockRestore();
    expect(swept).toBe(true);

    // The user picked these topics — nothing about a concurrent repair may
    // hand them back to the autotagger.
    const row = await rowOf(id);
    expect(row.topicsUserManaged).toBe(true);
    const topics = await topicsOf(id);
    expect(topicNames(topics)).toEqual(["zetachain"]);
    expect(topics!.map((t) => t.source)).toEqual(["user"]);
    expect(row.topicsExtractedVersion).toBe(TOPICS_EXTRACTION_VERSION);
    expect((await getMemoriesNeedingTopicExtractionOp(ctx)).pending).toEqual([]);
  });

  it("finishes the sweep when one repair clear fails", async () => {
    // The clear loop sits before the return, so an unguarded write failure threw
    // out of the whole sweep: the worker got no pending, no relink and no
    // backfill list either, over one row it could have skipped.
    const damagedA = await seedDamaged("memory a", { topics_user_managed: true });
    const damagedB = await seedDamaged("memory b", { topics_user_managed: true });
    const toRelink = await seedMemory("works at Acme");
    await markAsRestored(toRelink, {
      topics: JSON.stringify([{ name: "Acme", source: "auto" }]),
      topics_updated_at: 5_000,
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    const realWrite = db.write.bind(db);
    let failed = false;
    const writeSpy = vi.spyOn(db, "write").mockImplementation((work, description) => {
      if (failed) return realWrite(work, description);
      failed = true;
      return Promise.reject(new Error("disk full"));
    });

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);
    writeSpy.mockRestore();

    expect(failed).toBe(true);
    expect(sweep.topicsToRelink).toEqual([toRelink]);
    expect(sweep.pending.map((m) => m.uniqueId).sort()).toEqual([damagedA, damagedB].sort());
    // Only the row whose write failed keeps its stale flag, and the next sweep
    // picks it up again — the clear is idempotent.
    const stillFlagged: string[] = [];
    for (const id of [damagedA, damagedB]) {
      if ((await rowOf(id)).topicsUserManaged) stillFlagged.push(id);
    }
    expect(stillFlagged).toHaveLength(1);

    await getMemoriesNeedingTopicExtractionOp(ctx);
    expect((await rowOf(stillFlagged[0]!)).topicsUserManaged).toBe(false);
  });

  it("caps the repair under limit and drains it across sweeps", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(await seedDamaged(`memory ${i}`, { topics_user_managed: true }));
    }

    // Each clear loads a Model and dirties the row, so the backlog has to be
    // paced like every other bucket rather than repaired in one spike.
    const first = await getMemoriesNeedingTopicExtractionOp(ctx, { limit: 2 });
    expect(first.pending).toHaveLength(2);
    let cleared = 0;
    for (const id of ids) if (!(await rowOf(id)).topicsUserManaged) cleared++;
    expect(cleared).toBe(2);

    for (let pass = 0; pass < 4; pass++) {
      await getMemoriesNeedingTopicExtractionOp(ctx, { limit: 2 });
    }
    for (const id of ids) expect((await rowOf(id)).topicsUserManaged).toBe(false);
  });
});
