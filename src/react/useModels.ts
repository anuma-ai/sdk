"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LlmapiModel, LlmapiModelsListResponse } from "../client";
import { getApiV1Models } from "../client/sdk.gen";
import { BASE_URL } from "../clientConfig";

/** How long a fetched model list stays fresh without a new request (5 minutes). */
const MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

/** One cached page of the model list, with the ETag the server sent for it. */
type CachedModelsPage = {
  body: LlmapiModelsListResponse;
  etag?: string;
};

type ModelsCacheEntry = {
  /** Pages of the list. The key is the page token, or "" for the first page. */
  pages: Map<string, CachedModelsPage>;
  models: LlmapiModel[];
  fetchedAt: number;
};

/** Session cache. The key covers the base URL, the provider filter and the auth identity. */
const modelsCache = new Map<string, ModelsCacheEntry>();

/**
 * A request in progress. Hooks that ask for the same key at the same time share one request.
 * The request counts the hooks that wait for it. It stops when the last one leaves.
 */
type SharedRequest = {
  promise: Promise<LlmapiModel[]>;
  controller: AbortController;
  waiters: number;
};

/** Requests in progress, one for each key. */
const modelsInFlight = new Map<string, SharedRequest>();

/**
 * Counts the calls to clearModelsCache. A request that started before a clear must not write to the
 * cache after it, because the caller cleared the cache to get a new list.
 */
let cacheGeneration = 0;

/**
 * Remove all cached model lists.
 * Call this when the user signs in or out and the next list must come from the server.
 * The cache key also contains a hash of the auth token, so a token change misses the cache.
 * A request that is in progress still ends for the hooks that wait for it, but it does not write
 * its list to the cache.
 */
export function clearModelsCache(): void {
  cacheGeneration++;
  modelsCache.clear();
  modelsInFlight.clear();
}

/** Drop cached entries for a different token fingerprint on the same base URL and provider. */
function pruneStaleTokenEntries(newKey: string): void {
  const [newBaseUrl, newProvider] = JSON.parse(newKey) as [string, string | null, string];
  for (const existingKey of modelsCache.keys()) {
    if (existingKey === newKey) continue;
    const [existingBaseUrl, existingProvider] = JSON.parse(existingKey) as [string, string | null, string];
    if (existingBaseUrl === newBaseUrl && existingProvider === newProvider) {
      modelsCache.delete(existingKey);
    }
  }
}

/** Make a short, non-reversible fingerprint of the token (cyrb53 hash). */
function fingerprintToken(token: string | undefined): string {
  if (!token) return "anon";
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < token.length; i++) {
    const ch = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function modelsCacheKey(baseUrl: string, provider: string | undefined, token?: string): string {
  return JSON.stringify([baseUrl, provider ?? null, fingerprintToken(token)]);
}

/**
 * Fetch every page of the model list.
 * A page with a stored ETag is requested with If-None-Match. A 304 answer reuses the stored page.
 * A server that sends no ETag, or never sends 304, gives a full body for each page.
 */
async function fetchAllModelPages(
  baseUrl: string,
  provider: string | undefined,
  headers: Record<string, string>,
  previous: ModelsCacheEntry | undefined,
  signal: AbortSignal
): Promise<ModelsCacheEntry> {
  const pages = new Map<string, CachedModelsPage>();
  const models: LlmapiModel[] = [];
  let pageToken: string | undefined;

  do {
    const pageKey = pageToken ?? "";
    const stored = previous?.pages.get(pageKey);

    const request = (etag?: string) =>
      getApiV1Models({
        baseUrl,
        headers: etag ? { ...headers, "If-None-Match": etag } : headers,
        query: { provider, page_token: pageToken },
        signal,
      });

    let response = await request(stored?.etag);

    // A network failure with a validator can come from a CORS rule that blocks
    // If-None-Match. Send the request again without it.
    if (stored?.etag && !response.response && response.error) {
      response = await request();
    }

    let page: CachedModelsPage;
    // The generated client returns a 304 answer as an error result, with the raw response attached.
    if (response.response?.status === 304) {
      if (!stored) throw new Error("Failed to fetch models");
      page = stored;
    } else {
      if (response.error) {
        const errorMsg = response.error.error ?? "Failed to fetch models";
        throw new Error(errorMsg);
      }
      page = {
        body: response.data ?? {},
        etag: response.response?.headers?.get("ETag") ?? undefined,
      };
    }

    pages.set(pageKey, page);
    models.push(...(page.body.data || []));
    pageToken = page.body.next_page_token;
  } while (pageToken);

  return { pages, models, fetchedAt: Date.now() };
}

/**
 * Get the model list for one cache key.
 * Fresh entries return with no request. Hooks that ask for the same key at the same time share one request.
 * A forced call starts a new request and takes over the key, so a request that does not end cannot block it.
 * The signal is the one of the calling hook. When every waiting hook has left, the request stops.
 */
function loadModels(
  key: string,
  baseUrl: string,
  provider: string | undefined,
  headers: Record<string, string>,
  force: boolean,
  signal: AbortSignal
): Promise<LlmapiModel[]> {
  const cached = modelsCache.get(key);
  if (cached && !force && Date.now() - cached.fetchedAt < MODELS_CACHE_TTL_MS) {
    return Promise.resolve([...cached.models]);
  }

  const shared =
    (force ? undefined : modelsInFlight.get(key)) ??
    startSharedRequest(key, baseUrl, provider, headers, cached);
  return waitForSharedRequest(key, shared, signal).then((models) => [...models]);
}

function startSharedRequest(
  key: string,
  baseUrl: string,
  provider: string | undefined,
  headers: Record<string, string>,
  previous: ModelsCacheEntry | undefined
): SharedRequest {
  const controller = new AbortController();
  const generation = cacheGeneration;
  const shared: SharedRequest = {
    controller,
    waiters: 0,
    promise: Promise.resolve([]),
  };
  shared.promise = fetchAllModelPages(baseUrl, provider, headers, previous, controller.signal)
    .then((entry) => {
      // Only the newest request for the key may write to the cache, and only if no clear ran since
      // it started.
      if (modelsInFlight.get(key) === shared && generation === cacheGeneration) {
        pruneStaleTokenEntries(key);
        modelsCache.set(key, entry);
      }
      return entry.models;
    })
    .finally(() => {
      if (modelsInFlight.get(key) === shared) modelsInFlight.delete(key);
    });
  modelsInFlight.set(key, shared);
  return shared;
}

function waitForSharedRequest(
  key: string,
  shared: SharedRequest,
  signal: AbortSignal
): Promise<LlmapiModel[]> {
  shared.waiters++;
  let left = false;
  const leave = () => {
    if (left) return;
    left = true;
    shared.waiters--;
    if (shared.waiters === 0) {
      // No hook waits for this request now. Stop the work.
      shared.controller.abort();
      if (modelsInFlight.get(key) === shared) modelsInFlight.delete(key);
    }
  };

  if (signal.aborted) {
    leave();
  } else {
    signal.addEventListener("abort", leave, { once: true });
  }
  return shared.promise.finally(() => {
    left = true;
    signal.removeEventListener("abort", leave);
  });
}

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

  // Use refs to avoid recreating callbacks when these change
  const getTokenRef = useRef(getToken);
  const baseUrlRef = useRef(baseUrl);
  const providerRef = useRef(provider);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update refs when values change
  useEffect(() => {
    getTokenRef.current = getToken;
    baseUrlRef.current = baseUrl;
    providerRef.current = provider;
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

  const fetchModels = useCallback(async (force = false) => {
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
      let token: string | undefined;
      if (getTokenRef.current) {
        token = (await getTokenRef.current()) ?? undefined;
      }

      // Check if aborted before proceeding
      if (signal.aborted) return;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const baseUrl = baseUrlRef.current;
      const provider = providerRef.current;
      const key = modelsCacheKey(baseUrl, provider, token);

      // The request is shared with other hooks. Aborting this hook's signal removes this hook from
      // the wait. The request itself stops only when no hook waits for it.
      const allModels = await loadModels(key, baseUrl, provider, headers, force, signal);

      // Check if aborted before setting state
      if (signal.aborted) return;

      setModels(allModels);
    } catch (err) {
      // Handle AbortError specifically - aborts are intentional, not errors
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      // An aborted hook ignores the error of a request that it no longer needs.
      if (signal.aborted) return;

      setError(err instanceof Error ? err : new Error(String(err)));
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
  }, []);

  const refetch = useCallback(async () => {
    setModels([]);
    // A manual refetch skips the fresh-cache shortcut. It still sends If-None-Match.
    await fetchModels(true);
  }, [fetchModels]);

  // Only run on mount
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchModels();
    }
    // Reset flag when autoFetch becomes false to allow re-fetching when it becomes true again
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
