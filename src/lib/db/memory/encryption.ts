import {
  decryptData,
  requestEncryptionKey,
  encryptDataDeterministic,
} from "../../../react/useEncryption";
import type {
  SignMessageFn,
  EmbeddedWalletSignerFn,
} from "../../../react/useEncryption";

const ENCRYPTION_PREFIX = "enc:v2:";

/**
 * Checks if a string value is encrypted (has the enc:v2: prefix)
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Encrypts the memory text field
 *
 * Uses deterministic encryption (same plaintext produces same ciphertext)
 * to enable content comparison. The IV is derived from the plaintext and
 * address, ensuring consistent encryption while maintaining security.
 */
export async function encryptMemoryText(
  text: string,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string> {
  if (!text) return text;
  if (!address || !signMessage) return text;

  // Skip encryption if already encrypted (prevents double encryption)
  if (isEncrypted(text)) {
    return text;
  }

  try {
    await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
    const encrypted = await encryptDataDeterministic(text, address);
    return `${ENCRYPTION_PREFIX}${encrypted}`;
  } catch (error) {
    console.warn(
      "Failed to encrypt memory text, storing as plaintext:",
      error
    );
    return text;
  }
}

/**
 * Decrypts the memory text field
 * Returns the original value if not encrypted or if decryption fails
 */
export async function decryptMemoryText(
  text: string,
  address: string
): Promise<string> {
  if (!text || !isEncrypted(text)) {
    return text;
  }

  try {
    const encryptedData = text.slice(ENCRYPTION_PREFIX.length);
    return await decryptData(encryptedData, address);
  } catch (error) {
    // If decryption fails, return the original value (backwards compatibility)
    console.warn("Failed to decrypt memory text, returning as-is:", error);
    return text;
  }
}
