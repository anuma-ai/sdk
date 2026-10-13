// @vitest-environment happy-dom
/**
 * Session cache for the model list: a fresh entry skips the request, hooks that mount together
 * share one request, a 304 answer reuses the stored body, and a server with no ETag still works.
 * The generated client is mocked, so no test uses the network.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApiV1Models } from "../client/sdk.gen";
import { clearModelsCache, useModels } from "./useModels";

vi.mock("../client/sdk.gen", () => ({ getApiV1Models: vi.fn() }));

const mockedGet = vi.mocked(getApiV1Models);

type Call = {
  baseUrl?: string;
  headers?: Record<string, string>;
  query?: { provider?: string; page_token?: string };
};

const model = (id: string) => ({ id });

/** Build a result like the one the generated client returns. */
function ok(data: unknown, etag?: string) {
  const headers = new Headers(etag ? { ETag: etag } : {});
  return { data, response: new Response(null, { status: 200, headers }) };
}

/** The generated client returns a 304 answer as an error result with the raw response attached. */
function notModified() {
  return { error: {}, response: new Response(null, { status: 304 }) };
}

const calls = (): Call[] => mockedGet.mock.calls.map((c) => c[0] as Call);

describe("useModels session cache", () => {
  beforeEach(() => {
    clearModelsCache();
    mockedGet.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips the request when a fresh entry exists", async () => {
    mockedGet.mockResolvedValue(ok({ data: [model("a")] }) as never);

    const first = renderHook(() => useModels());
    await waitFor(() => expect(first.result.current.models).toHaveLength(1));
    first.unmount();

    const second = renderHook(() => useModels());
    await waitFor(() => expect(second.result.current.models).toHaveLength(1));

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("shares one request between hooks that mount together", async () => {
    let release: (v: unknown) => void = () => {};
    mockedGet.mockImplementation(() => new Promise((resolve) => (release = resolve)) as never);

    const a = renderHook(() => useModels());
    const b = renderHook(() => useModels());
    const c = renderHook(() => useModels());
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());

    await act(async () => release(ok({ data: [model("a")] })));
    await waitFor(() => {
      expect(a.result.current.models).toHaveLength(1);
      expect(b.result.current.models).toHaveLength(1);
      expect(c.result.current.models).toHaveLength(1);
    });
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("sends If-None-Match after the TTL and reuses the stored body on 304", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    mockedGet.mockResolvedValueOnce(ok({ data: [model("a")] }, '"v1"') as never);

    const first = renderHook(() => useModels());
    await waitFor(() => expect(first.result.current.models).toHaveLength(1));
    first.unmount();

    vi.advanceTimersByTime(6 * 60 * 1000);
    mockedGet.mockResolvedValueOnce(notModified() as never);

    const second = renderHook(() => useModels());
    await waitFor(() => expect(second.result.current.models).toEqual([model("a")]));

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(calls()[0].headers?.["If-None-Match"]).toBeUndefined();
    expect(calls()[1].headers?.["If-None-Match"]).toBe('"v1"');
    expect(second.result.current.error).toBeNull();
  });

  it("replaces the stored body when the server answers 200 with a new ETag", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    mockedGet.mockResolvedValueOnce(ok({ data: [model("a")] }, '"v1"') as never);
    const first = renderHook(() => useModels());
    await waitFor(() => expect(first.result.current.models).toHaveLength(1));
    first.unmount();

    vi.advanceTimersByTime(6 * 60 * 1000);
    mockedGet.mockResolvedValueOnce(ok({ data: [model("b")] }, '"v2"') as never);
    const second = renderHook(() => useModels());
    await waitFor(() => expect(second.result.current.models).toEqual([model("b")]));
  });

  it("works with a server that sends no ETag and never answers 304", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    mockedGet.mockResolvedValue(ok({ data: [model("a")] }) as never);

    const first = renderHook(() => useModels());
    await waitFor(() => expect(first.result.current.models).toHaveLength(1));
    first.unmount();

    vi.advanceTimersByTime(6 * 60 * 1000);
    const second = renderHook(() => useModels());
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(second.result.current.models).toHaveLength(1));

    expect(calls()[1].headers?.["If-None-Match"]).toBeUndefined();
  });

  it("sends the request again without the validator when the validator request fails to connect", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    mockedGet.mockResolvedValueOnce(ok({ data: [model("a")] }, '"v1"') as never);
    const first = renderHook(() => useModels());
    await waitFor(() => expect(first.result.current.models).toHaveLength(1));
    first.unmount();

    vi.advanceTimersByTime(6 * 60 * 1000);
    mockedGet.mockResolvedValueOnce({ error: new TypeError("Failed to fetch") } as never);
    mockedGet.mockResolvedValueOnce(ok({ data: [model("b")] }) as never);
    const second = renderHook(() => useModels());
    await waitFor(() => expect(second.result.current.models).toEqual([model("b")]));

    expect(calls()[2].headers?.["If-None-Match"]).toBeUndefined();
  });

  it("follows page tokens and validates each page with its own ETag", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    mockedGet.mockResolvedValueOnce(
      ok({ data: [model("a")], next_page_token: "p2" }, '"p1"') as never
    );
    mockedGet.mockResolvedValueOnce(ok({ data: [model("b")] }, '"p2tag"') as never);
    const first = renderHook(() => useModels());
    await waitFor(() => expect(first.result.current.models).toHaveLength(2));
    first.unmount();

    vi.advanceTimersByTime(6 * 60 * 1000);
    mockedGet.mockResolvedValueOnce(notModified() as never);
    mockedGet.mockResolvedValueOnce(notModified() as never);
    const second = renderHook(() => useModels());
    await waitFor(() => expect(second.result.current.models).toEqual([model("a"), model("b")]));

    expect(calls()[2].headers?.["If-None-Match"]).toBe('"p1"');
    expect(calls()[3].headers?.["If-None-Match"]).toBe('"p2tag"');
    expect(calls()[3].query?.page_token).toBe("p2");
  });

  it("misses the cache when the base URL changes", async () => {
    mockedGet.mockResolvedValue(ok({ data: [model("a")] }) as never);

    const first = renderHook(() => useModels({ baseUrl: "https://one.test" }));
    await waitFor(() => expect(first.result.current.models).toHaveLength(1));
    const second = renderHook(() => useModels({ baseUrl: "https://two.test" }));
    await waitFor(() => expect(second.result.current.models).toHaveLength(1));

    expect(calls().map((c) => c.baseUrl)).toEqual(["https://one.test", "https://two.test"]);
  });

  it("misses the cache when the provider filter changes", async () => {
    mockedGet.mockResolvedValue(ok({ data: [model("a")] }) as never);

    renderHook(() => useModels({ provider: "openai" }));
    renderHook(() => useModels({ provider: "anthropic" }));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
  });

  it("misses the cache after the auth token changes (sign out and sign in)", async () => {
    mockedGet.mockResolvedValue(ok({ data: [model("a")] }) as never);

    const userA = renderHook(() => useModels({ getToken: async () => "token-a" }));
    await waitFor(() => expect(userA.result.current.models).toHaveLength(1));
    userA.unmount();

    const signedOut = renderHook(() => useModels({ getToken: async () => null }));
    await waitFor(() => expect(signedOut.result.current.models).toHaveLength(1));
    signedOut.unmount();

    const userB = renderHook(() => useModels({ getToken: async () => "token-b" }));
    await waitFor(() => expect(userB.result.current.models).toHaveLength(1));

    expect(mockedGet).toHaveBeenCalledTimes(3);
    expect(calls()[0].headers?.Authorization).toBe("Bearer token-a");
    expect(calls()[2].headers?.Authorization).toBe("Bearer token-b");
  });

  it("clearModelsCache forces the next mount to request again", async () => {
    mockedGet.mockResolvedValue(ok({ data: [model("a")] }) as never);
    const first = renderHook(() => useModels());
    await waitFor(() => expect(first.result.current.models).toHaveLength(1));
    first.unmount();

    clearModelsCache();
    const second = renderHook(() => useModels());
    await waitFor(() => expect(second.result.current.models).toHaveLength(1));
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("refetch skips the fresh-cache shortcut", async () => {
    mockedGet.mockResolvedValue(ok({ data: [model("a")] }, '"v1"') as never);
    const hook = renderHook(() => useModels());
    await waitFor(() => expect(hook.result.current.models).toHaveLength(1));

    mockedGet.mockResolvedValueOnce(notModified() as never);
    await act(async () => {
      await hook.result.current.refetch();
    });

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(calls()[1].headers?.["If-None-Match"]).toBe('"v1"');
    expect(hook.result.current.models).toHaveLength(1);
  });

  it("does not cache a failed request", async () => {
    mockedGet.mockResolvedValueOnce({
      error: { error: "boom" },
      response: new Response(null, { status: 500 }),
    } as never);
    const first = renderHook(() => useModels());
    await waitFor(() => expect(first.result.current.error?.message).toBe("boom"));
    first.unmount();

    mockedGet.mockResolvedValueOnce(ok({ data: [model("a")] }) as never);
    const second = renderHook(() => useModels());
    await waitFor(() => expect(second.result.current.models).toHaveLength(1));
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  /** A request that ends only when the caller aborts it, or when the test releases it. */
  function pendingUntilReleased() {
    const signals: AbortSignal[] = [];
    const releases: Array<(v: unknown) => void> = [];
    mockedGet.mockImplementationOnce(((opts: { signal: AbortSignal }) => {
      signals.push(opts.signal);
      return new Promise((resolve, reject) => {
        releases.push(resolve);
        opts.signal.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted.", "AbortError"))
        );
      });
    }) as never);
    return { signals, releases };
  }

  it("does not put an old list back in the cache after clearModelsCache", async () => {
    const first = pendingUntilReleased();
    const a = renderHook(() => useModels());
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));

    // The caller clears the cache while the request is still in progress.
    clearModelsCache();
    await act(async () => first.releases[0](ok({ data: [model("old")] })));
    await waitFor(() => expect(a.result.current.isLoading).toBe(false));
    a.unmount();

    mockedGet.mockResolvedValue(ok({ data: [model("new")] }) as never);
    const b = renderHook(() => useModels());
    await waitFor(() => expect(b.result.current.models).toEqual([model("new")]));

    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("lets a refetch replace a request that does not end", async () => {
    const stalled = pendingUntilReleased();
    const hook = renderHook(() => useModels());
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));

    mockedGet.mockResolvedValue(ok({ data: [model("fresh")] }) as never);
    await act(async () => {
      await hook.result.current.refetch();
    });

    expect(hook.result.current.models).toEqual([model("fresh")]);
    expect(hook.result.current.isLoading).toBe(false);
    expect(mockedGet).toHaveBeenCalledTimes(2);
    // The hook left the request that it replaced, so that request stopped.
    expect(stalled.signals[0].aborted).toBe(true);
  });

  it("lets a refetch in one hook replace a request that another hook waits for", async () => {
    const stalled = pendingUntilReleased();
    const a = renderHook(() => useModels());
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));

    mockedGet.mockResolvedValue(ok({ data: [model("fresh")] }) as never);
    const b = renderHook(() => useModels({ autoFetch: false }));
    await act(async () => {
      await b.result.current.refetch();
    });

    expect(b.result.current.models).toEqual([model("fresh")]);
    expect(mockedGet).toHaveBeenCalledTimes(2);
    // The first hook still waits for its own request, so that request keeps running.
    expect(stalled.signals[0].aborted).toBe(false);

    a.unmount();
    expect(stalled.signals[0].aborted).toBe(true);
  });

  it("stops the shared request only when the last waiting hook leaves", async () => {
    const shared = pendingUntilReleased();
    const a = renderHook(() => useModels());
    const b = renderHook(() => useModels());
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    const signal = shared.signals[0];

    a.unmount();
    expect(signal.aborted).toBe(false);

    b.unmount();
    expect(signal.aborted).toBe(true);
  });

  it("does not cache a request that stopped, and the next mount requests again", async () => {
    pendingUntilReleased();
    const a = renderHook(() => useModels());
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    a.unmount();

    mockedGet.mockResolvedValue(ok({ data: [model("a")] }) as never);
    const b = renderHook(() => useModels());
    await waitFor(() => expect(b.result.current.models).toEqual([model("a")]));

    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("returns a copy so in-place mutations do not pollute the cache", async () => {
    mockedGet.mockResolvedValue(ok({ data: [model("a"), model("b")] }) as never);

    const first = renderHook(() => useModels());
    await waitFor(() => expect(first.result.current.models).toHaveLength(2));

    // Mutate the returned array in place — sort and splice are common in pickers.
    first.result.current.models.sort(() => 0);
    first.result.current.models.push(model("c"));

    first.unmount();

    const second = renderHook(() => useModels());
    await waitFor(() => expect(second.result.current.models).toHaveLength(2));
    expect(second.result.current.models).toEqual([model("a"), model("b")]);
  });

  it("evicts the old token's cache entry when a new token is used", async () => {
    mockedGet.mockResolvedValue(ok({ data: [model("a")] }) as never);

    const first = renderHook(() => useModels({ getToken: async () => "token-a" }));
    await waitFor(() => expect(first.result.current.models).toHaveLength(1));
    first.unmount();

    const second = renderHook(() => useModels({ getToken: async () => "token-b" }));
    await waitFor(() => expect(second.result.current.models).toHaveLength(1));
    second.unmount();

    // token-a's entry was evicted when token-b's entry was written, so this is a cache miss.
    const third = renderHook(() => useModels({ getToken: async () => "token-a" }));
    await waitFor(() => expect(third.result.current.models).toHaveLength(1));

    expect(mockedGet).toHaveBeenCalledTimes(3);
  });
});
