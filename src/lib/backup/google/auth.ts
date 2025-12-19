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
  storeTokenData,
  tokenResponseToStoredData,
} from "../oauth/storage";
import type { OAuthCallbackResult, OAuthCallbackError } from "../oauth/types";

const PROVIDER = "google-drive";
export const GOOGLE_STATE_STORAGE_KEY = "google_oauth_state";

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
  sessionStorage.setItem(GOOGLE_STATE_STORAGE_KEY, state);
}

/**
 * Get and clear stored OAuth state
 */
function getAndClearOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  const state = sessionStorage.getItem(GOOGLE_STATE_STORAGE_KEY);
  sessionStorage.removeItem(GOOGLE_STATE_STORAGE_KEY);
  return state;
}

/**
 * Clear stored OAuth state without retrieving it
 */
export function clearGoogleOAuthState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(GOOGLE_STATE_STORAGE_KEY);
}

/**
 * Check if current URL is a Google OAuth callback
 */
export function isGoogleDriveCallback(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem(GOOGLE_STATE_STORAGE_KEY);
  return !!code && !!state && state === storedState;
}

/**
 * Parse OAuth callback URL parameters and validate state
 * Returns structured error information for different failure cases
 */
export function parseGoogleDriveCallback(): OAuthCallbackError | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Check for OAuth error from Google
  if (oauthError) {
    return {
      type: "oauth_error",
      message: oauthError,
      description: errorDescription ?? undefined,
    };
  }

  // Check for missing required parameters
  if (!code || !state) {
    return {
      type: "missing_params",
      message: "Missing authorization code or state parameter",
    };
  }

  // Validate state against stored value (CSRF protection)
  const storedState = sessionStorage.getItem(GOOGLE_STATE_STORAGE_KEY);
  if (!storedState) {
    return {
      type: "csrf_mismatch",
      message: "No stored OAuth state found. Session may have expired.",
    };
  }

  if (state !== storedState) {
    return {
      type: "csrf_mismatch",
      message: "OAuth state mismatch. Possible CSRF attack detected.",
    };
  }

  // All validations passed
  return null;
}

/**
 * Handle the OAuth callback - exchange code for tokens via backend
 * Returns structured result with success/error information
 */
export async function handleGoogleDriveCallback(
  callbackPath: string,
  apiClient?: Client
): Promise<OAuthCallbackResult> {
  if (typeof window === "undefined") {
    return {
      success: false,
      error: { type: "missing_params", message: "Not in browser environment" },
    };
  }

  // First validate the callback parameters
  const validationError = parseGoogleDriveCallback();
  if (validationError) {
    clearGoogleOAuthState();
    return { success: false, error: validationError };
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code")!;

  // Clear the stored state now that we've validated it
  getAndClearOAuthState();

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
        success: false,
        error: {
          type: "exchange_failed",
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
    storeTokenData(PROVIDER, tokenData);

    // Clean up URL
    window.history.replaceState({}, "", window.location.pathname);

    return { success: true, accessToken: response.data.access_token };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token exchange failed";
    return {
      success: false,
      error: { type: "exchange_failed", message },
    };
  }
}

/**
 * Handle the OAuth callback - legacy version that returns string | null
 * @deprecated Use handleGoogleDriveCallback which returns structured results
 */
export async function handleGoogleDriveCallbackLegacy(
  callbackPath: string,
  apiClient?: Client
): Promise<string | null> {
  const result = await handleGoogleDriveCallback(callbackPath, apiClient);
  return result.success ? result.accessToken : null;
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
  // First check for a valid (non-expired) token
  const validToken = getValidAccessToken(PROVIDER);
  if (validToken) return validToken;

  // Try to refresh if we have a refresh token
  return refreshGoogleDriveToken(apiClient);
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
