/**
 * Truth Layer — blockchain adapter interface.
 *
 * Frontends and SDK operations interact with the chain through this interface.
 * The mock implementation (mockBlockchain.ts) ships with the SDK for development
 * and the demo. The real ZetaChain implementation lives in a parallel adapter
 * (implemented separately by the chain-side team) and is swapped in at boot time.
 */

import type { AnchorResult, Grant, GrantScope } from "./types";

export interface IssueGrantInput {
  /** Public key the writer will sign with. */
  writerKey: string;
  /** Human-readable label for the grant. */
  label: string;
  /** What this grant is allowed to do. */
  scope: GrantScope;
  /** Expiry timestamp (unix ms). */
  expiresAt: number;
}

export interface AnchorStateInput {
  /** New Merkle root over current active vault. */
  root: string;
  /** Previous root (so anchors form a chain). */
  prevRoot?: string;
  /** Hash describing the transition (e.g., what was added/retired). */
  transitionHash: string;
}

/**
 * Adapter interface — implemented by mockBlockchain (SDK-bundled, for dev/demo)
 * and by zetaChainBlockchain (chain-side team, for production).
 *
 * All methods are async even though the mock can run sync — this matches the
 * real-chain implementation that involves wallet prompts and tx submission.
 */
export interface BlockchainAdapter {
  // ── Grants ─────────────────────────────────────────────────────────

  /** Issue a new grant. Submits a tx to the grant registry contract. */
  issueGrant(input: IssueGrantInput): Promise<Grant>;

  /** Revoke a grant globally. Returns the revocation tx. */
  revokeGrant(
    grantId: string
  ): Promise<{ txHash: string; explorerUrl: string }>;

  /** Look up a grant by ID. Returns null if it doesn't exist. */
  getGrant(grantId: string): Promise<Grant | null>;

  /** List all grants issued by a wallet (active and revoked). */
  listGrants(ownerWallet: string): Promise<Grant[]>;

  /** Check whether a grant is currently valid (issued, not expired, not revoked). */
  isGrantValid(grantId: string, at?: number): Promise<boolean>;

  // ── State anchoring ────────────────────────────────────────────────

  /** Anchor a Merkle root of vault state on chain. */
  anchorState(input: AnchorStateInput): Promise<AnchorResult>;

  /** Get the most recently anchored root for a wallet. */
  getCurrentRoot(ownerWallet: string): Promise<string | null>;

  /** Get the full anchor history for a wallet (for audit). */
  listAnchors(ownerWallet: string): Promise<AnchorResult[]>;

  // ── Mode marker (so callers can warn about mock vs real) ──────────

  /** Returns "mock" or "zetachain" — useful for UI badges and dev warnings. */
  getMode(): "mock" | "zetachain";
}
