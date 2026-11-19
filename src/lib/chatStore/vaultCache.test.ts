import { webcrypto } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createFakeChatStore } from "../../../test/chat/fakeChatStore";
import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import { type ChatStore, ChatStoreError } from "./types";
import { createVaultChatBackend, type VaultChatBackend, type VaultChatEvent } from "./vaultBackend";
import {
  type ChatCacheSnapshot,
  type ChatCacheStorage,
  clearChatCache,
  loadChatCache,
  saveChatCache,
  storedChatCacheEntries,
} from "./vaultCache";
import type { ChatOutboxLocks, ChatOutboxStorage } from "./vaultOutbox";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

const open: VaultChatBackend[] = [];
afterEach(() => {
  open.splice(0).forEach((b) => b.close());
});

type Seal = ReturnType<typeof memoryCipher>;

async function sealFor(seed: string): Promise<Seal> {
  return memoryCipher(await deriveMemoryKeyRing("0x" + seed.repeat(65)));
}

function cacheStorage(): ChatCacheStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    get: (account) => Promise.resolve(values.get(account) ?? null),
    set: (account, sealed) => {
      if (sealed === null) values.delete(account);
      else values.set(account, sealed);
      return Promise.resolve();
    },
  };
}

function outboxStorage(): ChatOutboxStorage & { values: Map<string, string> } {
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

function conversationCache(count: number): ChatCacheSnapshot {
  return {
    account: "0xaaa",
    cursor: "cursor_1",
    records: Array.from({ length: count }, (_, index) => ({
      record: {
        kind: "conversation" as const,
        id: `conv_${index}`,
        conversationId: "",
        sortKey: index,
        createdAt: index,
        updatedAt: index,
        isDeleted: false,
        data: { title: `Conversation ${index}` },
      },
      version: 1,
      serverUpdatedAt: new Date(index).toISOString(),
    })),
    threads: [],
    absent: [],
  };
}

describe("vault chat cache", () => {
  it("saves and loads 500 conversations with two storage operations", async () => {
    const storage = cacheStorage();
    const snapshot = conversationCache(500);
    const encrypt = vi.fn((plaintext: string) => Promise.resolve(plaintext));
    const set = vi.spyOn(storage, "set");

    const saved = await saveChatCache(storage, encrypt, snapshot);

    expect(saved.entries).toHaveLength(1);
    expect(set).toHaveBeenCalledTimes(2);
    expect(encrypt).toHaveBeenCalledTimes(2);
    const get = vi.spyOn(storage, "get");
    const decrypt = vi.fn((sealed: string) => Promise.resolve(sealed));
    expect(await loadChatCache(storage, snapshot.account, decrypt)).toMatchObject(snapshot);
    expect(get).toHaveBeenCalledTimes(2);
    expect(decrypt).toHaveBeenCalledTimes(2);
    storage.values.delete(saved.entries![0][1]);
    await expect(loadChatCache(storage, snapshot.account, decrypt)).resolves.toBeUndefined();
  });

  it.each([1, 2])("converts schema %i to one conversation index entry", async (schema) => {
    const storage = cacheStorage();
    const snapshot = conversationCache(500);
    const entries: [string, string][] = [];
    if (schema === 2) {
      for (const record of snapshot.records) {
        const key = `conversation/${record.record.id}`;
        const slot = `${snapshot.account}/chat-cache/${record.record.id}`;
        entries.push([key, slot]);
        await storage.set(
          slot,
          JSON.stringify({ account: snapshot.account, key, records: [record] })
        );
      }
    }
    await storage.set(
      snapshot.account,
      JSON.stringify({
        ...snapshot,
        schema,
        records: schema === 1 ? snapshot.records : undefined,
        partial: [],
        entries,
      })
    );
    const decrypt = (sealed: string) => Promise.resolve(sealed);
    const previous = await loadChatCache(storage, snapshot.account, decrypt);
    expect(previous).toMatchObject(snapshot);
    const encrypt = vi.fn((plaintext: string) => Promise.resolve(plaintext));

    const saved = await saveChatCache(storage, encrypt, previous!, previous);

    expect(saved.entries).toHaveLength(1);
    expect(encrypt).toHaveBeenCalledTimes(2);
    expect(storage.values.size).toBe(2);
    expect(await loadChatCache(storage, snapshot.account, decrypt)).toMatchObject(snapshot);
  });

  it("loads thread entries with bounded concurrent reads and decryptions", async () => {
    const storage = cacheStorage();
    const snapshot = conversationCache(500);
    snapshot.threads = snapshot.records.map(({ record }) => record.id);
    snapshot.records.push(
      ...snapshot.records.map(({ record, ...rest }) => ({
        ...rest,
        record: {
          ...record,
          kind: "message" as const,
          id: `msg_${record.id}`,
          conversationId: record.id,
          data: { role: "user", content: `Message ${record.id}` },
        },
      }))
    );
    const saved = await saveChatCache(storage, (plaintext) => Promise.resolve(plaintext), snapshot);
    const first = storage.values.get(saved.entries![1][1]);
    const get = vi.spyOn(storage, "get");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const decrypt = vi.fn(async (sealed: string) => {
      if (sealed === first) await gate;
      return sealed;
    });
    const loading = loadChatCache(storage, snapshot.account, decrypt);
    try {
      await vi.waitFor(() => expect(decrypt.mock.calls.length).toBeGreaterThan(3));
      expect(get.mock.calls.length).toBeLessThanOrEqual(17);
    } finally {
      release();
    }

    expect(await loading).toMatchObject(snapshot);
    expect(get).toHaveBeenCalledTimes(502);
    expect(decrypt).toHaveBeenCalledTimes(502);
    storage.values.delete(saved.entries![500][1]);
    await expect(loadChatCache(storage, snapshot.account, decrypt)).resolves.toBeUndefined();
  });

  it("deletes slots an interrupted save left behind when the storage lists its keys", async () => {
    const storage = cacheStorage();
    const keys = vi.fn(() => Promise.resolve([...storage.values.keys()]));
    const listed = Object.assign(storage, { keys });
    const plain = (text: string) => Promise.resolve(text);
    const snapshot = conversationCache(2);
    const previous = await saveChatCache(listed, plain, snapshot);
    await storage.set(`${snapshot.account}/chat-cache/orphan`, "sealed");
    await storage.set("0xbbb/chat-cache/other", "sealed");
    await storage.set("0xbbb", "sealed");

    const next = { ...snapshot, cursor: "cursor_2" };
    const saved = await saveChatCache(listed, plain, next, previous);

    expect(keys).toHaveBeenCalledWith(`${snapshot.account}/chat-cache/`);
    expect([...storage.values.keys()].sort()).toEqual(
      ["0xbbb", "0xbbb/chat-cache/other", snapshot.account, saved.entries![0][1]].sort()
    );
    expect(await loadChatCache(storage, snapshot.account, plain)).toMatchObject(next);
  });

  it("still saves and deletes replaced slots when listing keys fails", async () => {
    const storage = cacheStorage();
    const listed = Object.assign(storage, {
      keys: () => Promise.reject(new Error("storage unavailable")),
    });
    const plain = (text: string) => Promise.resolve(text);
    const previous = await saveChatCache(listed, plain, conversationCache(2));
    const changed = conversationCache(3);

    const saved = await saveChatCache(listed, plain, changed, previous);

    expect([...storage.values.keys()].sort()).toEqual(
      [changed.account, saved.entries![0][1]].sort()
    );
    expect(await loadChatCache(storage, changed.account, plain)).toMatchObject(changed);
  });

  it("clears slots no index names", async () => {
    const storage = cacheStorage();
    const listed = Object.assign(storage, {
      keys: () => Promise.resolve([...storage.values.keys()]),
    });
    const plain = (text: string) => Promise.resolve(text);
    const snapshot = conversationCache(2);
    const previous = await saveChatCache(listed, plain, snapshot);
    await storage.set(`${snapshot.account}/chat-cache/orphan`, "sealed");
    await storage.set("0xbbb", "sealed");

    await clearChatCache(listed, snapshot.account, plain, previous);

    expect([...storage.values.keys()]).toEqual(["0xbbb"]);
  });

  it("reuses sealed records when only the cache cursor changes", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const encrypt = vi.fn(seal.encrypt);
    const b = backend(fake.store);
    await chat(b, "conv_1", "Cached thread payload", "msg_1");
    await b.flush();
    const snapshot: ChatCacheSnapshot = {
      account: "0xaaa",
      cursor: "cursor_1",
      records: [(await fake.row("conversation", "conv_1"))!, (await fake.row("message", "msg_1"))!],
      threads: ["conv_1"],
      absent: [],
    };
    const previous = await saveChatCache(storage, encrypt, snapshot);
    const entries = new Map(storage.values);
    const set = vi.spyOn(storage, "set");
    encrypt.mockClear();

    const next = { ...snapshot, cursor: "cursor_2" };
    await saveChatCache(storage, encrypt, next, previous);

    expect(set).toHaveBeenCalledExactlyOnceWith(snapshot.account, expect.any(String));
    expect(encrypt).toHaveBeenCalledTimes(1);
    expect(encrypt.mock.calls[0][0]).not.toContain("Cached thread payload");
    for (const [key, sealed] of entries)
      if (key !== snapshot.account) expect(storage.values.get(key)).toBe(sealed);
    expect(await loadChatCache(storage, snapshot.account, seal.decrypt)).toMatchObject(next);
  });

  it("reuses live entries from another tab and replaces only a changed thread", async () => {
    const storage = cacheStorage();
    const seal = await sealFor("56");
    const snapshot = conversationCache(2);
    snapshot.threads = snapshot.records.map(({ record }) => record.id);
    snapshot.records.push(
      ...snapshot.records.map(({ record, ...rest }) => ({
        ...rest,
        record: {
          ...record,
          kind: "message" as const,
          id: `msg_${record.id}`,
          conversationId: record.id,
          data: { role: "user", content: `Message ${record.id}` },
        },
      }))
    );
    const first = await saveChatCache(storage, seal.encrypt, snapshot);
    const stored = () => storedChatCacheEntries(storage, snapshot.account, seal.decrypt);
    const second = await saveChatCache(
      storage,
      seal.encrypt,
      (await loadChatCache(storage, snapshot.account, seal.decrypt))!,
      undefined,
      await stored()
    );
    const sealed = new Map(storage.values);
    const encrypt = vi.fn(seal.encrypt);
    const set = vi.spyOn(storage, "set");
    const next = { ...snapshot, cursor: "cursor_2" };

    const reused = await saveChatCache(storage, encrypt, next, first, await stored(), seal.decrypt);

    expect(reused.entries).toEqual(second.entries);
    expect(encrypt).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledExactlyOnceWith(snapshot.account, expect.any(String));
    for (const [, slot] of second.entries!) expect(storage.values.get(slot)).toBe(sealed.get(slot));

    const changed = {
      ...next,
      cursor: "cursor_3",
      records: second.records.map((entry) =>
        entry.record.id === "msg_conv_1"
          ? {
              ...entry,
              version: entry.version + 1,
              record: {
                ...entry.record,
                data: { ...entry.record.data, content: "Changed message" },
              },
            }
          : entry
      ),
    };
    encrypt.mockClear();
    set.mockClear();
    const saved = await saveChatCache(
      storage,
      encrypt,
      changed,
      second,
      await stored(),
      seal.decrypt
    );
    const before = new Map(reused.entries);
    const after = new Map(saved.entries);

    expect(encrypt).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledTimes(3);
    expect(after.get("conversations")).toBe(before.get("conversations"));
    expect(after.get("thread/conv_0")).toBe(before.get("thread/conv_0"));
    expect(after.get("thread/conv_1")).not.toBe(before.get("thread/conv_1"));
    const confirmed = (await loadChatCache(storage, snapshot.account, seal.decrypt))!;
    expect(confirmed).toMatchObject(changed);

    encrypt.mockClear();
    set.mockClear();
    const caughtUp = await saveChatCache(
      storage,
      encrypt,
      { ...confirmed, cursor: "cursor_4" },
      reused,
      await stored(),
      seal.decrypt
    );

    expect(caughtUp.entries).toEqual(saved.entries);
    expect(encrypt).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledExactlyOnceWith(snapshot.account, expect.any(String));
  });

  it("seals the changed thread and conversation index after a confirmed turn", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const encrypt = vi.fn(seal.encrypt);
    const storage = cacheStorage();
    const cache = { storage, seal: { ...seal, encrypt }, account: "0xaaa" };
    const b = backend(fake.store, { cache });
    await chat(b, "conv_a", "Unchanged thread payload", "msg_a");
    await chat(b, "conv_b", "Changed thread", "msg_b");
    await b.flush();
    const previous = await cached(storage, seal, cache.account, (c) =>
      expect(ids(c)).toContain("msg_b")
    );
    encrypt.mockClear();

    await b.createMessage({
      conversationId: "conv_b",
      role: "assistant",
      content: "New reply",
      uniqueId: "msg_reply",
    });
    await b.flush();
    const saved = await cached(storage, seal, cache.account, (c) =>
      expect(ids(c)).toContain("msg_reply")
    );

    expect(new Map(saved.entries).get("thread/conv_a")).toBe(
      new Map(previous.entries).get("thread/conv_a")
    );
    expect(encrypt.mock.calls.map(([plaintext]) => plaintext).join()).not.toContain(
      "Unchanged thread payload note"
    );
    encrypt.mockClear();
    await b.poll();
    await vi.waitFor(() => expect(encrypt).toHaveBeenCalled(), { timeout: 3000 });
    expect(encrypt).toHaveBeenCalledTimes(1);
    expect(encrypt.mock.calls[0][0]).not.toContain("note");
    b.close();
    const cold = backend(offline, { cache });
    expect((await cold.getMessages("conv_a")).map((m) => m.uniqueId)).toEqual(["msg_a"]);
    expect((await cold.getMessages("conv_b")).map((m) => m.uniqueId)).toEqual([
      "msg_b",
      "msg_reply",
    ]);
  });

  it("returns cached files on an offline cold start", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("57");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const b = backend(fake.store, { cache });
    await b.createConversation({ conversationId: "conv_a" });
    await b.createMessage({
      conversationId: "conv_a",
      role: "user",
      content: "with file",
      uniqueId: "msg_a",
      files: [{ id: "file_a", name: "a.txt", type: "text/plain", size: 1 }],
    });
    await b.flush();
    await cached(storage, seal, cache.account, (c) => expect(ids(c)).toContain("msg_a"));
    b.close();

    const cold = backend(offline, { cache });
    expect((await cold.getAllFiles()).map((file) => file.id)).toEqual(["file_a"]);
  });

  it("caps cached messages and reloads the complete thread when vault answers", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const b = backend(fake.store, { cache });
    await b.createConversation({ conversationId: "anuma-1on1" });
    await b.flush();
    await fake.write(
      Array.from({ length: 205 }, (_, index) => ({
        record: {
          kind: "message" as const,
          id: `msg_${index}`,
          conversationId: "anuma-1on1",
          sortKey: index,
          createdAt: index,
          updatedAt: index,
          isDeleted: false,
          data: { role: "user", content: `Message ${index}` },
        },
        expectedVersion: 0,
      }))
    );
    expect(await b.getMessages("anuma-1on1")).toHaveLength(205);
    const saved = await cached(storage, seal, cache.account, (c) => {
      const messages = c.records.filter((s) => s.record.kind === "message");
      expect(messages).toHaveLength(200);
      expect(messages[0].record.id).toBe("msg_5");
      expect(messages[199].record.id).toBe("msg_204");
    });
    b.close();
    await saveChatCache(
      storage,
      seal.encrypt,
      { ...saved, cursor: (await fake.store.account()).changesCursor! },
      saved
    );

    let connect!: (store: ChatStore) => void;
    const connection = new Promise<ChatStore>((resolve) => (connect = resolve));
    const connecting = backend(() => connection, { cache });
    const received = vi.fn();
    const messages = connecting.getMessages("anuma-1on1").then(received);
    const updates: number[] = [];
    const subscription = connecting.observeMessages("anuma-1on1").subscribe({
      next: (messages) => updates.push(messages.length),
    });
    await vi.waitFor(() => expect(received).toHaveBeenCalledWith(expect.any(Array)));
    expect(received.mock.calls[0][0]).toHaveLength(200);
    expect(updates).toEqual([200]);
    connect(fake.store);
    await messages;
    await vi.waitFor(() => expect(updates).toEqual([200, 205]));
    subscription.unsubscribe();
    connecting.close();

    let online = false;
    const cold = backend(() => (online ? Promise.resolve(fake.store) : offline()), { cache });
    expect(await cold.getMessages("anuma-1on1")).toHaveLength(200);
    online = true;
    await cold.poll();
    await vi.waitFor(async () => expect(await cold.getMessages("anuma-1on1")).toHaveLength(205));
  });

  it.each(["manifest", "entry"])("holds the account lock across %s reads", async (phase) => {
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const snapshot = conversationCache(1);
    snapshot.threads = ["conv_0"];
    snapshot.records.push({
      ...snapshot.records[0],
      record: {
        ...snapshot.records[0].record,
        kind: "message",
        id: "msg_1",
        conversationId: "conv_0",
        data: { role: "user", content: "Cached message" },
      },
    });
    const previous = await saveChatCache(storage, seal.encrypt, snapshot);
    const changed = {
      ...snapshot,
      records: snapshot.records.map((entry) =>
        entry.record.kind === "message" ? { ...entry, version: entry.version + 1 } : entry
      ),
    };
    let releaseRead!: () => void;
    const resume = new Promise<void>((resolve) => (releaseRead = resolve));
    let started!: () => void;
    const reading = new Promise<void>((resolve) => (started = resolve));
    let queued!: () => void;
    const waiting = new Promise<void>((resolve) => (queued = resolve));
    const held = new Set<string>();
    const tails = new Map<string, Promise<void>>();
    const locks: ChatOutboxLocks = {
      request(name, _options, callback) {
        if (held.has(name)) queued();
        const result = (tails.get(name) ?? Promise.resolve()).then(async () => {
          held.add(name);
          try {
            return await callback({});
          } finally {
            held.delete(name);
          }
        });
        tails.set(
          name,
          result.then(
            () => undefined,
            () => undefined
          )
        );
        return result;
      },
    };
    const navigator = globalThis.navigator;
    vi.stubGlobal("navigator", { locks });
    const target =
      phase === "manifest" ? snapshot.account : new Map(previous.entries).get("thread/conv_0")!;
    const get = storage.get.bind(storage);
    let paused = false;
    vi.spyOn(storage, "get").mockImplementation(async (key) => {
      const manifest = key === snapshot.account ? await get(key) : undefined;
      if (key === target && !paused) {
        paused = true;
        started();
        await resume;
      }
      return manifest ?? get(key);
    });
    let saving: Promise<ChatCacheSnapshot> | undefined;
    try {
      const cold = backend(offline, { cache: { storage, seal, account: snapshot.account } });
      await reading;
      saving = locks.request(`chat-cache:${snapshot.account}`, {}, () =>
        saveChatCache(storage, seal.encrypt, changed, previous)
      );
      await Promise.race([saving, waiting]);
      releaseRead();
      expect((await cold.getMessages("conv_0")).map((message) => message.uniqueId)).toEqual([
        "msg_1",
      ]);
      await saving;
      expect(await loadChatCache(storage, snapshot.account, seal.decrypt)).toMatchObject(changed);
    } finally {
      releaseRead();
      await saving;
      vi.stubGlobal("navigator", navigator);
    }
  });

  it("serves a capped cached thread while the vault connection is pending", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const b = backend(fake.store, { cache });
    await b.createConversation({ conversationId: "anuma-1on1" });
    await b.flush();
    await fake.write(
      Array.from({ length: 205 }, (_, index) => ({
        record: {
          kind: "message" as const,
          id: `msg_${index}`,
          conversationId: "anuma-1on1",
          sortKey: index,
          createdAt: index,
          updatedAt: index,
          isDeleted: false,
          data: { role: "user", content: `Message ${index}` },
        },
        expectedVersion: 0,
      }))
    );
    expect(await b.getMessages("anuma-1on1")).toHaveLength(205);
    await cached(storage, seal, cache.account, (c) =>
      expect(c.records.filter((s) => s.record.kind === "message")).toHaveLength(200)
    );
    b.close();

    let connect!: (store: ChatStore) => void;
    const connection = new Promise<ChatStore>((resolve) => (connect = resolve));
    const cold = backend(() => connection, { cache });
    const events: VaultChatEvent[] = [];
    cold.subscribe((event) => events.push(event));
    expect(await cold.getMessages("anuma-1on1")).toHaveLength(200);
    connect(fake.store);
    const refreshed = { type: "messages", conversationId: "anuma-1on1", origin: "remote" };
    await vi.waitFor(() => expect(events).toContainEqual(refreshed));
    expect(await cold.getMessages("anuma-1on1")).toHaveLength(205);
    cold.close();
  });

  it("keeps the cache loadable when another tab replaced a reused entry", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const b = backend(fake.store);
    await chat(b, "conv_1", "Shared thread", "msg_1");
    await b.createMessage({
      conversationId: "conv_1",
      role: "assistant",
      content: "Reply",
      uniqueId: "msg_2",
    });
    await b.flush();
    const conversation = (await fake.row("conversation", "conv_1"))!;
    const first = (await fake.row("message", "msg_1"))!;
    const snapshot: ChatCacheSnapshot = {
      account: "0xaaa",
      cursor: "cursor_1",
      records: [conversation, first],
      threads: ["conv_1"],
      absent: [],
    };
    const shared = await saveChatCache(storage, seal.encrypt, snapshot);
    const stored = () => storedChatCacheEntries(storage, snapshot.account, seal.decrypt);

    await saveChatCache(
      storage,
      seal.encrypt,
      { ...snapshot, records: [conversation, first, (await fake.row("message", "msg_2"))!] },
      shared,
      await stored()
    );
    const next = { ...snapshot, cursor: "cursor_2" };
    await saveChatCache(storage, seal.encrypt, next, shared, await stored());

    expect(await loadChatCache(storage, snapshot.account, seal.decrypt)).toMatchObject(next);
    expect(storage.values.size).toBe(3);
  });

  it("reuses entries after the first tab closes and clears them from a cold tab", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const encrypt = vi.fn(seal.encrypt);
    const cache = { storage, seal: { ...seal, encrypt }, account: "0xaaa" };
    const first = backend(fake.store, { cache });
    const second = backend(fake.store, { cache });
    expect(await second.getConversations()).toEqual([]);
    await chat(first, "conv_1", "Shared thread", "msg_1");
    await first.flush();
    const before = await cached(storage, seal, cache.account, (c) =>
      expect(ids(c)).toContain("msg_1")
    );
    first.close();
    encrypt.mockClear();
    const set = vi.spyOn(storage, "set");

    await second.poll();
    expect((await second.getMessages("conv_1")).map((message) => message.uniqueId)).toEqual([
      "msg_1",
    ]);
    await vi.waitFor(() => expect(set).toHaveBeenCalled(), { timeout: 3000 });
    expect(encrypt).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledExactlyOnceWith(cache.account, expect.any(String));
    const after = await cached(storage, seal, cache.account, (c) => {
      expect(ids(c)).toContain("msg_1");
      expect(c.entries).toEqual(before.entries);
    });
    expect(storage.values.size).toBe(after.entries!.length + 1);
    second.close();

    await backend(offline, { cache }).clearCache();
    expect(storage.values.size).toBe(0);
  });

  it("rejects capped thread clears until the full history loads", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const b = backend(fake.store, { cache });
    await b.createConversation({ conversationId: "anuma-1on1" });
    await b.flush();
    await fake.write(
      Array.from({ length: 205 }, (_, index) => ({
        record: {
          kind: "message" as const,
          id: `msg_${index}`,
          conversationId: "anuma-1on1",
          sortKey: index,
          createdAt: index,
          updatedAt: index,
          isDeleted: false,
          data: {
            role: "user",
            content: `Message ${index}`,
            ...(index === 0
              ? { files: [{ id: "file_0", name: "old.png", type: "image/png", size: 1 }] }
              : {}),
          },
        },
        expectedVersion: 0,
      }))
    );
    expect(await b.getMessages("anuma-1on1")).toHaveLength(205);
    await cached(storage, seal, cache.account, (c) => {
      const messages = c.records.filter((s) => s.record.kind === "message");
      expect(messages).toHaveLength(200);
    });
    b.close();

    let online = false;
    const cold = backend(() => (online ? Promise.resolve(fake.store) : offline()), { cache });
    const unchanged = async () => {
      expect(cold.status().pending).toBe(0);
      expect((await fake.row("message", "msg_0"))!.record.isDeleted).toBe(false);
      expect((await fake.row("message", "msg_204"))!.record.isDeleted).toBe(false);
    };
    await expect(cold.clearMessages("anuma-1on1")).rejects.toMatchObject({
      code: "history_incomplete",
    });
    await unchanged();
    online = true;
    fake.fail({ op: "list", error: new TypeError("offline"), sticky: true });
    await expect(cold.clearMessages("anuma-1on1")).rejects.toMatchObject({
      code: "history_incomplete",
    });
    await unchanged();
    fake.heal();
    const files = await cold.getAllFiles({ conversationId: "anuma-1on1" });
    expect(files.map((file) => file.id)).toEqual(["file_0"]);
    await cold.clearMessages("anuma-1on1");
    await cold.flush();
    expect((await fake.row("message", "msg_0"))!.record.isDeleted).toBe(true);
    expect((await fake.row("message", "msg_204"))!.record.isDeleted).toBe(true);
    expect(await backend(fake.store).getMessages("anuma-1on1")).toEqual([]);
  });

  it("retains the last cache when the manifest write fails and retries the changed entries", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const b = backend(fake.store, { cache });
    await chat(b, "conv_1", "Trip", "msg_1");
    await b.flush();
    await cached(storage, seal, cache.account, (c) => expect(ids(c)).toContain("msg_1"));
    const before = new Map(storage.values);
    const write = storage.set.bind(storage);
    const set = vi.fn<ChatCacheStorage["set"]>(async (key, sealed) => {
      if (key === cache.account && sealed !== null) throw new Error("disk full");
      await write(key, sealed);
    });
    storage.set = set;

    await b.createMessage({
      conversationId: "conv_1",
      role: "assistant",
      content: "Reply",
      uniqueId: "msg_2",
    });
    await b.flush();
    await b.poll();
    await vi.waitFor(() => expect(set).toHaveBeenCalledWith(cache.account, expect.any(String)), {
      timeout: 3000,
    });
    await vi.waitFor(() => expect(storage.values).toEqual(before));
    const cold = backend(offline, { cache });
    expect((await cold.getMessages("conv_1")).map((m) => m.uniqueId)).toEqual(["msg_1"]);
    cold.close();

    storage.set = write;
    await b.poll();
    await cached(storage, seal, cache.account, (c) => expect(ids(c)).toContain("msg_2"));
    await vi.waitFor(() => expect(storage.values.size).toBe(3));
  });

  it("reads a legacy cache and converts it to separate entries after a change", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const writer = backend(fake.store);
    await chat(writer, "conv_1", "Trip", "msg_1");
    await writer.flush();
    const snapshot: ChatCacheSnapshot = {
      account: cache.account,
      cursor: (await fake.store.account()).changesCursor!,
      records: [(await fake.row("conversation", "conv_1"))!, (await fake.row("message", "msg_1"))!],
      threads: ["conv_1"],
      absent: [],
    };
    await storage.set(
      cache.account,
      await seal.encrypt(JSON.stringify({ schema: 1, ...snapshot }))
    );
    const b = backend(fake.store, { cache });
    expect((await b.getMessages("conv_1")).map((m) => m.uniqueId)).toEqual(["msg_1"]);
    await b.updateConversationTitle("conv_1", "New title");
    await b.flush();
    await cached(storage, seal, cache.account, (c) =>
      expect(c.records.find((s) => s.record.id === "conv_1")?.record.data.title).toBe("New title")
    );
    const manifest = await seal.decrypt(storage.values.get(cache.account)!);
    expect(JSON.parse(manifest)).toMatchObject({ schema: 2 });
    expect(manifest).not.toContain("New title");
    expect(storage.values.size).toBe(3);
  });

  it("rejects the cache cursor if a referenced entry is absent", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const cache = { storage, seal, account: "0xaaa" };
    const b = backend(fake.store, { cache });
    await chat(b, "conv_1", "Trip", "msg_1");
    await b.flush();
    const saved = await cached(storage, seal, cache.account, (c) =>
      expect(ids(c)).toContain("msg_1")
    );
    b.close();
    const entry = saved.entries!.find(([key]) => key === "thread/conv_1")!;
    storage.values.delete(entry[1]);
    await expect(loadChatCache(storage, cache.account, seal.decrypt)).resolves.toBeUndefined();
    await expect(backend(offline, { cache }).getConversations()).rejects.toThrow("offline");
    expect(await backend(fake.store, { cache }).getMessages("conv_1")).toHaveLength(1);
  });

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
    const leaky: ChatCacheStorage = {
      get: () => Promise.resolve(entry),
      set: () => Promise.resolve(),
    };
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

  it("clears all entries after an active cache save completes", async () => {
    const fake = createFakeChatStore();
    const seal = await sealFor("56");
    const storage = cacheStorage();
    const encrypt = vi.fn(seal.encrypt);
    const cache = { storage, seal: { ...seal, encrypt }, account: "0xaaa" };
    const b = backend(fake.store, { cache });
    await chat(b, "conv_1", "Trip", "msg_1");
    await b.flush();
    await cached(storage, seal, cache.account, (c) => expect(ids(c)).toContain("msg_1"));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let entered = false;
    encrypt.mockImplementationOnce(async (plaintext) => {
      entered = true;
      await gate;
      return seal.encrypt(plaintext);
    });
    await b.createMessage({
      conversationId: "conv_1",
      role: "assistant",
      content: "Reply",
      uniqueId: "msg_2",
    });
    await b.flush();
    await vi.waitFor(() => expect(entered).toBe(true), { timeout: 3000 });
    const clearing = b.clearCache();
    release();
    await clearing;
    expect(storage.values.size).toBe(0);
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
      cache: { storage: { get: () => Promise.resolve(null), set }, seal, account: "0xaaa" },
    });
    await chat(b, "conv_1", "Trip", "msg_1");
    await b.flush();
    await vi.waitFor(() => expect(set).toHaveBeenCalled(), { timeout: 3000 });
    set.mockClear();
    await b.createMessage({
      conversationId: "conv_1",
      role: "user",
      content: "more",
      uniqueId: "msg_2",
    });
    await b.flush();
    await vi.waitFor(() => expect(set).toHaveBeenCalled(), { timeout: 3000 });
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
    await b.flush();
    await cached(storage, seal, cache.account, (c) =>
      expect(c.threads).toEqual(["conv_a", "conv_b"])
    );
    await chat(b, "conv_c", "C", "msg_c");
    await b.flush();
    const saved = await cached(storage, seal, "0xaaa", (c) =>
      expect(c.threads).toEqual(["conv_b", "conv_c"])
    );
    expect(ids(saved)).toEqual(expect.arrayContaining(["conv_a", "msg_b", "msg_c"]));
    expect(ids(saved)).not.toContain("msg_a");
    await vi.waitFor(() => expect(storage.values.size).toBe(4));
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
