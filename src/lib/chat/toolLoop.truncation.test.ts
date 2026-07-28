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
 * Responses-API stream truncated at the ceiling. `optionalText` models the
 * two shapes separately: nothing at all (the harmful case) versus a partial
 * answer the caller can still use.
 */
function truncatedStream(optionalText?: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    if (optionalText) {
      yield { type: "response.output_text.delta", delta: { OfString: optionalText } };
    }
    yield {
      type: "response.completed",
      response: {
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        usage: { input_tokens: 10, output_tokens: 4096 },
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

  it("errors when a continuation is truncated to nothing after a tool round", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({ stream: toolCallStream("c1", "plan_deck", "{}") } as never)
      .mockReturnValueOnce({ stream: truncatedStream() } as never);

    const result = await run();

    // The regression: this used to be `null`.
    expect(result.error).toContain("truncated at the output-token limit");
    expect(result.error).toContain("maxOutputTokens");
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
