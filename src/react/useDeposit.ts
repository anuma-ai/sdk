"use client";

import { useCallback, useState } from 'react';
import {
  type Address,
  createWalletClient,
  custom,
  formatUnits,
  parseUnits,
  type PublicClient,
  type WalletClient,
} from 'viem';

import { ERC20_ABI, ESCROW_ABI } from '../lib/escrow';

/**
 * Ethereum provider interface for wallet-agnostic transactions
 */
export interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/**
 * Wallet interface for deposit operations
 */
export interface DepositWallet {
  /** Get Ethereum provider for creating wallet client */
  getEthereumProvider(): Promise<EthereumProvider | null>;
  /** Switch to a specific chain (optional, may not be supported by all wallets) */
  switchChain?(chainId: number): Promise<void>;
}

/**
 * Configuration for deposit hook
 */
export interface UseDepositOptions {
  /** Escrow contract address */
  escrowContractAddress: Address;
  /** Token contract address (e.g., USDC) */
  tokenContractAddress: Address;
  /** Public client for reading contract state (created by consumer) */
  publicClient: PublicClient;
  /** Chain ID for ZetaChain (used for transaction chainId) */
  chainId: number;
  /** Token decimals (default: 6 for USDC) */
  tokenDecimals?: number;
  /** Wallet instance (must implement DepositWallet interface) */
  wallet: DepositWallet | null | undefined;
  /** Connected wallet address */
  walletAddress: Address | null | undefined;
  /** Optional callback to refetch balance after successful deposit */
  onBalanceRefetch?: () => void | Promise<void>;
}

/**
 * Deposit step state
 */
export type DepositStep = 'idle' | 'approving' | 'depositing' | 'success' | 'error';

/**
 * Return type for useDeposit hook
 */
export interface UseDepositReturn {
  /** Current deposit step */
  step: DepositStep;
  /** Error message if deposit failed */
  error: string | null;
  /** Transaction hash of the deposit transaction */
  txHash: string | null;
  /** Whether a deposit operation is in progress */
  isLoading: boolean;
  /** Execute deposit transaction */
  deposit: (amount: string) => Promise<void>;
  /** Reset deposit state */
  reset: () => void;
}

/**
 * Helper function to attempt chain switch (non-blocking)
 */
async function attemptChainSwitch(
  wallet: DepositWallet,
  targetChainId: number,
  rpcUrl: string
): Promise<void> {
  if (!wallet.switchChain) {
    return;
  }

  try {
    await wallet.switchChain(targetChainId);
  } catch {
    // If switchChain fails, try adding the chain first
    const provider = await wallet.getEthereumProvider();
    if (!provider) {
      return;
    }

    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${targetChainId.toString(16)}`,
            chainName: 'ZetaChain Testnet',
            nativeCurrency: {
              name: 'ZETA',
              symbol: 'ZETA',
              decimals: 18,
            },
            rpcUrls: [rpcUrl],
            blockExplorerUrls: ['https://testnet.zetascan.com/'],
          },
        ],
      });
      // Try switching again after adding
      if (wallet.switchChain) {
        await wallet.switchChain(targetChainId);
      }
    } catch {
      // Chain switching failed, but we'll proceed anyway
      // The transaction will include chainId which should route to correct network
    }
  }
}

/**
 * Formats error messages for better UX
 */
function formatErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Transaction failed';
  }

  const message = err.message;

  // Handle user rejection
  if (message.includes('rejected') || message.includes('User denied')) {
    return 'Transaction was rejected. Please try again.';
  }
  // Handle insufficient funds
  if (message.includes('insufficient funds') || message.includes('gas')) {
    return 'Insufficient funds for gas. Please add ZETA to your wallet.';
  }
  // Handle network errors
  if (message.includes('network') || message.includes('RPC')) {
    return 'Network error. Please check your connection and try again.';
  }
  // Handle contract errors
  if (message.includes('contract') || message.includes('revert')) {
    return `Contract error: ${message}`;
  }
  // Generic error
  return message;
}

/**
 * Validates token contract exists
 */
async function validateTokenContract(
  publicClient: PublicClient,
  tokenAddress: Address
): Promise<string | null> {
  const tokenCode = await publicClient.getCode({ address: tokenAddress });
  if (!tokenCode || tokenCode === '0x') {
    return `Token contract not found at ${tokenAddress}. Please verify the contract is deployed on ZetaChain testnet.`;
  }
  return null;
}

/**
 * Checks token balance
 */
async function checkTokenBalance(
  publicClient: PublicClient,
  tokenAddress: Address,
  walletAddress: Address
): Promise<{ balance: bigint; error: string | null }> {
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    });
    return { balance, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to read token balance';
    if (errorMessage.includes('no data') || errorMessage.includes('0x')) {
      return {
        balance: BigInt(0),
        error: `Token contract at ${tokenAddress} does not implement balanceOf. Please verify the contract address is correct.`,
      };
    }
    return { balance: BigInt(0), error: `Failed to check balance: ${errorMessage}` };
  }
}

/**
 * Checks token allowance
 */
async function checkTokenAllowance(
  publicClient: PublicClient,
  tokenAddress: Address,
  walletAddress: Address,
  escrowAddress: Address
): Promise<{ allowance: bigint; error: string | null }> {
  try {
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [walletAddress, escrowAddress],
    });
    return { allowance, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to read allowance';
    if (errorMessage.includes('no data') || errorMessage.includes('0x')) {
      return {
        allowance: BigInt(0),
        error: `Token contract at ${tokenAddress} does not implement allowance. Please verify the contract address is correct.`,
      };
    }
    return { allowance: BigInt(0), error: `Failed to check allowance: ${errorMessage}` };
  }
}

/**
 * Creates a wallet client from an Ethereum provider
 */
function createWalletClientFromProvider(
  provider: EthereumProvider,
  publicClient: PublicClient
): WalletClient {
  // Use the chain from publicClient to ensure consistency
  const chain = publicClient.chain;
  if (!chain) {
    throw new Error('Public client must have a chain configured');
  }

  return createWalletClient({
    chain,
    transport: custom(provider),
  });
}

/**
 * Executes token approval transaction
 */
async function approveToken(
  wallet: DepositWallet,
  walletAddress: Address,
  tokenAddress: Address,
  escrowAddress: Address,
  amountUnits: bigint,
  publicClient: PublicClient
): Promise<void> {
  const provider = await wallet.getEthereumProvider();
  if (!provider) {
    throw new Error('Ethereum provider not available');
  }

  const walletClient = createWalletClientFromProvider(provider, publicClient);

  const approveHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [escrowAddress, amountUnits],
    account: walletAddress,
    chain: publicClient.chain ?? undefined,
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });
}

/**
 * Executes deposit transaction
 */
async function executeDeposit(
  wallet: DepositWallet,
  walletAddress: Address,
  escrowAddress: Address,
  amountUnits: bigint,
  publicClient: PublicClient
): Promise<`0x${string}`> {
  const provider = await wallet.getEthereumProvider();
  if (!provider) {
    throw new Error('Ethereum provider not available');
  }

  const walletClient = createWalletClientFromProvider(provider, publicClient);

  const depositHash = await walletClient.writeContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: 'deposit',
    args: [walletAddress, amountUnits],
    account: walletAddress,
    chain: publicClient.chain ?? undefined,
  });

  await publicClient.waitForTransactionReceipt({ hash: depositHash });
  return depositHash;
}

/**
 * Validates deposit prerequisites
 */
async function validateDepositPrerequisites(
  publicClient: PublicClient,
  tokenAddress: Address,
  walletAddress: Address,
  escrowAddress: Address,
  amountUnits: bigint,
  decimals: number
): Promise<{ isValid: boolean; error: string | null; allowance: bigint }> {
  // Validate contract exists
  const contractError = await validateTokenContract(publicClient, tokenAddress);
  if (contractError) {
    return { isValid: false, error: contractError, allowance: BigInt(0) };
  }

  // Check token balance
  const { balance: tokenBalance, error: balanceError } = await checkTokenBalance(
    publicClient,
    tokenAddress,
    walletAddress
  );
  if (balanceError) {
    return { isValid: false, error: balanceError, allowance: BigInt(0) };
  }

  if (tokenBalance < amountUnits) {
    return {
      isValid: false,
      error: `Insufficient balance. You have ${formatUnits(tokenBalance, decimals)} USDC`,
      allowance: BigInt(0),
    };
  }

  // Check current allowance
  const { allowance: currentAllowance, error: allowanceError } = await checkTokenAllowance(
    publicClient,
    tokenAddress,
    walletAddress,
    escrowAddress
  );
  if (allowanceError) {
    return { isValid: false, error: allowanceError, allowance: BigInt(0) };
  }

  return { isValid: true, error: null, allowance: currentAllowance };
}

/**
 * Hook to handle escrow deposits
 *
 * Manages the full deposit flow including:
 * - Token approval (if needed)
 * - Escrow deposit
 * - Error handling
 * - Transaction state management
 *
 * Wallet-agnostic - accepts any wallet that implements the DepositWallet interface.
 *
 * @param options Configuration object with contract addresses, RPC settings, and wallet
 * @returns Deposit state and execute function
 *
 * @example
 * ```tsx
 * import { useDeposit } from '@reverbia/sdk/react';
 * import { createZetaChainClient } from '@reverbia/sdk/lib/publicClient';
 *
 * const publicClient = createZetaChainClient({
 *   rpcUrl: 'https://zetachain-rpc.com',
 *   chainId: 7000,
 * });
 *
 * const { deposit, step, error, isLoading } = useDeposit({
 *   escrowContractAddress: '0x...',
 *   tokenContractAddress: '0x...',
 *   publicClient,
 *   chainId: 7000,
 *   wallet: myWallet,
 *   walletAddress: '0x...',
 * });
 * ```
 */
export function useDeposit(options: UseDepositOptions): UseDepositReturn {
  const {
    escrowContractAddress,
    tokenContractAddress,
    publicClient,
    chainId,
    tokenDecimals,
    wallet,
    walletAddress,
    onBalanceRefetch,
  } = options;

  const [step, setStep] = useState<DepositStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const decimals = tokenDecimals ?? 6;

  const deposit = useCallback(
    async (amount: string) => {
      if (!walletAddress || !wallet || !amount) {
        setError('Wallet not connected or amount invalid');
        setStep('error');
        return;
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setError('Please enter a valid amount');
        setStep('error');
        return;
      }

      const handleError = (errorMessage: string) => {
        setError(errorMessage);
        setStep('error');
      };

      try {
        setError(null);
        setTxHash(null);
        const amountUnits = parseUnits(amount, decimals);

        // Try to switch wallet to ZetaChain network (non-blocking)
        // Extract RPC URL from public client chain config if available
        const rpcUrl =
          publicClient.chain?.rpcUrls?.default?.http?.[0] ??
          publicClient.transport?.url ??
          '';
        await attemptChainSwitch(wallet, chainId, rpcUrl);

        // Validate prerequisites
        const validation = await validateDepositPrerequisites(
          publicClient,
          tokenContractAddress,
          walletAddress,
          escrowContractAddress,
          amountUnits,
          decimals
        );
        if (!validation.isValid) {
          handleError(validation.error ?? 'Validation failed');
          return;
        }

        const currentAllowance = validation.allowance;

        // Step 1: Approve if needed
        if (currentAllowance < amountUnits) {
          setStep('approving');
          await approveToken(
            wallet,
            walletAddress,
            tokenContractAddress,
            escrowContractAddress,
            amountUnits,
            publicClient
          );
        }

        // Step 2: Deposit
        setStep('depositing');
        const depositHash = await executeDeposit(
          wallet,
          walletAddress,
          escrowContractAddress,
          amountUnits,
          publicClient
        );

        setTxHash(depositHash);
        setStep('success');

        // Refresh balance if callback provided
        if (onBalanceRefetch) {
          setTimeout(() => {
            void onBalanceRefetch();
          }, 2000);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Deposit error:', err);
        setError(formatErrorMessage(err));
        setStep('error');
      }
    },
    [
      walletAddress,
      wallet,
      escrowContractAddress,
      tokenContractAddress,
      chainId,
      decimals,
      onBalanceRefetch,
      publicClient,
    ]
  );

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(null);
  }, []);

  const isLoading = step === 'approving' || step === 'depositing';

  return {
    step,
    error,
    txHash,
    isLoading,
    deposit,
    reset,
  };
}

