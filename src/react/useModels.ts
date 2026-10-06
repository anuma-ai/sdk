"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LlmapiModel, LlmapiModelsListResponse } from "../client";
import { getApiV1Models } from "../client/sdk.gen";
import { BASE_URL } from "../clientConfig";

const MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedModelsPage = {
  body: LlmapiModelsListResponse;
  etag?: string;
};

type ModelsCacheEntry = {
  pages: Map<string, CachedModelsPage>;
  models: LlmapiModel[];
  fetchedAt: number;
};

const modelsCache = new Map<string, ModelsCacheEntry>();

type SharedRequest = {
  promise: Promise<LlmapiModel[]>;
  controller: AbortController;
  waiters: number;
};

const modelsInFlight = new Map<string, SharedRequest>();

let cacheGeneration = 0;

/** Clear all cached model lists. */
export function clearModelsCache(): void {
  cacheGeneration++;
  modelsCache.clear();
  modelsInFlight.clear();
}

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
    if (stored?.etag && !response.response && response.error) {
      response = await request();
    }

    let page: CachedModelsPage;
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

  const fetchModels = useCallback(async (force = false) => {
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

      const baseUrl = baseUrlRef.current;
      const provider = providerRef.current;
      const key = modelsCacheKey(baseUrl, provider, token);
      const allModels = await loadModels(key, baseUrl, provider, headers, force, signal);

      if (signal.aborted) return;

      setModels(allModels);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (signal.aborted) return;

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
    await fetchModels(true);
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
