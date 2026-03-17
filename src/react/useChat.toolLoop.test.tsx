import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "./useChat";
import * as sseModule from "../client/core/serverSentEvents.gen";
import type { ToolConfig } from "../lib/chat/useChat/types";

type SendMessageResult = Awaited<ReturnType<ReturnType<typeof useChat>["sendMessage"]>>;

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

/** Helper to extract the request body passed to createSseClient */
function getRequestBody(callIndex: number): any {
  const opts = mockCreateSseClient.mock.calls[callIndex][0] as any;
  return JSON.parse(opts.serializedBody);
}

describe("useChat multi-turn tool loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-executes a tool, sends result back, and completes with final text", async () => {
    const autoTool = makeAutoTool("auto_tool", async (args) => `result for ${args.input}`);

    mockCreateSseClient
      .mockReturnValueOnce(
        makeMockStream(makeToolCallStream("auto_tool", { input: "hello" })) as any
      )
      .mockReturnValueOnce(makeMockStream(makeTextStream("Here is the result.")) as any);

    const { result } = renderHook(() => useChat({ getToken: async () => "token" }));

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Do something" }] }],
        model: "test-model",
        tools: [autoTool],
      });
    });

    expect(response?.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);

    // Verify the continuation includes tool result in messages
    const continuationBody = getRequestBody(1);
    const toolResultMsg = continuationBody.input.find((m: any) => m.role === "tool");
    expect(toolResultMsg).toBeDefined();
    expect(toolResultMsg.content[0].text).toContain("result for hello");
  });

  it("emits onToolCall for tools without an executor", async () => {
    const noExecutorTool: ToolConfig = {
      type: "function",
      function: {
        name: "server_tool",
        description: "Server-side tool",
        arguments: { type: "object", properties: {} },
      },
    };

    mockCreateSseClient.mockReturnValue(
      makeMockStream(makeToolCallStream("server_tool", { input: "test" })) as any
    );

    const onToolCall = vi.fn();
    const { result } = renderHook(() => useChat({ getToken: async () => "token", onToolCall }));

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Do something" }] }],
        model: "test-model",
        tools: [noExecutorTool],
      });
    });

    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        function: expect.objectContaining({ name: "server_tool" }),
      })
    );
    expect(mockCreateSseClient).toHaveBeenCalledTimes(1); // no continuation
  });

  it("handles multiple rounds of tool calls before final response", async () => {
    const stepTool = makeAutoTool("step_tool", async (args) => `step ${args.step} done`);

    mockCreateSseClient
      .mockReturnValueOnce(makeMockStream(makeToolCallStream("step_tool", { step: 1 })) as any)
      .mockReturnValueOnce(makeMockStream(makeToolCallStream("step_tool", { step: 2 })) as any)
      .mockReturnValueOnce(makeMockStream(makeTextStream("All steps completed.")) as any);

    const { result } = renderHook(() => useChat({ getToken: async () => "token" }));

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Run steps" }] }],
        model: "test-model",
        tools: [stepTool],
      });
    });

    expect(response?.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(3);
  });

  it("executes multiple tools with executors in same response", async () => {
    const toolA = makeAutoTool("tool_a", async () => "result a");
    const toolB = makeAutoTool("tool_b", async () => "result b");

    const bothToolsStream = [
      {
        type: "response.created",
        response: { id: "resp-1", model: "test-model" },
      },
      {
        type: "response.output_item.added",
        item: {
          id: "fc-1",
          type: "function_call",
          name: "tool_a",
          call_id: "call-1",
          arguments: "",
        },
      },
      {
        type: "response.function_call_arguments.done",
        item_id: "fc-1",
        arguments: "{}",
      },
      {
        type: "response.output_item.added",
        item: {
          id: "fc-2",
          type: "function_call",
          name: "tool_b",
          call_id: "call-2",
          arguments: "",
        },
      },
      {
        type: "response.function_call_arguments.done",
        item_id: "fc-2",
        arguments: "{}",
      },
      {
        type: "response.completed",
        response: { usage: { input_tokens: 10, output_tokens: 5 } },
      },
    ];

    mockCreateSseClient
      .mockReturnValueOnce(makeMockStream(bothToolsStream) as any)
      .mockReturnValueOnce(makeMockStream(makeTextStream("Done with both tools.")) as any);

    const onToolCall = vi.fn();
    const { result } = renderHook(() => useChat({ getToken: async () => "token", onToolCall }));

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Do both" }] }],
        model: "test-model",
        tools: [toolA, toolB],
      });
    });

    // Both tools have executors, so onToolCall should NOT fire
    expect(onToolCall).not.toHaveBeenCalled();
    // Both results sent in one continuation
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
    // Verify continuation includes both tool results
    const continuationBody = getRequestBody(1);
    const toolResults = continuationBody.input.filter((m: any) => m.role === "tool");
    expect(toolResults).toHaveLength(2);
  });

  it("calls onFinish with the final response after tool loop completes", async () => {
    const autoTool = makeAutoTool("auto_tool", async () => "result");

    mockCreateSseClient
      .mockReturnValueOnce(makeMockStream(makeToolCallStream("auto_tool", {})) as any)
      .mockReturnValueOnce(makeMockStream(makeTextStream("Final answer")) as any);

    const onFinish = vi.fn();
    const { result } = renderHook(() => useChat({ getToken: async () => "token", onFinish }));

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Go" }] }],
        model: "test-model",
        tools: [autoTool],
      });
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    const finishArg = onFinish.mock.calls[0][0];
    const messageOutput = finishArg.output?.find((o: any) => o.type === "message");
    expect(messageOutput?.content?.[0]?.text).toBe("Final answer");
  });

  // ── Safety: MAX_TOOL_ITERATIONS ────────────────────────────

  it("stops after 10 tool iterations even if model keeps requesting tools", async () => {
    const loopTool = makeAutoTool("loop_tool", async (args) => `iteration ${args.n}`);

    // Every call returns another tool call — the loop must stop at 10
    let callCount = 0;
    mockCreateSseClient.mockImplementation(() => {
      callCount++;
      return makeMockStream(makeToolCallStream("loop_tool", { n: callCount })) as any;
    });

    const { result } = renderHook(() => useChat({ getToken: async () => "token" }));

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Loop" }] }],
        model: "test-model",
        tools: [loopTool],
      });
    });

    // 1 initial + 10 continuations = 11 total SSE calls
    expect(mockCreateSseClient).toHaveBeenCalledTimes(11);
    // Should still return a response (not hang or throw)
    expect(response).toBeDefined();
    expect(response?.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  // ── Error: tool executor throws ────────────────────────────

  it("sends error back to model when tool executor throws", async () => {
    const failingTool = makeAutoTool("failing_tool", async () => {
      throw new Error("Tool crashed");
    });

    mockCreateSseClient
      .mockReturnValueOnce(makeMockStream(makeToolCallStream("failing_tool", {})) as any)
      .mockReturnValueOnce(makeMockStream(makeTextStream("I see the tool failed.")) as any);

    const { result } = renderHook(() => useChat({ getToken: async () => "token" }));

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Call it" }] }],
        model: "test-model",
        tools: [failingTool],
      });
    });

    // Should still complete (error is sent as tool result, not thrown)
    expect(response?.error).toBeNull();
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);

    // The continuation should contain the error in the tool result message
    const continuationBody = getRequestBody(1);
    const toolResultMsg = continuationBody.input.find((m: any) => m.role === "tool");
    expect(toolResultMsg).toBeDefined();
    expect(toolResultMsg.content[0].text).toContain("Tool execution failed");
    expect(toolResultMsg.content[0].text).toContain("Tool crashed");
  });

  // ── Abort during tool loop continuation ────────────────────

  it("handles abort during the continuation stream after tool execution", async () => {
    const autoTool = makeAutoTool("auto_tool", async () => "result");

    // First call: tool call stream (completes normally)
    // Second call: continuation stream that throws AbortError
    mockCreateSseClient
      .mockReturnValueOnce(makeMockStream(makeToolCallStream("auto_tool", {})) as any)
      .mockReturnValueOnce({
        stream: (async function* () {
          yield {
            type: "response.created",
            response: { id: "resp-2", model: "test-model" },
          };
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          throw error;
        })(),
      } as any);

    const { result } = renderHook(() => useChat({ getToken: async () => "token" }));

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Go" }] }],
        model: "test-model",
        tools: [autoTool],
      });
    });

    expect(response?.error).toBe("Request aborted");
    expect(result.current.isLoading).toBe(false);
  });

  // ── removeAfterExecution ─────────────────────────────────

  it("removes tool from continuation request after successful execution when removeAfterExecution is true", async () => {
    const removableTool: ToolConfig = {
      type: "function",
      function: {
        name: "save_tool",
        description: "Save tool",
        arguments: { type: "object", properties: {} },
      },
      executor: async () => "saved",
      removeAfterExecution: true,
    };

    mockCreateSseClient
      .mockReturnValueOnce(makeMockStream(makeToolCallStream("save_tool", { data: "test" })) as any)
      .mockReturnValueOnce(makeMockStream(makeTextStream("Memory saved!")) as any);

    const { result } = renderHook(() => useChat({ getToken: async () => "token" }));

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Remember this" }] }],
        model: "test-model",
        tools: [removableTool],
      });
    });

    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);

    // Verify the continuation request has no tools (they were all removed)
    const continuationBody = getRequestBody(1);
    expect(continuationBody.tools).toBeUndefined();
  });

  it("keeps tool in continuation request when executor errors and removeAfterExecution is true", async () => {
    const failingRemovableTool: ToolConfig = {
      type: "function",
      function: {
        name: "flaky_tool",
        description: "Flaky tool",
        arguments: { type: "object", properties: {} },
      },
      executor: async () => {
        throw new Error("Network error");
      },
      removeAfterExecution: true,
    };

    mockCreateSseClient
      .mockReturnValueOnce(makeMockStream(makeToolCallStream("flaky_tool", {})) as any)
      .mockReturnValueOnce(makeMockStream(makeTextStream("I see the tool failed.")) as any);

    const { result } = renderHook(() => useChat({ getToken: async () => "token" }));

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Try it" }] }],
        model: "test-model",
        tools: [failingRemovableTool],
      });
    });

    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);

    // Tool should still be present since it failed
    const continuationBody = getRequestBody(1);
    const toolNames = continuationBody.tools?.map((t: any) => t.function?.name ?? t.name);
    expect(toolNames).toContain("flaky_tool");
  });

  it("prevents tool loop exhaustion: model keeps calling removed tool but loop stops early", async () => {
    const saveTool: ToolConfig = {
      type: "function",
      function: {
        name: "memory_save",
        description: "Save memory",
        arguments: { type: "object", properties: {} },
      },
      executor: async () => "saved",
      removeAfterExecution: true,
    };

    // First call: model calls memory_save tool
    // Second call: model responds with text (no tools available to call)
    mockCreateSseClient
      .mockReturnValueOnce(
        makeMockStream(makeToolCallStream("memory_save", { content: "pasta" })) as any
      )
      .mockReturnValueOnce(makeMockStream(makeTextStream("Got it, I'll remember that!")) as any);

    const { result } = renderHook(() => useChat({ getToken: async () => "token" }));

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "remember my favorite food is pasta" }],
          },
        ],
        model: "test-model",
        tools: [saveTool],
      });
    });

    // Only 2 SSE calls (initial + 1 continuation), not 11 (initial + 10)
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
    expect(response?.error).toBeNull();

    // Verify the continuation had no tools
    const continuationBody = getRequestBody(1);
    expect(continuationBody.tools).toBeUndefined();
  });

  it("removes only flagged tools when mixed with non-flagged tools", async () => {
    const saveTool: ToolConfig = {
      type: "function",
      function: {
        name: "memory_save",
        description: "Save memory",
        arguments: { type: "object", properties: {} },
      },
      executor: async () => "saved",
      removeAfterExecution: true,
    };

    const searchTool: ToolConfig = {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web",
        arguments: { type: "object", properties: {} },
      },
      executor: async () => "results",
      // No removeAfterExecution — should persist
    };

    // First call: model calls memory_save
    // Second call: model responds with text
    mockCreateSseClient
      .mockReturnValueOnce(
        makeMockStream(makeToolCallStream("memory_save", { content: "test" })) as any
      )
      .mockReturnValueOnce(makeMockStream(makeTextStream("Done!")) as any);

    const { result } = renderHook(() => useChat({ getToken: async () => "token" }));

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "save this" }] }],
        model: "test-model",
        tools: [saveTool, searchTool],
      });
    });

    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);

    // Continuation should still have web_search but not memory_save
    const continuationBody = getRequestBody(1);
    const toolNames = continuationBody.tools?.map((t: any) => t.function?.name ?? t.name);
    expect(toolNames).not.toContain("memory_save");
    expect(toolNames).toContain("web_search");
  });
});
