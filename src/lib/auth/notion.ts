import {
  decryptDataWithKey,
  encryptDataWithKey,
  getEncryptionKey,
  hasEncryptionKey,
} from "../../react/useEncryption";
import { getLogger } from "../logger";
import { parsePlaintextToken, type PlaintextTokenRecord, readPlaintextToken } from "./tokenRows";

const TOKEN_STORAGE_KEY = "oauth_token_notion";

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

function getClientRegistrationStorageKey(walletAddress?: string): string {
  if (walletAddress) {
    return `${CLIENT_REGISTRATION_KEY}:${walletAddress}`;
  }
  return CLIENT_REGISTRATION_KEY;
}

const NOTION_MCP_BASE = "https://mcp.notion.com";
const WELL_KNOWN_RESOURCE = `${NOTION_MCP_BASE}/.well-known/oauth-protected-resource`;

const FALLBACK_OAUTH_AUTHORIZE = "https://api.notion.com/v1/oauth/authorize";
const FALLBACK_OAUTH_TOKEN = "https://api.notion.com/v1/oauth/token";
const FALLBACK_REGISTRATION = "https://api.notion.com/v1/oauth/register";

const DEFAULT_TOKEN_EXPIRY_SECONDS = 8 * 3600;

const ENCRYPTED_PREFIX = "enc:oauth:";

let cachedAccessToken: string | null = null;
let cachedExpiresAt: number | null = null;
let cachedWalletAddress: string | null = null;

interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}

interface ClientRegistration {
  clientId: string;
  clientSecret?: string;
  registeredAt: number;
  redirectUri: string;
}

interface OAuthMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  code_challenge_methods_supported?: string[];
}

interface ResourceMetadata {
  resource: string;
  authorization_servers: string[];
}

interface ClientRegistrationResponse {
  client_id?: string;
  client_secret?: string;
}

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
}

async function discoverOAuthMetadata(): Promise<OAuthMetadata> {
  try {
    const resourceResponse = await fetch(WELL_KNOWN_RESOURCE);
    if (!resourceResponse.ok) {
      throw new Error(`Resource discovery failed: ${resourceResponse.status}`);
    }
    const resourceData = (await resourceResponse.json()) as ResourceMetadata;

    const authServer = resourceData.authorization_servers?.[0];
    if (!authServer) {
      throw new Error("No authorization server found in resource metadata");
    }

    const authServerMetadataUrl = `${authServer}/.well-known/oauth-authorization-server`;
    const metadataResponse = await fetch(authServerMetadataUrl);
    if (!metadataResponse.ok) {
      throw new Error(`Auth server metadata fetch failed: ${metadataResponse.status}`);
    }

    const metadata = (await metadataResponse.json()) as OAuthMetadata;

    if (typeof window !== "undefined") {
      sessionStorage.setItem(OAUTH_METADATA_KEY, JSON.stringify(metadata));
    }

    return metadata;
  } catch {
    return {
      authorization_endpoint: FALLBACK_OAUTH_AUTHORIZE,
      token_endpoint: FALLBACK_OAUTH_TOKEN,
      registration_endpoint: FALLBACK_REGISTRATION,
      code_challenge_methods_supported: ["S256"],
    };
  }
}

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

async function registerClient(
  registrationEndpoint: string,
  redirectUri: string,
  walletAddress?: string
): Promise<ClientRegistration> {
  const clientName = "Anuma";

  const registrationRequest = {
    client_name: clientName,
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };

  const response = await fetch(registrationEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(registrationRequest),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(
      `Client registration failed: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as ClientRegistrationResponse;

  if (!data.client_id) {
    throw new Error("No client_id in registration response");
  }

  const registration: ClientRegistration = {
    clientId: data.client_id,
    clientSecret: data.client_secret,
    registeredAt: Date.now(),
    redirectUri,
  };

  await storeClientRegistration(registration, walletAddress);

  return registration;
}

async function ensureClientRegistration(
  redirectUri: string,
  walletAddress?: string
): Promise<ClientRegistration> {
  const existing = await getClientRegistration(walletAddress);
  if (existing && existing.redirectUri === redirectUri) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CLIENT_REGISTRATION_KEY, JSON.stringify(existing));
    }
    return existing;
  }

  const metadata = await getOAuthMetadata();

  if (!metadata.registration_endpoint) {
    throw new Error("OAuth server does not support dynamic client registration");
  }

  return registerClient(metadata.registration_endpoint, redirectUri, walletAddress);
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

interface PKCEState {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

function storePKCEState(pkce: PKCEState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(pkce));
}

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

async function storeTokenData(data: StoredTokenData, walletAddress?: string): Promise<void> {
  if (typeof window === "undefined") return;

  const json = JSON.stringify(data);

  if (walletAddress && hasEncryptionKey(walletAddress)) {
    try {
      const cryptoKey = await getEncryptionKey(walletAddress);
      const encrypted = await encryptDataWithKey(json, cryptoKey);
      localStorage.setItem(getTokenStorageKey(walletAddress), `${ENCRYPTED_PREFIX}${encrypted}`);
      sessionStorage.removeItem(getTokenStorageKey(walletAddress));
      return;
    } catch {
      // Encryption failed, fall through to sessionStorage
    }
  }

  const record: PlaintextTokenRecord<StoredTokenData> = { wallet: walletAddress, token: data };
  sessionStorage.setItem(getTokenStorageKey(walletAddress), JSON.stringify(record));
}

async function getStoredTokenData(walletAddress?: string): Promise<StoredTokenData | null> {
  if (typeof window === "undefined") return null;

  if (
    cachedAccessToken &&
    cachedWalletAddress === (walletAddress ?? null) &&
    (!cachedExpiresAt || cachedExpiresAt - 60000 > Date.now())
  ) {
    return {
      accessToken: cachedAccessToken,
      expiresAt: cachedExpiresAt ?? undefined,
    };
  }
  if (cachedAccessToken) {
    cachedAccessToken = null;
    cachedExpiresAt = null;
    cachedWalletAddress = null;
  }

  try {
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
    }

    const plaintext = readPlaintextToken<StoredTokenData>(
      getTokenStorageKey(walletAddress),
      TOKEN_STORAGE_KEY,
      walletAddress
    );
    if (plaintext) return plaintext;

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
  sessionStorage.removeItem(getTokenStorageKey(walletAddress));
  cachedAccessToken = null;
  cachedExpiresAt = null;
  cachedWalletAddress = null;
}

function isTokenExpired(data: StoredTokenData | null, bufferSeconds = 60): boolean {
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
    const scopedKey = getTokenStorageKey(walletAddress);
    const sources: { key: string; store: Storage }[] = [
      { key: scopedKey, store: sessionStorage },
      { key: TOKEN_STORAGE_KEY, store: sessionStorage },
    ];
    let used: { key: string; store: Storage } | null = null;
    let unencryptedJson = "";
    for (const source of sources) {
      const value = source.store.getItem(source.key);
      if (value && !value.startsWith(ENCRYPTED_PREFIX)) {
        unencryptedJson = value;
        used = source;
        break;
      }
    }
    if (!used) return false;

    const localStored = localStorage.getItem(scopedKey);
    if (localStored?.startsWith(ENCRYPTED_PREFIX)) {
      localStorage.removeItem(scopedKey);
    }

    const data = parsePlaintextToken<StoredTokenData>(unencryptedJson, walletAddress);
    if (!data) return false;
    await storeTokenData(data, walletAddress);

    const migrated = localStorage.getItem(scopedKey);
    if (!migrated?.startsWith(ENCRYPTED_PREFIX)) {
      return false;
    }

    used.store.removeItem(used.key);

    return true;
  } catch {
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
export async function migrateNotionClientRegistration(walletAddress: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!walletAddress || !hasEncryptionKey(walletAddress)) return false;

  try {
    const sessionStored = sessionStorage.getItem(CLIENT_REGISTRATION_KEY);

    const legacyStored = localStorage.getItem(CLIENT_REGISTRATION_KEY);
    const isLegacyUnencrypted = legacyStored && !legacyStored.startsWith(ENCRYPTED_PREFIX);

    const unencryptedJson = sessionStored || (isLegacyUnencrypted ? legacyStored : null);
    if (!unencryptedJson) return false;

    const scopedKey = getClientRegistrationStorageKey(walletAddress);
    const existingEncrypted = localStorage.getItem(scopedKey);
    if (existingEncrypted?.startsWith(ENCRYPTED_PREFIX)) {
      sessionStorage.removeItem(CLIENT_REGISTRATION_KEY);
      if (isLegacyUnencrypted) {
        localStorage.removeItem(CLIENT_REGISTRATION_KEY);
      }
      return true;
    }

    const data = JSON.parse(unencryptedJson) as ClientRegistration;
    await storeClientRegistration(data, walletAddress);

    const migrated = localStorage.getItem(scopedKey);
    if (!migrated?.startsWith(ENCRYPTED_PREFIX)) {
      return false;
    }

    sessionStorage.removeItem(CLIENT_REGISTRATION_KEY);
    if (isLegacyUnencrypted) {
      localStorage.removeItem(CLIENT_REGISTRATION_KEY);
    }

    return true;
  } catch {
    return false;
  }
}

async function getClientRegistration(walletAddress?: string): Promise<ClientRegistration | null> {
  if (typeof window === "undefined") return null;

  try {
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
    }

    if (stored && !stored.startsWith(ENCRYPTED_PREFIX)) {
      const data = JSON.parse(stored) as ClientRegistration;
      if (!data.clientId) return null;
      return data;
    }

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

async function storeClientRegistration(
  registration: ClientRegistration,
  walletAddress?: string
): Promise<void> {
  if (typeof window === "undefined") return;

  const json = JSON.stringify(registration);

  sessionStorage.setItem(CLIENT_REGISTRATION_KEY, json);

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
  const redirectUri = getRedirectUri(callbackPath);
  const registration = await ensureClientRegistration(redirectUri, walletAddress);

  const metadata = await getOAuthMetadata();

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  storePKCEState({ codeVerifier, codeChallenge, state });
  storeNotionReturnUrl();

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
    return url.pathname === callbackPath && !!code && !!state && state === pkce.state;
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

  if (error) {
    const errorDescription = url.searchParams.get("error_description");
    throw new Error(`Notion OAuth error: ${error} - ${errorDescription}`);
  }

  const pkceState = getAndClearPKCEState();
  if (!pkceState || !code || !state || state !== pkceState.state) {
    throw new Error("Invalid OAuth state - possible CSRF attack");
  }

  const registration = await getClientRegistration(walletAddress);
  if (!registration) {
    throw new Error("No client registration found - OAuth flow may have been interrupted");
  }

  const metadata = await getOAuthMetadata();

  const redirectUri = getRedirectUri(callbackPath);

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
    const errorData = (await tokenResponse.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(
      `Token exchange failed: ${tokenResponse.status} - ${JSON.stringify(errorData)}`
    );
  }

  const tokenData = (await tokenResponse.json()) as OAuthTokenResponse;

  if (!tokenData.access_token) {
    throw new Error("No access token in response");
  }

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

  await storeTokenData(storedData, walletAddress);

  cachedAccessToken = tokenData.access_token;
  cachedExpiresAt = storedData.expiresAt ?? null;
  cachedWalletAddress = walletAddress ?? null;

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

  const registration = await getClientRegistration(walletAddress);
  if (!registration) {
    return null;
  }

  const metadata = await getOAuthMetadata();

  try {
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
      const errorData = (await response.json().catch(() => ({}))) as OAuthTokenResponse;

      if (errorData.error === "invalid_grant") {
        clearNotionToken(walletAddress);
        return null;
      }

      throw new Error(`Token refresh failed: ${JSON.stringify(errorData)}`);
    }

    const tokenData = (await response.json()) as OAuthTokenResponse;

    if (!tokenData.access_token) {
      throw new Error("No access token in refresh response");
    }

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

    cachedAccessToken = tokenData.access_token;
    cachedExpiresAt = newStoredData.expiresAt ?? null;
    cachedWalletAddress = walletAddress ?? null;

    return tokenData.access_token;
  } catch (error) {
    getLogger().error("Token refresh failed", error);
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
    cachedWalletAddress = null;
    return null;
  }

  if (!isTokenExpired(storedData)) {
    cachedAccessToken = storedData.accessToken;
    cachedExpiresAt = storedData.expiresAt ?? null;
    cachedWalletAddress = walletAddress ?? null;
    return storedData.accessToken;
  }

  if (storedData.refreshToken) {
    const refreshedToken = await refreshNotionToken(walletAddress);
    if (refreshedToken) {
      return refreshedToken;
    }
  }

  cachedAccessToken = null;
  cachedExpiresAt = null;
  cachedWalletAddress = null;
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
export async function hasNotionCredentials(walletAddress?: string): Promise<boolean> {
  const data = await getStoredTokenData(walletAddress);
  return !!(data?.accessToken || data?.refreshToken);
}

/**
 * Revoke Notion access (clears local tokens)
 * Note: User must revoke via Notion settings for complete revocation
 */
export function revokeNotionAccess(walletAddress?: string): void {
  clearNotionToken(walletAddress);
  localStorage.removeItem(getClientRegistrationStorageKey(walletAddress));
  localStorage.removeItem(CLIENT_REGISTRATION_KEY);
  sessionStorage.removeItem(CLIENT_REGISTRATION_KEY);
}

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

/**
 * Get the Notion MCP server URL for tool connections
 */
export function getNotionMCPUrl(): string {
  return NOTION_MCP_BASE;
}
