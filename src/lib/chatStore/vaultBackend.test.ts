import { webcrypto } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  type ChatStoreHarness,
  conformance,
  createChatStoreHarness,
} from "../../../test/chat/vaultHarness";
import type { StoredConversation, StoredMessage } from "../db/chat/types";
import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import { ANUMA_CONVERSATION_ID } from "./anuma";
import { type ChatStore, ChatStoreError } from "./types";
import { createVaultChatBackend, type VaultChatBackend, type VaultChatEvent } from "./vaultBackend";
import type { ChatOutboxLocks, ChatOutboxStorage } from "./vaultOutbox";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

const open: VaultChatBackend[] = [];
afterEach(() => {
  open.splice(0).forEach((b) => b.close());
});

function unit(hot: number, dims = 1536): number[] {
  const v = new Array<number>(dims).fill(0);
  v[hot] = 1;
  return v;
}

function backend(
  fake: ChatStoreHarness,
  extra: Partial<Parameters<typeof createVaultChatBackend>[0]> = {}
) {
  const events: VaultChatEvent[] = [];
  const b = createVaultChatBackend({
    store: fake.store,
    pollIntervalMs: 0,
    activity: { isActive: () => true, subscribe: () => () => {} },
    ...extra,
  });
  b.subscribe((e) => events.push(e));
  open.push(b);
  return { b, events };
}

function memoryStorage(): ChatOutboxStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    slots: () => Promise.resolve([...values.keys()]),
    get: (slot) => Promise.resolve(values.get(slot) ?? null),
    set: (slot, sealed) => {
      if (sealed === null) values.delete(slot);
      else values.set(slot, sealed);
      return Promise.resolve();
    },
  };
}

function memoryLocks(): ChatOutboxLocks {
  const held = new Set<string>();
  return {
    async request(name, { ifAvailable }, callback) {
      if (held.has(name)) {
        if (ifAvailable) return callback(null);
        throw new Error(`lock ${name} is already held`);
      }
      held.add(name);
      try {
        return await callback({});
      } finally {
        held.delete(name);
      }
    },
  };
}

describe("vault chat backend", () => {
  it("sends a turn as one batch that another device reads back", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1", title: "Trip" });
    const user = await b.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "hi",
      uniqueId: "msg_u",
    });
    await b.createMessage({
      conversationId: "conv_1",
      role: "assistant",
      content: "hello",
      uniqueId: "msg_a",
      parentMessageId: user.uniqueId,
    });
    await b.flush();

    expect(fake.calls.filter((c) => c === "putMany")).toHaveLength(1);
    expect((await fake.row("message", "msg_a"))?.record.data).toMatchObject({
      role: "assistant",
      content: "hello",
      parentMessageId: "msg_u",
    });

    const other = backend(fake).b;
    expect((await other.getConversation("conv_1"))?.title).toBe("Trip");
    expect((await other.getMessages("conv_1")).map((m) => m.uniqueId)).toEqual(["msg_u", "msg_a"]);
  });

  it("numbers new messages past the clock and past every id it has seen", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake, { now: () => 1_000 });
    await b.createConversation({ conversationId: "conv_1" });
    await b.flush();
    await fake.write([
      {
        record: {
          kind: "message",
          id: "msg_far",
          conversationId: "conv_1",
          sortKey: 5_000_000,
          createdAt: 1,
          updatedAt: 1,
          isDeleted: false,
          data: { role: "user", content: "skewed" },
        },
        expectedVersion: 0,
      },
    ]);
    const first = await b.createMessage({ conversationId: "conv_1", role: "user", content: "a" });
    const second = await b.createMessage({ conversationId: "conv_1", role: "user", content: "b" });
    expect(first.messageId).toBe(5_000_001);
    expect(second.messageId).toBe(5_000_002);
    expect(first.uniqueId).toMatch(/^msg_/);
    const fresh = await b.createMessage({ conversationId: "conv_2", role: "user", content: "c" });
    expect(fresh.messageId).toBe(1_000_000);
  });

  it("merges a concurrent edit from another device instead of overwriting it", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1", title: "Old" });
    await b.flush();
    const current = (await fake.row("conversation", "conv_1"))!;
    await fake.write([
      {
        record: { ...current.record, data: { ...current.record.data, title: "Renamed elsewhere" } },
        expectedVersion: current.version,
      },
    ]);

    await b.updateConversationPinned("conv_1", true);
    await b.flush();

    const stored = (await fake.row("conversation", "conv_1"))!;
    expect(stored.record.data.title).toBe("Renamed elsewhere");
    expect(typeof stored.record.data.pinnedAt).toBe("number");
    expect(stored.record.sortKey).toBeGreaterThan(2 ** 51);
  });

  it("keeps app context with the conversation for another device to read", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1", title: "Trip" });
    expect((await b.getConversation("conv_1"))?.context).toBeUndefined();

    expect(
      await b.updateConversationContext("conv_1", {
        memorySource: { kind: "folder", id: "f1" },
        branches: { __root__: 1 },
      })
    ).toBe(true);
    await b.flush();

    const other = backend(fake).b;
    expect((await other.getConversation("conv_1"))?.context).toEqual({
      memorySource: { kind: "folder", id: "f1" },
      branches: { __root__: 1 },
    });
    expect((await other.getConversation("conv_1"))?.title).toBe("Trip");

    await other.updateConversationContext("conv_1", { memorySource: null });
    await other.flush();
    expect((await backend(fake).b.getConversation("conv_1"))?.context).toEqual({
      branches: { __root__: 1 },
    });
  });

  it("keeps both devices' context when they change different keys at once", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.flush();
    const current = (await fake.row("conversation", "conv_1"))!;
    await fake.write([
      {
        record: {
          ...current.record,
          data: { ...current.record.data, "context.branches": { __root__: 2 } },
        },
        expectedVersion: current.version,
      },
    ]);

    await b.updateConversationContext("conv_1", { mode: "trade" });
    await b.flush();

    const fresh = backend(fake).b;
    expect((await fresh.getConversation("conv_1"))?.context).toEqual({
      branches: { __root__: 2 },
      mode: "trade",
    });
  });

  it("refuses context for a conversation that does not exist or was deleted", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    expect(await b.updateConversationContext("missing", { mode: "trade" })).toBe(false);
    expect(await b.updateConversationContext("missing", {})).toBe(false);
    await b.createConversation({ conversationId: "conv_1" });
    await b.flush();
    await b.deleteConversation("conv_1");
    await b.flush();
    expect(await b.updateConversationContext("conv_1", { mode: "trade" })).toBe(false);
    expect(await b.updateConversationContext("conv_1", {})).toBe(false);
  });

  it("does not let a caller change context it already handed over or read back", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    const branches: { [key: string]: number } = { __root__: 1 };
    await b.updateConversationContext("conv_1", { branches });
    branches.__root__ = 9;
    const read = (await b.getConversation("conv_1"))?.context;
    expect(read).toEqual({ branches: { __root__: 1 } });
    (read?.branches as { [key: string]: number }).__root__ = 7;
    await b.flush();
    expect((await backend(fake).b.getConversation("conv_1"))?.context).toEqual({
      branches: { __root__: 1 },
    });
    expect((await b.getConversation("conv_1"))?.context).toEqual({ branches: { __root__: 1 } });
  });

  it("imports a conversation with its context", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    const at = new Date(1_000);
    await b.importChats([
      {
        conversation: {
          uniqueId: "conv_1",
          conversationId: "conv_1",
          title: "Trip",
          createdAt: at,
          updatedAt: at,
          isDeleted: false,
          context: { mode: "trade" },
        },
        messages: [],
      },
    ]);
    expect((await backend(fake).b.getConversation("conv_1"))?.context).toEqual({ mode: "trade" });
  });

  it("announces a context change like any other conversation edit", async () => {
    const fake = await createChatStoreHarness();
    const { b, events } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    events.length = 0;
    await b.updateConversationContext("conv_1", { mode: "trade" });
    expect(events).toContainEqual({ type: "conversations", origin: "local" });
  });

  it("does not repeat a write the server applied before the response was lost", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    fake.fail({ op: "putMany", error: new TypeError("network dropped"), after: true });
    await b.flush();
    await b.flush();

    expect(fake.calls.filter((c) => c === "putMany")).toHaveLength(1);
    expect((await fake.row("conversation", "conv_1"))?.version).toBe(1);
    expect(b.status().pending).toBe(0);
  });

  it("stops for good when the account or key changes underneath it", async () => {
    const fake = await createChatStoreHarness();
    const { b, events } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    fake.fail({ op: "putMany", error: new ChatStoreError("key", 409, "key_mismatch") });
    await b.flush();

    expect(b.status()).toEqual({ pending: 1, stopped: "key_mismatch" });
    expect(events).toContainEqual({ type: "outbox", pending: 1, stopped: "key_mismatch" });
    await expect(b.createConversation({ conversationId: "conv_2" })).rejects.toThrow(
      ChatStoreError
    );
  });

  it.skipIf(conformance)(
    "saves a message without its vectors when the account is out of vector capacity",
    async () => {
      const fake = await createChatStoreHarness({ maxVectors: 0 });
      const { b, events } = backend(fake);
      await b.createConversation({ conversationId: "conv_1" });
      await b.createMessage({
        conversationId: "conv_1",
        role: "user",
        content: "hi",
        uniqueId: "msg_1",
        vector: unit(1),
        embeddingModel: "m",
      });
      await b.flush();

      expect((await fake.row("message", "msg_1"))?.record.data.content).toBe("hi");
      expect(fake.vectors?.("message", "msg_1")).toBeUndefined();
      expect(events).toContainEqual({ type: "vector_quota" });
    }
  );

  it.skipIf(conformance)(
    "drops only the write that does not fit the account's storage",
    async () => {
      const fake = await createChatStoreHarness({ maxBytes: 4_000 });
      const { b, events } = backend(fake);
      await b.createConversation({ conversationId: "conv_1" });
      await b.flush();
      await b.createMessage({
        conversationId: "conv_1",
        role: "user",
        content: "small",
        uniqueId: "msg_small",
      });
      await b.createMessage({
        conversationId: "conv_1",
        role: "user",
        content: "x".repeat(5_000),
        uniqueId: "msg_big",
      });
      await b.flush();

      expect(await fake.row("message", "msg_big")).toBeUndefined();
      expect((await fake.row("message", "msg_small"))?.record.data.content).toBe("small");
      expect(events).toContainEqual({
        type: "dropped",
        kind: "message",
        id: "msg_big",
        reason: "storage_quota",
      });
    }
  );

  it("lets a delete from another device win over a queued reply", async () => {
    const fake = await createChatStoreHarness();
    const { b, events } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.flush();
    const current = (await fake.row("conversation", "conv_1"))!;
    await fake.write([
      {
        record: { ...current.record, isDeleted: true, data: {} },
        expectedVersion: current.version,
      },
    ]);

    await b.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "late",
      uniqueId: "msg_late",
    });
    await b.flush();

    expect(await fake.row("message", "msg_late")).toBeUndefined();
    expect(events).toContainEqual({
      type: "dropped",
      kind: "message",
      id: "msg_late",
      reason: "conversation_deleted",
    });
    await b.poll();
    expect(await b.getConversation("conv_1")).toBeNull();
  });

  it("polls from the head cursor and applies other devices' changes to open threads", async () => {
    const fake = await createChatStoreHarness();
    await fake.write([
      {
        record: {
          kind: "conversation",
          id: "conv_old",
          conversationId: "",
          sortKey: 1,
          createdAt: 1,
          updatedAt: 1,
          isDeleted: false,
          data: { title: "Old" },
        },
        expectedVersion: 0,
      },
    ]);
    const changes = vi.spyOn(fake.store, "changes");
    const { b, events } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.flush();
    expect(await b.getMessages("conv_1")).toEqual([]);

    const other = backend(fake).b;
    await other.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "from phone",
      uniqueId: "msg_p",
    });
    await other.createConversation({ conversationId: "conv_2", title: "New elsewhere" });
    await other.flush();
    expect(events).toContainEqual({ type: "conversations", origin: "local" });
    events.length = 0;
    await b.poll();

    expect((await b.getMessages("conv_1")).map((m) => m.content)).toEqual(["from phone"]);
    expect((await b.getConversations()).map((c) => c.conversationId)).toContain("conv_2");
    expect(events).toContainEqual({ type: "messages", conversationId: "conv_1", origin: "remote" });
    expect(events).toContainEqual({ type: "conversations", origin: "remote" });
    expect(events.filter((e) => "origin" in e && e.origin === "local")).toEqual([]);
    const polled = await (changes.mock.results[0].value as ReturnType<typeof fake.store.changes>);
    expect(polled.items.map((s) => s.record.id)).not.toContain("conv_old");
  });

  it("keeps a polled message after an older empty lookup without another read", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.flush();
    expect(await b.getMessages("conv_1")).toEqual([]);

    const getMany = fake.store.getMany.bind(fake.store);
    let answer = () => {};
    let started = () => {};
    const held = new Promise<void>((resolve) => (answer = resolve));
    const requested = new Promise<void>((resolve) => (started = resolve));
    const reads = vi.spyOn(fake.store, "getMany").mockImplementationOnce(async (...args) => {
      const result = await getMany(...args);
      expect(result).toEqual([]);
      started();
      await held;
      return result;
    });

    const lookup = b.getMessagesByIds(["msg_p", "msg_absent"]);
    await requested;
    expect(reads).toHaveBeenCalledExactlyOnceWith([
      { kind: "message", id: "msg_p" },
      { kind: "message", id: "msg_absent" },
    ]);
    const other = backend(fake).b;
    await other.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "from phone",
      uniqueId: "msg_p",
    });
    await other.flush();
    await b.poll();
    expect((await b.getMessages("conv_1")).map((m) => m.uniqueId)).toEqual(["msg_p"]);
    reads.mockClear();

    answer();
    const result = await lookup;
    await b.poll();
    expect(await fake.row("message", "msg_p")).toMatchObject({
      record: { id: "msg_p", isDeleted: false, data: { content: "from phone" } },
    });
    expect((await b.getMessages("conv_1")).map((m) => m.uniqueId)).toEqual(["msg_p"]);
    expect(result.map((m) => m.uniqueId)).toEqual(["msg_p"]);
    expect((await b.getMessagesByIds(["msg_p", "msg_absent"])).map((m) => m.uniqueId)).toEqual([
      "msg_p",
    ]);
    expect(reads).not.toHaveBeenCalled();
  });

  it("keeps unsent writes sealed across a reload and sends them on the next start", async () => {
    const ring = await deriveMemoryKeyRing("0x" + "56".repeat(65));
    const seal = memoryCipher(ring);
    const storage = memoryStorage();
    const fake = await createChatStoreHarness();
    const { b } = backend(fake, { outbox: { storage, seal } });
    await b.flush();
    fake.fail({ op: "putMany", error: new TypeError("offline"), sticky: true });
    fake.fail({ op: "getMany", error: new TypeError("offline"), sticky: true });
    await b.createConversation({ conversationId: "conv_1", title: "Secret plans" });
    await b.flush();
    b.close();

    const [sealed] = [...storage.values.values()];
    expect(storage.values.size).toBe(1);
    expect(sealed).toMatch(/^enc:v\d+:/);
    expect(sealed).not.toContain("Secret plans");
    expect(await fake.row("conversation", "conv_1")).toBeUndefined();

    fake.heal();
    const reloaded = backend(fake, { outbox: { storage, seal } }).b;
    await reloaded.flush();
    expect((await fake.row("conversation", "conv_1"))?.record.data.title).toBe("Secret plans");
    expect(storage.values.size).toBe(0);
  });

  it("keeps each tab's unsent writes and leaves a live tab's queue to that tab", async () => {
    const seal = memoryCipher(await deriveMemoryKeyRing("0x" + "57".repeat(65)));
    const storage = memoryStorage();
    const locks = memoryLocks();
    const fake = await createChatStoreHarness();
    const tab = () => backend(fake, { outbox: { storage, seal, locks } }).b;
    const first = tab();
    const second = tab();
    await Promise.all([first.flush(), second.flush()]);
    fake.fail({ op: "putMany", error: new TypeError("offline"), sticky: true });
    fake.fail({ op: "getMany", error: new TypeError("offline"), sticky: true });
    await first.createConversation({ conversationId: "conv_a", title: "From the first tab" });
    await second.createConversation({ conversationId: "conv_b", title: "From the second tab" });
    await Promise.all([first.flush(), second.flush()]);
    expect(storage.values.size).toBe(2);

    first.close();
    fake.heal();
    const third = tab();
    await third.flush();
    expect((await fake.row("conversation", "conv_a"))?.record.data.title).toBe(
      "From the first tab"
    );
    expect(await fake.row("conversation", "conv_b")).toBeUndefined();
    expect(storage.values.size).toBe(1);

    second.close();
    const fourth = tab();
    await fourth.flush();
    expect((await fake.row("conversation", "conv_b"))?.record.data.title).toBe(
      "From the second tab"
    );
    expect(storage.values.size).toBe(0);
  });

  it("sends a write that lands while the outbox is being saved", async () => {
    const seal = memoryCipher(await deriveMemoryKeyRing("0x" + "58".repeat(65)));
    const base = memoryStorage();
    let saving: (() => void) | undefined;
    const storage: ChatOutboxStorage = {
      ...base,
      set: async (slot, sealed) => {
        if (sealed === null && !saving) await new Promise<void>((resolve) => (saving = resolve));
        await base.set(slot, sealed);
      },
    };
    const fake = await createChatStoreHarness();
    const b = backend(fake, { outbox: { storage, seal } }).b;
    await b.createConversation({ conversationId: "conv_1", title: "First" });
    const draining = b.flush();
    await vi.waitFor(() => expect(saving).toBeDefined());
    const second = b.createConversation({ conversationId: "conv_2", title: "Second" });
    await vi.waitFor(() => expect(b.status().pending).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    saving!();
    await Promise.all([draining, second]);

    await vi.waitFor(
      async () =>
        expect((await fake.row("conversation", "conv_2"))?.record.data.title).toBe("Second"),
      { timeout: 1_000, interval: 10 }
    );
  });

  it("returns chunk text from stored offsets and folds long messages into 16 vectors", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "alpha beta gamma",
      uniqueId: "msg_1",
    });
    await b.updateMessageChunks(
      "msg_1",
      [
        { vector: unit(1), startOffset: 0, endOffset: 5 },
        { vector: unit(2), startOffset: 6, endOffset: 10 },
      ],
      "m"
    );
    const content = "y".repeat(400);
    await b.createMessage({
      conversationId: "conv_1",
      role: "user",
      content,
      uniqueId: "msg_long",
    });
    await b.updateMessageChunks(
      "msg_long",
      Array.from({ length: 40 }, (_, i) => ({
        vector: unit(100 + i),
        startOffset: i * 10,
        endOffset: i * 10 + 10,
      })),
      "m"
    );

    const hits = await b.searchChunks(unit(2), { minSimilarity: 0.5 });
    expect(hits.map((h) => [h.message.uniqueId, h.chunkText])).toEqual([["msg_1", "beta"]]);
    if (fake.vectors) expect(fake.vectors("message", "msg_long")).toHaveLength(16);
    expect((await fake.row("message", "msg_long"))?.record.data.chunkOffsets).toHaveLength(16);
  });

  it("skips vectors vault cannot index instead of failing the write", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "hi",
      uniqueId: "msg_1",
      vector: unit(1, 384),
    });
    await b.flush();
    expect(await fake.row("message", "msg_1")).toBeDefined();
    if (fake.vectors) expect(fake.vectors("message", "msg_1")).toBeUndefined();
  });

  it("keeps memory links as one record that dedupes, caps and clears without a tombstone", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.addMemoryLinks("conv_1", [{ memoryId: "m1", score: 0.9 }]);
    await b.addMemoryLinks("conv_1", [
      { memoryId: "m1", score: 0.1 },
      ...Array.from({ length: 205 }, (_, i) => ({ memoryId: `n${i}`, score: 0.5 })),
    ]);
    await b.flush();
    const other = backend(fake).b;
    const links = await other.getMemoryLinks("conv_1");
    expect(links).toHaveLength(200);
    expect(links[links.length - 1].memoryId).toBe("n204");
    expect(links.some((l) => l.memoryId === "m1")).toBe(false);

    await b.clearMemoryLinks("conv_1");
    await b.addMemoryLinks("conv_1", [{ memoryId: "again", score: 1 }]);
    await b.flush();
    expect((await fake.row("memory_links", "conv_1"))?.record.isDeleted).toBe(false);
    expect((await backend(fake).b.getMemoryLinks("conv_1")).map((l) => l.memoryId)).toEqual([
      "again",
    ]);
  });

  it("can write a summary again after deleting one", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.upsertSummary("conv_1", "first", "msg_1", 10);
    await b.flush();
    await b.deleteSummary("conv_1");
    await b.flush();
    expect(await backend(fake).b.getSummary("conv_1")).toBeNull();
    await b.upsertSummary("conv_1", "second", "msg_2", 12);
    await b.flush();
    expect((await backend(fake).b.getSummary("conv_1"))?.summary).toBe("second");
  });

  it.each(["first", "later"])("discards an evicted thread load at its %s page", async (page) => {
    const fake = await createChatStoreHarness();
    const writer = backend(fake).b;
    await writer.createConversation({ conversationId: "conv_1" });
    await writer.createConversation({ conversationId: "conv_2" });
    for (const uniqueId of ["msg_1", "msg_2"])
      await writer.createMessage({
        conversationId: "conv_1",
        role: "user",
        content: uniqueId,
        uniqueId,
      });
    await writer.flush();

    const { b } = backend(fake, { threadCacheSize: 1 });
    await b.getConversations();
    let release!: () => void;
    const response = new Promise<void>((resolve) => (release = resolve));
    let waiting = false;
    const original = fake.store.list.bind(fake.store);
    const list = vi.spyOn(fake.store, "list").mockImplementation(async (query) => {
      if (query.kind !== "message" || query.conversationId !== "conv_1") return original(query);
      const result = await original({ ...query, limit: 1 });
      if ((query.cursor ? "later" : "first") === page) {
        waiting = true;
        await response;
      }
      return result;
    });

    const loading = b.getMessages("conv_1");
    await vi.waitFor(() => expect(waiting).toBe(true));
    await b.getMessages("conv_2");
    release();

    expect(await loading).toEqual([]);
    expect(list.mock.calls.filter(([query]) => query.conversationId === "conv_1")).toHaveLength(
      page === "first" ? 1 : 2
    );
    const getMany = vi.spyOn(fake.store, "getMany");
    expect((await b.getMessagesByIds(["msg_1", "msg_2"])).map((m) => m.uniqueId)).toEqual([
      "msg_1",
      "msg_2",
    ]);
    expect(getMany).toHaveBeenCalledWith([
      { kind: "message", id: "msg_1" },
      { kind: "message", id: "msg_2" },
    ]);
    expect((await b.getMessages("conv_1")).map((m) => m.uniqueId)).toEqual(["msg_1", "msg_2"]);
  });

  it.each(["response", "error"])(
    "keeps a replacement thread load after a stale %s",
    async (outcome) => {
      const fake = await createChatStoreHarness();
      const writer = backend(fake).b;
      await writer.createConversation({ conversationId: "conv_1" });
      await writer.createConversation({ conversationId: "conv_2" });
      await writer.createMessage({
        conversationId: "conv_1",
        role: "user",
        content: "old",
        uniqueId: "msg_1",
      });
      await writer.flush();

      const { b } = backend(fake, { threadCacheSize: 1 });
      await b.getConversations();
      let release!: () => void;
      const response = new Promise<void>((resolve) => (release = resolve));
      const error = new Error("Thread request failed");
      let waiting = false;
      const original = fake.store.list.bind(fake.store);
      const list = vi.spyOn(fake.store, "list").mockImplementationOnce(async (query) => {
        const result = await original(query);
        waiting = true;
        await response;
        if (outcome === "error") throw error;
        return result;
      });

      const loading = b.getMessages("conv_1").catch((error: unknown) => error);
      await vi.waitFor(() => expect(waiting).toBe(true));
      await b.getMessages("conv_2");
      await writer.deleteMessage("msg_1");
      await writer.flush();
      expect(await b.getMessages("conv_1")).toEqual([]);
      const calls = list.mock.calls.length;
      release();

      if (outcome === "error") expect(await loading).toBe(error);
      else expect(await loading).toEqual([]);
      expect(await b.getMessages("conv_1")).toEqual([]);
      expect(list).toHaveBeenCalledTimes(calls);
    }
  );

  it("refetches a message from an evicted thread before editing it", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake, { threadCacheSize: 1 });
    await b.createConversation({ conversationId: "conv_1" });
    await b.createConversation({ conversationId: "conv_2" });
    await b.createMessage({
      conversationId: "conv_1",
      role: "assistant",
      content: "a",
      uniqueId: "msg_1",
    });
    await b.flush();
    await b.getMessages("conv_2");

    expect((await b.updateMessageFeedback("msg_1", "like"))?.feedback).toBe("like");
    await b.flush();
    expect((await fake.row("message", "msg_1"))?.record.data.feedback).toBe("like");
  });

  it("cancels a deleted conversation's queued writes without reporting them as lost", async () => {
    const fake = await createChatStoreHarness();
    const { b, events } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "hi",
      uniqueId: "msg_1",
    });
    expect(await b.deleteConversation("conv_1")).toBe(true);
    await b.flush();
    expect(fake.calls.filter((c) => c === "putMany")).toHaveLength(0);
    expect(events.filter((e) => e.type === "dropped")).toEqual([]);
    expect(await b.getConversation("conv_1")).toBeNull();
  });

  it("refuses to delete the Anuma conversation", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: ANUMA_CONVERSATION_ID });
    expect(await b.deleteConversation(ANUMA_CONVERSATION_ID)).toBe(false);
    await b.flush();
    expect(await b.getConversation(ANUMA_CONVERSATION_ID)).not.toBeNull();
  });

  it("leaves the Anuma conversation out of the conversation list", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: ANUMA_CONVERSATION_ID });
    await b.createConversation({ conversationId: "conv_1" });
    expect((await b.getConversations()).map((c) => c.conversationId)).toEqual(["conv_1"]);
    expect(await b.getConversation(ANUMA_CONVERSATION_ID)).not.toBeNull();
  });

  it("shrinks a message over vault's record limit and marks what it cut", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.createMessage({
      conversationId: "conv_1",
      role: "assistant",
      content: "z".repeat(1_200_000),
      thinking: "t".repeat(10),
      uniqueId: "msg_huge",
    });
    await b.flush();
    const data = (await fake.row("message", "msg_huge"))!.record.data;
    expect(data.truncated).toEqual(["thinking", "content"]);
    expect((data.content as string).length).toBeLessThan(1_040_000);
  });

  it("waits out a rate limit and then sends", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    fake.fail({ op: "putMany", error: new ChatStoreError("busy", 429, "rate_limited", 300) });
    await b.flush();
    await b.updateConversationTitle("conv_1", "Queued during the limit");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fake.calls.filter((c) => c === "putMany")).toHaveLength(1);
    expect(b.status().pending).toBe(1);
    await vi.waitFor(() => expect(b.status().pending).toBe(0), { timeout: 2_000, interval: 10 });
    expect((await fake.row("conversation", "conv_1"))?.record.data.title).toBe(
      "Queued during the limit"
    );
    expect(await fake.row("conversation", "conv_1")).toBeDefined();
  });

  it("keeps waiting out a rate limit when a search or a wake-up asks it to send", async () => {
    const fake = await createChatStoreHarness();
    let wake = () => {};
    const { b } = backend(fake, {
      activity: {
        isActive: () => true,
        subscribe: (onChange) => {
          wake = onChange;
          return () => {};
        },
      },
    });
    await b.createConversation({ conversationId: "conv_1" });
    fake.fail({ op: "putMany", error: new ChatStoreError("busy", 429, "rate_limited", 300) });
    await b.flush();

    await b.flush();
    await b.searchChunks(unit(1));
    wake();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fake.calls.filter((c) => c === "putMany")).toHaveLength(1);
    await vi.waitFor(() => expect(b.status().pending).toBe(0), { timeout: 2_000, interval: 10 });
    expect(fake.calls.filter((c) => c === "putMany")).toHaveLength(2);
  });

  it("keeps a newer copy from another device when its own older write is answered late", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1", title: "Old" });
    await b.flush();
    const putMany = fake.store.putMany.bind(fake.store);
    let answer = () => {};
    const answered = new Promise<void>((resolve) => (answer = resolve));
    vi.spyOn(fake.store, "putMany").mockImplementationOnce(async (writes, signal) => {
      const result = await putMany(writes, signal);
      await answered;
      return result;
    });

    await b.updateConversationTitle("conv_1", "Mine");
    const flushed = b.flush();
    await vi.waitFor(async () =>
      expect((await fake.row("conversation", "conv_1"))?.record.data.title).toBe("Mine")
    );
    const mine = (await fake.row("conversation", "conv_1"))!;
    await fake.write([
      {
        record: { ...mine.record, data: { ...mine.record.data, title: "Theirs" } },
        expectedVersion: mine.version,
      },
    ]);
    await b.poll();
    answer();
    await flushed;

    expect((await b.getConversation("conv_1"))?.title).toBe("Theirs");
  });

  it("refuses to reuse a deleted message's id, before and after the delete is sent", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    const again = { conversationId: "conv_1", role: "user" as const, content: "again" };
    await b.createMessage({ ...again, uniqueId: "msg_sent" });
    await b.createMessage({ ...again, uniqueId: "msg_queued" });
    await b.flush();
    await b.deleteMessage("msg_sent");
    await b.flush();
    await b.deleteMessage("msg_queued");
    await b.createMessage({ ...again, uniqueId: "msg_local" });
    await b.deleteMessage("msg_local");

    for (const uniqueId of ["msg_sent", "msg_queued", "msg_local"]) {
      await expect(b.createMessage({ ...again, uniqueId })).rejects.toThrow("Message was deleted");
      await expect(b.upsertMessage({ ...again, uniqueId })).rejects.toThrow("Message was deleted");
    }
    await b.flush();
    expect((await fake.row("message", "msg_sent"))?.record.isDeleted).toBe(true);
    expect((await fake.row("message", "msg_queued"))?.record.isDeleted).toBe(true);
    expect(await fake.row("message", "msg_local")).toBeUndefined();
  });

  it("isolates and drops the one write vault rejects as invalid", async () => {
    const fake = await createChatStoreHarness();
    const { b, events } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.flush();
    fake.fail({
      op: "putMany",
      error: new ChatStoreError("bad", 400),
      sticky: true,
      when: (writes) => writes.some((w) => w.record.id === "msg_bad"),
    });
    for (const id of ["msg_ok_1", "msg_bad", "msg_ok_2"])
      await b.createMessage({ conversationId: "conv_1", role: "user", content: id, uniqueId: id });
    await b.flush();

    expect(await fake.row("message", "msg_bad")).toBeUndefined();
    expect(await fake.row("message", "msg_ok_1")).toBeDefined();
    expect(await fake.row("message", "msg_ok_2")).toBeDefined();
    expect(events).toContainEqual({
      type: "dropped",
      kind: "message",
      id: "msg_bad",
      reason: "invalid",
    });
    expect(b.status().pending).toBe(0);
  });

  it("drops a record too large for vault instead of retrying it forever", async () => {
    const fake = await createChatStoreHarness();
    const { b, events } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.flush();
    fake.fail({
      op: "putMany",
      error: new ChatStoreError("too large", 413, "record_too_large"),
      sticky: true,
      when: (writes) => writes.some((w) => w.record.id === "msg_huge"),
    });
    for (const id of ["msg_ok_1", "msg_huge", "msg_ok_2"])
      await b.createMessage({ conversationId: "conv_1", role: "user", content: id, uniqueId: id });
    await b.flush();

    expect(await fake.row("message", "msg_huge")).toBeUndefined();
    expect(await fake.row("message", "msg_ok_2")).toBeDefined();
    expect(events).toContainEqual({
      type: "dropped",
      kind: "message",
      id: "msg_huge",
      reason: "invalid",
    });
    expect(b.status().pending).toBe(0);
  });

  it("recovers from a failed poll on the next one", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_1" });
    await b.flush();
    const other = backend(fake).b;
    await other.createConversation({ conversationId: "conv_2" });
    await other.flush();
    fake.fail({ op: "changes", error: new TypeError("offline") });
    await b.poll();
    expect((await b.getConversations()).map((c) => c.conversationId)).not.toContain("conv_2");
    await b.poll();
    expect((await b.getConversations()).map((c) => c.conversationId)).toContain("conv_2");
  });

  it("polls and retries queued writes when the app becomes active again", async () => {
    const fake = await createChatStoreHarness();
    let active = true;
    let wake = () => {};
    const { b } = backend(fake, {
      activity: {
        isActive: () => active,
        subscribe: (onChange) => {
          wake = onChange;
          return () => {};
        },
      },
    });
    await b.createConversation({ conversationId: "conv_1" });
    await b.flush();
    fake.fail({ op: "putMany", error: new TypeError("offline") });
    await b.updateConversationTitle("conv_1", "Written offline");
    active = false;
    await b.flush();
    expect(b.status().pending).toBe(1);
    const other = backend(fake).b;
    await other.createConversation({ conversationId: "conv_2" });
    await other.flush();

    active = true;
    wake();
    await vi.waitFor(
      async () => {
        expect(b.status().pending).toBe(0);
        expect((await b.getConversations()).map((c) => c.conversationId)).toContain("conv_2");
      },
      { timeout: 300, interval: 10 }
    );
    expect((await fake.row("conversation", "conv_1"))?.record.data.title).toBe("Written offline");
  });

  it("reads messages by id without loading their threads and leaves out deleted ones", async () => {
    const fake = await createChatStoreHarness();
    const writer = backend(fake).b;
    for (const [conversationId, uniqueId] of [
      ["conv_1", "msg_a"],
      ["conv_1", "msg_b"],
      ["conv_2", "msg_c"],
    ])
      await writer.createMessage({ conversationId, role: "user", content: uniqueId, uniqueId });
    await writer.flush();
    await writer.deleteMessage("msg_b");
    await writer.deleteConversation("conv_2");
    expect(await writer.getMessagesByIds(["msg_c", "msg_a"])).toHaveLength(1);
    await writer.flush();

    const { b: reader } = backend(fake);
    await reader.getConversations();
    const list = vi.spyOn(fake.store, "list");
    const getMany = vi.spyOn(fake.store, "getMany");
    expect(
      (await reader.getMessagesByIds(["msg_c", "msg_a", "msg_b", "msg_none"])).map((m) => [
        m.uniqueId,
        m.conversationId,
      ])
    ).toEqual([["msg_a", "conv_1"]]);
    expect(await reader.getMessagesByIds(["msg_none", "msg_a"])).toHaveLength(1);
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(list).not.toHaveBeenCalled();
  });

  it("keeps the later of two devices' recalls of the same memory", async () => {
    const fake = await createChatStoreHarness();
    const later = backend(fake, { now: () => 2_000_000 }).b;
    await later.createConversation({ conversationId: "conv_1" });
    await later.flush();
    const earlier = backend(fake, { now: () => 1_000_000 }).b;
    expect(await earlier.getMemoryLinks("conv_1")).toEqual([]);

    await later.addMemoryLinks("conv_1", [{ memoryId: "mem_x", score: 0.9 }]);
    await later.flush();
    await earlier.addMemoryLinks("conv_1", [
      { memoryId: "mem_x", score: 0.1 },
      { memoryId: "mem_y", score: 0.5 },
    ]);
    await earlier.flush();

    const links = await backend(fake).b.getMemoryLinks("conv_1");
    expect(links.map((l) => [l.memoryId, l.score, l.createdAt.getTime()]).sort()).toEqual([
      ["mem_x", 0.9, 2_000_000],
      ["mem_y", 0.5, 1_000_001],
    ]);
  });

  it("imports chats with their own times and order, and a re-import changes nothing", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    await b.createConversation({ conversationId: "conv_live", title: "Live" });
    await b.flush();
    expect(await b.getMessages("conv_imp")).toEqual([]);

    const at = (minute: number) => new Date(Date.UTC(2024, 0, 1, 0, minute));
    const imported = [
      {
        conversation: {
          uniqueId: "conv_imp",
          conversationId: "conv_imp",
          title: "From ChatGPT",
          createdAt: at(0),
          updatedAt: at(0),
          isDeleted: false,
        } as StoredConversation,
        messages: [
          { uniqueId: "msg_i1", messageId: 1, role: "user", content: "first", createdAt: at(1) },
          {
            uniqueId: "msg_i2",
            messageId: 2,
            role: "assistant",
            content: "second",
            createdAt: at(2),
          },
          { uniqueId: "bad/id", messageId: 3, role: "user", content: "skipped", createdAt: at(3) },
        ].map(
          (m) => ({ ...m, conversationId: "conv_imp", updatedAt: m.createdAt }) as StoredMessage
        ),
      },
      {
        conversation: {
          conversationId: "bad/conv",
          title: "x",
          createdAt: at(0),
        } as StoredConversation,
        messages: [],
      },
    ];

    expect(await b.importChats(imported)).toEqual({ conversations: 1, messages: 2 });
    expect(
      (await b.getMessages("conv_imp")).map((m) => [m.content, m.createdAt.toISOString()])
    ).toEqual([
      ["first", at(1).toISOString()],
      ["second", at(2).toISOString()],
    ]);

    await b.updateMessageFeedback("msg_i2", "like");
    await b.flush();
    expect(await b.importChats(imported)).toEqual({ conversations: 0, messages: 0 });

    expect(await b.getMessages("conv_live")).toEqual([]);
    await b.importChats([
      {
        conversation: {
          conversationId: "conv_live",
          title: "Ignored",
          createdAt: at(0),
        } as StoredConversation,
        messages: [
          {
            uniqueId: "msg_l1",
            messageId: 1,
            conversationId: "conv_live",
            role: "user",
            content: "added to an open thread",
            createdAt: at(5),
            updatedAt: at(5),
          } as StoredMessage,
        ],
      },
    ]);
    expect((await b.getMessages("conv_live")).map((m) => m.content)).toEqual([
      "added to an open thread",
    ]);
    expect((await b.getConversation("conv_live"))?.title).toBe("Live");

    const fresh = backend(fake).b;
    const conversation = await fresh.getConversation("conv_imp");
    expect(conversation?.title).toBe("From ChatGPT");
    expect(conversation?.createdAt.toISOString()).toBe(at(0).toISOString());
    expect(
      (await fresh.getMessages("conv_imp")).map((m) => [m.uniqueId, m.feedback ?? null])
    ).toEqual([
      ["msg_i1", null],
      ["msg_i2", "like"],
    ]);
    expect((await fresh.getConversations()).map((c) => c.conversationId).sort()).toEqual([
      "conv_imp",
      "conv_live",
    ]);
  });

  it("imports overlapping chats once, without vectors, and shows them everywhere even after a failed batch", async () => {
    const fake = await createChatStoreHarness();
    const channel = `chat-import-${Math.random()}`;
    const { b } = backend(fake, { channel });
    const { b: otherTab, events } = backend(fake, { channel });
    await otherTab.getConversations();
    expect(await b.getMessagesByIds(["msg_o1"])).toEqual([]);

    const chat = (title: string) => ({
      conversation: {
        conversationId: "conv_o",
        title,
        createdAt: new Date(1_000),
        updatedAt: new Date(1_000),
        isDeleted: false,
      } as StoredConversation,
      messages: [
        {
          uniqueId: "msg_o1",
          messageId: 1,
          conversationId: "conv_o",
          role: "user",
          content: "overlap",
          vector: unit(1),
          embeddingModel: "m",
          createdAt: new Date(2_000),
          updatedAt: new Date(2_000),
        } as StoredMessage,
      ],
    });
    expect(await b.importChats([chat("First"), chat("Second")])).toEqual({
      conversations: 1,
      messages: 1,
    });
    expect((await b.getMessagesByIds(["msg_o1"])).map((m) => m.content)).toEqual(["overlap"]);
    expect(await b.searchChunks(unit(1), { minSimilarity: 0.5 })).toEqual([]);
    await vi.waitFor(
      () => expect(events).toContainEqual({ type: "conversations", origin: "remote" }),
      {
        timeout: 2_000,
      }
    );

    fake.fail({ op: "importRecords", error: new TypeError("connection reset"), after: true });
    const late = {
      conversation: { ...chat("Late").conversation, conversationId: "conv_late" },
      messages: [],
    };
    await expect(b.importChats([late])).rejects.toThrow("connection reset");
    expect((await b.getConversations()).map((c) => c.conversationId)).toContain("conv_late");
  });

  it("polls on each realtime marker and slows the periodic poll while connected", async () => {
    const fake = await createChatStoreHarness();
    let report: ((connected: boolean) => void) | undefined;
    const stop = vi.fn();
    const { b, events } = backend(fake, {
      pollIntervalMs: 20,
      subscribeChanges: (onChange) => {
        report = onChange;
        onChange(true);
        return stop;
      },
    });
    await b.getConversations();
    await vi.waitFor(() => expect(report).toBeDefined());
    const changes = () => fake.calls.filter((c) => c === "changes").length;
    await vi.waitFor(() => expect(b.status().pending).toBe(0));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const idle = changes();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(changes()).toBe(idle);

    const other = backend(fake).b;
    await other.createConversation({ conversationId: "conv_2", title: "From another device" });
    await other.flush();
    report!(true);
    await vi.waitFor(() =>
      expect(events).toContainEqual({ type: "conversations", origin: "remote" })
    );
    expect((await b.getConversations()).map((c) => c.conversationId)).toEqual(["conv_2"]);

    report!(false);
    const disconnected = changes();
    await vi.waitFor(() => expect(changes()).toBeGreaterThan(disconnected + 2), {
      timeout: 1_000,
    });

    b.close();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("skips a disconnected report while already disconnected and polls on a real drop", async () => {
    const fake = await createChatStoreHarness();
    let report: ((connected: boolean) => void) | undefined;
    const { b } = backend(fake, {
      subscribeChanges: (onChange) => {
        report = onChange;
        onChange(false);
        return () => {};
      },
    });
    await b.getConversations();
    await vi.waitFor(() => expect(report).toBeDefined());
    const changes = () => fake.calls.filter((c) => c === "changes").length;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(changes()).toBe(0);

    report!(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(changes()).toBe(0);

    report!(true);
    await vi.waitFor(() => expect(changes()).toBe(1));
    report!(false);
    await vi.waitFor(() => expect(changes()).toBe(2));
  });

  it("polls again after a marker that arrives during a poll", async () => {
    const fake = await createChatStoreHarness();
    let report: ((connected: boolean) => void) | undefined;
    const { b } = backend(fake, {
      subscribeChanges: (onChange) => {
        report = onChange;
        return () => {};
      },
    });
    await b.getConversations();
    await vi.waitFor(() => expect(report).toBeDefined());
    const changes = fake.store.changes.bind(fake.store);
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    const changeRequests = vi
      .spyOn(fake.store, "changes")
      .mockImplementationOnce(async (...args) => {
        const page = await changes(...args);
        await held;
        return page;
      });
    const polling = b.poll();
    await vi.waitFor(() => expect(changeRequests).toHaveBeenCalledTimes(1));
    const other = backend(fake).b;
    await other.createConversation({ conversationId: "conv_late" });
    await other.flush();
    report!(true);
    release();
    await polling;
    await vi.waitFor(async () =>
      expect((await b.getConversations()).map((c) => c.conversationId)).toContain("conv_late")
    );
  });

  it("tells the account's other tabs to poll after a write", async () => {
    const fake = await createChatStoreHarness();
    const channel = `chat-test-${Math.random()}`;
    const writer = backend(fake, { channel }).b;
    const { b: reader, events } = backend(fake, { channel });
    await reader.getConversations();
    await writer.createConversation({ conversationId: "conv_1", title: "From another tab" });
    await writer.flush();

    await vi.waitFor(
      () => expect(events).toContainEqual({ type: "conversations", origin: "remote" }),
      {
        timeout: 2_000,
      }
    );
    expect((await reader.getConversations()).map((c) => c.title)).toEqual(["From another tab"]);
  });
});

describe.skipIf(conformance)("keyword search over vault", () => {
  it("pages vault's word matches into messages up to the limit", async () => {
    const fake = await createChatStoreHarness();
    const searchTerms = vi.fn<NonNullable<ChatStore["searchTerms"]>>();
    const { b } = backend({ ...fake, store: { ...fake.store, searchTerms } });
    await b.createConversation({ conversationId: "conv_1" });
    for (const id of ["msg_1", "msg_2", "msg_3"])
      await b.createMessage({ conversationId: "conv_1", role: "user", content: id, uniqueId: id });
    await b.flush();
    const row = async (id: string) => (await fake.row("message", id))!;
    searchTerms.mockImplementation(async (_query, options) =>
      options?.cursor
        ? { items: [await row("msg_1")] }
        : { items: [await row("msg_3"), await row("msg_2")], nextCursor: "page_2" }
    );

    expect((await b.searchKeywords("coffee", { limit: 2 })).map((m) => m.uniqueId)).toEqual([
      "msg_3",
      "msg_2",
    ]);
    expect(searchTerms).toHaveBeenCalledTimes(1);
    expect(searchTerms.mock.calls[0][1]).toMatchObject({ limit: 2 });
    expect(
      (await b.searchKeywords("coffee", { excludeConversationId: "conv_2" })).map((m) => m.uniqueId)
    ).toEqual(["msg_3", "msg_2", "msg_1"]);
    expect(searchTerms.mock.calls.slice(1).map(([q, o]) => [q, o])).toEqual([
      ["coffee", { limit: 50, kinds: ["message"], excludeConversationId: "conv_2" }],
      [
        "coffee",
        { limit: 48, kinds: ["message"], excludeConversationId: "conv_2", cursor: "page_2" },
      ],
    ]);
  });

  it("applies writes still waiting to be sent before returning vault's matches", async () => {
    const fake = await createChatStoreHarness();
    const searchTerms = vi.fn<NonNullable<ChatStore["searchTerms"]>>();
    const { b } = backend({ ...fake, store: { ...fake.store, searchTerms } });
    await b.createConversation({ conversationId: "conv_1" });
    await b.createConversation({ conversationId: "conv_2" });
    for (const [id, conversationId] of [
      ["msg_deleted", "conv_1"],
      ["msg_edited", "conv_1"],
      ["msg_kept", "conv_1"],
      ["msg_in_deleted_chat", "conv_2"],
    ])
      await b.createMessage({ conversationId, role: "user", content: "coffee", uniqueId: id });
    await b.flush();
    const rows = await Promise.all(
      ["msg_deleted", "msg_edited", "msg_kept", "msg_in_deleted_chat"].map(
        async (id) => (await fake.row("message", id))!
      )
    );
    searchTerms.mockResolvedValue({ items: rows });

    fake.fail({
      op: "putMany",
      error: new ChatStoreError("busy", 429, "rate_limited", 60_000),
      sticky: true,
    });
    await b.deleteMessage("msg_deleted");
    await b.upsertMessage({
      conversationId: "conv_1",
      role: "user",
      content: "tea",
      uniqueId: "msg_edited",
    });
    await b.deleteConversation("conv_2");

    expect((await b.searchKeywords("coffee")).map((m) => m.uniqueId)).toEqual(["msg_kept"]);
  });

  it("finds nothing when vault keeps no word hashes", async () => {
    const fake = await createChatStoreHarness();
    const { b } = backend(fake);
    expect(await b.searchKeywords("coffee")).toEqual([]);
  });

  it("retries indexing with backoff after a failed page, from the same cursor", async () => {
    vi.useFakeTimers();
    try {
      const fake = await createChatStoreHarness();
      let calls = 0;
      const indexTermsPage = vi.fn<NonNullable<ChatStore["indexTermsPage"]>>(() => {
        calls += 1;
        if (calls === 1) return Promise.reject(new ChatStoreError("busy", 503, "unavailable"));
        return Promise.resolve({ indexed: 1 });
      });
      const { b } = backend({ ...fake, store: { ...fake.store, indexTermsPage } });
      await b.poll();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(indexTermsPage).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(59_999);
      expect(indexTermsPage).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(indexTermsPage.mock.calls.map(([cursor]) => cursor)).toEqual([undefined, undefined]);
      await vi.advanceTimersByTimeAsync(600_000);
      expect(indexTermsPage).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("indexes records without terms page by page, a second apart, 30 seconds after connecting and only while active", async () => {
    vi.useFakeTimers();
    try {
      const fake = await createChatStoreHarness();
      let active = false;
      const indexTermsPage = vi.fn<NonNullable<ChatStore["indexTermsPage"]>>((cursor) =>
        Promise.resolve(cursor ? { indexed: 1 } : { indexed: 2, nextCursor: "page_2" })
      );
      const { b } = backend(
        { ...fake, store: { ...fake.store, indexTermsPage } },
        { activity: { isActive: () => active, subscribe: () => () => {} } }
      );
      await b.poll();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(indexTermsPage).not.toHaveBeenCalled();

      active = true;
      const { b: later } = backend(
        { ...fake, store: { ...fake.store, indexTermsPage } },
        { activity: { isActive: () => active, subscribe: () => () => {} } }
      );
      await later.poll();
      await vi.advanceTimersByTimeAsync(29_999);
      expect(indexTermsPage).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(indexTermsPage.mock.calls.map(([cursor]) => cursor)).toEqual([undefined]);
      await vi.advanceTimersByTimeAsync(999);
      expect(indexTermsPage).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(indexTermsPage.mock.calls.map(([cursor]) => cursor)).toEqual([undefined, "page_2"]);
      await vi.advanceTimersByTimeAsync(120_000);
      expect(indexTermsPage).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
