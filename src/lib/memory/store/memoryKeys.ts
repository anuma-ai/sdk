import {
  decryptDataWithKey,
  deriveKeyFromSignature,
  deriveKeyFromSignatureV3,
  encryptDataWithKey,
  hexToBytes,
} from "../../../react/useEncryption.js";
import { isEncrypted } from "../../db/encryption-utils.js";

const KEY_ID_DOMAIN = "anuma-private-memory-key-id-v1";

/**
 * AES-GCM keys derived from one wallet signature over `SIGN_MESSAGE`.
 * @public
 */
export interface MemoryKeyRing {
  keyId: string;
  v3: CryptoKey;
  v2: CryptoKey;
}

/**
 * Thrown when no supplied key decrypts a field.
 * @public
 */
export class MemoryKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryKeyError";
  }
}

async function importAesKey(hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    hexToBytes(hex).buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derive the v3 and legacy v2 memory keys from a hex wallet signature.
 * @public
 */
export async function deriveMemoryKeyRing(signatureHex: string): Promise<MemoryKeyRing> {
  const v3Hex = await deriveKeyFromSignatureV3(signatureHex);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${KEY_ID_DOMAIN}:${v3Hex}`)
  );
  const keyId =
    "v3:" +
    Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    keyId,
    v3: await importAesKey(v3Hex),
    v2: await importAesKey(await deriveKeyFromSignature(signatureHex)),
  };
}

async function decryptWith(value: string, rings: readonly MemoryKeyRing[]): Promise<string> {
  const version = value.startsWith("enc:v3:") ? "v3" : "v2";
  for (const ring of rings) {
    try {
      return await decryptDataWithKey(value.slice(`enc:${version}:`.length), ring[version]);
    } catch {
      continue;
    }
  }
  throw new MemoryKeyError(`No supplied key decrypts this enc:${version} field`);
}

/**
 * Encrypt and decrypt callbacks for `createRemoteMemoryPersistence` under the canonical key.
 * @public
 */
export function memoryCipher(canonical: MemoryKeyRing): {
  encrypt: (plaintext: string) => Promise<string>;
  decrypt: (ciphertext: string) => Promise<string>;
} {
  return {
    encrypt: async (plaintext) => `enc:v3:${await encryptDataWithKey(plaintext, canonical.v3)}`,
    decrypt: async (ciphertext) => {
      if (!ciphertext.startsWith("enc:v3:") || !isEncrypted(ciphertext))
        throw new MemoryKeyError("Remote memory content must be enc:v3 ciphertext");
      return decryptWith(ciphertext, [canonical]);
    },
  };
}

/**
 * Re-encrypt a local field under the canonical key.
 * @throws MemoryKeyError when no key decrypts the field.
 * @public
 */
export async function reencryptMemoryField(
  value: string,
  canonical: MemoryKeyRing,
  fallbacks: readonly MemoryKeyRing[] = []
): Promise<string> {
  const { encrypt } = memoryCipher(canonical);
  if (!value.startsWith("enc:")) return encrypt(value);
  if (!isEncrypted(value))
    throw new MemoryKeyError("Field has an encryption prefix but an invalid payload");
  return encrypt(await decryptWith(value, [canonical, ...fallbacks]));
}
