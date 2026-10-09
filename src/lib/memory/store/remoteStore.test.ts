import { describe, expect, it, vi } from "vitest";

vi.mock("../../memoryEngine/embeddings", () => {
  const DIM = 1536;
  const embed = (text: string): number[] => {
    const v: number[] = new Array<number>(DIM).fill(0);
    for (const token of text.toLowerCase().match(/[a-z0-9']+/g) ?? []) {
      let hash = 0;
      for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
      v[hash % DIM] += 1;
    }
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  };
  return {
    generateEmbedding: vi.fn(async (text: string) => embed(text)),
    generateEmbeddings: vi.fn(async (texts: string[]) => texts.map(embed)),
  };
});

import { getLogger } from "../../logger";
import { runMemoryStoreContract } from "./contract";
import { deriveMemoryKeyRing, type MemoryKeyRing, memoryCipher } from "./memoryKeys";
import { createRemoteMemoryPersistence } from "./remotePersistence";
import { createRemoteMemoryStore, RemoteMemoryPartialCreateError } from "./remoteStore";

type Row = Record<string, unknown> & { memory_id: string; content: string };
interface Stored {
  memory: Row;
  version: number;
  server_updated_at: string;
  seq?: number;
}

const orderColumns = { created: "created_at", updated: "updated_at", archived: "archived_at" };
const norm = (name: string) => name.trim().toLowerCase();

function topicNames(memory: Row): string[] {
  try {
    const parsed: unknown = JSON.parse(String(memory.topics));
    return Array.isArray(parsed)
      ? parsed
          .filter((t): t is { name: string } => typeof (t as { name?: unknown })?.name === "string")
          .map((t) => norm(t.name))
      : [];
  } catch {
    return [];
  }
}

const DIM = 1536;
const axis = (i: number) =>
  JSON.stringify(Array.from({ length: DIM }, (_, j) => (j === i ? 1 : 0)));

function normalized(vector: number[]): number[] {
  const out = vector.slice(0, DIM);
  const norm = Math.sqrt(out.reduce((sum, v) => sum + v * v, 0));
  return out.map((v) => v / norm);
}

function fakeNearby(keyId: string) {
  const rows = new Map<string, Stored>();
  let writes = 0;
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  const problem = (status: number, code: string) => json(status, { code, detail: code });
  const shown = (row: Row, flags: Record<string, unknown>) =>
    (flags.include_deleted || !row.is_deleted) &&
    (flags.include_archived || row.archived_at === undefined) &&
    (flags.include_quarantined || row.trust_tier !== "quarantined") &&
    (flags.include_superseded || row.superseded_by === undefined);
  const out = (stored: Stored, withEmbedding = true): Stored => {
    const memory = structuredClone(stored.memory);
    if (!withEmbedding) delete memory.embedding;
    const { seq: _seq, ...wire } = stored;
    return { ...wire, memory };
  };
  const conflicting = (writes: { expected_version: number; memory: Row }[]) =>
    writes.some((w) => (rows.get(w.memory.memory_id)?.version ?? 0) !== w.expected_version);
  const apply = ({ memory }: { expected_version: number; memory: Row }): Stored => {
    const current = rows.get(memory.memory_id);
    const next: Row = Object.fromEntries(
      Object.entries(memory).filter(([, v]) => v !== undefined && v !== null)
    ) as Row;
    if (Array.isArray(next.embedding)) {
      if ((next.embedding as number[]).length === 0) {
        delete next.embedding;
        delete next.embedding_model;
      } else next.embedding = normalized(next.embedding as number[]);
    } else if (current?.memory.embedding && current.memory.content === next.content) {
      next.embedding = current.memory.embedding;
      next.embedding_model = current.memory.embedding_model;
    } else delete next.embedding_model;
    const saved = {
      memory: next,
      version: (current?.version ?? 0) + 1,
      server_updated_at: new Date().toISOString(),
      seq: ++writes,
    };
    rows.set(memory.memory_id, saved);
    return saved;
  };
  const cosine = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);

  const fetch = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^.*\/api\/private-memories/, "");
    const method = init.method ?? "GET";
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    if (path === "/account") return json(200, { state: "active", key_id: keyId });
    if (path === "/memories" && method === "GET") {
      const flags = Object.fromEntries(
        [...url.searchParams].map(([k, v]) => [k, v === "true" ? true : v])
      );
      const limit = Number(url.searchParams.get("limit") ?? 50);
      const cursor = url.searchParams.get("cursor");
      const ordered = [...rows.values()]
        .filter((s) => shown(s.memory, flags))
        .sort((a, b) => a.memory.memory_id.localeCompare(b.memory.memory_id))
        .filter((s) => !cursor || s.memory.memory_id > cursor);
      const page = ordered.slice(0, limit);
      return json(200, {
        items: page.map((s) => out(s, !!flags.include_embeddings)),
        ...(ordered.length > limit && { next_cursor: page[page.length - 1].memory.memory_id }),
      });
    }
    if (path === "/memories/query") {
      const order = (body.order as keyof typeof orderColumns | "changed" | undefined) ?? "created";
      const limit = (body.limit as number | undefined) ?? 100;
      const list = (key: string) => body[key] as string[] | undefined;
      const wantedTopics = list("topics")?.map(norm);
      const archivedOnly = !!body.archived_only;
      const key = (s: Stored) =>
        order === "changed" ? (s.seq ?? 0) : Number(s.memory[orderColumns[order]]);
      const compare = (a: [number, string], b: [number, string]) =>
        a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
      const sign = order === "changed" ? 1 : -1;
      let after: [number, string] | undefined;
      if (body.cursor) {
        const cursor = JSON.parse(String(body.cursor)) as { order: string; at: [number, string] };
        if (cursor.order !== order) return problem(400, "bad_cursor");
        after = cursor.at;
      }
      const ordered = [...rows.values()]
        .filter(
          ({ memory: m }) =>
            shown(m, { ...body, include_archived: body.include_archived || archivedOnly }) &&
            (!archivedOnly || m.archived_at !== undefined) &&
            (!list("scopes")?.length || list("scopes")!.includes(m.scope as string)) &&
            (!list("fact_types")?.length || list("fact_types")!.includes(m.fact_type as string)) &&
            (!list("visibility")?.length ||
              list("visibility")!.includes((m.visibility as string | undefined) ?? "private")) &&
            (!list("memory_ids") || list("memory_ids")!.includes(m.memory_id)) &&
            (!wantedTopics?.length || topicNames(m).some((t) => wantedTopics.includes(t))) &&
            (body.updated_after === undefined ||
              (m.updated_at as number) > (body.updated_after as number))
        )
        .map((s) => ({ s, at: [key(s), s.memory.memory_id] as [number, string] }))
        .filter(({ at }) => !after || sign * compare(at, after) > 0)
        .sort((a, b) => sign * compare(a.at, b.at));
      const page = ordered.slice(0, limit);
      const last = page.length ? page[page.length - 1].at : after;
      const cursorAt = (at: [number, string]) => JSON.stringify({ order, at });
      return json(200, {
        items: page.map(({ s }) => out(s, !!body.include_embeddings)),
        ...(page.length === limit && { next_cursor: cursorAt(last!) }),
        ...(order === "changed" && last && { changes_cursor: cursorAt(last) }),
      });
    }
    if (path === "/memories/batch") {
      const writes = body.writes as { expected_version: number; memory: Row }[];
      if (body.key_id !== keyId) return problem(409, "key_mismatch");
      if (conflicting(writes)) return problem(409, "version_conflict");
      return json(200, { items: writes.map(apply).map((s) => out(s)) });
    }
    const single = path.match(/^\/memories\/(.+)$/);
    if (single) {
      const id = decodeURIComponent(single[1]);
      if (method === "GET") {
        const stored = rows.get(id);
        return stored ? json(200, out(stored)) : problem(404, "not_found");
      }
      const write = body as unknown as { expected_version: number; memory: Row; key_id: string };
      if (write.key_id !== keyId) return problem(409, "key_mismatch");
      if (conflicting([write])) return problem(409, "version_conflict");
      return json(200, out(apply(write)));
    }
    if (path === "/candidates") {
      const query = body.embedding as number[];
      const scopes = body.scopes as string[] | undefined;
      const ids = body.memory_ids as string[] | undefined;
      const factTypes = body.fact_types as string[] | undefined;
      const model = body.embedding_model as string | undefined;
      const eligible = [...rows.values()].filter(
        ({ memory: m }) =>
          shown(m, body) &&
          (!body.deleted_only || m.is_deleted) &&
          (!scopes?.length || scopes.includes(m.scope as string)) &&
          (!ids || ids.includes(m.memory_id)) &&
          (!factTypes?.length || factTypes.includes(m.fact_type as string))
      );
      const compatible = eligible.filter(
        ({ memory: m }) =>
          m.embedding && (!model || !m.embedding_model || m.embedding_model === model)
      );
      const ranked = compatible
        .map((s) => ({ ...out(s), score: cosine(query, s.memory.embedding as number[]) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, (body.limit as number) ?? 100);
      const forced = eligible
        .filter(
          (s) =>
            (body.force_ids as string[]).includes(s.memory.memory_id) &&
            !ranked.some((r) => r.memory.memory_id === s.memory.memory_id)
        )
        .map((s) => out(s));
      return json(200, {
        items: [...ranked, ...forced],
        ...(body.with_counts === true && {
          total_count: eligible.length,
          unavailable_count: eligible.length - compatible.length,
        }),
      });
    }
    return problem(404, "no_route");
  });
  const touch = (id: string, patch: Partial<Row>) => {
    const current = rows.get(id)!;
    rows.set(id, {
      ...current,
      memory: { ...current.memory, ...patch },
      version: current.version + 1,
      seq: ++writes,
    });
  };
  return { rows, fetch, touch };
}

async function remoteStore(
  nearby?: ReturnType<typeof fakeNearby>,
  ring?: MemoryKeyRing,
  pollIntervalMs = 60_000
) {
  const keys = ring ?? (await deriveMemoryKeyRing(`0x${"c3".repeat(65)}`));
  const server = nearby ?? fakeNearby(keys.keyId);
  const persistence = await createRemoteMemoryPersistence({
    baseUrl: "https://nearby.test",
    getToken: async () => "token",
    keyId: keys.keyId,
    ...memoryCipher(keys),
    fetch: server.fetch as unknown as typeof globalThis.fetch,
  });
  const store = createRemoteMemoryStore({
    persistence,
    embeddingOptions: { apiKey: "test-key" },
    graphRanking: async () => [],
    temporalRanking: async () => [],
    pollIntervalMs,
  });
  return { store, server, keys };
}

runMemoryStoreContract(async () => (await remoteStore()).store, { vectors: [axis(0), axis(1)] });

describe("remote MemoryStore", () => {
  it("dual-writes level with scope on create and update", async () => {
    const { store, server } = await remoteStore();
    const m = await store.create({ content: "Likes jazz", scope: "shared" });
    expect(server.rows.get(m.uniqueId)!.memory).toMatchObject({
      scope: "shared",
      level: "matching",
    });
    await store.update(m.uniqueId, { content: "Likes jazz", scope: "private" });
    expect(server.rows.get(m.uniqueId)!.memory).toMatchObject({
      scope: "private",
      level: "private",
    });
  });

  it("stores only ciphertext on nearby", async () => {
    const { store, server } = await remoteStore();
    const m = await store.create({ content: "Allergic to shellfish" });
    expect(String(server.rows.get(m.uniqueId)!.memory.content)).toMatch(/^enc:v3:/);
    expect((await store.get(m.uniqueId))?.content).toBe("Allergic to shellfish");
  });

  it("commits createMany above 50 in batches of 50, in input order", async () => {
    const { store, server } = await remoteStore();
    const inputs = Array.from({ length: 120 }, (_, i) => ({
      content: `Fact ${i}`,
      embedding: axis(0),
    }));
    const created = await store.createMany(inputs);
    expect(created.map((m) => m.content)).toEqual(inputs.map((input) => input.content));
    expect(server.rows.size).toBe(120);
    const batches = server.fetch.mock.calls.filter(([input]) =>
      String(input).endsWith("/memories/batch")
    );
    expect(
      batches.map(
        ([, init]) => (JSON.parse(String(init!.body)) as { writes: unknown[] }).writes.length
      )
    ).toEqual([50, 50, 20]);
  });

  it("reports the committed memories when a later createMany batch fails", async () => {
    const { store, server } = await remoteStore();
    const original = server.fetch.getMockImplementation()!;
    let batches = 0;
    server.fetch.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/memories/batch") && ++batches === 3)
        return new Response(JSON.stringify({ code: "boom", detail: "boom" }), { status: 500 });
      return original(input, init);
    });
    const inputs = Array.from({ length: 120 }, (_, i) => ({
      content: `Fact ${i}`,
      embedding: axis(0),
    }));
    const error = await store.createMany(inputs).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RemoteMemoryPartialCreateError);
    const partial = error as RemoteMemoryPartialCreateError;
    expect(partial.created.map((m) => m.content)).toEqual(
      inputs.slice(0, 100).map((i) => i.content)
    );
    expect(partial.cause).toMatchObject({ status: 500 });
    expect(server.rows.size).toBe(100);
  });

  it("filters list, archive and topic reads on nearby instead of reading the vault", async () => {
    const { store, server } = await remoteStore();
    const work = await store.create({
      content: "Ships the release",
      scope: "work",
      embedding: axis(0),
    });
    await store.create({ content: "Likes jazz", embedding: axis(1) });
    await store.setTopics(work.uniqueId, ["  Mt HOOD "]);
    for (let i = 0; i < 5; i++) await store.create({ content: `Filler ${i}`, embedding: axis(2) });
    server.fetch.mockClear();

    expect((await store.list({ scopes: ["work"] })).map((m) => m.uniqueId)).toEqual([
      work.uniqueId,
    ]);
    expect((await store.list({ limit: 2 })).length).toBe(2);
    expect(await store.memoriesByTopics(["mt hood"])).toEqual(
      new Map([[work.uniqueId, new Set(["mt hood"])]])
    );
    await store.archive(work.uniqueId);
    expect((await store.listArchived()).map((m) => m.uniqueId)).toEqual([work.uniqueId]);

    const queries = server.fetch.mock.calls
      .filter(([input]) => String(input).endsWith("/memories/query"))
      .map(([, init]) => JSON.parse(String(init!.body)) as Record<string, unknown>);
    expect(queries).toEqual([
      expect.objectContaining({ scopes: ["work"], order: "created" }),
      expect.objectContaining({ limit: 2 }),
      expect.objectContaining({ topics: ["mt hood"] }),
      expect.objectContaining({ archived_only: true, order: "archived" }),
    ]);
    expect(server.fetch.mock.calls.some(([input]) => /\/memories\?/.test(String(input)))).toBe(
      false
    );
  });

  it("polls only rows written since the last poll and ignores another device's re-embed", async () => {
    const ring = await deriveMemoryKeyRing(`0x${"f6".repeat(65)}`);
    const shared = fakeNearby(ring.keyId);
    const { store: laptop } = await remoteStore(shared, ring);
    const seeded = await laptop.create({ content: "Lives in Porto", embedding: axis(0) });
    const { store: phone } = await remoteStore(shared, ring, 20);
    const onChange = vi.fn();
    const onEmbedding = vi.fn();
    const stopChange = phone.subscribe(onChange);
    const stopEmbedding = phone.subscribe(onEmbedding, { embeddings: true });
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      shared.touch(seeded.uniqueId, { embedding: JSON.parse(axis(1)) as number[] });
      await vi.waitFor(() => expect(onEmbedding).toHaveBeenCalled());
      expect(onChange).not.toHaveBeenCalled();

      shared.fetch.mockClear();
      await laptop.update(seeded.uniqueId, { content: "Lives in Lisbon", embedding: axis(2) });
      await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
      const polls = shared.fetch.mock.calls
        .filter(([input]) => String(input).endsWith("/memories/query"))
        .map(([, init]) => JSON.parse(String(init!.body)) as Record<string, unknown>);
      expect(polls.length).toBeGreaterThan(0);
      expect(
        polls.every((body) => body.order === "changed" && typeof body.cursor === "string")
      ).toBe(true);
    } finally {
      stopChange();
      stopEmbedding();
    }
  });

  it("refuses to supersede a profile memory", async () => {
    const { store, server } = await remoteStore();
    const profile = await store.create({ content: "Works as a nurse" });
    server.rows.get(profile.uniqueId)!.memory.kind = "occupation";
    const next = await store.create({ content: "Works as a doctor" });
    expect(await store.supersede(profile.uniqueId, next.uniqueId)).toBe(false);
  });

  it("skips rows it cannot decrypt instead of failing the whole list", async () => {
    const { store, server, keys } = await remoteStore();
    const readable = await store.create({ content: "Readable" });
    const foreign = await deriveMemoryKeyRing(`0x${"d4".repeat(65)}`);
    server.rows.set("foreign", {
      memory: {
        memory_id: "foreign",
        content: await memoryCipher(foreign).encrypt("Unreadable"),
        scope: "private",
        created_at: 1,
        updated_at: 1,
        is_deleted: false,
      },
      version: 1,
      server_updated_at: new Date().toISOString(),
    });
    const warn = vi.spyOn(getLogger(), "warn");
    try {
      expect((await store.list()).map((m) => m.uniqueId)).toEqual([readable.uniqueId]);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
    expect(keys.keyId).not.toBe(foreign.keyId);
  });

  it("splits scope and fact type filters above nearby's limit of 20", async () => {
    const { store, server } = await remoteStore();
    const scopes = Array.from({ length: 21 }, (_, i) => `scope-${i}`);
    const factTypes = ["identity", ...Array.from({ length: 19 }, (_, i) => `type-${i}`), "plan"];
    const last = await store.create({ content: "Last", scope: "scope-20", factType: "plan" });
    const first = await store.create({ content: "First", scope: "scope-0", factType: "identity" });
    await store.create({ content: "Elsewhere", scope: "other", factType: "identity" });
    server.fetch.mockClear();

    expect((await store.list({ scopes, factTypes })).map((m) => m.uniqueId)).toEqual([
      first.uniqueId,
      last.uniqueId,
    ]);
    const bodies = server.fetch.mock.calls
      .filter(([input]) => String(input).endsWith("/memories/query"))
      .map(([, init]) => JSON.parse(String(init!.body)) as Record<string, string[]>);
    expect(bodies).toHaveLength(4);
    expect(bodies.every((b) => b.scopes.length <= 20 && b.fact_types.length <= 20)).toBe(true);
  });

  it("retries a changed row it could not decrypt on the next poll", async () => {
    const ring = await deriveMemoryKeyRing(`0x${"f6".repeat(65)}`);
    const shared = fakeNearby(ring.keyId);
    const { store: laptop } = await remoteStore(shared, ring);
    const seeded = await laptop.create({ content: "Lives in Porto", embedding: axis(0) });
    const cipher = memoryCipher(ring);
    let unreadable = false;
    const persistence = await createRemoteMemoryPersistence({
      baseUrl: "https://nearby.test",
      getToken: async () => "token",
      keyId: ring.keyId,
      encrypt: cipher.encrypt,
      decrypt: async (value) => (unreadable ? value : cipher.decrypt(value)),
      fetch: shared.fetch as unknown as typeof globalThis.fetch,
    });
    const phone = createRemoteMemoryStore({
      persistence,
      embeddingOptions: { apiKey: "test-key" },
      graphRanking: async () => [],
      temporalRanking: async () => [],
      pollIntervalMs: 20,
    });
    const onChange = vi.fn();
    const warn = vi.spyOn(getLogger(), "warn");
    const unsubscribe = phone.subscribe(onChange);
    try {
      await new Promise((resolve) => setTimeout(resolve, 40));
      unreadable = true;
      await laptop.update(seeded.uniqueId, { content: "Lives in Lisbon", embedding: axis(1) });
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(onChange).not.toHaveBeenCalled();
      unreadable = false;
      await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    } finally {
      unsubscribe();
      warn.mockRestore();
    }
  });

  it("surfaces a concurrent edit as a version conflict", async () => {
    const { store, server } = await remoteStore();
    const m = await store.create({ content: "Drinks coffee", embedding: axis(0) });
    const original = server.fetch.getMockImplementation()!;
    server.fetch.mockImplementationOnce(async (input, init) => {
      const response = await original(input, init);
      server.rows.get(m.uniqueId)!.version++;
      return response;
    });
    await expect(
      store.update(m.uniqueId, { content: "Drinks tea", embedding: axis(1) })
    ).rejects.toMatchObject({ code: "version_conflict" });
  });

  it("polls nearby so a subscriber sees another device's write", async () => {
    const ring = await deriveMemoryKeyRing(`0x${"e5".repeat(65)}`);
    const shared = fakeNearby(ring.keyId);
    const { store: phone } = await remoteStore(shared, ring, 20);
    const { store: laptop } = await remoteStore(shared, ring);
    const onChange = vi.fn();
    const unsubscribe = phone.subscribe(onChange);
    try {
      await new Promise((resolve) => setTimeout(resolve, 40));
      await laptop.create({ content: "Moved to Lisbon", embedding: axis(2) });
      await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    } finally {
      unsubscribe();
    }
  });
});
