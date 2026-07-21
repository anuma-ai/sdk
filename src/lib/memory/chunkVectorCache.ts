import type { CachedChunkVectors, ChunkVectorCache } from "../db/chat/operations.js";
import { LRUCache } from "../memoryVault/lruCache.js";

/**
 * Default entry cap for the chunk-vector cache. Entries are keyed by message
 * id, so this bounds how many messages' decrypted chunk vectors stay resident.
 * Matches the vault cache default (#705).
 */
export const DEFAULT_CHUNK_CACHE_SIZE = 5000;

/**
 * Create a {@link ChunkVectorCache} backed by an LRU. Pass the returned cache
 * into `recall()` (via `RecallContext.chunkCache`) so the chunk lane skips the
 * per-query decrypt + JSON.parse of every message's chunk vectors on warm
 * entries. Stale entries self-invalidate on `updated_at` mismatch, so no
 * explicit invalidation is required beyond clearing it on an encryption-key
 * reset (wallet switch), mirroring the vault embedding cache.
 *
 * @public
 */
export function createChunkVectorCache(
  maxSize: number = DEFAULT_CHUNK_CACHE_SIZE
): ChunkVectorCache {
  return new LRUCache<string, CachedChunkVectors>(maxSize);
}
