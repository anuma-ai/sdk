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
  // No walletAddress → chunks stored as plaintext JSON (isEncrypted() is
  // false), so this exercises the JSON.parse cost the cache eliminates.
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

async function seedMessageWithChunks(
  ctx: StorageOperationsContext,
  conversationId: string,
  uniqueId: string,
  chunks: MessageChunk[]
): Promise<void> {
  await createMessageOp(ctx, {
    conversationId,
    role: "assistant",
    content: chunks.map((c) => c.text).join(" "),
    uniqueId,
  });
  await updateMessageChunksOp(ctx, uniqueId, chunks, MODEL);
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
    // Both messages populated the cache (2 message-keyed entries).
    expect(cache.size).toBe(2);

    const warm = await searchChunksOp(ctx, query, { minSimilarity: 0, chunkCache: cache });
    const noCache = await searchChunksOp(ctx, query, { minSimilarity: 0 });

    expect(warm).toEqual(cold);
    expect(noCache).toEqual(cold);

    // The best hit is the chunk aligned with the query vector, and its text
    // is resolved correctly on the cache-hit path (not the message fallback).
    expect(warm[0].chunkText).toBe("apples and oranges");
    expect(warm[0].similarity).toBeCloseTo(1, 5);
  });

  it("invalidates a cached entry when the message is re-embedded (updated_at bump)", async () => {
    const cache: ChunkVectorCache = createChunkVectorCache();

    // Warm the cache against the original vectors.
    await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0, chunkCache: cache });

    // The cache version token is the message's `updated_at` (ms). Real
    // re-embeds happen minutes after a message is first embedded; here the seed
    // write and the re-embed would otherwise race inside the same millisecond,
    // leaving updated_at unchanged and the cache legitimately valid. Wait past
    // the ms boundary so the re-embed is a genuinely newer version.
    await new Promise((r) => setTimeout(r, 5));

    // Re-embed msg-a so its top chunk now points the other way. This bumps
    // updated_at, so the cached (stale) vectors must be discarded.
    await updateMessageChunksOp(
      ctx,
      "msg-a",
      [chunk("apples and oranges", [0, 0, 1]), chunk("the weather today", [0, 1, 0])],
      MODEL
    );

    // A query aligned with the NEW vector must surface msg-a via the fresh
    // embedding — proving the stale cache entry was not served.
    const res = await searchChunksOp(ctx, [0, 0, 1], { minSimilarity: 0.99, chunkCache: cache });
    const topA = res.find((r) => r.message.uniqueId === "msg-a");
    expect(topA).toBeDefined();
    expect(topA!.chunkText).toBe("apples and oranges");
  });
});
