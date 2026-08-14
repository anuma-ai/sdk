/**
 * `rerankTopN` is a CROSS-ENCODER budget, not a fusion-pool size (#909).
 *
 * The async fused ranker's rerank path had no unit coverage at all — a grep for
 * `rerank` across `src/lib/memoryVault/*.test.ts` returned nothing — which is
 * how it came to have a second, undocumented job. `tailSlice` was excluded from
 * `rrfFuse` and appended after everything at the very end, so V2 candidate
 * #(rerankTopN + 1) ranked below every side-lane-only hit, including zero-cosine
 * ones. With `DEFAULT_LIMIT = 8` and `recall()` supplying both the entity and
 * temporal lanes, that decided slots 6-8 of a `budget: 'mid'` recall — a ranking
 * change wearing a cost knob's clothes.
 *
 * These tests pin the separation: the CE sees exactly `rerankTopN` pairs, and
 * everything V2 ranked reaches the fusion pool regardless of that number.
 *
 * The cross-encoder is mocked. The real one downloads a model and scores in
 * WASM; what needs pinning here is the plumbing around it, and a real CE would
 * make the assertions non-deterministic on top of slow.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const rerankPairs = vi.fn();

vi.mock("../memory/reranker", () => ({
  rerankPairs: (...args: unknown[]) => rerankPairs(...args),
  RerankerUnavailableError: class RerankerUnavailableError extends Error {},
}));

const { rankFusedVaultMemoriesAsync } = await import("./searchTool.js");

const NOW = new Date("2026-05-04T12:00:00Z");

/** Normalized sparse embedding, so cosine similarity is the dot product. */
function emb(weights: Record<number, number>, dim = 16): number[] {
  const v = new Array(dim).fill(0);
  for (const [k, w] of Object.entries(weights)) v[Number(k)] = w;
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

/**
 * Ten items on descending cosine to a dim-0 query, so V2 rank is known by
 * construction: `v2-0` is the strongest, `v2-9` the weakest.
 */
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
  // Identity CE: every doc scores 0, so `v2 * (1 + ceWeight * 0)` leaves the V2
  // ordering untouched. Isolates pool membership from CE score effects — a CE
  // that reordered would confound every assertion below.
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
    // THE REGRESSION. `v2-5` is the first item past a head of 5; `orphan` has no
    // cosine signal at all and appears only in the entity lane. Before the fix
    // `v2-5` was outside the fusion pool and stapled on after `orphan`.
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
      // Wide enough to return the orphan too — the assertion is about their
      // relative order, and a limit that truncates it would pass vacuously.
      limit: 11,
      // Above zero on purpose: at 0 the orphan clears the floor and joins the V2
      // ranking itself, where it earns the primary 2x weight plus its lane bonus
      // — legitimate fusion, and NOT the defect under test. Excluding it makes it
      // a genuine side-lane-only re-entrant, which is the case that regressed.
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

    // Every V2 item survives, and their relative order is intact — a tail item
    // must not leapfrog a better-scoring one just by entering the pool.
    const v2Ids = ranked.map((r) => r.uniqueId).filter((id) => id.startsWith("v2-"));
    expect(v2Ids).toEqual(descendingItems().map((i) => i.id));
  });

  it("returns each item once when the tail joins the pool", async () => {
    // The tail is absorbed into the fused pool AND used to be appended at the
    // end; doing both would duplicate every tail row.
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
    // With no tail there is nothing to re-admit, so `rankedIds === headIds` and
    // the fusion input is byte-identical to the pre-fix expression. No side lane
    // here on purpose: a lane would legitimately reorder via RRF, which is a
    // different behaviour and is covered below.
    const ranked = await rankFusedVaultMemoriesAsync("alpha", QUERY_EMB, descendingItems(), {
      limit: 10,
      minSimilarity: 0,
      rerank: true,
      rerankTopN: 100,
    });

    expect(ranked.map((r) => r.uniqueId)).toEqual(descendingItems().map((i) => i.id));
  });

  it("still lets a side lane surface an item the primary ranking missed", async () => {
    // The guard against over-correcting: the tail now carries the same weight as
    // the head, so check side lanes are not inert. `orphan` has zero cosine and
    // would never appear on V2 alone.
    //
    // THREE V2 items, not ten. A single lane hit scores 1/61 = 0.0164 while the
    // tenth V2 item scores 2/71 = 0.0282, so against a full field the lane could
    // never surface it — at any head size, before or after this change. Testing
    // that would assert nothing.
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
      // Above zero on purpose: at 0 the orphan clears the floor and joins the V2
      // ranking itself, where it earns the primary 2x weight plus its lane bonus
      // — legitimate fusion, and NOT the defect under test. Excluding it makes it
      // a genuine side-lane-only re-entrant, which is the case that regressed.
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
