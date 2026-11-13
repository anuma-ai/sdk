// @vitest-environment happy-dom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderStreamError, STREAM_RESUMABLE_HEADER } from "../lib/chat/toolLoop";
import { extractAssistantText } from "../lib/chat/useChat/strategies";
import type { StreamingTransport, StreamingTransportOptions } from "../lib/chat/toolLoop";
import { PiiRedactor } from "../lib/pii/redactor";

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

  it("cancel(handle) cancels the old stream and leaves a newer send streaming", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    let liveSignal: AbortSignal | undefined;
    transportImpl = (options) => {
      liveSignal = options.signal;
      options.onStreamMeta?.({ inferenceId: "inf-live" });
      return { stream: makeBlockingStream(options.signal, "x") };
    };

    const { result } = renderHook(() => useChat({ getToken: async () => "tok", resumable: true }));

    await act(async () => {
      void result.current.sendMessage({ messages: userMessages, model: "test-model" });
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      result.current.cancel({ inferenceId: "inf-old" } as never);
    });

    await waitFor(() => {
      const urls = fetchSpy.mock.calls.map(([url]) => String(url));
      expect(urls.some((url) => url.includes("/inf-old/cancel"))).toBe(true);
    });
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes("/inf-live/"))).toBe(false);
    expect(liveSignal?.aborted).toBe(false);
    expect(result.current.detach()?.inferenceId).toBe("inf-live");
    result.current.stop();
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

  it.each(["hook", "updated hook", "override"] as const)(
    "restores replay text and final responses with the %s redactor",
    async (source) => {
      const redactor = new PiiRedactor();
      expect(redactor.redactText("john@example.com").text).toBe("[EMAIL_1]");
      const previousRedactor = new PiiRedactor();
      previousRedactor.redactText("old@example.com");
      const getToken = async () => "tok";
      const onData = vi.fn();
      const onThinking = vi.fn();
      const onFinish = vi.fn();
      transportImpl = () => ({
        stream: (async function* () {
          yield { type: "response.created", response: { id: "r", model: "m" } };
          yield { type: "response.reasoning.delta", delta: { OfString: "Contact [EMA" } };
          yield { type: "response.reasoning.delta", delta: { OfString: "IL_1] first" } };
          yield { type: "response.output_text.delta", delta: { OfString: "Sent to [EMA" } };
          yield { type: "response.output_text.delta", delta: { OfString: "IL_1] now" } };
          yield {
            type: "response.completed",
            response: { usage: { input_tokens: 1, output_tokens: 1 } },
          };
        })(),
      });

      const { result, rerender } = renderHook(
        ({ piiRedaction }) =>
          useChat({ getToken, piiRedaction, onData, onThinking, onFinish, resumable: true }),
        { initialProps: { piiRedaction: source === "hook" ? redactor : previousRedactor } }
      );
      if (source === "updated hook") rerender({ piiRedaction: redactor });

      let resumeResult: Awaited<ReturnType<typeof result.current.resumeStream>>;
      await act(async () => {
        resumeResult = await result.current.resumeStream(
          { inferenceId: "inf-pii", apiType: "responses", model: "test-model" },
          { smoothing: false, ...(source === "override" ? { piiRedactor: redactor } : {}) }
        );
      });

      expect(onData.mock.calls.map(([chunk]) => chunk).join("")).toBe(
        "Sent to john@example.com now"
      );
      expect(onThinking.mock.calls.map(([chunk]) => chunk).join("")).toBe(
        "Contact john@example.com first"
      );
      expect(resumeResult!.error).toBeNull();
      expect(resumeResult!.data).not.toBeNull();
      expect(extractAssistantText(resumeResult!.data!)).toMatchObject({
        content: "Sent to john@example.com now",
        thinking: "Contact john@example.com first",
      });
      expect(onFinish).toHaveBeenCalledExactlyOnceWith(resumeResult!.data);
    }
  );

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

  describe("connection drop", () => {
    type Failure =
      | "network"
      | "provider"
      | "response.failed"
      | "bare response.failed"
      | "typed error";
    const failureChunks: Record<Failure, unknown> = {
      network: null,
      provider: { error: { code: "rate_limited", message: "Provider rate limited" } },
      "response.failed": {
        type: "response.failed",
        response: { error: { code: "server_error", message: "Upstream overloaded" } },
      },
      "bare response.failed": { type: "response.failed" },
      "typed error": { error: { type: "server_error" } },
    };

    function droppingStream(failure: Failure) {
      return (async function* () {
        yield { type: "response.created", response: { id: "r", model: "m" } };
        yield { type: "response.output_text.delta", delta: { OfString: "Half" } };
        if (failureChunks[failure]) yield failureChunks[failure];
        throw new Error("Network request failed");
      })();
    }

    async function send(options: {
      resumable: boolean;
      meta: boolean;
      failure?: Failure;
      apiType?: "responses" | "completions";
    }) {
      transportImpl = (transportOptions) => {
        if (options.meta) transportOptions.onStreamMeta?.({ inferenceId: "inf-drop" });
        return { stream: droppingStream(options.failure ?? "network") };
      };
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useChat({ getToken: async () => "tok", resumable: options.resumable, onError })
      );
      let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
      await act(async () => {
        sent = await result.current.sendMessage({
          messages: userMessages,
          model: "test-model",
          apiType: options.apiType ?? "responses",
        });
      });
      return { sent, onError, result };
    }

    it("detaches a resumable send whose connection drops after the inference id arrived", async () => {
      const { sent, onError, result } = await send({ resumable: true, meta: true });

      expect(sent).toMatchObject({
        error: "Request detached",
        detached: true,
        resume: { inferenceId: "inf-drop", apiType: "responses", model: "test-model" },
      });
      expect(onError).not.toHaveBeenCalled();
      expect(result.current.detach()).toMatchObject({ inferenceId: "inf-drop" });
      expect(extractAssistantText(sent!.data!).content).toBe("Half");
    });

    it("fails a send whose connection drops before the inference id arrived", async () => {
      const { sent, onError } = await send({ resumable: true, meta: false });

      expect(sent).toMatchObject({ error: "Network request failed" });
      expect(sent).not.toHaveProperty("detached");
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Network request failed" })
      );
    });

    it("fails a send the provider ended with an error", async () => {
      const { sent, onError } = await send({ resumable: true, meta: true, failure: "provider" });

      expect(sent).toMatchObject({ error: "Provider rate limited", data: null });
      expect(sent).not.toHaveProperty("detached");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    async function sendWithToolRound(secondRoundMeta: boolean) {
      let round = 0;
      transportImpl = (transportOptions) => {
        const current = round++;
        if (current === 0 || secondRoundMeta) {
          transportOptions.onStreamMeta?.({ inferenceId: `inf-round-${current}` });
        }
        if (current === 1) return { stream: droppingStream("network") };
        return {
          stream: (async function* () {
            yield { type: "response.created", response: { id: "r", model: "m" } };
            yield {
              type: "response.output_item.added",
              item: {
                type: "function_call",
                id: "call",
                call_id: "call",
                name: "echo",
                arguments: "{}",
              },
            };
            yield { type: "response.completed", response: { usage: {} } };
          })(),
        };
      };
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useChat({ getToken: async () => "tok", resumable: true, onError })
      );
      let sent: Awaited<ReturnType<typeof result.current.sendMessage>> | undefined;
      await act(async () => {
        sent = await result.current.sendMessage({
          messages: userMessages,
          model: "test-model",
          apiType: "responses",
          tools: [
            {
              type: "function",
              function: { name: "echo" },
              executor: () => Promise.resolve({ ok: true }),
            },
          ],
        });
      });
      expect(round).toBe(2);
      return { sent, onError };
    }

    it("fails a send that drops after a finished round and before the next inference id", async () => {
      const { sent, onError } = await sendWithToolRound(false);

      expect(sent).not.toHaveProperty("detached");
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("detaches with the latest round's handle when that round drops", async () => {
      const { sent, onError } = await sendWithToolRound(true);

      expect(sent).toMatchObject({ detached: true, resume: { inferenceId: "inf-round-1" } });
      expect(extractAssistantText(sent!.data!).content).toBe("Half");
      expect(onError).not.toHaveBeenCalled();
    });

    it.each([
      ["responses", "response.failed", "[server_error] Upstream overloaded", "server_error"],
      ["responses", "bare response.failed", "Upstream request failed (response.failed)", undefined],
      ["responses", "typed error", "[server_error] server_error", undefined],
      ["completions", "typed error", "[server_error] server_error", undefined],
    ] as const)(
      "fails a %s send that portal ended with a %s event",
      async (apiType, failure, message, code) => {
        const { sent, onError } = await send({ resumable: true, meta: true, failure, apiType });

        expect(sent).toMatchObject({ error: message, data: null });
        expect(sent).not.toHaveProperty("detached");
        expect(onError).toHaveBeenCalledTimes(1);
        const reported = onError.mock.calls[0][0] as unknown;
        expect(reported).toBeInstanceOf(ProviderStreamError);
        expect((reported as ProviderStreamError).code).toBe(code);
      }
    );

    it("fails a dropped send when resumable is off", async () => {
      const { sent, onError } = await send({ resumable: false, meta: true });

      expect(sent).not.toHaveProperty("detached");
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});
