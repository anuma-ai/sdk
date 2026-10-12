import { beforeEach, describe, expect, it, vi } from "vitest";

const rerankPairs = vi.fn();

vi.mock("../memory/reranker", () => ({
  rerankPairs: (...args: unknown[]) => rerankPairs(...args),
  RerankerUnavailableError: class RerankerUnavailableError extends Error {},
}));

const { rankFusedVaultMemoriesAsync } = await import("./searchTool.js");

const NOW = new Date("2026-05-04T12:00:00Z");

function emb(weights: Record<number, number>, dim = 16): number[] {
  const v = new Array(dim).fill(0);
  for (const [k, w] of Object.entries(weights)) v[Number(k)] = w;
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

function descendingItems(count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: `v2-${i}`,
    content: `alpha bravo item number ${i}`,
    embedding: emb({ 0: 1 - i * 0.05, 1: i * 0.01 }),
    updatedAt: NOW,
    createdAt: NOW,
  }));
}

const QUERY_EMB = emb({ 0: 1 });

beforeEach(() => {
  rerankPairs.mockReset();
  rerankPairs.mockImplementation((_q: string, docs: { id: string }[]) =>
    Promise.resolve(docs.map((d) => ({ id: d.id, score: 0 })))
  );
});

describe("rerankTopN is a cross-encoder budget", () => {
  it("feeds the cross-encoder exactly rerankTopN candidates", () => {
    return rankFusedVaultMemoriesAsync("alpha", QUERY_EMB, descendingItems(), {
      limit: 10,
      minSimilarity: 0,
      rerank: true,
      rerankTopN: 5,
    }).then(() => {
      expect(rerankPairs).toHaveBeenCalledTimes(1);
      const docs = rerankPairs.mock.calls[0][1] as { id: string }[];
      expect(docs).toHaveLength(5);
      expect(docs.map((d) => d.id)).toEqual(["v2-0", "v2-1", "v2-2", "v2-3", "v2-4"]);
    });
  });

  it("keeps a CE-unseen V2 candidate above a zero-cosine side-lane-only hit", async () => {
    const items = [
      ...descendingItems(),
      {
        id: "orphan",
        content: "zulu yankee unrelated",
        embedding: emb({ 15: 1 }),
        updatedAt: NOW,
        createdAt: NOW,
      },
    ];

    const ranked = await rankFusedVaultMemoriesAsync("alpha", QUERY_EMB, items, {
      limit: 11,
      minSimilarity: 0.001,
      rerank: true,
      rerankTopN: 5,
      entityRanking: ["orphan"],
    });

    const ids = ranked.map((r) => r.uniqueId);
    expect(ids).toContain("v2-5");
    expect(ids).toContain("orphan");
    expect(ids.indexOf("v2-5")).toBeLessThan(ids.indexOf("orphan"));
  });

  it("puts the whole V2 tail in the fusion pool, not just the CE head", async () => {
    const items = [
      ...descendingItems(),
      {
        id: "orphan",
        content: "zulu yankee unrelated",
        embedding: emb({ 15: 1 }),
        updatedAt: NOW,
        createdAt: NOW,
      },
    ];

    const ranked = await rankFusedVaultMemoriesAsync("alpha", QUERY_EMB, items, {
      limit: 11,
      minSimilarity: 0.001,
      rerank: true,
      rerankTopN: 3,
      entityRanking: ["orphan"],
    });

    const v2Ids = ranked.map((r) => r.uniqueId).filter((id) => id.startsWith("v2-"));
    expect(v2Ids).toEqual(descendingItems().map((i) => i.id));
  });

  it("returns each item once when the tail joins the pool", async () => {
    const ranked = await rankFusedVaultMemoriesAsync("alpha", QUERY_EMB, descendingItems(), {
      limit: 10,
      minSimilarity: 0,
      rerank: true,
      rerankTopN: 4,
      entityRanking: ["v2-9"],
    });

    const ids = ranked.map((r) => r.uniqueId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves the ordering alone when the head covers every item", async () => {
    const ranked = await rankFusedVaultMemoriesAsync("alpha", QUERY_EMB, descendingItems(), {
      limit: 10,
      minSimilarity: 0,
      rerank: true,
      rerankTopN: 100,
    });

    expect(ranked.map((r) => r.uniqueId)).toEqual(descendingItems().map((i) => i.id));
  });

  it("still lets a side lane surface an item the primary ranking missed", async () => {
    const items = [
      ...descendingItems(3),
      {
        id: "orphan",
        content: "zulu yankee unrelated",
        embedding: emb({ 15: 1 }),
        updatedAt: NOW,
        createdAt: NOW,
      },
    ];

    const ranked = await rankFusedVaultMemoriesAsync("alpha", QUERY_EMB, items, {
      limit: 8,
      minSimilarity: 0.001,
      rerank: true,
      rerankTopN: 5,
      entityRanking: ["orphan"],
    });

    expect(ranked.map((r) => r.uniqueId)).toContain("orphan");
  });

  it("degrades to the V2 ordering when the cross-encoder throws", async () => {
    rerankPairs.mockRejectedValueOnce(new Error("boom"));

    const ranked = await rankFusedVaultMemoriesAsync("alpha", QUERY_EMB, descendingItems(), {
      limit: 10,
      minSimilarity: 0,
      rerank: true,
      rerankTopN: 5,
    });

    expect(ranked.map((r) => r.uniqueId)).toEqual(descendingItems().map((i) => i.id));
  });
});

describe("MMR keeps provenance on picks that come from the V2 tail", () => {
  function itemsWithDiverseTail() {
    const head = Array.from({ length: 5 }, (_, i) => ({
      id: `head-${i}`,
      content: `alpha bravo near duplicate ${i}`,
      embedding: emb({ 0: 1 - i * 0.01 }),
      updatedAt: NOW,
      createdAt: NOW,
      sourceChunkIds: [`head-chunk-${i}`],
    }));
    return [
      ...head,
      {
        id: "tail-diverse",
        content: "alpha charlie a different theme entirely",
        embedding: emb({ 0: 0.4, 2: 1 }),
        updatedAt: NOW,
        createdAt: NOW,
        sourceChunkIds: ["chunk-a", "chunk-b"],
        eventTimeStart: Date.UTC(2026, 3, 1),
        eventTimeEnd: Date.UTC(2026, 3, 1),
        eventTimeKind: "point" as const,
        factType: "preference",
      },
    ];
  }

  function provenanceOf<T extends { similarity: number }>(r: T | undefined) {
    if (!r) return undefined;
    const { similarity: _similarity, ...rest } = r;
    return rest;
  }

  const SEARCH_OPTS = {
    minSimilarity: 0,
    rerank: true,
    rerankTopN: 5,
  };

  it("returns a tail-origin pick with the same fields the non-MMR path gives it", async () => {
    const withoutMmr = await rankFusedVaultMemoriesAsync(
      "alpha",
      QUERY_EMB,
      itemsWithDiverseTail(),
      { ...SEARCH_OPTS, limit: 10 }
    );

    const withMmr = await rankFusedVaultMemoriesAsync("alpha", QUERY_EMB, itemsWithDiverseTail(), {
      ...SEARCH_OPTS,
      limit: 3,
      mmr: true,
      mmrLambda: 0.3,
    });

    const picked = withMmr.find((r) => r.uniqueId === "tail-diverse");
    expect(
      picked,
      "MMR did not pick the tail item; this test no longer exercises the path"
    ).toBeDefined();

    const reference = withoutMmr.find((r) => r.uniqueId === "tail-diverse");
    expect(reference?.sourceChunkIds).toEqual(["chunk-a", "chunk-b"]);
    expect(reference).toMatchObject({
      eventTimeStart: Date.UTC(2026, 3, 1),
      eventTimeEnd: Date.UTC(2026, 3, 1),
      eventTimeKind: "point",
      factType: "preference",
    });
    expect(provenanceOf(picked)).toEqual(provenanceOf(reference));
  });
});
