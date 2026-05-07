/**
 * Programmatic 5-step receipt verifier.
 *
 * Mirrors `src/promptseal/verifier/verify.js` (the static demo page) but is
 * callable from any TS environment — no DOM, no CDN imports. Designed to run
 * unchanged in Node 20+ and modern browsers (uses global `fetch`,
 * `crypto.subtle`, and `@noble/ed25519`).
 *
 * Each step short-circuits on failure and reports which check tripped:
 *   1. recompute event_hash from canonical body bytes
 *   2. Ed25519 signature verifies under the embedded public_key
 *   3. Merkle inclusion proof walks from leaf → some root
 *   4. anchor tx exists on-chain and its `input` is a 32-byte SHA-256 root
 *   5. proof root === on-chain root (case-insensitive hex compare)
 */
import * as ed from "@noble/ed25519";

import {
  base64ToBytes,
  bytesToHex,
  canonicalize,
  canonicalSha256Hex,
  HASH_PREFIX,
  hexToBytes,
  stripHashPrefix,
  stripKeyPrefix,
  toBufferSource,
} from "./canonical";
import type { ProofStep } from "./merkle";
import type { Receipt } from "./receipt";

const DEFAULT_RPC = "https://sepolia.base.org";

export type VerifyResult =
  | {
      ok: true;
      step: 5;
      message: string;
      details: {
        event_hash: string;
        merkle_root: string;
        tx_hash: string;
        basescan_url: string;
      };
    }
  | {
      ok: false;
      step: 0 | 1 | 2 | 3 | 4 | 5;
      message: string;
      details?: Record<string, unknown>;
    };

export type VerifyEndToEndOptions = {
  receipt: Receipt;
  proof: ProofStep[];
  txHash: `0x${string}` | string;
  rpcUrl?: string;
};

/** Strip event_hash + signature; what was signed is everything else. */
function strippedBody(receipt: Receipt): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(receipt)) {
    if (k === "event_hash" || k === "signature") continue;
    out[k] = v;
  }
  return out;
}

/** Walk a Merkle inclusion proof from leaf hex → reconstructed root hex. */
async function walkMerkleProof(leafHashHex: string, proof: ProofStep[]): Promise<string> {
  let cur = hexToBytes(leafHashHex);
  for (let i = 0; i < proof.length; i++) {
    const step = proof[i]!;
    if (!step || (step.side !== "L" && step.side !== "R") || typeof step.sibling !== "string") {
      throw new Error(`proof[${i}] malformed: ${JSON.stringify(step)}`);
    }
    const sib = hexToBytes(stripHashPrefix(step.sibling));
    const combined = new Uint8Array(64);
    if (step.side === "R") {
      combined.set(cur, 0);
      combined.set(sib, 32);
    } else {
      combined.set(sib, 0);
      combined.set(cur, 32);
    }
    const digest = await crypto.subtle.digest("SHA-256", toBufferSource(combined));
    cur = new Uint8Array(digest);
  }
  return bytesToHex(cur);
}

type RpcResponse = {
  result?: { input?: unknown } | null;
  error?: { message?: string } | null;
};

/** Fetch tx via JSON-RPC and return its `input` hex (without `0x` prefix). */
async function fetchAnchorTxInputData(txHash: string, rpcUrl: string): Promise<string> {
  const body = {
    jsonrpc: "2.0",
    method: "eth_getTransactionByHash",
    params: [txHash],
    id: 1,
  };
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = (await res.json()) as RpcResponse;
  if (json.error) {
    throw new Error(`RPC error: ${json.error.message ?? JSON.stringify(json.error)}`);
  }
  if (!json.result) throw new Error(`tx not found on chain: ${txHash}`);
  const data = json.result.input;
  if (typeof data !== "string" || !data.startsWith("0x")) {
    throw new Error(`unexpected tx.input shape: ${JSON.stringify(data)}`);
  }
  return data.slice(2);
}

function fail(
  step: 0 | 1 | 2 | 3 | 4 | 5,
  message: string,
  details?: Record<string, unknown>
): VerifyResult {
  return details === undefined ? { ok: false, step, message } : { ok: false, step, message, details };
}

/**
 * End-to-end verify a receipt + Merkle proof + on-chain anchor.
 *
 * Returns `{ ok: true, step: 5, ... }` only when all five checks pass. On
 * failure, `step` indicates which check tripped (1–5) and `message` is a
 * human-readable explanation.
 */
export async function verifyEndToEnd(opts: VerifyEndToEndOptions): Promise<VerifyResult> {
  const { receipt, proof, rpcUrl = DEFAULT_RPC } = opts;
  const txHash = typeof opts.txHash === "string" ? opts.txHash.trim() : opts.txHash;

  if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return fail(0, `anchor tx_hash must be 0x + 64 hex chars (got ${JSON.stringify(opts.txHash)})`);
  }

  // Step 1: recompute event_hash from canonical body bytes.
  let recomputedHash: string;
  try {
    const body = strippedBody(receipt);
    // Touching canonicalize here (not just canonicalSha256Hex) keeps the
    // failure message informative if the body has a non-serializable value.
    canonicalize(body);
    const hexDigest = await canonicalSha256Hex(body);
    recomputedHash = HASH_PREFIX + hexDigest;
  } catch (e) {
    return fail(1, `recompute event_hash threw: ${(e as Error).message}`);
  }
  if (recomputedHash !== receipt.event_hash) {
    return fail(
      1,
      `event_hash mismatch — receipt body has been tampered. ` +
        `Recomputed ${recomputedHash}, stored ${receipt.event_hash}`,
      { recomputed: recomputedHash, stored: receipt.event_hash }
    );
  }

  // Step 2: Ed25519 signature over the same canonical bytes.
  try {
    const canonicalBytes = new TextEncoder().encode(canonicalize(strippedBody(receipt)));
    const pkBytes = base64ToBytes(stripKeyPrefix(receipt.public_key));
    const sigBytes = base64ToBytes(stripKeyPrefix(receipt.signature));
    if (pkBytes.length !== 32 || sigBytes.length !== 64) {
      return fail(
        2,
        `signature verify failed: pubkey/sig wrong length ` +
          `(pk=${pkBytes.length}B, sig=${sigBytes.length}B)`
      );
    }
    const ok = await ed.verifyAsync(sigBytes, canonicalBytes, pkBytes);
    if (!ok) {
      return fail(
        2,
        `signature does NOT verify against public_key + canonical body. ` +
          `(public_key=${receipt.public_key.slice(0, 32)}..., signature=${receipt.signature.slice(0, 32)}...)`
      );
    }
  } catch (e) {
    return fail(2, `signature verify threw: ${(e as Error).message}`);
  }

  // Step 3: walk Merkle proof from leaf → reconstructed root.
  let reconstructedRoot: string;
  try {
    const leafHex = stripHashPrefix(receipt.event_hash);
    reconstructedRoot = await walkMerkleProof(leafHex, proof);
  } catch (e) {
    return fail(3, `merkle proof walk threw: ${(e as Error).message}`);
  }

  // Step 4: fetch anchor tx; tx.input must be exactly 32 bytes.
  let onChainRoot: string;
  try {
    const inputHex = await fetchAnchorTxInputData(txHash, rpcUrl);
    if (inputHex.length !== 64) {
      return fail(
        4,
        `tx.input is ${inputHex.length / 2} bytes, expected 32 (a SHA-256 root). ` +
          `Wrong tx? Tx hash: ${txHash}`
      );
    }
    onChainRoot = inputHex;
  } catch (e) {
    return fail(4, `anchor tx fetch failed: ${(e as Error).message}`);
  }

  // Step 5: reconstructed root must equal on-chain root.
  if (reconstructedRoot.toLowerCase() !== onChainRoot.toLowerCase()) {
    return fail(
      5,
      `merkle root from proof != on-chain anchor root. ` +
        `Proof->${reconstructedRoot}, Chain->${onChainRoot}`,
      { proof_root: reconstructedRoot, chain_root: onChainRoot }
    );
  }

  return {
    ok: true,
    step: 5,
    message: "All 5 steps passed.",
    details: {
      event_hash: receipt.event_hash,
      merkle_root: HASH_PREFIX + reconstructedRoot,
      tx_hash: txHash,
      basescan_url: `https://sepolia.basescan.org/tx/${txHash}`,
    },
  };
}
