import type {
  EmbeddedWalletSignerFn,
  EncryptionKeyVersion,
  SignMessageFn,
} from "../../react/useEncryption";
import { decryptData, encryptData, requestEncryptionKey } from "../../react/useEncryption";
import { getLogger } from "../logger";

export type { EmbeddedWalletSignerFn, SignMessageFn };

/** Current prefix for HKDF derived key encryption (default for new writes) */
const ENCRYPTION_PREFIX = "enc:v3:";

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
 * Result of attempting to decrypt a field.
 *
 * `ok: true` covers both genuinely-plaintext values and successful decryption.
 * `ok: false` means the value WAS an `enc:vN:` ciphertext that could not be
 * decrypted — `reason` distinguishes a missing key (recoverable by re-deriving
 * / re-unlocking) from a key/payload mismatch. Consumers must treat
 * `ciphertext` as opaque: never persist it back or render it as plaintext.
 *
 * @public
 */
export type DecryptResult =
  | { ok: true; value: string }
  | { ok: false; reason: "key-missing" | "decrypt-failed"; ciphertext: string };

/** Substring of the error thrown by `getEncryptionKey` when no key is loaded. */
const KEY_MISSING_MARKER = "Encryption key not found";

/**
 * Decrypts a field, distinguishing a successful/plaintext read from a genuine
 * decryption FAILURE of an encrypted value.
 *
 * Unlike {@link decryptField} (which returns the ciphertext unchanged on
 * failure for backwards compatibility, making "failed to decrypt" look
 * identical to "this was plaintext"), this surfaces failures so callers can
 * recover — re-derive the key, prompt re-unlock, or flag the record — instead
 * of silently treating ciphertext as content.
 *
 * Prefer this over `decryptField` in any read path that renders or persists
 * the result.
 *
 * @public
 */
export async function tryDecryptField(value: string, address: string): Promise<DecryptResult> {
  if (!value) return { ok: true, value };

  const detected = detectEncryptionVersion(value);
  if (!detected) return { ok: true, value }; // plaintext

  // Invalid payload — not something we encrypted; treat as plaintext to match
  // `decryptField`'s tolerant behavior rather than reporting a failure.
  if (detected.encryptedData.length < 56 || !/^[0-9a-f]+$/i.test(detected.encryptedData)) {
    return { ok: true, value };
  }

  try {
    const decrypted = await decryptData(detected.encryptedData, address, detected.version);
    return { ok: true, value: decrypted };
  } catch (error) {
    const reason =
      error instanceof Error && error.message.includes(KEY_MISSING_MARKER)
        ? "key-missing"
        : "decrypt-failed";
    getLogger().warn(`Failed to decrypt field (${reason}):`, error);
    return { ok: false, reason, ciphertext: value };
  }
}

/**
 * Decrypts a field value by detecting the version prefix and using the
 * appropriate key. Returns the original value if not encrypted or if
 * decryption fails (backwards compat).
 *
 * NOTE: a return value equal to the input is ambiguous — it can mean either
 * "this was plaintext" or "decryption failed and we fell back to ciphertext".
 * Use {@link tryDecryptField} when that distinction matters (e.g. to avoid
 * rendering/persisting undecryptable ciphertext as if it were content).
 */
export async function decryptField(value: string, address: string): Promise<string> {
  const result = await tryDecryptField(value, address);
  return result.ok ? result.value : result.ciphertext;
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
