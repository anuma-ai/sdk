/**
 * Utilities for detecting expired R2 presigned URLs.
 *
 * R2/S3 presigned URLs include `X-Amz-Date` and `X-Amz-Expires` query params
 * that define the exact validity window. When those params are missing or
 * unparseable we fall back to a 7-day heuristic based on `createdAt`.
 */

/** Default TTL for R2 presigned URLs (7 days). */
export const R2_DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function parseAmzDate(raw: string): Date | null {
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Returns `true` if the given R2 presigned URL is expired.
 *
 * **Primary**: Parses `X-Amz-Date` + `X-Amz-Expires` query params to compute
 * the exact expiry timestamp.
 *
 * **Fallback**: If URL parsing fails, checks `createdAt + R2_DEFAULT_TTL_MS`.
 *
 * If neither method can determine expiry, returns `false` (assume valid).
 */
export function isR2UrlExpired(sourceUrl: string, createdAt?: string | number | Date): boolean {
  try {
    const url = new URL(sourceUrl);
    const amzDate = url.searchParams.get("X-Amz-Date");
    const amzExpires = url.searchParams.get("X-Amz-Expires");

    if (amzDate !== null && amzExpires !== null) {
      const signedAt = parseAmzDate(amzDate);
      const ttlSeconds = parseInt(amzExpires, 10);

      if (signedAt !== null && !isNaN(ttlSeconds)) {
        const expiresAt = signedAt.getTime() + ttlSeconds * 1000;
        return Date.now() >= expiresAt;
      }
    }
  } catch {
    // URL parsing failed — fall through to createdAt heuristic
  }

  if (createdAt !== undefined && createdAt !== null) {
    const created = new Date(createdAt).getTime();
    if (!isNaN(created)) {
      return Date.now() >= created + R2_DEFAULT_TTL_MS;
    }
  }

  return false;
}
