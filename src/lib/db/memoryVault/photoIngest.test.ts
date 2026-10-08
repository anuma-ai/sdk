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

vi.mock("./encryption", () => ({
  encryptVaultMemoryContent: vi.fn(async (content: string) => `encrypted:${content}`),
  decryptVaultMemoryFields: vi.fn(async (memory: Record<string, unknown>) => ({
    ...memory,
    content: String(memory.content).replace("encrypted:", ""),
  })),
}));

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
    ctx = { database: db, vaultMemoryCollection: db.get<VaultMemory>("memory_vault") };
  });

  it("writes a fresh photo memory under the SERVER's id, public, sourced photo", async () => {
    const result = await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow()]);
    expect(result).toEqual({ inserted: 1, skipped: 0 });

    const stored = await getVaultMemoryOp(ctx, FACT_ID);
    expect(stored).not.toBeNull();
    expect(stored?.uniqueId).toBe(FACT_ID);

    expect(stored?.content).toBe("Hikes mountain trails");
    expect(stored?.scope).toBe("shared");
    expect(stored?.visibility).toBe("public");
    expect(stored?.publishedAt).not.toBeNull();
    expect(stored?.source).toBe(SOURCE_PHOTO);
    expect(stored?.media).toEqual([{ feedItemId: 42, objectKey: "nearby/1/feed/a.jpg" }]);
  });

  it("lands in the published-set read, so the consent switch can revoke it", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow()]);

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

    const all = await getAllVaultMemoriesOp(ctx);
    expect(all).toHaveLength(2);
  });

  it("leaves an existing row alone when the server's text has changed", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow({ text: "original text" })]);

    const result = await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow({ text: "server rewrote this" }),
    ]);
    expect(result).toEqual({ inserted: 0, skipped: 1 });

    const stored = await getVaultMemoryOp(ctx, FACT_ID);
    expect(stored?.content).toBe("original text");
  });

  it("does not re-stamp the scope of a row the user turned off", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow()]);
    await updateVaultMemoryOp(ctx, FACT_ID, {
      content: "Hikes mountain trails",
      scope: "private",
    });

    const result = await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow()]);
    expect(result).toEqual({ inserted: 0, skipped: 1 });

    const stored = await getVaultMemoryOp(ctx, FACT_ID);
    expect(stored?.scope).toBe("private");
    expect(stored?.visibility).toBe("public");

    const published = await getVaultRankingProjectionsOp(ctx, { scopes: ["shared"] });
    expect(published.map((m) => m.uniqueId)).not.toContain(FACT_ID);
  });

  it("accepts a row with no media", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow({ memoryId: "photo:7:fact:03", media: null }),
    ]);
    const stored = await getVaultMemoryOp(ctx, "photo:7:fact:03");
    expect(stored).not.toBeNull();
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
    const result = await ingestPublishedPhotoMemoriesOp(ctx, [
      { memoryId: "local-uuid-1234", text: "a chat memory" },
    ]);
    expect(result).toEqual({ inserted: 0, skipped: 0 });
    expect(await getAllVaultMemoriesOp(ctx)).toHaveLength(0);
  });

  it("collapses a duplicate memoryId in one batch instead of throwing", async () => {
    const result = await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow(),
      publishedRow(),
      publishedRow({ memoryId: CAPTION_ID, text: "my own words" }),
    ]);

    expect(result).toEqual({ inserted: 2, skipped: 0 });
    const all = await getAllVaultMemoriesOp(ctx);
    expect(all).toHaveLength(2);
    expect((await getVaultMemoryOp(ctx, CAPTION_ID))?.content).toBe("my own words");
  });

  it("inserts only the rows the vault lacks, in a mixed batch", async () => {
    await ingestPublishedPhotoMemoriesOp(ctx, [publishedRow()]);

    const result = await ingestPublishedPhotoMemoriesOp(ctx, [
      publishedRow(),
      publishedRow({ memoryId: CAPTION_ID, text: "my own words" }),
      { memoryId: "local-uuid-9", text: "chat memory" },
    ]);
    expect(result).toEqual({ inserted: 1, skipped: 1 });
    expect(await getAllVaultMemoriesOp(ctx)).toHaveLength(2);
  });
});
