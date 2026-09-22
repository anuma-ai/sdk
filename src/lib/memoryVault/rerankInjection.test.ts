/**
 * The `rerankFn` seam: the vault ranker must use whichever reranker it was
 * handed, and must degrade the same way for either one.
 *
 * This is what lets mobile rerank at all. The on-device cross-encoder is
 * absent on React Native, so the only way to get a semantic pass over the
 * shortlist there is to inject a network implementation — see
 * `memory/jevReranker`.
 */
import { describe, expect, it, vi } from "vitest";

import { RerankerUnavailableError, type RerankFn } from "../memory/reranker.js";
import { rankFusedVaultMemoriesAsync } from "./searchTool.js";

const NOW = new Date("2026-05-04T12:00:00Z");

function emb(weights: Record<number, number>, dim = 8): number[] {
  const v = new Array(dim).fill(0);
  for (const [k, w] of Object.entries(weights)) v[Number(k)] = w;
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

/** Two items whose cosine ordering is A over B, so a rerank that flips them
 * is unambiguously the reranker's doing and not the fused score's. */
const ITEMS = [
  { id: "A", content: "lives in portland", embedding: emb({ 0: 1 }), updatedAt: NOW },
  {
    id: "B",
    content: "relocated to san francisco",
    embedding: emb({ 0: 0.9, 1: 0.2 }),
    updatedAt: NOW,
  },
];

const QUERY_EMB = emb({ 0: 1 });

function rank(rerankFn?: RerankFn) {
  return rankFusedVaultMemoriesAsync("where do I live now?", QUERY_EMB, ITEMS, {
    limit: 5,
    minSimilarity: 0,
    rerank: true,
    // Large enough that the reranker's verdict, not the fused score, decides.
    ceWeight: 5,
    recency: { now: NOW },
    ...(rerankFn && { rerankFn }),
  });
}

describe("rerankFn injection", () => {
  it("uses the injected reranker instead of the default cross-encoder", async () => {
    const rerankFn = vi.fn(async (_q: string, items: { id: string; content: string }[]) =>
      items.map((i) => ({ id: i.id, content: i.content, score: i.id === "B" ? 1 : 0 }))
    );

    const out = await rank(rerankFn);

    expect(rerankFn).toHaveBeenCalledTimes(1);
    // B was behind on cosine and is in front after the injected rerank.
    expect(out[0].uniqueId).toBe("B");
  });

  it("passes the query and the candidate shortlist through", async () => {
    const seen: { query: string; ids: string[] } = { query: "", ids: [] };
    const rerankFn: RerankFn = async (query, items) => {
      seen.query = query;
      seen.ids = items.map((i) => i.id);
      return items.map((i) => ({ id: i.id, content: i.content, score: 0.5 }));
    };

    await rank(rerankFn);

    expect(seen.query).toBe("where do I live now?");
    expect(seen.ids.sort()).toEqual(["A", "B"]);
  });

  it("degrades to the fused ordering when the injected reranker is unavailable", async () => {
    const rerankFn: RerankFn = async () => {
      throw new RerankerUnavailableError(new Error("no portal credential configured"));
    };

    const out = await rank(rerankFn);

    // Recall must not fail because a rerank did: the fused order survives.
    expect(out.map((r) => r.uniqueId)).toEqual(["A", "B"]);
  });

  it("degrades to the fused ordering on a transient reranker failure", async () => {
    const rerankFn: RerankFn = async () => {
      throw new Error("portal returned 503");
    };

    const out = await rank(rerankFn);

    expect(out.map((r) => r.uniqueId)).toEqual(["A", "B"]);
  });

  it("reports rerankStats.applied for an injected reranker", async () => {
    const rerankStats = { applied: false };
    const rerankFn: RerankFn = async (_q, items) =>
      items.map((i) => ({ id: i.id, content: i.content, score: 0.5 }));

    await rankFusedVaultMemoriesAsync("q", QUERY_EMB, ITEMS, {
      limit: 5,
      minSimilarity: 0,
      rerank: true,
      recency: { now: NOW },
      rerankStats,
      rerankFn,
    });

    // recall() turns this into its `reranked` diagnostic, so an injected
    // reranker must not read as the RN "rerank-unavailable" degradation.
    expect(rerankStats.applied).toBe(true);
  });
});
