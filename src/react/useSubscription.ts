"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  HandlersCancelSubscriptionResponse,
  HandlersRenewSubscriptionResponse,
  HandlersSubscriptionStatusResponse,
} from "../client";
import {
  getApiV1SubscriptionsStatus,
  postApiV1SubscriptionsCancel,
  postApiV1SubscriptionsCreateCheckoutSession,
  postApiV1SubscriptionsCustomerPortal,
  postApiV1SubscriptionsRenew,
} from "../client/sdk.gen";
import { BASE_URL } from "../clientConfig";

/**
 * @inline
 */
export type UseSubscriptionOptions = {
  /**
   * Custom function to get auth token for API calls
   */
  getToken?: () => Promise<string | null>;
  /**
   * Optional base URL for the API requests.
   */
  baseUrl?: string;
  /**
   * Whether to fetch subscription status automatically on mount (default: true)
   */
  autoFetch?: boolean;
  /**
   * Optional callback for error handling
   */
  onError?: (error: Error) => void;
};

export type UseSubscriptionResult = {
  /**
   * Current subscription status
   */
  status: HandlersSubscriptionStatusResponse | null;
  /**
   * Whether any operation is in progress
   */
  isLoading: boolean;
  /**
   * Error from the last operation
   */
  error: Error | null;
  /**
   * Refetch the subscription status
   */
  refetch: () => Promise<void>;
  /**
   * Create a Stripe checkout session for a subscription plan
   * @returns The checkout URL or null on error
   */
  createCheckoutSession: (options?: {
    tier?: string;
    interval?: string;
    successUrl?: string;
    cancelUrl?: string;
  }) => Promise<string | null>;
  /**
   * Open the Stripe customer portal for managing billing
   * @returns The portal URL or null on error
   */
  openCustomerPortal: (options?: { returnUrl?: string }) => Promise<string | null>;
  /**
   * Cancel the subscription at the end of the current period
   * @returns The cancellation response or null on error
   */
  cancelSubscription: () => Promise<HandlersCancelSubscriptionResponse | null>;
  /**
   * Reactivate a cancelled subscription
   * @returns The renewal response or null on error
   */
  renewSubscription: () => Promise<HandlersRenewSubscriptionResponse | null>;
};

/**
 * React hook for managing subscription status and billing operations.
 * Provides methods to check status, upgrade, manage billing, cancel, and renew subscriptions.
 * @category Hooks
 */
export function useSubscription(options: UseSubscriptionOptions = {}): UseSubscriptionResult {
  const { getToken, baseUrl = BASE_URL, autoFetch = true, onError } = options;

  const [status, setStatus] = useState<HandlersSubscriptionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getTokenRef = useRef(getToken);
  const baseUrlRef = useRef(baseUrl);
  const onErrorRef = useRef(onError);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);
  const loadingCountRef = useRef(0);

  useEffect(() => {
    getTokenRef.current = getToken;
    baseUrlRef.current = baseUrl;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    return () => {
      hasFetchedRef.current = false;
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

  const fetchStatus = useCallback(async () => {
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

      const response = await getApiV1SubscriptionsStatus({
        baseUrl: baseUrlRef.current,
        headers,
        signal,
      });

      if (signal.aborted) return;

      if (response.error) {
        const errorMsg = response.error.error ?? "Failed to fetch subscription status";
        throw Object.assign(new Error(errorMsg), { cause: response.error });
      }

      setStatus(response.data ?? null);
    } catch (err) {
      if (signal.aborted || (err instanceof Error && err.name === "AbortError")) {
        return;
      }
      handleError(err);
    } finally {
      stopLoading();
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [getHeaders, handleError, startLoading, stopLoading]);

  const refetch = useCallback(async () => {
    setStatus(null);
    await fetchStatus();
  }, [fetchStatus]);

  const createCheckoutSession = useCallback(
    async (opts?: {
      tier?: string;
      interval?: string;
      successUrl?: string;
      cancelUrl?: string;
    }): Promise<string | null> => {
      startLoading();
      setError(null);

      try {
        const headers = await getHeaders();

        const response = await postApiV1SubscriptionsCreateCheckoutSession({
          baseUrl: baseUrlRef.current,
          headers,
          body: {
            tier: opts?.tier,
            interval: opts?.interval,
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

  const openCustomerPortal = useCallback(
    async (opts?: { returnUrl?: string }): Promise<string | null> => {
      startLoading();
      setError(null);

      try {
        const headers = await getHeaders();

        const response = await postApiV1SubscriptionsCustomerPortal({
          baseUrl: baseUrlRef.current,
          headers,
          body: {
            return_url: opts?.returnUrl,
          },
        });

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to open customer portal";
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

  const cancelSubscription =
    useCallback(async (): Promise<HandlersCancelSubscriptionResponse | null> => {
      startLoading();
      setError(null);

      try {
        const headers = await getHeaders();

        const response = await postApiV1SubscriptionsCancel({
          baseUrl: baseUrlRef.current,
          headers,
        });

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to cancel subscription";
          throw new Error(errorMsg);
        }

        await fetchStatus();

        return response.data ?? null;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        stopLoading();
      }
    }, [getHeaders, handleError, startLoading, stopLoading, fetchStatus]);

  const renewSubscription =
    useCallback(async (): Promise<HandlersRenewSubscriptionResponse | null> => {
      startLoading();
      setError(null);

      try {
        const headers = await getHeaders();

        const response = await postApiV1SubscriptionsRenew({
          baseUrl: baseUrlRef.current,
          headers,
        });

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to renew subscription";
          throw new Error(errorMsg);
        }

        await fetchStatus();

        return response.data ?? null;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        stopLoading();
      }
    }, [getHeaders, handleError, startLoading, stopLoading, fetchStatus]);

  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchStatus();
    }
    if (!autoFetch) {
      hasFetchedRef.current = false;
    }
  }, [autoFetch, fetchStatus]);

  return {
    status,
    isLoading,
    error,
    refetch,
    createCheckoutSession,
    openCustomerPortal,
    cancelSubscription,
    renewSubscription,
  };
}
