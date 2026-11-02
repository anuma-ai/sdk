// @vitest-environment node
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it } from "vitest";

import { createChunkVectorCache } from "../../memory/chunkVectorCache";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  type ChunkSearchStats,
  createConversationOp,
  createMessageOp,
  deleteConversationOp,
  searchChunksOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
  updateMessageEmbeddingOp,
  warmChunkVectorCacheOp,
} from "./operations";
import type { MessageChunk } from "./types";

const MODEL = "qwen/qwen3-embedding-8b";

function makeCtx(): StorageOperationsContext {
  const db = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `warm-test-${Math.random().toString(36).slice(2)}`,
    }),
    modelClasses: sdkModelClasses,
  });
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
  };
}

async function seedChunked(
  ctx: StorageOperationsContext,
  conversationId: string,
  uniqueId: string,
  parts: Array<[string, number[]]>,
  model = MODEL
): Promise<void> {
  let cursor = 0;
  const chunks: MessageChunk[] = parts.map(([text, vector]) => {
    const chunk = { text, vector, startOffset: cursor, endOffset: cursor + text.length };
    cursor = chunk.endOffset + 1;
    return chunk;
  });
  await createMessageOp(ctx, {
    conversationId,
    role: "assistant",
    content: parts.map(([text]) => text).join(" "),
    uniqueId,
  });
  await updateMessageChunksOp(ctx, uniqueId, chunks, model);
}

async function seed(ctx: StorageOperationsContext): Promise<void> {
  await createConversationOp(ctx, { conversationId: "live" });
  await createConversationOp(ctx, { conversationId: "gone" });
  await seedChunked(ctx, "live", "m-coffee", [
    ["coffee shops nearby", [1, 0, 0]],
    ["late night plans", [0.6, 0.8, 0]],
  ]);
  await seedChunked(ctx, "live", "m-weather", [["the weather today", [0, 1, 0]]]);
  await seedChunked(ctx, "live", "m-stale", [["coffee in old space", [1, 0, 0]]], "old/model");
  await createMessageOp(ctx, {
    conversationId: "live",
    role: "user",
    content: "espresso tasting",
    uniqueId: "m-vector-only",
  });
  await updateMessageEmbeddingOp(ctx, "m-vector-only", [0.9, 0.1, 0], MODEL);
  await createMessageOp(ctx, {
    conversationId: "live",
    role: "user",
    content: "never embedded",
    uniqueId: "m-plain",
  });
  await seedChunked(ctx, "gone", "m-gone", [["coffee from a deleted chat", [1, 0, 0]]]);
  await deleteConversationOp(ctx, "gone");
}

async function search(ctx: StorageOperationsContext, chunkCache = createChunkVectorCache()) {
  let stats: ChunkSearchStats | undefined;
  const results = await searchChunksOp(ctx, [1, 0, 0], {
    minSimilarity: 0.5,
    embeddingModel: MODEL,
    chunkCache,
    onStats: (s) => {
      stats = s;
    },
  });
  return {
    results: results.map((r) => [r.message.uniqueId, r.chunkText, r.similarity.toFixed(6)]),
    stats: stats!,
  };
}

describe("warmChunkVectorCacheOp", () => {
  let ctx: StorageOperationsContext;

  beforeEach(async () => {
    ctx = makeCtx();
    await seed(ctx);
  });

  it("caches every searchable message so the first search reads nothing from storage", async () => {
    const cold = await search(ctx);
    const chunkCache = createChunkVectorCache();

    expect(await warmChunkVectorCacheOp(ctx, { chunkCache, embeddingModel: MODEL })).toBe(3);
    expect(chunkCache.size).toBe(3);

    const warm = await search(ctx, chunkCache);
    expect(warm.stats).toEqual({
      rowsScanned: cold.stats.rowsScanned,
      rowsFetched: 0,
      cacheHits: 3,
    });
    expect(warm.results).toEqual(cold.results);
    expect(cold.results.map(([id]) => id)).toEqual(["m-coffee", "m-vector-only", "m-coffee"]);
  });

  it("adds only what is missing or changed since the last warm", async () => {
    const chunkCache = createChunkVectorCache();
    await warmChunkVectorCacheOp(ctx, { chunkCache, embeddingModel: MODEL });
    expect(await warmChunkVectorCacheOp(ctx, { chunkCache, embeddingModel: MODEL })).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, 2));
    await updateMessageEmbeddingOp(ctx, "m-vector-only", [0, 0, 1], MODEL);
    expect(await warmChunkVectorCacheOp(ctx, { chunkCache, embeddingModel: MODEL })).toBe(1);
    const after = await search(ctx, chunkCache);
    expect(after.stats.rowsFetched).toBe(0);
    expect(after.results.map(([id]) => id)).toEqual(["m-coffee", "m-coffee"]);
  });

  it("keeps messages from another embedding model when no model is given", async () => {
    const chunkCache = createChunkVectorCache();
    expect(await warmChunkVectorCacheOp(ctx, { chunkCache })).toBe(4);
  });

  it("stops when aborted, leaving the cache as it was", async () => {
    const chunkCache = createChunkVectorCache();
    const controller = new AbortController();
    controller.abort(new Error("signed out"));

    await expect(
      warmChunkVectorCacheOp(ctx, { chunkCache, embeddingModel: MODEL, signal: controller.signal })
    ).rejects.toThrow("signed out");
    expect(chunkCache.size).toBe(0);
  });
});
