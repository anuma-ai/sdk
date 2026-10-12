import type { Client } from "../../client/client";
import {
  postAuthOauthByProviderExchange,
  postAuthOauthByProviderRefresh,
  postAuthOauthByProviderRevoke,
} from "../../client/sdk.gen";
import {
  decryptDataWithKey,
  encryptDataWithKey,
  getEncryptionKey,
  hasEncryptionKey,
} from "../../react/useEncryption";
import { getLogger } from "../logger";
import { parsePlaintextToken, type PlaintextTokenRecord, readPlaintextToken } from "./tokenRows";

const PROVIDER = "google-drive";
const CODE_STORAGE_KEY = "google_drive_oauth_state";
const TOKEN_STORAGE_KEY = "oauth_token_google-drive-full";
const RETURN_URL_KEY = "google_drive_return_url";
const PENDING_MESSAGE_KEY = "google_drive_pending_message";

const ENCRYPTED_PREFIX = "enc:oauth:";

let cachedAccessToken: string | null = null;
let cachedExpiresAt: number | null = null;
let cachedRefreshToken: string | null = null;
let cachedScope: string | null = null;
let cachedWalletAddress: string | null = null;

interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}

function getTokenStorageKey(walletAddress?: string): string {
  if (walletAddress) {
    return `${TOKEN_STORAGE_KEY}:${walletAddress}`;
  }
  return TOKEN_STORAGE_KEY;
}

async function getStoredTokenData(walletAddress?: string): Promise<StoredTokenData | null> {
  if (typeof window === "undefined") return null;

  if (
    cachedAccessToken &&
    cachedWalletAddress === (walletAddress ?? null) &&
    (!cachedExpiresAt || cachedExpiresAt - 60000 > Date.now())
  ) {
    return {
      accessToken: cachedAccessToken,
      refreshToken: cachedRefreshToken ?? undefined,
      expiresAt: cachedExpiresAt ?? undefined,
      scope: cachedScope ?? undefined,
    };
  }
  if (cachedAccessToken) {
    cachedAccessToken = null;
    cachedExpiresAt = null;
    cachedRefreshToken = null;
    cachedScope = null;
    cachedWalletAddress = null;
  }

  try {
    const scopedStored = localStorage.getItem(getTokenStorageKey(walletAddress));
    if (
      scopedStored &&
      scopedStored.startsWith(ENCRYPTED_PREFIX) &&
      walletAddress &&
      hasEncryptionKey(walletAddress)
    ) {
      try {
        const encryptedData = scopedStored.slice(ENCRYPTED_PREFIX.length);
        const cryptoKey = await getEncryptionKey(walletAddress);
        const decryptedJson = await decryptDataWithKey(encryptedData, cryptoKey);
        const data = JSON.parse(decryptedJson) as StoredTokenData;
        if (!data.accessToken) return null;
        cachedAccessToken = data.accessToken;
        cachedExpiresAt = data.expiresAt ?? null;
        cachedRefreshToken = data.refreshToken ?? null;
        cachedScope = data.scope ?? null;
        cachedWalletAddress = walletAddress ?? null;
        return data;
      } catch (error) {
        getLogger().error("Failed to decrypt Drive OAuth token:", error);
      }
    }

    const plaintext = readPlaintextToken<StoredTokenData>(
      getTokenStorageKey(walletAddress),
      TOKEN_STORAGE_KEY,
      walletAddress
    );
    if (plaintext) {
      cachedAccessToken = plaintext.accessToken;
      cachedExpiresAt = plaintext.expiresAt ?? null;
      cachedRefreshToken = plaintext.refreshToken ?? null;
      cachedScope = plaintext.scope ?? null;
      cachedWalletAddress = walletAddress ?? null;
      return plaintext;
    }

    return null;
  } catch {
    return null;
  }
}

async function storeTokenData(data: StoredTokenData, walletAddress?: string): Promise<void> {
  if (typeof window === "undefined") return;

  cachedAccessToken = data.accessToken;
  cachedExpiresAt = data.expiresAt ?? null;
  cachedRefreshToken = data.refreshToken ?? null;
  cachedScope = data.scope ?? null;
  cachedWalletAddress = walletAddress ?? null;

  const json = JSON.stringify(data);

  if (walletAddress && hasEncryptionKey(walletAddress)) {
    try {
      const cryptoKey = await getEncryptionKey(walletAddress);
      const encrypted = await encryptDataWithKey(json, cryptoKey);
      localStorage.setItem(getTokenStorageKey(walletAddress), `${ENCRYPTED_PREFIX}${encrypted}`);
      sessionStorage.removeItem(getTokenStorageKey(walletAddress));
      return;
    } catch (error) {
      getLogger().warn("Failed to encrypt Drive OAuth token:", error);
    }
  }

  const record: PlaintextTokenRecord<StoredTokenData> = { wallet: walletAddress, token: data };
  sessionStorage.setItem(getTokenStorageKey(walletAddress), JSON.stringify(record));
}

/**
 * Clear stored token data
 */
export function clearDriveToken(walletAddress?: string): void {
  if (typeof window === "undefined") return;
  cachedAccessToken = null;
  cachedExpiresAt = null;
  cachedRefreshToken = null;
  cachedScope = null;
  cachedWalletAddress = null;
  localStorage.removeItem(getTokenStorageKey(walletAddress));
  if (walletAddress) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(getTokenStorageKey(walletAddress));
}

function isTokenExpired(data: StoredTokenData | null, bufferSeconds = 60): boolean {
  if (!data) return true;
  if (!data.expiresAt) return false;
  const now = Date.now();
  const bufferMs = bufferSeconds * 1000;
  return data.expiresAt - bufferMs <= now;
}

function tokenResponseToStoredData(
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

function getRedirectUri(callbackPath: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${callbackPath}`;
}

function getAndClearOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(CODE_STORAGE_KEY);
  sessionStorage.removeItem(CODE_STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed: unknown = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && "state" in parsed) {
      return (parsed as { state: string }).state;
    }
  } catch {
    // Not JSON, return as-is
  }
  return stored;
}

/**
 * Check if current URL is a Drive OAuth callback
 */
export function isDriveCallback(callbackPath: string): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem(CODE_STORAGE_KEY);
  return url.pathname === callbackPath && !!code && !!state && state === storedState;
}

/**
 * Handle the OAuth callback - exchange code for tokens via backend
 */
export async function handleDriveCallback(
  callbackPath: string,
  apiClient?: Client,
  walletAddress?: string
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = getAndClearOAuthState();

  if (!code || !state || state !== storedState) {
    throw new Error("Invalid OAuth state");
  }

  try {
    const response = await postAuthOauthByProviderExchange({
      client: apiClient,
      path: { provider: PROVIDER },
      body: {
        code,
        redirect_uri: getRedirectUri(callbackPath),
      },
    });

    if (!response.data?.access_token) {
      throw new Error("No access token in response");
    }

    const tokenData = tokenResponseToStoredData(
      response.data.access_token,
      response.data.expires_in,
      response.data.refresh_token,
      response.data.scope
    );
    await storeTokenData(tokenData, walletAddress);

    window.history.replaceState({}, "", window.location.pathname);

    return response.data.access_token;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    getLogger().error(`Drive OAuth callback error: ${errorMessage}`, error);
    throw error;
  }
}

/**
 * Refresh the access token using the stored refresh token
 */
export async function refreshDriveToken(
  apiClient?: Client,
  walletAddress?: string
): Promise<string | null> {
  const storedData = await getStoredTokenData(walletAddress);
  const refreshToken = storedData?.refreshToken;
  if (!refreshToken) return null;

  try {
    const response = await postAuthOauthByProviderRefresh({
      client: apiClient,
      path: { provider: PROVIDER },
      body: { refresh_token: refreshToken },
    });

    if (!response.data?.access_token) {
      throw new Error("No access token in refresh response");
    }

    const tokenData = tokenResponseToStoredData(
      response.data.access_token,
      response.data.expires_in,
      response.data.refresh_token ?? storedData?.refreshToken,
      response.data.scope ?? storedData?.scope
    );
    await storeTokenData(tokenData, walletAddress);

    return response.data.access_token;
  } catch (error) {
    getLogger().error("Drive token refresh failed", error);
    return null;
  }
}

/**
 * Revoke the OAuth token
 */
export async function revokeDriveToken(apiClient?: Client, walletAddress?: string): Promise<void> {
  const tokenData = await getStoredTokenData(walletAddress);
  if (!tokenData) return;

  try {
    const tokenToRevoke = tokenData.refreshToken ?? tokenData.accessToken;
    await postAuthOauthByProviderRevoke({
      client: apiClient,
      path: { provider: PROVIDER },
      body: { token: tokenToRevoke },
    });
  } catch {
    // Ignore errors on revocation
  } finally {
    clearDriveToken(walletAddress);
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getDriveAccessToken(
  apiClient?: Client,
  walletAddress?: string
): Promise<string | null> {
  const storedData = await getStoredTokenData(walletAddress);

  if (!storedData) {
    return null;
  }

  if (storedData.expiresAt && !isTokenExpired(storedData)) {
    return storedData.accessToken;
  }

  if (storedData.refreshToken) {
    const refreshedToken = await refreshDriveToken(apiClient, walletAddress);
    if (refreshedToken) {
      return refreshedToken;
    }
  }

  if (storedData.accessToken && !storedData.expiresAt) {
    return storedData.accessToken;
  }

  return null;
}

/**
 * Store the return URL for after OAuth completes
 */
export function storeDriveReturnUrl(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RETURN_URL_KEY, window.location.href);
}

/**
 * Get and clear the stored return URL
 */
export function getAndClearDriveReturnUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem(RETURN_URL_KEY);
  sessionStorage.removeItem(RETURN_URL_KEY);
  return url;
}

/**
 * Store a pending message to retry after OAuth completes
 */
export function storeDrivePendingMessage(message: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_MESSAGE_KEY, message);
}

/**
 * Get and clear the pending message
 */
export function getAndClearDrivePendingMessage(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(PENDING_MESSAGE_KEY);
  sessionStorage.removeItem(PENDING_MESSAGE_KEY);
  return message;
}

/**
 * Get stored token for Drive (async, supports encrypted storage)
 */
export async function getValidDriveToken(walletAddress?: string): Promise<string | null> {
  const data = await getStoredTokenData(walletAddress);
  if (!data) return null;
  if (data.expiresAt && isTokenExpired(data)) {
    return null;
  }
  return data.accessToken;
}

/**
 * Store Drive token data (for external use)
 */
export async function storeDriveToken(
  accessToken: string,
  expiresIn?: number,
  refreshToken?: string,
  scope?: string,
  walletAddress?: string
): Promise<void> {
  const tokenData = tokenResponseToStoredData(accessToken, expiresIn, refreshToken, scope);
  await storeTokenData(tokenData, walletAddress);
}

/**
 * Check if we have any stored credentials
 */
export async function hasDriveCredentials(walletAddress?: string): Promise<boolean> {
  const data = await getStoredTokenData(walletAddress);
  return !!(data?.accessToken || data?.refreshToken);
}

/**
 * Migrate unencrypted Drive tokens to encrypted storage.
 * Call this when a wallet address and encryption key become available
 * after the initial OAuth flow.
 *
 * @returns true if migration occurred, false otherwise
 */
export async function migrateDriveToken(walletAddress: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!walletAddress || !hasEncryptionKey(walletAddress)) return false;

  try {
    const scopedKey = getTokenStorageKey(walletAddress);
    const sources: { key: string; store: Storage }[] = [
      { key: scopedKey, store: sessionStorage },
      { key: scopedKey, store: localStorage },
      { key: TOKEN_STORAGE_KEY, store: sessionStorage },
      { key: TOKEN_STORAGE_KEY, store: localStorage },
    ];
    let used: { key: string; store: Storage } | null = null;
    let unencryptedJson = "";
    for (const source of sources) {
      const value = source.store.getItem(source.key);
      if (value && !value.startsWith(ENCRYPTED_PREFIX)) {
        unencryptedJson = value;
        used = source;
        break;
      }
    }
    if (!used) return false;

    const existingEncrypted = localStorage.getItem(scopedKey);
    if (existingEncrypted?.startsWith(ENCRYPTED_PREFIX)) {
      used.store.removeItem(used.key);
      return true;
    }

    const data = parsePlaintextToken<StoredTokenData>(unencryptedJson, walletAddress);
    if (!data) return false;
    await storeTokenData(data, walletAddress);

    const migrated = localStorage.getItem(scopedKey);
    if (!migrated?.startsWith(ENCRYPTED_PREFIX)) return false;

    if (used.store !== localStorage || used.key !== scopedKey) {
      used.store.removeItem(used.key);
    }
    return true;
  } catch {
    return false;
  }
}
