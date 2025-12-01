/**
 * Escrow contract constants
 * Contract: escrow-contracts/src/Escrow.sol
 * 
 * Note: For Escrow ABI, import directly from @reverbia/ai-escrow-contracts:
 * import EscrowAbiJson from '@reverbia/ai-escrow-contracts/abi/Escrow.sol/Escrow.json';
 * const ESCROW_ABI = EscrowAbiJson.abi;
 */

/**
 * Minimum required balance: $1.00 USD = 1,000,000 micro-USD
 * USDC has 6 decimals, same as micro-USD
 */
export const MIN_REQUIRED_BALANCE_MICRO_USD = BigInt(1_000_000);

/**
 * Micro-USD to USD conversion factor (6 decimals)
 */
export const MICRO_USD_TO_USD = BigInt(1_000_000);

