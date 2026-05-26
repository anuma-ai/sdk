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

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

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

  while (selected.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      let maxSim = 0;
      for (const s of selected) {
        if (cand.embedding.length > 0 && s.embedding.length > 0) {
          const sim = cosineSimilarity(cand.embedding, s.embedding);
          if (sim > maxSim) maxSim = sim;
        }
      }
      const mmrScore = lambda * cand.score - (1 - lambda) * maxSim;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
}
