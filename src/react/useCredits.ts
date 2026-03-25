"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  HandlersClaimDailyCreditsResponse,
  HandlersCreditBalanceResponse,
  HandlersCreditPack,
} from "../client";
import {
  getApiV1CreditsBalance,
  getApiV1CreditsPacks,
  postApiV1CreditsClaimDaily,
  postApiV1CreditsPurchase,
} from "../client/sdk.gen";
import { BASE_URL } from "../clientConfig";

/**
 * @inline
 */
export type UseCreditsOptions = {
  /**
   * Custom function to get auth token for API calls
   */
  getToken?: () => Promise<string | null>;
  /**
   * Optional base URL for the API requests.
   */
  baseUrl?: string;
  /**
   * Whether to fetch credit balance automatically on mount (default: true)
   */
  autoFetch?: boolean;
  /**
   * Optional callback for error handling
   */
  onError?: (error: Error) => void;
};

export type UseCreditsResult = {
  /**
   * Current credit balance and related info
   */
  balance: HandlersCreditBalanceResponse | null;
  /**
   * Available credit packs for purchase
   */
  packs: HandlersCreditPack[];
  /**
   * Whether any operation is in progress
   */
  isLoading: boolean;
  /**
   * Error from the last operation
   */
  error: Error | null;
  /**
   * Refetch the credit balance
   */
  refetch: () => Promise<void>;
  /**
   * Fetch available credit packs
   */
  fetchPacks: () => Promise<void>;
  /**
   * Claim free daily credits (once per 24 hours)
   * @returns The claim response or null on error
   */
  claimDailyCredits: () => Promise<HandlersClaimDailyCreditsResponse | null>;
  /**
   * Create a Stripe checkout session for purchasing a credit pack
   * @param credits - Number of credits to purchase
   * @returns The checkout URL or null on error
   */
  purchaseCredits: (
    credits: number,
    options?: { successUrl?: string; cancelUrl?: string }
  ) => Promise<string | null>;
};

/**
 * React hook for managing credits: checking balance, claiming daily credits,
 * browsing packs, and purchasing credits.
 * @category Hooks
 */
export function useCredits(options: UseCreditsOptions = {}): UseCreditsResult {
  const { getToken, baseUrl = BASE_URL, autoFetch = true, onError } = options;

  const [balance, setBalance] = useState<HandlersCreditBalanceResponse | null>(null);
  const [packs, setPacks] = useState<HandlersCreditPack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingCountRef = useRef(0);

  const getTokenRef = useRef(getToken);
  const baseUrlRef = useRef(baseUrl);
  const onErrorRef = useRef(onError);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
    baseUrlRef.current = baseUrl;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const startLoading = useCallback(() => {
    loadingCountRef.current++;
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    setIsLoading(loadingCountRef.current > 0);
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

  const fetchBalance = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    startLoading();
    setError(null);

    try {
      const headers = await getHeaders();
      if (signal.aborted) return;

      const response = await getApiV1CreditsBalance({
        baseUrl: baseUrlRef.current,
        headers,
        signal,
      });

      if (response.error) {
        const errorMsg = response.error.error ?? "Failed to fetch credit balance";
        throw new Error(errorMsg);
      }

      if (signal.aborted) return;
      setBalance(response.data ?? null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      handleError(err);
    } finally {
      stopLoading();
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [getHeaders, handleError, startLoading, stopLoading]);

  const refetch = useCallback(async () => {
    setBalance(null);
    await fetchBalance();
  }, [fetchBalance]);

  const fetchPacks = useCallback(async () => {
    startLoading();
    setError(null);

    try {
      const headers = await getHeaders();

      const response = await getApiV1CreditsPacks({
        baseUrl: baseUrlRef.current,
        headers,
      });

      if (response.error) {
        const errorMsg = response.error.error ?? "Failed to fetch credit packs";
        throw new Error(errorMsg);
      }

      setPacks(response.data?.packs ?? []);
    } catch (err) {
      handleError(err);
    } finally {
      stopLoading();
    }
  }, [getHeaders, handleError, startLoading, stopLoading]);

  const claimDailyCredits =
    useCallback(async (): Promise<HandlersClaimDailyCreditsResponse | null> => {
      startLoading();
      setError(null);

      try {
        const headers = await getHeaders();

        const response = await postApiV1CreditsClaimDaily({
          baseUrl: baseUrlRef.current,
          headers,
        });

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to claim daily credits";
          throw new Error(errorMsg);
        }

        // Refetch balance after claiming
        await fetchBalance();

        return response.data ?? null;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        stopLoading();
      }
    }, [getHeaders, handleError, fetchBalance, startLoading, stopLoading]);

  const purchaseCredits = useCallback(
    async (
      credits: number,
      opts?: { successUrl?: string; cancelUrl?: string }
    ): Promise<string | null> => {
      startLoading();
      setError(null);

      try {
        const headers = await getHeaders();

        const response = await postApiV1CreditsPurchase({
          baseUrl: baseUrlRef.current,
          headers,
          body: {
            credits,
            success_url: opts?.successUrl,
            cancel_url: opts?.cancelUrl,
          },
        });

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to create checkout session";
          throw new Error(errorMsg);
        }

        return response.data?.url ?? null;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        stopLoading();
      }
    },
    [getHeaders, handleError, startLoading, stopLoading]
  );

  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchBalance();
    }
    if (!autoFetch) {
      hasFetchedRef.current = false;
    }
  }, [autoFetch, fetchBalance]);

  return {
    balance,
    packs,
    isLoading,
    error,
    refetch,
    fetchPacks,
    claimDailyCredits,
    purchaseCredits,
  };
}
