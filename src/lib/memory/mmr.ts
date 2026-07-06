/**
 * Maximal Marginal Relevance — diversity-aware top-K selection.
 *
 * After a relevance ranker has produced scored candidates, MMR re-picks
 * the top-K with a relevance/diversity tradeoff. The first pick is the
 * most relevant; each subsequent pick maximizes:
 *
 *   λ · relevance(candidate) − (1 − λ) · max_sim(candidate, selected)
 *
 * λ=1 reduces to pure relevance (no diversity penalty). λ=0 picks the
 * most-relevant first, then maximally-different. λ=0.5 balances.
 *
 * Used to spread composite-query results across distinct memory clusters
 * so that "tell me about the user" surfaces name + location + job rather
 * than three near-duplicates of the same theme.
 */

import { getLogger } from "../logger.js";
import { cosineSimilarity } from "../memoryEngine/vector.js";

interface MMRItem {
  id: string;
  /** Pre-computed relevance score (e.g. fused or CE score). */
  score: number;
  /** Embedding used for diversity computation. */
  embedding: number[];
}

/**
 * Pick K items from `candidates` using MMR.
 *
 * Returns items in selection order (most relevant first, then diverse).
 * Items without embeddings are skipped from diversity computation but
 * still considered relevance-wise; if a selected item has no embedding,
 * it doesn't contribute to the diversity penalty for later picks.
 */
export function applyMMR<T extends MMRItem>(candidates: T[], k: number, lambda: number = 0.5): T[] {
  if (candidates.length === 0 || k <= 0) return [];

  // Guard λ to [0, 1]. NaN makes every `mmrScore > bestScore` comparison false
  // (so the loop silently returns the input order); λ>1 flips the diversity
  // term negative (rewarding near-duplicates). Clamp + log rather than emit a
  // silently wrong ranking.
  let lambdaSafe = lambda;
  if (!Number.isFinite(lambda) || lambda < 0 || lambda > 1) {
    getLogger().warn("[memory/mmr] invalid lambda; clamping to [0,1]", { lambda });
    lambdaSafe = Number.isNaN(lambda) ? 0.5 : Math.min(1, Math.max(0, lambda));
  }

  const remaining = [...candidates];
  const selected: T[] = [];

  // Running max-cosine against the selected set, parallel to `remaining`.
  // Folded incrementally per round to stay O(k·n·dim) overall instead of
  // O(k²·n·dim).
  //  - Embedded candidates start at -Infinity so the running-max can pick
  //    up genuinely-opposing items (negative cosine): an anti-correlated
  //    candidate then gets a *positive* diversity bonus, which is the
  //    canonical MMR behavior.
  //  - Embeddingless candidates pin at 0 so an empty-vector cosine doesn't
  //    blow up their mmrScore via (1-λ)·(-∞) = +∞ after the first pick.
  const maxSimVs: number[] = remaining.map((r) => (r.embedding.length === 0 ? 0 : -Infinity));

  while (selected.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      // First pick has nothing to fold against yet — apply a 0 penalty so
      // the round-0 selection is pure relevance.
      const maxSim = selected.length === 0 ? 0 : maxSimVs[i];
      // Coerce a non-finite relevance score to 0. `cand.score` comes from the
      // fused RRF map or the CE reranker; a NaN there makes `mmrScore` NaN, and
      // since `NaN > bestScore` is always false the candidate is silently never
      // selected — the exact "silently dropped" failure the lambda clamp above
      // guards against, just on the term that actually carries the NaN.
      const score = Number.isFinite(cand.score) ? cand.score : 0;
      const mmrScore = lambdaSafe * score - (1 - lambdaSafe) * maxSim;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    const picked = remaining[bestIdx];
    selected.push(picked);
    remaining.splice(bestIdx, 1);
    maxSimVs.splice(bestIdx, 1);

    // Fold the newly-selected item's similarity into the running max
    // for each remaining embedded candidate.
    if (picked.embedding.length > 0) {
      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i];
        if (r.embedding.length === 0) continue;
        const sim = cosineSimilarity(r.embedding, picked.embedding);
        if (sim > maxSimVs[i]) maxSimVs[i] = sim;
      }
    } else {
      // Picked has no embedding — there's no diversity signal to fold
      // in. Advance any embedded candidate still at the -Infinity
      // sentinel up to 0 so the next round's `λ·score − (1-λ)·maxSim`
      // doesn't compute (1-λ)·(-∞) = +∞ and force-pick arbitrarily.
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].embedding.length > 0 && maxSimVs[i] === -Infinity) {
          maxSimVs[i] = 0;
        }
      }
    }
  }

  return selected;
}
