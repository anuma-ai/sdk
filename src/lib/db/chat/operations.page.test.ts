// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  createConversationOp,
  createMessageOp,
  getConversationsPageOp,
  getMessageCountOp,
  getMessageSkeletonsOp,
  getMessagesPageOp,
  type StorageOperationsContext,
} from "./operations";
import type { ChatRole } from "./types";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `page-test-${Math.random().toString(36).slice(2)}`,
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

/**
 * Seed `count` alternating user/assistant messages; returns the ctx.
 *
 * The exact-messageId assertions below intentionally pin `createMessageOp`'s
 * sequencing contract (`messageId = max(existing) + 1`, so 1…N in a fresh
 * database) — pagination cursors (`beforeMessageId`) depend on that ordering,
 * so a change to id assignment SHOULD fail these tests.
 */
async function seedThread(count: number, convId = "conv-1"): Promise<StorageOperationsContext> {
  const ctx = makeCtx(makeDatabase());
  for (let i = 1; i <= count; i++) {
    await createMessageOp(ctx, {
      conversationId: convId,
      role: (i % 2 === 1 ? "user" : "assistant") as ChatRole,
      content: `message ${i}`,
      uniqueId: `msg-${i}`,
    });
  }
  return ctx;
}

describe("getMessagesPageOp", () => {
  it("returns the newest `limit` messages in ascending message_id order", async () => {
    const ctx = await seedThread(10);

    const page = await getMessagesPageOp(ctx, "conv-1", { limit: 4 });

    expect(page).toHaveLength(4);
    expect(page.map((m) => m.messageId)).toEqual([7, 8, 9, 10]);
    expect(page.map((m) => m.content)).toEqual([
      "message 7",
      "message 8",
      "message 9",
      "message 10",
    ]);
  });

  it("pages backward with beforeMessageId (exclusive bound)", async () => {
    const ctx = await seedThread(10);

    const page = await getMessagesPageOp(ctx, "conv-1", { beforeMessageId: 7, limit: 3 });

    expect(page.map((m) => m.messageId)).toEqual([4, 5, 6]);
  });

  it("returns the full remainder when limit exceeds the range", async () => {
    const ctx = await seedThread(5);

    const page = await getMessagesPageOp(ctx, "conv-1", { beforeMessageId: 3, limit: 50 });

    expect(page.map((m) => m.messageId)).toEqual([1, 2]);
  });

  it("returns an empty array for an empty conversation", async () => {
    const ctx = makeCtx(makeDatabase());

    const page = await getMessagesPageOp(ctx, "conv-empty", { limit: 10 });

    expect(page).toEqual([]);
  });

  it("returns an empty page for non-positive or non-finite limits (never an unbounded read)", async () => {
    // SQLite treats LIMIT -1 as "no limit" — an unguarded negative limit
    // would silently fetch and decrypt the whole conversation.
    const ctx = await seedThread(10);

    expect(await getMessagesPageOp(ctx, "conv-1", { limit: 0 })).toEqual([]);
    expect(await getMessagesPageOp(ctx, "conv-1", { limit: -1 })).toEqual([]);
    expect(await getMessagesPageOp(ctx, "conv-1", { limit: Number.NaN })).toEqual([]);
    expect(await getMessagesPageOp(ctx, "conv-1", { limit: -Infinity })).toEqual([]);
  });

  it("floors fractional limits", async () => {
    const ctx = await seedThread(10);

    const page = await getMessagesPageOp(ctx, "conv-1", { limit: 2.9 });

    expect(page.map((m) => m.messageId)).toEqual([9, 10]);
  });

  it("does not leak other conversations' messages", async () => {
    const ctx = await seedThread(3);
    await createMessageOp(ctx, {
      conversationId: "conv-2",
      role: "user",
      content: "other thread",
      uniqueId: "other-1",
    });

    const page = await getMessagesPageOp(ctx, "conv-1", { limit: 10 });

    expect(page).toHaveLength(3);
    expect(page.every((m) => m.conversationId === "conv-1")).toBe(true);
  });

  it("omits vector/chunks embeddings from page reads", async () => {
    const ctx = makeCtx(makeDatabase());
    const created = await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "with embedding",
      uniqueId: "msg-emb",
    });
    // Attach an embedding the way the embedding pipeline does.
    const row = await ctx.messagesCollection.find(created.uniqueId);
    await ctx.database.write(async () => {
      await row.update((msg) => {
        msg._setRaw("vector", JSON.stringify([0.1, 0.2, 0.3]));
        msg._setRaw("chunks", JSON.stringify([{ text: "with embedding", vector: [0.1] }]));
      });
    });

    const page = await getMessagesPageOp(ctx, "conv-1", { limit: 10 });

    expect(page).toHaveLength(1);
    expect(page[0].vector).toBeUndefined();
    expect(page[0].chunks).toBeUndefined();
    expect(page[0].content).toBe("with embedding");
  });
});

describe("getMessageSkeletonsOp", () => {
  it("returns every message's linkage fields without content", async () => {
    const ctx = await seedThread(6);

    const skeletons = await getMessageSkeletonsOp(ctx, "conv-1");

    expect(skeletons).toHaveLength(6);
    expect(skeletons.map((s) => s.messageId)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(skeletons[0]).toMatchObject({
      uniqueId: "msg-1",
      conversationId: "conv-1",
      role: "user",
    });
    expect(skeletons[0].createdAt).toBeInstanceOf(Date);
    // Non-artifact rows never carry content.
    expect(skeletons.every((s) => s.content === undefined)).toBe(true);
  });

  it("preserves parentMessageId for branch-tree construction", async () => {
    const ctx = makeCtx(makeDatabase());
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "user",
      content: "root",
      uniqueId: "msg-root",
    });
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "child",
      uniqueId: "msg-child",
      parentMessageId: "msg-root",
    });

    const skeletons = await getMessageSkeletonsOp(ctx, "conv-1");

    expect(skeletons.find((s) => s.uniqueId === "msg-child")?.parentMessageId).toBe("msg-root");
    expect(skeletons.find((s) => s.uniqueId === "msg-root")?.parentMessageId).toBeUndefined();
  });

  it("populates content ONLY for user rows whose parent is a user row (regen artifacts)", async () => {
    const ctx = makeCtx(makeDatabase());
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "user",
      content: "original prompt",
      uniqueId: "msg-user",
    });
    // Regeneration artifact: a user message parented by another user message.
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "user",
      content: "[Tool Execution Results] ...",
      uniqueId: "msg-artifact",
      parentMessageId: "msg-user",
    });
    // Normal assistant child of a user message — must NOT carry content.
    await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "assistant reply",
      uniqueId: "msg-assistant",
      parentMessageId: "msg-user",
    });

    const skeletons = await getMessageSkeletonsOp(ctx, "conv-1");
    const byId = new Map(skeletons.map((s) => [s.uniqueId, s]));

    expect(byId.get("msg-artifact")?.content).toBe("[Tool Execution Results] ...");
    expect(byId.get("msg-user")?.content).toBeUndefined();
    expect(byId.get("msg-assistant")?.content).toBeUndefined();
  });
});

describe("getMessageCountOp", () => {
  it("counts only the requested conversation's messages", async () => {
    const ctx = await seedThread(4);
    await createMessageOp(ctx, {
      conversationId: "conv-2",
      role: "user",
      content: "other",
      uniqueId: "other-1",
    });

    expect(await getMessageCountOp(ctx, "conv-1")).toBe(4);
    expect(await getMessageCountOp(ctx, "conv-2")).toBe(1);
    expect(await getMessageCountOp(ctx, "conv-none")).toBe(0);
  });
});

describe("getMessagesPageOp duplicated-boundary handling", () => {
  it("does not lose a duplicated boundary row when boundaryExcludeUniqueIds is passed", async () => {
    // Legacy data: two rows sharing message_id 5 (count-based assignment
    // reused a freed id after a mid-thread delete). An exclusive Q.lt cursor
    // at boundary 5 would drop BOTH; the inclusive+exclude cursor must
    // return the twin exactly once.
    const ctx = await seedThread(10);
    const twin = await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "assistant",
      content: "duplicated id twin",
      uniqueId: "msg-5-twin",
    });
    const twinRow = await ctx.messagesCollection.find(twin.uniqueId);
    await ctx.database.write(async () => {
      await twinRow.update((msg) => {
        msg._setRaw("message_id", 5);
      });
    });

    // The caller holds rows down to id 5 via "msg-5" and pages for the rest.
    const page = await getMessagesPageOp(ctx, "conv-1", {
      beforeMessageId: 5,
      limit: 10,
      boundaryExcludeUniqueIds: ["msg-5"],
    });

    expect(page.map((m) => m.uniqueId)).toEqual(["msg-1", "msg-2", "msg-3", "msg-4", "msg-5-twin"]);

    // Without the exclude list the exclusive cursor keeps its old contract
    // (and skips the twin — the documented legacy hazard).
    const exclusive = await getMessagesPageOp(ctx, "conv-1", { beforeMessageId: 5, limit: 10 });
    expect(exclusive.map((m) => m.uniqueId)).toEqual(["msg-1", "msg-2", "msg-3", "msg-4"]);
  });

  it("respects limit while excluding boundary rows", async () => {
    const ctx = await seedThread(10);

    const page = await getMessagesPageOp(ctx, "conv-1", {
      beforeMessageId: 8,
      limit: 3,
      boundaryExcludeUniqueIds: ["msg-8"],
    });

    // Inclusive fetch of ids ≤ 8 minus the held row, newest 3 of the rest.
    expect(page.map((m) => m.messageId)).toEqual([5, 6, 7]);
  });
});

/**
 * Seed `count` conversations with a deterministic `created_at` (conv-i at
 * i*1000 ms) so `created_at DESC` = conv-N … conv-1 and keyset cursors are
 * exact. Returns the ctx plus a conversationId → uniqueId (raw `id`) lookup,
 * since boundary-exclude keys on the raw row id.
 */
async function seedConversations(
  count: number
): Promise<{ ctx: StorageOperationsContext; uid: Map<string, string> }> {
  const ctx = makeCtx(makeDatabase());
  const uid = new Map<string, string>();
  for (let i = 1; i <= count; i++) {
    const conv = await createConversationOp(ctx, {
      conversationId: `conv-${i}`,
      title: `title ${i}`,
    });
    uid.set(conv.conversationId, conv.uniqueId);
    const row = await ctx.conversationsCollection.find(conv.uniqueId);
    await ctx.database.write(async () => {
      await row.update((c) => c._setRaw("created_at", i * 1000));
    });
  }
  return { ctx, uid };
}

describe("getConversationsPageOp", () => {
  it("returns the newest `limit` conversations in created_at DESC order", async () => {
    const { ctx } = await seedConversations(10);

    const page = await getConversationsPageOp(ctx, { limit: 4 });

    expect(page.map((c) => c.conversationId)).toEqual(["conv-10", "conv-9", "conv-8", "conv-7"]);
    // Lazy projection: raw title under encryptedTitle, no decrypted `title`.
    expect(page[0].encryptedTitle).toBe("title 10");
    expect((page[0] as Record<string, unknown>).title).toBeUndefined();
  });

  it("defaults to a 200-row page and returns all when fewer exist", async () => {
    const { ctx } = await seedConversations(5);

    const page = await getConversationsPageOp(ctx);

    expect(page.map((c) => c.conversationId)).toEqual([
      "conv-5",
      "conv-4",
      "conv-3",
      "conv-2",
      "conv-1",
    ]);
  });

  it("pages backward with `before` (exclusive created_at bound)", async () => {
    const { ctx } = await seedConversations(10);

    // conv-7 sits at created_at 7000; the next page starts strictly below it.
    const page = await getConversationsPageOp(ctx, { before: 7000, limit: 4 });

    expect(page.map((c) => c.conversationId)).toEqual(["conv-6", "conv-5", "conv-4", "conv-3"]);
  });

  it("returns the full remainder when limit exceeds the range", async () => {
    const { ctx } = await seedConversations(10);

    const page = await getConversationsPageOp(ctx, { before: 3000, limit: 50 });

    expect(page.map((c) => c.conversationId)).toEqual(["conv-2", "conv-1"]);
  });

  it("returns an empty array when there are no conversations", async () => {
    const ctx = makeCtx(makeDatabase());

    expect(await getConversationsPageOp(ctx, { limit: 10 })).toEqual([]);
  });

  it("excludes soft-deleted conversations", async () => {
    const { ctx, uid } = await seedConversations(5);
    const row = await ctx.conversationsCollection.find(uid.get("conv-3")!);
    await ctx.database.write(async () => {
      await row.update((c) => c._setRaw("is_deleted", true));
    });

    const page = await getConversationsPageOp(ctx, { limit: 10 });

    expect(page.map((c) => c.conversationId)).toEqual(["conv-5", "conv-4", "conv-2", "conv-1"]);
  });

  it("returns an empty page for non-positive or non-finite limits (never an unbounded read)", async () => {
    // SQLite treats LIMIT -1 as "no limit" — an unguarded negative would
    // silently fetch the ENTIRE list. Mirrors getMessagesPageOp's guard.
    const { ctx } = await seedConversations(10);

    expect(await getConversationsPageOp(ctx, { limit: 0 })).toEqual([]);
    expect(await getConversationsPageOp(ctx, { limit: -1 })).toEqual([]);
    expect(await getConversationsPageOp(ctx, { limit: Number.NaN })).toEqual([]);
    expect(await getConversationsPageOp(ctx, { limit: -Infinity })).toEqual([]);
  });

  it("floors fractional limits", async () => {
    const { ctx } = await seedConversations(10);

    const page = await getConversationsPageOp(ctx, { limit: 2.9 });

    expect(page.map((c) => c.conversationId)).toEqual(["conv-10", "conv-9"]);
  });
});

describe("getConversationsPageOp duplicated-timestamp handling", () => {
  it("does not lose a row sharing the boundary created_at when boundaryExcludeUniqueIds is passed", async () => {
    // Bulk restore/import: two conversations share created_at 5000. An
    // exclusive Q.lt cursor at 5000 would drop BOTH; the inclusive+exclude
    // cursor must return the unheld twin exactly once.
    const { ctx, uid } = await seedConversations(10);
    const twin = await createConversationOp(ctx, {
      conversationId: "conv-5-twin",
      title: "twin",
    });
    const twinRow = await ctx.conversationsCollection.find(twin.uniqueId);
    await ctx.database.write(async () => {
      await twinRow.update((c) => c._setRaw("created_at", 5000));
    });

    // Caller holds conv-5 at the boundary and pages for the rest below 5000.
    const page = await getConversationsPageOp(ctx, {
      before: 5000,
      limit: 10,
      boundaryExcludeUniqueIds: [uid.get("conv-5")!],
    });

    expect(page.map((c) => c.conversationId)).toEqual([
      "conv-5-twin",
      "conv-4",
      "conv-3",
      "conv-2",
      "conv-1",
    ]);

    // Without the exclude list the exclusive cursor keeps its old contract
    // (and skips the twin — the documented tie hazard).
    const exclusive = await getConversationsPageOp(ctx, { before: 5000, limit: 10 });
    expect(exclusive.map((c) => c.conversationId)).toEqual([
      "conv-4",
      "conv-3",
      "conv-2",
      "conv-1",
    ]);
  });

  it("respects limit while excluding boundary rows", async () => {
    const { ctx, uid } = await seedConversations(10);

    const page = await getConversationsPageOp(ctx, {
      before: 8000,
      limit: 3,
      boundaryExcludeUniqueIds: [uid.get("conv-8")!],
    });

    // Inclusive fetch of created_at ≤ 8000 minus the held row, newest 3.
    expect(page.map((c) => c.conversationId)).toEqual(["conv-7", "conv-6", "conv-5"]);
  });
});

describe("createMessageOp id assignment under deletions", () => {
  it("never reuses a freed message_id (max + 1, not count + 1)", async () => {
    const ctx = await seedThread(3);

    // Delete the middle row — count drops to 2 while max stays 3.
    const middle = await ctx.messagesCollection.find("msg-2");
    await ctx.database.write(async () => {
      await middle.destroyPermanently();
    });

    const created = await createMessageOp(ctx, {
      conversationId: "conv-1",
      role: "user",
      content: "after delete",
      uniqueId: "msg-after-delete",
    });

    // count+1 would have assigned 3 — colliding with the existing "msg-3".
    expect(created.messageId).toBe(4);
  });
});
