// @vitest-environment node
import { createRequire } from "node:module";

import { type Collection, Database, type Model } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Entity, MemoryEntity } from "../entities/models";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import type { VaultMemory } from "./models";
import {
  getDecayCandidatesRawOp,
  getMemoriesNeedingTopicExtractionOp,
  TOPICS_EXTRACTION_VERSION,
  type VaultMemoryOperationsContext,
} from "./operations";

type SqlValue = string | number | null;
type SqliteDb = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...values: SqlValue[]): Record<string, unknown>[];
    run(...values: SqlValue[]): unknown;
  };
  close(): void;
};

const requireNode = createRequire(import.meta.url);
const { DatabaseSync } = requireNode("node:sqlite") as {
  DatabaseSync: new (path: string) => SqliteDb;
};
const { encodeSchema } = requireNode("@nozbe/watermelondb/adapters/sqlite/encodeSchema") as {
  encodeSchema(schema: typeof sdkSchema): string;
};
const { default: encodeQuery } = requireNode("@nozbe/watermelondb/adapters/sqlite/encodeQuery") as {
  default(query: unknown): [string, SqlValue[]];
};

const USER = "owner's vault";
const EMBEDDING = JSON.stringify(Array.from({ length: 4096 }, () => 0.125));
let sqlite: SqliteDb;
let ctx: VaultMemoryOperationsContext;
let reads: Array<{ sql: string; rows: Record<string, unknown>[] }>;

function routeToSqlite<T extends Model>(collection: Collection<T>, track = false): void {
  const query = collection.query.bind(collection);
  vi.spyOn(collection, "query").mockImplementation((...clauses) => {
    const result = query(...clauses);
    vi.spyOn(result, "unsafeFetchRaw").mockImplementation(() => {
      const [sql, args] = encodeQuery(result.serialize());
      const rows = sqlite.prepare(sql).all(...args);
      if (track) reads.push({ sql, rows });
      return Promise.resolve(rows);
    });
    return result;
  });
}

function insert(table: string, row: Record<string, SqlValue>): void {
  const columns = Object.keys(row);
  sqlite
    .prepare(
      `insert into "${table}" (${columns.map((c) => `"${c}"`).join(",")}) values (${columns.map(() => "?").join(",")})`
    )
    .run(...Object.values(row));
}

function seed(id: string, overrides: Record<string, SqlValue> = {}): void {
  insert("memory_vault", {
    id,
    _status: "synced",
    content: `content of ${id}`,
    kind_value: "private profile value",
    embedding: EMBEDDING,
    scope: "private",
    user_id: USER,
    is_deleted: 0,
    created_at: 1000,
    updated_at: 2000,
    ...overrides,
  });
}

function seedExcludedRows(): void {
  seed("foreign", { user_id: "other" });
  seed("deleted", { is_deleted: 1 });
  seed("sync_deleted", { _status: "deleted" });
  seed("superseded", { superseded_by: "successor" });
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(encodeSchema(sdkSchema));
  reads = [];
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `sweep-projection-${Math.random().toString(36).slice(2)}`,
    }),
    modelClasses: sdkModelClasses,
  });
  const vaultMemoryCollection = database.get<VaultMemory>("memory_vault");
  const entityCollection = database.get<Entity>("entity");
  const memoryEntityCollection = database.get<MemoryEntity>("memory_entity");
  routeToSqlite(vaultMemoryCollection, true);
  routeToSqlite(entityCollection);
  routeToSqlite(memoryEntityCollection);
  ctx = {
    database,
    vaultMemoryCollection,
    userId: USER,
    entityCtx: { database, entityCollection, memoryEntityCollection, userId: USER },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  sqlite.close();
});

describe("vault sweep projections", () => {
  it("reads only decay fields and keeps the decay scope", async () => {
    seed("active", {
      fact_type: "plan",
      event_time_end: 4000,
      event_time_kind: "range",
      last_observed_at: 3000,
      source: "auto-extracted",
      trust_tier: "trusted",
    });
    seed("archived", { archived_at: 500 });
    seed("quarantined", { trust_tier: "quarantined" });
    seed("profile", { kind: "occupation" });
    seedExcludedRows();

    const candidates = await getDecayCandidatesRawOp(ctx);

    expect(candidates.map((c) => c.uniqueId).sort()).toEqual(["active", "archived", "quarantined"]);
    expect(candidates.find((c) => c.uniqueId === "active")).toEqual({
      uniqueId: "active",
      factType: "plan",
      eventTimeEnd: 4000,
      eventTimeKind: "range",
      updatedAt: 2000,
      lastObservedAt: 3000,
      archivedAt: null,
      source: "auto-extracted",
      trustTier: "trusted",
    });
    expect(reads).toHaveLength(1);
    expect(Object.keys(reads[0].rows[0]).sort()).toEqual(
      [
        "id",
        "fact_type",
        "event_time_end",
        "event_time_kind",
        "updated_at",
        "last_observed_at",
        "archived_at",
        "source",
        "trust_tier",
      ].sort()
    );
  });

  it("keeps the explicit single-tenant decay scope", async () => {
    seed("local", { user_id: null });
    const { userId: _userId, ...singleTenantCtx } = ctx;

    expect(await getDecayCandidatesRawOp({ ...singleTenantCtx, singleTenant: true })).toEqual([
      expect.objectContaining({ uniqueId: "local" }),
    ]);
    expect(reads[0].rows[0]).not.toHaveProperty("content");
    expect(reads[0].rows[0]).not.toHaveProperty("embedding");
  });

  it("loads content only for capped pending rows and preserves their priority", async () => {
    seed("a_stale_version", { topics_extracted_at: 3000, created_at: 100 });
    seed("z_edited", {
      topics_extracted_at: 1500,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
      created_at: 200,
    });
    seed("new", { created_at: 500 });
    seed("curated", { topics: "[]", topics_user_managed: 1 });
    seed("relink", { topics: '[{"name":"travel","source":"auto"}]' });
    seed("legacy");
    insert("entity", { id: "entity", _status: "synced", canonical_name: "travel" });
    insert("memory_entity", {
      id: "link",
      _status: "synced",
      memory_id: "legacy",
      entity_id: "entity",
      user_id: USER,
    });
    seed("archived", { archived_at: 500 });
    seed("quarantined", { trust_tier: "quarantined" });
    seedExcludedRows();

    const result = await getMemoriesNeedingTopicExtractionOp(ctx, { limit: 2 });

    expect(result.pending.map((m) => [m.uniqueId, m.content])).toEqual([
      ["z_edited", "content of z_edited"],
      ["a_stale_version", "content of a_stale_version"],
    ]);
    expect(result.linkedUnstamped).toEqual(["legacy"]);
    expect(result.topicsToRelink).toEqual(["relink"]);
    expect(result.topicsBackfill).toEqual(["legacy"]);
    expect(reads).toHaveLength(2);
    expect(Object.keys(reads[0].rows[0]).sort()).toEqual(
      [
        "id",
        "topics",
        "topics_user_managed",
        "topics_extracted_at",
        "topics_extracted_version",
        "updated_at",
      ].sort()
    );
    for (const row of reads[0].rows) {
      expect(row).not.toHaveProperty("content");
      expect(row).not.toHaveProperty("embedding");
      expect(row).not.toHaveProperty("kind_value");
    }
    expect(reads[1].rows.map((r) => r.id).sort()).toEqual(["a_stale_version", "z_edited"]);
  });

  it("does not load content when no row needs topic extraction", async () => {
    seed("current", {
      topics: "[]",
      topics_extracted_at: 3000,
      topics_extracted_version: TOPICS_EXTRACTION_VERSION,
    });

    expect(await getMemoriesNeedingTopicExtractionOp(ctx, { limit: 2 })).toEqual({
      pending: [],
      linkedUnstamped: [],
      topicsToRelink: [],
      topicsBackfill: [],
    });
    expect(reads).toHaveLength(1);
    expect(reads[0].rows[0]).not.toHaveProperty("content");
    expect(reads[0].rows[0]).not.toHaveProperty("embedding");
  });

  it("loads an uncapped topic backlog in bounded batches", async () => {
    for (let i = 0; i < 501; i++) seed(`pending_${i}`, { created_at: i });

    const result = await getMemoriesNeedingTopicExtractionOp(ctx);

    expect(result.pending).toHaveLength(501);
    expect(result.pending[0].uniqueId).toBe("pending_500");
    expect(result.pending[500].uniqueId).toBe("pending_0");
    expect(reads.map((read) => read.rows.length)).toEqual([501, 500, 1]);
    expect(reads[0].rows[0]).not.toHaveProperty("content");
    expect(reads[0].rows[0]).not.toHaveProperty("embedding");
  });
});
