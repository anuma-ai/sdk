import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runToolLoop, type RunToolLoopOptions, type RunToolLoopResult } from "./toolLoop";
import { StreamIdleTimeoutError } from "./streamIdleTimeout";

const IDLE_TIMEOUT_MS = 120_000;
const messages: RunToolLoopOptions["messages"] = [
  { role: "user", content: [{ type: "text", text: "hi" }] },
];

function event(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function textEvent(text: string): Uint8Array {
  return event({ type: "response.output_text.delta", delta: { OfString: text } });
}

function openResponse() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value;
    },
    cancel,
  });
  return { controller, cancel, response: new Response(body) };
}

function toolResponse() {
  return new Response(
    [
      {
        type: "response.output_item.added",
        item: { id: "item", call_id: "call", type: "function_call", name: "weather" },
      },
      {
        type: "response.function_call_arguments.done",
        item_id: "item",
        call_id: "call",
        arguments: "{}",
      },
      { type: "response.completed", response: {} },
    ]
      .map((data) => `data: ${JSON.stringify(data)}\n\n`)
      .join("")
  );
}

function startRun(options: Partial<RunToolLoopOptions> = {}) {
  let result: RunToolLoopResult | undefined;
  const promise = runToolLoop({
    messages,
    model: "test-model",
    token: "token",
    smoothing: false,
    ...options,
  }).then((value) => {
    result = value;
    return value;
  });
  return { promise, result: () => result };
}

describe("runToolLoop stream idle timeout", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(["responses", "completions"] as const)(
    "ends a silent %s stream after the default idle interval",
    async (apiType) => {
      const { response, cancel } = openResponse();
      const fetch = vi.fn().mockResolvedValue(response);
      const onError = vi.fn();
      const onFinish = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const run = startRun({ apiType, onError, onFinish });

      await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - 1);
      expect(run.result()).toBeUndefined();
      await vi.advanceTimersByTimeAsync(1);

      expect(run.result()?.error).toBe("Stream timed out after 120000 ms without activity.");
      expect(onError).toHaveBeenCalledOnce();
      const error = onError.mock.calls[0][0] as StreamIdleTimeoutError;
      expect(error).toBeInstanceOf(StreamIdleTimeoutError);
      expect(error.name).toBe("StreamIdleTimeoutError");
      expect(error.idleTimeoutMs).toBe(IDLE_TIMEOUT_MS);
      expect(onFinish).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledOnce();
      expect(cancel).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it("ends a request that stalls before response headers arrive", async () => {
    const fetch = vi.fn((_request: Request) => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetch);
    const run = startRun({ idleTimeoutMs: 1000 });

    await vi.advanceTimersByTimeAsync(1000);

    expect(run.result()?.error).toBe("Stream timed out after 1000 ms without activity.");
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets the interval on data and reports a later stall without a retry", async () => {
    const { response, controller, cancel } = openResponse();
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetch);
    const onData = vi.fn();
    const run = startRun({ onData });

    await vi.advanceTimersByTimeAsync(90_000);
    controller.enqueue(textEvent("partial"));
    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - 1);
    expect(onData).toHaveBeenCalledWith("partial");
    expect(run.result()).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);

    expect(run.result()?.error).toBe("Stream timed out after 120000 ms without activity.");
    expect(fetch).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ends a custom transport that ignores its abort signal", async () => {
    let signal: AbortSignal | undefined;
    let onActivity: (() => void) | undefined;
    const next = vi.fn(() => new Promise<IteratorResult<unknown>>(() => {}));
    const returnIterator = vi.fn().mockResolvedValue({ done: true });
    const run = startRun({
      idleTimeoutMs: 1000,
      transport: (options) => {
        signal = options.signal;
        onActivity = options.onActivity;
        return {
          stream: { [Symbol.asyncIterator]: () => ({ next, return: returnIterator }) },
        };
      },
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(run.result()?.error).toBe("Stream timed out after 1000 ms without activity.");
    expect(signal?.aborted).toBe(true);
    expect(returnIterator).toHaveBeenCalledOnce();
    onActivity?.();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports the idle timeout when iterator cleanup also stalls", async () => {
    const pendingRead = new Promise<IteratorResult<unknown>>(() => {});
    const returnIterator = vi.fn(() => pendingRead);
    const onError = vi.fn();
    const run = startRun({
      idleTimeoutMs: 1000,
      onError,
      transport: () => ({
        stream: {
          [Symbol.asyncIterator]: () => ({
            next: () => pendingRead,
            return: returnIterator,
          }),
        },
      }),
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(run.result()?.error).toBe("Stream timed out after 1000 ms without activity.");
    expect(onError).toHaveBeenCalledOnce();
    expect(returnIterator).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports a caller abort without a timeout error", async () => {
    const caller = new AbortController();
    const onError = vi.fn();
    const run = startRun({
      signal: caller.signal,
      onError,
      transport: ({ signal }) => ({
        stream: {
          [Symbol.asyncIterator]: () => ({
            next: () =>
              new Promise<IteratorResult<unknown>>((_, reject) => {
                signal?.addEventListener(
                  "abort",
                  () => {
                    const error = new Error("Request aborted");
                    error.name = "AbortError";
                    reject(error);
                  },
                  { once: true }
                );
              }),
          }),
        },
      }),
    });

    await vi.advanceTimersByTimeAsync(0);
    caller.abort();
    await vi.advanceTimersByTimeAsync(0);

    expect(run.result()?.error).toBe("Request aborted");
    expect(onError).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, Infinity])("disables the idle timeout with %s", async (idleTimeoutMs) => {
    const { response, controller } = openResponse();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const run = startRun({ idleTimeoutMs });

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS * 2);
    expect(run.result()).toBeUndefined();
    controller.enqueue(textEvent("ok"));
    controller.close();
    await vi.advanceTimersByTimeAsync(0);

    expect((await run.promise).error).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a content-silent stream alive while keep-alive bytes arrive", async () => {
    const { response, controller } = openResponse();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const onData = vi.fn();
    const run = startRun({ onData });

    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(90_000);
      controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"));
      await vi.advanceTimersByTimeAsync(0);
      expect(run.result()).toBeUndefined();
    }
    expect(onData).not.toHaveBeenCalled();
    controller.enqueue(textEvent("ok"));
    controller.close();
    await vi.advanceTimersByTimeAsync(0);

    expect((await run.promise).error).toBeNull();
    expect(onData).toHaveBeenCalledWith("ok");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ends a silent continuation after a client tool call", async () => {
    const continuation = openResponse();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(toolResponse())
      .mockResolvedValueOnce(continuation.response);
    vi.stubGlobal("fetch", fetch);
    const executor = vi.fn().mockResolvedValue({ temperature: 20 });
    const run = startRun({
      tools: [{ type: "function", function: { name: "weather" }, executor }],
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(executor).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS);

    expect(run.result()?.error).toBe("Stream timed out after 120000 ms without activity.");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(continuation.cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not apply the stream timeout to a client tool executor", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(toolResponse())
      .mockResolvedValueOnce(new Response(new TextDecoder().decode(textEvent("ok"))));
    vi.stubGlobal("fetch", fetch);
    const run = startRun({
      idleTimeoutMs: 1000,
      tools: [
        {
          type: "function",
          function: { name: "weather" },
          executor: () =>
            new Promise((resolve) => setTimeout(() => resolve({ temperature: 20 }), 2000)),
        },
      ],
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(run.result()).toBeUndefined();
    expect(fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000);

    expect((await run.promise).error).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
