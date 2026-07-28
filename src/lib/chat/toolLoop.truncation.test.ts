/**
 * Silent-truncation coverage for runToolLoop.
 *
 * A provider that cuts a completion off at the output-token ceiling mid
 * tool-call leaves nothing parseable behind: no tool calls, no content. The
 * loop's exit condition is `toolCalls.size > 0`, which cannot distinguish that
 * from a model that decided it was done — so the turn used to return
 * `error: null` with an empty response and the caller saw success.
 *
 * Observed on merge-queue run 30318214180: deepinfra/moonshotai/Kimi-K2.6 has
 * a 4096-token default ceiling, and a slide-deck round emitting three
 * `add_slide` calls exceeds it. The e2e suite reported
 * "expected 0 to be greater than or equal to 7" — a deck with no slides and
 * no error to explain why.
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

/** Responses-API stream emitting one complete tool call. */
function toolCallStream(callId: string, name: string, args: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield {
      type: "response.output_item.added",
      item: { id: `item_${callId}`, call_id: callId, type: "function_call", name, arguments: "" },
    };
    yield {
      type: "response.function_call_arguments.done",
      item_id: `item_${callId}`,
      call_id: callId,
      arguments: args,
    };
    yield {
      type: "response.completed",
      response: { status: "completed", usage: { input_tokens: 10, output_tokens: 10 } },
    };
  })();
}

/**
 * Responses-API stream truncated at the ceiling.
 *
 * `eventType` matters: the API sends a dedicated terminal
 * `response.incomplete` event, which the strategy did not handle at all — an
 * earlier version of this test asserted the `response.completed` +
 * `status: "incomplete"` shape and passed while the real event was still
 * being ignored. Both shapes are exercised below.
 *
 * `optionalText` separates the harmful case (nothing usable came back) from a
 * partial answer the caller can still render.
 */
function truncatedStream(
  optionalText?: string,
  eventType: "response.incomplete" | "response.completed" = "response.incomplete"
) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    if (optionalText) {
      yield { type: "response.output_text.delta", delta: { OfString: optionalText } };
    }
    yield {
      type: eventType,
      response: {
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        usage: { input_tokens: 10, output_tokens: 4096 },
      },
    };
  })();
}

/** Truncated for a reason that is NOT the token ceiling. */
function filteredStream() {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield {
      type: "response.incomplete",
      response: {
        status: "incomplete",
        incomplete_details: { reason: "content_filter" },
        usage: { input_tokens: 10, output_tokens: 5 },
      },
    };
  })();
}

function cleanTextStream(text: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield { type: "response.output_text.delta", delta: { OfString: text } };
    yield {
      type: "response.completed",
      response: { status: "completed", usage: { input_tokens: 1, output_tokens: 1 } },
    };
  })();
}

function planDeckTool() {
  return {
    type: "function" as const,
    function: { name: "plan_deck", parameters: { type: "object", properties: {} } },
    executor: async () => ({ ok: true }),
  };
}

async function run() {
  return runToolLoop({
    messages: [{ role: "user", content: [{ type: "text", text: "build a deck" }] }],
    model: "test-model",
    token: "token",
    tools: [planDeckTool()],
    toolChoice: "auto",
  });
}

describe("runToolLoop truncation guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it.each(["response.incomplete", "response.completed"] as const)(
    "errors when a continuation is truncated to nothing (%s)",
    async (eventType) => {
      mockCreateSseClient
        .mockReturnValueOnce({ stream: toolCallStream("c1", "plan_deck", "{}") } as never)
        .mockReturnValueOnce({ stream: truncatedStream(undefined, eventType) } as never);

      const result = await run();

      // The regression: this used to be `null`.
      expect(result.error).toContain("truncated at the output-token limit");
      expect(result.error).toContain("maxOutputTokens");
    }
  );

  // greptile P1 on #792: the guard originally sat inside `if (toolIteration >
  // 0)`, so a *first* response truncated before it produced anything left
  // toolIteration at 0 and fell through to the single-round return — just as
  // silent as the case the guard was written for.
  it("errors when the very first response is truncated to nothing", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: truncatedStream() } as never);

    const result = await run();

    expect(result.error).toContain("truncated at the output-token limit");
  });

  it("does not fire when the turn was cut short for a reason other than the ceiling", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: filteredStream() } as never);

    const result = await run();

    // A content filter is not a truncation; reporting it as one would send
    // callers chasing a token budget that is not the problem.
    expect(result.error).toBeNull();
  });

  it("still returns a truncated answer that carries partial content", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({ stream: toolCallStream("c1", "plan_deck", "{}") } as never)
      .mockReturnValueOnce({ stream: truncatedStream("Here is the deck so f") } as never);

    const result = await run();

    // Partial text is still worth handing back — only a turn that produced
    // nothing usable is an error.
    expect(result.error).toBeNull();
  });

  it("leaves a clean multi-round turn alone", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({ stream: toolCallStream("c1", "plan_deck", "{}") } as never)
      .mockReturnValueOnce({ stream: cleanTextStream("Done. Your deck is ready.") } as never);

    const result = await run();

    expect(result.error).toBeNull();
  });

  it("does not fire on a clean turn that simply produced no text", async () => {
    // `status: "completed"` with empty content is a model choosing to say
    // nothing — not a truncation. It must not be reported as an error.
    mockCreateSseClient
      .mockReturnValueOnce({ stream: toolCallStream("c1", "plan_deck", "{}") } as never)
      .mockReturnValueOnce({ stream: cleanTextStream("") } as never);

    const result = await run();

    expect(result.error).toBeNull();
  });
});

/**
 * `terminalState` reports what the guard above decided on, out to the caller.
 *
 * It exists because neither response shape can answer the question. The Responses
 * API has no field for a finish reason — `LlmapiResponseResponse` declares neither
 * `status` nor `incomplete_details` — so a truncation the loop DID detect is
 * invisible in `buildFinalResponse`'s output. Completions does carry
 * `choices[0].finish_reason`, but omits `tool_calls` when there are none, so a
 * caller counting them cannot separate "zero calls" from "field absent".
 *
 * Both gaps were found by an e2e recorder that tried to re-derive these from
 * `result.data` and got `null` on the very runs it was added to explain (#805).
 */
describe("runToolLoop terminalState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("reports the truncation the Responses shape cannot carry", async () => {
    // The turn is truncated but keeps partial text, so it is NOT an error — which
    // is exactly the case where a caller needs to be told, and previously had no
    // way to find out.
    mockCreateSseClient
      .mockReturnValueOnce({ stream: toolCallStream("c1", "plan_deck", "{}") } as never)
      .mockReturnValueOnce({ stream: truncatedStream("Here is the deck so f") } as never);

    const result = await run();

    expect(result.error).toBeNull();
    expect(result.terminalState?.finishReason).toBe("length");
    // And nothing in the response body says so:
    expect(result.data).not.toHaveProperty("status");
    expect(result.data).not.toHaveProperty("incomplete_details");
  });

  it("reports finalToolCallCount 0 on a turn that ended having produced nothing", async () => {
    // The #805 signature: a tool round ran, then the model stopped emitting
    // neither text nor another call, with no truncation to explain it. Not an
    // error by design — but `finishReason` absent + 0 calls + empty text is the
    // fingerprint, and all three are now visible.
    mockCreateSseClient
      .mockReturnValueOnce({ stream: toolCallStream("c1", "plan_deck", "{}") } as never)
      .mockReturnValueOnce({ stream: cleanTextStream("") } as never);

    const result = await run();

    expect(result.error).toBeNull();
    expect(result.terminalState?.finalToolCallCount).toBe(0);
    expect(result.terminalState?.finishReason).toBeUndefined();
  });

  it("counts the calls on a single-round turn that ended in a tool call", async () => {
    mockCreateSseClient.mockReturnValueOnce({
      stream: toolCallStream("c1", "plan_deck", "{}"),
    } as never);
    // Second round: the executor ran, model wraps up with text.
    mockCreateSseClient.mockReturnValueOnce({ stream: cleanTextStream("Done.") } as never);

    const result = await run();

    expect(result.error).toBeNull();
    // The FINAL response is the text one, so no calls are outstanding.
    expect(result.terminalState?.finalToolCallCount).toBe(0);
  });

  it("is present on a clean single-round text turn", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: cleanTextStream("Hello.") } as never);

    const result = await run();

    expect(result.error).toBeNull();
    expect(result.terminalState).toBeDefined();
    expect(result.terminalState?.finalToolCallCount).toBe(0);
  });
});
