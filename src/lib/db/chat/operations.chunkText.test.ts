// @vitest-environment happy-dom
import { webcrypto } from "node:crypto";

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionKeys,
  requestEncryptionKey,
  type SignMessageFn,
} from "../../../react/useEncryption";
import { decryptJsonField } from "../encryption-utils";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation, Message } from "./models";
import {
  createConversationOp,
  createMessageOp,
  getMessagesOp,
  searchChunksOp,
  type StorageOperationsContext,
  updateMessageChunksOp,
} from "./operations";
import type { MessageChunk } from "./types";

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const SECRET = "MY-BANK-PIN-IS-SEVEN-SEVEN-THREE-ONE";
const MODEL = "qwen/qwen3-embedding-8b";

const mockSignMessage = vi.fn<SignMessageFn>((message) =>
  Promise.resolve(`0x${Buffer.from(message).toString("hex").padStart(130, "0")}`)
);

function ensureCrypto(): void {
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
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
    clearAllEncryptionKeys();
    await requestEncryptionKey(TEST_ADDRESS, mockSignMessage);
  });

  it("does not write the chunk text to the column", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db, true);
    const { content, chunks } = tile([`Some preamble ${SECRET}`, "and a trailer"]);
    await seed(ctx, content, chunks);

    const raw = await rawChunks(db, "m1");
    expect(raw).not.toContain(SECRET);
    expect(raw).not.toContain("preamble");
    const parsed = await decryptJsonField<MessageChunk[]>(raw, TEST_ADDRESS);
    expect(parsed?.[0].text).toBeUndefined();
    expect(parsed?.[0].startOffset).toBe(0);
    expect(parsed?.[0].vector).toEqual(chunks[0].vector);
  });

  it("seals the column and decrypts it before JSON parsing", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db, true);
    const { content, chunks } = tile(["alpha beta", "gamma delta"]);
    await seed(ctx, content, chunks);

    const raw = await rawChunks(db, "m1");
    expect(raw.startsWith("enc:v3:")).toBe(true);
    expect(() => {
      JSON.parse(raw);
    }).toThrow();
    const parsed = (await decryptJsonField<MessageChunk[]>(raw, TEST_ADDRESS))!;
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
    const db = makeDatabase();
    const ctx = ctxFor(db, true);
    const { content, chunks } = tile(["apples and oranges", "the weather today"]);
    await seed(ctx, content, chunks);

    const row = await db.get<Message>("history").find("m1");
    const rewritten = `An entirely different opening sentence. ${content}`;
    await db.write(async () => {
      await row.update((m) => m._setRaw("content", rewritten));
    });

    const hits = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0.99 });
    expect(hits[0]?.chunkText).toBe(rewritten);
    expect(hits[0]?.chunkText).not.toBe(rewritten.slice(0, 18));
  });

  it("still reads a LEGACY row that carries its text", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db, true);
    const { content, chunks } = tile(["apples and oranges", "the weather today"]);
    await seed(ctx, content, chunks);

    const row = await db.get<Message>("history").find("m1");
    await db.write(async () => {
      await row.update((m) => m._setRaw("chunks", JSON.stringify(chunks)));
    });

    const hits = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0.99 });
    expect(hits[0]?.chunkText).toBe("apples and oranges");
  });

  it("reads the same chunks with and without encryption configured", async () => {
    const encDb = makeDatabase();
    const plainDb = makeDatabase();
    const { content, chunks } = tile(["alpha beta", "gamma delta"]);
    await seed(ctxFor(encDb, true), content, chunks);
    await seed(ctxFor(plainDb, false), content, chunks);

    expect(await decryptJsonField(await rawChunks(encDb, "m1"), TEST_ADDRESS)).toEqual(
      JSON.parse(await rawChunks(plainDb, "m1"))
    );
  });
});

describe("getMessagesOp rawFilter", () => {
  beforeEach(async () => {
    ensureCrypto();
    clearAllEncryptionKeys();
    await requestEncryptionKey(TEST_ADDRESS, mockSignMessage);
  });

  it("drops rows on raw columns before decrypting, and decrypts the rest", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db, true);
    const { content, chunks } = tile(["already embedded text", "second chunk"]);
    await seed(ctx, content, chunks);
    await createMessageOp(ctx, {
      conversationId: "conv_1",
      role: "user",
      content: "not embedded yet",
      uniqueId: "m2",
    });

    const seen: unknown[] = [];
    const messages = await getMessagesOp(ctx, "conv_1", {
      rawFilter: (raw) => {
        seen.push(raw.content);
        return !raw.chunks;
      },
    });

    expect(seen).toHaveLength(2);
    expect(seen.every((c) => typeof c === "string" && c.startsWith("enc:"))).toBe(true);
    expect(messages.map((m) => m.uniqueId)).toEqual(["m2"]);
    expect(messages[0].content).toBe("not embedded yet");
  });
});
