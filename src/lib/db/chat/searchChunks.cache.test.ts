// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it } from "vitest";

import { createChunkVectorCache } from "../../memory/chunkVectorCache";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  type ChunkVectorCache,
  createConversationOp,
  createMessageOp,
  searchChunksOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
} from "./operations";
import type { MessageChunk } from "./types";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `chunkcache-test-${Math.random().toString(36).slice(2)}`,
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

function chunk(text: string, vector: number[]): MessageChunk {
  return { text, vector, startOffset: 0, endOffset: text.length };
}

function placeChunks(chunks: MessageChunk[]): MessageChunk[] {
  let cursor = 0;
  return chunks.map((c) => {
    const startOffset = cursor;
    const endOffset = startOffset + (c.text?.length ?? 0);
    cursor = endOffset + 1;
    return { ...c, startOffset, endOffset };
  });
}

async function seedMessageWithChunks(
  ctx: StorageOperationsContext,
  conversationId: string,
  uniqueId: string,
  chunks: MessageChunk[]
): Promise<void> {
  const content = chunks.map((c) => c.text).join(" ");
  const placed = placeChunks(chunks);
  await createMessageOp(ctx, {
    conversationId,
    role: "assistant",
    content,
    uniqueId,
  });
  await updateMessageChunksOp(ctx, uniqueId, placed, MODEL);
}

describe("searchChunksOp — chunk vector cache", () => {
  let ctx: StorageOperationsContext;

  beforeEach(async () => {
    ctx = makeCtx(makeDatabase());
    await createConversationOp(ctx, { conversationId: "conv-1" });
    await seedMessageWithChunks(ctx, "conv-1", "msg-a", [
      chunk("apples and oranges", [1, 0, 0]),
      chunk("the weather today", [0, 1, 0]),
    ]);
    await seedMessageWithChunks(ctx, "conv-1", "msg-b", [chunk("a distant topic", [0, 0, 1])]);
  });

  it("warm cache hits return results identical to the cold path and the no-cache path", async () => {
    const query = [1, 0, 0];
    const cache = createChunkVectorCache();

    const cold = await searchChunksOp(ctx, query, { minSimilarity: 0, chunkCache: cache });
    expect(cache.size).toBe(2);

    const warm = await searchChunksOp(ctx, query, { minSimilarity: 0, chunkCache: cache });
    const noCache = await searchChunksOp(ctx, query, { minSimilarity: 0 });

    expect(warm).toEqual(cold);
    expect(noCache).toEqual(cold);

    expect(warm[0].chunkText).toBe("apples and oranges");
    expect(warm[0].similarity).toBeCloseTo(1, 5);
  });

  it("invalidates a cached entry when the message is re-embedded (updated_at bump)", async () => {
    const cache: ChunkVectorCache = createChunkVectorCache();

    await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0, chunkCache: cache });

    await new Promise((r) => setTimeout(r, 5));

    await updateMessageChunksOp(
      ctx,
      "msg-a",
      placeChunks([chunk("apples and oranges", [0, 0, 1]), chunk("the weather today", [0, 1, 0])]),
      MODEL
    );

    const res = await searchChunksOp(ctx, [0, 0, 1], { minSimilarity: 0.99, chunkCache: cache });
    const topA = res.find((r) => r.message.uniqueId === "msg-a");
    expect(topA).toBeDefined();
    expect(topA!.chunkText).toBe("apples and oranges");
  });
});
