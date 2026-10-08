import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import * as embeddingsModule from "../memoryEngine/embeddings";
import { ProviderStreamError, runToolLoop } from "./toolLoop";

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

function makeRejectingStream(err: Error) {
  return (async function* () {
    throw err;
    // eslint-disable-next-line no-unreachable -- generator type inference
    yield undefined as never;
  })();
}

function makePartiallyEmittingThenRejectingStream(err: Error) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield { type: "response.output_text.delta", delta: { OfString: "partial" } };
    throw err;
  })();
}

describe("runToolLoop streaming retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes the onStreamRetry hook for each retried attempt and reports the round / counter", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeRejectingStream(new Error("terminated")) } as never)
      .mockReturnValueOnce({ stream: makeRejectingStream(new Error("terminated")) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("recovered") } as never);

    const events: Array<{
      round: "initial" | number;
      attempt: number;
      maxAttempts: number;
      backoffMs: number;
      error: Error;
    }> = [];

    const promise = runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
      onStreamRetry: (e) => events.push(e),
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(events).toHaveLength(2);
    expect(events[0]!.round).toBe("initial");
    expect(events[0]!.attempt).toBe(1);
    expect(events[0]!.maxAttempts).toBe(3);
    expect(events[0]!.error.message).toBe("terminated");
    expect(events[1]!.attempt).toBe(2);
    expect(events[0]!.backoffMs).toBeLessThan(2000);
  });

  it("uses a longer rate-limit-specific backoff for 429 vs the fast schedule for 5xx", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeRejectingStream(new Error("SSE failed: 429 Too Many Requests")),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("recovered") } as never);

    const events: Array<{
      round: "initial" | number;
      attempt: number;
      maxAttempts: number;
      backoffMs: number;
      error: Error;
    }> = [];

    const promise = runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
      onStreamRetry: (e) => events.push(e),
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(events).toHaveLength(1);
    expect(events[0]!.backoffMs).toBeGreaterThanOrEqual(5000);
  });

  it("retries when the first attempt fails with `terminated` before any chunk emits", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeRejectingStream(new Error("terminated")) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("recovered") } as never);

    const promise = runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
  });

  it("fires onRequest for every attempt, marking retries via the attempt counter", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeRejectingStream(new Error("terminated")) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("recovered") } as never);

    const events: Array<{ round: number; attempt: number }> = [];

    const promise = runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
      onRequest: (e) => events.push({ round: e.round, attempt: e.attempt }),
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(events).toEqual([
      { round: 0, attempt: 0 },
      { round: 0, attempt: 1 },
    ]);
  });

  it("retries pre-content SSE 5xx failures", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeRejectingStream(new Error("SSE failed: 503 Service Unavailable")),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("recovered") } as never);

    const promise = runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry once a chunk has been emitted downstream", async () => {
    mockCreateSseClient.mockReturnValueOnce({
      stream: makePartiallyEmittingThenRejectingStream(new Error("terminated")),
    } as never);

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
    });

    expect(result.error).toContain("terminated");
    expect(mockCreateSseClient).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry non-retriable errors like 401/403/400", async () => {
    mockCreateSseClient.mockReturnValueOnce({
      stream: makeRejectingStream(new Error("SSE failed: 401 Unauthorized")),
    } as never);

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
    });

    expect(result.error).toContain("401");
    expect(mockCreateSseClient).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry a ProviderStreamError even when its message matches a transport heuristic", async () => {
    const provErr = new ProviderStreamError("terminated");
    mockCreateSseClient.mockReturnValueOnce({
      stream: (async function* () {
        throw provErr;
        // eslint-disable-next-line no-unreachable -- generator type inference
        yield undefined as never;
      })(),
    } as never);

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
    });

    expect(result.error).toBe("terminated");
    expect(mockCreateSseClient).toHaveBeenCalledTimes(1);
  });

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

  it("retries a continuation round that fails pre-content with a transient error", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeStreamWithToolCall("echo", "call_1", '{"text":"hi"}'),
      } as never)
      .mockReturnValueOnce({ stream: makeRejectingStream(new Error("terminated")) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("recovered") } as never);

    const promise = runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry a continuation round once any chunk has emitted downstream", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeStreamWithToolCall("echo", "call_1", '{"text":"hi"}'),
      } as never)
      .mockReturnValueOnce({
        stream: makePartiallyEmittingThenRejectingStream(new Error("terminated")),
      } as never);

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
    });

    expect(result.error).toContain("terminated");
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
  });

  it("gives up after the configured cap on a continuation round too", async () => {
    let call = 0;
    mockCreateSseClient.mockImplementation(() => {
      call++;
      if (call === 1) {
        return {
          stream: makeStreamWithToolCall("echo", "call_1", '{"text":"hi"}'),
        } as never;
      }
      return { stream: makeRejectingStream(new Error("terminated")) } as never;
    });

    const promise = runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toContain("terminated");
    expect(mockCreateSseClient).toHaveBeenCalledTimes(4);
  });

  it("gives up after the configured attempt cap and surfaces the last error", async () => {
    mockCreateSseClient.mockImplementation(
      () => ({ stream: makeRejectingStream(new Error("terminated")) }) as never
    );

    const promise = runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.error).toContain("terminated");
    expect(mockCreateSseClient).toHaveBeenCalledTimes(3);
  });
});
