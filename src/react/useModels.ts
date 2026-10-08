"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LlmapiModel } from "../client";
import { getApiV1Models } from "../client/sdk.gen";
import { BASE_URL } from "../clientConfig";

/**
 * @inline
 */
export type UseModelsOptions = {
  /**
   * Custom function to get auth token for API calls
   */
  getToken?: () => Promise<string | null>;
  /**
   * Optional base URL for the API requests.
   */
  baseUrl?: string;
  /**
   * Optional filter for specific provider (e.g. "openai")
   */
  provider?: string;
  /**
   * Whether to fetch models automatically on mount (default: true)
   */
  autoFetch?: boolean;
};

export type UseModelsResult = {
  models: LlmapiModel[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

/**
 * React hook for fetching available LLM models.
 * Automatically fetches all available models.
 * @category Hooks
 */
export function useModels(options: UseModelsOptions = {}): UseModelsResult {
  const { getToken, baseUrl = BASE_URL, provider, autoFetch = true } = options;

  const [models, setModels] = useState<LlmapiModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getTokenRef = useRef(getToken);
  const baseUrlRef = useRef(baseUrl);
  const providerRef = useRef(provider);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
    baseUrlRef.current = baseUrl;
    providerRef.current = provider;
  });

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const fetchModels = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    setIsLoading(true);
    setError(null);

    try {
      let token: string | undefined;
      if (getTokenRef.current) {
        token = (await getTokenRef.current()) ?? undefined;
      }

      if (signal.aborted) return;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let allModels: LlmapiModel[] = [];
      let nextPageToken: string | undefined;

      do {
        if (signal.aborted) return;

        const response = await getApiV1Models({
          baseUrl: baseUrlRef.current,
          headers,
          query: {
            provider: providerRef.current,
            page_token: nextPageToken,
          },
          signal,
        });

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to fetch models";
          throw new Error(errorMsg);
        }

        if (response.data) {
          const newModels = response.data.data || [];
          allModels = [...allModels, ...newModels];
          nextPageToken = response.data.next_page_token;
        }
      } while (nextPageToken);

      if (signal.aborted) return;

      setModels(allModels);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const refetch = useCallback(async () => {
    setModels([]);
    await fetchModels();
  }, [fetchModels]);

  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchModels();
    }
    if (!autoFetch) {
      hasFetchedRef.current = false;
    }
  }, [autoFetch, fetchModels]);

  return {
    models,
    isLoading,
    error,
    refetch,
  };
}
