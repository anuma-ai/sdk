// @vitest-environment happy-dom
/**
 * `excludeConversationId` must filter BEFORE the top-K cut.
 *
 * recall() used to drop the current conversation from the slice `searchChunksOp`
 * had already cut to `limit`. In a long chat the current conversation is the
 * closest match for almost anything, so it filled every slot, the post-filter
 * emptied them, and past-conversation recall — the whole point of the chunk
 * lane — came back with nothing.
 */
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  createConversationOp,
  createMessageOp,
  searchChunksOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
} from "./operations";

const MODEL = "qwen/qwen3-embedding-8b";

function makeCtx(): StorageOperationsContext {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `chunkexclude-test-${Math.random().toString(36).slice(2)}`,
  });
  const db = new Database({ adapter, modelClasses: sdkModelClasses });
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
  };
}

async function seed(
  ctx: StorageOperationsContext,
  conversationId: string,
  uniqueId: string,
  text: string,
  vector: number[]
): Promise<void> {
  await createMessageOp(ctx, { conversationId, role: "user", content: text, uniqueId });
  await updateMessageChunksOp(
    ctx,
    uniqueId,
    [{ text, vector, startOffset: 0, endOffset: text.length }],
    MODEL
  );
}

describe("searchChunksOp — excludeConversationId", () => {
  let ctx: StorageOperationsContext;

  beforeEach(async () => {
    ctx = makeCtx();
    await createConversationOp(ctx, { conversationId: "conv-current" });
    await createConversationOp(ctx, { conversationId: "conv-past" });
    // The current conversation out-scores the past one on every chunk.
    for (let i = 0; i < 4; i++) {
      await seed(ctx, "conv-current", `cur-${i}`, `current turn ${i}`, [1, 0.01 * i, 0]);
    }
    await seed(ctx, "conv-past", "past-0", "what we said last month", [0.8, 0.6, 0]);
  });

  it("returns past-conversation hits even when the current conversation would fill every slot", async () => {
    const results = await searchChunksOp(ctx, [1, 0, 0], {
      limit: 2,
      minSimilarity: 0,
      embeddingModel: MODEL,
      excludeConversationId: "conv-current",
    });

    expect(results.map((r) => r.message.uniqueId)).toEqual(["past-0"]);
  });

  it("leaves the scan untouched when no conversation is excluded", async () => {
    const results = await searchChunksOp(ctx, [1, 0, 0], {
      limit: 2,
      minSimilarity: 0,
      embeddingModel: MODEL,
    });

    expect(results.map((r) => r.message.conversationId)).toEqual(["conv-current", "conv-current"]);
  });
});
