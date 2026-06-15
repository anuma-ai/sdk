/**
 * `@anuma/agent-runtime` — server-side runtime contract for Anuma agents.
 *
 * Three primitives plus a wrapper that ties them together via
 * `runToolLoop`. The contract is documented in
 * `.claude-docs/connecters/agent-runtime-spec.md`.
 */

export type {
  ConnectorInfo,
  ConnectTicket,
  ConnectTicketOpts,
  GrantContext,
  IncomingRequest,
  MintError,
  MintResult,
  PortalClient,
  PortalClientOpts,
  ToolError,
  ToolErrorInfo,
} from "./types.js";

export { AuthError } from "./errors.js";
export type { AuthErrorSubtype } from "./errors.js";

export { extractGrantContext } from "./extractGrantContext.js";
export type { ExtractGrantContextOpts } from "./extractGrantContext.js";

export { createPortalClient } from "./createPortalClient.js";

export { createConnectorTokenGetter } from "./createConnectorTokenGetter.js";
export type { ConnectorTokenGetterOpts } from "./createConnectorTokenGetter.js";

export { denyInteractive, extractConnectorToolErrors, runAgentRequest } from "./runAgentRequest.js";
export type {
  AgentConfigLike,
  AgentRequestOpts,
  AgentResponse,
  UsageSummary,
} from "./runAgentRequest.js";
