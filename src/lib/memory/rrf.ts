/**
 * Reciprocal Rank Fusion — combine multiple rankings into one.
 *
 * RRF(d) = sum over each ranker r of 1 / (k + rank_r(d))
 *
 * Ranks are 1-indexed. Documents missing from a ranker contribute 0 from
 * that ranker. The constant k=60 is the standard default; smaller k
 * weights the top of each list more, larger k flattens the contribution.
 */

import { getLogger } from "../logger.js";

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
  // Guard the smoothing constant: a non-finite or negative k drives the
  // denominator `k + rank + 1` to <= 0, yielding Infinity/NaN contributions
  // that poison the whole fused map. Standard RRF requires k >= 0.
  let safeK = k;
  if (!Number.isFinite(k) || k < 0) {
    getLogger().warn("[memory/rrf] invalid k; falling back to default", { k, default: DEFAULT_K });
    safeK = DEFAULT_K;
  }

  const fused = new Map<string, number>();
  for (const ranking of rankings) {
    // Dedupe within a single ranking: an id repeated in the same list must
    // only count once (at its best/earliest rank), otherwise it is
    // double-counted and unfairly out-ranks unique ids.
    const seen = new Set<string>();
    for (let rank = 0; rank < ranking.length; rank++) {
      const id = ranking[rank];
      if (seen.has(id)) continue;
      seen.add(id);
      const contribution = 1 / (safeK + rank + 1); // +1 because rank is 0-indexed in the loop
      fused.set(id, (fused.get(id) ?? 0) + contribution);
    }
  }
  return fused;
}
