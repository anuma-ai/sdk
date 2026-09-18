/**
 * CAIP-122 "sign in with X" (SIWX) challenge handling for agentres.dev.
 *
 * agentres prices its identity routes at $0 but still answers them with a 402.
 * The response carries a base64 `PAYMENT-REQUIRED` header whose
 * `sign-in-with-x` extension describes a message to sign, and a plain ed25519
 * signature over that message satisfies the route — no USDC, no token account,
 * no facilitator roundtrip. Paid routes deliberately omit the extension, so a
 * booking can only ever be satisfied by payment.
 *
 * Every byte below is pinned by a live probe run against agentres on
 * 2026-09-17: ten candidate serializations were sent and exactly one was
 * accepted. The nine rejections are why the details here look arbitrary and
 * are not:
 *
 * - `Chain ID:` in the MESSAGE is the bare CAIP-2 reference, while `chainId`
 *   in the PAYLOAD is the full `solana:<reference>` id. They differ on purpose;
 *   swapping either one fails.
 * - The signature is base58. A base64 one is rejected outright.
 * - The statement block, the `Resources` block and the capitalised "Solana"
 *   label are all mandatory, and a trailing newline fails.
 *
 * A wrong message does not fail loudly — it produces a well-formed proof that
 * the server answers with a bare 401. That is why the message builder is
 * covered by a byte-for-byte golden test rather than by shape assertions.
 *
 * @module lib/connectors/agentres/siwx
 */

import { base64ToUint8Array, uint8ArrayToBase64 } from "../../processors/encoding.js";
import { SiwxChallengeError, SiwxUnsupportedError } from "./errors.js";

/** Header agentres returns the challenge in, and the one the proof goes back in. */
export const PAYMENT_REQUIRED_HEADER = "PAYMENT-REQUIRED";

/** Header carrying the base64 SIWX payload on the authenticated retry. */
export const SIWX_HEADER = "SIGN-IN-WITH-X";

/** Key of the SIWX extension inside the decoded `PAYMENT-REQUIRED` payload. */
const SIWX_EXTENSION = "sign-in-with-x";

/** CAIP-2 namespace prefix of every Solana chain id. */
const SOLANA_NAMESPACE = "solana:";

/**
 * One SIWX challenge, flattened from the extension's `info` block plus the
 * Solana entry of its `supportedChains` list.
 *
 * Single-use and short-lived: the nonce is consumed by the first proof that
 * presents it and expires minutes after `issuedAt`. Fetch a fresh one per
 * call rather than caching this.
 */
export interface SiwxChallenge {
  /** Host the challenge is scoped to, e.g. `agentres.dev`. */
  domain: string;
  /** Resource the proof is addressed to, e.g. `https://agentres.dev/api/me`. */
  uri: string;
  /** CAIP-122 version, `"1"` today. */
  version: string;
  /** Sentence shown to the user, and a mandatory block of the signed message. */
  statement: string;
  /** Single-use nonce. */
  nonce: string;
  /** ISO-8601 timestamp the challenge was minted at. */
  issuedAt: string;
  /** Resources block of the signed message. Never empty. */
  resources: string[];
  /** Full CAIP-2 id of the offered Solana chain, e.g. `solana:5eykt…`. */
  chainId: string;
  /** Signing algorithm that chain entry declares. `ed25519` on Solana. */
  signingType: string;
}

/**
 * Decode a `PAYMENT-REQUIRED` header into the Solana SIWX challenge it offers.
 *
 * @param paymentRequiredHeader The raw header value from a 402 response.
 * @throws {SiwxUnsupportedError} when the 402 carries no `sign-in-with-x`
 *   extension. That means a PAID endpoint: SIWX cannot satisfy it, and signing
 *   anything here would produce a proof the server answers with a 401 rather
 *   than an error naming the real cause.
 * @throws {SiwxChallengeError} when the header is not base64 JSON, when a field
 *   the signed message needs is missing, or when no Solana chain is offered.
 */
export function parseChallenge(paymentRequiredHeader: string): SiwxChallenge {
  const decoded = decodeHeader(paymentRequiredHeader);

  const extensions = asRecord(decoded.extensions);
  const extension = extensions ? asRecord(extensions[SIWX_EXTENSION]) : null;
  if (!extension) {
    throw new SiwxUnsupportedError(
      "the 402 carries no sign-in-with-x extension, so this endpoint is paid rather than identity-only"
    );
  }

  const info = asRecord(extension.info);
  if (!info) {
    throw new SiwxChallengeError("the sign-in-with-x extension has no info block");
  }

  const chain = solanaChain(extension.supportedChains);

  return {
    domain: requireString(info, "domain"),
    uri: requireString(info, "uri"),
    version: requireString(info, "version"),
    statement: requireString(info, "statement"),
    nonce: requireString(info, "nonce"),
    issuedAt: requireString(info, "issuedAt"),
    resources: requireResources(info),
    chainId: chain.chainId,
    signingType: chain.signingType,
  };
}

/**
 * Render the bytes agentres expects to be signed, as an EIP-4361 body.
 *
 * The `Chain ID:` line carries the BARE CAIP-2 reference — the part after
 * `solana:` — while {@link buildPayload} sends the full id. This is the trap
 * that cost the most probe attempts, so the prefix is asserted rather than
 * stripped optimistically.
 *
 * @param challenge A challenge from {@link parseChallenge}.
 * @param address   The signer's Solana address, base58.
 * @throws {SiwxChallengeError} when `challenge.chainId` is not a Solana CAIP-2 id.
 */
export function buildMessage(challenge: SiwxChallenge, address: string): string {
  if (!challenge.chainId.startsWith(SOLANA_NAMESPACE)) {
    throw new SiwxChallengeError(
      `expected a solana: chain id for the message, got "${challenge.chainId}"`
    );
  }
  const reference = challenge.chainId.slice(SOLANA_NAMESPACE.length);
  const resources = challenge.resources.map((resource) => `- ${resource}`).join("\n");

  return (
    `${challenge.domain} wants you to sign in with your Solana account:\n` +
    `${address}\n` +
    `\n${challenge.statement}\n` +
    `\nURI: ${challenge.uri}\n` +
    `Version: ${challenge.version}\n` +
    `Chain ID: ${reference}\n` +
    `Nonce: ${challenge.nonce}\n` +
    `Issued At: ${challenge.issuedAt}\n` +
    `Resources:\n${resources}`
  );
}

/**
 * Build the base64 payload for the `SIGN-IN-WITH-X` header.
 *
 * Takes the signature as bytes and base58-encodes it here, so no caller can
 * hand a `Uint8Array` to a string API by accident — that conversion produces a
 * comma-separated digit list which encodes cleanly and verifies as garbage,
 * with no error anywhere (ai-memoryless-client#7217).
 *
 * @param challenge A challenge from {@link parseChallenge}.
 * @param address   The signer's Solana address, base58.
 * @param signature The raw 64-byte ed25519 signature over {@link buildMessage}.
 */
export function buildPayload(
  challenge: SiwxChallenge,
  address: string,
  signature: Uint8Array
): string {
  const payload = {
    domain: challenge.domain,
    address,
    statement: challenge.statement,
    uri: challenge.uri,
    version: challenge.version,
    // Full CAIP-2 here, unlike the bare reference the message carries.
    chainId: challenge.chainId,
    type: challenge.signingType,
    nonce: challenge.nonce,
    issuedAt: challenge.issuedAt,
    resources: challenge.resources,
    signature: base58Encode(signature),
  };

  return uint8ArrayToBase64(new TextEncoder().encode(JSON.stringify(payload)));
}

/** Bitcoin/Solana base58 alphabet — no 0, O, I or l. */
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Encode bytes as base58.
 *
 * Written here rather than pulled in: the SDK has no base58 dependency, the
 * only thing that needs one is this one signature field, and the algorithm is
 * a dozen lines. Each input byte is folded into a base-58 accumulator held as
 * little-endian digits; leading zero bytes are not part of that arithmetic and
 * are emitted separately as `1`s, which is what makes the encoding reversible.
 */
function base58Encode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }

  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] * 256;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let encoded = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) {
    encoded += BASE58_ALPHABET[digits[i]];
  }
  return encoded;
}

/** Base64-decode the header and parse it as the x402 PaymentRequired object. */
function decodeHeader(paymentRequiredHeader: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64ToUint8Array(paymentRequiredHeader)));
  } catch (cause) {
    throw new SiwxChallengeError("the PAYMENT-REQUIRED header is not base64-encoded JSON", {
      cause,
    });
  }

  const decoded = asRecord(parsed);
  if (!decoded) {
    throw new SiwxChallengeError("the PAYMENT-REQUIRED header did not decode to an object");
  }
  return decoded;
}

/**
 * Pick the Solana entry out of `supportedChains`.
 *
 * The chain id travels from the challenge rather than being pinned here: it is
 * what both the message and the payload are built from, so a provider that
 * moves to another Solana cluster keeps working. The first `solana:` entry
 * wins — providers list mainnet and devnet separately.
 */
function solanaChain(supportedChains: unknown): { chainId: string; signingType: string } {
  if (!Array.isArray(supportedChains)) {
    throw new SiwxChallengeError("the sign-in-with-x extension lists no supportedChains");
  }

  for (const entry of supportedChains) {
    const chain = asRecord(entry);
    const chainId = chain?.chainId;
    if (typeof chainId !== "string" || !chainId.startsWith(SOLANA_NAMESPACE)) {
      continue;
    }
    const signingType = chain?.type;
    if (typeof signingType !== "string" || signingType === "") {
      throw new SiwxChallengeError(`the ${chainId} entry declares no signing type`);
    }
    return { chainId, signingType };
  }

  throw new SiwxChallengeError("the sign-in-with-x extension offers no solana: chain");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Read a field the signed message cannot be built without. Every one of them is
 * mandatory: the probe proved that dropping the statement, or renaming any
 * line, fails signature verification rather than degrading.
 */
function requireString(info: Record<string, unknown>, key: string): string {
  const value = info[key];
  if (typeof value !== "string" || value === "") {
    throw new SiwxChallengeError(`the sign-in-with-x info block has no ${key}`);
  }
  return value;
}

function requireResources(info: Record<string, unknown>): string[] {
  const resources = info.resources;
  if (!Array.isArray(resources) || resources.length === 0) {
    throw new SiwxChallengeError("the sign-in-with-x info block has no resources");
  }
  if (!resources.every((resource) => typeof resource === "string" && resource !== "")) {
    throw new SiwxChallengeError("the sign-in-with-x resources are not all strings");
  }
  return resources as string[];
}
