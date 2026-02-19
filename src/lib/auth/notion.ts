/**
 * Notion MCP OAuth 2.0 with PKCE and Dynamic Client Registration (RFC 7591)
 *
 * This is a fully client-side OAuth implementation - NO BACKEND REQUIRED.
 * Uses Dynamic Client Registration - no pre-configured client ID needed.
 * PKCE eliminates the need for a client secret by using a code verifier/challenge pair.
 *
 * Tokens are encrypted using the user's wallet-derived encryption key before storage,
 * ensuring privacy-first token persistence.
 *
 * Flow:
 * 1. Discover OAuth endpoints from /.well-known/ URLs
 * 2. Dynamically register client (RFC 7591) to get client_id
 * 3. Generate code_verifier (random string) and code_challenge (SHA-256 hash)
 * 4. Redirect to Notion OAuth with code_challenge
 * 5. User approves access
 * 6. Exchange auth code + code_verifier for tokens (no secret needed)
 * 7. Encrypt and store tokens in localStorage using wallet-derived key
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

/**
 * Get wallet-scoped storage key for localStorage.
 * With wallet: "oauth_token_notion:{walletAddress}" (per-user isolation)
 * Without wallet: "oauth_token_notion" (fallback for sessionStorage / legacy)
 */
function getTokenStorageKey(walletAddress?: string): string {
  if (walletAddress) {
    return `${TOKEN_STORAGE_KEY}:${walletAddress}`;
  }
  return TOKEN_STORAGE_KEY;
}
const PKCE_STORAGE_KEY = "notion_oauth_pkce";
const RETURN_URL_KEY = "notion_return_url";
const PENDING_MESSAGE_KEY = "notion_pending_message";
const CLIENT_REGISTRATION_KEY = "notion_oauth_client";
const OAUTH_METADATA_KEY = "notion_oauth_metadata";

/**
 * Get wallet-scoped storage key for client registration.
 * With wallet: "notion_oauth_client:{walletAddress}" (per-user isolation)
 * Without wallet: "notion_oauth_client" (fallback for sessionStorage / legacy)
 */
function getClientRegistrationStorageKey(walletAddress?: string): string {
  if (walletAddress) {
    return `${CLIENT_REGISTRATION_KEY}:${walletAddress}`;
  }
  return CLIENT_REGISTRATION_KEY;
}

// Notion MCP endpoints for discovery
const NOTION_MCP_BASE = "https://mcp.notion.com";
const WELL_KNOWN_RESOURCE = `${NOTION_MCP_BASE}/.well-known/oauth-protected-resource`;

// Fallback OAuth endpoints (used if discovery fails)
const FALLBACK_OAUTH_AUTHORIZE = "https://api.notion.com/v1/oauth/authorize";
const FALLBACK_OAUTH_TOKEN = "https://api.notion.com/v1/oauth/token";
const FALLBACK_REGISTRATION = "https://api.notion.com/v1/oauth/register";

// Default token expiry (1 hour) when server doesn't provide expires_in
const DEFAULT_TOKEN_EXPIRY_SECONDS = 3600;

// Encrypted storage prefix
const ENCRYPTED_PREFIX = "enc:oauth:";

// In-memory cache for sync access (populated by async operations)
let cachedAccessToken: string | null = null;
let cachedExpiresAt: number | null = null;

// Token storage types
interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}

// Client registration data (from dynamic registration)
interface ClientRegistration {
  clientId: string;
  clientSecret?: string;
  registeredAt: number;
  redirectUri: string;
}

// OAuth server metadata (from discovery)
interface OAuthMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  code_challenge_methods_supported?: string[];
}

// Resource server metadata
interface ResourceMetadata {
  resource: string;
  authorization_servers: string[];
}

// ============================================================================
// OAUTH DISCOVERY (RFC 8414)
// ============================================================================

/**
 * Discover OAuth server metadata from well-known endpoints
 * This follows the OAuth 2.0 Authorization Server Metadata spec (RFC 8414)
 */
async function discoverOAuthMetadata(): Promise<OAuthMetadata> {
  try {
    // Step 1: Get protected resource metadata to find authorization server
    const resourceResponse = await fetch(WELL_KNOWN_RESOURCE);
    if (!resourceResponse.ok) {
      throw new Error(`Resource discovery failed: ${resourceResponse.status}`);
    }
    const resourceData: ResourceMetadata = await resourceResponse.json();

    // Get the authorization server URL
    const authServer = resourceData.authorization_servers?.[0];
    if (!authServer) {
      throw new Error("No authorization server found in resource metadata");
    }

    // Step 2: Get authorization server metadata
    const authServerMetadataUrl = `${authServer}/.well-known/oauth-authorization-server`;
    const metadataResponse = await fetch(authServerMetadataUrl);
    if (!metadataResponse.ok) {
      throw new Error(`Auth server metadata fetch failed: ${metadataResponse.status}`);
    }

    const metadata: OAuthMetadata = await metadataResponse.json();

    // Cache metadata for future use
    if (typeof window !== "undefined") {
      sessionStorage.setItem(OAUTH_METADATA_KEY, JSON.stringify(metadata));
    }

    return metadata;
  } catch (error) {
    // Discovery failed, use fallback endpoints
    return {
      authorization_endpoint: FALLBACK_OAUTH_AUTHORIZE,
      token_endpoint: FALLBACK_OAUTH_TOKEN,
      registration_endpoint: FALLBACK_REGISTRATION,
      code_challenge_methods_supported: ["S256"],
    };
  }
}

/**
 * Get cached OAuth metadata or discover it
 */
async function getOAuthMetadata(): Promise<OAuthMetadata> {
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem(OAUTH_METADATA_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as OAuthMetadata;
      } catch {
        // Invalid cache, re-discover
      }
    }
  }
  return discoverOAuthMetadata();
}

// ============================================================================
// DYNAMIC CLIENT REGISTRATION (RFC 7591)
// ============================================================================

/**
 * Register a new OAuth client dynamically
 * This follows RFC 7591 - OAuth 2.0 Dynamic Client Registration
 */
async function registerClient(
  registrationEndpoint: string,
  redirectUri: string,
  walletAddress?: string
): Promise<ClientRegistration> {
  const clientName = "Reverbia";

  const registrationRequest = {
    client_name: clientName,
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none", // Public client (PKCE)
  };

  const response = await fetch(registrationEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(registrationRequest),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Client registration failed: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();

  if (!data.client_id) {
    throw new Error("No client_id in registration response");
  }

  const registration: ClientRegistration = {
    clientId: data.client_id,
    clientSecret: data.client_secret,
    registeredAt: Date.now(),
    redirectUri,
  };

  // Store registration for reuse (encrypted if wallet available)
  await storeClientRegistration(registration, walletAddress);

  return registration;
}

/**
 * Ensure we have a valid client registration for the given redirect URI
 * Returns existing registration if valid, or registers a new client
 */
async function ensureClientRegistration(
  redirectUri: string,
  walletAddress?: string
): Promise<ClientRegistration> {
  // Check for existing registration
  const existing = await getClientRegistration(walletAddress);
  if (existing && existing.redirectUri === redirectUri) {
    // Always write a sessionStorage copy so the callback page can read it
    // even if the encryption key isn't initialized yet after the redirect.
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CLIENT_REGISTRATION_KEY, JSON.stringify(existing));
    }
    return existing;
  }

  // Need to register a new client
  const metadata = await getOAuthMetadata();

  if (!metadata.registration_endpoint) {
    throw new Error("OAuth server does not support dynamic client registration");
  }

  return registerClient(metadata.registration_endpoint, redirectUri, walletAddress);
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
  walletAddress?: string
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
      localStorage.setItem(getTokenStorageKey(walletAddress), `${ENCRYPTED_PREFIX}${encrypted}`);
      return;
    } catch {
      // Encryption failed, fall through to sessionStorage
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
    // Check encrypted storage first (localStorage, wallet-scoped key)
    const stored = localStorage.getItem(getTokenStorageKey(walletAddress));
    if (stored?.startsWith(ENCRYPTED_PREFIX)) {
      if (walletAddress && hasEncryptionKey(walletAddress)) {
        try {
          const cryptoKey = await getEncryptionKey(walletAddress);
          const encrypted = stored.slice(ENCRYPTED_PREFIX.length);
          const decrypted = await decryptDataWithKey(encrypted, cryptoKey);
          const data = JSON.parse(decrypted) as StoredTokenData;
          if (data.accessToken) return data;
        } catch {
          // Decryption failed, fall through to sessionStorage
        }
      }
      // No wallet, key not ready, or decryption failed — fall through to sessionStorage
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
export function clearNotionToken(walletAddress?: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getTokenStorageKey(walletAddress));
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  cachedAccessToken = null;
  cachedExpiresAt = null;
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

    // If localStorage has a stale encrypted token, remove it so the fresh
    // sessionStorage token takes precedence during migration.
    const scopedKey = getTokenStorageKey(walletAddress);
    const localStored = localStorage.getItem(scopedKey);
    if (localStored?.startsWith(ENCRYPTED_PREFIX)) {
      localStorage.removeItem(scopedKey);
    }

    // Migrate: encrypt and move to localStorage
    const data = JSON.parse(sessionStored) as StoredTokenData;
    await storeTokenData(data, walletAddress);

    // Verify encryption succeeded (token landed in localStorage, not sessionStorage fallback)
    const migrated = localStorage.getItem(scopedKey);
    if (!migrated?.startsWith(ENCRYPTED_PREFIX)) {
      return false;
    }

    // Clear unencrypted version only after confirmed migration
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);

    return true;
  } catch {
    // Migration failed, token will remain in sessionStorage
    return false;
  }
}

/**
 * Migrate unencrypted client registration to encrypted format.
 * Call this when wallet/encryption key becomes available.
 *
 * Checks two sources:
 * 1. sessionStorage fallback (from startNotionAuth when wallet was unavailable)
 * 2. Legacy plain-text localStorage (from before encryption was added)
 */
export async function migrateNotionClientRegistration(
  walletAddress: string
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!walletAddress || !hasEncryptionKey(walletAddress)) return false;

  try {
    // Source 1: sessionStorage fallback
    const sessionStored = sessionStorage.getItem(CLIENT_REGISTRATION_KEY);

    // Source 2: legacy unencrypted localStorage
    const legacyStored = localStorage.getItem(CLIENT_REGISTRATION_KEY);
    const isLegacyUnencrypted =
      legacyStored && !legacyStored.startsWith(ENCRYPTED_PREFIX);

    // Pick the freshest source (prefer sessionStorage if both exist)
    const unencryptedJson = sessionStored || (isLegacyUnencrypted ? legacyStored : null);
    if (!unencryptedJson) return false;

    // Check if we already have an encrypted registration for this wallet
    const scopedKey = getClientRegistrationStorageKey(walletAddress);
    const existingEncrypted = localStorage.getItem(scopedKey);
    if (existingEncrypted?.startsWith(ENCRYPTED_PREFIX)) {
      // Already migrated -- just clean up unencrypted sources
      sessionStorage.removeItem(CLIENT_REGISTRATION_KEY);
      if (isLegacyUnencrypted) {
        localStorage.removeItem(CLIENT_REGISTRATION_KEY);
      }
      return true;
    }

    // Parse and re-store with encryption
    const data = JSON.parse(unencryptedJson) as ClientRegistration;
    await storeClientRegistration(data, walletAddress);

    // Verify encryption succeeded
    const migrated = localStorage.getItem(scopedKey);
    if (!migrated?.startsWith(ENCRYPTED_PREFIX)) {
      return false;
    }

    // Clear unencrypted sources only after confirmed migration
    sessionStorage.removeItem(CLIENT_REGISTRATION_KEY);
    if (isLegacyUnencrypted) {
      localStorage.removeItem(CLIENT_REGISTRATION_KEY);
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// CLIENT REGISTRATION
// ============================================================================

/**
 * Get stored client registration with decryption using wallet-derived CryptoKey
 *
 * @param walletAddress - Wallet address to get the decryption key
 */
async function getClientRegistration(
  walletAddress?: string
): Promise<ClientRegistration | null> {
  if (typeof window === "undefined") return null;

  try {
    // Check encrypted storage first (localStorage, wallet-scoped key)
    const scopedKey = getClientRegistrationStorageKey(walletAddress);
    const stored = localStorage.getItem(scopedKey);

    if (stored?.startsWith(ENCRYPTED_PREFIX)) {
      if (walletAddress && hasEncryptionKey(walletAddress)) {
        try {
          const cryptoKey = await getEncryptionKey(walletAddress);
          const encrypted = stored.slice(ENCRYPTED_PREFIX.length);
          const decrypted = await decryptDataWithKey(encrypted, cryptoKey);
          const data = JSON.parse(decrypted) as ClientRegistration;
          if (data.clientId) {
            return data;
          }
        } catch {
          // Decryption failed, fall through to sessionStorage
        }
      }
      // Key not ready or decryption failed — fall through to sessionStorage
    }

    // Check for unencrypted data in localStorage (legacy / pre-migration)
    if (stored && !stored.startsWith(ENCRYPTED_PREFIX)) {
      const data = JSON.parse(stored) as ClientRegistration;
      if (!data.clientId) return null;
      return data;
    }

    // Check sessionStorage fallback
    const sessionStored = sessionStorage.getItem(CLIENT_REGISTRATION_KEY);
    if (sessionStored) {
      const data = JSON.parse(sessionStored) as ClientRegistration;
      if (!data.clientId) return null;
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Store client registration with encryption using wallet-derived CryptoKey
 *
 * @param registration - Client registration data to store
 * @param walletAddress - Wallet address to get the encryption key
 */
async function storeClientRegistration(
  registration: ClientRegistration,
  walletAddress?: string
): Promise<void> {
  if (typeof window === "undefined") return;

  const json = JSON.stringify(registration);

  // Always store in sessionStorage so the registration survives the OAuth
  // redirect even if the encryption key isn't available yet on the callback page.
  // Migration will clean this up once the encrypted copy is confirmed.
  sessionStorage.setItem(CLIENT_REGISTRATION_KEY, json);

  // Also store encrypted in localStorage for persistence across sessions
  if (walletAddress && hasEncryptionKey(walletAddress)) {
    try {
      const cryptoKey = await getEncryptionKey(walletAddress);
      const encrypted = await encryptDataWithKey(json, cryptoKey);
      const scopedKey = getClientRegistrationStorageKey(walletAddress);
      localStorage.setItem(scopedKey, `${ENCRYPTED_PREFIX}${encrypted}`);
    } catch {
      // Encryption failed; sessionStorage fallback is already in place
    }
  }
}

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Start the Notion OAuth flow with PKCE and Dynamic Client Registration
 * Redirects to Notion authorization page
 *
 * No client ID needed - uses dynamic registration (RFC 7591)
 *
 * @param callbackPath - The path for OAuth callback (e.g., "/auth/notion/callback")
 */
export async function startNotionAuth(
  callbackPath: string,
  walletAddress?: string
): Promise<never> {
  // Get redirect URI and ensure client is registered
  const redirectUri = getRedirectUri(callbackPath);
  const registration = await ensureClientRegistration(redirectUri, walletAddress);

  // Get OAuth metadata for authorization endpoint
  const metadata = await getOAuthMetadata();

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store PKCE state for callback
  storePKCEState({ codeVerifier, codeChallenge, state });
  storeNotionReturnUrl();

  // Build authorization URL using discovered endpoint and registered client
  const params = new URLSearchParams({
    client_id: registration.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    owner: "user",
  });

  window.location.href = `${metadata.authorization_endpoint}?${params.toString()}`;

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
 */
export async function handleNotionCallback(
  callbackPath: string,
  walletAddress: string | undefined
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

  // Get stored client registration (created during startNotionAuth)
  const registration = await getClientRegistration(walletAddress);
  if (!registration) {
    throw new Error("No client registration found - OAuth flow may have been interrupted");
  }

  // Get OAuth metadata for token endpoint
  const metadata = await getOAuthMetadata();

  // Exchange code for tokens (direct to Notion - no backend needed)
  const redirectUri = getRedirectUri(callbackPath);

  // Build form-urlencoded body (required by Notion's token endpoint)
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: registration.clientId,
    code_verifier: pkceState.codeVerifier,
  });

  const tokenResponse = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenBody.toString(),
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
  } else {
    storedData.expiresAt = Date.now() + DEFAULT_TOKEN_EXPIRY_SECONDS * 1000;
  }

  // Store tokens (encrypted if wallet available, sessionStorage otherwise)
  await storeTokenData(storedData, walletAddress);

  // Update in-memory cache
  cachedAccessToken = tokenData.access_token;
  cachedExpiresAt = storedData.expiresAt ?? null;

  // Clean up URL
  window.history.replaceState({}, "", window.location.pathname);

  return tokenData.access_token;
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshNotionToken(
  walletAddress: string | undefined
): Promise<string | null> {
  const storedData = await getStoredTokenData(walletAddress);
  const refreshToken = storedData?.refreshToken;

  if (!refreshToken) return null;

  // Get stored client registration
  const registration = await getClientRegistration(walletAddress);
  if (!registration) {
    // No client registration found, user needs to re-authenticate
    return null;
  }

  // Get OAuth metadata for token endpoint
  const metadata = await getOAuthMetadata();

  try {
    // Build form-urlencoded body (required by Notion's token endpoint)
    const refreshBody = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: registration.clientId,
    });

    const response = await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: refreshBody.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // If invalid_grant, user needs to re-authenticate
      if (errorData.error === "invalid_grant") {
        clearNotionToken(walletAddress);
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
    } else {
      newStoredData.expiresAt = Date.now() + DEFAULT_TOKEN_EXPIRY_SECONDS * 1000;
    }

    await storeTokenData(newStoredData, walletAddress);

    // Update in-memory cache
    cachedAccessToken = tokenData.access_token;
    cachedExpiresAt = newStoredData.expiresAt ?? null;

    return tokenData.access_token;
  } catch {
    // Refresh failed, clearing stored token
    clearNotionToken(walletAddress);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getNotionAccessToken(
  walletAddress: string | undefined
): Promise<string | null> {
  const storedData = await getStoredTokenData(walletAddress);

  if (!storedData) {
    cachedAccessToken = null;
    cachedExpiresAt = null;
    return null;
  }

  // If token is not expired, use it
  if (!isTokenExpired(storedData)) {
    cachedAccessToken = storedData.accessToken;
    cachedExpiresAt = storedData.expiresAt ?? null;
    return storedData.accessToken;
  }

  // Try to refresh
  if (storedData.refreshToken) {
    const refreshedToken = await refreshNotionToken(walletAddress);
    if (refreshedToken) {
      return refreshedToken;
    }
  }

  cachedAccessToken = null;
  cachedExpiresAt = null;
  return null;
}

/**
 * Synchronous getter for the current Notion access token.
 * Reads from the in-memory cache populated by async operations
 * (getNotionAccessToken, handleNotionCallback, refreshNotionToken).
 * Matches the sync signature required by tool factories in src/tools/notion.ts.
 */
export function getValidNotionToken(): string | null {
  if (!cachedAccessToken) return null;
  if (cachedExpiresAt && cachedExpiresAt - 60_000 <= Date.now()) {
    return null;
  }
  return cachedAccessToken;
}

/**
 * Check if we have any stored Notion credentials
 */
export function hasNotionCredentials(walletAddress?: string): boolean {
  if (typeof window === "undefined") return false;

  const localStored = localStorage.getItem(getTokenStorageKey(walletAddress));
  const sessionStored = sessionStorage.getItem(TOKEN_STORAGE_KEY);

  return !!(localStored || sessionStored);
}

/**
 * Revoke Notion access (clears local tokens)
 * Note: User must revoke via Notion settings for complete revocation
 */
export function revokeNotionAccess(walletAddress?: string): void {
  clearNotionToken(walletAddress);
  // Clear wallet-scoped encrypted client registration
  localStorage.removeItem(getClientRegistrationStorageKey(walletAddress));
  // Clear legacy unencrypted client registration
  localStorage.removeItem(CLIENT_REGISTRATION_KEY);
  // Clear sessionStorage fallback
  sessionStorage.removeItem(CLIENT_REGISTRATION_KEY);
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
