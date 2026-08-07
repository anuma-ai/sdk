// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type Logger, noopLogger, setLogger } from "../../logger";
import { encodeChunkVector } from "../../memoryEngine/vectorEncoding";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation } from "./models";
import {
  createConversationOp,
  createMessageOp,
  searchChunksOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
} from "./operations";
import type { MessageChunk } from "./types";

/**
 * The read shim, exercised through the real storage path rather than in
 * isolation (sdk#862).
 *
 * Every chunk stored on every device today is a JSON array of numbers. Once the
 * writer flips, a single account's history holds BOTH encodings at once —
 * pre-flip rows and post-flip rows, plus whatever a second device synced down —
 * so "reads both" is not a transitional nicety, it is the steady state.
 */
function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `chunkencoding-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function makeCtx(db: Database): StorageOperationsContext {
  // No walletAddress → chunks land as plaintext JSON, so the test asserts on the
  // encoding rather than on the encryption envelope wrapped around it.
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
  };
}

const MODEL = "qwen/qwen3-embedding-8b";

/**
 * `MessageChunk.vector` is still typed `number[]`, because this SDK's writer
 * still emits JSON arrays. A base64 vector is what a LATER build writes and
 * what this device pulls down from one — a shape the current type deliberately
 * cannot express, so the cast is the point of the test rather than a way around
 * it. It drops when the writer flip widens the type.
 */
function chunk(text: string, vector: number[] | string): MessageChunk {
  return { text, vector, startOffset: 0, endOffset: text.length } as MessageChunk;
}

async function seed(
  ctx: StorageOperationsContext,
  uniqueId: string,
  chunks: MessageChunk[]
): Promise<void> {
  await createMessageOp(ctx, {
    conversationId: "conv-1",
    role: "assistant",
    content: chunks.map((c) => c.text).join(" "),
    uniqueId,
  });
  await updateMessageChunksOp(ctx, uniqueId, chunks, MODEL);
}

describe("searchChunksOp — chunk vector storage encoding", () => {
  let ctx: StorageOperationsContext;
  let warnings: string[];

  beforeEach(async () => {
    ctx = makeCtx(makeDatabase());
    await createConversationOp(ctx, { conversationId: "conv-1" });
    warnings = [];
    const spy: Logger = {
      ...noopLogger,
      warn: (...args: unknown[]) => {
        warnings.push(String(args[0]));
      },
    };
    setLogger(spy);
  });

  afterEach(() => setLogger(noopLogger));

  const unreadableWarnings = () => warnings.filter((w) => w.includes("could not read"));

  it("reads a legacy number[] vector — the encoding every stored row is in today", async () => {
    await seed(ctx, "legacy", [chunk("apples and oranges", [1, 0, 0])]);

    const results = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0.5 });

    expect(results).toHaveLength(1);
    expect(results[0].chunkText).toBe("apples and oranges");
    expect(results[0].similarity).toBeCloseTo(1, 6);
  });

  it("reads a base64 vector", async () => {
    await seed(ctx, "encoded", [chunk("apples and oranges", encodeChunkVector([1, 0, 0]))]);

    const results = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0.5 });

    expect(results).toHaveLength(1);
    expect(results[0].chunkText).toBe("apples and oranges");
    expect(results[0].similarity).toBeCloseTo(1, 6);
  });

  it("ranks both encodings on one scale when a history holds a mix", async () => {
    // The post-flip steady state: an old row and a new row competing in the same
    // query. If the shim were encoding-sensitive the base64 row would score 0
    // and sort last instead of winning.
    await seed(ctx, "legacy-weak", [chunk("a distant topic", [0, 1, 0])]);
    await seed(ctx, "encoded-strong", [chunk("apples and oranges", encodeChunkVector([1, 0, 0]))]);

    const results = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0 });

    expect(results.map((r) => r.chunkText)).toEqual(["apples and oranges", "a distant topic"]);
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
  });

  it("scores the same vector identically in either encoding", async () => {
    const vector = [0.6, -0.48, 0.64];
    await seed(ctx, "as-array", [chunk("same content", vector)]);
    await seed(ctx, "as-base64", [chunk("same content", encodeChunkVector(vector))]);

    const results = await searchChunksOp(ctx, [0.6, -0.48, 0.64], { minSimilarity: 0 });

    expect(results).toHaveLength(2);
    // Bit-identical, not merely close: both paths narrow to float32 before
    // scoring, so a mixed-encoding history cannot produce an unstable ranking.
    expect(results[0].similarity).toBe(results[1].similarity);
  });

  it("skips an unreadable vector instead of failing the whole search", async () => {
    await seed(ctx, "corrupt", [chunk("truncated payload", "!!!not-base64!!!")]);
    await seed(ctx, "healthy", [chunk("apples and oranges", encodeChunkVector([1, 0, 0]))]);

    const results = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0 });

    expect(results.map((r) => r.chunkText)).toEqual(["apples and oranges"]);
  });

  it("says once per pass that it dropped unreadable vectors", async () => {
    // Skipping the row silently is what made this hard to notice: the corrupt
    // chunk just stops appearing in results and nothing anywhere says why. The
    // count has to be in the message, or a one-bad-chunk pass and a whole-row
    // corruption read the same.
    await seed(ctx, "corrupt", [
      chunk("truncated payload", "!!!not-base64!!!"),
      chunk("also truncated", "@@@@"),
    ]);
    await seed(ctx, "healthy", [chunk("apples and oranges", encodeChunkVector([1, 0, 0]))]);

    await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0 });

    expect(unreadableWarnings()).toHaveLength(1);
    expect(unreadableWarnings()[0]).toContain("could not read 2 chunk vectors");
  });

  it("says nothing when every vector reads cleanly", async () => {
    // The other half. A warning that fired on a healthy pass would be noise, and
    // a chunk with no vector at all is healthy, not corrupt.
    await seed(ctx, "healthy", [chunk("apples and oranges", encodeChunkVector([1, 0, 0]))]);
    await seed(ctx, "legacy", [chunk("a distant topic", [0, 1, 0])]);
    await seed(ctx, "no-vector", [chunk("never embedded", [])]);

    await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0 });

    expect(unreadableWarnings()).toEqual([]);
  });
});
