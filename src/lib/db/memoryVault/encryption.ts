import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../../react/useEncryption";
import { requestEncryptionKey } from "../../../react/useEncryption";
import { getLogger } from "../../logger";
import { decryptField, encryptField } from "../encryption-utils";
import type { StoredVaultMemory } from "./types";

/**
 * Encrypts vault memory content before storage.
 *
 * Encrypted fields (random IV):
 * - content: Memory text
 *
 * Non-encrypted fields:
 * - timestamps, isDeleted
 */
export async function encryptVaultMemoryContent(
  content: string,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<string> {
  if (!address || !signMessage) {
    return content;
  }

  await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
  return encryptField(content, address, signMessage, embeddedWalletSigner, true);
}

/**
 * Decrypts vault memory fields after retrieval.
 */
export async function decryptVaultMemoryFields(
  memory: StoredVaultMemory,
  address?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredVaultMemory> {
  if (!address) {
    return memory;
  }

  if (signMessage) {
    try {
      await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
    } catch (error) {
      getLogger().warn("Failed to request encryption key for vault decryption:", error);
    }
  }

  const decryptedContent = await decryptField(memory.content, address);

  return {
    ...memory,
    content: decryptedContent,
  };
}
