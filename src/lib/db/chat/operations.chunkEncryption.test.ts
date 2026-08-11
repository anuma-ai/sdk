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
 * sdk#880 — chunk text must not be stored in the clear.
 *
 * A `MessageChunk` carries `text`, and `chunkText` covers the message end to end
 * with a 50-character overlap, so the chunk set of any >400-char message
 * reconstructs the whole thing. Storing it unencrypted put a fully readable copy
 * of the message beside its own ciphertext `content`, with offsets, on a device
 * where the user had explicitly enabled at-rest encryption.
 *
 * These tests read the RAW column back — asserting on the round-trip alone would
 * pass just as well against a plaintext write, which is exactly how this went
 * unnoticed: `encryptMessageFields` has a `chunks` branch that has never
 * executed, so the code looked covered.
 */

declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const SECRET = "MY-BANK-PIN-IS-SEVEN-SEVEN-THREE-ONE";

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
    dbName: `chunkenc-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

/** Encrypting ctx — a live signer, as a real encrypted deployment has. */
function encryptingCtx(db: Database): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
    walletAddress: TEST_ADDRESS,
    signMessage: mockSignMessage,
  };
}

/** No wallet/signer — an unencrypted deployment. Must stay byte-identical. */
function plainCtx(db: Database): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
  };
}

function chunk(text: string): MessageChunk {
  return { text, vector: [0.1, 0.2, 0.3], startOffset: 0, endOffset: text.length };
}

async function seedMessage(ctx: StorageOperationsContext): Promise<string> {
  await createConversationOp(ctx, { conversationId: "conv_1", title: "T" });
  const msg = await createMessageOp(ctx, {
    conversationId: "conv_1",
    role: "user",
    content: `Some preamble. ${SECRET}. Some trailer.`,
  });
  return msg!.uniqueId;
}

/** The raw column, straight off the model — no decrypt shim in the way. */
async function rawChunks(db: Database, uniqueId: string): Promise<string> {
  const row = await db.get<Message>("history").find(uniqueId);
  return String(row._getRaw("chunks") ?? "");
}

describe("updateMessageChunksOp — chunk text at rest (sdk#880)", () => {
  beforeEach(async () => {
    ensureCrypto();
    await clearAllEncryptionKeys();
    await requestEncryptionKey(TEST_ADDRESS, mockSignMessage);
  });

  it("does not leave the chunk text readable in the column", async () => {
    const db = makeDatabase();
    const ctx = encryptingCtx(db);
    const uniqueId = await seedMessage(ctx);

    await updateMessageChunksOp(ctx, uniqueId, [chunk(`Some preamble. ${SECRET}.`)], "model-x");

    const raw = await rawChunks(db, uniqueId);
    // The actual defect: the secret was greppable in the column.
    expect(raw).not.toContain(SECRET);
    expect(raw).not.toContain("preamble");
    expect(raw.startsWith("enc:")).toBe(true);
  });

  it("still round-trips the chunks back through the search read path", async () => {
    const db = makeDatabase();
    const ctx = encryptingCtx(db);
    const uniqueId = await seedMessage(ctx);
    const text = `Some preamble. ${SECRET}.`;

    await updateMessageChunksOp(ctx, uniqueId, [chunk(text)], "model-x");

    // searchChunksOp goes through readJsonField, which branches on isEncrypted.
    const hits = await searchChunksOp(ctx, [0.1, 0.2, 0.3], { minSimilarity: 0 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.chunkText === text)).toBe(true);
  });

  it("reads a LEGACY plaintext row without a migration", async () => {
    // Rows written before this change are plaintext. isEncrypted discriminates
    // per row, so both encodings coexist and no backfill is required — the whole
    // reason this fix needed no migration.
    const db = makeDatabase();
    const ctx = encryptingCtx(db);
    const uniqueId = await seedMessage(ctx);
    const text = `Legacy ${SECRET} row`;

    const row = await db.get<Message>("history").find(uniqueId);
    await db.write(async () => {
      await row.update((m) => {
        m._setRaw("chunks", JSON.stringify([chunk(text)]));
        m._setRaw("embedding_model", "model-x");
      });
    });
    expect(await rawChunks(db, uniqueId)).toContain(SECRET); // precondition

    const hits = await searchChunksOp(ctx, [0.1, 0.2, 0.3], { minSimilarity: 0 });
    expect(hits.some((h) => h.chunkText === text)).toBe(true);
  });

  it("leaves an unencrypted deployment byte-identical", async () => {
    // No signer → encryptField returns the value untouched, so a deployment that
    // never enabled encryption must see exactly the previous bytes.
    const db = makeDatabase();
    const ctx = plainCtx(db);
    const uniqueId = await seedMessage(ctx);
    const chunks = [chunk("nothing secret here")];

    await updateMessageChunksOp(ctx, uniqueId, chunks, "model-x");

    expect(await rawChunks(db, uniqueId)).toBe(JSON.stringify(chunks));
  });
});
