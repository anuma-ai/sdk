import type {
  EmbeddedWalletSignerFn,
  EncryptionKeyVersion,
  SignMessageFn,
} from "../../react/useEncryption";
import {
  decryptData,
  encryptData,
  EncryptionKeyMissingError,
  requestEncryptionKey,
} from "../../react/useEncryption";
import { getLogger } from "../logger";

export type { EmbeddedWalletSignerFn, SignMessageFn };

/** Current prefix for HKDF derived key encryption (default for new writes) */
const ENCRYPTION_PREFIX = "enc:v3:";

/**
 * Outcome of a field decrypt attempt.
 *
 * On failure the original ciphertext is always returned in `value` — never a
 * placeholder like `[Decryption Failed]`. Callers that need a UI string must
 * map intentionally; masking intact ciphertext as data-loss is #561.
 */
type FieldDecryptStatus = "ok" | "plaintext" | "key_missing" | "auth_mismatch" | "invalid_payload";

interface FieldDecryptResult {
  status: FieldDecryptStatus;
  /** Plaintext on ok/plaintext; original input on failure. */
  value: string;
  /** Encryption version detected on the input, if any. */
  version?: EncryptionKeyVersion;
}

/**
 * Checks if a string value is encrypted (has the enc:v2: or enc:v3: prefix with valid hex payload).
 * Validates that the payload after the prefix is at least 56 hex characters
 * (24 chars for 12-byte IV + 32 chars minimum for ciphertext+tag).
 */
export function isEncrypted(value: string): boolean {
  const prefix = value.startsWith("enc:v3:")
    ? "enc:v3:"
    : value.startsWith("enc:v2:")
      ? "enc:v2:"
      : null;
  if (!prefix) return false;
  const payload = value.slice(prefix.length);
  return payload.length >= 56 && /^[0-9a-f]+$/i.test(payload);
}

/**
 * Detects the encryption version from a prefixed value.
 * @returns The version and encrypted data, or null if not encrypted.
 */
function detectEncryptionVersion(
  value: string
): { version: EncryptionKeyVersion; encryptedData: string } | null {
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
  skipKeyRequest?: boolean
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
 * Decrypts a field value with a structured status.
 *
 * Uses only the key matching the field's own `enc:vN:` prefix — a missing v2
 * key never blanks a v3 field (#561). Failures return the original ciphertext
 * in `value` with a typed `status`; they never substitute a placeholder.
 */
export async function decryptFieldDetailed(
  value: string,
  address: string
): Promise<FieldDecryptResult> {
  if (!value) return { status: "plaintext", value };

  const detected = detectEncryptionVersion(value);
  if (!detected) return { status: "plaintext", value };

  if (detected.encryptedData.length < 56 || !/^[0-9a-f]+$/i.test(detected.encryptedData)) {
    return { status: "invalid_payload", value, version: detected.version };
  }

  try {
    const plaintext = await decryptData(detected.encryptedData, address, detected.version);
    return { status: "ok", value: plaintext, version: detected.version };
  } catch (error) {
    if (error instanceof EncryptionKeyMissingError) {
      getLogger().warn("Failed to decrypt field (key missing for version):", error.message);
      return { status: "key_missing", value, version: detected.version };
    }
    getLogger().warn("Failed to decrypt field (auth mismatch or crypto error):", error);
    return { status: "auth_mismatch", value, version: detected.version };
  }
}

/**
 * Decrypts a field value by detecting the version prefix and using the appropriate key.
 * Returns the original value if not encrypted or if decryption fails (backwards compat).
 *
 * Prefer {@link decryptFieldDetailed} when the caller needs to distinguish
 * key-missing from auth-mismatch without masking ciphertext.
 */
export async function decryptField(value: string, address: string): Promise<string> {
  const result = await decryptFieldDetailed(value, address);
  return result.value;
}

/**
 * Encrypts a JSON field (vector, chunks, sources, thoughtProcess, metadata) as a string.
 */
export async function encryptJsonField<T>(
  value: T | undefined,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn,
  skipKeyRequest?: boolean
): Promise<string | undefined> {
  if (!value) return undefined;

  const jsonString = JSON.stringify(value);
  const encrypted = await encryptField(
    jsonString,
    address,
    signMessage,
    embeddedWalletSigner,
    skipKeyRequest
  );
  return encrypted;
}

/**
 * Decrypts a JSON field from an encrypted string.
 */
export async function decryptJsonField<T>(
  value: string | undefined,
  address: string
): Promise<T | undefined> {
  if (!value) return undefined;

  const decrypted = await decryptField(value, address);

  if (!decrypted) return undefined;

  try {
    return JSON.parse(decrypted) as T;
  } catch (error) {
    getLogger().warn("Failed to parse decrypted JSON field:", error);
    return undefined;
  }
}
