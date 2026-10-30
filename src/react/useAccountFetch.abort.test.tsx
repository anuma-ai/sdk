import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HandlersCreditBalanceResponse, HandlersSubscriptionStatusResponse } from "../client";
import { useCredits } from "./useCredits";
import { useSubscription } from "./useSubscription";
import type { UseWalletBindingOptions } from "./useWalletBinding";
import { useWalletBinding } from "./useWalletBinding";

type FetchState = {
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

type MutationState = FetchState & { mutate: () => Promise<unknown> };

const balance: HandlersCreditBalanceResponse = {
  available_credits: 10,
  lifetime_credits: 10,
  subscription_tier: "pro",
  wallet_address: "0x123",
};

const status: HandlersSubscriptionStatusResponse = {
  plan: "pro",
  status: "active",
  cancel_at_period_end: false,
};

const cases: {
  name: string;
  useHook: (options: UseWalletBindingOptions) => FetchState;
  data: Record<string, unknown>;
  expected: Record<string, unknown>;
  errorMessage: string;
}[] = [
  {
    name: "useWalletBinding",
    useHook: useWalletBinding,
    data: { wallets: [{ address_evm: "0x123" }], totals: { staked_zeta: "10" } },
    expected: { wallets: [{ address_evm: "0x123" }], totals: { staked_zeta: "10" } },
    errorMessage: "Failed to fetch bound wallets",
  },
  {
    name: "useCredits",
    useHook: useCredits,
    data: balance,
    expected: { balance },
    errorMessage: "Failed to fetch credit balance",
  },
  {
    name: "useSubscription",
    useHook: useSubscription,
    data: status,
    expected: { status },
    errorMessage: "Failed to fetch subscription status",
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each(cases)("$name aborts", ({ useHook, data, expected, errorMessage }) => {
  it("does not call onError after an unmount abort", async () => {
    const request = deferred<Response>();
    const onError = vi.fn();
    fetchMock.mockReturnValueOnce(request.promise);

    const hook = renderHook(() => useHook({ onError }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const signal = fetchMock.mock.calls[0][1]?.signal;

    await act(async () => {
      hook.unmount();
      request.reject(new DOMException("The request was aborted", "AbortError"));
      await request.promise.catch(() => undefined);
    });

    expect(signal?.aborted).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it.each(["before", "after"])(
    "ignores a replaced fetch that aborts %s the new fetch completes",
    async (order) => {
      const oldRequest = deferred<Response>();
      const newRequest = deferred<Response>();
      const onError = vi.fn();
      fetchMock.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);

      const { result } = renderHook(() => useHook({ onError }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const signal = fetchMock.mock.calls[0][1]?.signal;

      let refetch!: Promise<void>;
      await act(async () => {
        refetch = result.current.refetch();
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      });
      expect(signal?.aborted).toBe(true);

      if (order === "before") {
        await act(async () => {
          oldRequest.reject(new DOMException("The request was aborted", "AbortError"));
          await oldRequest.promise.catch(() => undefined);
        });
        expect(result.current.isLoading).toBe(true);
      }

      await act(async () => {
        newRequest.resolve(jsonResponse(data));
        await refetch;
      });

      if (order === "after") {
        await act(async () => {
          oldRequest.reject(new DOMException("The request was aborted", "AbortError"));
          await oldRequest.promise.catch(() => undefined);
        });
      }

      expect(result.current).toMatchObject(expected);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(onError).not.toHaveBeenCalled();
    }
  );

  it("ignores a token error after an unmount abort", async () => {
    const token = deferred<string | null>();
    const onError = vi.fn();
    const hook = renderHook(() => useHook({ getToken: () => token.promise, onError }));

    await act(async () => {
      hook.unmount();
      token.reject(new Error("Token request failed"));
      await token.promise.catch(() => undefined);
    });

    expect(onError).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads data after the StrictMode cleanup aborts the first fetch", async () => {
    const onError = vi.fn();
    const getToken = vi.fn<() => Promise<string | null>>().mockResolvedValue("token");
    fetchMock.mockResolvedValueOnce(jsonResponse(data));
    const { result } = renderHook(() => useHook({ getToken, onError }), { wrapper: StrictMode });

    await waitFor(() => expect(result.current).toMatchObject(expected));
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a transport error for the current fetch with its cause", async () => {
    const transportError = new TypeError("Failed to fetch");
    const onError = vi.fn();
    fetchMock.mockRejectedValueOnce(transportError);
    const { result } = renderHook(() => useHook({ onError }));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    expect(result.current.error?.message).toBe(errorMessage);
    expect(result.current.error?.cause).toBe(transportError);
    expect(result.current.isLoading).toBe(false);
    expect(onError).toHaveBeenCalledExactlyOnceWith(result.current.error);
  });

  it.each(["before", "after"])(
    "reports a replacement transport error when the old fetch aborts %s it fails",
    async (order) => {
      const oldRequest = deferred<Response>();
      const newRequest = deferred<Response>();
      const transportError = new TypeError("Failed to fetch");
      const onError = vi.fn();
      fetchMock.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);

      const { result } = renderHook(() => useHook({ onError }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const oldSignal = fetchMock.mock.calls[0][1]?.signal;

      let refetch!: Promise<void>;
      await act(async () => {
        refetch = result.current.refetch();
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      });
      expect(oldSignal?.aborted).toBe(true);
      expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(false);

      if (order === "before") {
        await act(async () => {
          oldRequest.reject(new TypeError("Aborted fetch"));
          await oldRequest.promise.catch(() => undefined);
        });
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(true);
        expect(onError).not.toHaveBeenCalled();
      }

      await act(async () => {
        newRequest.reject(transportError);
        await refetch;
      });
      const currentError = result.current.error;
      expect(currentError?.message).toBe(errorMessage);
      expect(onError).toHaveBeenCalledExactlyOnceWith(currentError);

      if (order === "after") {
        await act(async () => {
          oldRequest.reject(new TypeError("Aborted fetch"));
          await oldRequest.promise.catch(() => undefined);
        });
      }

      expect(result.current.error).toBe(currentError);
      expect(result.current.error?.cause).toBe(transportError);
      expect(result.current.isLoading).toBe(false);
      expect(onError).toHaveBeenCalledExactlyOnceWith(currentError);
    }
  );

  it("reports a server error for the current fetch", async () => {
    const onError = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Access denied" }, 403));
    const { result } = renderHook(() => useHook({ onError }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe("Access denied");
    expect(result.current.error?.cause).toEqual({ error: "Access denied" });
    expect(onError).toHaveBeenCalledExactlyOnceWith(result.current.error);
  });
});

const mutationCases: {
  name: string;
  useMutation: (options: UseWalletBindingOptions) => MutationState;
  data: Record<string, unknown>;
}[] = [
  {
    name: "useWalletBinding",
    useMutation: (options) => {
      const hook = useWalletBinding(options);
      return { ...hook, mutate: hook.getNonce };
    },
    data: { wallets: [] },
  },
  {
    name: "useSubscription",
    useMutation: (options) => {
      const hook = useSubscription(options);
      return { ...hook, mutate: () => hook.createCheckoutSession() };
    },
    data: status,
  },
];

describe.each(mutationCases)("$name loading", ({ useMutation, data }) => {
  it("keeps loading while a mutation runs after a stale fetch settles", async () => {
    const staleToken = deferred<string | null>();
    const mutationRequest = deferred<Response>();
    const getToken = vi
      .fn<() => Promise<string | null>>()
      .mockReturnValueOnce(staleToken.promise)
      .mockResolvedValue("token");
    fetchMock
      .mockResolvedValueOnce(jsonResponse(data))
      .mockReturnValueOnce(mutationRequest.promise);

    const { result } = renderHook(() => useMutation({ getToken }));
    await waitFor(() => expect(getToken).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.refetch();
    });

    let mutation!: Promise<unknown>;
    await act(async () => {
      mutation = result.current.mutate();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    await act(async () => {
      staleToken.resolve("stale-token");
      await staleToken.promise;
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      mutationRequest.resolve(jsonResponse({ url: "https://example.com" }));
      await mutation;
    });
    expect(result.current.isLoading).toBe(false);
  });
});
