import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "./useChat";
import * as sseModule from "../client/core/serverSentEvents.gen";
import type {
  LlmEndEvent,
  LlmStartEvent,
  ReceiptHooks,
  ToolEndEvent,
  ToolStartEvent,
} from "../lib/chat/receiptHooks";
import type { ToolConfig } from "../lib/chat/useChat/types";

vi.mock("../client/core/serverSentEvents.gen", async (importOriginal) => {
  const orig = await importOriginal<typeof sseModule>();
  return {
    ...orig,
    createSseClient: vi.fn(),
  };
});

const mockCreateSseClient = vi.mocked(sseModule.createSseClient);

function makeMockStream(chunks: unknown[]) {
  const stream = (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
  return { stream };
}

function makeToolCallStream(toolName: string, toolArgs: Record<string, unknown>) {
  return [
    {
      type: "response.created",
      response: { id: "resp-1", model: "test-model" },
    },
    {
      type: "response.output_item.added",
      item: {
        id: "fc-1",
        type: "function_call",
        name: toolName,
        call_id: "call-1",
        arguments: "",
      },
    },
    {
      type: "response.function_call_arguments.done",
      item_id: "fc-1",
      call_id: "call-1",
      arguments: JSON.stringify(toolArgs),
    },
    {
      type: "response.completed",
      response: { usage: { input_tokens: 10, output_tokens: 5 } },
    },
  ];
}

function makeTextStream(text: string) {
  return [
    {
      type: "response.created",
      response: { id: "resp-2", model: "test-model" },
    },
    {
      type: "response.output_text.delta",
      delta: { OfString: text },
    },
    {
      type: "response.completed",
      response: { usage: { input_tokens: 10, output_tokens: 5 } },
    },
  ];
}

function makeAutoTool(
  name: string,
  executor: (args: Record<string, unknown>) => Promise<unknown>
): ToolConfig {
  return {
    type: "function",
    function: {
      name,
      description: name,
      arguments: { type: "object", properties: {} },
    },
    executor,
  };
}

describe("useChat receiptHooks forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards all four hooks to the tool loop with correct event shapes", async () => {
    const echoTool = makeAutoTool("echo_tool", async (args) => `echo: ${args.input}`);

    mockCreateSseClient
      .mockReturnValueOnce(
        makeMockStream(makeToolCallStream("echo_tool", { input: "hi" })) as any
      )
      .mockReturnValueOnce(makeMockStream(makeTextStream("Final answer.")) as any);

    const llmStartEvents: LlmStartEvent[] = [];
    const llmEndEvents: LlmEndEvent[] = [];
    const toolStartEvents: ToolStartEvent[] = [];
    const toolEndEvents: ToolEndEvent[] = [];

    const receiptHooks: ReceiptHooks = {
      onLlmStart: (event) => {
        llmStartEvents.push(event);
      },
      onLlmEnd: (event) => {
        llmEndEvents.push(event);
      },
      onToolStart: (event) => {
        toolStartEvents.push(event);
      },
      onToolEnd: (event) => {
        toolEndEvents.push(event);
      },
    };

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token", receiptHooks })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        model: "test-model",
        tools: [echoTool],
      });
    });

    // Two LLM rounds: initial request + continuation after tool execution
    expect(llmStartEvents).toHaveLength(2);
    expect(llmEndEvents).toHaveLength(2);
    expect(toolStartEvents).toHaveLength(1);
    expect(toolEndEvents).toHaveLength(1);

    // All events share the same runId
    const runId = llmStartEvents[0].runId;
    expect(runId).toMatch(/^[0-9a-f-]{36}$/i);
    for (const event of [
      ...llmStartEvents,
      ...llmEndEvents,
      ...toolStartEvents,
      ...toolEndEvents,
    ]) {
      expect(event.runId).toBe(runId);
    }

    // stepIndex monotonically increases across LLM rounds
    expect(llmStartEvents[0].stepIndex).toBe(0);
    expect(llmStartEvents[1].stepIndex).toBe(1);

    // LlmStartEvent shape
    expect(llmStartEvents[0].model).toBe("test-model");
    expect(Array.isArray(llmStartEvents[0].messages)).toBe(true);
    expect(typeof llmStartEvents[0].requestBody).toBe("object");

    // LlmEndEvent shape: first round emits the tool call, second round the text
    expect(llmEndEvents[0].toolCalls).toHaveLength(1);
    expect(llmEndEvents[0].toolCalls[0]).toMatchObject({
      id: "call-1",
      name: "echo_tool",
    });
    expect(llmEndEvents[1].toolCalls).toHaveLength(0);
    expect(llmEndEvents[1].content).toContain("Final answer");

    // ToolStartEvent shape — stepIndex is the round in which the tool runs
    expect(toolStartEvents[0]).toMatchObject({
      toolCallId: "call-1",
      name: "echo_tool",
      rawArguments: JSON.stringify({ input: "hi" }),
      parsedArguments: { input: "hi" },
    });
    expect(typeof toolStartEvents[0].stepIndex).toBe("number");

    // ToolEndEvent shape — paired with ToolStartEvent
    expect(toolEndEvents[0]).toMatchObject({
      toolCallId: "call-1",
      name: "echo_tool",
      stepIndex: toolStartEvents[0].stepIndex,
    });
    expect(toolEndEvents[0].error).toBeUndefined();
    expect(toolEndEvents[0].result).toBeDefined();
  });

  it("does not require receiptHooks (purely additive)", async () => {
    mockCreateSseClient.mockReturnValueOnce(makeMockStream(makeTextStream("Hello.")) as any);

    const { result } = renderHook(() => useChat({ getToken: async () => "token" }));

    await act(async () => {
      const response = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        model: "test-model",
      });
      expect(response.error).toBeNull();
    });
  });
});
