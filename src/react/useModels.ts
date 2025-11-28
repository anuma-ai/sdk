"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiV1Models } from "../client/sdk.gen";
import { BASE_URL } from "../clientConfig";
import type { LlmapiModel } from "../client";

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
 */
export function useModels(options: UseModelsOptions = {}): UseModelsResult {
  const { getToken, baseUrl = BASE_URL, provider, autoFetch = true } = options;

  const [models, setModels] = useState<LlmapiModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs to avoid recreating callbacks when these change
  const getTokenRef = useRef(getToken);
  const baseUrlRef = useRef(baseUrl);
  const providerRef = useRef(provider);

  // Update refs when values change
  useEffect(() => {
    getTokenRef.current = getToken;
    baseUrlRef.current = baseUrl;
    providerRef.current = provider;
  });

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let token: string | undefined;
      if (getTokenRef.current) {
        token = (await getTokenRef.current()) ?? undefined;
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let allModels: LlmapiModel[] = [];
      let nextPageToken: string | undefined;

      do {
        const response = await getApiV1Models({
          baseUrl: baseUrlRef.current,
          headers,
          query: {
            provider: providerRef.current,
            page_token: nextPageToken,
          },
        });

        if (response.error) {
          const err = response.error as unknown;
          const errorMsg =
            typeof err === "object" && err !== null
              ? JSON.stringify(err)
              : String(err);
          throw new Error(errorMsg);
        }

        if (response.data) {
          const newModels = response.data.data || [];
          allModels = [...allModels, ...newModels];
          nextPageToken = response.data.next_page_token;
        }
      } while (nextPageToken);

      setModels(allModels);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    setModels([]);
    await fetchModels();
  }, [fetchModels]);

  // Only run on mount
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchModels();
    }
  }, [autoFetch, fetchModels]);

  return {
    models,
    isLoading,
    error,
    refetch,
  };
}
