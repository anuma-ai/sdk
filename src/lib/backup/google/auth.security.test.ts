import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

declare const global: typeof globalThis;
import { handleGoogleDriveCallback } from "./auth";
import type { Client } from "../../../client/client";
import { postAuthOauthByProviderExchange } from "../../../client/sdk.gen";
import { setLogger, consoleLogger, type Logger } from "../../logger";
import type { OAuthError, OAuthResult } from "../oauth/storage";

function expectFailure<T>(result: OAuthResult<T>): OAuthError {
  if (result.ok) {
    throw new Error(`expected an error result, got ok: ${JSON.stringify(result.data)}`);
  }
  return result.error;
}

vi.mock("../../../client/sdk.gen", () => ({
  postAuthOauthByProviderExchange: vi.fn(),
}));

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
    href: "http://localhost:3000/auth/google/callback?code=test_code&state=test_state",
    origin: "http://localhost:3000",
    pathname: "/auth/google/callback",
  },
  history: {
    replaceState: vi.fn(),
  },
  sessionStorage: sessionStorageMock,
  localStorage: localStorageMock,
};

describe("SECURITY: Google Drive OAuth Error Handling", () => {
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    setLogger(mockLogger);
    sessionStorageMock.clear();
    localStorageMock.clear();

    sessionStorageMock.setItem(
      "google_oauth_state",
      JSON.stringify({
        state: "test_state",
        timestamp: Date.now(),
      })
    );

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

  it("should log or throw errors in OAuth callbacks instead of silently returning null", async () => {
    vi.mocked(postAuthOauthByProviderExchange).mockRejectedValue(
      new Error("Encryption failed: Key not available")
    );

    const result = await handleGoogleDriveCallback("/auth/google/callback");

    expect(result.ok).toBe(false);
    const error = expectFailure(result);
    expect(error).toBeDefined();
    expect(error.code).toBeDefined();
    expect(error.message).toBeDefined();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it("should handle encryption failures explicitly and distinguish them from other errors", async () => {
    vi.mocked(postAuthOauthByProviderExchange).mockResolvedValue({
      data: {
        access_token: "test_token",
        expires_in: 3600,
        refresh_token: "test_refresh",
      },
    } as any);

    const storeSpy = vi
      .spyOn(await import("../oauth/storage"), "storeTokenData")
      .mockRejectedValue(new Error("OAuth token encryption failed: Key not available"));

    const result = await handleGoogleDriveCallback(
      "/auth/google/callback",
      undefined,
      "0x1234567890123456789012345678901234567890"
    );

    expect(result.ok).toBe(false);
    const error = expectFailure(result);
    expect(error.code).toBe("encryption");
    expect(error.message).toContain("encryption");

    storeSpy.mockRestore();
  });
});
