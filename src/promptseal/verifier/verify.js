// PromptSeal verifier — 5-step receipt verification in the browser.
//
// Mirrors promptseal/{canonical,receipt,merkle}.py byte-for-byte. The
// pure-JS canonicalization + JSON parser lives in ./canonical.js so a Node
// test can exercise the same logic without resolving the ed25519 CDN URL.

import * as ed from "https://cdn.jsdelivr.net/npm/@noble/ed25519@2.1.0/+esm";

import {
  HASH_PREFIX,
  TEXT_ENC,
  base64ToBytes,
  bytesToHex,
  canonicalSha256Hex,
  canonicalize,
  hexToBytes,
  parseJsonPreservingNumbers,
  stripHashPrefix,
  stripKeyPrefix,
  strippedBody,
} from "./canonical.js";

// -- Merkle proof walker (mirrors promptseal/merkle.py) ---------------------

async function sha256Bytes(bytes) {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(d);
}

export async function walkMerkleProof(leafHashHex, proof) {
  let cur = hexToBytes(leafHashHex);
  for (let i = 0; i < proof.length; i++) {
    const step = proof[i];
    if (!step || (step.side !== "L" && step.side !== "R") || typeof step.sibling !== "string") {
      throw new Error(`proof[${i}] malformed: ${JSON.stringify(step)}`);
    }
    const sib = hexToBytes(stripHashPrefix(step.sibling));
    const combined = new Uint8Array(64);
    if (step.side === "R") { combined.set(cur, 0); combined.set(sib, 32); }
    else                   { combined.set(sib, 0); combined.set(cur, 32); }
    cur = await sha256Bytes(combined);
  }
  return bytesToHex(cur);
}

// -- on-chain anchor lookup -------------------------------------------------

const DEFAULT_RPC = "https://sepolia.base.org";

export async function fetchAnchorTxInputData(txHash, rpcUrl = DEFAULT_RPC) {
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
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${json.error.message ?? JSON.stringify(json.error)}`);
  if (!json.result) throw new Error(`tx not found on chain: ${txHash}`);
  const data = json.result.input;
  if (typeof data !== "string" || !data.startsWith("0x")) {
    throw new Error(`unexpected tx.input shape: ${JSON.stringify(data)}`);
  }
  return data.slice(2); // strip "0x"
}

// -- 5-step orchestrator ----------------------------------------------------

export async function verifyAll({ receiptText, proofText, txHash }) {
  const log = (...args) => console.log("[verify]", ...args);
  const result = { ok: false, step: null, message: null, details: {} };

  let receipt, proof;
  try {
    receipt = parseJsonPreservingNumbers(receiptText);
  } catch (e) {
    return fail(result, 0, `receipt JSON unparseable: ${e.message}`);
  }
  try {
    proof = JSON.parse(proofText); // proof contains no floats
    if (!Array.isArray(proof)) throw new Error("proof must be a JSON array");
  } catch (e) {
    return fail(result, 0, `merkle proof JSON unparseable: ${e.message}`);
  }
  if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash.trim())) {
    return fail(result, 0, `anchor tx_hash must be 0x + 64 hex chars (got ${JSON.stringify(txHash)})`);
  }
  txHash = txHash.trim();

  log("input shape", {
    keys: Object.keys(receipt).sort(),
    proof_steps: proof.length,
    tx_hash: txHash,
  });

  // ── Step 1: recompute event_hash from canonical body bytes ──────────────
  let recomputedHash;
  try {
    const body = strippedBody(receipt);
    const canonicalStr = canonicalize(body);
    log("step 1: canonical body bytes (length)", canonicalStr.length);
    log("step 1: canonical body (preview, first 120 chars)", canonicalStr.slice(0, 120) + "…");
    const hexDigest = await canonicalSha256Hex(body);
    recomputedHash = HASH_PREFIX + hexDigest;
    log("step 1: recomputed event_hash", recomputedHash);
    log("step 1: stored    event_hash", receipt.event_hash);
  } catch (e) {
    return fail(result, 1, `recompute event_hash threw: ${e.message}`);
  }
  if (recomputedHash !== receipt.event_hash) {
    return fail(result, 1,
      `event_hash mismatch — receipt body has been tampered. ` +
      `Recomputed ${recomputedHash}, stored ${receipt.event_hash}`,
      { recomputed: recomputedHash, stored: receipt.event_hash });
  }
  log("step 1: ✓ event_hash matches stored");

  // ── Step 2: verify Ed25519 signature over the same canonical bytes ──────
  try {
    const canonicalBytes = TEXT_ENC.encode(canonicalize(strippedBody(receipt)));
    const pkBytes = base64ToBytes(stripKeyPrefix(receipt.public_key));
    const sigBytes = base64ToBytes(stripKeyPrefix(receipt.signature));
    log("step 2: pubkey 32B?", pkBytes.length === 32, "  sig 64B?", sigBytes.length === 64);
    const ok = await ed.verifyAsync(sigBytes, canonicalBytes, pkBytes);
    log("step 2: Ed25519 verify result", ok);
    if (!ok) {
      return fail(result, 2,
        `signature does NOT verify against public_key + canonical body. ` +
        `(public_key=${receipt.public_key.slice(0, 32)}..., signature=${receipt.signature.slice(0, 32)}...)`);
    }
  } catch (e) {
    return fail(result, 2, `signature verify threw: ${e.message}`);
  }
  log("step 2: ✓ signature valid");

  // ── Step 3: walk Merkle proof from event_hash leaf to a root ────────────
  let reconstructedRoot;
  try {
    const leafHex = stripHashPrefix(receipt.event_hash);
    reconstructedRoot = await walkMerkleProof(leafHex, proof);
    log("step 3: reconstructed root", HASH_PREFIX + reconstructedRoot);
  } catch (e) {
    return fail(result, 3, `merkle proof walk threw: ${e.message}`);
  }
  log("step 3: ✓ proof walks to a root (verified vs anchor in step 5)");

  // ── Step 4: fetch anchor TX from RPC, extract input data ────────────────
  let onChainRoot;
  try {
    const inputHex = await fetchAnchorTxInputData(txHash);
    log("step 4: tx.input length (hex chars)", inputHex.length, " -> bytes", inputHex.length / 2);
    if (inputHex.length !== 64) {
      return fail(result, 4,
        `tx.input is ${inputHex.length / 2} bytes, expected 32 (a SHA-256 root). ` +
        `Wrong tx? Tx hash: ${txHash}`);
    }
    onChainRoot = inputHex;
    log("step 4: on-chain root", HASH_PREFIX + onChainRoot);
  } catch (e) {
    return fail(result, 4, `anchor tx fetch failed: ${e.message}`);
  }
  log("step 4: ✓ on-chain anchor found");

  // ── Step 5: reconstructed root must equal on-chain root ─────────────────
  if (reconstructedRoot.toLowerCase() !== onChainRoot.toLowerCase()) {
    return fail(result, 5,
      `merkle root from proof ≠ on-chain anchor root. ` +
      `Proof→${reconstructedRoot}, Chain→${onChainRoot}`,
      { proof_root: reconstructedRoot, chain_root: onChainRoot });
  }
  log("step 5: ✓ proof root === on-chain anchor root");

  result.ok = true;
  result.message = "All 5 steps passed. Receipt is verifiable end-to-end.";
  result.details = {
    event_hash: receipt.event_hash,
    merkle_root: HASH_PREFIX + reconstructedRoot,
    tx_hash: txHash,
    basescan_url: `https://sepolia.basescan.org/tx/${txHash}`,
  };
  return result;
}

function fail(result, step, message, details = {}) {
  result.ok = false;
  result.step = step;
  result.message = message;
  result.details = details;
  return result;
}
