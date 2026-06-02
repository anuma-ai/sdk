/**
 * Reciprocal Rank Fusion — combine multiple rankings into one.
 *
 * RRF(d) = sum over each ranker r of 1 / (k + rank_r(d))
 *
 * Ranks are 1-indexed. Documents missing from a ranker contribute 0 from
 * that ranker. The constant k=60 is the standard default; smaller k
 * weights the top of each list more, larger k flattens the contribution.
 */

const DEFAULT_K = 60;

/**
 * Fuse multiple ranked-by-id lists into a single score map.
 *
 * @param rankings - array of rankings; each is an ordered list of doc ids
 *                   (best first). Different rankings may include different
 *                   sets of ids.
 * @param k - smoothing constant; smaller k weights top ranks more. Default 60.
 * @returns Map keyed by doc id with the fused RRF score (sum of reciprocal
 *          ranks, with absent rankings contributing 0).
 */
export function rrfFuse(rankings: string[][], k: number = DEFAULT_K): Map<string, number> {
  const fused = new Map<string, number>();
  for (const ranking of rankings) {
    for (let rank = 0; rank < ranking.length; rank++) {
      const id = ranking[rank];
      const contribution = 1 / (k + rank + 1); // +1 because rank is 0-indexed in the loop
      fused.set(id, (fused.get(id) ?? 0) + contribution);
    }
  }
  return fused;
}
