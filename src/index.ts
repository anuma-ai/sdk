export * from "./client";

// Export escrow utilities (constants) for use in apps that need direct contract interaction
// Note: For ABIs, import directly:
// - ERC20 ABI: use erc20Abi from 'viem'
// - Escrow ABI: import from '@reverbia/ai-escrow-contracts/abi/Escrow.sol/Escrow.json'
export { MIN_REQUIRED_BALANCE_MICRO_USD, MICRO_USD_TO_USD } from "./lib/escrow";

// Export public client utilities
export { createZetaChainClient } from "./lib/publicClient";
export type { ZetaChainClientConfig } from "./lib/publicClient";
