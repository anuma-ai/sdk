import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resumeStream } from "./resumeStream";
import { runToolLoop, type RunToolLoopOptions, type StreamingTransport } from "./toolLoop";

const phases = ["replay", "initial", "continuation"] as const;
const bufferedText = "x".repeat(12_000);

function startStream(
  phase: (typeof phases)[number],
  options: Pick<
    RunToolLoopOptions,
    "signal" | "detachSignal" | "onData" | "onThinking" | "onFinish" | "onError"
  >,
  onStreamEnd?: () => void
) {
  let requests = 0;
  const transport: StreamingTransport = () => {
    const toolRequest = phase === "continuation" && requests++ === 0;
    return {
      stream: (async function* () {
        yield Promise.resolve({
          type: "response.created",
          response: { id: "r", model: "test-model" },
        });
        if (toolRequest) {
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
        } else {
          yield { type: "response.output_text.delta", delta: { OfString: bufferedText } };
          yield { type: "response.reasoning.delta", delta: { OfString: bufferedText } };
        }
        yield { type: "response.completed", response: { usage: {} } };
        if (!toolRequest) onStreamEnd?.();
      })(),
    };
  };
  const shared = {
    ...options,
    token: "token",
    transport,
    smoothing: { enabled: true, minSpeed: 1000, maxSpeed: 1000 },
    idleTimeoutMs: 50,
  };

  return phase === "replay"
    ? resumeStream({
        ...shared,
        handle: { inferenceId: "inf", apiType: "responses", model: "test-model" },
      })
    : runToolLoop({
        ...shared,
        apiType: "responses",
        model: "test-model",
        messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        tools: [
          {
            type: "function",
            function: { name: "echo" },
            executor: () => Promise.resolve({ ok: true }),
          },
        ],
      });
}

describe("stream drain cancellation", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each(phases)("stops both smoothers when the caller aborts the %s drain", async (phase) => {
    const caller = new AbortController();
    const onData = vi.fn();
    const onThinking = vi.fn();
    const onFinish = vi.fn();
    const onError = vi.fn();
    let settled = false;
    const promise = startStream(phase, {
      signal: caller.signal,
      onData,
      onThinking,
      onFinish,
      onError,
    }).then((result) => {
      settled = true;
      return result;
    });

    await vi.advanceTimersByTimeAsync(64);
    expect(settled).toBe(false);
    expect(onData).toHaveBeenCalled();
    expect(onThinking).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(2);
    const dataCalls = onData.mock.calls.length;
    const thinkingCalls = onThinking.mock.calls.length;

    caller.abort();
    await vi.advanceTimersByTimeAsync(1000);

    expect(onData).toHaveBeenCalledTimes(dataCalls);
    expect(onThinking).toHaveBeenCalledTimes(thinkingCalls);
    expect(vi.getTimerCount()).toBe(0);
    expect(settled).toBe(true);
    const result = await promise;
    expect(result.error).toBe(phase === "replay" ? "Resume aborted" : "Request aborted");
    expect(JSON.stringify(result.data)).toContain(bufferedText);
    if (phase === "replay") expect(result).toHaveProperty("interrupted", true);
    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it.each(phases)("completes the %s drain and releases the abort listener", async (phase) => {
    const caller = new AbortController();
    const addListener = vi.spyOn(caller.signal, "addEventListener");
    const removeListener = vi.spyOn(caller.signal, "removeEventListener");
    const onData = vi.fn<(text: string) => void>();
    const onThinking = vi.fn<(text: string) => void>();
    const onFinish = vi.fn();
    const promise = startStream(phase, {
      signal: caller.signal,
      onData,
      onThinking,
      onFinish,
    });

    await vi.runAllTimersAsync();
    expect((await promise).error).toBeNull();
    expect(onData.mock.calls.map(([text]) => text).join("")).toBe(bufferedText);
    expect(onThinking.mock.calls.map(([text]) => text).join("")).toContain(bufferedText);
    expect(onFinish).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    for (const [event, listener] of addListener.mock.calls) {
      expect(removeListener).toHaveBeenCalledWith(event, listener);
    }

    caller.abort();
    expect(vi.getTimerCount()).toBe(0);
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it.each(phases)("handles an abort before the %s drain starts", async (phase) => {
    const caller = new AbortController();
    const onFinish = vi.fn();
    let settled = false;
    const promise = startStream(phase, { signal: caller.signal, onFinish }, () => {
      caller.abort();
    }).then((result) => {
      settled = true;
      return result;
    });

    await vi.advanceTimersByTimeAsync(0);

    expect(settled).toBe(true);
    expect((await promise).error).toBe(phase === "replay" ? "Resume aborted" : "Request aborted");
    expect(onFinish).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["initial", "continuation"] as const)(
    "flushes the %s drain when the caller detaches",
    async (phase) => {
      const caller = new AbortController();
      const detach = new AbortController();
      const onData = vi.fn<(text: string) => void>();
      const onThinking = vi.fn<(text: string) => void>();
      const onFinish = vi.fn();
      const promise = startStream(phase, {
        signal: caller.signal,
        detachSignal: detach.signal,
        onData,
        onThinking,
        onFinish,
      });

      await vi.advanceTimersByTimeAsync(64);
      detach.abort();
      await vi.advanceTimersByTimeAsync(0);

      expect(await promise).toMatchObject({ error: "Request detached", detached: true });
      expect(onData.mock.calls.map(([text]) => text).join("")).toBe(bufferedText);
      expect(onThinking.mock.calls.map(([text]) => text).join("")).toContain(bufferedText);
      expect(onFinish).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    }
  );
});
