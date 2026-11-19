// @vitest-environment node
import { createRequire } from "node:module";

import type { Collection } from "@nozbe/watermelondb";
import { describe, expect, it } from "vitest";

import { sdkMigrations, sdkSchema } from "../schema";
import type { VaultMemory } from "./models";
import {
  getAllVaultMemoriesOp,
  getVaultCandidateKeysOp,
  type VaultMemoryOperationsContext,
} from "./operations";

type SqlValue = string | number | null;
type SqliteDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: (...values: SqlValue[]) => Record<string, unknown>[];
    run: (...values: SqlValue[]) => unknown;
  };
};

const requireNode = createRequire(import.meta.url);
const { DatabaseSync } = requireNode("node:sqlite") as {
  DatabaseSync: new (path: string) => SqliteDb;
};
const { encodeSchema, encodeMigrationSteps } = requireNode(
  "@nozbe/watermelondb/adapters/sqlite/encodeSchema"
) as {
  encodeSchema: (schema: typeof sdkSchema) => string;
  encodeMigrationSteps: (steps: unknown[]) => string;
};

function insertRow(db: SqliteDb, id: string, enabled?: number | null): void {
  const columns = ["id", "_status", "content", "scope", "created_at", "updated_at", "is_deleted"];
  const values: SqlValue[] = [id, "created", id, "private", 1, 1, 0];
  if (enabled !== undefined) {
    columns.push("enabled");
    values.push(enabled);
  }
  db.prepare(
    `insert into "memory_vault" (${columns.map((c) => `"${c}"`).join(",")}) values (${columns.map(() => "?").join(",")})`
  ).run(...values);
}

function sqliteCtx(db: SqliteDb): VaultMemoryOperationsContext {
  const query = (...clauses: { type?: string; sql?: string; values?: SqlValue[] }[]) => ({
    unsafeFetchRaw: async () => {
      const [first] = clauses;
      if (first?.type === "sqlQuery") return db.prepare(first.sql!).all(...(first.values ?? []));
      return db.prepare(`select * from "memory_vault"`).all();
    },
  });
  return {
    database: {} as VaultMemoryOperationsContext["database"],
    vaultMemoryCollection: { query } as unknown as Collection<VaultMemory>,
  };
}

describe("memory_vault enabled on SQLite", () => {
  it("keeps NULL and on rows in recall reads and drops switched-off rows", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(encodeSchema(sdkSchema));
    insertRow(db, "legacy", null);
    insertRow(db, "on", 1);
    insertRow(db, "off", 0);
    const ctx = sqliteCtx(db);

    const ids = (keys: { uniqueId: string }[]) => keys.map((k) => k.uniqueId).sort();
    expect(ids(await getVaultCandidateKeysOp(ctx, { excludeDisabled: true }))).toEqual([
      "legacy",
      "on",
    ]);
    expect(ids(await getVaultCandidateKeysOp(ctx))).toEqual(["legacy", "off", "on"]);
  });

  it("migrates a v49 row to v50 as on with no recalls", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(encodeSchema(sdkSchema));
    db.exec(`alter table "memory_vault" drop column "enabled"`);
    db.exec(`alter table "memory_vault" drop column "recall_count"`);
    insertRow(db, "before");

    const v50 = sdkMigrations.sortedMigrations.find((m) => m.toVersion === 50);
    db.exec(encodeMigrationSteps(v50!.steps));

    const [row] = db.prepare(`select "enabled", "recall_count" from "memory_vault"`).all();
    expect(row).toEqual({ enabled: null, recall_count: null });
    const [stored] = await getAllVaultMemoriesOp(sqliteCtx(db));
    expect(stored).toMatchObject({ uniqueId: "before", enabled: true, recallCount: 0 });
  });
});
