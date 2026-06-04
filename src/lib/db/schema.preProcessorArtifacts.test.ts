// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it } from "vitest";

import { SDK_SCHEMA_VERSION, sdkMigrations, sdkModelClasses, sdkSchema } from "./schema";

/**
 * Migration v31 → v32 is additive (one nullable column on `history`). LokiJS
 * tests run in-memory with a fresh schema each time, so we can't *replay* a
 * real cross-version migration here — instead we assert the migration entry
 * has the right shape, the schema version bumped, and the new column is
 * present + nullable so old rows survive without backfill.
 */
describe("schema v32: pre_processor_artifacts column", () => {
  it("SDK_SCHEMA_VERSION is at least 32", () => {
    expect(SDK_SCHEMA_VERSION).toBeGreaterThanOrEqual(32);
  });

  it("history table has pre_processor_artifacts as an optional string column", () => {
    const history = sdkSchema.tables["history"];
    expect(history).toBeDefined();
    const col = history.columns["pre_processor_artifacts"];
    expect(col).toMatchObject({
      name: "pre_processor_artifacts",
      type: "string",
      isOptional: true,
    });
  });

  it("sdkMigrations includes a v32 entry with addColumns on history", () => {
    // WatermelonDB's `schemaMigrations` strips/normalizes the migrations
    // array, but the input shape comes back on `sortedMigrations`.
    const migrations = (sdkMigrations as unknown as { sortedMigrations: unknown[] })
      .sortedMigrations;
    const v32 = (
      migrations as Array<{ toVersion: number; steps: Array<Record<string, unknown>> }>
    ).find((m) => m.toVersion === 32);
    expect(v32).toBeDefined();
    expect(v32?.steps).toHaveLength(1);
    expect(v32?.steps[0]).toMatchObject({
      type: "add_columns",
      table: "history",
      columns: [{ name: "pre_processor_artifacts", type: "string", isOptional: true }],
    });
  });

  it("rows without pre_processor_artifacts read back null-safe (forward-compat for pre-v32 rows)", async () => {
    const adapter = new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `pp-art-mig-test-${Math.random().toString(36).slice(2)}`,
    });
    const database = new Database({ adapter, modelClasses: sdkModelClasses });
    const conversations = database.get("conversations");
    const history = database.get("history");

    await database.write(async () => {
      await conversations.create((c) => {
        c._setRaw("conversation_id", "conv");
        c._setRaw("title", "t");
        c._setRaw("created_at", Date.now());
        c._setRaw("updated_at", Date.now());
        c._setRaw("is_deleted", false);
      });
      // Insert a row WITHOUT touching pre_processor_artifacts — emulates a
      // row written before v32 land (column stays at the schema default).
      await history.create((m) => {
        m._setRaw("message_id", 1);
        m._setRaw("conversation_id", "conv");
        m._setRaw("role", "assistant");
        m._setRaw("content", "older content");
        m._setRaw("created_at", Date.now());
        m._setRaw("updated_at", Date.now());
      });
    });

    const rows = await history.query().fetch();
    expect(rows).toHaveLength(1);
    expect(
      (rows[0] as unknown as { preProcessorArtifacts?: unknown }).preProcessorArtifacts
    ).toBeUndefined();
  });
});
