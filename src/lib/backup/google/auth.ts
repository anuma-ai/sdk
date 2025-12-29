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
  getRefreshTokenSync,
  getStoredTokenData,
  getStoredTokenDataSync,
  getValidAccessToken,
  getValidAccessTokenSync,
  hasStoredCredentialsSync,
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
 * Maximum age for OAuth state (10 minutes)
 */
const MAX_STATE_AGE_MS = 10 * 60 * 1000;

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
 * Store OAuth state for validation with timestamp
 */
function storeOAuthState(state: string): void {
  if (typeof window === "undefined") return;
  const stateData = {
    state,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(CODE_STORAGE_KEY, JSON.stringify(stateData));
}

/**
 * Get and clear stored OAuth state with timestamp validation
 */
function getAndClearOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = sessionStorage.getItem(CODE_STORAGE_KEY);
    if (!stored) return null;
    
    const stateData = JSON.parse(stored) as { state: string; timestamp: number };
    
    // Validate timestamp - state must not be too old
    const age = Date.now() - stateData.timestamp;
    if (age > MAX_STATE_AGE_MS) {
      // State is too old, clear it
      sessionStorage.removeItem(CODE_STORAGE_KEY);
      return null;
    }
    
    // Clear state after use (one-time use)
    sessionStorage.removeItem(CODE_STORAGE_KEY);
    return stateData.state;
  } catch {
    // Invalid state data, clear it
    sessionStorage.removeItem(CODE_STORAGE_KEY);
    return null;
  }
}

/**
 * Check if current URL is a Google OAuth callback
 */
export function isGoogleDriveCallback(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  
  if (!code || !state) return false;
  
  try {
    const stored = sessionStorage.getItem(CODE_STORAGE_KEY);
    if (!stored) return false;
    
    const stateData = JSON.parse(stored) as { state: string; timestamp: number };
    
    // Validate timestamp
    const age = Date.now() - stateData.timestamp;
    if (age > MAX_STATE_AGE_MS) {
      return false; // State is too old
    }
    
    return state === stateData.state;
  } catch {
    return false;
  }
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

    // Store tokens (without encryption for now - wallet address not available in OAuth callback)
    const tokenData = tokenResponseToStoredData(
      response.data.access_token,
      response.data.expires_in,
      response.data.refresh_token,
      response.data.scope
    );
    await storeTokenData(PROVIDER, tokenData);

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
  apiClient?: Client,
  walletAddress?: string
): Promise<string | null> {
  const refreshToken = walletAddress
    ? await getRefreshToken(PROVIDER, walletAddress)
    : getRefreshTokenSync(PROVIDER);
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
    const currentData = walletAddress
      ? await getStoredTokenData(PROVIDER, walletAddress)
      : getStoredTokenDataSync(PROVIDER);
    const tokenData = tokenResponseToStoredData(
      response.data.access_token,
      response.data.expires_in,
      response.data.refresh_token ?? currentData?.refreshToken,
      response.data.scope ?? currentData?.scope
    );
    await storeTokenData(PROVIDER, tokenData, walletAddress);

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
  apiClient?: Client,
  walletAddress?: string
): Promise<void> {
  const tokenData = walletAddress
    ? await getStoredTokenData(PROVIDER, walletAddress)
    : getStoredTokenDataSync(PROVIDER);
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
  apiClient?: Client,
  walletAddress?: string
): Promise<string | null> {
  const storedData = walletAddress
    ? await getStoredTokenData(PROVIDER, walletAddress)
    : getStoredTokenDataSync(PROVIDER);

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
    const refreshedToken = await refreshGoogleDriveToken(apiClient, walletAddress);
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
  return getValidAccessTokenSync(PROVIDER);
}

/**
 * Clear Google Drive token data
 */
export function clearGoogleDriveToken(): void {
  clearTokenData(PROVIDER);
}

/**
 * Check if we have any stored credentials (including refresh token)
 * Works with both encrypted and unencrypted credentials
 */
export function hasGoogleDriveCredentials(): boolean {
  return hasStoredCredentialsSync(PROVIDER);
}
