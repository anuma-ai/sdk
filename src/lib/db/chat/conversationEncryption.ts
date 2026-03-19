import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../../react/useEncryption";
import { requestEncryptionKey } from "../../../react/useEncryption";
import { getLogger } from "../../logger";
import { decryptField, encryptField } from "../encryption-utils";
import type { CreateConversationOptions, StoredConversation } from "./types";

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
    getLogger().warn("Failed to encrypt conversation fields:", error);
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

  if (signMessage) {
    try {
      await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
    } catch (error) {
      getLogger().warn("Failed to request encryption key for decryption:", error);
    }
  }

  const decryptedTitle = await decryptField(conversation.title, address);

  return {
    ...conversation,
    title: decryptedTitle,
  };
}
