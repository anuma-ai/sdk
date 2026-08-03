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

  it("v44 adds `media` to memory_vault, and the table carries it", () => {
    // The column that lets a server-extracted memory show the photo it came
    // from. Asserted on BOTH sides because WatermelonDB uses them for different
    // databases: an EXISTING device walks the migration, a fresh one is built
    // straight from the encoded schema — so a column present in only one place
    // works on exactly half the fleet.
    const v44 = sdkMigrations.sortedMigrations.find((m) => m.toVersion === 44);
    expect(v44).toBeDefined();
    // MigrationStep is a discriminated union (create_table | add_columns | sql),
    // so it has no structural overlap with an add_columns shape — narrow through
    // unknown rather than annotating the parameter.
    const added = (v44?.steps ?? []).flatMap((step) => {
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
