"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BASE_URL } from "../clientConfig";
import {
  filterServerTools,
  getServerTools,
  getToolsChecksum,
  type ServerTool,
  shouldRefreshTools,
} from "../lib/tools";

/**
 * @inline
 */
export type UseToolsOptions = {
  /**
   * Custom function to get auth token for API calls
   */
  getToken: () => Promise<string | null>;
  /**
   * Optional base URL for the API requests.
   */
  baseUrl?: string;
  /**
   * Filter to include only specific tools by name.
   * - undefined: include all tools
   * - []: include no tools
   * - ['tool1', 'tool2']: include only named tools
   */
  includeTools?: string[];
  /**
   * Whether to fetch tools automatically on mount (default: true)
   */
  autoFetch?: boolean;
};

export type UseToolsResult = {
  /** Available server tools */
  tools: ServerTool[];
  /** Current tools checksum from cache */
  checksum: string | undefined;
  /** Whether tools are being fetched */
  isLoading: boolean;
  /** Error from the last fetch attempt */
  error: Error | null;
  /**
   * Refresh tools from the server.
   * @param force - Force refresh even if cache is valid
   */
  refresh: (force?: boolean) => Promise<void>;
  /**
   * Check if tools need to be refreshed based on a response checksum.
   * If the checksum differs from cached, automatically triggers a refresh.
   * @param responseChecksum - Checksum from a chat response
   * @returns true if refresh was triggered
   */
  checkForUpdates: (responseChecksum: string | undefined) => boolean;
};

/**
 * React hook for fetching and caching server-side tools.
 *
 * This hook provides:
 * - Automatic fetching of tools on mount
 * - Caching with localStorage persistence
 * - Checksum-based cache invalidation
 * - Automatic refresh when tools change on the server
 *
 * @example
 * ```tsx
 * const { tools, checkForUpdates, refresh } = useTools({
 *   getToken: async () => authToken,
 * });
 *
 * // After sending a message, check if tools need refresh
 * const result = await sendMessage({ messages, model });
 * checkForUpdates(result.toolsChecksum);
 * ```
 *
 * @category Hooks
 */
export function useTools(options: UseToolsOptions): UseToolsResult {
  const { getToken, baseUrl = BASE_URL, includeTools, autoFetch = true } = options;

  const [tools, setTools] = useState<ServerTool[]>([]);
  const [checksum, setChecksum] = useState<string | undefined>(getToolsChecksum);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs to avoid recreating callbacks when these change
  const getTokenRef = useRef(getToken);
  const baseUrlRef = useRef(baseUrl);
  const includeToolsRef = useRef(includeTools);

  // Update refs when values change
  useEffect(() => {
    getTokenRef.current = getToken;
    baseUrlRef.current = baseUrl;
    includeToolsRef.current = includeTools;
  });

  const fetchTools = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedTools = await getServerTools({
        getToken: getTokenRef.current,
        baseUrl: baseUrlRef.current,
        forceRefresh,
      });

      // Filter tools if includeTools is specified
      const filteredTools = filterServerTools(fetchedTools, includeToolsRef.current);

      setTools(filteredTools);
      setChecksum(getToolsChecksum());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      await fetchTools(force);
    },
    [fetchTools]
  );

  const checkForUpdates = useCallback(
    (responseChecksum: string | undefined): boolean => {
      if (shouldRefreshTools(responseChecksum)) {
        // Trigger refresh in background (don't await)
        void refresh(true);
        return true;
      }
      return false;
    },
    [refresh]
  );

  // Re-filter tools when includeTools changes
  useEffect(() => {
    if (tools.length > 0 && includeTools !== undefined) {
      setTools((currentTools) => filterServerTools(currentTools, includeTools));
    }
  }, [includeTools, tools.length]);

  // Fetch on mount
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchTools();
    }
    if (!autoFetch) {
      hasFetchedRef.current = false;
    }
  }, [autoFetch, fetchTools]);

  return {
    tools,
    checksum,
    isLoading,
    error,
    refresh,
    checkForUpdates,
  };
}
