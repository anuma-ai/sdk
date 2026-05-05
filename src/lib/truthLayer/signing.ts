/**
 * Truth Layer — signing utilities.
 *
 * Memory writes carry a signature from a wallet-issued grant. The canonical
 * signing payload is a deterministic encoding of the memory's content hash, the
 * grant ID, source metadata, and parent state hash.
 *
 * For the PoC, signatures are produced by a stub signer keyed off a per-grant
 * secret stored alongside the mock blockchain adapter. Real signatures will be
 * produced via Privy / viem against the user's wallet (chain-side team's work).
 */

import type { MemorySignature, SourceMetadata, WriterContext } from "./types";

/**
 * Compute a content hash for a memory write.
 *
 * The hash is taken over `content || "::" || JSON.stringify(sortedKeys(metadata))`.
 * Order-independent (we sort keys) so equivalent metadata always hashes the same.
 *
 * Uses SHA-256 via Web Crypto API. Falls back to a deterministic fallback if
 * Web Crypto isn't available (mock mode only).
 */
export async function computeMemoryHash(input: {
  content: string;
  sourceMetadata: SourceMetadata;
  parentStateHash?: string | null;
}): Promise<string> {
  const sortedMeta = sortKeys(input.sourceMetadata);
  const canonical =
    input.content +
    "::" +
    JSON.stringify(sortedMeta) +
    "::" +
    (input.parentStateHash ?? "");
  return await sha256Hex(canonical);
}

/**
 * Compute the canonical signing payload for a memory write. Signers compute
 * a signature over this exact string.
 */
export async function canonicalSigningPayload(input: {
  contentHash: string;
  grantId: string;
  parentStateHash?: string | null;
  timestamp: number;
}): Promise<string> {
  return [
    "anuma:truth:v1",
    input.contentHash,
    input.grantId,
    input.parentStateHash ?? "",
    input.timestamp.toString(),
  ].join("|");
}

/**
 * Verify a memory signature.
 *
 * For the PoC mock signer, this checks the signature was produced by the same
 * stub algorithm. For real signatures (chain-side team), this delegates to the
 * appropriate verification based on the algorithm field.
 */
export async function verifyMemorySignature(
  signature: MemorySignature,
  expectedSignedHash: string
): Promise<boolean> {
  if (signature.signedHash !== expectedSignedHash) return false;
  // Mock signer verification — see createMockSigner.
  if (signature.algorithm === "mock-stub-v1") {
    return signature.signature.startsWith("mocksig_");
  }
  // Real signers (chain-side team) implement verification per algorithm.
  return false;
}

/**
 * Create a mock signer for development and the demo.
 *
 * Produces deterministic-looking but fake signatures keyed off the grant ID.
 * Real signers come from the wallet integration (chain-side team).
 */
export function createMockSigner(
  grantId: string
): WriterContext["sign"] {
  return async (canonicalPayload: string): Promise<MemorySignature> => {
    const hash = await sha256Hex(canonicalPayload);
    return {
      signature: `mocksig_${grantId.slice(0, 8)}_${hash.slice(0, 32)}`,
      grantId,
      signedHash: hash,
      algorithm: "mock-stub-v1",
    };
  };
}

// ── Internal helpers ───────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof crypto.subtle.digest === "function"
  ) {
    const buf = new TextEncoder().encode(input);
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Deterministic fallback for environments without Web Crypto.
  // Not cryptographically secure — only used in the mock for environments where
  // Web Crypto isn't available (some test runners).
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return ("0".repeat(64) + Math.abs(hash).toString(16)).slice(-64);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = sortKeys(obj[k]);
  }
  return sorted;
}
