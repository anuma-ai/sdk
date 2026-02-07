import { decryptData, requestEncryptionKey, encryptData } from "../../../react/useEncryption";
import type { SignMessageFn, EmbeddedWalletSignerFn } from "../../../react/useEncryption";
import type { CreateMessageOptions, UpdateMessageOptions, StoredMessage } from "./types";

const ENCRYPTION_PREFIX = "enc:v2:";

/**
 * Checks if a string value is encrypted (has the enc:v2: prefix)
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Encrypts a field value and adds the encryption prefix.
 * Uses random IV encryption for maximum security (not queryable).
 */
export async function encryptField(
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
export async function decryptField(
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
 * Encrypts a JSON field (vector, chunks, sources, thoughtProcess) as a string.
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
    // No encryption if wallet address not provided
    return message;
  }

  try {
    // Use type assertion to access all possible message fields safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = message as any;

    // Encrypt text fields
    const encryptedContent = msg.content !== undefined
      ? await encryptField(msg.content, address, signMessage, embeddedWalletSigner)
      : undefined;

    const encryptedThinking = msg.thinking !== undefined && msg.thinking !== null
      ? await encryptField(msg.thinking, address, signMessage, embeddedWalletSigner)
      : msg.thinking; // Preserve null/undefined

    // Encrypt JSON fields
    const encryptedVector = msg.vector
      ? await encryptJsonField(msg.vector, address, signMessage, embeddedWalletSigner)
      : undefined;

    const encryptedChunks = msg.chunks
      ? await encryptJsonField(msg.chunks, address, signMessage, embeddedWalletSigner)
      : undefined;

    const encryptedSources = msg.sources
      ? await encryptJsonField(msg.sources, address, signMessage, embeddedWalletSigner)
      : undefined;

    const encryptedThoughtProcess = msg.thoughtProcess
      ? await encryptJsonField(msg.thoughtProcess, address, signMessage, embeddedWalletSigner)
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
    // If encryption fails, return original message (backwards compatibility)
    console.warn("Failed to encrypt message fields, storing as plaintext:", error);
    return message;
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
    // No decryption if wallet address not provided
    return message;
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

  // Decrypt text fields
  const decryptedContent = await decryptField(message.content, address);

  const decryptedThinking = message.thinking
    ? await decryptField(message.thinking, address)
    : message.thinking;

  // Decrypt JSON fields
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
