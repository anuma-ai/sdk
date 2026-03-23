/**
 * Google Drive OAuth 2.0 Authorization Code Flow
 *
 * Flow:
 * 1. Redirect user to Google authorization URL
 * 2. User authorizes and is redirected back with authorization code
 * 3. Exchange code on backend for access + refresh tokens
 * 4. Use refresh token to get new access tokens silently
 */

import type { Client } from "../../../client/client";
import {
  postAuthOauthByProviderExchange,
  postAuthOauthByProviderRefresh,
  postAuthOauthByProviderRevoke,
} from "../../../client/sdk.gen";
import { getLogger } from "../../logger";
import {
  clearTokenData,
  getRefreshToken,
  getStoredTokenData,
  getValidAccessToken,
  isTokenExpired,
  type OAuthError,
  type OAuthResult,
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

  // Handle both JSON format (from tests) and plain string format
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
  apiClient?: Client,
  walletAddress?: string
): Promise<OAuthResult<string>> {
  if (typeof window === "undefined") {
    return {
      ok: false,
      error: {
        code: "unknown",
        message: "OAuth callback can only be handled in browser environment",
      },
    };
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = getAndClearOAuthState();

  // Validate state to prevent CSRF
  if (!code || !state || state !== storedState) {
    return {
      ok: false,
      error: {
        code: "csrf",
        message: "Invalid or missing OAuth state parameter",
      },
    };
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
      return {
        ok: false,
        error: {
          code: "invalid_response",
          message: "No access token in response",
        },
      };
    }

    // Store tokens
    const tokenData = tokenResponseToStoredData(
      response.data.access_token,
      response.data.expires_in,
      response.data.refresh_token,
      response.data.scope
    );

    try {
      await storeTokenData(PROVIDER, tokenData, walletAddress);
    } catch (encryptionError) {
      // Encryption failure - return error with details
      return {
        ok: false,
        error: {
          code: "encryption",
          message:
            encryptionError instanceof Error ? encryptionError.message : String(encryptionError),
          originalError: encryptionError instanceof Error ? encryptionError : undefined,
        },
      };
    }

    // Clean up URL
    window.history.replaceState({}, "", window.location.pathname);

    return {
      ok: true,
      data: response.data.access_token,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? `${error.name}: ${errorMessage}` : errorMessage;

    // Log error with details
    getLogger().error(`OAuth callback error: ${errorDetails}`, error);
    getLogger().warn(`Failed to complete OAuth flow: ${errorMessage}`);

    // Determine error code based on error type
    let errorCode: OAuthError["code"] = "unknown";
    if (error instanceof TypeError && error.message.includes("fetch")) {
      errorCode = "network";
    } else if (error instanceof Error && error.message.includes("encryption")) {
      errorCode = "encryption";
    }

    return {
      ok: false,
      error: {
        code: errorCode,
        message: errorMessage,
        originalError: error instanceof Error ? error : undefined,
      },
    };
  }
}

/**
 * Refresh the access token using the stored refresh token
 */
async function refreshGoogleDriveToken(
  apiClient?: Client,
  walletAddress?: string
): Promise<string | null> {
  const refreshToken = await getRefreshToken(PROVIDER, walletAddress);
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
    const currentData = await getStoredTokenData(PROVIDER, walletAddress);
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
  const tokenData = await getStoredTokenData(PROVIDER, walletAddress);
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
  const storedData = await getStoredTokenData(PROVIDER, walletAddress);

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
export async function startGoogleDriveAuth(clientId: string, callbackPath: string): Promise<never> {
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
export async function getGoogleDriveStoredToken(walletAddress?: string): Promise<string | null> {
  return getValidAccessToken(PROVIDER, walletAddress);
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
export async function hasGoogleDriveCredentials(walletAddress?: string): Promise<boolean> {
  const data = await getStoredTokenData(PROVIDER, walletAddress);
  return !!(data?.accessToken || data?.refreshToken);
}
