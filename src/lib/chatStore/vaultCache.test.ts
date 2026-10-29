import { webcrypto } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createFakeChatStore } from "../../../test/chat/fakeChatStore";
import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import { type ChatStore, ChatStoreError } from "./types";
import { createVaultChatBackend, type VaultChatBackend } from "./vaultBackend";
import {
  type ChatCacheSnapshot,
  type ChatCacheStorage,
  loadChatCache,
  saveChatCache,
} from "./vaultCache";
import type { ChatOutboxStorage } from "./vaultOutbox";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

const open: VaultChatBackend[] = [];
afterEach(() => {
  open.splice(0).forEach((b) => b.close());
});

type Seal = ReturnType<typeof memoryCipher>;
type Fake = ReturnType<typeof createFakeChatStore>;

async function sealFor(seed: string): Promise<Seal> {
  return memoryCipher(await deriveMemoryKeyRing("0x" + seed.repeat(65)));
}

function cacheStorage(): ChatCacheStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    get: async (account) => values.get(account) ?? null,
    set: async (account, sealed) => {
      if (sealed === null) values.delete(account);
      else values.set(account, sealed);
    },
  };
}

function outboxStorage(): ChatOutboxStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    slots: async () => [...values.keys()],
    get: async (slot) => values.get(slot) ?? null,
    set: async (slot, sealed) => {
      if (sealed === null) values.delete(slot);
      else values.set(slot, sealed);
    },
  };
}

function backend(
  store: ChatStore | (() => Promise<ChatStore>),
  extra: Partial<Parameters<typeof createVaultChatBackend>[0]> = {}
) {
  const b = createVaultChatBackend({
    store,
    pollIntervalMs: 0,
    activity: { isActive: () => true, subscribe: () => () => {} },
    ...extra,
  });
  open.push(b);
  return b;
}

const offline = () => Promise.reject(new TypeError("offline"));

async function cached(
  storage: ChatCacheStorage,
  seal: Seal,
  account: string,
  check: (cache: ChatCacheSnapshot) => void
): Promise<ChatCacheSnapshot> {
  let found: ChatCacheSnapshot | undefined;
  await vi.waitFor(
    async () => {
      found = await loadChatCache(storage, account, seal.decrypt);
      expect(found).toBeDefined();
      check(found!);
    },
    { timeout: 3000, interval: 20 }
  );
  return found!;
}

const ids = (cache: ChatCacheSnapshot) => cache.records.map((s) => s.record.id);

async function chat(b: VaultChatBackend, conversationId: string, title: string, uniqueId: string) {
  await b.createConversation({ conversationId, title });
  await b.createMessage({ conversationId, role: "user", content: `${title} note`, uniqueId });
}

describe("vault chat cache", () => {
  it("serves cached chats on an offline cold start and catches up once vault answers", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const first = backend(fake.store, { cache });
    await chat(first, "conv_1", "Secret plans", "msg_1");
    await first.flush();
    await first.getSummary("conv_1");
    await cached(storage, seal, "0xaaa", (c) => {
      expect(ids(c)).toContain("msg_1");
      expect(c.absent).toContain("summary/conv_1");
    });
    first.close();
    expect([...storage.values.values()].join()).not.toContain("Secret plans");

    let online = false;
    const connect = vi.fn(() => (online ? Promise.resolve(fake.store) : offline()));
    const cold = backend(connect, { cache });
    expect((await cold.getConversations()).map((c) => c.title)).toEqual(["Secret plans"]);
    expect((await cold.getMessages("conv_1")).map((m) => m.content)).toEqual(["Secret plans note"]);
    expect(await cold.getSummary("conv_1")).toBeNull();
    expect(connect).toHaveBeenCalled();

    const other = backend(fake.store);
    await other.createMessage({
      conversationId: "conv_1",
      role: "assistant",
      content: "from phone",
      uniqueId: "msg_2",
    });
    await other.flush();
    online = true;
    await cold.poll();
    expect((await cold.getMessages("conv_1")).map((m) => m.uniqueId)).toEqual(["msg_1", "msg_2"]);
  });

  it("resumes from the cached cursor and pulls only later changes", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const first = backend(fake.store, { cache });
    await chat(first, "conv_1", "Trip", "msg_1");
    await first.flush();
    await first.poll();
    const saved = await cached(storage, seal, "0xaaa", (c) => {
      expect(ids(c)).toContain("msg_1");
      expect(c.cursor).not.toBe("");
    });
    first.close();

    const other = backend(fake.store);
    await other.createMessage({
      conversationId: "conv_1",
      role: "assistant",
      content: "from phone",
      uniqueId: "msg_2",
    });
    await other.createConversation({ conversationId: "conv_2", title: "Elsewhere" });
    await other.flush();

    const changes = vi.spyOn(fake.store, "changes");
    const list = vi.spyOn(fake.store, "list");
    const resumed = backend(fake.store, { cache });
    await vi.waitFor(async () =>
      expect((await resumed.getMessages("conv_1")).map((m) => m.uniqueId)).toEqual([
        "msg_1",
        "msg_2",
      ])
    );
    expect((await resumed.getConversations()).map((c) => c.conversationId)).toContain("conv_2");
    expect(changes.mock.calls[0][0]).toBe(saved.cursor);
    const pulled = await (changes.mock.results[0].value as ReturnType<ChatStore["changes"]>);
    expect(pulled.items.map((s) => s.record.id)).not.toContain("msg_1");
    expect(list).not.toHaveBeenCalled();
  });

  it("refetches everything and replaces the cache when vault rejects the cached cursor", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    await saveChatCache(storage, seal.encrypt, {
      account: "0xaaa",
      cursor: "expired",
      records: [
        {
          record: {
            kind: "conversation",
            id: "conv_stale",
            conversationId: "",
            sortKey: 1,
            createdAt: 1,
            updatedAt: 1,
            isDeleted: false,
            data: { title: "Stale" },
          },
          version: 1,
          serverUpdatedAt: new Date(1).toISOString(),
        },
      ],
      threads: [],
      absent: [],
    });
    const writer = backend(fake.store);
    await writer.createConversation({ conversationId: "conv_1", title: "Fresh" });
    await writer.flush();
    writer.close();

    fake.fail({ op: "changes", error: new ChatStoreError("invalid cursor", 400) });
    const b = backend(fake.store, { cache: { storage, seal, account: "0xaaa" } });
    expect((await b.getConversations()).map((c) => c.title)).toEqual(["Stale"]);
    await b.poll();
    expect((await b.getConversations()).map((c) => c.title)).toEqual(["Fresh"]);
    const head = (await fake.store.account()).changesCursor;
    await cached(storage, seal, "0xaaa", (c) => {
      expect(ids(c)).toEqual(["conv_1"]);
      expect(c.cursor).toBe(head);
    });
  });

  it("never serves one account's cache to another account", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const first = backend(fake.store, { cache: { storage, seal, account: "0xaaa" } });
    await chat(first, "conv_1", "Wallet A", "msg_1");
    await first.flush();
    await cached(storage, seal, "0xaaa", (c) => expect(ids(c)).toContain("msg_1"));
    first.close();

    const otherWallet = backend(offline, {
      cache: { storage, seal: await sealFor("78"), account: "0xbbb" },
    });
    await expect(otherWallet.getConversations()).rejects.toThrow("offline");

    const [entry] = storage.values.values();
    const leaky: ChatCacheStorage = { get: async () => entry, set: async () => {} };
    for (const cache of [
      { storage: leaky, seal, account: "0xbbb" },
      { storage: leaky, seal: await sealFor("78"), account: "0xbbb" },
    ]) {
      const b = backend(offline, { cache });
      await expect(b.getConversations()).rejects.toThrow("offline");
    }
  });

  it("deletes the cache on clear and stops writing it", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const b = backend(fake.store, { cache });
    await chat(b, "conv_1", "Trip", "msg_1");
    await b.flush();
    await cached(storage, seal, "0xaaa", (c) => expect(ids(c)).toContain("msg_1"));

    await b.clearCache();
    expect(storage.values.size).toBe(0);
    await b.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "more",
      uniqueId: "msg_2",
    });
    await b.flush();
    await b.poll();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(storage.values.size).toBe(0);
    await expect(backend(offline, { cache }).getConversations()).rejects.toThrow("offline");
  });

  it("deletes the cache when vault says the account or key changed", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const b = backend(fake.store, { cache });
    await chat(b, "conv_1", "Trip", "msg_1");
    await b.flush();
    await cached(storage, seal, "0xaaa", (c) => expect(ids(c)).toContain("msg_1"));

    fake.fail({
      op: "changes",
      error: new ChatStoreError("key changed", 409, "key_mismatch"),
    });
    await b.poll();
    await vi.waitFor(() => expect(storage.values.size).toBe(0));
    await b.poll();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(storage.values.size).toBe(0);
  });

  it("keeps working when the app's cache storage fails", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const set = vi.fn(() => Promise.reject(new Error("disk full")));
    const b = backend(fake.store, {
      cache: { storage: { get: async () => null, set }, seal, account: "0xaaa" },
    });
    await chat(b, "conv_1", "Trip", "msg_1");
    await b.flush();
    await vi.waitFor(() => expect(set).toHaveBeenCalled(), { timeout: 3000 });
    await b.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "more",
      uniqueId: "msg_2",
    });
    await b.flush();
    await vi.waitFor(() => expect(set).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect((await b.getMessages("conv_1")).map((m) => m.uniqueId)).toEqual(["msg_1", "msg_2"]);
  });

  it("caches only writes vault confirmed, never the outbox", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const outbox = outboxStorage();
    const b = backend(fake.store, {
      cache: { storage, seal, account: "0xaaa" },
      outbox: { storage: outbox, seal },
    });
    await chat(b, "conv_1", "Trip", "msg_1");
    await b.flush();
    await cached(storage, seal, "0xaaa", (c) => expect(ids(c)).toContain("msg_1"));

    fake.fail({ op: "putMany", error: new TypeError("offline"), sticky: true });
    fake.fail({ op: "getMany", error: new TypeError("offline"), sticky: true });
    await b.updateConversationTitle("conv_1", "Unsent title");
    await b.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "unsent",
      uniqueId: "msg_unsent",
    });
    await b.flush();
    expect(b.status().pending).toBeGreaterThan(0);
    expect(outbox.values.size).toBe(1);
    await fake.write([
      {
        record: {
          kind: "conversation",
          id: "conv_2",
          conversationId: "",
          sortKey: 1,
          createdAt: 1,
          updatedAt: 1,
          isDeleted: false,
          data: { title: "Elsewhere" },
        },
        expectedVersion: 0,
      },
    ]);
    await b.poll();
    const during = await cached(storage, seal, "0xaaa", (c) => expect(ids(c)).toContain("conv_2"));
    expect(ids(during)).not.toContain("msg_unsent");
    expect(during.records.find((s) => s.record.id === "conv_1")?.record.data.title).toBe("Trip");

    fake.heal();
    await b.flush();
    await cached(storage, seal, "0xaaa", (c) => {
      expect(ids(c)).toContain("msg_unsent");
      expect(c.records.find((s) => s.record.id === "conv_1")?.record.data.title).toBe(
        "Unsent title"
      );
    });
  });

  it("keeps only the most recently used threads up to threadCacheSize", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const b = backend(fake.store, { cache, threadCacheSize: 2 });
    await chat(b, "conv_a", "A", "msg_a");
    await chat(b, "conv_b", "B", "msg_b");
    await chat(b, "conv_c", "C", "msg_c");
    await b.flush();
    const saved = await cached(storage, seal, "0xaaa", (c) =>
      expect(c.threads).toEqual(["conv_b", "conv_c"])
    );
    expect(ids(saved)).toEqual(expect.arrayContaining(["conv_a", "msg_b", "msg_c"]));
    expect(ids(saved)).not.toContain("msg_a");
    b.close();

    const cold = backend(offline, { cache, threadCacheSize: 2 });
    expect((await cold.getConversations()).map((c) => c.conversationId).sort()).toEqual([
      "conv_a",
      "conv_b",
      "conv_c",
    ]);
    expect((await cold.getMessages("conv_c")).map((m) => m.uniqueId)).toEqual(["msg_c"]);
    await expect(cold.getMessages("conv_a")).rejects.toThrow("offline");
  });
});
