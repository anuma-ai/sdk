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
  type OAuthError,
  type OAuthResult,
  storeTokenData,
  tokenResponseToStoredData,
} from "../oauth/storage";

const PROVIDER = "dropbox";
const STATE_STORAGE_KEY = "dropbox_oauth_state";

const DROPBOX_AUTH_URL = "https://www.dropbox.com/oauth2/authorize";

function getRedirectUri(callbackPath: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${callbackPath}`;
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function storeOAuthState(state: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STATE_STORAGE_KEY, state);
}

function getAndClearOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(STATE_STORAGE_KEY);
  sessionStorage.removeItem(STATE_STORAGE_KEY);
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
 * Check if current URL is a Dropbox OAuth callback
 */
export function isDropboxCallback(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = sessionStorage.getItem(STATE_STORAGE_KEY);
  return !!code && !!state && state === storedState;
}

/**
 * Handle the OAuth callback - exchange code for tokens via backend
 */
export async function handleDropboxCallback(
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

    const tokenData = tokenResponseToStoredData(
      response.data.access_token,
      response.data.expires_in,
      response.data.refresh_token,
      response.data.scope
    );

    try {
      await storeTokenData(PROVIDER, tokenData, walletAddress);
    } catch (encryptionError) {
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

    window.history.replaceState({}, "", window.location.pathname);

    return {
      ok: true,
      data: response.data.access_token,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? `${error.name}: ${errorMessage}` : errorMessage;

    getLogger().error(`OAuth callback error: ${errorDetails}`, error);
    getLogger().warn(`Failed to complete OAuth flow: ${errorMessage}`);

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

async function refreshDropboxToken(
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
    clearTokenData(PROVIDER, walletAddress);
    return null;
  }
}

/**
 * Revoke the OAuth token
 */
export async function revokeDropboxToken(
  apiClient?: Client,
  walletAddress?: string
): Promise<void> {
  const tokenData = await getStoredTokenData(PROVIDER, walletAddress);
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
    clearTokenData(PROVIDER, walletAddress);
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getDropboxAccessToken(
  apiClient?: Client,
  walletAddress?: string
): Promise<string | null> {
  const validToken = await getValidAccessToken(PROVIDER, walletAddress);
  if (validToken) return validToken;

  return refreshDropboxToken(apiClient, walletAddress);
}

/**
 * Start the OAuth flow - redirects to Dropbox
 */
export async function startDropboxAuth(appKey: string, callbackPath: string): Promise<never> {
  const state = generateState();
  storeOAuthState(state);

  const params = new URLSearchParams({
    client_id: appKey,
    redirect_uri: getRedirectUri(callbackPath),
    response_type: "code",
    state,
    token_access_type: "offline",
  });

  window.location.href = `${DROPBOX_AUTH_URL}?${params.toString()}`;

  return new Promise(() => {});
}

/**
 * Clear Dropbox token data
 */
export function clearToken(): void {
  clearTokenData(PROVIDER);
}

/**
 * Check if we have any stored credentials (including refresh token)
 */
export async function hasDropboxCredentials(walletAddress?: string): Promise<boolean> {
  const data = await getStoredTokenData(PROVIDER, walletAddress);
  return !!(data?.accessToken || data?.refreshToken);
}
