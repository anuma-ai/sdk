import { hasEncryptionKey, onClearAllEncryptionState } from "../../../react/useEncryption";
import { decryptField, isEncrypted } from "../encryption-utils";

const LRU_CAPACITY = 256;

const titleCache = new Map<string, string>();

const pendingDecrypts = new Map<string, Promise<string>>();

let sessionEpoch = 0;

function buildCacheKey(address: string, encryptedTitle: string): string {
  return `${address}:${encryptedTitle}`;
}

function touchEntry(key: string, value: string): void {
  titleCache.delete(key);
  titleCache.set(key, value);
}

function insertWithEviction(key: string, value: string): void {
  titleCache.set(key, value);
  while (titleCache.size > LRU_CAPACITY) {
    const oldestKey = titleCache.keys().next().value;
    if (oldestKey === undefined) break;
    titleCache.delete(oldestKey);
  }
}

/**
 * Drop every cached plaintext title and pending decrypt promise.
 *
 * Wired into `clearAllEncryptionState()` via the listener registry in
 * `useEncryption.ts`. Also exported so consumers can clear the cache
 * proactively (e.g. on wallet switch within a session before the
 * full encryption-state teardown lands).
 */
export function clearLazyTitleCache(): void {
  titleCache.clear();
  pendingDecrypts.clear();
  sessionEpoch += 1;
}

onClearAllEncryptionState(clearLazyTitleCache);

/**
 * Inspect the LRU. Test-only helper, not exported from the public
 * barrels. Avoids depending on cache internals from tests.
 */
export function _peekLazyTitleCacheSize(): number {
  return titleCache.size;
}

/**
 * Decrypt a single conversation title on demand.
 *
 * Designed for the lazy display path: pair with `listConversationsLazy`
 * and call this once a row is actually visible.
 *
 * Behavior:
 *   - Plaintext input (no `enc:` prefix) is returned unchanged. This
 *     covers conversations created before encryption was enabled and
 *     keeps the helper safe to call unconditionally from rendering
 *     code that may receive a mix of encrypted and plaintext titles.
 *   - Encrypted input is decrypted via `decryptField`, which uses the
 *     same per-version cached `CryptoKey` as the eager path — no new
 *     key derivations are triggered.
 *   - Concurrent calls for the same `(address, encryptedTitle)` share
 *     a single decrypt promise.
 *   - The result is memoized in a 256-entry LRU.
 *
 * Throws if the encryption key for `address` isn't loaded. (The
 * underlying `decryptField` would otherwise silently return the
 * ciphertext, which would surface to the UI as a literal `enc:v3:...`
 * title — strictly worse than a thrown error the caller can catch.)
 *
 * @param encryptedTitle - The stored title. May be ciphertext or plaintext.
 * @param address - Wallet address that owns the encryption key.
 * @returns The decrypted plaintext title.
 */
export async function decryptConversationTitle(
  encryptedTitle: string,
  address: string
): Promise<string> {
  if (!encryptedTitle) return encryptedTitle;

  if (!isEncrypted(encryptedTitle)) return encryptedTitle;

  if (!address) {
    throw new Error("decryptConversationTitle: address is required for encrypted titles");
  }

  if (!hasEncryptionKey(address)) {
    throw new Error(
      "decryptConversationTitle: encryption key not loaded for address. " +
        "Call requestEncryptionKey() before decrypting titles."
    );
  }

  const cacheKey = buildCacheKey(address, encryptedTitle);

  const cached = titleCache.get(cacheKey);
  if (cached !== undefined) {
    touchEntry(cacheKey, cached);
    return cached;
  }

  const inFlight = pendingDecrypts.get(cacheKey);
  if (inFlight) return inFlight;

  const epochAtStart = sessionEpoch;

  const promise = (async () => {
    const plaintext = await decryptField(encryptedTitle, address);
    if (isEncrypted(plaintext)) {
      throw new Error("decryptConversationTitle: decryption failed (returned ciphertext)");
    }
    if (sessionEpoch === epochAtStart) {
      insertWithEviction(cacheKey, plaintext);
    }
    return plaintext;
  })();

  pendingDecrypts.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    pendingDecrypts.delete(cacheKey);
  }
}
