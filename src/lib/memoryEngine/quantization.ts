/**
 * Int8 Embedding Quantization
 *
 * Helpers for shrinking embedding vectors in memory by ~4x.
 * A 1536-dim Float32 vector is 6 KiB; the same vector quantized to
 * Int8 + a single Float32 scale is 1.5 KiB + 4 bytes.
 *
 * Used by clients that hold thousands of embeddings in RAM to support
 * fast first-pass similarity ranking without paying the full Float32 cost.
 *
 * Quantization scheme:
 * - scale = max absolute value across the vector (>= 0)
 * - q[i] = clamp(round(v[i] / scale * 127), -127, 127)
 * - dequantize: v[i] ≈ q[i] * scale / 127
 *
 * Cosine similarity computed directly over the Int8 representation
 * gives a fast rough rank that is accurate enough for an initial
 * top-K retrieval pass; the caller can re-score the top-K against
 * the full Float32 vectors if higher precision is required.
 */

/**
 * Result of quantizing a Float32 / number[] embedding to Int8.
 *
 * `data` holds the quantized values in [-127, 127].
 * `scale` is the per-vector Float32 scaling factor; multiplying a
 * dequantized Int8 value by `scale / 127` recovers the original.
 *
 * The Int8Array does not own a separate ArrayBuffer copy beyond the
 * one allocated here, and is plain transferable storage.
 */
export interface QuantizedEmbedding {
  data: Int8Array;
  scale: number;
}

/** Maximum absolute value of an Int8. Used for [-127, 127] mapping. */
const INT8_MAX = 127;

/**
 * Quantize a Float32 embedding (or number[]) into an Int8 vector + scale.
 *
 * The scale is the maximum absolute value across the input; all other
 * values are mapped linearly into [-127, 127] and rounded. A zero vector
 * yields a zero Int8Array and a scale of 0.
 *
 * @param v - The embedding to quantize. Either a Float32Array (typical for
 *   on-device caches) or a plain number[] (typical for values fresh out of
 *   `JSON.parse`). Plain numbers are read directly without copying into a
 *   Float32Array first.
 * @returns The quantized data + scale. The returned `data.length === v.length`.
 */
export function quantizeEmbedding(v: Float32Array | number[]): QuantizedEmbedding {
  const len = v.length;
  const data = new Int8Array(len);

  if (len === 0) {
    return { data, scale: 0 };
  }

  // Find max absolute value in a single pass to use as the scale.
  let maxAbs = 0;
  for (let i = 0; i < len; i += 1) {
    const a = Math.abs(v[i]);
    if (a > maxAbs) maxAbs = a;
  }

  if (maxAbs === 0) {
    // Zero vector — return zeroed Int8Array (default) with zero scale.
    return { data, scale: 0 };
  }

  const inv = INT8_MAX / maxAbs;
  for (let i = 0; i < len; i += 1) {
    // Math.round + Int8Array clamping covers the full range; explicit
    // clamp to guard against floating-point overshoot at the bounds.
    const q = Math.round(v[i] * inv);
    data[i] = q > INT8_MAX ? INT8_MAX : q < -INT8_MAX ? -INT8_MAX : q;
  }

  return { data, scale: maxAbs };
}

/**
 * Dequantize an Int8 embedding back into Float32.
 *
 * Inverse of {@link quantizeEmbedding} up to ~1/127 quantization error.
 */
export function dequantizeEmbedding({ data, scale }: QuantizedEmbedding): Float32Array {
  const len = data.length;
  const out = new Float32Array(len);
  if (scale === 0) return out;

  const factor = scale / INT8_MAX;
  for (let i = 0; i < len; i += 1) {
    out[i] = data[i] * factor;
  }
  return out;
}

/**
 * Cosine similarity between two Int8-quantized embeddings.
 *
 * The integer dot product is exact; the per-vector scales cancel
 * because cosine normalizes by both magnitudes — passing scaleA and
 * scaleB is supported for symmetry with the dequantized API but they
 * are mathematically irrelevant when both vectors share the same
 * quantization scheme. They are still validated to catch zero-magnitude
 * (zero-vector) inputs cleanly.
 *
 * Returns 0 when either vector is zero or dimensions differ. Result is
 * clamped to [-1, 1] to absorb floating-point error from sqrt.
 *
 * @param a - First quantized vector.
 * @param scaleA - Scale factor for `a`. Used only to detect zero vectors.
 * @param b - Second quantized vector.
 * @param scaleB - Scale factor for `b`. Used only to detect zero vectors.
 */
export function cosineInt8(
  a: Int8Array,
  scaleA: number,
  b: Int8Array,
  scaleB: number
): number {
  if (a.length !== b.length) return 0;
  if (scaleA === 0 || scaleB === 0) return 0;

  const len = a.length;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i += 1) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) return 0;

  const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  // Clamp to [-1, 1] in case of floating-point drift in sqrt.
  return sim > 1 ? 1 : sim < -1 ? -1 : sim;
}
