/**
 * Convenience wrapper that re-exports the SDK's
 * `createConnectorTokenGetter` with the same per-instance cache semantics.
 *
 * The wrapper exists so consumers importing only `@anuma/agent-runtime`
 * get the helper as part of a single import surface, without also
 * importing `@anuma/sdk/tools` directly. The behavior is identical.
 */

import {
  createConnectorTokenGetter as sdkCreateConnectorTokenGetter,
  type ConnectorTokenGetterOpts,
} from "@anuma/sdk/tools";

import type { PortalClient } from "./types.js";

export type { ConnectorTokenGetterOpts };

export function createConnectorTokenGetter(
  client: PortalClient,
  provider: string,
  opts?: ConnectorTokenGetterOpts
): () => Promise<string | null> {
  return sdkCreateConnectorTokenGetter(client, provider, opts);
}
