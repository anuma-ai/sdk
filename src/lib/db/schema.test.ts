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

/**
 * Guards on the v42 conversations index.
 *
 * The thing worth testing here is not that an index exists — it is that the
 * index matches the query it was built for. A single-column index on
 * `created_at` looks correct, satisfies "created_at is indexed", and does
 * nothing at all: every list read also filters `is_deleted`, and SQLite will
 * not combine two single-column indexes, so it keeps the is_deleted index and
 * temp-sorts on top of it. Only a composite whose leading column is the
 * equality filter and whose trailing column is the sort key removes the sort.
 *
 * So the central test below reads the columns out of the migration's actual
 * CREATE INDEX statement and checks them against the clauses the real list ops
 * build, rather than against a restatement of those clauses. Change the sort
 * column, drop the is_deleted filter, or shrink the index back to one column
 * and it fails.
 *
 * What it cannot do is prove SQLite picks the index: the adapter is native and
 * there is no SQLite binding available to the unit suite (`node:sqlite` is
 * still flagged on the Node version CI runs). The query plans are in the PR.
 */

/** Shape of the WatermelonDB clause objects the ops hand to `.query()`. */
type CapturedClause = {
  type: string;
  left?: string;
  sortColumn?: string;
  comparison?: { operator: string };
};

/**
 * Runs a list op against a stub collection and returns the clauses it built.
 * Fetches resolve empty, so nothing decrypts and no Model is constructed.
 */
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

/** Every op that returns a list of conversations ordered by recency. */
const LIST_OPS: [string, (ctx: StorageOperationsContext) => Promise<unknown>][] = [
  ["getConversationsOp", (ctx) => getConversationsOp(ctx)],
  ["getConversationsLazyOp", (ctx) => getConversationsLazyOp(ctx)],
  // `before` set so the keyset boundary clause is present too.
  ["getConversationsPageOp", (ctx) => getConversationsPageOp(ctx, { limit: 50, before: 1 })],
  ["getConversationsByProjectOp", (ctx) => getConversationsByProjectOp(ctx, "project-1")],
  ["getConversationsByProjectLazyOp", (ctx) => getConversationsByProjectLazyOp(ctx, "project-1")],
];

/** Columns of the composite index, parsed out of the shipped migration SQL. */
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
    // IF NOT EXISTS because a migration step may be replayed, and because a
    // database that already carries the index must not error the upgrade.
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

      // Leading column equality-filtered => SQLite can seek straight to the
      // live rows; trailing column as the sole sort key => it can then walk
      // them already ordered instead of buffering them into a temp B-tree.
      expect(equalityFiltered).toContain(leading);
      expect(sortedBy).toEqual([trailing]);
    }
  );

  it("keeps both index columns declared on the table", () => {
    // The migration only reaches databases that upgrade. Fresh ones are built
    // from the schema alone, and the schema format has no way to express a
    // composite index — so these single-column declarations are all the
    // non-SQLite adapters get: LokiJS builds its binary indices from
    // `isIndexed` and ignores sql steps, and Postgres has real statistics, so
    // its planner can use a single-column index that SQLite's would skip.
    const { columns } = sdkSchema.tables.conversations;
    expect(columns.is_deleted.isIndexed).toBe(true);
    expect(columns.created_at.isIndexed).toBe(true);
  });
});

describe("sdkMigrations", () => {
  it("leaves no gap in the migration ladder up to the current version", () => {
    // A missing toVersion is not a cosmetic problem: stepsForMigration returns
    // null when it cannot walk a continuous path from the stored version to the
    // schema version, and WatermelonDB falls back to a destructive reset — the
    // user's local database is wiped. This matters right now because more than
    // one open change wants the next version number; whichever lands second has
    // to renumber to the following one rather than leaving a hole behind it.
    const versions = sdkMigrations.sortedMigrations.map((migration) => migration.toVersion);
    const expected = Array.from(
      { length: SDK_SCHEMA_VERSION - sdkMigrations.minVersion },
      (_, i) => sdkMigrations.minVersion + 1 + i
    );

    expect(versions).toEqual(expected);
    expect(sdkMigrations.maxVersion).toBe(SDK_SCHEMA_VERSION);
  });

  it("v45 adds `media` to memory_vault, and the table carries it", () => {
    // The column that lets a server-extracted memory show the photo it came
    // from. Asserted on BOTH sides because WatermelonDB uses them for different
    // databases: an EXISTING device walks the migration, a fresh one is built
    // straight from the encoded schema — so a column present in only one place
    // works on exactly half the fleet.
    const v45 = sdkMigrations.sortedMigrations.find((m) => m.toVersion === 45);
    expect(v45).toBeDefined();
    // MigrationStep is a discriminated union (create_table | add_columns | sql),
    // so it has no structural overlap with an add_columns shape — narrow through
    // unknown rather than annotating the parameter.
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
    // Both halves are needed and they reach different databases: the migration
    // upgrades existing ones, the table declaration is all a freshly created
    // database gets (WatermelonDB builds it from the encoded schema alone). Ship
    // one without the other and half the install base has no column.
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
    // NULL is what keeps the embedding gate closed-by-default for legacy rows:
    // it reads as "provenance unknown", which stays eligible. A non-optional
    // column would sanitize to "" and a required backfill would have to invent
    // provenance for rows whose content is encrypted and unreadable at migration
    // time (schema migrations run at DB open, before the user has signed).
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
