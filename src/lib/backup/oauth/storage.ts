/**
 * OAuth Token Storage
 *
 * Unified storage for OAuth tokens with refresh token support.
 * Uses localStorage for persistent storage across sessions.
 */

export type OAuthProvider = "google-drive" | "dropbox";

export interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in milliseconds
  scope?: string;
}

const STORAGE_KEY_PREFIX = "oauth_token_";

/**
 * Get the storage key for a provider
 */
function getStorageKey(provider: OAuthProvider): string {
  return `${STORAGE_KEY_PREFIX}${provider}`;
}

/**
 * Get stored token data for a provider
 */
export function getStoredTokenData(
  provider: OAuthProvider
): StoredTokenData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(getStorageKey(provider));
    if (!stored) return null;

    const data = JSON.parse(stored) as StoredTokenData;

    // Validate that access token exists
    if (!data.accessToken) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Store token data for a provider
 */
export async function storeTokenData(
  provider: OAuthProvider,
  data: StoredTokenData
): Promise<void> {
  if (typeof window === "undefined") return;

  localStorage.setItem(getStorageKey(provider), JSON.stringify(data));
}

/**
 * Clear stored token data for a provider
 */
export function clearTokenData(provider: OAuthProvider): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(getStorageKey(provider));
}

/**
 * Check if the stored access token is expired or about to expire
 * Returns true if token is expired or will expire within the buffer time
 * Returns false if no expiration info is available (assume valid)
 */
export function isTokenExpired(
  data: StoredTokenData | null,
  bufferSeconds: number = 60
): boolean {
  if (!data) return true;

  // If no expiration info, assume token is valid (some providers don't return expiration)
  if (!data.expiresAt) return false;

  const now = Date.now();
  const bufferMs = bufferSeconds * 1000;

  return data.expiresAt - bufferMs <= now;
}

/**
 * Get the access token if it's valid and not expired
 */
export function getValidAccessToken(provider: OAuthProvider): string | null {
  const data = getStoredTokenData(provider);

  if (!data) return null;

  // If we have expiration info and token is expired, return null
  if (data.expiresAt && isTokenExpired(data)) {
    return null;
  }

  return data.accessToken;
}

/**
 * Get the refresh token for a provider
 */
export function getRefreshToken(provider: OAuthProvider): string | null {
  const data = getStoredTokenData(provider);
  return data?.refreshToken ?? null;
}

/**
 * Convert API response to StoredTokenData
 */
export function tokenResponseToStoredData(
  accessToken: string,
  expiresIn?: number,
  refreshToken?: string,
  scope?: string
): StoredTokenData {
  const data: StoredTokenData = {
    accessToken,
    refreshToken,
    scope,
  };

  if (expiresIn) {
    // Calculate expiration timestamp from expires_in seconds
    data.expiresAt = Date.now() + expiresIn * 1000;
  }

  return data;
}
