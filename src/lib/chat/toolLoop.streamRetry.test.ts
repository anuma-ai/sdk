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
