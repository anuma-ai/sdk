// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LlmapiToolCallEvent } from "../../../client";
import {
  clearAllEncryptionKeys,
  requestEncryptionKey,
  seedEncryptionKeys,
  type SignMessageFn,
} from "../../../react/useEncryption";
import { encryptField, isEncrypted } from "../encryption-utils";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Conversation, Message } from "./models";
import {
  createConversationOp,
  createMessageOp,
  getMessagesOp,
  getToolCallEventIdsOp,
  type StorageOperationsContext,
  upsertMessageOp,
} from "./operations";

declare const global: typeof globalThis;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
const mockSignMessage = vi.fn(
  async (message: string) => `0x${Buffer.from(message).toString("hex").padStart(130, "0")}`
) as unknown as SignMessageFn;

const PINNED_UPDATED_AT = 1_700_000_000_000;

const EVENTS: LlmapiToolCallEvent[] = [
  {
    id: "call_1",
    name: "web_search",
    arguments: '{"query":"SECRET-ARG-1"}',
    output: '{"results":["SECRET-OUT-1"]}',
    cost_micro_usd: 42,
  },
  {
    id: "call_2",
    name: "notion_search",
    arguments: '{"query":"SECRET-ARG-2"}',
    output:
      '<untrusted_third_party_data source="notion_search">{"page":"SECRET-OUT-2"}</untrusted_third_party_data>',
  },
];
const SECRETS = ["SECRET-ARG-1", "SECRET-OUT-1", "SECRET-ARG-2", "SECRET-OUT-2"];

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
    dbName: `toolcallevents-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function plainCtx(db: Database): StorageOperationsContext {
  return {
    database: db,
    messagesCollection: db.get("history"),
    conversationsCollection: db.get<Conversation>("conversations"),
  };
}

function encryptedCtx(db: Database): StorageOperationsContext {
  return { ...plainCtx(db), walletAddress: TEST_ADDRESS, signMessage: mockSignMessage };
}

function lockedCtx(db: Database): StorageOperationsContext {
  return { ...plainCtx(db), walletAddress: TEST_ADDRESS };
}

async function encryptEvents(events: LlmapiToolCallEvent[]): Promise<LlmapiToolCallEvent[]> {
  return Promise.all(
    events.map(async (event) => ({
      ...event,
      arguments: await encryptField(event.arguments ?? "", TEST_ADDRESS, mockSignMessage),
      output: await encryptField(event.output ?? "", TEST_ADDRESS, mockSignMessage),
    }))
  );
}

async function seedRaw(db: Database, uniqueId: string, toolCallEvents: string): Promise<void> {
  const ctx = plainCtx(db);
  const conversations = await ctx.conversationsCollection.query().fetch();
  if (conversations.length === 0) {
    await createConversationOp(ctx, { conversationId: "conv_1", title: "T" });
  }
  await createMessageOp(ctx, {
    conversationId: "conv_1",
    role: "assistant",
    content: "plain reply",
    uniqueId,
  });
  const row = await ctx.messagesCollection.find(uniqueId);
  await ctx.database.write(async () => {
    await row.update((m) => {
      m._setRaw("tool_call_events", toolCallEvents);
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

async function expectEncryptedAtRest(db: Database, uniqueId: string): Promise<void> {
  const column = String((await rawRow(db, uniqueId)).tool_call_events);
  for (const secret of SECRETS) expect(column).not.toContain(secret);
  const stored = JSON.parse(column) as LlmapiToolCallEvent[];
  expect(stored.map((e) => [e.id, e.name])).toEqual(EVENTS.map((e) => [e.id, e.name]));
  expect(stored[0].cost_micro_usd).toBe(42);
  for (const event of stored) {
    expect(isEncrypted(event.arguments ?? "")).toBe(true);
    expect(isEncrypted(event.output ?? "")).toBe(true);
  }
}

async function readOne(ctx: StorageOperationsContext, uniqueId: string) {
  const messages = await getMessagesOp(ctx, "conv_1");
  const message = messages.find((m) => m.uniqueId === uniqueId);
  if (!message) throw new Error(`no message ${uniqueId}`);
  return message;
}

beforeEach(async () => {
  vi.clearAllMocks();
  clearAllEncryptionKeys();
  ensureCrypto();
  await requestEncryptionKey(TEST_ADDRESS, mockSignMessage);
});

describe("tool call events are encrypted at rest", () => {
  it("createMessageOp stores arguments and output encrypted, id and name readable", async () => {
    const db = makeDatabase();
    await createMessageOp(encryptedCtx(db), {
      conversationId: "conv_1",
      role: "assistant",
      content: "reply",
      uniqueId: "m1",
      toolCallEvents: EVENTS,
    });
    await expectEncryptedAtRest(db, "m1");
  });

  it("upsertMessageOp stores events encrypted on create and on update", async () => {
    const db = makeDatabase();
    const ctx = encryptedCtx(db);
    await upsertMessageOp(ctx, {
      conversationId: "conv_1",
      role: "assistant",
      content: "partial",
      uniqueId: "m1",
      toolCallEvents: [EVENTS[0]],
    });
    const first = JSON.parse(String((await rawRow(db, "m1")).tool_call_events));
    expect(isEncrypted(first[0].arguments)).toBe(true);
    expect(isEncrypted(first[0].output)).toBe(true);

    await upsertMessageOp(ctx, {
      conversationId: "conv_1",
      role: "assistant",
      content: "final",
      uniqueId: "m1",
      toolCallEvents: EVENTS,
    });
    await expectEncryptedAtRest(db, "m1");
  });

  it("does not mutate the caller's events", async () => {
    const db = makeDatabase();
    const events = EVENTS.map((e) => ({ ...e }));
    await createMessageOp(encryptedCtx(db), {
      conversationId: "conv_1",
      role: "assistant",
      content: "reply",
      uniqueId: "m1",
      toolCallEvents: events,
    });
    expect(events).toEqual(EVENTS);
  });
});

describe("tool call events on a decrypting read", () => {
  it("returns the original events with the right key after createMessageOp", async () => {
    const db = makeDatabase();
    const ctx = encryptedCtx(db);
    await createMessageOp(ctx, {
      conversationId: "conv_1",
      role: "assistant",
      content: "reply",
      uniqueId: "m1",
      toolCallEvents: EVENTS,
    });
    const message = await readOne(ctx, "m1");
    expect(message.toolCallEvents).toEqual(EVENTS);
    expect(message.decryptionStatus).toBeUndefined();
  });

  it("returns the original events with the right key on an events-only message", async () => {
    const db = makeDatabase();
    await seedRaw(db, "m1", JSON.stringify(await encryptEvents(EVENTS)));
    const message = await readOne(encryptedCtx(db), "m1");
    expect(message.toolCallEvents).toEqual(EVENTS);
    expect(message.decryptionStatus).toBeUndefined();
  });

  it("keeps the ciphertext and reports key_missing when no key is held", async () => {
    const db = makeDatabase();
    const encrypted = await encryptEvents(EVENTS);
    await seedRaw(db, "m1", JSON.stringify(encrypted));
    clearAllEncryptionKeys();

    const message = await readOne(lockedCtx(db), "m1");
    expect(message.decryptionStatus).toBe("key_missing");
    expect(message.toolCallEvents).toEqual(encrypted);
    expect(JSON.stringify(message.toolCallEvents)).not.toMatch(/SECRET-/);
  });

  it("keeps the ciphertext and reports auth_mismatch under a wrong key", async () => {
    const db = makeDatabase();
    const encrypted = await encryptEvents(EVENTS);
    await seedRaw(db, "m1", JSON.stringify(encrypted));
    clearAllEncryptionKeys();
    seedEncryptionKeys(TEST_ADDRESS, { current: "ee".repeat(32) });

    const message = await readOne(lockedCtx(db), "m1");
    expect(message.decryptionStatus).toBe("auth_mismatch");
    expect(message.toolCallEvents).toEqual(encrypted);
  });

  it("self-heals a wrong pinned key from an event's ciphertext", async () => {
    const db = makeDatabase();
    await seedRaw(db, "m1", JSON.stringify(await encryptEvents(EVENTS)));
    clearAllEncryptionKeys();
    seedEncryptionKeys(TEST_ADDRESS, { current: "cd".repeat(32) });

    const message = await readOne(encryptedCtx(db), "m1");
    expect(message.toolCallEvents).toEqual(EVENTS);
    expect(message.decryptionStatus).toBeUndefined();
  });

  it("decrypts a row that mixes a plaintext and an encrypted event", async () => {
    const db = makeDatabase();
    const [, encryptedSecond] = await encryptEvents(EVENTS);
    await seedRaw(db, "m1", JSON.stringify([EVENTS[0], encryptedSecond]));
    const message = await readOne(encryptedCtx(db), "m1");
    expect(message.toolCallEvents).toEqual(EVENTS);
    expect(message.decryptionStatus).toBeUndefined();
  });

  it("decodes a whole-column ciphertext into the events array", async () => {
    const db = makeDatabase();
    const column = await encryptField(JSON.stringify(EVENTS), TEST_ADDRESS, mockSignMessage);
    await seedRaw(db, "m1", column);
    const message = await readOne(encryptedCtx(db), "m1");
    expect(message.toolCallEvents).toEqual(EVENTS);
    expect(message.decryptionStatus).toBeUndefined();
  });

  it("returns no events and key_missing for a whole-column ciphertext without a key", async () => {
    const db = makeDatabase();
    const column = await encryptField(JSON.stringify(EVENTS), TEST_ADDRESS, mockSignMessage);
    await seedRaw(db, "m1", column);
    clearAllEncryptionKeys();
    const message = await readOne(lockedCtx(db), "m1");
    expect(message.toolCallEvents).toBeUndefined();
    expect(message.decryptionStatus).toBe("key_missing");
  });

  it("returns no events for a column that decodes to something other than an array", async () => {
    const db = makeDatabase();
    await seedRaw(db, "obj", '{"id":"x"}');
    await seedRaw(db, "encObj", await encryptField('{"id":"x"}', TEST_ADDRESS, mockSignMessage));
    const ctx = encryptedCtx(db);
    expect((await readOne(ctx, "obj")).toolCallEvents).toBeUndefined();
    expect((await readOne(ctx, "encObj")).toolCallEvents).toBeUndefined();
  });
});

describe("getToolCallEventIdsOp with encrypted events", () => {
  it("returns every id while the wallet is locked", async () => {
    const db = makeDatabase();
    await createMessageOp(encryptedCtx(db), {
      conversationId: "conv_1",
      role: "assistant",
      content: "reply",
      uniqueId: "m1",
      toolCallEvents: EVENTS,
    });
    clearAllEncryptionKeys();
    expect(await getToolCallEventIdsOp(lockedCtx(db), "conv_1")).toEqual(
      new Set(["call_1", "call_2"])
    );
  });

  it("skips a whole-column ciphertext without throwing", async () => {
    const db = makeDatabase();
    await seedRaw(
      db,
      "m1",
      await encryptField(JSON.stringify(EVENTS), TEST_ADDRESS, mockSignMessage)
    );
    await seedRaw(db, "m2", JSON.stringify([EVENTS[0]]));
    expect(await getToolCallEventIdsOp(lockedCtx(db), "conv_1")).toEqual(new Set(["call_1"]));
  });
});
