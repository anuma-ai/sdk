/**
 * Unit tests for the unified recall() orchestrator and the recall_memory
 * chat tool built on top of it.
 *
 * Mocking strategy: network and DB edges are module-mocked (embeddings,
 * vault/chat/entity DB ops, the cross-encoder, the decompose LLM); the
 * ranking pipeline between recall() and those edges — searchVaultMemories
 * WithSize, rankFusedVaultMemories(Async), rankComposite, BM25, RRF,
 * query entity/temporal parsing — runs for real, so these tests pin the
 * actual orchestration (budget flags, lane activation, fusion, limits)
 * rather than just argument pass-through.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/chat/operations", () => ({
  searchChunksOp: vi.fn(),
}));

vi.mock("../db/entities/operations", () => ({
  getMemoriesByEntityNamesOp: vi.fn(),
}));

vi.mock("../db/memoryVault/operations", () => ({
  getAllVaultMemoriesOp: vi.fn(),
  getMemoriesByEventTimeOp: vi.fn(),
  updateVaultMemoryEmbeddingOp: vi.fn(),
}));

vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

vi.mock("./reranker", () => ({
  rerankPairs: vi.fn(),
}));

vi.mock("../memoryVault/decomposeQuery", () => ({
  decomposeQuery: vi.fn(),
}));

import { searchChunksOp, type StorageOperationsContext } from "../db/chat/operations";
import type { ChunkSearchResult } from "../db/chat/types";
import {
  type EntityOperationsContext,
  getMemoriesByEntityNamesOp,
} from "../db/entities/operations";
import {
  getAllVaultMemoriesOp,
  getMemoriesByEventTimeOp,
  updateVaultMemoryEmbeddingOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import { decomposeQuery } from "../memoryVault/decomposeQuery";

import { recall } from "./recall";
import { createRecallTool, RECALL_MAX_LIMIT, RECALL_MAX_MEMORIES_PER_TURN } from "./recallTool";
import { rerankPairs } from "./reranker";
import type { RecallContext } from "./types";

// ── Deterministic embedding fixture ─────────────────────────────────────
// Contents/queries share no tokens across items so BM25 stays out of the
// way; rankings are driven purely by these vectors.
const QUERY = "pets animals owned";
const M1 = "Owns a golden retriever named Bailey"; // cos 1.0 vs QUERY
const M2 = "Enjoys hiking trails near Boulder"; // cos ≈ 0.707
const M3 = "Prefers oat milk lattes"; // cos 0 → below fact minScore

const VECTORS: Record<string, number[]> = {
  [QUERY]: [1, 0, 0],
  [M1]: [1, 0, 0],
  [M2]: [0.7, 0.7, 0],
  [M3]: [0, 1, 0],
};
const vecFor = (text: string): number[] => VECTORS[text] ?? [0, 0, 1];

const FIXED_DATE = new Date("2026-06-01T00:00:00Z");

function makeMemory(id: string, content: string, scope = "private"): StoredVaultMemory {
  return {
    uniqueId: id,
    content,
    scope,
    folderId: null,
    userId: null,
    embedding: JSON.stringify(vecFor(content)),
    sourceChunkIds: null,
    proofCount: 1,
    source: "manual",
    eventTimeStart: null,
    eventTimeEnd: null,
    eventTimeKind: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    isDeleted: false,
  };
}

function makeChunk(id: string, conversationId: string, similarity: number): ChunkSearchResult {
  return {
    chunkText: `chunk text for ${id}`,
    similarity,
    message: {
      uniqueId: id,
      messageId: 1,
      conversationId,
      role: "user",
      content: `chunk text for ${id}`,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    },
  };
}

const vaultCtx = {} as VaultMemoryOperationsContext;
const storageCtx = {} as StorageOperationsContext;
const entityCtx = {} as EntityOperationsContext;

function makeCtx(overrides: Partial<RecallContext> = {}): RecallContext {
  return {
    vaultCtx,
    storageCtx,
    embeddingOptions: { apiKey: "test-key" },
    vaultCache: new Map<string, number[]>(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
    makeMemory("m1", M1),
    makeMemory("m2", M2),
    makeMemory("m3", M3),
  ]);
  vi.mocked(updateVaultMemoryEmbeddingOp).mockResolvedValue(null);
  vi.mocked(getMemoriesByEventTimeOp).mockResolvedValue([]);
  vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map());
  vi.mocked(searchChunksOp).mockResolvedValue([]);
  vi.mocked(generateEmbedding).mockImplementation(async (text) => vecFor(text));
  vi.mocked(generateEmbeddings).mockImplementation(async (texts) => texts.map(vecFor));
  vi.mocked(rerankPairs).mockImplementation(async (_query, items) =>
    items.map((item) => ({ ...item, score: 0.5 }))
  );
  vi.mocked(decomposeQuery).mockImplementation(async (query) => ({
    mode: "specific",
    subQueries: [query],
  }));
});

describe("recall — query validation", () => {
  it("returns an empty result for empty / whitespace queries without searching", async () => {
    for (const bad of ["", "   ", "\n\t"]) {
      const result = await recall(bad, makeCtx());
      // toMatchObject (not toEqual) so adding a diagnostic field to
      // RecallResult later doesn't break this pin.
      expect(result).toMatchObject({
        memories: [],
        usedBudget: "low",
        reranked: false,
        candidateCount: 0,
      });
    }
    expect(getAllVaultMemoriesOp).not.toHaveBeenCalled();
    expect(searchChunksOp).not.toHaveBeenCalled();
  });

  it("reports the downgraded budget even on the empty-query early return", async () => {
    const result = await recall("", makeCtx(), { budget: "high" });
    expect(result.usedBudget).toBe("mid");
  });
});

describe("recall — budget tiers", () => {
  it("defaults to budget=low: no rerank, no decompose, results ranked by fused score", async () => {
    const result = await recall(QUERY, makeCtx());

    expect(result.usedBudget).toBe("low");
    expect(result.reranked).toBe(false);
    expect(rerankPairs).not.toHaveBeenCalled();
    expect(decomposeQuery).not.toHaveBeenCalled();

    // m3 (cosine 0) is filtered by the default fact minScore (0.1).
    expect(result.memories.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(result.candidateCount).toBe(2);
    expect(result.vaultSize).toBe(3);
  });

  it("budget=mid: cross-encoder rerank runs over the fact candidates", async () => {
    const result = await recall(QUERY, makeCtx(), { budget: "mid" });

    expect(result.usedBudget).toBe("mid");
    expect(result.reranked).toBe(true);
    expect(rerankPairs).toHaveBeenCalledTimes(1);
    const [rerankQuery, rerankItems] = vi.mocked(rerankPairs).mock.calls[0];
    expect(rerankQuery).toBe(QUERY);
    expect(rerankItems.map((i) => i.id)).toEqual(expect.arrayContaining(["m1", "m2"]));
    expect(decomposeQuery).not.toHaveBeenCalled();
    expect(result.memories[0].id).toBe("m1");
  });

  it("budget=high WITHOUT decomposeOptions silently downgrades to mid", async () => {
    const result = await recall(QUERY, makeCtx(), { budget: "high" });

    expect(result.usedBudget).toBe("mid");
    expect(decomposeQuery).not.toHaveBeenCalled();
    // Rerank still runs — only the decompose stage is dropped.
    expect(rerankPairs).toHaveBeenCalled();
    expect(result.memories[0].id).toBe("m1");
  });

  it("budget=high WITH decomposeOptions invokes the LLM decomposition", async () => {
    vi.mocked(decomposeQuery).mockResolvedValue({
      mode: "composite",
      subQueries: ["sub one", "sub two", "sub three"],
    });

    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      decomposeOptions: { apiKey: "llm-key", model: "openai/gpt-5-mini" },
    });

    expect(result.usedBudget).toBe("high");
    expect(decomposeQuery).toHaveBeenCalledTimes(1);
    expect(decomposeQuery).toHaveBeenCalledWith(
      QUERY,
      expect.objectContaining({ apiKey: "llm-key", model: "openai/gpt-5-mini" })
    );
    // Sub-queries are embedded for the composite ranker.
    expect(generateEmbeddings).toHaveBeenCalledWith(
      ["sub one", "sub two", "sub three"],
      expect.anything()
    );
    expect(result.memories[0].id).toBe("m1");
  });

  it("composite path does NOT leak zero-score tail items past the minScore floor", async () => {
    // rankComposite's bench-parity zero-score append is now opt-in
    // (includeUnrankedTail), and production recall() does not set it — so a
    // vault item absent from facet fusion (m3, similarity 0, below the 0.1
    // factMinScore) must NOT appear in results. Prevents zero-relevance
    // padding from reaching the answer LLM on the high-budget composite path.
    vi.mocked(decomposeQuery).mockResolvedValue({
      mode: "composite",
      subQueries: ["sub one", "sub two"],
    });

    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      decomposeOptions: { apiKey: "llm-key" },
    });

    expect(result.memories.find((m) => m.id === "m3")).toBeUndefined();
  });

  it("degrades gracefully when decompose falls back to specific (LLM failure contract)", async () => {
    // decomposeQuery's documented failure contract: network/JSON errors
    // return { mode: "specific" } instead of throwing. recall must still
    // produce results via the V2+CE path.
    vi.mocked(decomposeQuery).mockResolvedValue({ mode: "specific", subQueries: [QUERY] });

    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      decomposeOptions: { apiKey: "llm-key" },
    });

    expect(result.memories.map((m) => m.id)).toEqual(["m1", "m2"]);
    // NOTE (pinned behavior): usedBudget reflects the *configured*
    // pipeline, not the internal fallback — it stays "high" because
    // decomposeOptions were supplied, even though decomposition
    // degraded to single-query mode internally.
    expect(result.usedBudget).toBe("high");
    expect(result.reranked).toBe(true);
  });

  it("degrades to the V2 ranking when the cross-encoder fails (soft-degrade)", async () => {
    // A transient CE/portal failure must not error the whole recall — the
    // search layer catches it and returns the already-computed V2 ordering.
    // (Threading the downgrade up to RecallResult.reranked is a follow-up;
    // the warn log is the current observability signal.)
    vi.mocked(rerankPairs).mockRejectedValue(new Error("CE model download failed"));

    const result = await recall(QUERY, makeCtx(), { budget: "mid" });

    expect(result.memories.map((m) => m.id)).toEqual(["m1", "m2"]);
  });
});

describe("recall — lane selection (types)", () => {
  it("types: ['fact'] does not touch the chunk lane", async () => {
    const result = await recall(QUERY, makeCtx());
    expect(searchChunksOp).not.toHaveBeenCalled();
    expect(result.memories.every((m) => m.kind === "fact")).toBe(true);
  });

  it("types: ['chunk'] does not touch the vault and returns chunk-shaped memories", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c1", "conv-1", 0.9)]);

    const result = await recall(QUERY, makeCtx(), { types: ["chunk"] });

    expect(getAllVaultMemoriesOp).not.toHaveBeenCalled();
    expect(searchChunksOp).toHaveBeenCalledWith(
      storageCtx,
      vecFor(QUERY),
      expect.objectContaining({ limit: 8, minSimilarity: 0.5 })
    );
    expect(result.vaultSize).toBeUndefined();
    expect(result.memories).toHaveLength(1);
    const chunk = result.memories[0];
    expect(chunk.kind).toBe("chunk");
    expect(chunk.id).toBe("c1");
    expect(chunk.conversationId).toBe("conv-1");
    expect(chunk.messageId).toBe("c1");
    expect(chunk.role).toBe("user");
    expect(chunk.score).toBe(0.9);
    expect(chunk.scoreBreakdown).toEqual({ cosine: 0.9 });
  });

  it("types: ['fact','chunk'] fuses lanes via RRF and respects the limit", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("c1", "conv-1", 0.9),
      makeChunk("c2", "conv-2", 0.8),
    ]);

    const result = await recall(QUERY, makeCtx(), { types: ["fact", "chunk"], limit: 3 });

    // Both lanes pull a widened candidate pool for RRF overlap.
    expect(searchChunksOp).toHaveBeenCalledWith(
      storageCtx,
      vecFor(QUERY),
      expect.objectContaining({ limit: 16 })
    );

    // RRF (k=60): rank-1 items score 1/61, rank-2 score 1/62. Facts and
    // chunks interleave; limit truncates after fusion.
    // NOTE: m1 and c1 tie exactly (rank-1 in their respective lanes), so
    // their relative order is the stable-sort insertion order — recall()
    // builds the fused list facts-first. If the merge order ever changes,
    // ["c1", "m1", ...] is equally correct; update this pin, don't fight it.
    expect(result.memories.map((m) => m.id)).toEqual(["m1", "c1", "m2"]);
    expect(result.memories).toHaveLength(3);
    expect(result.candidateCount).toBe(4);
    expect(result.memories[0].score).toBeCloseTo(1 / 61, 10);
    expect(result.memories[1].score).toBeCloseTo(1 / 61, 10);
    expect(result.memories[2].score).toBeCloseTo(1 / 62, 10);
    // scoreBreakdown.fused preserves the pre-RRF lane score.
    expect(result.memories[1].scoreBreakdown?.fused).toBe(0.9);
    expect(result.memories.map((m) => m.kind)).toEqual(["fact", "chunk", "fact"]);
  });

  it("suppresses a chunk whose message originated a surfaced fact (cross-lane dedup)", async () => {
    // m1 was extracted from chunk "c1" (sourceChunkIds provenance), so "c1"
    // must not ALSO surface in the chunk lane — otherwise the same content
    // appears twice. "c2" is unrelated and survives. Exercises the real
    // pipeline end-to-end (sourceChunkIds threaded through VaultSearchResult).
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      { ...makeMemory("m1", M1), sourceChunkIds: ["c1"] },
      makeMemory("m2", M2),
    ]);
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("c1", "conv-1", 0.9),
      makeChunk("c2", "conv-2", 0.8),
    ]);

    const result = await recall(QUERY, makeCtx(), { types: ["fact", "chunk"] });

    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("m1");
    expect(ids).toContain("c2");
    expect(ids).not.toContain("c1"); // suppressed by cross-lane dedup
    expect(result.memories.find((m) => m.id === "c1")).toBeUndefined();
  });

  it("does NOT suppress an origin chunk when its fact never surfaces (limit cut)", async () => {
    // m2 (cos ≈ 0.707) was extracted from chunk "c1", but ranks below the
    // limit=2 cut. Its high-scoring origin chunk "c1" must still surface —
    // suppression is post-fusion and only fires for facts that actually make
    // the cut, so a non-surfacing fact can't silently remove its own chunk.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", M1), // cos 1.0 → top fact
      { ...makeMemory("m2", M2), sourceChunkIds: ["c1"] }, // cos ≈0.707 → cut at limit 2
    ]);
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c1", "conv-1", 0.9)]);

    const result = await recall(QUERY, makeCtx(), { types: ["fact", "chunk"], limit: 2 });

    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("m1");
    expect(ids).toContain("c1"); // NOT suppressed — m2 never surfaced
    expect(ids).not.toContain("m2"); // cut by limit
  });

  it("suppresses an origin chunk even when it outranks its own surfacing fact", async () => {
    // m2 was extracted from chunk "c1". The chunk lane scores "c1" high enough
    // to outrank "m2" after fusion. Suppression must still fire (a fact and its
    // origin chunk must never both appear) — the fixpoint makes it order-
    // independent, not "only when the fact ranks higher".
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", M1),
      { ...makeMemory("m2", M2), sourceChunkIds: ["c1"] },
    ]);
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c1", "conv-1", 0.99)]);

    const result = await recall(QUERY, makeCtx(), { types: ["fact", "chunk"] });

    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("m1");
    expect(ids).toContain("m2"); // the surfacing fact wins
    expect(ids).not.toContain("c1"); // its origin chunk is dropped regardless of rank
    // Provenance is exposed on the returned fact, not just used internally.
    expect(result.memories.find((m) => m.id === "m2")?.sourceChunkIds).toEqual(["c1"]);
  });

  it("skips RRF when one lane comes back empty (raw scores preserved)", async () => {
    // Both types requested, but no chunks match → fact lane scores pass
    // through un-quantized.
    const result = await recall(QUERY, makeCtx(), { types: ["fact", "chunk"] });
    expect(result.memories[0].id).toBe("m1");
    expect(result.memories[0].score).toBeGreaterThan(0.5); // fused score, not 1/61
  });
});

describe("recall — filters and pass-through", () => {
  it("passes conversationId through to chunk search", async () => {
    await recall(QUERY, makeCtx(), { types: ["chunk"], conversationId: "conv-9" });
    expect(searchChunksOp).toHaveBeenCalledWith(
      storageCtx,
      expect.anything(),
      expect.objectContaining({ conversationId: "conv-9" })
    );
  });

  it("filters out excludeConversationId chunks from the results", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("c1", "conv-current", 0.9),
      makeChunk("c2", "conv-other", 0.8),
    ]);

    const result = await recall(QUERY, makeCtx(), {
      types: ["chunk"],
      excludeConversationId: "conv-current",
    });

    expect(result.memories.map((m) => m.id)).toEqual(["c2"]);
  });

  it("passes scopes and folderId through to the vault query", async () => {
    await recall(QUERY, makeCtx(), { scopes: ["work"], folderId: null });
    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(vaultCtx, {
      scopes: ["work"],
      folderId: null,
    });
  });

  it("applies the default limit of 8", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => {
        const memory = makeMemory(`bulk-${i}`, `bulk content ${i}`);
        memory.embedding = JSON.stringify([1, 0.01 * i, 0]);
        return memory;
      })
    );

    const result = await recall(QUERY, makeCtx());
    expect(result.memories).toHaveLength(8);
    // Single-lane requests cap the candidate pool at the lane limit, so
    // candidateCount reflects the truncated pool, not the vault size.
    expect(result.candidateCount).toBe(8);
    expect(result.vaultSize).toBe(12);
  });
});

describe("recall — entity (W5) lane", () => {
  const ENTITY_QUERY = "Where is Sara traveling";

  it("activates only when entityCtx is provided AND the query has extractable entities", async () => {
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map([["m3", new Set(["sara"])]]));

    const result = await recall(ENTITY_QUERY, makeCtx({ entityCtx }));

    expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, ["sara"]);
    // m3 has zero cosine vs the query — only the graph lane can admit it.
    expect(result.memories.map((m) => m.id)).toContain("m3");
  });

  it("does not run without an entityCtx", async () => {
    await recall(ENTITY_QUERY, makeCtx());
    expect(getMemoriesByEntityNamesOp).not.toHaveBeenCalled();
  });

  it("does not run when the query has no extractable entities", async () => {
    await recall("where is everyone going", makeCtx({ entityCtx }));
    expect(getMemoriesByEntityNamesOp).not.toHaveBeenCalled();
  });

  it("falls back to vaultCtx.entityCtx when ctx.entityCtx is absent", async () => {
    const vaultCtxWithEntities = {
      entityCtx,
    } as VaultMemoryOperationsContext;
    await recall(ENTITY_QUERY, makeCtx({ vaultCtx: vaultCtxWithEntities }));
    expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, ["sara"]);
  });
});

describe("recall — temporal (W6) lane", () => {
  // Local-midnight basis, mirroring queryTemporal's window construction.
  const NOW = new Date(2026, 5, 10, 12, 0, 0).getTime();
  const YESTERDAY_START = new Date(2026, 5, 9).getTime();
  const YESTERDAY_END = new Date(2026, 5, 10).getTime();

  it("activates when the query parses to a time window", async () => {
    vi.mocked(getMemoriesByEventTimeOp).mockResolvedValue([
      {
        uniqueId: "m3",
        eventTimeStart: new Date(2026, 5, 9, 15).getTime(),
        eventTimeEnd: null,
        eventTimeKind: "point",
      },
    ]);

    const result = await recall("what did i do yesterday", makeCtx(), { now: NOW });

    expect(getMemoriesByEventTimeOp).toHaveBeenCalledWith(vaultCtx, YESTERDAY_START, YESTERDAY_END);
    // m3 has zero cosine vs this query — only the temporal lane admits it.
    expect(result.memories.map((m) => m.id)).toContain("m3");
  });

  it("does not run for queries without a temporal phrase", async () => {
    await recall(QUERY, makeCtx());
    expect(getMemoriesByEventTimeOp).not.toHaveBeenCalled();
  });

  it("does not run for chunk-only recalls", async () => {
    await recall("what did i do yesterday", makeCtx(), { types: ["chunk"], now: NOW });
    expect(getMemoriesByEventTimeOp).not.toHaveBeenCalled();
  });
});

describe("recall — result shape", () => {
  it("returns RankedMemory facts with score breakdown and real timestamps", async () => {
    const result = await recall(QUERY, makeCtx());

    const top = result.memories[0];
    expect(top.id).toBe("m1");
    expect(top.kind).toBe("fact");
    expect(top.content).toBe(M1);
    expect(typeof top.score).toBe("number");
    expect(top.scoreBreakdown?.fused).toBe(top.score);
    expect(top.createdAt).toEqual(FIXED_DATE);
    expect(top.updatedAt).toEqual(FIXED_DATE);
    expect(result.candidateCount).toBe(2);
    expect(result.vaultSize).toBe(3);
  });
});

describe("recall — dedupe", () => {
  it("collapses vault rows with identical content to one result (distinct ids)", async () => {
    // The extraction/consolidation pipeline can persist the same fact as
    // several distinct rows. All match the query identically (same vector →
    // same score), so without content dedupe the caller gets N identical
    // rows — the reported bug: the "drew on your memory" pill listed the same
    // memory five times. Keep the first occurrence, drop the rest.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("dup-a", M1),
      makeMemory("dup-b", M1),
      makeMemory("dup-c", M1),
      makeMemory("m2", M2),
    ]);

    const result = await recall(QUERY, makeCtx());

    expect(result.memories).toHaveLength(2);
    expect(result.memories.map((m) => m.content)).toEqual([M1, M2]);
    const ids = result.memories.map((m) => m.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids.filter((id) => id.startsWith("dup-"))).toHaveLength(1);
    expect(ids).toContain("m2");
    // candidateCount reflects unique candidates, not raw lane hits.
    expect(result.candidateCount).toBe(2);
  });

  it("dedupes chunks by text, keeping distinct passages from the same message", async () => {
    // Chunk identity is the passage text, not the message id: a long message
    // legitimately splits into several distinct chunks, and those must all
    // survive. Identical text is collapsed regardless of message.
    const passageA = "the first passage from message m1";
    const passageB = "a different passage from the same message m1";
    vi.mocked(searchChunksOp).mockResolvedValue([
      { ...makeChunk("m1", "conv1", 0.9), chunkText: passageA },
      { ...makeChunk("m1", "conv1", 0.9), chunkText: passageA }, // identical text → dropped
      { ...makeChunk("m1", "conv1", 0.85), chunkText: passageB }, // same msg, new text → kept
    ]);

    const result = await recall(QUERY, makeCtx({ storageCtx }), { types: ["chunk"] });

    expect(result.memories.map((m) => m.content)).toEqual([passageA, passageB]);
    expect(result.candidateCount).toBe(2);
  });

  it("does not merge distinct facts that both have blank content", async () => {
    // Two distinct rows that resolve to empty content (e.g. decrypt failure)
    // must not collapse on the empty content key — that would be silent loss.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("blank-a", "", "private"),
      makeMemory("blank-b", "", "private"),
      makeMemory("m1", M1),
    ]);

    const result = await recall(QUERY, makeCtx(), { minScore: 0 });

    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("blank-a");
    expect(ids).toContain("blank-b");
  });

  it("dedupes per-lane before fusion, so candidateCount counts unique records", async () => {
    // Both lanes active → the fused (RRF) path. Each lane carries duplicates;
    // dedupeBy runs per-lane before fusion, so candidateCount (byId.size) must
    // reflect unique records, not raw lane hits.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("dup-a", M1),
      makeMemory("dup-b", M1), // same content, distinct id
      makeMemory("m2", M2),
    ]);
    const c1 = makeChunk("c1", "conv1", 0.9);
    vi.mocked(searchChunksOp).mockResolvedValue([
      c1,
      makeChunk("c1", "conv1", 0.9), // repeated id
      { ...makeChunk("c2", "conv2", 0.8), chunkText: c1.chunkText }, // repeated content
    ]);

    const result = await recall(QUERY, makeCtx({ storageCtx }), { types: ["fact", "chunk"] });

    // 2 unique facts (M1 once, M2) + 1 unique chunk.
    expect(result.candidateCount).toBe(3);
    const contents = result.memories.map((m) => m.content);
    expect(new Set(contents).size).toBe(contents.length); // no duplicate content
    expect(contents).toContain(M1);
    expect(contents).toContain(M2);
    expect(contents).toContain(c1.chunkText);
  });

  it("keeps distinct same-message passages through the fused path", async () => {
    // Fused path (types: fact + chunk) must key chunks passage-uniquely, not by
    // message id — otherwise a long message that splits into passages A and B
    // collapses to one and candidateCount undercounts (the single-lane test
    // doesn't touch this path).
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1fact", M1)]);
    const passageA = "passage A from message msg-1";
    const passageB = "passage B from message msg-1";
    vi.mocked(searchChunksOp).mockResolvedValue([
      { ...makeChunk("msg-1", "conv1", 0.9), chunkText: passageA },
      { ...makeChunk("msg-1", "conv1", 0.85), chunkText: passageB }, // same msg, different text
    ]);

    const result = await recall(QUERY, makeCtx({ storageCtx }), { types: ["fact", "chunk"] });

    const contents = result.memories.map((m) => m.content);
    expect(contents).toContain(passageA);
    expect(contents).toContain(passageB);
    // 1 fact + 2 distinct passages; fusion must not collapse the passages.
    expect(result.candidateCount).toBe(3);
  });
});

describe("createRecallTool executor", () => {
  function bulkVault(count: number): StoredVaultMemory[] {
    return Array.from({ length: count }, (_, i) => {
      const memory = makeMemory(`bulk-${i}`, `bulk content ${i}`);
      memory.embedding = JSON.stringify([1, 0.001 * i, 0]);
      return memory;
    });
  }

  it("throws (not returns) on a missing/empty query so the tool-loop can retry", async () => {
    const tool = createRecallTool(makeCtx(), { types: ["fact"] });
    await expect(tool.executor!({})).rejects.toThrow(/query/);
    await expect(tool.executor!({ query: "" })).rejects.toThrow(/query/);
  });

  it("clamps an LLM-supplied limit to the per-turn volume budget (Tier-0 PR3)", async () => {
    // RECALL_MAX_LIMIT (50) is the hard arg ceiling, but the PR3 extraction-
    // resistance per-turn volume budget (40) is tighter and now wins, with a
    // truncation notice appended.
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(bulkVault(60));
    const tool = createRecallTool(makeCtx(), { types: ["fact"] });

    const output = await tool.executor!({ query: QUERY, limit: 999 });

    expect(RECALL_MAX_LIMIT).toBe(50);
    expect(RECALL_MAX_MEMORIES_PER_TURN).toBeLessThan(RECALL_MAX_LIMIT);
    expect(output).toContain(`Found ${RECALL_MAX_MEMORIES_PER_TURN} relevant memories`);
    expect(output).toContain("truncated");
  });

  it("uses the default limit of 8 when the LLM omits it", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(bulkVault(20));
    const tool = createRecallTool(makeCtx(), { types: ["fact"] });

    const output = await tool.executor!({ query: QUERY });

    expect(output).toContain("Found 8 relevant memories");
  });

  it("floors the limit at 14 when the tool is configured with budget=high", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(bulkVault(30));
    const tool = createRecallTool(makeCtx(), { types: ["fact"], budget: "high" });

    const output = await tool.executor!({ query: QUERY, limit: 8 });

    expect(output).toContain("Found 14 relevant memories");
  });

  it("returns an error string (does not throw) when recall fails downstream", async () => {
    // Use the query-embedding call as the failure injection point — it's
    // unguarded, unlike the cross-encoder rerank which now soft-degrades.
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("boom"));
    const tool = createRecallTool(makeCtx(), { types: ["fact"], budget: "mid" });

    const output = await tool.executor!({ query: QUERY });

    expect(output).toBe("Error searching memory: boom");
  });

  it("reports retrieved fact ids via onFactsRetrieved", async () => {
    const onFactsRetrieved = vi.fn();
    const tool = createRecallTool(makeCtx(), { types: ["fact"] }, { onFactsRetrieved });

    await tool.executor!({ query: QUERY });

    expect(onFactsRetrieved).toHaveBeenCalledWith(["m1", "m2"]);
  });

  it("reports ranked facts with scores via onFactsRanked, highest first", async () => {
    const onFactsRanked = vi.fn();
    const tool = createRecallTool(makeCtx(), { types: ["fact"] }, { onFactsRanked });

    await tool.executor!({ query: QUERY });

    expect(onFactsRanked).toHaveBeenCalledTimes(1);
    const facts = onFactsRanked.mock.calls[0][0] as { id: string; score: number }[];
    expect(facts.map((f) => f.id)).toEqual(["m1", "m2"]);
    for (const f of facts) expect(Number.isFinite(f.score)).toBe(true);
    // Results are surfaced in rank order (relevance descending).
    expect(facts[0].score).toBeGreaterThanOrEqual(facts[1].score);
  });

  it("fires onFactsRetrieved and onFactsRanked with the same ids", async () => {
    const onFactsRetrieved = vi.fn();
    const onFactsRanked = vi.fn();
    const tool = createRecallTool(
      makeCtx(),
      { types: ["fact"] },
      { onFactsRetrieved, onFactsRanked }
    );

    await tool.executor!({ query: QUERY });

    const rankedIds = (onFactsRanked.mock.calls[0][0] as { id: string }[]).map((f) => f.id);
    expect(onFactsRetrieved).toHaveBeenCalledWith(rankedIds);
  });
});
