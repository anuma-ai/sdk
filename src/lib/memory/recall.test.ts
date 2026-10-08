import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/chat/operations", () => ({
  searchChunksOp: vi.fn(),
}));

vi.mock("../db/entities/operations", () => ({
  getMemoriesByEntityNamesOp: vi.fn(),
  getEntitiesByMemoryIdsOp: vi.fn(),
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

vi.mock("../memoryVault/decomposeQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../memoryVault/decomposeQuery")>();
  return {
    ...actual,
    decomposeQuery: vi.fn(),
  };
});

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
  type EntityOperationsContext,
  getEntitiesByMemoryIdsOp,
  getMemoriesByEntityNamesOp,
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

import { recall } from "./recall";
import { createRecallTool, RECALL_MAX_LIMIT, RECALL_MAX_MEMORIES_PER_TURN } from "./recallTool";
import { RerankerUnavailableError, rerankPairs } from "./reranker";
import type { RecallContext, RecallDiagnostics } from "./types";

const QUERY = "pets animals owned";
const M1 = "Owns a golden retriever named Bailey";
const M2 = "Enjoys hiking trails near Boulder";
const M3 = "Prefers oat milk lattes";

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
  vi.mocked(getActiveVaultMemoryIdsOp).mockImplementation(
    async (_ctx, ids: string[]) => new Set(ids)
  );
  vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map());
  vi.mocked(getEntitiesByMemoryIdsOp).mockResolvedValue(new Map());
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

  it("reports the requested budget even on the empty-query early return", async () => {
    const result = await recall("", makeCtx(), { budget: "high" });
    expect(result.usedBudget).toBe("high");
  });
});

describe("recall — budget tiers", () => {
  it("defaults to budget=low: no rerank, no decompose, results ranked by fused score", async () => {
    const result = await recall(QUERY, makeCtx());

    expect(result.usedBudget).toBe("low");
    expect(result.reranked).toBe(false);
    expect(rerankPairs).not.toHaveBeenCalled();
    expect(decomposeQuery).not.toHaveBeenCalled();

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

  it("budget=high stays high without decomposeOptions (719/B4 — recall is LLM-free)", async () => {
    const result = await recall(QUERY, makeCtx(), { budget: "high" });

    expect(result.usedBudget).toBe("high");
    expect(decomposeQuery).not.toHaveBeenCalled();
    expect(rerankPairs).toHaveBeenCalled();
    expect(result.memories[0].id).toBe("m1");
  });

  it("budget=high WITH decomposeOptions does NOT invoke LLM rewrite inside recall()", async () => {
    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      decomposeOptions: { apiKey: "llm-key", model: "openai/gpt-5-mini" },
    });

    expect(result.usedBudget).toBe("high");
    expect(decomposeQuery).not.toHaveBeenCalled();
    expect(generateEmbeddings).not.toHaveBeenCalled();
    expect(result.memories[0].id).toBe("m1");
  });

  it("subQueries (≥2) drives the composite ranker without an LLM call", async () => {
    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      subQueries: ["sub one", "sub two", "sub three"],
    });

    expect(result.usedBudget).toBe("high");
    expect(decomposeQuery).not.toHaveBeenCalled();
    expect(generateEmbeddings).toHaveBeenCalledWith(
      ["sub one", "sub two", "sub three"],
      expect.anything()
    );
    expect(result.memories[0].id).toBe("m1");
  });

  it("composite path does NOT leak zero-score tail items past the minScore floor", async () => {
    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      subQueries: ["sub one", "sub two"],
    });

    expect(result.memories.find((m) => m.id === "m3")).toBeUndefined();
  });

  it("a single subQuery entry stays on the single-query path", async () => {
    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      subQueries: [QUERY],
    });

    expect(result.memories.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(generateEmbeddings).not.toHaveBeenCalled();
    expect(result.usedBudget).toBe("high");
    expect(result.reranked).toBe(true);
  });

  it("normalizes subQueries before composite ranking (trim/dedupe/cap)", async () => {
    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      subQueries: [
        "  sub one ",
        "sub one",
        "",
        "sub two",
        "SUB TWO",
        "sub three",
        "sub four",
        "sub five",
        "sub six ignored",
      ],
    });

    expect(result.usedBudget).toBe("high");
    expect(generateEmbeddings).toHaveBeenCalledWith(
      ["sub one", "sub two", "sub three", "sub four", "sub five"],
      expect.anything()
    );
  });

  it("degrades to the V2 ranking and reports reranked:false when the CE fails", async () => {
    vi.mocked(rerankPairs).mockRejectedValue(new Error("CE model download failed"));

    const result = await recall(QUERY, makeCtx(), { budget: "mid" });

    expect(result.memories.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(result.reranked).toBe(false);
  });

  it("reports reranked:false when the cross-encoder is unavailable (e.g. React Native)", async () => {
    vi.mocked(rerankPairs).mockRejectedValue(new RerankerUnavailableError(undefined));

    const result = await recall(QUERY, makeCtx(), { budget: "high" });

    expect(result.usedBudget).toBe("high");
    expect(result.reranked).toBe(false);
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

    expect(searchChunksOp).toHaveBeenCalledWith(
      storageCtx,
      vecFor(QUERY),
      expect.objectContaining({ limit: 16 })
    );

    expect(result.memories.map((m) => m.id)).toEqual(["m1", "c1", "m2"]);
    expect(result.memories).toHaveLength(3);
    expect(result.candidateCount).toBe(4);
    expect(result.memories[0].score).toBeCloseTo(1 / 61, 10);
    expect(result.memories[1].score).toBeCloseTo(1 / 61, 10);
    expect(result.memories[2].score).toBeCloseTo(1 / 62, 10);
    expect(result.memories[1].scoreBreakdown?.fused).toBe(0.9);
    expect(result.memories.map((m) => m.kind)).toEqual(["fact", "chunk", "fact"]);
  });

  it("suppresses a chunk whose message originated a surfaced fact (cross-lane dedup)", async () => {
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
    expect(ids).not.toContain("c1");
    expect(result.memories.find((m) => m.id === "c1")).toBeUndefined();
  });

  it("does NOT suppress an origin chunk when its fact never surfaces (limit cut)", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", M1),
      { ...makeMemory("m2", M2), sourceChunkIds: ["c1"] },
    ]);
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c1", "conv-1", 0.9)]);

    const result = await recall(QUERY, makeCtx(), { types: ["fact", "chunk"], limit: 2 });

    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("m1");
    expect(ids).toContain("c1");
    expect(ids).not.toContain("m2");
  });

  it("suppresses an origin chunk even when it outranks its own surfacing fact", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", M1),
      { ...makeMemory("m2", M2), sourceChunkIds: ["c1"] },
    ]);
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c1", "conv-1", 0.99)]);

    const result = await recall(QUERY, makeCtx(), { types: ["fact", "chunk"] });

    const ids = result.memories.map((m) => m.id);
    expect(ids).toContain("m1");
    expect(ids).toContain("m2");
    expect(ids).not.toContain("c1");
    expect(result.memories.find((m) => m.id === "m2")?.sourceChunkIds).toEqual(["c1"]);
  });

  it("skips RRF when one lane comes back empty (raw scores preserved)", async () => {
    const result = await recall(QUERY, makeCtx(), { types: ["fact", "chunk"] });
    expect(result.memories[0].id).toBe("m1");
    expect(result.memories[0].score).toBeGreaterThan(0.5);
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

  it("pushes excludeConversationId down into the chunk scan", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c2", "conv-other", 0.8)]);

    const result = await recall(QUERY, makeCtx(), {
      types: ["chunk"],
      excludeConversationId: "conv-current",
    });

    expect(vi.mocked(searchChunksOp).mock.calls[0][2]).toMatchObject({
      excludeConversationId: "conv-current",
    });
    expect(result.memories.map((m) => m.id)).toEqual(["c2"]);
  });

  it("restricts topic membership before ranking and excludes unscoped chunks", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m2", M2)]);
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c1", "other", 0.99)]);
    const result = await recall(QUERY, makeCtx(), { memoryIds: ["m2"], types: ["fact", "chunk"] });
    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(vaultCtx, { memoryIds: ["m2"] });
    expect(searchChunksOp).not.toHaveBeenCalled();
    expect(result.memories.map((m) => m.id)).toEqual(["m2"]);
  });

  it("reports the dropped chunk lane so a scoped caller can tell it from an empty vault", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);
    const onDiagnostics = vi.fn();
    const result = await recall(QUERY, makeCtx(), {
      memoryIds: ["m2"],
      types: ["chunk"],
      onDiagnostics,
    });
    expect(result.memories).toEqual([]);
    expect(searchChunksOp).not.toHaveBeenCalled();
    const [diagnostics] = onDiagnostics.mock.calls[0];
    expect(diagnostics.degraded).toContain("chunks-scope-restricted");
    expect(diagnostics.emptyReason).not.toBe("no-lanes");
  });

  it("passes scopes and folderId through to the vault query", async () => {
    await recall(QUERY, makeCtx(), { scopes: ["work"], folderId: null });
    expect(getAllVaultMemoriesOp).toHaveBeenCalledWith(vaultCtx, {
      scopes: ["work"],
      folderId: null,
    });
  });

  it("forwards decryptLast through to searchVaultMemoriesWithSize", async () => {
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

  it("recovers the lane for an all-lowercase query via the fallback (D4)", async () => {
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
    expect(getMemoriesByEntityNamesOp).toHaveBeenCalledWith(entityCtx, ["sara"]);
  });

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
});

describe("recall — auxiliary lane fail-isolation", () => {
  it("a throwing graph lane still returns primary cosine/BM25 results", async () => {
    vi.mocked(getMemoriesByEntityNamesOp).mockRejectedValue(new Error("watermelon boom"));

    const result = await recall(M1, makeCtx({ entityCtx }), { budget: "high" });

    expect(getMemoriesByEntityNamesOp).toHaveBeenCalled();
    expect(result.memories.map((m) => m.id)).toContain("m1");
  });

  it("a throwing temporal lane does not reject recall", async () => {
    vi.mocked(getMemoriesByEventTimeOp).mockRejectedValue(new Error("watermelon boom"));
    await expect(recall("what did i do yesterday", makeCtx())).resolves.toBeDefined();
    expect(getMemoriesByEventTimeOp).toHaveBeenCalled();
  });
});

describe("recall — temporal (W6) lane", () => {
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
    expect(result.candidateCount).toBe(2);
  });

  it("dedupes chunks by text, keeping distinct passages from the same message", async () => {
    const passageA = "the first passage from message m1";
    const passageB = "a different passage from the same message m1";
    vi.mocked(searchChunksOp).mockResolvedValue([
      { ...makeChunk("m1", "conv1", 0.9), chunkText: passageA },
      { ...makeChunk("m1", "conv1", 0.9), chunkText: passageA },
      { ...makeChunk("m1", "conv1", 0.85), chunkText: passageB },
    ]);

    const result = await recall(QUERY, makeCtx({ storageCtx }), { types: ["chunk"] });

    expect(result.memories.map((m) => m.content)).toEqual([passageA, passageB]);
    expect(result.candidateCount).toBe(2);
  });

  it("does not merge distinct facts that both have blank content", async () => {
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
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("dup-a", M1),
      makeMemory("dup-b", M1),
      makeMemory("m2", M2),
    ]);
    const c1 = makeChunk("c1", "conv1", 0.9);
    vi.mocked(searchChunksOp).mockResolvedValue([
      c1,
      makeChunk("c1", "conv1", 0.9),
      { ...makeChunk("c2", "conv2", 0.8), chunkText: c1.chunkText },
    ]);

    const result = await recall(QUERY, makeCtx({ storageCtx }), { types: ["fact", "chunk"] });

    expect(result.candidateCount).toBe(3);
    const contents = result.memories.map((m) => m.content);
    expect(new Set(contents).size).toBe(contents.length);
    expect(contents).toContain(M1);
    expect(contents).toContain(M2);
    expect(contents).toContain(c1.chunkText);
  });

  it("keeps distinct same-message passages through the fused path", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1fact", M1)]);
    const passageA = "passage A from message msg-1";
    const passageB = "passage B from message msg-1";
    vi.mocked(searchChunksOp).mockResolvedValue([
      { ...makeChunk("msg-1", "conv1", 0.9), chunkText: passageA },
      { ...makeChunk("msg-1", "conv1", 0.85), chunkText: passageB },
    ]);

    const result = await recall(QUERY, makeCtx({ storageCtx }), { types: ["fact", "chunk"] });

    const contents = result.memories.map((m) => m.content);
    expect(contents).toContain(passageA);
    expect(contents).toContain(passageB);
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
    vi.mocked(getAllVaultMemoriesOp).mockRejectedValue(new Error("boom"));
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
    expect(d.factCount).toBe(result.candidateCount);
    expect(d.chunkCount).toBe(0);
    expect(d.timings.total).toBeGreaterThanOrEqual(0);
    expect(d.timings.factLane).toBeGreaterThanOrEqual(0);
    expect(typeof d.vaultSize).toBe("number");
  });

  const CE_DELAY_MS = 25;
  const slowCe = (outcome: "resolve" | "reject") =>
    vi.mocked(rerankPairs).mockImplementation(async (_query, items) => {
      const until = performance.now() + CE_DELAY_MS;
      while (performance.now() < until) {
        /* spin */
      }
      if (outcome === "reject") throw new Error("CE died mid-inference");
      return items.map((item) => ({ ...item, score: 0.5 }));
    });

  it("attributes the cross-encoder's wall-clock to timings.rerank", async () => {
    slowCe("resolve");
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), { budget: "mid", onDiagnostics: (d) => seen.push(d) });

    expect(seen[0].reranked).toBe(true);
    expect(seen[0].timings.rerank).toBeGreaterThanOrEqual(CE_DELAY_MS);
    expect(seen[0].timings.rerank).toBeLessThanOrEqual(seen[0].timings.factLane);
  });

  it("reports timings.rerank = 0 when no rerank was requested", async () => {
    slowCe("resolve");
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), { budget: "low", onDiagnostics: (d) => seen.push(d) });

    expect(seen[0].reranked).toBe(false);
    expect(rerankPairs).not.toHaveBeenCalled();
    expect(seen[0].timings.rerank).toBe(0);
  });

  it("still bills a cross-encoder that threw after burning the time", async () => {
    slowCe("reject");
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), { budget: "mid", onDiagnostics: (d) => seen.push(d) });

    expect(seen[0].reranked).toBe(false);
    expect(seen[0].degraded).toContain("rerank-unavailable");
    expect(seen[0].timings.rerank).toBeGreaterThanOrEqual(CE_DELAY_MS);
  });

  it("attributes the query embed to timings.queryEmbed, inside the fact lane", async () => {
    const seen: RecallDiagnostics[] = [];
    vi.mocked(generateEmbedding).mockImplementation(async (text) => {
      const until = performance.now() + CE_DELAY_MS;
      while (performance.now() < until) {
        /* spin */
      }
      return vecFor(text);
    });

    await recall(QUERY, makeCtx(), { budget: "low", onDiagnostics: (d) => seen.push(d) });

    expect(seen[0].timings.queryEmbed).toBeGreaterThanOrEqual(CE_DELAY_MS);
    expect(seen[0].timings.queryEmbed).toBeLessThanOrEqual(seen[0].timings.factLane);
    expect(seen[0].timings.queryEmbed + seen[0].timings.rerank).toBeLessThanOrEqual(
      seen[0].timings.factLane
    );
  });

  it("reports queryEmbed = 0 on an empty vault, which returns before embedding", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), { budget: "low", onDiagnostics: (d) => seen.push(d) });

    expect(seen[0].vaultSize).toBe(0);
    expect(seen[0].timings.queryEmbed).toBe(0);
    expect(generateEmbedding).not.toHaveBeenCalled();
  });

  it("counts rows the lane had to re-embed, uncapped, on the legacy read path", async () => {
    const stale = Array.from({ length: 12 }, (_, i) => ({
      ...makeMemory(`m${i}`, `fact number ${i}`),
      embeddingModel: "provider/retired-model-v1",
    }));
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue(stale);
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), { budget: "low", onDiagnostics: (d) => seen.push(d) });

    expect(seen[0].vaultSize).toBe(12);
    expect(seen[0].vaultRowsEmbedded).toBe(12);
  });

  it("reports vaultRowsEmbedded = 0 when every stored vector is usable", async () => {
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), { budget: "low", onDiagnostics: (d) => seen.push(d) });

    expect(seen[0].vaultRowsEmbedded).toBe(0);
  });

  it("flags rerank-unavailable when the cross-encoder fails", async () => {
    vi.mocked(rerankPairs).mockRejectedValue(new RerankerUnavailableError(undefined));
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), { budget: "mid", onDiagnostics: (d) => seen.push(d) });

    expect(seen[0].reranked).toBe(false);
    expect(seen[0].degraded).toContain("rerank-unavailable");
  });

  it("does NOT flag rerank-unavailable on a chunk-only recall (rerank never attempted)", async () => {
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

  it("does NOT flag decompose-unavailable (719/B4 — signal is retired)", async () => {
    const seen: RecallDiagnostics[] = [];

    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      onDiagnostics: (d) => seen.push(d),
    });

    expect(result.usedBudget).toBe("high");
    expect(seen[0].degraded).not.toContain("decompose-unavailable");
  });

  it("flags decompose-moved when high budget still passes decomposeOptions without subQueries", async () => {
    const seen: RecallDiagnostics[] = [];

    const result = await recall(QUERY, makeCtx(), {
      budget: "high",
      decomposeOptions: { apiKey: "legacy-key" },
      onDiagnostics: (d) => seen.push(d),
    });

    expect(result.usedBudget).toBe("high");
    expect(seen[0].degraded).toContain("decompose-moved");
    expect(seen[0].degraded).not.toContain("decompose-unavailable");
  });

  it("does not flag decompose-moved when high budget supplies subQueries", async () => {
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), {
      budget: "high",
      decomposeOptions: { apiKey: "legacy-key" },
      subQueries: ["facet one?", "facet two?"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0].degraded).not.toContain("decompose-moved");
  });

  it("does not flag decompose-moved when high budget uses decomposeOptions only for graphRefine", async () => {
    const seen: RecallDiagnostics[] = [];

    await recall(QUERY, makeCtx(), {
      budget: "high",
      graphRefine: true,
      decomposeOptions: { apiKey: "graph-key" },
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0].degraded).not.toContain("decompose-moved");
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
});

describe("recall — embeddings outage degrades instead of throwing", () => {
  it("still returns BM25 hits and reports embeddings-unavailable", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "allergic to shellfish")]);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("provider down"));

    const seen: RecallDiagnostics[] = [];
    const result = await recall("shellfish", makeCtx(), {
      onDiagnostics: (d) => seen.push(d),
    });

    expect(result.memories.map((m) => m.content)).toContain("allergic to shellfish");
    expect(seen[0].degraded).toContain("embeddings-unavailable");
  });

  it("skips the chunk lane rather than failing the fact lane with it", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "allergic to shellfish")]);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("provider down"));

    const seen: RecallDiagnostics[] = [];
    const result = await recall("shellfish", makeCtx(), {
      types: ["fact", "chunk"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(result.memories.length).toBeGreaterThan(0);
    expect(seen[0].chunkCount).toBe(0);
    expect(seen[0].degraded).toContain("embeddings-unavailable");
    expect(vi.mocked(searchChunksOp)).not.toHaveBeenCalled();
  });

  it("does not report the degradation when embeddings are healthy", async () => {
    const seen: RecallDiagnostics[] = [];
    await recall(QUERY, makeCtx(), { onDiagnostics: (d) => seen.push(d) });
    expect(seen[0].degraded).not.toContain("embeddings-unavailable");
  });

  it("skips the chunk lane on an empty (not thrown) query embedding", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "allergic to shellfish")]);
    vi.mocked(generateEmbedding).mockResolvedValue([]);

    const seen: RecallDiagnostics[] = [];
    await recall("shellfish", makeCtx(), {
      types: ["fact", "chunk"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(vi.mocked(searchChunksOp)).not.toHaveBeenCalled();
    expect(seen[0].chunkCount).toBe(0);
    expect(seen[0].degraded).toContain("embeddings-unavailable");
  });

  it("degrades the fact lane too on a failed shared embed, without a second attempt", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "allergic to shellfish")]);
    vi.mocked(generateEmbedding)
      .mockRejectedValueOnce(new Error("provider down"))
      .mockResolvedValue([1, 0, 0]);

    const seen: RecallDiagnostics[] = [];
    const result = await recall("shellfish", makeCtx(), {
      types: ["fact", "chunk"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(vi.mocked(generateEmbedding)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(searchChunksOp)).not.toHaveBeenCalled();
    expect(result.memories.map((m) => m.content)).toContain("allergic to shellfish");
    expect(seen[0].degraded).toContain("embeddings-unavailable");
  });
});

describe("recall — a fact lane with nothing to rank cannot vouch for cosine", () => {
  it("reports the outage when the vault is EMPTY and the chunk embed fails", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);
    vi.mocked(countActiveVaultMemoriesOp).mockResolvedValue(0);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("provider down"));

    const seen: RecallDiagnostics[] = [];
    const result = await recall("shellfish", makeCtx(), {
      types: ["fact", "chunk"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(result.memories).toHaveLength(0);
    expect(vi.mocked(searchChunksOp)).not.toHaveBeenCalled();
    expect(seen[0].degraded).toContain("embeddings-unavailable");
  });

  it("reports the outage when every vault row is undecryptable and the chunk embed fails", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", `enc:v2:${"a".repeat(64)}`),
    ]);
    vi.mocked(generateEmbedding).mockRejectedValue(new Error("provider down"));

    const seen: RecallDiagnostics[] = [];
    await recall("shellfish", makeCtx(), {
      types: ["fact", "chunk"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0].degraded).toContain("embeddings-unavailable");
  });

  it("still stays quiet when the fact lane genuinely ranked on cosine", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "allergic to shellfish")]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(generateEmbeddings).mockResolvedValue([[1, 0, 0]]);

    const seen: RecallDiagnostics[] = [];
    await recall("shellfish", makeCtx(), {
      types: ["fact", "chunk"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0].degraded).not.toContain("embeddings-unavailable");
  });
});

describe("recall — diagnostics: what was admitted", () => {
  it("separates what was considered from what was returned, and flags the cut", async () => {
    const seen: RecallDiagnostics[] = [];
    const result = await recall(QUERY, makeCtx(), {
      types: ["fact", "chunk"],
      limit: 1,
      onDiagnostics: (d) => seen.push(d),
    });

    const d = seen[0];
    expect(result.memories).toHaveLength(1);
    expect(d.admittedCount).toBe(1);
    expect(d.candidateCount).toBeGreaterThan(d.admittedCount);
    expect(d.truncated).toBe(true);
  });

  it("does not claim truncation when everything fit", async () => {
    const seen: RecallDiagnostics[] = [];
    await recall(QUERY, makeCtx(), {
      types: ["fact"],
      limit: 50,
      onDiagnostics: (d) => seen.push(d),
    });
    expect(seen[0].truncated).toBe(false);
  });

  it("reports the admitted score range and the floor it cleared", async () => {
    const seen: RecallDiagnostics[] = [];
    const result = await recall(QUERY, makeCtx(), {
      types: ["fact"],
      minScore: 0.2,
      onDiagnostics: (d) => seen.push(d),
    });

    const d = seen[0];
    const scores = result.memories.map((m) => m.score);
    expect(d.topScore).toBeCloseTo(Math.max(...scores), 10);
    expect(d.lowestAdmittedScore).toBeCloseTo(Math.min(...scores), 10);
    expect(d.minScoreApplied).toBe(0.2);
  });

  it("sentinels the scores rather than reporting 0 when nothing was admitted", async () => {
    const seen: RecallDiagnostics[] = [];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);
    vi.mocked(countActiveVaultMemoriesOp).mockResolvedValue(0);

    const result = await recall(QUERY, makeCtx(), {
      types: ["fact"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(result.memories).toHaveLength(0);
    expect(seen[0]).toMatchObject({ admittedCount: 0, topScore: -1, lowestAdmittedScore: -1 });
  });

  it("reports the floor of the lane that ran, and -1 when none did", async () => {
    const factOnly: RecallDiagnostics[] = [];
    await recall(QUERY, makeCtx(), { types: ["fact"], onDiagnostics: (d) => factOnly.push(d) });
    expect(factOnly[0].minScoreApplied).toBe(0.1);

    const chunkOnly: RecallDiagnostics[] = [];
    await recall(QUERY, makeCtx(), { types: ["chunk"], onDiagnostics: (d) => chunkOnly.push(d) });
    expect(chunkOnly[0].minScoreApplied).toBe(0.5);

    const none: RecallDiagnostics[] = [];
    await recall("   ", makeCtx(), { onDiagnostics: (d) => none.push(d) });
    expect(none[0].minScoreApplied).toBe(-1);
  });

  it("reports the CHUNK floor when a mixed recall's fact lane returns nothing", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);
    vi.mocked(countActiveVaultMemoriesOp).mockResolvedValue(0);
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c1", "conv-1", 0.9)]);

    const seen: RecallDiagnostics[] = [];
    const result = await recall(QUERY, makeCtx(), {
      types: ["fact", "chunk"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0].factCount).toBe(0);
    expect(result.memories.length).toBeGreaterThan(0);
    expect(seen[0].minScoreApplied).toBe(0.5);
  });

  it("still reports the floor a lane applied when nothing was admitted", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);
    vi.mocked(countActiveVaultMemoriesOp).mockResolvedValue(0);

    const seen: RecallDiagnostics[] = [];
    await recall(QUERY, makeCtx(), { types: ["fact"], onDiagnostics: (d) => seen.push(d) });

    expect(seen[0].admittedCount).toBe(0);
    expect(seen[0].minScoreApplied).toBe(0.1);
  });
});

describe("recall — diagnostics: emptyReason", () => {
  it("is empty on a turn that returned something", async () => {
    const seen: RecallDiagnostics[] = [];
    await recall(QUERY, makeCtx(), { types: ["fact"], onDiagnostics: (d) => seen.push(d) });
    expect(seen[0].emptyReason).toBe("");
  });

  it("names a blank query", async () => {
    const seen: RecallDiagnostics[] = [];
    await recall("   ", makeCtx(), { onDiagnostics: (d) => seen.push(d) });
    expect(seen[0].emptyReason).toBe("empty-query");
  });

  it("names an empty vault", async () => {
    const seen: RecallDiagnostics[] = [];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);
    vi.mocked(countActiveVaultMemoriesOp).mockResolvedValue(0);

    await recall(QUERY, makeCtx(), { types: ["fact"], onDiagnostics: (d) => seen.push(d) });
    expect(seen[0].emptyReason).toBe("vault-empty");
  });

  it("names a populated vault that matched nothing", async () => {
    const seen: RecallDiagnostics[] = [];
    await recall("entirely unrelated subject matter", makeCtx(), {
      types: ["fact"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0]).toMatchObject({ admittedCount: 0, emptyReason: "no-candidates" });
  });

  it("names a context that could not serve the requested kinds", async () => {
    const seen: RecallDiagnostics[] = [];
    await recall(QUERY, makeCtx({ vaultCtx: undefined, vaultCache: undefined }), {
      types: ["fact"],
      onDiagnostics: (d) => seen.push(d),
    });
    expect(seen[0].emptyReason).toBe("no-lanes");
  });
});

describe("recall — diagnostics: side lanes", () => {
  it("counts what the graph and temporal lanes contributed", async () => {
    const seen: RecallDiagnostics[] = [];
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(new Map([["bailey", ["m1"]]]));
    vi.mocked(getMemoriesByEventTimeOp).mockResolvedValue([]);

    await recall("what do I know about Bailey", makeCtx({ entityCtx }), {
      types: ["fact"],
      onDiagnostics: (d) => seen.push(d),
    });

    const d = seen[0];
    expect(d.graphLaneCount).toBeGreaterThanOrEqual(0);
    expect(d.temporalLaneCount).toBe(0);
  });

  it("reports a thrown side lane instead of only logging it", async () => {
    const seen: RecallDiagnostics[] = [];
    vi.mocked(getMemoriesByEntityNamesOp).mockRejectedValue(new Error("db exploded"));

    const result = await recall("what do I know about Bailey", makeCtx({ entityCtx }), {
      types: ["fact"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(result.memories.length).toBeGreaterThan(0);
    expect(seen[0].degraded).toContain("graph-lane-failed");
  });

  it("reports a thrown temporal lane", async () => {
    const seen: RecallDiagnostics[] = [];
    vi.mocked(getMemoriesByEventTimeOp).mockRejectedValue(new Error("db exploded"));

    const result = await recall("what is coming up next week", makeCtx(), {
      types: ["fact"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(result.memories.length).toBeGreaterThanOrEqual(0);
    expect(seen[0].degraded).toContain("temporal-lane-failed");
  });
});

describe("recall — diagnostics: truncation is recorded at the cut", () => {
  it("does not claim truncation when provenance suppression brought the result under the limit", async () => {
    const factWithProvenance = makeMemory("m1", M1);
    factWithProvenance.sourceChunkIds = ["c1"];
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([factWithProvenance]);
    vi.mocked(countActiveVaultMemoriesOp).mockResolvedValue(1);
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c1", "conv-1", 0.9)]);

    const seen: RecallDiagnostics[] = [];
    const result = await recall(QUERY, makeCtx(), {
      types: ["fact", "chunk"],
      limit: 1,
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0].candidateCount).toBe(2);
    expect(result.memories).toHaveLength(1);
    expect(seen[0].truncated).toBe(false);
  });

  it("still reports truncation when an eligible result had no room", async () => {
    const seen: RecallDiagnostics[] = [];
    vi.mocked(searchChunksOp).mockResolvedValue([
      makeChunk("c1", "conv-1", 0.9),
      makeChunk("c2", "conv-1", 0.8),
    ]);

    await recall(QUERY, makeCtx(), {
      types: ["fact", "chunk"],
      limit: 1,
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0].truncated).toBe(true);
  });
});

describe("recall — diagnostics: emptyReason on a mixed recall", () => {
  it("does not blame an empty vault when the chunk lane also had a say", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);
    vi.mocked(countActiveVaultMemoriesOp).mockResolvedValue(0);
    vi.mocked(searchChunksOp).mockResolvedValue([]);

    const seen: RecallDiagnostics[] = [];
    await recall(QUERY, makeCtx(), {
      types: ["fact", "chunk"],
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0]).toMatchObject({ admittedCount: 0, emptyReason: "no-candidates" });
  });

  it("still blames the vault on a fact-only recall", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);
    vi.mocked(countActiveVaultMemoriesOp).mockResolvedValue(0);

    const seen: RecallDiagnostics[] = [];
    await recall(QUERY, makeCtx(), { types: ["fact"], onDiagnostics: (d) => seen.push(d) });
    expect(seen[0].emptyReason).toBe("vault-empty");
  });
});

describe("recall — the single-hop graph lane is bounded", () => {
  function manyEntityHits(n: number) {
    return new Map(
      Array.from({ length: n }, (_, i) => [`e${i}`, new Set(["sara"])] as [string, Set<string>])
    );
  }

  it("caps the single-hop lane at NODE_BUDGET by default", async () => {
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(manyEntityHits(200));
    const seen: RecallDiagnostics[] = [];

    await recall("Where is Sara traveling", makeCtx({ entityCtx }), {
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0].graphLaneCount).toBe(64);
  });

  it("honors a caller nodeBudget on the single-hop lane", async () => {
    vi.mocked(getMemoriesByEntityNamesOp).mockResolvedValue(manyEntityHits(200));
    const seen: RecallDiagnostics[] = [];

    await recall("Where is Sara traveling", makeCtx({ entityCtx }), {
      nodeBudget: 5,
      onDiagnostics: (d) => seen.push(d),
    });

    expect(seen[0].graphLaneCount).toBe(5);
  });
});

describe("recall — a mixed recall embeds the query once", () => {
  it("shares one query embedding between the chunk lane and the fact lane", async () => {
    vi.mocked(searchChunksOp).mockResolvedValue([makeChunk("c1", "conv-a", 0.9)]);

    await recall(QUERY, makeCtx(), { types: ["fact", "chunk"] });

    expect(vi.mocked(generateEmbedding)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(searchVaultMemoriesWithSize).mock.calls[0][4]).toMatchObject({
      queryEmbedding: vecFor(QUERY),
    });
    expect(vi.mocked(searchChunksOp).mock.calls[0][1]).toEqual(vecFor(QUERY));
  });

  it("still lets a fact-only recall embed inside the vault search (skipped on an empty vault)", async () => {
    vi.mocked(getAllVaultMemoriesOp).mockResolvedValue([]);

    await recall(QUERY, makeCtx(), { types: ["fact"] });

    expect(vi.mocked(generateEmbedding)).not.toHaveBeenCalled();
  });
});

it("preserves the receiver of class-based fact sources", async () => {
  class Source {
    vaultSize = 7;
    async search() {
      return { results: [], vaultSize: this.vaultSize };
    }
    async graphRanking() {
      return [];
    }
    async temporalRanking() {
      return [];
    }
  }
  const result = await recall(
    "tea",
    { factSource: new Source(), embeddingOptions: { apiKey: "k" } },
    { types: ["fact"] }
  );
  expect(result.memories).toEqual([]);
});
