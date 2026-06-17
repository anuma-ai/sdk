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

/**
 * A transport whose replay GET surfaces a transient (401) SSE failure, the
 * lib's `interrupted: false` + statusCode path. The lib still fires onError on
 * this path — which headless must withhold. POSTs (the original send) stay
 * healthy so the hook can reach the resume.
 */
function makeTransientReplayTransport(): StreamingTransport {
  return (options) => {
    if (options.method === "GET") {
      options.onSseError?.(new Error("SSE failed: 401 Unauthorized"));
      return { stream: (async function* () {})() };
    }
    return { stream: makeCompleteStream() };
  };
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

  it("non-headless resume still emits onData AND onFinish (regression)", async () => {
    const onData = vi.fn();
    const onFinish = vi.fn();
    transportImpl = (options) => {
      // Replay GET streams one content delta the lib forwards to onData.
      if (options.method === "GET") return { stream: makeCompleteStream() };
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "tok", resumable: true, onData, onFinish })
    );

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream({
        inferenceId: "inf-emit",
        apiType: "responses",
        model: "test-model",
      });
    });

    // Smoothing flushes the replayed content as fine-grained deltas; the point
    // is that the non-headless path feeds them through to the hook-level onData,
    // AND a clean terminal still delivers the recovered response via onFinish.
    expect(onData).toHaveBeenCalled();
    const emitted = onData.mock.calls.map((c) => c[0]).join("");
    expect(emitted).toBe("hello");
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(resumeResult!.error).toBeNull();
  });

  it("headless resume emits NOTHING to onData/onThinking/onFinish/onError on a clean completion (still replays)", async () => {
    // Drives the REAL useChat → lib resumeStream path through the mock transport
    // (no baseResumeStream mock), so the totality of the suppression is exercised
    // end to end: a clean terminal would fire onFinish in the lib, headless must
    // withhold it along with onData/onThinking — while the result still carries
    // the recovered data and the consumer reads it from the return value.
    const onData = vi.fn();
    const onThinking = vi.fn();
    const onFinish = vi.fn();
    const onError = vi.fn();
    let replaySeen: StreamingTransportOptions | undefined;
    transportImpl = (options) => {
      if (options.method === "GET") replaySeen = options;
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() =>
      useChat({
        getToken: async () => "tok",
        resumable: true,
        onData,
        onThinking,
        onFinish,
        onError,
      })
    );

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream(
        { inferenceId: "inf-headless", apiType: "responses", model: "test-model" },
        { headless: true }
      );
    });

    // The replay still ran (GET fired, clean terminal). NONE of the four consumer
    // callbacks fired — no recovered text, response, or error bled into the
    // visible chat. The recovered data is delivered via the returned result only.
    expect(replaySeen?.method).toBe("GET");
    expect(resumeResult!.error).toBeNull();
    expect(resumeResult!.data).not.toBeNull();
    expect(onData).not.toHaveBeenCalled();
    expect(onThinking).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("headless resume emits NOTHING to onData/onThinking/onFinish/onError on a transient failure (result still carries data)", async () => {
    // The transient (401) terminal fires onError in the lib and returns
    // { interrupted: false, statusCode }. Headless must withhold onError too, or
    // a transient on an off-screen replay would surface a spurious error on the
    // visible chat. The consumer learns the outcome from the returned result.
    const onData = vi.fn();
    const onThinking = vi.fn();
    const onFinish = vi.fn();
    const onError = vi.fn();
    transportImpl = makeTransientReplayTransport();

    const { result } = renderHook(() =>
      useChat({
        getToken: async () => "tok",
        resumable: true,
        onData,
        onThinking,
        onFinish,
        onError,
      })
    );

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream(
        { inferenceId: "inf-headless-transient", apiType: "responses", model: "test-model" },
        { headless: true }
      );
    });

    // Transient terminal surfaced on the RESULT (interrupted: false, a 401 error
    // string), but NONE of the four consumer callbacks fired.
    expect(resumeResult!.interrupted).toBe(false);
    expect(resumeResult!.error).toContain("401");
    expect(onData).not.toHaveBeenCalled();
    expect(onThinking).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("non-headless transient resume DOES fire onError (regression for the suppression)", async () => {
    // The mirror of the headless transient test: with headless OFF, a transient
    // 401 on the replay MUST still reach the hook-level onError, proving headless
    // is what suppresses it — not a blanket change to the resume path.
    const onError = vi.fn();
    transportImpl = makeTransientReplayTransport();

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "tok", resumable: true, onError })
    );

    let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
    await act(async () => {
      resumeResult = await result.current.resumeStream({
        inferenceId: "inf-transient-emit",
        apiType: "responses",
        model: "test-model",
      });
    });

    expect(resumeResult!.interrupted).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("headless resume does NOT clobber a concurrent visible stream's abort controller (stop aborts the visible stream, not the headless resume)", async () => {
    // The documented use case: reuse the on-screen hook for an off-screen
    // recovery. A headless resume must not store its controller in the shared
    // abortControllerRef, or it would overwrite a live visible stream's
    // controller — then stop() would abort the headless resume and leave the
    // visible stream running. Distinguish the two streams by HTTP method: the
    // visible sendMessage POSTs; the headless replay GETs.
    let visibleSignal: AbortSignal | undefined;
    let headlessSignal: AbortSignal | undefined;
    transportImpl = (options) => {
      if (options.method === "GET") {
        headlessSignal = options.signal;
        return { stream: makeBlockingStream(options.signal, "recovered") };
      }
      visibleSignal = options.signal;
      options.onStreamMeta?.({ inferenceId: "inf-visible" });
      return { stream: makeBlockingStream(options.signal, "visible") };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok", resumable: true }));

    // A visible stream is in flight — its controller now lives in the shared ref.
    await act(async () => {
      void result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });

    // A headless resume overlaps it. If it clobbered the shared ref, the next
    // stop() would hit the headless controller instead of the visible one.
    await act(async () => {
      void result.current.resumeStream(
        { inferenceId: "inf-headless-overlap", apiType: "responses", model: "test-model" },
        { headless: true }
      );
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      result.current.stop();
    });

    // stop() aborted the VISIBLE stream (the shared ref was never overwritten),
    // and the headless resume's signal survived — fully isolated from the
    // visible UI's lifecycle.
    expect(visibleSignal?.aborted).toBe(true);
    expect(headlessSignal?.aborted).toBe(false);
  });

  it("fires onStreamMeta with the resolved apiType + model alongside the handle capture", async () => {
    const onStreamMeta = vi.fn();
    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-meta-1" });
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "tok", resumable: true, onStreamMeta })
    );

    await act(async () => {
      // apiType "auto" + a known completions-only model must RESOLVE to
      // "completions" — proving the payload carries the resolved type, not "auto".
      await result.current.sendMessage({
        messages: userMessages,
        model: "cerebras/llama3.1-8b",
        apiType: "auto",
      });
    });

    expect(onStreamMeta).toHaveBeenCalledTimes(1);
    const meta = onStreamMeta.mock.calls[0][0] as {
      inferenceId: string;
      apiType: string;
      model?: string;
    };
    expect(meta.inferenceId).toBe("inf-meta-1");
    expect(meta.apiType).toBe("completions");
    expect(meta.model).toBe("cerebras/llama3.1-8b");
  });

  it("a throwing consumer onStreamMeta does not break sendMessage and the resume handle is still built", async () => {
    // The consumer onStreamMeta is fired synchronously inside the loop's
    // onStreamMeta handler, right after the internal handle capture. A throwing
    // consumer callback must be swallowed: sendMessage still resolves, and the
    // internal pendingResumeRef handle is intact (detach hands it back).
    const onStreamMeta = vi.fn(() => {
      throw new Error("consumer onStreamMeta blew up");
    });
    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-throwmeta" });
      return { stream: makeBlockingStream(options.signal, "partial") };
    };

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "tok", resumable: true, onStreamMeta })
    );

    let sendPromise: Promise<unknown>;
    await act(async () => {
      sendPromise = result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });

    // The throwing consumer callback did fire, but the handle was still captured.
    expect(onStreamMeta).toHaveBeenCalledTimes(1);

    let handle: ReturnType<typeof result.current.detach>;
    await act(async () => {
      handle = result.current.detach();
    });
    expect(handle!?.inferenceId).toBe("inf-throwmeta");

    // sendMessage resolves cleanly (detached) — the throw never propagated out.
    const sendResult = (await sendPromise!) as { error: string; detached?: true };
    expect(sendResult.detached).toBe(true);
  });

  it("does not require onStreamMeta — absent callback is today's behavior", async () => {
    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-nometa" });
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok", resumable: true }));

    // No onStreamMeta wired; sending must not throw and must complete normally.
    let sendResult: Awaited<ReturnType<typeof result.current.sendMessage>>;
    await act(async () => {
      sendResult = await result.current.sendMessage({
        messages: userMessages,
        model: "test-model",
      });
    });
    expect(sendResult!.error).toBeNull();
  });
});
