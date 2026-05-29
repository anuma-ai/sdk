/**
 * Pull the bearer off an incoming request, validate it against the portal,
 * and return the parsed grant.
 *
 * In v1 the portal validates by exposing `GET /api/v1/me`, which returns
 * `{ user_address, client_id, scopes }`. A later portal version may switch
 * to issuing signed JWTs and let `extractGrantContext` do local decode —
 * the consumer signature stays the same.
 */

import { AuthError } from "./errors.js";
import type { GrantContext, IncomingRequest, PortalClientOpts } from "./types.js";

interface MeResponse {
  user_address?: string;
  client_id?: string;
  scopes?: string[];
}

const DEFAULT_PORTAL_URL = "https://portal.anuma.ai";
const DEFAULT_TIMEOUT_MS = 5_000;

function readBearer(req: IncomingRequest): string {
  const headerValue = req.headers.authorization ?? req.headers.Authorization;
  if (!headerValue) {
    throw new AuthError("missing_bearer");
  }
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!value) throw new AuthError("missing_bearer");
  const [scheme, token] = value.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    throw new AuthError("invalid_bearer", "Authorization header must use the Bearer scheme");
  }
  return token;
}

export type ExtractGrantContextOpts = Pick<PortalClientOpts, "baseUrl" | "fetchImpl" | "timeoutMs">;

export async function extractGrantContext(
  req: IncomingRequest,
  opts: ExtractGrantContextOpts = {}
): Promise<GrantContext> {
  const bearer = readBearer(req);
  const baseUrl = opts.baseUrl ?? process.env.ANUMA_PORTAL_URL ?? DEFAULT_PORTAL_URL;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/api/v1/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${bearer}`,
      },
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`portal /api/v1/me timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    throw new AuthError("expired", "portal /api/v1/me returned 401");
  }
  if (response.status === 403) {
    throw new AuthError("revoked", "portal /api/v1/me returned 403");
  }
  if (!response.ok) {
    throw new Error(`portal /api/v1/me returned ${response.status}`);
  }

  const me = (await response.json()) as MeResponse;
  if (!me.user_address || !me.client_id) {
    throw new AuthError("invalid_bearer", "portal /api/v1/me missing user_address or client_id");
  }
  return {
    userAddress: me.user_address,
    clientId: me.client_id,
    scopes: me.scopes ?? [],
    bearer,
  };
}
