/**
 * Notion MCP OAuth 2.0 Primitives — platform-agnostic, zero browser globals.
 *
 * These functions expose the low-level HTTP operations needed to perform
 * the Notion OAuth 2.0 + PKCE + Dynamic Client Registration flow.
 * They depend only on `fetch` and `crypto` (both available in React Native
 * with the polyfills documented in the expo module).
 *
 * Use these from Expo / React Native where `window`, `localStorage`, and
 * `sessionStorage` are not available.  The web SDK (`notion.ts`) handles
 * the same flow with browser storage & redirects on top of these primitives.
 *
 * @module
 */

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

/** Well-known Notion MCP OAuth endpoints (fallback values). */
export const NOTION_OAUTH_CONFIG = {
  /** Base URL for the Notion MCP server. */
  mcpBase: "https://mcp.notion.com",
  /** Fallback authorization endpoint. */
  authorizationEndpoint: "https://api.notion.com/v1/oauth/authorize",
  /** Fallback token endpoint. */
  tokenEndpoint: "https://api.notion.com/v1/oauth/token",
  /** Fallback dynamic client registration endpoint (RFC 7591). */
  registrationEndpoint: "https://api.notion.com/v1/oauth/register",
} as const;

/** Default token expiry (8 hours) when server doesn't provide expires_in. */
const DEFAULT_TOKEN_EXPIRY_SECONDS = 8 * 3600;

/** Endpoints discovered via RFC 8414 OAuth Server Metadata. */
export interface NotionOAuthEndpoints {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  code_challenge_methods_supported?: string[];
}

/** Result of dynamic client registration (RFC 7591). */
export interface NotionClientRegistration {
  clientId: string;
  clientSecret?: string;
  registeredAt: number;
  redirectUri: string;
}

/** PKCE challenge pair + CSRF state. */
export interface NotionPKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/** Token response from the token endpoint. */
export interface NotionTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
}

/** Parameters for {@link buildNotionAuthUrl}. */
export interface NotionAuthUrlParams {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}

/** Parameters for {@link exchangeNotionCode}. */
export interface NotionExchangeCodeParams {
  tokenEndpoint: string;
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
}

/** Parameters for {@link refreshNotionAccessToken}. */
export interface NotionRefreshTokenParams {
  tokenEndpoint: string;
  refreshToken: string;
  clientId: string;
}

// ── Raw API response shapes (internal) ──

/** Shape of the registration endpoint JSON response. */
interface RegistrationResponse {
  client_id?: string;
  client_secret?: string;
}

/** Shape of the token endpoint JSON response. */
interface TokenEndpointResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

// ============================================================================
// PKCE UTILITIES
// ============================================================================

/**
 * Base64url encode (RFC 4648) — URL-safe base64 without padding.
 */
function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Generate a cryptographically random code verifier for PKCE.
 * 43-128 unreserved URI characters per RFC 7636.
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Derive a code challenge from a verifier using SHA-256.
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Generate a random hex state string for CSRF protection.
 */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// DISCOVERY (RFC 8414)
// ============================================================================

/**
 * Discover OAuth server metadata from Notion's well-known endpoints.
 *
 * Follows the two-step RFC 8414 flow:
 * 1. `/.well-known/oauth-protected-resource` to find the authorization server.
 * 2. `<authServer>/.well-known/oauth-authorization-server` for metadata.
 *
 * Falls back to {@link NOTION_OAUTH_CONFIG} if discovery fails.
 */
export async function discoverNotionOAuthEndpoints(): Promise<NotionOAuthEndpoints> {
  try {
    const resourceUrl = `${NOTION_OAUTH_CONFIG.mcpBase}/.well-known/oauth-protected-resource`;
    const resourceResponse = await fetch(resourceUrl);
    if (!resourceResponse.ok) {
      throw new Error(`Resource discovery failed: ${resourceResponse.status}`);
    }
    const resourceData = (await resourceResponse.json()) as {
      resource: string;
      authorization_servers?: string[];
    };

    const authServer = resourceData.authorization_servers?.[0];
    if (!authServer) {
      throw new Error("No authorization server found in resource metadata");
    }

    const metadataUrl = `${authServer}/.well-known/oauth-authorization-server`;
    const metadataResponse = await fetch(metadataUrl);
    if (!metadataResponse.ok) {
      throw new Error(`Auth server metadata fetch failed: ${metadataResponse.status}`);
    }

    return (await metadataResponse.json()) as NotionOAuthEndpoints;
  } catch {
    // Discovery failed — return hardcoded fallback endpoints.
    return {
      authorization_endpoint: NOTION_OAUTH_CONFIG.authorizationEndpoint,
      token_endpoint: NOTION_OAUTH_CONFIG.tokenEndpoint,
      registration_endpoint: NOTION_OAUTH_CONFIG.registrationEndpoint,
      code_challenge_methods_supported: ["S256"],
    };
  }
}

// ============================================================================
// DYNAMIC CLIENT REGISTRATION (RFC 7591)
// ============================================================================

/**
 * Register a new OAuth client dynamically.
 *
 * Registers as a **public client** (`token_endpoint_auth_method: "none"`)
 * so no client secret is needed for token exchange (PKCE is used instead).
 *
 * @param registrationEndpoint - The RFC 7591 registration endpoint URL.
 * @param redirectUri - Redirect URI to register for this client.
 * @param clientName - Human-readable name shown in Notion's consent screen.
 */
export async function registerNotionClient(
  registrationEndpoint: string,
  redirectUri: string,
  clientName = "Anuma"
): Promise<NotionClientRegistration> {
  const response = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: clientName,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => ({}));
    throw new Error(
      `Client registration failed: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as RegistrationResponse;

  if (!data.client_id) {
    throw new Error("No client_id in registration response");
  }

  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
    registeredAt: Date.now(),
    redirectUri,
  };
}

// ============================================================================
// PKCE GENERATION
// ============================================================================

/**
 * Generate a fresh PKCE challenge (code verifier + code challenge + state).
 *
 * The caller is responsible for storing the `codeVerifier` securely
 * (e.g. in `expo-secure-store`) so it can be presented during token exchange.
 */
export async function generateNotionPKCE(): Promise<NotionPKCEChallenge> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();
  return { codeVerifier, codeChallenge, state };
}

// ============================================================================
// AUTHORIZATION URL
// ============================================================================

/**
 * Build the Notion authorization URL for the OAuth flow.
 *
 * Returns a URL string that the caller should open in a browser
 * (e.g. via `expo-auth-session` or `Linking.openURL`).
 */
export function buildNotionAuthUrl(params: NotionAuthUrlParams): string {
  const searchParams = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
    owner: "user",
  });
  return `${params.authorizationEndpoint}?${searchParams.toString()}`;
}

// ============================================================================
// TOKEN EXCHANGE
// ============================================================================

/**
 * Exchange an authorization code for tokens.
 *
 * This is a **public client** request — no `client_secret` is sent.
 * The `code_verifier` proves possession of the original challenge.
 */
export async function exchangeNotionCode(
  params: NotionExchangeCodeParams
): Promise<NotionTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const tokenData = (await response.json()) as TokenEndpointResponse;

  if (!tokenData.access_token) {
    throw new Error("No access token in response");
  }

  const result: NotionTokenResponse = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    scope: tokenData.scope,
  };

  if (tokenData.expires_in) {
    result.expiresAt = Date.now() + tokenData.expires_in * 1000;
  } else {
    result.expiresAt = Date.now() + DEFAULT_TOKEN_EXPIRY_SECONDS * 1000;
  }

  return result;
}

// ============================================================================
// TOKEN REFRESH
// ============================================================================

/**
 * Refresh an access token using a refresh token.
 *
 * This is a **public client** request — no `client_secret` is sent.
 */
export async function refreshNotionAccessToken(
  params: NotionRefreshTokenParams
): Promise<NotionTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  });

  const response = await fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => ({}));
    throw new Error(`Token refresh failed: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const tokenData = (await response.json()) as TokenEndpointResponse;

  if (!tokenData.access_token) {
    throw new Error("No access token in refresh response");
  }

  const result: NotionTokenResponse = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? params.refreshToken,
    scope: tokenData.scope,
  };

  if (tokenData.expires_in) {
    result.expiresAt = Date.now() + tokenData.expires_in * 1000;
  } else {
    result.expiresAt = Date.now() + DEFAULT_TOKEN_EXPIRY_SECONDS * 1000;
  }

  return result;
}
