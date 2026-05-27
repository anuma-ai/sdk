/**
 * Error subclasses thrown by `@anuma/agent-runtime`.
 *
 * - {@link AuthError} comes out of `extractGrantContext` when the bearer is
 *   missing, malformed, expired, or already revoked.
 * - {@link ConnectorNotConnectedError} is thrown by the default
 *   `onNotConnected` path inside `createConnectorTokenGetter` — interactive
 *   consumers replace this with a UI-driving alternative, so most server
 *   agents never see it.
 */

import type { MintError } from "./types.js";

/** Discriminant for {@link AuthError}. */
export type AuthErrorSubtype = "missing_bearer" | "invalid_bearer" | "expired" | "revoked";

export class AuthError extends Error {
  public readonly subtype: AuthErrorSubtype;

  constructor(subtype: AuthErrorSubtype, message?: string) {
    super(message ?? subtype);
    this.name = "AuthError";
    this.subtype = subtype;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class ConnectorNotConnectedError extends Error {
  public readonly provider: string;
  public readonly connectUrl?: string;
  public readonly mintError: MintError;

  constructor(mintError: MintError) {
    const provider =
      mintError.code === "connector_not_connected" || mintError.code === "scope_not_covered"
        ? mintError.provider
        : "unknown";
    const connectUrl =
      mintError.code === "connector_not_connected" || mintError.code === "scope_not_covered"
        ? mintError.connectUrl
        : undefined;
    super(`Connector not connected: ${provider}${connectUrl ? ` (${connectUrl})` : ""}`);
    this.name = "ConnectorNotConnectedError";
    this.provider = provider;
    this.connectUrl = connectUrl;
    this.mintError = mintError;
    Object.setPrototypeOf(this, ConnectorNotConnectedError.prototype);
  }
}
