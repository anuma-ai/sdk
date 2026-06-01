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
      const mmrScore = lambda * cand.score - (1 - lambda) * maxSim;
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
    // for each remaining candidate. Items without embeddings on either
    // side contribute nothing — they keep their existing maxSim.
    if (picked.embedding.length > 0) {
      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i];
        if (r.embedding.length === 0) continue;
        const sim = cosineSimilarity(r.embedding, picked.embedding);
        if (sim > maxSimVs[i]) maxSimVs[i] = sim;
      }
    }
  }

  return selected;
}
