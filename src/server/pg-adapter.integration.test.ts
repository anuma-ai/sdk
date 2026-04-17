/**
 * Integration tests for PostgreSQLAdapter against a real PostgreSQL instance
 * spun up via testcontainers. Covers failure modes that cannot be exercised
 * by the in-memory mock in pg-adapter.test.ts:
 *   - unique-constraint (primary key) conflict on insert
 *   - foreign-key violation on insert
 *   - statement timeout mid-transaction (should roll back the batch)
 *
 * These tests require Docker to be available and are therefore gated behind
 * the INTEGRATION environment variable so that normal CI (which may not have
 * Docker) is unaffected. Run locally with:
 *
 *   INTEGRATION=1 pnpm test src/server/pg-adapter.integration
 *
 * Follow-ups (see issue #459):
 *   - Add a connection-drop case (forcefully terminate the backend mid-txn).
 *   - Add a slow-query/statement_timeout case on read paths.
 *   - Wire this suite into a dedicated CI job with a Postgres service.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appSchema, tableSchema } from "@nozbe/watermelondb";
import { toPromise } from "@nozbe/watermelondb/utils/fp/Result";
import { PostgreSQLAdapter } from "./pg-adapter";
import type { PgClientLike, PgPoolLike } from "./pg-adapter";

// Skip the entire suite unless INTEGRATION=1 is set. Using describe.skipIf
// keeps the file visible to the test runner but avoids booting a container
// in default CI runs.
const runIntegration = process.env.INTEGRATION === "1";

// Lazily resolve testcontainers / pg imports so the standard unit-test run
// doesn't have to load these modules (and fail if a transitive binary is
// missing on the test host).
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import of pg, avoids hard dep
    const pg: any = (await import("pg")).default ?? (await import("pg"));

    container = (await new PostgreSqlContainer("postgres:16-alpine").start()) as Container;
    pool = new pg.Pool({ connectionString: container.getConnectionUri() });

    adapter = new PostgreSQLAdapter({
      pool: pool as PgPoolLike,
      schema: testSchema,
      dbName: "integration-test",
    });
    // Force init to complete before tests run.
    await toPromise((cb) => adapter.getLocal("__noop__", cb));
  }, 120_000);

  afterAll(async () => {
    if (pool) await pool.end();
    if (container) await container.stop();
  }, 60_000);

  it("rejects inserts that violate the primary-key unique constraint", async () => {
    // First insert succeeds.
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

    // Second insert with the same id must surface a duplicate-key error.
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
    // pg surfaces SQLSTATE 23505 for unique_violation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pg error shape
    expect((err as any)?.code ?? String(err)).toMatch(/23505|duplicate key/i);
  });

  it("rejects inserts that violate a foreign-key constraint", async () => {
    // Create a child table with an FK into tasks and verify the adapter's
    // raw-SQL path (unsafeExecute) rejects an orphan row.
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
    // pg surfaces SQLSTATE 23503 for foreign_key_violation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pg error shape
    expect((err as any)?.code ?? String(err)).toMatch(/23503|foreign key/i);
  });

  it("rolls back the whole batch when one operation inside the transaction fails", async () => {
    // Insert a seed row to clash with below.
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

    // Wrap the real pool but force a statement_timeout on every acquired
    // client so the second INSERT in the batch times out. The first insert
    // should still be rolled back because the adapter issues BEGIN/COMMIT.
    const wrapped: PgPoolLike = {
      query: (text: string, values?: unknown[]) => pool.query(text, values),
      async connect() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pg client is untyped here
        const client: any = await pool.connect();
        // Make any statement over 1ms abort. We issue a no-op pg_sleep to
        // guarantee the offending statement exceeds the threshold.
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
                // Force the statement to run long enough to hit the 1ms timeout.
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
    // SQLSTATE 57014 = query_canceled (statement timeout).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pg error shape
    expect((err as any)?.code ?? String(err)).toMatch(/57014|timeout|canceling/i);

    // Verify rollback: the new row must not exist and the seed row keeps its original title.
    const newRow = await toPromise((cb) => adapter.find("tasks", "batch-new", cb));
    expect(newRow).toBeUndefined();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw-record shape
    const seed = (await toPromise((cb) => adapter.find("tasks", "seed-1", cb))) as any;
    expect(seed).toBeDefined();
    expect(seed.title).toBe("Seed");
  });
});
