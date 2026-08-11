// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionKeys,
  requestEncryptionKey,
  type SignMessageFn,
} from "../../../react/useEncryption";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation, Message } from "./models";
import {
  createConversationOp,
  createMessageOp,
  searchChunksOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
} from "./operations";
import type { MessageChunk } from "./types";

/**
 * sdk#880 — chunk text is not persisted; snippets are rebuilt from offsets.
 *
 * Encrypting the column was the first attempt and was wrong: the client never
 * calls `searchChunksOp`, it reads this column raw and `JSON.parse`s it in four
 * places, each swallowing the throw and scoring 0. Not storing the text avoids
 * that entirely AND removes the plaintext rather than protecting it.
 *
 * These assert on the RAW column, because a round-trip assertion passes just as
 * well against a writer that still stores the text.
 */

declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const SECRET = "MY-BANK-PIN-IS-SEVEN-SEVEN-THREE-ONE";
const MODEL = "qwen/qwen3-embedding-8b";

const mockSignMessage = vi.fn(
  async (message: string) => `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`
) as unknown as SignMessageFn;

function ensureCrypto(): void {
  if (!global.crypto) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { webcrypto } = require("node:crypto");
    Object.defineProperty(global, "crypto", {
      value: webcrypto as Crypto,
      writable: true,
      configurable: true,
    });
  }
}

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `chunktext-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function ctxFor(db: Database, encrypted: boolean): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
    ...(encrypted && { walletAddress: TEST_ADDRESS, signMessage: mockSignMessage }),
  };
}

/** Chunks that genuinely tile `content`, the way `chunkText` produces them. */
function tile(texts: string[]): { content: string; chunks: MessageChunk[] } {
  const content = texts.join(" ");
  let cursor = 0;
  const chunks = texts.map((text, i) => {
    const startOffset = cursor;
    const endOffset = startOffset + text.length;
    cursor = endOffset + 1;
    return { text, vector: [i === 0 ? 1 : 0, i === 0 ? 0 : 1, 0], startOffset, endOffset };
  });
  return { content, chunks };
}

async function seed(
  ctx: StorageOperationsContext,
  content: string,
  chunks: MessageChunk[]
): Promise<string> {
  await createConversationOp(ctx, { conversationId: "conv_1", title: "T" });
  await createMessageOp(ctx, {
    conversationId: "conv_1",
    role: "user",
    content,
    uniqueId: "m1",
  });
  await updateMessageChunksOp(ctx, "m1", chunks, MODEL);
  return "m1";
}

async function rawChunks(db: Database, uniqueId: string): Promise<string> {
  const row = await db.get<Message>("history").find(uniqueId);
  return String(row._getRaw("chunks") ?? "");
}

describe("updateMessageChunksOp — chunk text is not persisted (sdk#880)", () => {
  beforeEach(async () => {
    ensureCrypto();
    await clearAllEncryptionKeys();
    await requestEncryptionKey(TEST_ADDRESS, mockSignMessage);
  });

  it("does not write the chunk text to the column", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db, true);
    const { content, chunks } = tile([`Some preamble ${SECRET}`, "and a trailer"]);
    await seed(ctx, content, chunks);

    const raw = await rawChunks(db, "m1");
    // The defect: the secret was greppable in this column.
    expect(raw).not.toContain(SECRET);
    expect(raw).not.toContain("preamble");
    // ...and the vectors/offsets that make search work are still there.
    expect(raw).toContain("startOffset");
    expect(raw).toContain("vector");
  });

  it("leaves the column as plain JSON, so the client's raw JSON.parse still works", async () => {
    // The client reads this column raw and JSON.parses it in four places, each
    // catching and returning 0. Ciphertext there would silently zero chunk
    // scoring — which is why this is NOT encrypted.
    const db = makeDatabase();
    const ctx = ctxFor(db, true);
    const { content, chunks } = tile(["alpha beta", "gamma delta"]);
    await seed(ctx, content, chunks);

    const raw = await rawChunks(db, "m1");
    expect(raw.startsWith("enc:")).toBe(false);
    expect(() => JSON.parse(raw)).not.toThrow();
    const parsed = JSON.parse(raw) as MessageChunk[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0].vector).toBeDefined();
    expect(parsed[0].text).toBeUndefined();
  });

  it("rebuilds the snippet from offsets on read", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db, true);
    const { content, chunks } = tile(["apples and oranges", "the weather today"]);
    await seed(ctx, content, chunks);

    const hits = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0.99 });
    expect(hits[0]?.chunkText).toBe("apples and oranges");
  });

  it("falls back to the whole message when content was rewritten under the offsets", async () => {
    // `upsertMessageOp` rewrites `content` without touching `chunks`, so offsets
    // can outlive the text they described. An in-bounds slice of the NEW content
    // would be a plausible-looking excerpt of the wrong text — worse than a
    // visibly coarse fallback, and invisible to the reader.
    const db = makeDatabase();
    const ctx = ctxFor(db, true);
    const { content, chunks } = tile(["apples and oranges", "the weather today"]);
    await seed(ctx, content, chunks);

    const row = await db.get<Message>("history").find("m1");
    // PREPEND, not append. An append leaves offset 0..18 pointing at the same
    // words, so a missing guard would look fine by luck. Prepending shifts every
    // offset, so slicing 0..18 of the new content yields a real excerpt of the
    // WRONG text — which is the failure this guard exists to prevent, and the
    // one a reader cannot detect.
    const rewritten = `An entirely different opening sentence. ${content}`;
    await db.write(async () => {
      await row.update((m) => m._setRaw("content", rewritten));
    });

    const hits = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0.99 });
    expect(hits[0]?.chunkText).toBe(rewritten);
    // Guard against the specific wrong answer, not just "not the slice".
    expect(hits[0]?.chunkText).not.toBe(rewritten.slice(0, 18));
  });

  it("still reads a LEGACY row that carries its text", async () => {
    // Rows written before this change keep `text`; it wins over the slice, so
    // they read exactly as before and need no migration.
    const db = makeDatabase();
    const ctx = ctxFor(db, true);
    const { content, chunks } = tile(["apples and oranges", "the weather today"]);
    await seed(ctx, content, chunks);

    const row = await db.get<Message>("history").find("m1");
    await db.write(async () => {
      await row.update((m) => m._setRaw("chunks", JSON.stringify(chunks))); // with text
    });

    const hits = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0.99 });
    expect(hits[0]?.chunkText).toBe("apples and oranges");
  });

  it("writes the same bytes with and without encryption configured", async () => {
    // Nothing here depends on a signer any more, which is the point: the
    // background indexing sweep can no longer throw on a cold key.
    const encDb = makeDatabase();
    const plainDb = makeDatabase();
    const { content, chunks } = tile(["alpha beta", "gamma delta"]);
    await seed(ctxFor(encDb, true), content, chunks);
    await seed(ctxFor(plainDb, false), content, chunks);

    expect(await rawChunks(encDb, "m1")).toBe(await rawChunks(plainDb, "m1"));
  });
});
