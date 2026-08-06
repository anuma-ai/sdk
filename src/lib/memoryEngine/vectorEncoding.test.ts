import { describe, expect, it } from "vitest";

import { cosineSimilarity } from "./vector";
import { decodeChunkVector, encodeChunkVector } from "./vectorEncoding";

/** A deterministic, normalized embedding at the production dimension. */
function makeEmbedding(dims: number, seed: number): number[] {
  const out: number[] = [];
  let x = seed;
  let norm = 0;
  for (let i = 0; i < dims; i++) {
    // xorshift — deterministic across runs, and spreads values across the
    // exponent range rather than clustering near zero.
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    const v = (x / 0x7fffffff) * 0.05;
    out.push(v);
    norm += v * v;
  }
  const inv = 1 / Math.sqrt(norm);
  return out.map((v) => v * inv);
}

/** What the storage layer actually persists for a chunk's vector. */
const PRODUCTION_DIMS = 4096; // qwen/qwen3-embedding-8b

describe("encodeChunkVector / decodeChunkVector", () => {
  it("round-trips byte-exactly — equality, not tolerance", () => {
    // The values are already float32 (generateEmbeddings round-trips its return
    // through a Float32Array since #732), so base64-f32 loses NOTHING. A
    // toBeCloseTo here would pass just as happily on a lossy encoding and would
    // hide exactly the bug this test exists to catch.
    const source = Float32Array.from(makeEmbedding(PRODUCTION_DIMS, 12345));

    const decoded = decodeChunkVector(encodeChunkVector(source));

    expect(decoded.length).toBe(source.length);
    for (let i = 0; i < source.length; i++) {
      expect(Object.is(decoded[i], source[i])).toBe(true);
    }
    // Cheap whole-array restatement of the same claim.
    expect(decoded).toEqual(source);
  });

  it("narrows a float64 input to float32 and is exact from then on", () => {
    // 0.1 is not representable in binary32. The FIRST encode narrows it; every
    // round-trip after that must be a fixed point, or stored vectors would drift
    // each time a row is rewritten.
    const once = decodeChunkVector(encodeChunkVector([0.1, -0.2, 1 / 3]));
    const twice = decodeChunkVector(encodeChunkVector(once));

    expect(twice).toEqual(once);
    expect(once[0]).toBe(Math.fround(0.1));
    expect(once[2]).toBe(Math.fround(1 / 3));
  });

  it("reads a legacy number[] vector unchanged", () => {
    // Every chunk stored before the writer flip is in this form, on every
    // device. This is the compatibility half of the shim.
    const legacy = [0.5, -0.25, 0.125];

    const decoded = decodeChunkVector(legacy);

    expect(Array.from(decoded)).toEqual(legacy);
  });

  it("scores a base64 vector identically to the same vector stored as an array", () => {
    const query = makeEmbedding(PRODUCTION_DIMS, 999);
    const stored = makeEmbedding(PRODUCTION_DIMS, 4242);

    const fromLegacy = cosineSimilarity(query, decodeChunkVector(stored));
    const fromBase64 = cosineSimilarity(query, decodeChunkVector(encodeChunkVector(stored)));

    // Both sides narrow to float32 before scoring, so ranking is encoding-
    // invariant to the last bit — a mixed-encoding DB cannot reorder results.
    expect(fromBase64).toBe(fromLegacy);
  });

  it("treats absent, empty, and malformed values as 'no vector' rather than throwing", () => {
    // Callers use a zero-length result as the "this chunk has no vector"
    // placeholder that keeps chunk indices aligned with the chunks array.
    expect(decodeChunkVector(undefined).length).toBe(0);
    expect(decodeChunkVector(null).length).toBe(0);
    expect(decodeChunkVector([]).length).toBe(0);
    expect(decodeChunkVector("").length).toBe(0);
    // A truncated payload must not silently decode to a shorter vector that
    // then scores against something. Derived from a known-good encoding rather
    // than a hand-written literal, so the byte arithmetic is the code's.
    const twoFloats = encodeChunkVector([1, 2]);
    expect(decodeChunkVector(twoFloats).length).toBe(2);
    expect(decodeChunkVector(twoFloats.slice(0, 4)).length).toBe(0); // 3 bytes
  });

  it("stores a production-dimension vector far smaller than the JSON it replaces", () => {
    const vector = makeEmbedding(PRODUCTION_DIMS, 7);
    const asJson = JSON.stringify(Array.from(Float32Array.from(vector)));
    const asBase64 = encodeChunkVector(vector);

    // 4 bytes per value (base64'd) against ~21 characters for a binary32-exact
    // decimal. Asserted as a ratio so the point of the change is pinned, not
    // just its mechanics.
    expect(asBase64.length).toBe(Math.ceil((PRODUCTION_DIMS * 4) / 3) * 4);
    expect(asJson.length / asBase64.length).toBeGreaterThan(3);
  });
});
