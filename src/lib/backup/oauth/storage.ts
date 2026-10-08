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
  expiresAt?: number;
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

function getStorageKey(provider: OAuthProvider, walletAddress?: string): string {
  const base = `${STORAGE_KEY_PREFIX}${provider}`;
  return walletAddress ? `${base}:${walletAddress}` : base;
}

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
    const scopedKey = getStorageKey(provider, walletAddress);
    const legacyKey = getStorageKey(provider);
    const keys = scopedKey === legacyKey ? [legacyKey] : [scopedKey, legacyKey];
    for (const row of readRawRows(keys)) {
      const data = await readTokenRow(row.raw, provider, walletAddress);
      if (!data) continue;
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

async function readTokenRow(
  stored: string,
  provider: OAuthProvider,
  walletAddress?: string
): Promise<StoredTokenData | null> {
  if (stored.startsWith(ENCRYPTED_PREFIX)) {
    if (!walletAddress) {
      getLogger().warn(
        `Encrypted OAuth token found for ${provider} but no wallet address provided`
      );
      return null;
    }

    try {
      const encryptedData = stored.slice(ENCRYPTED_PREFIX.length);
      let decryptedJson: string;
      try {
        decryptedJson = await decryptData(encryptedData, walletAddress);
      } catch {
        decryptedJson = await decryptData(encryptedData, walletAddress, "v2");
      }
      const data = JSON.parse(decryptedJson) as StoredTokenData;

      if (!data.accessToken) return null;

      return data;
    } catch (error) {
      getLogger().error(`Failed to decrypt OAuth token for ${provider}:`, error);
      return null;
    }
  }

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
      const encrypted = await encryptData(json, walletAddress);
      localStorage.setItem(key, `${ENCRYPTED_PREFIX}${encrypted}`);
      sessionStorage.removeItem(key);
    } catch (error) {
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
    sessionStorage.removeItem(key);
  }
}

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
    const scopedKey = getStorageKey(provider, walletAddress);
    const legacyKey = getStorageKey(provider);
    const keys = [scopedKey, legacyKey];

    const isEncrypted = (value: string | null): boolean =>
      !!value && value.startsWith(ENCRYPTED_PREFIX);
    const plaintextAt = (key: string): string | null => {
      const stored = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      return stored && !isEncrypted(stored) ? stored : null;
    };

    let tokenToMigrate: string | null = null;
    for (const key of keys) {
      const value = plaintextAt(key);
      if (value) {
        tokenToMigrate = value;
        break;
      }
    }

    if (!tokenToMigrate) {
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

      await storeTokenData(provider, data, walletAddress);

      for (const key of keys) {
        if (plaintextAt(key)) sessionStorage.removeItem(key);
        if (key === legacyKey && !isEncrypted(localStorage.getItem(key))) {
          localStorage.removeItem(key);
        }
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
    data.expiresAt = Date.now() + expiresIn * 1000;
  }

  return data;
}
