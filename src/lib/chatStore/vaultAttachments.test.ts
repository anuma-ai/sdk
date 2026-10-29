import { webcrypto } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { StoredMessage } from "../db/chat/types";
import { deriveMemoryKeyRing, memoryCipher } from "../memory/store/memoryKeys";
import { messageRecord } from "./chatImports";
import { createRemoteChatStore } from "./remote";
import { type ChatRecord, type ChatStore, ChatStoreError } from "./types";
import {
  createVaultAttachments,
  type LocalMessageAttachment,
  maxVaultAttachmentBytes,
  migrateMessageAttachments,
  type VaultAttachmentCache,
  type VaultAttachmentJournal,
  vaultAttachmentRefs,
} from "./vaultAttachments";
import { toMessage } from "./vaultRecords";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});
afterAll(() => vi.unstubAllGlobals());

const accountId = 8801;
const signature = "0x" + "34".repeat(65);
const uploadTtlMs = 15 * 60_000;

interface WireRecord {
  kind: string;
  id: string;
  conversation_id: string;
  sort_key: number;
  created_at: number;
  updated_at: number;
  is_deleted: boolean;
  payload: string;
}

interface Row {
  id: string;
  size: number;
  state: "pending" | "committed";
  ownerKind?: string;
  ownerId?: string;
}

interface Request {
  host: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Uint8Array<ArrayBuffer> | null;
}

type Fault = (request: Request) => Response | Promise<Response> | undefined;

function problem(status: number, code: string): Response {
  return Response.json({ detail: code, code }, { status });
}

function bytes(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

function contains(haystack: Uint8Array, needle: Uint8Array): boolean {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

function createVault() {
  let clock = Date.UTC(2026, 9, 29);
  let seq = 0;
  const records = new Map<string, { record: WireRecord; version: number }>();
  const attachments = new Map<string, Row>();
  const blobs = new Map<string, Uint8Array<ArrayBuffer>>();
  const requests: Request[] = [];
  const faults: Fault[] = [];
  let keyId = "";

  const presign = (id: string, method: string) => ({
    url: `https://r2.test/chat/${accountId}/${id}?expires=${clock + uploadTtlMs}`,
    method,
    headers:
      method === "PUT"
        ? {
            "Content-Length": String(attachments.get(id)!.size),
            "Content-Type": "application/octet-stream",
          }
        : {},
    expires_at: new Date(clock + uploadTtlMs).toISOString(),
  });

  const wire = (row: Row) => ({
    attachment_id: row.id,
    size_bytes: row.size,
    state: row.state,
    ...(row.ownerKind ? { owner_kind: row.ownerKind, owner_id: row.ownerId } : {}),
    created_at: new Date(clock).toISOString(),
    ...(row.state === "committed" ? { committed_at: new Date(clock).toISOString() } : {}),
  });

  const snapshot = (entry: { record: WireRecord; version: number }) => ({
    ...entry,
    server_updated_at: new Date(clock).toISOString(),
  });

  const r2 = (request: Request, url: URL): Response => {
    const id = url.pathname.split("/").pop()!;
    if (clock > Number(url.searchParams.get("expires")))
      return new Response("<Code>AccessDenied</Code><Message>Request has expired</Message>", {
        status: 403,
      });
    if (request.method === "PUT") {
      const row = attachments.get(id);
      if (
        !row ||
        request.headers["content-type"] !== "application/octet-stream" ||
        request.body?.length !== row.size
      )
        return new Response("<Code>SignatureDoesNotMatch</Code>", { status: 403 });
      blobs.set(id, request.body);
      return new Response(null, { status: 200 });
    }
    const blob = blobs.get(id);
    return blob
      ? new Response(blob.slice())
      : new Response("<Code>NoSuchKey</Code>", { status: 404 });
  };

  const api = (request: Request, url: URL): Response => {
    const path = url.pathname.replace("/api/private-chats", "");
    const body =
      request.body && request.body.length > 0
        ? (JSON.parse(new TextDecoder().decode(request.body)) as Record<string, unknown>)
        : {};
    if (path === "/account")
      return Response.json({
        account_id: accountId,
        key_id: keyId,
        state: "active",
        record_count: records.size,
        storage_bytes: 0,
        vector_count: 0,
      });
    const recordPath = /^\/records\/(\w+)\/([^/]+)$/.exec(path);
    if (recordPath && request.method === "GET") {
      const entry = records.get(`${recordPath[1]}/${decodeURIComponent(recordPath[2])}`);
      return entry ? Response.json(snapshot(entry)) : problem(404, "not_found");
    }
    if (path === "/records/batch") {
      keyId = body.key_id as string;
      const writes = body.writes as { record: WireRecord; expected_version: number }[];
      for (const w of writes) {
        const current = records.get(`${w.record.kind}/${w.record.id}`);
        if ((current?.version ?? 0) !== w.expected_version) return problem(409, "version_conflict");
      }
      return Response.json({
        items: writes.map((w) => {
          const entry = { record: w.record, version: w.expected_version + 1 };
          records.set(`${w.record.kind}/${w.record.id}`, entry);
          if (w.record.is_deleted)
            for (const row of attachments.values())
              if (row.ownerKind === w.record.kind && row.ownerId === w.record.id) {
                attachments.delete(row.id);
                blobs.delete(row.id);
              }
          return snapshot(entry);
        }),
      });
    }
    if (path === "/attachments" && request.method === "POST") {
      const id = (++seq).toString(16).padStart(32, "0");
      attachments.set(id, { id, size: body.size_bytes as number, state: "pending" });
      return Response.json(
        { attachment: wire(attachments.get(id)!), upload: presign(id, "PUT") },
        { status: 201 }
      );
    }
    const commitPath = /^\/attachments\/([0-9a-f]{32})\/commit$/.exec(path);
    if (commitPath) {
      const row = attachments.get(commitPath[1]);
      if (!row) return problem(404, "not_found");
      if (row.state === "committed")
        return row.ownerKind === body.owner_kind && row.ownerId === body.owner_id
          ? Response.json({ attachment: wire(row) })
          : problem(409, "attachment_conflict");
      if (blobs.get(row.id)?.length !== row.size) return problem(409, "attachment_not_uploaded");
      const owner = records.get(`${body.owner_kind as string}/${body.owner_id as string}`);
      if (!owner || owner.record.is_deleted) return problem(409, "attachment_owner_not_found");
      Object.assign(row, {
        state: "committed",
        ownerKind: body.owner_kind,
        ownerId: body.owner_id,
      });
      return Response.json({ attachment: wire(row) });
    }
    const attachmentPath = /^\/attachments\/([0-9a-f]{32})$/.exec(path);
    if (attachmentPath) {
      const row = attachments.get(attachmentPath[1]);
      if (!row) return problem(404, "not_found");
      if (request.method === "DELETE") {
        attachments.delete(row.id);
        blobs.delete(row.id);
        return new Response(null, { status: 204 });
      }
      return Response.json({
        attachment: wire(row),
        ...(row.state === "committed" ? { download: presign(row.id, "GET") } : {}),
      });
    }
    return problem(404, "not_found");
  };

  const fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input);
    const raw = init.body;
    const request: Request = {
      host: url.host,
      method: init.method ?? "GET",
      path: url.pathname + url.search,
      headers: Object.fromEntries(
        Object.entries((init.headers as Record<string, string>) ?? {}).map(([k, v]) => [
          k.toLowerCase(),
          v,
        ])
      ),
      body: typeof raw === "string" ? bytes(raw) : raw instanceof Uint8Array ? raw.slice() : null,
    };
    requests.push(request);
    for (let i = 0; i < faults.length; i++) {
      const fault = faults[i];
      let response: Response | undefined;
      try {
        response = await fault(request);
      } catch (error) {
        faults.splice(i, 1);
        throw error;
      }
      if (response) {
        faults.splice(i, 1);
        return response;
      }
    }
    return url.host === "r2.test" ? r2(request, url) : api(request, url);
  };

  return {
    fetch: fetch as typeof globalThis.fetch,
    records,
    attachments,
    blobs,
    requests,
    faults,
    now: () => clock,
    advance: (ms: number) => {
      clock += ms;
    },
    puts: () => requests.filter((r) => r.host === "r2.test" && r.method === "PUT"),
    reservations: () =>
      requests.filter((r) => r.method === "POST" && r.path === "/api/private-chats/attachments"),
  };
}

type Vault = ReturnType<typeof createVault>;

async function device(
  vault: Vault,
  options: { signature?: string; cache?: VaultAttachmentCache; retries?: number } = {}
) {
  const keyRing = await deriveMemoryKeyRing(options.signature ?? signature);
  const store = await createRemoteChatStore({
    baseUrl: "https://vault.test",
    getToken: () => Promise.resolve("token"),
    keyId: keyRing.keyId,
    fetch: vault.fetch,
    ...memoryCipher(keyRing),
  });
  const attachments = createVaultAttachments({
    store,
    keyRing,
    fetch: vault.fetch,
    now: vault.now,
    retryDelayMs: 0,
    retries: options.retries,
    cache: options.cache,
  });
  return { store, attachments, keyRing };
}

function message(id: string, data: ChatRecord["data"] = {}): ChatRecord {
  return {
    kind: "message",
    id,
    conversationId: "c1",
    sortKey: 1,
    createdAt: 1,
    updatedAt: 1,
    isDeleted: false,
    data: { role: "user", content: "look at this", ...data },
  };
}

async function putMessage(store: ChatStore, id: string, data?: ChatRecord["data"]) {
  return (await store.putMany([{ record: message(id, data), expectedVersion: 0 }]))[0];
}

function memoryJournal(): VaultAttachmentJournal & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    get: (key) => Promise.resolve(entries.get(key) ?? null),
    set: (key, value) => {
      if (value === null) entries.delete(key);
      else entries.set(key, value);
      return Promise.resolve();
    },
  };
}

function memoryCache(): VaultAttachmentCache & { entries: Map<string, Uint8Array> } {
  const entries = new Map<string, Uint8Array>();
  return {
    entries,
    get: (id) => Promise.resolve(entries.get(id) ?? null),
    set: (id, value) => {
      entries.set(id, value);
      return Promise.resolve();
    },
    delete: (id) => {
      entries.delete(id);
      return Promise.resolve();
    },
  };
}

function file(fileId: string, content: string | null): LocalMessageAttachment {
  return {
    fileId,
    name: `${fileId}.png`,
    type: "image/png",
    read: () => Promise.resolve(content === null ? null : bytes(content)),
  };
}

describe("vault attachments", () => {
  it("encrypts before upload and sends exactly the signed headers", async () => {
    const vault = createVault();
    const { attachments, keyRing } = await device(vault);
    const plaintext = bytes("a very private photo of a passport");

    const id = await attachments.upload(plaintext);

    const [put] = vault.puts();
    expect(vault.reservations()).toHaveLength(1);
    expect(put.body!.length).toBe(plaintext.length + 29);
    expect(contains(put.body!, plaintext)).toBe(false);
    expect(contains(put.body!, plaintext.slice(0, 8))).toBe(false);
    expect(put.headers["content-type"]).toBe("application/octet-stream");
    expect(put.headers["content-length"]).toBeUndefined();
    expect(vault.attachments.get(id)).toMatchObject({
      size: plaintext.length + 29,
      state: "pending",
    });
    const frame = vault.blobs.get(id)!;
    const open = (attachmentId: string) =>
      crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: frame.slice(1, 13),
          additionalData: bytes(`anuma-chat-attachment-v1:${attachmentId}`),
        },
        keyRing.v3,
        frame.slice(13)
      );
    expect(new Uint8Array(await open(id))).toEqual(plaintext);
    await expect(open("f".repeat(32))).rejects.toThrow();
  });

  it("rejects an empty or oversized file before reserving", async () => {
    const vault = createVault();
    const { attachments } = await device(vault);
    for (const size of [0, maxVaultAttachmentBytes + 1])
      await expect(attachments.upload(new Uint8Array(size))).rejects.toMatchObject({
        status: 413,
        code: "attachment_too_large",
      });
    expect(vault.reservations()).toHaveLength(0);
  });

  it("re-reserves when the upload URL expires before or during the upload", async () => {
    const vault = createVault();
    const { attachments } = await device(vault);
    const reserved: string[] = [];
    const id = await attachments.upload(bytes("slow"), {
      onReserved: (rid) => {
        reserved.push(rid);
        if (reserved.length === 1) vault.advance(uploadTtlMs);
      },
    });
    expect(reserved).toHaveLength(2);
    expect(id).toBe(reserved[1]);
    expect(vault.puts()).toHaveLength(1);
    expect(vault.attachments.has(reserved[0])).toBe(false);

    vault.faults.push((r) =>
      r.host === "r2.test" && r.method === "PUT"
        ? new Response("<Code>AccessDenied</Code>", { status: 403 })
        : undefined
    );
    const second = await attachments.upload(bytes("rejected once"));
    expect(vault.blobs.has(second)).toBe(true);
    expect([...vault.attachments.values()].filter((r) => r.state === "pending")).toHaveLength(2);
  });

  it("gives up after repeated rejected uploads without leaving reservations", async () => {
    const vault = createVault();
    const { attachments } = await device(vault, { retries: 1 });
    for (let i = 0; i < 2; i++)
      vault.faults.push((r) =>
        r.host === "r2.test" && r.method === "PUT"
          ? new Response("<Code>SignatureDoesNotMatch</Code>", { status: 403 })
          : undefined
      );
    await expect(attachments.upload(bytes("x"))).rejects.toMatchObject({
      code: "attachment_upload_rejected",
    });
    expect(vault.attachments.size).toBe(0);
  });

  it("retries transient storage and vault errors", async () => {
    const vault = createVault();
    const { attachments } = await device(vault);
    vault.faults.push((r) =>
      r.path === "/api/private-chats/attachments" ? problem(503, "unavailable") : undefined
    );
    vault.faults.push((r) =>
      r.host === "r2.test" ? new Response(null, { status: 500 }) : undefined
    );
    vault.faults.push((r) => {
      if (r.host === "r2.test") throw new TypeError("network down");
      return undefined;
    });
    const id = await attachments.upload(bytes("flaky"));
    expect(vault.blobs.has(id)).toBe(true);
    expect(vault.puts()).toHaveLength(3);
  });

  it("binds an upload to a live message only, idempotently", async () => {
    const vault = createVault();
    const { store, attachments } = await device(vault);
    const id = await attachments.upload(bytes("bound"));
    await expect(attachments.commit(id, { kind: "message", id: "m1" })).rejects.toMatchObject({
      code: "attachment_owner_not_found",
    });
    await putMessage(store, "m1");
    await putMessage(store, "m2");
    const committed = await attachments.commit(id, { kind: "message", id: "m1" });
    expect(committed).toMatchObject({ state: "committed", ownerKind: "message", ownerId: "m1" });
    await expect(attachments.commit(id, { kind: "message", id: "m1" })).resolves.toMatchObject({
      ownerId: "m1",
    });
    await expect(attachments.commit(id, { kind: "message", id: "m2" })).rejects.toMatchObject({
      code: "attachment_conflict",
    });
  });

  it("refuses to commit an upload stored at the wrong size", async () => {
    const vault = createVault();
    const { store, attachments } = await device(vault);
    await putMessage(store, "m1");
    const id = await attachments.upload(bytes("truncated in transit"));
    vault.blobs.set(id, vault.blobs.get(id)!.slice(1));
    await expect(attachments.commit(id, { kind: "message", id: "m1" })).rejects.toMatchObject({
      status: 409,
      code: "attachment_not_uploaded",
    });
  });

  it("resolves an attachment by id on another device and caches the plaintext", async () => {
    const vault = createVault();
    const phone = await device(vault);
    await putMessage(phone.store, "m1");
    const result = await migrateMessageAttachments({
      store: phone.store,
      attachments: phone.attachments,
      journal: memoryJournal(),
      messageId: "m1",
      files: [file("media-1", "pixels")],
    });
    expect(result.refs).toEqual([
      {
        attachmentId: result.refs[0].attachmentId,
        fileId: "media-1",
        name: "media-1.png",
        type: "image/png",
        size: 6,
      },
    ]);

    const cache = memoryCache();
    const browser = await device(vault, { cache });
    const synced = await browser.store.get("message", "m1");
    const [ref] = vaultAttachmentRefs(synced!.record);
    expect(ref.attachmentId).toBe(result.refs[0].attachmentId);
    expect(toMessage(synced!.record).vaultAttachments).toEqual(result.refs);

    expect(await browser.attachments.read(ref.attachmentId)).toEqual(bytes("pixels"));
    expect(cache.entries.get(ref.attachmentId)).toEqual(bytes("pixels"));
    const gets = vault.requests.filter((r) => r.host === "r2.test" && r.method === "GET").length;
    expect(await browser.attachments.read(ref.attachmentId)).toEqual(bytes("pixels"));
    expect(vault.requests.filter((r) => r.host === "r2.test" && r.method === "GET")).toHaveLength(
      gets
    );
  });

  it("refreshes an expired download URL", async () => {
    const vault = createVault();
    const { store, attachments } = await device(vault);
    await putMessage(store, "m1");
    const id = await attachments.upload(bytes("later"));
    await attachments.commit(id, { kind: "message", id: "m1" });
    vault.faults.push((r) => {
      if (r.host !== "r2.test" || r.method !== "GET") return undefined;
      vault.advance(uploadTtlMs + 1);
      return new Response("<Code>AccessDenied</Code>", { status: 403 });
    });
    expect(await attachments.read(id)).toEqual(bytes("later"));
    expect(
      vault.requests.filter(
        (r) => r.method === "GET" && r.path.startsWith(`/api/private-chats/attachments/${id}`)
      )
    ).toHaveLength(2);
  });

  it("fails closed on another key or a tampered blob, and returns null when absent", async () => {
    const vault = createVault();
    const { store, attachments } = await device(vault);
    await putMessage(store, "m1");
    const id = await attachments.upload(bytes("mine"));
    await attachments.commit(id, { kind: "message", id: "m1" });

    const keyRing = await deriveMemoryKeyRing("0x" + "56".repeat(65));
    const stranger = createVaultAttachments({ store, keyRing, fetch: vault.fetch, now: vault.now });
    await expect(stranger.read(id)).rejects.toMatchObject({ code: "invalid_attachment" });

    const blob = vault.blobs.get(id)!;
    blob[blob.length - 1] ^= 1;
    await expect(attachments.read(id)).rejects.toMatchObject({ code: "invalid_attachment" });
    vault.blobs.set(id, blob.slice(1));
    await expect(attachments.read(id)).rejects.toMatchObject({ code: "invalid_attachment" });

    const pending = await attachments.upload(bytes("pending"));
    expect(await attachments.read(pending)).toBeNull();
    expect(await attachments.read("e".repeat(32))).toBeNull();
  });

  it("deletes from vault and the device cache, and tolerates a repeat", async () => {
    const vault = createVault();
    const cache = memoryCache();
    const { store, attachments } = await device(vault, { cache });
    await putMessage(store, "m1");
    const id = await attachments.upload(bytes("gone soon"));
    await attachments.commit(id, { kind: "message", id: "m1" });
    await attachments.read(id);
    expect(cache.entries.has(id)).toBe(true);

    await attachments.delete(id);
    expect(vault.attachments.has(id)).toBe(false);
    expect(vault.blobs.has(id)).toBe(false);
    expect(cache.entries.has(id)).toBe(false);
    expect(await attachments.read(id)).toBeNull();
    await expect(attachments.delete(id)).resolves.toBeUndefined();
  });
});

describe("migrateMessageAttachments", () => {
  async function setup() {
    const vault = createVault();
    const d = await device(vault);
    await putMessage(d.store, "m1", { fileIds: ["a", "b"] });
    const journal = memoryJournal();
    const run = (files = [file("a", "alpha"), file("b", "bravo")]) =>
      migrateMessageAttachments({
        store: d.store,
        attachments: d.attachments,
        journal,
        messageId: "m1",
        files,
      });
    return { vault, ...d, journal, run };
  }

  it("uploads, commits and records refs, then does nothing on a rerun", async () => {
    const s = await setup();
    const first = await s.run();
    expect(first.uploaded).toBe(2);
    expect(first.refs.map((r) => r.fileId)).toEqual(["a", "b"]);
    for (const ref of first.refs)
      expect(s.vault.attachments.get(ref.attachmentId)).toMatchObject({
        state: "committed",
        ownerId: "m1",
      });
    const stored = await s.store.get("message", "m1");
    expect(stored!.record.data.fileIds).toEqual(["a", "b"]);
    expect(stored!.record.updatedAt).toBe(1);
    expect(s.journal.entries.size).toBe(0);

    const requests = s.vault.requests.length;
    const second = await s.run();
    expect(second).toEqual({ refs: first.refs, uploaded: 0, missing: [] });
    expect(s.vault.requests.slice(requests).map((r) => r.method)).toEqual(["GET"]);
  });

  it("resumes after a crash between upload and commit without uploading again", async () => {
    const s = await setup();
    s.vault.faults.push((r) => {
      if (r.path.endsWith("/commit") && s.vault.puts().length === 2) throw new Error("app killed");
      return undefined;
    });
    await expect(s.run()).rejects.toThrow("app killed");
    expect(s.vault.puts()).toHaveLength(2);
    expect(s.journal.entries.size).toBe(2);
    expect(vaultAttachmentRefs((await s.store.get("message", "m1"))!.record)).toEqual([]);

    const resumed = await s.run();
    expect(resumed.uploaded).toBe(0);
    expect(resumed.refs.map((r) => r.fileId)).toEqual(["a", "b"]);
    expect(resumed.refs.map((r) => r.size)).toEqual([5, 5]);
    expect(s.vault.puts()).toHaveLength(2);
    expect(s.vault.reservations()).toHaveLength(2);
    expect(s.vault.attachments.size).toBe(2);
    expect(s.journal.entries.size).toBe(0);
    expect(await s.attachments.read(resumed.refs[1].attachmentId)).toEqual(bytes("bravo"));
  });

  it("replaces a reservation that crashed before its bytes landed", async () => {
    const s = await setup();
    const crashing = {
      ...s.attachments,
      upload: (b: Uint8Array, o?: Parameters<typeof s.attachments.upload>[1]) =>
        s.attachments.upload(b, {
          ...o,
          onReserved: async (id) => {
            await o?.onReserved?.(id);
            throw new Error("app killed");
          },
        }),
    };
    await expect(
      migrateMessageAttachments({
        store: s.store,
        attachments: crashing,
        journal: s.journal,
        messageId: "m1",
        files: [file("a", "alpha")],
      })
    ).rejects.toThrow("app killed");
    const orphan = [...s.journal.entries.values()][0];
    s.vault.attachments.set(orphan, { id: orphan, size: 34, state: "pending" });

    const result = await s.run([file("a", "alpha")]);
    expect(result.uploaded).toBe(1);
    expect(s.vault.attachments.has(orphan)).toBe(false);
    expect(s.vault.attachments.size).toBe(1);
    expect(s.vault.puts()).toHaveLength(1);
  });

  it("finishes after a crash between the ref write and clearing the journal", async () => {
    const s = await setup();
    const journal = {
      ...s.journal,
      set: async (key: string, value: string | null) => {
        if (value === null) throw new Error("app killed");
        await s.journal.set(key, value);
      },
    };
    await expect(
      migrateMessageAttachments({
        store: s.store,
        attachments: s.attachments,
        journal,
        messageId: "m1",
        files: [file("a", "alpha")],
      })
    ).rejects.toThrow("app killed");
    const result = await s.run([file("a", "alpha")]);
    expect(result.uploaded).toBe(0);
    expect(result.refs).toHaveLength(1);
    expect(s.journal.entries.size).toBe(0);
    expect(s.vault.puts()).toHaveLength(1);
  });

  it("reports files missing on the device and keeps going", async () => {
    const s = await setup();
    const result = await s.run([file("a", null), file("b", "bravo")]);
    expect(result.missing).toEqual(["a"]);
    expect(result.refs.map((r) => r.fileId)).toEqual(["b"]);
  });

  it("merges refs into a message another writer changed meanwhile", async () => {
    const s = await setup();
    let raced = false;
    s.vault.faults.push((r) => {
      if (raced || r.path !== "/api/private-chats/records/batch") return undefined;
      raced = true;
      const entry = s.vault.records.get("message/m1")!;
      s.vault.records.set("message/m1", { ...entry, version: entry.version + 1 });
      return problem(409, "version_conflict");
    });
    const result = await s.run();
    expect(raced).toBe(true);
    expect(result.refs).toHaveLength(2);
    expect(s.vault.records.get("message/m1")!.version).toBe(3);
  });

  it("drops its own copy when a concurrent run recorded the file first", async () => {
    const s = await setup();
    let first: Awaited<ReturnType<typeof s.run>> | undefined;
    const slow = {
      ...file("a", "alpha"),
      read: async () => {
        first = await s.run([file("a", "alpha")]);
        return bytes("alpha");
      },
    };
    const second = await migrateMessageAttachments({
      store: s.store,
      attachments: s.attachments,
      journal: memoryJournal(),
      messageId: "m1",
      files: [slow],
    });
    expect(second.uploaded).toBe(1);
    expect(second.refs).toEqual(first!.refs);
    expect(s.vault.puts()).toHaveLength(2);
    expect(s.vault.attachments.size).toBe(1);
    expect(s.vault.attachments.has(first!.refs[0].attachmentId)).toBe(true);
  });

  it("refuses a message vault does not hold", async () => {
    const s = await setup();
    await expect(
      migrateMessageAttachments({
        store: s.store,
        attachments: s.attachments,
        journal: s.journal,
        messageId: "nope",
        files: [file("a", "alpha")],
      })
    ).rejects.toMatchObject({ code: "attachment_owner_not_found" });
    expect(s.vault.reservations()).toHaveLength(0);
  });
});

describe("message shape", () => {
  it("carries vault attachment ids through a vault record next to local file ids", () => {
    const refs = [
      {
        attachmentId: "a".repeat(32),
        fileId: "media-1",
        name: "x.png",
        type: "image/png",
        size: 3,
      },
    ];
    const stored: StoredMessage = {
      uniqueId: "m1",
      messageId: 1,
      conversationId: "c1",
      role: "user",
      content: "hi",
      fileIds: ["media-1"],
      vaultAttachments: refs,
      createdAt: new Date(1),
      updatedAt: new Date(1),
    };
    const back = toMessage(messageRecord(stored).record);
    expect(back.vaultAttachments).toEqual(refs);
    expect(back.fileIds).toEqual(["media-1"]);
    expect(
      vaultAttachmentRefs({ data: { vaultAttachments: [{ attachmentId: "bad" }, ...refs] } })
    ).toEqual(refs);
    expect(vaultAttachmentRefs({ data: {} })).toEqual([]);
  });

  it("is a ChatStoreError for callers branching on codes", async () => {
    const vault = createVault();
    const { attachments } = await device(vault);
    await expect(attachments.upload(new Uint8Array(0))).rejects.toBeInstanceOf(ChatStoreError);
  });
});
