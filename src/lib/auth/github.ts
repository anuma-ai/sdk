/**
 * GitHub OAuth 2.0 Authorization Code Flow — **LEGACY (v1) MODULE**.
 *
 * As of the connector-vault rollout (`.claude-docs/connecters/DESIGN.md`),
 * GitHub tokens are stored server-side on the portal. New code obtains a
 * GitHub access token via:
 *
 * ```ts
 * import { createConnectorTokenGetter } from "@anuma/sdk/tools";
 * const getToken = createConnectorTokenGetter(portalClient, "github");
 * ```
 *
 * The functions in this file remain published with their original
 * signatures so existing consumers keep compiling and the legacy
 * `/auth/oauth/github/{exchange,refresh,revoke}` portal endpoints keep
 * working through the transition window. GitHub migrates silently per
 * the design (1:1 mapping, no rotation). Each export is annotated
 * `@deprecated` with the recommended replacement.
 *
 * TODO(connector-vault): once consumers migrate and the legacy endpoints
 * sunset (PR 4 in the plan), collapse this module to a thin re-export
 * over `createConnectorTokenGetter`.
 */

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

// Use github provider for backend API calls
const PROVIDER = "github";
const CODE_STORAGE_KEY = "github_oauth_state";
const TOKEN_STORAGE_KEY = "oauth_token_github";
const RETURN_URL_KEY = "github_return_url";
const PENDING_MESSAGE_KEY = "github_pending_message";

// Encrypted storage prefix
const ENCRYPTED_PREFIX = "enc:oauth:";

// In-memory cache for decrypted tokens (avoids decrypting on every call)
let cachedAccessToken: string | null = null;
let cachedExpiresAt: number | null = null;
let cachedRefreshToken: string | null = null;
let cachedScope: string | null = null;
let cachedWalletAddress: string | null = null;

// GitHub OAuth endpoints
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";

// GitHub OAuth scopes - repo for full repository access
const GITHUB_SCOPES = "repo";

// Token storage types
interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}

/**
 * Get wallet-scoped storage key
 */
function getTokenStorageKey(walletAddress?: string): string {
  if (walletAddress) {
    return `${TOKEN_STORAGE_KEY}:${walletAddress}`;
  }
  return TOKEN_STORAGE_KEY;
}

/**
 * Get stored token data with encryption support.
 *
 * Lookup order:
 * 1. Encrypted localStorage (wallet-scoped key)
 * 2. Plain text row under the wallet-scoped key, then the legacy unscoped key
 *    that older builds wrote (pre-encryption users)
 */
async function getStoredTokenData(walletAddress?: string): Promise<StoredTokenData | null> {
  if (typeof window === "undefined") return null;

  // Check in-memory cache first (avoids decryption on every call)
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
  // Invalidate stale cache
  if (cachedAccessToken) {
    cachedAccessToken = null;
    cachedExpiresAt = null;
    cachedRefreshToken = null;
    cachedScope = null;
    cachedWalletAddress = null;
  }

  try {
    // 1. Try encrypted localStorage first (wallet-scoped key)
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
        // Populate cache
        cachedAccessToken = data.accessToken;
        cachedExpiresAt = data.expiresAt ?? null;
        cachedRefreshToken = data.refreshToken ?? null;
        cachedScope = data.scope ?? null;
        cachedWalletAddress = walletAddress ?? null;
        return data;
      } catch (error) {
        getLogger().error("Failed to decrypt GitHub OAuth token:", error);
        // Fall through to legacy lookups
      }
    }

    // 2. Plain text rows. The wallet-scoped key comes first, then the legacy
    //    unscoped key that older builds wrote. A row with a wallet field is
    //    accepted only for that wallet.
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

/**
 * Store token data for one wallet.
 * When the encryption key is ready, write the encrypted row to this wallet's
 * key in localStorage and drop the plain text row under the same key.
 * Otherwise write one plain text row to sessionStorage, so the token survives
 * the OAuth redirect before the key exists.
 */
async function storeTokenData(data: StoredTokenData, walletAddress?: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Update in-memory cache
  cachedAccessToken = data.accessToken;
  cachedExpiresAt = data.expiresAt ?? null;
  cachedRefreshToken = data.refreshToken ?? null;
  cachedScope = data.scope ?? null;
  cachedWalletAddress = walletAddress ?? null;

  const json = JSON.stringify(data);

  // Encrypt to the wallet-scoped key in localStorage when the key is ready
  if (walletAddress && hasEncryptionKey(walletAddress)) {
    try {
      const cryptoKey = await getEncryptionKey(walletAddress);
      const encrypted = await encryptDataWithKey(json, cryptoKey);
      localStorage.setItem(getTokenStorageKey(walletAddress), `${ENCRYPTED_PREFIX}${encrypted}`);
      // The encrypted row is now the only row for this key, so a read cannot
      // fall back to an older plain text value.
      sessionStorage.removeItem(getTokenStorageKey(walletAddress));
      return;
    } catch (error) {
      getLogger().warn("Failed to encrypt GitHub OAuth token:", error);
    }
  }

  // Fallback: write one plain text row under this wallet's key. The row keeps
  // its owner, so a read for another wallet cannot pick it up.
  const record: PlaintextTokenRecord<StoredTokenData> = { wallet: walletAddress, token: data };
  sessionStorage.setItem(getTokenStorageKey(walletAddress), JSON.stringify(record));
}

/**
 * Clear stored token data
 */
export function clearGithubToken(walletAddress?: string): void {
  if (typeof window === "undefined") return;
  // Clear in-memory cache
  cachedAccessToken = null;
  cachedExpiresAt = null;
  cachedRefreshToken = null;
  cachedScope = null;
  cachedWalletAddress = null;
  localStorage.removeItem(getTokenStorageKey(walletAddress));
  // Also clear legacy unscoped key if different
  if (walletAddress) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(getTokenStorageKey(walletAddress));
}

/**
 * Check if the stored access token is expired
 */
function isTokenExpired(data: StoredTokenData | null, bufferSeconds = 60): boolean {
  if (!data) return true;
  // GitHub tokens may not expire — treat as valid when no expiry set
  if (!data.expiresAt) return false;
  const now = Date.now();
  const bufferMs = bufferSeconds * 1000;
  return data.expiresAt - bufferMs <= now;
}

/**
 * Convert API response to StoredTokenData
 */
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

/**
 * Get the redirect URI for OAuth callback
 */
function getRedirectUri(callbackPath: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${callbackPath}`;
}

/**
 * Generate a random state for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Store OAuth state for validation
 */
function storeOAuthState(state: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CODE_STORAGE_KEY, state);
}

/**
 * Get and clear stored OAuth state
 */
function getAndClearOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(CODE_STORAGE_KEY);
  sessionStorage.removeItem(CODE_STORAGE_KEY);
  if (!stored) return null;

  // Handle both JSON format and plain string format
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
 * Check if current URL is a GitHub OAuth callback
 */
export function isGithubCallback(callbackPath: string): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem(CODE_STORAGE_KEY);
  // Check if this callback is for GitHub (has our state stored)
  return url.pathname === callbackPath && !!code && !!state && state === storedState;
}

/**
 * Handle the OAuth callback - exchange code for tokens via backend
 */
export async function handleGithubCallback(
  callbackPath: string,
  apiClient?: Client,
  walletAddress?: string
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = getAndClearOAuthState();

  // Validate state to prevent CSRF
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

    // Store tokens
    const tokenData = tokenResponseToStoredData(
      response.data.access_token,
      response.data.expires_in,
      response.data.refresh_token,
      response.data.scope
    );
    await storeTokenData(tokenData, walletAddress);

    // Clean up URL
    window.history.replaceState({}, "", window.location.pathname);

    return response.data.access_token;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    getLogger().error(`GitHub OAuth callback error: ${errorMessage}`, error);
    throw error;
  }
}

/**
 * Refresh the access token using the stored refresh token.
 * Note: GitHub OAuth tokens may not have refresh tokens (non-expiring tokens).
 */
export async function refreshGithubToken(
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

    // Update stored tokens
    const tokenData = tokenResponseToStoredData(
      response.data.access_token,
      response.data.expires_in,
      response.data.refresh_token ?? storedData?.refreshToken,
      response.data.scope ?? storedData?.scope
    );
    await storeTokenData(tokenData, walletAddress);

    return response.data.access_token;
  } catch (error) {
    // Don't clear token on transient errors (network, server) — only return null
    // so the caller can retry later. The token + refresh token stay in storage.
    getLogger().error("GitHub token refresh failed", error);
    return null;
  }
}

/**
 * Revoke the OAuth token
 */
export async function revokeGithubToken(apiClient?: Client, walletAddress?: string): Promise<void> {
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
    clearGithubToken(walletAddress);
  }
}

/**
 * Get a valid access token, refreshing if necessary.
 * GitHub tokens may not expire — if no expiry is set, the stored token
 * is returned directly without attempting a refresh.
 */
export async function getGithubAccessToken(
  apiClient?: Client,
  walletAddress?: string
): Promise<string | null> {
  const storedData = await getStoredTokenData(walletAddress);

  if (!storedData) {
    return null;
  }

  // Non-expiring tokens (standard GitHub OAuth) — return directly, no refresh needed
  if (storedData.accessToken && !storedData.expiresAt) {
    return storedData.accessToken;
  }

  // Expiring token that's still valid — use it
  if (storedData.expiresAt && !isTokenExpired(storedData)) {
    return storedData.accessToken;
  }

  // Expired — try to refresh
  if (storedData.refreshToken) {
    const refreshedToken = await refreshGithubToken(apiClient, walletAddress);
    if (refreshedToken) {
      return refreshedToken;
    }
  }

  return null;
}

/**
 * Store the return URL for after OAuth completes
 */
export function storeGithubReturnUrl(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RETURN_URL_KEY, window.location.href);
}

/**
 * Get and clear the stored return URL
 */
export function getAndClearGithubReturnUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem(RETURN_URL_KEY);
  sessionStorage.removeItem(RETURN_URL_KEY);
  return url;
}

/**
 * Store a pending message to retry after OAuth completes
 */
export function storeGithubPendingMessage(message: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_MESSAGE_KEY, message);
}

/**
 * Get and clear the pending message
 */
export function getAndClearGithubPendingMessage(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(PENDING_MESSAGE_KEY);
  sessionStorage.removeItem(PENDING_MESSAGE_KEY);
  return message;
}

/**
 * Start the OAuth flow - redirects to GitHub
 */
export async function startGithubAuth(clientId: string, callbackPath: string): Promise<never> {
  if (typeof window === "undefined") {
    return new Promise(() => {});
  }

  const state = generateState();
  storeOAuthState(state);
  storeGithubReturnUrl();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(callbackPath),
    scope: GITHUB_SCOPES,
    state,
  });

  window.location.href = `${GITHUB_AUTH_URL}?${params.toString()}`;

  return new Promise(() => {});
}

/**
 * Get stored token for GitHub (async, supports encrypted storage)
 */
export async function getValidGithubToken(walletAddress?: string): Promise<string | null> {
  const data = await getStoredTokenData(walletAddress);
  if (!data) return null;
  if (data.expiresAt && isTokenExpired(data)) {
    return null;
  }
  return data.accessToken;
}

/**
 * Store GitHub token data (for external use)
 */
export async function storeGithubToken(
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
export async function hasGithubCredentials(walletAddress?: string): Promise<boolean> {
  const data = await getStoredTokenData(walletAddress);
  return !!(data?.accessToken || data?.refreshToken);
}

/**
 * Migrate unencrypted GitHub tokens to encrypted storage.
 * Call this when a wallet address and encryption key become available
 * after the initial OAuth flow.
 *
 * @returns true if migration occurred, false otherwise
 */
export async function migrateGithubToken(walletAddress: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!walletAddress || !hasEncryptionKey(walletAddress)) return false;

  try {
    const scopedKey = getTokenStorageKey(walletAddress);
    // Plain text sources in read order. Each entry names the storage that
    // holds the row, so the cleanup can drop exactly the row this call used.
    const sources: { key: string; store: Storage }[] = [
      { key: scopedKey, store: sessionStorage },
      // A read moves a legacy localStorage row here as plain text.
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

    // If this wallet already has an encrypted row, only the used row is stale.
    const existingEncrypted = localStorage.getItem(scopedKey);
    if (existingEncrypted?.startsWith(ENCRYPTED_PREFIX)) {
      used.store.removeItem(used.key);
      return true;
    }

    // Parse and re-store encrypted
    const data = parsePlaintextToken<StoredTokenData>(unencryptedJson, walletAddress);
    if (!data) return false;
    await storeTokenData(data, walletAddress);

    // Verify
    const migrated = localStorage.getItem(scopedKey);
    if (!migrated?.startsWith(ENCRYPTED_PREFIX)) return false;

    // Clean up the row this call used. Rows of other wallets stay in place.
    // The encrypted write replaced the scoped localStorage row, so keep it.
    if (used.store !== localStorage || used.key !== scopedKey) {
      used.store.removeItem(used.key);
    }
    return true;
  } catch {
    return false;
  }
}
