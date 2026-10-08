// @vitest-environment happy-dom
import { Database, Model, Q } from "@nozbe/watermelondb";
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
let tickWatch: TickWatch;

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
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("no network call expected in a topics-sync path");
    })
  );
  tickWatch = watchPrepareBatchTicks();
});

afterEach(() => {
  tickWatch.restore();
  vi.unstubAllGlobals();
  expect(tickWatch.violations).toEqual([]);
});

async function seedMemory(content: string): Promise<string> {
  const created = await createVaultMemoryOp(ctx, { content });
  return created.uniqueId;
}

async function rowOf(memoryId: string): Promise<VaultMemory> {
  return ctx.vaultMemoryCollection.find(memoryId);
}

async function topicsOf(memoryId: string): Promise<StoredTopic[] | null> {
  return parseTopics((await rowOf(memoryId)).topics);
}

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

function topicNames(topics: StoredTopic[] | null): string[] {
  return (topics ?? []).map((t) => t.name.toLowerCase()).sort();
}

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

async function seedLegacy(content: string, names: string[]): Promise<string> {
  const id = await seedMemory(content);
  await replaceMemoryEntitiesGuardedOp(entityCtx, id, names);
  await markAsRestored(id, {
    topics: null,
    topics_updated_at: null,
    topics_extracted_at: Date.now() + 10_000,
    topics_extracted_version: TOPICS_EXTRACTION_VERSION,
  });
  return id;
}

type TickWatch = { violations: string[]; batches: number; restore: () => void };

function watchPrepareBatchTicks(): TickWatch {
  const violations: string[] = [];
  let epoch = 0;
  const preparedAt = new Map<Model, number>();

  const realPrepare = Model.prototype.prepareUpdate;
  const prepareSpy = vi.spyOn(Model.prototype, "prepareUpdate").mockImplementation(function (
    this: Model,
    updater?: (record: never) => void
  ) {
    const out = realPrepare.call(this, updater as (record: Model) => void);
    preparedAt.set(this, epoch);
    queueMicrotask(() => void epoch++);
    return out;
  });

  type BatchArg = Model | Model[] | null | void | false;
  let batches = 0;
  const realBatch = db.batch.bind(db);
  const batchSpy = vi.spyOn(db, "batch").mockImplementation(async (...args: BatchArg[]) => {
    batches++;
    for (const record of args.flat()) {
      if (!record || !preparedAt.has(record)) continue;
      if (preparedAt.get(record) !== epoch) violations.push(record.id);
      preparedAt.delete(record);
    }
    return realBatch(...args);
  });

  return {
    violations,
    get batches() {
      return batches;
    },
    restore: () => {
      prepareSpy.mockRestore();
      batchSpy.mockRestore();
    },
  };
}

describe("schema v42", () => {
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
    expect(sdkMigrations.maxVersion).toBeGreaterThanOrEqual(42);
    expect(sdkMigrations.minVersion).toBeLessThan(41);
  });
});

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

    let clock = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => ++clock);
    try {
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

    expect(await topicsOf(id)).toEqual([]);
    expect(await linkedNamesOf(id)).toEqual([]);
  });

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

    let clock = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => ++clock);
    try {
      for (const writer of writers) {
        const id = await seedMemory(`drift ${writer.name}`);
        await linkMemoryEntitiesOp(entityCtx, id, ["Preexisting"]);
        const stampBefore = (await rowOf(id)).topicsUpdatedAt;
        const updatedAtBefore = (await rowOf(id)).updatedAt.getTime();
        await writer.run(id);
        expect(topicNames(await topicsOf(id)), `${writer.name} desynchronized topics`).toEqual(
          await linkedNamesOf(id)
        );
        expect(
          (await rowOf(id)).topicsUpdatedAt,
          `${writer.name} skipped the topics write`
        ).not.toBe(stampBefore);
        expect((await rowOf(id)).updatedAt.getTime(), `${writer.name} bumped updated_at`).toBe(
          updatedAtBefore
        );
      }
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("DRIFT: relink is the ONLY path that skips the topics write", async () => {
    const id = await seedMemory("works at Acme");
    await markAsRestored(id, {
      topics: JSON.stringify([{ name: "Acme", source: "auto" }]),
      topics_updated_at: 5_000,
    });

    await relinkMemoryTopicsOp(ctx, [id]);

    expect(await linkedNamesOf(id)).toEqual(["acme"]);
    expect((await rowOf(id)).topicsUpdatedAt).toBe(5_000);
  });

  it("DRIFT: the entity-ops export surface is unchanged", () => {
    const writesLinksAndTopics = [
      "linkMemoryEntitiesOp",
      "replaceMemoryEntitiesGuardedOp",
      "resolveMemoryTopicsWrite",
      "prepareMemoryTopicsUpdate",
    ];
    const exempt = [
      "relinkMemoryEntitiesFromTopicsOp",
      "unlinkMemoryEntitiesOp",
      "unlinkAllMemoryEntitiesForUserOp",
      "backfillMemoryEntityUserIdsOp",
    ];
    const readers = ["getMemoriesByEntityNamesOp", "getEntitiesByMemoryIdsOp"];

    expect(Object.keys(entityOps).sort()).toEqual(
      [...writesLinksAndTopics, ...exempt, ...readers].sort()
    );
  });
});

describe("getMemoriesNeedingTopicExtractionOp — the curated gate survived the filter move", () => {
  it("keeps a curated, deliberately topicless row out of pending", async () => {
    const id = await seedMemory("follows ZetaChain");
    await markAsRestored(id, {
      topics: "[]",
      topics_updated_at: 5_000,
      topics_user_managed: true,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped).toEqual([]);
    expect(result.topicsToRelink).toEqual([]);
    expect((await rowOf(id)).topicsUserManaged).toBe(true);
  });

  it("keeps a curated LINKED-UNSTAMPED row out of linkedUnstamped", async () => {
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
    expect(await linkCountOf(id)).toBe(1);

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(sweep.linkedUnstamped).toEqual([]);
    expect(sweep.pending.map((m) => m.uniqueId)).toEqual([id]);
    expect(sweep.topicsToRelink).toEqual([]);
  });

  it("keeps the row out of a backfill that could never fill it", async () => {
    const id = await seedDanglingLinks("works at Acme", ["Acme"]);

    expect((await getMemoriesNeedingTopicExtractionOp(ctx)).topicsBackfill).toEqual([]);

    expect(await backfillMemoryTopicsOp(ctx, [id])).toEqual([]);
    expect(await topicsOf(id)).toBeNull();
  });
});

describe("getMemoriesNeedingTopicExtractionOp — topicsToRelink", () => {
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
    await markAsRestored(id, {
      topics: JSON.stringify([{ name: "Acme", source: "auto" }]),
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.topicsToRelink).toEqual([id]);
  });

  it("routes an EMPTY record with stale links to topicsToRelink, which clears them", async () => {
    const id = await seedMemory("likes tea");
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Tea"]);
    await markAsRestored(id, {
      topics: "[]",
      topics_updated_at: 5_000,
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.topicsToRelink).toEqual([id]);
    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped).toEqual([]);
    expect(result.topicsBackfill).toEqual([]);

    await relinkMemoryTopicsOp(ctx, result.topicsToRelink);
    expect(await linkedNamesOf(id)).toEqual([]);
    const next = await getMemoriesNeedingTopicExtractionOp(ctx);
    expect(next.topicsToRelink).toEqual([]);
    expect(next.pending).toEqual([]);
  });

  it("routes a CURATED empty record with stale links too, flag intact", async () => {
    const id = await seedMemory("follows ZetaChain");
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["ZetaChain"]);
    await markAsRestored(id, {
      topics: "[]",
      topics_updated_at: 5_000,
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
      topics_user_managed: true,
    });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.topicsToRelink).toEqual([id]);
    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped).toEqual([]);

    await relinkMemoryTopicsOp(ctx, result.topicsToRelink);

    expect(await linkedNamesOf(id)).toEqual([]);
    expect((await rowOf(id)).topicsUserManaged).toBe(true);
  });

  it("leaves an EMPTY record with NO links in no bucket", async () => {
    await seedRestored("likes tea", []);

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.pending).toEqual([]);
    expect(result.linkedUnstamped).toEqual([]);
    expect(result.topicsToRelink).toEqual([]);
    expect(result.topicsBackfill).toEqual([]);
  });

  it("caps topicsToRelink under limit", async () => {
    for (let i = 0; i < 5; i++) {
      await seedRestored(`memory ${i}`, [{ name: `Entity${i}`, source: "auto" }]);
    }

    const result = await getMemoriesNeedingTopicExtractionOp(ctx, { limit: 2 });

    expect(result.topicsToRelink).toHaveLength(2);
  });
});

describe("relinkMemoryTopicsOp", () => {
  it("rebuilds the entity + link set the origin device had", async () => {
    const origin = await seedMemory("works at Acme with Sara");
    await replaceMemoryEntitiesGuardedOp(entityCtx, origin, [
      { name: "Acme", kind: "organization" },
      { name: "Sara", kind: "person" },
    ]);
    const originNames = await linkedNamesOf(origin);
    const record = await topicsOf(origin);

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
    const topicsBefore = before.topics;

    await relinkMemoryTopicsOp(ctx, [id]);

    const after = await rowOf(id);
    expect(after.topicsUpdatedAt).toBe(5_000);
    expect(after.updatedAt.getTime()).toBe(updatedAtBefore);
    expect(after.topics).toBe(topicsBefore);
    expect((after._raw as Record<string, unknown>)._status).toBe("synced");
  });

  it("clears stale links off an empty record without dirtying the vault row", async () => {
    const id = await seedMemory("works at Acme");
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Acme"]);
    await markAsRestored(id, {
      topics: "[]",
      topics_updated_at: 5_000,
    });
    const updatedAtBefore = (await rowOf(id)).updatedAt.getTime();

    expect(await relinkMemoryTopicsOp(ctx, [id])).toEqual([id]);

    expect(await linkedNamesOf(id)).toEqual([]);
    expect(await topicsOf(id)).toEqual([]);
    expect((await rowOf(id)).topicsUpdatedAt).toBe(5_000);
    expect((await rowOf(id)).updatedAt.getTime()).toBe(updatedAtBefore);
    expect(((await rowOf(id))._raw as Record<string, unknown>)._status).toBe("synced");
  });

  it("preserves a topic added before the repair acquires the writer", async () => {
    const id = await seedMemory("works at Acme");
    await markAsRestored(id, { topics: "[]", topics_updated_at: 5_000 });
    const realWrite = db.write.bind(db);
    const writeSpy = vi.spyOn(db, "write").mockImplementationOnce(async (work, description) => {
      await setMemoryEntitiesOp(ctx, id, ["Acme"]);
      return realWrite(work, description);
    });

    try {
      expect(await relinkMemoryTopicsOp(ctx, [id])).toEqual([id]);
    } finally {
      writeSpy.mockRestore();
    }

    expect(await linkedNamesOf(id)).toEqual(["acme"]);
    expect(topicNames(await topicsOf(id))).toEqual(["acme"]);
    expect((await rowOf(id)).topicsUserManaged).toBe(true);
  });

  it("skips a row with no record, and an empty record with no links writes nothing", async () => {
    const noRecord = await seedMemory("no topics record");
    const emptyRecord = await seedMemory("deliberately topicless");
    await markAsRestored(emptyRecord, { topics: "[]", topics_updated_at: 5_000 });

    expect(await relinkMemoryTopicsOp(ctx, [noRecord, emptyRecord])).toEqual([emptyRecord]);
    expect(await linkedNamesOf(noRecord)).toEqual([]);
    expect(await linkedNamesOf(emptyRecord)).toEqual([]);
    expect((await rowOf(emptyRecord)).topicsUpdatedAt).toBe(5_000);
    expect(((await rowOf(emptyRecord))._raw as Record<string, unknown>)._status).toBe("synced");
  });
});

describe("topics backfill", () => {
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
    const resolveSpy = vi.spyOn(entityOps, "resolveMemoryTopicsWrite").mockResolvedValue(null);
    try {
      expect(await backfillMemoryTopicsOp(ctx, [id])).toEqual([]);
    } finally {
      resolveSpy.mockRestore();
    }
    expect(await topicsOf(id)).toBeNull();
  });
});

describe("pre-v42 restore damage", () => {
  async function seedDamaged(
    content: string,
    extra: Record<string, unknown> = {}
  ): Promise<string> {
    const id = await seedMemory(content);
    await markAsRestored(id, { topics: null, topics_updated_at: null, ...extra });
    return id;
  }

  function llmReturning(memories: Array<{ id: string; entities: unknown[] }>): typeof fetch {
    return vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ memories }) } }],
      }),
    }) as unknown as typeof fetch;
  }

  it("re-extracts a stamped row left with neither links nor a record", async () => {
    const id = await seedDamaged("works at Acme", {
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(sweep.pending.map((m) => m.uniqueId)).toEqual([id]);
  });

  it("leaves a healthy extracted row alone", async () => {
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
    const id = await seedDamaged("follows ZetaChain", { topics_user_managed: true });
    const updatedAtBefore = (await rowOf(id)).updatedAt.getTime();

    const sweep = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(sweep.pending.map((m) => m.uniqueId)).toEqual([id]);
    expect((await rowOf(id)).topicsUserManaged).toBe(false);
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

    expect(sweep.topicsToRelink).toEqual([id]);
    expect(sweep.pending).toEqual([]);
    expect((await rowOf(id)).topicsUserManaged).toBe(true);
  });

  it("declines the repair reset when a topics record exists", async () => {
    const id = await seedMemory("follows ZetaChain");
    await setMemoryEntitiesOp(ctx, id, ["ZetaChain"]);

    expect(await clearMemoryTopicsOverrideOp(ctx, id, { unlessTopicsRecorded: true })).toBe(false);
    expect((await rowOf(id)).topicsUserManaged).toBe(true);

    expect(await clearMemoryTopicsOverrideOp(ctx, id)).toBe(true);
    expect((await rowOf(id)).topicsUserManaged).toBe(false);
  });

  it("keeps the curation when the repair sweep runs mid-write", async () => {
    const id = await seedDamaged("follows ZetaChain", {
      topics_user_managed: true,
      topics_extracted_at: Date.now() + 10_000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

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

    const row = await rowOf(id);
    expect(row.topicsUserManaged).toBe(true);
    const topics = await topicsOf(id);
    expect(topicNames(topics)).toEqual(["zetachain"]);
    expect(topics!.map((t) => t.source)).toEqual(["user"]);
    expect(row.topicsExtractedVersion).toBe(TOPICS_EXTRACTION_VERSION);
    expect((await getMemoriesNeedingTopicExtractionOp(ctx)).pending).toEqual([]);
  });

  it("finishes the sweep when one repair clear fails", async () => {
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

describe("prepareUpdate is batched in the tick it was prepared (sdk#891)", () => {
  it("backfills a multi-row vault without a single late batch", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) ids.push(await seedLegacy(`memory ${i}`, [`Entity${i}`]));

    const batchesBefore = tickWatch.batches;
    expect(await backfillMemoryTopicsOp(ctx, ids)).toEqual(ids);

    expect(tickWatch.batches - batchesBefore).toBe(1);
    for (const id of ids) expect(await topicsOf(id)).not.toBeNull();
  });

  it("relinks a restored row whose entity kind needs back-filling", async () => {
    const id = await seedMemory("works at Acme");
    await db.write(async () => {
      await entityCtx.entityCollection.create((r) => {
        r._setRaw("canonical_name", "acme");
        r._setRaw("kind", null);
      });
    });
    await markAsRestored(id, {
      topics: JSON.stringify([{ name: "Acme", kind: "org", source: "auto" }]),
    });

    expect(await relinkMemoryTopicsOp(ctx, [id])).toEqual([id]);

    expect(await linkedNamesOf(id)).toEqual(["acme"]);
    const entity = await entityCtx.entityCollection
      .query(Q.where("canonical_name", "acme"))
      .fetch();
    expect(entity[0]?.kind).toBe("org");
  });

  it("prunes stale links on a user topic edit in one tick", async () => {
    const id = await seedMemory("lives in Tokyo and Paris");
    await replaceMemoryEntitiesGuardedOp(entityCtx, id, ["Tokyo", "Paris"]);

    await setMemoryEntitiesOp(ctx, id, ["Tokyo"]);

    expect(await linkedNamesOf(id)).toEqual(["tokyo"]);
    expect(topicNames(await topicsOf(id))).toEqual(["tokyo"]);
  });

  it("batches the kind back-fill even when the user-managed guard skips the links", async () => {
    const id = await seedMemory("works at Acme");
    await markAsRestored(id, { topics_user_managed: true });
    await db.write(async () => {
      await entityCtx.entityCollection.create((r) => {
        r._setRaw("canonical_name", "acme");
        r._setRaw("kind", null);
      });
    });

    const linked = await linkMemoryEntitiesOp(
      entityCtx,
      id,
      [{ name: "Acme", kind: "organization" }],
      { unlessTopicsUserManaged: true }
    );

    expect(linked).toEqual([]);
    expect(await linkedNamesOf(id)).toEqual([]);
    const entity = await entityCtx.entityCollection
      .query(Q.where("canonical_name", "acme"))
      .fetch();
    expect(entity[0]?.kind).toBe("organization");
  });
});
