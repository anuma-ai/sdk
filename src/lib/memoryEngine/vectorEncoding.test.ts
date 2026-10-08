import { afterEach, describe, expect, it, vi } from "vitest";

import { cosineSimilarity } from "./vector";
import { decodeChunkVector, encodeChunkVector } from "./vectorEncoding";

function makeEmbedding(dims: number, seed: number): number[] {
  const out: number[] = [];
  let x = seed;
  let norm = 0;
  for (let i = 0; i < dims; i++) {
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

const PRODUCTION_DIMS = 4096;

describe("encodeChunkVector / decodeChunkVector", () => {
  it("round-trips byte-exactly — equality, not tolerance", () => {
    const source = Float32Array.from(makeEmbedding(PRODUCTION_DIMS, 12345));

    const decoded = decodeChunkVector(encodeChunkVector(source));

    expect(decoded.length).toBe(source.length);
    for (let i = 0; i < source.length; i++) {
      expect(Object.is(decoded[i], source[i])).toBe(true);
    }
    expect(decoded).toEqual(source);
  });

  it("narrows a float64 input to float32 and is exact from then on", () => {
    const once = decodeChunkVector(encodeChunkVector([0.1, -0.2, 1 / 3]));
    const twice = decodeChunkVector(encodeChunkVector(once));

    expect(twice).toEqual(once);
    expect(once[0]).toBe(Math.fround(0.1));
    expect(once[2]).toBe(Math.fround(1 / 3));
  });

  it("reads a legacy number[] vector unchanged", () => {
    const legacy = [0.5, -0.25, 0.125];

    const decoded = decodeChunkVector(legacy);

    expect(Array.from(decoded)).toEqual(legacy);
  });

  it("scores a base64 vector identically to the same vector stored as an array", () => {
    const query = makeEmbedding(PRODUCTION_DIMS, 999);
    const stored = makeEmbedding(PRODUCTION_DIMS, 4242);

    const fromLegacy = cosineSimilarity(query, decodeChunkVector(stored));
    const fromBase64 = cosineSimilarity(query, decodeChunkVector(encodeChunkVector(stored)));

    expect(fromBase64).toBe(fromLegacy);
  });

  it("treats absent, empty, and malformed values as 'no vector' rather than throwing", () => {
    expect(decodeChunkVector(undefined).length).toBe(0);
    expect(decodeChunkVector(null).length).toBe(0);
    expect(decodeChunkVector([]).length).toBe(0);
    expect(decodeChunkVector("").length).toBe(0);
    const twoFloats = encodeChunkVector([1, 2]);
    expect(decodeChunkVector(twoFloats).length).toBe(2);
    expect(decodeChunkVector(twoFloats.slice(0, 4)).length).toBe(0);
  });

  it("rejects a corrupted string that Node's lenient base64 decode would accept", () => {
    const good = encodeChunkVector([1, 2, 3]);
    const corrupted = `${good.slice(0, 8)}****${good.slice(8)}`;

    expect(corrupted.length % 4).toBe(0);
    expect(Buffer.from(corrupted, "base64").byteLength % 4).toBe(0);

    expect(decodeChunkVector(corrupted).length).toBe(0);
    expect(Array.from(decodeChunkVector(good))).toEqual([1, 2, 3]);
  });

  it("stores a production-dimension vector far smaller than the JSON it replaces", () => {
    const vector = makeEmbedding(PRODUCTION_DIMS, 7);
    const asJson = JSON.stringify(Array.from(Float32Array.from(vector)));
    const asBase64 = encodeChunkVector(vector);

    expect(asBase64.length).toBe(Math.ceil((PRODUCTION_DIMS * 4) / 3) * 4);
    expect(asJson.length / asBase64.length).toBeGreaterThan(3);
  });
});

describe("decodeChunkVector — malformed signal", () => {
  afterEach(() => {
    vi.doUnmock("../processors/encoding");
    vi.resetModules();
  });

  it("fires once for a string whose length is not a multiple of 4", () => {
    const onMalformed = vi.fn();

    expect(decodeChunkVector("AAA", onMalformed).length).toBe(0);

    expect(onMalformed).toHaveBeenCalledTimes(1);
  });

  it("fires for a corrupted string that Node's lenient decode would accept", () => {
    const good = encodeChunkVector([1, 2, 3]);
    const corrupted = `${good.slice(0, 8)}****${good.slice(8)}`;
    const onMalformed = vi.fn();

    expect(decodeChunkVector(corrupted, onMalformed).length).toBe(0);

    expect(onMalformed).toHaveBeenCalledTimes(1);
  });

  it("fires for a payload that does not divide into whole floats", () => {
    const truncated = encodeChunkVector([1, 2]).slice(0, 4);
    const onMalformed = vi.fn();

    expect(decodeChunkVector(truncated, onMalformed).length).toBe(0);

    expect(onMalformed).toHaveBeenCalledTimes(1);
  });

  it("fires when the decoder itself throws", async () => {
    vi.resetModules();
    vi.doMock("../processors/encoding", async () => {
      const actual =
        await vi.importActual<typeof import("../processors/encoding")>("../processors/encoding");
      return {
        ...actual,
        base64ToUint8Array: () => {
          throw new Error("decoder rejected the payload");
        },
      };
    });
    const { decodeChunkVector: decode, encodeChunkVector: encode } =
      await import("./vectorEncoding");
    const onMalformed = vi.fn();

    expect(decode(encode([1, 2, 3]), onMalformed).length).toBe(0);

    expect(onMalformed).toHaveBeenCalledTimes(1);
  });

  it("stays quiet for a chunk that simply has no vector", () => {
    const onMalformed = vi.fn();

    expect(decodeChunkVector(undefined, onMalformed).length).toBe(0);
    expect(decodeChunkVector(null, onMalformed).length).toBe(0);
    expect(decodeChunkVector([], onMalformed).length).toBe(0);
    expect(decodeChunkVector("", onMalformed).length).toBe(0);

    expect(onMalformed).not.toHaveBeenCalled();
  });

  it("stays quiet for either readable encoding", () => {
    const onMalformed = vi.fn();

    expect(decodeChunkVector([1, 2, 3], onMalformed).length).toBe(3);
    expect(decodeChunkVector(encodeChunkVector([1, 2, 3]), onMalformed).length).toBe(3);

    expect(onMalformed).not.toHaveBeenCalled();
  });
});
