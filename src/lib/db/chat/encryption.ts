import type { EmbeddedWalletSignerFn, SignMessageFn } from "../../../react/useEncryption";
import { refreshEncryptionKeyIfMatches, requestEncryptionKey } from "../../../react/useEncryption";
import { getLogger } from "../../logger";
import {
  decryptField,
  decryptFieldDetailed,
  encryptField,
  encryptJsonField,
  isEncrypted,
} from "../encryption-utils";
import type { CreateMessageOptions, StoredMessage, UpdateMessageOptions } from "./types";

export { decryptField, encryptField, isEncrypted };

type FieldDecryptStatus = Awaited<ReturnType<typeof decryptFieldDetailed>>["status"];

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
 * Returns both the parsed value (when decrypt+parse succeed) and the decrypt
 * status so callers can surface sibling-field failures via `decryptionStatus`.
 */
async function decryptMaybeJsonFieldDetailed<T>(
  value: T | string | null | undefined,
  address: string
): Promise<{ value: T | undefined; status: FieldDecryptStatus; probe?: string }> {
  if (value === undefined) return { value: undefined, status: "plaintext" };
  if (value === null) return { value: value as unknown as undefined, status: "plaintext" };
  if (typeof value === "string") {
    if (isEncrypted(value)) {
      const detailed = await decryptFieldDetailed(value, address);
      if (detailed.status !== "ok") {
        return { value: undefined, status: detailed.status, probe: value };
      }
      try {
        return { value: JSON.parse(detailed.value) as T, status: "ok" };
      } catch (error) {
        getLogger().warn("Failed to parse decrypted JSON field:", error);
        return { value: undefined, status: "invalid_payload", probe: value };
      }
    }
    // Plaintext string column from a legacy/unencrypted message — parse once.
    try {
      return { value: JSON.parse(value) as T, status: "plaintext" };
    } catch {
      return { value: undefined, status: "plaintext" };
    }
  }
  // Already-parsed plaintext object/array — pass through, no copy.
  return { value, status: "plaintext" };
}

/** Prefer auth_mismatch > key_missing > invalid_payload when aggregating. */
function worseDecryptStatus(
  a: FieldDecryptStatus | undefined,
  b: FieldDecryptStatus
): FieldDecryptStatus | undefined {
  if (b === "ok" || b === "plaintext") return a;
  if (!a || a === "ok" || a === "plaintext") return b;
  const rank = (s: FieldDecryptStatus): number => {
    if (s === "auth_mismatch") return 3;
    if (s === "key_missing") return 2;
    if (s === "invalid_payload") return 1;
    return 0;
  };
  return rank(b) >= rank(a) ? b : a;
}

/**
 * Decrypts all sensitive message fields after retrieval.
 *
 * Self-heal (#561): when `signMessage` is provided and any encrypted field
 * fails under the currently pinned key, we try one verify-before-commit
 * re-derive via {@link refreshEncryptionKeyIfMatches} (deduped across parallel
 * decrypts). Candidate keys that cannot open the intact ciphertext never
 * replace the store.
 *
 * On unrecoverable decrypt failure the original ciphertext is left in place
 * for string fields (never a `[Decryption Failed]` placeholder) and
 * `decryptionStatus` is set from **any** failing field — including siblings
 * of a readable `content` — so consumers can show a recoverable unlock path.
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

  let assembled = await assembleDecryptedMessage(message, address);

  const needsRefresh =
    assembled.decryptionStatus === "auth_mismatch" || assembled.decryptionStatus === "key_missing";

  if (needsRefresh && signMessage && assembled.refreshProbe) {
    try {
      const refreshed = await refreshEncryptionKeyIfMatches(
        address,
        assembled.refreshProbe,
        signMessage,
        embeddedWalletSigner
      );
      if (refreshed) {
        assembled = await assembleDecryptedMessage(message, address);
      }
    } catch (error) {
      getLogger().warn("Failed to refresh encryption key after decrypt failure:", error);
    }
  }

  // refreshProbe is internal — strip before returning
  const { refreshProbe: _probe, ...result } = assembled;
  return result;
}

async function assembleDecryptedMessage(
  message: StoredMessage,
  address: string
): Promise<StoredMessage & { refreshProbe?: string }> {
  const contentResult = await decryptFieldDetailed(message.content, address);

  const thinkingResult = message.thinking
    ? await decryptFieldDetailed(message.thinking, address)
    : null;

  const vectorResult = await decryptMaybeJsonFieldDetailed<number[]>(
    message.vector as number[] | string | undefined,
    address
  );
  const chunksResult = await decryptMaybeJsonFieldDetailed<typeof message.chunks>(
    message.chunks as typeof message.chunks | string | undefined,
    address
  );
  const sourcesResult = await decryptMaybeJsonFieldDetailed<typeof message.sources>(
    message.sources as typeof message.sources | string | undefined,
    address
  );
  const thoughtProcessResult = await decryptMaybeJsonFieldDetailed<typeof message.thoughtProcess>(
    message.thoughtProcess as typeof message.thoughtProcess | string | undefined,
    address
  );

  let decryptionStatus: FieldDecryptStatus | undefined;
  let refreshProbe: string | undefined;

  const consider = (status: FieldDecryptStatus, probe?: string) => {
    decryptionStatus = worseDecryptStatus(decryptionStatus, status);
    if (!refreshProbe && probe && (status === "auth_mismatch" || status === "key_missing")) {
      refreshProbe = probe;
    }
  };

  consider(contentResult.status, isEncrypted(message.content) ? message.content : undefined);
  if (thinkingResult && message.thinking && typeof message.thinking === "string") {
    consider(thinkingResult.status, isEncrypted(message.thinking) ? message.thinking : undefined);
  }
  if (vectorResult.probe) consider(vectorResult.status, vectorResult.probe);
  if (chunksResult.probe) consider(chunksResult.status, chunksResult.probe);
  if (sourcesResult.probe) consider(sourcesResult.status, sourcesResult.probe);
  if (thoughtProcessResult.probe) {
    consider(thoughtProcessResult.status, thoughtProcessResult.probe);
  }

  const statusForConsumer =
    decryptionStatus === "ok" || decryptionStatus === "plaintext" || !decryptionStatus
      ? undefined
      : decryptionStatus;

  const result: StoredMessage & { refreshProbe?: string } = {
    ...message,
    content: contentResult.value,
    thinking: thinkingResult ? thinkingResult.value : message.thinking,
    vector: vectorResult.value,
    chunks: chunksResult.value,
    sources: sourcesResult.value,
    thoughtProcess: thoughtProcessResult.value,
  };
  if (statusForConsumer) {
    result.decryptionStatus = statusForConsumer;
  } else {
    delete result.decryptionStatus;
  }
  if (refreshProbe) {
    result.refreshProbe = refreshProbe;
  }
  return result;
}
