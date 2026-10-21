import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import { createRemoteChatStore } from "./remote";
import { type ChatRecord, ChatStoreError, type RemoteChatStoreOptions } from "./types";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

interface WireSnapshot {
  record: Record<string, unknown> & { payload: string; kind: string; id: string };
  version: number;
  server_updated_at: string;
}

function conversation(id = "chat"): ChatRecord {
  return {
    kind: "conversation",
    id,
    conversationId: "",
    sortKey: 0,
    createdAt: 1,
    updatedAt: 1,
    isDeleted: false,
    data: { title: "private title", projectId: "work", pinnedAt: 42 },
  };
}

async function setup() {
  const ring = await deriveMemoryKeyRing("0x" + "12".repeat(65));
  const cipher = memoryCipher(ring);
  const rows = new Map<string, WireSnapshot>();
  const bodies: string[] = [];
  const urls: string[] = [];
  const account = { account_id: 8801, key_id: "" };
  const respond = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(input instanceof Request ? input.url : input);
    urls.push(url.href);
    if (new Headers(init.headers).get("Authorization") !== "Bearer token")
      return Response.json({}, { status: 401 });
    if (url.pathname.endsWith("/account")) return Response.json(account);
    if (init.method === "POST") {
      if (typeof init.body !== "string") throw new Error("Expected a JSON request body");
      bodies.push(init.body);
      const body = JSON.parse(init.body) as {
        account_id: number;
        key_id: string;
        writes: { record: WireSnapshot["record"]; expected_version: number }[];
      };
      if (body.account_id !== account.account_id)
        return Response.json({ code: "account_changed" }, { status: 409 });
      if (account.key_id && account.key_id !== body.key_id)
        return Response.json({ code: "key_mismatch" }, { status: 409 });
      if (
        body.writes.some(
          (w) => (rows.get(w.record.kind + "/" + w.record.id)?.version ?? 0) !== w.expected_version
        )
      )
        return Response.json({ code: "version_conflict" }, { status: 409 });
      account.key_id = body.key_id;
      const items = body.writes.map((w) => ({
        record: w.record,
        version: w.expected_version + 1,
        server_updated_at: "2026-10-21T00:00:00Z",
      }));
      items.forEach((item) =>
        rows.set(item.record.kind + "/" + item.record.id, structuredClone(item))
      );
      return Response.json({ items });
    }
    if (url.searchParams.get("account_id") !== String(account.account_id))
      return Response.json({ code: "account_changed" }, { status: 409 });
    if (url.pathname.endsWith("/records"))
      return Response.json({
        items: [...rows.values()].filter((r) => r.record.kind === url.searchParams.get("kind")),
      });
    const [kind, id] = url.pathname.split("/").slice(-2).map(decodeURIComponent);
    const row = rows.get(kind + "/" + id);
    return row ? Response.json(row) : Response.json({}, { status: 404 });
  };
  const fetch = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) =>
    Promise.resolve(respond(input, init))
  );
  const options: RemoteChatStoreOptions = {
    baseUrl: "https://nearby.test",
    getToken: () => Promise.resolve("token"),
    keyId: ring.keyId,
    ...cipher,
    fetch,
  };
  return {
    store: await createRemoteChatStore(options),
    options,
    rows,
    bodies,
    urls,
    fetch,
    cipher,
    account,
  };
}

describe("encrypted remote ChatStore", () => {
  it("encrypts the complete record and a fresh store reads it without a local database", async () => {
    const s = await setup();
    const message: ChatRecord = {
      kind: "message",
      id: "message-1",
      conversationId: "chat",
      sortKey: 3,
      createdAt: 2,
      updatedAt: 3,
      isDeleted: false,
      data: {
        content: "secret message",
        thinking: "private reasoning",
        files: [{ name: "private.pdf", url: "https://private.test/file" }],
        parentMessageId: "branch",
        toolCallEvents: [{ arguments: "calendar input", output: "private calendar event" }],
        chunks: [{ vector: [0.1, 0.2] }],
        usage: { tokens: 42 },
      },
    };
    await s.store.putMany([
      { record: conversation(), expectedVersion: 0 },
      { record: message, expectedVersion: 0 },
    ]);
    const sent = s.bodies[0];
    for (const secret of [
      "private title",
      "secret message",
      "private reasoning",
      "private.pdf",
      "calendar input",
      "private calendar event",
      "branch",
    ])
      expect(sent).not.toContain(secret);
    expect(sent).not.toContain('"vector"');
    const fresh = await createRemoteChatStore(s.options);
    expect((await fresh.get("message", "message-1"))?.record).toEqual(message);
    expect((await fresh.list({ kind: "conversation" })).items[0].record).toEqual(conversation());
    expect(await fresh.get("conversation", "absent")).toBeNull();
    expect(s.urls.every((url) => url.startsWith("https://nearby.test/api/private-chats/"))).toBe(
      true
    );
  });

  it("rejects a stale batch atomically and never retries the write", async () => {
    const s = await setup();
    await s.store.putMany([{ record: conversation(), expectedVersion: 0 }]);
    await expect(
      s.store.putMany([
        { record: conversation("new"), expectedVersion: 0 },
        { record: conversation(), expectedVersion: 0 },
      ])
    ).rejects.toMatchObject({ status: 409, code: "version_conflict" });
    expect(s.bodies).toHaveLength(2);
    expect(await s.store.get("conversation", "new")).toBeNull();
  });

  it("binds ciphertext to routing, order, deletion metadata and canonical key", async () => {
    const s = await setup();
    await s.store.putMany([{ record: conversation(), expectedVersion: 0 }]);
    const original = structuredClone(s.rows.get("conversation/chat")!);
    for (const [field, value] of [
      ["id", "other"],
      ["created_at", 2],
      ["is_deleted", true],
      ["sort_key", 1],
    ] as const) {
      const altered = structuredClone(original);
      Object.assign(altered.record, { [field]: value });
      s.rows.set("conversation/chat", altered);
      await expect(s.store.get("conversation", "chat")).rejects.toBeInstanceOf(ChatStoreError);
    }
    s.rows.set("conversation/chat", original);
    const wrong = memoryCipher(await deriveMemoryKeyRing("0x" + "34".repeat(65)));
    const wrongCipher = await createRemoteChatStore({ ...s.options, decrypt: wrong.decrypt });
    await expect(wrongCipher.get("conversation", "chat")).rejects.toThrow();
    s.account.key_id = "different";
    await expect(createRemoteChatStore(s.options)).rejects.toMatchObject({ code: "key_mismatch" });
  });

  it("fails closed when encryption fails or returns plaintext", async () => {
    const s = await setup();
    const store = await createRemoteChatStore({
      ...s.options,
      encrypt: () => Promise.resolve("plaintext"),
    });
    await expect(store.putMany([{ record: conversation(), expectedVersion: 0 }])).rejects.toThrow();
    const failing = await createRemoteChatStore({
      ...s.options,
      encrypt: () => Promise.reject(new Error("locked")),
    });
    await expect(failing.putMany([{ record: conversation(), expectedVersion: 0 }])).rejects.toThrow(
      "locked"
    );
    expect(s.bodies).toHaveLength(0);
  });

  it("rejects malformed JSON data and out-of-bounds writes before sending", async () => {
    const s = await setup();
    for (const id of [".", "..", "a/b", "a\\b"]) {
      await expect(
        s.store.putMany([{ record: conversation(id), expectedVersion: 0 }])
      ).rejects.toThrow();
    }
    for (const data of [{ invalid: NaN }, { invalid: undefined }, { invalid: new Date() }]) {
      const record = { ...conversation(), data } as unknown as ChatRecord;
      await expect(s.store.putMany([{ record, expectedVersion: 0 }])).rejects.toThrow();
    }
    await expect(
      s.store.putMany([{ record: conversation(), expectedVersion: -1 }])
    ).rejects.toThrow();
    await expect(
      s.store.putMany(
        Array.from({ length: 26 }, (_, i) => ({
          record: conversation(String(i)),
          expectedVersion: 0,
        }))
      )
    ).rejects.toThrow();
    await expect(s.store.list({ kind: "message" })).rejects.toThrow();
    await expect(s.store.list({ kind: "conversation", limit: 51 })).rejects.toThrow();
    expect(s.bodies).toHaveLength(0);
  });

  it("does not send a write canceled during encryption", async () => {
    const s = await setup();
    const controller = new AbortController();
    const store = await createRemoteChatStore({
      ...s.options,
      encrypt: async (text) => {
        controller.abort();
        return s.cipher.encrypt(text);
      },
    });
    await expect(
      store.putMany([{ record: conversation(), expectedVersion: 0 }], controller.signal)
    ).rejects.toThrow();
    expect(s.bodies).toHaveLength(0);
  });

  it("does not replay a write with an unknown network outcome", async () => {
    const s = await setup();
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") throw new Error("connection lost after commit");
      return s.fetch(input, init);
    });
    const store = await createRemoteChatStore({ ...s.options, fetch });
    await expect(store.putMany([{ record: conversation(), expectedVersion: 0 }])).rejects.toThrow(
      "connection lost"
    );
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("rejects an account change even before the other account has stored any chats", async () => {
    const s = await setup();
    s.account.account_id = 8802;
    await expect(
      s.store.putMany([{ record: conversation(), expectedVersion: 0 }])
    ).rejects.toMatchObject({ code: "account_changed" });
    await expect(s.store.list({ kind: "conversation" })).rejects.toMatchObject({
      code: "account_changed",
    });
    expect(s.rows.size).toBe(0);
  });

  it("captures records and versions together before encryption can yield", async () => {
    const s = await setup();
    const writes = [
      { record: conversation("first"), expectedVersion: 0 },
      { record: conversation("second"), expectedVersion: 0 },
    ];
    const store = await createRemoteChatStore({
      ...s.options,
      encrypt: async (text) => {
        writes[0].expectedVersion = 99;
        writes[1].record.data.title = "changed while encrypting";
        return s.cipher.encrypt(text);
      },
    });
    const snapshots = await store.putMany(writes);
    expect(snapshots.map((s) => s.version)).toEqual([1, 1]);
    expect(snapshots[1].record.data.title).toBe("private title");
  });

  it("does not turn a failed key lookup or corrupt page into an absent history", async () => {
    const s = await setup();
    await s.store.putMany([{ record: conversation(), expectedVersion: 0 }]);
    const locked = await createRemoteChatStore({
      ...s.options,
      decrypt: () => Promise.reject(new ChatStoreError("key absent", 404)),
    });
    await expect(locked.get("conversation", "chat")).rejects.toMatchObject({
      message: "key absent",
    });
    s.rows.get("conversation/chat")!.record.payload = "enc:v3:" + "ff".repeat(28);
    await expect(s.store.list({ kind: "conversation" })).rejects.toThrow();
  });
});
