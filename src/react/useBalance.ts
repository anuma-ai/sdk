"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { type Address, type PublicClient } from 'viem';

import EscrowAbiJson from '@reverbia/ai-escrow-contracts/abi/Escrow.sol/Escrow.json';
import { MICRO_USD_TO_USD, MIN_REQUIRED_BALANCE_MICRO_USD } from '../lib/escrow';

/**
 * Configuration for balance hook
 */
export interface UseBalanceOptions {
  /** Wallet address to query balance for (from Privy or other wallet provider) */
  walletAddress: Address | null | undefined;
  /** Escrow contract address */
  contractAddress: Address;
  /** Public client for reading contract state (created by consumer) */
  publicClient: PublicClient;
  /** Auto-refresh interval in milliseconds (default: 30000 = 30s) */
  refreshInterval?: number;
}

/**
 * Return type for useBalance hook
 */
export interface UseBalanceReturn {
  /** Balance in micro-USD (6 decimals) */
  balanceMicroUSD: bigint | null;
  /** Formatted balance as USD string (e.g., "$1.50") */
  balanceUSD: string;
  /** Whether balance is sufficient (>= $1.00) */
  isSufficient: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manually refetch balance */
  refetch: () => Promise<void>;
}

/**
 * Formats micro-USD balance to USD string
 * @param balanceMicroUSD Balance in micro-USD (6 decimals)
 * @returns Formatted USD string (e.g., "$1.50")
 */
function formatBalance(balanceMicroUSD: bigint | null): string {
  if (balanceMicroUSD === null) {
    return '$0.00';
  }

  // Convert micro-USD to USD (divide by 1,000,000)
  const usdValue = Number(balanceMicroUSD) / Number(MICRO_USD_TO_USD);

  // Format to 2 decimal places
  return `$${usdValue.toFixed(2)}`;
}

/**
 * Hook to fetch and manage escrow balance
 *
 * Uses viem to call escrow contract directly. Wallet-agnostic - accepts wallet
 * address as a parameter from any wallet provider (Privy, MetaMask, etc.).
 * Auto-refreshes balance periodically.
 *
 * @param options Configuration object with wallet address, contract address, and RPC URL
 * @returns Balance data and helper functions
 *
 * @example
 * ```tsx
 * import { useBalance } from '@reverbia/sdk/react';
 * import { createZetaChainClient } from '@reverbia/sdk/lib/publicClient';
 * import { usePrivy } from '@privy-io/react-auth';
 *
 * const { user } = usePrivy();
 * const walletAddress = user?.wallet?.address;
 * const publicClient = createZetaChainClient({
 *   rpcUrl: 'https://zetachain-rpc.com',
 *   chainId: 7000,
 * });
 *
 * const { balanceUSD, isSufficient, isLoading } = useBalance({
 *   walletAddress,
 *   contractAddress: '0x...',
 *   publicClient,
 * });
 * ```
 */
export function useBalance(options: UseBalanceOptions): UseBalanceReturn {
  const { walletAddress, contractAddress, publicClient, refreshInterval } = options;
  const [balanceMicroUSD, setBalanceMicroUSD] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Fetches balance from escrow contract
   */
  const fetchBalance = useCallback(async () => {
    // Don't fetch if wallet is not connected
    if (!walletAddress) {
      setBalanceMicroUSD(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balance = await publicClient.readContract({
        address: contractAddress,
        abi: EscrowAbiJson.abi,
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      setBalanceMicroUSD(balance as bigint);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch balance');
      setError(error);
      setBalanceMicroUSD(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, contractAddress, publicClient]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Initial fetch
    fetchBalance();

    // Set up auto-refresh if wallet is connected
    if (walletAddress) {
      const interval = refreshInterval ?? 30000; // Default 30s
      intervalRef.current = setInterval(() => {
        fetchBalance();
      }, interval);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [walletAddress, fetchBalance, refreshInterval]);

  // Calculate derived values
  const balanceUSD = formatBalance(balanceMicroUSD);
  const isSufficient =
    balanceMicroUSD !== null && balanceMicroUSD >= MIN_REQUIRED_BALANCE_MICRO_USD;

  return {
    balanceMicroUSD,
    balanceUSD,
    isSufficient,
    isLoading,
    error,
    refetch,
  };
}

