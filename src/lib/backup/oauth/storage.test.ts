import { describe, it, expect, beforeEach } from "vitest";

// Type declaration for global in test environment
declare const global: typeof globalThis;

import { clearTokenData } from "./storage";

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
  sessionStorage: sessionStorageMock,
  localStorage: localStorageMock,
};

describe("oauth storage", () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    localStorageMock.clear();

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

  it("clearTokenData clears tokens from both localStorage and sessionStorage", () => {
    const key = "oauth_token_dropbox";
    localStorageMock.setItem(key, "local");
    sessionStorageMock.setItem(key, "session");

    clearTokenData("dropbox");

    expect(localStorageMock.getItem(key)).toBeNull();
    expect(sessionStorageMock.getItem(key)).toBeNull();
  });
});

