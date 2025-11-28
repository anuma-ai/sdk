import { type Address, createPublicClient, http, type PublicClient } from 'viem';

/**
 * Configuration for creating a ZetaChain public client
 */
export interface ZetaChainClientConfig {
  /** RPC URL for ZetaChain */
  rpcUrl: string;
  /** Chain ID for ZetaChain */
  chainId: number;
}

/**
 * Creates a public client for ZetaChain
 *
 * @param config Configuration with RPC URL and optional chain ID
 * @returns Configured public client for ZetaChain
 */
export function createZetaChainClient(config: ZetaChainClientConfig): PublicClient {
  const chainId = config.chainId;

  return createPublicClient({
    chain: {
      id: chainId,
      name: 'ZetaChain',
      network: 'zetachain',
      nativeCurrency: {
        name: 'ZETA',
        symbol: 'ZETA',
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: [config.rpcUrl],
        },
      },
    },
    transport: http(config.rpcUrl),
  });
}

