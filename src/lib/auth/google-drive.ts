/**
 * Google Drive OAuth 2.0 Authorization Code Flow
 *
 * Uses the portal backend for token exchange.
 * The backend handles the client secret - client only sends auth code.
 *
 * This implementation requests drive.readonly scope to access ALL user files,
 * not just files created by the app.
 *
 * Note: This is different from the backup/google/auth.ts which uses drive.file
 * scope (limited to app-created files). Use this module when you need to search
 * and read any file in the user's Drive.
 */

import type { Client } from "../../client/client";
import {
  postAuthOauthByProviderExchange,
  postAuthOauthByProviderRefresh,
  postAuthOauthByProviderRevoke,
} from "../../client/sdk.gen";

// Use google-drive provider for backend API calls
const PROVIDER = "google-drive";
const CODE_STORAGE_KEY = "google_drive_oauth_state";
const TOKEN_STORAGE_KEY = "oauth_token_google-drive-full";
const RETURN_URL_KEY = "google_drive_return_url";
const PENDING_MESSAGE_KEY = "google_drive_pending_message";

// Google OAuth endpoints
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// Google Drive API scopes - use drive.readonly for full read access to all files
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"].join(" ");

// Token storage types
interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}

/**
 * Get stored token data
 */
function getStoredTokenData(): StoredTokenData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as StoredTokenData;
    if (!data.accessToken) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Store token data
 */
function storeTokenData(data: StoredTokenData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Clear stored token data
 */
export function clearDriveToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
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
 * Check if current URL is a Drive OAuth callback
 */
export function isDriveCallback(callbackPath: string): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem(CODE_STORAGE_KEY);
  // Check if this callback is for Drive (has our state stored)
  return url.pathname === callbackPath && !!code && !!state && state === storedState;
}

/**
 * Handle the OAuth callback - exchange code for tokens via backend
 */
export async function handleDriveCallback(
  callbackPath: string,
  apiClient?: Client
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
    storeTokenData(tokenData);

    // Clean up URL
    window.history.replaceState({}, "", window.location.pathname);

    return response.data.access_token;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Drive OAuth callback error: ${errorMessage}`, error);
    throw error;
  }
}

/**
 * Refresh the access token using the stored refresh token
 */
export async function refreshDriveToken(apiClient?: Client): Promise<string | null> {
  const storedData = getStoredTokenData();
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
    storeTokenData(tokenData);

    return response.data.access_token;
  } catch {
    clearDriveToken();
    return null;
  }
}

/**
 * Revoke the OAuth token
 */
export async function revokeDriveToken(apiClient?: Client): Promise<void> {
  const tokenData = getStoredTokenData();
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
    clearDriveToken();
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getDriveAccessToken(apiClient?: Client): Promise<string | null> {
  const storedData = getStoredTokenData();

  if (!storedData) {
    return null;
  }

  // If token is not expired, use it
  if (storedData.expiresAt && !isTokenExpired(storedData)) {
    return storedData.accessToken;
  }

  // Try to refresh
  if (storedData.refreshToken) {
    const refreshedToken = await refreshDriveToken(apiClient);
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
 * Start the OAuth flow - redirects to Google
 */
export async function startDriveAuth(clientId: string, callbackPath: string): Promise<never> {
  const state = generateState();
  storeOAuthState(state);
  storeDriveReturnUrl();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(callbackPath),
    response_type: "code",
    scope: DRIVE_SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
  });

  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  return new Promise(() => {});
}

/**
 * Get stored token for Drive (synchronous, for tool token getters)
 */
export function getValidDriveToken(): string | null {
  const data = getStoredTokenData();
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
  scope?: string
): Promise<void> {
  const tokenData = tokenResponseToStoredData(accessToken, expiresIn, refreshToken, scope);
  storeTokenData(tokenData);
}

/**
 * Check if we have any stored credentials
 */
export function hasDriveCredentials(): boolean {
  const data = getStoredTokenData();
  return !!(data?.accessToken || data?.refreshToken);
}
