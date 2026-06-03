/**
 * Shared helpers for centroid generation scripts.
 *
 * Each `generate*Centroids.ts` script embeds a list of reference phrases and
 * averages each class into a single centroid vector. The math lives here so
 * all classifier-generation scripts stay in sync.
 */

/**
 * Average a list of equal-length vectors element-wise.
 *
 * Throws if the list is empty or if any vector has a different dimension
 * than the first — both indicate an embedding API regression that should
 * surface immediately rather than silently produce NaN centroids.
 */
export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error("averageVectors: received an empty vector list");
  }
  const dim = vectors[0].length;
  for (let i = 1; i < vectors.length; i++) {
    if (vectors[i].length !== dim) {
      throw new Error(
        `averageVectors: dimension mismatch — vectors[0] has ${dim} dims, vectors[${i}] has ${vectors[i].length}`
      );
    }
  }
  const avg = new Array<number>(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += v[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    avg[i] /= vectors.length;
  }
  return avg;
}
