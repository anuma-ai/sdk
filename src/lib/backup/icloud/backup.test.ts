import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearMessagesOp,
  createConversationOp,
  createMessageOp,
  deleteMessageOp,
  getMessagesOp,
  type StorageOperationsContext,
  updateConversationTitleOp,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
  upsertMessageOp,
} from "../../db/chat/operations";
import type { StoredMessage } from "../../db/chat/types";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../../db/schema";
import { performICloudExport, performICloudImport } from "./backup";

interface RemoteRecord {
  recordName: string;
  recordType: string;
  fields: Record<string, { value: unknown }>;
  modified?: { timestamp: number };
}

async function setup() {
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `icloud-backup-${Math.random().toString(36).slice(2)}`,
    }),
    modelClasses: sdkModelClasses,
  });
  const ctx: StorageOperationsContext = {
    database,
    conversationsCollection: database.get("conversations"),
    messagesCollection: database.get("history"),
  };
  const records = new Map<string, RemoteRecord>();
  const saveRecords = vi.fn((record: RemoteRecord) => {
    const saved = { ...record, modified: { timestamp: Date.now() + 60_000 } };
    records.set(saved.recordName, saved);
    return Promise.resolve({ records: [saved] });
  });
  vi.stubGlobal("CloudKit", {
    getDefaultContainer: () => ({
      privateCloudDatabase: {
        saveRecords,
        performQuery: (query: { filterBy?: { fieldValue: { value: string } }[] }) =>
          Promise.resolve({
            records: [...records.values()].filter(
              (record) =>
                !query.filterBy ||
                record.fields.filename.value === query.filterBy[0].fieldValue.value
            ),
          }),
        fetchRecords: (requested: { recordName: string }[]) =>
          Promise.resolve({
            records: requested.flatMap(({ recordName }) => {
              const record = records.get(recordName);
              return record ? [record] : [];
            }),
          }),
      },
    }),
  });

  await createConversationOp(ctx, { conversationId: "conv_1", title: "Test" });
  await createMessageOp(ctx, {
    conversationId: "conv_1",
    uniqueId: "m1",
    role: "user",
    content: "first turn",
  });

  const exportMessages = async () => ({
    success: true,
    blob: new Blob([JSON.stringify(await getMessagesOp(ctx, "conv_1"))]),
  });
  let restored: StoredMessage[] = [];
  const deps = {
    requestICloudAccess: vi.fn(async () => {}),
    requestEncryptionKey: vi.fn(async () => {}),
    exportConversation: vi.fn(exportMessages),
    importConversation: vi.fn(async (blob: Blob) => {
      restored = JSON.parse(await blob.text()) as StoredMessage[];
      return { success: true };
    }),
  };
  return {
    ctx,
    deps,
    records,
    saveRecords,
    exportMessages,
    backup: () => performICloudExport(database, "wallet", deps),
    restore: async () => {
      expect(await performICloudImport("wallet", deps)).toEqual({
        success: true,
        restored: 1,
        failed: 0,
        total: 1,
      });
      return restored.map((message) => message.content);
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("iCloud backup revisions", () => {
  it("backs up new messages without a conversation metadata change", async () => {
    const { ctx, deps, backup, restore } = await setup();
    const [conversation] = await ctx.conversationsCollection.query().fetch();
    const updatedAt = conversation.updatedAt.getTime();

    expect(await backup()).toMatchObject({ uploaded: 1, skipped: 0 });
    expect(await backup()).toMatchObject({ uploaded: 0, skipped: 1 });
    vi.setSystemTime(Date.now() + 1_000);
    await createMessageOp(ctx, {
      conversationId: "conv_1",
      uniqueId: "m2",
      role: "assistant",
      content: "later turn",
    });

    expect(conversation.updatedAt.getTime()).toBe(updatedAt);
    expect(await backup()).toMatchObject({ uploaded: 1, skipped: 0 });
    expect(await restore()).toEqual(["first turn", "later turn"]);
    expect(await backup()).toMatchObject({ uploaded: 0, skipped: 1 });
    expect(deps.exportConversation).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["edit a message", ["edited turn", "second turn"]],
    ["delete the newest message", ["first turn"]],
    ["delete an older message", ["second turn"]],
    ["clear all messages", []],
  ] as const)("backs up a change that must %s", async (change, expected) => {
    const { ctx, backup, restore } = await setup();
    await createMessageOp(ctx, {
      conversationId: "conv_1",
      uniqueId: "m2",
      role: "assistant",
      content: "second turn",
    });
    expect(await backup()).toMatchObject({ uploaded: 1 });

    if (change === "edit a message") {
      await upsertMessageOp(ctx, {
        conversationId: "conv_1",
        uniqueId: "m1",
        role: "user",
        content: "edited turn",
      });
    } else if (change === "delete the newest message") {
      await deleteMessageOp(ctx, "m2");
    } else if (change === "delete an older message") {
      await deleteMessageOp(ctx, "m1");
    } else {
      await clearMessagesOp(ctx, "conv_1");
    }

    expect(await backup()).toMatchObject({ uploaded: 1, skipped: 0 });
    expect(await restore()).toEqual(expected);
    expect(await backup()).toMatchObject({ uploaded: 0, skipped: 1 });
  });

  it("backs up conversation metadata changes within the same millisecond", async () => {
    const { ctx, backup } = await setup();
    expect(await backup()).toMatchObject({ uploaded: 1 });
    await updateConversationTitleOp(ctx, "conv_1", "New title");
    expect(await backup()).toMatchObject({ uploaded: 1, skipped: 0 });
    expect(await backup()).toMatchObject({ uploaded: 0, skipped: 1 });
  });

  it("skips a backup when only the embedding sweep changed a message", async () => {
    const { ctx, deps, backup } = await setup();
    expect(await backup()).toMatchObject({ uploaded: 1 });
    vi.setSystemTime(Date.now() + 1_000);
    await updateMessageEmbeddingOp(ctx, "m1", [0.1, 0.2], "model-a");
    await updateMessageChunksOp(
      ctx,
      "m1",
      [{ text: "first turn", vector: [0.1, 0.2], startOffset: 0, endOffset: 10 }],
      "model-a"
    );
    expect(await backup()).toMatchObject({ uploaded: 0, skipped: 1 });
    expect(deps.exportConversation).toHaveBeenCalledTimes(1);
  });

  it("replaces a legacy backup that has no saved revision", async () => {
    const { records, backup } = await setup();
    expect(await backup()).toMatchObject({ uploaded: 1 });
    delete records.get("backup_conv_1_json")!.fields.backupRevision;
    expect(await backup()).toMatchObject({ uploaded: 1, skipped: 0 });
    expect(await backup()).toMatchObject({ uploaded: 0, skipped: 1 });
  });

  it("retries a revision after an upload failure", async () => {
    const { ctx, saveRecords, backup, restore } = await setup();
    expect(await backup()).toMatchObject({ uploaded: 1 });
    await deleteMessageOp(ctx, "m1");
    saveRecords.mockRejectedValueOnce(new Error("Upload failed"));
    expect(await backup()).toMatchObject({ uploaded: 0, skipped: 0 });
    expect(await backup()).toMatchObject({ uploaded: 1, skipped: 0 });
    expect(await restore()).toEqual([]);
  });

  it("keeps a message change during export eligible for the next backup", async () => {
    const { ctx, deps, exportMessages, backup, restore } = await setup();
    deps.exportConversation.mockImplementationOnce(async () => {
      const result = await exportMessages();
      await createMessageOp(ctx, {
        conversationId: "conv_1",
        uniqueId: "m2",
        role: "assistant",
        content: "late turn",
      });
      return result;
    });

    expect(await backup()).toMatchObject({ uploaded: 1 });
    expect(await restore()).toEqual(["first turn"]);
    expect(await backup()).toMatchObject({ uploaded: 1, skipped: 0 });
    expect(await restore()).toEqual(["first turn", "late turn"]);
    expect(await backup()).toMatchObject({ uploaded: 0, skipped: 1 });
  });
});
