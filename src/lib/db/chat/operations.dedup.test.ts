// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import { createMessageOp, type StorageOperationsContext } from "./operations";
import type { CreateMessageOptions } from "./types";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `dedup-test-${Math.random().toString(36).slice(2)}`,
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

describe("createMessageOp idempotency (duplicate uniqueId)", () => {
  it("returns the existing message instead of throwing 'Duplicate key' on replay", async () => {
    const ctx = makeCtx(makeDatabase());
    const opts: CreateMessageOptions = {
      conversationId: "conv-1",
      role: "assistant",
      content: "hello world",
      uniqueId: "msg-abc",
    };

    const first = await createMessageOp(ctx, opts);
    expect(first.uniqueId).toBe("msg-abc");

    // A queue replay / double-submit fires the same op again with the same
    // pre-allocated id — this used to throw LokiJS "Duplicate key for property id".
    const second = await createMessageOp(ctx, opts);
    expect(second.uniqueId).toBe("msg-abc");
    expect(second.messageId).toBe(first.messageId);

    // Exactly one record persisted — no duplicate row created.
    const all = await ctx.messagesCollection.query().fetch();
    expect(all).toHaveLength(1);
  });

  it("returns the first-persisted row on replay and does NOT refresh diverging content", async () => {
    const ctx = makeCtx(makeDatabase());
    const opts: CreateMessageOptions = {
      conversationId: "conv-1",
      role: "user",
      content: "original content",
      uniqueId: "msg-edit",
    };

    const first = await createMessageOp(ctx, opts);
    expect(first.content).toBe("original content");

    // A replay with the SAME uniqueId but edited content must not mutate the
    // stored row — createMessageOp's idempotency guard returns the first-persisted
    // version as-is. Callers needing in-place reconciliation use upsertMessageOp.
    const replay = await createMessageOp(ctx, { ...opts, content: "edited content" });
    expect(replay.content).toBe("original content");
    expect(replay.messageId).toBe(first.messageId);

    const all = await ctx.messagesCollection.query().fetch();
    expect(all).toHaveLength(1);
  });

  it("still creates normally when no uniqueId collision exists", async () => {
    const ctx = makeCtx(makeDatabase());
    const base: CreateMessageOptions = {
      conversationId: "conv-1",
      role: "user",
      content: "first",
      uniqueId: "msg-1",
    };
    await createMessageOp(ctx, base);
    await createMessageOp(ctx, { ...base, content: "second", uniqueId: "msg-2" });

    const all = await ctx.messagesCollection.query().fetch();
    expect(all).toHaveLength(2);
  });
});
