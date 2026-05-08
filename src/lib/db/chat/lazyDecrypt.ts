/**
 * Lazy decryption helpers for conversation titles.
 *
 * Today the SDK eagerly decrypts every conversation title returned from
 * `getConversationsOp` so callers can render them immediately. For users
 * with hundreds or thousands of conversations this means hundreds of
 * plaintext title strings sitting in client RAM at all times — a
 * non-trivial memory cost on long-lived tabs, and an unnecessary one
 * since only the visible rows actually need plaintext.
 *
 * `decryptConversationTitle` is the opt-in alternative. Callers pair it
 * with the lazy `listConversationsLazy` operation (see operations.ts) to
 * keep encrypted titles in their store and decrypt only on row visibility
 * (e.g. inside an IntersectionObserver callback or a virtualized list's
 * `renderItem`).
 *
 * The helper is a thin wrapper over `decryptField` plus:
 *   - a small bounded LRU so a row that briefly leaves and re-enters the
 *     viewport doesn't trigger a fresh decrypt;
 *   - in-flight dedupe so concurrent calls for the same encrypted title
 *     run a single decrypt rather than racing the same WebCrypto call;
 *   - a hard error when the encryption key isn't loaded — `decryptField`
 *     itself silently returns the ciphertext on key-missing, which is
 *     useful for backwards-compatible reads but actively misleading for
 *     a lazy display path (the UI would render `enc:v3:...` as the title).
 *
 * The LRU is cleared on every `clearAllEncryptionState()` so a shared
 * browser can't leak the previous user's titles after logout.
 */

import { hasEncryptionKey, onClearAllEncryptionState } from "../../../react/useEncryption";
import { decryptField, isEncrypted } from "../encryption-utils";

/**
 * Maximum number of `(address, encryptedTitle) → plaintext` entries to
 * retain. Picked to comfortably cover a typical sidebar's worth of
 * recent rows (a few screens of a virtualized list at a typical row
 * height) without bloating RAM. At 256 entries the cache itself caps
 * at well under 100 KiB even for unusually long titles.
 */
const LRU_CAPACITY = 256;

/**
 * Insertion-ordered cache of decrypted conversation titles.
 *
 * Why a `Map`: it preserves insertion order, and re-inserting an
 * existing key (`delete` + `set`) cheaply moves it to the most-recent
 * end — that's the LRU touch operation. Eviction is `keys().next()`
 * (oldest entry) when size exceeds the cap.
 */
const titleCache = new Map<string, string>();

/**
 * In-flight decrypt promises keyed identically to the cache. Two callers
 * asking for the same `(address, encryptedTitle)` while a decrypt is
 * pending share the same promise; the second caller never enters
 * `decryptField`. Cleared as soon as the promise settles so failed
 * decrypts don't pin the slot.
 */
const pendingDecrypts = new Map<string, Promise<string>>();

/**
 * Session epoch — bumped on every `clearLazyTitleCache()`. An in-flight
 * decrypt that started before a teardown captures the pre-teardown
 * value; if the epoch has advanced when the promise resolves, the
 * write to `titleCache` is skipped. Without this guard a decrypt that
 * already obtained the `CryptoKey` from the previous session can
 * silently re-populate the just-cleared LRU with old-session plaintext.
 */
let sessionEpoch = 0;

function buildCacheKey(address: string, encryptedTitle: string): string {
  return `${address}:${encryptedTitle}`;
}

/** Touch an existing key so it becomes most-recently-used. */
function touchEntry(key: string, value: string): void {
  titleCache.delete(key);
  titleCache.set(key, value);
}

/** Insert a new key and evict the oldest if the cap is exceeded. */
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
  // Invalidate any in-flight decrypt that captured the pre-teardown epoch
  // so it can't write to the just-cleared cache when it resolves.
  sessionEpoch += 1;
}

// Subscribe at module load so we never miss a teardown. The handle is
// intentionally unused — the LRU is process-lived and there's no
// natural unsubscribe point.
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

  // Fast path: plaintext value (legacy unencrypted conversation).
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
    // Promote on access so frequently-rendered rows stay in cache.
    touchEntry(cacheKey, cached);
    return cached;
  }

  // Dedupe concurrent decrypts for the same key.
  const inFlight = pendingDecrypts.get(cacheKey);
  if (inFlight) return inFlight;

  // Snapshot the session epoch at the moment we kick off this decrypt.
  // If `clearLazyTitleCache()` runs while the decrypt is in flight,
  // the captured epoch will be stale by the time the promise resolves
  // and we skip the cache write to avoid leaking old-session plaintext
  // into the just-cleared LRU.
  const epochAtStart = sessionEpoch;

  const promise = (async () => {
    const plaintext = await decryptField(encryptedTitle, address);
    // `decryptField` returns the input unchanged on decrypt failure
    // (backwards-compat behavior). For the lazy path we treat that as
    // a hard error rather than caching a still-encrypted string.
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
