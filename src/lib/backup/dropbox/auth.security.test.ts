/**
 * Security Tests for Dropbox OAuth Authentication
 *
 * These tests document security vulnerabilities. They currently FAIL because the vulnerabilities exist.
 * Once the vulnerabilities are fixed, these tests should PASS, verifying the fixes work correctly.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

// Type declaration for global in test environment
declare const global: typeof globalThis;
import { handleDropboxCallback } from "./auth";
import type { Client } from "../../../client/client";
import { postAuthOauthByProviderExchange } from "../../../client/sdk.gen";
import { setLogger, consoleLogger, type Logger } from "../../logger";
import type { OAuthError, OAuthResult } from "../oauth/storage";

/**
 * `OAuthResult` is a discriminated union, and `expect(result.ok).toBe(false)`
 * does not narrow it for the compiler — so reading `result.error` afterwards is
 * a type error even though the runtime value is there. Assert and narrow in one
 * step: this throws (failing the test) if the callback unexpectedly succeeded,
 * and hands back the `error` payload for the assertions that follow.
 */
function expectFailure<T>(result: OAuthResult<T>): OAuthError {
  if (result.ok) {
    throw new Error(`expected an error result, got ok: ${JSON.stringify(result.data)}`);
  }
  return result.error;
}

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
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    setLogger(mockLogger);
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

  afterEach(() => {
    setLogger(consoleLogger);
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
    // Mock API call to throw an error (e.g., network error, encryption failure)
    vi.mocked(postAuthOauthByProviderExchange).mockRejectedValue(
      new Error("Encryption failed: Key not available")
    );

    const result = await handleDropboxCallback("/auth/dropbox/callback");

    // Error should be logged and returned in result object
    expect(result.ok).toBe(false);
    const error = expectFailure(result);
    expect(error).toBeDefined();
    expect(error.code).toBeDefined();
    expect(error.message).toBeDefined();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
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
    const error = expectFailure(result);
    expect(error.code).toBe("encryption");
    expect(error.message).toContain("encryption");

    storeSpy.mockRestore();
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
    const specificError = new Error("Network timeout after 30s");
    specificError.name = "NetworkError";

    vi.mocked(postAuthOauthByProviderExchange).mockRejectedValue(specificError);

    const result = await handleDropboxCallback("/auth/dropbox/callback");

    // Error details should be preserved in result object
    expect(result.ok).toBe(false);
    const error = expectFailure(result);
    expect(error.message).toContain("Network timeout");
    expect(error.originalError).toBeDefined();
    // Check that error was logged (first argument contains error message)
    expect(mockLogger.error).toHaveBeenCalled();
    const firstCall = (mockLogger.error as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(firstCall[0]).toContain("Network timeout");
  });
});
