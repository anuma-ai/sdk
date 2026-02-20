import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "./useChat";
import { client } from "../client/client.gen";
import type { ServerSentEventsResult } from "../client/core/serverSentEvents.gen";
import type { ToolConfig } from "../lib/chat/useChat/types";

type SendMessageResult = Awaited<
  ReturnType<ReturnType<typeof useChat>["sendMessage"]>
>;

vi.mock("../client/client.gen", () => ({
  client: {
    sse: {
      post: vi.fn(),
    },
  },
}));

function makeMockStream(chunks: unknown[]): ServerSentEventsResult<unknown> {
  const stream = (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
  return { stream };
}

function makeToolCallStream(
  toolName: string,
  toolArgs: Record<string, unknown>
) {
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
    autoExecute: true,
  };
}

describe("useChat multi-turn tool loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-executes a tool, sends result back, and completes with final text", async () => {
    const autoTool = makeAutoTool(
      "auto_tool",
      async (args) => `result for ${args.input}`
    );

    vi.mocked(client.sse.post)
      .mockResolvedValueOnce(
        makeMockStream(makeToolCallStream("auto_tool", { input: "hello" }))
      )
      .mockResolvedValueOnce(
        makeMockStream(makeTextStream("Here is the result."))
      );

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token" })
    );

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [
          { role: "user", content: [{ type: "text", text: "Do something" }] },
        ],
        model: "test-model",
        tools: [autoTool],
      });
    });

    expect(response?.error).toBeNull();
    expect(client.sse.post).toHaveBeenCalledTimes(2);

    // Verify the continuation includes tool result in messages
    const continuationCall = vi.mocked(client.sse.post).mock
      .calls[1][0] as any;
    const toolResultMsg = continuationCall.body.input.find(
      (m: any) => m.role === "tool"
    );
    expect(toolResultMsg).toBeDefined();
    expect(toolResultMsg.content[0].text).toContain("result for hello");
  });

  it("terminates when only non-autoExecute tools remain (emits onToolCall)", async () => {
    const manualTool: ToolConfig = {
      type: "function",
      function: {
        name: "manual_tool",
        description: "Manual tool",
        arguments: { type: "object", properties: {} },
      },
      executor: async () => "manual result",
      autoExecute: false,
    };

    vi.mocked(client.sse.post).mockResolvedValue(
      makeMockStream(makeToolCallStream("manual_tool", { input: "test" }))
    );

    const onToolCall = vi.fn();
    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token", onToolCall })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [
          { role: "user", content: [{ type: "text", text: "Do something" }] },
        ],
        model: "test-model",
        tools: [manualTool],
      });
    });

    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        function: expect.objectContaining({ name: "manual_tool" }),
      })
    );
    expect(client.sse.post).toHaveBeenCalledTimes(1); // no continuation
  });

  it("handles multiple rounds of tool calls before final response", async () => {
    const stepTool = makeAutoTool(
      "step_tool",
      async (args) => `step ${args.step} done`
    );

    vi.mocked(client.sse.post)
      .mockResolvedValueOnce(
        makeMockStream(makeToolCallStream("step_tool", { step: 1 }))
      )
      .mockResolvedValueOnce(
        makeMockStream(makeToolCallStream("step_tool", { step: 2 }))
      )
      .mockResolvedValueOnce(
        makeMockStream(makeTextStream("All steps completed."))
      );

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token" })
    );

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [
          { role: "user", content: [{ type: "text", text: "Run steps" }] },
        ],
        model: "test-model",
        tools: [stepTool],
      });
    });

    expect(response?.error).toBeNull();
    expect(client.sse.post).toHaveBeenCalledTimes(3);
  });

  it("auto-executes auto tools and emits events for manual tools in same response", async () => {
    const autoTool = makeAutoTool("auto_tool", async () => "auto result");
    const manualTool: ToolConfig = {
      type: "function",
      function: {
        name: "manual_tool",
        description: "Manual tool",
        arguments: { type: "object", properties: {} },
      },
      executor: async () => "manual result",
      autoExecute: false,
    };

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
          name: "auto_tool",
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
          name: "manual_tool",
          call_id: "call-2",
          arguments: "",
        },
      },
      {
        type: "response.function_call_arguments.done",
        item_id: "fc-2",
        arguments: '{"key":"val"}',
      },
      {
        type: "response.completed",
        response: { usage: { input_tokens: 10, output_tokens: 5 } },
      },
    ];

    vi.mocked(client.sse.post)
      .mockResolvedValueOnce(makeMockStream(bothToolsStream))
      .mockResolvedValueOnce(
        makeMockStream(makeTextStream("Done with auto tool."))
      );

    const onToolCall = vi.fn();
    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token", onToolCall })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [
          { role: "user", content: [{ type: "text", text: "Do both" }] },
        ],
        model: "test-model",
        tools: [autoTool, manualTool],
      });
    });

    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        function: expect.objectContaining({ name: "manual_tool" }),
      })
    );
    expect(client.sse.post).toHaveBeenCalledTimes(2);
  });

  it("calls onFinish with the final response after tool loop completes", async () => {
    const autoTool = makeAutoTool("auto_tool", async () => "result");

    vi.mocked(client.sse.post)
      .mockResolvedValueOnce(
        makeMockStream(makeToolCallStream("auto_tool", {}))
      )
      .mockResolvedValueOnce(
        makeMockStream(makeTextStream("Final answer"))
      );

    const onFinish = vi.fn();
    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token", onFinish })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [
          { role: "user", content: [{ type: "text", text: "Go" }] },
        ],
        model: "test-model",
        tools: [autoTool],
      });
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    const finishArg = onFinish.mock.calls[0][0];
    const messageOutput = finishArg.output?.find(
      (o: any) => o.type === "message"
    );
    expect(messageOutput?.content?.[0]?.text).toBe("Final answer");
  });

  // ── Safety: MAX_TOOL_ITERATIONS ────────────────────────────

  it("stops after 10 tool iterations even if model keeps requesting tools", async () => {
    const loopTool = makeAutoTool(
      "loop_tool",
      async (args) => `iteration ${args.n}`
    );

    // Every call returns another tool call — the loop must stop at 10
    let callCount = 0;
    vi.mocked(client.sse.post).mockImplementation(() => {
      callCount++;
      return Promise.resolve(
        makeMockStream(makeToolCallStream("loop_tool", { n: callCount }))
      );
    });

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token" })
    );

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [
          { role: "user", content: [{ type: "text", text: "Loop" }] },
        ],
        model: "test-model",
        tools: [loopTool],
      });
    });

    // 1 initial + 10 continuations = 11 total SSE calls
    expect(client.sse.post).toHaveBeenCalledTimes(11);
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

    vi.mocked(client.sse.post)
      .mockResolvedValueOnce(
        makeMockStream(makeToolCallStream("failing_tool", {}))
      )
      .mockResolvedValueOnce(
        makeMockStream(makeTextStream("I see the tool failed."))
      );

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token" })
    );

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [
          { role: "user", content: [{ type: "text", text: "Call it" }] },
        ],
        model: "test-model",
        tools: [failingTool],
      });
    });

    // Should still complete (error is sent as tool result, not thrown)
    expect(response?.error).toBeNull();
    expect(client.sse.post).toHaveBeenCalledTimes(2);

    // The continuation should contain the error in the tool result message
    const continuationCall = vi.mocked(client.sse.post).mock
      .calls[1][0] as any;
    const toolResultMsg = continuationCall.body.input.find(
      (m: any) => m.role === "tool"
    );
    expect(toolResultMsg).toBeDefined();
    expect(toolResultMsg.content[0].text).toContain("Tool execution failed");
    expect(toolResultMsg.content[0].text).toContain("Tool crashed");
  });

  // ── Abort during tool loop continuation ────────────────────

  it("handles abort during the continuation stream after tool execution", async () => {
    const autoTool = makeAutoTool("auto_tool", async () => "result");

    // First call: tool call stream (completes normally)
    // Second call: continuation stream that throws AbortError
    vi.mocked(client.sse.post)
      .mockResolvedValueOnce(
        makeMockStream(makeToolCallStream("auto_tool", {}))
      )
      .mockResolvedValueOnce({
        stream: (async function* () {
          yield {
            type: "response.created",
            response: { id: "resp-2", model: "test-model" },
          };
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          throw error;
        })(),
      });

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token" })
    );

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [
          { role: "user", content: [{ type: "text", text: "Go" }] },
        ],
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
      autoExecute: true,
      removeAfterExecution: true,
    };

    vi.mocked(client.sse.post)
      .mockResolvedValueOnce(
        makeMockStream(makeToolCallStream("save_tool", { data: "test" }))
      )
      .mockResolvedValueOnce(
        makeMockStream(makeTextStream("Memory saved!"))
      );

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [
          { role: "user", content: [{ type: "text", text: "Remember this" }] },
        ],
        model: "test-model",
        tools: [removableTool],
      });
    });

    expect(client.sse.post).toHaveBeenCalledTimes(2);

    // Verify the continuation request has no tools (they were all removed)
    const continuationCall = vi.mocked(client.sse.post).mock.calls[1][0] as any;
    expect(continuationCall.body.tools).toBeUndefined();
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
      autoExecute: true,
      removeAfterExecution: true,
    };

    vi.mocked(client.sse.post)
      .mockResolvedValueOnce(
        makeMockStream(makeToolCallStream("flaky_tool", {}))
      )
      .mockResolvedValueOnce(
        makeMockStream(makeTextStream("I see the tool failed."))
      );

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [
          { role: "user", content: [{ type: "text", text: "Try it" }] },
        ],
        model: "test-model",
        tools: [failingRemovableTool],
      });
    });

    expect(client.sse.post).toHaveBeenCalledTimes(2);

    // Tool should still be present since it failed
    const continuationCall = vi.mocked(client.sse.post).mock.calls[1][0] as any;
    const toolNames = continuationCall.body.tools?.map(
      (t: any) => t.function?.name
    );
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
      autoExecute: true,
      removeAfterExecution: true,
    };

    // First call: model calls memory_save tool
    // Second call: model responds with text (no tools available to call)
    vi.mocked(client.sse.post)
      .mockResolvedValueOnce(
        makeMockStream(makeToolCallStream("memory_save", { content: "pasta" }))
      )
      .mockResolvedValueOnce(
        makeMockStream(makeTextStream("Got it, I'll remember that!"))
      );

    const { result } = renderHook(() =>
      useChat({ getToken: async () => "token" })
    );

    let response: SendMessageResult | undefined;
    await act(async () => {
      response = await result.current.sendMessage({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "remember my favorite food is pasta" },
            ],
          },
        ],
        model: "test-model",
        tools: [saveTool],
      });
    });

    // Only 2 SSE calls (initial + 1 continuation), not 11 (initial + 10)
    expect(client.sse.post).toHaveBeenCalledTimes(2);
    expect(response?.error).toBeNull();

    // Verify the continuation had no tools
    const continuationCall = vi.mocked(client.sse.post).mock.calls[1][0] as any;
    expect(continuationCall.body.tools).toBeUndefined();
  });
});
