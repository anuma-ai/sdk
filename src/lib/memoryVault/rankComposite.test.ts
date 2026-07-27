import { describe, expect, it, vi } from "vitest";

import * as bm25 from "./bm25.js";
import { rankComposite } from "./searchTool.js";

const NOW = new Date("2026-05-04T12:00:00Z");

function emb(weights: Record<number, number>, dim = 8): number[] {
  const v = new Array(dim).fill(0);
  for (const [k, w] of Object.entries(weights)) v[Number(k)] = w;
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

describe("rankComposite", () => {
  it("returns empty when no items", async () => {
    const result = await rankComposite(
      "q",
      emb({ 0: 1 }),
      [{ query: "facet1", embedding: emb({ 1: 1 }) }],
      []
    );
    expect(result).toEqual([]);
  });

  it("returns empty when no sub-queries", async () => {
    const items = [{ id: "A", content: "x", embedding: emb({ 0: 1 }), updatedAt: NOW }];
    const result = await rankComposite("q", emb({ 0: 1 }), [], items);
    expect(result).toEqual([]);
  });

  it("ranks items appearing in multiple facets above single-facet hits", async () => {
    // Three items, three facets covering different dimensions.
    // - shared appears in top-1 for facets 1 and 2 → strong RRF
    // - facet1Only appears only for facet 1
    // - facet2Only appears only for facet 2
    const items = [
      { id: "shared", content: "shared", embedding: emb({ 1: 1, 2: 1 }), updatedAt: NOW },
      { id: "facet1Only", content: "facet1", embedding: emb({ 1: 1 }), updatedAt: NOW },
      { id: "facet2Only", content: "facet2", embedding: emb({ 2: 1 }), updatedAt: NOW },
    ];
    const subQueries = [
      { query: "f1", embedding: emb({ 1: 1 }) },
      { query: "f2", embedding: emb({ 2: 1 }) },
    ];
    const result = await rankComposite("original", emb({ 7: 1 }), subQueries, items, {
      limit: 3,
      perFacetTopN: 5,
      recency: { now: NOW },
    });
    expect(result[0]?.uniqueId).toBe("shared");
  });

  it("the original query ranking influences the fused order", async () => {
    // Sub-queries don't match the gem item; only the original query does.
    // The original-query facet weighting (replicated 3x in RRF) should
    // pull the gem into the top results.
    const items = [
      { id: "gem", content: "gem", embedding: emb({ 0: 1 }), updatedAt: NOW },
      { id: "noise1", content: "noise1", embedding: emb({ 1: 1 }), updatedAt: NOW },
      { id: "noise2", content: "noise2", embedding: emb({ 2: 1 }), updatedAt: NOW },
    ];
    const subQueries = [
      { query: "sub1", embedding: emb({ 1: 1 }) },
      { query: "sub2", embedding: emb({ 2: 1 }) },
    ];
    const result = await rankComposite("original", emb({ 0: 1 }), subQueries, items, {
      limit: 3,
      perFacetTopN: 5,
      recency: { now: NOW },
    });
    // gem is only matched by the original query, but original is weighted
    // 3x — it should make the top-3.
    const ids = result.slice(0, 3).map((r) => r.uniqueId);
    expect(ids).toContain("gem");
  });

  it("appends items absent from any facet's top-N at zero score ONLY with includeUnrankedTail (bench opt-in)", async () => {
    const items = [
      { id: "hit", content: "hit", embedding: emb({ 0: 1 }), updatedAt: NOW },
      { id: "orphan", content: "orphan", embedding: emb({ 7: 1 }), updatedAt: NOW },
    ];
    const subQueries = [{ query: "f1", embedding: emb({ 0: 1 }) }];

    // Opt-in (eval harness): the zero-score orphan IS appended.
    const withTail = await rankComposite("original", emb({ 0: 1 }), subQueries, items, {
      limit: items.length,
      perFacetTopN: 1,
      recency: { now: NOW },
      includeUnrankedTail: true,
    });
    expect(withTail.map((r) => r.uniqueId)).toEqual(expect.arrayContaining(["hit", "orphan"]));
    expect(withTail.find((r) => r.uniqueId === "orphan")?.similarity).toBe(0);

    // Default (production recall): the zero-score orphan is NOT returned.
    const withoutTail = await rankComposite("original", emb({ 0: 1 }), subQueries, items, {
      limit: items.length,
      perFacetTopN: 1,
      recency: { now: NOW },
    });
    expect(withoutTail.find((r) => r.uniqueId === "orphan")).toBeUndefined();
  });

  it("tokenizes the BM25 corpus once and reuses it across every facet pass (B3)", async () => {
    const prepareSpy = vi.spyOn(bm25, "prepareBM25Corpus");
    const preparedSpy = vi.spyOn(bm25, "scoreBM25Prepared");
    const rawSpy = vi.spyOn(bm25, "scoreBM25");

    const items = [
      { id: "A", content: "alpha beta gamma", embedding: emb({ 0: 1 }), updatedAt: NOW },
      { id: "B", content: "beta gamma delta", embedding: emb({ 1: 1 }), updatedAt: NOW },
      { id: "C", content: "gamma delta epsilon", embedding: emb({ 2: 1 }), updatedAt: NOW },
    ];
    const subQueries = [
      { query: "alpha", embedding: emb({ 0: 1 }) },
      { query: "delta", embedding: emb({ 2: 1 }) },
    ];

    await rankComposite("beta gamma", emb({ 0: 1 }), subQueries, items, {
      limit: 3,
      perFacetTopN: 5,
      recency: { now: NOW },
    });

    // Corpus prepared exactly once for the whole composite recall...
    expect(prepareSpy).toHaveBeenCalledTimes(1);
    // ...and reused for every facet pass: the original query + each sub-query.
    expect(preparedSpy).toHaveBeenCalledTimes(1 + subQueries.length);
    // The whole-corpus-tokenizing wrapper is never hit on the composite path.
    expect(rawSpy).not.toHaveBeenCalled();

    prepareSpy.mockRestore();
    preparedSpy.mockRestore();
    rawSpy.mockRestore();
  });
});
