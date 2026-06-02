import type { CreateClientConfig } from "./client/client.gen";

/** Last-resort fallback when no env var and no explicit baseUrl is provided. */
const DEFAULT_BASE_URL = "https://portal.anuma-dev.ai";

/** Read a string-valued key off `globalThis`, treating empty strings as unset. */
function readGlobal(key: string): string | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const value = (globalThis as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Resolve the Portal API base URL from the environment.
 *
 * Read at module load so a consumer that forgets to pass an explicit `baseUrl`
 * falls back to its OWN deployment's API rather than the hardcoded dev portal.
 *
 * - Each `process.env.*` is accessed with literal dot notation (never via an
 *   intermediate variable) so Next.js and Expo inline the values at build time;
 *   indirect access leaves client/mobile bundles stuck on the dev fallback.
 * - `globalThis.*` is consulted as a secondary source for process-less edge
 *   runtimes (Cloudflare Workers without `nodejs_compat`, Deno) that expose
 *   injected config there instead of on `process.env`. Without this, such a
 *   runtime would silently fall back to the dev portal.
 * - `||` (not `??`) so an empty-string value (e.g. `API_URL=`) falls through to
 *   the next candidate instead of producing an empty, relative base URL.
 *
 * Note: `BASE_URL` is evaluated once at first import. Node/CLI consumers that
 * rely on `dotenv` must load it before importing the SDK (or pass an explicit
 * `baseUrl`), otherwise this resolves before the env is populated.
 *
 * @visibleForTesting
 */
export function resolveBaseUrl(): string {
  const fromProcess =
    typeof process !== "undefined"
      ? process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL
      : undefined;

  const fromGlobal =
    readGlobal("API_URL") ?? readGlobal("NEXT_PUBLIC_API_URL") ?? readGlobal("EXPO_PUBLIC_API_URL");

  return (fromProcess || fromGlobal || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export const BASE_URL = resolveBaseUrl();

export const MCP_R2_DOMAIN = "4cf0e0ea50b97e72386fcf2f92a2d4e8.r2.cloudflarestorage.com";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: BASE_URL,
});
