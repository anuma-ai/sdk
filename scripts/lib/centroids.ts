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
