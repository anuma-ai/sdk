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
import { runToolLoop, type StepFinishEvent } from "./toolLoop";

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

/**
 * The portal's chat/completions fallback: it runs non-streaming underneath and
 * delivers the whole result as ONE `type: "response"` chunk. No
 * `response.completed`, no deltas — a separate branch in the strategy, which
 * used to drop terminal state on the floor.
 */
function fallbackEnvelopeStream(opts: {
  text?: string;
  status?: string;
  incompleteReason?: string;
  finishReason?: string;
}) {
  return (async function* () {
    yield {
      type: "response",
      response: {
        id: "r",
        model: "m",
        usage: { prompt_tokens: 10, completion_tokens: 4096 },
        output: opts.text
          ? [{ type: "message", content: [{ type: "output_text", text: opts.text }] }]
          : [],
        ...(opts.status !== undefined && { status: opts.status }),
        ...(opts.incompleteReason !== undefined && {
          incomplete_details: { reason: opts.incompleteReason },
        }),
        ...(opts.finishReason !== undefined && { finish_reason: opts.finishReason }),
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
 * It exists because neither response shape answered the question in one
 * vocabulary. Completions carries `choices[0].finish_reason` but omits
 * `tool_calls` when there are none, so a caller counting them cannot separate
 * "zero calls" from "field absent". The Responses shape carried nothing at all
 * until the `status` / `incomplete_details` propagation below.
 *
 * Both gaps were found by an e2e recorder that tried to re-derive these from
 * `result.data` and got `null` on the very runs it was added to explain (#805).
 */
describe("runToolLoop terminalState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("reports the truncation in both vocabularies", async () => {
    // The turn is truncated but keeps partial text, so it is NOT an error — which
    // is exactly the case where a caller needs to be told, and previously had no
    // way to find out.
    mockCreateSseClient
      .mockReturnValueOnce({ stream: toolCallStream("c1", "plan_deck", "{}") } as never)
      .mockReturnValueOnce({ stream: truncatedStream("Here is the deck so f") } as never);

    const result = await run();

    expect(result.error).toBeNull();
    expect(result.terminalState?.finishReason).toBe("length");
    // ...and the response body now says so too, in the Responses vocabulary, so
    // a caller holding only `data` is no longer blind (#805).
    expect(result.data).toMatchObject({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    });
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

  // Review point on #808: the field was set on the two success returns but not on
  // the truncation ERROR return — the one turn where it is most diagnostic. A
  // harness reading `terminalState` (rather than string-matching the error) got
  // `undefined` on exactly the case the field exists to describe.
  it.each(["response.incomplete", "response.completed"] as const)(
    "is reported on the truncation error itself, not only on success (%s)",
    async (eventType) => {
      mockCreateSseClient
        .mockReturnValueOnce({ stream: toolCallStream("c1", "plan_deck", "{}") } as never)
        .mockReturnValueOnce({ stream: truncatedStream(undefined, eventType) } as never);

      const result = await run();

      expect(result.error).toContain("truncated at the output-token limit");
      // Branchable without parsing the error string.
      expect(result.terminalState?.finishReason).toBe("length");
      expect(result.terminalState?.finalToolCallCount).toBe(0);
    }
  );

  it("is reported when the FIRST response is truncated to nothing", async () => {
    // The single-round error path, which returns from a different site.
    mockCreateSseClient.mockReturnValueOnce({ stream: truncatedStream() } as never);

    const result = await run();

    expect(result.error).toContain("truncated at the output-token limit");
    expect(result.terminalState?.finishReason).toBe("length");
    expect(result.terminalState?.finalToolCallCount).toBe(0);
  });
});

/**
 * Response-level terminal state on the Responses shape (#805).
 *
 * `terminalState` above answers for a `runToolLoop` caller. This answers for
 * everyone else: `buildFinalResponse`'s output is what a non-loop consumer
 * holds, and it used to hardcode `status: "completed"` on individual output
 * ITEMS while saying nothing about the turn. A completions consumer could read
 * `choices[0].finish_reason`; a Responses consumer had nothing.
 */
describe("Responses buildFinalResponse terminal state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("carries a non-ceiling incomplete reason the normalization deliberately drops", async () => {
    // `finishReason` is only set for max_output_tokens, so a content filter left
    // NO trace anywhere once the stream ended. This is the case the normalized
    // field cannot represent, which is why the raw fields are worth carrying.
    mockCreateSseClient.mockReturnValueOnce({ stream: filteredStream() } as never);

    const result = await run();

    expect(result.error).toBeNull();
    expect(result.terminalState?.finishReason).toBeUndefined();
    expect(result.data).toMatchObject({
      status: "incomplete",
      incomplete_details: { reason: "content_filter" },
    });
  });

  it("leaves a clean turn's response shape unchanged", async () => {
    // Omitted, not emitted as undefined — a clean turn must not grow keys.
    mockCreateSseClient.mockReturnValueOnce({ stream: cleanTextStream("Hello.") } as never);

    const result = await run();

    expect(result.data).toMatchObject({ status: "completed" });
    expect(result.data).not.toHaveProperty("incomplete_details");
  });
});

/**
 * The portal's non-streaming fallback envelope (greptile P1 on this PR).
 *
 * It arrives as a single `type: "response"` chunk on a branch that never sees
 * `response.completed`, and that branch extracted id/model/usage/content/tool
 * calls but no terminal state at all. So on the one transport where a caller
 * has the least visibility, the truncation guard could not fire, `onStepFinish`
 * omitted `finishReason`, and the response carried no `status`.
 */
describe("portal chat/completions fallback envelope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("fires the truncation guard on a fallback turn cut off at the ceiling", async () => {
    // Empty output + truncated. Before this, the guard saw finishReason
    // undefined and returned error: null with nothing in the response.
    mockCreateSseClient.mockReturnValueOnce({
      stream: fallbackEnvelopeStream({
        status: "incomplete",
        incompleteReason: "max_output_tokens",
      }),
    } as never);

    const result = await run();

    expect(result.error).toContain("truncated at the output-token limit");
    expect(result.terminalState?.finishReason).toBe("length");
    expect(result.data).toMatchObject({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    });
  });

  it("prefers an explicit completions finish_reason when the envelope carries one", async () => {
    // Produced by a chat/completions call underneath, so it can send the
    // completions verdict directly rather than the Responses status pair.
    mockCreateSseClient.mockReturnValueOnce({
      stream: fallbackEnvelopeStream({ finishReason: "length" }),
    } as never);

    const result = await run();

    expect(result.error).toContain("truncated at the output-token limit");
    expect(result.terminalState?.finishReason).toBe("length");
  });

  it("does not report a non-ceiling incomplete reason as a truncation", async () => {
    mockCreateSseClient.mockReturnValueOnce({
      stream: fallbackEnvelopeStream({
        text: "Partial.",
        status: "incomplete",
        incompleteReason: "content_filter",
      }),
    } as never);

    const result = await run();

    expect(result.error).toBeNull();
    expect(result.terminalState?.finishReason).toBeUndefined();
    // Still visible to the caller, just not called a truncation.
    expect(result.data).toMatchObject({
      status: "incomplete",
      incomplete_details: { reason: "content_filter" },
    });
  });
});

/**
 * `onStepFinish` carries the round's own finish reason (#805).
 *
 * A round can truncate and the loop still recover on the next one — normal on
 * Kimi-K2.6, where hitting 4096 recurs in runs that ultimately pass. A consumer
 * watching steps could not see that at all; the round looked identical to one
 * that said everything it meant to.
 */
describe("StepFinishEvent finishReason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("reports the reason for a round that hit the ceiling but still called a tool", async () => {
    // A tool call DID come through, so the truncation guard stays quiet and the
    // loop continues — exactly the case where the step event is the only signal.
    const truncatedToolCallStream = (async function* () {
      yield { type: "response.created", response: { id: "r", model: "m" } };
      yield {
        type: "response.output_item.added",
        item: { id: "item_c1", call_id: "c1", type: "function_call", name: "plan_deck" },
      };
      yield {
        type: "response.function_call_arguments.done",
        item_id: "item_c1",
        call_id: "c1",
        arguments: "{}",
      };
      yield {
        type: "response.incomplete",
        response: {
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
          usage: { input_tokens: 10, output_tokens: 4096 },
        },
      };
    })();

    mockCreateSseClient
      .mockReturnValueOnce({ stream: truncatedToolCallStream } as never)
      .mockReturnValueOnce({ stream: cleanTextStream("Done.") } as never);

    const steps: Array<{ stepIndex: number; finishReason?: string }> = [];
    const result = await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "build a deck" }] }],
      model: "test-model",
      token: "token",
      tools: [planDeckTool()],
      toolChoice: "auto",
      onStepFinish: (e) => steps.push({ stepIndex: e.stepIndex, finishReason: e.finishReason }),
    });

    expect(result.error).toBeNull();
    expect(steps).toHaveLength(1);
    expect(steps[0]?.finishReason).toBe("length");
  });

  it("omits the field when the provider sent no finish reason", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({ stream: toolCallStream("c1", "plan_deck", "{}") } as never)
      .mockReturnValueOnce({ stream: cleanTextStream("Done.") } as never);

    // Push the event itself — rebuilding it here would re-add the key with an
    // `undefined` value and the absence assertion would pass for the wrong
    // reason.
    const steps: StepFinishEvent[] = [];
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "build a deck" }] }],
      model: "test-model",
      token: "token",
      tools: [planDeckTool()],
      toolChoice: "auto",
      onStepFinish: (e) => steps.push(e),
    });

    expect(steps).toHaveLength(1);
    expect(steps[0]).not.toHaveProperty("finishReason");
  });
});
