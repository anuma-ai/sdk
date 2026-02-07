import { decryptData, requestEncryptionKey, encryptData } from "../../../react/useEncryption";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";
import type { CreateConversationOptions, StoredConversation } from "./types";

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
 * Encrypts conversation title before storage.
 *
 * Encrypted fields (random IV):
 * - title: Conversation title (reveals conversation topics)
 *
 * Non-encrypted fields:
 * - conversationId, projectId, timestamps, isDeleted
 */
export async function encryptConversationFields(
  conversation: CreateConversationOptions,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<CreateConversationOptions> {
  if (!address || !signMessage) {
    // No encryption if wallet address not provided
    return conversation;
  }

  try {
    const encryptedTitle = conversation.title
      ? await encryptField(conversation.title, address, signMessage, embeddedWalletSigner)
      : conversation.title;

    return {
      ...conversation,
      title: encryptedTitle,
    };
  } catch (error) {
    // If encryption fails, return original conversation (backwards compatibility)
    console.warn("Failed to encrypt conversation fields, storing as plaintext:", error);
    return conversation;
  }
}

/**
 * Decrypts conversation title after retrieval.
 */
export async function decryptConversationFields(
  conversation: StoredConversation,
  address?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredConversation> {
  if (!address) {
    // No decryption if wallet address not provided
    return conversation;
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

  const decryptedTitle = await decryptField(conversation.title, address);

  return {
    ...conversation,
    title: decryptedTitle,
  };
}
