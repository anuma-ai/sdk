/**
 * Connector vault primitives shared by every connector tool factory.
 *
 * - {@link createConnectorTokenGetter} wraps a portal mint call in a
 *   per-instance access-token cache. Tool factories consume the returned
 *   `() => Promise<string | null>` closure verbatim.
 * - {@link buildConnectorErrorResult} produces the canonical
 *   `__anuma_connector_error_v1` JSON shape every tool factory emits when
 *   the mint endpoint signals a missing connector or insufficient scope.
 *
 * @module lib/connectors
 */

export type {
  ConnectorMintError,
  ConnectorMintResult,
  ConnectorTokenGetterOpts,
  ConnectorTokenSource,
} from "./client.js";
export { createConnectorTokenGetter } from "./client.js";
export type { ConnectorErrorCode, ConnectorErrorPayload } from "./errors.js";
export { buildConnectorErrorResult, CONNECTOR_ERROR_MARKER } from "./errors.js";
