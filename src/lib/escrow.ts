/**
 * Escrow contract ABI and constants
 * Contract: escrow-contracts/src/Escrow.sol
 */

/**
 * Minimal ABI for reading balance from escrow contract
 * Function: balanceOf(address) - public mapping
 */
export const ESCROW_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * ERC20 ABI for token operations (approve, allowance, balanceOf)
 */
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Minimum required balance: $1.00 USD = 1,000,000 micro-USD
 * USDC has 6 decimals, same as micro-USD
 */
export const MIN_REQUIRED_BALANCE_MICRO_USD = BigInt(1_000_000);

/**
 * Micro-USD to USD conversion factor (6 decimals)
 */
export const MICRO_USD_TO_USD = BigInt(1_000_000);

