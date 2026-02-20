/**
 * Google Calendar OAuth 2.0 Authorization Code Flow
 *
 * Uses the portal backend for token exchange.
 * The backend handles the client secret - client only sends auth code.
 *
 * This implementation requests calendar scopes to access the user's calendar:
 * - calendar.readonly: Read access to calendar events
 * - calendar.events: Create, update, and delete events
 *
 * Token storage supports wallet-based encryption via AES-GCM.
 * When a walletAddress is provided and an encryption key is available,
 * tokens are encrypted before being persisted to localStorage.
 * Falls back to sessionStorage (plain JSON) when no wallet is available.
 */

import {
  postAuthOauthByProviderExchange,
  postAuthOauthByProviderRefresh,
  postAuthOauthByProviderRevoke,
} from "../../client/sdk.gen";
import type { Client } from "../../client/client";
import {
  getEncryptionKey,
  encryptDataWithKey,
  decryptDataWithKey,
  hasEncryptionKey,
} from "../../react/useEncryption";

// Use google-drive provider for backend API calls (same Google OAuth client)
// but store tokens separately and request Calendar-specific scopes
const PROVIDER = "google-drive";
const CODE_STORAGE_KEY = "google_calendar_oauth_state";
const TOKEN_STORAGE_KEY = "oauth_token_google-calendar";
const RETURN_URL_KEY = "google_calendar_return_url";
const PENDING_MESSAGE_KEY = "google_calendar_pending_message";

// Prefix for encrypted token values in storage
const ENCRYPTED_PREFIX = "enc:oauth:";

// In-memory cache for decrypted tokens (avoids decrypting on every call)
let cachedAccessToken: string | null = null;
let cachedExpiresAt: number | null = null;
let cachedRefreshToken: string | null = null;

// Google OAuth endpoints
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// Google Calendar API scopes
const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

// Token storage types
interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}

/**
 * Get the wallet-scoped storage key for token data.
 * When a walletAddress is provided, the key is scoped to that wallet
 * so different wallets can have independent encrypted tokens.
 */
function getTokenStorageKey(walletAddress?: string): string {
  if (walletAddress) {
    return `${TOKEN_STORAGE_KEY}:${walletAddress}`;
  }
  return TOKEN_STORAGE_KEY;
}

/**
 * Get stored token data.
 * Checks encrypted localStorage first, then falls back to unencrypted
 * legacy localStorage, and finally sessionStorage.
 */
async function getStoredTokenData(
  walletAddress?: string
): Promise<StoredTokenData | null> {
  if (typeof window === "undefined") return null;

  // Check in-memory cache first (avoids decryption on every call)
  if (cachedAccessToken) {
    const cached: StoredTokenData = {
      accessToken: cachedAccessToken,
      refreshToken: cachedRefreshToken ?? undefined,
      expiresAt: cachedExpiresAt ?? undefined,
    };
    return cached;
  }

  try {
    // 1. Try encrypted localStorage (wallet-scoped key)
    const scopedStored = localStorage.getItem(
      getTokenStorageKey(walletAddress)
    );
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
        return data;
      } catch (error) {
        console.error("Failed to decrypt Calendar OAuth token:", error);
        // Fall through to legacy/session storage
      }
    }

    // 2. Fall back to sessionStorage
    const sessionStored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (sessionStored) {
      try {
        const data = JSON.parse(sessionStored) as StoredTokenData;
        if (!data.accessToken) return null;
        cachedAccessToken = data.accessToken;
        cachedExpiresAt = data.expiresAt ?? null;
        cachedRefreshToken = data.refreshToken ?? null;
        return data;
      } catch {
        // Invalid JSON
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Store token data.
 * If a walletAddress is provided and an encryption key exists,
 * encrypts the token and stores in localStorage with a wallet-scoped key.
 * Otherwise falls back to sessionStorage with plain JSON.
 */
async function storeTokenData(
  data: StoredTokenData,
  walletAddress?: string
): Promise<void> {
  if (typeof window === "undefined") return;

  // Update in-memory cache
  cachedAccessToken = data.accessToken;
  cachedExpiresAt = data.expiresAt ?? null;
  cachedRefreshToken = data.refreshToken ?? null;

  const json = JSON.stringify(data);

  if (walletAddress && hasEncryptionKey(walletAddress)) {
    try {
      const cryptoKey = await getEncryptionKey(walletAddress);
      const encrypted = await encryptDataWithKey(json, cryptoKey);
      localStorage.setItem(
        getTokenStorageKey(walletAddress),
        ENCRYPTED_PREFIX + encrypted
      );
      return;
    } catch (error) {
      console.warn(
        "Failed to encrypt Calendar OAuth token, storing temporarily:",
        error
      );
      // Fall through to sessionStorage
    }
  }

  // Fallback: store plain JSON in sessionStorage
  sessionStorage.setItem(TOKEN_STORAGE_KEY, json);
}

/**
 * Clear stored token data for all storage locations
 */
export function clearCalendarToken(walletAddress?: string): void {
  if (typeof window === "undefined") return;
  // Clear in-memory cache
  cachedAccessToken = null;
  cachedExpiresAt = null;
  cachedRefreshToken = null;
  localStorage.removeItem(getTokenStorageKey(walletAddress));
  if (walletAddress) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Check if the stored access token is expired
 */
function isTokenExpired(
  data: StoredTokenData | null,
  bufferSeconds = 60
): boolean {
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
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
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
 * Check if current URL is a Calendar OAuth callback
 */
export function isCalendarCallback(callbackPath: string): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem(CODE_STORAGE_KEY);
  // Check if this callback is for Calendar (has our state stored)
  return (
    url.pathname === callbackPath && !!code && !!state && state === storedState
  );
}

/**
 * Handle the OAuth callback - exchange code for tokens via backend
 */
export async function handleCalendarCallback(
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
    console.error(`Calendar OAuth callback error: ${errorMessage}`, error);
    throw error;
  }
}

/**
 * Refresh the access token using the stored refresh token
 */
export async function refreshCalendarToken(
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
    clearCalendarToken(walletAddress);
    return null;
  }
}

/**
 * Revoke the OAuth token
 */
export async function revokeCalendarToken(
  apiClient?: Client,
  walletAddress?: string
): Promise<void> {
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
    clearCalendarToken(walletAddress);
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getCalendarAccessToken(
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
    const refreshedToken = await refreshCalendarToken(apiClient, walletAddress);
    if (refreshedToken) {
      return refreshedToken;
    }
  }

  // Fallback: return token if no expiry info
  if (storedData.accessToken && !storedData.expiresAt) {
    return storedData.accessToken;
  }

  return null;
}

/**
 * Store the return URL for after OAuth completes
 */
export function storeCalendarReturnUrl(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RETURN_URL_KEY, window.location.href);
}

/**
 * Get and clear the stored return URL
 */
export function getAndClearCalendarReturnUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem(RETURN_URL_KEY);
  sessionStorage.removeItem(RETURN_URL_KEY);
  return url;
}

/**
 * Store a pending message to retry after OAuth completes
 */
export function storeCalendarPendingMessage(message: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_MESSAGE_KEY, message);
}

/**
 * Get and clear the pending message
 */
export function getAndClearCalendarPendingMessage(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(PENDING_MESSAGE_KEY);
  sessionStorage.removeItem(PENDING_MESSAGE_KEY);
  return message;
}

/**
 * Start the OAuth flow - redirects to Google
 */
export async function startCalendarAuth(
  clientId: string,
  callbackPath: string
): Promise<never> {
  const state = generateState();
  storeOAuthState(state);
  storeCalendarReturnUrl();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(callbackPath),
    response_type: "code",
    scope: CALENDAR_SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
  });

  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  return new Promise(() => {});
}

/**
 * Get stored token for Calendar (async, for tool token getters)
 */
export async function getValidCalendarToken(
  walletAddress?: string
): Promise<string | null> {
  const data = await getStoredTokenData(walletAddress);
  if (!data) return null;
  if (data.expiresAt && isTokenExpired(data)) {
    return null;
  }
  return data.accessToken;
}

/**
 * Store Calendar token data (for external use)
 */
export async function storeCalendarToken(
  accessToken: string,
  expiresIn?: number,
  refreshToken?: string,
  scope?: string,
  walletAddress?: string
): Promise<void> {
  const tokenData = tokenResponseToStoredData(
    accessToken,
    expiresIn,
    refreshToken,
    scope
  );
  await storeTokenData(tokenData, walletAddress);
}

/**
 * Check if we have any stored credentials
 */
export async function hasCalendarCredentials(
  walletAddress?: string
): Promise<boolean> {
  const data = await getStoredTokenData(walletAddress);
  return !!(data?.accessToken || data?.refreshToken);
}

/**
 * Migrate unencrypted Calendar tokens to encrypted wallet-scoped storage.
 * Call this when a wallet address and encryption key become available
 * after the initial OAuth flow.
 *
 * Returns true if migration was performed (or already complete), false otherwise.
 */
export async function migrateCalendarToken(
  walletAddress: string
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!walletAddress || !hasEncryptionKey(walletAddress)) return false;

  try {
    const sessionStored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const legacyStored = localStorage.getItem(TOKEN_STORAGE_KEY);
    const isLegacyUnencrypted =
      legacyStored && !legacyStored.startsWith(ENCRYPTED_PREFIX);

    const unencryptedJson =
      sessionStored || (isLegacyUnencrypted ? legacyStored : null);
    if (!unencryptedJson) return false;

    const scopedKey = getTokenStorageKey(walletAddress);
    const existingEncrypted = localStorage.getItem(scopedKey);
    if (existingEncrypted?.startsWith(ENCRYPTED_PREFIX)) {
      // Already migrated - just clean up plaintext remnants
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      if (isLegacyUnencrypted) localStorage.removeItem(TOKEN_STORAGE_KEY);
      return true;
    }

    const data = JSON.parse(unencryptedJson) as StoredTokenData;
    await storeTokenData(data, walletAddress);

    // Verify encryption succeeded
    const migrated = localStorage.getItem(scopedKey);
    if (!migrated?.startsWith(ENCRYPTED_PREFIX)) return false;

    // Clean up plaintext storage
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    if (isLegacyUnencrypted) localStorage.removeItem(TOKEN_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
