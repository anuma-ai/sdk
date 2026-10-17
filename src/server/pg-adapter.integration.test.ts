import { randomUUID } from "node:crypto";

import { appSchema, Database, tableSchema } from "@nozbe/watermelondb";
import type { SerializedQuery } from "@nozbe/watermelondb/Query";
import type { RawRecord } from "@nozbe/watermelondb/RawRecord";
import type { SchemaMigrations } from "@nozbe/watermelondb/Schema/migrations";
import {
  addColumns,
  createTable,
  schemaMigrations,
  unsafeExecuteSql,
} from "@nozbe/watermelondb/Schema/migrations";
import { toPromise } from "@nozbe/watermelondb/utils/fp/Result";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { VaultMemory } from "../lib/db/memoryVault/models";
import {
  countActiveVaultMemoriesOp,
  createVaultMemoryOp,
  getAllVaultMemoriesOp,
  getVaultMemoriesByIdsOp,
} from "../lib/db/memoryVault/operations";
import { sdkModelClasses, sdkSchema } from "../lib/db/schema";
import type { PgClientLike, PgPoolLike } from "./pg-adapter";
import { PostgreSQLAdapter } from "./pg-adapter";

const databaseUrl = process.env.PG_TEST_DATABASE_URL;
const runIntegration = process.env.INTEGRATION === "1" || Boolean(databaseUrl);
const integrationDbName = `integration-test-${randomUUID()}`;

type Container = {
  getConnectionUri: () => string;
  stop: () => Promise<unknown>;
};

const testSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "tasks",
      columns: [
        { name: "title", type: "string" },
        { name: "is_done", type: "boolean" },
        { name: "priority", type: "number", isOptional: true },
        { name: "created_at", type: "number", isIndexed: true },
      ],
    }),
  ],
});

function tasksQuery(sql?: string): SerializedQuery {
  return {
    table: "tasks",
    description: {
      where: [],
      joinTables: [],
      nestedJoinTables: [],
      sortBy: [],
      ...(sql ? { sql: { type: "sqlQuery", sql, values: [] } } : {}),
    },
    associations: [],
  };
}

function rawRecord(record: RawRecord & Record<string, unknown>): RawRecord {
  return record;
}

function task(id: string, title: string) {
  return {
    id,
    _status: "created" as const,
    _changed: "",
    title,
    is_done: false,
    priority: null,
    created_at: 1,
  };
}

describe.skipIf(!runIntegration)("PostgreSQLAdapter (integration)", () => {
  let container: Container | undefined;
  let pool: Pool;
  let adapterPool: PgPoolLike;
  let adapter: PostgreSQLAdapter;
  const schemas = new Set<string>();

  function createAdapter(
    dbName: string,
    schema = testSchema,
    migrations?: SchemaMigrations,
    pgSchema?: string,
    migrateLegacySchema = false
  ) {
    return new PostgreSQLAdapter({
      pool: adapterPool,
      schema,
      migrations,
      dbName,
      pgSchema,
      migrateLegacySchema,
    });
  }

  async function seedLegacyDatabase(pgSchema = "public") {
    const qualify = (table: string) => `"${pgSchema}"."${table}"`;
    const { rows } = await pool.query<{ storage: string | null }>(
      "select to_regclass($1) as storage",
      [qualify("local_storage")]
    );
    expect(rows[0].storage).toBeNull();
    if (pgSchema !== "public") {
      await adapterPool.query(`create schema if not exists "${pgSchema}"`);
    }
    await pool.query(`create table ${qualify("tasks")} (
      "id" text primary key,
      "_status" text not null default 'created',
      "_changed" text not null default '',
      "title" text not null default '',
      "is_done" boolean not null default false,
      "priority" double precision default null,
      "created_at" double precision not null default 0
    )`);
    const index = pgSchema === "public" ? "tasks_created_at" : `${pgSchema}_tasks_created_at`;
    await pool.query(`create index "${index}" on ${qualify("tasks")} ("created_at")`);
    await pool.query(
      `create table ${qualify("local_storage")} ("key" text primary key, "value" text not null)`
    );
    const record = task("legacy-task", "Saved task");
    await pool.query(
      `insert into ${qualify("tasks")} ("id", "_status", "_changed", "title", "is_done", "priority", "created_at") values ($1, $2, $3, $4, $5, $6, $7)`,
      Object.values(record)
    );
    await pool.query(
      `insert into ${qualify("local_storage")} ("key", "value") values ($1, $2), ($3, $4)`,
      ["__schema_version", "1", "token", "legacy-token"]
    );
    return record;
  }

  beforeAll(async () => {
    const pgModule = await import("pg");
    const pg = pgModule.default;

    let connectionString = databaseUrl;
    if (!connectionString) {
      const { PostgreSqlContainer } = await import("@testcontainers/postgresql");
      container = await new PostgreSqlContainer("postgres:16-alpine").start();
      connectionString = container.getConnectionUri();
    }
    pool = new pg.Pool({ connectionString });
    adapterPool = {
      query(text, values) {
        const schema = text.match(/^create schema if not exists "([^"]+)"/i)?.[1];
        if (schema) schemas.add(schema);
        return pool.query(text, values);
      },
      connect: () => pool.connect(),
    };

    adapter = createAdapter(integrationDbName);
    await toPromise((cb) => adapter.getLocal("__noop__", cb));
  }, 120_000);

  afterAll(async () => {
    if (pool) {
      for (const schema of schemas) {
        await pool.query(`drop schema if exists "${schema}" cascade`);
      }
      await pool.end();
    }
    if (container) await container.stop();
  }, 60_000);

  it.each([undefined, "public", `legacy_${randomUUID().replaceAll("-", "")}`])(
    "requires an explicit upgrade and preserves legacy data with pgSchema %s",
    async (pgSchema) => {
      const legacySchema = pgSchema ?? "public";
      const record = await seedLegacyDatabase(legacySchema);
      const dbName = `${integrationDbName}-legacy-${pgSchema ?? "default"}`;
      try {
        const blocked = createAdapter(dbName, testSchema, undefined, pgSchema);
        await expect(toPromise((cb) => blocked.getLocal("token", cb))).rejects.toThrow(
          "migrateLegacySchema"
        );
        const upgraded = createAdapter(dbName, testSchema, undefined, pgSchema, true);
        expect(await toPromise((cb) => upgraded.find("tasks", record.id, cb))).toEqual(record);
        expect(await toPromise((cb) => upgraded.getLocal("token", cb))).toBe("legacy-token");
        expect(await toPromise((cb) => upgraded.getLocal("__schema_version", cb))).toBe("1");
        const reopened = createAdapter(dbName, testSchema, undefined, pgSchema);
        expect(await toPromise((cb) => reopened.find("tasks", record.id, cb))).toEqual(record);
        expect(await toPromise((cb) => reopened.getLocal("token", cb))).toBe("legacy-token");
        const other = createAdapter(`${dbName}-other`, testSchema, undefined, pgSchema);
        expect(await toPromise((cb) => other.count(tasksQuery(), cb))).toBe(0);
        expect(await toPromise((cb) => other.getLocal("token", cb))).toBeUndefined();
        await toPromise((cb) => other.unsafeResetDatabase(cb));
        expect(await toPromise((cb) => upgraded.find("tasks", record.id, cb))).toEqual(record);
      } finally {
        await pool.query(
          `drop table if exists "${legacySchema}"."tasks", "${legacySchema}"."local_storage" cascade`
        );
      }
    }
  );

  it("rolls back a failed legacy upgrade and applies migrations after a retry", async () => {
    const pgSchema = `legacy_${randomUUID().replaceAll("-", "")}`;
    const record = await seedLegacyDatabase(pgSchema);
    const dbName = `${integrationDbName}-legacy-retry`;
    await pool.query(`create table "${pgSchema}"."unrelated" ("id" text)`);
    const queryOnly = new PostgreSQLAdapter({
      pool: { query: (text, values) => adapterPool.query(text, values) },
      schema: testSchema,
      dbName,
      pgSchema,
      migrateLegacySchema: true,
    });
    await expect(toPromise((cb) => queryOnly.getLocal("token", cb))).rejects.toThrow(
      "legacy migration requires pool.connect"
    );
    const failed = new PostgreSQLAdapter({
      pool: {
        query: (text, values) => adapterPool.query(text, values),
        async connect() {
          const client = await pool.connect();
          let moves = 0;
          return {
            async query(text, values) {
              if (text.startsWith("alter table") && ++moves === 2) {
                await client.query("SELECT 1 / 0");
              }
              return client.query(text, values);
            },
            release: () => client.release(),
          };
        },
      },
      schema: testSchema,
      dbName,
      pgSchema,
      migrateLegacySchema: true,
    });
    await expect(toPromise((cb) => failed.getLocal("token", cb))).rejects.toMatchObject({
      code: "22012",
    });
    expect((await pool.query(`select * from "${pgSchema}"."tasks"`)).rows).toEqual([record]);
    expect(
      (
        await pool.query(`select "value" from "${pgSchema}"."local_storage" where "key" = $1`, [
          "token",
        ])
      ).rows
    ).toEqual([{ value: "legacy-token" }]);
    const noteColumn = { name: "note", type: "string" as const };
    const nextSchema = appSchema({
      version: 2,
      tables: [
        tableSchema({
          name: "tasks",
          columns: [...testSchema.tables.tasks.columnArray, noteColumn],
        }),
      ],
    });
    const migrations = schemaMigrations({
      migrations: [
        { toVersion: 2, steps: [addColumns({ table: "tasks", columns: [noteColumn] })] },
      ],
    });
    const upgrades = [
      createAdapter(dbName, nextSchema, migrations, pgSchema, true),
      createAdapter(dbName, testSchema, undefined, pgSchema, true),
    ];
    await Promise.all(upgrades.map((upgrade) => toPromise((cb) => upgrade.getLocal("token", cb))));
    expect(await toPromise((cb) => upgrades[0].find("tasks", record.id, cb))).toEqual({
      ...record,
      note: "",
    });
    expect(await toPromise((cb) => upgrades[0].getLocal("__schema_version", cb))).toBe("2");
    expect(await toPromise((cb) => upgrades[0].getLocal("token", cb))).toBe("legacy-token");
    expect(
      (await pool.query("select to_regclass($1) as unrelated", [`"${pgSchema}"."unrelated"`])).rows
    ).toEqual([{ unrelated: `${pgSchema}.unrelated` }]);
  });

  it.each([undefined, "custom", 'tenant"' + "x".repeat(80)])(
    "isolates wallet records, local storage, and resets with pgSchema %s",
    async (pgSchema) => {
      const prefix = `${integrationDbName}-${"wallet".repeat(20)}`;
      const first = createAdapter(`${prefix}-a`, testSchema, undefined, pgSchema);
      const second = createAdapter(`${prefix}-b`, testSchema, undefined, pgSchema);
      const firstTask = task("same-id", "First wallet");
      await toPromise((cb) => first.batch([["create", "tasks", firstTask]], cb));
      expect(await toPromise((cb) => second.query(tasksQuery(), cb))).toEqual([]);
      expect(await toPromise((cb) => second.find("tasks", firstTask.id, cb))).toBeUndefined();
      const otherTask = { ...firstTask, title: "Other wallet" };
      await toPromise((cb) => second.batch([["update", "tasks", otherTask]], cb));
      await toPromise((cb) =>
        second.batch(
          [
            ["markAsDeleted", "tasks", firstTask.id],
            ["destroyPermanently", "tasks", firstTask.id],
          ],
          cb
        )
      );
      await toPromise((cb) => second.destroyDeletedRecords("tasks", [firstTask.id], cb));
      expect(await toPromise((cb) => first.find("tasks", firstTask.id, cb))).toMatchObject(
        firstTask
      );
      await toPromise((cb) =>
        second.batch([["create", "tasks", task(firstTask.id, "Second wallet")]], cb)
      );
      expect(await toPromise((cb) => first.queryIds(tasksQuery(), cb))).toEqual([firstTask.id]);
      expect(await toPromise((cb) => second.count(tasksQuery(), cb))).toBe(1);
      await toPromise((cb) => first.setLocal("token", "first", cb));
      expect(await toPromise((cb) => second.getLocal("token", cb))).toBeUndefined();
      await toPromise((cb) => second.setLocal("token", "second", cb));
      await toPromise((cb) => second.removeLocal("token", cb));
      expect(await toPromise((cb) => first.getLocal("token", cb))).toBe("first");
      await toPromise((cb) => second.unsafeResetDatabase(cb));
      expect(await toPromise((cb) => second.count(tasksQuery(), cb))).toBe(0);
      expect(await toPromise((cb) => first.find("tasks", firstTask.id, cb))).toMatchObject(
        firstTask
      );
      const reopened = createAdapter(`${prefix}-a`, testSchema, undefined, pgSchema);
      expect(await toPromise((cb) => reopened.getLocal("token", cb))).toBe("first");
      const otherNamespace = createAdapter(
        `${prefix}-a`,
        testSchema,
        undefined,
        `${pgSchema ?? "public"}-other`
      );
      expect(await toPromise((cb) => otherNamespace.count(tasksQuery(), cb))).toBe(0);
    }
  );

  it("isolates schema versions, migration steps, and migration resets", async () => {
    const firstName = `${integrationDbName}-migration-a`;
    const secondName = `${integrationDbName}-migration-b`;
    const first = createAdapter(firstName);
    const second = createAdapter(secondName);
    await toPromise((cb) => first.batch([["create", "tasks", task("first", "First")]], cb));
    await toPromise((cb) => second.batch([["create", "tasks", task("second", "Second")]], cb));
    const noteColumn = { name: "note", type: "string" as const, isIndexed: true };
    const notesTable = {
      name: "indexed_records",
      columns: [
        { name: "body", type: "string" as const, isIndexed: true },
        { name: "label", type: "string" as const, isIndexed: true },
      ],
    };
    const nextSchema = appSchema({
      version: 2,
      tables: [
        tableSchema({
          name: "tasks",
          columns: [...testSchema.tables.tasks.columnArray, noteColumn],
        }),
        tableSchema(notesTable),
      ],
    });
    const migrations = schemaMigrations({
      migrations: [
        {
          toVersion: 2,
          steps: [
            addColumns({ table: "tasks", columns: [noteColumn] }),
            createTable(notesTable),
            unsafeExecuteSql("UPDATE tasks SET title = 'Migrated';"),
          ],
        },
      ],
    });
    const upgraded = createAdapter(firstName, nextSchema, migrations);
    expect(await toPromise((cb) => upgraded.find("tasks", "first", cb))).toMatchObject({
      title: "Migrated",
      note: "",
    });
    expect(await toPromise((cb) => second.find("tasks", "second", cb))).toMatchObject({
      title: "Second",
    });
    expect(await toPromise((cb) => upgraded.getLocal("__schema_version", cb))).toBe("2");
    expect(await toPromise((cb) => second.getLocal("__schema_version", cb))).toBe("1");
    const columnsSql =
      "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'tasks' AND column_name = 'note'";
    expect(
      await toPromise((cb) => upgraded.unsafeQueryRaw(tasksQuery(columnsSql), cb))
    ).toHaveLength(1);
    expect(await toPromise((cb) => second.unsafeQueryRaw(tasksQuery(columnsSql), cb))).toEqual([]);
    const indexes = await toPromise((cb) =>
      upgraded.unsafeQueryRaw(
        tasksQuery("SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()"),
        cb
      )
    );
    expect(indexes).toEqual(
      expect.arrayContaining([
        { indexname: "tasks_created_at" },
        { indexname: "tasks_note" },
        { indexname: "indexed_records_body" },
        { indexname: "indexed_records_label" },
      ])
    );
    const reset = createAdapter(secondName, nextSchema);
    expect(await toPromise((cb) => reset.count(tasksQuery(), cb))).toBe(0);
    expect(await toPromise((cb) => upgraded.find("tasks", "first", cb))).toMatchObject({
      title: "Migrated",
    });
    expect(await toPromise((cb) => reset.getLocal("__schema_version", cb))).toBe("2");
    expect(
      await toPromise((cb) =>
        reset.unsafeQueryRaw(
          tasksQuery("SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()"),
          cb
        )
      )
    ).toEqual(
      expect.arrayContaining([
        { indexname: "indexed_records_body" },
        { indexname: "indexed_records_label" },
      ])
    );
  });

  it("isolates raw SQL and restores the connection search path", async () => {
    const first = createAdapter(`${integrationDbName}-raw-a`);
    const second = createAdapter(`${integrationDbName}-raw-b`);
    await toPromise((cb) => first.batch([["create", "tasks", task("first", "First")]], cb));
    await toPromise((cb) => second.batch([["create", "tasks", task("second", "Second")]], cb));
    expect(await toPromise((cb) => second.query(tasksQuery('SELECT * FROM "tasks"'), cb))).toEqual([
      task("second", "Second"),
    ]);
    expect(
      await toPromise((cb) => second.queryIds(tasksQuery('SELECT id FROM "tasks"'), cb))
    ).toEqual(["second"]);
    expect(
      await toPromise((cb) => second.count(tasksQuery('SELECT count(*) AS count FROM "tasks"'), cb))
    ).toBe(1);
    await toPromise((cb) =>
      second.unsafeExecute({ sqlString: "UPDATE tasks SET title = 'Changed'" }, cb)
    );
    await toPromise((cb) =>
      second.unsafeExecute({ sqls: [["DELETE FROM tasks WHERE id = $1", ["first"]]] }, cb)
    );
    expect(await toPromise((cb) => first.find("tasks", "first", cb))).toMatchObject({
      title: "First",
    });
    expect(await toPromise((cb) => second.find("tasks", "second", cb))).toMatchObject({
      title: "Changed",
    });
    const fallbackTable = `fallback_${randomUUID().replaceAll("-", "")}`;
    await pool.query(`create table public."${fallbackTable}" ("id" text)`);
    try {
      const expressionQuery: SerializedQuery = {
        ...tasksQuery(),
        description: {
          ...tasksQuery().description,
          where: [
            {
              type: "and",
              conditions: [{ type: "sql", expr: `EXISTS (SELECT 1 FROM "${fallbackTable}")` }],
            },
          ],
        },
      };
      await expect(toPromise((cb) => second.query(expressionQuery, cb))).rejects.toThrow(
        /does not exist/
      );
      await expect(
        toPromise((cb) => second.unsafeExecute({ sqlString: `DELETE FROM "${fallbackTable}"` }, cb))
      ).rejects.toThrow(/does not exist/);
      await expect(
        toPromise((cb) => second.unsafeQueryRaw(tasksQuery(`SELECT * FROM "${fallbackTable}"`), cb))
      ).rejects.toThrow(/does not exist/);
    } finally {
      await pool.query(`drop table public."${fallbackTable}"`);
    }
    const { rows } = await pool.query<{ search_path: string }>("SHOW search_path");
    expect(rows[0].search_path).not.toContain("anuma_");
  });

  it("keeps NULL and trusted vault memories and excludes quarantined memories", async () => {
    const database = new Database({
      adapter: createAdapter(
        `${integrationDbName}-vault-inequality`,
        sdkSchema,
        undefined,
        "vault_inequality_test"
      ),
      modelClasses: sdkModelClasses,
    });
    const ctx = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    };
    const ordinary = await createVaultMemoryOp(ctx, { content: "Ordinary memory" });
    const trusted = await createVaultMemoryOp(ctx, {
      content: "Trusted memory",
      trustTier: "trusted",
    });
    const quarantined = await createVaultMemoryOp(ctx, {
      content: "Quarantined memory",
      trustTier: "quarantined",
    });
    const expectedIds = [ordinary.uniqueId, trusted.uniqueId].sort();
    const allIds = [...expectedIds, quarantined.uniqueId].sort();

    expect(ordinary.trustTier).toBeNull();
    expect
      .soft((await getAllVaultMemoriesOp(ctx)).map((memory) => memory.uniqueId).sort())
      .toEqual(expectedIds);
    expect.soft(await countActiveVaultMemoriesOp(ctx)).toBe(2);
    expect
      .soft((await getVaultMemoriesByIdsOp(ctx, allIds)).map((memory) => memory.uniqueId).sort())
      .toEqual(expectedIds);
    expect(
      (await getAllVaultMemoriesOp(ctx, { includeQuarantined: true }))
        .map((memory) => memory.uniqueId)
        .sort()
    ).toEqual(allIds);
  });

  it("rejects inserts that violate the primary-key unique constraint", async () => {
    await toPromise((cb) =>
      adapter.batch(
        [
          [
            "create",
            "tasks",
            rawRecord({
              id: "dup-1",
              _status: "created",
              _changed: "",
              title: "Original",
              is_done: false,
              priority: null,
              created_at: 1,
            }),
          ],
        ],
        cb
      )
    );

    let err: unknown;
    try {
      await toPromise((cb) =>
        adapter.batch(
          [
            [
              "create",
              "tasks",
              rawRecord({
                id: "dup-1",
                _status: "created",
                _changed: "",
                title: "Duplicate",
                is_done: false,
                priority: null,
                created_at: 2,
              }),
            ],
          ],
          cb
        )
      );
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err).toMatchObject({ code: "23505" });
  });

  it("rejects inserts that violate a foreign-key constraint", async () => {
    await toPromise((cb) =>
      adapter.unsafeExecute(
        {
          sqls: [
            [
              `create table if not exists "task_notes" (
                "id" text primary key,
                "task_id" text not null references "tasks"("id"),
                "note" text not null default ''
              )`,
              [],
            ],
          ],
        },
        cb
      )
    );

    let err: unknown;
    try {
      await toPromise((cb) =>
        adapter.unsafeExecute(
          {
            sqls: [
              [
                `insert into "task_notes" ("id", "task_id", "note") values ($1, $2, $3)`,
                ["note-1", "does-not-exist", "orphan"],
              ],
            ],
          },
          cb
        )
      );
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err).toMatchObject({ code: "23503" });
  });

  it("rolls back the whole batch when one operation inside the transaction fails", async () => {
    await toPromise((cb) =>
      adapter.batch(
        [
          [
            "create",
            "tasks",
            rawRecord({
              id: "seed-1",
              _status: "created",
              _changed: "",
              title: "Seed",
              is_done: false,
              priority: null,
              created_at: 10,
            }),
          ],
        ],
        cb
      )
    );

    const wrapped: PgPoolLike = {
      query: (text: string, values?: unknown[]) => adapterPool.query(text, values),
      async connect() {
        const client = await pool.connect();
        return {
          query: async (text: string, values?: unknown[]) => {
            if (text.startsWith("update")) await client.query("SELECT 1 / 0");
            return client.query(text, values);
          },
          release: () => client.release(),
        } as PgClientLike;
      },
    };

    const txAdapter = new PostgreSQLAdapter({
      pool: wrapped,
      schema: testSchema,
      dbName: integrationDbName,
    });
    await toPromise((cb) => txAdapter.getLocal("__noop__", cb));

    let err: unknown;
    try {
      await toPromise((cb) =>
        txAdapter.batch(
          [
            [
              "create",
              "tasks",
              rawRecord({
                id: "batch-new",
                _status: "created",
                _changed: "",
                title: "Should not persist",
                is_done: false,
                priority: null,
                created_at: 20,
              }),
            ],
            [
              "update",
              "tasks",
              rawRecord({
                id: "seed-1",
                _status: "updated",
                _changed: "title",
                title: "Should also not persist",
                is_done: false,
                priority: null,
                created_at: 10,
              }),
            ],
          ],
          cb
        )
      );
    } catch (e) {
      err = e;
    }

    expect(err).toBeDefined();
    expect(err).toMatchObject({ code: "22012" });

    const newRow = await toPromise((cb) => adapter.find("tasks", "batch-new", cb));
    expect(newRow).toBeUndefined();

    const seed = await toPromise((cb) => adapter.find("tasks", "seed-1", cb));
    expect(seed).toBeDefined();
    expect(seed).toMatchObject({ title: "Seed" });
  });
});
