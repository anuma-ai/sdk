/**
 * Smoke test for the connector vault against a real portal + real upstream
 * providers. Walks one provider's full flow:
 *
 *   connect-ticket → user completes OAuth in browser → list connectors
 *     → mint access token (twice, to exercise the cache)
 *     → call upstream API with the minted token
 *
 * Closes the gap that `packages/agents/runtime/test/e2e.test.ts` leaves
 * open — those tests use a stub portal and never touch real Google /
 * GitHub / Notion / Dropbox. Run this against staging before opening the
 * client rewire PR; re-run against prod after canary flips on.
 *
 * The mint step goes through `createConnectorTokenGetter` from
 * `@anuma/sdk/tools` so the SDK code path is dogfooded too. The connect
 * + list + disconnect calls are inline raw fetches — same wire format
 * the runtime's PortalClient uses, kept inline to avoid adding the
 * agent-runtime workspace package as a devDep on the root.
 *
 * Usage:
 *   PORTAL_BEARER=<token> \
 *   PORTAL_URL=https://staging-portal.anuma.ai \
 *     pnpm tsx scripts/smoke-vault-staging.ts --provider gmail
 *
 * Flags:
 *   --provider <name>     gmail | gdrive | gcalendar | github | notion | dropbox
 *   --skip-connect        Re-run mint + upstream against an already-connected account.
 *   --cleanup             Disconnect the provider at the end (test isolation).
 *   --portal-url <url>    Overrides PORTAL_URL env var.
 *
 * Exit 0 on full pass, 1 on any seam failure.
 */

import { execFile } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {
  type ConnectorMintError,
  type ConnectorMintResult,
  createConnectorTokenGetter,
} from "../src/tools/index.js";

interface UpstreamCheck {
  url: string;
  method?: string;
  /** Provider-specific headers beyond Authorization (e.g. Notion-Version). */
  extraHeaders?: Record<string, string>;
}

interface ProviderConfig {
  /** Logical provider name — used in mint URL path and disconnect path. */
  provider: string;
  /** Physical OAuth app — used in connect-ticket + connector_credentials row. */
  oauthApp: string;
  /** Upstream scopes to request — passed verbatim to /connect-tickets. */
  requestedScopes: string[];
  /** Cheap upstream call that proves the minted access token is usable. */
  upstream: UpstreamCheck;
}

// Each provider's upstream check is the smallest call that authenticates
// the access token without mutating state. If a provider rejects the
// token, the check returns non-2xx and the script fails the seam.
const PROVIDERS: Record<string, ProviderConfig> = {
  gmail: {
    provider: "gmail",
    oauthApp: "google",
    requestedScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    upstream: { url: "https://gmail.googleapis.com/gmail/v1/users/me/profile" },
  },
  gdrive: {
    provider: "gdrive",
    oauthApp: "google",
    requestedScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    upstream: { url: "https://www.googleapis.com/drive/v3/about?fields=user" },
  },
  gcalendar: {
    provider: "gcalendar",
    oauthApp: "google",
    requestedScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    upstream: {
      url: "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
    },
  },
  github: {
    provider: "github",
    oauthApp: "github",
    requestedScopes: ["repo"],
    upstream: { url: "https://api.github.com/user" },
  },
  notion: {
    provider: "notion",
    oauthApp: "notion",
    // Notion uses workspace-level permissions, not OAuth scopes.
    requestedScopes: [],
    upstream: {
      url: "https://api.notion.com/v1/users/me",
      extraHeaders: { "Notion-Version": "2022-06-28" },
    },
  },
  dropbox: {
    provider: "dropbox",
    oauthApp: "dropbox",
    requestedScopes: ["account_info.read"],
    upstream: {
      url: "https://api.dropboxapi.com/2/users/get_current_account",
      method: "POST",
    },
  },
};

interface Args {
  provider: string;
  skipConnect: boolean;
  cleanup: boolean;
  portalUrl: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let provider = "";
  let skipConnect = false;
  let cleanup = false;
  let portalUrl = process.env.PORTAL_URL ?? "";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--provider") provider = argv[++i] ?? "";
    else if (a === "--skip-connect") skipConnect = true;
    else if (a === "--cleanup") cleanup = true;
    else if (a === "--portal-url") portalUrl = argv[++i] ?? "";
    else if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    } else throw new Error(`Unknown arg: ${a}`);
  }
  if (!provider || !PROVIDERS[provider]) {
    throw new Error(`--provider must be one of: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  if (!portalUrl) {
    throw new Error("--portal-url or PORTAL_URL env var is required");
  }
  return { provider, skipConnect, cleanup, portalUrl };
}

function printUsage(): void {
  console.log(`Usage:
  PORTAL_BEARER=<token> PORTAL_URL=https://staging-portal.anuma.ai \\
    pnpm tsx scripts/smoke-vault-staging.ts --provider <name>

Providers: ${Object.keys(PROVIDERS).join(", ")}

Flags:
  --provider <name>     required
  --skip-connect        re-use existing connection; run mint + upstream only
  --cleanup             disconnect the provider after the test
  --portal-url <url>    overrides PORTAL_URL`);
}

function openInBrowser(url: string): void {
  // Best-effort — falls back to printing the URL so the user can copy it.
  // execFile avoids shell interpolation on the URL.
  const opener =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  execFile(opener, [url], (err) => {
    if (err) console.log(`(could not auto-open browser — copy the URL above)`);
  });
}

async function promptEnter(message: string): Promise<void> {
  const rl = createInterface({ input, output });
  await rl.question(`${message}\nPress Enter to continue... `);
  rl.close();
}

// Portal HTTP wrappers. Mirror the wire format of the runtime's
// PortalClient — kept inline so the script doesn't need
// @anuma/agent-runtime as a root devDep.

interface ConnectTicketResponse {
  ticket_id: string;
  expires_at: number;
  connect_url: string;
}

interface ConnectorListItem {
  oauth_app: string;
  external_account?: string;
  granted_scopes?: string[];
  connected_at?: number;
}

async function createConnectTicket(
  portalUrl: string,
  bearer: string,
  body: { oauth_app: string; requested_scopes: string[]; return_to: string }
): Promise<ConnectTicketResponse> {
  const res = await fetch(`${portalUrl}/api/v1/connect-tickets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST /api/v1/connect-tickets → HTTP ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as ConnectTicketResponse;
}

async function listConnectors(portalUrl: string, bearer: string): Promise<ConnectorListItem[]> {
  const res = await fetch(`${portalUrl}/api/v1/connectors`, {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) {
    throw new Error(`GET /api/v1/connectors → HTTP ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { connectors: ConnectorListItem[] };
  return body.connectors ?? [];
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

function parseMintError(status: number, body: MintErrorBody): ConnectorMintError {
  if (status === 412 && body.code === "scope_not_covered") {
    return {
      code: "scope_not_covered",
      provider: body.provider ?? "",
      missingScopes: body.missing_scopes ?? [],
      connectUrl: body.connect_url ?? "",
    };
  }
  if (status === 412 || body.code === "connector_not_connected") {
    return {
      code: "connector_not_connected",
      provider: body.provider ?? "",
      connectUrl: body.connect_url ?? "",
    };
  }
  if (status === 403 || body.code === "insufficient_scope") {
    return { code: "insufficient_scope", required: body.required ?? "" };
  }
  if (status === 503 || body.code === "upstream_unavailable") {
    return { code: "upstream_unavailable", retryAfterMs: body.retry_after_ms };
  }
  return { code: "unknown", message: body.message ?? `HTTP ${status}` };
}

/** Duck-types the `ConnectorTokenSource` interface that `createConnectorTokenGetter` expects. */
function makeMintSource(
  portalUrl: string,
  bearer: string
): {
  mintConnectorToken: (provider: string) => Promise<ConnectorMintResult>;
} {
  return {
    async mintConnectorToken(provider: string): Promise<ConnectorMintResult> {
      const res = await fetch(`${portalUrl}/api/v1/connector-tokens/${provider}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}` },
      });
      if (res.ok) {
        const body = (await res.json()) as { access_token: string; expires_in: number };
        return {
          ok: true,
          accessToken: body.access_token,
          expiresAt: Date.now() + body.expires_in * 1000,
        };
      }
      const body = (await res.json().catch(() => ({}))) as MintErrorBody;
      return { ok: false, error: parseMintError(res.status, body) };
    },
  };
}

interface CheckResult {
  label: string;
  ok: boolean;
  detail?: string;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const cfg = PROVIDERS[args.provider];
  const bearer = process.env.PORTAL_BEARER;
  if (!bearer) throw new Error("PORTAL_BEARER env var is required");

  const results: CheckResult[] = [];

  // Phase 1 — Connect (the part that proves the connect-ticket and
  // callback handlers actually land an encrypted RT in connector_credentials).
  if (!args.skipConnect) {
    console.log(`\n[1/3] Connect ${args.provider} (oauth_app=${cfg.oauthApp})`);
    const ticket = await createConnectTicket(args.portalUrl, bearer, {
      oauth_app: cfg.oauthApp,
      requested_scopes: cfg.requestedScopes,
      return_to: `${args.portalUrl}/__smoke_done__`,
    });
    results.push({ label: "connect-ticket created", ok: true });
    console.log(`  Connect URL: ${ticket.connect_url}`);
    openInBrowser(ticket.connect_url);
    await promptEnter(`  Complete the OAuth dance in your browser, then return here.`);

    const connectors = await listConnectors(args.portalUrl, bearer);
    const match = connectors.find((c) => c.oauth_app === cfg.oauthApp);
    results.push({
      label: "connector appears in /api/v1/connectors after OAuth",
      ok: !!match,
      detail: match
        ? `granted_scopes=[${(match.granted_scopes ?? []).join(",")}]`
        : "row missing — callback did not persist the credential",
    });
    if (!match) {
      printResults(results);
      process.exit(1);
    }
  } else {
    console.log(`\n[1/3] Connect (skipped via --skip-connect)`);
  }

  // Phase 2 — Mint twice. The second call must succeed too; whether it
  // hits cache or refreshes upstream is fine — both are correct outcomes.
  console.log(`\n[2/3] Mint via /api/v1/connector-tokens/${cfg.provider}`);
  const getToken = createConnectorTokenGetter(makeMintSource(args.portalUrl, bearer), cfg.provider);
  const t1 = await getToken();
  results.push({
    label: "first mint returned an access token",
    ok: !!t1,
    detail: t1
      ? `len=${t1.length}`
      : "got null — check oauth_grants scopes + connector_credentials",
  });
  if (!t1) {
    printResults(results);
    process.exit(1);
  }
  const t2 = await getToken();
  results.push({
    label: "second mint within TTL returned a token",
    ok: !!t2,
    detail: t2 === t1 ? "served from per-instance cache" : "fresh mint",
  });

  // Phase 3 — Real upstream call. This is the only seam the e2e tests
  // can't cover with a stub portal — proves the minted AT is actually
  // accepted by the upstream provider's API.
  console.log(`\n[3/3] Upstream call ${cfg.upstream.method ?? "GET"} ${cfg.upstream.url}`);
  const upstreamRes = await fetch(cfg.upstream.url, {
    method: cfg.upstream.method ?? "GET",
    headers: {
      Authorization: `Bearer ${t1}`,
      ...(cfg.upstream.extraHeaders ?? {}),
    },
  });
  const detail = upstreamRes.ok
    ? `HTTP ${upstreamRes.status}`
    : `HTTP ${upstreamRes.status}: ${(await upstreamRes.text()).slice(0, 200)}`;
  results.push({
    label: "upstream accepted the minted access token",
    ok: upstreamRes.ok,
    detail,
  });

  if (args.cleanup) {
    console.log(`\n[cleanup] Disconnect ${args.provider}`);
    const disconnectRes = await fetch(
      `${args.portalUrl}/api/v1/connectors/${cfg.provider}/disconnect`,
      { method: "POST", headers: { Authorization: `Bearer ${bearer}` } }
    );
    results.push({
      label: "disconnect endpoint returned 2xx",
      ok: disconnectRes.ok,
      detail: `HTTP ${disconnectRes.status}`,
    });
  }

  printResults(results);
  const allPassed = results.every((r) => r.ok);
  process.exit(allPassed ? 0 : 1);
}

function printResults(results: CheckResult[]): void {
  console.log(`\n=== Smoke results ===`);
  for (const r of results) {
    const status = r.ok ? "PASS" : "FAIL";
    const detail = r.detail ? ` — ${r.detail}` : "";
    console.log(`  [${status}] ${r.label}${detail}`);
  }
  const passCount = results.filter((r) => r.ok).length;
  console.log(`  ${passCount}/${results.length} passed`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
