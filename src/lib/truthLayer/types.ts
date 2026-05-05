/**
 * Truth Layer — types for cryptographic memory provenance.
 *
 * Memory writes carry a signature from a wallet-issued grant. The grant declares
 * who is allowed to write, with what scope, until when. Revocation has global
 * effect via the grant registry on chain.
 *
 * This module defines the off-chain types used by SDK operations and client UIs.
 * The on-chain contracts and Privy wallet integration are implemented separately.
 */

export type GrantOperation = "create" | "update" | "delete";

export interface GrantScope {
  /** Folders the grant covers. Empty array = all folders. */
  folders?: string[];
  /** Operations the grant authorizes. */
  operations: GrantOperation[];
}

/**
 * A wallet-issued, on-chain attestation declaring a writer's identity, scope, and validity.
 *
 * Grants are issued by the user's Privy wallet via the grant registry contract on
 * ZetaChain. Once issued, writes signed by the grant's writerKey are valid until
 * the grant expires or is revoked.
 */
export interface Grant {
  /** Unique grant ID (e.g., on-chain log id or content-addressed hash). */
  id: string;
  /** Wallet that issued the grant (the user). */
  ownerWallet: string;
  /** Public key the writer uses to sign memory writes. */
  writerKey: string;
  /** Human-readable label (e.g., "skill-extractor", "user-wallet"). */
  label: string;
  /** Scope declaring what the grant can write. */
  scope: GrantScope;
  /** Issuance timestamp (unix ms). */
  issuedAt: number;
  /** Expiry timestamp (unix ms). */
  expiresAt: number;
  /** Revocation timestamp (unix ms); null = active. */
  revokedAt?: number;
  /** Transaction hash where grant was issued. */
  txHash: string;
  /** URL to the grant on the chain explorer. */
  explorerUrl: string;
}

/**
 * Source metadata captured at write time. Stored as JSON in `memory_vault.source_metadata`.
 */
export interface SourceMetadata {
  /** Where the memory came from (e.g., "skill-extract", "import", "manual", "tool-call"). */
  origin: string;
  /** Conversation/session ID, if applicable. */
  sessionId?: string;
  /** Specific message in the session that produced this memory. */
  messageId?: string;
  /** LLM model that produced the memory, if extracted from AI output. */
  model?: string;
  /** Whether the user reviewed this memory before it was persisted. */
  reviewed: boolean;
  /** Free-form additional context. */
  notes?: string;
}

/**
 * A signed memory write payload.
 *
 * The signature is computed over a canonical encoding of (content_hash, grant_id,
 * source_metadata, parent_state_hash, timestamp). Verification uses the writer's
 * public key (looked up from the grant).
 */
export interface MemorySignature {
  /** Hex-encoded signature bytes. */
  signature: string;
  /** Grant ID that signed this write. */
  grantId: string;
  /** Hash that was signed (so verifiers don't have to recompute the canonical encoding). */
  signedHash: string;
  /** Algorithm identifier (e.g., "ecdsa-secp256k1", "ed25519"). */
  algorithm: string;
}

/**
 * A tombstone marking a memory as retired. Stored as a metadata update on the original
 * memory (sets `retired_at`) and produces a signed event the chain anchor records.
 */
export interface Tombstone {
  /** ID of the retired memory. */
  memoryId: string;
  /** Hash of the retired memory's content + metadata. */
  priorContentHash: string;
  /** Grant that authorized the retirement. */
  grantId: string;
  /** Signature over the retirement event. */
  signature: string;
  /** Retirement timestamp. */
  retiredAt: number;
}

/**
 * A Merkle proof showing a specific memory was in the vault at a specific anchored state.
 */
export interface MerkleProof {
  /** Hash of the memory whose inclusion is being proved. */
  leaf: string;
  /** Path of sibling hashes from leaf to root. */
  siblings: string[];
  /** Position bits indicating left/right at each level (0=left sibling, 1=right). */
  positions: number[];
  /** Merkle root the proof verifies against. */
  root: string;
}

/**
 * Result of anchoring vault state on chain.
 */
export interface AnchorResult {
  /** New Merkle root just anchored. */
  root: string;
  /** Previous root (for state-transition events). */
  prevRoot?: string;
  /** Hash describing what changed in this transition. */
  transitionHash: string;
  /** Transaction hash on chain. */
  txHash: string;
  /** Explorer URL for the anchor tx. */
  explorerUrl: string;
  /** Anchor timestamp (unix ms). */
  timestamp: number;
}

/**
 * Context passed to memory write operations to enforce grants.
 *
 * Operations called *without* a WriterContext fall back to legacy unsigned behavior
 * (forward-compatible during incremental rollout).
 */
export interface WriterContext {
  /** Grant authorizing the write. */
  grant: Grant;
  /** Signing function (provided by the wallet integration). */
  sign: (canonicalPayload: string) => Promise<MemorySignature>;
  /** Source metadata captured at write time. */
  sourceMetadata: SourceMetadata;
}
