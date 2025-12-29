/**
 * OAuth Token Storage
 *
 * Unified storage for OAuth tokens with refresh token support.
 * Uses localStorage for persistent storage across sessions.
 * Supports optional encryption when wallet address is provided.
 */

import { encryptData, decryptData, hasEncryptionKey } from "../../../react/useEncryption";

export type OAuthProvider = "google-drive" | "dropbox";

export interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in milliseconds
  scope?: string;
}

const STORAGE_KEY_PREFIX = "oauth_token_";
const ENCRYPTION_PREFIX = "enc:";

/**
 * Get the storage key for a provider
 */
function getStorageKey(provider: OAuthProvider): string {
  return `${STORAGE_KEY_PREFIX}${provider}`;
}

/**
 * Check if a stored value is encrypted
 */
function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Get stored token data for a provider
 * @param provider - The OAuth provider
 * @param walletAddress - Optional wallet address for decryption
 * @returns Stored token data or null if not found
 */
export async function getStoredTokenData(
  provider: OAuthProvider,
  walletAddress?: string
): Promise<StoredTokenData | null> {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(getStorageKey(provider));
    if (!stored) return null;

    // Check if stored value is encrypted
    if (isEncrypted(stored)) {
      // Try to decrypt if wallet address is provided
      if (walletAddress && hasEncryptionKey(walletAddress)) {
        try {
          const encryptedPayload = stored.slice(ENCRYPTION_PREFIX.length);
          const decrypted = await decryptData(encryptedPayload, walletAddress);
          const data = JSON.parse(decrypted) as StoredTokenData;
          if (!data.accessToken) return null;
          return data;
        } catch {
          // Decryption failed - return null
          return null;
        }
      } else {
        // Encrypted but no wallet address or key - cannot decrypt
        return null;
      }
    } else {
      // Not encrypted - parse directly (backward compatibility)
      const data = JSON.parse(stored) as StoredTokenData;
      if (!data.accessToken) return null;
      return data;
    }
  } catch {
    return null;
  }
}

/**
 * Synchronous version for backward compatibility (returns null if encrypted)
 */
export function getStoredTokenDataSync(
  provider: OAuthProvider
): StoredTokenData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(getStorageKey(provider));
    if (!stored) return null;

    // If encrypted, cannot decrypt synchronously - return null
    if (isEncrypted(stored)) {
      return null;
    }

    const data = JSON.parse(stored) as StoredTokenData;
    if (!data.accessToken) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Store token data for a provider
 * @param provider - The OAuth provider
 * @param data - Token data to store
 * @param walletAddress - Optional wallet address for encryption
 */
export async function storeTokenData(
  provider: OAuthProvider,
  data: StoredTokenData,
  walletAddress?: string
): Promise<void> {
  if (typeof window === "undefined") return;

  const jsonData = JSON.stringify(data);

  // Encrypt if wallet address is provided and encryption key is available
  if (walletAddress && hasEncryptionKey(walletAddress)) {
    try {
      const encrypted = await encryptData(jsonData, walletAddress);
      localStorage.setItem(getStorageKey(provider), `${ENCRYPTION_PREFIX}${encrypted}`);
      return;
    } catch (error) {
      // Throw error to prevent sensitive data from being stored unencrypted
      const message =
        error instanceof Error ? error.message : "Unknown encryption error";
      throw new Error(`OAuth token encryption failed: ${message}`);
    }
  }

  // Store unencrypted (backward compatibility or encryption not available)
  localStorage.setItem(getStorageKey(provider), jsonData);
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
 * @param provider - The OAuth provider
 * @param walletAddress - Optional wallet address for decryption
 */
export async function getValidAccessToken(
  provider: OAuthProvider,
  walletAddress?: string
): Promise<string | null> {
  const data = await getStoredTokenData(provider, walletAddress);

  if (!data) return null;

  // If we have expiration info and token is expired, return null
  if (data.expiresAt && isTokenExpired(data)) {
    return null;
  }

  return data.accessToken;
}

/**
 * Synchronous version for backward compatibility (returns null if encrypted)
 */
export function getValidAccessTokenSync(provider: OAuthProvider): string | null {
  const data = getStoredTokenDataSync(provider);

  if (!data) return null;

  // If we have expiration info and token is expired, return null
  if (data.expiresAt && isTokenExpired(data)) {
    return null;
  }

  return data.accessToken;
}

/**
 * Get the refresh token for a provider
 * @param provider - The OAuth provider
 * @param walletAddress - Optional wallet address for decryption
 */
export async function getRefreshToken(
  provider: OAuthProvider,
  walletAddress?: string
): Promise<string | null> {
  const data = await getStoredTokenData(provider, walletAddress);
  return data?.refreshToken ?? null;
}

/**
 * Synchronous version for backward compatibility (returns null if encrypted)
 */
export function getRefreshTokenSync(provider: OAuthProvider): string | null {
  const data = getStoredTokenDataSync(provider);
  return data?.refreshToken ?? null;
}

/**
 * Check if credentials exist for a provider (works with encrypted or unencrypted data)
 * This is useful for UI logic that needs to know if credentials exist, even if encrypted
 * @param provider - The OAuth provider
 * @returns True if credentials exist (encrypted or not), false otherwise
 */
export function hasStoredCredentialsSync(provider: OAuthProvider): boolean {
  if (typeof window === "undefined") return false;

  const stored = localStorage.getItem(getStorageKey(provider));
  if (!stored) return false;

  // If encrypted, we can't decrypt synchronously, but we know credentials exist
  if (isEncrypted(stored)) {
    return true;
  }

  // If not encrypted, try to parse and check if it has valid data
  try {
    const data = JSON.parse(stored) as StoredTokenData;
    return !!(data?.accessToken || data?.refreshToken);
  } catch {
    return false;
  }
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
