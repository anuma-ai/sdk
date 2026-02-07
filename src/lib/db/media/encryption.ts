import { decryptData, requestEncryptionKey, encryptData } from "../../../react/useEncryption";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";
import type { CreateMediaOptions, StoredMedia, MediaMetadata } from "./types";

const ENCRYPTION_PREFIX = "enc:v2:";

/**
 * Checks if a string value is encrypted (has the enc:v2: prefix)
 */
function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Encrypts a field value and adds the encryption prefix.
 * Uses random IV encryption for maximum security.
 */
async function encryptField(
  value: string,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string> {
  if (!value) return value;
  if (!address || !signMessage) return value;

  // Skip encryption if already encrypted (prevents double encryption)
  if (isEncrypted(value)) {
    return value;
  }

  try {
    await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
    const encrypted = await encryptData(value, address);
    return `${ENCRYPTION_PREFIX}${encrypted}`;
  } catch (error) {
    console.warn("Failed to encrypt field, storing as plaintext:", error);
    return value;
  }
}

/**
 * Decrypts a field value by removing the prefix and decrypting.
 * Returns the original value if not encrypted or if decryption fails.
 */
async function decryptField(
  value: string,
  address: string
): Promise<string> {
  if (!value || !isEncrypted(value)) {
    return value;
  }

  try {
    const encryptedData = value.slice(ENCRYPTION_PREFIX.length);
    return await decryptData(encryptedData, address);
  } catch (error) {
    // If decryption fails, return the original value (backwards compatibility)
    console.warn("Failed to decrypt field, returning as-is:", error);
    return value;
  }
}

/**
 * Encrypts a JSON field (metadata) as a string.
 */
async function encryptJsonField<T>(
  value: T | undefined,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string | undefined> {
  if (!value) return undefined;

  const jsonString = JSON.stringify(value);
  const encrypted = await encryptField(jsonString, address, signMessage, embeddedWalletSigner);
  return encrypted;
}

/**
 * Decrypts a JSON field from an encrypted string.
 */
async function decryptJsonField<T>(
  value: string | undefined,
  address: string
): Promise<T | undefined> {
  if (!value) return undefined;

  const decrypted = await decryptField(value, address);

  // If decryption returned the original (not decrypted), try to parse as-is
  if (!decrypted) return undefined;

  try {
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.warn("Failed to parse decrypted JSON field:", error);
    return undefined;
  }
}

/**
 * Encrypts all sensitive media fields before storage.
 *
 * Encrypted fields (random IV):
 * - name: File name (can be sensitive)
 * - sourceUrl: Original external URL (reveals external sources)
 * - metadata: Custom metadata (may contain PII)
 *
 * Non-encrypted fields:
 * - mediaId, walletAddress, messageId, conversationId
 * - mimeType, mediaType, size, role, model
 * - dimensions, duration, timestamps, isDeleted
 */
export async function encryptMediaFields(
  media: CreateMediaOptions,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<CreateMediaOptions> {
  if (!address || !signMessage) {
    // No encryption if wallet address not provided
    return media;
  }

  try {
    const encryptedName = await encryptField(media.name, address, signMessage, embeddedWalletSigner);

    const encryptedSourceUrl = media.sourceUrl
      ? await encryptField(media.sourceUrl, address, signMessage, embeddedWalletSigner)
      : undefined;

    const encryptedMetadata = media.metadata
      ? await encryptJsonField(media.metadata, address, signMessage, embeddedWalletSigner)
      : undefined;

    return {
      ...media,
      name: encryptedName,
      sourceUrl: encryptedSourceUrl,
      ...(encryptedMetadata !== undefined && { metadata: encryptedMetadata as unknown as MediaMetadata }),
    };
  } catch (error) {
    // If encryption fails, return original media (backwards compatibility)
    console.warn("Failed to encrypt media fields, storing as plaintext:", error);
    return media;
  }
}

/**
 * Decrypts all sensitive media fields after retrieval.
 */
export async function decryptMediaFields(
  media: StoredMedia,
  address?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredMedia> {
  if (!address) {
    // No decryption if wallet address not provided
    return media;
  }

  // Request encryption key if needed (allows decryption even if key not in memory)
  if (signMessage) {
    try {
      await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
    } catch (error) {
      // If key request fails, continue anyway - decryptField will handle errors gracefully
      console.warn("Failed to request encryption key for decryption:", error);
    }
  }

  const decryptedName = await decryptField(media.name, address);

  const decryptedSourceUrl = media.sourceUrl
    ? await decryptField(media.sourceUrl, address)
    : media.sourceUrl;

  const decryptedMetadata = media.metadata
    ? await decryptJsonField<MediaMetadata>(
        typeof media.metadata === 'string' ? media.metadata : JSON.stringify(media.metadata),
        address
      )
    : media.metadata;

  return {
    ...media,
    name: decryptedName,
    sourceUrl: decryptedSourceUrl,
    metadata: decryptedMetadata,
  };
}
