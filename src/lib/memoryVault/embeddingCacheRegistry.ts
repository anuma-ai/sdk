/**
 * Process-wide registry of vault embedding caches, keyed by
 * `(database, walletAddress, model)`.
 *
 * The cache itself (`createVaultEmbeddingCache`) is cheap to allocate but
 * expensive to fill: warming it costs a full-vault read, a per-row decrypt,
 * and a `JSON.parse` of every persisted vector — or, for rows with no
 * persisted vector yet, a batch embed round-trip plus a per-row DB write.
 * Both `useChatStorage` hooks used to mint their own with
 * `useRef(createVaultEmbeddingCache())`, so that cost was paid once per hook
 * instance. That is fine for an app with a single mount and actively harmful
 * for one without: the Expo client mounts a `useChatStorage` per active
 * conversation on top of its recall-owning instance, so N resident drivers
 * meant N cold caches (and is why the Expo hook never warmed at all).
 *
 * Resolving from this registry instead means every hook instance sharing an
 * identity shares one warm store. It also makes id-keyed invalidation global:
 * `deleteVaultMemory`/`updateVaultMemory` evict by memory id, and with
 * per-instance caches a second mounted hook kept serving the stale vector.
 *
 * The sharers do contend for one `DEFAULT_VAULT_CACHE_SIZE` LRU where they used
 * to have one each. They read the same vault off the same warm, so their
 * working sets coincide almost exactly — and a vault under the cap, which is
 * the ordinary case, never evicts at all. Resident RAM drops by a factor of N
 * while those mounts coexist; what happens once they don't is under Lifetime.
 *
 * ## Why the key is exactly (database, wallet, model)
 *
 * - **database** — entries are keyed by memory id, and ids are only unique
 *   within one database.
 * - **wallet** — values are derived from wallet-decrypted content. An app that
 *   reuses one `Database` across a wallet switch would otherwise hand the
 *   previous account's plaintext-derived vectors to the next one. The client DB
 *   is declared single-tenant per wallet (`vaultCtx.singleTenant`), so in
 *   practice the `Database` key already isolates accounts; keying on the wallet
 *   too means an app that violates that contract still can't cross the line.
 *   Addresses are used verbatim, not case-normalized, matching how the rest of
 *   the SDK keys wallet state — two casings of one address cost a duplicate
 *   cache, never a shared one. And nothing here assumes the address *is* an
 *   address: see `buildKey`.
 * - **model** — values are vectors in a specific embedding space. The search
 *   read path validates a cache hit by *dimension* only (see the `cached.length
 *   === queryEmbedding.length` guard in `searchTool.ts`), so two models that
 *   happen to share a dimension would silently blend spaces into the same
 *   cosine math with no error anywhere.
 *
 * `baseUrl` and `maskInput` are deliberately NOT part of the key even though
 * both can move a vector. The DB persistence tier already blends across them —
 * `preEmbedVaultMemories` reuses a persisted vector on a *model-only* compat
 * check, so a vector embedded by a masked, differently-pointed hook is already
 * read back by its neighbour through the database. A stricter in-memory key
 * would buy no isolation the tier below it doesn't already give away.
 *
 * ## Lifetime
 *
 * The outer map is a `WeakMap` keyed by `Database` so a torn-down database
 * takes its caches with it. Unlike `userSettingsStore`'s pool there is no
 * refcount teardown on last unmount: outliving a mount is the entire point —
 * an Expo conversation switch unmounts the driver that warmed the cache.
 *
 * The cost of that is worth stating plainly, because it is a real change from
 * the per-hook refs: unmounting the last hook no longer releases anything. A
 * warm cache stays resident until `clearAllEncryptionState` fires or the
 * `Database` itself is dropped, where before it became garbage with the hook
 * that owned it. The ceiling per identity is the LRU cap —
 * `DEFAULT_VAULT_CACHE_SIZE` Float32Arrays, ~80 MB at the default model's 4096
 * dimensions — and an app that cycles the wallet prop without ever firing
 * teardown pins one such cache per wallet it has seen. Sharing still wins on
 * net (N mounts used to hold N copies of the same vectors), but the win is on
 * duplication, not on lifetime.
 *
 * That makes session teardown this module's problem rather than the hooks'.
 * Previously a hook's cache died with the hook, so wiping the mounted hooks'
 * caches on `clearAllEncryptionState` covered everything. Now an instance can
 * outlive every hook that held it, so the hooks alone would leave the previous
 * session's vectors resident on a shared browser. Swapping the whole registry
 * on that signal closes it from the other side: an instance no mounted hook
 * still references becomes unreachable and is collected, and one that a hook
 * does reference is wiped by that hook's own clear effect. Between the two,
 * every instance is either dropped or emptied.
 *
 * The swap does mean a hook that mounts *after* teardown while an older hook is
 * still mounted resolves a fresh instance instead of joining the old one. Both
 * are empty at that instant, but they don't stay that way: the older hook's
 * deps (database, wallet, model) haven't changed, so it keeps the orphaned
 * instance and refills it on demand, and until it unmounts the two diverge —
 * an id-keyed eviction through one won't reach the other, which is the staleness
 * sharing otherwise removes. It needs a teardown that leaves a hook mounted
 * on unchanged props to happen at all, and it is never worse than the per-hook
 * refs this replaced, where every pair of hooks diverged permanently. Closing it
 * means making mounted hooks re-resolve after a swap — a generation counter read
 * through `useSyncExternalStore` — not trying to clear a `WeakMap` in place.
 */

import type { Database } from "@nozbe/watermelondb";

import { onClearAllEncryptionState } from "../../react/useEncryption";
import { createVaultEmbeddingCache } from "./lruCache";
import type { VaultEmbeddingCache } from "./searchTool";

/**
 * `let`, not `const`, so the encryption-teardown listener below (and tests) can
 * swap in a fresh registry wholesale — a `WeakMap` can't be enumerated, so
 * replacing it is the only way to drop every entry at once.
 */
let registry = new WeakMap<Database, Map<string, VaultEmbeddingCache>>();

/**
 * JSON rather than a `wallet|model` template so the two halves can't run
 * together: `walletAddress` is typed as an opaque `string`, and nothing stops a
 * consumer passing something other than a hex address. A separator a caller can
 * smuggle into either half is a way to land on another identity's cache, which
 * is precisely what this key exists to prevent. Runs once per identity change,
 * not per read, so the encoding cost is irrelevant.
 */
function buildKey(walletAddress: string | undefined, model: string): string {
  return JSON.stringify([walletAddress ?? null, model]);
}

/**
 * Resolve the vault embedding cache for an identity, creating it on first ask.
 *
 * Callers with the same `(database, walletAddress, model)` get the same
 * instance; any difference in those three gets its own. `walletAddress` is
 * optional because the hooks accept a wallet-less mount — those share a cache
 * with each other and with nobody else.
 */
export function getVaultEmbeddingCache(
  database: Database,
  walletAddress: string | undefined,
  model: string
): VaultEmbeddingCache {
  let perDb = registry.get(database);
  if (!perDb) {
    perDb = new Map();
    registry.set(database, perDb);
  }
  const key = buildKey(walletAddress, model);
  let cache = perDb.get(key);
  if (!cache) {
    cache = createVaultEmbeddingCache();
    perDb.set(key, cache);
  }
  return cache;
}

/**
 * Drop every cache from the registry so nothing resolved before a session
 * teardown can be resolved again after it.
 *
 * Subscribed at module load — the registry is process-lived and there's no
 * natural unsubscribe point, so the handle is intentionally discarded. Mirrors
 * `lazyDecrypt`'s title-cache clear on the same signal.
 */
onClearAllEncryptionState(() => {
  registry = new WeakMap<Database, Map<string, VaultEmbeddingCache>>();
});

/**
 * Test-only: discard the registry. `vi.resetModules()` does not re-initialize
 * already-resolved module bindings, so the registry would otherwise persist
 * across tests; call this in `beforeEach` for explicit isolation. Production
 * code should not import this.
 */
export function __resetVaultEmbeddingCacheRegistryForTests(): void {
  registry = new WeakMap<Database, Map<string, VaultEmbeddingCache>>();
}
