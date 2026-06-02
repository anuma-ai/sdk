import type { CreateClientConfig } from "./client/client.gen";

/** Last-resort fallback when no env var and no explicit baseUrl is provided. */
const DEFAULT_BASE_URL = "https://portal.anuma-dev.ai";

/**
 * Resolve the Portal API base URL.
 *
 * Read from the environment at module load so a consumer that forgets to pass
 * an explicit `baseUrl` falls back to its OWN deployment's API rather than the
 * hardcoded dev portal. Checks the common public env vars across our consumers
 * (Next.js web, Expo mobile, Node/CLI).
 *
 * Each var is accessed with literal `process.env.*` dot notation (never via an
 * intermediate variable) so Next.js and Expo can inline the values at build
 * time — indirect access leaves client/mobile bundles with the dev fallback.
 * `typeof process` guards raw browser bundles where `process` is undefined.
 * `||` (not `??`) is used so an empty-string value (e.g. `API_URL=`) also falls
 * through to the next candidate instead of routing to a relative path.
 */
function resolveBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL
      : undefined;
  return (fromEnv || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export const BASE_URL = resolveBaseUrl();

export const MCP_R2_DOMAIN = "4cf0e0ea50b97e72386fcf2f92a2d4e8.r2.cloudflarestorage.com";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: BASE_URL,
});
