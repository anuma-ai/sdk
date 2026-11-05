import { webcrypto } from "node:crypto";

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createChatStoreHarness } from "../../../test/chat/vaultHarness";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import { appFileId, getAppFile, loadSavedTools, saveAppFile } from "./appFiles";
import { seedAppFilesToVault } from "./seedAppFiles";
import { ChatStoreError, type ChatWrite } from "./types";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `seed-app-files-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

async function seedDevice(
  database: Database,
  files: { conversationId: string; path: string; content: string; updatedAt: number }[],
  tools: { name: string; deleted?: boolean; updatedAt: number }[] = []
) {
  await database.write(async () => {
    for (const f of files)
      await database.get("app_files").create((row) => {
        Object.assign(row._raw, {
          conversation_id: f.conversationId,
          path: f.path,
          content: f.content,
          created_at: 1,
          updated_at: f.updatedAt,
        });
      });
    for (const t of tools)
      await database.get("saved_tools").create((row) => {
        Object.assign(row._raw, {
          name: t.name,
          display_name: t.name,
          description: "d",
          parameters: "{}",
          html: "<main></main>",
          conversation_id: "conv_1",
          created_at: 1,
          updated_at: t.updatedAt,
          is_deleted: t.deleted ?? false,
        });
      });
  });
}

async function vaultWithConversation() {
  const harness = await createChatStoreHarness();
  await harness.write([
    {
      record: {
        kind: "conversation",
        id: "conv_1",
        conversationId: "",
        sortKey: 1,
        createdAt: 1,
        updatedAt: 1,
        isDeleted: false,
        data: {},
      },
      expectedVersion: 0,
    },
  ]);
  return harness;
}

describe("seedAppFilesToVault", () => {
  it("uploads the device's files and saved tools, keeping vault's newer copy and skipping files of chats vault lacks", async () => {
    const harness = await vaultWithConversation();
    const { store } = harness;
    await saveAppFile(store, { conversationId: "conv_1", path: "/kept.html", content: "vault" });
    const database = makeDatabase();
    await seedDevice(
      database,
      [
        { conversationId: "conv_1", path: "/slides.jsx", content: "deck", updatedAt: 5 },
        { conversationId: "conv_1", path: "/kept.html", content: "device", updatedAt: 1 },
        { conversationId: "conv_gone", path: "/a.html", content: "orphan", updatedAt: 5 },
      ],
      [
        { name: "tip_calculator", updatedAt: 5 },
        { name: "removed", deleted: true, updatedAt: 5 },
      ]
    );

    const result = await seedAppFilesToVault(database, store);

    expect(result).toEqual({ appFiles: 1, savedTools: 1, orphaned: 1, tooLarge: 0 });
    expect((await getAppFile(store, "conv_1", "/slides.jsx"))?.content).toBe("deck");
    expect((await getAppFile(store, "conv_1", "/kept.html"))?.content).toBe("vault");
    expect((await loadSavedTools(store)).map((t) => t.name)).toEqual(["tip_calculator"]);
  });

  it("sends nothing when run again", async () => {
    const harness = await vaultWithConversation();
    const database = makeDatabase();
    await seedDevice(
      database,
      [{ conversationId: "conv_1", path: "/slides.jsx", content: "deck", updatedAt: 5 }],
      [{ name: "tip_calculator", updatedAt: 5 }]
    );
    await seedAppFilesToVault(database, harness.store);
    const writes = harness.calls.filter((c) => c === "putMany").length;

    expect(await seedAppFilesToVault(database, harness.store)).toEqual({
      appFiles: 0,
      savedTools: 0,
      orphaned: 0,
      tooLarge: 0,
    });
    expect(harness.calls.filter((c) => c === "putMany")).toHaveLength(writes);
  });

  it("lets the newest edit win when two devices move the same file, whichever goes first", async () => {
    const harness = await vaultWithConversation();
    const older = makeDatabase();
    const newer = makeDatabase();
    await seedDevice(older, [
      { conversationId: "conv_1", path: "slides.jsx", content: "older", updatedAt: 5 },
    ]);
    await seedDevice(newer, [
      { conversationId: "conv_1", path: "slides.jsx", content: "newer", updatedAt: 9 },
    ]);

    await seedAppFilesToVault(older, harness.store);
    await seedAppFilesToVault(newer, harness.store);
    expect((await getAppFile(harness.store, "conv_1", "slides.jsx"))?.content).toBe("newer");

    await seedAppFilesToVault(older, harness.store);
    expect(await getAppFile(harness.store, "conv_1", "slides.jsx")).toMatchObject({
      content: "newer",
      updatedAt: 9,
    });
  });

  it("never overwrites an edit another device saved while the move was writing", async () => {
    const harness = await vaultWithConversation();
    const database = makeDatabase();
    await seedDevice(database, [
      { conversationId: "conv_1", path: "slides.jsx", content: "device", updatedAt: 5 },
    ]);
    const putMany = harness.store.putMany.bind(harness.store);
    let raced = false;
    harness.store.putMany = async (writes: readonly ChatWrite[], signal?: AbortSignal) => {
      if (!raced) {
        raced = true;
        await saveAppFile(harness.store, {
          conversationId: "conv_1",
          path: "slides.jsx",
          content: "edited elsewhere",
        });
      }
      return putMany(writes, signal);
    };

    expect((await seedAppFilesToVault(database, harness.store)).appFiles).toBe(0);
    expect((await getAppFile(harness.store, "conv_1", "slides.jsx"))?.content).toBe(
      "edited elsewhere"
    );
  });

  it("leaves a file too large for one record on the device and keeps moving the rest", async () => {
    const harness = await vaultWithConversation();
    const database = makeDatabase();
    await seedDevice(database, [
      { conversationId: "conv_1", path: "huge.html", content: "x", updatedAt: 5 },
      { conversationId: "conv_1", path: "small.html", content: "fits", updatedAt: 5 },
    ]);
    const huge = await appFileId("conv_1", "huge.html");
    const putMany = harness.store.putMany.bind(harness.store);
    harness.store.putMany = (writes: readonly ChatWrite[], signal?: AbortSignal) =>
      writes.some((w) => w.record.id === huge)
        ? Promise.reject(new ChatStoreError("too large", 413, "record_too_large"))
        : putMany(writes, signal);

    expect(await seedAppFilesToVault(database, harness.store)).toEqual({
      appFiles: 1,
      savedTools: 0,
      orphaned: 0,
      tooLarge: 1,
    });
    expect((await getAppFile(harness.store, "conv_1", "small.html"))?.content).toBe("fits");
  });

  it("leaves a file vault deleted deleted", async () => {
    const harness = await vaultWithConversation();
    await saveAppFile(harness.store, { conversationId: "conv_1", path: "a.html", content: "a" });
    const { deleteAppFile } = await import("./appFiles");
    await deleteAppFile(harness.store, "conv_1", "a.html");
    const database = makeDatabase();
    await seedDevice(database, [
      {
        conversationId: "conv_1",
        path: "a.html",
        content: "device",
        updatedAt: Date.now() + 60_000,
      },
    ]);

    expect((await seedAppFilesToVault(database, harness.store)).appFiles).toBe(0);
    expect(await getAppFile(harness.store, "conv_1", "a.html")).toBeNull();
  });
});
