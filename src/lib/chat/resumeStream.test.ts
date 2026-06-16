/**
 * Coverage for resumeStream — the reconnect primitive that replays a detached
 * stream from the portal's buffer (zeta-chain/ai-portal#1161).
 *
 * Pins the contract ai-memoryless-client and the portal depend on:
 * - the replay GET hits /api/v1/chat/streams/{id} with NO body, NO
 *   starting_after, NO cursor — replay is always whole-stream from seq 0;
 * - a fresh accumulator rebuilds the response (replay equivalence with the
 *   live stream), for both API types incl. the stateful completions parser;
 * - 410 Gone THROWS StreamExpiredError (instanceof + inferenceId); no
 *   onFinish/onError fire;
 * - an in-stream error event terminates as `interrupted: true` with the
 *   replayed content, no throw;
 * - a tool-request terminal is `interrupted: true` and never leaks a tool
 *   payload to onData;
 * - the idle watchdog fires `interrupted: true` "Resume timed out" and resets
 *   on each chunk;
 * - the token is forwarded as the bearer (the hook resolves it at invocation);
 * - a transient 401 is `interrupted: false` with statusCode, handle retained.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runToolLoop } from "./toolLoop";
import type { StreamingTransport, StreamingTransportOptions, StreamResumeHandle } from "./toolLoop";
import { sseFailureMessage } from "./xhrTransport";
import {
  resumeStream,
  StreamExpiredError,
  streamCancelPath,
  streamReplayPath,
} from "./resumeStream";

function makeAbortError() {
  const err = new Error("The operation was aborted");
  err.name = "AbortError";
  return err;
}

/** A healthy responses-shaped replay: created → text deltas → completed. */
function makeTextStream(...parts: string[]) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    for (const part of parts) {
      yield { type: "response.output_text.delta", delta: { OfString: part } };
    }
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 1, output_tokens: 1 } },
    };
  })();
}

/** A completions-shaped replay carrying a <think> block to exercise the stateful parser. */
function makeCompletionsThinkStream() {
  return (async function* () {
    yield {
      id: "c",
      object: "chat.completion.chunk",
      model: "m",
      choices: [{ index: 0, delta: { content: "<think>reasoning</think>" } }],
    };
    yield {
      id: "c",
      object: "chat.completion.chunk",
      model: "m",
      choices: [{ index: 0, delta: { content: "answer text" } }],
    };
    yield {
      id: "c",
      object: "chat.completion.chunk",
      model: "m",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    };
  })();
}

const handle: StreamResumeHandle = {
  inferenceId: "inf-xyz",
  apiType: "responses",
  model: "test-model",
  conversationId: "conv-1",
};

/** Capture transport options and serve a caller-provided stream. */
function captureTransport(stream: AsyncIterable<unknown>): {
  transport: StreamingTransport;
  calls: StreamingTransportOptions[];
} {
  const calls: StreamingTransportOptions[] = [];
  const transport: StreamingTransport = (options) => {
    calls.push(options);
    return { stream };
  };
  return { transport, calls };
}

describe("resumeStream path builders", () => {
  it("builds the replay path with no query string or cursor", () => {
    expect(streamReplayPath("inf-1")).toBe("/api/v1/chat/streams/inf-1");
  });

  it("url-encodes the inference id", () => {
    expect(streamReplayPath("a/b c")).toBe("/api/v1/chat/streams/a%2Fb%20c");
  });

  it("builds the cancel path under the replay path", () => {
    expect(streamCancelPath("inf-1")).toBe("/api/v1/chat/streams/inf-1/cancel");
  });
});

describe("resumeStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replays from seq 0 with a GET, no body, no starting_after, no cursor", async () => {
    const { transport, calls } = captureTransport(makeTextStream("Hello ", "world"));

    const result = await resumeStream({ handle, token: "tok", transport });

    expect(calls).toHaveLength(1);
    const opts = calls[0];
    expect(opts.method).toBe("GET");
    expect(opts.endpoint).toBe("/api/v1/chat/streams/inf-xyz");
    expect(opts.body).toBeUndefined();
    expect(opts.token).toBe("tok");
    // No client-side cursor leaks into the request anywhere.
    expect(JSON.stringify(opts.headers ?? {})).not.toMatch(/starting_after|last-event-id|cursor/i);

    expect(result.interrupted).toBe(false);
    expect(result.error).toBeNull();
    expect(JSON.stringify(result.data)).toContain("Hello world");
  });

  it("is replay-equivalent with an uninterrupted runToolLoop over the same fixture", async () => {
    // The live run and the replay drive the SAME fixture chunk sequence; the
    // assembled onFinish responses must deep-equal.
    let liveResponse: unknown;
    const liveTransport = captureTransport(makeTextStream("alpha ", "beta ", "gamma")).transport;
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
      model: "test-model",
      token: "tok",
      apiType: "responses",
      transport: liveTransport,
      smoothing: false,
      onFinish: (resp) => {
        liveResponse = resp;
      },
    });

    let replayResponse: unknown;
    const replayTransport = captureTransport(makeTextStream("alpha ", "beta ", "gamma")).transport;
    const result = await resumeStream({
      handle,
      token: "tok",
      transport: replayTransport,
      smoothing: false,
      onFinish: (resp) => {
        replayResponse = resp;
      },
    });

    expect(result.interrupted).toBe(false);
    expect(replayResponse).toEqual(liveResponse);
  });

  it("is replay-equivalent for completions with a <think> block (stateful parser, fresh state)", async () => {
    // Same proof as above but for the completions API type, whose reasoning-tag
    // parser is stateful — replay-from-0 into a FRESH accumulator must assemble
    // a response that deep-equals the uninterrupted run, with <think> routed to
    // reasoning and the rest to content.
    let liveResponse: unknown;
    const liveTransport = captureTransport(makeCompletionsThinkStream()).transport;
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
      model: "test-model",
      token: "tok",
      apiType: "completions",
      transport: liveTransport,
      smoothing: false,
      onFinish: (resp) => {
        liveResponse = resp;
      },
    });

    let replayResponse: unknown;
    const replayTransport = captureTransport(makeCompletionsThinkStream()).transport;
    const result = await resumeStream({
      handle: { ...handle, apiType: "completions" },
      token: "tok",
      transport: replayTransport,
      smoothing: false,
      onFinish: (resp) => {
        replayResponse = resp;
      },
    });

    expect(result.interrupted).toBe(false);
    expect(replayResponse).toEqual(liveResponse);
  });

  it("streams content deltas to onData in order during replay", async () => {
    const { transport } = captureTransport(makeTextStream("foo", "bar", "baz"));
    const chunks: string[] = [];

    const result = await resumeStream({
      handle,
      token: "tok",
      transport,
      smoothing: false,
      onData: (c) => chunks.push(c),
    });

    expect(chunks.join("")).toBe("foobarbaz");
    expect(result.interrupted).toBe(false);
  });

  it("forwards the caller-supplied token as the bearer", async () => {
    const { transport, calls } = captureTransport(makeTextStream("x"));
    await resumeStream({ handle, token: "refreshed-token", transport });
    expect(calls[0].token).toBe("refreshed-token");
  });

  it("THROWS StreamExpiredError on a 410 Gone, with no onFinish/onError", async () => {
    const transport: StreamingTransport = (options) => {
      options.onSseError?.(new Error("SSE failed: 410 Gone"));
      return { stream: (async function* () {})() };
    };
    const onData = vi.fn();
    const onFinish = vi.fn();
    const onError = vi.fn();

    await expect(
      resumeStream({ handle, token: "tok", transport, onData, onFinish, onError })
    ).rejects.toMatchObject({ name: "StreamExpiredError", inferenceId: "inf-xyz" });

    await expect(resumeStream({ handle, token: "tok", transport })).rejects.toBeInstanceOf(
      StreamExpiredError
    );
    expect(onData).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("returns interrupted with the replayed content on an in-stream error event", async () => {
    // Content frames, then ONE in-stream SSE error event (the shape
    // getInStreamErrorMessage parses), then [DONE]: an interrupted terminal.
    const stream = (async function* () {
      yield { type: "response.created", response: { id: "r", model: "m" } };
      yield { type: "response.output_text.delta", delta: { OfString: "replayed text" } };
      yield { error: { code: "stream_interrupted", message: "deadline exceeded" } };
      yield "[DONE]";
    })();
    const { transport } = captureTransport(stream);
    const chunks: string[] = [];
    const onError = vi.fn();
    const onFinish = vi.fn();

    const result = await resumeStream({
      handle,
      token: "tok",
      transport,
      smoothing: false,
      onData: (c) => chunks.push(c),
      onError,
      onFinish,
    });

    expect(result.interrupted).toBe(true);
    expect(result.data).not.toBeNull();
    expect(chunks.join("")).toBe("replayed text");
    expect(JSON.stringify(result.data)).toContain("replayed text");
    expect(result.error).toContain("deadline exceeded");
    // Interrupted terminals never fire onError/onFinish.
    expect(onError).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("returns interrupted on a tool-request terminal and leaks no tool payload to onData", async () => {
    // A responses-shaped stream that accumulates a function-call tool item then
    // completes — resumeStream takes no tools, so this is interrupted.
    const stream = (async function* () {
      yield { type: "response.created", response: { id: "r", model: "m" } };
      yield {
        type: "response.output_item.added",
        item: { type: "function_call", id: "fc1", call_id: "call_1", name: "get_weather" },
      };
      yield {
        type: "response.function_call_arguments.delta",
        item_id: "fc1",
        delta: '{"city":"SF"}',
      };
      yield { type: "response.completed", response: { usage: {} } };
    })();
    const { transport } = captureTransport(stream);
    const dataChunks: string[] = [];

    const result = await resumeStream({
      handle,
      token: "tok",
      transport,
      smoothing: false,
      onData: (c) => dataChunks.push(c),
    });

    expect(result.interrupted).toBe(true);
    // No tool-call payload ever reaches onData.
    expect(dataChunks.join("")).not.toContain("get_weather");
    expect(dataChunks.join("")).not.toContain("SF");
    // The returned/persistable data must also be free of the dangling
    // function_call — a stored orphan tool_call (no tool_result) is rejected by
    // many providers on the next turn.
    const outputTypes = ((result.data as { output?: Array<{ type?: string }> }).output ?? []).map(
      (item) => item.type
    );
    expect(outputTypes).not.toContain("function_call");
    expect(JSON.stringify(result.data)).not.toContain("get_weather");
  });

  it("returns interrupted 'Resume aborted' with the partial when the caller signal fires", async () => {
    const controller = new AbortController();
    const stream = (async function* () {
      yield { type: "response.created", response: { id: "r", model: "m" } };
      yield { type: "response.output_text.delta", delta: { OfString: "half" } };
      controller.abort();
      throw makeAbortError();
    })();
    const { transport } = captureTransport(stream);

    const result = await resumeStream({
      handle,
      token: "tok",
      transport,
      smoothing: false,
      signal: controller.signal,
    });

    expect(result.interrupted).toBe(true);
    expect(JSON.stringify(result.data)).toContain("half");
    expect(result.error).toBe("Resume aborted");
  });

  it("labels a caller abort as 'Resume aborted' even when the idle watchdog races it", async () => {
    vi.useFakeTimers();
    // The caller aborts at t=500ms; the idle watchdog is armed for 1000ms. A
    // slow transport surfaces the AbortError only AFTER the watchdog would have
    // fired — without the callerAborted flag the label flips to "Resume timed
    // out". The caller stop must win the label regardless of timer ordering.
    const controller = new AbortController();
    const transport: StreamingTransport = (options) => ({
      stream: (async function* () {
        await new Promise<void>((resolve) => {
          if (options.signal?.aborted) return resolve();
          options.signal?.addEventListener("abort", () => resolve(), { once: true });
        });
        // The transport reacts late: surface the AbortError after a further gap.
        await new Promise((r) => setTimeout(r, 50));
        throw makeAbortError();
      })(),
    });

    const promise = resumeStream({
      handle,
      token: "tok",
      transport,
      signal: controller.signal,
      idleTimeoutMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(500);
    controller.abort();
    await vi.advanceTimersByTimeAsync(600);
    const result = await promise;

    expect(result.interrupted).toBe(true);
    expect(result.error).toBe("Resume aborted");
  });

  it("returns interrupted immediately when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const { transport, calls } = captureTransport(makeTextStream("never"));

    const result = await resumeStream({
      handle,
      token: "tok",
      transport,
      signal: controller.signal,
    });

    expect(result.interrupted).toBe(true);
    expect(result.error).toBe("Resume aborted");
    // The transport must not be invoked for a pre-aborted resume.
    expect(calls).toHaveLength(0);
  });

  it("fires the idle watchdog as 'Resume timed out' when no chunk arrives within idleTimeoutMs", async () => {
    vi.useFakeTimers();
    // A stream that opens, yields nothing, and blocks until its signal aborts.
    const transport: StreamingTransport = (options) => ({
      stream: (async function* () {
        await new Promise<void>((resolve) => {
          if (options.signal?.aborted) return resolve();
          options.signal?.addEventListener("abort", () => resolve(), { once: true });
        });
        throw makeAbortError();
      })(),
    });

    const promise = resumeStream({ handle, token: "tok", transport, idleTimeoutMs: 1000 });

    await vi.advanceTimersByTimeAsync(1001);
    const result = await promise;

    expect(result.interrupted).toBe(true);
    expect(result.error).toBe("Resume timed out");
  });

  it("resets the idle timer on each chunk (a chunk before the timeout keeps it alive)", async () => {
    vi.useFakeTimers();
    // Yield a chunk at t≈800ms (under the 1000ms timeout) then complete; the
    // timer reset means the watchdog never fires.
    const transport: StreamingTransport = () => ({
      stream: (async function* () {
        yield { type: "response.created", response: { id: "r", model: "m" } };
        await new Promise((r) => setTimeout(r, 800));
        yield { type: "response.output_text.delta", delta: { OfString: "kept alive" } };
        yield { type: "response.completed", response: { usage: {} } };
      })(),
    });

    const promise = resumeStream({
      handle,
      token: "tok",
      transport,
      idleTimeoutMs: 1000,
      smoothing: false,
    });
    await vi.advanceTimersByTimeAsync(900);
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result.interrupted).toBe(false);
    expect(JSON.stringify(result.data)).toContain("kept alive");
  });

  it("returns a transient result (interrupted: false, statusCode) on a 401 with the handle intact", async () => {
    const transport: StreamingTransport = (options) => {
      options.onSseError?.(new Error("SSE failed: 401 Unauthorized"));
      return { stream: (async function* () {})() };
    };
    const onError = vi.fn();

    const result = await resumeStream({ handle, token: "tok", transport, onError });

    expect(result.interrupted).toBe(false);
    expect("statusCode" in result && result.statusCode).toBe(401);
    expect(result.error).toContain("401");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("classifies via the xhrTransport SSE-failure message contract (410 throws, 5xx transient)", async () => {
    // Pins the producer↔parser contract: parseSseStatusCode reads the status out
    // of the EXACT string sseFailureMessage produces. Building the error through
    // the shared helper means a format drift fails HERE, not silently in prod
    // (where a 410 would otherwise degrade to a retry against an evicted buffer).
    const goneTransport: StreamingTransport = (options) => {
      options.onSseError?.(new Error(sseFailureMessage(410, "Gone")));
      return { stream: (async function* () {})() };
    };
    await expect(
      resumeStream({ handle, token: "tok", transport: goneTransport })
    ).rejects.toBeInstanceOf(StreamExpiredError);

    const errTransport: StreamingTransport = (options) => {
      options.onSseError?.(new Error(sseFailureMessage(503, "Service Unavailable")));
      return { stream: (async function* () {})() };
    };
    const result = await resumeStream({ handle, token: "tok", transport: errTransport });
    expect(result.interrupted).toBe(false);
    expect("statusCode" in result && result.statusCode).toBe(503);
  });

  it("stops consuming on a mid-stream 5xx and returns transient with the partial captured", async () => {
    // The error surfaces AFTER a content frame, while the iterator is still
    // open — exercising the in-loop sseError break so no further bytes are
    // delivered for a failed stream. Outcome: transient (keep the handle) with
    // statusCode, the pre-error partial preserved, the post-error frame dropped.
    const transport: StreamingTransport = (options) => ({
      stream: (async function* () {
        yield { type: "response.created", response: { id: "r", model: "m" } };
        yield {
          type: "response.output_text.delta",
          delta: { OfString: "partial before the drop" },
        };
        options.onSseError?.(new Error(sseFailureMessage(503, "Service Unavailable")));
        yield { type: "response.output_text.delta", delta: { OfString: " AFTER must not arrive" } };
      })(),
    });
    const chunks: string[] = [];
    const result = await resumeStream({
      handle,
      token: "tok",
      transport,
      smoothing: false,
      onData: (c) => chunks.push(c),
    });

    expect(result.interrupted).toBe(false);
    expect("statusCode" in result && result.statusCode).toBe(503);
    expect(chunks.join("")).toContain("partial before the drop");
    expect(chunks.join("")).not.toContain("AFTER");
  });

  it("parses with the handle's resolved api type (completions), not the model — stateful <think> parser", async () => {
    const { transport } = captureTransport(makeCompletionsThinkStream());
    const thinking: string[] = [];
    const data: string[] = [];

    const result = await resumeStream({
      handle: { ...handle, apiType: "completions" },
      token: "tok",
      transport,
      smoothing: false,
      onData: (c) => data.push(c),
      onThinking: (c) => thinking.push(c),
    });

    expect(result.interrupted).toBe(false);
    // The <think>…</think> block routed to thinking; the rest to content.
    expect(thinking.join("")).toContain("reasoning");
    expect(data.join("")).toContain("answer text");
    expect(data.join("")).not.toContain("reasoning");
  });

  it("shares zero accumulator/smoother state between two sequential calls", async () => {
    const first = await resumeStream({
      handle,
      token: "tok",
      transport: captureTransport(makeTextStream("first-run")).transport,
      smoothing: false,
    });
    const second = await resumeStream({
      handle,
      token: "tok",
      transport: captureTransport(makeTextStream("second-run")).transport,
      smoothing: false,
    });

    expect(JSON.stringify(first.data)).toContain("first-run");
    expect(JSON.stringify(first.data)).not.toContain("second-run");
    expect(JSON.stringify(second.data)).toContain("second-run");
    expect(JSON.stringify(second.data)).not.toContain("first-run");
  });
});
