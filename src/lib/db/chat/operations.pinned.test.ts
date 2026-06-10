// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  getConversationsLazyOp,
  getConversationsOp,
  type StorageOperationsContext,
  updateConversationPinnedOp,
} from "./operations";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `pinned-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function makeCtx(db: Database): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
  };
}

async function insertConversation(
  db: Database,
  fields: { conversationId: string; title?: string; isDeleted?: boolean }
): Promise<void> {
  const collection = db.get<Conversation>("conversations");
  const now = Date.now();
  await db.write(async () => {
    await collection.create((c) => {
      c._setRaw("conversation_id", fields.conversationId);
      c._setRaw("title", fields.title ?? fields.conversationId);
      c._setRaw("is_deleted", fields.isDeleted ?? false);
      c._setRaw("created_at", now);
      c._setRaw("updated_at", now);
    });
  });
}

async function fetchConversation(db: Database, conversationId: string): Promise<Conversation> {
  const records = await db.get<Conversation>("conversations").query().fetch();
  const record = records.find((r) => r.conversationId === conversationId);
  expect(record).toBeDefined();
  return record!;
}

describe("updateConversationPinnedOp", () => {
  let db: Database;
  let ctx: StorageOperationsContext;

  beforeEach(() => {
    db = makeDatabase();
    ctx = makeCtx(db);
  });

  it("pins a conversation by stamping pinned_at", async () => {
    await insertConversation(db, { conversationId: "conv_a" });

    const before = Date.now();
    const updated = await updateConversationPinnedOp(ctx, "conv_a", true);
    expect(updated).toBe(true);

    const record = await fetchConversation(db, "conv_a");
    expect(record.pinnedAt).toBeInstanceOf(Date);
    expect(record.pinnedAt!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("unpins a conversation by clearing pinned_at", async () => {
    await insertConversation(db, { conversationId: "conv_a" });
    await updateConversationPinnedOp(ctx, "conv_a", true);

    const updated = await updateConversationPinnedOp(ctx, "conv_a", false);
    expect(updated).toBe(true);

    const record = await fetchConversation(db, "conv_a");
    expect(record.pinnedAt).toBeFalsy();
  });

  it("bumps updated_at so the change is picked up by backup sync", async () => {
    await insertConversation(db, { conversationId: "conv_a" });
    const before = (await fetchConversation(db, "conv_a")).updatedAt.getTime();

    await new Promise((resolve) => setTimeout(resolve, 5));
    await updateConversationPinnedOp(ctx, "conv_a", true);

    const after = (await fetchConversation(db, "conv_a")).updatedAt.getTime();
    expect(after).toBeGreaterThan(before);
  });

  it("returns false for an unknown conversation", async () => {
    const updated = await updateConversationPinnedOp(ctx, "conv_missing", true);
    expect(updated).toBe(false);
  });

  it("returns false for a soft-deleted conversation", async () => {
    await insertConversation(db, { conversationId: "conv_deleted", isDeleted: true });

    const updated = await updateConversationPinnedOp(ctx, "conv_deleted", true);
    expect(updated).toBe(false);
  });

  it("round-trips pinnedAt through getConversationsOp and getConversationsLazyOp", async () => {
    await insertConversation(db, { conversationId: "conv_pinned" });
    await insertConversation(db, { conversationId: "conv_plain" });
    await updateConversationPinnedOp(ctx, "conv_pinned", true);

    const stored = await getConversationsOp(ctx);
    const pinned = stored.find((c) => c.conversationId === "conv_pinned");
    const plain = stored.find((c) => c.conversationId === "conv_plain");
    expect(pinned?.pinnedAt).toBeInstanceOf(Date);
    expect(plain?.pinnedAt).toBeFalsy();

    const lazy = await getConversationsLazyOp(ctx);
    const lazyPinned = lazy.find((c) => c.conversationId === "conv_pinned");
    expect(lazyPinned?.pinnedAt).toBeInstanceOf(Date);
  });
});
