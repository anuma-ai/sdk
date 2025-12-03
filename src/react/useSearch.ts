"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { postApiV1Search } from "../client/sdk.gen";
import { BASE_URL } from "../clientConfig";
import type {
  LlmapiSearchRequest,
  LlmapiSearchResponse,
  LlmapiSearchResult,
} from "../client";

export type UseSearchOptions = {
  /**
   * Custom function to get auth token for API calls
   */
  getToken?: () => Promise<string | null>;
  /**
   * Optional base URL for the API requests.
   */
  baseUrl?: string;
  /**
   * Callback function to be called when an error is encountered.
   */
  onError?: (error: Error) => void;
};

export type SearchOptions = Omit<LlmapiSearchRequest, "query">;

export type UseSearchResult = {
  isLoading: boolean;
  search: (
    query: string | string[],
    options?: SearchOptions
  ) => Promise<LlmapiSearchResponse | null>;
  results: LlmapiSearchResult[] | null;
  response: LlmapiSearchResponse | null;
  error: Error | null;
};

/**
 * React hook for performing search operations using the AI SDK.
 *
 * @param options - Configuration options for the search hook
 * @returns Object containing search function, results, loading state, and error
 *
 * @example
 * ```tsx
 * const { search, results, isLoading } = useSearch({
 *   getToken: async () => "my-token"
 * });
 *
 * const handleSearch = async () => {
 *   await search("What is ZetaChain?");
 * };
 * ```
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchResult {
  const { getToken, baseUrl = BASE_URL, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<LlmapiSearchResult[] | null>(null);
  const [response, setResponse] = useState<LlmapiSearchResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const search = useCallback(
    async (
      query: string | string[],
      searchOptions: SearchOptions = {}
    ): Promise<LlmapiSearchResponse | null> => {
      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setError(null);
      setResults(null);
      setResponse(null);

      try {
        let token: string | undefined;
        if (getToken) {
          token = (await getToken()) ?? undefined;
        }

        if (abortController.signal.aborted) return null;

        const queryArray = Array.isArray(query) ? query : [query];

        const res = await postApiV1Search({
          baseUrl,
          body: {
            query: queryArray,
            ...searchOptions,
          },
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
          signal: abortController.signal,
        });

        if (res.error) {
          const errorMsg =
            (res.error as any).error ||
            (res.error as any).message ||
            "Failed to perform search";
          throw new Error(errorMsg);
        }

        if (res.data) {
          setResponse(res.data);
          setResults(res.data.results || []);
          return res.data;
        }

        return null;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }

        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);

        if (onError) {
          onError(errorObj);
        }

        return null;
      } finally {
        if (abortControllerRef.current === abortController) {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [baseUrl, getToken, onError]
  );

  return {
    isLoading,
    search,
    results,
    response,
    error,
  };
}
