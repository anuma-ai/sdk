// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Media } from "./models";
import { setMediaColdStateOp } from "./operations";
import type { MediaOperationsContext } from "./types";

const WALLET = "0xwallet";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `coldstate-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

async function insertMedia(db: Database, mediaId: string, createdUpdatedAt: number): Promise<void> {
  const collection = db.get<Media>("media");
  await db.write(async () => {
    await collection.create((m) => {
      m._setRaw("media_id", mediaId);
      m._setRaw("wallet_address", WALLET);
      m._setRaw("name", mediaId);
      m._setRaw("mime_type", "image/png");
      m._setRaw("media_type", "image");
      m._setRaw("size", 0);
      m._setRaw("role", "assistant");
      m._setRaw("is_deleted", false);
      m._setRaw("created_at", createdUpdatedAt);
      m._setRaw("updated_at", createdUpdatedAt);
    });
  });
}

async function getMedia(db: Database, mediaId: string): Promise<Media> {
  const all = await db.get<Media>("media").query().fetch();
  const found = all.find((r) => r.mediaId === mediaId);
  if (!found) throw new Error(`media ${mediaId} not found`);
  return found;
}

describe("setMediaColdStateOp", () => {
  let db: Database;
  const ctx = () => ({ database: db, walletAddress: WALLET }) as MediaOperationsContext;

  beforeEach(() => {
    db = makeDatabase();
  });

  it("sets is_cold + last_accessed_at without bumping updated_at (device-local)", async () => {
    const t0 = 1_700_000_000_000;
    await insertMedia(db, "m1", t0);

    const ok = await setMediaColdStateOp(ctx(), "m1", { isCold: true, lastAccessedAt: 1_800 });
    expect(ok).toBe(true);

    const m = await getMedia(db, "m1");
    expect(m.isCold).toBe(true);
    expect(m.lastAccessedAt).toBe(1_800);
    // The whole point: device-local bookkeeping must NOT mark the row dirty for sync.
    expect(m.updatedAt.getTime()).toBe(t0);
  });

  it("updates only the provided field", async () => {
    await insertMedia(db, "m2", 1);
    await setMediaColdStateOp(ctx(), "m2", { lastAccessedAt: 42 });
    const m = await getMedia(db, "m2");
    expect(m.lastAccessedAt).toBe(42);
    // is_cold defaulted to false by the migration, untouched here
    expect(m.isCold).toBe(false);
  });

  it("returns false when no media row matches", async () => {
    expect(await setMediaColdStateOp(ctx(), "missing", { isCold: true })).toBe(false);
  });
});
