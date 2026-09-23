/**
 * Row-version tags for the vault embedding cache.
 *
 * The cache (`VaultEmbeddingCache`) is keyed by memory id and was validated by
 * dimension alone, so a row whose content changed underneath it — an edit
 * synced from another device, a merge — kept ranking on the vector of its OLD
 * content for the life of the cache. Each entry is now tagged with the
 * `updatedAt` (ms) of the row version it was computed for, and a read against
 * any other version is a miss.
 *
 * The tag is keyed by the vector OBJECT, in a WeakMap beside the cache rather
 * than inside it, so `VaultEmbeddingCache` keeps its public
 * `Map<string, Float32Array>` shape, and a writer that replaces an entry can't
 * inherit the tag of the vector it replaced — its new vector simply has none.
 *
 * An UNTAGGED entry is a miss, not trusted. A writer that didn't say which row
 * version its vector belongs to can't be vouched for: adopting the version of
 * whatever row a later search happens to read would bless a vector from an
 * older write as current. The cost of a miss is a re-resolve from the row's
 * stored embedding column (a DB read + parse, no network); a re-embed only
 * happens when the row has no usable stored vector, which is the same cost
 * any cold cache pays. Writers that know the committed row (`retain()`, the
 * search paths) tag their entries, so the common path stays warm.
 *
 * Dependency-free on purpose so `retain()` can tag its writes without pulling
 * in (or being mocked out with) the search module.
 */

import type { VaultEmbeddingCache } from "./searchTool";

const vectorRowVersion = new WeakMap<Float32Array, number>();

/** `cache.set`, tagging the vector with the row version it belongs to. An
 * absent or invalid `updatedAt` leaves it untagged (a miss on read). */
export function cacheRowVector(
  cache: VaultEmbeddingCache,
  id: string,
  vec: Float32Array,
  updatedAt: Date | undefined
): void {
  cache.set(id, vec);
  const version = updatedAt?.getTime();
  if (version !== undefined && Number.isFinite(version)) vectorRowVersion.set(vec, version);
}

/**
 * `cache.get` for the row version `updatedAt`. Undefined — and the entry is
 * evicted — when the entry is untagged or tagged with a different version.
 * With no usable `updatedAt` to compare against, the entry is returned as-is.
 */
export function cachedRowVector(
  cache: VaultEmbeddingCache,
  id: string,
  updatedAt: Date | undefined
): Float32Array | undefined {
  const vec = cache.get(id);
  if (!vec) return undefined;
  const version = updatedAt?.getTime();
  if (version === undefined || !Number.isFinite(version)) return vec;
  if (vectorRowVersion.get(vec) !== version) {
    cache.delete(id);
    return undefined;
  }
  return vec;
}
