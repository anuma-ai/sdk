/**
 * Merkle tree builder + inclusion proofs.
 *
 * Convention (Bitcoin-style, mirrors `promptseal/merkle.py` byte-for-byte):
 * - Leaves are 32-byte SHA-256 digests, exposed as "sha256:<hex>" strings at
 *   the API boundary.
 * - On each level, if there's an odd count, the last node is duplicated before
 *   pairing.
 * - Single-leaf tree: root = leaf (proof is empty).
 * - Inclusion proof: ordered list of `{sibling: "sha256:<hex>", side: "L"|"R"}`.
 *   "L" = sibling goes on the left when re-hashing; "R" = on the right.
 */
import { bytesToHex, HASH_PREFIX, hexToBytes, toBufferSource } from "./canonical";

export type ProofStep = { sibling: string; side: "L" | "R" };

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const d = await crypto.subtle.digest("SHA-256", toBufferSource(bytes));
  return new Uint8Array(d);
}

function strip(s: string): Uint8Array {
  const h = s.startsWith(HASH_PREFIX) ? s.slice(HASH_PREFIX.length) : s;
  const out = hexToBytes(h);
  if (out.length !== 32) {
    throw new Error(`expected 32-byte sha256 digest, got ${out.length} bytes`);
  }
  return out;
}

function wrap(b: Uint8Array): string {
  return HASH_PREFIX + bytesToHex(b);
}

async function levelUp(level: Uint8Array[]): Promise<Uint8Array[]> {
  const items = level.slice();
  if (items.length === 1) return items;
  if (items.length % 2 === 1) items.push(items[items.length - 1]!);
  const out: Uint8Array[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const combined = new Uint8Array(64);
    combined.set(items[i]!, 0);
    combined.set(items[i + 1]!, 32);
    out.push(await sha256(combined));
  }
  return out;
}

async function buildLevels(leaves: Uint8Array[]): Promise<Uint8Array[][]> {
  if (leaves.length === 0) {
    throw new Error("merkle tree requires at least 1 leaf");
  }
  const levels: Uint8Array[][] = [leaves.slice()];
  while (levels[levels.length - 1]!.length > 1) {
    levels.push(await levelUp(levels[levels.length - 1]!));
  }
  return levels;
}

export type MerkleResult = {
  root: string;
  leaves: string[];
  leafCount: number;
};

export async function buildMerkle(leavesHex: string[]): Promise<MerkleResult> {
  const leaves = leavesHex.map(strip);
  const levels = await buildLevels(leaves);
  return {
    root: wrap(levels[levels.length - 1]![0]!),
    leaves: leavesHex.slice(),
    leafCount: leaves.length,
  };
}

export async function inclusionProof(leavesHex: string[], index: number): Promise<ProofStep[]> {
  if (index < 0 || index >= leavesHex.length) {
    throw new RangeError(`index ${index} out of range for ${leavesHex.length} leaves`);
  }
  const leaves = leavesHex.map(strip);
  if (leaves.length === 1) return [];
  const levels = await buildLevels(leaves);
  const proof: ProofStep[] = [];
  let idx = index;
  // Skip the root level — its only entry is the root itself.
  for (let l = 0; l < levels.length - 1; l++) {
    const items = levels[l]!.slice();
    if (items.length % 2 === 1) items.push(items[items.length - 1]!);
    let sibling: Uint8Array;
    let side: "L" | "R";
    if (idx % 2 === 0) {
      sibling = items[idx + 1]!;
      side = "R";
    } else {
      sibling = items[idx - 1]!;
      side = "L";
    }
    proof.push({ sibling: wrap(sibling), side });
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export async function verifyProof(
  leafHex: string,
  proof: ProofStep[],
  rootHex: string
): Promise<boolean> {
  let cur: Uint8Array;
  let target: Uint8Array;
  try {
    cur = strip(leafHex);
    target = strip(rootHex);
  } catch {
    return false;
  }
  for (const step of proof) {
    let sib: Uint8Array;
    try {
      sib = strip(step.sibling);
    } catch {
      return false;
    }
    const combined = new Uint8Array(64);
    if (step.side === "R") {
      combined.set(cur, 0);
      combined.set(sib, 32);
    } else if (step.side === "L") {
      combined.set(sib, 0);
      combined.set(cur, 32);
    } else {
      return false;
    }
    cur = await sha256(combined);
  }
  if (cur.length !== target.length) return false;
  for (let i = 0; i < cur.length; i++) {
    if (cur[i] !== target[i]) return false;
  }
  return true;
}
