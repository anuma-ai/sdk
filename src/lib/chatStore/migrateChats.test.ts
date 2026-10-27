import { webcrypto } from "node:crypto";

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { clearEncryptionKey, seedEncryptionKeys } from "../../react/useEncryption";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import type { ChatBackend } from "../storage/ChatBackend";
import { localChatBackend } from "../storage/WatermelonChatStorageAdapter";
import { observeAll } from "../../../test/chat/chatObservation";
import { type ChatStoreHarness, createChatStoreHarness } from "../../../test/chat/vaultHarness";
import { type ChatMigrationOptions, migrateChatsToRemote } from "./migrateChats";
import { createVaultChatBackend, type VaultChatBackend } from "./vaultBackend";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

const open: VaultChatBackend[] = [];
afterEach(() => {
  open.splice(0).forEach((b) => b.close());
});

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `migrate-chats-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function unit(hot: number, dims = 1536): number[] {
  const v = new Array<number>(dims).fill(0);
  v[hot] = 1;
  return v;
}

function vault(harness: ChatStoreHarness): VaultChatBackend {
  const b = createVaultChatBackend({
    store: harness.store,
    pollIntervalMs: 0,
    activity: { isActive: () => true, subscribe: () => () => {} },
  });
  open.push(b);
  return b;
}

function migrate(
  database: Database,
  harness: ChatStoreHarness,
  extra: Partial<ChatMigrationOptions> = {}
) {
  return migrateChatsToRemote({
    database,
    store: harness.store,
    withWriteBarrier: (task) => task(),
    onActivated: () => {},
    ...extra,
  });
}

async function seed(local: ChatBackend) {
  await local.createConversation({ conversationId: "conv_trip", title: "Lisbon trip" });
  const user = await local.createMessage({
    conversationId: "conv_trip",
    role: "user",
    content: "plan three days in lisbon",
    uniqueId: "msg_1",
  });
  const reply = await local.createMessage({
    conversationId: "conv_trip",
    role: "assistant",
    content: "Day one: Alfama. Day two: Belem.",
    uniqueId: "msg_2",
    parentMessageId: user.uniqueId,
    model: "test-model",
    toolCallEvents: [{ id: "call_1", name: "search" }],
  });
  await local.updateMessageFeedback(reply.uniqueId, "like");
  await local.updateMessageChunks(
    reply.uniqueId,
    [
      { vector: unit(7), startOffset: 0, endOffset: 16 },
      { vector: unit(8), startOffset: 17, endOffset: 32 },
    ],
    "test-model"
  );
  await local.updateMessageEmbedding(user.uniqueId, unit(9), "test-model");
  await local.upsertSummary("conv_trip", "Planning Lisbon", reply.uniqueId, 12);
  await local.addMemoryLinks("conv_trip", [
    { memoryId: "mem_a", score: 0.9 },
    { memoryId: "mem_b", score: 0.4 },
  ]);
  await local.updateConversationPinned("conv_trip", true);
  await local.createConversation({ conversationId: "conv_gone", title: "Deleted chat" });
  await local.createMessage({ conversationId: "conv_gone", role: "user", content: "bye" });
  await local.deleteConversation("conv_gone");
}

const ids = ["conv_trip", "conv_gone"];

describe("migrateChatsToRemote", () => {
  it("moves every chat so a fresh device sees what this one saw", async () => {
    const database = makeDatabase();
    const local = localChatBackend(database)({});
    await seed(local);
    const harness = await createChatStoreHarness();
    const onActivated = vi.fn(async () => {
      expect((await harness.store.account()).state).toBe("active");
    });

    const result = await migrate(database, harness, { onActivated });

    expect(result).toMatchObject({
      state: "active",
      conversations: 1,
      messages: 2,
      skipped: [],
      untitled: 0,
      unembedded: 0,
    });
    expect(onActivated).toHaveBeenCalledTimes(1);
    expect(await database.localStorage.get("vault_chat_migration_uploads:")).toBeUndefined();
    const remote = vault(harness);
    expect(await observeAll(remote, ids)).toEqual(await observeAll(local, ids));
    expect((await harness.row("conversation", "conv_gone"))?.record.isDeleted).toBe(true);
    const hits = await remote.searchChunks(unit(8), { minSimilarity: 0.5 });
    expect(hits.map((h) => [h.message.uniqueId, h.chunkText])).toEqual([
      ["msg_2", "Day two: Belem."],
    ]);
  });

  it("resumes after an interrupted upload without sending anything twice", async () => {
    const database = makeDatabase();
    await seed(localChatBackend(database)({}));
    const harness = await createChatStoreHarness();
    harness.fail({ op: "importRecords", error: new TypeError("connection reset"), after: true });

    await expect(migrate(database, harness)).rejects.toThrow("connection reset");
    const imports = harness.calls.filter((c) => c === "importRecords").length;
    const resumed = await migrate(database, harness);

    expect(resumed.state).toBe("active");
    expect(resumed.imported).toBe(0);
    expect(harness.calls.filter((c) => c === "importRecords")).toHaveLength(imports);
    expect(await observeAll(vault(harness), ids)).toEqual(
      await observeAll(localChatBackend(database)({}), ids)
    );
  });

  it("deletes from vault what the device deleted after uploading it, across an interrupted run", async () => {
    const database = makeDatabase();
    const local = localChatBackend(database)({});
    await seed(local);
    const harness = await createChatStoreHarness();
    harness.fail({ op: "importRecords", error: new TypeError("connection reset"), after: true });
    await expect(migrate(database, harness)).rejects.toThrow("connection reset");

    await local.deleteMessage("msg_1");
    await local.deleteSummary("conv_trip");
    await local.clearMemoryLinks("conv_trip");
    const result = await migrate(database, harness);

    expect(result.state).toBe("active");
    for (const [kind, id] of [
      ["message", "msg_1"],
      ["summary", "conv_trip"],
      ["memory_links", "conv_trip"],
    ] as const)
      expect((await harness.row(kind, id))?.record.isDeleted).toBe(true);
    expect(await observeAll(vault(harness), ids)).toEqual(await observeAll(local, ids));
  });

  it("deletes from vault a message the device deleted while the copy ran", async () => {
    const database = makeDatabase();
    const local = localChatBackend(database)({});
    await seed(local);
    const harness = await createChatStoreHarness();
    let deleting: Promise<unknown> | undefined;

    const result = await migrate(database, harness, {
      onProgress: ({ imported: sent }) => {
        if (sent > 0) deleting ??= local.deleteMessage("msg_2");
      },
      withWriteBarrier: async (task) => {
        await deleting;
        return task();
      },
    });

    expect(result.state).toBe("active");
    expect((await harness.row("message", "msg_2"))?.record.isDeleted).toBe(true);
    expect(await observeAll(vault(harness), ids)).toEqual(await observeAll(local, ids));
  });

  it("uploads what was written during the copy in a final pass under the barrier", async () => {
    const database = makeDatabase();
    const local = localChatBackend(database)({});
    await seed(local);
    const harness = await createChatStoreHarness();
    const order: string[] = [];
    let wrote = false;

    const result = await migrate(database, harness, {
      onProgress: () => {
        if (wrote) return;
        wrote = true;
        void local.createMessage({
          conversationId: "conv_trip",
          role: "user",
          content: "written mid-copy",
          uniqueId: "msg_mid",
        });
      },
      withWriteBarrier: async (task) => {
        order.push("barrier");
        await local.createMessage({
          conversationId: "conv_trip",
          role: "user",
          content: "drained at the barrier",
          uniqueId: "msg_barrier",
        });
        return task();
      },
      onActivated: () => {
        order.push("handoff");
      },
    });

    expect(result.state).toBe("active");
    expect(order).toEqual(["barrier", "handoff"]);
    expect((await harness.row("message", "msg_mid"))?.record.data.content).toBe("written mid-copy");
    expect((await harness.row("message", "msg_barrier"))?.record.data.content).toBe(
      "drained at the barrier"
    );
  });

  it("leaves unreadable rows on the device and activates only when allowed", async () => {
    const wallet = "0x00000000000000000000000000000000000000c3";
    seedEncryptionKeys(wallet, { legacy: "33".repeat(32), current: "44".repeat(32) });
    const database = makeDatabase();
    const signer = { walletAddress: wallet, signMessage: () => Promise.reject(new Error("no")) };
    const encrypted = localChatBackend(database)(signer);
    await encrypted.createConversation({ conversationId: "conv_secret", title: "Secret" });
    await encrypted.createMessage({
      conversationId: "conv_secret",
      role: "user",
      content: "sealed",
      uniqueId: "msg_sealed",
    });
    clearEncryptionKey(wallet);
    const harness = await createChatStoreHarness();
    const onActivated = vi.fn();

    const held = await migrate(database, harness, { walletAddress: wallet, onActivated });
    expect(held).toMatchObject({
      state: "migrating",
      untitled: 1,
      skipped: [{ kind: "message", id: "msg_sealed", reason: "unreadable" }],
    });
    expect(onActivated).not.toHaveBeenCalled();
    expect(harness.calls).not.toContain("activate");

    const allowed = await migrate(database, harness, {
      walletAddress: wallet,
      onActivated,
      allowSkipped: true,
    });
    expect(allowed.state).toBe("active");
    expect(onActivated).toHaveBeenCalledTimes(1);
    expect(await harness.row("message", "msg_sealed")).toBeUndefined();
    expect((await harness.row("conversation", "conv_secret"))?.record.data.title).toBe("");
  });

  it("leaves rows it was given no key for on the device instead of uploading ciphertext", async () => {
    const wallet = "0x00000000000000000000000000000000000000c4";
    seedEncryptionKeys(wallet, { legacy: "55".repeat(32), current: "66".repeat(32) });
    const database = makeDatabase();
    const encrypted = localChatBackend(database)({
      walletAddress: wallet,
      signMessage: () => Promise.reject(new Error("no")),
    });
    await encrypted.createConversation({ conversationId: "conv_secret", title: "Secret" });
    await encrypted.createMessage({
      conversationId: "conv_secret",
      role: "assistant",
      content: "sealed",
      uniqueId: "msg_sealed",
      toolCallEvents: [{ id: "call_1", name: "search" }],
    });
    const harness = await createChatStoreHarness();

    const held = await migrate(database, harness);
    clearEncryptionKey(wallet);

    expect(held).toMatchObject({
      state: "migrating",
      untitled: 1,
      skipped: [{ kind: "message", id: "msg_sealed", reason: "unreadable" }],
    });
    expect(await harness.row("message", "msg_sealed")).toBeUndefined();
    expect((await harness.row("conversation", "conv_secret"))?.record.data.title).toBe("");
  });

  it("keeps vault's copy of an uploaded row the device can no longer read", async () => {
    const wallet = "0x00000000000000000000000000000000000000c5";
    seedEncryptionKeys(wallet, { legacy: "77".repeat(32), current: "88".repeat(32) });
    const database = makeDatabase();
    const signer = { walletAddress: wallet, signMessage: () => Promise.reject(new Error("no")) };
    const encrypted = localChatBackend(database)(signer);
    await encrypted.createConversation({ conversationId: "conv_lost", title: "Lost key" });
    await encrypted.createMessage({
      conversationId: "conv_lost",
      role: "user",
      content: "uploaded while readable",
      uniqueId: "msg_lost",
    });
    const harness = await createChatStoreHarness();
    harness.fail({ op: "importRecords", error: new TypeError("connection reset"), after: true });
    await expect(migrate(database, harness, { walletAddress: wallet })).rejects.toThrow();
    clearEncryptionKey(wallet);

    const held = await migrate(database, harness, { walletAddress: wallet });

    expect(held.skipped).toEqual([{ kind: "message", id: "msg_lost", reason: "unreadable" }]);
    expect((await harness.row("message", "msg_lost"))?.record).toMatchObject({
      isDeleted: false,
      data: { content: "uploaded while readable" },
    });
  });

  it("keeps the newest messages searchable when vectors exceed the quota", async () => {
    const database = makeDatabase();
    const local = localChatBackend(database)({});
    await local.createConversation({ conversationId: "conv_v", title: "V" });
    for (const [i, id] of ["msg_old", "msg_mid", "msg_new"].entries()) {
      await local.createMessage({
        conversationId: "conv_v",
        role: "user",
        content: id,
        uniqueId: id,
      });
      await local.updateMessageEmbedding(id, unit(20 + i), "test-model");
    }
    const harness = await createChatStoreHarness();

    const result = await migrate(database, harness, { maxVectors: 2 });

    expect(result.unembedded).toBe(1);
    const remote = vault(harness);
    expect(await remote.searchChunks(unit(20), { minSimilarity: 0.5 })).toEqual([]);
    expect((await remote.searchChunks(unit(22), { minSimilarity: 0.5 }))[0]?.message.uniqueId).toBe(
      "msg_new"
    );
    expect((await remote.getMessages("conv_v")).map((m) => m.uniqueId)).toEqual([
      "msg_old",
      "msg_mid",
      "msg_new",
    ]);
  });

  it("stops before uploading when the chats do not fit the account's storage", async () => {
    const database = makeDatabase();
    await seed(localChatBackend(database)({}));
    const harness = await createChatStoreHarness();

    await expect(migrate(database, harness, { maxStorageBytes: 100 })).rejects.toMatchObject({
      status: 413,
      code: "private_chat_storage_limit_reached",
    });
    expect(harness.calls).not.toContain("importRecords");
  });

  it("hands over a device with no chats without activating an empty account", async () => {
    const harness = await createChatStoreHarness();
    const onActivated = vi.fn();

    const result = await migrate(makeDatabase(), harness, { onActivated });

    expect(result).toMatchObject({ state: "active", conversations: 0, imported: 0 });
    expect(onActivated).toHaveBeenCalledTimes(1);
    expect(harness.calls).not.toContain("activate");
  });

  it("adds a late device's new chats without overwriting what vault already holds", async () => {
    const harness = await createChatStoreHarness();
    const first = makeDatabase();
    await localChatBackend(first)({}).createConversation({
      conversationId: "conv_shared",
      title: "From the first device",
    });
    await migrate(first, harness);

    const late = makeDatabase();
    const lateLocal = localChatBackend(late)({});
    await lateLocal.createConversation({ conversationId: "conv_shared", title: "Stale copy" });
    await lateLocal.createConversation({
      conversationId: "conv_new",
      title: "Only on the late device",
    });
    const result = await migrate(late, harness);

    expect(result.state).toBe("active");
    const remote = vault(harness);
    expect((await remote.getConversation("conv_shared"))?.title).toBe("From the first device");
    expect((await remote.getConversation("conv_new"))?.title).toBe("Only on the late device");
  });
});
