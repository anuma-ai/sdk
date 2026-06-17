"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  HandlersBindRequest,
  HandlersBoundWalletResponse,
  HandlersListTotals,
  HandlersNonceResponse,
  HandlersProInfo,
} from "../client";
import {
  deleteApiV1WalletsBindingByAddress,
  getApiV1WalletsBinding,
  postApiV1WalletsBinding,
  postApiV1WalletsBindingNonce,
} from "../client/sdk.gen";
import { BASE_URL } from "../clientConfig";

/**
 * @inline
 */
export type UseWalletBindingOptions = {
  /**
   * Custom function to get auth token for API calls
   */
  getToken?: () => Promise<string | null>;
  /**
   * Optional base URL for the API requests.
   */
  baseUrl?: string;
  /**
   * Whether to fetch the bound wallets automatically on mount (default: true)
   */
  autoFetch?: boolean;
  /**
   * Optional callback for error handling
   */
  onError?: (error: Error) => void;
};

export type UseWalletBindingResult = {
  /**
   * The account's bound wallets, each with its on-chain staked amount.
   */
  wallets: HandlersBoundWalletResponse[];
  /**
   * Aggregate totals across all bound wallets (summed staked ZETA + Pro status).
   */
  totals: HandlersListTotals | null;
  /**
   * Convenience accessor for the Pro gate (`totals.pro`). Trust `pro_active` for
   * the authoritative state — it holds through the grace window even if
   * `qualified` dips below the threshold.
   */
  pro: HandlersProInfo | null;
  /**
   * Whether any operation is in progress
   */
  isLoading: boolean;
  /**
   * Error from the last operation
   */
  error: Error | null;
  /**
   * Refetch the bound wallets and totals.
   */
  refetch: () => Promise<void>;
  /**
   * Request a binding nonce. The returned `message` is what the wallet must sign
   * to prove ownership before calling {@link bindWallet}.
   * @returns The nonce response or null on error
   */
  getNonce: () => Promise<HandlersNonceResponse | null>;
  /**
   * Bind a wallet to the account using a signed nonce proof. Refetches on success.
   * @returns The bound wallet or null on error
   */
  bindWallet: (request: HandlersBindRequest) => Promise<HandlersBoundWalletResponse | null>;
  /**
   * Unbind a wallet by its address (`0x…` or `zeta1…`). Refetches on success.
   * @returns true on success, false on error
   */
  unbindWallet: (address: string) => Promise<boolean>;
};

/**
 * React hook for managing ZETA wallet bindings and reading staked-based Pro status.
 * Provides methods to list bound wallets, request a binding nonce, bind a wallet
 * with a signed proof, and unbind a wallet.
 * @category Hooks
 */
export function useWalletBinding(options: UseWalletBindingOptions = {}): UseWalletBindingResult {
  const { getToken, baseUrl = BASE_URL, autoFetch = true, onError } = options;

  const [wallets, setWallets] = useState<HandlersBoundWalletResponse[]>([]);
  const [totals, setTotals] = useState<HandlersListTotals | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs to avoid recreating callbacks when these change
  const getTokenRef = useRef(getToken);
  const baseUrlRef = useRef(baseUrl);
  const onErrorRef = useRef(onError);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update refs when values change
  useEffect(() => {
    getTokenRef.current = getToken;
    baseUrlRef.current = baseUrl;
    onErrorRef.current = onError;
  });

  // Cleanup on unmount, aborting any active request
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {};
    if (getTokenRef.current) {
      const token = await getTokenRef.current();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }, []);

  const handleError = useCallback((err: unknown): Error => {
    const error = err instanceof Error ? err : new Error(String(err));
    setError(error);
    onErrorRef.current?.(error);
    return error;
  }, []);

  const fetchBinding = useCallback(async () => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    setIsLoading(true);
    setError(null);

    try {
      const headers = await getHeaders();

      // Check if aborted before proceeding
      if (signal.aborted) return;

      const response = await getApiV1WalletsBinding({
        baseUrl: baseUrlRef.current,
        headers,
        signal,
      });

      if (response.error) {
        const errorMsg = response.error.error ?? "Failed to fetch bound wallets";
        throw new Error(errorMsg);
      }

      // Check if aborted before setting state
      if (signal.aborted) return;

      setWallets(response.data?.wallets ?? []);
      setTotals(response.data?.totals ?? null);
    } catch (err) {
      // Handle AbortError specifically - aborts are intentional, not errors
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      handleError(err);
    } finally {
      // Only update loading state if not aborted
      if (!signal.aborted) {
        setIsLoading(false);
      }
      // Clear abort controller reference if this is still the current request
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [getHeaders, handleError]);

  const refetch = useCallback(async () => {
    await fetchBinding();
  }, [fetchBinding]);

  const getNonce = useCallback(async (): Promise<HandlersNonceResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const headers = await getHeaders();

      const response = await postApiV1WalletsBindingNonce({
        baseUrl: baseUrlRef.current,
        headers,
      });

      if (response.error) {
        const errorMsg = response.error.error ?? "Failed to issue binding nonce";
        throw new Error(errorMsg);
      }

      return response.data ?? null;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, handleError]);

  const bindWallet = useCallback(
    async (request: HandlersBindRequest): Promise<HandlersBoundWalletResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const headers = await getHeaders();

        const response = await postApiV1WalletsBinding({
          baseUrl: baseUrlRef.current,
          headers,
          body: request,
        });

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to bind wallet";
          throw new Error(errorMsg);
        }

        // Refetch bound wallets after a successful bind
        await fetchBinding();

        return response.data ?? null;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [getHeaders, handleError, fetchBinding]
  );

  const unbindWallet = useCallback(
    async (address: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const headers = await getHeaders();

        const response = await deleteApiV1WalletsBindingByAddress({
          baseUrl: baseUrlRef.current,
          headers,
          path: { address },
        });

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to unbind wallet";
          throw new Error(errorMsg);
        }

        // Refetch bound wallets after a successful unbind
        await fetchBinding();

        return true;
      } catch (err) {
        handleError(err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getHeaders, handleError, fetchBinding]
  );

  // Only run on mount
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchBinding();
    }
    // Reset flag when autoFetch becomes false to allow re-fetching when it becomes true again
    if (!autoFetch) {
      hasFetchedRef.current = false;
    }
  }, [autoFetch, fetchBinding]);

  return {
    wallets,
    totals,
    pro: totals?.pro ?? null,
    isLoading,
    error,
    refetch,
    getNonce,
    bindWallet,
    unbindWallet,
  };
}
