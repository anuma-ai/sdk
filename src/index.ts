export * from "./client";

// Export escrow utilities (ABIs and constants) for use in apps that need direct contract interaction
export { ESCROW_ABI, ERC20_ABI, MIN_REQUIRED_BALANCE_MICRO_USD, MICRO_USD_TO_USD } from "./lib/escrow";

// Export public client utilities
export { createZetaChainClient } from "./lib/publicClient";
export type { ZetaChainClientConfig } from "./lib/publicClient";
