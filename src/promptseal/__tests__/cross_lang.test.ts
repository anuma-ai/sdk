/**
 * Cross-language byte-equality test corpus.
 *
 * Fixtures under `__fixtures__/` are generated from Python by
 * `scripts/promptseal-generate-fixtures.py`. This test asserts that the TS
 * port produces byte-identical canonical JSON, accepts every Python-signed
 * receipt, and produces matching Merkle roots + per-index inclusion proofs.
 */
import { describe, expect, it } from "vitest";

import canonicalCorpus from "../__fixtures__/canonical_corpus.json";
import merkleCorpus from "../__fixtures__/merkle_corpus.json";
import receiptCorpus from "../__fixtures__/receipt_corpus.json";
import {
  bytesToHex,
  canonicalize,
  parseJsonPreservingNumbers,
} from "../canonical";
import { buildMerkle, inclusionProof, verifyProof } from "../merkle";
import { type Receipt, verifyReceipt } from "../receipt";

type CanonicalCase = {
  name: string;
  input: unknown;
  canonical_hex?: string;
  canonical_text?: string;
  sha256_hex?: string;
  error?: string;
};

type MerkleCase = {
  leaf_count: number;
  leaves: string[];
  root: string;
  proofs: Array<Array<{ sibling: string; side: "L" | "R" }>>;
};

type ReceiptCorpus = {
  secret_key_b64: string;
  public_key_b64: string;
  agent_id: string;
  agent_erc8004_token_id: number;
  receipts: Receipt[];
};

describe("cross-language fixtures", () => {
  describe("canonical_corpus", () => {
    for (const c of canonicalCorpus as CanonicalCase[]) {
      it(`canonical ${c.name}`, () => {
        if (c.error) return; // Python failed too; skip
        // Round-trip through parseJsonPreservingNumbers so float source like
        // "0.0" is preserved (matches Python json.dumps output).
        const parsed = parseJsonPreservingNumbers(c.canonical_text!);
        const out = canonicalize(parsed);
        const bytes = new TextEncoder().encode(out);
        expect(bytesToHex(bytes)).toBe(c.canonical_hex);
      });
    }
  });

  describe("receipt_corpus", () => {
    const corpus = receiptCorpus as unknown as ReceiptCorpus;
    for (let i = 0; i < corpus.receipts.length; i++) {
      const r = corpus.receipts[i]!;
      it(`receipt #${i} (${r.event_type}) verifies`, async () => {
        expect(await verifyReceipt(r)).toBe(true);
      });
    }
    it("hash chain links across receipts", () => {
      let prev: string | null = null;
      for (const r of corpus.receipts) {
        expect(r.parent_hash).toBe(prev);
        prev = r.event_hash;
      }
    });
  });

  describe("merkle_corpus", () => {
    for (const c of merkleCorpus as MerkleCase[]) {
      it(`builds same root for ${c.leaf_count} leaves`, async () => {
        const tree = await buildMerkle(c.leaves);
        expect(tree.root).toBe(c.root);
      });
      it(`per-index proofs match for ${c.leaf_count} leaves`, async () => {
        for (let i = 0; i < c.leaves.length; i++) {
          const proof = await inclusionProof(c.leaves, i);
          expect(proof).toEqual(c.proofs[i]);
          expect(await verifyProof(c.leaves[i]!, proof, c.root)).toBe(true);
        }
      });
    }
  });
});
