/**
 * Security Tests for Dropbox OAuth Authentication
 * 
 * These tests document security vulnerabilities. They currently FAIL because the vulnerabilities exist.
 * Once the vulnerabilities are fixed, these tests should PASS, verifying the fixes work correctly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Type declaration for global in test environment
declare const global: typeof globalThis;
import { handleDropboxCallback } from "./auth";
import type { Client } from "../../../client/client";
import { postAuthOauthByProviderExchange } from "../../../client/sdk.gen";

// Mock the SDK function
vi.mock("../../../client/sdk.gen", () => ({
  postAuthOauthByProviderExchange: vi.fn(),
}));

// Mock window and sessionStorage
const sessionStorageMock = (() => {
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

const mockWindow = {
  location: {
    href: "http://localhost:3000/auth/dropbox/callback?code=test_code&state=test_state",
    origin: "http://localhost:3000",
    pathname: "/auth/dropbox/callback",
  },
  history: {
    replaceState: vi.fn(),
  },
  sessionStorage: sessionStorageMock,
};

describe("SECURITY: Dropbox OAuth Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    
    // Setup OAuth state
    sessionStorageMock.setItem(
      "dropbox_oauth_state",
      JSON.stringify({
        state: "test_state",
        timestamp: Date.now(),
      })
    );

    // Mock window
    if (typeof global.window === "undefined") {
      Object.defineProperty(global, "window", {
        value: mockWindow,
        writable: true,
        configurable: true,
      });
    } else {
      Object.assign(global.window, mockWindow);
    }
  });

  /**
   * SECURITY ISSUE: Errors in OAuth callbacks are silently caught and return null
   * 
   * This test verifies that errors in OAuth callbacks are properly logged or thrown,
   * not silently ignored, to enable debugging and security monitoring.
   * 
   * Currently fails because errors are silently caught. Should pass once fixed.
   */
  it("should log or throw errors in OAuth callbacks instead of silently returning null", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Mock API call to throw an error (e.g., network error, encryption failure)
    vi.mocked(postAuthOauthByProviderExchange).mockRejectedValue(
      new Error("Encryption failed: Key not available")
    );

    const result = await handleDropboxCallback("/auth/dropbox/callback");

    // Error should be logged or thrown, not silently caught
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  /**
   * SECURITY ISSUE: Encryption failures are masked
   * 
   * This test verifies that encryption failures are handled explicitly and distinguished
   * from other errors, preventing tokens from being stored unencrypted.
   * 
   * Currently fails because encryption failures are silently ignored. Should pass once fixed.
   */
  it("should handle encryption failures explicitly and distinguish them from other errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Mock successful API response
    vi.mocked(postAuthOauthByProviderExchange).mockResolvedValue({
      data: {
        access_token: "test_token",
        expires_in: 3600,
        refresh_token: "test_refresh",
      },
    } as any);

    // Mock storeTokenData to throw encryption error
    const storeSpy = vi.spyOn(await import("../oauth/storage"), "storeTokenData")
      .mockRejectedValue(new Error("OAuth token encryption failed: Key not available"));

    const result = await handleDropboxCallback("/auth/dropbox/callback");

    // SECURITY ISSUE: Encryption failure is caught and returns null silently
    // Encryption failures should be handled explicitly:
    // 1. Store unencrypted with warning, OR
    // 2. Throw error to prevent unencrypted storage, OR
    // 3. Retry when key becomes available
    // Currently silently fails - verify proper handling
    // The result should either:
    // - Not be null (if error is handled and operation succeeds), OR
    // - Error should be logged (if operation fails but error is reported)
    const handledCorrectly = result !== null || consoleErrorSpy.mock.calls.length > 0 || consoleWarnSpy.mock.calls.length > 0;
    expect(handledCorrectly).toBe(true); // Should either succeed or log error, not return null silently

    storeSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  /**
   * SECURITY ISSUE: Error details are lost
   * 
   * This test verifies that error details are preserved for debugging and security monitoring,
   * not completely discarded when errors occur.
   * 
   * Currently fails because error details are lost. Should pass once fixed.
   */
  it("should preserve error details for debugging and security monitoring", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const specificError = new Error("Network timeout after 30s");
    specificError.name = "NetworkError";
    
    vi.mocked(postAuthOauthByProviderExchange).mockRejectedValue(specificError);

    const result = await handleDropboxCallback("/auth/dropbox/callback");

    // SECURITY ISSUE: Error details are completely lost - returns null with no logging
    // Error details should be preserved for debugging/monitoring:
    // 1. Return error object with details, OR
    // 2. Log error with full details, OR
    // 3. Throw error with context
    // This test verifies error details are not completely lost
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Network timeout")
    );

    consoleErrorSpy.mockRestore();
  });
});

