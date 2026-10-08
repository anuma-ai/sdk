import type { ConnectorMintError } from "@anuma/sdk/tools";

/** Parsed result of an incoming bearer token, returned by {@link extractGrantContext}. */
export interface GrantContext {
  /** Wallet address; the primary user identifier on the portal. */
  userAddress: string;
  /** OAuth `client_id` that owns the bearer, e.g. `"haven_v1"`. */
  clientId: string;
  /** Scopes the user granted to this client. */
  scopes: string[];
  /** Bearer token verbatim, for relaying to the portal. */
  bearer: string;
}

/** Result of a mint call; failures are returned, while 5xx and network errors throw from {@link PortalClient}. `expiresAt` is unix ms. */
export type MintResult =
  | { ok: true; accessToken: string; expiresAt: number }
  | { ok: false; error: MintError };

/** Variants of `MintResult.error`, re-exported from `@anuma/sdk/tools`. */
export type MintError = ConnectorMintError;

/** Returned by {@link PortalClient.listConnectors}; `connectedAt` is unix ms. */
export interface ConnectorInfo {
  oauthApp: string;
  externalAccount?: string;
  grantedScopes: string[];
  connectedAt: number;
}

/** Argument shape for {@link PortalClient.createConnectTicket}. */
export interface ConnectTicketOpts {
  /** Logical provider, e.g. `"gmail"` or `"github"`. */
  provider: string;
  /** Scopes passed verbatim upstream (Google needs full `https://www.googleapis.com/auth/...` URLs); an empty array uses the provider's default scopes. */
  requestedScopes: string[];
  returnTo: string;
}

/** Result of a ticket-mint call; `expiresAt` is unix ms. */
export interface ConnectTicket {
  ticketId: string;
  expiresAt: number;
  connectUrl: string;
}

/** Typed wrapper over the portal HTTP API. */
export interface PortalClient {
  /** Mint an upstream access token for a logical provider; `access` defaults to the provider's standard level. */
  mintConnectorToken(provider: string, access?: string): Promise<MintResult>;
  /** List the user's connected connectors. */
  listConnectors(): Promise<ConnectorInfo[]>;
  /** Mint a connect ticket for redirecting the user to a connect flow. */
  createConnectTicket(opts: ConnectTicketOpts): Promise<ConnectTicket>;
}

/** Options for {@link createPortalClient}. */
export interface PortalClientOpts {
  /** @defaultValue `process.env.ANUMA_PORTAL_URL`, then the production portal */
  baseUrl?: string;
  /** @defaultValue `globalThis.fetch` */
  fetchImpl?: typeof fetch;
  /** Per-request timeout. @defaultValue 5000 */
  timeoutMs?: number;
  /** Max attempts on 5xx and network errors. @defaultValue 3 */
  maxRetries?: number;
  /** Initial backoff before the second attempt. @defaultValue 100 */
  retryBaseMs?: number;
}

/** Structurally typed incoming request; any HTTP framework satisfies it. */
export interface IncomingRequest {
  headers: {
    authorization?: string;
    Authorization?: string;
    [key: string]: string | string[] | undefined;
  };
}

/** Structured tool error; connector errors populate `provider`, others carry `message`. */
export interface ToolErrorInfo {
  code: string;
  provider?: string;
  missingScopes?: string[];
  required?: string;
  message?: string;
}

export interface ToolError {
  toolName: string;
  callId: string;
  error: ToolErrorInfo;
}
