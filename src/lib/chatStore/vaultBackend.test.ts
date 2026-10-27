import { webcrypto } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import {
  type ChatStoreHarness,
  conformance,
  createChatStoreHarness,
} from "../../../test/chat/vaultHarness";
import { ChatStoreError } from "./types";
import { createVaultChatBackend, type VaultChatBackend, type VaultChatEvent } from "./vaultBackend";
import type { ChatOutboxStorage } from "./vaultOutbox";

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

function memoryStorage(): ChatOutboxStorage & { value: string | null } {
  return {
    value: null,
    async get() {
      return this.value;
    },
    async set(sealed) {
      this.value = sealed;
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
    events.length = 0;
    await b.poll();

    expect((await b.getMessages("conv_1")).map((m) => m.content)).toEqual(["from phone"]);
    expect((await b.getConversations()).map((c) => c.conversationId)).toContain("conv_2");
    expect(events).toContainEqual({ type: "messages", conversationId: "conv_1" });
    const polled = await (changes.mock.results[0].value as ReturnType<typeof fake.store.changes>);
    expect(polled.items.map((s) => s.record.id)).not.toContain("conv_old");
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

    expect(storage.value).toMatch(/^enc:v\d+:/);
    expect(storage.value).not.toContain("Secret plans");
    expect(await fake.row("conversation", "conv_1")).toBeUndefined();

    fake.heal();
    const reloaded = backend(fake, { outbox: { storage, seal } }).b;
    await reloaded.flush();
    expect((await fake.row("conversation", "conv_1"))?.record.data.title).toBe("Secret plans");
    expect(storage.value).toBeNull();
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

  it("tells the account's other tabs to poll after a write", async () => {
    const fake = await createChatStoreHarness();
    const channel = `chat-test-${Math.random()}`;
    const writer = backend(fake, { channel }).b;
    const { b: reader, events } = backend(fake, { channel });
    await reader.getConversations();
    await writer.createConversation({ conversationId: "conv_1", title: "From another tab" });
    await writer.flush();

    await vi.waitFor(() => expect(events).toContainEqual({ type: "conversations" }), {
      timeout: 2_000,
    });
    expect((await reader.getConversations()).map((c) => c.title)).toEqual(["From another tab"]);
  });
});
