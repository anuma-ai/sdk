import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStoredTokenData,
  storeTokenData,
  getValidAccessToken,
  getRefreshToken,
  clearTokenData,
  getStoredTokenDataSync,
  getValidAccessTokenSync,
  getRefreshTokenSync,
} from "./storage";
import {
  requestEncryptionKey,
  clearAllEncryptionKeys,
} from "../../../react/useEncryption";
import type { SignMessageFn } from "../../../react/useEncryption";
import { getTestSignMessage } from "../../../test-utils/signature";

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
// Use mock signature by default (bypasses rate limiting)
const TEST_SIGN_MESSAGE = getTestSignMessage();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe("OAuth Token Storage", () => {
  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.clear();
    clearAllEncryptionKeys();

    // Mock global window and localStorage
    // Ensure window is defined for synchronous functions
    if (typeof global.window === "undefined") {
      Object.defineProperty(global, "window", {
        value: {
          localStorage: localStorageMock,
        },
        writable: true,
        configurable: true,
      });
    } else {
      Object.defineProperty(global.window, "localStorage", {
        value: localStorageMock,
        writable: true,
        configurable: true,
      });
    }
  });

  describe("Unencrypted Storage", () => {
    it("should store and retrieve token data", async () => {
      const tokenData = {
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
        expiresAt: Date.now() + 3600000,
      };

      await storeTokenData("google-drive", tokenData);
      const retrieved = await getStoredTokenData("google-drive");

      expect(retrieved).toEqual(tokenData);
    });

    it("should return null for non-existent tokens", async () => {
      const retrieved = await getStoredTokenData("dropbox");
      expect(retrieved).toBeNull();
    });

    it("should get valid access token when not expired", async () => {
      const tokenData = {
        accessToken: "access_token_123",
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      await storeTokenData("google-drive", tokenData);
      const accessToken = await getValidAccessToken("google-drive");

      expect(accessToken).toBe("access_token_123");
    });

    it("should return null for expired access token", async () => {
      const tokenData = {
        accessToken: "access_token_123",
        expiresAt: Date.now() - 1000, // Expired
      };

      await storeTokenData("google-drive", tokenData);
      const accessToken = await getValidAccessToken("google-drive");

      expect(accessToken).toBeNull();
    });

    it("should get refresh token", async () => {
      const tokenData = {
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
      };

      await storeTokenData("dropbox", tokenData);
      const refreshToken = await getRefreshToken("dropbox");

      expect(refreshToken).toBe("refresh_token_123");
    });

    it("should clear token data", async () => {
      const tokenData = {
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
      };

      await storeTokenData("google-drive", tokenData);
      await clearTokenData("google-drive");

      const retrieved = await getStoredTokenData("google-drive");
      expect(retrieved).toBeNull();
    });
  });

  describe("Encrypted Storage", () => {
    beforeEach(async () => {
      clearAllEncryptionKeys();
      // Clear rate limit state
      if (typeof window !== "undefined" && window.localStorage) {
        const keys = Object.keys(window.localStorage);
        keys.forEach((key) => {
          if (key.startsWith("rate_limit_")) {
            window.localStorage.removeItem(key);
          }
        });
      }
      await requestEncryptionKey(TEST_ADDRESS, TEST_SIGN_MESSAGE);
    });

    it("should store and retrieve encrypted token data", async () => {
      const tokenData = {
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
        expiresAt: Date.now() + 3600000,
      };

      await storeTokenData("google-drive", tokenData, TEST_ADDRESS);
      const retrieved = await getStoredTokenData(
        "google-drive",
        TEST_ADDRESS
      );

      expect(retrieved).toEqual(tokenData);
    });

    it("should get valid encrypted access token", async () => {
      const tokenData = {
        accessToken: "access_token_123",
        expiresAt: Date.now() + 3600000,
      };

      await storeTokenData("dropbox", tokenData, TEST_ADDRESS);
      const accessToken = await getValidAccessToken(
        "dropbox",
        TEST_ADDRESS
      );

      expect(accessToken).toBe("access_token_123");
    });

    it("should handle migration from unencrypted to encrypted", async () => {
      // Store unencrypted first
      const tokenData = {
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
      };

      await storeTokenData("google-drive", tokenData);

      // Now retrieve with encryption (should read unencrypted)
      const retrieved = await getStoredTokenData(
        "google-drive",
        TEST_ADDRESS
      );

      // Should still work (reads unencrypted)
      expect(retrieved).toEqual(tokenData);
    });
  });

  describe("Synchronous Functions", () => {
    it("should get stored token data synchronously", () => {
      const tokenData = {
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
      };

      // Store synchronously (using mock)
      localStorageMock.setItem(
        "oauth_token_google-drive",
        JSON.stringify(tokenData)
      );

      const retrieved = getStoredTokenDataSync("google-drive");
      expect(retrieved).toEqual(tokenData);
    });

    it("should get valid access token synchronously", () => {
      const tokenData = {
        accessToken: "access_token_123",
        expiresAt: Date.now() + 3600000, // 1 hour in the future
      };

      localStorageMock.setItem(
        "oauth_token_dropbox",
        JSON.stringify(tokenData)
      );

      // Verify the data was stored correctly
      const stored = localStorageMock.getItem("oauth_token_dropbox");
      expect(stored).toBeTruthy();
      expect(stored).not.toMatch(/^enc:/); // Should not be encrypted

      const accessToken = getValidAccessTokenSync("dropbox");
      // Note: getValidAccessTokenSync may return null if token is expired or invalid
      // In this case, it should work since expiresAt is in the future
      expect(accessToken).toBe("access_token_123");
    });

    it("should get refresh token synchronously", () => {
      const tokenData = {
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
      };

      localStorageMock.setItem(
        "oauth_token_google-drive",
        JSON.stringify(tokenData)
      );

      const refreshToken = getRefreshTokenSync("google-drive");
      expect(refreshToken).toBe("refresh_token_123");
    });
  });
});

