import { describe, expect, it } from "vitest";

import { rankFusedVaultMemories } from "./searchTool.js";

const NOW = new Date("2026-05-04T12:00:00Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

/**
 * Build a normalized embedding from a sparse weight vector.
 * Lets us craft items whose cosine similarity to a query embedding is
 * deterministic and obvious, e.g. emb({ tokyo: 1 }) vs query emb({ tokyo: 1 }) → cosine 1.
 */
function emb(weights: Record<number, number>, dim = 8): number[] {
  const v = new Array(dim).fill(0);
  for (const [k, w] of Object.entries(weights)) v[Number(k)] = w;
  // Normalize so cosine similarity = dot product
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

describe("rankFusedVaultMemories", () => {
  it("returns empty for no items", () => {
    expect(rankFusedVaultMemories("anything", emb({ 0: 1 }), [])).toEqual([]);
  });

  it("includes a BM25-only hit that cosine alone would miss", () => {
    // Query embedding aligns with dim 0. Only item B is on dim 0 (cosine=1).
    // But item A's content contains the query keyword — BM25 catches it.
    const items = [
      { id: "A", content: "biscuit", embedding: emb({ 1: 1 }), updatedAt: daysAgo(0) }, // cosine=0
      { id: "B", content: "unrelated content", embedding: emb({ 0: 1 }), updatedAt: daysAgo(0) }, // cosine=1
    ];
    const results = rankFusedVaultMemories("biscuit", emb({ 0: 1 }), items, {
      limit: 5,
      minSimilarity: 0.5,
      recency: { now: NOW },
    });
    const ids = results.map((r) => r.uniqueId);
    expect(ids).toContain("A"); // present despite cosine=0 below the threshold
  });

  it("recency boost lifts a fresh memory above an older similar one", () => {
    // Two items with identical embedding and identical content shape;
    // the newer one should rank higher because of recency.
    const items = [
      { id: "old", content: "lives in portland", embedding: emb({ 0: 1 }), updatedAt: daysAgo(700) },
      { id: "new", content: "lives in san francisco", embedding: emb({ 0: 1 }), updatedAt: daysAgo(30) },
    ];
    const results = rankFusedVaultMemories("where do I live", emb({ 0: 1 }), items, {
      limit: 5,
      recency: { now: NOW },
    });
    expect(results[0].uniqueId).toBe("new");
  });

  it("captures the Portland → SF temporal failure case", () => {
    // Replicates the benchmark's p19/p20 pattern.
    const items = [
      {
        id: "p19",
        content: "Lives in Portland, Oregon",
        embedding: emb({ 0: 0.9, 1: 0.4 }),
        updatedAt: new Date("2025-06-01T10:00:00Z"),
      },
      {
        id: "p20",
        content: "Relocated from Portland to San Francisco in November 2025",
        embedding: emb({ 0: 0.8, 1: 0.5, 2: 0.3 }),
        updatedAt: new Date("2025-11-15T10:00:00Z"),
      },
    ];
    const queryEmbedding = emb({ 0: 0.85, 1: 0.45 });
    const results = rankFusedVaultMemories("where do I live now", queryEmbedding, items, {
      limit: 5,
      recency: { now: NOW },
    });
    expect(results[0].uniqueId).toBe("p20");
  });

  it("respects minSimilarity (no BM25 hit + low cosine = excluded)", () => {
    const items = [
      { id: "low", content: "off-topic", embedding: emb({ 7: 1 }), updatedAt: daysAgo(0) },
      { id: "hit", content: "match", embedding: emb({ 0: 1 }), updatedAt: daysAgo(0) },
    ];
    const results = rankFusedVaultMemories("nothing", emb({ 0: 1 }), items, {
      limit: 5,
      minSimilarity: 0.5,
      recency: { now: NOW },
    });
    expect(results.map((r) => r.uniqueId)).not.toContain("low");
  });

  it("respects limit", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i}`,
      content: `content ${i}`,
      embedding: emb({ 0: 1 - i * 0.05 }),
      updatedAt: daysAgo(i),
    }));
    const results = rankFusedVaultMemories("query", emb({ 0: 1 }), items, {
      limit: 3,
      recency: { now: NOW },
    });
    expect(results.length).toBe(3);
  });

  it("composite query — fuses cosine winner and BM25 winner together", () => {
    // Two correct memories; one favored by cosine, one by BM25. RRF should
    // surface BOTH in the top results, mirroring the composite category lift
    // we expect from fusion.
    const items = [
      // Cosine-favored: matches the query embedding strongly, no keyword overlap
      {
        id: "cos",
        content: "stack overview",
        embedding: emb({ 0: 1 }),
        updatedAt: daysAgo(10),
      },
      // BM25-favored: keyword match but weak cosine
      {
        id: "bm25",
        content: "postgresql is the primary database",
        embedding: emb({ 7: 1 }),
        updatedAt: daysAgo(10),
      },
      // Distractor: zero on both axes
      {
        id: "noise",
        content: "completely unrelated",
        embedding: emb({ 4: 1 }),
        updatedAt: daysAgo(10),
      },
    ];
    const results = rankFusedVaultMemories("postgresql tech stack", emb({ 0: 1 }), items, {
      limit: 5,
      recency: { now: NOW },
    });
    const ids = results.map((r) => r.uniqueId);
    expect(ids).toContain("cos");
    expect(ids).toContain("bm25");
  });

  it("handles items with no updatedAt (neutral recency)", () => {
    const items = [
      { id: "a", content: "hello world", embedding: emb({ 0: 1 }) },
      { id: "b", content: "hello other", embedding: emb({ 0: 0.9 }) },
    ];
    // Should not throw; ordering should still be by cosine when recency is neutral
    const results = rankFusedVaultMemories("hello", emb({ 0: 1 }), items, { limit: 5 });
    expect(results.length).toBe(2);
    expect(results[0].uniqueId).toBe("a");
  });
});
