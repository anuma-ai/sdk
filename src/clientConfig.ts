import type { CreateClientConfig } from "./client/client.gen";

/** Last-resort fallback when no env var and no explicit baseUrl is provided. */
const DEFAULT_BASE_URL = "https://portal.anuma-dev.ai";

/**
 * Resolve the Portal API base URL.
 *
 * Read from the environment at module load so a consumer that forgets to pass
 * an explicit `baseUrl` falls back to its OWN deployment's API rather than the
 * hardcoded dev portal. Checks the common public env vars across our consumers
 * (Next.js web, Expo mobile, Node/CLI). `process` is guarded for browser
 * bundles where it may be undefined.
 */
function resolveBaseUrl(): string {
  const env = typeof process !== "undefined" && process.env ? process.env : undefined;
  const fromEnv = env?.API_URL ?? env?.NEXT_PUBLIC_API_URL ?? env?.EXPO_PUBLIC_API_URL;
  return (fromEnv ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export const BASE_URL = resolveBaseUrl();

export const MCP_R2_DOMAIN = "4cf0e0ea50b97e72386fcf2f92a2d4e8.r2.cloudflarestorage.com";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: BASE_URL,
});
