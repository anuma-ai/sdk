import { webcrypto } from "node:crypto";

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createChatStoreHarness } from "../../../test/chat/vaultHarness";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import { getAppFile, loadSavedTools, saveAppFile } from "./appFiles";
import { seedAppFilesToVault } from "./seedAppFiles";

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

    expect(result).toEqual({ appFiles: 1, savedTools: 1, orphaned: 1 });
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
    });
    expect(harness.calls.filter((c) => c === "putMany")).toHaveLength(writes);
  });
});
