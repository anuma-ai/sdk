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
import { createRemoteMemoryStore } from "./remoteStore";

type Row = Record<string, unknown> & { memory_id: string; content: string };
interface Stored {
  memory: Row;
  version: number;
  server_updated_at: string;
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
    return { ...stored, memory };
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
  return { rows, fetch };
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

  it("rejects createMany above the batch limit without writing", async () => {
    const { store, server } = await remoteStore();
    await expect(
      store.createMany(Array.from({ length: 51 }, (_, i) => ({ content: `Fact ${i}` })))
    ).rejects.toThrow(/at most 50/);
    expect(server.rows.size).toBe(0);
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
