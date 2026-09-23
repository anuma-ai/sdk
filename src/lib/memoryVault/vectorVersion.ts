/**
 * Row-version tags for the vault embedding cache.
 *
 * The cache (`VaultEmbeddingCache`) is keyed by memory id and was validated by
 * dimension alone, so a row whose content changed underneath it — an edit
 * synced from another device, a merge — kept ranking on the vector of its OLD
 * content for the life of the cache. Each entry is now tagged with the row
 * version it was computed for, and a read against any other version is a miss.
 *
 * A version is `updatedAt` PLUS a fingerprint of the content. `updatedAt` alone
 * is not enough: `retain()`'s consolidate-update rewrites content and embedding
 * with `preserveUpdatedAt`, so a consolidation synced in from another device
 * arrives with new content under the SAME `updatedAt`. The fingerprint is a
 * 32-bit FNV-1a of the plaintext — linear in a fact's length and computed only
 * where the plaintext is already in hand, so it adds no decrypts:
 *   - the legacy read path, every writer and the un-embedded lane know the
 *     content, so they tag and check both halves;
 *   - the projected (decrypt-last) path decides hits from a key scan that has
 *     no content, so it checks `updatedAt` there and re-checks the fingerprint
 *     for the rows it decrypts (see `buildProjectedCorpus`); a vector it loaded
 *     from the stored column is tagged without one until first decrypted (see
 *     `matchesContent` for the trade-off).
 * Collisions only matter if a rewrite lands on the same `updatedAt` AND the
 * same 32-bit hash, and cost a stale ranking, not a wrong read.
 *
 * Tags live in a WeakMap keyed by the vector OBJECT, beside the cache rather
 * than inside it, so `VaultEmbeddingCache` keeps its public
 * `Map<string, Float32Array>` shape, and a writer that replaces an entry can't
 * inherit the tag of the vector it replaced — its new vector simply has none.
 *
 * An UNTAGGED entry is a miss, not trusted: a writer that didn't say which row
 * version its vector belongs to can't be vouched for. The cost of a miss is a
 * re-resolve from the row's stored embedding column (a DB read + parse, no
 * network); a re-embed only happens when the row has no usable stored vector.
 *
 * Dependency-free on purpose so `retain()` can tag its writes without pulling
 * in (or being mocked out with) the search module.
 */

import type { VaultEmbeddingCache } from "./searchTool";

interface RowVersion {
  readonly updatedAtMs: number;
  /** Undefined when the writer only knew `updatedAt` (projected miss-load). */
  contentHash?: number;
}

const vectorRowVersion = new WeakMap<Float32Array, RowVersion>();

/** 32-bit FNV-1a over UTF-16 code units. Not cryptographic — a change detector. */
function contentFingerprint(content: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * `cache.set`, tagging the vector with the row version it belongs to. An absent
 * or invalid `updatedAt` leaves it untagged (a miss on read). Pass `content`
 * whenever the plaintext is in hand; without it the entry can only be vouched
 * for on `updatedAt` until {@link rowVectorMatchesContent} checks it.
 */
export function cacheRowVector(
  cache: VaultEmbeddingCache,
  id: string,
  vec: Float32Array,
  updatedAt: Date | undefined,
  content?: string
): void {
  cache.set(id, vec);
  const updatedAtMs = updatedAt?.getTime();
  if (updatedAtMs === undefined || !Number.isFinite(updatedAtMs)) return;
  vectorRowVersion.set(vec, {
    updatedAtMs,
    ...(content !== undefined && { contentHash: contentFingerprint(content) }),
  });
}

/**
 * `cache.get` for the row version (`updatedAt`, and `content` when known).
 * Undefined — and the entry is evicted — when the entry is untagged, tagged
 * with a different `updatedAt`, or (when `content` is given) was not tagged
 * with this content. With no usable `updatedAt` the entry is returned as-is.
 */
export function cachedRowVector(
  cache: VaultEmbeddingCache,
  id: string,
  updatedAt: Date | undefined,
  content?: string
): Float32Array | undefined {
  const vec = cache.get(id);
  if (!vec) return undefined;
  const updatedAtMs = updatedAt?.getTime();
  if (updatedAtMs === undefined || !Number.isFinite(updatedAtMs)) return vec;
  const tag = vectorRowVersion.get(vec);
  if (
    !tag ||
    tag.updatedAtMs !== updatedAtMs ||
    (content !== undefined && !matchesContent(tag, content))
  ) {
    cache.delete(id);
    return undefined;
  }
  return vec;
}

/**
 * The content half of the check. A tag WITH a fingerprint must match it. A tag
 * without one was written by the projected miss-load, which read the vector
 * from the row's own stored column at this same `updatedAt` but had no
 * plaintext to hash; it adopts the content the first time a read sees it.
 *
 * That adoption is the one deliberate gap: a same-`updatedAt` rewrite synced in
 * between that vector load and the row's first decrypt would be adopted. The
 * alternative — re-reading the stored vector for every row the first time it
 * is admitted — costs up to one extra vector read per admitted row per search,
 * which breaks the projected path's "vectors are parsed once" budget. Closing
 * it for real needs a content-derived value on the key scan, or consolidation
 * bumping `updated_at` when it rewrites content.
 */
function matchesContent(tag: RowVersion, content: string): boolean {
  const hash = contentFingerprint(content);
  if (tag.contentHash === undefined) {
    tag.contentHash = hash;
    return true;
  }
  return tag.contentHash === hash;
}

/**
 * Whether `vec` is tagged for this content (see `matchesContent` for how a tag
 * without a fingerprint is treated). An untagged vector never matches. Used by
 * the projected path once it has decrypted a row.
 */
export function rowVectorMatchesContent(vec: Float32Array, content: string): boolean {
  const tag = vectorRowVersion.get(vec);
  return tag !== undefined && matchesContent(tag, content);
}
