/**
 * Continuation coverage for server-executed tools in runToolLoop.
 *
 * When a round mixes tools the portal already ran (reported on
 * `response.completed` as `tool_call_events` with an `output`) and a client
 * tool the SDK executes, the continuation request must carry the server
 * calls and their outputs too. Without them the model sees the client
 * result (e.g. a confirmed booking card) with none of the evidence that led
 * to it, and re-runs the search instead of acting.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import type { LlmapiMessage } from "../../client";
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

type ToolCallEvent = { id: string; name: string; arguments: string; output?: string };

/**
 * Stream where the model calls a client tool, and `response.completed`
 * reports every tool call of the turn, server-executed ones with output.
 */
function makeClientToolStream(opts: {
  callId: string;
  name: string;
  toolCallEvents: ToolCallEvent[];
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
      arguments: "{}",
    };
    yield {
      type: "response.completed",
      response: {
        usage: { input_tokens: 10, output_tokens: 10 },
        tool_call_events: opts.toolCallEvents,
      },
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

const confirmTool = {
  type: "function" as const,
  function: { name: "prompt_user_confirm", parameters: { type: "object", properties: {} } },
  executor: async () => ({ confirmed: true }),
};

const findEvent: ToolCallEvent = {
  id: "s1",
  name: "AnumaPaymentsMCP-anuma_find_restaurant",
  arguments: '{"query":"sushi"}',
  output: '{"restaurants":[{"id":"r42"}]}',
};

async function captureRequestInputs(): Promise<LlmapiMessage[][]> {
  const inputs: LlmapiMessage[][] = [];
  const result = await runToolLoop({
    messages: [{ role: "user", content: [{ type: "text", text: "book sushi for two" }] }],
    model: "test-model",
    token: "token",
    tools: [confirmTool],
    hooks: {
      beforeModelCall: (e: ModelCallStartEvent) => {
        inputs.push((e.requestBody as { input: LlmapiMessage[] }).input);
      },
    },
  });
  expect(result.error).toBeNull();
  return inputs;
}

function toolCallIndex(input: LlmapiMessage[], id: string): number {
  return input.findIndex((m) => m.tool_calls?.some((tc) => tc.id === id));
}

function toolResultIndex(input: LlmapiMessage[], id: string): number {
  return input.findIndex((m) => m.role === "tool" && m.tool_call_id === id);
}

describe("runToolLoop continuation keeps server-executed tool results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("sends the round's server tool calls and outputs before the client tool call", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeClientToolStream({
          callId: "c1",
          name: "prompt_user_confirm",
          toolCallEvents: [
            findEvent,
            { id: "c1", name: "prompt_user_confirm", arguments: "{}", output: "" },
          ],
        }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("booked") } as never);

    const inputs = await captureRequestInputs();
    expect(inputs).toHaveLength(2);
    const continuation = inputs[1];

    const serverCall = toolCallIndex(continuation, "s1");
    const serverResult = toolResultIndex(continuation, "s1");
    const clientCall = toolCallIndex(continuation, "c1");
    const clientResult = toolResultIndex(continuation, "c1");

    expect(serverCall).toBeGreaterThan(-1);
    expect(continuation[serverCall].tool_calls).toEqual([
      {
        id: "s1",
        type: "function",
        function: { name: findEvent.name, arguments: findEvent.arguments },
      },
    ]);
    expect(continuation[serverResult].content).toEqual([{ type: "text", text: findEvent.output }]);
    expect(serverCall).toBeLessThan(serverResult);
    expect(serverResult).toBeLessThan(clientCall);
    expect(clientCall).toBeLessThan(clientResult);
  });

  it("keeps a server tool that returned an empty result", async () => {
    const emptyEvent: ToolCallEvent = {
      id: "s3",
      name: "AnumaPaymentsMCP-anuma_find_restaurant",
      arguments: '{"query":"nothing"}',
      output: "",
    };
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeClientToolStream({
          callId: "c1",
          name: "prompt_user_confirm",
          toolCallEvents: [emptyEvent, { id: "c1", name: "prompt_user_confirm", arguments: "{}" }],
        }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const continuation = (await captureRequestInputs())[1];

    expect(toolCallIndex(continuation, "s3")).toBeGreaterThan(-1);
    expect(continuation[toolResultIndex(continuation, "s3")].content).toEqual([
      { type: "text", text: "" },
    ]);
  });

  it("strips generated image URLs from a server image tool's result", async () => {
    const imageEvent: ToolCallEvent = {
      id: "s4",
      name: "AnumaMediaMCP-anuma_create_image",
      arguments: '{"prompt":"a cat"}',
      output: '{"output_images":[{"url":"https://x.test/cat.png"}],"model":"m1"}',
    };
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeClientToolStream({
          callId: "c1",
          name: "prompt_user_confirm",
          toolCallEvents: [imageEvent, { id: "c1", name: "prompt_user_confirm", arguments: "{}" }],
        }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const continuation = (await captureRequestInputs())[1];

    expect(continuation[toolResultIndex(continuation, "s4")].content).toEqual([
      { type: "text", text: '{"model":"m1"}' },
    ]);
  });

  it("does not repeat a server tool call the portal reports again on a later round", async () => {
    const availabilityEvent: ToolCallEvent = {
      id: "s2",
      name: "AnumaPaymentsMCP-anuma_check_restaurant_availability",
      arguments: '{"id":"r42"}',
      output: '{"slots":["19:00"]}',
    };
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeClientToolStream({
          callId: "c1",
          name: "prompt_user_confirm",
          toolCallEvents: [findEvent, { id: "c1", name: "prompt_user_confirm", arguments: "{}" }],
        }),
      } as never)
      .mockReturnValueOnce({
        stream: makeClientToolStream({
          callId: "c2",
          name: "prompt_user_confirm",
          toolCallEvents: [
            findEvent,
            availabilityEvent,
            { id: "c2", name: "prompt_user_confirm", arguments: "{}" },
          ],
        }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("booked") } as never);

    const inputs = await captureRequestInputs();
    expect(inputs).toHaveLength(3);
    const last = inputs[2];

    const countCalls = (id: string) =>
      last.filter((m) => m.tool_calls?.some((tc) => tc.id === id)).length;
    const countResults = (id: string) =>
      last.filter((m) => m.role === "tool" && m.tool_call_id === id).length;

    expect(countCalls("s1")).toBe(1);
    expect(countResults("s1")).toBe(1);
    expect(countCalls("s2")).toBe(1);
    expect(countResults("s2")).toBe(1);
    expect(toolResultIndex(last, "c1")).toBeLessThan(toolCallIndex(last, "s2"));
    expect(toolResultIndex(last, "s2")).toBeLessThan(toolCallIndex(last, "c2"));
  });
});
