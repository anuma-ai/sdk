/**
 * GitHub MCP OAuth 2.0 Authorization Code Flow
 *
 * Uses the portal backend for token exchange (same pattern as Google Calendar/Drive).
 * The backend handles the client secret - client only sends auth code.
 *
 * Token storage uses wallet-based encryption when a wallet address is provided.
 * Encrypted tokens are stored in localStorage with the "enc:oauth:" prefix.
 * When no wallet is available, tokens are stored temporarily in sessionStorage.
 *
 * GitHub's OAuth token endpoint does not support CORS, so we cannot exchange
 * tokens directly from the browser. Instead, we redirect the user to GitHub,
 * receive the auth code, and send it to the portal backend for exchange.
 *
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 */

import type { Client } from "../../client/client";
import {
  postAuthOauthByProviderExchange,
  postAuthOauthByProviderRefresh,
  postAuthOauthByProviderRevoke,
} from "../../client/sdk.gen";
import {
  getEncryptionKey,
  encryptDataWithKey,
  decryptDataWithKey,
  hasEncryptionKey,
} from "../../react/useEncryption";

// Provider name for the portal backend API
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

// GitHub OAuth scopes
const GITHUB_SCOPES = "repo read:org read:user";

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
 * 2. Unencrypted localStorage (legacy unscoped key, pre-encryption users)
 * 3. Unencrypted sessionStorage (temporary fallback)
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
      } catch {
        // Fall through to legacy lookups
      }
    }

    // 2. Try legacy unencrypted localStorage (unscoped key, pre-encryption)
    const legacyStored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (legacyStored && !legacyStored.startsWith(ENCRYPTED_PREFIX)) {
      try {
        const data = JSON.parse(legacyStored) as StoredTokenData;
        if (data.accessToken) {
          cachedAccessToken = data.accessToken;
          cachedExpiresAt = data.expiresAt ?? null;
          cachedRefreshToken = data.refreshToken ?? null;
          cachedWalletAddress = walletAddress ?? null;
          return data;
        }
      } catch {
        // Not valid JSON
      }
    }

    // 3. Fall back to sessionStorage
    const sessionStored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (sessionStored) {
      try {
        const data = JSON.parse(sessionStored) as StoredTokenData;
        if (!data.accessToken) return null;
        cachedAccessToken = data.accessToken;
        cachedExpiresAt = data.expiresAt ?? null;
        cachedRefreshToken = data.refreshToken ?? null;
        cachedScope = data.scope ?? null;
        cachedWalletAddress = walletAddress ?? null;
        return data;
      } catch {
        // Not valid JSON
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Store token data with encryption support.
 *
 * If walletAddress is provided and an encryption key exists:
 *   - Encrypts and stores in localStorage with wallet-scoped key.
 * Otherwise:
 *   - Stores plain JSON in sessionStorage (cleared on page close).
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

  if (walletAddress && hasEncryptionKey(walletAddress)) {
    try {
      const cryptoKey = await getEncryptionKey(walletAddress);
      const encrypted = await encryptDataWithKey(json, cryptoKey);
      localStorage.setItem(getTokenStorageKey(walletAddress), `${ENCRYPTED_PREFIX}${encrypted}`);
      return;
    } catch {
      // Fall through to sessionStorage
    }
  }

  // Fallback: store plain JSON in sessionStorage
  sessionStorage.setItem(TOKEN_STORAGE_KEY, json);
}

/**
 * Clear stored token data
 */
export function clearGitHubToken(walletAddress?: string): void {
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
}

/**
 * Check if the stored access token is expired
 */
function isTokenExpired(data: StoredTokenData | null, bufferSeconds = 60): boolean {
  if (!data) return true;
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
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && "state" in parsed) {
      return parsed.state;
    }
  } catch {
    // Not JSON, return as-is
  }
  return stored;
}

/**
 * Check if current URL is a GitHub OAuth callback
 */
export function isGitHubCallback(callbackPath: string): boolean {
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
export async function handleGitHubCallback(
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
    throw error;
  }
}

/**
 * Refresh the access token using the stored refresh token
 */
export async function refreshGitHubToken(
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
  } catch {
    clearGitHubToken(walletAddress);
    return null;
  }
}

/**
 * Revoke the OAuth token
 */
export async function revokeGitHubToken(apiClient?: Client, walletAddress?: string): Promise<void> {
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
    clearGitHubToken(walletAddress);
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getGitHubAccessToken(
  apiClient?: Client,
  walletAddress?: string
): Promise<string | null> {
  const storedData = await getStoredTokenData(walletAddress);

  if (!storedData) {
    return null;
  }

  // If token is not expired, use it
  if (storedData.expiresAt && !isTokenExpired(storedData)) {
    return storedData.accessToken;
  }

  // Try to refresh
  if (storedData.refreshToken) {
    const refreshedToken = await refreshGitHubToken(apiClient, walletAddress);
    if (refreshedToken) {
      return refreshedToken;
    }
  }

  // Fallback: return token if no expiry info (GitHub tokens may not expire)
  if (storedData.accessToken && !storedData.expiresAt) {
    return storedData.accessToken;
  }

  return null;
}

/**
 * Store the return URL for after OAuth completes
 */
export function storeGitHubReturnUrl(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RETURN_URL_KEY, window.location.href);
}

/**
 * Get and clear the stored return URL
 */
export function getAndClearGitHubReturnUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem(RETURN_URL_KEY);
  sessionStorage.removeItem(RETURN_URL_KEY);
  return url;
}

/**
 * Store a pending message to retry after OAuth completes
 */
export function storeGitHubPendingMessage(message: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_MESSAGE_KEY, message);
}

/**
 * Get and clear the pending message
 */
export function getAndClearGitHubPendingMessage(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(PENDING_MESSAGE_KEY);
  sessionStorage.removeItem(PENDING_MESSAGE_KEY);
  return message;
}

/**
 * Start the OAuth flow - redirects to GitHub
 */
export async function startGitHubAuth(
  clientId: string,
  callbackPath: string
): Promise<never> {
  const state = generateState();
  storeOAuthState(state);
  storeGitHubReturnUrl();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(callbackPath),
    response_type: "code",
    scope: GITHUB_SCOPES,
    state,
  });

  window.location.href = `${GITHUB_AUTH_URL}?${params.toString()}`;

  return new Promise(() => {});
}

/**
 * Get stored token for GitHub (async, supports encrypted storage)
 */
export async function getValidGitHubToken(walletAddress?: string): Promise<string | null> {
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
export async function storeGitHubToken(
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
export async function hasGitHubCredentials(walletAddress?: string): Promise<boolean> {
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
export async function migrateGitHubToken(walletAddress: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!walletAddress || !hasEncryptionKey(walletAddress)) return false;

  try {
    // Check for unencrypted token in sessionStorage
    const sessionStored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    // Also check legacy unencrypted localStorage
    const legacyStored = localStorage.getItem(TOKEN_STORAGE_KEY);
    const isLegacyUnencrypted = legacyStored && !legacyStored.startsWith(ENCRYPTED_PREFIX);

    const unencryptedJson = sessionStored || (isLegacyUnencrypted ? legacyStored : null);
    if (!unencryptedJson) return false;

    // If already have encrypted version, just clean up
    const scopedKey = getTokenStorageKey(walletAddress);
    const existingEncrypted = localStorage.getItem(scopedKey);
    if (existingEncrypted?.startsWith(ENCRYPTED_PREFIX)) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      if (isLegacyUnencrypted) localStorage.removeItem(TOKEN_STORAGE_KEY);
      return true;
    }

    // Parse and re-store encrypted
    const data = JSON.parse(unencryptedJson) as StoredTokenData;
    await storeTokenData(data, walletAddress);

    // Verify
    const migrated = localStorage.getItem(scopedKey);
    if (!migrated?.startsWith(ENCRYPTED_PREFIX)) return false;

    // Clean up unencrypted
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    if (isLegacyUnencrypted) localStorage.removeItem(TOKEN_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the GitHub MCP server URL for tool connections
 */
export function getGitHubMCPUrl(): string {
  return "https://api.githubcopilot.com/mcp/";
}
