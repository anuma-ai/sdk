import { requestEncryptionKey, hasEncryptionKey } from "../../../react/useEncryption";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";
import type { CreateConversationOptions, StoredConversation } from "./types";
import { encryptField, decryptField } from "../encryption-utils";

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
    return conversation;
  }

  try {
    // Request encryption key once for all fields
    await requestEncryptionKey(address, signMessage, embeddedWalletSigner);

    const encryptedTitle = conversation.title
      ? await encryptField(conversation.title, address, signMessage, embeddedWalletSigner, true)
      : conversation.title;

    return {
      ...conversation,
      title: encryptedTitle,
    };
  } catch (error) {
    console.warn("Failed to encrypt conversation fields:", error);
    throw error;
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
    return conversation;
  }

  // Key not yet derived — return encrypted fields as-is.
  // The caller (EncryptionKeyProvider) will re-fetch once the key is ready.
  if (!hasEncryptionKey(address)) {
    return conversation;
  }

  const decryptedTitle = await decryptField(conversation.title, address);

  return {
    ...conversation,
    title: decryptedTitle,
  };
}
