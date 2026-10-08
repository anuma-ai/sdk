// @vitest-environment happy-dom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STREAM_RESUMABLE_HEADER } from "../lib/chat/toolLoop";
import type { StreamingTransport, StreamingTransportOptions } from "../lib/chat/toolLoop";

let transportImpl: StreamingTransport = () => ({ stream: (async function* () {})() });
vi.mock("../lib/chat/xhrTransport", () => ({
  xhrTransport: (options: StreamingTransportOptions) => transportImpl(options),
}));

import { useChat } from "./useChat";

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

  it("an aborted older send does not clear isLoading or the resume handle of a newer send", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    let call = 0;
    transportImpl = (options) => {
      const id = call++ === 0 ? "inf-A" : "inf-B";
      options.onStreamMeta?.({ inferenceId: id });
      return { stream: makeBlockingStream(options.signal, id) };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok", resumable: true }));

    let sendA: Promise<unknown>;
    await act(async () => {
      sendA = result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });
    await act(async () => {
      void result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await sendA;
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      result.current.stop();
    });

    await waitFor(() => {
      const cancelCall = fetchSpy.mock.calls.find(
        ([url]) => typeof url === "string" && url.includes("/cancel")
      );
      expect(String(cancelCall?.[0])).toContain("/inf-B/cancel");
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("an older send settling after a newer send detached does not drop the newer resume handle", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-B" });
      return { stream: makeBlockingStream(options.signal, "b") };
    };

    let releaseA!: () => void;
    const gateA = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    let tokenCalls = 0;
    const getToken = async () => {
      if (tokenCalls++ === 0) await gateA;
      return "tok";
    };

    const { result } = renderHook(() => useChat({ getToken, resumable: true }));

    let sendA: Promise<unknown>;
    let sendB: Promise<unknown>;
    await act(async () => {
      sendA = result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
      sendB = result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });
    await act(async () => {
      result.current.detach();
      await sendB;
    });

    await act(async () => {
      releaseA();
      await sendA;
    });

    await act(async () => {
      result.current.stop();
    });

    await waitFor(() => {
      const cancelCall = fetchSpy.mock.calls.find(
        ([url]) => typeof url === "string" && url.includes("/cancel")
      );
      expect(String(cancelCall?.[0])).toContain("/inf-B/cancel");
    });
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
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-finished" });
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok", resumable: true }));

    await act(async () => {
      await result.current.sendMessage({ messages: userMessages, model: "test-model" });
    });

    await act(async () => {
      result.current.stop();
    });

    const cancelCall = fetchSpy.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/cancel")
    );
    expect(cancelCall).toBeUndefined();
  });

  it("does NOT fire a cancel POST when a new send supersedes a captured stream, nor on unmount", async () => {
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

    transportImpl = () => ({ stream: makeCompleteStream() });
    await act(async () => {
      await result.current.sendMessage({ messages: userMessages, model: "test-model" });
    });

    unmount();

    const cancelCall = fetchSpy.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/cancel")
    );
    expect(cancelCall).toBeUndefined();
  });

  it("reports the cancel outcome via onCancelResult and never throws on a rejected cancel", async () => {
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
    const getToken = vi.fn(async () => {
      tokenReads++;
      return `token-${tokenReads}`;
    });

    let replaySeen: StreamingTransportOptions | undefined;
    transportImpl = (options) => {
      if (options.method === "GET") replaySeen = options;
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() => useChat({ getToken, resumable: true }));

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

    expect(tokenReads).toBe(readsBeforeResume + 1);
    expect(replaySeen?.method).toBe("GET");
    expect(replaySeen?.endpoint).toBe("/api/v1/chat/streams/inf-resume-1");
    expect(replaySeen?.token).toBe(`token-${tokenReads}`);
  });

  it("non-headless resume still emits onData AND onFinish (regression)", async () => {
    const onData = vi.fn();
    const onFinish = vi.fn();
    transportImpl = (options) => {
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

    expect(onData).toHaveBeenCalled();
    const emitted = onData.mock.calls.map((c) => c[0]).join("");
    expect(emitted).toBe("hello");
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(resumeResult!.error).toBeNull();
  });

  it("headless resume emits NOTHING to onData/onThinking/onFinish/onError on a clean completion (still replays)", async () => {
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

    expect(replaySeen?.method).toBe("GET");
    expect(resumeResult!.error).toBeNull();
    expect(resumeResult!.data).not.toBeNull();
    expect(onData).not.toHaveBeenCalled();
    expect(onThinking).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("headless resume emits NOTHING to onData/onThinking/onFinish/onError on a transient failure (result still carries data)", async () => {
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

    expect(resumeResult!.interrupted).toBe(false);
    expect(resumeResult!.error).toContain("401");
    expect(onData).not.toHaveBeenCalled();
    expect(onThinking).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("non-headless transient resume DOES fire onError (regression for the suppression)", async () => {
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

    await act(async () => {
      void result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });

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

    expect(onStreamMeta).toHaveBeenCalledTimes(1);

    let handle: ReturnType<typeof result.current.detach>;
    await act(async () => {
      handle = result.current.detach();
    });
    expect(handle!?.inferenceId).toBe("inf-throwmeta");

    const sendResult = (await sendPromise!) as { error: string; detached?: true };
    expect(sendResult.detached).toBe(true);
  });

  it("does not require onStreamMeta — absent callback is today's behavior", async () => {
    transportImpl = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-nometa" });
      return { stream: makeCompleteStream() };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok", resumable: true }));

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
