/**
 * Typed HTTP client over the portal API.
 *
 * Retries on 5xx / network errors with exponential backoff + jitter
 * (default 3 attempts, base 100ms). Never retries 4xx — those become
 * `MintResult.ok=false` (for mint) or thrown errors (for the bookkeeping
 * endpoints `listConnectors` / `createConnectTicket`).
 *
 * Surface is duck-typed against `PortalClient` so test stubs can satisfy
 * the same contract.
 */

import type {
  ConnectorInfo,
  ConnectTicket,
  ConnectTicketOpts,
  MintError,
  MintResult,
  PortalClient,
  PortalClientOpts,
} from "./types.js";

const DEFAULT_PORTAL_URL = "https://portal.anuma.ai";
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_MS = 100;

/**
 * Default mint access level per logical provider. The portal's
 * `POST /api/v1/connector-tokens/{provider}` requires an `access` body keyed
 * to the provider's `ScopesByAccess` map (ai-portal `internal/oauth/providers.go`).
 * Anything not listed falls back to `"read"`.
 */
const DEFAULT_MINT_ACCESS: Record<string, string> = {
  gmail: "read",
  gdrive: "read",
  gcalendar: "rw",
  github: "repo",
  dropbox: "read",
  notion: "rw",
};

/**
 * The portal speaks a single `oauth_app` for the three Google connectors.
 * Everything else maps 1:1 to its logical provider name.
 */
function oauthAppFor(provider: string): string {
  switch (provider) {
    case "gmail":
    case "gdrive":
    case "gcalendar":
      return "google";
    default:
      return provider;
  }
}

interface MintErrorBody {
  error?: string;
  code?: string;
  provider?: string;
  connect_url?: string;
  missing_scopes?: string[];
  required?: string;
  retry_after_ms?: number;
  message?: string;
}

interface MintSuccessBody {
  access_token: string;
  expires_in: number;
}

interface ConnectorListBody {
  connectors: {
    oauth_app: string;
    external_account?: string;
    granted_scopes?: string[];
    connected_at?: number;
  }[];
}

interface ConnectTicketBody {
  ticket_id: string;
  expires_in: number;
}

function jitter(baseMs: number, attempt: number): number {
  // Exponential backoff with full jitter so concurrent callers don't sync up.
  const exp = baseMs * Math.pow(2, attempt);
  return Math.floor(Math.random() * exp);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMintError(status: number, body: MintErrorBody): MintError {
  const code = body.code ?? body.error;
  if (status === 412 || status === 403) {
    if (code === "connector_not_connected") {
      return {
        code: "connector_not_connected",
        provider: body.provider ?? "unknown",
        connectUrl: body.connect_url ?? "",
      };
    }
    if (code === "scope_not_covered") {
      return {
        code: "scope_not_covered",
        provider: body.provider ?? "unknown",
        missingScopes: body.missing_scopes ?? [],
        connectUrl: body.connect_url ?? "",
      };
    }
    if (code === "insufficient_scope") {
      return {
        code: "insufficient_scope",
        required: body.required ?? "",
      };
    }
  }
  return {
    code: "unknown",
    message: body.message ?? `mint failed with status ${status}`,
  };
}

export function createPortalClient(bearer: string, opts: PortalClientOpts = {}): PortalClient {
  const baseUrl = opts.baseUrl ?? process.env.ANUMA_PORTAL_URL ?? DEFAULT_PORTAL_URL;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryBaseMs = opts.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;

  async function requestWithRetry(path: string, init: RequestInit): Promise<Response> {
    let lastErr: Error | undefined;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${baseUrl}${path}`, {
          ...init,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${bearer}`,
            ...init.headers,
          },
        });
        clearTimeout(timer);
        if (response.status >= 500) {
          // Retry server errors.
          lastErr = new Error(`portal ${path} returned ${response.status}`);
          if (attempt < maxRetries - 1) {
            await sleep(jitter(retryBaseMs, attempt));
            continue;
          }
          return response;
        }
        return response;
      } catch (err) {
        clearTimeout(timer);
        lastErr = err as Error;
        if (attempt < maxRetries - 1) {
          await sleep(jitter(retryBaseMs, attempt));
          continue;
        }
        throw lastErr;
      }
    }
    throw lastErr ?? new Error(`portal ${path} failed`);
  }

  return {
    async mintConnectorToken(provider: string, access?: string): Promise<MintResult> {
      const response = await requestWithRetry(`/api/v1/connector-tokens/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access: access ?? DEFAULT_MINT_ACCESS[provider] ?? "read" }),
      });
      if (response.ok) {
        const body = (await response.json()) as MintSuccessBody;
        return {
          ok: true,
          accessToken: body.access_token,
          expiresAt: Date.now() + body.expires_in * 1000,
        };
      }
      if (response.status >= 500) {
        return {
          ok: false,
          error: { code: "upstream_unavailable" },
        };
      }
      let body: MintErrorBody = {};
      try {
        body = (await response.json()) as MintErrorBody;
      } catch {
        body = {};
      }
      return { ok: false, error: parseMintError(response.status, body) };
    },

    async listConnectors(): Promise<ConnectorInfo[]> {
      const response = await requestWithRetry("/api/v1/connectors", { method: "GET" });
      if (!response.ok) {
        throw new Error(`portal /api/v1/connectors returned ${response.status}`);
      }
      const body = (await response.json()) as ConnectorListBody;
      return body.connectors.map((c) => ({
        oauthApp: c.oauth_app,
        externalAccount: c.external_account,
        grantedScopes: c.granted_scopes ?? [],
        connectedAt: c.connected_at ?? 0,
      }));
    },

    async createConnectTicket(opts: ConnectTicketOpts): Promise<ConnectTicket> {
      const response = await requestWithRetry("/api/v1/connect-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oauth_app: oauthAppFor(opts.provider),
          requested_scopes: opts.requestedScopes,
          return_to: opts.returnTo,
        }),
      });
      if (!response.ok) {
        throw new Error(`portal /api/v1/connect-tickets returned ${response.status}`);
      }
      const body = (await response.json()) as ConnectTicketBody;
      // The portal returns only `{ ticket_id, expires_in }` — the client owns
      // the connect URL, keyed to the LOGICAL provider (not the oauth_app).
      return {
        ticketId: body.ticket_id,
        expiresAt: Date.now() + body.expires_in * 1000,
        connectUrl: `${baseUrl}/connectors/${opts.provider}/connect?ticket=${body.ticket_id}`,
      };
    },
  };
}
