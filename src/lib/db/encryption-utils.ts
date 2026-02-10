import { decryptData, requestEncryptionKey, encryptData } from "../../react/useEncryption";
import type { SignMessageFn, EmbeddedWalletSignerFn, EncryptionKeyVersion } from "../../react/useEncryption";

export type { SignMessageFn, EmbeddedWalletSignerFn };

/** Legacy prefix for SHA-256 derived key encryption */
export const ENCRYPTION_PREFIX_V2 = "enc:v2:";
/** Current prefix for HKDF derived key encryption (default for new writes) */
export const ENCRYPTION_PREFIX = "enc:v3:";

/**
 * Checks if a string value is encrypted (has the enc:v2: or enc:v3: prefix with valid hex payload).
 * Validates that the payload after the prefix is at least 56 hex characters
 * (24 chars for 12-byte IV + 32 chars minimum for ciphertext+tag).
 */
export function isEncrypted(value: string): boolean {
  const prefix = value.startsWith("enc:v3:") ? "enc:v3:" :
                 value.startsWith("enc:v2:") ? "enc:v2:" : null;
  if (!prefix) return false;
  const payload = value.slice(prefix.length);
  return payload.length >= 56 && /^[0-9a-f]+$/i.test(payload);
}

/**
 * Detects the encryption version from a prefixed value.
 * @returns The version and encrypted data, or null if not encrypted.
 */
function detectEncryptionVersion(value: string): { version: EncryptionKeyVersion; encryptedData: string } | null {
  if (value.startsWith("enc:v3:")) {
    return { version: "v3", encryptedData: value.slice("enc:v3:".length) };
  }
  if (value.startsWith("enc:v2:")) {
    return { version: "v2", encryptedData: value.slice("enc:v2:".length) };
  }
  return null;
}

/**
 * Encrypts a field value and adds the encryption prefix.
 * Uses random IV encryption for maximum security (not queryable).
 *
 * Throws on encryption failure — callers should handle errors
 * (e.g. queue system will retry later).
 *
 * @param skipKeyRequest - When true, skips requestEncryptionKey (caller already called it)
 */
export async function encryptField(
  value: string,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn,
  skipKeyRequest?: boolean,
): Promise<string> {
  if (!value) return value;
  if (!address || !signMessage) return value;

  if (isEncrypted(value)) {
    return value;
  }

  if (!skipKeyRequest) {
    await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
  }
  const encrypted = await encryptData(value, address);
  return `${ENCRYPTION_PREFIX}${encrypted}`;
}

/**
 * Decrypts a field value by detecting the version prefix and using the appropriate key.
 * Returns the original value if not encrypted or if decryption fails (backwards compat).
 */
export async function decryptField(
  value: string,
  address: string,
): Promise<string> {
  if (!value) return value;

  const detected = detectEncryptionVersion(value);
  if (!detected) return value; // plaintext

  // Validate payload
  if (detected.encryptedData.length < 56 || !/^[0-9a-f]+$/i.test(detected.encryptedData)) {
    return value; // invalid payload, return as-is
  }

  try {
    return await decryptData(detected.encryptedData, address, detected.version);
  } catch (error) {
    console.warn("Failed to decrypt field, returning as-is:", error);
    return value;
  }
}

/**
 * Encrypts a JSON field (vector, chunks, sources, thoughtProcess, metadata) as a string.
 */
export async function encryptJsonField<T>(
  value: T | undefined,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn,
  skipKeyRequest?: boolean,
): Promise<string | undefined> {
  if (!value) return undefined;

  const jsonString = JSON.stringify(value);
  const encrypted = await encryptField(jsonString, address, signMessage, embeddedWalletSigner, skipKeyRequest);
  return encrypted;
}

/**
 * Decrypts a JSON field from an encrypted string.
 */
export async function decryptJsonField<T>(
  value: string | undefined,
  address: string,
): Promise<T | undefined> {
  if (!value) return undefined;

  const decrypted = await decryptField(value, address);

  if (!decrypted) return undefined;

  try {
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.warn("Failed to parse decrypted JSON field:", error);
    return undefined;
  }
}
