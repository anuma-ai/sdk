import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildNotionAuthUrl,
  discoverNotionOAuthEndpoints,
  exchangeNotionCode,
  generateNotionPKCE,
  NOTION_OAUTH_CONFIG,
  refreshNotionAccessToken,
  registerNotionClient,
} from "./notion-primitives";

// ── Fetch mock ──

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Tests ──

describe("Notion OAuth Primitives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  // ── Constants ──

  describe("NOTION_OAUTH_CONFIG", () => {
    it("has the expected endpoints", () => {
      expect(NOTION_OAUTH_CONFIG.mcpBase).toBe("https://mcp.notion.com");
      expect(NOTION_OAUTH_CONFIG.authorizationEndpoint).toBe(
        "https://api.notion.com/v1/oauth/authorize"
      );
      expect(NOTION_OAUTH_CONFIG.tokenEndpoint).toBe("https://api.notion.com/v1/oauth/token");
      expect(NOTION_OAUTH_CONFIG.registrationEndpoint).toBe(
        "https://api.notion.com/v1/oauth/register"
      );
    });
  });

  // ── Discovery ──

  describe("discoverNotionOAuthEndpoints", () => {
    it("discovers endpoints via well-known URLs", async () => {
      // Step 1: Protected resource metadata
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resource: "https://mcp.notion.com",
          authorization_servers: ["https://api.notion.com"],
        }),
      });

      // Step 2: Authorization server metadata
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authorization_endpoint: "https://api.notion.com/v1/oauth/authorize",
          token_endpoint: "https://api.notion.com/v1/oauth/token",
          registration_endpoint: "https://api.notion.com/v1/oauth/register",
          code_challenge_methods_supported: ["S256"],
        }),
      });

      const endpoints = await discoverNotionOAuthEndpoints();

      expect(endpoints.authorization_endpoint).toBe("https://api.notion.com/v1/oauth/authorize");
      expect(endpoints.token_endpoint).toBe("https://api.notion.com/v1/oauth/token");
      expect(endpoints.registration_endpoint).toBe("https://api.notion.com/v1/oauth/register");

      // Verify correct well-known URLs were fetched
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://mcp.notion.com/.well-known/oauth-protected-resource"
      );
      expect(mockFetch.mock.calls[1][0]).toBe(
        "https://api.notion.com/.well-known/oauth-authorization-server"
      );
    });

    it("falls back to hardcoded endpoints when resource discovery fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      });

      const endpoints = await discoverNotionOAuthEndpoints();

      expect(endpoints.authorization_endpoint).toBe(NOTION_OAUTH_CONFIG.authorizationEndpoint);
      expect(endpoints.token_endpoint).toBe(NOTION_OAUTH_CONFIG.tokenEndpoint);
      expect(endpoints.registration_endpoint).toBe(NOTION_OAUTH_CONFIG.registrationEndpoint);
      expect(endpoints.code_challenge_methods_supported).toEqual(["S256"]);
    });

    it("falls back when no authorization_servers in resource metadata", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resource: "https://mcp.notion.com",
          // no authorization_servers
        }),
      });

      const endpoints = await discoverNotionOAuthEndpoints();
      expect(endpoints.authorization_endpoint).toBe(NOTION_OAUTH_CONFIG.authorizationEndpoint);
    });

    it("falls back when auth server metadata fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resource: "https://mcp.notion.com",
          authorization_servers: ["https://api.notion.com"],
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const endpoints = await discoverNotionOAuthEndpoints();
      expect(endpoints.authorization_endpoint).toBe(NOTION_OAUTH_CONFIG.authorizationEndpoint);
    });
  });

  // ── Client Registration ──

  describe("registerNotionClient", () => {
    const registrationEndpoint = "https://api.notion.com/v1/oauth/register";
    const redirectUri = "myapp://oauth/callback";

    it("registers a client and returns registration data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          client_id: "dynamic-client-123",
          client_secret: "optional-secret",
        }),
      });

      const registration = await registerNotionClient(registrationEndpoint, redirectUri);

      expect(registration.clientId).toBe("dynamic-client-123");
      expect(registration.clientSecret).toBe("optional-secret");
      expect(registration.redirectUri).toBe(redirectUri);
      expect(registration.registeredAt).toBeGreaterThan(0);

      // Verify the request body
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.client_name).toBe("Anuma");
      expect(body.redirect_uris).toEqual([redirectUri]);
      expect(body.token_endpoint_auth_method).toBe("none");
      expect(body.grant_types).toEqual(["authorization_code", "refresh_token"]);
    });

    it("allows custom client name", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ client_id: "c1" }),
      });

      await registerNotionClient(registrationEndpoint, redirectUri, "My App");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.client_name).toBe("My App");
    });

    it("handles registration without client_secret", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ client_id: "public-client" }),
      });

      const registration = await registerNotionClient(registrationEndpoint, redirectUri);
      expect(registration.clientId).toBe("public-client");
      expect(registration.clientSecret).toBeUndefined();
    });

    it("throws on registration failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "invalid_redirect_uri" }),
      });

      await expect(registerNotionClient(registrationEndpoint, redirectUri)).rejects.toThrow(
        "Client registration failed: 400"
      );
    });

    it("throws when response has no client_id", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(registerNotionClient(registrationEndpoint, redirectUri)).rejects.toThrow(
        "No client_id in registration response"
      );
    });
  });

  // ── PKCE Generation ──

  describe("generateNotionPKCE", () => {
    it("generates codeVerifier, codeChallenge, and state", async () => {
      const pkce = await generateNotionPKCE();

      expect(pkce.codeVerifier).toBeTruthy();
      expect(pkce.codeChallenge).toBeTruthy();
      expect(pkce.state).toBeTruthy();

      // codeVerifier should be base64url (no +, /, or =)
      expect(pkce.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
      // codeChallenge should also be base64url
      expect(pkce.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
      // state should be hex
      expect(pkce.state).toMatch(/^[0-9a-f]+$/);
    });

    it("generates unique values on each call", async () => {
      const pkce1 = await generateNotionPKCE();
      const pkce2 = await generateNotionPKCE();

      expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
      expect(pkce1.state).not.toBe(pkce2.state);
    });

    it("challenge differs from verifier (SHA-256 hash)", async () => {
      const pkce = await generateNotionPKCE();
      expect(pkce.codeChallenge).not.toBe(pkce.codeVerifier);
    });
  });

  // ── Auth URL ──

  describe("buildNotionAuthUrl", () => {
    it("builds a correct authorization URL with all required params", () => {
      const url = buildNotionAuthUrl({
        authorizationEndpoint: "https://api.notion.com/v1/oauth/authorize",
        clientId: "client-123",
        redirectUri: "myapp://callback",
        codeChallenge: "abc123",
        state: "state-xyz",
      });

      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe("https://api.notion.com/v1/oauth/authorize");
      expect(parsed.searchParams.get("client_id")).toBe("client-123");
      expect(parsed.searchParams.get("redirect_uri")).toBe("myapp://callback");
      expect(parsed.searchParams.get("response_type")).toBe("code");
      expect(parsed.searchParams.get("state")).toBe("state-xyz");
      expect(parsed.searchParams.get("code_challenge")).toBe("abc123");
      expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
      expect(parsed.searchParams.get("owner")).toBe("user");
    });

    it("always includes owner=user", () => {
      const url = buildNotionAuthUrl({
        authorizationEndpoint: "https://example.com/authorize",
        clientId: "c",
        redirectUri: "http://localhost",
        codeChallenge: "ch",
        state: "st",
      });
      const parsed = new URL(url);
      expect(parsed.searchParams.get("owner")).toBe("user");
    });
  });

  // ── Token Exchange ──

  describe("exchangeNotionCode", () => {
    const baseParams = {
      tokenEndpoint: "https://api.notion.com/v1/oauth/token",
      code: "auth-code-123",
      redirectUri: "myapp://callback",
      clientId: "client-456",
      codeVerifier: "verifier-789",
    };

    it("exchanges code for tokens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access-token-new",
          refresh_token: "refresh-token-new",
          expires_in: 3600,
          scope: "read write",
        }),
      });

      const result = await exchangeNotionCode(baseParams);

      expect(result.accessToken).toBe("access-token-new");
      expect(result.refreshToken).toBe("refresh-token-new");
      expect(result.scope).toBe("read write");
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it("does NOT send client_secret in the request body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "token",
          expires_in: 3600,
        }),
      });

      await exchangeNotionCode(baseParams);

      const call = mockFetch.mock.calls[0];
      const body = new URLSearchParams(call[1].body);
      expect(body.has("client_secret")).toBe(false);
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("code")).toBe("auth-code-123");
      expect(body.get("client_id")).toBe("client-456");
      expect(body.get("code_verifier")).toBe("verifier-789");
      expect(body.get("redirect_uri")).toBe("myapp://callback");
    });

    it("uses Content-Type application/x-www-form-urlencoded", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "t" }),
      });

      await exchangeNotionCode(baseParams);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    });

    it("applies default expiry when server omits expires_in", async () => {
      const now = Date.now();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "token" }),
      });

      const result = await exchangeNotionCode(baseParams);

      // Default is 8 hours
      expect(result.expiresAt).toBeGreaterThanOrEqual(now + 8 * 3600 * 1000 - 1000);
    });

    it("throws on failed token exchange", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "invalid_grant" }),
      });

      await expect(exchangeNotionCode(baseParams)).rejects.toThrow("Token exchange failed: 400");
    });

    it("throws when no access_token in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token_type: "bearer" }),
      });

      await expect(exchangeNotionCode(baseParams)).rejects.toThrow("No access token in response");
    });
  });

  // ── Token Refresh ──

  describe("refreshNotionAccessToken", () => {
    const baseParams = {
      tokenEndpoint: "https://api.notion.com/v1/oauth/token",
      refreshToken: "refresh-abc",
      clientId: "client-456",
    };

    it("refreshes the access token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 7200,
          scope: "read",
        }),
      });

      const result = await refreshNotionAccessToken(baseParams);

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");
      expect(result.scope).toBe("read");
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it("does NOT send client_secret in the request body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "token",
          expires_in: 3600,
        }),
      });

      await refreshNotionAccessToken(baseParams);

      const call = mockFetch.mock.calls[0];
      const body = new URLSearchParams(call[1].body);
      expect(body.has("client_secret")).toBe(false);
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("refresh-abc");
      expect(body.get("client_id")).toBe("client-456");
    });

    it("preserves original refresh token when server omits new one", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-access",
          // no refresh_token in response
          expires_in: 3600,
        }),
      });

      const result = await refreshNotionAccessToken(baseParams);
      expect(result.refreshToken).toBe("refresh-abc");
    });

    it("applies default expiry when server omits expires_in", async () => {
      const now = Date.now();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "token" }),
      });

      const result = await refreshNotionAccessToken(baseParams);
      expect(result.expiresAt).toBeGreaterThanOrEqual(now + 8 * 3600 * 1000 - 1000);
    });

    it("throws on failed refresh", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "invalid_grant" }),
      });

      await expect(refreshNotionAccessToken(baseParams)).rejects.toThrow(
        "Token refresh failed: 401"
      );
    });

    it("throws when no access_token in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(refreshNotionAccessToken(baseParams)).rejects.toThrow(
        "No access token in refresh response"
      );
    });
  });
});
