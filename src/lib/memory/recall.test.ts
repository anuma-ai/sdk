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

// countEntitiesOp / listEntityNamesOp / getEntityWriteGeneration are reached
// through entityVocabulary.ts, not directly by recall.ts. They still have to be
// in this factory: a module mock replaces the WHOLE module, so omitting them
// makes every vocabulary load throw, get swallowed by the fail-soft catch, and
// silently route every entity-lane test below through the degraded path while
// still passing.
vi.mock("../db/entities/operations", () => ({
  getMemoriesByEntityNamesOp: vi.fn(),
  getEntitiesByMemoryIdsOp: vi.fn(),
  countEntitiesOp: vi.fn(),
  listEntityNamesOp: vi.fn(),
  getEntityWriteGeneration: vi.fn(),
}));

vi.mock("../db/memoryVault/operations", () => ({
  getAllVaultMemoriesOp: vi.fn(),
  getMemoriesByEventTimeOp: vi.fn(),
  updateVaultMemoryEmbeddingOp: vi.fn(),
  countActiveVaultMemoriesOp: vi.fn(),
  getActiveVaultMemoryIdsOp: vi.fn(),
}));

vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

vi.mock("./reranker", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./reranker")>()),
  rerankPairs: vi.fn(),
}));

vi.mock("../memoryVault/decomposeQuery", () => ({
  decomposeQuery: vi.fn(),
}));

// Wrap (not replace) so the real ranking pipeline still runs — this test
// file pins actual orchestration — while letting us assert on the
// `searchOptions` argument recall() forwards through.
vi.mock("../memoryVault/searchTool", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../memoryVault/searchTool")>();
  return {
    ...actual,
    searchVaultMemoriesWithSize: vi.fn(actual.searchVaultMemoriesWithSize),
  };
});

import { searchChunksOp, type StorageOperationsContext } from "../db/chat/operations";
import type { ChunkSearchResult } from "../db/chat/types";
import {
  countEntitiesOp,
  type EntityOperationsContext,
  getEntitiesByMemoryIdsOp,
  getEntityWriteGeneration,
  getMemoriesByEntityNamesOp,
  listEntityNamesOp,
} from "../db/entities/operations";
import {
  countActiveVaultMemoriesOp,
  getActiveVaultMemoryIdsOp,
  getAllVaultMemoriesOp,
  getMemoriesByEventTimeOp,
  updateVaultMemoryEmbeddingOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import { decomposeQuery } from "../memoryVault/decomposeQuery";
import { searchVaultMemoriesWithSize } from "../memoryVault/searchTool";

import { createEntityVocabularyCache } from "./entityVocabulary";
import { NODE_BUDGET } from "./graphTraversal";
import { recall } from "./recall";
import { createRecallTool, RECALL_MAX_LIMIT, RECALL_MAX_MEMORIES_PER_TURN } from "./recallTool";
import { RerankerUnavailableError, rerankPairs } from "./reranker";
import type { RecallContext, RecallDiagnostics } from "./types";

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
    vaultCache: new Map<string, Float32Array>(),
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
  vi.mocked(countActiveVaultMemoriesOp).mockResolvedValue(3);
  // Default: every discovered id is active (the traversal active-set filter is a
  // no-op unless a test archives something).
  vi.mocked(getActiveVaultMemoryIdsOp).mockImplementation(
    async (_ctx, ids: string[]) => new Set(ids)
  );
  vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map());
  vi.mocked(getEntitiesByMemoryIdsOp).mockResolvedValue(new Map());
  // Empty entity table by default ⇒ no vocabulary ⇒ the heuristic extractor,
  // which is what the pre-existing lane tests below assert against.
  vi.mocked(countEntitiesOp).mockResolvedValue(0);
  vi.mocked(listEntityNamesOp).mockResolvedValue([]);
  vi.mocked(getEntityWriteGeneration).mockReturnValue(0);
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

  it("degrades to the V2 ranking and reports reranked:false when the CE fails", async () => {
    // A transient CE failure must not error the whole recall — the search
    // layer catches it and returns the already-computed V2 ordering. The
    // reranked flag is threaded from the actual per-call outcome, so a degrade
    // (transient OR permanent) reports false — it did not rerank this call.
    vi.mocked(rerankPairs).mockRejectedValue(new Error("CE model download failed"));

    const result = await recall(QUERY, makeCtx(), { budget: "mid" });

    expect(result.memories.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(result.reranked).toBe(false);
  });

  it("reports reranked:false when the cross-encoder is unavailable (e.g. React Native)", async () => {
    // On RN the optional @huggingface/transformers dep is absent, so rerankPairs
    // throws RerankerUnavailableError; recall must report the honest flag rather
    // than echoing the budget's rerank intent.
    vi.mocked(rerankPairs).mockRejectedValue(new RerankerUnavailableError(undefined));

    const result = await recall(QUERY, makeCtx(), { budget: "high" });

    expect(result.usedBudget).toBe("mid"); // high downgrades w/o decomposeOptions
    expect(result.reranked).toBe(false);
    // Recall still returns the fused ranking — degradation is graceful.
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

  it("forwards decryptLast through to searchVaultMemoriesWithSize", async () => {
    // decryptLast:true flips searchVaultMemoriesWithSize onto the
    // projected-corpus path (Task 1-5, exercised by searchTool.test.ts),
    // which needs ops this file doesn't mock — irrelevant to what's under
    // test here (option pass-through), so swallow it and assert on the
    // recorded call args instead.
    await recall(QUERY, makeCtx(), { decryptLast: true }).catch(() => {});

    expect(searchVaultMemoriesWithSize).toHaveBeenCalledWith(
      QUERY,
      vaultCtx,
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ decryptLast: true })
    );
  });

  it("omits decryptLast from searchVaultMemoriesWithSize options when unset", async () => {
    await recall(QUERY, makeCtx());

    expect(searchVaultMemoriesWithSize).toHaveBeenCalledWith(
      QUERY,
      vaultCtx,
      expect.anything(),
      expect.anything(),
      expect.not.objectContaining({ decryptLast: expect.anything() })
    );
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

    expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, [
      "sara",
      "traveling",
      "sara traveling",
    ]);
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

  it("recovers the lane for an all-lowercase query via the lexical pass (D4)", async () => {
    // Pre-fix, an all-lowercase query extracted no entities and the W5 lane was
    // silently dead. The lexical pass now emits n-gram candidates; the op is
    // called with them, and a stored-entity match surfaces the graph-only
    // fixture m3 (zero cosine vs the query — only the graph lane can admit it).
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(
      new Map([["m3", new Set(["san francisco"])]])
    );

    const result = await recall("is there anyone in san francisco", makeCtx({ entityCtx }));

    expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, [
      "san",
      "francisco",
      "san francisco",
    ]);
    expect(result.memories.map((m) => m.id)).toContain("m3");
  });

  it("a lowercase query matching no stored entity adds no garbage (empty lane)", async () => {
    // The lexical candidates ARE looked up, but none match a stored canonical →
    // empty Map → the lane yields []. The op was called (lane engaged) yet m3
    // never surfaces: no cosine hit, no graph hit, no garbage. This is the
    // precision guarantee that lets the lexical pass over-emit safely.
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map());

    const result = await recall("is there anyone in san francisco", makeCtx({ entityCtx }));

    expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, [
      "san",
      "francisco",
      "san francisco",
    ]);
    expect(result.memories.map((m) => m.id)).not.toContain("m3");
  });

  it("falls back to vaultCtx.entityCtx when ctx.entityCtx is absent", async () => {
    const vaultCtxWithEntities = {
      entityCtx,
    } as VaultMemoryOperationsContext;
    await recall(ENTITY_QUERY, makeCtx({ vaultCtx: vaultCtxWithEntities }));
    expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, [
      "sara",
      "traveling",
      "sara traveling",
    ]);
  });

  // PR4 — multi-hop traversal gating. The reverse-edge op
  // getEntitiesByMemoryIdsOp is the tell that the BFS expanded past the seed;
  // it must fire ONLY on the high budget (traverse flag) AND only when the
  // caller opts into more than one hop.
  it("does NOT traverse (single-hop only) at budget=low", async () => {
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map([["m3", new Set(["sara"])]]));
    await recall(ENTITY_QUERY, makeCtx({ entityCtx }), { budget: "low" });
    expect(getEntitiesByMemoryIdsOp).not.toHaveBeenCalled();
  });

  it("does NOT traverse (single-hop only) at budget=mid", async () => {
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map([["m3", new Set(["sara"])]]));
    await recall(ENTITY_QUERY, makeCtx({ entityCtx }), { budget: "mid" });
    expect(getEntitiesByMemoryIdsOp).not.toHaveBeenCalled();
  });

  it("PR5: expands past the seed at budget=high with the default MAX_HOPS=2", async () => {
    // The PR5 default is 2 hops, so high budget now expands past the seed —
    // the reverse-edge op fires once on the seed frontier.
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map([["m3", new Set(["sara"])]]));
    vi.mocked(getEntitiesByMemoryIdsOp).mockResolvedValue(new Map());
    await recall(ENTITY_QUERY, makeCtx({ entityCtx }), { budget: "high" });
    expect(getEntitiesByMemoryIdsOp).toHaveBeenCalledTimes(1);
    expect(getEntitiesByMemoryIdsOp).toHaveBeenCalledWith(entityCtx, ["m3"]);
  });

  it("expands past the seed at budget=high with explicit maxHops>1", async () => {
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map([["m3", new Set(["sara"])]]));
    vi.mocked(getEntitiesByMemoryIdsOp).mockResolvedValue(new Map());
    await recall(ENTITY_QUERY, makeCtx({ entityCtx }), { budget: "high", maxHops: 2 });
    expect(getEntitiesByMemoryIdsOp).toHaveBeenCalledTimes(1);
    expect(getEntitiesByMemoryIdsOp).toHaveBeenCalledWith(entityCtx, ["m3"]);
  });

  it("PR5: caps to seed-only when the vault-size count exceeds the density threshold", async () => {
    // The threaded count (5000 > VAULT_SIZE_HOP_CAP) forces seed-only, so the
    // reverse-edge op never runs even at high budget with default hops.
    vi.mocked(countActiveVaultMemoriesOp).mockResolvedValue(5000);
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map([["m3", new Set(["sara"])]]));
    await recall(ENTITY_QUERY, makeCtx({ entityCtx }), { budget: "high" });
    expect(countActiveVaultMemoriesOp).toHaveBeenCalledWith(vaultCtx);
    expect(getEntitiesByMemoryIdsOp).not.toHaveBeenCalled();
  });

  it("PR5: single-hop budgets do NOT compute the vault-size count", async () => {
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map([["m3", new Set(["sara"])]]));
    await recall(ENTITY_QUERY, makeCtx({ entityCtx }), { budget: "low" });
    expect(countActiveVaultMemoriesOp).not.toHaveBeenCalled();
  });

  // The single-hop path is what low/mid budgets run, and it used to emit the
  // ENTIRE resolved set. One dense entity name ("work", "2024") could put
  // hundreds of ids into RRF and into the reranker's input, on the default path.
  describe("single-hop node cap", () => {
    const denseMatch = (n: number): Map<string, Set<string>> =>
      new Map(Array.from({ length: n }, (_, i) => [`g${i}`, new Set(["sara"])]));

    it("truncates a dense ranking to NODE_BUDGET", async () => {
      vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(denseMatch(200));
      const seen: RecallDiagnostics[] = [];

      await recall(ENTITY_QUERY, makeCtx({ entityCtx }), {
        onDiagnostics: (d) => seen.push(d),
      });

      expect(seen[0].graphCount).toBe(NODE_BUDGET);
    });

    it("sends at most NODE_BUDGET * 2 ids through the active-id filter", async () => {
      // The filter read is indexed and decrypt-free, but it is still an
      // `IN`-clause whose width the query text should not be able to choose.
      vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(denseMatch(200));

      await recall(ENTITY_QUERY, makeCtx({ entityCtx }));

      expect(vi.mocked(getActiveVaultMemoryIdsOp).mock.calls[0][1]).toHaveLength(NODE_BUDGET * 2);
    });

    it("probes past archived rows rather than letting them starve the lane", async () => {
      // Filtering AFTER the cap would let a run of archived ids at the top of
      // the ranking eat the whole budget. The 2x probe is what stops that.
      vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(denseMatch(200));
      vi.mocked(getActiveVaultMemoryIdsOp).mockImplementation(
        async (_ctx, ids: string[]) => new Set(ids.slice(NODE_BUDGET))
      );
      const seen: RecallDiagnostics[] = [];

      await recall(ENTITY_QUERY, makeCtx({ entityCtx }), {
        onDiagnostics: (d) => seen.push(d),
      });

      expect(seen[0].graphCount).toBe(NODE_BUDGET);
    });

    it("caps even without a vaultCtx to filter against", async () => {
      // No vault context means no active-id filter to piggyback the cap onto,
      // so the cap has to be applied on its own branch.
      vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(denseMatch(200));
      const seen: RecallDiagnostics[] = [];

      await recall(
        ENTITY_QUERY,
        { embeddingOptions: { apiKey: "test-key" }, entityCtx },
        { types: ["chunk"], onDiagnostics: (d) => seen.push(d) }
      );

      expect(getActiveVaultMemoryIdsOp).not.toHaveBeenCalled();
      expect(seen[0].graphCount).toBe(NODE_BUDGET);
    });
  });

  // The vocabulary tier resolves query tokens against the names the vault
  // actually holds instead of guessing at them. It is on by default whenever an
  // entityCtx is present, so the tests that matter are about when it does NOT
  // run and what happens when it cannot.
  describe("vocabulary tier", () => {
    const stockVault = (names: string[]): void => {
      vi.mocked(countEntitiesOp).mockResolvedValue(names.length);
      vi.mocked(listEntityNamesOp).mockResolvedValue(names);
    };

    it("resolves the query against stored names instead of guessing", async () => {
      stockVault(["sara park", "kyoto", "san francisco"]);

      await recall("where is sara", makeCtx({ entityCtx }));

      // The heuristic would have emitted ["sara"] — a name the vault does not
      // hold. Grounded, the token resolves to the canonical it belongs to.
      expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, ["sara park"]);
    });

    it("issues no vocabulary read at all when switched off", async () => {
      stockVault(["sara park"]);

      await recall("where is sara", makeCtx({ entityCtx }), { entityVocabulary: "off" });

      // Asserting only the candidates would pass vacuously — an unused
      // vocabulary and an unread one look identical from the output.
      expect(countEntitiesOp).not.toHaveBeenCalled();
      expect(listEntityNamesOp).not.toHaveBeenCalled();
      expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, ["sara"]);
    });

    it("stays off for a multi-user context, and does NOT report a degradation", async () => {
      // The entity table is global vocabulary with no owner, so a multi-user
      // process would index every user's names. That is a deliberate posture,
      // not an outage, and must not show up in the degradation metric.
      stockVault(["sara park"]);
      const scopedEntityCtx = { userId: "u1" } as EntityOperationsContext;
      const seen: RecallDiagnostics[] = [];

      await recall("where is sara", makeCtx({ entityCtx: scopedEntityCtx }), {
        onDiagnostics: (d) => seen.push(d),
      });

      expect(countEntitiesOp).not.toHaveBeenCalled();
      expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(scopedEntityCtx, ["sara"]);
      expect(seen[0].degraded).not.toContain("entity-vocabulary-unavailable");
    });

    it("falls back to the heuristic and reports a degradation when enumeration fails", async () => {
      vi.mocked(countEntitiesOp).mockResolvedValue(3);
      vi.mocked(listEntityNamesOp).mockRejectedValue(new Error("watermelon boom"));
      vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map([["m3", new Set(["sara"])]]));
      const seen: RecallDiagnostics[] = [];

      const result = await recall("where is sara", makeCtx({ entityCtx }), {
        onDiagnostics: (d) => seen.push(d),
      });

      expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, ["sara"]);
      expect(seen[0].degraded).toContain("entity-vocabulary-unavailable");
      // Degraded, not broken: the lane still returned its hit.
      expect(result.memories.map((m) => m.id)).toContain("m3");
    });

    it("treats an empty entity table as configuration, not failure", async () => {
      stockVault([]);
      const seen: RecallDiagnostics[] = [];

      await recall("where is sara", makeCtx({ entityCtx }), {
        onDiagnostics: (d) => seen.push(d),
      });

      expect(listEntityNamesOp).not.toHaveBeenCalled();
      expect(seen[0].degraded).not.toContain("entity-vocabulary-unavailable");
    });

    it("reuses a cached index across recalls while the entity table is unchanged", async () => {
      stockVault(["sara park"]);
      const entityVocabularyCache = createEntityVocabularyCache();
      const ctx = makeCtx({ entityCtx, entityVocabularyCache });

      await recall("where is sara", ctx);
      await recall("where is sara", ctx);

      // The version stamp is re-read every call (cheap, indexed COUNT); the
      // enumeration + index build is what the cache saves.
      expect(countEntitiesOp).toHaveBeenCalledTimes(2);
      expect(listEntityNamesOp).toHaveBeenCalledTimes(1);
    });

    it("rebuilds when the entity table's write generation moves under a stable count", async () => {
      // The case a row count alone cannot see: an orphan prune destroys one
      // entity while a re-extraction creates another. Count identical, name set
      // completely different. A count-keyed cache serves the stale index and the
      // brand-new name is unrecallable — the exact bug this lane exists to kill.
      stockVault(["sara park"]);
      const entityVocabularyCache = createEntityVocabularyCache();
      const ctx = makeCtx({ entityCtx, entityVocabularyCache });

      await recall("where is sara", ctx);

      vi.mocked(getEntityWriteGeneration).mockReturnValue(1);
      vi.mocked(listEntityNamesOp).mockResolvedValue(["kyoto"]);
      await recall("anything about kyoto", ctx);

      expect(listEntityNamesOp).toHaveBeenCalledTimes(2);
      expect(getMemoriesByEntityNamesOp).toHaveBeenLastCalledWith(entityCtx, ["kyoto"]);
    });

    it("threads resolved seeds into the multi-hop traversal rather than re-extracting", async () => {
      // The traversal has its own extractor. If the resolved seeds are not
      // handed down, the high budget silently reverts to the heuristic — the one
      // budget that can most afford the better one.
      stockVault(["sara park"]);
      vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map([["m3", new Set(["x"])]]));

      await recall("where is sara", makeCtx({ entityCtx }), { budget: "high" });

      expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, ["sara park"]);
    });
  });
});

describe("recall — auxiliary lane fail-isolation", () => {
  // The graph + temporal lanes are RRF side-signals sharing a Promise.all with
  // primary recall. A transient throw in one must NOT reject that Promise.all
  // and zero out primary cosine/BM25 recall (the regression this guards).
  it("a throwing graph lane still returns primary cosine/BM25 results", async () => {
    // Query M1 both matches m1 by cosine (1.0) AND yields extractable entities
    // (["owns","bailey"]), so the graph lane runs — and here throws.
    vi.mocked(getMemoriesByEntityNamesOp).mockRejectedValue(new Error("watermelon boom"));

    const result = await recall(M1, makeCtx({ entityCtx }), { budget: "high" });

    // The graph lane WAS exercised (the throw path)...
    expect(getMemoriesByEntityNamesOp).toHaveBeenCalled();
    // ...yet primary recall still surfaced the cosine hit.
    expect(result.memories.map((m) => m.id)).toContain("m1");
  });

  it("a throwing temporal lane does not reject recall", async () => {
    vi.mocked(getMemoriesByEventTimeOp).mockRejectedValue(new Error("watermelon boom"));
    // A temporal phrase activates the temporal lane, which throws. Pre-fix this
    // rejected the whole recall; now it degrades to an empty lane.
    await expect(recall("what did i do yesterday", makeCtx())).resolves.toBeDefined();
    expect(getMemoriesByEventTimeOp).toHaveBeenCalled();
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

  it("throws (does not leak an error string) when recall fails downstream", async () => {
    // Use the query-embedding call as the failure injection point — it's
    // unguarded, unlike the cross-encoder rerank which now soft-degrades.
    // The executor re-throws so the tool-loop treats it as a failed call,
    // rather than returning "Error searching memory: …" as a successful result
    // that leaks into the model's visible context (same rule as invalid args).
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("boom"));
    const tool = createRecallTool(makeCtx(), { types: ["fact"], budget: "mid" });

    await expect(tool.executor!({ query: QUERY })).rejects.toThrow(
      /recall_memory: search failed — boom/
    );
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

describe("recall — diagnostics (onDiagnostics)", () => {
  it("emits once with timings, lane counts, and no degradation on a clean rerank", async () => {
    const seen: RecallDiagnostics[] = [];
    const result = await recall(QUERY, makeCtx(), {
      budget: "mid",
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen).toHaveLength(1);
    const d = seen[0];
    expect(d.usedBudget).toBe("mid");
    expect(d.reranked).toBe(true);
    expect(d.degraded).toEqual([]);
    // Fact-only recall: lane count matches the returned candidate count.
    expect(d.factCount).toBe(result.candidateCount);
    expect(d.chunkCount).toBe(0);
    expect(d.timings.total).toBeGreaterThanOrEqual(0);
    expect(d.timings.factLane).toBeGreaterThanOrEqual(0);
    expect(typeof d.vaultSize).toBe("number");
  });

  it("flags rerank-unavailable when the cross-encoder fails", async () => {
    vi.mocked(rerankPairs).mockRejectedValue(new RerankerUnavailableError(undefined));
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), { budget: "mid", onDiagnostics: (d) => seen.push(d) });

    expect(seen[0].reranked).toBe(false);
    expect(seen[0].degraded).toContain("rerank-unavailable");
  });

  it("does NOT flag rerank-unavailable on a chunk-only recall (rerank never attempted)", async () => {
    // Chunk-only: no fact lane → no rerank candidates. A mid/high budget sets
    // flags.rerank, but there was nothing to rerank, so this must not be
    // reported as a degradation (it would inflate the outage metric).
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c1", "conv-1", 0.9)]);
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), {
      types: ["chunk"],
      budget: "mid",
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0].factCount).toBe(0);
    expect(seen[0].degraded).not.toContain("rerank-unavailable");
  });

  it("flags decompose-unavailable when budget:high lacks decomposeOptions", async () => {
    const seen: RecallDiagnostics[] = [];

    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      onDiagnostics: (d) => seen.push(d),
    });

    expect(result.usedBudget).toBe("mid");
    expect(seen[0].degraded).toContain("decompose-unavailable");
  });

  it("never lets a throwing diagnostics sink break recall", async () => {
    const result = await recall(QUERY, makeCtx(), {
      onDiagnostics: () => {
        throw new Error("sink boom");
      },
    });

    expect(result.memories.length).toBeGreaterThan(0);
  });

  it("emits diagnostics even for an empty query", async () => {
    const seen: RecallDiagnostics[] = [];

    await recall("", makeCtx(), { onDiagnostics: (d) => seen.push(d) });

    expect(seen).toHaveLength(1);
    expect(seen[0].candidateCount).toBe(0);
    expect(seen[0].factCount).toBe(0);
  });

  // graphSeedCount + graphCount exist to separate two failures that look
  // identical from outside: "the extractor produced nothing" and "the extractor
  // worked, the vault had nothing". Conflating them is how a dead lane stayed
  // invisible, so each of the four combinations gets its own pin.
  describe("W5 lane counters", () => {
    it("reports both the seed count and the contributed id count when the lane hits", async () => {
      vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(
        new Map([
          ["m3", new Set(["sara"])],
          ["m2", new Set(["sara"])],
        ])
      );
      const seen: RecallDiagnostics[] = [];

      await recall("Where is Sara traveling", makeCtx({ entityCtx }), {
        onDiagnostics: (d) => seen.push(d),
      });

      expect(seen[0].graphSeedCount).toBe(
        vi.mocked(getMemoriesByEntityNamesOp).mock.calls[0][1].length
      );
      expect(seen[0].graphCount).toBe(2);
    });

    it("distinguishes 'extraction worked, the vault had nothing' from a dead extractor", async () => {
      // Candidates WERE emitted and looked up; nothing matched. A lane that
      // stayed quiet for this reason is behaving correctly.
      vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map());
      const seen: RecallDiagnostics[] = [];

      await recall("Where is Sara traveling", makeCtx({ entityCtx }), {
        onDiagnostics: (d) => seen.push(d),
      });

      expect(seen[0].graphSeedCount).toBeGreaterThan(0);
      expect(seen[0].graphCount).toBe(0);
    });

    it("reports zero seeds for a query the extractor cannot resolve", async () => {
      const seen: RecallDiagnostics[] = [];

      await recall("is there anyone who can help me", makeCtx({ entityCtx }), {
        onDiagnostics: (d) => seen.push(d),
      });

      expect(getMemoriesByEntityNamesOp).not.toHaveBeenCalled();
      expect(seen[0].graphSeedCount).toBe(0);
      expect(seen[0].graphCount).toBe(0);
    });

    it("reports zeros when the lane never ran (no entityCtx)", async () => {
      const seen: RecallDiagnostics[] = [];

      await recall("Where is Sara traveling", makeCtx(), {
        onDiagnostics: (d) => seen.push(d),
      });

      expect(seen[0].graphSeedCount).toBe(0);
      expect(seen[0].graphCount).toBe(0);
    });
  });
});
