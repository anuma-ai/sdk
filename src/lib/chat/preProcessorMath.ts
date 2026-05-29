/**
 * Shared math helpers for pre-processor classifiers.
 *
 * Each classifier embeds a prompt and compares against pre-computed centroid
 * vectors via cosine similarity. Lives here so future classifiers don't end up
 * with N duplicate copies of the same function.
 */

/**
 * Cosine similarity between two equal-length vectors.
 *
 * Returns 0 on dimension mismatch — likely centroids generated with a
 * different embedding model than the one currently in use, or a placeholder
 * empty array. Falling back to 0 makes the classifier silently classify
 * "no match" rather than producing NaN.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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
