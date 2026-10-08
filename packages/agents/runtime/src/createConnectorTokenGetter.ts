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
