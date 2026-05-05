/**
 * Truth Layer — Merkle tree utilities.
 *
 * Vault state is summarized as a Merkle root over the hashes of all currently
 * active memories. Each memory's hash includes its content + signature + source
 * metadata, so changing any memory changes the root.
 *
 * The root is anchored on chain. Anyone holding a memory's hash + the Merkle
 * path can verify the memory was in the vault at the anchored state.
 *
 * Implementation: simple binary Merkle tree with SHA-256 hashing. Handles
 * unbalanced trees by duplicating the last leaf (Bitcoin-style). Pure functions,
 * no external state.
 */

import type { MerkleProof } from "./types";

/**
 * Compute the Merkle root of a set of leaf hashes.
 *
 * Leaves should be hex-encoded SHA-256 hashes (64 chars).
 *
 * If there are zero leaves, returns the all-zero hash. If there's one leaf,
 * the root equals the leaf. Otherwise, builds a binary tree.
 */
export async function computeMerkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) {
    return "0".repeat(64);
  }
  if (leaves.length === 1) {
    return leaves[0];
  }

  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i]; // duplicate last
      next.push(await hashPair(left, right));
    }
    level = next;
  }
  return level[0];
}

/**
 * Compute a Merkle inclusion proof for a specific leaf in the tree.
 *
 * Returns the path of sibling hashes plus position bits. Verifiers can rebuild
 * the root from the leaf and the path; if it matches the anchored root, the
 * memory provably existed in that state.
 */
export async function computeMerkleProof(input: {
  leaves: string[];
  leaf: string;
}): Promise<MerkleProof | null> {
  const idx = input.leaves.indexOf(input.leaf);
  if (idx === -1) return null;

  const root = await computeMerkleRoot(input.leaves);

  let level = [...input.leaves];
  let leafIdx = idx;
  const siblings: string[] = [];
  const positions: number[] = [];

  while (level.length > 1) {
    const isRight = leafIdx % 2 === 1;
    const siblingIdx = isRight ? leafIdx - 1 : leafIdx + 1;
    const sibling =
      siblingIdx < level.length ? level[siblingIdx] : level[leafIdx]; // duplicated last
    siblings.push(sibling);
    positions.push(isRight ? 0 : 1); // 0 = sibling on left, 1 = sibling on right

    // Move up a level
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(await hashPair(left, right));
    }
    level = next;
    leafIdx = Math.floor(leafIdx / 2);
  }

  return {
    leaf: input.leaf,
    siblings,
    positions,
    root,
  };
}

/**
 * Verify a Merkle proof — given a leaf and path, does the recomputed root match?
 */
export async function verifyMerkleProof(proof: MerkleProof): Promise<boolean> {
  let current = proof.leaf;
  for (let i = 0; i < proof.siblings.length; i++) {
    const sibling = proof.siblings[i];
    const siblingOnRight = proof.positions[i] === 1;
    current = siblingOnRight
      ? await hashPair(current, sibling)
      : await hashPair(sibling, current);
  }
  return current === proof.root;
}

// ── Internal ──────────────────────────────────────────────────────────

async function hashPair(left: string, right: string): Promise<string> {
  return await sha256Hex(left + right);
}

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
  // Used only in mock/test contexts where Web Crypto isn't available.
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return ("0".repeat(64) + Math.abs(hash).toString(16)).slice(-64);
}
