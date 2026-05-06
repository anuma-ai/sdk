/**
 * @anuma/sdk/promptseal — receipt SDK + verifier static files.
 *
 * Cryptographic evidence layer for AI agents: every LLM/tool boundary mints
 * an Ed25519-signed receipt that hash-chains in IndexedDB; per-run Merkle
 * roots can be anchored on-chain.
 *
 * Byte-equal to the Python `promptseal/` reference implementation at the
 * canonical-JSON layer; cross-language fixtures live in `__fixtures__/`.
 */
export {
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  canonicalize,
  canonicalJson,
  canonicalSha256Hex,
  HASH_PREFIX,
  hexToBytes,
  KEY_PREFIX,
  NumberToken,
  parseJsonPreservingNumbers,
  stripHashPrefix,
  stripKeyPrefix,
  toBufferSource,
} from "./canonical";

export {
  generateKeypair,
  loadAgentKeyFromPem,
  PromptSealSignatureError,
  publicKeyBytes,
  sign,
  verify,
} from "./crypto";

export {
  type BuildReceiptOptions,
  buildSignedReceipt,
  CANONICAL_FIELDS,
  type Receipt,
  receiptBodyBytes,
  SCHEMA_VERSION,
  verifyReceipt,
} from "./receipt";

export {
  ChainIntegrityError,
  ReceiptChain,
  type ReceiptRecord,
} from "./chain";

export {
  buildMerkle,
  inclusionProof,
  type MerkleResult,
  type ProofStep,
  verifyProof,
} from "./merkle";

export {
  type AnchorOptions,
  type AnchorResult,
  anchorRoot,
} from "./anchor";

export {
  AGENT_CARD_EVENT_TOPIC,
  type AgentCard,
  readAgentCard,
  type ReadAgentCardOptions,
} from "./erc8004";

export {
  createPromptSealHooks,
  type CreatePromptSealHooksOptions,
} from "./hooks";

export type {
  LlmEndEvent,
  LlmStartEvent,
  LlmTokenUsage,
  ReceiptHooks,
  ToolEndEvent,
  ToolStartEvent,
} from "../lib/chat/receiptHooks";
