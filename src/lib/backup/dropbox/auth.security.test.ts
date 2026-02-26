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
import { getLogger } from "../../logger";

// Mock the SDK function
vi.mock("../../../client/sdk.gen", () => ({
  postAuthOauthByProviderExchange: vi.fn(),
}));

// Mock window, sessionStorage, and localStorage
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
  localStorage: localStorageMock,
};

describe("SECURITY: Dropbox OAuth Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    localStorageMock.clear();

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
   * FIXED: Errors now return OAuthResult with error details.
   */
  it("should log or throw errors in OAuth callbacks instead of silently returning null", async () => {
    const logger = getLogger();
    const loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const loggerWarnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    // Mock API call to throw an error (e.g., network error, encryption failure)
    vi.mocked(postAuthOauthByProviderExchange).mockRejectedValue(
      new Error("Encryption failed: Key not available")
    );

    const result = await handleDropboxCallback("/auth/dropbox/callback");

    // Error should be logged and returned in result object
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error.code).toBeDefined();
    expect(result.error.message).toBeDefined();
    expect(loggerErrorSpy).toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalled();

    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  /**
   * SECURITY ISSUE: Encryption failures are masked
   *
   * This test verifies that encryption failures are handled explicitly and distinguished
   * from other errors, preventing tokens from being stored unencrypted.
   *
   * FIXED: Encryption failures now return error result with encryption error code.
   */
  it("should handle encryption failures explicitly and distinguish them from other errors", async () => {
    const logger = getLogger();
    const loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const loggerWarnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    // Mock successful API response
    vi.mocked(postAuthOauthByProviderExchange).mockResolvedValue({
      data: {
        access_token: "test_token",
        expires_in: 3600,
        refresh_token: "test_refresh",
      },
    } as any);

    // Mock storeTokenData to throw encryption error
    const storeSpy = vi
      .spyOn(await import("../oauth/storage"), "storeTokenData")
      .mockRejectedValue(new Error("OAuth token encryption failed: Key not available"));

    const result = await handleDropboxCallback(
      "/auth/dropbox/callback",
      undefined,
      "0x1234567890123456789012345678901234567890"
    );

    // Encryption failure should be explicitly handled with error code
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("encryption");
    expect(result.error.message).toContain("encryption");

    storeSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  /**
   * SECURITY ISSUE: Error details are lost
   *
   * This test verifies that error details are preserved for debugging and security monitoring,
   * not completely discarded when errors occur.
   *
   * FIXED: Error details are now preserved in OAuthResult error object.
   */
  it("should preserve error details for debugging and security monitoring", async () => {
    const logger = getLogger();
    const loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const specificError = new Error("Network timeout after 30s");
    specificError.name = "NetworkError";

    vi.mocked(postAuthOauthByProviderExchange).mockRejectedValue(specificError);

    const result = await handleDropboxCallback("/auth/dropbox/callback");

    // Error details should be preserved in result object
    expect(result.ok).toBe(false);
    expect(result.error.message).toContain("Network timeout");
    expect(result.error.originalError).toBeDefined();
    // Check that error was logged (first argument contains error message)
    expect(loggerErrorSpy).toHaveBeenCalled();
    const firstCall = loggerErrorSpy.mock.calls[0];
    expect(firstCall[0]).toContain("Network timeout");

    loggerErrorSpy.mockRestore();
  });
});
