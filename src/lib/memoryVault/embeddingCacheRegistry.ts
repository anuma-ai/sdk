import type { Database } from "@nozbe/watermelondb";

import { onClearAllEncryptionState } from "../../react/useEncryption";
import { createVaultEmbeddingCache } from "./lruCache";
import type { VaultEmbeddingCache } from "./searchTool";

let registry = new WeakMap<Database, Map<string, VaultEmbeddingCache>>();

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
