import { describe, it, expect, beforeEach } from "vitest";
import { appSchema, tableSchema } from "@nozbe/watermelondb";
import { schemaMigrations, addColumns, createTable } from "@nozbe/watermelondb/Schema/migrations";
import { toPromise } from "@nozbe/watermelondb/utils/fp/Result";
import { PostgreSQLAdapter, schemaToCreateSQL } from "./pg-adapter";
import type { PgPoolLike } from "./pg-adapter";
import type { SerializedQuery } from "@nozbe/watermelondb/Query";

// ---------------------------------------------------------------------------
// In-memory PostgreSQL mock (stores rows per table)
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function createMockPool(): PgPoolLike & { tables: Map<string, Row[]> } {
  const tables = new Map<string, Row[]>();
  const localStorage = new Map<string, string>();

  function getTable(name: string): Row[] {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name)!;
  }

  return {
    tables,
    async query(text: string, values?: unknown[]) {
      // --- CREATE TABLE / CREATE INDEX ---
      if (/^create (table|index)/i.test(text)) {
        // Extract table name for create table
        const tableMatch = text.match(/create table if not exists "(\w+)"/i);
        if (tableMatch) getTable(tableMatch[1]);
        return { rows: [] };
      }

      // --- INSERT ---
      const insertMatch = text.match(/^insert into "(\w+)" \((.+?)\) values/i);
      if (insertMatch) {
        const tableName = insertMatch[1];

        // local_storage upsert
        if (tableName === "local_storage" && values) {
          const key = values[0] as string;
          const value = values[1] as string;
          localStorage.set(key, value);
          return { rows: [] };
        }

        const colNames = insertMatch[2].split(",").map((c) => c.trim().replace(/"/g, ""));
        const row: Row = {};
        colNames.forEach((col, i) => {
          row[col] = values?.[i] ?? null;
        });
        getTable(tableName).push(row);
        return { rows: [] };
      }

      // --- SELECT from local_storage ---
      if (/select "value" from "local_storage"/i.test(text)) {
        const key = values?.[0] as string;
        const val = localStorage.get(key);
        return { rows: val !== undefined ? [{ value: val }] : [] };
      }

      // --- DELETE from local_storage ---
      if (/delete from "local_storage" where "key"/i.test(text)) {
        const key = values?.[0] as string;
        localStorage.delete(key);
        return { rows: [] };
      }

      // --- DELETE from local_storage (all) ---
      if (/delete from "local_storage"$/i.test(text.trim())) {
        localStorage.clear();
        return { rows: [] };
      }

      // --- SELECT * with WHERE id ---
      const selectByIdMatch = text.match(/select \* from "(\w+)" where "id" = \$1/i);
      if (selectByIdMatch) {
        const rows = getTable(selectByIdMatch[1]).filter((r) => r.id === values?.[0]);
        return { rows };
      }

      // --- SELECT * (all) ---
      const selectAllMatch = text.match(/select "(\w+)"\.\* from "(\w+)"/i);
      if (selectAllMatch) {
        const tableName = selectAllMatch[2];
        return { rows: [...getTable(tableName)] };
      }

      // --- SELECT id ---
      const selectIdsMatch = text.match(/select "(\w+)"\."id" from "(\w+)"/i);
      if (selectIdsMatch) {
        const tableName = selectIdsMatch[2];
        return { rows: getTable(tableName).map((r) => ({ id: r.id })) };
      }

      // --- COUNT ---
      const countMatch = text.match(/select count\(\*\) as "count" from "(\w+)"/i);
      if (countMatch) {
        return { rows: [{ count: getTable(countMatch[1]).length }] };
      }

      // --- UPDATE _status = 'deleted' (markAsDeleted) ---
      const markDeletedMatch = text.match(
        /^update "(\w+)" set "_status" = 'deleted' where "id" = \$1/i
      );
      if (markDeletedMatch) {
        const tableName = markDeletedMatch[1];
        const id = values?.[0];
        const row = getTable(tableName).find((r) => r.id === id);
        if (row) row._status = "deleted";
        return { rows: [] };
      }

      // --- UPDATE ---
      const updateMatch = text.match(/^update "(\w+)" set (.+?) where "id" = \$(\d+)/i);
      if (updateMatch) {
        const tableName = updateMatch[1];
        const id = values?.[Number(updateMatch[3]) - 1];
        const table = getTable(tableName);
        const row = table.find((r) => r.id === id);
        if (row) {
          const setParts = updateMatch[2].split(",").map((s) => s.trim());
          setParts.forEach((part) => {
            const colMatch = part.match(/"(\w+)" = \$(\d+)/);
            if (colMatch) {
              row[colMatch[1]] = values?.[Number(colMatch[2]) - 1] ?? null;
            }
          });
        }
        return { rows: [] };
      }

      // --- DELETE by IDs ---
      const deleteByIdsMatch = text.match(/^delete from "(\w+)" where "id" in/i);
      if (deleteByIdsMatch) {
        const tableName = deleteByIdsMatch[1];
        const ids = new Set(values);
        const table = getTable(tableName);
        const remaining = table.filter((r) => !ids.has(r.id));
        tables.set(tableName, remaining);
        return { rows: [] };
      }

      // --- DELETE by ID ---
      const deleteByIdMatch = text.match(/^delete from "(\w+)" where "id" = \$1/i);
      if (deleteByIdMatch) {
        const tableName = deleteByIdMatch[1];
        const table = getTable(tableName);
        tables.set(
          tableName,
          table.filter((r) => r.id !== values?.[0])
        );
        return { rows: [] };
      }

      // --- DELETE all from table ---
      const deleteAllMatch = text.match(/^delete from "(\w+)"$/i);
      if (deleteAllMatch) {
        tables.set(deleteAllMatch[1], []);
        return { rows: [] };
      }

      // --- DROP TABLE ---
      const dropMatch = text.match(/^drop table if exists "(\w+)"/i);
      if (dropMatch) {
        tables.delete(dropMatch[1]);
        return { rows: [] };
      }

      // --- ALTER TABLE ADD COLUMN (no-op in mock) ---
      if (/^alter table/i.test(text)) {
        return { rows: [] };
      }

      // --- SELECT deleted ---
      if (/select "id" from "\w+" where "_status" = 'deleted'/i.test(text)) {
        const tblMatch = text.match(/from "(\w+)"/);
        if (tblMatch) {
          const rows = getTable(tblMatch[1]).filter((r) => r._status === "deleted");
          return { rows: rows.map((r) => ({ id: r.id })) };
        }
      }

      return { rows: [] };
    },
    async connect() {
      const pool = this as PgPoolLike;
      return {
        query: (text: string, values?: unknown[]) => pool.query(text, values),
        release: () => {},
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Test schema
// ---------------------------------------------------------------------------

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

// Helper to build a minimal SerializedQuery for "select all from tasks"
function allTasksQuery(): SerializedQuery {
  return {
    table: "tasks",
    description: {
      where: [],
      joinTables: [],
      nestedJoinTables: [],
      sortBy: [],
    },
    associations: [],
  } as unknown as SerializedQuery;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PostgreSQLAdapter", () => {
  let pool: ReturnType<typeof createMockPool>;
  let adapter: PostgreSQLAdapter;

  beforeEach(async () => {
    pool = createMockPool();
    adapter = new PostgreSQLAdapter({
      pool,
      schema: testSchema,
      dbName: "test-db",
    });
    // Wait for initialization
    await toPromise((cb) => adapter.getLocal("__noop__", cb));
  });

  describe("schemaToCreateSQL", () => {
    it("generates CREATE TABLE and index statements", () => {
      const sql = schemaToCreateSQL(testSchema);
      expect(sql.some((s) => s.includes('create table if not exists "tasks"'))).toBe(true);
      expect(sql.some((s) => s.includes('create index if not exists "tasks_created_at"'))).toBe(
        true
      );
      expect(sql.some((s) => s.includes('"local_storage"'))).toBe(true);
    });
  });

  describe("find", () => {
    it("returns undefined for missing record", async () => {
      const result = await toPromise((cb) => adapter.find("tasks", "nonexistent", cb));
      expect(result).toBeUndefined();
    });

    it("returns a record by id", async () => {
      await toPromise((cb) =>
        adapter.batch(
          [
            [
              "create",
              "tasks",
              {
                id: "task1",
                _status: "created",
                _changed: "",
                title: "Test",
                is_done: 0,
                priority: null,
                created_at: 1000,
              } as any,
            ],
          ],
          cb
        )
      );

      const result = await toPromise((cb) => adapter.find("tasks", "task1", cb));
      expect(result).toBeDefined();
      expect((result as any).id).toBe("task1");
      expect((result as any).title).toBe("Test");
    });
  });

  describe("batch", () => {
    it("creates, updates, and deletes records", async () => {
      // Create
      await toPromise((cb) =>
        adapter.batch(
          [
            [
              "create",
              "tasks",
              {
                id: "t1",
                _status: "created",
                _changed: "",
                title: "First",
                is_done: 0,
                priority: null,
                created_at: 1,
              } as any,
            ],
            [
              "create",
              "tasks",
              {
                id: "t2",
                _status: "created",
                _changed: "",
                title: "Second",
                is_done: 0,
                priority: null,
                created_at: 2,
              } as any,
            ],
          ],
          cb
        )
      );

      let count = await toPromise((cb) => adapter.count(allTasksQuery(), cb));
      expect(count).toBe(2);

      // Update
      await toPromise((cb) =>
        adapter.batch(
          [
            [
              "update",
              "tasks",
              {
                id: "t1",
                _status: "updated",
                _changed: "title",
                title: "Updated First",
                is_done: 1,
                priority: null,
                created_at: 1,
              } as any,
            ],
          ],
          cb
        )
      );

      const found = await toPromise((cb) => adapter.find("tasks", "t1", cb));
      expect((found as any).title).toBe("Updated First");

      // Destroy permanently
      await toPromise((cb) => adapter.batch([["destroyPermanently", "tasks", "t2" as any]], cb));

      count = await toPromise((cb) => adapter.count(allTasksQuery(), cb));
      expect(count).toBe(1);
    });

    it("marks records as deleted", async () => {
      await toPromise((cb) =>
        adapter.batch(
          [
            [
              "create",
              "tasks",
              {
                id: "t1",
                _status: "created",
                _changed: "",
                title: "Task",
                is_done: 0,
                priority: null,
                created_at: 1,
              } as any,
            ],
          ],
          cb
        )
      );

      await toPromise((cb) => adapter.batch([["markAsDeleted", "tasks", "t1" as any]], cb));

      const deleted = await toPromise((cb) => adapter.getDeletedRecords("tasks", cb));
      expect(deleted).toContain("t1");
    });
  });

  describe("query / queryIds / count", () => {
    beforeEach(async () => {
      await toPromise((cb) =>
        adapter.batch(
          [
            [
              "create",
              "tasks",
              {
                id: "a",
                _status: "created",
                _changed: "",
                title: "Alpha",
                is_done: 0,
                priority: 1,
                created_at: 100,
              } as any,
            ],
            [
              "create",
              "tasks",
              {
                id: "b",
                _status: "created",
                _changed: "",
                title: "Beta",
                is_done: 1,
                priority: 2,
                created_at: 200,
              } as any,
            ],
          ],
          cb
        )
      );
    });

    it("returns all records with query()", async () => {
      const results = await toPromise((cb) => adapter.query(allTasksQuery(), cb));
      expect(results).toHaveLength(2);
    });

    it("returns ids with queryIds()", async () => {
      const ids = await toPromise((cb) => adapter.queryIds(allTasksQuery(), cb));
      expect(ids).toContain("a");
      expect(ids).toContain("b");
    });

    it("returns count", async () => {
      const count = await toPromise((cb) => adapter.count(allTasksQuery(), cb));
      expect(count).toBe(2);
    });
  });

  describe("destroyDeletedRecords", () => {
    it("removes deleted records by id", async () => {
      await toPromise((cb) =>
        adapter.batch(
          [
            [
              "create",
              "tasks",
              {
                id: "d1",
                _status: "deleted",
                _changed: "",
                title: "Gone",
                is_done: 0,
                priority: null,
                created_at: 1,
              } as any,
            ],
          ],
          cb
        )
      );

      await toPromise((cb) => adapter.destroyDeletedRecords("tasks", ["d1"], cb));
      const count = await toPromise((cb) => adapter.count(allTasksQuery(), cb));
      expect(count).toBe(0);
    });
  });

  describe("local storage", () => {
    it("set/get/remove local values", async () => {
      await toPromise((cb) => adapter.setLocal("key1", "value1", cb));
      const val = await toPromise((cb) => adapter.getLocal("key1", cb));
      expect(val).toBe("value1");

      // Overwrite
      await toPromise((cb) => adapter.setLocal("key1", "updated", cb));
      const val2 = await toPromise((cb) => adapter.getLocal("key1", cb));
      expect(val2).toBe("updated");

      // Remove
      await toPromise((cb) => adapter.removeLocal("key1", cb));
      const val3 = await toPromise((cb) => adapter.getLocal("key1", cb));
      expect(val3).toBeUndefined();
    });
  });

  describe("unsafeResetDatabase", () => {
    it("clears all data", async () => {
      await toPromise((cb) =>
        adapter.batch(
          [
            [
              "create",
              "tasks",
              {
                id: "x",
                _status: "created",
                _changed: "",
                title: "Temp",
                is_done: 0,
                priority: null,
                created_at: 1,
              } as any,
            ],
          ],
          cb
        )
      );
      await toPromise((cb) => adapter.setLocal("k", "v", cb));

      await toPromise((cb) => adapter.unsafeResetDatabase(cb));

      const count = await toPromise((cb) => adapter.count(allTasksQuery(), cb));
      expect(count).toBe(0);

      const local = await toPromise((cb) => adapter.getLocal("k", cb));
      expect(local).toBeUndefined();
    });
  });

  describe("migrations", () => {
    it("applies add_columns migration when schema version bumps", async () => {
      // Start with v1 schema
      const v1Schema = appSchema({
        version: 1,
        tables: [
          tableSchema({
            name: "tasks",
            columns: [
              { name: "title", type: "string" },
              { name: "is_done", type: "boolean" },
            ],
          }),
        ],
      });

      const sharedPool = createMockPool();

      // Create v1 adapter — sets up initial tables and stores version
      const v1Adapter = new PostgreSQLAdapter({
        pool: sharedPool,
        schema: v1Schema,
        dbName: "test-db",
      });
      await toPromise((cb) => v1Adapter.getLocal("__noop__", cb));

      // Insert a record in v1
      await toPromise((cb) =>
        v1Adapter.batch(
          [
            [
              "create",
              "tasks",
              {
                id: "t1",
                _status: "created",
                _changed: "",
                title: "Original",
                is_done: 0,
              } as any,
            ],
          ],
          cb
        )
      );

      // Now create v2 schema with a new column
      const v2Schema = appSchema({
        version: 2,
        tables: [
          tableSchema({
            name: "tasks",
            columns: [
              { name: "title", type: "string" },
              { name: "is_done", type: "boolean" },
              { name: "priority", type: "number", isOptional: true },
            ],
          }),
        ],
      });

      const migrations = schemaMigrations({
        migrations: [
          {
            toVersion: 2,
            steps: [
              addColumns({
                table: "tasks",
                columns: [{ name: "priority", type: "number", isOptional: true }],
              }),
            ],
          },
        ],
      });

      // Create v2 adapter with migrations on the same pool
      const v2Adapter = new PostgreSQLAdapter({
        pool: sharedPool,
        schema: v2Schema,
        migrations,
        dbName: "test-db",
      });
      await toPromise((cb) => v2Adapter.getLocal("__noop__", cb));

      // Original data should still be there
      const found = await toPromise((cb) => v2Adapter.find("tasks", "t1", cb));
      expect(found).toBeDefined();
      expect((found as any).title).toBe("Original");
    });

    it("does destructive reset when migrations are not available", async () => {
      const v1Schema = appSchema({
        version: 1,
        tables: [
          tableSchema({
            name: "tasks",
            columns: [{ name: "title", type: "string" }],
          }),
        ],
      });

      const sharedPool = createMockPool();

      const v1Adapter = new PostgreSQLAdapter({
        pool: sharedPool,
        schema: v1Schema,
        dbName: "test-db",
      });
      await toPromise((cb) => v1Adapter.getLocal("__noop__", cb));

      await toPromise((cb) =>
        v1Adapter.batch(
          [
            [
              "create",
              "tasks",
              { id: "t1", _status: "created", _changed: "", title: "Gone" } as any,
            ],
          ],
          cb
        )
      );

      // Jump to v3 with no migrations — should reset
      const v3Schema = appSchema({
        version: 3,
        tables: [
          tableSchema({
            name: "tasks",
            columns: [
              { name: "title", type: "string" },
              { name: "priority", type: "number", isOptional: true },
            ],
          }),
        ],
      });

      const v3Adapter = new PostgreSQLAdapter({
        pool: sharedPool,
        schema: v3Schema,
        dbName: "test-db",
        // No migrations provided
      });
      await toPromise((cb) => v3Adapter.getLocal("__noop__", cb));

      // Data should be gone after destructive reset
      const found = await toPromise((cb) => v3Adapter.find("tasks", "t1", cb));
      expect(found).toBeUndefined();
    });
  });
});
