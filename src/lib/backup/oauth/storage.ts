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
const SESSION_KEY_STORAGE_KEY = "oauth_session_encryption_key";

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
 * Generate or retrieve a session-based temporary encryption key
 * This key is stored in sessionStorage and used to encrypt tokens when wallet address is not available
 */
async function getOrCreateSessionKey(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Session key generation requires browser environment");
  }

  // Check if session key already exists in sessionStorage
  let sessionKey = sessionStorage.getItem(SESSION_KEY_STORAGE_KEY);
  
  if (sessionKey) {
    return sessionKey;
  }

  // Generate a new random 32-byte key
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  sessionKey = Array.from(keyBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Store in sessionStorage (cleared when tab closes)
  sessionStorage.setItem(SESSION_KEY_STORAGE_KEY, sessionKey);
  
  return sessionKey;
}

/**
 * Encrypt data using a session-based temporary key
 */
async function encryptWithSessionKey(plaintext: string): Promise<string> {
  const sessionKeyHex = await getOrCreateSessionKey();
  const keyBytes = hexToBytes(sessionKeyHex);
  
  // Import key for AES-GCM
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextBytes.buffer as ArrayBuffer
  );

  // Combine IV + encrypted data
  const encryptedBytes = new Uint8Array(encryptedData);
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv, 0);
  combined.set(encryptedBytes, iv.length);

  // Return as hex string
  return Array.from(combined)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Decrypt data using a session-based temporary key
 */
async function decryptWithSessionKey(encryptedHex: string): Promise<string> {
  const sessionKeyHex = sessionStorage.getItem(SESSION_KEY_STORAGE_KEY);
  if (!sessionKeyHex) {
    throw new Error("Session key not found");
  }

  const keyBytes = hexToBytes(sessionKeyHex);
  
  // Import key
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  // Extract IV and encrypted data
  const combined = hexToBytes(encryptedHex);
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  // Decrypt
  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  );

  return new TextDecoder().decode(decryptedData);
}

/**
 * Helper to convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Re-encrypt unencrypted or session-encrypted tokens for all providers when wallet address becomes available
 * @param walletAddress - Wallet address for encryption
 */
export async function reEncryptUnencryptedTokens(
  walletAddress: string
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!hasEncryptionKey(walletAddress)) return;

  const providers: OAuthProvider[] = ["google-drive", "dropbox"];
  
  for (const provider of providers) {
    try {
      const stored = localStorage.getItem(getStorageKey(provider));
      if (!stored) continue;

      // Re-encrypt if:
      // 1. Not encrypted (plaintext - backward compatibility)
      // 2. Encrypted with session key (upgrade to wallet encryption)
      if (!isEncrypted(stored)) {
        // Plaintext token - re-encrypt with wallet key
        try {
          const data = JSON.parse(stored) as StoredTokenData;
          if (data.accessToken) {
            await storeTokenData(provider, data, walletAddress);
          }
        } catch {
          // Invalid data - skip
          continue;
        }
      } else {
        // Encrypted - check if it's session-encrypted (try to decrypt with session key)
        const encryptedPayload = stored.slice(ENCRYPTION_PREFIX.length);
        try {
          // Try to decrypt with session key
          const decrypted = await decryptWithSessionKey(encryptedPayload);
          const data = JSON.parse(decrypted) as StoredTokenData;
          if (data.accessToken) {
            // Re-encrypt with wallet key
            await storeTokenData(provider, data, walletAddress);
          }
        } catch {
          // Not session-encrypted or already wallet-encrypted - skip
          continue;
        }
      }
    } catch {
      // Error re-encrypting - continue with other providers
      continue;
    }
  }
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
      const encryptedPayload = stored.slice(ENCRYPTION_PREFIX.length);
      
      // Try to decrypt with wallet key if available
      if (walletAddress && hasEncryptionKey(walletAddress)) {
        try {
          const decrypted = await decryptData(encryptedPayload, walletAddress);
          const data = JSON.parse(decrypted) as StoredTokenData;
          if (!data.accessToken) return null;
          return data;
        } catch {
          // Wallet decryption failed - might be session-encrypted, try that next
        }
      }
      
      // Try to decrypt with session key (for tokens encrypted without wallet address)
      try {
        const decrypted = await decryptWithSessionKey(encryptedPayload);
        const data = JSON.parse(decrypted) as StoredTokenData;
        if (!data.accessToken) return null;
        
        // If wallet address is available, re-encrypt with wallet key
        if (walletAddress && hasEncryptionKey(walletAddress)) {
          try {
            await storeTokenData(provider, data, walletAddress);
          } catch {
            // Re-encryption failed - still return data but log error
            // eslint-disable-next-line no-console
            console.error(`Failed to re-encrypt OAuth token for ${provider}`);
          }
        }
        
        return data;
      } catch {
        // Both decryption methods failed
        return null;
      }
    } else {
      // Not encrypted - parse directly (backward compatibility for old unencrypted tokens)
      try {
        const data = JSON.parse(stored) as StoredTokenData;
        if (!data.accessToken) return null;
        
        // If wallet address is available, automatically re-encrypt
        if (walletAddress && hasEncryptionKey(walletAddress)) {
          try {
            await storeTokenData(provider, data, walletAddress);
          } catch {
            // Re-encryption failed - still return data but log error
            // eslint-disable-next-line no-console
            console.error(`Failed to re-encrypt OAuth token for ${provider}`);
          }
        } else {
          // No wallet address - encrypt with session key to prevent XSS
          try {
            await storeTokenData(provider, data);
          } catch {
            // Encryption failed - still return data but log error
            // eslint-disable-next-line no-console
            console.error(`Failed to encrypt OAuth token for ${provider}`);
          }
        }
        
        return data;
      } catch {
        return null;
      }
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

  // If wallet address not available, encrypt with session key to prevent XSS attacks
  // Session key is stored in sessionStorage and cleared when tab closes
  // This ensures tokens are always encrypted, even when wallet address is not available
  try {
    const encrypted = await encryptWithSessionKey(jsonData);
    localStorage.setItem(getStorageKey(provider), `${ENCRYPTION_PREFIX}${encrypted}`);
  } catch (error) {
    // If session encryption fails, check if sessionStorage is truly unavailable
    // (not just an encryption error). If sessionStorage is unavailable, allow
    // unencrypted storage which will be re-encrypted when wallet address becomes available.
    // This handles edge cases in test environments where sessionStorage might not work properly.
    const sessionStorageAvailable = typeof window !== "undefined" && 
      typeof window.sessionStorage !== "undefined" &&
      typeof window.sessionStorage.getItem === "function" &&
      typeof window.sessionStorage.setItem === "function";
    
    if (!sessionStorageAvailable) {
      // SessionStorage truly unavailable - store unencrypted (will be re-encrypted later)
      localStorage.setItem(getStorageKey(provider), jsonData);
    } else {
      // SessionStorage available but encryption failed - this is an error
      const message =
        error instanceof Error ? error.message : "Unknown encryption error";
      throw new Error(`OAuth token encryption failed: ${message}`);
    }
  }
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
