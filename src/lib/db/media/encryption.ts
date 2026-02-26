import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../../react/useEncryption";
import { requestEncryptionKey } from "../../../react/useEncryption";
import { getLogger } from "../../logger";
import {
  decryptField,
  decryptJsonField,
  encryptField,
  encryptJsonField,
} from "../encryption-utils";
import type { CreateMediaOptions, MediaMetadata, StoredMedia } from "./types";

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
    return media;
  }

  try {
    // Request encryption key once for all fields
    await requestEncryptionKey(address, signMessage, embeddedWalletSigner);

    const encryptedName = await encryptField(
      media.name,
      address,
      signMessage,
      embeddedWalletSigner,
      true
    );

    const encryptedSourceUrl = media.sourceUrl
      ? await encryptField(media.sourceUrl, address, signMessage, embeddedWalletSigner, true)
      : undefined;

    const encryptedMetadata = media.metadata
      ? await encryptJsonField(media.metadata, address, signMessage, embeddedWalletSigner, true)
      : undefined;

    return {
      ...media,
      name: encryptedName,
      sourceUrl: encryptedSourceUrl,
      ...(encryptedMetadata !== undefined && {
        metadata: encryptedMetadata as unknown as MediaMetadata,
      }),
    };
  } catch (error) {
    getLogger().warn("Failed to encrypt media fields:", error);
    throw error;
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
    return media;
  }

  if (signMessage) {
    try {
      await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
    } catch (error) {
      getLogger().warn(
        "[decryptMediaFields] Failed to request encryption key, returning raw media:",
        error
      );
      return media;
    }
  }

  const decryptedName = await decryptField(media.name, address);

  const decryptedSourceUrl = media.sourceUrl
    ? await decryptField(media.sourceUrl, address)
    : media.sourceUrl;

  const decryptedMetadata = media.metadata
    ? await decryptJsonField<MediaMetadata>(
        typeof media.metadata === "string" ? media.metadata : JSON.stringify(media.metadata),
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
