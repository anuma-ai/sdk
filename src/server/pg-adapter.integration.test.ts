import { appSchema, Database, tableSchema } from "@nozbe/watermelondb";
import type { RawRecord } from "@nozbe/watermelondb/RawRecord";
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
import type { PgPoolLike } from "./pg-adapter";
import { PostgreSQLAdapter } from "./pg-adapter";

const runIntegration = process.env.INTEGRATION === "1";

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

function rawRecord(record: RawRecord & Record<string, unknown>): RawRecord {
  return record;
}

describe.skipIf(!runIntegration)("PostgreSQLAdapter (integration)", () => {
  let container: Container;
  let pool: Pool;
  let adapter: PostgreSQLAdapter;

  beforeAll(async () => {
    const { PostgreSqlContainer } = await import("@testcontainers/postgresql");
    const pgModule = await import("pg");
    const pg = pgModule.default;

    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    pool = new pg.Pool({ connectionString: container.getConnectionUri() });

    adapter = new PostgreSQLAdapter({
      pool,
      schema: testSchema,
      dbName: "integration-test",
    });
    await toPromise((cb) => adapter.getLocal("__noop__", cb));
  }, 120_000);

  afterAll(async () => {
    if (pool) await pool.end();
    if (container) await container.stop();
  }, 60_000);

  it("keeps NULL and trusted vault memories and excludes quarantined memories", async () => {
    const database = new Database({
      adapter: new PostgreSQLAdapter({
        pool,
        schema: sdkSchema,
        dbName: "vault-inequality-test",
        pgSchema: "vault_inequality_test",
      }),
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
      query: (text: string, values?: unknown[]) => pool.query(text, values),
      async connect() {
        const client = await pool.connect();
        return {
          query: async (text: string, values?: unknown[]) => {
            if (text.startsWith("update")) await client.query("SELECT 1 / 0");
            return client.query(text, values);
          },
          release: () => client.release(),
        };
      },
    };

    const txAdapter = new PostgreSQLAdapter({
      pool: wrapped,
      schema: testSchema,
      dbName: "integration-test",
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
