import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock useEncryption ──

vi.mock("../../react/useEncryption", () => ({
  getEncryptionKey: vi.fn(async () => "mock-crypto-key"),
  encryptDataWithKey: vi.fn(async (data: string) => `encrypted:${data}`),
  decryptDataWithKey: vi.fn(async (data: string) => {
    if (data.startsWith("encrypted:")) return data.slice("encrypted:".length);
    throw new Error("Decryption failed");
  }),
  hasEncryptionKey: vi.fn(() => true),
}));

import { hasEncryptionKey } from "../../react/useEncryption";

import {
  clearNotionToken,
  migrateNotionToken,
  migrateNotionClientRegistration,
  hasNotionCredentials,
  revokeNotionAccess,
  getValidNotionToken,
  getNotionAccessToken,
  getAndClearNotionReturnUrl,
  storeNotionReturnUrl,
  getAndClearNotionPendingMessage,
  storeNotionPendingMessage,
  getNotionMCPUrl,
  handleNotionCallback,
  startNotionAuth,
} from "./notion";

// ── Fetch mock ──

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Helpers ──

/** Clean URL of all query params so they don't leak between tests */
function resetURL(): void {
  window.history.replaceState({}, "", window.location.pathname);
}

/**
 * Mock that makes OAuth discovery fail (404 on well-known),
 * causing the code to use fallback endpoints.
 */
function mockDiscoveryFallback(): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 404,
    json: async () => ({}),
  });
}

// ── Tests ──

describe("Notion OAuth Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    resetURL();
    // Clear in-memory token cache
    clearNotionToken();
  });

  // ── Token storage keys & helpers ──

  describe("clearNotionToken", () => {
    it("clears token from localStorage and sessionStorage", () => {
      const walletAddress = "0xWALLET";
      localStorage.setItem(`oauth_token_notion:${walletAddress}`, "enc:oauth:some-encrypted-data");
      sessionStorage.setItem("oauth_token_notion", JSON.stringify({ accessToken: "token" }));

      clearNotionToken(walletAddress);

      expect(localStorage.getItem(`oauth_token_notion:${walletAddress}`)).toBeNull();
      expect(sessionStorage.getItem("oauth_token_notion")).toBeNull();
    });

    it("clears token without wallet address (legacy key)", () => {
      localStorage.setItem("oauth_token_notion", "some-data");
      sessionStorage.setItem("oauth_token_notion", JSON.stringify({ accessToken: "token" }));

      clearNotionToken();

      expect(localStorage.getItem("oauth_token_notion")).toBeNull();
      expect(sessionStorage.getItem("oauth_token_notion")).toBeNull();
    });
  });

  describe("hasNotionCredentials", () => {
    it("returns false when no credentials exist", async () => {
      expect(await hasNotionCredentials("0xWALLET")).toBe(false);
    });

    it("returns true when token exists in sessionStorage", async () => {
      sessionStorage.setItem("oauth_token_notion", JSON.stringify({ accessToken: "token" }));

      expect(await hasNotionCredentials()).toBe(true);
    });

    it("returns true when token exists in sessionStorage with wallet", async () => {
      sessionStorage.setItem("oauth_token_notion", JSON.stringify({ accessToken: "token" }));

      expect(await hasNotionCredentials("0xWALLET")).toBe(true);
    });
  });

  // ── Token migration ──

  describe("migrateNotionToken", () => {
    const walletAddress = "0xMIGRATE";

    it("migrates unencrypted token from sessionStorage to encrypted localStorage", async () => {
      const tokenData = {
        accessToken: "test-token",
        refreshToken: "test-refresh",
        expiresAt: Date.now() + 3600000,
      };
      sessionStorage.setItem("oauth_token_notion", JSON.stringify(tokenData));

      const result = await migrateNotionToken(walletAddress);

      expect(result).toBe(true);
      const stored = localStorage.getItem(`oauth_token_notion:${walletAddress}`);
      expect(stored).toMatch(/^enc:oauth:/);
      expect(sessionStorage.getItem("oauth_token_notion")).toBeNull();
    });

    it("returns false when no unencrypted token exists", async () => {
      const result = await migrateNotionToken(walletAddress);
      expect(result).toBe(false);
    });

    it("returns false when encryption key is not available", async () => {
      vi.mocked(hasEncryptionKey).mockReturnValueOnce(false);
      sessionStorage.setItem("oauth_token_notion", JSON.stringify({ accessToken: "token" }));

      const result = await migrateNotionToken(walletAddress);
      expect(result).toBe(false);
    });

    it("returns false without wallet address", async () => {
      sessionStorage.setItem("oauth_token_notion", JSON.stringify({ accessToken: "token" }));

      const result = await migrateNotionToken("");
      expect(result).toBe(false);
    });

    it("removes stale encrypted localStorage token before migrating", async () => {
      const scopedKey = `oauth_token_notion:${walletAddress}`;
      localStorage.setItem(scopedKey, "enc:oauth:stale-token");
      sessionStorage.setItem("oauth_token_notion", JSON.stringify({ accessToken: "fresh-token" }));

      const result = await migrateNotionToken(walletAddress);

      expect(result).toBe(true);
      const stored = localStorage.getItem(scopedKey);
      expect(stored).toMatch(/^enc:oauth:/);
      expect(stored).not.toBe("enc:oauth:stale-token");
    });
  });

  describe("migrateNotionClientRegistration", () => {
    const walletAddress = "0xCLIENT";
    const clientRegistrationKey = "notion_oauth_client";

    it("migrates client registration from sessionStorage", async () => {
      const registration = {
        clientId: "client-123",
        redirectUri: "http://localhost/callback",
        registeredAt: Date.now(),
      };
      sessionStorage.setItem(clientRegistrationKey, JSON.stringify(registration));

      const result = await migrateNotionClientRegistration(walletAddress);

      expect(result).toBe(true);
      const stored = localStorage.getItem(`${clientRegistrationKey}:${walletAddress}`);
      expect(stored).toMatch(/^enc:oauth:/);
      expect(sessionStorage.getItem(clientRegistrationKey)).toBeNull();
    });

    it("migrates legacy unencrypted client registration from localStorage", async () => {
      const registration = {
        clientId: "legacy-client",
        redirectUri: "http://localhost/callback",
        registeredAt: Date.now(),
      };
      localStorage.setItem(clientRegistrationKey, JSON.stringify(registration));

      const result = await migrateNotionClientRegistration(walletAddress);

      expect(result).toBe(true);
      const stored = localStorage.getItem(`${clientRegistrationKey}:${walletAddress}`);
      expect(stored).toMatch(/^enc:oauth:/);
      expect(localStorage.getItem(clientRegistrationKey)).toBeNull();
    });

    it("cleans up unencrypted sources when encrypted version already exists", async () => {
      const scopedKey = `${clientRegistrationKey}:${walletAddress}`;
      localStorage.setItem(scopedKey, "enc:oauth:already-encrypted");
      sessionStorage.setItem(clientRegistrationKey, JSON.stringify({ clientId: "c1" }));

      const result = await migrateNotionClientRegistration(walletAddress);

      expect(result).toBe(true);
      expect(sessionStorage.getItem(clientRegistrationKey)).toBeNull();
      expect(localStorage.getItem(scopedKey)).toBe("enc:oauth:already-encrypted");
    });

    it("returns false when no unencrypted sources exist", async () => {
      const result = await migrateNotionClientRegistration(walletAddress);
      expect(result).toBe(false);
    });

    it("returns false without wallet address", async () => {
      sessionStorage.setItem(clientRegistrationKey, JSON.stringify({ clientId: "c" }));

      const result = await migrateNotionClientRegistration("");
      expect(result).toBe(false);
    });
  });

  // ── revokeNotionAccess ──

  describe("revokeNotionAccess", () => {
    it("clears all stored data for wallet", () => {
      const walletAddress = "0xREVOKE";
      localStorage.setItem(`oauth_token_notion:${walletAddress}`, "enc:oauth:token");
      localStorage.setItem(`notion_oauth_client:${walletAddress}`, "enc:oauth:client");
      localStorage.setItem("notion_oauth_client", "legacy-client");
      sessionStorage.setItem("oauth_token_notion", "session-token");
      sessionStorage.setItem("notion_oauth_client", "session-client");

      revokeNotionAccess(walletAddress);

      expect(localStorage.getItem(`oauth_token_notion:${walletAddress}`)).toBeNull();
      expect(localStorage.getItem(`notion_oauth_client:${walletAddress}`)).toBeNull();
      expect(localStorage.getItem("notion_oauth_client")).toBeNull();
      expect(sessionStorage.getItem("oauth_token_notion")).toBeNull();
      expect(sessionStorage.getItem("notion_oauth_client")).toBeNull();
    });
  });

  // ── getValidNotionToken (sync) ──

  describe("getValidNotionToken", () => {
    it("returns null when no token is cached", () => {
      expect(getValidNotionToken()).toBeNull();
    });
  });

  // ── getNotionAccessToken ──

  describe("getNotionAccessToken", () => {
    it("returns null when no stored token exists", async () => {
      const token = await getNotionAccessToken("0xNOSTORED");
      expect(token).toBeNull();
    });

    it("returns token from sessionStorage when available", async () => {
      const tokenData = {
        accessToken: "session-token-123",
        expiresAt: Date.now() + 3600000,
      };
      sessionStorage.setItem("oauth_token_notion", JSON.stringify(tokenData));

      const token = await getNotionAccessToken(undefined);
      expect(token).toBe("session-token-123");
    });

    it("attempts refresh when token is expired", async () => {
      const tokenData = {
        accessToken: "expired-token",
        refreshToken: "refresh-123",
        expiresAt: Date.now() - 120000, // well past expiry + buffer
      };
      sessionStorage.setItem("oauth_token_notion", JSON.stringify(tokenData));

      // refreshNotionToken calls getClientRegistration → returns null (no registration)
      // → returns null from refreshNotionToken
      // The function should return null because refresh can't proceed without registration

      const token = await getNotionAccessToken(undefined);
      expect(token).toBeNull();
    });
  });

  // ── URL & message helpers ──

  describe("storeNotionReturnUrl / getAndClearNotionReturnUrl", () => {
    it("stores and retrieves the return URL", () => {
      storeNotionReturnUrl();

      const url = getAndClearNotionReturnUrl();
      expect(url).toBe(window.location.href);
      expect(getAndClearNotionReturnUrl()).toBeNull();
    });
  });

  describe("storeNotionPendingMessage / getAndClearNotionPendingMessage", () => {
    it("stores and retrieves a pending message", () => {
      storeNotionPendingMessage("Search my Notion for meeting notes");

      const message = getAndClearNotionPendingMessage();
      expect(message).toBe("Search my Notion for meeting notes");
      expect(getAndClearNotionPendingMessage()).toBeNull();
    });

    it("returns null when no pending message exists", () => {
      expect(getAndClearNotionPendingMessage()).toBeNull();
    });
  });

  // ── getNotionMCPUrl ──

  describe("getNotionMCPUrl", () => {
    it("returns the Notion MCP base URL", () => {
      expect(getNotionMCPUrl()).toBe("https://mcp.notion.com");
    });
  });

  // ── handleNotionCallback ──

  describe("handleNotionCallback", () => {
    const callbackPath = "/auth/notion/callback";

    beforeEach(() => {
      // Ensure clean URL for each handleNotionCallback test
      resetURL();
    });

    it("throws on OAuth error in URL params", async () => {
      const url = new URL(window.location.href);
      url.searchParams.set("error", "access_denied");
      url.searchParams.set("error_description", "User denied access");
      window.history.replaceState({}, "", url.toString());

      await expect(handleNotionCallback(callbackPath, "0xWALLET")).rejects.toThrow(
        "Notion OAuth error: access_denied"
      );
    });

    it("throws when PKCE state is missing", async () => {
      const url = new URL(window.location.href);
      url.searchParams.set("code", "auth-code-123");
      url.searchParams.set("state", "state-abc");
      window.history.replaceState({}, "", url.toString());

      await expect(handleNotionCallback(callbackPath, "0xWALLET")).rejects.toThrow(
        "Invalid OAuth state"
      );
    });

    it("throws when state parameter does not match", async () => {
      sessionStorage.setItem(
        "notion_oauth_pkce",
        JSON.stringify({
          codeVerifier: "verifier-123",
          codeChallenge: "challenge-123",
          state: "expected-state",
        })
      );

      const url = new URL(window.location.href);
      url.searchParams.set("code", "auth-code-123");
      url.searchParams.set("state", "wrong-state");
      window.history.replaceState({}, "", url.toString());

      await expect(handleNotionCallback(callbackPath, "0xWALLET")).rejects.toThrow(
        "Invalid OAuth state"
      );
    });

    it("throws when no client registration found", async () => {
      const state = "correct-state";
      sessionStorage.setItem(
        "notion_oauth_pkce",
        JSON.stringify({
          codeVerifier: "verifier-123",
          codeChallenge: "challenge-123",
          state,
        })
      );

      const url = new URL(window.location.href);
      url.searchParams.set("code", "auth-code-123");
      url.searchParams.set("state", state);
      window.history.replaceState({}, "", url.toString());

      await expect(handleNotionCallback(callbackPath, "0xWALLET")).rejects.toThrow(
        "No client registration found"
      );
    });

    it("exchanges code for tokens on valid callback", async () => {
      const state = "valid-state";
      const walletAddress = "0xCALLBACK";

      sessionStorage.setItem(
        "notion_oauth_pkce",
        JSON.stringify({
          codeVerifier: "my-code-verifier",
          codeChallenge: "my-code-challenge",
          state,
        })
      );

      sessionStorage.setItem(
        "notion_oauth_client",
        JSON.stringify({
          clientId: "registered-client-id",
          redirectUri: `${window.location.origin}${callbackPath}`,
          registeredAt: Date.now(),
        })
      );

      const url = new URL(window.location.href);
      url.searchParams.set("code", "authorization-code-xyz");
      url.searchParams.set("state", state);
      window.history.replaceState({}, "", url.toString());

      // Mock OAuth metadata discovery (fallback)
      mockDiscoveryFallback();

      // Mock token exchange response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
          scope: "read write",
        }),
      });

      const token = await handleNotionCallback(callbackPath, walletAddress);

      expect(token).toBe("new-access-token");

      // Verify token exchange was called with correct params
      const tokenCall = mockFetch.mock.calls[1];
      const body = new URLSearchParams(tokenCall[1].body);
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("code")).toBe("authorization-code-xyz");
      expect(body.get("client_id")).toBe("registered-client-id");
      expect(body.get("code_verifier")).toBe("my-code-verifier");

      // PKCE state should be consumed (cleared)
      expect(sessionStorage.getItem("notion_oauth_pkce")).toBeNull();
    });

    it("stores token with default expiry when server omits expires_in", async () => {
      const state = "no-expiry-state";
      const walletAddress = "0xNOEXP";

      sessionStorage.setItem(
        "notion_oauth_pkce",
        JSON.stringify({
          codeVerifier: "verifier",
          codeChallenge: "challenge",
          state,
        })
      );
      sessionStorage.setItem(
        "notion_oauth_client",
        JSON.stringify({
          clientId: "client-1",
          redirectUri: `${window.location.origin}/auth/notion/callback`,
          registeredAt: Date.now(),
        })
      );

      const url = new URL(window.location.href);
      url.searchParams.set("code", "code-123");
      url.searchParams.set("state", state);
      window.history.replaceState({}, "", url.toString());

      mockDiscoveryFallback();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "token-no-expiry",
        }),
      });

      const token = await handleNotionCallback("/auth/notion/callback", walletAddress);
      expect(token).toBe("token-no-expiry");
    });

    it("throws when token exchange fails", async () => {
      const state = "fail-state";

      sessionStorage.setItem(
        "notion_oauth_pkce",
        JSON.stringify({
          codeVerifier: "v",
          codeChallenge: "c",
          state,
        })
      );
      sessionStorage.setItem(
        "notion_oauth_client",
        JSON.stringify({
          clientId: "c1",
          redirectUri: `${window.location.origin}/auth/notion/callback`,
          registeredAt: Date.now(),
        })
      );

      const url = new URL(window.location.href);
      url.searchParams.set("code", "bad-code");
      url.searchParams.set("state", state);
      window.history.replaceState({}, "", url.toString());

      mockDiscoveryFallback();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "invalid_code" }),
      });

      await expect(handleNotionCallback("/auth/notion/callback", "0xFAIL")).rejects.toThrow(
        "Token exchange failed: 400"
      );
    });
  });

  // ── startNotionAuth ──

  describe("startNotionAuth", () => {
    it("stores PKCE state and redirects", async () => {
      const callbackPath = "/auth/notion/callback";

      // ensureClientRegistration calls getOAuthMetadata → discoverOAuthMetadata
      // fetch 1: well-known resource → 404 → fallback metadata used
      mockDiscoveryFallback();

      // fetch 2: registerClient → returns client_id
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          client_id: "dynamic-client-id",
        }),
      });

      // startNotionAuth calls getOAuthMetadata again for authorization_endpoint
      // fetch 3: well-known resource → 404 → fallback used
      mockDiscoveryFallback();

      // startNotionAuth sets window.location.href and returns a never-resolving promise.
      // Race it with a timeout to verify side effects.
      const authPromise = startNotionAuth(callbackPath, "0xSTART");
      const timeout = new Promise((r) => setTimeout(r, 200));
      await Promise.race([authPromise, timeout]);

      // PKCE state should be stored
      const pkceState = sessionStorage.getItem("notion_oauth_pkce");
      expect(pkceState).not.toBeNull();

      const parsed = JSON.parse(pkceState!);
      expect(parsed.codeVerifier).toBeTruthy();
      expect(parsed.codeChallenge).toBeTruthy();
      expect(parsed.state).toBeTruthy();

      // Return URL should be stored
      const returnUrl = sessionStorage.getItem("notion_return_url");
      expect(returnUrl).toBeTruthy();
    });
  });
});
