import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation, Message } from "./models";
import {
  clearMessagesOp,
  createMessageOp,
  deleteMessageOp,
  getToolCallEventIdsOp,
  type StorageOperationsContext,
  upsertMessageOp,
} from "./operations";

function makeContext(): StorageOperationsContext {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `event-index-${Math.random().toString(36).slice(2)}`,
  });
  const database = new Database({ adapter, modelClasses: sdkModelClasses });
  return {
    database,
    messagesCollection: database.get<Message>("history"),
    conversationsCollection: database.get<Conversation>("conversations"),
  };
}

function createEvents(
  ctx: StorageOperationsContext,
  uniqueId: string,
  ids: string[],
  conversationId = "conv-1"
) {
  return createMessageOp(ctx, {
    uniqueId,
    conversationId,
    role: "assistant",
    content: "reply",
    toolCallEvents: ids.map((id) => ({ id, name: "search" })),
  });
}

describe("getToolCallEventIdsOp index", () => {
  it("projects only event fields and filters rows without events in SQL", async () => {
    const ctx = makeContext();
    const query = vi
      .spyOn(ctx.database.adapter.underlyingAdapter, "unsafeQueryRaw")
      .mockImplementation((_query, cb) => {
        cb({ value: [{ id: "m1", tool_call_events: '[{"id":"call-1"}]' }] });
      });

    expect(await getToolCallEventIdsOp(ctx, "conv-'1")).toEqual(new Set(["call-1"]));
    expect(query).toHaveBeenCalledTimes(1);
    const sql = query.mock.calls[0][0].description.sql;
    expect(sql?.sql).toMatch(/^select "id", "tool_call_events" from "history" where /i);
    expect(sql?.sql).toContain("\"_status\" != 'deleted'");
    expect(sql?.sql).toContain('"tool_call_events" is not null');
    expect(sql?.sql).toContain("\"tool_call_events\" not in ('', '[]')");
    expect(sql?.values).toEqual(["conv-'1"]);
  });

  it("returns only event fields and nonempty rows from LokiJS", async () => {
    const ctx = makeContext();
    await createEvents(ctx, "m1", ["call-1"]);
    await createEvents(ctx, "empty", []);
    await createMessageOp(ctx, { conversationId: "conv-1", role: "user", content: "prompt" });
    await createEvents(ctx, "other", ["other-call"], "conv-2");
    const read = ctx.database.adapter.underlyingAdapter.unsafeQueryRaw.bind(
      ctx.database.adapter.underlyingAdapter
    );
    const payloads: unknown[][] = [];
    vi.spyOn(ctx.database.adapter.underlyingAdapter, "unsafeQueryRaw").mockImplementation(
      (query, callback) => {
        read(query, (result) => {
          if ("value" in result) payloads.push(result.value);
          callback(result);
        });
      }
    );

    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set(["call-1"]));
    expect(payloads).toEqual([
      [{ id: "m1", tool_call_events: JSON.stringify([{ id: "call-1", name: "search" }]) }],
    ]);
  });

  it("shares the first read and returns independent sets without another read", async () => {
    const ctx = makeContext();
    await createEvents(ctx, "m1", ["call-1"]);
    const read = vi.spyOn(ctx.database.adapter.underlyingAdapter, "unsafeQueryRaw");
    const [first, second] = await Promise.all([
      getToolCallEventIdsOp(ctx, "conv-1"),
      getToolCallEventIdsOp({ ...ctx }, "conv-1"),
    ]);
    const initialReads = read.mock.calls.length;
    expect(initialReads).toBe(2);
    first.add("caller-owned");

    expect(second).toEqual(new Set(["call-1"]));
    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set(["call-1"]));
    expect(read).toHaveBeenCalledTimes(initialReads);
  });

  it("updates IDs after writes and deletions without another read", async () => {
    const ctx = makeContext();
    await createEvents(ctx, "m1", ["shared", "old"]);
    await createEvents(ctx, "m2", ["shared"]);
    await getToolCallEventIdsOp(ctx, "conv-1");
    const read = vi.spyOn(ctx.database.adapter.underlyingAdapter, "unsafeQueryRaw");

    await upsertMessageOp(ctx, {
      uniqueId: "m1",
      conversationId: "conv-1",
      role: "assistant",
      content: "partial",
      toolCallEvents: [{ id: "new", name: "search" }],
    });
    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set(["shared", "new"]));

    await upsertMessageOp(ctx, {
      uniqueId: "m1",
      conversationId: "conv-1",
      role: "assistant",
      content: "complete",
      toolCallEvents: [{ id: "resumed", name: "search" }],
    });
    await createEvents(ctx, "m3", ["created"]);
    await deleteMessageOp(ctx, "m2");
    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set(["resumed", "created"]));

    await clearMessagesOp(ctx, "conv-1");
    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set());
    expect(read).not.toHaveBeenCalled();
  });

  it("keeps shared IDs until the last message is deleted", async () => {
    const ctx = makeContext();
    await createEvents(ctx, "m1", ["shared", "shared"]);
    await createEvents(ctx, "m2", ["shared"]);
    await getToolCallEventIdsOp(ctx, "conv-1");

    await deleteMessageOp(ctx, "m1");
    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set(["shared"]));
    await deleteMessageOp(ctx, "m2");
    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set());
  });

  it("retries a failed initial read without a stale cache", async () => {
    const ctx = makeContext();
    await createEvents(ctx, "m1", ["call-1"]);
    const read = vi
      .spyOn(ctx.database.adapter.underlyingAdapter, "unsafeQueryRaw")
      .mockImplementationOnce((_query, callback) => callback({ error: new Error("read failed") }));

    await expect(getToolCallEventIdsOp(ctx, "conv-1")).rejects.toThrow("read failed");
    expect(read).toHaveBeenCalledTimes(1);
    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set(["call-1"]));
  });

  it("tracks direct database edits, conversation moves, and soft deletions", async () => {
    const ctx = makeContext();
    await createEvents(ctx, "m1", ["old"]);
    await getToolCallEventIdsOp(ctx, "conv-1");
    await getToolCallEventIdsOp(ctx, "conv-2");
    const message = await ctx.messagesCollection.find("m1");
    const read = vi.spyOn(ctx.database.adapter.underlyingAdapter, "unsafeQueryRaw");

    await ctx.database.write(async () => {
      await message.update((row) => {
        row._setRaw("conversation_id", "conv-2");
        row._setRaw("tool_call_events", '[{"id":"synced"}]');
      });
    });
    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set());
    expect(await getToolCallEventIdsOp(ctx, "conv-2")).toEqual(new Set(["synced"]));

    await ctx.database.write(() => message.markAsDeleted());
    expect(await getToolCallEventIdsOp(ctx, "conv-2")).toEqual(new Set());
    expect(read).not.toHaveBeenCalled();
  });

  it("separates databases and clears IDs after a database reset", async () => {
    const ctx = makeContext();
    const other = makeContext();
    await createEvents(ctx, "m1", ["call-1"]);
    await createEvents(other, "m1", ["call-2"]);
    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set(["call-1"]));
    expect(await getToolCallEventIdsOp(other, "conv-1")).toEqual(new Set(["call-2"]));

    await ctx.database.write(() => ctx.database.unsafeResetDatabase());
    expect(await getToolCallEventIdsOp(ctx, "conv-1")).toEqual(new Set());
  });
});
