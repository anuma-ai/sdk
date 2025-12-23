/**
 * Google Drive OAuth 2.0 Authorization Code Flow
 *
 * Flow:
 * 1. Redirect user to Google authorization URL
 * 2. User authorizes and is redirected back with authorization code
 * 3. Exchange code on backend for access + refresh tokens
 * 4. Use refresh token to get new access tokens silently
 */

import {
  postAuthOauthByProviderExchange,
  postAuthOauthByProviderRefresh,
  postAuthOauthByProviderRevoke,
} from "../../../client/sdk.gen";
import type { Client } from "../../../client/client";
import {
  clearTokenData,
  getRefreshToken,
  getStoredTokenData,
  getValidAccessToken,
  isTokenExpired,
  storeTokenData,
  tokenResponseToStoredData,
} from "../oauth/storage";

const PROVIDER = "google-drive";
const CODE_STORAGE_KEY = "google_oauth_state";

// Google OAuth endpoints
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// Google Drive API scopes
const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file", // Access to files created by the app
].join(" ");

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
  const state = sessionStorage.getItem(CODE_STORAGE_KEY);
  sessionStorage.removeItem(CODE_STORAGE_KEY);
  return state;
}

/**
 * Check if current URL is a Google OAuth callback
 */
export function isGoogleDriveCallback(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem(CODE_STORAGE_KEY);
  return !!code && !!state && state === storedState;
}

/**
 * Handle the OAuth callback - exchange code for tokens via backend
 */
export async function handleGoogleDriveCallback(
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
    return null;
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
    storeTokenData(PROVIDER, tokenData);

    // Clean up URL
    window.history.replaceState({}, "", window.location.pathname);

    return response.data.access_token;
  } catch {
    return null;
  }
}

/**
 * Refresh the access token using the stored refresh token
 */
export async function refreshGoogleDriveToken(
  apiClient?: Client
): Promise<string | null> {
  const refreshToken = getRefreshToken(PROVIDER);
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

    // Update stored tokens (refresh token may or may not be included)
    const currentData = getStoredTokenData(PROVIDER);
    const tokenData = tokenResponseToStoredData(
      response.data.access_token,
      response.data.expires_in,
      response.data.refresh_token ?? currentData?.refreshToken,
      response.data.scope ?? currentData?.scope
    );
    storeTokenData(PROVIDER, tokenData);

    return response.data.access_token;
  } catch {
    // If refresh fails, clear stored data
    clearTokenData(PROVIDER);
    return null;
  }
}

/**
 * Revoke the OAuth token
 */
export async function revokeGoogleDriveToken(
  apiClient?: Client
): Promise<void> {
  const tokenData = getStoredTokenData(PROVIDER);
  if (!tokenData) return;

  try {
    // Prefer revoking refresh token if available, otherwise access token
    const tokenToRevoke = tokenData.refreshToken ?? tokenData.accessToken;
    await postAuthOauthByProviderRevoke({
      client: apiClient,
      path: { provider: PROVIDER },
      body: { token: tokenToRevoke },
    });
  } catch {
    // Ignore errors on revocation
  } finally {
    clearTokenData(PROVIDER);
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getGoogleDriveAccessToken(
  apiClient?: Client
): Promise<string | null> {
  const storedData = getStoredTokenData(PROVIDER);

  // If no stored data at all, nothing to do
  if (!storedData) {
    return null;
  }

  // If we have expiration info and token is NOT expired, use it
  if (storedData.expiresAt && !isTokenExpired(storedData)) {
    return storedData.accessToken;
  }

  // Token is either expired OR has no expiration info (can't verify validity)
  // In both cases, try to refresh if we have a refresh token
  if (storedData.refreshToken) {
    const refreshedToken = await refreshGoogleDriveToken(apiClient);
    if (refreshedToken) {
      return refreshedToken;
    }
  }

  // Fallback: if we have an access token but couldn't refresh, return it
  // This handles edge cases where refresh fails but token might still work
  if (storedData.accessToken && !storedData.expiresAt) {
    return storedData.accessToken;
  }

  return null;
}

/**
 * Start the OAuth flow - redirects to Google
 */
export async function startGoogleDriveAuth(
  clientId: string,
  callbackPath: string
): Promise<never> {
  const state = generateState();
  storeOAuthState(state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(callbackPath),
    response_type: "code",
    scope: DRIVE_SCOPES,
    state,
    access_type: "offline", // Request refresh token
    prompt: "consent", // Force consent to always get refresh token
  });

  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  // This will never resolve - page redirects
  return new Promise(() => {});
}

/**
 * Get stored token data for Google Drive
 */
export function getGoogleDriveStoredToken(): string | null {
  return getValidAccessToken(PROVIDER);
}

/**
 * Clear Google Drive token data
 */
export function clearGoogleDriveToken(): void {
  clearTokenData(PROVIDER);
}

/**
 * Check if we have any stored credentials (including refresh token)
 */
export function hasGoogleDriveCredentials(): boolean {
  const data = getStoredTokenData(PROVIDER);
  return !!(data?.accessToken || data?.refreshToken);
}
