import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SOURCE_PHOTO } from "../../memory/decay";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import type { VaultMemory } from "./models";
import type { VaultMemoryOperationsContext } from "./operations";
import {
  getAllVaultMemoriesOp,
  getVaultMemoryOp,
  getVaultRankingProjectionsOp,
  updateVaultMemoryOp,
} from "./operations";
import { ingestPublishedPhotoMemoriesOp, type PublishedPhotoMemory } from "./photoIngest";

// Mock encryption so these tests need no wallet or real crypto. The ctx below
// supplies no walletAddress either, so ingest takes its plaintext branch — this
// mock only guards against an accidental call.
vi.mock("./encryption", () => ({
  encryptVaultMemoryContent: vi.fn(async (content: string) => `encrypted:${content}`),
  decryptVaultMemoryFields: vi.fn(async (memory: Record<string, unknown>) => ({
    ...memory,
    content: String(memory.content).replace("encrypted:", ""),
  })),
}));

/**
 * A REAL in-memory WatermelonDB, not a mock. Everything interesting about
 * ingest is a database property — that the server's id really becomes the row
 * id, that a second pass really writes nothing, that the row really reads back
 * as public — and a mocked collection would assert only that we called the
 * functions we called.
 */
function makeRealDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `photo-ingest-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

const FACT_ID = "photo:42:fact:00";
const CAPTION_ID = "photo:42:caption";

function publishedRow(overrides: Partial<PublishedPhotoMemory> = {}): PublishedPhotoMemory {
  return {
    memoryId: FACT_ID,
    text: "Hikes mountain trails",
    media: [{ feedItemId: 42, objectKey: "nearby/1/feed/a.jpg" }],
    ...overrides,
  };
}

describe("ingestPublishedPhotoMemoriesOp", () => {
  let db: Database;
  let ctx: VaultMemoryOperationsContext;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeRealDatabase();
    // No wallet → content is stored as plaintext, so assertions can read it back.
    ctx = { database: db, vaultMemoryCollection: db.get<VaultMemory>("memory_vault") };
  });

  it("writes a fresh photo memory under the SERVER's id, public, sourced photo", async () => {
    const result = await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow()]);
    expect(result).toEqual({ inserted: 1, skipped: 0 });

    // The row id IS the server's memory_id. This is the whole mechanism behind
    // revoke: the reconciler's ledger and its toRevoke list key on this string,
    // so a locally-minted id would leave the user with an unreachable switch.
    const stored = await getVaultMemoryOp(ctx, FACT_ID);
    expect(stored).not.toBeNull();
    expect(stored?.uniqueId).toBe(FACT_ID);

    expect(stored?.content).toBe("Hikes mountain trails");
    // Genuinely published, and `scope` is the field that says so — it is the
    // publication axis the reconciler reads. `visibility` is the legacy column,
    // stamped only so an older build still reads the row as published.
    expect(stored?.scope).toBe("shared");
    expect(stored?.visibility).toBe("public");
    expect(stored?.publishedAt).not.toBeNull();
    // Not "manual": that would make it immortal by accident. See the decay test.
    expect(stored?.source).toBe(SOURCE_PHOTO);
    expect(stored?.media).toEqual([{ feedItemId: 42, objectKey: "nearby/1/feed/a.jpg" }]);
  });

  it("lands in the published-set read, so the consent switch can revoke it", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow()]);

    // This mirrors the client's publishedSetQuery() — {scopes:['shared']} — the
    // exact read the publish reconciler builds its `local` set from. A row that
    // is absent here never reaches `desired`, is never adopted into the ledger,
    // and `toRevoke` only ever holds ids the ledger already has. So a row
    // outside this read can NEVER be revoked: the user's off-toggle and delete
    // do nothing server-side while nearby keeps serving the memory.
    const published = await getVaultRankingProjectionsOp(ctx, { scopes: ["shared"] });
    expect(published.map((m) => m.uniqueId)).toContain(FACT_ID);
  });

  it("is a no-op on re-run — the same rows a second time insert nothing", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow(),
      publishedRow({ memoryId: CAPTION_ID, text: "third weekend up here" }),
    ]);

    const second = await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow(),
      publishedRow({ memoryId: CAPTION_ID, text: "third weekend up here" }),
    ]);
    expect(second).toEqual({ inserted: 0, skipped: 2 });

    // And no duplicates landed: two ids in, two rows total.
    const all = await getAllVaultMemoriesOp(ctx);
    expect(all).toHaveLength(2);
  });

  it("leaves an existing row alone when the server's text has changed", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow({ text: "original text" })]);

    const result = await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow({ text: "server rewrote this" }),
    ]);
    expect(result).toEqual({ inserted: 0, skipped: 1 });

    // Deliberate: the local row is the USER's copy and may have been edited.
    // Silently overwriting it to match the server is the same class of bug as
    // publishing a version the user has since changed. Re-ingesting changed text
    // needs a merge decision, which is a follow-up, not a clobber.
    const stored = await getVaultMemoryOp(ctx, FACT_ID);
    expect(stored?.content).toBe("original text");
  });

  it("does not re-stamp the scope of a row the user turned off", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow()]);
    // The user turns the memory off. This is the real toggle path: the sheet
    // calls updateVaultMemoryOp with the new scope.
    await updateVaultMemoryOp(ctx, FACT_ID, {
      content: "Hikes mountain trails",
      scope: "private",
    });

    // The server has not dropped it yet — the revoke happens later in the same
    // pass — so the next pass still receives the row in its published set.
    const result = await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow()]);
    expect(result).toEqual({ inserted: 0, skipped: 1 });

    // Ingest MUST leave it private. Repairing an old mis-stamped row from here
    // is unsound and this is the case that proves it: the toggle writes `scope`
    // and never touches `visibility`, so a row the user just turned off carries
    // the exact columns a mis-stamped row does. A repair here could not tell
    // them apart, and because the pass runs ingest BEFORE it reads the vault,
    // re-stamping would put the row back in the desired set, `toRevoke` would
    // never see it, and the switch would spring back to "on".
    const stored = await getVaultMemoryOp(ctx, FACT_ID);
    expect(stored?.scope).toBe("private");
    expect(stored?.visibility).toBe("public");

    // And it is out of the published-set read, which is what lets the revoke run.
    const published = await getVaultRankingProjectionsOp(ctx, { scopes: ["shared"] });
    expect(published.map((m) => m.uniqueId)).not.toContain(FACT_ID);
  });

  it("accepts a row with no media", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow({ memoryId: "photo:7:fact:03", media: null }),
    ]);
    const stored = await getVaultMemoryOp(ctx, "photo:7:fact:03");
    expect(stored).not.toBeNull();
    // Null, not [] — "this memory has no photo behind it" is the same state as
    // every non-photo row in the vault, and parseMedia reads both as null.
    expect(stored?.media).toBeNull();
  });

  it("round-trips an event time onto the existing temporal columns", async () => {
    const start = Date.UTC(2026, 4, 1);
    const end = Date.UTC(2026, 4, 3);
    await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow({ memoryId: "photo:9:fact:01", eventTime: { start, end, kind: "range" } }),
    ]);

    const stored = await getVaultMemoryOp(ctx, "photo:9:fact:01");
    expect(stored?.eventTimeStart).toBe(start);
    expect(stored?.eventTimeEnd).toBe(end);
    expect(stored?.eventTimeKind).toBe("range");
  });

  it("ignores ids outside the server's photo namespace", async () => {
    // Everything else in the published set is a client-published memory, which
    // by definition already lives in this vault (or in another device's, which
    // is not ours to recreate).
    const result = await ingestPublishedPhotoMemoriesOp(ctx, [
      { memoryId: "local-uuid-1234", text: "a chat memory" },
    ]);
    expect(result).toEqual({ inserted: 0, skipped: 0 });
    expect(await getAllVaultMemoriesOp(ctx)).toHaveLength(0);
  });

  it("collapses a duplicate memoryId in one batch instead of throwing", async () => {
    // Every row is created with the server's memory_id AS the primary key, so two
    // entries carrying the same id are two creates of the same key — which throws
    // out of database.batch and takes the whole ingest with it, including the
    // unrelated rows that were fine. A repeated id is one memory.
    const result = await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow(),
      publishedRow(), // same id
      publishedRow({ memoryId: CAPTION_ID, text: "my own words" }),
    ]);

    expect(result).toEqual({ inserted: 2, skipped: 0 });
    const all = await getAllVaultMemoriesOp(ctx);
    expect(all).toHaveLength(2);
    // And the survivor is intact, not a half-written casualty of a thrown batch.
    expect((await getVaultMemoryOp(ctx, CAPTION_ID))?.content).toBe("my own words");
  });

  it("inserts only the rows the vault lacks, in a mixed batch", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow()]);

    const result = await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow(), // already there
      publishedRow({ memoryId: CAPTION_ID, text: "my own words" }), // new
      { memoryId: "local-uuid-9", text: "chat memory" }, // not ours
    ]);
    expect(result).toEqual({ inserted: 1, skipped: 1 });
    expect(await getAllVaultMemoriesOp(ctx)).toHaveLength(2);
  });
});
