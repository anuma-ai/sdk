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
  // Offsets are filled in by `seedMessageWithChunks`, which is the only place
  // that knows how these are joined into the message content.
  return { text, vector, startOffset: 0, endOffset: text.length };
}

/**
 * Seed a message plus its chunks, with offsets that actually describe where each
 * chunk sits in the joined content.
 *
 * They used to be `{ startOffset: 0, endOffset: text.length }` for every chunk,
 * which no real chunking produces — `chunkText` tiles a message end to end, so
 * only the first chunk starts at 0. That was harmless while chunk text was
 * stored and read back verbatim, but sdk#880 stopped persisting the text and
 * rebuilds each snippet from these offsets, so a fixture with fictional offsets
 * now describes a row that could never exist and exercises the wrong branch
 * (`resolveChunkText`'s coverage guard correctly rejects it).
 */
function placeChunks(chunks: MessageChunk[]): MessageChunk[] {
  let cursor = 0;
  return chunks.map((c) => {
    const startOffset = cursor;
    const endOffset = startOffset + (c.text?.length ?? 0);
    cursor = endOffset + 1; // the joining space
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
    // `placeChunks` for the same reason as the seeder: the re-embed rewrites the
    // row, so its offsets have to keep describing the (unchanged) content.
    await updateMessageChunksOp(
      ctx,
      "msg-a",
      placeChunks([chunk("apples and oranges", [0, 0, 1]), chunk("the weather today", [0, 1, 0])]),
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
