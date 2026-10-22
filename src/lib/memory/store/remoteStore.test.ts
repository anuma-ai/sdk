import { describe, expect, it, vi } from "vitest";

vi.mock("../../memoryEngine/embeddings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../memoryEngine/embeddings")>();
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
    EmbeddingHttpError: actual.EmbeddingHttpError,
    isFatalEmbeddingError: actual.isFatalEmbeddingError,
  };
});

import { parseTopics } from "../../db/entities/types";
import { TOPICS_EXTRACTION_VERSION } from "../../db/memoryVault/operations";
import { getLogger } from "../../logger";
import { DEFAULT_API_EMBEDDING_MODEL } from "../../memoryEngine/constants";
import { EmbeddingHttpError, generateEmbeddings } from "../../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../../memoryEngine/types";
import { parseQueryTimeWindow, scoreEventTimeOverlap } from "../queryTemporal";
import { fakeTopicLlm, runMemoryStoreContract } from "./contract";
import { deriveMemoryKeyRing, memoryCipher, type MemoryKeyRing } from "./memoryKeys";
import { createRemoteMemoryPersistence } from "./remotePersistence";
import {
  createRemoteMemoryStore,
  RemoteMemoryPartialCreateError,
  type RemoteMemoryStoreOptions,
} from "./remoteStore";

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
  const catalog = new Map<
    string,
    { name: string; kind?: string; version: number; is_deleted: boolean; server_updated_at: string }
  >();
  let writes = 0;
  const leases = new Map<
    string,
    { kind: string; token: string; processor_version: string; expires_at: string }
  >();
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
    if (path === "/account")
      return json(200, { state: "active", key_id: keyId, realtime_changes: true });
    if (path === "/work/claim") {
      const kind = String(body.kind);
      const current = leases.get(kind);
      if (body.token) {
        if (
          !current ||
          current.token !== body.token ||
          Date.parse(current.expires_at) <= Date.now()
        )
          return json(200, {});
        current.expires_at = new Date(Date.now() + 120_000).toISOString();
        return json(200, { lease: current });
      }
      if (current && Date.parse(current.expires_at) > Date.now()) return json(200, {});
      const lease = {
        kind,
        token: crypto.randomUUID(),
        processor_version: String(body.processor_version),
        expires_at: new Date(Date.now() + 120_000).toISOString(),
      };
      leases.set(kind, lease);
      return json(200, { lease });
    }
    if (path === "/work/release") {
      if (leases.get(String(body.kind))?.token === body.token) leases.delete(String(body.kind));
      return json(200, {});
    }

    if (path === "/topics") {
      if (method === "GET")
        return json(200, {
          items: [...catalog.values()].sort((a, b) => a.name.localeCompare(b.name)),
        });
      const value = body.topic as { name: string; kind?: string; is_deleted: boolean };
      const current = catalog.get(value.name);
      if ((current?.version ?? 0) !== body.expected_version)
        return problem(409, "version_conflict");
      const saved = {
        ...value,
        version: (current?.version ?? 0) + 1,
        server_updated_at: new Date().toISOString(),
      };
      catalog.set(value.name, saved);
      return json(200, saved);
    }
    if (path === "/topics/import") {
      for (const value of body.topics as { name: string; kind?: string }[])
        if (!catalog.has(value.name))
          catalog.set(value.name, {
            ...value,
            version: 1,
            is_deleted: false,
            server_updated_at: new Date().toISOString(),
          });
      return json(200, {});
    }

    if (path === "/counts") {
      const memories = [...rows.values()].map((r) => r.memory);
      return json(200, {
        live: memories.filter((m) => shown(m, {})).length,
        archived: memories.filter(
          (m) => shown(m, { include_archived: true }) && m.archived_at !== undefined
        ).length,
        quarantined: memories.filter(
          (m) => shown(m, { include_quarantined: true }) && m.trust_tier === "quarantined"
        ).length,
      });
    }
    if (path === "/temporal") {
      const window = { start: Number(body.start), end: Number(body.end), matchedPhrase: "" };
      return json(200, {
        items: [...rows.values()]
          .filter((r) => shown(r.memory, {}))
          .map(({ memory: m }) => ({
            memory_id: m.memory_id,
            score: scoreEventTimeOverlap(
              (m.event_time_start as number) ?? null,
              (m.event_time_end as number) ?? null,
              (m.event_time_kind as string) ?? null,
              window
            ),
          }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score || a.memory_id.localeCompare(b.memory_id))
          .slice(0, Number(body.limit ?? 100)),
      });
    }
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
              (m.updated_at as number) > (body.updated_after as number)) &&
            (body.topics_due === undefined ||
              (m.topics_user_managed !== true &&
                (m.topics_extracted_at == null ||
                  (m.updated_at as number) > (m.topics_extracted_at as number) ||
                  ((m.topics_extracted_version as number | undefined) ?? 0) <
                    (body.topics_due as number)))) &&
            (body.topics_extracted === undefined ||
              (m.topics_extracted_at != null) === body.topics_extracted) &&
            (!body.event_time_overlaps ||
              inEventWindow(m, body.event_time_overlaps as { start: number; end: number }))
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
      if (
        body.lease_token &&
        ![...leases.values()].some(
          (lease) => lease.token === body.lease_token && Date.parse(lease.expires_at) > Date.now()
        )
      )
        return problem(409, "work_lease_expired");

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
  return { rows, catalog, leases, fetch, touch };
}

async function remoteStore(
  nearby?: ReturnType<typeof fakeNearby>,
  ring?: MemoryKeyRing,
  pollIntervalMs = 60_000,
  embeddingOverrides: Pick<EmbeddingOptions, "maskInput"> = {},
  activity?: RemoteMemoryStoreOptions["activity"],
  subscribeChanges?: RemoteMemoryStoreOptions["subscribeChanges"]
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
    embeddingOptions: { apiKey: "test-key", ...embeddingOverrides },
    graphRanking: async () => [],
    temporalRanking: async () => [],
    pollIntervalMs,
    activity,
    subscribeChanges,
  });
  return { store, server, keys };
}

runMemoryStoreContract(
  async (overrides) => (await remoteStore(undefined, undefined, 60_000, overrides)).store,
  { vectors: [axis(0), axis(1)] }
);

describe("remote MemoryStore", () => {
  it("shares concurrent memory pages without sharing different filters", async () => {
    const { store, server } = await remoteStore();
    await store.createMany(
      Array.from({ length: 205 }, (_, i) => ({ content: `Fact ${i}`, embedding: axis(0) }))
    );
    server.fetch.mockClear();
    const lists = await Promise.all([store.list(), store.list(), store.list()]);
    expect(lists.map((rows) => rows.length)).toEqual([205, 205, 205]);
    expect(server.fetch).toHaveBeenCalledTimes(2);
    server.fetch.mockClear();
    const projections = await Promise.all([store.listProjections(), store.listProjections()]);
    expect(projections.map((rows) => rows.length)).toEqual([205, 205]);
    expect(server.fetch).toHaveBeenCalledTimes(2);
    server.fetch.mockClear();
    const [privateRows, sharedRows] = await Promise.all([
      store.list({ scopes: ["private"] }),
      store.list({ scopes: ["shared"] }),
    ]);
    expect(privateRows).toHaveLength(205);
    expect(sharedRows).toHaveLength(0);
    expect(server.fetch).toHaveBeenCalledTimes(3);
  });

  it("does not join a pre-write read after a committed mutation", async () => {
    const { store, server } = await remoteStore();
    await store.create({ content: "Before", embedding: axis(0) });
    const original = server.fetch.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let captured!: () => void;
    const started = new Promise<void>((resolve) => {
      captured = resolve;
    });
    server.fetch.mockImplementationOnce(async (...args) => {
      const response = await original(...args);
      captured();
      await gate;
      return response;
    });
    const old = store.list();
    try {
      await started;
      await store.create({ content: "After", embedding: axis(0) });
      expect(await store.list()).toHaveLength(2);
    } finally {
      release();
    }
    expect(await old).toHaveLength(1);
  });

  it("retries a failed shared read on the next call", async () => {
    const { store, server } = await remoteStore();
    server.fetch.mockResolvedValueOnce(Response.json({ detail: "Unavailable" }, { status: 503 }));
    const failed = await Promise.allSettled([store.list(), store.list()]);
    expect(failed.map((result) => result.status)).toEqual(["rejected", "rejected"]);
    expect(await store.list()).toEqual([]);
  });

  it("supports native-like globals with window but no document", async () => {
    const { store } = await remoteStore();
    let stop = () => {};
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", undefined);
    try {
      expect(() => {
        stop = store.subscribe(vi.fn());
      }).not.toThrow();
    } finally {
      stop();
      vi.unstubAllGlobals();
    }
  });

  it("keeps normal polling when the server does not advertise realtime changes", async () => {
    const ring = await deriveMemoryKeyRing(`0x${"e5".repeat(65)}`);
    const server = fakeNearby(ring.keyId);
    server.fetch.mockResolvedValueOnce(Response.json({ state: "active", key_id: ring.keyId }));
    const subscribeChanges = vi.fn(() => () => {});
    const { store } = await remoteStore(server, ring, 60_000, {}, undefined, subscribeChanges);
    server.fetch.mockClear();
    vi.useFakeTimers();
    const stop = store.subscribe(vi.fn());
    try {
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(server.fetch).toHaveBeenCalledTimes(2);
      expect(subscribeChanges).not.toHaveBeenCalled();
    } finally {
      stop();
      vi.useRealTimers();
    }
  });

  it("pauses inactive polling and resumes from the last cursor across subscription gaps", async () => {
    let active = false;
    const listeners = new Set<() => void>();
    const { store, server } = await remoteStore(
      undefined,
      undefined,
      20,
      {},
      {
        isActive: () => active,
        subscribe: (listener) => {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
      }
    );
    await store.create({ content: "Existing", embedding: axis(0) });
    server.fetch.mockClear();
    vi.useFakeTimers();
    let stop = store.subscribe(vi.fn());
    try {
      await vi.advanceTimersByTimeAsync(200);
      expect(server.fetch).not.toHaveBeenCalled();
      active = true;
      listeners.forEach((listener) => listener());
      await vi.waitFor(() =>
        expect(
          server.fetch.mock.calls.some(([, init]) => JSON.parse(String(init?.body)).cursor)
        ).toBe(true)
      );
      await vi.advanceTimersByTimeAsync(0);
      stop();
      expect(listeners.size).toBe(0);
      server.fetch.mockClear();
      stop = store.subscribe(vi.fn());
      await vi.waitFor(() => expect(server.fetch).toHaveBeenCalled());
      expect(JSON.parse(String(server.fetch.mock.calls[0][1]?.body))).toMatchObject({
        order: "changed",
        cursor: expect.any(String),
      });
      active = false;
      listeners.forEach((listener) => listener());
      await vi.advanceTimersByTimeAsync(0);
      server.fetch.mockClear();
      await vi.advanceTimersByTimeAsync(200);
      expect(server.fetch).not.toHaveBeenCalled();
    } finally {
      stop();
      vi.useRealTimers();
    }
  });

  it("coalesces realtime changes and retains slower recovery polling while connected", async () => {
    let changed = (_connected: boolean) => {};
    const release = vi.fn();
    const { store, server } = await remoteStore(
      undefined,
      undefined,
      60_000,
      {},
      undefined,
      (listener) => {
        changed = listener;
        return release;
      }
    );
    server.fetch.mockClear();
    vi.useFakeTimers();
    const stop = store.subscribe(vi.fn());
    try {
      await vi.advanceTimersByTimeAsync(0);
      expect(server.fetch).toHaveBeenCalledTimes(1);
      changed(true);
      await vi.advanceTimersByTimeAsync(200);
      expect(server.fetch).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(server.fetch).toHaveBeenCalledTimes(2);
      for (let i = 0; i < 10; i++) changed(true);
      await vi.advanceTimersByTimeAsync(200);
      expect(server.fetch).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(5 * 60_000);
      expect(server.fetch).toHaveBeenCalledTimes(4);
      changed(false);
      await vi.advanceTimersByTimeAsync(0);
      expect(server.fetch).toHaveBeenCalledTimes(5);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(server.fetch).toHaveBeenCalledTimes(6);
    } finally {
      stop();
      vi.useRealTimers();
    }
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("keeps the refresh gap when a realtime marker arrives during an in-flight poll", async () => {
    let changed = (_connected: boolean) => {};
    const { store, server } = await remoteStore(
      undefined,
      undefined,
      60_000,
      {},
      undefined,
      (listener) => {
        changed = listener;
        return () => {};
      }
    );
    const original = server.fetch.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.fetch.mockImplementationOnce(async (...args) => {
      await gate;
      return original(...args);
    });
    server.fetch.mockClear();
    vi.useFakeTimers();
    const stop = store.subscribe(vi.fn());
    try {
      await vi.advanceTimersByTimeAsync(0);
      expect(server.fetch).toHaveBeenCalledTimes(1);
      changed(true);
      release();
      await vi.advanceTimersByTimeAsync(0);
      expect(server.fetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(199);
      expect(server.fetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(server.fetch).toHaveBeenCalledTimes(2);
    } finally {
      release();
      stop();
      vi.useRealTimers();
    }
  });

  it("does not postpone refresh indefinitely during continuous realtime changes", async () => {
    let changed = (_connected: boolean) => {};
    const { store, server } = await remoteStore(
      undefined,
      undefined,
      60_000,
      {},
      undefined,
      (listener) => {
        changed = listener;
        return () => {};
      }
    );
    server.fetch.mockClear();
    vi.useFakeTimers();
    const stop = store.subscribe(vi.fn());
    try {
      await vi.advanceTimersByTimeAsync(0);
      for (let i = 0; i < 10; i++) {
        changed(true);
        await vi.advanceTimersByTimeAsync(100);
      }
      expect(server.fetch.mock.calls.length).toBeGreaterThanOrEqual(5);
    } finally {
      stop();
      vi.useRealTimers();
    }
  });

  it("honors Retry-After even when activity resumes before the cooldown expires", async () => {
    let refresh = () => {};
    const { store, server } = await remoteStore(
      undefined,
      undefined,
      20,
      {},
      {
        isActive: () => true,
        subscribe: (listener) => {
          refresh = listener;
          return () => {};
        },
      }
    );
    server.fetch.mockClear();
    server.fetch.mockResolvedValueOnce(
      Response.json(
        { code: "rate_limited" },
        {
          status: 429,
          headers: { "Retry-After": "2" },
        }
      )
    );
    vi.useFakeTimers();
    const stop = store.subscribe(vi.fn());
    try {
      await vi.advanceTimersByTimeAsync(0);
      expect(server.fetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1_000);
      refresh();
      await vi.advanceTimersByTimeAsync(500);
      expect(server.fetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(500);
      expect(server.fetch).toHaveBeenCalledTimes(2);
    } finally {
      stop();
      vi.useRealTimers();
    }
  });
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

  it("lists projections without vectors when asked, and with them by default", async () => {
    const { store, server } = await remoteStore();
    const m = await store.create({ content: "Likes jazz", embedding: axis(1) });
    server.fetch.mockClear();

    const lean = await store.listProjections({ withEmbeddings: false });
    const full = await store.listProjections();

    expect(lean.map((p) => [p.uniqueId, p.embedding])).toEqual([[m.uniqueId, null]]);
    expect(full[0].embedding).not.toBeNull();
    const queries = server.fetch.mock.calls
      .filter(([input]) => String(input).endsWith("/memories/query"))
      .map(([, init]) => JSON.parse(String(init!.body)) as Record<string, unknown>);
    expect(queries.map((q) => q.include_embeddings)).toEqual([false, true]);
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

  it("reads only due rows for the topic backlog, edited rows first", async () => {
    const { store, server } = await remoteStore();
    const done = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    const fresh = await store.create({ content: "Likes jazz", embedding: axis(1) });
    const edited = await store.create({ content: "Lives in Lisbon", embedding: axis(2) });
    const curated = await store.create({ content: "Plays chess", embedding: axis(3) });
    await store.topicMaintenance.stampTopicsExtracted([done.uniqueId], Date.now());
    await store.topicMaintenance.stampTopicsExtracted([edited.uniqueId], Date.now() - 1000);
    await store.update(edited.uniqueId, { content: "Lives in Porto", embedding: axis(2) });
    await store.setTopics(curated.uniqueId, ["Chess"]);
    const outdated = await store.create({ content: "Drinks tea", embedding: axis(4) });
    await store.topicMaintenance.stampTopicsExtracted([outdated.uniqueId], Date.now() + 1000, 2);
    server.fetch.mockClear();

    expect((await store.topicMaintenance.getTopicBacklog()).pending.map((p) => p.uniqueId)).toEqual(
      [outdated.uniqueId, edited.uniqueId, fresh.uniqueId]
    );
    const queries = server.fetch.mock.calls
      .filter(([input]) => String(input).endsWith("/memories/query"))
      .map(([, init]) => JSON.parse(String(init!.body)) as Record<string, unknown>);
    expect(queries).toEqual([
      expect.objectContaining({ topics_due: TOPICS_EXTRACTION_VERSION, topics_extracted: true }),
      expect.objectContaining({ topics_due: TOPICS_EXTRACTION_VERSION, topics_extracted: false }),
    ]);
  });

  it("reads at most the backlog limit, skipping never-extracted rows when edited ones fill it", async () => {
    const { store, server } = await remoteStore();
    const edited: string[] = [];
    for (const content of ["Lives in Lisbon", "Likes jazz", "Plays chess"]) {
      const m = await store.create({ content, embedding: axis(0) });
      await store.topicMaintenance.stampTopicsExtracted([m.uniqueId], Date.now() - 1000);
      await store.update(m.uniqueId, { content: `${content}!`, embedding: axis(0) });
      edited.push(m.uniqueId);
    }
    await store.create({ content: "Hikes Mt Hood", embedding: axis(1) });
    server.fetch.mockClear();

    const pending = (await store.topicMaintenance.getTopicBacklog({ limit: 2 })).pending;
    expect(pending.map((p) => p.uniqueId)).toEqual([edited[2], edited[1]]);
    const queries = server.fetch.mock.calls
      .filter(([input]) => String(input).endsWith("/memories/query"))
      .map(([, init]) => JSON.parse(String(init!.body)) as Record<string, unknown>);
    expect(queries).toEqual([expect.objectContaining({ topics_extracted: true, limit: 2 })]);
  });

  it("fills the rest of the backlog limit with never-extracted rows", async () => {
    const { store, server } = await remoteStore();
    const edited = await store.create({ content: "Lives in Lisbon", embedding: axis(0) });
    await store.topicMaintenance.stampTopicsExtracted([edited.uniqueId], Date.now() - 1000);
    await store.update(edited.uniqueId, { content: "Lives in Porto", embedding: axis(0) });
    const fresh: string[] = [];
    for (const content of ["Likes jazz", "Plays chess", "Hikes Mt Hood"]) {
      fresh.push((await store.create({ content, embedding: axis(1) })).uniqueId);
    }
    server.fetch.mockClear();

    const pending = (await store.topicMaintenance.getTopicBacklog({ limit: 3 })).pending;
    expect(pending.map((p) => p.uniqueId)).toEqual([edited.uniqueId, fresh[2], fresh[1]]);
    const queries = server.fetch.mock.calls
      .filter(([input]) => String(input).endsWith("/memories/query"))
      .map(([, init]) => JSON.parse(String(init!.body)) as Record<string, unknown>);
    expect(queries).toEqual([
      expect.objectContaining({ topics_extracted: true, limit: 3 }),
      expect.objectContaining({ topics_extracted: false, limit: 2 }),
    ]);
  });

  const nearbyCalls = (server: { fetch: { mock: { calls: unknown[][] } } }) =>
    server.fetch.mock.calls.map(([input, init]) => {
      const path = new URL(String(input)).pathname.replace(/^.*\/api\/private-memories/, "");
      return `${(init as RequestInit | undefined)?.method ?? "GET"} ${path.replace(/^\/memories\/(?!query$|batch$).+/, "/memories/:id")}`;
    });
  const hikes = {
    "Hikes Mt Hood": [{ name: "Mt Hood", kind: "place" }],
    "Likes jazz": [{ name: "Jazz" }],
    "Plays chess": [{ name: "Chess" }],
  };

  it("writes a chunk's extracted topics and stamps with one read and one batch", async () => {
    const { store, server } = await remoteStore();
    const ids: string[] = [];
    for (const content of Object.keys(hikes))
      ids.push((await store.create({ content, embedding: axis(0) })).uniqueId);
    server.fetch.mockClear();

    const result = await store.topicMaintenance.extractTopics(ids, {
      apiKey: "k",
      fetchFn: fakeTopicLlm(hikes),
    });
    expect(result.stampedIds).toEqual(ids);
    expect(parseTopics(server.rows.get(ids[2])!.memory.topics as string)).toEqual([
      expect.objectContaining({ name: "Chess", source: "auto" }),
    ]);
    expect(nearbyCalls(server)).toEqual([
      "POST /work/claim",
      "POST /memories/query",
      "POST /memories/query",
      "POST /memories/query",
      "POST /memories/batch",
      "POST /work/release",
    ]);

    server.fetch.mockClear();
    expect(await store.topicMaintenance.stampTopicsExtracted(ids, Date.now())).toEqual(ids);
    expect(nearbyCalls(server)).toEqual(["POST /memories/query", "POST /memories/batch"]);
  });

  it("retries each memory on its own when another device wrote during the batch", async () => {
    const { store, server } = await remoteStore();
    const ids: string[] = [];
    for (const content of Object.keys(hikes))
      ids.push((await store.create({ content, embedding: axis(0) })).uniqueId);
    const handle = server.fetch.getMockImplementation()!;
    let raced = false;
    server.fetch.mockImplementation(async (input, init) => {
      if (!raced && String(input).endsWith("/memories/batch")) {
        raced = true;
        const other = server.rows.get(ids[1])!;
        other.memory.topics_user_managed = true;
        other.version += 1;
      }
      return handle(input, init);
    });

    const result = await store.topicMaintenance.extractTopics(ids, {
      apiKey: "k",
      fetchFn: fakeTopicLlm(hikes),
    });
    expect(result.stampedIds).toEqual([ids[0], ids[2]]);
    expect(Object.fromEntries(result.skippedReasons)).toEqual({ [ids[1]]: "link-declined" });
    expect(server.rows.get(ids[1])!.memory.topics_extracted_at).toBeUndefined();
    expect(server.rows.get(ids[2])!.memory.topics_extracted_at).toBeDefined();
  });

  it("finishes overlapping batches that list the same memories in opposite orders", async () => {
    const { store } = await remoteStore();
    const ids: string[] = [];
    for (const content of Object.keys(hikes))
      ids.push((await store.create({ content, embedding: axis(0) })).uniqueId);

    const [forward, backward] = await Promise.all([
      store.topicMaintenance.stampTopicsExtracted(ids, Date.now()),
      store.topicMaintenance.stampTopicsExtracted([...ids].reverse(), Date.now()),
    ]);
    expect(forward).toEqual(ids);
    expect(backward).toEqual([...ids].reverse());
  });

  it("does not stamp a memory deleted during the LLM call", async () => {
    const { store, server } = await remoteStore();
    const ids: string[] = [];
    for (const content of Object.keys(hikes))
      ids.push((await store.create({ content, embedding: axis(0) })).uniqueId);
    const llm = fakeTopicLlm(hikes);
    const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
      await store.delete(ids[0]);
      return llm(url as string, init);
    }) as unknown as typeof fetch;

    const result = await store.topicMaintenance.extractTopics(ids, { apiKey: "k", fetchFn });
    expect(result.stampedIds).toEqual([ids[1], ids[2]]);
    expect(result.skippedReasons.get(ids[0])).toBe("link-declined");
    expect(server.rows.get(ids[0])!.memory.topics_extracted_at).toBeUndefined();
    expect(await store.topicMaintenance.stampTopicsExtracted([ids[0]], Date.now())).toEqual([]);
    expect(server.rows.get(ids[0])!.memory.topics_extracted_at).toBeUndefined();
  });

  it("reports a memory that became unreadable during the LLM call as link-failed", async () => {
    const { store, server } = await remoteStore();
    const ids: string[] = [];
    for (const content of Object.keys(hikes))
      ids.push((await store.create({ content, embedding: axis(0) })).uniqueId);
    const foreign = memoryCipher(await deriveMemoryKeyRing(`0x${"d4".repeat(65)}`));
    const llm = fakeTopicLlm(hikes);
    const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
      server.rows.get(ids[0])!.memory.content = await foreign.encrypt("Hikes Mt Hood");
      return llm(url as string, init);
    }) as unknown as typeof fetch;

    const result = await store.topicMaintenance.extractTopics(ids, { apiKey: "k", fetchFn });
    expect(result.stampedIds).toEqual([ids[1], ids[2]]);
    expect(result.skippedReasons.get(ids[0])).toBe("link-failed");
    expect(await store.topicMaintenance.stampTopicsExtracted(ids, Date.now())).toEqual([
      ids[1],
      ids[2],
    ]);
  });

  it("reports a memory that vanished during the LLM call as link-failed", async () => {
    const { store, server } = await remoteStore();
    const ids: string[] = [];
    for (const content of Object.keys(hikes))
      ids.push((await store.create({ content, embedding: axis(0) })).uniqueId);
    const llm = fakeTopicLlm(hikes);
    const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
      server.rows.delete(ids[0]);
      return llm(url as string, init);
    }) as unknown as typeof fetch;

    const result = await store.topicMaintenance.extractTopics(ids, { apiKey: "k", fetchFn });
    expect(result.stampedIds).toEqual([ids[1], ids[2]]);
    expect(result.skippedReasons.get(ids[0])).toBe("link-failed");
  });

  it("keeps the batches that committed when a later one fails", async () => {
    const { store, server } = await remoteStore();
    const notes = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`Note ${i}`, []]));
    const ids: string[] = [];
    for (const content of Object.keys(notes))
      ids.push((await store.create({ content, embedding: axis(0) })).uniqueId);
    const handle = server.fetch.getMockImplementation()!;
    let batches = 0;
    server.fetch.mockImplementation(async (input, init) =>
      String(input).endsWith("/memories/batch") && ++batches === 2
        ? new Response(JSON.stringify({ detail: "boom" }), { status: 500 })
        : handle(input, init)
    );

    const result = await store.topicMaintenance.extractTopics(ids, {
      apiKey: "k",
      fetchFn: fakeTopicLlm(notes),
    });
    const last = [...ids].sort().at(-1)!;
    expect(result.stampedIds).toHaveLength(50);
    expect(Object.fromEntries(result.skippedReasons)).toEqual({ [last]: "link-failed" });
    expect(server.rows.get(last)!.memory.topics_extracted_at).toBeUndefined();
  });

  it("leaves lease-guarded work pending on rate limits and resumes on the next run", async () => {
    const { store, server } = await remoteStore();
    const ids: string[] = [];
    for (const content of Object.keys(hikes))
      ids.push((await store.create({ content, embedding: axis(0) })).uniqueId);
    const handle = server.fetch.getMockImplementation()!;
    server.fetch.mockImplementation(async (input, init) =>
      String(input).endsWith("/memories/batch")
        ? new Response(JSON.stringify({ detail: "slow down" }), { status: 429 })
        : handle(input, init)
    );

    const result = await store.topicMaintenance.extractTopics(ids, {
      apiKey: "k",
      fetchFn: fakeTopicLlm(hikes),
    });
    expect(result.stampedIds).toEqual([]);
    expect([...result.skippedReasons.values()]).toEqual(ids.map(() => "link-failed"));
    server.fetch.mockImplementation(handle);
    const retried = await store.topicMaintenance.extractTopics(ids, {
      apiKey: "k",
      fetchFn: fakeTopicLlm(hikes),
    });
    expect(retried.stampedIds).toEqual(ids);
  });

  it("reports every memory in a failed batch as link-failed", async () => {
    const { store, server } = await remoteStore();
    const ids: string[] = [];
    for (const content of Object.keys(hikes))
      ids.push((await store.create({ content, embedding: axis(0) })).uniqueId);
    const handle = server.fetch.getMockImplementation()!;
    server.fetch.mockImplementation(async (input, init) =>
      String(input).endsWith("/memories/batch")
        ? new Response(JSON.stringify({ detail: "boom" }), { status: 500 })
        : handle(input, init)
    );

    const result = await store.topicMaintenance.extractTopics(ids, {
      apiKey: "k",
      fetchFn: fakeTopicLlm(hikes),
    });
    expect(result.stampedIds).toEqual([]);
    expect([...result.skippedReasons.values()]).toEqual(ids.map(() => "link-failed"));
    expect(result.entitiesByMemory.size).toBe(0);
    expect(await store.topicMaintenance.stampTopicsExtracted(ids, Date.now())).toEqual([]);
  });

  it("keeps each extraction's token when a second run reclaims an expired lease", async () => {
    const { store, server } = await remoteStore();
    const memory = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    const llm = fakeTopicLlm(hikes);
    let finishFirst!: () => void;
    let finishSecond!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const secondGate = new Promise<void>((resolve) => {
      finishSecond = resolve;
    });
    const firstLlm = vi.fn(async (url: unknown, init?: RequestInit) => {
      await firstGate;
      return llm(url as string, init);
    });
    const secondLlm = vi.fn(async (url: unknown, init?: RequestInit) => {
      await secondGate;
      return llm(url as string, init);
    });
    const first = store.topicMaintenance.extractTopics([memory.uniqueId], {
      apiKey: "k",
      fetchFn: firstLlm as unknown as typeof fetch,
    });
    await vi.waitFor(() => expect(firstLlm).toHaveBeenCalled());
    server.leases.get("topics")!.expires_at = new Date(0).toISOString();
    const second = store.topicMaintenance.extractTopics([memory.uniqueId], {
      apiKey: "k",
      fetchFn: secondLlm as unknown as typeof fetch,
    });
    await vi.waitFor(() => expect(secondLlm).toHaveBeenCalled());
    finishFirst();
    const deferred = await first;
    expect(deferred.deferred).toBe(true);
    expect(deferred.stampedIds).toEqual([]);
    expect(deferred.skippedReasons.size).toBe(0);
    expect(server.leases.has("topics")).toBe(true);
    finishSecond();
    expect((await second).stampedIds).toEqual([memory.uniqueId]);
  });

  it("defers a lost topic renewal and never writes a late inference result", async () => {
    const { store, server } = await remoteStore(undefined, undefined, 0);
    const memory = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    const llm = fakeTopicLlm(hikes);
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const fetchFn = vi.fn(async (...args: Parameters<typeof fetch>) => {
      await gate;
      return llm(...args);
    });
    server.fetch.mockClear();
    vi.useFakeTimers();
    try {
      const running = store.topicMaintenance.extractTopics([memory.uniqueId], {
        apiKey: "k",
        fetchFn: fetchFn as typeof fetch,
      });
      await vi.waitFor(() => expect(fetchFn).toHaveBeenCalled());
      server.leases.delete("topics");
      await vi.advanceTimersByTimeAsync(30_000);
      const result = await running;
      expect(result.deferred).toBe(true);
      expect(result.skippedReasons.size).toBe(0);
      finish();
      await vi.advanceTimersByTimeAsync(0);
      expect(server.rows.get(memory.uniqueId)!.memory.topics_extracted_at).toBeUndefined();
      expect(server.fetch.mock.calls.some(([url]) => String(url).endsWith("/memories/batch"))).toBe(
        false
      );
    } finally {
      finish();
      vi.useRealTimers();
    }
    const retried = await store.topicMaintenance.extractTopics([memory.uniqueId], {
      apiKey: "k",
      fetchFn: llm,
    });
    expect(retried.stampedIds).toEqual([memory.uniqueId]);
  });

  it("does not write topics extracted from content that changed during the LLM call", async () => {
    const { store, server } = await remoteStore();
    const m = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    const llm = fakeTopicLlm({ "Hikes Mt Hood": [{ name: "Mt Hood", kind: "place" }] });
    const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
      await store.update(m.uniqueId, { content: "Hikes Mt Rainier", embedding: axis(0) });
      return llm(url as string, init);
    }) as unknown as typeof fetch;

    const result = await store.topicMaintenance.extractTopics([m.uniqueId], {
      apiKey: "k",
      fetchFn,
    });
    expect(result.skippedReasons.get(m.uniqueId)).toBe("link-declined");
    expect(server.rows.get(m.uniqueId)!.memory.topics).toBeUndefined();
    expect(server.rows.get(m.uniqueId)!.memory.topics_extracted_at).toBeUndefined();
    expect((await store.topicMaintenance.getTopicBacklog()).pending.map((p) => p.uniqueId)).toEqual(
      [m.uniqueId]
    );
  });

  it("reports a row it cannot decrypt as unreadable", async () => {
    const { store, server } = await remoteStore();
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
    const fetchFn = vi.fn() as unknown as typeof fetch;

    expect((await store.topicMaintenance.getTopicBacklog()).pending.map((p) => p.uniqueId)).toEqual(
      ["foreign"]
    );
    const result = await store.topicMaintenance.extractTopics(["foreign", "missing"], {
      apiKey: "k",
      fetchFn,
    });
    expect(Object.fromEntries(result.skippedReasons)).toEqual({
      foreign: "unreadable",
      missing: "not-found",
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("notifies subscribers for extracted topics but not for a bare stamp", async () => {
    const { store } = await remoteStore();
    const hike = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange, { topics: true });
    try {
      await store.topicMaintenance.stampTopicsExtracted([hike.uniqueId], Date.now());
      expect(onChange).not.toHaveBeenCalled();

      await store.topicMaintenance.extractTopics([hike.uniqueId], {
        apiKey: "k",
        fetchFn: fakeTopicLlm({ "Hikes Mt Hood": [{ name: "Mt Hood", kind: "place" }] }),
      });
      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });
  it("guards automatic topic links against manual curation and cancelled extraction", async () => {
    const { store } = await remoteStore();
    const memory = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    await store.setTopics(memory.uniqueId, ["Chosen topic"]);
    expect(
      await store.addTopics(memory.uniqueId, ["Mt Hood"], {
        unlessUserManaged: true,
      })
    ).toEqual([]);
    expect((await store.get(memory.uniqueId))?.topics?.map((topic) => topic.name)).toEqual([
      "Chosen topic",
    ]);
    await expect(
      store.addTopics(memory.uniqueId, ["Late topic"], {
        canWrite: async () => false,
      })
    ).rejects.toThrow("no longer eligible");
    const controller = new AbortController();
    controller.abort();
    await expect(
      store.addTopics(memory.uniqueId, ["Cancelled topic"], {
        signal: controller.signal,
      })
    ).rejects.toThrow();
    expect((await store.get(memory.uniqueId))?.topics?.map((topic) => topic.name)).toEqual([
      "Chosen topic",
    ]);
  });

  it("notifies when extraction drops a topic added during the LLM call", async () => {
    const { store } = await remoteStore();
    const hike = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    await store.addTopics(hike.uniqueId, [{ name: "Mt Hood", kind: "place" }]);
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange, { topics: true });
    const llm = fakeTopicLlm({ "Hikes Mt Hood": [{ name: "Mt Hood", kind: "place" }] });
    const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
      await store.addTopics(hike.uniqueId, ["Oregon"]);
      onChange.mockClear();
      return llm(url as string, init);
    }) as unknown as typeof fetch;
    try {
      await store.topicMaintenance.extractTopics([hike.uniqueId], { apiKey: "k", fetchFn });

      expect(await store.topicsByMemories([hike.uniqueId])).toEqual(
        new Map([[hike.uniqueId, new Set(["mt hood"])]])
      );
      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it("sees an edit made after extracting with a clock behind the row's", async () => {
    const { store, server } = await remoteStore();
    const hike = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    server.rows.get(hike.uniqueId)!.memory.updated_at = Date.now() + 60_000;
    await store.topicMaintenance.extractTopics([hike.uniqueId], {
      apiKey: "k",
      fetchFn: fakeTopicLlm({ "Hikes Mt Hood": [{ name: "Mt Hood", kind: "place" }] }),
    });
    expect((await store.topicMaintenance.getTopicBacklog()).pending).toEqual([]);
    await store.update(hike.uniqueId, { content: "Hikes Mt Rainier", embedding: axis(0) });
    expect((await store.topicMaintenance.getTopicBacklog()).pending).toEqual([
      { uniqueId: hike.uniqueId },
    ]);
  });

  it("keeps earlier slices' writes when a later slice cannot be re-read", async () => {
    const { store, server } = await remoteStore();
    const notes = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`Note ${i}`, []]));
    const ids: string[] = [];
    for (const content of Object.keys(notes))
      ids.push((await store.create({ content, embedding: axis(0) })).uniqueId);
    const last = [...ids].sort().at(-1)!;
    const handle = server.fetch.getMockImplementation()!;
    server.fetch.mockImplementation(async (input, init) => {
      const body = init?.body ? (JSON.parse(String(init.body)) as { memory_ids?: string[] }) : {};
      return String(input).endsWith("/memories/query") &&
        body.memory_ids?.length === 1 &&
        body.memory_ids[0] === last
        ? new Response(JSON.stringify({ detail: "boom" }), { status: 500 })
        : handle(input, init);
    });
    const warn = vi.spyOn(getLogger(), "warn");
    try {
      const result = await store.topicMaintenance.extractTopics(ids, {
        apiKey: "k",
        fetchFn: fakeTopicLlm(notes),
      });
      expect(result.stampedIds).toHaveLength(50);
      expect(Object.fromEntries(result.skippedReasons)).toEqual({ [last]: "link-failed" });
      expect(await store.topicMaintenance.stampTopicsExtracted(ids, Date.now())).toHaveLength(50);
    } finally {
      warn.mockRestore();
    }
  });

  it("does not notify when a memory with no topics extracts none", async () => {
    const { store } = await remoteStore();
    const tea = await store.create({ content: "Drinks tea", embedding: axis(0) });
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange, { topics: true });
    try {
      const result = await store.topicMaintenance.extractTopics([tea.uniqueId], {
        apiKey: "k",
        fetchFn: fakeTopicLlm({ "Drinks tea": [] }),
      });
      expect(result.stampedIds).toEqual([tea.uniqueId]);
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it("stamps no earlier than the row's update time when this clock runs behind", async () => {
    const { store } = await remoteStore();
    const hike = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    await store.topicMaintenance.extractTopics([hike.uniqueId], {
      apiKey: "k",
      fetchFn: fakeTopicLlm({ "Hikes Mt Hood": [{ name: "Mt Hood", kind: "place" }] }),
      now: Date.now() - 60_000,
    });
    expect((await store.topicMaintenance.getTopicBacklog()).pending).toEqual([]);
  });

  it("declines when the user curates topics during the LLM call", async () => {
    const { store } = await remoteStore();
    const hike = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    const llm = fakeTopicLlm({ "Hikes Mt Hood": [{ name: "Mt Hood", kind: "place" }] });
    const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
      await store.setTopics(hike.uniqueId, ["Oregon"]);
      return llm(url as string, init);
    }) as unknown as typeof fetch;
    const result = await store.topicMaintenance.extractTopics([hike.uniqueId], {
      apiKey: "k",
      fetchFn,
    });
    expect(result.skippedReasons.get(hike.uniqueId)).toBe("link-declined");
    expect(await store.topicsByMemories([hike.uniqueId])).toEqual(
      new Map([[hike.uniqueId, new Set(["oregon"])]])
    );
  });

  it("declines when the memory is deleted during the LLM call", async () => {
    const { store, server } = await remoteStore();
    const hike = await store.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    const llm = fakeTopicLlm({ "Hikes Mt Hood": [{ name: "Mt Hood", kind: "place" }] });
    const fetchFn = vi.fn(async (url: unknown, init?: RequestInit) => {
      await store.delete(hike.uniqueId);
      return llm(url as string, init);
    }) as unknown as typeof fetch;
    const result = await store.topicMaintenance.extractTopics([hike.uniqueId], {
      apiKey: "k",
      fetchFn,
    });
    expect(result.skippedReasons.get(hike.uniqueId)).toBe("link-declined");
    expect(server.rows.get(hike.uniqueId)!.memory.topics_extracted_at).toBeUndefined();
  });

  it("stamps the rest when one memory cannot be decrypted", async () => {
    const { store, server } = await remoteStore();
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
      expect(
        await store.topicMaintenance.stampTopicsExtracted(
          ["foreign", readable.uniqueId],
          Date.now()
        )
      ).toEqual([readable.uniqueId]);
    } finally {
      warn.mockRestore();
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

  it("keeps a committed write and later subscribers when one subscriber throws", async () => {
    const { store } = await remoteStore(undefined, undefined, 0);
    const after = vi.fn();
    const warn = vi.spyOn(getLogger(), "warn");
    const stopThrowing = store.subscribe(() => {
      throw new Error("render failed");
    });
    const stopAfter = store.subscribe(after);
    try {
      const m = await store.create({ content: "Drinks tea", embedding: axis(0) });
      expect(after).toHaveBeenCalledTimes(1);
      expect(await store.get(m.uniqueId)).not.toBeNull();
    } finally {
      stopThrowing();
      stopAfter();
      warn.mockRestore();
    }
  });

  it("notifies only for retain results that wrote a row", async () => {
    const { store } = await remoteStore(undefined, undefined, 0);
    const created = await store.retain("Dog is named Mochi");
    await store.delete(created.memoryId);
    const onChange = vi.fn();
    const onMembership = vi.fn();
    const stop = store.subscribe(onChange);
    const stopMembership = store.subscribe(onMembership, { includeDeleted: true });
    try {
      const suppressed = await store.retain("Dog is named Mochi", { respectTombstones: true });
      expect(suppressed.action).toBe("suppressed");
      expect(onChange).not.toHaveBeenCalled();
      await store.retain("Works at Anuma as an engineer");
      expect(onMembership).toHaveBeenCalledTimes(1);
    } finally {
      stop();
      stopMembership();
    }
  });

  it("shares one poll across subscribers and does not re-announce its own writes", async () => {
    const { store, server } = await remoteStore(undefined, undefined, 20);
    await store.create({ content: "Seed", embedding: axis(0) });
    server.fetch.mockClear();
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = store.subscribe(first);
    const stopSecond = store.subscribe(second, { embeddings: true });
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const baselines = server.fetch.mock.calls.filter(([input, init]) => {
        if (!String(input).endsWith("/memories/query")) return false;
        const body = JSON.parse(String(init!.body)) as Record<string, unknown>;
        return body.order === "changed" && body.cursor === undefined;
      });
      expect(baselines).toHaveLength(1);
      await store.create({ content: "Mine", embedding: axis(1) });
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    } finally {
      stopFirst();
      stopSecond();
    }
  });

  it("delivers memory changes and advances the cursor while the topic catalog fails", async () => {
    const ring = await deriveMemoryKeyRing(`0x${"e5".repeat(65)}`);
    const shared = fakeNearby(ring.keyId);
    const { store: laptop } = await remoteStore(shared, ring);
    const seeded = await laptop.create({ content: "Lives in Porto", embedding: axis(0) });
    await laptop.createTopic!("coffee");
    const { store: phone } = await remoteStore(shared, ring, 20);
    let failCatalog = false;
    const original = shared.fetch.getMockImplementation()!;
    shared.fetch.mockImplementation(async (input, init) => {
      if (failCatalog && String(input).includes("/topics?"))
        return new Response(JSON.stringify({ detail: "unavailable" }), { status: 500 });
      return original(input, init);
    });
    const polls = () =>
      shared.fetch.mock.calls
        .filter(([input]) => String(input).endsWith("/memories/query"))
        .map(([, init]) => JSON.parse(String(init!.body)) as { cursor?: string });
    const onChange = vi.fn();
    const onTopics = vi.fn();
    const stopChange = phone.subscribe(onChange);
    const stopTopics = phone.subscribe(onTopics, { topics: true });
    const warn = vi.spyOn(getLogger(), "warn");
    try {
      await vi.waitFor(() => expect(polls().some((p) => p.cursor !== undefined)).toBe(true));
      failCatalog = true;
      await laptop.update(seeded.uniqueId, { content: "Lives in Lisbon", embedding: axis(1) });
      shared.catalog.set("gardening", {
        name: "gardening",
        version: 1,
        is_deleted: false,
        server_updated_at: new Date().toISOString(),
      });
      await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      expect(onTopics).toHaveBeenCalledTimes(1);
      const updated = shared.rows.get(seeded.uniqueId)!;
      const cursor = JSON.stringify({ order: "changed", at: [updated.seq, seeded.uniqueId] });
      await vi.waitFor(() => expect(polls().some((p) => p.cursor === cursor)).toBe(true));

      failCatalog = false;
      await vi.waitFor(() => expect(onTopics).toHaveBeenCalledTimes(2));
      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      stopChange();
      stopTopics();
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

  it("still reports another device's new memory after this device stamps it", async () => {
    const ring = await deriveMemoryKeyRing(`0x${"e5".repeat(65)}`);
    const shared = fakeNearby(ring.keyId);
    const { store: phone } = await remoteStore(shared, ring, 300);
    const { store: laptop } = await remoteStore(shared, ring);
    const onChange = vi.fn();
    const unsubscribe = phone.subscribe(onChange);
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const hike = await laptop.create({ content: "Hikes Mt Hood", embedding: axis(0) });
      await phone.topicMaintenance.stampTopicsExtracted([hike.uniqueId], Date.now());
      expect(onChange).not.toHaveBeenCalled();
      await vi.waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 1000 });
    } finally {
      unsubscribe();
    }
  });

  it("still reports another device's change after this device stamps the same memory", async () => {
    const ring = await deriveMemoryKeyRing(`0x${"e5".repeat(65)}`);
    const shared = fakeNearby(ring.keyId);
    const { store: phone } = await remoteStore(shared, ring, 300);
    const { store: laptop } = await remoteStore(shared, ring);
    const hike = await phone.create({ content: "Hikes Mt Hood", embedding: axis(0) });
    const onChange = vi.fn();
    const unsubscribe = phone.subscribe(onChange);
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      await laptop.archive(hike.uniqueId);
      await phone.topicMaintenance.stampTopicsExtracted([hike.uniqueId], Date.now());
      expect(onChange).not.toHaveBeenCalled();
      await vi.waitFor(() => expect(onChange).toHaveBeenCalled(), { timeout: 1000 });
    } finally {
      unsubscribe();
    }
  });
});

function inEventWindow(m: Record<string, unknown>, window: { start: number; end: number }) {
  const start = m.event_time_start as number | null | undefined;
  const end = m.event_time_end as number | null | undefined;
  if (start == null || start >= window.end) return false;
  if (m.event_time_kind === "ongoing") return end == null || end >= window.start;
  if (m.event_time_kind === "range") return (end ?? start) >= window.start;
  return start >= window.start;
}

describe("default recall lanes", () => {
  async function lanes() {
    const keys = await deriveMemoryKeyRing(`0x${"c3".repeat(65)}`);
    const server = fakeNearby(keys.keyId);
    const cipher = memoryCipher(keys);
    const decrypt = vi.fn(cipher.decrypt);
    const queried: Record<string, unknown>[] = [];
    const fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).endsWith("/memories/query") || String(url).endsWith("/temporal"))
        queried.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return server.fetch(url as never, init as never);
    });
    const persistence = await createRemoteMemoryPersistence({
      baseUrl: "https://nearby.test",
      getToken: async () => "token",
      keyId: keys.keyId,
      encrypt: cipher.encrypt,
      decrypt,
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    const store = createRemoteMemoryStore({
      persistence,
      embeddingOptions: { apiKey: "test-key" },
    });
    return { store, server, decrypt, queried };
  }
  async function laneStore() {
    return (await lanes()).store;
  }

  it("reads topics as metadata, without decrypting any memory", async () => {
    const { store, decrypt } = await lanes();
    const m = await store.create({ content: "Ships the Acme app" });
    await store.addTopics(m.uniqueId, ["Acme"]);
    decrypt.mockClear();

    expect(await store.factSource.graphRanking("How is Acme going?", false, {})).toEqual([
      m.uniqueId,
    ]);
    expect(decrypt).not.toHaveBeenCalled();
  });

  it("reads a bounded number of rows for a common topic", async () => {
    const { store, server, queried } = await lanes();
    for (let i = 0; i < 300; i++)
      server.rows.set(`acme-${i}`, {
        memory: {
          memory_id: `acme-${i}`,
          content: "enc:v3:00",
          scope: "private",
          created_at: 1000 + i,
          updated_at: 1000 + i,
          is_deleted: false,
          topics: JSON.stringify([{ name: "Acme", source: "auto" }]),
        },
        version: 1,
        server_updated_at: "2026-01-01T00:00:00Z",
        seq: i,
      });

    const ranked = await store.factSource.graphRanking("How is Acme going?", false, {});

    expect(ranked).toHaveLength(64);
    const requested = queried.reduce((sum, body) => sum + (body.limit as number), 0);
    expect(requested).toBeLessThanOrEqual(256);
  });

  it("ranks only memories inside the recall's scope", async () => {
    const store = await laneStore();
    const mine = await store.create({ content: "Acme standup", scope: "private" });
    const shared = await store.create({ content: "Acme launch", scope: "shared" });
    await store.addTopics(mine.uniqueId, ["Acme"]);
    await store.addTopics(shared.uniqueId, ["Acme"]);

    expect(
      await store.factSource.graphRanking("How is Acme going?", false, { scopes: ["private"] })
    ).toEqual([mine.uniqueId]);
  });

  it("ranks memories by how many query entities their topics name", async () => {
    const store = await laneStore();
    const both = await store.create({ content: "Ships the Acme app with Priya" });
    const one = await store.create({ content: "Acme standup is at nine" });
    const none = await store.create({ content: "Likes green tea" });
    await store.addTopics(both.uniqueId, ["Acme", "Priya"]);
    await store.addTopics(one.uniqueId, ["Acme"]);
    await store.addTopics(none.uniqueId, ["Tea"]);

    expect(
      await store.factSource.graphRanking("What did Priya say about Acme?", false, {})
    ).toEqual([both.uniqueId, one.uniqueId]);
    expect(await store.factSource.graphRanking("what did she say", false, {})).toEqual([]);
  });

  const NOW = Date.UTC(2026, 9, 15, 12);
  const day = 24 * 60 * 60 * 1000;
  function eventRow(id: string, event: Record<string, unknown>, i = 0) {
    return {
      memory: {
        memory_id: id,
        content: "enc:v3:00",
        scope: "private",
        created_at: 1000 + i,
        updated_at: 1000 + i,
        is_deleted: false,
        ...event,
      },
      version: 1,
      server_updated_at: "2026-01-01T00:00:00Z",
      seq: i,
    };
  }

  it("ranks memories by how much of the query's time window their event covers", async () => {
    const { store, server, queried, decrypt } = await lanes();
    const window = parseQueryTimeWindow("What did I do yesterday?", NOW)!;
    const rows: Array<[string, Record<string, unknown>]> = [
      ["dinner", { event_time_start: window.start + 3_600_000, event_time_kind: "point" }],
      [
        "trip",
        {
          event_time_start: window.start - day,
          event_time_end: window.start + day / 2,
          event_time_kind: "range",
        },
      ],
      ["job", { event_time_start: window.start - 30 * day, event_time_kind: "ongoing" }],
      ["older", { event_time_start: window.start - 3 * day, event_time_kind: "point" }],
      ["undated", {}],
    ];
    rows.forEach(([id, event], i) => server.rows.set(id, eventRow(id, event, i)));
    decrypt.mockClear();

    const ranked = await store.factSource.temporalRanking("What did I do yesterday?", NOW);
    expect(ranked).toHaveLength(3);
    expect(ranked.slice(0, 2).sort()).toEqual(["dinner", "job"]);
    expect(ranked[2]).toBe("trip");
    expect(queried.at(-1)).toMatchObject({
      start: window.start,
      end: window.end,
      limit: 100,
    });
    expect(decrypt).not.toHaveBeenCalled();
  });

  it("asks nearby nothing for a query with no time phrase", async () => {
    const { store, queried } = await lanes();
    expect(await store.factSource.temporalRanking("What does Priya like?", NOW)).toEqual([]);
    expect(queried).toEqual([]);
  });

  it("finds an older best match beyond 256 rows without downloading the window", async () => {
    const { store, server, queried } = await lanes();
    const window = parseQueryTimeWindow("What did I do yesterday?", NOW)!;
    for (let i = 0; i < 300; i++)
      server.rows.set(
        `e-${i}`,
        eventRow(
          `e-${i}`,
          {
            event_time_start: window.start - day,
            event_time_end: window.start + day / 2,
            event_time_kind: "range",
          },
          i
        )
      );

    server.rows.set(
      "old-best",
      eventRow("old-best", { event_time_start: window.start + 1, event_time_kind: "point" }, -1)
    );
    const ranked = await store.factSource.temporalRanking("What did I do yesterday?", NOW);

    expect(ranked).toHaveLength(100);
    expect(ranked[0]).toBe("old-best");
    expect(queried).toEqual([{ start: window.start, end: window.end, limit: 100 }]);
  });
});

describe("repairEmbeddings", () => {
  async function repairStore(shared?: ReturnType<typeof fakeNearby>) {
    const keys = await deriveMemoryKeyRing(`0x${"d4".repeat(65)}`);
    const server = shared ?? fakeNearby(keys.keyId);
    const cipher = memoryCipher(keys);
    const decrypt = vi.fn(cipher.decrypt);
    const persistence = await createRemoteMemoryPersistence({
      baseUrl: "https://nearby.test",
      getToken: async () => "token",
      keyId: keys.keyId,
      encrypt: cipher.encrypt,
      decrypt,
      fetch: server.fetch as unknown as typeof globalThis.fetch,
    });
    const store = createRemoteMemoryStore({
      persistence,
      embeddingOptions: { apiKey: "test-key" },
      graphRanking: async () => [],
      temporalRanking: async () => [],
    });
    let seq = server.rows.size;
    const seed = async (id: string, text: string, extra: Record<string, unknown> = {}) => {
      seq++;
      server.rows.set(id, {
        memory: {
          memory_id: id,
          content: await cipher.encrypt(text),
          scope: "private",
          created_at: 1000 + seq,
          updated_at: 1000 + seq,
          is_deleted: false,
          ...extra,
        },
        version: 1,
        server_updated_at: "2026-01-01T00:00:00Z",
        seq,
      } as unknown as Stored);
    };
    const current = { embedding: axis(3), embedding_model: DEFAULT_API_EMBEDDING_MODEL };
    return { store, server, decrypt, seed, current };
  }

  it("re-embeds rows nearby cannot rank and decrypts only those", async () => {
    const { store, server, decrypt, seed, current } = await repairStore();
    await seed("missing", "Moved to Lisbon");
    await seed("old-model", "Plays cello", { embedding: axis(4), embedding_model: "openai/old" });
    await seed("fine", "Likes tea", current);
    decrypt.mockClear();
    vi.mocked(generateEmbeddings).mockClear();

    await expect(store.repairEmbeddings!()).resolves.toEqual({
      scanned: 3,
      reembedded: 2,
      failed: 0,
      skippedConflict: 0,
    });
    for (const id of ["missing", "old-model"]) {
      const row = server.rows.get(id)!;
      expect(row.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
      expect((row.memory.embedding as number[]).length).toBe(1536);
      expect(row.memory.updated_at).toBe(id === "missing" ? 1001 : 1002);
    }
    expect(server.rows.get("fine")!.version).toBe(1);
    expect(decrypt).toHaveBeenCalledTimes(2);
    expect(generateEmbeddings).toHaveBeenCalledTimes(1);
    expect([...vi.mocked(generateEmbeddings).mock.calls[0][0]].sort()).toEqual([
      "Moved to Lisbon",
      "Plays cello",
    ]);
  });

  it("repairs healthy rows when the embedder omits another row's vector", async () => {
    const { store, server, seed } = await repairStore();
    await seed("good", "Good");
    await seed("bad", "Bad");
    vi.mocked(generateEmbeddings).mockImplementationOnce(async (texts) =>
      texts.map((text) => (text === "Bad" ? [] : (JSON.parse(axis(0)) as number[])))
    );
    await expect(store.repairEmbeddings!()).resolves.toMatchObject({
      reembedded: 1,
      failed: 1,
      skippedConflict: 0,
    });
    expect(server.rows.get("good")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
    expect(server.rows.get("bad")!.memory.embedding).toBeUndefined();
  });

  it("writes more than one repair batch at the server's 50-row limit", async () => {
    const { store, server, seed } = await repairStore();
    for (let i = 0; i < 51; i++) await seed(`row-${i}`, `Fact ${i}`);
    await expect(store.repairEmbeddings!({ maxRows: 51 })).resolves.toMatchObject({
      reembedded: 51,
      failed: 0,
      skippedConflict: 0,
    });
    const writes = server.fetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/memories/batch")
    );
    expect(writes.map(([, init]) => JSON.parse(String(init?.body)).writes.length)).toEqual([50, 1]);
    expect([...server.rows.values()].every((row) => row.version === 2)).toBe(true);
  });

  it("repairs unaffected rows after a batch conflict without overwriting the changed row", async () => {
    const { store, server, seed } = await repairStore();
    await seed("raced", "Original");
    await seed("safe", "Unaffected");
    const original = server.fetch.getMockImplementation()!;
    let raced = false;
    server.fetch.mockImplementation(async (...args) => {
      if (String(args[0]).endsWith("/memories/batch") && !raced) {
        raced = true;
        server.touch("raced", { topics: JSON.stringify([{ name: "edited" }]) });
      }
      return original(...args);
    });
    await expect(store.repairEmbeddings!()).resolves.toMatchObject({
      reembedded: 1,
      failed: 0,
      skippedConflict: 1,
    });
    expect(server.rows.get("raced")!.memory.embedding).toBeUndefined();
    expect(server.rows.get("raced")!.memory.topics).toContain("edited");
    expect(server.rows.get("safe")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
  });

  it("does nothing beyond a metadata scan when every row is current", async () => {
    const { store, decrypt, seed, current } = await repairStore();
    await seed("a", "Likes tea", current);
    await seed("b", "Hikes", current);
    decrypt.mockClear();
    vi.mocked(generateEmbeddings).mockClear();

    await expect(store.repairEmbeddings!()).resolves.toMatchObject({ scanned: 2, reembedded: 0 });
    expect(decrypt).not.toHaveBeenCalled();
    expect(generateEmbeddings).not.toHaveBeenCalled();
  });

  it("repairs tombstones that keep their text and skips placeholders on later runs", async () => {
    const { store, server, decrypt, seed } = await repairStore();
    await seed("deleted", "Used to live in Porto", { is_deleted: true });
    await seed("placeholder", "", { is_deleted: true });

    await expect(store.repairEmbeddings!()).resolves.toMatchObject({ reembedded: 1, failed: 0 });
    expect(server.rows.get("deleted")!.memory).toMatchObject({
      is_deleted: true,
      embedding_model: DEFAULT_API_EMBEDDING_MODEL,
    });
    decrypt.mockClear();
    await expect(store.repairEmbeddings!()).resolves.toMatchObject({ reembedded: 0 });
    expect(decrypt).not.toHaveBeenCalled();
  });

  it("allows only one device to re-embed and fences results after lease loss", async () => {
    const first = await repairStore();
    await first.seed("work", "A memory needing a vector");
    const second = await repairStore(first.server);
    const embedding = vi.mocked(generateEmbeddings);
    const original = embedding.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    embedding.mockImplementationOnce(async (...args) => {
      await gate;
      return original(...args);
    });
    const running = first.store.repairEmbeddings!();
    await vi.waitFor(() => expect(first.server.leases.has("embeddings")).toBe(true));
    await expect(second.store.repairEmbeddings!()).resolves.toEqual({
      deferred: true,
      scanned: 0,
      reembedded: 0,
      failed: 0,
      skippedConflict: 0,
    });
    first.server.leases.delete("embeddings");
    release();
    await expect(running).resolves.toMatchObject({ deferred: true, reembedded: 0, failed: 0 });
    expect(first.server.rows.get("work")!.memory.embedding).toBeUndefined();
    await expect(second.store.repairEmbeddings!()).resolves.toMatchObject({ reembedded: 1 });
    expect(first.server.leases.size).toBe(0);
  });

  it("defers on a lost renewal and discards a late embedding result", async () => {
    const { store, server, seed } = await repairStore();
    await seed("work", "A memory needing a vector");
    const embedding = vi.mocked(generateEmbeddings);
    const original = embedding.getMockImplementation()!;
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    embedding.mockImplementationOnce(async (...args) => {
      await gate;
      return original(...args);
    });
    embedding.mockClear();
    vi.useFakeTimers();
    try {
      const running = store.repairEmbeddings!();
      await vi.waitFor(() => expect(embedding).toHaveBeenCalled());
      server.leases.delete("embeddings");
      await vi.advanceTimersByTimeAsync(30_000);
      await expect(running).resolves.toMatchObject({ deferred: true, failed: 0, reembedded: 0 });
      const workSignal = embedding.mock.calls[0][2]!;
      expect(workSignal.aborted).toBe(true);
      finish();
      await vi.advanceTimersByTimeAsync(0);
      expect(server.rows.get("work")!.memory.embedding).toBeUndefined();
      expect(server.fetch.mock.calls.some(([url]) => String(url).endsWith("/memories/batch"))).toBe(
        false
      );
    } finally {
      finish();
      embedding.mockImplementation(original);
      vi.useRealTimers();
    }
    await expect(store.repairEmbeddings!()).resolves.toMatchObject({ reembedded: 1, failed: 0 });
  });

  it("skips a row another writer changed after it was read", async () => {
    const { store, server, seed } = await repairStore();
    await seed("raced", "Moved to Lisbon");
    const original = server.fetch.getMockImplementation()!;
    server.fetch.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/memories/batch")) server.rows.get("raced")!.version++;
      return original(input, init);
    });

    await expect(store.repairEmbeddings!()).resolves.toMatchObject({
      reembedded: 0,
      skippedConflict: 1,
    });
    expect(server.rows.get("raced")!.memory.embedding).toBeUndefined();
  });

  it("reaches stale rows older than one run's scan on later runs", async () => {
    const { store, server, seed, current } = await repairStore();
    await seed("old", "Grew up in Seoul");
    for (let i = 0; i < 4; i++) await seed(`new${i}`, `Recent memory ${i}`, current);

    const first = await store.repairEmbeddings!({ maxScan: 2 });
    expect(first).toMatchObject({ scanned: 2, reembedded: 0 });
    expect(first.cursor).toBeDefined();
    await expect(store.repairEmbeddings!({ maxScan: 2 })).resolves.toMatchObject({
      reembedded: 0,
    });
    const third = await store.repairEmbeddings!({ maxScan: 2 });
    expect(third).toMatchObject({ scanned: 1, reembedded: 1 });
    expect(third.cursor).toBeUndefined();
    expect(server.rows.get("old")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
  });

  it("resumes from a returned cursor on a new store instance", async () => {
    const first = await repairStore();
    await first.seed("old", "Grew up in Seoul");
    for (let i = 0; i < 2; i++) await first.seed(`new${i}`, `Recent memory ${i}`, first.current);
    const { cursor } = await first.store.repairEmbeddings!({ maxScan: 2 });

    const second = await repairStore(first.server);
    await expect(second.store.repairEmbeddings!({ maxScan: 2, cursor })).resolves.toMatchObject({
      scanned: 1,
      reembedded: 1,
    });
  });

  it("rescans a window that held more stale rows than one run repairs", async () => {
    const { store, server, seed } = await repairStore();
    for (let i = 0; i < 3; i++) await seed(`m${i}`, `Memory number ${i}`);
    for (let i = 0; i < 2; i++) await seed(`n${i}`, `Newer memory ${i}`);

    const first = await store.repairEmbeddings!({ maxScan: 2, maxRows: 1 });
    expect(first).toMatchObject({ reembedded: 1 });
    expect(first.cursor).toBeUndefined();
    const second = await store.repairEmbeddings!({ maxScan: 2, maxRows: 1 });
    expect(second).toMatchObject({ reembedded: 1 });
    expect(second.cursor).toBeDefined();
    expect(server.rows.get("n0")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
    expect(server.rows.get("n1")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
  });

  it("repairs the rest of a batch the embedder rejects one row of, and moves past it", async () => {
    const { store, server, seed } = await repairStore();
    await seed("o1", "Older memory one");
    await seed("o2", "Older memory two");
    await seed("poison", "Rejected by the embedder");
    await seed("a", "Newer memory a");
    await seed("b", "Newer memory b");
    const embed = vi.mocked(generateEmbeddings);
    const original = embed.getMockImplementation()!;
    embed.mockClear();
    embed.mockImplementation(async (texts, options) => {
      if (texts.includes("Rejected by the embedder"))
        throw new EmbeddingHttpError("input too long", 400);
      return original(texts, options);
    });
    try {
      const first = await store.repairEmbeddings!({ maxScan: 3, maxRows: 3 });
      expect(first).toMatchObject({ scanned: 3, reembedded: 2, failed: 1 });
      expect(first.cursor).toBeDefined();
      expect(server.rows.get("a")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
      expect(server.rows.get("b")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);

      embed.mockClear();
      const second = await store.repairEmbeddings!({ maxScan: 3, maxRows: 3 });
      expect(second).toMatchObject({ reembedded: 2, failed: 0 });
      expect(embed.mock.calls.flatMap(([texts]) => texts)).not.toContain(
        "Rejected by the embedder"
      );
      expect(server.rows.get("o1")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
    } finally {
      embed.mockImplementation(original);
    }
  });

  it("stops a run on a fatal embedding error without giving up on any row", async () => {
    const { store, server, seed } = await repairStore();
    await seed("old", "Older memory");
    await seed("a", "Newer memory a");
    await seed("b", "Newer memory b");
    const embed = vi.mocked(generateEmbeddings);
    const original = embed.getMockImplementation()!;
    embed.mockClear();
    embed.mockImplementation(async () => {
      throw new EmbeddingHttpError("payment required", 402);
    });
    try {
      const first = await store.repairEmbeddings!({ maxScan: 2 });
      expect(first).toMatchObject({ reembedded: 0, failed: 2 });
      expect(first.cursor).toBeUndefined();
      expect(embed).toHaveBeenCalledTimes(1);
    } finally {
      embed.mockImplementation(original);
    }
    await expect(store.repairEmbeddings!({ maxScan: 2 })).resolves.toMatchObject({
      reembedded: 2,
      failed: 0,
    });
    expect(server.rows.get("a")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
    expect(server.rows.get("b")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
  });

  it("stops falling back row by row once a single-row embed hits a fatal error", async () => {
    const { store, seed } = await repairStore();
    await seed("a", "Newer memory a");
    await seed("b", "Newer memory b");
    const embed = vi.mocked(generateEmbeddings);
    const original = embed.getMockImplementation()!;
    embed.mockImplementation(async (texts) => {
      throw new EmbeddingHttpError(
        texts.length > 1 ? "bad batch" : "payment required",
        texts.length > 1 ? 400 : 402
      );
    });
    try {
      await expect(store.repairEmbeddings!()).resolves.toMatchObject({
        reembedded: 0,
        failed: 2,
      });
    } finally {
      embed.mockImplementation(original);
    }
    await expect(store.repairEmbeddings!()).resolves.toMatchObject({ reembedded: 2, failed: 0 });
  });

  it.each([
    ["a 503 that outlasted retries", () => new EmbeddingHttpError("unavailable", 503)],
    ["a non-HTTP failure", () => new Error("No token available for embedding generation")],
  ])("treats %s as transient: marks nothing and rescans the window", async (_label, failure) => {
    const { store, server, seed } = await repairStore();
    await seed("old", "Older memory");
    await seed("a", "Newer memory a");
    await seed("b", "Newer memory b");
    const embed = vi.mocked(generateEmbeddings);
    const original = embed.getMockImplementation()!;
    embed.mockClear();
    embed.mockImplementation(async () => {
      throw failure();
    });
    try {
      const first = await store.repairEmbeddings!({ maxScan: 2 });
      expect(first).toMatchObject({ reembedded: 0, failed: 2 });
      expect(first.cursor).toBeUndefined();
      expect(embed).toHaveBeenCalledTimes(1);
    } finally {
      embed.mockImplementation(original);
    }
    await expect(store.repairEmbeddings!({ maxScan: 2 })).resolves.toMatchObject({
      reembedded: 2,
      failed: 0,
    });
    expect(server.rows.get("a")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
    expect(server.rows.get("b")!.memory.embedding_model).toBe(DEFAULT_API_EMBEDDING_MODEL);
  });

  it("treats a transient single-row failure as ending the run, not as a rejected row", async () => {
    const { store, seed } = await repairStore();
    await seed("a", "Newer memory a");
    await seed("b", "Newer memory b");
    const embed = vi.mocked(generateEmbeddings);
    const original = embed.getMockImplementation()!;
    embed.mockImplementation(async (texts) => {
      throw new EmbeddingHttpError(
        texts.length > 1 ? "bad batch" : "unavailable",
        texts.length > 1 ? 400 : 503
      );
    });
    try {
      await expect(store.repairEmbeddings!()).resolves.toMatchObject({
        reembedded: 0,
        failed: 2,
      });
    } finally {
      embed.mockImplementation(original);
    }
    await expect(store.repairEmbeddings!()).resolves.toMatchObject({ reembedded: 2, failed: 0 });
  });

  it("bounds how many rows one run inspects and re-embeds", async () => {
    const { store, seed } = await repairStore();
    for (let i = 0; i < 5; i++) await seed(`m${i}`, `Memory number ${i}`);
    vi.mocked(generateEmbeddings).mockClear();

    await expect(store.repairEmbeddings!({ maxRows: 2 })).resolves.toMatchObject({
      scanned: 5,
      reembedded: 2,
    });
    expect(vi.mocked(generateEmbeddings).mock.calls[0][0]).toHaveLength(2);
    await expect(store.repairEmbeddings!({ maxScan: 3 })).resolves.toMatchObject({
      scanned: 3,
    });
  });
});

describe("remote decay", () => {
  const DAY = 24 * 60 * 60 * 1000;
  async function decayStore() {
    const keys = await deriveMemoryKeyRing(`0x${"d4".repeat(65)}`);
    const server = fakeNearby(keys.keyId);
    const cipher = memoryCipher(keys);
    const decrypt = vi.fn(cipher.decrypt);
    let afterScan: (() => void) | undefined;
    const fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const response = await server.fetch(url as never, init as never);
      if (String(url).endsWith("/memories/query") && afterScan) {
        const run = afterScan;
        afterScan = undefined;
        run();
      }
      return response;
    });
    const persistence = await createRemoteMemoryPersistence({
      baseUrl: "https://nearby.test",
      getToken: async () => "token",
      keyId: keys.keyId,
      encrypt: cipher.encrypt,
      decrypt,
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    const store = createRemoteMemoryStore({
      persistence,
      embeddingOptions: { apiKey: "test-key" },
      graphRanking: async () => [],
      temporalRanking: async () => [],
      pollIntervalMs: 0,
    });
    const onAfterScan = (run: () => void) => {
      afterScan = run;
    };
    return { store, server, decrypt, onAfterScan };
  }
  const aged = (server: ReturnType<typeof fakeNearby>, id: string, fields = {}) =>
    Object.assign(server.rows.get(id)!.memory, {
      source: "auto-extracted",
      fact_type: "other",
      updated_at: 1000,
      ...fields,
    });

  it("archives an aged extracted memory after a metadata-only scan", async () => {
    const { store, server, decrypt } = await decayStore();
    const stale = await store.create({ content: "Was into crosswords", embedding: axis(0) });
    const durable = await store.create({ content: "Name is Ana", embedding: axis(1) });
    const manual = await store.create({ content: "Likes green tea", embedding: axis(2) });
    aged(server, stale.uniqueId);
    aged(server, durable.uniqueId, { fact_type: "identity" });
    const untouched = new Set(
      [durable.uniqueId, manual.uniqueId].map((id) => server.rows.get(id)!.memory.content)
    );
    decrypt.mockClear();

    const result = await store.decay!.createDecaySweeper().runSweep();

    expect(result).toMatchObject({ archived: 1, deleted: 0, scanned: 3 });
    expect(server.rows.get(stale.uniqueId)!.memory.archived_at).toEqual(expect.any(Number));
    expect(server.rows.get(durable.uniqueId)!.memory.archived_at).toBeUndefined();
    expect(server.rows.get(manual.uniqueId)!.memory.archived_at).toBeUndefined();
    expect(decrypt.mock.calls.some(([value]) => untouched.has(value))).toBe(false);
  });

  it("keeps a memory re-observed between the scan and the write", async () => {
    const { store, server, onAfterScan } = await decayStore();
    const m = await store.create({ content: "Was into crosswords", embedding: axis(0) });
    aged(server, m.uniqueId);
    onAfterScan(() => {
      const row = server.rows.get(m.uniqueId)!;
      row.memory.last_observed_at = Date.now();
      row.version++;
    });

    const result = await store.decay!.createDecaySweeper().runSweep();

    expect(result.archived).toBe(0);
    expect(server.rows.get(m.uniqueId)!.memory.archived_at).toBeUndefined();
  });

  it("never decays a profile memory", async () => {
    const { store, server } = await decayStore();
    const m = await store.create({ content: "Was into crosswords", embedding: axis(0) });
    aged(server, m.uniqueId, { kind: "interest" });

    const result = await store.decay!.createDecaySweeper().runSweep();

    expect(result).toMatchObject({ archived: 0, scanned: 0 });
  });

  it("tombstones an archived memory once its window passes", async () => {
    const { store, server } = await decayStore();
    const m = await store.create({ content: "Was into crosswords", embedding: axis(0) });
    aged(server, m.uniqueId, { archived_at: Date.now() - 31 * DAY });

    const result = await store.decay!.createDecaySweeper().runSweep();

    expect(result.deleted).toBe(1);
    expect(server.rows.get(m.uniqueId)!.memory.is_deleted).toBe(true);
  });

  it("lets a restore between the scan and the write win over the delete", async () => {
    const { store, server, onAfterScan } = await decayStore();
    const m = await store.create({ content: "Was into crosswords", embedding: axis(0) });
    aged(server, m.uniqueId, { archived_at: Date.now() - 31 * DAY });
    onAfterScan(() => {
      const row = server.rows.get(m.uniqueId)!;
      delete row.memory.archived_at;
      row.version++;
    });

    const result = await store.decay!.createDecaySweeper().runSweep();

    expect(result.deleted).toBe(0);
    expect(server.rows.get(m.uniqueId)!.memory.is_deleted).toBe(false);
  });

  it("keeps a memory re-archived between the scan and the write", async () => {
    const { store, server, onAfterScan } = await decayStore();
    const m = await store.create({ content: "Was into crosswords", embedding: axis(0) });
    aged(server, m.uniqueId, { archived_at: Date.now() - 31 * DAY });
    onAfterScan(() => {
      const row = server.rows.get(m.uniqueId)!;
      row.memory.archived_at = Date.now();
      row.version++;
    });

    const result = await store.decay!.createDecaySweeper().runSweep();

    expect(result.deleted).toBe(0);
    expect(server.rows.get(m.uniqueId)!.memory.is_deleted).toBe(false);
  });

  it("keeps an archived memory inside its restore window", async () => {
    const { store, server } = await decayStore();
    const m = await store.create({ content: "Was into crosswords", embedding: axis(0) });
    aged(server, m.uniqueId, { archived_at: Date.now() - 5 * DAY });

    const result = await store.decay!.createDecaySweeper().runSweep();

    expect(result.deleted).toBe(0);
    expect(server.rows.get(m.uniqueId)!.memory.is_deleted).toBe(false);
  });

  it("deletes a due memory even when more than 200 archive candidates cannot be read", async () => {
    const { store, server } = await decayStore();
    const due = await store.create({ content: "Was into crosswords", embedding: axis(0) });
    aged(server, due.uniqueId, { archived_at: Date.now() - 31 * DAY });
    for (let i = 0; i < 201; i++)
      server.rows.set(`unreadable-${i}`, {
        memory: {
          memory_id: `unreadable-${i}`,
          content: "enc:v3:00",
          scope: "private",
          created_at: 1000 + i,
          updated_at: 1000,
          is_deleted: false,
          source: "auto-extracted",
          fact_type: "other",
        },
        version: 1,
        server_updated_at: "2026-01-01T00:00:00Z",
        seq: 1000 + i,
      });

    const result = await store.decay!.createDecaySweeper().runSweep();

    expect(result).toMatchObject({ archived: 0, deleted: 1 });
    expect(server.rows.get(due.uniqueId)!.memory.is_deleted).toBe(true);
  });

  it("moves at most 200 memories per sweep and finishes on the next", async () => {
    const { store, server } = await decayStore();
    const created = await store.createMany(
      Array.from({ length: 230 }, (_, i) => ({ content: `Fact ${i}`, embedding: axis(0) }))
    );
    for (const m of created) aged(server, m.uniqueId);
    const sweeper = store.decay!.createDecaySweeper();

    expect((await sweeper.runSweep()).archived).toBe(200);
    expect((await sweeper.runSweep()).archived).toBe(30);
  });
});

describe("account topic catalog", () => {
  it("refreshes topic counts when another device edits an unreadable memory", async () => {
    const { store, server } = await remoteStore(undefined, undefined, 20);
    await store.createTopic!("coffee");
    await store.createTopic!("hiking");
    const memory = await store.create({ content: "Likes coffee", embedding: axis(0) });
    await store.addTopics(memory.uniqueId, [{ name: "coffee" }]);
    server.touch(memory.uniqueId, { content: "enc:v3:00" });
    const onChange = vi.fn();
    const stop = store.subscribe(onChange, { topics: true });
    const warn = vi.spyOn(getLogger(), "warn").mockImplementation(() => {});
    try {
      expect((await store.listTopics()).map((topic) => topic.memoryCount)).toEqual([1, 0]);
      await vi.waitFor(() =>
        expect(
          server.fetch.mock.calls.some(([, init]) => {
            if (!init?.body) return false;
            const query = JSON.parse(init.body as string) as { order?: string; cursor?: string };
            return query.order === "changed" && query.cursor !== undefined;
          })
        ).toBe(true)
      );
      onChange.mockClear();
      server.touch(memory.uniqueId, {
        topics: JSON.stringify([{ name: "hiking", source: "user" }]),
      });
      await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
      expect((await store.listTopics()).map((topic) => topic.memoryCount)).toEqual([0, 1]);
      onChange.mockClear();
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      stop();
      warn.mockRestore();
    }
  });

  it("refreshes catalog-only changes when no topic subscription can invalidate its cache", async () => {
    const first = await remoteStore();
    const second = await remoteStore(first.server, first.keys);
    const stopMemory = first.store.subscribe(vi.fn());
    const stopTopics = first.store.subscribe(vi.fn(), { topics: true });
    try {
      await first.store.listTopics();
      stopTopics();
      await second.store.createTopic!("coffee");
      expect(await first.store.listTopics()).toEqual([
        { name: "coffee", kind: null, memoryCount: 0 },
      ]);
      await second.store.createTopic!("hiking");
      expect((await first.store.listTopics()).map((topic) => topic.name)).toEqual([
        "coffee",
        "hiking",
      ]);
    } finally {
      stopTopics();
      stopMemory();
    }
  });

  it("shares topic scans and refreshes membership after a local write", async () => {
    const { store, server } = await remoteStore(
      undefined,
      undefined,
      60_000,
      {},
      {
        isActive: () => false,
        subscribe: () => () => {},
      }
    );
    const stop = store.subscribe(vi.fn(), { topics: true });
    try {
      const firstMemory = await store.create({ content: "Likes coffee", embedding: axis(0) });
      await store.addTopics(firstMemory.uniqueId, [{ name: "coffee" }]);
      server.fetch.mockClear();
      const [first, second] = await Promise.all([store.listTopics(), store.listTopics()]);
      expect(first).toEqual([{ name: "coffee", kind: null, memoryCount: 1 }]);
      first[0].memoryCount = 999;
      expect(second[0].memoryCount).toBe(1);
      expect(await store.listTopics()).toEqual(second);
      expect(server.fetch).toHaveBeenCalledTimes(2);
      const secondMemory = await store.create({ content: "Coffee daily", embedding: axis(0) });
      await store.addTopics(secondMemory.uniqueId, [{ name: "coffee" }]);
      expect(await store.listTopics()).toEqual([{ name: "coffee", kind: null, memoryCount: 2 }]);
    } finally {
      stop();
    }
  });
  it("shares empty topics across devices and never creates a memory", async () => {
    const first = await remoteStore();
    await first.store.createTopic!(" Coffee ");
    const second = await remoteStore(first.server, first.keys);
    expect(await second.store.listTopics()).toEqual([
      { name: "coffee", kind: null, memoryCount: 0 },
    ]);
    expect(first.server.rows.size).toBe(0);
    await second.store.createTopic!("coffee");
    expect(first.server.catalog.size).toBe(1);
  });

  it("notifies topic imports without polling and makes repeated reads idempotent", async () => {
    const { store, server } = await remoteStore(undefined, undefined, 0);
    server.catalog.set("coffee", {
      name: "coffee",
      version: 2,
      is_deleted: true,
      server_updated_at: new Date().toISOString(),
    });
    const topics = [
      { name: " Gardening ", kind: "hobby" },
      { name: "gardening" },
      { name: "Coffee" },
    ];
    let refresh: Promise<unknown> | undefined;
    const onTopics = vi.fn(() => {
      refresh = store.importTopics!(topics).then(() => store.listTopics());
    });
    const stop = store.subscribe(onTopics, { topics: true });
    try {
      await store.importTopics!(topics);
      await refresh;
      await store.importTopics!(topics);
      expect(onTopics).toHaveBeenCalledTimes(1);
      expect(await store.listTopics()).toEqual([
        { name: "gardening", kind: "hobby", memoryCount: 0 },
      ]);
      expect(server.catalog.get("coffee")!.is_deleted).toBe(true);
      const imports = server.fetch.mock.calls.filter(([input]) =>
        String(input).endsWith("/topics/import")
      );
      expect(imports).toHaveLength(1);
      expect(JSON.parse(String(imports[0][1]!.body))).toEqual({
        topics: [{ name: "gardening", kind: "hobby" }],
      });
    } finally {
      stop();
    }
  });
});
