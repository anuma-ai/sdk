// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAllEncryptionKeys,
  getEncryptionKey,
  seedEncryptionKeys,
} from "../../react/useEncryption";
import { Conversation, Message } from "../db/chat/models";
import {
  createConversationOp,
  createMessageOp,
  type StorageOperationsContext,
} from "../db/chat/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import { type Logger, noopLogger, setLogger } from "../logger";
import { chunkAndEmbedAllMessages } from "./embeddings";

declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const LEGACY_KEY = "ab".repeat(32);
const CURRENT_KEY = "cd".repeat(32);
const INDEXED = JSON.stringify([{ vector: [1, 2, 3], startOffset: 0, endOffset: 6 }]);

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
    dbName: `key-telemetry-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function ctxFor(db: Database): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
    walletAddress: TEST_ADDRESS,
  };
}

async function seal(text: string, version: "v2" | "v3"): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await getEncryptionKey(TEST_ADDRESS, version),
      new TextEncoder().encode(text)
    )
  );
  const hex = Array.from([...iv, ...ciphertext])
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `enc:${version}:${hex}`;
}

async function seedRow(
  db: Database,
  uniqueId: string,
  content: string,
  chunks: string | null
): Promise<void> {
  await createMessageOp(ctxFor(db), {
    conversationId: "conv_1",
    role: "user",
    content: "placeholder",
    uniqueId,
  });
  const row = await db.get<Message>("history").find(uniqueId);
  await db.write(async () => {
    await row.update((m) => {
      m._setRaw("content", content);
      m._setRaw("chunks", chunks);
      m._setRaw("embedding_model", chunks ? "qwen/qwen3-embedding-8b" : null);
    });
  });
}

describe("chunkAndEmbedAllMessages key telemetry with a partially hydrated key store", () => {
  let errors: unknown[][] = [];

  beforeEach(async () => {
    ensureCrypto();
    clearAllEncryptionKeys();
    seedEncryptionKeys(TEST_ADDRESS, { legacy: LEGACY_KEY, current: CURRENT_KEY });
    errors = [];
    const spy: Logger = {
      ...noopLogger,
      error: (...args: unknown[]) => {
        errors.push(args);
      },
    };
    setLogger(spy);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }))
    );
  });

  afterEach(() => {
    setLogger(noopLogger);
    vi.unstubAllGlobals();
  });

  async function vault(rows: { id: string; version: "v2" | "v3"; indexed: boolean }[]) {
    const db = makeDatabase();
    await createConversationOp(ctxFor(db), { conversationId: "conv_1", title: "T" });
    for (const row of rows) {
      const content = await seal(`message ${row.id} ${"x".repeat(40)}`, row.version);
      await seedRow(db, row.id, content, row.indexed ? INDEXED : null);
    }
    clearAllEncryptionKeys();
    seedEncryptionKeys(TEST_ADDRESS, { legacy: LEGACY_KEY });
    return db;
  }

  it("reports unreadable v3 rows in a fully indexed vault even when the v2 probe opens", async () => {
    const db = await vault([
      { id: "old", version: "v2", indexed: true },
      { id: "new", version: "v3", indexed: true },
    ]);

    await chunkAndEmbedAllMessages(ctxFor(db), { apiKey: "k", baseUrl: "https://portal.test" });

    expect(errors).toHaveLength(1);
    expect(errors[0][2]).toEqual({
      stillEncrypted: 0,
      considered: 0,
      sealedRowsSeen: 1,
      rowsSeen: 2,
    });
  });

  it("does not let a decrypted v2 candidate vouch for dropped v3 rows", async () => {
    const db = await vault([
      { id: "old-fresh", version: "v2", indexed: false },
      { id: "new-indexed", version: "v3", indexed: true },
    ]);

    await chunkAndEmbedAllMessages(ctxFor(db), { apiKey: "k", baseUrl: "https://portal.test" });

    const telemetry = errors.filter(([message]) => String(message).includes("still encrypted"));
    expect(telemetry).toHaveLength(1);
    expect(telemetry[0][2]).toMatchObject({ sealedRowsSeen: 1, rowsSeen: 2 });
  });

  it("stays quiet when every version present can be opened", async () => {
    const db = await vault([{ id: "old", version: "v2", indexed: true }]);

    await chunkAndEmbedAllMessages(ctxFor(db), { apiKey: "k", baseUrl: "https://portal.test" });

    expect(errors).toEqual([]);
  });
});
