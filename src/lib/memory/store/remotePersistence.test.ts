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
    if (url.pathname === "/api/private-memories/memories/query") {
      const items = [...rows.values()].filter(({ memory: m }) => !m.is_deleted);
      return Response.json({
        items,
        ...(body!.order === "changed" && { changes_cursor: "resume-here" }),
      });
    }
    if (url.pathname === "/api/private-memories/candidates") {
      return Response.json({
        ...(body!.with_counts === true && { total_count: rows.size, unavailable_count: 0 }),
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
    expect(result.items[0]).toMatchObject({ memory: { content: "Plays chess" }, score: 0.9 });
    expect(result.failed).toEqual([]);
    expect(h.requests.at(-1)!.body).toEqual({
      embedding: vector(),
      limit: 8,
      force_ids: ["a"],
      fact_types: ["identity"],
      include_archived: true,
    });
    expect(JSON.stringify(h.requests.at(-1)!.body)).not.toContain("Plays chess");
  });

  it("requests counts only for candidate sets and requires them in the response", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    await store.put(h.memory("a"), 0);
    const window = await store.candidateSet(vector(), { limit: 5 });
    expect(h.requests.at(-1)!.body).toMatchObject({ with_counts: true });
    expect(window).toMatchObject({ total_count: 1, unavailable_count: 0 });
    await store.candidates(vector(), { limit: 5 });
    expect(h.requests.at(-1)!.body).not.toHaveProperty("with_counts");
    h.fetch.mockImplementationOnce(async () => Response.json({ items: [] }));
    await expect(store.candidateSet(vector())).rejects.toThrow("Invalid nearby candidate response");
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
    ).rejects.toMatchObject({
      code: "unknown_field",
      message: expect.stringContaining("keyMaterial"),
    });
    expect(h.fetch.mock.calls.length).toBe(before);
  });

  it("refuses to upload already-encrypted input that field encryption passes through unchanged", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    const foreign = "enc:v2:" + "ab".repeat(40);
    h.encrypt.mockImplementation(async (text: string) =>
      /^enc:v[23]:[0-9a-f]{56,}$/.test(text)
        ? text
        : "enc:v3:" + Buffer.from(`x|${text}`).toString("hex")
    );
    await expect(store.put(h.memory("a", foreign), 0)).rejects.toThrow(
      "refusing to upload plaintext"
    );
    await expect(store.put({ ...h.memory("a"), kind_value: foreign }, 0)).rejects.toThrow(
      "refusing to upload plaintext"
    );
    expect(h.requests.filter(({ init }) => init.method === "PUT")).toHaveLength(0);
  });

  it("reports undecryptable rows per item without failing pages or candidate windows", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    await store.put(h.memory("a"), 0);
    await store.put(h.memory("b", "Plays piano"), 0);
    await store.put(h.memory("c", "Plays go"), 0);
    const broken = h.rows.get("b")!.memory.content;
    h.decrypt.mockImplementation(async (ciphertext: string) =>
      ciphertext === broken
        ? ciphertext
        : Buffer.from(ciphertext.slice(7), "hex").toString().split("|").slice(1).join("|")
    );
    const first = await store.list({ limit: 2 });
    expect(first.items.map((item) => item.memory.memory_id)).toEqual(["a"]);
    expect(first.failed).toEqual([
      {
        memory_id: "b",
        version: 1,
        error: expect.objectContaining({ message: "Memory decryption failed" }),
      },
    ]);
    const second = await store.list({ limit: 2, cursor: first.next_cursor });
    expect(second.items.map((item) => item.memory.memory_id)).toEqual(["c"]);
    const window = await store.candidateSet(vector());
    expect(window.items.map((item) => item.memory.memory_id)).toEqual(["a", "c"]);
    expect(window.failed.map((failure) => failure.memory_id)).toEqual(["b"]);
    const plain = await store.candidates(vector());
    expect(plain.items.map((item) => item.memory.memory_id)).toEqual(["a", "c"]);
    expect(plain.failed.map((failure) => failure.memory_id)).toEqual(["b"]);
  });

  it("reads query metadata without decrypting or returning content", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    await store.put({ ...h.memory("a"), kind: "occupation", kind_value: '"nurse"' }, 0);
    h.decrypt.mockClear();

    const page = await store.queryMetadata({ order: "created" });
    expect(page.items.map((item) => item.memory.memory_id)).toEqual(["a"]);
    expect(page.items[0].memory).not.toHaveProperty("content");
    expect(page.items[0].memory).not.toHaveProperty("kind_value");
    expect(page.items[0].memory.kind).toBe("occupation");
    expect(h.decrypt).not.toHaveBeenCalled();
  });

  it("repairs an undecryptable row with a fresh encryption under the caller's version", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    await store.put(h.memory("a"), 0);
    const broken = h.rows.get("a")!.memory.content;
    h.decrypt.mockImplementation(async (ciphertext: string) =>
      ciphertext === broken
        ? ciphertext
        : Buffer.from(ciphertext.slice(7), "hex").toString().split("|").slice(1).join("|")
    );
    await expect(store.get("a")).rejects.toThrow("decryption failed");
    await expect(store.put(h.memory("a", "Repaired"), 2)).rejects.toMatchObject({
      code: "version_conflict",
    });
    const repaired = await store.put(h.memory("a", "Repaired"), 1);
    expect(repaired).toMatchObject({ version: 2, memory: { content: "Repaired" } });
    expect(h.rows.get("a")!.memory.content).not.toBe(broken);
    expect((await store.get("a"))!.memory.content).toBe("Repaired");
  });

  it("returns committed writes from the sent plaintext without decrypting the response", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    h.decrypt.mockRejectedValue(new Error("key temporarily unavailable"));
    const single = await store.put({ ...h.memory("a"), kind_value: "Chess" }, 0);
    expect(single).toMatchObject({
      version: 1,
      memory: { content: "Plays chess", kind_value: "Chess" },
    });
    const [b, c] = await store.putMany([
      { memory: h.memory("b", "Plays piano"), expectedVersion: 0 },
      { memory: h.memory("c", "Plays go"), expectedVersion: 0 },
    ]);
    expect([b.memory.content, c.memory.content]).toEqual(["Plays piano", "Plays go"]);
    expect(h.decrypt).not.toHaveBeenCalled();
    const before = h.requests.length;
    await store.put({ ...single.memory, topics: "[]" }, single);
    expect(h.requests.slice(before)).toHaveLength(1);
  });

  it("reports a missing row on a versioned write as a version conflict", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    await expect(store.put(h.memory("missing"), 3)).rejects.toMatchObject({
      status: 409,
      code: "version_conflict",
    });
    await expect(
      store.putMany([{ memory: h.memory("missing"), expectedVersion: 1 }])
    ).rejects.toMatchObject({ code: "version_conflict" });
    expect(h.requests.some(({ init }) => init.method === "PUT" || init.method === "POST")).toBe(
      false
    );
  });

  it("validates candidate limits against the server schema before sending", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    const before = h.fetch.mock.calls.length;
    const ids = (n: number) => Array.from({ length: n }, (_, i) => `id-${i}`);
    await expect(store.candidateSet(vector(), { memory_ids: ids(1001) })).rejects.toThrow(
      "memory_ids accepts at most 1000"
    );
    await expect(store.candidateSet(vector(), { scopes: ids(21) })).rejects.toThrow(
      "scopes accepts at most 20"
    );
    await expect(store.candidateSet(vector(), { fact_types: ids(21) })).rejects.toThrow(
      "fact_types accepts at most 20"
    );
    await expect(store.candidateSet(vector(), { force_ids: ids(101) })).rejects.toThrow(
      "force_ids accepts at most 100"
    );
    await expect(store.candidateSet(vector(), { limit: 101 })).rejects.toThrow("1–100");
    expect(h.fetch.mock.calls.length).toBe(before);
    await expect(store.candidateSet(vector(), { memory_ids: ids(1000) })).resolves.toMatchObject({
      failed: [],
    });
  });

  it("queries with only the filters given, validates bounds first and passes the changes cursor", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence(h.options);
    await store.put(h.memory("a", "Speaks Portuguese"), 0);
    const before = h.fetch.mock.calls.length;
    const many = (n: number) => Array.from({ length: n }, (_, i) => `x-${i}`);
    await expect(store.query({ topics: many(101) })).rejects.toThrow("topics accepts at most 100");
    await expect(store.query({ memory_ids: many(1001) })).rejects.toThrow(
      "memory_ids accepts at most 1000"
    );
    await expect(store.query({ visibility: many(21) })).rejects.toThrow(
      "visibility accepts at most 20"
    );
    await expect(store.query({ limit: 201 })).rejects.toThrow("1–200");
    expect(h.fetch.mock.calls.length).toBe(before);

    const page = await store.query({ order: "changed", topics: ["Lisbon"], updated_after: 5 });
    expect(page.items.map((item) => item.memory.content)).toEqual(["Speaks Portuguese"]);
    expect(page.changes_cursor).toBe("resume-here");
    expect(h.requests.at(-1)!.body).toEqual({
      order: "changed",
      topics: ["Lisbon"],
      updated_after: 5,
    });
  });

  it("times out hung requests with a typed error", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence({ ...h.options, timeoutMs: 20 });
    h.fetch.mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) =>
          init!.signal!.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          )
        )
    );
    await expect(store.get("a")).rejects.toMatchObject({ status: 408, code: "timeout" });
    await expect(createRemoteMemoryPersistence({ ...h.options, timeoutMs: 0 })).rejects.toThrow(
      "timeoutMs"
    );
  });

  it("bounds a hung token refresh by the timeout and the caller's signal", async () => {
    const h = setup();
    const store = await createRemoteMemoryPersistence({ ...h.options, timeoutMs: 20 });
    const calls = h.fetch.mock.calls.length;
    h.getToken.mockImplementation(() => new Promise<string>(() => undefined));
    await expect(store.get("a")).rejects.toMatchObject({ status: 408, code: "timeout" });
    const controller = new AbortController();
    const reason = new Error("caller gave up");
    const pending = createRemoteMemoryPersistence({
      ...h.options,
      timeoutMs: 60_000,
      signal: controller.signal,
    });
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    expect(h.fetch.mock.calls.length).toBe(calls);
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
    const forwarded = h.requests.at(-1)!.init.signal!;
    expect(forwarded.aborted).toBe(false);
    h.fetch.mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) =>
          init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason as Error))
        )
    );
    const pending = store.list({ signal: controller.signal });
    await vi.waitFor(() => expect(h.requests.length).toBeGreaterThan(0));
    controller.abort(new Error("caller cancelled"));
    await expect(pending).rejects.toThrow("caller cancelled");
    expect(h.requests.at(-1)!.init.redirect).toBe("error");
    expect(h.getToken.mock.calls.length).toBeGreaterThan(h.requests.length);
    expect(new RemoteMemoryError("Conflict", 409, "version_conflict")).toBeInstanceOf(Error);
  });
});
