import { base64ToUint8Array, uint8ArrayToBase64 } from "../processors/encoding";

const BYTES_PER_FLOAT32 = 4;

const CANONICAL_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Encode an embedding as base64 float32 for storage.
 *
 * Not yet called by the write path — see the rollout note above. Values are
 * narrowed to float32 first, which is lossless for anything `generateEmbeddings`
 * produced and is what makes the decode byte-exact.
 */
export function encodeChunkVector(vector: ArrayLike<number>): string {
  const f32 = vector instanceof Float32Array ? vector : Float32Array.from(vector);
  return uint8ArrayToBase64(new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength));
}

/**
 * Read a stored chunk vector in either encoding: a base64 float32 string, or the
 * legacy `number[]` that every row written before the writer flip still holds.
 *
 * Returns a zero-length `Float32Array` for a missing, empty, or unreadable
 * value, which callers already treat as "this chunk has no vector" — the same
 * degradation a malformed `chunks` JSON gets today, rather than a throw that
 * would take down a whole search pass over one bad row.
 *
 * That one return value covers two different situations, and a caller cannot
 * tell them apart: a chunk that legitimately has no vector, and a chunk whose
 * vector is corrupt. `onMalformed` separates them. It fires only on the corrupt
 * paths, never on an absent or empty value, so a caller can count corruption
 * without counting normal empties.
 *
 * Nothing is logged here. A corrupt row holds hundreds of chunks and this runs
 * once per chunk, so the caller aggregates and reports once per pass — the shape
 * `searchChunksOp` already uses for stale-model vectors.
 */
export function decodeChunkVector(
  vector: number[] | string | null | undefined,
  onMalformed?: () => void
): Float32Array<ArrayBuffer> {
  if (!vector || vector.length === 0) return new Float32Array(0);
  if (typeof vector !== "string") return Float32Array.from(vector);

  if (vector.length % 4 !== 0 || !CANONICAL_BASE64.test(vector)) {
    onMalformed?.();
    return new Float32Array(0);
  }

  try {
    const bytes = base64ToUint8Array(vector);
    if (bytes.byteLength === 0 || bytes.byteLength % BYTES_PER_FLOAT32 !== 0) {
      onMalformed?.();
      return new Float32Array(0);
    }
    return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / BYTES_PER_FLOAT32);
  } catch {
    onMalformed?.();
    return new Float32Array(0);
  }
}
