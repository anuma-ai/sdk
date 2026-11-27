"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

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
   * Fetch the bound wallets on mount and when the session key changes (default: true).
   */
  autoFetch?: boolean;
  /**
   * Optional callback for error handling
   */
  onError?: (error: Error) => void;
  /** A stable account or session ID, or null when the user is signed out. */
  sessionKey?: string | null;
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

type WalletBindingState = Pick<
  UseWalletBindingResult,
  "wallets" | "totals" | "isLoading" | "error"
>;

/**
 * React hook for managing ZETA wallet bindings and reading staked-based Pro status.
 * Provides methods to list bound wallets, request a binding nonce, bind a wallet
 * with a signed proof, and unbind a wallet.
 * @category Hooks
 */
export function useWalletBinding(options: UseWalletBindingOptions = {}): UseWalletBindingResult {
  const { getToken, baseUrl = BASE_URL, autoFetch = true, onError, sessionKey } = options;
  const session = useMemo(
    () => ({
      key: sessionKey,
      initialState: { wallets: [], totals: null, isLoading: false, error: null },
    }),
    [sessionKey]
  );
  const [state, setState] = useState<(WalletBindingState & { session: typeof session }) | null>(
    null
  );

  const getTokenRef = useRef(getToken);
  const baseUrlRef = useRef(baseUrl);
  const onErrorRef = useRef(onError);
  const activeSessionRef = useRef<{
    session: typeof session;
    controller: AbortController;
    fetchController: AbortController | null;
    loadingCount: number;
  } | null>(null);

  useIsomorphicLayoutEffect(() => {
    getTokenRef.current = getToken;
    baseUrlRef.current = baseUrl;
    onErrorRef.current = onError;
  });

  useIsomorphicLayoutEffect(() => {
    const activeSession = {
      session,
      controller: new AbortController(),
      fetchController: null as AbortController | null,
      loadingCount: 0,
    };
    activeSessionRef.current = activeSession;
    setState((current) => (current?.session === session ? { ...current, isLoading: false } : null));
    return () => {
      activeSessionRef.current = null;
      activeSession.controller.abort();
      activeSession.fetchController?.abort();
    };
  }, [session]);

  const updateState = useCallback(
    (update: Partial<WalletBindingState>) => {
      setState((previous) => ({
        ...(previous?.session === session ? previous : session.initialState),
        ...update,
        session,
      }));
    },
    [session]
  );

  const runOperation = useCallback(
    async <T>(
      operation: (request: {
        baseUrl: string;
        headers: Record<string, string>;
        signal: AbortSignal;
      }) => Promise<T>,
      kind: "mutation" | "fetch" | "refetch" = "mutation"
    ): Promise<T | null> => {
      const activeSession = activeSessionRef.current;
      if (activeSession?.session !== session || session.key === null) return null;

      const fetchController = kind === "mutation" ? null : new AbortController();
      if (fetchController) {
        activeSession.fetchController?.abort();
        activeSession.fetchController = fetchController;
      }
      const { signal } = fetchController ?? activeSession.controller;

      activeSession.loadingCount++;
      updateState({
        ...(kind === "refetch" ? { wallets: [], totals: null } : {}),
        isLoading: true,
        error: null,
      });

      try {
        const token = await getTokenRef.current?.();
        if (signal.aborted) return null;

        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const result = await operation({ baseUrl: baseUrlRef.current, headers, signal });
        return signal.aborted ? null : result;
      } catch (err) {
        if (
          !signal.aborted &&
          (!fetchController || !(err instanceof Error && err.name === "AbortError"))
        ) {
          const error = err instanceof Error ? err : new Error(String(err));
          updateState({ error });
          onErrorRef.current?.(error);
        }
        return null;
      } finally {
        if (activeSession.fetchController === fetchController) {
          activeSession.fetchController = null;
        }
        if (!activeSession.controller.signal.aborted) {
          activeSession.loadingCount--;
          updateState({ isLoading: activeSession.loadingCount > 0 });
        }
      }
    },
    [session, updateState]
  );

  const fetchBinding = useCallback(
    async (kind: "fetch" | "refetch" = "fetch") => {
      await runOperation(async (request) => {
        const response = await getApiV1WalletsBinding(request);
        if (request.signal.aborted) return;

        if (response.error) {
          const errorMsg = response.error.error ?? "Failed to fetch bound wallets";
          throw Object.assign(new Error(errorMsg), { cause: response.error });
        }

        updateState({
          wallets: response.data?.wallets ?? [],
          totals: response.data?.totals ?? null,
        });
      }, kind);
    },
    [runOperation, updateState]
  );

  const refetch = useCallback(() => fetchBinding("refetch"), [fetchBinding]);

  const getNonce = useCallback(
    () =>
      runOperation(async (request) => {
        const response = await postApiV1WalletsBindingNonce(request);
        if (response.error) {
          throw new Error(response.error.error ?? "Failed to issue binding nonce");
        }
        return response.data ?? null;
      }),
    [runOperation]
  );

  const bindWallet = useCallback(
    (body: HandlersBindRequest) =>
      runOperation(async (request) => {
        const response = await postApiV1WalletsBinding({ ...request, body });
        if (request.signal.aborted) return null;

        if (response.error) {
          throw new Error(response.error.error ?? "Failed to bind wallet");
        }

        await fetchBinding();
        return response.data ?? null;
      }),
    [runOperation, fetchBinding]
  );

  const unbindWallet = useCallback(
    async (address: string) => {
      const result = await runOperation(async (request) => {
        const response = await deleteApiV1WalletsBindingByAddress({
          ...request,
          path: { address },
        });
        if (request.signal.aborted) return false;

        if (response.error) {
          throw new Error(response.error.error ?? "Failed to unbind wallet");
        }

        await fetchBinding();
        return true;
      });
      return result ?? false;
    },
    [runOperation, fetchBinding]
  );

  useEffect(() => {
    if (autoFetch) void fetchBinding();
  }, [autoFetch, fetchBinding]);

  const { wallets, totals, isLoading, error } =
    state?.session === session ? state : session.initialState;

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
