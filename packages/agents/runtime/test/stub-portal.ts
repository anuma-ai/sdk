/**
 * Minimal HTTP stub for the portal connector vault API.
 *
 * Implements just enough of the portal contract to drive
 * {@link runAgentRequest} end-to-end:
 *
 *   GET  /api/v1/me                            → return the grant for a bearer
 *   POST /api/v1/connector-tokens/{provider}   → mint OR return 412 connector_not_connected
 *                                                / 412 scope_not_covered / 5xx for upstream-unavailable
 *   GET  /api/v1/connectors                    → list the user's credentials
 *   POST /api/v1/connect-tickets               → return a fake ticket
 *
 * The stub increments `mintCount` on every successful mint so caching
 * tests can assert "two tool calls = one mint".
 *
 * Returned `{ url, stop }` mirrors the spec.
 */

import http from "node:http";
import type { AddressInfo } from "node:net";

export interface StubGrant {
  userAddress: string;
  clientId: string;
  scopes: string[];
}

interface StubCredential {
  oauthApp: string;
  externalAccount?: string;
  grantedScopes: string[];
}

type MintBehavior =
  | { kind: "ok"; accessToken: string; expiresIn?: number }
  | { kind: "connector_not_connected"; provider: string; connectUrl: string }
  | {
      kind: "scope_not_covered";
      provider: string;
      missingScopes: string[];
      connectUrl: string;
    }
  | { kind: "insufficient_scope"; required: string }
  | { kind: "upstream_5xx"; count: number };

interface StubPortalConfig {
  /** bearer → grant */
  grants?: Record<string, StubGrant>;
  /** user_address → connector credentials */
  credentials?: Record<string, StubCredential[]>;
  /** Mint behavior per (provider). Defaults to a 200-ok mint with `expires_in: 300`. */
  mintBehavior?: Record<string, MintBehavior>;
}

export interface StubPortalHandle {
  url: string;
  stop(): Promise<void>;
  /** Successful mints since startup. */
  readonly mintCount: number;
}

interface MutableStubState {
  mintCount: number;
  upstream5xxRemaining: Record<string, number>;
}

function readJson<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw) return resolve({} as T);
      try {
        resolve(JSON.parse(raw) as T);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(
  res: http.ServerResponse,
  status: number,
  body: Record<string, unknown> | unknown[]
): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function getBearer(req: http.IncomingMessage): string | null {
  const header = req.headers.authorization ?? req.headers.Authorization;
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  const [scheme, token] = value.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function startStubPortal(cfg: StubPortalConfig): Promise<StubPortalHandle> {
  const grants = cfg.grants ?? {};
  const credentials = cfg.credentials ?? {};
  const behavior = cfg.mintBehavior ?? {};
  const state: MutableStubState = {
    mintCount: 0,
    upstream5xxRemaining: Object.fromEntries(
      Object.entries(behavior)
        .filter(([, v]) => v.kind === "upstream_5xx")
        .map(([k, v]) => [k, (v as { count: number }).count])
    ),
  };

  const server = http.createServer(async (req, res) => {
    try {
      const bearer = getBearer(req);
      const grant = bearer ? grants[bearer] : undefined;

      const url = new URL(req.url ?? "/", "http://stub");
      const path = url.pathname;

      if (req.method === "GET" && path === "/api/v1/me") {
        if (!grant) return send(res, 401, { error: "missing_or_invalid_bearer" });
        return send(res, 200, {
          user_address: grant.userAddress,
          client_id: grant.clientId,
          scopes: grant.scopes,
        });
      }

      if (req.method === "POST" && path.startsWith("/api/v1/connector-tokens/")) {
        if (!grant) return send(res, 401, { error: "missing_or_invalid_bearer" });
        const provider = path.replace("/api/v1/connector-tokens/", "");
        const beh = behavior[provider];

        if (beh?.kind === "upstream_5xx") {
          const remaining = state.upstream5xxRemaining[provider] ?? 0;
          if (remaining > 0) {
            state.upstream5xxRemaining[provider] = remaining - 1;
            return send(res, 503, { error: "upstream_unavailable" });
          }
          // After exhausting count, fall through to ok.
        }

        if (beh?.kind === "connector_not_connected") {
          return send(res, 412, {
            code: "connector_not_connected",
            provider: beh.provider,
            connect_url: beh.connectUrl,
          });
        }
        if (beh?.kind === "scope_not_covered") {
          return send(res, 412, {
            code: "scope_not_covered",
            provider: beh.provider,
            missing_scopes: beh.missingScopes,
            connect_url: beh.connectUrl,
          });
        }
        if (beh?.kind === "insufficient_scope") {
          return send(res, 403, { code: "insufficient_scope", required: beh.required });
        }

        const ok =
          beh?.kind === "ok" ? beh : { kind: "ok" as const, accessToken: "stub-access-token" };
        state.mintCount += 1;
        return send(res, 200, {
          access_token: ok.accessToken,
          expires_in: ok.expiresIn ?? 300,
        });
      }

      if (req.method === "GET" && path === "/api/v1/connectors") {
        if (!grant) return send(res, 401, { error: "missing_or_invalid_bearer" });
        const creds = credentials[grant.userAddress] ?? [];
        return send(res, 200, {
          connectors: creds.map((c) => ({
            oauth_app: c.oauthApp,
            external_account: c.externalAccount,
            granted_scopes: c.grantedScopes,
            connected_at: Date.now(),
          })),
        });
      }

      if (req.method === "POST" && path === "/api/v1/connect-tickets") {
        if (!grant) return send(res, 401, { error: "missing_or_invalid_bearer" });
        const body = await readJson<{ oauth_app: string; requested_scopes: string[] }>(req);
        return send(res, 200, {
          ticket_id: `ticket-${Date.now()}`,
          expires_at: Date.now() + 600_000,
          connect_url: `http://stub/connectors/${body.oauth_app}/connect?ticket=stub`,
        });
      }

      send(res, 404, { error: "not_found", path });
    } catch (err) {
      send(res, 500, { error: "stub_internal", detail: (err as Error).message });
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;
  return {
    url,
    stop: () =>
      new Promise<void>((resolveStop, rejectStop) => {
        server.close((err) => (err ? rejectStop(err) : resolveStop()));
      }),
    get mintCount() {
      return state.mintCount;
    },
  };
}
