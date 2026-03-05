"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { HandlersCreatePhoneCallRequest, HandlersPhoneCallResponse } from "../client";
import { getApiV1Config, getApiV1PhoneCallsByCallId, postApiV1PhoneCalls } from "../client/sdk.gen";
import { BASE_URL } from "../clientConfig";

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const DEFAULT_POLL_MAX_ATTEMPTS = 60;

/**
 * @inline
 */
export type UsePhoneCallsOptions = {
  /**
   * Custom function to get auth token for API calls
   */
  getToken?: () => Promise<string | null>;
  /**
   * Optional base URL for the API requests.
   */
  baseUrl?: string;
  /**
   * Whether to fetch feature availability automatically on mount (default: true)
   */
  autoFetchAvailability?: boolean;
  /**
   * Optional callback for error handling
   */
  onError?: (error: Error) => void;
};

export type PhoneCallPollingOptions = {
  /**
   * Poll interval in milliseconds.
   */
  intervalMs?: number;
  /**
   * Maximum number of polling attempts before stopping.
   */
  maxAttempts?: number;
  /**
   * Stop automatically when the call reports completion.
   */
  stopWhenCompleted?: boolean;
  /**
   * Optional callback after each successful poll response.
   */
  onUpdate?: (call: HandlersPhoneCallResponse) => void;
};

export type UsePhoneCallsResult = {
  /**
   * Whether phone calling is enabled on the connected portal.
   */
  isEnabled: boolean | null;
  /**
   * The latest phone call loaded by this hook.
   */
  currentCall: HandlersPhoneCallResponse | null;
  /**
   * Whether a non-polling request is in flight.
   */
  isLoading: boolean;
  /**
   * Whether a polling loop is currently active.
   */
  isPolling: boolean;
  /**
   * Error from the last operation.
   */
  error: Error | null;
  /**
   * Fetch whether phone calling is enabled.
   */
  fetchAvailability: () => Promise<boolean | null>;
  /**
   * Create a phone call.
   */
  createPhoneCall: (
    request: HandlersCreatePhoneCallRequest
  ) => Promise<HandlersPhoneCallResponse | null>;
  /**
   * Fetch a phone call by call ID.
   */
  getPhoneCall: (callId: string) => Promise<HandlersPhoneCallResponse | null>;
  /**
   * Poll a phone call until completion or the polling limit is reached.
   */
  pollPhoneCall: (
    callId: string,
    options?: PhoneCallPollingOptions
  ) => Promise<HandlersPhoneCallResponse | null>;
  /**
   * Stop any active polling loop.
   */
  stopPolling: () => void;
  /**
   * Clear the current call and last error.
   */
  reset: () => void;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * React hook for phone calling: checking availability, creating calls,
 * fetching their status, and polling for completion.
 * @category Hooks
 */
export function usePhoneCalls(options: UsePhoneCallsOptions = {}): UsePhoneCallsResult {
  const { getToken, baseUrl = BASE_URL, autoFetchAvailability = true, onError } = options;

  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [currentCall, setCurrentCall] = useState<HandlersPhoneCallResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getTokenRef = useRef(getToken);
  const baseUrlRef = useRef(baseUrl);
  const onErrorRef = useRef(onError);
  const loadingCountRef = useRef(0);
  const requestAbortControllerRef = useRef<AbortController | null>(null);
  const pollAbortControllerRef = useRef<AbortController | null>(null);
  const pollRunIdRef = useRef(0);

  useEffect(() => {
    getTokenRef.current = getToken;
    baseUrlRef.current = baseUrl;
    onErrorRef.current = onError;
  });

  const stopPolling = useCallback(() => {
    pollRunIdRef.current += 1;
    if (pollAbortControllerRef.current) {
      pollAbortControllerRef.current.abort();
      pollAbortControllerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    return () => {
      if (requestAbortControllerRef.current) {
        requestAbortControllerRef.current.abort();
        requestAbortControllerRef.current = null;
      }
      pollRunIdRef.current += 1;
      if (pollAbortControllerRef.current) {
        pollAbortControllerRef.current.abort();
        pollAbortControllerRef.current = null;
      }
    };
  }, []);

  const startLoading = useCallback(() => {
    loadingCountRef.current += 1;
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    setIsLoading(loadingCountRef.current > 0);
  }, []);

  const handleError = useCallback((err: unknown): Error => {
    const nextError = err instanceof Error ? err : new Error(String(err));
    setError(nextError);
    onErrorRef.current?.(nextError);
    return nextError;
  }, []);

  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {};
    if (getTokenRef.current) {
      const token = await getTokenRef.current();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    return headers;
  }, []);

  const fetchAvailability = useCallback(async (): Promise<boolean | null> => {
    if (requestAbortControllerRef.current) {
      requestAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    requestAbortControllerRef.current = abortController;

    startLoading();
    setError(null);

    try {
      const headers = await getHeaders();
      if (abortController.signal.aborted) {
        return null;
      }

      const response = await getApiV1Config({
        baseUrl: baseUrlRef.current,
        headers,
        signal: abortController.signal,
      });

      if (response.error) {
        const errorMsg = response.error.error ?? "Failed to fetch phone calling availability";
        throw new Error(errorMsg);
      }

      const enabled = response.data?.phone_calls_enabled ?? false;
      setIsEnabled(enabled);
      return enabled;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }
      handleError(err);
      return null;
    } finally {
      stopLoading();
      if (requestAbortControllerRef.current === abortController) {
        requestAbortControllerRef.current = null;
      }
    }
  }, [getHeaders, handleError, startLoading, stopLoading]);

  const createPhoneCall = useCallback(
    async (request: HandlersCreatePhoneCallRequest): Promise<HandlersPhoneCallResponse | null> => {
      startLoading();
      setError(null);

      try {
        const headers = await getHeaders();
        const response = await postApiV1PhoneCalls({
          baseUrl: baseUrlRef.current,
          headers,
          body: request,
        });

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to create phone call";
          throw new Error(errorMsg);
        }

        const nextCall = response.data ?? null;
        setCurrentCall(nextCall);
        return nextCall;
      } catch (err) {
        handleError(err);
        return null;
      } finally {
        stopLoading();
      }
    },
    [getHeaders, handleError, startLoading, stopLoading]
  );

  const getPhoneCall = useCallback(
    async (callId: string): Promise<HandlersPhoneCallResponse | null> => {
      const trimmedCallId = callId.trim();
      if (!trimmedCallId) {
        handleError(new Error("Call ID is required"));
        return null;
      }

      if (requestAbortControllerRef.current) {
        requestAbortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      requestAbortControllerRef.current = abortController;

      startLoading();
      setError(null);

      try {
        const headers = await getHeaders();
        if (abortController.signal.aborted) {
          return null;
        }

        const response = await getApiV1PhoneCallsByCallId({
          baseUrl: baseUrlRef.current,
          headers,
          path: {
            call_id: trimmedCallId,
          },
          signal: abortController.signal,
        });

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to fetch phone call";
          throw new Error(errorMsg);
        }

        const nextCall = response.data ?? null;
        setCurrentCall(nextCall);
        return nextCall;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        handleError(err);
        return null;
      } finally {
        stopLoading();
        if (requestAbortControllerRef.current === abortController) {
          requestAbortControllerRef.current = null;
        }
      }
    },
    [getHeaders, handleError, startLoading, stopLoading]
  );

  const pollPhoneCall = useCallback(
    async (
      callId: string,
      pollOptions: PhoneCallPollingOptions = {}
    ): Promise<HandlersPhoneCallResponse | null> => {
      const trimmedCallId = callId.trim();
      if (!trimmedCallId) {
        handleError(new Error("Call ID is required"));
        return null;
      }

      stopPolling();
      setError(null);

      const runId = pollRunIdRef.current + 1;
      pollRunIdRef.current = runId;
      setIsPolling(true);

      const intervalMs = pollOptions.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
      const maxAttempts = pollOptions.maxAttempts ?? DEFAULT_POLL_MAX_ATTEMPTS;
      const stopWhenCompleted = pollOptions.stopWhenCompleted ?? true;

      let latestCall: HandlersPhoneCallResponse | null = null;

      try {
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          if (pollRunIdRef.current !== runId) {
            break;
          }

          const abortController = new AbortController();
          pollAbortControllerRef.current = abortController;

          const headers = await getHeaders();
          if (abortController.signal.aborted || pollRunIdRef.current !== runId) {
            break;
          }

          const response = await getApiV1PhoneCallsByCallId({
            baseUrl: baseUrlRef.current,
            headers,
            path: {
              call_id: trimmedCallId,
            },
            signal: abortController.signal,
          });

          if (response.error) {
            const errorMsg = response.error.error ?? "Failed to poll phone call";
            throw new Error(errorMsg);
          }

          latestCall = response.data ?? null;
          setCurrentCall(latestCall);

          if (latestCall) {
            pollOptions.onUpdate?.(latestCall);
            if (stopWhenCompleted && latestCall.completed) {
              break;
            }
          }

          if (attempt < maxAttempts - 1) {
            await wait(intervalMs);
          }
        }
      } catch (err) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          handleError(err);
        }
      } finally {
        if (pollRunIdRef.current === runId) {
          setIsPolling(false);
          pollAbortControllerRef.current = null;
        }
      }

      return latestCall;
    },
    [getHeaders, handleError, stopPolling]
  );

  const reset = useCallback(() => {
    setCurrentCall(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!autoFetchAvailability) {
      return;
    }
    void fetchAvailability();
  }, [autoFetchAvailability, fetchAvailability]);

  return {
    isEnabled,
    currentCall,
    isLoading,
    isPolling,
    error,
    fetchAvailability,
    createPhoneCall,
    getPhoneCall,
    pollPhoneCall,
    stopPolling,
    reset,
  };
}
