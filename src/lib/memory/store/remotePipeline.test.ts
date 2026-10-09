import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../memoryEngine/embeddings.js", () => ({
  generateEmbedding: vi.fn(async () => [1, ...new Array<number>(4095).fill(0)]),
  generateEmbeddings: vi.fn(async (texts: string[]) =>
    texts.map(() => [1, ...new Array<number>(4095).fill(0)])
  ),
}));
vi.mock("../consolidate.js", () => ({ consolidateMemory: vi.fn() }));
const captured = vi.hoisted(() => ({ port: undefined as RetainPersistence | undefined }));
vi.mock("../retain.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../retain.js")>();
  return {
    ...original,
    retainWithPersistence: (...args: Parameters<typeof original.retainWithPersistence>) => {
      captured.port = args[1].persistence;
      return original.retainWithPersistence(...args);
    },
  };
});

import { getLogger } from "../../logger.js";
import { generateEmbeddings } from "../../memoryEngine/embeddings.js";
import { consolidateMemory } from "../consolidate.js";
import type { RetainPersistence } from "../retain.js";
import { createRemoteMemoryPipeline } from "./remotePipeline.js";
import {
  type RemoteMemoryCandidateOptions,
  type RemoteMemoryPersistence,
  type RemoteMemoryRecord,
  type RemoteMemoryRow,
} from "./remotePersistence.js";

function setup() {
  const rows = new Map<string, RemoteMemoryRecord>();
  const undecryptable = new Set<string>();
  const vector = [1, ...new Array<number>(1535).fill(0)];
  const seed = (id: string, patch: Partial<RemoteMemoryRow> = {}) => {
    rows.set(id, {
      memory: {
        memory_id: id,
        content: "Drinks tea",
        scope: "private",
        created_at: 1,
        updated_at: 1,
        is_deleted: false,
        embedding: vector,
        embedding_model: "model",
        proof_count: 1,
        ...patch,
      },
      version: 1,
      server_updated_at: "2026-10-07T00:00:00Z",
    });
  };
  const put = vi.fn(async (memory: RemoteMemoryRow, expected: number | RemoteMemoryRecord) => {
    const version = typeof expected === "number" ? expected : expected.version;
    if ((rows.get(memory.memory_id)?.version ?? 0) !== version) throw new Error("version_conflict");
    const saved = {
      memory: structuredClone(memory),
      version: version + 1,
      server_updated_at: "2026-10-07T00:00:00Z",
    };
    rows.set(memory.memory_id, saved);
    return structuredClone(saved);
  });
  const putMany = vi.fn(
    async (writes: { memory: RemoteMemoryRow; expectedVersion: number | RemoteMemoryRecord }[]) => {
      if (
        writes.some(
          (w) =>
            (rows.get(w.memory.memory_id)?.version ?? 0) !==
            (typeof w.expectedVersion === "number" ? w.expectedVersion : w.expectedVersion.version)
        )
      )
        throw new Error("version_conflict");
      return Promise.all(writes.map((w) => put(w.memory, w.expectedVersion)));
    }
  );
  const query = async (_vector: number[], options: RemoteMemoryCandidateOptions = {}) => {
    const eligible = [...rows.values()].filter(
      ({ memory: m }) =>
        (options.include_deleted || !m.is_deleted) &&
        (!options.deleted_only || m.is_deleted) &&
        (!m.archived_at || options.include_archived) &&
        !m.superseded_by &&
        m.trust_tier !== "quarantined" &&
        (!options.scopes?.length || options.scopes.includes(m.scope)) &&
        (options.memory_ids === undefined || options.memory_ids.includes(m.memory_id)) &&
        (!options.fact_types?.length || options.fact_types.includes(m.fact_type ?? ""))
    );
    const compatible = eligible.filter(
      ({ memory: m }) =>
        m.embedding && (!m.embedding_model || m.embedding_model === options.embedding_model)
    );
    const window = compatible.slice(0, options.limit ?? 100);
    const forced = eligible.filter(
      ({ memory: m }) =>
        options.force_ids?.includes(m.memory_id) &&
        !window.some((w) => w.memory.memory_id === m.memory_id)
    );
    const returned = [...window, ...forced];
    return {
      items: structuredClone(returned.filter(({ memory: m }) => !undecryptable.has(m.memory_id))),
      failed: returned
        .filter(({ memory: m }) => undecryptable.has(m.memory_id))
        .map(({ memory: m, version }) => ({
          memory_id: m.memory_id,
          version,
          error: new Error("Memory decryption failed"),
        })),
      total_count: eligible.length,
      unavailable_count: eligible.length - compatible.length,
    };
  };
  const candidateSet = vi.fn(query);
  const candidates = vi.fn(async (v: number[], o?: RemoteMemoryCandidateOptions) => {
    const { items, failed } = await query(v, o);
    return { items, failed };
  });
  const get = vi.fn(async (id: string) => structuredClone(rows.get(id) ?? null));
  const persistence: RemoteMemoryPersistence = {
    get,
    put,
    putMany,
    candidateSet,
    candidates,
    list: vi.fn(async () => {
      throw new Error("must not enumerate vault");
    }),
    query: vi.fn(async () => {
      throw new Error("must not enumerate vault");
    }),
  };
  const graphRanking = vi.fn(async () => [] as string[]);
  const temporalRanking = vi.fn(async () => [] as string[]);
  const pipeline = createRemoteMemoryPipeline({
    persistence,
    embeddingOptions: { apiKey: "device-only", model: "model" },
    graphRanking,
    temporalRanking,
  });
  return {
    pipeline,
    seed,
    rows,
    undecryptable,
    get,
    put,
    putMany,
    candidateSet,
    candidates,
    persistence,
    graphRanking,
    temporalRanking,
  };
}
beforeEach(() => vi.clearAllMocks());

describe("remote shared recall/retain pipeline", () => {
  it.each(["deleted", "superseded", "live"])(
    "freshly probes %s secondary targets after a write conflict",
    async (state) => {
      const h = setup();
      h.seed("primary");
      h.seed("secondary");
      vi.mocked(consolidateMemory).mockResolvedValueOnce({
        action: "supersede",
        targetIds: ["primary", "secondary"],
        content: "Drinks coffee",
      });
      const originalBatch = h.putMany.getMockImplementation()!;
      h.putMany.mockImplementationOnce(async (writes) => {
        const result = await originalBatch(writes);
        const current = h.rows.get("secondary")!;
        current.version++;
        if (state === "deleted") current.memory.is_deleted = true;
        if (state === "superseded") current.memory.superseded_by = "another-successor";
        return result;
      });
      const warn = vi.spyOn(getLogger(), "warn");
      try {
        expect(
          await h.pipeline.retain("Drinks coffee", {
            consolidateOptions: { apiKey: "device-only" },
          })
        ).toMatchObject({ action: "supersede" });
        expect(h.get).toHaveBeenCalledWith("secondary");
        const duplicateWarnings = warn.mock.calls.filter(([message]) =>
          String(message).includes("duplicate row(s)")
        );
        expect(duplicateWarnings).toHaveLength(state === "live" ? 1 : 0);
        expect(h.putMany.mock.calls[1][0][0].expectedVersion).toMatchObject({ version: 1 });
      } finally {
        warn.mockRestore();
      }
    }
  );
  it("ranks bounded MRL candidates with the existing recall pipeline and re-reads across calls", async () => {
    const h = setup();
    h.seed("a");
    h.seed("other", { scope: "shared" });
    const result = await h.pipeline.recall("Drinks tea", {
      scopes: ["private"],
      minScore: 0,
      limit: 8,
    });
    expect(result.memories.map((m) => m.id)).toEqual(["a"]);
    expect(h.candidates.mock.calls[0][0]).toHaveLength(1536);
    expect(h.candidates.mock.calls[0][1]).toMatchObject({
      scopes: ["private"],
      embedding_model: "model",
      limit: 30,
    });
    expect(h.graphRanking).toHaveBeenCalled();
    expect(h.temporalRanking).toHaveBeenCalled();
    h.rows.get("a")!.memory.content = "Drinks coffee";
    expect(
      (await h.pipeline.recall("Drinks coffee", { scopes: ["private"], minScore: 0 })).memories[0]
        .content
    ).toBe("Drinks coffee");
    expect(h.persistence.list).not.toHaveBeenCalled();
  });
  it("merges with one candidate request and one version-bound write; replay preserves evidence and metadata", async () => {
    const h = setup();
    h.seed("a", { level: "matching", topics: "[]", topics_updated_at: 17 });
    expect(await h.pipeline.retain("Drinks tea", { sourceChunkIds: ["message"] })).toMatchObject({
      action: "merge",
      memoryId: "a",
      proofCount: 2,
    });
    expect(h.candidateSet).toHaveBeenCalledTimes(1);
    expect(h.put).toHaveBeenCalledTimes(1);
    expect(h.get).not.toHaveBeenCalled();
    const observed = h.rows.get("a")!.memory.last_observed_at;
    expect(h.rows.get("a")!.memory).toMatchObject({
      level: "matching",
      topics_updated_at: 17,
      updated_at: 1,
      source_chunk_ids: '["message"]',
    });
    await h.pipeline.retain("Drinks tea", { sourceChunkIds: ["message"] });
    expect(h.rows.get("a")!.memory).toMatchObject({ proof_count: 2, last_observed_at: observed });
  });
  it("never merges into or supersedes a kinded profile memory", async () => {
    const h = setup();
    h.seed("profile", { kind: "interest", kind_value: '"tea"', level: "profile" });
    const result = await h.pipeline.retain("Drinks tea");
    expect(result).toMatchObject({ action: "create" });
    expect(h.rows.get("profile")!).toMatchObject({
      version: 1,
      memory: { content: "Drinks tea", kind: "interest", level: "profile" },
    });
    expect(h.rows.size).toBe(2);
  });
  it("creates from empty storage and restores an archived match", async () => {
    const h = setup();
    expect(await h.pipeline.retain("Drinks tea")).toMatchObject({ action: "create" });
    const [id] = h.rows.keys();
    h.rows.get(id)!.memory.archived_at = 123;
    expect(await h.pipeline.retain("Drinks tea")).toMatchObject({ action: "merge", memoryId: id });
    expect(h.rows.get(id)!.memory.archived_at).toBeUndefined();
    expect(h.rows.get(id)!.memory.updated_at).toBeGreaterThan(1);
  });
  it("fails closed on missing/model-incompatible embeddings or query outage without writing", async () => {
    const h = setup();
    h.seed("a", { embedding: undefined });
    await expect(h.pipeline.retain("Drinks tea")).rejects.toThrow("embeddings unavailable");
    h.rows.get("a")!.memory.embedding = [1, ...new Array<number>(1535).fill(0)];
    h.rows.get("a")!.memory.embedding_model = "old-model";
    await expect(h.pipeline.retain("Drinks tea")).rejects.toThrow("embeddings unavailable");
    vi.mocked(generateEmbeddings).mockRejectedValueOnce(new Error("embedding outage"));
    await expect(h.pipeline.recall("Drinks tea")).rejects.toThrow("embedding outage");
    expect(h.put).not.toHaveBeenCalled();
  });
  it("uses a bounded tombstone query to suppress a deleted fact with full provider vectors", async () => {
    const h = setup();
    h.seed("deleted", { is_deleted: true });
    expect(await h.pipeline.retain("Drinks tea", { respectTombstones: true })).toMatchObject({
      action: "suppressed",
      tombstoneId: "deleted",
    });
    expect(h.candidateSet.mock.calls.at(-1)![1]).toMatchObject({
      deleted_only: true,
      include_deleted: true,
      limit: 1,
    });
    expect(h.put).not.toHaveBeenCalled();
    expect(h.persistence.list).not.toHaveBeenCalled();
  });
  it("commits consolidation supersession in one atomic batch and refuses stale decisions", async () => {
    const h = setup();
    h.seed("old");
    vi.mocked(consolidateMemory).mockResolvedValueOnce({
      action: "supersede",
      targetId: "old",
      content: "Drinks coffee",
    });
    const result = await h.pipeline.retain("Drinks coffee", {
      consolidateOptions: { apiKey: "device-only" },
    });
    expect(result).toMatchObject({ action: "supersede", targetId: "old" });
    expect(h.putMany).toHaveBeenCalledTimes(1);
    const writes = h.putMany.mock.calls[0][0];
    expect(writes[0].expectedVersion).toBe(0);
    expect(writes[1].memory.superseded_by).toBe(writes[0].memory.memory_id);
    const raced = setup();
    raced.seed("old");
    vi.mocked(consolidateMemory).mockImplementationOnce(async () => {
      raced.rows.get("old")!.version++;
      return { action: "supersede", targetId: "old", content: "Drinks coffee" };
    });
    await expect(
      raced.pipeline.retain("Drinks coffee", { consolidateOptions: { apiKey: "device-only" } })
    ).rejects.toThrow("version_conflict");
    expect(raced.rows.size).toBe(1);
    expect(raced.rows.get("old")!.memory.superseded_by).toBeUndefined();
  });
  it("fetches each facet window once and ranks with the same normalized facet vectors", async () => {
    const h = setup();
    h.seed("a");
    await h.pipeline.recall("Drinks tea", {
      subQueries: ["Drinks tea", "Favorite drink"],
      minScore: 0,
    });
    expect(h.candidates).toHaveBeenCalledTimes(3);
    expect(vi.mocked(generateEmbeddings).mock.calls.map(([texts]) => texts)).toEqual([
      ["Drinks tea"],
      ["Drinks tea", "Favorite drink"],
    ]);
    expect(h.candidates.mock.calls.every(([v]) => v.length === 1536)).toBe(true);
  });
});

describe("remote admission and consolidation regressions", () => {
  it("bounds crowded auxiliary lanes while preserving primary recall", async () => {
    const h = setup();
    h.seed("a");
    h.graphRanking.mockResolvedValueOnce(Array.from({ length: 150 }, (_, i) => `graph-${i}`));
    h.temporalRanking.mockResolvedValueOnce(Array.from({ length: 150 }, (_, i) => `time-${i}`));
    expect((await h.pipeline.recall("Drinks tea", { minScore: 0 })).memories[0].id).toBe("a");
    const ids = h.candidates.mock.calls[0][1]!.force_ids!;
    expect(ids).toHaveLength(100);
    expect(ids.slice(0, 4)).toEqual(["graph-0", "time-0", "graph-1", "time-1"]);
  });
  it("truncates before normalizing and reuses distinct facet vectors; bad facets fall back", async () => {
    const h = setup();
    h.seed("a");
    const main = new Array<number>(4096).fill(0);
    main[0] = 3;
    main[1] = 4;
    main[1536] = 100;
    const first = new Array<number>(4096).fill(0);
    first[0] = 1;
    const second = new Array<number>(4096).fill(0);
    second[1] = 1;
    vi.mocked(generateEmbeddings)
      .mockResolvedValueOnce([main])
      .mockResolvedValueOnce([first, second]);
    await h.pipeline.recall("Drinks tea", { subQueries: ["first", "second"], minScore: 0 });
    expect(h.candidates.mock.calls[0][0].slice(0, 2)).toEqual([0.6, 0.8]);
    expect(h.candidates.mock.calls[1][0].slice(0, 2)).toEqual([1, 0]);
    expect(h.candidates.mock.calls[2][0].slice(0, 2)).toEqual([0, 1]);
    vi.mocked(generateEmbeddings).mockResolvedValueOnce([main]).mockResolvedValueOnce([[], second]);
    const before = h.candidates.mock.calls.length;
    expect(
      (await h.pipeline.recall("Drinks tea", { subQueries: ["first", "second"], minScore: 0 }))
        .memories[0].id
    ).toBe("a");
    expect(h.candidates.mock.calls.length - before).toBe(1);
    vi.mocked(generateEmbeddings)
      .mockResolvedValueOnce([main])
      .mockRejectedValueOnce(new Error("facet embedding timed out"));
    const afterTimeout = h.candidates.mock.calls.length;
    expect(
      (await h.pipeline.recall("Drinks tea", { subQueries: ["first", "second"], minScore: 0 }))
        .memories[0].id
    ).toBe("a");
    expect(h.candidates.mock.calls.length - afterTimeout).toBe(1);
  });
  it("forces graph and temporal ids only into the primary window", async () => {
    const h = setup();
    h.seed("a");
    h.graphRanking.mockResolvedValueOnce(["a"]);
    await h.pipeline.recall("Drinks tea", {
      subQueries: ["Drinks tea", "Favorite drink"],
      minScore: 0,
    });
    expect(h.candidates.mock.calls.map(([, options]) => options!.force_ids)).toEqual([
      ["a"],
      [],
      [],
    ]);
  });
  it("skips undecryptable rows on recall but refuses to retain against them", async () => {
    const h = setup();
    h.seed("a");
    h.seed("broken", { content: "Drinks coffee" });
    h.undecryptable.add("broken");
    const warn = vi.spyOn(getLogger(), "warn");
    const recalled = await h.pipeline.recall("Drinks tea", { minScore: 0 });
    expect(recalled.memories.map((memory) => memory.id)).toEqual(["a"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("undecryptable"), ["broken"]);
    await expect(h.pipeline.retain("Drinks green tea")).rejects.toThrow("could not decrypt");
    expect(h.put).not.toHaveBeenCalled();
    expect(h.putMany).not.toHaveBeenCalled();
  });
  it("refuses tombstone checks that cannot decrypt the nearest tombstone", async () => {
    const h = setup();
    h.seed("gone", { is_deleted: true });
    h.undecryptable.add("gone");
    await expect(
      h.pipeline.retain("Drinks tea", { enableAutoMerge: false, respectTombstones: true })
    ).rejects.toThrow("could not decrypt");
    expect(h.put).not.toHaveBeenCalled();
  });
  it("rejects folder-scoped creates instead of dropping the folder", async () => {
    const h = setup();
    const untypedOptions = { enableAutoMerge: false, folderId: "folder" };
    await expect(h.pipeline.retain("Drinks tea", untypedOptions)).rejects.toThrow(
      "do not support folders"
    );
    expect(h.put).not.toHaveBeenCalled();
  });
  it("keeps consolidation rewrites on a replay without inflating evidence", async () => {
    const h = setup();
    h.seed("a", { source_chunk_ids: '["message"]', proof_count: 3, last_observed_at: 17 });
    vi.mocked(consolidateMemory).mockResolvedValueOnce({
      action: "update",
      targetId: "a",
      content: "Drinks green tea",
    });
    await h.pipeline.retain("Drinks green tea", {
      sourceChunkIds: ["message"],
      consolidateOptions: { apiKey: "device-only" },
    });
    expect(h.rows.get("a")!.memory).toMatchObject({
      content: "Drinks green tea",
      proof_count: 3,
      last_observed_at: 17,
      updated_at: 1,
    });
    expect(h.rows.get("a")!.memory.embedding).toHaveLength(1536);
  });
  it.each(["update", "noop"] as const)(
    "rejects a stale %s decision without creating a duplicate",
    async (action) => {
      const h = setup();
      h.seed("a");
      vi.mocked(consolidateMemory).mockImplementationOnce(async () => {
        h.rows.get("a")!.version++;
        return { action, targetId: "a", content: "Drinks green tea" };
      });
      await expect(
        h.pipeline.retain("Drinks green tea", { consolidateOptions: { apiKey: "device-only" } })
      ).rejects.toThrow("version_conflict");
      expect(h.rows.size).toBe(1);
      expect(h.rows.get("a")!.memory.content).toBe("Drinks tea");
    }
  );
  it("recalls through count-free candidate windows and retains through counted sets", async () => {
    const h = setup();
    h.seed("a");
    await h.pipeline.recall("Drinks tea", { minScore: 0 });
    expect(h.candidates).toHaveBeenCalledTimes(1);
    expect(h.candidateSet).not.toHaveBeenCalled();
    await h.pipeline.retain("Drinks tea");
    expect(h.candidateSet).toHaveBeenCalledTimes(1);
    expect(h.candidates).toHaveBeenCalledTimes(1);
  });
  it("bounds recall candidate windows by the query budget", async () => {
    const h = setup();
    h.seed("a");
    h.candidates.mockImplementationOnce(
      (_vector, options) =>
        new Promise((_resolve, reject) =>
          options!.signal!.addEventListener("abort", () => reject(options!.signal!.reason as Error))
        )
    );
    await expect(
      h.pipeline.recall("Drinks tea", { minScore: 0, queryEmbedTotalTimeoutMs: 30 })
    ).rejects.toMatchObject({ status: 408, code: "timeout" });
    await h.pipeline.recall("Drinks tea", { minScore: 0 });
    expect(h.candidates.mock.calls.at(-1)![1]!.signal!.aborted).toBe(false);
  });
  it("drops a stale vector when content changes without a new embedding", async () => {
    const h = setup();
    h.seed("a");
    await h.pipeline.retain("Drinks tea");
    const port = captured.port!;
    await port.get("a");
    await port.update("a", { content: "Drinks tea" });
    expect(h.put.mock.calls.at(-1)![0].embedding).toHaveLength(1536);
    await port.get("a");
    await port.update("a", { content: "Drinks coffee" });
    const sent = h.put.mock.calls.at(-1)![0];
    expect(sent.content).toBe("Drinks coffee");
    expect(sent).not.toHaveProperty("embedding");
    expect(sent).not.toHaveProperty("embedding_model");
  });
  it("skips freeFormOnly updates of a kinded row", async () => {
    const h = setup();
    h.seed("profile", { kind: "occupation", kind_value: '"nurse"', level: "profile" });
    await h.pipeline.retain("Drinks coffee");
    expect(
      await captured.port!.update("profile", { content: "Works as a doctor", freeFormOnly: true })
    ).toBeNull();
    expect(h.rows.get("profile")!).toMatchObject({ version: 1 });
  });
  it("normalizes trust tiers like local memory operations", async () => {
    const h = setup();
    await h.pipeline.retain("Drinks tea", { enableAutoMerge: false });
    const port = captured.port!;
    await port.create({ content: "Drinks coffee", trustTier: "trusted" });
    expect(h.put.mock.calls.at(-1)![0].trust_tier).toBe("trusted");
    const created = await port.create({ content: "Drinks juice", trustTier: "bogus" });
    expect(h.put.mock.calls.at(-1)![0].trust_tier).toBeUndefined();
    await port.update(created.uniqueId, { content: "Drinks juice", trustTier: "unknown" });
    expect(h.put.mock.calls.at(-1)![0].trust_tier).toBeUndefined();
  });
});
