import { describe, expect, it } from "vitest";

import { canonicalSha256Hex, HASH_PREFIX } from "../canonical";
import { buildMerkle, inclusionProof, verifyProof } from "../merkle";

async function leaves(n: number): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(HASH_PREFIX + (await canonicalSha256Hex(`x${i}`)));
  }
  return out;
}

describe("merkle", () => {
  it("single leaf: root equals leaf, empty proof", async () => {
    const ls = await leaves(1);
    const tree = await buildMerkle(ls);
    expect(tree.root).toBe(ls[0]);
    expect(await inclusionProof(ls, 0)).toEqual([]);
  });

  it("verifies proofs across odd and even leaf counts", async () => {
    for (const n of [2, 3, 5, 7, 8, 13]) {
      const ls = await leaves(n);
      const tree = await buildMerkle(ls);
      for (let i = 0; i < n; i++) {
        const proof = await inclusionProof(ls, i);
        const ok = await verifyProof(ls[i]!, proof, tree.root);
        expect(ok, `n=${n} i=${i}`).toBe(true);
      }
    }
  });

  it("rejects a tampered leaf against a proof", async () => {
    const ls = await leaves(5);
    const tree = await buildMerkle(ls);
    const proof = await inclusionProof(ls, 2);
    const tampered = HASH_PREFIX + "00".repeat(32);
    expect(await verifyProof(tampered, proof, tree.root)).toBe(false);
  });

  it("throws on out-of-range index", async () => {
    const ls = await leaves(3);
    await expect(inclusionProof(ls, 5)).rejects.toBeInstanceOf(RangeError);
  });
});
