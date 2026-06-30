/**
 * Detach / resumable-streaming coverage for runToolLoop.
 *
 * `detachSignal` means "the client is going away, keep generating
 * server-side". It tears the stream down like `signal`, but the result is
 * the DETACHED variant: smoothers are flushed (never destroyed) so the UI
 * receives every byte the accumulator holds, partial data is returned, and
 * a StreamResumeHandle is included when `resumable` was on and an
 * X-Inference-ID was captured. These tests pin those guarantees plus the
 * capability-header merge and the onStreamMeta forwarding contract.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import * as embeddingsModule from "../memoryEngine/embeddings";
import type { RunToolLoopResult, StreamingTransport, StreamMetaEvent } from "./toolLoop";
import { runToolLoop } from "./toolLoop";

vi.mock("../../client/core/serverSentEvents.gen", async (importOriginal) => {
  const orig = await importOriginal<typeof sseModule>();
  return { ...orig, createSseClient: vi.fn() };
});

vi.mock("../memoryEngine/embeddings", async (importOriginal) => {
  const orig = await importOriginal<typeof embeddingsModule>();
  return { ...orig, generateEmbedding: vi.fn() };
});

const mockCreateSseClient = vi.mocked(sseModule.createSseClient);
const mockGenerateEmbedding = vi.mocked(embeddingsModule.generateEmbedding);

function makeAbortError() {
  const err = new Error("The operation was aborted");
  err.name = "AbortError";
  return err;
}

/** A stream that yields one text delta then completes — a healthy response. */
function makeTextStream(text: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield { type: "response.output_text.delta", delta: { OfString: text } };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 1, output_tokens: 1 } },
    };
  })();
}

/**
 * A stream that yields one text delta, then aborts the given controller and
 * throws an AbortError — models a detach landing mid-stream (the combined
 * signal reaches the transport, which surfaces the abort per its contract).
 */
function makeDetachingStream(controllersToAbort: AbortController[], text: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield { type: "response.output_text.delta", delta: { OfString: text } };
    for (const c of controllersToAbort) c.abort();
    throw makeAbortError();
  })();
}

/** A stream that throws before yielding any chunk — pre-content transport failure. */
function makeRejectingStream(err: Error) {
  return (async function* () {
    throw err;
    // eslint-disable-next-line no-unreachable -- generator type inference
    yield undefined as never;
  })();
}

/** Stream that ends by emitting one tool call — drives the loop into a continuation round. */
function makeStreamWithToolCall(toolName: string, callId: string, args: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield {
      type: "response.output_item.added",
      item: {
        type: "function_call",
        id: callId,
        call_id: callId,
        name: toolName,
        arguments: args,
      },
    };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 1, output_tokens: 1 } },
    };
  })();
}

function makeEchoTool() {
  return [
    {
      type: "function" as const,
      function: {
        name: "echo",
        description: "echo the argument back",
        parameters: { type: "object", properties: { text: { type: "string" } } },
      },
      executor: async (args: Record<string, unknown>) => ({ echoed: args.text }),
    },
  ];
}

const userMessages = [{ role: "user" as const, content: [{ type: "text" as const, text: "hi" }] }];

/** Narrow a result to the error variant, asserting the detached shape. */
function expectDetached(result: RunToolLoopResult) {
  expect(result.error).toBe("Request detached");
  if (result.error === null) throw new Error("expected the error variant");
  expect(result.detached).toBe(true);
  return result;
}

describe("runToolLoop detach + resumable streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the detached variant with the partial flushed on a mid-initial-stream detach", async () => {
    const detach = new AbortController();
    mockCreateSseClient.mockReturnValueOnce({
      stream: makeDetachingStream([detach], "hello world"),
    } as never);

    const onDataChunks: string[] = [];
    const onError = vi.fn();

    const result = await runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      detachSignal: detach.signal,
      // minSpeed/maxSpeed of 1 with fake timers guarantees the smoother
      // buffer is non-empty at detach — onData receiving the full text
      // proves the detach exit FLUSHED the smoother instead of destroying it.
      smoothing: { enabled: true, minSpeed: 1, maxSpeed: 1 },
      onData: (chunk) => onDataChunks.push(chunk),
      onError,
    });

    const detached = expectDetached(result);
    expect(detached.data).not.toBeNull();
    expect(JSON.stringify(detached.data)).toContain("hello world");
    // Flush proof: every pushed character reached onData before the result resolved.
    expect(onDataChunks.join("")).toBe("hello world");
    // Same policy as aborts: onError is not called for detach.
    expect(onError).not.toHaveBeenCalled();
    // No retry after a detach.
    expect(mockCreateSseClient).toHaveBeenCalledTimes(1);
    // `resumable` was not set, so no handle — the header was never sent.
    expect(detached.resume).toBeNull();
  });

  it("populates the resume handle when resumable is on and an inference id was captured", async () => {
    const detach = new AbortController();
    const transport: StreamingTransport = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-abc" });
      return { stream: makeDetachingStream([detach], "partial") };
    };

    const result = await runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      conversationId: "conv-1",
      resumable: true,
      detachSignal: detach.signal,
      transport,
    });

    const detached = expectDetached(result);
    expect(detached.resume).toEqual({
      inferenceId: "inf-abc",
      apiType: "responses",
      model: "test-model",
      conversationId: "conv-1",
    });
  });

  it("returns resume: null when resumable is off, even if the transport fired meta", async () => {
    const detach = new AbortController();
    const transport: StreamingTransport = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-abc" });
      return { stream: makeDetachingStream([detach], "partial") };
    };

    const result = await runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      detachSignal: detach.signal,
      transport,
    });

    expect(expectDetached(result).resume).toBeNull();
  });

  it("returns resume: null when no inference id was captured before the detach", async () => {
    const detach = new AbortController();
    const transport: StreamingTransport = () => ({
      // No onStreamMeta call — models a detach before HEADERS_RECEIVED.
      stream: makeDetachingStream([detach], "partial"),
    });

    const result = await runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      resumable: true,
      detachSignal: detach.signal,
      transport,
    });

    expect(expectDetached(result).resume).toBeNull();
  });

  it("classifies as a plain abort when both signals fire — user stop wins", async () => {
    const user = new AbortController();
    const detach = new AbortController();
    mockCreateSseClient.mockReturnValueOnce({
      stream: makeDetachingStream([detach, user], "partial"),
    } as never);

    const result = await runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      signal: user.signal,
      detachSignal: detach.signal,
      resumable: true,
    });

    expect(result.error).toBe("Request aborted");
    expect(result).not.toHaveProperty("detached");
    expect(result).not.toHaveProperty("resume");
  });

  it("returns the continuation round's partial and id on a continuation-round detach", async () => {
    const detach = new AbortController();
    let call = 0;
    const transport: StreamingTransport = (options) => {
      call++;
      options.onStreamMeta?.({ inferenceId: `inf-${call}` });
      if (call === 1) {
        return { stream: makeStreamWithToolCall("echo", "call_1", '{"text":"hi"}') };
      }
      return { stream: makeDetachingStream([detach], "round one partial") };
    };

    const result = await runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
      resumable: true,
      detachSignal: detach.signal,
      transport,
    });

    const detached = expectDetached(result);
    expect(JSON.stringify(detached.data)).toContain("round one partial");
    // The handle carries the continuation round's id — the latest capture wins.
    expect(detached.resume?.inferenceId).toBe("inf-2");
  });

  it("returns detached without dispatching another attempt when detach lands during retry backoff", async () => {
    const detach = new AbortController();
    mockCreateSseClient.mockImplementation(
      () => ({ stream: makeRejectingStream(new Error("terminated")) }) as never
    );

    const promise = runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      resumable: true,
      detachSignal: detach.signal,
    });

    // Land the detach during the first retry backoff (fast schedule: 500ms).
    setTimeout(() => detach.abort(), 100);
    await vi.runAllTimersAsync();
    const result = await promise;

    const detached = expectDetached(result);
    // No meta was captured (the only attempt failed pre-headers) → no handle.
    expect(detached.resume).toBeNull();
    // The pre-dispatch guard must return before dispatching a doomed attempt.
    expect(mockCreateSseClient).toHaveBeenCalledTimes(1);
  });

  it("sends X-Stream-Resumable: 1 on the initial and continuation dispatch when resumable is on", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeStreamWithToolCall("echo", "call_1", '{"text":"hi"}'),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const promise = runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
      resumable: true,
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
    for (const [args] of mockCreateSseClient.mock.calls) {
      expect((args as { headers: Record<string, string> }).headers).toMatchObject({
        "X-Stream-Resumable": "1",
      });
    }
  });

  it("sends no capability header by default", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeStreamWithToolCall("echo", "call_1", '{"text":"hi"}'),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const promise = runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
    for (const [args] of mockCreateSseClient.mock.calls) {
      expect((args as { headers: Record<string, string> }).headers).not.toHaveProperty(
        "X-Stream-Resumable"
      );
    }
  });

  it("sends X-Conversation-ID on the initial and continuation dispatch when conversationId is set", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeStreamWithToolCall("echo", "call_1", '{"text":"hi"}'),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const promise = runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
      conversationId: "conv-abc",
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
    for (const [args] of mockCreateSseClient.mock.calls) {
      expect((args as { headers: Record<string, string> }).headers).toMatchObject({
        "X-Conversation-ID": "conv-abc",
      });
    }
  });

  it("sends no X-Conversation-ID when conversationId is absent or blank", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeStreamWithToolCall("echo", "call_1", '{"text":"hi"}'),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const promise = runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
      conversationId: "   ",
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
    for (const [args] of mockCreateSseClient.mock.calls) {
      expect((args as { headers: Record<string, string> }).headers).not.toHaveProperty(
        "X-Conversation-ID"
      );
    }
  });

  it("passes the original signal through by identity when no detachSignal is given", async () => {
    const user = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const transport: StreamingTransport = (options) => {
      receivedSignal = options.signal;
      return { stream: makeTextStream("ok") };
    };

    const promise = runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      signal: user.signal,
      transport,
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(receivedSignal).toBe(user.signal);
  });

  it("forwards onStreamMeta with the round number across a two-round run", async () => {
    let call = 0;
    const transport: StreamingTransport = (options) => {
      call++;
      options.onStreamMeta?.({ inferenceId: `inf-${call}` });
      if (call === 1) {
        return { stream: makeStreamWithToolCall("echo", "call_1", '{"text":"hi"}') };
      }
      return { stream: makeTextStream("done") };
    };

    const events: StreamMetaEvent[] = [];

    const promise = runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
      onStreamMeta: (e) => events.push(e),
      transport,
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(events).toEqual([
      { inferenceId: "inf-1", round: 0 },
      { inferenceId: "inf-2", round: 1 },
    ]);
  });

  it("swallows errors thrown by the onStreamMeta observer", async () => {
    const transport: StreamingTransport = (options) => {
      options.onStreamMeta?.({ inferenceId: "inf-1" });
      return { stream: makeTextStream("ok") };
    };

    const promise = runToolLoop({
      messages: userMessages,
      model: "test-model",
      token: "token",
      onStreamMeta: () => {
        throw new Error("buggy observer");
      },
      transport,
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
  });

  it("captures X-Inference-ID through the default fetch transport", async () => {
    // Use the real createSseClient for this test — the capture lives in the
    // defaultTransport's fetch wrapper, between the response and the parser.
    const actual = await vi.importActual<typeof sseModule>(
      "../../client/core/serverSentEvents.gen"
    );
    mockCreateSseClient.mockImplementation(actual.createSseClient);
    vi.useRealTimers();

    const sseBody = [
      'data: {"type":"response.created","response":{"id":"r","model":"m"}}',
      "",
      'data: {"type":"response.output_text.delta","delta":{"OfString":"hi"}}',
      "",
      'data: {"type":"response.completed","response":{"usage":{"input_tokens":1,"output_tokens":1}}}',
      "",
      "data: [DONE]",
      "",
      "",
    ].join("\n");

    const fetchMock = vi.fn(
      async () =>
        new Response(sseBody, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "X-Inference-ID": "inf-123",
          },
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const events: StreamMetaEvent[] = [];
      const result = await runToolLoop({
        messages: userMessages,
        model: "test-model",
        token: "token",
        smoothing: false,
        onStreamMeta: (e) => events.push(e),
      });

      expect(result.error).toBeNull();
      expect(events).toEqual([{ inferenceId: "inf-123", round: 0 }]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
