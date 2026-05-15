/**
 * Transport-level retry coverage for runToolLoop's streaming round.
 *
 * The toolLoop wraps each streaming request in a retry loop that fires
 * ONLY when:
 *   - the failure is transport-class (5xx, timeout, undici `terminated`,
 *     connection refused, etc.), AND
 *   - no chunks have been emitted downstream to the smoothers /
 *     accumulator yet (so retrying can't double-stream user-visible
 *     content).
 *
 * These tests pin those guarantees against the stream-mock so a future
 * refactor can't silently undo them.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import * as embeddingsModule from "../memoryEngine/embeddings";
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

/**
 * A stream that yields one text delta then completes — represents a
 * healthy response.
 */
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
 * A stream that throws before yielding any chunk — represents a
 * pre-content transport failure (e.g. undici `terminated` on a TCP
 * reset before headers arrive, or an immediate 5xx).
 */
function makeRejectingStream(err: Error) {
  return (async function* () {
    throw err;
    // eslint-disable-next-line no-unreachable -- generator type inference
    yield undefined as never;
  })();
}

/**
 * A stream that yields one content chunk THEN throws — represents the
 * dangerous case where retry would double-stream user-visible output.
 */
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
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("invokes the onStreamRetry hook for each retried attempt and reports the round / counter", async () => {
    // Two failing attempts, then recovery — hook should fire twice
    // (once per retry decision), carrying the round identifier and the
    // 1-based attempt counter.
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

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
      onStreamRetry: (e) => events.push(e),
    });

    expect(result.error).toBeNull();
    expect(events).toHaveLength(2);
    expect(events[0]!.round).toBe("initial");
    expect(events[0]!.attempt).toBe(1);
    expect(events[0]!.maxAttempts).toBe(3);
    expect(events[0]!.error.message).toBe("terminated");
    expect(events[1]!.attempt).toBe(2);
    // Fast-schedule backoff for transient transport failures: <2s on
    // first retry. The rate-limit schedule would put this at 5s+.
    expect(events[0]!.backoffMs).toBeLessThan(2000);
  });

  it("uses a longer rate-limit-specific backoff for 429 vs the fast schedule for 5xx", async () => {
    // 429 should back off in the seconds-range (5s) — the server is
    // telling us to slow down. Same retry-attempt index on a 503 stays
    // on the fast schedule (~500ms). Without this differentiation, a
    // rate-limited portal sees 3 retries in 7.5s and the user-visible
    // failure surfaces despite the server having said "wait longer."
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

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
      onStreamRetry: (e) => events.push(e),
    });

    expect(result.error).toBeNull();
    expect(events).toHaveLength(1);
    // Rate-limit schedule starts at 5000ms — well above the 500ms first
    // step of the fast schedule, which would otherwise burn three
    // round-trips in 7.5s against a server asking us to slow down.
    expect(events[0]!.backoffMs).toBeGreaterThanOrEqual(5000);
  }, 10_000);

  it("retries when the first attempt fails with `terminated` before any chunk emits", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({ stream: makeRejectingStream(new Error("terminated")) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("recovered") } as never);

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
    });

    expect(result.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
  });

  it("retries pre-content SSE 5xx failures", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeRejectingStream(new Error("SSE failed: 503 Service Unavailable")),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("recovered") } as never);

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
    });

    expect(result.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry once a chunk has been emitted downstream", async () => {
    // First attempt yields a content delta then crashes — retrying would
    // re-stream the partial content from a fresh LLM run, producing
    // visible duplication on the user side. Bail instead.
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

  // --------------------------------------------------------------------
  // Continuation-round retry coverage.
  //
  // The initial-round path and the continuation-round path are structurally
  // identical (deliberately — drift between them is a known risk). These
  // tests drive runToolLoop through one successful tool call so the loop
  // enters a continuation round, then inject the failure on that round.
  // --------------------------------------------------------------------

  /** Stream that ends by emitting one tool call — drives the loop into a
   * continuation round so the next createSseClient() call is for the
   * continuation request, not the initial. */
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
    // Initial round emits one tool call → continuation round throws
    // `terminated` before any chunk → retry → continuation succeeds.
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeStreamWithToolCall("echo", "call_1", '{"text":"hi"}'),
      } as never)
      .mockReturnValueOnce({ stream: makeRejectingStream(new Error("terminated")) } as never)
      .mockReturnValueOnce({ stream: makeTextStream("recovered") } as never);

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
    });

    expect(result.error).toBeNull();
    // 1 initial + 1 failing continuation + 1 recovered continuation
    expect(mockCreateSseClient).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry a continuation round once any chunk has emitted downstream", async () => {
    // Continuation round emits one text delta, then throws. Retry would
    // double-stream the partial content, so we bail.
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
    // 1 initial + 1 mid-content-failing continuation, no retry
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
  });

  it("gives up after the configured cap on a continuation round too", async () => {
    // Initial succeeds, then all three continuation attempts fail.
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

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
      tools: makeEchoTool(),
    });

    expect(result.error).toContain("terminated");
    // 1 initial + 3 continuation attempts before giving up
    expect(mockCreateSseClient).toHaveBeenCalledTimes(4);
  });

  it("gives up after the configured attempt cap and surfaces the last error", async () => {
    // All three attempts fail with a retriable error → the loop should
    // stop and surface the failure rather than retry forever.
    // mockImplementation (not mockReturnValue) — each call needs a
    // FRESH generator. A single returned generator throws once, then
    // its iterator is exhausted; subsequent attempts would otherwise
    // see an "empty success" instead of the retriable failure.
    mockCreateSseClient.mockImplementation(
      () => ({ stream: makeRejectingStream(new Error("terminated")) }) as never
    );

    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      model: "test-model",
      token: "token",
    });

    expect(result.error).toContain("terminated");
    // STREAM_RETRY_MAX_ATTEMPTS = 3 → exactly 3 createSseClient calls.
    expect(mockCreateSseClient).toHaveBeenCalledTimes(3);
  });
});
