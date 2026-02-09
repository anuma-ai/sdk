import { requestEncryptionKey } from "../../../react/useEncryption";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";
import type { CreateMessageOptions, UpdateMessageOptions, StoredMessage } from "./types";
import {
  isEncrypted,
  encryptField,
  decryptField,
  encryptJsonField,
  decryptJsonField,
} from "../encryption-utils";

export { isEncrypted, encryptField, decryptField };

/**
 * Encrypts all sensitive message fields before storage.
 *
 * Encrypted fields (random IV):
 * - content: Message text
 * - thinking: Extended reasoning content
 * - vector: Embedding (reveals semantic content)
 * - chunks: MessageChunk[] with embeddings
 * - sources: SearchSource[] (reveals browsing patterns)
 * - thoughtProcess: ActivityPhase[] (may contain memory data)
 *
 * Non-encrypted fields:
 * - IDs, roles, models, timestamps, flags, token counts, dimensions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function encryptMessageFields(
  message: CreateMessageOptions | UpdateMessageOptions,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<Record<string, any>> {
  if (!address || !signMessage) {
    return message;
  }

  try {
    // Request encryption key once for all fields
    await requestEncryptionKey(address, signMessage, embeddedWalletSigner);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = message as any;

    const encryptedContent = msg.content !== undefined
      ? await encryptField(msg.content, address, signMessage, embeddedWalletSigner, true)
      : undefined;

    const encryptedThinking = msg.thinking !== undefined && msg.thinking !== null
      ? await encryptField(msg.thinking, address, signMessage, embeddedWalletSigner, true)
      : msg.thinking;

    const encryptedVector = msg.vector
      ? await encryptJsonField(msg.vector, address, signMessage, embeddedWalletSigner, true)
      : undefined;

    const encryptedChunks = msg.chunks
      ? await encryptJsonField(msg.chunks, address, signMessage, embeddedWalletSigner, true)
      : undefined;

    const encryptedSources = msg.sources
      ? await encryptJsonField(msg.sources, address, signMessage, embeddedWalletSigner, true)
      : undefined;

    const encryptedThoughtProcess = msg.thoughtProcess
      ? await encryptJsonField(msg.thoughtProcess, address, signMessage, embeddedWalletSigner, true)
      : undefined;

    return {
      ...message,
      ...(encryptedContent !== undefined && { content: encryptedContent }),
      ...(encryptedThinking !== undefined && { thinking: encryptedThinking }),
      ...(encryptedVector !== undefined && { vector: encryptedVector }),
      ...(encryptedChunks !== undefined && { chunks: encryptedChunks }),
      ...(encryptedSources !== undefined && { sources: encryptedSources }),
      ...(encryptedThoughtProcess !== undefined && { thoughtProcess: encryptedThoughtProcess }),
    };
  } catch (error) {
    console.warn("Failed to encrypt message fields:", error);
    throw error;
  }
}

/**
 * Decrypts all sensitive message fields after retrieval.
 */
export async function decryptMessageFields(
  message: StoredMessage,
  address?: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<StoredMessage> {
  if (!address) {
    return message;
  }

  if (signMessage) {
    try {
      await requestEncryptionKey(address, signMessage, embeddedWalletSigner);
    } catch (error) {
      console.warn("Failed to request encryption key for decryption:", error);
    }
  }

  const decryptedContent = await decryptField(message.content, address);

  const decryptedThinking = message.thinking
    ? await decryptField(message.thinking, address)
    : message.thinking;

  const decryptedVector = message.vector
    ? await decryptJsonField<number[]>(
        typeof message.vector === 'string' ? message.vector : JSON.stringify(message.vector),
        address
      )
    : message.vector;

  const decryptedChunks = message.chunks
    ? await decryptJsonField<typeof message.chunks>(
        typeof message.chunks === 'string' ? message.chunks : JSON.stringify(message.chunks),
        address
      )
    : message.chunks;

  const decryptedSources = message.sources
    ? await decryptJsonField<typeof message.sources>(
        typeof message.sources === 'string' ? message.sources : JSON.stringify(message.sources),
        address
      )
    : message.sources;

  const decryptedThoughtProcess = message.thoughtProcess
    ? await decryptJsonField<typeof message.thoughtProcess>(
        typeof message.thoughtProcess === 'string' ? message.thoughtProcess : JSON.stringify(message.thoughtProcess),
        address
      )
    : message.thoughtProcess;

  return {
    ...message,
    content: decryptedContent,
    thinking: decryptedThinking,
    vector: decryptedVector,
    chunks: decryptedChunks,
    sources: decryptedSources,
    thoughtProcess: decryptedThoughtProcess,
  };
}
