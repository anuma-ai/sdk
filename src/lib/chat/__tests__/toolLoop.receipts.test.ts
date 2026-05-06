/**
 * Receipt-shaped hook coverage for `runToolLoop`.
 *
 * Drives a stub transport with deterministic tool-call rounds and asserts:
 *   - runId threads through every event
 *   - onLlmStart / onLlmEnd fire as paired events per round
 *   - onToolStart / onToolEnd fire for every executor call
 *   - error paths (parse, timeout, exception) carry the expected errorType
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../../client/core/serverSentEvents.gen";
import * as embeddingsModule from "../../memoryEngine/embeddings";
import type {
  LlmEndEvent,
  LlmStartEvent,
  ToolEndEvent,
  ToolStartEvent,
} from "../receiptHooks";
import { runToolLoop } from "../toolLoop";

vi.mock("../../../client/core/serverSentEvents.gen", async (importOriginal) => {
  const orig = await importOriginal<typeof sseModule>();
  return { ...orig, createSseClient: vi.fn() };
});

vi.mock("../../memoryEngine/embeddings", async (importOriginal) => {
  const orig = await importOriginal<typeof embeddingsModule>();
  return { ...orig, generateEmbedding: vi.fn() };
});

const mockCreateSseClient = vi.mocked(sseModule.createSseClient);

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

function makeToolCallStream(toolName: string, args: string, callId: string = "call-1") {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield {
      type: "response.output_item.added",
      item: {
        type: "function_call",
        id: callId,
        call_id: callId,
        name: toolName,
        arguments: "",
      },
      output_index: 0,
    };
    yield {
      type: "response.function_call_arguments.delta",
      item_id: callId,
      delta: args,
      output_index: 0,
    };
    yield {
      type: "response.function_call_arguments.done",
      item_id: callId,
      arguments: args,
      output_index: 0,
    };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 5, output_tokens: 3 } },
    };
  })();
}

describe("runToolLoop receipt hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("threads the same runId through every event", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: makeToolCallStream("ping", '{"x":1}') } as never);
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const events: Array<{ kind: string; runId: string }> = [];
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "go" }] }],
      model: "test-model",
      token: "t",
      tools: [
        {
          type: "function",
          function: {
            name: "ping",
            description: "echo",
            parameters: { type: "object", properties: { x: { type: "number" } } },
          },
          executor: () => ({ ok: true }),
        },
      ],
      onLlmStart: (e: LlmStartEvent) => {
        events.push({ kind: "llm_start", runId: e.runId });
      },
      onLlmEnd: (e: LlmEndEvent) => {
        events.push({ kind: "llm_end", runId: e.runId });
      },
      onToolStart: (e: ToolStartEvent) => {
        events.push({ kind: "tool_start", runId: e.runId });
      },
      onToolEnd: (e: ToolEndEvent) => {
        events.push({ kind: "tool_end", runId: e.runId });
      },
    });

    expect(events.length).toBeGreaterThan(0);
    const ids = new Set(events.map((e) => e.runId));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toMatch(/^[0-9a-f-]{20,}$/i);
  });

  it("respects caller-supplied runId", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("hello") } as never);

    let captured = "";
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
      model: "m",
      token: "t",
      runId: "fixed-run-id-123",
      onLlmStart: (e: LlmStartEvent) => {
        captured = e.runId;
      },
    });

    expect(captured).toBe("fixed-run-id-123");
  });

  it("emits paired llm_start/llm_end with stepIndex 0 for a no-tool run", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("hello world") } as never);

    const starts: LlmStartEvent[] = [];
    const ends: LlmEndEvent[] = [];
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
      model: "test",
      token: "t",
      onLlmStart: (e) => starts.push(e),
      onLlmEnd: (e) => ends.push(e),
    });

    expect(starts).toHaveLength(1);
    expect(ends).toHaveLength(1);
    expect(starts[0]?.stepIndex).toBe(0);
    expect(ends[0]?.stepIndex).toBe(0);
    expect(ends[0]?.content).toContain("hello world");
    expect(ends[0]?.toolCalls).toEqual([]);
    expect(ends[0]?.finishReason).toBe("stop");
  });

  it("fires tool_start and tool_end exactly once per executor call", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: makeToolCallStream("ping", '{"x":1}') } as never);
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const toolStarts: ToolStartEvent[] = [];
    const toolEnds: ToolEndEvent[] = [];

    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "go" }] }],
      model: "m",
      token: "t",
      tools: [
        {
          type: "function",
          function: {
            name: "ping",
            description: "ok",
            parameters: { type: "object", properties: { x: { type: "number" } } },
          },
          executor: () => ({ ok: true }),
        },
      ],
      onToolStart: (e) => toolStarts.push(e),
      onToolEnd: (e) => toolEnds.push(e),
    });

    expect(toolStarts).toHaveLength(1);
    expect(toolEnds).toHaveLength(1);
    expect(toolStarts[0]?.name).toBe("ping");
    expect(toolStarts[0]?.parsedArguments).toEqual({ x: 1 });
    expect(toolEnds[0]?.name).toBe("ping");
    expect(toolEnds[0]?.result).toEqual({ ok: true });
    expect(toolEnds[0]?.error).toBeUndefined();
    expect(toolEnds[0]?.toolCallId).toBe(toolStarts[0]?.toolCallId);
  });

  it("propagates errorType=execution when executor throws", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: makeToolCallStream("boom", "{}") } as never);
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("ok") } as never);

    const toolEnds: ToolEndEvent[] = [];
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "go" }] }],
      model: "m",
      token: "t",
      tools: [
        {
          type: "function",
          function: {
            name: "boom",
            description: "fail",
            parameters: { type: "object", properties: {} },
          },
          executor: () => {
            throw new Error("kaboom");
          },
        },
      ],
      onToolEnd: (e) => toolEnds.push(e),
    });

    expect(toolEnds).toHaveLength(1);
    expect(toolEnds[0]?.errorType).toBe("execution");
    expect(toolEnds[0]?.error).toContain("kaboom");
  });

  it("propagates errorType=parse when arguments are unparseable", async () => {
    mockCreateSseClient.mockReturnValueOnce({
      stream: makeToolCallStream("ping", "not-json"),
    } as never);
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("ok") } as never);

    const toolEnds: ToolEndEvent[] = [];
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "go" }] }],
      model: "m",
      token: "t",
      tools: [
        {
          type: "function",
          function: {
            name: "ping",
            description: "ok",
            parameters: { type: "object", properties: { x: { type: "number" } } },
          },
          executor: () => ({ ok: true }),
        },
      ],
      onToolEnd: (e) => toolEnds.push(e),
    });

    expect(toolEnds).toHaveLength(1);
    expect(toolEnds[0]?.errorType).toBe("parse");
  });

  it("propagates errorType=timeout when executor exceeds executorTimeout", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: makeToolCallStream("slow", "{}") } as never);
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("ok") } as never);

    const toolEnds: ToolEndEvent[] = [];
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "go" }] }],
      model: "m",
      token: "t",
      tools: [
        {
          type: "function",
          function: {
            name: "slow",
            description: "slow",
            parameters: { type: "object", properties: {} },
          },
          executor: () => new Promise((resolve) => setTimeout(() => resolve("late"), 200)),
          executorTimeout: 20,
        },
      ],
      onToolEnd: (e) => toolEnds.push(e),
    });

    expect(toolEnds).toHaveLength(1);
    expect(toolEnds[0]?.errorType).toBe("timeout");
  });

  it("emits llm_end with error when stream throws mid-flight", async () => {
    const breakingStream = (async function* () {
      yield { type: "response.created", response: { id: "r", model: "m" } };
      throw new Error("mid-stream boom");
    })();
    mockCreateSseClient.mockReturnValueOnce({ stream: breakingStream } as never);

    const ends: LlmEndEvent[] = [];
    const onError = vi.fn();
    await runToolLoop({
      messages: [{ role: "user", content: [{ type: "text", text: "q" }] }],
      model: "m",
      token: "t",
      onLlmEnd: (e) => ends.push(e),
      onError,
    });

    expect(ends).toHaveLength(1);
    expect(ends[0]?.error).toContain("mid-stream boom");
  });
});
