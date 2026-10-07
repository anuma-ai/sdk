import { describe, expect, it, vi } from "vitest";

import {
  createRemoteMemoryPersistence,
  RemoteMemoryError,
  type RemoteMemoryPersistenceOptions,
  type RemoteMemoryRecord,
  type RemoteMemoryRow,
} from "./remotePersistence";

const vector = () => [1, ...new Array<number>(1535).fill(0)];

function setup() {
  let nonce = 0;
  const encrypt = vi.fn(
    async (text: string) => "enc:v3:" + Buffer.from(`${++nonce}|${text}`).toString("hex")
  );
  const decrypt = vi.fn(async (ciphertext: string) =>
    Buffer.from(ciphertext.slice(7), "hex").toString().split("|").slice(1).join("|")
  );
  const rows = new Map<string, RemoteMemoryRecord>();
  const requests: { url: URL; init: RequestInit; body?: Record<string, unknown> }[] = [];
  const account = { state: "active", key_id: "canonical", memory_count: 0 };
  const getToken = vi.fn(async (): Promise<string | null> => "current-token");
  let beforePut: (() => void) | undefined;
  const fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    requests.push({ url, init, body });
    const failure = (status: number, code: string) =>
      Response.json({ detail: code, code }, { status });
    if (new Headers(init.headers).get("Authorization") !== "Bearer current-token")
      return failure(401, "unauthorized");
    if (url.pathname === "/api/private-memories/account") return Response.json(account);
    if (url.pathname === "/api/private-memories/memories") {
      const visible = [...rows.values()]
        .filter(
          ({ memory: m }) =>
            (!m.is_deleted || url.searchParams.get("include_deleted") === "true") &&
            (!m.archived_at || url.searchParams.get("include_archived") === "true")
        )
        .sort((a, b) => a.memory.memory_id.localeCompare(b.memory.memory_id));
      const offset = Number((url.searchParams.get("cursor") ?? "page:0").split(":")[1]);
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const items = structuredClone(visible.slice(offset, offset + limit));
      if (url.searchParams.get("include_embeddings") !== "true")
        items.forEach((item) => delete item.memory.embedding);
      return Response.json({
        items,
        ...(offset + limit < visible.length && { next_cursor: `page:${offset + limit}` }),
      });
    }
    if (url.pathname === "/api/private-memories/candidates") {
      return Response.json({
        total_count: rows.size,
        unavailable_count: 0,
        items: [...rows.values()]
          .filter((item) => !item.memory.is_deleted)
          .map((item) => ({ ...item, score: 0.9 })),
      });
    }
    if (url.pathname === "/api/private-memories/memories/batch") {
      const writes = body!.writes as { memory: RemoteMemoryRow; expected_version: number }[];
      if (writes.some((w) => (rows.get(w.memory.memory_id)?.version ?? 0) !== w.expected_version))
        return failure(409, "version_conflict");
      const items = writes.map((w) => ({
        memory: w.memory,
        version: w.expected_version + 1,
        server_updated_at: "2026-10-07T20:00:00Z",
      }));
      items.forEach((item) => rows.set(item.memory.memory_id, structuredClone(item)));
      return Response.json({ items });
    }
    const id = decodeURIComponent(url.pathname.slice("/api/private-memories/memories/".length));
    if (init.method === "PUT") {
      beforePut?.();
      beforePut = undefined;
      if (body!.key_id !== account.key_id) return failure(409, "key_mismatch");
      const current = rows.get(id);
      if ((current?.version ?? 0) !== body!.expected_version)
        return failure(409, "version_conflict");
      const memory = body!.memory as RemoteMemoryRow;
      if (memory.memory_id !== id || !/^enc:v\d+:[a-f0-9]+$/.test(memory.content))
        return failure(400, "validation_failed");
      if (memory.embedding === undefined && current && current.memory.content === memory.content) {
        memory.embedding = current.memory.embedding;
        memory.embedding_model = current.memory.embedding_model;
      }
      if (memory.embedding?.length === 0) {
        delete memory.embedding;
        delete memory.embedding_model;
      }
      const saved = {
        memory,
        version: (current?.version ?? 0) + 1,
        server_updated_at: "2026-10-07T20:00:00Z",
      };
      rows.set(id, structuredClone(saved));
      return Response.json(saved);
    }
    return rows.has(id) ? Response.json(rows.get(id)) : failure(404, "not_found");
  });
  const options: RemoteMemoryPersistenceOptions = {
    baseUrl: "https://nearby.test",
    keyId: "canonical",
    getToken,
    encrypt,
    decrypt,
    fetch,
  };
  const memory = (id: string, content = "Plays chess"): RemoteMemoryRow => ({
    memory_id: id,
    content,
    scope: "private",
    created_at: 1,
    updated_at: 1,
    is_deleted: false,
  });
  return {
    rows,
    requests,
    account,
    options,
    memory,
    encrypt,
    decrypt,
    getToken,
    fetch,
    race: (work: () => void) => {
      beforePut = work;
    },
  };
}

describe("remote private-memory persistence", () => {
  it("round-trips plaintext resembling ciphertext after a committed write", async () => {
    const h = setup();
    const persistence = await createRemoteMemoryPersistence(h.options);
    const memory = { ...h.memory("text"), content: "enc:v3:abcd", kind_value: "enc:v3:ab" };
    expect((await persistence.put(memory, 0)).memory).toMatchObject(memory);
    expect((await persistence.get("text"))!.memory).toMatchObject(memory);
  });
  it("requires a migrated account and the canonical key without importing or activating", async () => {
    const h = setup();
    h.account.state = "migrating";
    await expect(createRemoteMemoryPersistence(h.options)).rejects.toMatchObject({
      code: "memory_not_active",
    });
    h.account.state = "active";
    h.account.key_id = "other-device-key";
    await expect(createRemoteMemoryPersistence(h.options)).rejects.toMatchObject({
      code: "key_mismatch",
    });
    expect(
      h.requests.every(({ url, init }) => url.pathname.endsWith("/account") && !init.method)
    ).toBe(true);
  });

  it("encrypts content and kind values, preserves metadata, and reads current server state across devices", async () => {
    const h = setup();
    const first = await createRemoteMemoryPersistence(h.options);
    const second = await createRemoteMemoryPersistence(h.options);
    const input = {
      ...h.memory("a/b ?#"),
      kind: "hobby",
      kind_value: "Chess",
      topics: '[{"name":"Chess","source":"user"}]',
      topics_updated_at: 23,
      last_observed_at: 44,
    };
    const created = await first.put(input, 0);
    expect(created).toMatchObject({ memory: input, version: 1 });
    const wire = h.rows.get(input.memory_id)!;
    expect(wire.memory.content).toMatch(/^enc:v3:/);
    expect(wire.memory.kind_value).toMatch(/^enc:v3:/);
    expect(wire.memory.topics).toBe(input.topics);
    expect(h.requests.find(({ init }) => init.method === "PUT")!.url.pathname).toContain(
      "a%2Fb%20%3F%23"
    );
    const edited = await second.put(
      { ...created.memory, content: "Plays the cello", updated_at: 2 },
      created.version
    );
    expect(await first.get(input.memory_id)).toEqual(edited);
    await expect(first.put(created.memory, created.version)).rejects.toMatchObject({
      status: 409,
      code: "version_conflict",
    });
    expect((await first.get(input.memory_id))?.memory.content).toBe("Plays the cello");
    expect(input.content).toBe("Plays chess");
  });

  it("preserves vectors on unchanged-text edits from default pages and supports explicit clearing", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    const created = await store.put(
      { ...h.memory("a"), embedding: vector(), embedding_model: "model" },
      0
    );
    const page = await store.list();
    expect(page.items[0].memory.embedding).toBeUndefined();
    const beforeCiphertext = h.rows.get("a")!.memory.content;
    const updated = await store.put(
      { ...page.items[0].memory, topics: "[]", topics_updated_at: 2 },
      created.version
    );
    expect(updated.memory.embedding).toEqual(vector());
    expect(h.rows.get("a")!.memory.content).toBe(beforeCiphertext);
    const cleared = await store.put({ ...updated.memory, embedding: [] }, updated.version);
    expect(cleared.memory.embedding).toBeUndefined();
    expect(cleared.memory.embedding_model).toBeUndefined();
  });

  it("uses the caller's version when another device edits between its read and PUT", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    const created = await store.put(h.memory("a"), 0);
    const authoritative = {
      ...h.rows.get("a")!,
      version: 2,
      memory: { ...h.rows.get("a")!.memory, updated_at: 9999 },
    };
    h.race(() => h.rows.set("a", structuredClone(authoritative)));
    const before = h.requests.length;
    await expect(
      store.put({ ...created.memory, content: "Old device edit" }, created.version)
    ).rejects.toMatchObject({ code: "version_conflict" });
    expect(h.rows.get("a")).toEqual(authoritative);
    expect(h.requests.slice(before).filter(({ init }) => init.method === "PUT")).toHaveLength(1);
  });

  it("reuses version-bound ciphertext with no extra GET and rejects mutated or foreign snapshots", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    await store.put({ ...h.memory("a"), embedding: vector() }, 0);
    const page = await store.list();
    const snapshot = page.items[0];
    const cipher = h.rows.get("a")!.memory.content;
    const before = h.requests.length;
    const updated = await store.put({ ...snapshot.memory, topics: "[]" }, snapshot);
    expect(h.requests.slice(before)).toHaveLength(1);
    expect(h.requests.at(-1)!.init.method).toBe("PUT");
    expect(h.rows.get("a")!.memory.content).toBe(cipher);
    expect(updated.memory.embedding).toEqual(vector());
    await expect(store.put(snapshot.memory, snapshot)).rejects.toMatchObject({
      code: "version_conflict",
    });
    const other = await createRemoteMemoryPersistence(h.options);
    await expect(other.put(updated.memory, updated)).rejects.toThrow("snapshot");
    updated.version++;
    await expect(store.put(updated.memory, updated)).rejects.toThrow("snapshot");
  });

  it("commits bounded batches in one request and never replays a conflict", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    const before = h.requests.length;
    const [a, b] = await store.putMany(
      ["a", "b"].map((id) => ({ memory: h.memory(id), expectedVersion: 0 }))
    );
    expect(h.requests.slice(before)).toHaveLength(1);
    expect([a.memory.memory_id, b.memory.memory_id]).toEqual(["a", "b"]);
    const edits = [
      { memory: { ...a.memory, content: "new fact" }, expectedVersion: a },
      { memory: { ...b.memory, superseded_by: "a" }, expectedVersion: b },
    ];
    await store.putMany(edits);
    const count = h.requests.length;
    await expect(store.putMany(edits)).rejects.toMatchObject({ code: "version_conflict" });
    expect(h.requests.slice(count)).toHaveLength(1);
    await expect(store.putMany([])).rejects.toThrow("1–50");
    await expect(store.putMany([edits[0], edits[0]])).rejects.toThrow("distinct");
    expect(JSON.stringify(h.requests.at(-1)!.body)).not.toContain("new fact");
    expect(h.rows.get("a")!.version).toBe(2);
  });

  it("paginates including tombstones and passes hidden-state and embedding flags explicitly", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    await store.put(h.memory("a"), 0);
    await store.put({ ...h.memory("b"), is_deleted: true }, 0);
    await store.put({ ...h.memory("c"), archived_at: 2, embedding: vector() }, 0);
    const first = await store.list({
      limit: 1,
      include_deleted: true,
      include_archived: true,
      include_embeddings: true,
    });
    const second = await store.list({
      limit: 1,
      cursor: first.next_cursor,
      include_deleted: true,
      include_archived: true,
      include_embeddings: true,
    });
    const third = await store.list({
      limit: 1,
      cursor: second.next_cursor,
      include_deleted: true,
      include_archived: true,
      include_embeddings: true,
    });
    expect(
      [...first.items, ...second.items, ...third.items].map((item) => item.memory.memory_id)
    ).toEqual(["a", "b", "c"]);
    expect(second.items[0].memory.is_deleted).toBe(true);
    expect(third.items[0].memory.embedding).toEqual(vector());
    expect(third.next_cursor).toBeUndefined();
    expect((await store.list()).items.map((item) => item.memory.memory_id)).toEqual(["a"]);
    expect(await store.get("missing")).toBeNull();
  });

  it("sends vectors and filters for recall, never plaintext, decryption callbacks or credentials", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    await store.put(h.memory("a"), 0);
    const result = await store.candidates(vector(), {
      limit: 8,
      force_ids: ["a"],
      fact_types: ["identity"],
      include_archived: true,
    });
    expect(result[0]).toMatchObject({ memory: { content: "Plays chess" }, score: 0.9 });
    expect(h.requests.at(-1)!.body).toEqual({
      embedding: vector(),
      limit: 8,
      force_ids: ["a"],
      fact_types: ["identity"],
      include_archived: true,
    });
    expect(JSON.stringify(h.requests.at(-1)!.body)).not.toContain("Plays chess");
  });

  it("fails closed on encryption and decryption failure", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    h.encrypt.mockResolvedValueOnce("Unencrypted text");
    await expect(store.put(h.memory("a"), 0)).rejects.toThrow("refusing to upload plaintext");
    expect(h.requests.filter(({ init }) => init.method === "PUT")).toHaveLength(0);
    const created = await store.put(h.memory("a"), 0);
    h.decrypt.mockResolvedValueOnce(h.rows.get("a")!.memory.content);
    await expect(store.get(created.memory.memory_id)).rejects.toThrow("decryption failed");
    h.rows.get("a")!.memory.content = "Server plaintext";
    await expect(store.get("a")).rejects.toThrow("unencrypted memory content");
  });

  it("rejects unrecognized row fields before sending a request", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    const before = h.fetch.mock.calls.length;
    await expect(
      store.put({ ...h.memory("a"), keyMaterial: "must stay on device" } as RemoteMemoryRow, 0)
    ).rejects.toThrow("Unknown private-memory fields");
    expect(h.fetch.mock.calls.length).toBe(before);
  });

  it("captures the write before asynchronous encryption so caller edits cannot change it", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    h.encrypt.mockImplementationOnce(async (text) => {
      await gate;
      return "enc:v3:" + Buffer.from(`test|${text}`).toString("hex");
    });
    const input = { ...h.memory("a"), kind_value: "Chess", embedding: vector() };
    const pending = store.put(input, 0);
    input.content = "Changed while signing";
    input.kind_value = "Cello";
    input.embedding[0] = 0;
    release();
    expect(await pending).toMatchObject({
      memory: { content: "Plays chess", kind_value: "Chess", embedding: vector() },
    });
  });

  it("refreshes authentication per request, preserves errors, and propagates cancellation", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    h.getToken.mockResolvedValueOnce(null);
    await expect(store.get("a")).rejects.toMatchObject({ status: 401 });
    h.fetch.mockResolvedValueOnce(
      Response.json({ detail: "Slow down", code: "rate_limited" }, { status: 429 })
    );
    await expect(store.get("a")).rejects.toMatchObject({ status: 429, code: "rate_limited" });
    h.fetch.mockRejectedValueOnce(new TypeError("connection lost"));
    await expect(store.put(h.memory("a"), 0)).rejects.toThrow("connection lost");
    expect(h.fetch.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1);
    const controller = new AbortController();
    await store.list({ signal: controller.signal });
    expect(h.requests.at(-1)!.init.signal).toBe(controller.signal);
    expect(h.requests.at(-1)!.init.redirect).toBe("error");
    expect(h.getToken.mock.calls.length).toBeGreaterThan(h.requests.length);
    expect(new RemoteMemoryError("Conflict", 409, "version_conflict")).toBeInstanceOf(Error);
  });
});
