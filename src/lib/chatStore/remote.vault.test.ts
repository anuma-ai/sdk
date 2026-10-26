import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import { createRemoteChatStore } from "./remote";
import { type ChatRecord, ChatStoreError } from "./types";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

interface Wire {
  record: {
    kind: string;
    id: string;
    conversation_id: string;
    sort_key: number;
    created_at: number;
    updated_at: number;
    is_deleted: boolean;
    payload: string;
  };
  version: number;
  server_updated_at: string;
}

interface Call {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

const attachmentId = "0123456789abcdef0123456789abcdef";

function record(
  kind: ChatRecord["kind"],
  id: string,
  conversationId = "",
  sortKey = 0
): ChatRecord {
  return {
    kind,
    id,
    conversationId,
    sortKey,
    createdAt: 1,
    updatedAt: 1,
    isDeleted: false,
    data: { text: `secret ${id}` },
  };
}

function unit(hot: number, dims = 1536): number[] {
  const v = new Array<number>(dims).fill(0);
  v[hot] = 1;
  return v;
}

async function setup(override?: (call: Call) => Response | undefined) {
  const ring = await deriveMemoryKeyRing("0x" + "34".repeat(65));
  const cipher = memoryCipher(ring);
  const rows = new Map<string, Wire>();
  const calls: Call[] = [];
  let clock = 0;
  const account = {
    account_id: 8801,
    key_id: "",
    state: "none",
    record_count: 0,
    storage_bytes: 0,
    vector_count: 0,
  };
  const stamp = () => new Date(Date.UTC(2026, 9, 26, 0, 0, clock++)).toISOString();
  const store = (r: Wire["record"], version: number) => {
    const snapshot = { record: r, version, server_updated_at: stamp() };
    rows.set(`${r.kind}/${r.id}`, snapshot);
    return snapshot;
  };
  const respond = (input: RequestInfo | URL, init: RequestInit = {}): Response => {
    const url = new URL(input instanceof Request ? input.url : input);
    const path = url.pathname.replace("/api/private-chats", "");
    const method = init.method ?? "GET";
    const body =
      typeof init.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    const call = { method, path: path + url.search, body };
    calls.push(call);
    const overridden = override?.(call);
    if (overridden) return overridden;
    if (path === "/account" && method === "GET") return Response.json(account);
    if (path === "/account" && method === "PUT") {
      const transitioned = account.state === "migrating";
      account.state = "active";
      return Response.json({ state: "active", transitioned });
    }
    if (path === "/records/batch") {
      const writes = body?.writes as { record: Wire["record"]; expected_version: number }[];
      account.key_id = body?.key_id as string;
      return Response.json({
        items: writes.map((w) => {
          const current = rows.get(`${w.record.kind}/${w.record.id}`);
          if (w.record.is_deleted && current?.record.is_deleted) return current;
          return store(w.record, w.expected_version + 1);
        }),
      });
    }
    if (path === "/records/get") {
      const refs = body?.refs as { kind: string; id: string }[];
      const found = refs.flatMap((r) => rows.get(`${r.kind}/${r.id}`) ?? []);
      return Response.json({
        items: found.slice(0, 2),
        ...(found.length > 2
          ? { remaining: found.slice(2).map((s) => ({ kind: s.record.kind, id: s.record.id })) }
          : {}),
      });
    }
    if (path === "/records" && method === "GET") {
      const items = [...rows.values()].filter(
        (s) =>
          s.record.kind === url.searchParams.get("kind") &&
          s.record.conversation_id === url.searchParams.get("conversation_id") &&
          !s.record.is_deleted
      );
      return Response.json({
        items,
        ...(url.searchParams.get("kind") === "message" ? { total: items.length } : {}),
      });
    }
    if (path.startsWith("/records/") && method === "GET") {
      const [kind, id] = path.split("/").slice(-2).map(decodeURIComponent);
      const row = rows.get(`${kind}/${id}`);
      return row ? Response.json(row) : Response.json({}, { status: 404 });
    }
    if (path === "/records" && method === "DELETE") {
      let deleted = 0;
      for (const s of [...rows.values()]) {
        if (s.record.is_deleted) continue;
        deleted++;
        store({ ...s.record, is_deleted: true, payload: "" }, s.version + 1);
      }
      return Response.json({ deleted });
    }
    if (path === "/import") {
      account.key_id = body?.key_id as string;
      if (account.state === "none") account.state = "migrating";
      const records = body?.records as { record: Wire["record"] }[];
      records.forEach((r) => store(r.record, 1));
      return Response.json({ written: records.length });
    }
    if (path === "/verify") {
      const revisions = body?.revisions as { kind: string; id: string }[];
      return Response.json({ missing: revisions.filter((r) => !rows.has(`${r.kind}/${r.id}`)) });
    }
    if (path === "/changes") {
      const all = [...rows.values()].sort((a, b) =>
        a.server_updated_at.localeCompare(b.server_updated_at)
      );
      const after = url.searchParams.get("cursor");
      const items = after ? all.filter((s) => s.server_updated_at > after) : all;
      return Response.json({
        items,
        ...(items.length ? { changes_cursor: items[items.length - 1].server_updated_at } : {}),
      });
    }
    if (path === "/search") {
      const items = [...rows.values()]
        .filter((s) => s.record.kind !== "conversation" && !s.record.is_deleted)
        .map((s, i) => ({ ...s, chunk: 0, score: 1 - i / 10 }));
      return Response.json({ items });
    }
    const attachment = {
      attachment_id: attachmentId,
      size_bytes: 10,
      state: "pending",
      created_at: "2026-10-26T00:00:00Z",
    };
    if (path === "/attachments" && method === "POST")
      return Response.json(
        {
          attachment,
          upload: {
            url: "https://r2.test/put",
            method: "PUT",
            headers: { "Content-Length": "10" },
            expires_at: "2026-10-26T00:15:00Z",
          },
        },
        { status: 201 }
      );
    if (path === `/attachments/${attachmentId}/commit`)
      return Response.json({
        attachment: {
          ...attachment,
          state: "committed",
          owner_kind: body?.owner_kind,
          owner_id: body?.owner_id,
          committed_at: "2026-10-26T00:01:00Z",
        },
      });
    if (path === `/attachments/${attachmentId}` && method === "DELETE")
      return new Response(null, { status: 204 });
    if (path === `/attachments/${attachmentId}` && method === "GET")
      return Response.json({
        attachment: {
          ...attachment,
          state: "committed",
          owner_kind: "message",
          owner_id: "m",
          committed_at: "2026-10-26T00:01:00Z",
        },
        download: {
          url: "https://r2.test/get",
          method: "GET",
          headers: {},
          expires_at: "2026-10-26T00:05:00Z",
        },
      });
    if (path.startsWith("/attachments/") && method === "GET")
      return Response.json({}, { status: 404 });
    return Response.json({}, { status: 500 });
  };
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(respond(input, init))
  );
  const options = {
    baseUrl: "https://vault.test",
    getToken: () => Promise.resolve("token"),
    keyId: ring.keyId,
    ...cipher,
    fetch,
  };
  return { store: await createRemoteChatStore(options), rows, calls, account, options };
}

describe("remote ChatStore against vault's server-only contract", () => {
  it("writes tombstones without content and reads them back as metadata only", async () => {
    const s = await setup();
    await s.store.putMany([
      { record: record("conversation", "c"), expectedVersion: 0 },
      { record: record("message", "m", "c", 1), expectedVersion: 0 },
    ]);
    const tomb = { ...record("message", "m", "c", 1), isDeleted: true, updatedAt: 2 };
    const [deleted] = await s.store.putMany([{ record: tomb, expectedVersion: 1 }]);
    expect(s.rows.get("message/m")?.record.payload).toBe("");
    expect(deleted.record).toEqual({ ...tomb, data: {} });
    expect(deleted.version).toBe(2);

    const [again] = await s.store.putMany([{ record: tomb, expectedVersion: 2 }]);
    expect(again.version).toBe(2);
    expect((await s.store.get("message", "m"))?.record.data).toEqual({});
  });

  it("lets a conversation carry and move a sort key", async () => {
    const s = await setup();
    const [created] = await s.store.putMany([
      { record: record("conversation", "c", "", 500), expectedVersion: 0 },
    ]);
    expect(created.record.sortKey).toBe(500);
    const [moved] = await s.store.putMany([
      { record: { ...record("conversation", "c", "", 900), updatedAt: 2 }, expectedVersion: 1 },
    ]);
    expect(moved.record.sortKey).toBe(900);
  });

  it("pages messages up to 200 with a total and keeps 50 for other kinds", async () => {
    const s = await setup();
    await s.store.putMany([
      { record: record("conversation", "c"), expectedVersion: 0 },
      { record: record("message", "m", "c", 1), expectedVersion: 0 },
    ]);
    const page = await s.store.list({ kind: "message", conversationId: "c", limit: 200 });
    expect(page.total).toBe(1);
    await expect(
      s.store.list({ kind: "message", conversationId: "c", limit: 201 })
    ).rejects.toThrow(ChatStoreError);
    await expect(s.store.list({ kind: "conversation", limit: 51 })).rejects.toThrow(ChatStoreError);
  });

  it("reads many records in request order, following remaining and skipping missing", async () => {
    const s = await setup();
    await s.store.putMany(
      ["a", "b", "c", "d"].map((id) => ({ record: record("conversation", id), expectedVersion: 0 }))
    );
    const got = await s.store.getMany([
      { kind: "conversation", id: "d" },
      { kind: "conversation", id: "missing" },
      { kind: "conversation", id: "b" },
      { kind: "conversation", id: "a" },
      { kind: "conversation", id: "c" },
      { kind: "conversation", id: "b" },
    ]);
    expect(got.map((g) => g.record.id)).toEqual(["d", "b", "a", "c"]);
    expect(got[0].record.data).toEqual({ text: "secret d" });
    expect(s.calls.filter((c) => c.path === "/records/get")).toHaveLength(2);

    const many = Array.from({ length: 120 }, (_, i) => ({ kind: "message" as const, id: `x${i}` }));
    expect(await s.store.getMany(many)).toEqual([]);
    expect(
      s.calls
        .filter((c) => c.path === "/records/get")
        .map((c) => (c.body?.refs as unknown[]).length)
    ).toEqual([5, 2, 50, 50, 20]);
  });

  it("rejects a batch read that returns a record it did not ask for", async () => {
    const s = await setup();
    await s.store.putMany([{ record: record("conversation", "a"), expectedVersion: 0 }]);
    const snapshot = s.rows.get("conversation/a");
    const bad = await setup((call) =>
      call.path === "/records/get" ? Response.json({ items: [snapshot] }) : undefined
    );
    await expect(bad.store.getMany([{ kind: "conversation", id: "other" }])).rejects.toThrow(
      ChatStoreError
    );
  });

  it("imports with embeddings, verifies and activates", async () => {
    const s = await setup();
    const written = await s.store.importRecords([
      { record: record("conversation", "c") },
      {
        record: record("message", "m", "c", 1),
        embeddings: [unit(1), unit(2, 4096)],
        embeddingModel: "e",
      },
      { record: { ...record("message", "gone", "c", 2), isDeleted: true } },
    ]);
    expect(written).toBe(3);
    const sent = s.calls.find((c) => c.path === "/import")?.body as {
      records: { record: Wire["record"]; embeddings?: number[][]; embedding_model?: string }[];
    };
    expect(sent.records[1].embeddings).toHaveLength(2);
    expect(sent.records[1].embedding_model).toBe("e");
    expect(sent.records[2].record.payload).toBe("");
    expect(sent.records[0].embeddings).toBeUndefined();
    expect((await s.store.account()).state).toBe("migrating");

    const missing = await s.store.verify([
      { kind: "message", id: "m", updatedAt: 1, isDeleted: false },
      { kind: "message", id: "absent", updatedAt: 1, isDeleted: false },
    ]);
    expect(missing).toEqual([{ kind: "message", id: "absent" }]);
    expect(await s.store.activate()).toBe(true);
    expect(await s.store.activate()).toBe(false);
  });

  it("refuses embeddings vault would reject before sending", async () => {
    const s = await setup();
    const bad = [
      { record: record("message", "m", "c", 1), embeddings: [unit(1, 100)] },
      { record: record("message", "m", "c", 1), embeddings: [new Array<number>(1536).fill(0)] },
      {
        record: record("message", "m", "c", 1),
        embeddings: Array.from({ length: 17 }, () => unit(1)),
      },
      { record: record("conversation", "c"), embeddings: [unit(1)] },
      { record: { ...record("message", "m", "c", 1), isDeleted: true }, embeddings: [unit(1)] },
    ];
    for (const item of bad)
      await expect(s.store.importRecords([item])).rejects.toThrow(ChatStoreError);
    const tooMany = Array.from({ length: 13 }, (_, i) => ({
      record: record("message", `m${i}`, "c", i),
      embeddings: Array.from({ length: 16 }, () => unit(1)),
    }));
    await expect(s.store.importRecords(tooMany)).rejects.toThrow(ChatStoreError);
    expect(s.calls.filter((c) => c.path === "/import")).toHaveLength(0);
  });

  it("reads changes, including tombstones, and resumes from the cursor", async () => {
    const s = await setup();
    await s.store.putMany([
      { record: record("conversation", "c"), expectedVersion: 0 },
      { record: record("message", "m", "c", 1), expectedVersion: 0 },
    ]);
    const first = await s.store.changes();
    expect(first.items.map((i) => i.record.id)).toEqual(["c", "m"]);
    await s.store.putMany([
      {
        record: { ...record("message", "m", "c", 1), isDeleted: true, updatedAt: 2 },
        expectedVersion: 1,
      },
    ]);
    const next = await s.store.changes(first.changesCursor);
    expect(next.items).toHaveLength(1);
    expect(next.items[0].record).toMatchObject({ id: "m", isDeleted: true, data: {} });
    const none = await s.store.changes(next.changesCursor);
    expect(none.items).toEqual([]);
    expect(none.changesCursor).toBe(next.changesCursor);
  });

  it("searches and decrypts hits", async () => {
    const s = await setup();
    await s.store.putMany([
      { record: record("conversation", "c"), expectedVersion: 0 },
      { record: record("message", "m", "c", 1), expectedVersion: 0, embeddings: [unit(3)] },
    ]);
    const hits = await s.store.search(unit(3), {
      limit: 5,
      kinds: ["message"],
      conversationId: "c",
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      chunk: 0,
      score: 1,
      record: { id: "m", data: { text: "secret m" } },
    });
    const body = s.calls.find((c) => c.path === "/search")?.body;
    expect(body).toMatchObject({ limit: 5, kinds: ["message"], conversation_id: "c" });
    await expect(s.store.search(unit(3, 100))).rejects.toThrow(ChatStoreError);
    await expect(s.store.search(unit(3), { limit: 51 })).rejects.toThrow(ChatStoreError);
  });

  it("refuses a search hit from another conversation", async () => {
    const s = await setup();
    await s.store.putMany([
      { record: record("conversation", "c"), expectedVersion: 0 },
      { record: record("message", "m", "c", 1), expectedVersion: 0 },
    ]);
    await expect(s.store.search(unit(3), { conversationId: "other" })).rejects.toThrow(
      ChatStoreError
    );
  });

  it("deletes all chats", async () => {
    const s = await setup();
    await s.store.putMany([
      { record: record("conversation", "c"), expectedVersion: 0 },
      { record: record("message", "m", "c", 1), expectedVersion: 0 },
    ]);
    expect(await s.store.deleteAll()).toBe(2);
    expect(s.calls.at(-1)).toMatchObject({ method: "DELETE", path: "/records?account_id=8801" });
    expect((await s.store.get("conversation", "c"))?.record.isDeleted).toBe(true);
  });

  it("creates, commits, reads and deletes an attachment", async () => {
    const s = await setup();
    const { attachment, upload } = await s.store.attachments.create(10);
    expect(attachment).toMatchObject({ id: attachmentId, sizeBytes: 10, state: "pending" });
    expect(upload).toMatchObject({ url: "https://r2.test/put", method: "PUT" });
    const committed = await s.store.attachments.commit(attachmentId, { kind: "message", id: "m" });
    expect(committed).toMatchObject({ state: "committed", ownerKind: "message", ownerId: "m" });
    expect(await s.store.attachments.get(attachmentId)).toEqual({
      attachment: {
        id: attachmentId,
        sizeBytes: 10,
        state: "committed",
        ownerKind: "message",
        ownerId: "m",
        createdAt: "2026-10-26T00:00:00Z",
        committedAt: "2026-10-26T00:01:00Z",
      },
      download: {
        url: "https://r2.test/get",
        method: "GET",
        headers: {},
        expiresAt: "2026-10-26T00:05:00Z",
      },
    });
    expect(await s.store.attachments.get("f".repeat(32))).toBeNull();
    await s.store.attachments.delete(attachmentId);
    expect(s.calls.at(-1)).toMatchObject({
      method: "DELETE",
      path: `/attachments/${attachmentId}?account_id=8801`,
    });
    await expect(s.store.attachments.create(50 * 1024 * 1024 + 1)).rejects.toThrow(ChatStoreError);
    await expect(s.store.attachments.get("not-an-id")).rejects.toThrow(ChatStoreError);
  });

  it("refuses a presigned URL that is not HTTPS", async () => {
    const s = await setup((call) =>
      call.path === "/attachments"
        ? Response.json({
            attachment: {
              attachment_id: attachmentId,
              size_bytes: 10,
              state: "pending",
              created_at: "2026-10-26T00:00:00Z",
            },
            upload: {
              url: "http://r2.test/put",
              method: "PUT",
              headers: {},
              expires_at: "2026-10-26T00:15:00Z",
            },
          })
        : undefined
    );
    await expect(s.store.attachments.create(10)).rejects.toThrow(ChatStoreError);
  });

  it("refuses delete results that belong to another write", async () => {
    let swap = false;
    const s = await setup((call) => {
      if (!swap || call.path !== "/records/batch") return undefined;
      const writes = call.body?.writes as { record: Wire["record"]; expected_version: number }[];
      return Response.json({
        items: writes
          .map((w) => ({
            record: w.record,
            version: w.expected_version + 1,
            server_updated_at: "2026-10-26T00:00:00Z",
          }))
          .reverse(),
      });
    });
    await s.store.putMany([
      { record: record("conversation", "c"), expectedVersion: 0 },
      { record: record("message", "a", "c", 1), expectedVersion: 0 },
      { record: record("message", "b", "c", 2), expectedVersion: 0 },
    ]);
    swap = true;
    await expect(
      s.store.putMany(
        (["a", "b"] as const).map((id, i) => ({
          record: { ...record("message", id, "c", i + 1), isDeleted: true, updatedAt: 2 },
          expectedVersion: 1,
        }))
      )
    ).rejects.toThrow(ChatStoreError);
  });

  it("refuses a search hit of a kind it did not ask for", async () => {
    const s = await setup();
    await s.store.putMany([
      { record: record("conversation", "c"), expectedVersion: 0 },
      { record: record("summary", "s", "c", 1), expectedVersion: 0, embeddings: [unit(3)] },
    ]);
    expect((await s.store.search(unit(3), { kinds: ["summary"] })).map((h) => h.record.id)).toEqual(
      ["s"]
    );
    await expect(s.store.search(unit(3), { kinds: ["message"] })).rejects.toThrow(ChatStoreError);
  });

  it("refuses sparse vectors and sparse vector lists", async () => {
    const s = await setup();
    const holey = new Array<number>(1536);
    holey[0] = 1;
    for (const embeddings of [[holey], new Array<number[]>(1)])
      await expect(
        s.store.importRecords([{ record: record("message", "m", "c", 1), embeddings }])
      ).rejects.toThrow(ChatStoreError);
    await expect(s.store.search(holey)).rejects.toThrow(ChatStoreError);
    expect(s.calls.filter((c) => c.path === "/import" || c.path === "/search")).toHaveLength(0);
  });
});
