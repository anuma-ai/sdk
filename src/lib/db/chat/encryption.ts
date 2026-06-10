import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../../react/useEncryption";
import { requestEncryptionKey } from "../../../react/useEncryption";
import { getLogger } from "../../logger";
import {
  decryptField,
  decryptJsonField,
  encryptField,
  encryptJsonField,
  isEncrypted,
  tryDecryptField,
} from "../encryption-utils";
import type { CreateMessageOptions, StoredMessage, UpdateMessageOptions } from "./types";

export { decryptField, encryptField, isEncrypted };

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

export async function encryptMessageFields(
  message: CreateMessageOptions | UpdateMessageOptions,
  address: string,
  signMessage?: SignMessageFn,
  embeddedWalletSigner?: EmbeddedWalletSignerFn
): Promise<Record<string, unknown>> {
  if (!address || !signMessage) {
    return message as unknown as Record<string, unknown>;
  }

  try {
    // Request encryption key once for all fields
    await requestEncryptionKey(address, signMessage, embeddedWalletSigner);

    const msg = message as Record<string, unknown>;

    const encryptedContent =
      msg.content !== undefined
        ? await encryptField(
            msg.content as string,
            address,
            signMessage,
            embeddedWalletSigner,
            true
          )
        : undefined;

    const encryptedThinking =
      msg.thinking !== undefined && msg.thinking !== null
        ? await encryptField(
            msg.thinking as string,
            address,
            signMessage,
            embeddedWalletSigner,
            true
          )
        : (msg.thinking as string | undefined);

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
    getLogger().warn("Failed to encrypt message fields:", error);
    throw error;
  }
}

/**
 * Decrypt a JSON field that may be either a ciphertext string ("enc:v?:…")
 * or an already-parsed plaintext value.
 *
 * `messageToStoredRaw` parses non-encrypted JSON columns up-front and
 * passes encrypted ones through as strings. The previous implementation
 * normalized both into a string via `JSON.stringify(...)` and let
 * `decryptJsonField` re-parse the result, which:
 *   - allocated a fresh string copy of the value, and
 *   - forced a redundant stringify → no-op decrypt → parse round-trip
 *     on every plaintext read.
 *
 * Here we branch once: ciphertext strings hit the decrypt path, and
 * already-parsed values pass through untouched. Defensive isEncrypted
 * gate ensures malformed strings still go through decrypt's tolerant
 * fallback rather than being treated as parsed values.
 */
async function decryptMaybeJsonField<T>(
  value: T | string | null | undefined,
  address: string
): Promise<T | undefined> {
  // Preserve `null` vs `undefined` distinction at runtime. WatermelonDB
  // optional JSON columns can surface `null` and callers may do strict
  // `=== null` guards, so we MUST NOT collapse one into the other. The
  // return type stays `T | undefined` to match the existing StoredMessage
  // shape — `null` is passed through unmodified, same as the original
  // ternary behavior (`message.vector ? decrypt : message.vector`).
  if (value === undefined) return undefined;
  if (value === null) return value as unknown as undefined;
  if (typeof value === "string") {
    if (isEncrypted(value)) {
      return await decryptJsonField<T>(value, address);
    }
    // Plaintext string column from a legacy/unencrypted message — parse once.
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  // Already-parsed plaintext object/array — pass through, no copy.
  return value;
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
      getLogger().warn("Failed to request encryption key for decryption:", error);
    }
  }

  // String fields: tryDecryptField returns the input unchanged when it
  // doesn't carry the enc: prefix (no copy on the plaintext path), and
  // reports `ok: false` when an encrypted value genuinely fails to decrypt
  // (missing/wrong key) — distinct from plaintext. On failure we keep the
  // ciphertext in place (never fabricate content) and flag the message via
  // `decryptionFailed` so consumers can show a recoverable state and trigger
  // key re-derivation instead of rendering undecryptable ciphertext.
  const contentResult = await tryDecryptField(message.content, address);
  const decryptedContent = contentResult.ok ? contentResult.value : contentResult.ciphertext;

  let decryptedThinking = message.thinking;
  let thinkingFailed = false;
  if (message.thinking) {
    const thinkingResult = await tryDecryptField(message.thinking, address);
    decryptedThinking = thinkingResult.ok ? thinkingResult.value : thinkingResult.ciphertext;
    thinkingFailed = !thinkingResult.ok;
  }

  const decryptionFailed = !contentResult.ok || thinkingFailed;

  // JSON fields: previously each of these always ran JSON.stringify on
  // already-parsed objects only to feed decryptJsonField, which then
  // JSON.parsed the same string back. The helper above skips the
  // round-trip when the value is already an object, cutting one
  // string-allocation + one parse per plaintext field per row.
  const decryptedVector = await decryptMaybeJsonField<number[]>(
    message.vector as number[] | string | undefined,
    address
  );

  const decryptedChunks = await decryptMaybeJsonField<typeof message.chunks>(
    message.chunks as typeof message.chunks | string | undefined,
    address
  );

  const decryptedSources = await decryptMaybeJsonField<typeof message.sources>(
    message.sources as typeof message.sources | string | undefined,
    address
  );

  const decryptedThoughtProcess = await decryptMaybeJsonField<typeof message.thoughtProcess>(
    message.thoughtProcess as typeof message.thoughtProcess | string | undefined,
    address
  );

  return {
    ...message,
    content: decryptedContent,
    thinking: decryptedThinking,
    vector: decryptedVector,
    chunks: decryptedChunks,
    sources: decryptedSources,
    thoughtProcess: decryptedThoughtProcess,
    ...(decryptionFailed ? { decryptionFailed: true } : {}),
  };
}
