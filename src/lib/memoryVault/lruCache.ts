import type { VaultEmbeddingCache } from "./searchTool";

export const DEFAULT_VAULT_CACHE_SIZE = 5000;

/**
 * A simple LRU (Least Recently Used) cache that extends Map.
 * Entries are evicted oldest-first when the cache exceeds maxSize.
 * Accessing or setting an entry promotes it to most-recent.
 */
export class LRUCache<K, V> extends Map<K, V> {
  private readonly maxSize: number;

  constructor(maxSize: number) {
    super();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!super.has(key)) return undefined;
    const value = super.get(key)!;
    // Promote: delete and re-insert to move to end (most recent)
    super.delete(key);
    super.set(key, value);
    return value;
  }

  set(key: K, value: V): this {
    if (super.has(key)) {
      super.delete(key);
    }
    super.set(key, value);
    if (this.size > this.maxSize) {
      const oldest = this.keys().next().value;
      if (oldest !== undefined) {
        super.delete(oldest);
      }
    }
    return this;
  }
}

/**
 * Create a VaultEmbeddingCache backed by an LRU with a default cap of 1000 entries.
 */
export function createVaultEmbeddingCache(
  maxSize: number = DEFAULT_VAULT_CACHE_SIZE
): VaultEmbeddingCache {
  return new LRUCache<string, number[]>(maxSize);
}
