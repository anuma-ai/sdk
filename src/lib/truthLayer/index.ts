/**
 * Truth Layer — cryptographic provenance + append-only history for personal AI memory.
 *
 * Two halves:
 * - Verifiable RAG: every AI claim about the user can cite a specific memory,
 *   verifiable against an on-chain anchored vault root.
 * - Memory Custody: every memory write is signed by a wallet-issued grant.
 *   Updates produce new memories that retire parents (no in-place mutation).
 *   Deletes mint cryptographic tombstones. Bad writers can be revoked globally.
 *
 * This module ships the off-chain primitives. Chain integration (real grant
 * registry contract + state anchor contract on ZetaChain, Privy wallet integration)
 * is implemented separately and plugs in via the BlockchainAdapter interface.
 */

export type {
  AnchorResult,
  Grant,
  GrantOperation,
  GrantScope,
  MemorySignature,
  MerkleProof,
  SourceMetadata,
  Tombstone,
  WriterContext,
} from "./types";

export type {
  AnchorStateInput,
  BlockchainAdapter,
  IssueGrantInput,
} from "./blockchain";

export {
  createMockBlockchainAdapter,
  createMemoryStorage,
  createLocalStorageStorage,
  type MockStorage,
  type MockBlockchainOptions,
} from "./mockBlockchain";

export {
  computeMemoryHash,
  canonicalSigningPayload,
  verifyMemorySignature,
  createMockSigner,
} from "./signing";

export {
  computeMerkleRoot,
  computeMerkleProof,
  verifyMerkleProof,
} from "./merkle";
