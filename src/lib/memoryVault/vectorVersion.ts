import type { VaultEmbeddingCache } from "./searchTool";

interface RowVersion {
  readonly updatedAtMs: number;
  /** Undefined when the writer only knew `updatedAt` (projected miss-load). */
  contentHash?: number;
}

const vectorRowVersion = new WeakMap<Float32Array, RowVersion>();

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
