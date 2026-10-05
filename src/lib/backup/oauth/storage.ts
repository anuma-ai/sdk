/**
 * OAuth Token Storage
 *
 * Unified storage for OAuth tokens with refresh token support.
 * Uses localStorage for persistent storage across sessions.
 * Supports encryption when wallet address is provided.
 */

import { decryptData, encryptData } from "../../../react/useEncryption";
import {
  parsePlaintextToken,
  type PlaintextTokenRecord,
  promoteUnscopedRow,
} from "../../auth/tokenRows";
import { getLogger } from "../../logger";

type OAuthProvider = "google-drive" | "dropbox";

export interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in milliseconds
  scope?: string;
}

/**
 * OAuth error types for better error handling
 */
type OAuthErrorCode = "network" | "encryption" | "csrf" | "invalid_response" | "unknown";

export interface OAuthError {
  code: OAuthErrorCode;
  message: string;
  originalError?: Error;
}

/**
 * Result type for OAuth operations
 */
export type OAuthResult<T> = { ok: true; data: T } | { ok: false; error: OAuthError };

const STORAGE_KEY_PREFIX = "oauth_token_";
const ENCRYPTED_PREFIX = "enc:oauth:";

/**
 * Get the storage key for a provider
 */
function getStorageKey(provider: OAuthProvider, walletAddress?: string): string {
  const base = `${STORAGE_KEY_PREFIX}${provider}`;
  return walletAddress ? `${base}:${walletAddress}` : base;
}

/**
 * List the rows under the given keys, in order.
 * One key can hold a row in either storage, so check both per key.
 */
function readRawRows(keys: string[]): { raw: string; key: string; store: Storage }[] {
  const rows: { raw: string; key: string; store: Storage }[] = [];
  for (const key of keys) {
    for (const store of [localStorage, sessionStorage]) {
      const raw = store.getItem(key);
      if (raw) rows.push({ raw, key, store });
    }
  }
  return rows;
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
    // The wallet-scoped key first, then the legacy unscoped key that older
    // builds wrote. Each key may hold its row in either storage.
    const scopedKey = getStorageKey(provider, walletAddress);
    const legacyKey = getStorageKey(provider);
    const keys = scopedKey === legacyKey ? [legacyKey] : [scopedKey, legacyKey];
    for (const row of readRawRows(keys)) {
      const data = await readTokenRow(row.raw, provider, walletAddress);
      if (!data) continue;
      // Move one legacy row onto the wallet's own key and drop the unscoped
      // key, so a later read for another wallet cannot claim the same token.
      if (walletAddress && row.key === legacyKey) {
        promoteUnscopedRow(row.raw, data, row.store, scopedKey, legacyKey, walletAddress);
      }
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Read one stored row: decrypt it when it carries the encrypted prefix,
 * otherwise parse it as a plain text row.
 */
async function readTokenRow(
  stored: string,
  provider: OAuthProvider,
  walletAddress?: string
): Promise<StoredTokenData | null> {
  // Check if token is encrypted
  if (stored.startsWith(ENCRYPTED_PREFIX)) {
    if (!walletAddress) {
      // Encrypted token but no wallet address - cannot decrypt
      getLogger().warn(
        `Encrypted OAuth token found for ${provider} but no wallet address provided`
      );
      return null;
    }

    try {
      const encryptedData = stored.slice(ENCRYPTED_PREFIX.length);
      let decryptedJson: string;
      try {
        // Try with current HKDF key (v3)
        decryptedJson = await decryptData(encryptedData, walletAddress);
      } catch {
        // Fall back to legacy SHA-256 key (v2) for tokens encrypted before migration
        decryptedJson = await decryptData(encryptedData, walletAddress, "v2");
      }
      const data = JSON.parse(decryptedJson) as StoredTokenData;

      // Validate that access token exists
      if (!data.accessToken) return null;

      return data;
    } catch (error) {
      getLogger().error(`Failed to decrypt OAuth token for ${provider}:`, error);
      return null;
    }
  }

  // Plain text row (backwards compatibility). A row that carries a wallet
  // field is accepted only for that wallet.
  return parsePlaintextToken<StoredTokenData>(stored, walletAddress);
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

  const key = getStorageKey(provider, walletAddress);
  const json = JSON.stringify(data);
  const plaintextRecord = JSON.stringify({
    wallet: walletAddress,
    token: data,
  } as PlaintextTokenRecord<StoredTokenData>);

  if (walletAddress) {
    try {
      // Encrypt and store in localStorage
      const encrypted = await encryptData(json, walletAddress);
      localStorage.setItem(key, `${ENCRYPTED_PREFIX}${encrypted}`);
      // The encrypted row is now the only row for this key, so a read cannot
      // fall back to an older plain text value.
      sessionStorage.removeItem(key);
    } catch (error) {
      // If encryption fails, store temporarily in sessionStorage as fallback
      getLogger().warn(
        `Failed to encrypt OAuth token for ${provider}, storing temporarily:`,
        error
      );
      sessionStorage.setItem(key, plaintextRecord);
      // eslint-disable-next-line preserve-caught-error -- ES2020 target doesn't support ErrorOptions
      throw new Error(
        `OAuth token encryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    // No wallet address - store temporarily in sessionStorage (cleared on page close)
    sessionStorage.setItem(key, plaintextRecord);
  }
}

/**
 * Clear stored token data for a provider
 */
export function clearTokenData(provider: OAuthProvider, walletAddress?: string): void {
  if (typeof window === "undefined") return;

  const base = getStorageKey(provider);
  const keys = walletAddress ? [getStorageKey(provider, walletAddress), base] : [base];
  if (!walletAddress) keys.push(...suffixedKeys(base));
  for (const key of keys) {
    localStorage.removeItem(key);
    // Tokens may be stored temporarily in sessionStorage when walletAddress is
    // missing or when encryption fails; logout must clear both.
    sessionStorage.removeItem(key);
  }
}

/**
 * List the wallet-suffixed variants of one key across both storages.
 * Used when a clear call has no wallet address in hand.
 */
function suffixedKeys(base: string): string[] {
  const found: string[] = [];
  for (const storage of [localStorage, sessionStorage]) {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(`${base}:`) && !found.includes(key)) found.push(key);
    }
  }
  return found;
}

/**
 * Check if the stored access token is expired or about to expire
 * Returns true if token is expired or will expire within the buffer time
 * Returns false if no expiration info is available (assume valid)
 */
export function isTokenExpired(data: StoredTokenData | null, bufferSeconds: number = 60): boolean {
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
    // The wallet-scoped key first, then the legacy unscoped key that older
    // builds wrote. Each key may hold its row in either storage.
    const scopedKey = getStorageKey(provider, walletAddress);
    const legacyKey = getStorageKey(provider);
    const keys = [scopedKey, legacyKey];

    const isEncrypted = (value: string | null): boolean =>
      !!value && value.startsWith(ENCRYPTED_PREFIX);
    const plaintextAt = (key: string): string | null => {
      const stored = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      return stored && !isEncrypted(stored) ? stored : null;
    };

    // Prefer sessionStorage rows: that is where tokens land when no wallet is
    // available at the initial OAuth callback.
    let tokenToMigrate: string | null = null;
    for (const key of keys) {
      const value = plaintextAt(key);
      if (value) {
        tokenToMigrate = value;
        break;
      }
    }

    if (!tokenToMigrate) {
      // Nothing to migrate. If we already have an encrypted token in localStorage,
      // clear any leftover plaintext token in sessionStorage.
      for (const key of keys) {
        const stored = sessionStorage.getItem(key);
        if (isEncrypted(localStorage.getItem(key)) && stored && !isEncrypted(stored)) {
          sessionStorage.removeItem(key);
        }
      }
      return false;
    }

    try {
      const data = parsePlaintextToken(tokenToMigrate, walletAddress);
      if (!data) return false;

      // Encrypt and store in localStorage under the wallet-scoped key
      await storeTokenData(provider, data, walletAddress);

      // Drop the rows the fresh copy replaced: the plaintext rows and the
      // legacy unscoped row, so one row per wallet remains.
      for (const key of keys) {
        if (plaintextAt(key)) sessionStorage.removeItem(key);
        if (key === legacyKey) localStorage.removeItem(key);
      }

      return true;
    } catch (error) {
      getLogger().error(`Failed to migrate unencrypted token for ${provider}:`, error);
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
