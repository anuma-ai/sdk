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
  let safeK = k;
  if (!Number.isFinite(k) || k < 0) {
    getLogger().warn("[memory/rrf] invalid k; falling back to default", { k, default: DEFAULT_K });
    safeK = DEFAULT_K;
  }

  const fused = new Map<string, number>();
  for (const ranking of rankings) {
    const seen = new Set<string>();
    for (let rank = 0; rank < ranking.length; rank++) {
      const id = ranking[rank];
      if (seen.has(id)) continue;
      seen.add(id);
      const contribution = 1 / (safeK + rank + 1);
      fused.set(id, (fused.get(id) ?? 0) + contribution);
    }
  }
  return fused;
}
