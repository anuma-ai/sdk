/**
 * Recall-reliability regressions for the vault search (anuma-ai/sdk#949).
 *
 * One `describe` per defect. Each test here was run against the pre-fix code
 * and failed there — see the PR for the revert log.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/memoryVault/operations", () => ({
  getAllVaultMemoriesOp: vi.fn(),
  updateVaultMemoryEmbeddingOp: vi.fn().mockResolvedValue(undefined),
  getVaultCandidateKeysOp: vi.fn(),
  getVaultEmbeddingsByIdsOp: vi.fn(),
  getVaultMemoriesByIdsOp: vi.fn(),
}));

vi.mock("../memoryEngine/embeddings", () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

vi.mock("../memory/reranker", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../memory/reranker")>()),
  rerankPairs: vi.fn(),
}));

import type { VaultMemoryOperationsContext } from "../db/memoryVault/operations";
import * as ops from "../db/memoryVault/operations";
import type { StoredVaultMemory } from "../db/memoryVault/types";
import { RECALL_MAX_LIMIT } from "../memory/recallConstants";
import { generateEmbedding, generateEmbeddings } from "../memoryEngine/embeddings";
import type { EmbeddingOptions } from "../memoryEngine/types";
import { createVaultEmbeddingCache } from "./lruCache";
import {
  rankFusedVaultMemories,
  rankFusedVaultMemoriesAsync,
  searchVaultMemoriesWithSize,
} from "./searchTool";
import { createMemoryVaultSearchTool } from "./searchToolExecutor";
import { cacheRowVector } from "./vectorVersion";

const vaultCtx = {} as VaultMemoryOperationsContext;
const embeddingOptions: EmbeddingOptions = { apiKey: "test-key" };
const NOW = new Date("2026-09-01T12:00:00Z");
const EVENT_MS = Date.parse("2026-03-14T00:00:00Z");

function makeMemory(
  id: string,
  content: string,
  overrides: Partial<StoredVaultMemory> = {}
): StoredVaultMemory {
  return {
    uniqueId: id,
    content,
    scope: "private",
    folderId: null,
    userId: null,
    embedding: null,
    createdAt: NOW,
    updatedAt: NOW,
    isDeleted: false,
    ...overrides,
  } as StoredVaultMemory;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Event dates + factType on the cosine path
// ---------------------------------------------------------------------------

describe("event-time anchors and factType survive every lane", () => {
  const dated = {
    eventTimeStart: EVENT_MS,
    eventTimeEnd: EVENT_MS,
    eventTimeKind: "point" as const,
    factType: "event",
  };

  it("carries them on a cosine-admitted row (sync fused ranker)", () => {
    const [top] = rankFusedVaultMemories(
      "birthday",
      [1, 0, 0],
      [{ id: "m1", content: "went to the party", embedding: [1, 0, 0], updatedAt: NOW, ...dated }],
      { minSimilarity: 0.1 }
    );

    expect(top).toMatchObject({ uniqueId: "m1", ...dated });
  });

  it("carries proofCount and lastObservedAt, which the C2 trend labels read", () => {
    const [top] = rankFusedVaultMemories(
      "party",
      [1, 0, 0],
      [
        {
          id: "m1",
          content: "went to the party",
          embedding: [1, 0, 0],
          updatedAt: NOW,
          proofCount: 4,
          lastObservedAt: EVENT_MS,
        },
      ],
      { minSimilarity: 0.1 }
    );

    expect(top).toMatchObject({ uniqueId: "m1", proofCount: 4, lastObservedAt: EVENT_MS });
  });

  it("carries them on a side-lane tail admission (sync and async)", async () => {
    // Zero cosine, no lexical overlap: only the entity lane can admit `lane`.
    const items = [
      { id: "head", content: "alpha", embedding: [1, 0, 0], updatedAt: NOW },
      { id: "lane", content: "zulu", embedding: [0, 1, 0], updatedAt: NOW, ...dated },
    ];
    const opts = { minSimilarity: 0.5, limit: 5, entityRanking: ["lane"] };

    const sync = rankFusedVaultMemories("alpha", [1, 0, 0], items, opts);
    const asyncRanked = await rankFusedVaultMemoriesAsync("alpha", [1, 0, 0], items, opts);

    expect(sync.find((r) => r.uniqueId === "lane")).toMatchObject(dated);
    expect(asyncRanked.find((r) => r.uniqueId === "lane")).toMatchObject(dated);
  });

  it("reaches searchVaultMemoriesWithSize results from the stored row", async () => {
    vi.mocked(ops.getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "went to the party", dated),
    ]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    const cache = createVaultEmbeddingCache();
    cacheRowVector(cache, "m1", Float32Array.from([1, 0, 0]), NOW, "went to the party");

    const { results } = await searchVaultMemoriesWithSize(
      "birthday",
      vaultCtx,
      embeddingOptions,
      cache
    );

    expect(results[0]).toMatchObject({ uniqueId: "m1", ...dated });
  });
});

// ---------------------------------------------------------------------------
// One side-lane fusion for both budgets
// ---------------------------------------------------------------------------

describe("side-lane fusion applies the recency/proof boost on both rankers", () => {
  // `old` out-scores `fresh` on cosine but is ten years stale, so the recency
  // boost puts `fresh` first. The entity lane then votes for `old`. Without the
  // boost multiplied back in after RRF, the lane vote alone decides it.
  // Pairwise cosine(old, fresh) ≈ 0.54, under the supersession threshold, so
  // only recency separates them.
  const items = [
    {
      id: "old",
      content: "xray one",
      embedding: [0.9, 0.4359, 0],
      updatedAt: new Date("2016-09-01T12:00:00Z"),
    },
    { id: "fresh", content: "yankee two", embedding: [0.85, -0.5268, 0], updatedAt: NOW },
  ];
  const opts = { limit: 5, recency: { now: NOW }, entityRanking: ["old"] };

  it("ranks a side-lane recall the same at low (sync) and mid (async) budget", async () => {
    const sync = rankFusedVaultMemories("alpha", [1, 0, 0], items, opts);
    const asyncRanked = await rankFusedVaultMemoriesAsync("alpha", [1, 0, 0], items, opts);

    expect(sync.map((r) => r.uniqueId)).toEqual(["fresh", "old"]);
    expect(asyncRanked.map((r) => r.uniqueId)).toEqual(sync.map((r) => r.uniqueId));
    asyncRanked.forEach((r, i) => expect(r.similarity).toBeCloseTo(sync[i].similarity, 12));
  });
});

// ---------------------------------------------------------------------------
// BM25 is blended when cosine can't carry the ranking
// ---------------------------------------------------------------------------

describe("BM25 carries the ranking when the query vector is empty", () => {
  it("lets BM25 rank an empty-vector search even at minSimilarity 0", () => {
    // At minSimilarity 0 every row clears the (all-zero) cosine floor, so the
    // old code left BM25 nothing to admit and the ranking was recency alone.
    const items = [
      { id: "plain", content: "a plain row", embedding: [], updatedAt: NOW },
      { id: "match", content: "the zebra crossing", embedding: [], updatedAt: NOW },
    ];

    const ranked = rankFusedVaultMemories("zebra", [], items, {
      minSimilarity: 0,
      recency: { now: NOW },
    });

    expect(ranked[0].uniqueId).toBe("match");
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    "falls back to the default divisor for an invalid bm25AdmissionDivisor (%s)",
    (divisor) => {
      const items = [
        { id: "weak", content: "zebra among many other words here", embedding: [], updatedAt: NOW },
        { id: "strong", content: "zebra zebra zebra", embedding: [], updatedAt: NOW },
        { id: "none-1", content: "unrelated text", embedding: [], updatedAt: NOW },
      ];
      const opts = { minSimilarity: 0.1, recency: { now: NOW } };

      const ranked = rankFusedVaultMemories("zebra", [], items, {
        ...opts,
        bm25AdmissionDivisor: divisor,
      });
      const reference = rankFusedVaultMemories("zebra", [], items, opts);

      expect(ranked.map((r) => [r.uniqueId, r.similarity])).toEqual(
        reference.map((r) => [r.uniqueId, r.similarity])
      );
      expect(ranked.every((r) => Number.isFinite(r.similarity) && r.similarity > 0)).toBe(true);
    }
  );

  it("ranks by BM25 strength, not a flat floor, when the query vector is empty", () => {
    // A small divisor pushes both BM25 scores past the admission cap, which is
    // where the old code flattened them to one score and let input order win.
    const items = [
      { id: "weak", content: "zebra among many other words here", embedding: [], updatedAt: NOW },
      { id: "strong", content: "zebra zebra zebra", embedding: [], updatedAt: NOW },
      { id: "none-1", content: "unrelated text", embedding: [], updatedAt: NOW },
      { id: "none-2", content: "something else", embedding: [], updatedAt: NOW },
    ];

    const ranked = rankFusedVaultMemories("zebra", [], items, {
      minSimilarity: 0.1,
      bm25AdmissionDivisor: 0.01,
      recency: { now: NOW },
    });

    expect(ranked.map((r) => r.uniqueId)).toEqual(["strong", "weak"]);
  });
});

// ---------------------------------------------------------------------------
// memory_vault_search limit clamp
// ---------------------------------------------------------------------------

describe("memory_vault_search clamps the model-supplied limit", () => {
  function seedVault(n: number) {
    const memories = Array.from({ length: n }, (_, i) => makeMemory(`m${i}`, `fact number ${i}`));
    vi.mocked(ops.getAllVaultMemoriesOp).mockResolvedValue(memories);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    const cache = createVaultEmbeddingCache();
    for (const m of memories)
      cacheRowVector(cache, m.uniqueId, Float32Array.from([1, 0, 0]), m.updatedAt, m.content);
    return cache;
  }

  it("caps a huge limit at RECALL_MAX_LIMIT instead of dumping the vault", async () => {
    const cache = seedVault(RECALL_MAX_LIMIT + 10);
    const tool = createMemoryVaultSearchTool(vaultCtx, embeddingOptions, cache);

    const out = (await tool.executor!({ query: "fact", limit: 5000 })) as string;

    expect(out).toContain(`Found ${RECALL_MAX_LIMIT} vault memories`);
  });

  it("treats limit 0 as 1 rather than reporting no memories", async () => {
    const cache = seedVault(3);
    const tool = createMemoryVaultSearchTool(vaultCtx, embeddingOptions, cache);

    const out = (await tool.executor!({ query: "fact", limit: 0 })) as string;

    expect(out).toContain("Found 1 vault memories");
  });
});

// ---------------------------------------------------------------------------
// A precomputed query vector is used, not re-embedded
// ---------------------------------------------------------------------------

describe("searchVaultMemoriesWithSize reuses a caller-supplied query vector", () => {
  beforeEach(() => {
    vi.mocked(ops.getAllVaultMemoriesOp).mockResolvedValue([makeMemory("m1", "cats")]);
  });

  it("ranks on the supplied vector without calling the embeddings endpoint", async () => {
    const cache = createVaultEmbeddingCache();
    cacheRowVector(cache, "m1", Float32Array.from([1, 0, 0]), NOW, "cats");

    const out = await searchVaultMemoriesWithSize("cats", vaultCtx, embeddingOptions, cache, {
      queryEmbedding: [1, 0, 0],
    });

    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(out.rankedOnCosine).toBe(true);
    expect(out.results.map((r) => r.uniqueId)).toEqual(["m1"]);
  });

  it("treats an empty supplied vector as a failed embed: BM25 only, no retry", async () => {
    const out = await searchVaultMemoriesWithSize(
      "cats",
      vaultCtx,
      embeddingOptions,
      createVaultEmbeddingCache(),
      { queryEmbedding: [] }
    );

    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(out.embeddingsUnavailable).toBe(true);
    expect(out.results.map((r) => r.uniqueId)).toEqual(["m1"]);
  });
});

// ---------------------------------------------------------------------------
// Cached vectors are tied to the row version they came from
// ---------------------------------------------------------------------------

describe("the embedding cache drops a vector once its row changes", () => {
  const T1 = new Date("2026-08-01T00:00:00Z");
  const T2 = new Date("2026-08-02T00:00:00Z");

  it("legacy read path: re-resolves an edited row instead of ranking its old vector", async () => {
    const cache = createVaultEmbeddingCache();
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(ops.getAllVaultMemoriesOp).mockResolvedValueOnce([
      makeMemory("m1", "lives in portland", { embedding: "[1,0,0]", updatedAt: T1 }),
    ]);
    await searchVaultMemoriesWithSize("q", vaultCtx, embeddingOptions, cache);

    // Edited elsewhere (e.g. synced from another device): new content, new
    // stored vector, newer updatedAt. The cache still holds the T1 vector.
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);
    vi.mocked(ops.getAllVaultMemoriesOp).mockResolvedValueOnce([
      makeMemory("m1", "moved to seattle", { embedding: "[0,1,0]", updatedAt: T2 }),
    ]);
    const { results } = await searchVaultMemoriesWithSize("q", vaultCtx, embeddingOptions, cache, {
      minSimilarity: 0.5,
    });

    expect(results.map((r) => r.uniqueId)).toEqual(["m1"]);
    expect(Array.from(cache.get("m1")!)).toEqual([0, 1, 0]);
    expect(generateEmbeddings).not.toHaveBeenCalled();
  });

  it("projected (decrypt-last) read path: same, via the key scan's updatedAt", async () => {
    const cache = createVaultEmbeddingCache();
    const key = (updatedAt: Date) => [{ uniqueId: "m1", embeddingModel: null, updatedAt }];
    vi.mocked(ops.getVaultCandidateKeysOp).mockResolvedValueOnce(key(T1) as never);
    vi.mocked(ops.getVaultEmbeddingsByIdsOp).mockResolvedValueOnce([
      { uniqueId: "m1", embedding: "[1,0,0]" },
    ] as never);
    vi.mocked(ops.getVaultMemoriesByIdsOp).mockResolvedValue([
      makeMemory("m1", "moved to seattle", { updatedAt: T2 }),
    ]);
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    await searchVaultMemoriesWithSize("q", vaultCtx, embeddingOptions, cache, {
      decryptLast: true,
    });

    vi.mocked(ops.getVaultCandidateKeysOp).mockResolvedValueOnce(key(T2) as never);
    vi.mocked(ops.getVaultEmbeddingsByIdsOp).mockResolvedValueOnce([
      { uniqueId: "m1", embedding: "[0,1,0]" },
    ] as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);
    const { results } = await searchVaultMemoriesWithSize("q", vaultCtx, embeddingOptions, cache, {
      decryptLast: true,
      minSimilarity: 0.5,
    });

    expect(results.map((r) => r.uniqueId)).toEqual(["m1"]);
    expect(Array.from(cache.get("m1")!)).toEqual([0, 1, 0]);
  });

  it("does not adopt an unversioned entry: a stale vector written elsewhere is re-resolved", async () => {
    // An entry written without a row version — e.g. an eager write for an OLDER
    // edit — must not be blessed as the current row's vector just because a
    // search read it first. The stored column is the source of truth.
    const cache = createVaultEmbeddingCache();
    cache.set("m1", Float32Array.from([1, 0, 0])); // untagged, from the old content
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);
    vi.mocked(ops.getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "moved to seattle", { embedding: "[0,1,0]", updatedAt: T2 }),
    ]);

    const { results } = await searchVaultMemoriesWithSize("q", vaultCtx, embeddingOptions, cache, {
      minSimilarity: 0.5,
    });

    expect(results.map((r) => r.uniqueId)).toEqual(["m1"]);
    expect(Array.from(cache.get("m1")!)).toEqual([0, 1, 0]);
    expect(generateEmbeddings).not.toHaveBeenCalled(); // resolved from the column, no re-embed
  });

  // retain()'s consolidate-update rewrites content + embedding with
  // preserveUpdatedAt, so a consolidation synced from another device arrives
  // with NEW content under the SAME updatedAt. The content fingerprint is what
  // catches it.
  it("legacy path: new content under an unchanged updatedAt is a miss", async () => {
    const cache = createVaultEmbeddingCache();
    cacheRowVector(cache, "m1", Float32Array.from([1, 0, 0]), T1, "lives in portland");
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);
    vi.mocked(ops.getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "moved to seattle", { embedding: "[0,1,0]", updatedAt: T1 }),
    ]);

    const { results } = await searchVaultMemoriesWithSize("q", vaultCtx, embeddingOptions, cache, {
      minSimilarity: 0.5,
    });

    expect(results.map((r) => r.uniqueId)).toEqual(["m1"]);
    expect(Array.from(cache.get("m1")!)).toEqual([0, 1, 0]);
  });

  it("projected path: re-checks the fingerprint after decrypt and re-reads a stale vector", async () => {
    const cache = createVaultEmbeddingCache();
    cacheRowVector(cache, "m1", Float32Array.from([1, 0, 0]), T1, "lives in portland");
    vi.mocked(ops.getVaultCandidateKeysOp).mockResolvedValue([
      { uniqueId: "m1", embeddingModel: null, updatedAt: T1 },
    ] as never);
    vi.mocked(ops.getVaultMemoriesByIdsOp).mockResolvedValue([
      makeMemory("m1", "moved to seattle", { updatedAt: T1 }),
    ]);
    vi.mocked(ops.getVaultEmbeddingsByIdsOp).mockResolvedValue([
      { uniqueId: "m1", embedding: "[0,1,0]" },
    ] as never);
    vi.mocked(generateEmbedding).mockResolvedValue([0, 1, 0]);

    const { results } = await searchVaultMemoriesWithSize("q", vaultCtx, embeddingOptions, cache, {
      decryptLast: true,
      minSimilarity: 0.5,
    });

    expect(results.map((r) => r.uniqueId)).toEqual(["m1"]);
    expect(Array.from(cache.get("m1")!)).toEqual([0, 1, 0]);
  });

  it("retain()-style writes tagged with the committed row version stay warm", async () => {
    const cache = createVaultEmbeddingCache();
    cacheRowVector(cache, "m1", Float32Array.from([1, 0, 0]), T1, "lives in portland");
    vi.mocked(generateEmbedding).mockResolvedValue([1, 0, 0]);
    vi.mocked(ops.getAllVaultMemoriesOp).mockResolvedValue([
      makeMemory("m1", "lives in portland", { updatedAt: T1 }), // no stored vector
    ]);

    const { results } = await searchVaultMemoriesWithSize("q", vaultCtx, embeddingOptions, cache, {
      minSimilarity: 0.5,
    });

    expect(results.map((r) => r.uniqueId)).toEqual(["m1"]);
    expect(generateEmbeddings).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// recall <-> searchTool import cycle
// ---------------------------------------------------------------------------

describe("searchTool.ts stays out of the recall import cycle", () => {
  // The executor routes through recall(), and recall() imports this module. If
  // searchTool.ts reaches recall again — statically, dynamically, or through a
  // re-export of the executor — the cycle behind the order-dependent
  // "Cannot access 'nowMs' before initialization" flake is back.
  const source = readFileSync(join(process.cwd(), "src/lib/memoryVault/searchTool.ts"), "utf8");

  it("does not import recall or the executor module", () => {
    expect(source).not.toMatch(/from\s+["'][^"']*memory\/recall(\.js)?["']/);
    expect(source).not.toMatch(/import\(\s*["'][^"']*memory\/recall(\.js)?["']\s*\)/);
    expect(source).not.toMatch(/["']\.\/searchToolExecutor(\.js)?["']/);
  });
});
