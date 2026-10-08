// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  createConversationOp,
  createMessageOp,
  getToolCallEventIdsOp,
  searchChunksOp,
  searchMessagesOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
} from "./operations";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `rawscan-test-${Math.random().toString(36).slice(2)}`,
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

const MODEL = "qwen/qwen3-embedding-8b";

function countMessageFetches(ctx: StorageOperationsContext): () => number {
  let fetchCalls = 0;
  const collection = ctx.messagesCollection as unknown as {
    query: (...args: unknown[]) => {
      fetch: () => Promise<unknown>;
      unsafeFetchRaw: () => Promise<unknown>;
    };
  };
  const origQuery = collection.query;
  vi.spyOn(
    ctx.messagesCollection as unknown as { query: typeof origQuery },
    "query"
  ).mockImplementation((...args: unknown[]) => {
    const q = origQuery.apply(ctx.messagesCollection, args);
    const origFetch = q.fetch;
    q.fetch = async () => {
      fetchCalls++;
      return origFetch.call(q);
    };
    return q;
  });
  return () => fetchCalls;
}

async function seedEmbeddedMessage(
  ctx: StorageOperationsContext,
  conversationId: string,
  uniqueId: string,
  content: string,
  vector: number[]
): Promise<void> {
  await createMessageOp(ctx, { conversationId, role: "assistant", content, uniqueId });
  await updateMessageEmbeddingOp(ctx, uniqueId, vector, MODEL);
}

describe("search lanes scan via unsafeFetchRaw (no per-row Model pinning)", () => {
  let ctx: StorageOperationsContext;

  beforeEach(async () => {
    ctx = makeCtx(makeDatabase());
    await createConversationOp(ctx, { conversationId: "conv-1" });
    await seedEmbeddedMessage(ctx, "conv-1", "msg-a", "apples and oranges", [1, 0, 0]);
    await seedEmbeddedMessage(ctx, "conv-1", "msg-b", "the weather today", [0.9, 0.1, 0]);
    await seedEmbeddedMessage(ctx, "conv-1", "msg-c", "a distant topic", [0, 0, 1]);
  });

  it("searchMessagesOp returns ranked survivors without .fetch()ing message Models", async () => {
    const fetches = countMessageFetches(ctx);

    const results = await searchMessagesOp(ctx, [1, 0, 0], { limit: 2, minSimilarity: 0.5 });

    expect(fetches()).toBe(0);
    expect(results.map((r) => r.uniqueId)).toEqual(["msg-a", "msg-b"]);
    expect(results[0].content).toBe("apples and oranges");
    expect(results[0].similarity).toBeCloseTo(1, 5);
    expect(results[1].similarity).toBeGreaterThan(results[1].similarity - 0.001);
    expect(results[0].conversationId).toBe("conv-1");
    expect(results[0].role).toBe("assistant");
  });

  it("searchChunksOp scores chunk lanes without .fetch()ing message Models", async () => {
    await updateMessageChunksOp(
      ctx,
      "msg-c",
      [{ text: "a distant topic", vector: [0.99, 0.01, 0], startOffset: 0, endOffset: 15 }],
      MODEL
    );
    const fetches = countMessageFetches(ctx);

    const results = await searchChunksOp(ctx, [1, 0, 0], { limit: 1, minSimilarity: 0.5 });

    expect(fetches()).toBe(0);
    expect(results).toHaveLength(1);
    expect(results[0].message.uniqueId).toBe("msg-a");
    expect(results[0].chunkText).toBe("apples and oranges");
  });
});

describe("getToolCallEventIdsOp", () => {
  it("collects every stored toolCallEvents id without decrypting or building Models", async () => {
    const ctx = makeCtx(makeDatabase());
    await createConversationOp(ctx, { conversationId: "conv-t" });
    await createMessageOp(ctx, {
      conversationId: "conv-t",
      role: "assistant",
      content: "first",
      uniqueId: "t1",
      toolCallEvents: [
        { id: "evt-1", name: "search", status: "completed" },
        { id: "evt-2", name: "display", status: "completed" },
      ] as never,
    });
    await createMessageOp(ctx, {
      conversationId: "conv-t",
      role: "assistant",
      content: "second",
      uniqueId: "t2",
    });
    await createMessageOp(ctx, {
      conversationId: "conv-t",
      role: "assistant",
      content: "third",
      uniqueId: "t3",
      toolCallEvents: [{ id: "evt-3", name: "search", status: "failed" }] as never,
    });
    await createConversationOp(ctx, { conversationId: "conv-other" });
    await createMessageOp(ctx, {
      conversationId: "conv-other",
      role: "assistant",
      content: "elsewhere",
      uniqueId: "o1",
      toolCallEvents: [{ id: "evt-other", name: "search", status: "completed" }] as never,
    });

    const fetches = countMessageFetches(ctx);
    const ids = await getToolCallEventIdsOp(ctx, "conv-t");

    expect(fetches()).toBe(0);
    expect([...ids].sort()).toEqual(["evt-1", "evt-2", "evt-3"]);
  });
});
