/**
 * OAuth Token Storage
 *
 * Unified storage for OAuth tokens with refresh token support.
 * Uses localStorage for persistent storage across sessions.
 * Supports encryption when wallet address is provided.
 */

import { encryptData, decryptData } from "../../../react/useEncryption";

export type OAuthProvider = "google-drive" | "dropbox";

export interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in milliseconds
  scope?: string;
}

/**
 * OAuth error types for better error handling
 */
export type OAuthErrorCode =
  | "network"
  | "encryption"
  | "csrf"
  | "invalid_response"
  | "unknown";

export interface OAuthError {
  code: OAuthErrorCode;
  message: string;
  originalError?: Error;
}

/**
 * Result type for OAuth operations
 */
export type OAuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: OAuthError };

const STORAGE_KEY_PREFIX = "oauth_token_";
const ENCRYPTED_PREFIX = "enc:oauth:";

/**
 * Get the storage key for a provider
 */
function getStorageKey(provider: OAuthProvider): string {
  return `${STORAGE_KEY_PREFIX}${provider}`;
}

/**
 * Get stored token data for a provider
 * Supports both encrypted and plaintext tokens (backwards compatibility)
 */
export async function getStoredTokenData(
  provider: OAuthProvider,
  walletAddress?: string
): Promise<StoredTokenData | null> {
  if (typeof window === "undefined") return null;

  try {
    const key = getStorageKey(provider);
    let stored = localStorage.getItem(key);
    
    // Check sessionStorage for temporary unencrypted tokens
    if (!stored) {
      stored = sessionStorage.getItem(key);
    }
    
    if (!stored) return null;

    // Check if token is encrypted
    if (stored.startsWith(ENCRYPTED_PREFIX)) {
      if (!walletAddress) {
        // Encrypted token but no wallet address - cannot decrypt
        console.warn(`Encrypted OAuth token found for ${provider} but no wallet address provided`);
        return null;
      }

      try {
        const encryptedData = stored.slice(ENCRYPTED_PREFIX.length);
        const decryptedJson = await decryptData(encryptedData, walletAddress);
        const data = JSON.parse(decryptedJson) as StoredTokenData;
        
        // Validate that access token exists
        if (!data.accessToken) return null;
        
        return data;
      } catch (error) {
        console.error(`Failed to decrypt OAuth token for ${provider}:`, error);
        return null;
      }
    }

    // Plaintext token (backwards compatibility)
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
 * Encrypts tokens if wallet address is provided, otherwise stores temporarily in sessionStorage
 */
export async function storeTokenData(
  provider: OAuthProvider,
  data: StoredTokenData,
  walletAddress?: string
): Promise<void> {
  if (typeof window === "undefined") return;

  const key = getStorageKey(provider);
  const json = JSON.stringify(data);

  if (walletAddress) {
    try {
      // Encrypt and store in localStorage
      const encrypted = await encryptData(json, walletAddress);
      localStorage.setItem(key, `${ENCRYPTED_PREFIX}${encrypted}`);
    } catch (error) {
      // If encryption fails, store temporarily in sessionStorage as fallback
      console.warn(`Failed to encrypt OAuth token for ${provider}, storing temporarily:`, error);
      sessionStorage.setItem(key, json);
      throw new Error(`OAuth token encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    // No wallet address - store temporarily in sessionStorage (cleared on page close)
    sessionStorage.setItem(key, json);
  }
}

/**
 * Clear stored token data for a provider
 */
export function clearTokenData(provider: OAuthProvider): void {
  if (typeof window === "undefined") return;

  const key = getStorageKey(provider);
  localStorage.removeItem(key);
  // Tokens may be stored temporarily in sessionStorage when walletAddress is missing
  // or when encryption fails; logout must clear both.
  sessionStorage.removeItem(key);
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
 * Get the refresh token for a provider
 */
export async function getRefreshToken(
  provider: OAuthProvider,
  walletAddress?: string
): Promise<string | null> {
  const data = await getStoredTokenData(provider, walletAddress);
  return data?.refreshToken ?? null;
}

/**
 * Migrate unencrypted tokens to encrypted format
 * Call this when wallet address becomes available after initial OAuth callback
 */
export async function migrateUnencryptedTokens(
  provider: OAuthProvider,
  walletAddress: string
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const key = getStorageKey(provider);
    
    // Check for unencrypted token in localStorage
    const stored = localStorage.getItem(key);
    if (!stored || stored.startsWith(ENCRYPTED_PREFIX)) {
      // Already encrypted or doesn't exist
      return false;
    }

    // Check for temporary token in sessionStorage
    const tempStored = sessionStorage.getItem(key);
    const tokenToMigrate = tempStored || stored;

    if (!tokenToMigrate) {
      return false;
    }

    try {
      const data = JSON.parse(tokenToMigrate) as StoredTokenData;
      
      // Encrypt and store in localStorage
      await storeTokenData(provider, data, walletAddress);
      
      // Clear temporary storage if it was there
      if (tempStored) {
        sessionStorage.removeItem(key);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to migrate unencrypted token for ${provider}:`, error);
      return false;
    }
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
