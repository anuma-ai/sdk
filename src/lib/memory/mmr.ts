import { getLogger } from "../logger.js";
import { cosineSimilarity } from "../memoryEngine/vector.js";

interface MMRItem {
  id: string;
  score: number;
  embedding: ArrayLike<number>;
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

  let lambdaSafe = lambda;
  if (!Number.isFinite(lambda) || lambda < 0 || lambda > 1) {
    getLogger().warn("[memory/mmr] invalid lambda; clamping to [0,1]", { lambda });
    lambdaSafe = Number.isNaN(lambda) ? 0.5 : Math.min(1, Math.max(0, lambda));
  }

  const remaining = [...candidates];
  const selected: T[] = [];

  const maxSimVs: number[] = remaining.map((r) => (r.embedding.length === 0 ? 0 : -Infinity));

  while (selected.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const maxSim = selected.length === 0 ? 0 : maxSimVs[i];
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

    if (picked.embedding.length > 0) {
      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i];
        if (r.embedding.length === 0) continue;
        const sim = cosineSimilarity(r.embedding, picked.embedding);
        if (sim > maxSimVs[i]) maxSimVs[i] = sim;
      }
    } else {
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].embedding.length > 0 && maxSimVs[i] === -Infinity) {
          maxSimVs[i] = 0;
        }
      }
    }
  }

  return selected;
}
