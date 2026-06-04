/**
 * Public types for `@anuma/agent-runtime`.
 *
 * Mirrors the contract in `.claude-docs/connecters/agent-runtime-spec.md`.
 * These types are the contract between the SDK / portal vault and any
 * server-side consumer (Haven, Sentinel, future SMS handler).
 */

import type { ConnectorMintError } from "@anuma/sdk/tools";

/**
 * Parsed result of an incoming bearer token. Returned by
 * {@link extractGrantContext}.
 */
export interface GrantContext {
  /** Wallet address — primary user identifier on the portal. */
  userAddress: string;
  /** OAuth `client_id` that owns the bearer (e.g. `"haven_v1"`). */
  clientId: string;
  /** Scopes the user granted to this client. */
  scopes: string[];
  /** Bearer token verbatim — for relaying to the portal. */
  bearer: string;
}

/**
 * Discriminated result of a mint call. Failures are returned, never
 * thrown — transport errors (5xx / network) raise from {@link PortalClient}
 * directly.
 */
export type MintResult =
  | { ok: true; accessToken: string; expiresAt: number /* unix ms */ }
  | { ok: false; error: MintError };

/** Variants of `MintResult.error`. Re-exported from the SDK so consumers
 *  importing only `@anuma/agent-runtime` get the union without a second
 *  import. */
export type MintError = ConnectorMintError;

/** Returned by {@link PortalClient.listConnectors}. */
export interface ConnectorInfo {
  oauthApp: string;
  externalAccount?: string;
  grantedScopes: string[];
  connectedAt: number; /* unix ms */
}

/** Argument shape for {@link PortalClient.createConnectTicket}. */
export interface ConnectTicketOpts {
  /** Logical provider (e.g. `"gmail"`, `"github"`) — mapped to the portal
   *  `oauth_app` internally and used to build the connect URL. */
  provider: string;
  /**
   * Scopes requested for the connect flow, passed VERBATIM upstream
   * ("upstream-flavored"): Google needs full
   * `https://www.googleapis.com/auth/...` URLs. An empty array falls back to
   * the provider's default scope union on the portal side.
   */
  requestedScopes: string[];
  returnTo: string;
}

/** Result of a ticket-mint call. */
export interface ConnectTicket {
  ticketId: string;
  expiresAt: number; /* unix ms */
  connectUrl: string;
}

/** Typed wrapper over the portal HTTP API. */
export interface PortalClient {
  /** Mint a fresh upstream access token for a logical provider. `access`
   *  defaults to the provider's standard level (e.g. gmail `read`, github
   *  `repo`). */
  mintConnectorToken(provider: string, access?: string): Promise<MintResult>;
  /** List the user's currently-connected connectors. */
  listConnectors(): Promise<ConnectorInfo[]>;
  /** Mint a connect ticket so the user can be redirected to a connect flow. */
  createConnectTicket(opts: ConnectTicketOpts): Promise<ConnectTicket>;
}

export interface PortalClientOpts {
  /** Defaults to `process.env.ANUMA_PORTAL_URL` then the production portal. */
  baseUrl?: string;
  /** Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
  /** Per-request timeout. @default 5000 */
  timeoutMs?: number;
  /** Max retry attempts on 5xx / network errors. @default 3 */
  maxRetries?: number;
  /** Initial backoff before the second attempt. @default 100 */
  retryBaseMs?: number;
}

/** Structurally-typed incoming request. Any HTTP framework satisfies this. */
export interface IncomingRequest {
  headers: {
    authorization?: string;
    Authorization?: string;
    [key: string]: string | string[] | undefined;
  };
}

/**
 * Structured tool error lifted from a tool-result message after the loop
 * completes. Connector errors carry the canonical
 * `__anuma_connector_error_v1` payload; other tool failures may surface
 * here in the future.
 */
/**
 * Open shape so future tool-execution errors can lift into the same union
 * without breaking consumers. Connector errors populate `provider` +
 * `connectUrl`; other errors carry a `message`.
 */
export interface ToolErrorInfo {
  code: string;
  provider?: string;
  connectUrl?: string;
  missingScopes?: string[];
  required?: string;
  message?: string;
}

export interface ToolError {
  toolName: string;
  callId: string;
  error: ToolErrorInfo;
}
