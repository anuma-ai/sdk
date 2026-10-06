// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation, Message } from "./models";
import {
  createConversationOp,
  createMessageOp,
  searchChunksOp,
  type StorageOperationsContext,
  stripLegacyChunkTextOp,
} from "./operations";
import type { MessageChunk } from "./types";

/**
 * Rows chunked before sdk#889 still carry a plaintext copy of the message in
 * `chunks[].text`. These assert on the RAW column, because a read through
 * `resolveChunkText` looks the same whether the text is stored or rebuilt.
 */

const SECRET = "MY-BANK-PIN-IS-SEVEN-SEVEN-THREE-ONE";
const PINNED_UPDATED_AT = 1_700_000_000_000;

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `stripchunktext-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function ctxFor(db: Database): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
  };
}

/** Chunks that tile `content` the way `chunkText` produces them, text included. */
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

/** Writes a message whose `chunks` column holds exactly `rawChunks`, with a known `updated_at`. */
async function seedRaw(
  ctx: StorageOperationsContext,
  uniqueId: string,
  content: string,
  rawChunks: string
): Promise<void> {
  const conversations = await ctx.conversationsCollection.query().fetch();
  if (conversations.length === 0) {
    await createConversationOp(ctx, { conversationId: "conv_1", title: "T" });
  }
  await createMessageOp(ctx, { conversationId: "conv_1", role: "user", content, uniqueId });
  const row = await ctx.messagesCollection.find(uniqueId);
  await ctx.database.write(async () => {
    await row.update((m) => {
      m._setRaw("chunks", rawChunks);
      m._setRaw("updated_at", PINNED_UPDATED_AT);
    });
  });
}

async function rawRow(db: Database, uniqueId: string): Promise<Record<string, unknown>> {
  const rows = (await db.get<Message>("history").query().unsafeFetchRaw()) as Record<
    string,
    unknown
  >[];
  const row = rows.find((r) => r.id === uniqueId);
  if (!row) throw new Error(`no row ${uniqueId}`);
  return row;
}

describe("stripLegacyChunkTextOp", () => {
  it("removes the stored text and keeps vectors, offsets and updated_at", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db);
    const { content, chunks } = tile([`Some preamble ${SECRET}`, "and a trailer"]);
    await seedRaw(ctx, "m1", content, JSON.stringify(chunks));

    expect(await stripLegacyChunkTextOp(ctx)).toBe(1);

    const row = await rawRow(db, "m1");
    expect(String(row.chunks)).not.toContain(SECRET);
    expect(JSON.parse(String(row.chunks))).toEqual(chunks.map(({ text: _text, ...rest }) => rest));
    expect(row.updated_at).toBe(PINNED_UPDATED_AT);
  });

  it("leaves a row written without text byte-identical, and a second run does nothing", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db);
    const { content, chunks } = tile(["alpha beta", "gamma delta"]);
    // A base64 vector (sdk#862) can contain `text`, which the LIKE prefilter
    // matches; only the JSON check keeps this row out.
    const withoutText = JSON.stringify(
      chunks.map(({ text: _text, ...rest }) => ({ ...rest, vector: "AAAtextAA==" }))
    );
    await seedRaw(ctx, "fresh", content, withoutText);
    await seedRaw(ctx, "legacy", content, JSON.stringify(chunks));

    expect(await stripLegacyChunkTextOp(ctx)).toBe(1);
    expect((await rawRow(db, "fresh")).chunks).toBe(withoutText);
    expect(await stripLegacyChunkTextOp(ctx)).toBe(0);
  });

  it("skips a chunks column that is not a JSON array", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db);
    await seedRaw(ctx, "enc", "x", 'enc:v3:00ff"text":');
    await seedRaw(ctx, "obj", "x", '{"text":"not an array"}');

    expect(await stripLegacyChunkTextOp(ctx)).toBe(0);
    expect((await rawRow(db, "enc")).chunks).toBe('enc:v3:00ff"text":');
    expect((await rawRow(db, "obj")).chunks).toBe('{"text":"not an array"}');
  });

  it("still serves the offset snippet after the strip", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db);
    const { content, chunks } = tile(["apples and oranges", "the weather today"]);
    await seedRaw(ctx, "m1", content, JSON.stringify(chunks));

    await stripLegacyChunkTextOp(ctx);

    const hits = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0.99 });
    expect(hits[0]?.chunkText).toBe("apples and oranges");
  });

  it("serves the whole message for a row edited after chunking", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db);
    const { content, chunks } = tile(["apples and oranges", "the weather today"]);
    const rewritten = `An entirely different opening sentence. ${content}`;
    await seedRaw(ctx, "m1", rewritten, JSON.stringify(chunks));

    await stripLegacyChunkTextOp(ctx);

    const hits = await searchChunksOp(ctx, [1, 0, 0], { minSimilarity: 0.99 });
    expect(hits[0]?.chunkText).toBe(rewritten);
  });

  it("strips every legacy row across more than one page", async () => {
    const db = makeDatabase();
    const ctx = ctxFor(db);
    const { content, chunks } = tile(["alpha beta", "gamma delta"]);
    for (let i = 0; i < 150; i++) {
      await seedRaw(ctx, `m${i}`, content, JSON.stringify(chunks));
    }

    expect(await stripLegacyChunkTextOp(ctx)).toBe(150);

    const rows = (await db.get<Message>("history").query().unsafeFetchRaw()) as Record<
      string,
      unknown
    >[];
    expect(rows.filter((r) => String(r.chunks).includes('"text"'))).toHaveLength(0);
  });
});
