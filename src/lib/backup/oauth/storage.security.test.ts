/**
 * Security Tests for OAuth Token Storage
 * 
 * These tests document security vulnerabilities. They currently FAIL because the vulnerabilities exist.
 * Once the vulnerabilities are fixed, these tests should PASS, verifying the fixes work correctly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStoredTokenData,
  storeTokenData,
  clearTokenData,
} from "./storage";
import {
  requestEncryptionKey,
  clearAllEncryptionKeys,
} from "../../../react/useEncryption";
import { getTestSignMessage } from "../../../test-utils/signature";

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";
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

describe("SECURITY: OAuth Token Encryption Gap", () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearAllEncryptionKeys();

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

  /**
   * SECURITY ISSUE: OAuth tokens stored without wallet address remain unencrypted
   * 
   * This test verifies that tokens stored during OAuth callback (when wallet address
   * is not available) are automatically re-encrypted when wallet address becomes available.
   * 
   * Note: The secure implementation now always encrypts with a session key, but this test
   * simulates the scenario where unencrypted tokens exist (e.g., from old code or when
   * sessionStorage was unavailable) and verifies they get re-encrypted when wallet address
   * becomes available.
   */
  it("should automatically re-encrypt unencrypted tokens when wallet address becomes available", async () => {
    // Simulate old unencrypted token data (e.g., from previous version or when sessionStorage was unavailable)
    const tokenData = {
      accessToken: "sensitive_access_token_123",
      refreshToken: "sensitive_refresh_token_456",
      expiresAt: Date.now() + 3600000,
    };

    // Manually store unencrypted token data to simulate legacy data or edge case
    // This simulates the scenario where tokens were stored unencrypted (e.g., old code)
    localStorageMock.setItem("oauth_token_google-drive", JSON.stringify(tokenData));

    // Verify token is stored unencrypted (can be read directly from localStorage)
    const stored = localStorageMock.getItem("oauth_token_google-drive");
    expect(stored).not.toBeNull();
    expect(stored).not.toMatch(/^enc:/); // Not encrypted
    expect(stored).toContain("sensitive_access_token_123"); // Plaintext visible

    // Now wallet address becomes available - request encryption key
    await requestEncryptionKey(TEST_ADDRESS, TEST_SIGN_MESSAGE);

    // Token should be automatically re-encrypted when wallet address becomes available
    const storedAfter = localStorageMock.getItem("oauth_token_google-drive");
    
    // Verify token is now encrypted with wallet key (not session key)
    expect(storedAfter).toMatch(/^enc:/);
    
    // Verify we can decrypt it with the wallet address
    const retrieved = await getStoredTokenData("google-drive", TEST_ADDRESS);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.accessToken).toBe("sensitive_access_token_123");
  });

  /**
   * SECURITY ISSUE: Unencrypted tokens can be read in plaintext from localStorage
   * 
   * This test verifies that tokens are always encrypted in localStorage, preventing
   * XSS attacks from reading sensitive tokens.
   * 
   * Currently fails because tokens can be stored unencrypted. Should pass once fixed.
   */
  it("should always encrypt tokens in localStorage to prevent XSS attacks", async () => {
    const tokenData = {
      accessToken: "secret_token_xyz",
      refreshToken: "secret_refresh_abc",
    };

    // Store without wallet address
    await storeTokenData("dropbox", tokenData);

    // Simulate XSS attack - read directly from localStorage
    const rawStorage = localStorageMock.getItem("oauth_token_dropbox");
    
    // Verify tokens are encrypted (cannot read plaintext)
    expect(rawStorage).not.toContain("secret_token_xyz");
    expect(rawStorage).toMatch(/^enc:/);
  });

  /**
   * SECURITY ISSUE: No mechanism to re-encrypt existing unencrypted tokens
   * 
   * This test verifies that unencrypted tokens can be re-encrypted when wallet
   * address becomes available.
   * 
   * Currently fails because re-encryption mechanism doesn't exist. Should pass once fixed.
   */
  it("should re-encrypt existing unencrypted tokens when wallet address becomes available", async () => {
    // Store unencrypted token
    const tokenData = {
      accessToken: "token_123",
      refreshToken: "refresh_456",
    };
    await storeTokenData("google-drive", tokenData);

    // Setup encryption key
    await requestEncryptionKey(TEST_ADDRESS, TEST_SIGN_MESSAGE);

    // Token should be automatically re-encrypted when retrieved with wallet address
    const retrieved = await getStoredTokenData("google-drive", TEST_ADDRESS);
    expect(retrieved).not.toBeNull();

    // Verify token was re-encrypted in storage
    const stored = localStorageMock.getItem("oauth_token_google-drive");
    expect(stored).toMatch(/^enc:/);
  });
});

