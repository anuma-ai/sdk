/**
 * Vector primitives shared across the SDK's embedding-driven callers
 * (memory retrieval, classifier centroids, server-tool selection).
 */

/**
 * Cosine similarity in [-1, 1]. Returns 0 on dimension mismatch or
 * zero-magnitude inputs so callers can iterate without NaN-poisoning
 * downstream sorts.
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
