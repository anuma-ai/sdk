// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../react/useEncryption", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../../../react/useEncryption")>();
  return { ...orig, requestEncryptionKey: vi.fn(orig.requestEncryptionKey) };
});

import type { LlmapiToolCallEvent } from "../../../client";
import {
  clearAllEncryptionKeys,
  getEncryptionKey,
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
  encryptToolCallEventsOp,
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

const mockRequestEncryptionKey = vi.mocked(requestEncryptionKey);

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

describe("encryptToolCallEventsOp", () => {
  async function seedConversationUpdatedAt(db: Database, updatedAt: number): Promise<void> {
    const [conversation] = await db.get<Conversation>("conversations").query().fetch();
    await db.write(async () => {
      await conversation.update((c) => {
        c._setRaw("updated_at", updatedAt);
      });
    });
  }

  async function conversationUpdatedAt(db: Database): Promise<number> {
    const [conversation] = (await db
      .get<Conversation>("conversations")
      .query()
      .unsafeFetchRaw()) as Record<string, unknown>[];
    return Number(conversation.updated_at);
  }

  async function seedPlaintext(db: Database, ids: string[]): Promise<void> {
    for (const id of ids) await seedRaw(db, id, JSON.stringify(EVENTS));
    await seedConversationUpdatedAt(db, PINNED_UPDATED_AT);
  }

  it("encrypts plaintext rows and bumps the message and conversation updated_at", async () => {
    const db = makeDatabase();
    await seedPlaintext(db, ["m1", "m2"]);

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(2);

    await expectEncryptedAtRest(db, "m1");
    await expectEncryptedAtRest(db, "m2");
    expect(Number((await rawRow(db, "m1")).updated_at)).toBeGreaterThan(PINNED_UPDATED_AT);
    expect(await conversationUpdatedAt(db)).toBeGreaterThan(PINNED_UPDATED_AT);
    expect((await readOne(encryptedCtx(db), "m1")).toolCallEvents).toEqual(EVENTS);
  });

  it("repairs every page across several conversations", async () => {
    const db = makeDatabase();
    const ctx = plainCtx(db);
    const conversationIds = ["conv_a", "conv_b"];
    const ids = Array.from({ length: 205 }, (_, i) => `m${i}`);
    for (const conversationId of conversationIds) {
      await createConversationOp(ctx, { conversationId, title: "T" });
    }
    for (const [i, uniqueId] of ids.entries()) {
      await createMessageOp(ctx, {
        conversationId: conversationIds[i % 2],
        role: "assistant",
        content: "plain reply",
        uniqueId,
      });
    }
    await db.write(async () => {
      const messages = await ctx.messagesCollection.query().fetch();
      const conversations = await ctx.conversationsCollection.query().fetch();
      await db.batch(
        ...messages.map((m) =>
          m.prepareUpdate((msg) => {
            msg._setRaw("tool_call_events", JSON.stringify(EVENTS));
            msg._setRaw("updated_at", PINNED_UPDATED_AT);
          })
        ),
        ...conversations.map((c) =>
          c.prepareUpdate((conv) => conv._setRaw("updated_at", PINNED_UPDATED_AT))
        )
      );
    });

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(ids.length);

    for (const id of ids) await expectEncryptedAtRest(db, id);
    const conversations = (await db
      .get<Conversation>("conversations")
      .query()
      .unsafeFetchRaw()) as Record<string, unknown>[];
    expect(conversations.map((c) => c.conversation_id).sort()).toEqual(conversationIds);
    for (const conversation of conversations) {
      expect(Number(conversation.updated_at)).toBeGreaterThan(PINNED_UPDATED_AT);
    }
  });

  it("leaves already-encrypted rows untouched", async () => {
    const db = makeDatabase();
    const column = JSON.stringify(await encryptEvents(EVENTS));
    await seedRaw(db, "m1", column);
    await seedConversationUpdatedAt(db, PINNED_UPDATED_AT);

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(0);

    const row = await rawRow(db, "m1");
    expect(row.tool_call_events).toBe(column);
    expect(row.updated_at).toBe(PINNED_UPDATED_AT);
    expect(await conversationUpdatedAt(db)).toBe(PINNED_UPDATED_AT);
  });

  it("keeps an already-encrypted value byte-identical in a mixed row", async () => {
    const db = makeDatabase();
    const [, encryptedSecond] = await encryptEvents(EVENTS);
    await seedRaw(db, "m1", JSON.stringify([EVENTS[0], encryptedSecond]));

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(1);

    await expectEncryptedAtRest(db, "m1");
    const stored = JSON.parse(String((await rawRow(db, "m1")).tool_call_events));
    expect(stored[1]).toEqual(encryptedSecond);
  });

  it("is idempotent", async () => {
    const db = makeDatabase();
    await seedPlaintext(db, ["m1"]);
    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(1);
    const column = (await rawRow(db, "m1")).tool_call_events;

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(0);
    expect((await rawRow(db, "m1")).tool_call_events).toBe(column);
  });

  it("does nothing without a wallet, a signer, or a key", async () => {
    const db = makeDatabase();
    await seedPlaintext(db, ["m1"]);
    const plain = JSON.stringify(EVENTS);

    expect(await encryptToolCallEventsOp(plainCtx(db))).toBe(0);
    expect(await encryptToolCallEventsOp(lockedCtx(db))).toBe(0);
    mockRequestEncryptionKey.mockResolvedValueOnce(false);
    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(0);
    clearAllEncryptionKeys();
    mockRequestEncryptionKey.mockResolvedValueOnce(false);
    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(0);

    expect((await rawRow(db, "m1")).tool_call_events).toBe(plain);
    expect(await conversationUpdatedAt(db)).toBe(PINNED_UPDATED_AT);
  });

  async function seedUnderWrongPinnedKey(db: Database): Promise<void> {
    await createConversationOp(plainCtx(db), { conversationId: "conv_1", title: "T" });
    await createMessageOp(encryptedCtx(db), {
      conversationId: "conv_1",
      role: "user",
      content: "secret question",
      uniqueId: "probe",
    });
    await seedPlaintext(db, ["m1"]);
    clearAllEncryptionKeys();
    seedEncryptionKeys(TEST_ADDRESS, { legacy: "cd".repeat(32), current: "cd".repeat(32) });
  }

  async function seedV2Content(db: Database, uniqueId: string): Promise<void> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        await getEncryptionKey(TEST_ADDRESS, "v2"),
        new TextEncoder().encode("old question")
      )
    );
    const hex = Array.from([...iv, ...ciphertext])
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    await createMessageOp(plainCtx(db), {
      conversationId: "conv_1",
      role: "user",
      content: "placeholder",
      uniqueId,
    });
    const row = await db.get<Message>("history").find(uniqueId);
    await db.write(async () => {
      await row.update((m) => {
        m._setRaw("content", `enc:v2:${hex}`);
      });
    });
  }

  async function expectReadableAfterRederive(db: Database): Promise<void> {
    await expectEncryptedAtRest(db, "m1");
    clearAllEncryptionKeys();
    await requestEncryptionKey(TEST_ADDRESS, mockSignMessage);
    expect((await readOne(lockedCtx(db), "m1")).toolCallEvents).toEqual(EVENTS);
  }

  it("recovers a wrong saved v3 key when v2 data still opens", async () => {
    const db = makeDatabase();
    await createConversationOp(plainCtx(db), { conversationId: "conv_1", title: "T" });
    await seedV2Content(db, "old");
    await createMessageOp(encryptedCtx(db), {
      conversationId: "conv_1",
      role: "user",
      content: "secret question",
      uniqueId: "probe",
    });
    await seedPlaintext(db, ["m1"]);
    seedEncryptionKeys(TEST_ADDRESS, { current: "cd".repeat(32) });

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(1);

    await expectReadableAfterRederive(db);
  });

  it("re-derives the v3 key when only v2 data exists", async () => {
    const db = makeDatabase();
    await createConversationOp(plainCtx(db), { conversationId: "conv_1", title: "T" });
    await seedV2Content(db, "old");
    await seedPlaintext(db, ["m1"]);
    seedEncryptionKeys(TEST_ADDRESS, { current: "cd".repeat(32) });

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(1);

    await expectReadableAfterRederive(db);
  });

  it("writes nothing when the saved key cannot open existing data and cannot be recovered", async () => {
    const db = makeDatabase();
    await seedUnderWrongPinnedKey(db);
    const otherWallet = vi.fn(async () => `0x${"ab".repeat(65)}`) as unknown as SignMessageFn;

    expect(await encryptToolCallEventsOp({ ...encryptedCtx(db), signMessage: otherWallet })).toBe(
      0
    );

    expect((await rawRow(db, "m1")).tool_call_events).toBe(JSON.stringify(EVENTS));
    expect(await conversationUpdatedAt(db)).toBe(PINNED_UPDATED_AT);
  });

  it("recovers a wrong saved key before encrypting", async () => {
    const db = makeDatabase();
    await seedUnderWrongPinnedKey(db);

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(1);

    await expectEncryptedAtRest(db, "m1");
    clearAllEncryptionKeys();
    await requestEncryptionKey(TEST_ADDRESS, mockSignMessage);
    expect((await readOne(lockedCtx(db), "m1")).toolCallEvents).toEqual(EVENTS);
  });

  it("rejects without writing when the key request fails", async () => {
    const db = makeDatabase();
    await seedPlaintext(db, ["m1"]);
    mockRequestEncryptionKey.mockRejectedValueOnce(new Error("user rejected signature"));

    await expect(encryptToolCallEventsOp(encryptedCtx(db))).rejects.toThrow(
      "user rejected signature"
    );
    expect((await rawRow(db, "m1")).tool_call_events).toBe(JSON.stringify(EVENTS));
  });

  it("skips rows it cannot read as a list of events", async () => {
    const db = makeDatabase();
    await seedRaw(db, "obj", '{"id":"x","output":"SECRET-OUT-1"}');
    await seedRaw(db, "broken", "[not json");
    await seedRaw(db, "empty", "[]");
    await seedRaw(db, "m1", JSON.stringify(EVENTS));

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(1);

    expect((await rawRow(db, "obj")).tool_call_events).toBe('{"id":"x","output":"SECRET-OUT-1"}');
    expect((await rawRow(db, "broken")).tool_call_events).toBe("[not json");
    expect((await rawRow(db, "empty")).tool_call_events).toBe("[]");
    await expectEncryptedAtRest(db, "m1");
  });

  it("repairs a restored plaintext row, and ids stay readable while locked", async () => {
    const db = makeDatabase();
    await createMessageOp(encryptedCtx(db), {
      conversationId: "conv_1",
      role: "assistant",
      content: "reply",
      uniqueId: "m1",
      toolCallEvents: EVENTS,
    });
    await seedRaw(db, "restored", JSON.stringify(EVENTS));

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(1);

    await expectEncryptedAtRest(db, "restored");
    clearAllEncryptionKeys();
    expect(await getToolCallEventIdsOp(lockedCtx(db), "conv_1")).toEqual(
      new Set(["call_1", "call_2"])
    );
  });

  it("does not overwrite a row that changed while its page was being encrypted", async () => {
    const db = makeDatabase();
    await seedPlaintext(db, ["m1"]);
    const newer = JSON.stringify([{ id: "call_9", name: "web_search", arguments: "{}" }]);
    const write = db.write.bind(db);
    vi.spyOn(db, "write").mockImplementationOnce(async (work) => {
      await write(async () => {
        const row = await db.get<Message>("history").find("m1");
        await row.update((m) => {
          m._setRaw("tool_call_events", newer);
        });
      });
      return write(work);
    });

    expect(await encryptToolCallEventsOp(encryptedCtx(db))).toBe(0);
    expect((await rawRow(db, "m1")).tool_call_events).toBe(newer);
  });
});
