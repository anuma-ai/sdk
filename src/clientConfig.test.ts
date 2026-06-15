import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveBaseUrl } from "./clientConfig";

const DEV_FALLBACK = "https://portal.anuma-dev.ai";
const ENV_KEYS = ["API_URL", "NEXT_PUBLIC_API_URL", "EXPO_PUBLIC_API_URL"] as const;

describe("resolveBaseUrl", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
      delete (globalThis as Record<string, unknown>)[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
      delete (globalThis as Record<string, unknown>)[key];
    }
    vi.unstubAllGlobals();
  });

  it("prefers API_URL over NEXT_PUBLIC_API_URL and EXPO_PUBLIC_API_URL", () => {
    process.env.API_URL = "https://portal.anuma.ai";
    process.env.NEXT_PUBLIC_API_URL = "https://next.example";
    process.env.EXPO_PUBLIC_API_URL = "https://expo.example";
    expect(resolveBaseUrl()).toBe("https://portal.anuma.ai");
  });

  it("falls back to NEXT_PUBLIC_API_URL when API_URL is unset", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://next.example";
    process.env.EXPO_PUBLIC_API_URL = "https://expo.example";
    expect(resolveBaseUrl()).toBe("https://next.example");
  });

  it("falls back to EXPO_PUBLIC_API_URL when the others are unset", () => {
    process.env.EXPO_PUBLIC_API_URL = "https://expo.example";
    expect(resolveBaseUrl()).toBe("https://expo.example");
  });

  it("treats an empty-string env var as unset and falls through", () => {
    process.env.API_URL = "";
    process.env.NEXT_PUBLIC_API_URL = "https://next.example";
    expect(resolveBaseUrl()).toBe("https://next.example");
  });

  it("strips trailing slashes", () => {
    process.env.API_URL = "https://portal.anuma.ai///";
    expect(resolveBaseUrl()).toBe("https://portal.anuma.ai");
  });

  it("falls back to the dev portal when nothing is configured", () => {
    expect(resolveBaseUrl()).toBe(DEV_FALLBACK);
  });

  // The globalThis source is the fallback used by process-less edge runtimes
  // (Cloudflare Workers without nodejs_compat, Deno). We can't null out `process`
  // under the vitest forks pool — its teardown needs `process.exit` — so we cover
  // the globalThis branch directly with process env vars cleared instead.
  it("reads from globalThis when process env vars are unset", () => {
    (globalThis as Record<string, unknown>).API_URL = "https://global.example";
    expect(resolveBaseUrl()).toBe("https://global.example");
  });
});
