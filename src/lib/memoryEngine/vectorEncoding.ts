/**
 * Storage encoding for `MessageChunk.vector`.
 *
 * Chunk vectors are persisted inside the `chunks` column as JSON. Since #732
 * their values are canonically float32 — `generateEmbeddings` round-trips its
 * return value through a `Float32Array` so a cache hit and a cache miss agree —
 * which paradoxically made the JSON LONGER: `JSON.stringify` emits the shortest
 * decimal that round-trips to the float64, and a binary32-exact value needs ~17
 * significant digits. Measured at 4096 dims (`qwen/qwen3-embedding-8b`): 54.5 KB
 * of JSON before #732, 84.5 KB after.
 *
 * Base64-encoding the `Float32Array` stores the same bits as 4 bytes per value
 * instead of ~21 characters — 21.3 KB at 4096 dims. Because the data already IS
 * float32, the encoding is EXACTLY lossless, so the round-trip assertion is
 * equality and never a tolerance.
 *
 * Rollout (sdk#862). `decodeChunkVector` accepts both encodings and ships first;
 * `encodeChunkVector` is deliberately NOT wired into the write path yet. Every
 * stored chunk on every device is still a JSON array, and chat history syncs
 * those rows between devices verbatim — the backup push spreads the whole raw
 * row and the restore copies every column — so a device on an older build would
 * meet a base64 string where it expects `number[]`. It does not throw: it
 * silently scores 0, because `Float32Array.from` over a string yields one NaN
 * per character and `cosineSimilarity` returns 0 on a dimension mismatch. Chunk
 * recall would quietly fall back to whole-message recall with nothing tying it
 * to a release. The writer flips in a later release, once a build that reads
 * both encodings has saturated; the single flip site is `updateMessageChunksOp`.
 *
 * Byte order is the platform's, since this reads the `Float32Array` bytes
 * directly. Every runtime the SDK targets (browsers, iOS, Android, Node on
 * x86/ARM) is little-endian.
 */

import { base64ToUint8Array, uint8ArrayToBase64 } from "../processors/encoding";

const BYTES_PER_FLOAT32 = 4;

/**
 * Canonical base64: the standard alphabet, a length that is a multiple of 4, and
 * padding only at the very end — exactly what `uint8ArrayToBase64` emits on both
 * of its paths.
 *
 * Checked before decoding because Node's `Buffer.from(value, "base64")` DROPS
 * characters outside the alphabet instead of failing, so a corrupted string can
 * still yield a four-byte-aligned payload and sail past the alignment check
 * below as plausible-looking floats that then participate in ranking. Validating
 * the string beats re-encoding the decoded bytes and comparing: no second copy
 * of a 21 KB payload per chunk read, and it makes the two platform decoders
 * agree, since the browser's `atob` already rejects this input.
 */
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
 */
export function decodeChunkVector(
  vector: number[] | string | null | undefined
): Float32Array<ArrayBuffer> {
  if (!vector || vector.length === 0) return new Float32Array(0);
  if (typeof vector !== "string") return Float32Array.from(vector);

  if (vector.length % 4 !== 0 || !CANONICAL_BASE64.test(vector)) return new Float32Array(0);

  try {
    const bytes = base64ToUint8Array(vector);
    // A truncated payload cannot be split into whole floats; treat it as absent
    // rather than silently dropping the trailing bytes.
    if (bytes.byteLength === 0 || bytes.byteLength % BYTES_PER_FLOAT32 !== 0) {
      return new Float32Array(0);
    }
    return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / BYTES_PER_FLOAT32);
  } catch {
    return new Float32Array(0);
  }
}
