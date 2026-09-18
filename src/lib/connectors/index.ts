/**
 * Connector vault primitives shared by every connector tool factory.
 *
 * - {@link createConnectorTokenGetter} wraps a portal mint call in a
 *   per-instance access-token cache. Tool factories consume the returned
 *   `() => Promise<string | null>` closure verbatim.
 * - {@link buildConnectorErrorResult} produces the canonical
 *   `__anuma_connector_error_v1` JSON shape every tool factory emits when
 *   the mint endpoint signals a missing connector or insufficient scope.
 * - {@link createAgentresClient} is the one connector that holds no vault
 *   credential: agentres.dev binds a Resy account to the user's own Solana
 *   wallet, proved per call by a message signature. Its SIWX challenge parsing
 *   and message building stay inside `agentres/siwx.ts` — a consumer that
 *   assembles the proof by hand loses the fresh-nonce-per-call guarantee.
 *
 * @module lib/connectors
 */

export type {
  AgentresAccount,
  AgentresClient,
  AgentresClientOptions,
  AgentresLinkStatus,
  AgentresLinkStep,
  SolanaSignMessageFn,
} from "./agentres/client.js";
export { createAgentresClient } from "./agentres/client.js";
export type { AgentresErrorCode } from "./agentres/errors.js";
export { AgentresError, SiwxChallengeError, SiwxUnsupportedError } from "./agentres/errors.js";
export type {
  ConnectorMintError,
  ConnectorMintResult,
  ConnectorTokenGetterOpts,
  ConnectorTokenSource,
} from "./client.js";
export { createConnectorTokenGetter } from "./client.js";
export type { ConnectorErrorCode } from "./errors.js";
export { buildConnectorErrorResult, CONNECTOR_ERROR_MARKER } from "./errors.js";
