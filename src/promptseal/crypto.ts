/**
 * Ed25519 keypair, sign, verify — wrapped over @noble/ed25519 v2.x.
 *
 * Keys are exposed as raw 32-byte buffers (RFC 8032 / @noble/ed25519 layout)
 * so the browser verifier consumes the same bytes. PEM (PKCS8) is supported
 * for on-disk persistence parity with Python's `cryptography` library.
 */
import * as ed from "@noble/ed25519";

import { base64ToBytes } from "./canonical";

export class PromptSealSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptSealSignatureError";
  }
}

/** Generate a fresh Ed25519 secret key (raw 32-byte seed). */
export function generateKeypair(): { sk: Uint8Array; pk: Uint8Array } {
  const sk = ed.utils.randomPrivateKey();
  // pk is derived async via publicKeyBytes(); we return an empty placeholder
  // to keep this function synchronous. Most callers go through
  // buildSignedReceipt which derives the public key via publicKeyBytes().
  return { sk, pk: new Uint8Array() };
}

/** Async raw 32-byte public key for *sk*. Matches @noble/ed25519. */
export async function publicKeyBytes(sk: Uint8Array): Promise<Uint8Array> {
  return await ed.getPublicKeyAsync(sk);
}

/** Sign *message* with *sk*. Returns a 64-byte Ed25519 signature. */
export async function sign(sk: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  return await ed.signAsync(message, sk);
}

/**
 * Verify *signature* over *message* under raw 32-byte *publicKey*. Returns
 * false on any failure (wrong key, tampered sig/msg, malformed input). Never
 * throws.
 */
export async function verify(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  if (publicKey.length !== 32 || signature.length !== 64) return false;
  try {
    return await ed.verifyAsync(signature, message, publicKey);
  } catch {
    return false;
  }
}

/**
 * Load an Ed25519 secret key from an unencrypted PKCS8 PEM string. Returns
 * the raw 32-byte seed, matching what `cryptography.hazmat`'s
 * `private_bytes(Encoding.Raw, PrivateFormat.Raw, ...)` would produce in
 * Python.
 *
 * PKCS8 format for Ed25519 (RFC 8410 §7): the seed is the last 32 bytes of
 * the DER-encoded private key. We don't parse the full ASN.1 structure —
 * instead we slice the seed off the end, which is reliable for the well-defined
 * Ed25519 PKCS8 envelope.
 */
export function loadAgentKeyFromPem(pem: string): Uint8Array {
  const stripped = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const der = base64ToBytes(stripped);
  if (der.length < 32) {
    throw new Error(`PEM body too short for Ed25519 PKCS8: ${der.length} bytes`);
  }
  // Ed25519 PKCS8 v1: 16-byte ASN.1 header + 0x04 0x20 (OCTET STRING, length 32)
  // + 32-byte seed. The seed is always the final 32 bytes.
  return der.slice(der.length - 32);
}
