import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appSchema, tableSchema } from "@nozbe/watermelondb";
import { toPromise } from "@nozbe/watermelondb/utils/fp/Result";
import { PostgreSQLAdapter } from "./pg-adapter";
import type { PgClientLike, PgPoolLike } from "./pg-adapter";

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

describe.skipIf(!runIntegration)("PostgreSQLAdapter (integration)", () => {
  let container: Container;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic require of pg
  let pool: any;
  let adapter: PostgreSQLAdapter;

  beforeAll(async () => {
    const { PostgreSqlContainer } = await import("@testcontainers/postgresql");
    const pgModule = await import("pg");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import of pg, avoids hard dep
    const pg: any = (pgModule as any).default ?? pgModule;

    container = (await new PostgreSqlContainer("postgres:16-alpine").start()) as Container;
    pool = new pg.Pool({ connectionString: container.getConnectionUri() });

    adapter = new PostgreSQLAdapter({
      pool: pool as PgPoolLike,
      schema: testSchema,
      dbName: "integration-test",
    });
    await toPromise((cb) => adapter.getLocal("__noop__", cb));
  }, 120_000);

  afterAll(async () => {
    if (pool) await pool.end();
    if (container) await container.stop();
  }, 60_000);

  it("rejects inserts that violate the primary-key unique constraint", async () => {
    await toPromise((cb) =>
      adapter.batch(
        [
          [
            "create",
            "tasks",
            {
              id: "dup-1",
              _status: "created",
              _changed: "",
              title: "Original",
              is_done: false,
              priority: null,
              created_at: 1,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture shape
            } as any,
          ],
        ],
        cb
      )
    );

    let err: Error | undefined;
    try {
      await toPromise((cb) =>
        adapter.batch(
          [
            [
              "create",
              "tasks",
              {
                id: "dup-1",
                _status: "created",
                _changed: "",
                title: "Duplicate",
                is_done: false,
                priority: null,
                created_at: 2,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture shape
              } as any,
            ],
          ],
          cb
        )
      );
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pg error shape
    expect((err as any)?.code ?? String(err)).toMatch(/23505|duplicate key/i);
  });

  it("rejects inserts that violate a foreign-key constraint", async () => {
    await toPromise((cb) =>
      adapter.unsafeExecute(
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cast through UnsafeExecuteOperations
          sqls: [
            [
              `create table if not exists "task_notes" (
                "id" text primary key,
                "task_id" text not null references "tasks"("id"),
                "note" text not null default ''
              )`,
              [],
            ],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cast through UnsafeExecuteOperations
          ] as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cast through UnsafeExecuteOperations
        } as any,
        cb
      )
    );

    let err: Error | undefined;
    try {
      await toPromise((cb) =>
        adapter.unsafeExecute(
          {
            sqls: [
              [
                `insert into "task_notes" ("id", "task_id", "note") values ($1, $2, $3)`,
                ["note-1", "does-not-exist", "orphan"],
              ],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cast through UnsafeExecuteOperations
            ] as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cast through UnsafeExecuteOperations
          } as any,
          cb
        )
      );
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pg error shape
    expect((err as any)?.code ?? String(err)).toMatch(/23503|foreign key/i);
  });

  it("rolls back the whole batch when one operation inside the transaction fails", async () => {
    await toPromise((cb) =>
      adapter.batch(
        [
          [
            "create",
            "tasks",
            {
              id: "seed-1",
              _status: "created",
              _changed: "",
              title: "Seed",
              is_done: false,
              priority: null,
              created_at: 10,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture shape
            } as any,
          ],
        ],
        cb
      )
    );

    const wrapped: PgPoolLike = {
      query: (text: string, values?: unknown[]) => pool.query(text, values),
      async connect() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pg client is untyped here
        const client: any = await pool.connect();
        await client.query("SET statement_timeout = 1");
        return {
          query: (text: string, values?: unknown[]) => client.query(text, values),
          release: () => client.release(),
        } as PgClientLike;
      },
    };

    const txAdapter = new PostgreSQLAdapter({
      pool: wrapped,
      schema: testSchema,
      dbName: "integration-test",
    });
    await toPromise((cb) => txAdapter.getLocal("__noop__", cb));

    let err: Error | undefined;
    try {
      await toPromise((cb) =>
        txAdapter.batch(
          [
            [
              "create",
              "tasks",
              {
                id: "batch-new",
                _status: "created",
                _changed: "",
                title: "Should not persist",
                is_done: false,
                priority: null,
                created_at: 20,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture shape
              } as any,
            ],
            [
              "update",
              "tasks",
              {
                id: "seed-1",
                _status: "updated",
                _changed: "title",
                title: "Should also not persist",
                is_done: false,
                priority: null,
                created_at: 10,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture shape
              } as any,
            ],
          ],
          cb
        )
      );
    } catch (e) {
      err = e as Error;
    }

    expect(err).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pg error shape
    expect((err as any)?.code ?? String(err)).toMatch(/57014|timeout|canceling/i);

    const newRow = await toPromise((cb) => adapter.find("tasks", "batch-new", cb));
    expect(newRow).toBeUndefined();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw-record shape
    const seed = (await toPromise((cb) => adapter.find("tasks", "seed-1", cb))) as any;
    expect(seed).toBeDefined();
    expect(seed.title).toBe("Seed");
  });
});
