import type { ConnectorMintError } from "@anuma/sdk/tools";

export interface GrantContext {
  userAddress: string;
  clientId: string;
  scopes: string[];
  bearer: string;
}

export type MintResult =
  | { ok: true; accessToken: string; expiresAt: number }
  | { ok: false; error: MintError };

export type MintError = ConnectorMintError;

export interface ConnectorInfo {
  oauthApp: string;
  externalAccount?: string;
  grantedScopes: string[];
  connectedAt: number;
}

export interface ConnectTicketOpts {
  provider: string;
  requestedScopes: string[];
  returnTo: string;
}

export interface ConnectTicket {
  ticketId: string;
  expiresAt: number;
  connectUrl: string;
}

export interface PortalClient {
  mintConnectorToken(provider: string, access?: string): Promise<MintResult>;
  listConnectors(): Promise<ConnectorInfo[]>;
  createConnectTicket(opts: ConnectTicketOpts): Promise<ConnectTicket>;
}

export interface PortalClientOpts {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
}

export interface IncomingRequest {
  headers: {
    authorization?: string;
    Authorization?: string;
    [key: string]: string | string[] | undefined;
  };
}

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
