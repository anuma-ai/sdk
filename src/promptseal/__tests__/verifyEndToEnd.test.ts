/**
 * Tests for the programmatic verifyEndToEnd helper. Each step of the 5-step
 * pipeline gets a dedicated failure case; the happy path exercises all five.
 *
 * The on-chain anchor lookup is mocked via `vi.stubGlobal("fetch", ...)` so
 * tests run offline and deterministically.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  bytesToBase64,
  HASH_PREFIX,
  KEY_PREFIX,
  stripHashPrefix,
} from "../canonical";
import { generateKeypair, sign } from "../crypto";
import { buildMerkle, inclusionProof, type ProofStep } from "../merkle";
import { buildSignedReceipt, type Receipt } from "../receipt";
import { verifyEndToEnd } from "../verifyEndToEnd";

const TX_HASH = "0x" + "ab".repeat(32);
const RPC_URL = "https://test.rpc";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Build N receipts hash-chained together; return [receipts, merkle proof for index i]. */
async function buildChainAndProof(
  count: number,
  index: number
): Promise<{
  receipts: Receipt[];
  proof: ProofStep[];
  root: string;
}> {
  const { sk } = generateKeypair();
  const receipts: Receipt[] = [];
  let parent: string | null = null;
  for (let i = 0; i < count; i++) {
    const r = await buildSignedReceipt({
      sk,
      agentId: "verify-test",
      agentErc8004TokenId: 1,
      eventType: i % 2 === 0 ? "llm_start" : "llm_end",
      payloadExcerpt: { i },
      parentHash: parent,
    });
    receipts.push(r);
    parent = r.event_hash;
  }
  const leaves = receipts.map((r) => r.event_hash);
  const tree = await buildMerkle(leaves);
  const proof = await inclusionProof(leaves, index);
  return { receipts, proof, root: tree.root };
}

describe("verifyEndToEnd", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("happy path: returns ok=true at step 5 when all checks pass", async () => {
    const { receipts, proof, root } = await buildChainAndProof(4, 2);
    const rootHex = stripHashPrefix(root);
    mockFetch.mockResolvedValueOnce(jsonResponse({ result: { input: "0x" + rootHex } }));

    const result = await verifyEndToEnd({
      receipt: receipts[2]!,
      proof,
      txHash: TX_HASH,
      rpcUrl: RPC_URL,
    });

    expect(result.ok).toBe(true);
    expect(result.step).toBe(5);
    if (result.ok) {
      expect(result.details.event_hash).toBe(receipts[2]!.event_hash);
      expect(result.details.merkle_root).toBe(root);
      expect(result.details.tx_hash).toBe(TX_HASH);
      expect(result.details.basescan_url).toContain(TX_HASH);
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("step 1 fail: tampered payload_excerpt after signing", async () => {
    const { receipts, proof } = await buildChainAndProof(3, 1);
    const tampered: Receipt = {
      ...receipts[1]!,
      payload_excerpt: { evil: true },
    };

    const result = await verifyEndToEnd({
      receipt: tampered,
      proof,
      txHash: TX_HASH,
      rpcUrl: RPC_URL,
    });

    expect(result.ok).toBe(false);
    expect(result.step).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("step 2 fail: signature replaced with a different valid base64 sig", async () => {
    const { receipts, proof } = await buildChainAndProof(3, 0);
    // Forge a valid-looking but wrong signature: sign different bytes with a
    // different key. Length checks pass; ed25519 verify returns false.
    const { sk: otherSk } = generateKeypair();
    const otherSig = await sign(otherSk, new TextEncoder().encode("not the canonical body"));
    const swapped: Receipt = {
      ...receipts[0]!,
      signature: KEY_PREFIX + bytesToBase64(otherSig),
    };
    // Step 1 hashes the body; signature is excluded from the body. Tampering
    // the signature alone leaves event_hash valid → step 1 passes, step 2 fails.

    const result = await verifyEndToEnd({
      receipt: swapped,
      proof,
      txHash: TX_HASH,
      rpcUrl: RPC_URL,
    });

    expect(result.ok).toBe(false);
    expect(result.step).toBe(2);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("step 3 (or later) fail: corrupted sibling in merkle proof", async () => {
    const { receipts, proof, root } = await buildChainAndProof(4, 1);
    const corrupted: ProofStep[] = proof.map((p, i) =>
      i === 0 ? { ...p, sibling: HASH_PREFIX + "00".repeat(32) } : p
    );
    // Walking still produces *some* root, just not the correct one. So step 3
    // succeeds and step 5 fails — either is acceptable per the plan, just not ok.
    const rootHex = stripHashPrefix(root);
    mockFetch.mockResolvedValueOnce(jsonResponse({ result: { input: "0x" + rootHex } }));

    const result = await verifyEndToEnd({
      receipt: receipts[1]!,
      proof: corrupted,
      txHash: TX_HASH,
      rpcUrl: RPC_URL,
    });

    expect(result.ok).toBe(false);
    expect([3, 5]).toContain(result.step);
  });

  it("step 4 fail: RPC returns null result (tx not on chain)", async () => {
    const { receipts, proof } = await buildChainAndProof(2, 0);
    mockFetch.mockResolvedValueOnce(jsonResponse({ result: null }));

    const result = await verifyEndToEnd({
      receipt: receipts[0]!,
      proof,
      txHash: TX_HASH,
      rpcUrl: RPC_URL,
    });

    expect(result.ok).toBe(false);
    expect(result.step).toBe(4);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("step 5 fail: on-chain root differs from reconstructed root", async () => {
    const { receipts, proof } = await buildChainAndProof(4, 3);
    const wrongRoot = "ff".repeat(32);
    mockFetch.mockResolvedValueOnce(jsonResponse({ result: { input: "0x" + wrongRoot } }));

    const result = await verifyEndToEnd({
      receipt: receipts[3]!,
      proof,
      txHash: TX_HASH,
      rpcUrl: RPC_URL,
    });

    expect(result.ok).toBe(false);
    expect(result.step).toBe(5);
    if (!result.ok && result.details) {
      expect(result.details.chain_root).toBe(wrongRoot);
    }
  });

});
