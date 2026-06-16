// @vitest-environment happy-dom
/**
 * Resume-surface coverage for the Expo useChat hook.
 *
 * Pins the consumer-facing additions from #573:
 * - `resumable: true` sends the X-Stream-Resumable capability header;
 * - `detach()` aborts via the detach signal and hands back the resume handle
 *   captured from onStreamMeta / the detached result;
 * - `stop()` on a resumable stream fires the billing-safe cancel POST;
 * - the cancel POST is NOT fired when resumable is off.
 *
 * The Expo hook streams via `xhrTransport`, so we mock that module (not the SSE
 * client) and drive streams / meta / abort through the transport options.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STREAM_RESUMABLE_HEADER } from "../lib/chat/toolLoop";
import type { StreamingTransport, StreamingTransportOptions } from "../lib/chat/toolLoop";

// Replaceable transport impl, swapped per test.
let transportImpl: StreamingTransport = () => ({ stream: (async function* () {})() });
vi.mock("../lib/chat/xhrTransport", () => ({
  xhrTransport: (options: StreamingTransportOptions) => transportImpl(options),
}));

import { useChat } from "./useChat";

/** A stream that emits meta + one delta, then blocks until its signal aborts. */
function makeBlockingStream(signal: AbortSignal | undefined, text: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield { type: "response.output_text.delta", delta: { OfString: text } };
    await new Promise<void>((resolve) => {
      if (signal?.aborted) return resolve();
      signal?.addEventListener("abort", () => resolve(), { once: true });
    });
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    throw err;
  })();
}

/** A healthy stream that completes immediately. */
function makeCompleteStream() {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield { type: "response.output_text.delta", delta: { OfString: "hello" } };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 1, output_tokens: 1 } },
    };
  })();
}

const userMessages = [{ role: "user" as const, content: [{ type: "text" as const, text: "hi" }] }];

describe("useChat resumable surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transportImpl = () => ({ stream: makeCompleteStream() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the resumable capability header when resumable is on", async () => {
    let seen: StreamingTransportOptions | undefined;
    transportImpl = (options) => {
      seen = options;
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok", resumable: true }));

    await act(async () => {
      await result.current.sendMessage({ messages: userMessages, model: "test-model" });
    });

    expect(seen?.headers?.[STREAM_RESUMABLE_HEADER]).toBe("1");
  });

  it("does NOT send the capability header when resumable is off", async () => {
    let seen: StreamingTransportOptions | undefined;
    transportImpl = (options) => {
      seen = options;
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok" }));

    await act(async () => {
      await result.current.sendMessage({ messages: userMessages, model: "test-model" });
    });

    expect(seen?.headers?.[STREAM_RESUMABLE_HEADER]).toBeUndefined();
  });

  it("detach() aborts the underlying stream and resolves the send as detached", async () => {
    let capturedSignal: AbortSignal | undefined;
    transportImpl = (options) => {
      capturedSignal = options.signal;
      options.onStreamMeta?.({ inferenceId: "inf-detach-1" });
      return { stream: makeBlockingStream(options.signal, "partial") };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok", resumable: true }));

    let sendPromise: Promise<unknown>;
    await act(async () => {
      sendPromise = result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });

    let handle: ReturnType<typeof result.current.detach>;
    await act(async () => {
      handle = result.current.detach();
    });

    expect(capturedSignal?.aborted).toBe(true);
    expect(handle!?.inferenceId).toBe("inf-detach-1");

    const sendResult = (await sendPromise!) as { error: string; detached?: true };
    expect(sendResult.error).toBe("Request detached");
    expect(sendResult.detached).toBe(true);
  });

  it("stop() fires a cancel POST for a resumable stream with a captured id", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    const onCancelResult = vi.fn();

    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-cancel-1" });
      return { stream: makeBlockingStream(options.signal, "x") };
    };

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "tok", resumable: true, onCancelResult })
    );

    await act(async () => {
      void result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      result.current.stop();
    });

    await waitFor(() => {
      const cancelCall = fetchSpy.mock.calls.find(
        ([url]) => typeof url === "string" && url.includes("/cancel")
      );
      expect(cancelCall).toBeDefined();
    });

    const cancelCall = fetchSpy.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/cancel")
    );
    expect(String(cancelCall![0])).toContain("/api/v1/chat/streams/inf-cancel-1/cancel");
    expect((cancelCall![1] as RequestInit | undefined)?.method).toBe("POST");

    // The success outcome is observable on onCancelResult (the spec asks for
    // BOTH outcomes; the rejected case is covered by the test below).
    await waitFor(() => expect(onCancelResult).toHaveBeenCalled());
    expect(onCancelResult).toHaveBeenCalledWith(
      expect.objectContaining({ inferenceId: "inf-cancel-1", ok: true, status: 200 })
    );
  });

  it("does NOT fire a cancel POST on stop() when resumable is off", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-nocancel" });
      return { stream: makeBlockingStream(options.signal, "x") };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok" }));

    await act(async () => {
      void result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });
    await act(async () => {
      result.current.stop();
    });

    const cancelCall = fetchSpy.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/cancel")
    );
    expect(cancelCall).toBeUndefined();
  });

  it("does NOT cancel an already-finished stream on a later idle stop()", async () => {
    // After a clean (non-detached) completion there is nothing to cancel: the
    // optimistic handle from onStreamMeta must be cleared, or an idle stop()
    // POSTs a spurious cancel for a finished inference id.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-finished" });
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok", resumable: true }));

    // Run to a clean completion (not detached).
    await act(async () => {
      await result.current.sendMessage({ messages: userMessages, model: "test-model" });
    });

    // Idle stop() afterward must not cancel the already-finished stream.
    await act(async () => {
      result.current.stop();
    });

    const cancelCall = fetchSpy.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/cancel")
    );
    expect(cancelCall).toBeUndefined();
  });

  it("does NOT fire a cancel POST when a new send supersedes a captured stream, nor on unmount", async () => {
    // Deliberate design: detach keeps the server buffer ALIVE for replay, so a
    // superseding sendMessage and an unmount must NOT cancel — only stop() does.
    // iOS backgrounding can unmount the hook; cancelling there would kill a
    // generation the user backgrounded precisely to resume.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-supersede" });
      return { stream: makeBlockingStream(options.signal, "x") };
    };

    const { result, unmount } = renderHook(() =>
      useChat({ getToken: async () => "tok", resumable: true })
    );

    await act(async () => {
      void result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });

    // A new send supersedes the captured stream (no resume, no stop()).
    transportImpl = () => ({ stream: makeCompleteStream() });
    await act(async () => {
      await result.current.sendMessage({ messages: userMessages, model: "test-model" });
    });

    // Unmount (e.g. iOS backgrounding).
    unmount();

    const cancelCall = fetchSpy.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/cancel")
    );
    expect(cancelCall).toBeUndefined();
  });

  it("reports the cancel outcome via onCancelResult and never throws on a rejected cancel", async () => {
    // The cancel POST rejects — stop() must neither throw nor delay, and the
    // failure must be observable on onCancelResult.
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const onCancelResult = vi.fn();

    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-cancel-fail" });
      return { stream: makeBlockingStream(options.signal, "x") };
    };

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "tok", resumable: true, onCancelResult })
    );

    await act(async () => {
      void result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });
    // stop() returns synchronously without throwing despite the rejecting POST.
    await act(async () => {
      expect(() => result.current.stop()).not.toThrow();
    });

    await waitFor(() => {
      expect(onCancelResult).toHaveBeenCalledWith(
        expect.objectContaining({ inferenceId: "inf-cancel-fail", ok: false })
      );
    });
  });

  it("resumeStream() resolves getToken AT invocation and forwards the fresh bearer", async () => {
    let tokenReads = 0;
    // Each call returns a distinct value so we can prove the bearer used by the
    // replay is the one fetched at resume time, not an earlier capture.
    const getToken = vi.fn(async () => {
      tokenReads++;
      return `token-${tokenReads}`;
    });

    let replaySeen: StreamingTransportOptions | undefined;
    transportImpl = (options) => {
      // Distinguish the replay GET from the original POST by method.
      if (options.method === "GET") replaySeen = options;
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() => useChat({ getToken, resumable: true }));

    // Burn a getToken read on an initial send so a captured token would be stale.
    await act(async () => {
      await result.current.sendMessage({ messages: userMessages, model: "test-model" });
    });
    const readsBeforeResume = tokenReads;

    await act(async () => {
      await result.current.resumeStream({
        inferenceId: "inf-resume-1",
        apiType: "responses",
        model: "test-model",
      });
    });

    // getToken was called again specifically for the resume.
    expect(tokenReads).toBe(readsBeforeResume + 1);
    expect(replaySeen?.method).toBe("GET");
    expect(replaySeen?.endpoint).toBe("/api/v1/chat/streams/inf-resume-1");
    expect(replaySeen?.token).toBe(`token-${tokenReads}`);
  });
});
