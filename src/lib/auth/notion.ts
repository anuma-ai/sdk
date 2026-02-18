/**
 * Notion MCP OAuth 2.0 with PKCE (Proof Key for Code Exchange)
 *
 * This is a fully client-side OAuth implementation - NO BACKEND REQUIRED.
 * PKCE eliminates the need for a client secret by using a code verifier/challenge pair.
 *
 * Tokens are encrypted using the user's wallet-derived encryption key before storage,
 * ensuring privacy-first token persistence.
 *
 * Flow:
 * 1. Generate code_verifier (random string) and code_challenge (SHA-256 hash)
 * 2. Redirect to Notion OAuth with code_challenge
 * 3. User approves access
 * 4. Exchange auth code + code_verifier for tokens (no secret needed)
 * 5. Encrypt and store tokens in localStorage using wallet-derived key
 *
 * @see https://developers.notion.com/guides/mcp/build-mcp-client
 */

import {
  getEncryptionKey,
  encryptDataWithKey,
  decryptDataWithKey,
  hasEncryptionKey,
} from "../../react/useEncryption";

// Storage keys
const TOKEN_STORAGE_KEY = "oauth_token_notion";
const PKCE_STORAGE_KEY = "notion_oauth_pkce";
const RETURN_URL_KEY = "notion_return_url";
const PENDING_MESSAGE_KEY = "notion_pending_message";
const CLIENT_REGISTRATION_KEY = "notion_oauth_client";

// Notion OAuth endpoints
const NOTION_MCP_BASE = "https://mcp.notion.com";
const NOTION_OAUTH_AUTHORIZE = "https://api.notion.com/v1/oauth/authorize";
const NOTION_OAUTH_TOKEN = "https://api.notion.com/v1/oauth/token";

// Encrypted storage prefix
const ENCRYPTED_PREFIX = "enc:oauth:";

// Token storage types
interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}

// Client registration data
interface ClientRegistration {
  clientId: string;
  clientSecret?: string;
  registeredAt: number;
}

// ============================================================================
// PKCE UTILITIES
// ============================================================================

/**
 * Generate a cryptographically random code verifier for PKCE
 * Must be 43-128 characters, using unreserved URI characters
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 * This is sent during authorization; verifier is sent during token exchange
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Base64url encode (RFC 4648) - URL safe base64 without padding
 */
function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
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

// ============================================================================
// PKCE STATE MANAGEMENT
// ============================================================================

interface PKCEState {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Store PKCE state for the OAuth flow
 */
function storePKCEState(pkce: PKCEState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(pkce));
}

/**
 * Get and clear PKCE state (should only be used once)
 */
function getAndClearPKCEState(): PKCEState | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(PKCE_STORAGE_KEY);
  sessionStorage.removeItem(PKCE_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as PKCEState;
  } catch {
    return null;
  }
}

// ============================================================================
// ENCRYPTED TOKEN STORAGE
// ============================================================================

/**
 * Store token data with encryption using wallet-derived CryptoKey
 *
 * @param data - Token data to store
 * @param walletAddress - Wallet address to get the encryption key
 */
async function storeTokenData(
  data: StoredTokenData,
  walletAddress: string
): Promise<void> {
  if (typeof window === "undefined") return;

  const json = JSON.stringify(data);

  // Check if encryption key exists in memory for this wallet
  if (walletAddress && hasEncryptionKey(walletAddress)) {
    try {
      // Get the CryptoKey derived from wallet signature
      const cryptoKey = await getEncryptionKey(walletAddress);
      // Encrypt using the CryptoKey
      const encrypted = await encryptDataWithKey(json, cryptoKey);
      localStorage.setItem(TOKEN_STORAGE_KEY, `${ENCRYPTED_PREFIX}${encrypted}`);
      return;
    } catch (error) {
      console.warn("Failed to encrypt Notion token, storing temporarily:", error);
    }
  }

  // Fallback: store in sessionStorage (cleared on page close)
  // This happens when:
  // - No wallet address provided
  // - Encryption key not available yet
  // - Encryption failed
  sessionStorage.setItem(TOKEN_STORAGE_KEY, json);
}

/**
 * Get stored token data with decryption using wallet-derived CryptoKey
 *
 * @param walletAddress - Wallet address to get the decryption key
 */
async function getStoredTokenData(
  walletAddress?: string
): Promise<StoredTokenData | null> {
  if (typeof window === "undefined") return null;

  try {
    // Check encrypted storage first (localStorage)
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored?.startsWith(ENCRYPTED_PREFIX)) {
      if (!walletAddress) {
        console.warn("Encrypted Notion token found but no wallet address provided");
        return null;
      }

      // Check if we have the encryption key to decrypt
      if (!hasEncryptionKey(walletAddress)) {
        console.warn("Encrypted Notion token found but encryption key not available");
        return null;
      }

      try {
        // Get the CryptoKey derived from wallet signature
        const cryptoKey = await getEncryptionKey(walletAddress);
        const encrypted = stored.slice(ENCRYPTED_PREFIX.length);
        // Decrypt using the CryptoKey
        const decrypted = await decryptDataWithKey(encrypted, cryptoKey);
        const data = JSON.parse(decrypted) as StoredTokenData;
        if (!data.accessToken) return null;
        return data;
      } catch (error) {
        console.error("Failed to decrypt Notion token:", error);
        return null;
      }
    }

    // Check unencrypted storage (sessionStorage fallback)
    const sessionStored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (sessionStored) {
      const data = JSON.parse(sessionStored) as StoredTokenData;
      if (!data.accessToken) return null;
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Clear stored token data from all storage locations
 */
export function clearNotionToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Check if token is expired
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
 * Migrate unencrypted tokens to encrypted format
 * Call this when wallet/encryption key becomes available after OAuth
 */
export async function migrateNotionToken(walletAddress: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!walletAddress || !hasEncryptionKey(walletAddress)) return false;

  try {
    // Check for unencrypted token in sessionStorage
    const sessionStored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!sessionStored) return false;

    // Check if localStorage already has encrypted version
    const localStored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (localStored?.startsWith(ENCRYPTED_PREFIX)) {
      // Already encrypted, just clean up session
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return false;
    }

    // Migrate: encrypt and move to localStorage
    const data = JSON.parse(sessionStored) as StoredTokenData;
    await storeTokenData(data, walletAddress);

    // Clear unencrypted version
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);

    return true;
  } catch (error) {
    console.error("Failed to migrate Notion token:", error);
    return false;
  }
}

// ============================================================================
// CLIENT REGISTRATION
// ============================================================================

/**
 * Get stored client registration
 */
function getClientRegistration(): ClientRegistration | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(CLIENT_REGISTRATION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ClientRegistration;
  } catch {
    return null;
  }
}

/**
 * Store client registration
 */
function storeClientRegistration(registration: ClientRegistration): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLIENT_REGISTRATION_KEY, JSON.stringify(registration));
}

/**
 * Ensure client is registered (stores the provided client ID)
 */
async function ensureClientRegistration(
  clientId: string
): Promise<ClientRegistration> {
  const existing = getClientRegistration();
  if (existing && existing.clientId === clientId) {
    return existing;
  }

  const registration: ClientRegistration = {
    clientId,
    registeredAt: Date.now(),
  };
  storeClientRegistration(registration);

  return registration;
}

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Start the Notion OAuth flow with PKCE
 * Redirects to Notion authorization page
 *
 * @param clientId - Your Notion OAuth client ID
 * @param callbackPath - The path for OAuth callback (e.g., "/auth/notion/callback")
 */
export async function startNotionAuth(
  clientId: string,
  callbackPath: string
): Promise<never> {
  await ensureClientRegistration(clientId);

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store PKCE state for callback
  storePKCEState({ codeVerifier, codeChallenge, state });
  storeNotionReturnUrl();

  // Build authorization URL
  const redirectUri = getRedirectUri(callbackPath);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    owner: "user",
  });

  window.location.href = `${NOTION_OAUTH_AUTHORIZE}?${params.toString()}`;

  return new Promise(() => {});
}

/**
 * Check if current URL is a Notion OAuth callback
 */
export function isNotionCallback(callbackPath: string): boolean {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedPKCE = sessionStorage.getItem(PKCE_STORAGE_KEY);

  if (!storedPKCE) return false;

  try {
    const pkce = JSON.parse(storedPKCE) as PKCEState;
    return (
      url.pathname === callbackPath &&
      !!code &&
      !!state &&
      state === pkce.state
    );
  } catch {
    return false;
  }
}

/**
 * Handle the OAuth callback - exchange code for tokens
 * This is done directly with Notion (no backend needed due to PKCE)
 *
 * @param callbackPath - The callback path used during authorization
 * @param walletAddress - Wallet address for token encryption (optional)
 * @param clientId - Your Notion OAuth client ID
 */
export async function handleNotionCallback(
  callbackPath: string,
  walletAddress: string | undefined,
  clientId: string
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth error
  if (error) {
    const errorDescription = url.searchParams.get("error_description");
    throw new Error(`Notion OAuth error: ${error} - ${errorDescription}`);
  }

  // Get and validate PKCE state
  const pkceState = getAndClearPKCEState();
  if (!pkceState || !code || !state || state !== pkceState.state) {
    throw new Error("Invalid OAuth state - possible CSRF attack");
  }

  // Exchange code for tokens (direct to Notion - no backend needed)
  const redirectUri = getRedirectUri(callbackPath);

  const tokenResponse = await fetch(NOTION_OAUTH_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: pkceState.codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json().catch(() => ({}));
    throw new Error(
      `Token exchange failed: ${tokenResponse.status} - ${JSON.stringify(errorData)}`
    );
  }

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    throw new Error("No access token in response");
  }

  // Build stored token data
  const storedData: StoredTokenData = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    scope: tokenData.scope,
  };

  if (tokenData.expires_in) {
    storedData.expiresAt = Date.now() + tokenData.expires_in * 1000;
  }

  // Store tokens (encrypted if wallet available, sessionStorage otherwise)
  await storeTokenData(storedData, walletAddress ?? "");

  // Clean up URL
  window.history.replaceState({}, "", window.location.pathname);

  return tokenData.access_token;
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshNotionToken(
  walletAddress: string | undefined,
  clientId: string
): Promise<string | null> {
  const storedData = await getStoredTokenData(walletAddress);
  const refreshToken = storedData?.refreshToken;

  if (!refreshToken) return null;

  try {
    const response = await fetch(NOTION_OAUTH_TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // If invalid_grant, user needs to re-authenticate
      if (errorData.error === "invalid_grant") {
        clearNotionToken();
        return null;
      }

      throw new Error(`Token refresh failed: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await response.json();

    if (!tokenData.access_token) {
      throw new Error("No access token in refresh response");
    }

    // Update stored tokens
    const newStoredData: StoredTokenData = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? refreshToken,
      scope: tokenData.scope ?? storedData?.scope,
    };

    if (tokenData.expires_in) {
      newStoredData.expiresAt = Date.now() + tokenData.expires_in * 1000;
    }

    await storeTokenData(newStoredData, walletAddress ?? "");

    return tokenData.access_token;
  } catch (error) {
    console.error("Notion token refresh failed:", error);
    clearNotionToken();
    return null;
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getNotionAccessToken(
  walletAddress: string | undefined,
  clientId: string
): Promise<string | null> {
  const storedData = await getStoredTokenData(walletAddress);

  if (!storedData) {
    return null;
  }

  // If token is not expired, use it
  if (!isTokenExpired(storedData)) {
    return storedData.accessToken;
  }

  // Try to refresh
  if (storedData.refreshToken) {
    const refreshedToken = await refreshNotionToken(walletAddress, clientId);
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
 * Check if we have any stored Notion credentials
 */
export function hasNotionCredentials(): boolean {
  if (typeof window === "undefined") return false;

  const localStored = localStorage.getItem(TOKEN_STORAGE_KEY);
  const sessionStored = sessionStorage.getItem(TOKEN_STORAGE_KEY);

  return !!(localStored || sessionStored);
}

/**
 * Revoke Notion access (clears local tokens)
 * Note: User must revoke via Notion settings for complete revocation
 */
export function revokeNotionAccess(): void {
  clearNotionToken();
  localStorage.removeItem(CLIENT_REGISTRATION_KEY);
}

// ============================================================================
// URL & MESSAGE HELPERS
// ============================================================================

/**
 * Get the redirect URI for OAuth callback
 */
function getRedirectUri(callbackPath: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${callbackPath}`;
}

/**
 * Store the return URL for after OAuth completes
 */
export function storeNotionReturnUrl(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RETURN_URL_KEY, window.location.href);
}

/**
 * Get and clear the stored return URL
 */
export function getAndClearNotionReturnUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem(RETURN_URL_KEY);
  sessionStorage.removeItem(RETURN_URL_KEY);
  return url;
}

/**
 * Store a pending message to retry after OAuth completes
 */
export function storeNotionPendingMessage(message: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_MESSAGE_KEY, message);
}

/**
 * Get and clear the pending message
 */
export function getAndClearNotionPendingMessage(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(PENDING_MESSAGE_KEY);
  sessionStorage.removeItem(PENDING_MESSAGE_KEY);
  return message;
}

// ============================================================================
// MCP CONNECTION
// ============================================================================

/**
 * Get the Notion MCP server URL for tool connections
 */
export function getNotionMCPUrl(): string {
  return NOTION_MCP_BASE;
}
