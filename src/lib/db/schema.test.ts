import { describe, expect, it } from "vitest";

import {
  getConversationsByProjectLazyOp,
  getConversationsByProjectOp,
  getConversationsLazyOp,
  getConversationsOp,
  getConversationsPageOp,
  type StorageOperationsContext,
} from "./chat/operations";
import { SDK_SCHEMA_VERSION, sdkMigrations, sdkSchema } from "./schema";

type CapturedClause = {
  type: string;
  left?: string;
  sortColumn?: string;
  comparison?: { operator: string };
};

async function clausesOf(
  run: (ctx: StorageOperationsContext) => Promise<unknown>
): Promise<CapturedClause[]> {
  let captured: CapturedClause[] = [];
  const ctx = {
    conversationsCollection: {
      query: (...clauses: CapturedClause[]) => {
        captured = clauses;
        return { unsafeFetchRaw: async () => [] };
      },
    },
  } as unknown as StorageOperationsContext;

  await run(ctx);
  return captured;
}

const LIST_OPS: [string, (ctx: StorageOperationsContext) => Promise<unknown>][] = [
  ["getConversationsOp", (ctx) => getConversationsOp(ctx)],
  ["getConversationsLazyOp", (ctx) => getConversationsLazyOp(ctx)],
  ["getConversationsPageOp", (ctx) => getConversationsPageOp(ctx, { limit: 50, before: 1 })],
  ["getConversationsByProjectOp", (ctx) => getConversationsByProjectOp(ctx, "project-1")],
  ["getConversationsByProjectLazyOp", (ctx) => getConversationsByProjectLazyOp(ctx, "project-1")],
];

function conversationsIndexColumns(): string[] {
  const sql = sdkMigrations.sortedMigrations
    .flatMap((migration) => migration.steps)
    .filter((step) => step.type === "sql")
    .map((step) => step.sql)
    .find((statement) => statement.includes("conversations_is_deleted_created_at"));

  if (!sql) throw new Error("no migration creates the conversations list index");

  const columns = /\(([^)]+)\)\s*;?\s*$/.exec(sql);
  if (!columns) throw new Error(`could not read index columns from: ${sql}`);

  return columns[1].split(",").map((column) => column.trim());
}

describe("conversations list index", () => {
  it("is created by a migration, idempotently", () => {
    const sqlSteps = sdkMigrations.sortedMigrations
      .flatMap((migration) => migration.steps)
      .filter((step) => step.type === "sql")
      .map((step) => step.sql);

    expect(sqlSteps).toContain(
      "CREATE INDEX IF NOT EXISTS conversations_is_deleted_created_at ON conversations (is_deleted, created_at);"
    );
  });

  it.each(LIST_OPS)(
    "covers %s: leading column is equality-filtered, trailing column is the sort key",
    async (_name, run) => {
      const [leading, trailing, ...rest] = conversationsIndexColumns();
      expect(rest).toEqual([]);

      const clauses = await clausesOf(run);
      const equalityFiltered = clauses
        .filter((clause) => clause.type === "where" && clause.comparison?.operator === "eq")
        .map((clause) => clause.left);
      const sortedBy = clauses
        .filter((clause) => clause.type === "sortBy")
        .map((clause) => clause.sortColumn);

      expect(equalityFiltered).toContain(leading);
      expect(sortedBy).toEqual([trailing]);
    }
  );

  it("keeps both index columns declared on the table", () => {
    const { columns } = sdkSchema.tables.conversations;
    expect(columns.is_deleted.isIndexed).toBe(true);
    expect(columns.created_at.isIndexed).toBe(true);
  });
});

describe("sdkMigrations", () => {
  it("leaves no gap in the migration ladder up to the current version", () => {
    const versions = sdkMigrations.sortedMigrations.map((migration) => migration.toVersion);
    const expected = Array.from(
      { length: SDK_SCHEMA_VERSION - sdkMigrations.minVersion },
      (_, i) => sdkMigrations.minVersion + 1 + i
    );

    expect(versions).toEqual(expected);
    expect(sdkMigrations.maxVersion).toBe(SDK_SCHEMA_VERSION);
  });

  it("v45 adds `media` to memory_vault, and the table carries it", () => {
    const v45 = sdkMigrations.sortedMigrations.find((m) => m.toVersion === 45);
    expect(v45).toBeDefined();
    const added = (v45?.steps ?? []).flatMap((step) => {
      const addColumns = step as unknown as { table?: string; columns?: { name: string }[] };
      return addColumns.table === "memory_vault"
        ? (addColumns.columns ?? []).map((c) => c.name)
        : [];
    });
    expect(added).toContain("media");

    const columns = sdkSchema.tables.memory_vault.columns;
    expect(columns.media).toBeDefined();
    expect(columns.media.isOptional).toBe(true);
  });
});

describe("history.origin (v44)", () => {
  it("is added by a migration AND declared on the table", () => {
    const addsOrigin = sdkMigrations.sortedMigrations
      .filter((migration) => migration.toVersion === 44)
      .flatMap((migration) => migration.steps)
      .some(
        (step) =>
          step.type === "add_columns" &&
          step.table === "history" &&
          step.columns.some((column) => column.name === "origin")
      );

    expect(addsOrigin).toBe(true);
    expect(sdkSchema.tables.history.columns.origin).toBeDefined();
  });

  it("is optional, so existing rows migrate to NULL rather than a value", () => {
    const column = sdkSchema.tables.history.columns.origin;
    expect(column.type).toBe("string");
    expect(column.isOptional).toBe(true);
  });
});

describe("memory_vault kind / level (v48)", () => {
  const v48 = () => sdkMigrations.sortedMigrations.find((m) => m.toVersion === 48);

  it("adds kind, kind_value and level by migration AND declares them on the table", () => {
    const added = (v48()?.steps ?? []).flatMap((step) =>
      step.type === "add_columns" && step.table === "memory_vault"
        ? step.columns.map((c) => c.name)
        : []
    );
    expect(added).toEqual(["kind", "kind_value", "level"]);

    const columns = sdkSchema.tables.memory_vault.columns;
    expect(columns.kind).toMatchObject({ isOptional: true, isIndexed: true });
    expect(columns.kind_value).toMatchObject({ isOptional: true });
    expect(columns.level).toMatchObject({ isOptional: true, isIndexed: true });
  });

  // The backfill SQL, executed for real. WatermelonDB's SQLite adapter runs it
  // verbatim; there is no native binding in the unit suite, so node:sqlite
  // stands in when the runtime has it.
  let sqlite: typeof import("node:sqlite") | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sqlite = require("node:sqlite") as typeof import("node:sqlite");
  } catch {
    sqlite = null;
  }

  it.skipIf(!sqlite)("maps scope to level: shared/public → matching, else private", () => {
    const sql = (v48()?.steps ?? []).flatMap((step) => (step.type === "sql" ? [step.sql] : []));
    expect(sql).toHaveLength(1);

    const db = new sqlite!.DatabaseSync(":memory:");
    db.exec("CREATE TABLE memory_vault (id TEXT PRIMARY KEY, scope TEXT, level TEXT);");
    const insert = db.prepare("INSERT INTO memory_vault (id, scope, level) VALUES (?, ?, ?)");
    insert.run("shared", "shared", null);
    insert.run("public", "public", null);
    insert.run("private", "private", null);
    insert.run("empty", "", null);
    insert.run("null", null, null);
    // A row a newer build already wrote keeps its level.
    insert.run("already", "shared", "profile");

    db.exec(sql[0]);

    const rows = db.prepare("SELECT id, level FROM memory_vault ORDER BY id").all() as {
      id: string;
      level: string;
    }[];
    expect(Object.fromEntries(rows.map((r) => [r.id, r.level]))).toEqual({
      already: "profile",
      empty: "private",
      null: "private",
      private: "private",
      public: "matching",
      shared: "matching",
    });
    db.close();
  });
});
