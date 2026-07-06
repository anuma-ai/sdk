// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  createMessageOp,
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
 * sequencing contract (`messageId = existingCount + 1`, so 1…N in a fresh
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
