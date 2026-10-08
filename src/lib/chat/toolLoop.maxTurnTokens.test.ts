import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import * as embeddingsModule from "../memoryEngine/embeddings";
import type { ModelCallStartEvent } from "./runHooks";
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

function makeToolCallStream(opts: {
  callId: string;
  name: string;
  arguments: string;
  inputTokens: number;
  outputTokens: number;
}) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield {
      type: "response.output_item.added",
      item: {
        id: `item_${opts.callId}`,
        call_id: opts.callId,
        type: "function_call",
        name: opts.name,
        arguments: "",
      },
    };
    yield {
      type: "response.function_call_arguments.done",
      item_id: `item_${opts.callId}`,
      call_id: opts.callId,
      arguments: opts.arguments,
    };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: opts.inputTokens, output_tokens: opts.outputTokens } },
    };
  })();
}

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

function makeChattyTool() {
  return {
    type: "function" as const,
    function: {
      name: "do_thing",
      parameters: { type: "object", properties: {} },
    },
    executor: async () => ({ ok: true }),
  };
}

async function runWithBudget(
  maxTurnTokens: number | undefined
): Promise<Array<string | undefined>> {
  const modelCallToolChoices: Array<string | undefined> = [];
  const result = await runToolLoop({
    messages: [{ role: "user", content: [{ type: "text", text: "go" }] }],
    model: "test-model",
    token: "token",
    tools: [makeChattyTool()],
    toolChoice: "auto",
    ...(maxTurnTokens !== undefined ? { maxTurnTokens } : {}),
    hooks: {
      beforeModelCall: (e: ModelCallStartEvent) => {
        modelCallToolChoices.push(
          (e.requestBody as { tool_choice?: string } | undefined)?.tool_choice
        );
      },
    },
  });
  expect(result.error).toBeNull();
  return modelCallToolChoices;
}

describe("runToolLoop maxTurnTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("forces toolChoice 'none' on the continuation once the budget is reached", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({
          callId: "c1",
          name: "do_thing",
          arguments: "{}",
          inputTokens: 900,
          outputTokens: 200,
        }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("wrapped up") } as never);

    const toolChoices = await runWithBudget(1_000);
    expect(toolChoices).toEqual(["auto", "none"]);
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
  });

  it("leaves toolChoice alone while under budget", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({
          callId: "c1",
          name: "do_thing",
          arguments: "{}",
          inputTokens: 900,
          outputTokens: 200,
        }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const toolChoices = await runWithBudget(1_000_000);
    expect(toolChoices).toEqual(["auto", "auto"]);
  });

  it("never triggers without a budget (default behavior unchanged)", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({
          callId: "c1",
          name: "do_thing",
          arguments: "{}",
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const toolChoices = await runWithBudget(undefined);
    expect(toolChoices).toEqual(["auto", "auto"]);
  });

  it("accumulates across rounds: budget trips on a later continuation", async () => {
    const round = (id: string) =>
      ({
        stream: makeToolCallStream({
          callId: id,
          name: "do_thing",
          arguments: "{}",
          inputTokens: 500,
          outputTokens: 100,
        }),
      }) as never;
    mockCreateSseClient
      .mockReturnValueOnce(round("c1"))
      .mockReturnValueOnce(round("c2"))
      .mockReturnValueOnce({ stream: makeTextStream("wrapped up") } as never);

    const toolChoices = await runWithBudget(1_000);
    expect(toolChoices).toEqual(["auto", "auto", "none"]);
    expect(mockCreateSseClient).toHaveBeenCalledTimes(3);
  });
});
