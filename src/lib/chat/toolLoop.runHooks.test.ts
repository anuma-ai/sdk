import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import * as embeddingsModule from "../memoryEngine/embeddings";
import type { RunHooks } from "./runHooks";
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

/** Stream that produces plain text then completes. */
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

/** Stream that emits a tool call (responses-API format), then completes. */
function makeToolCallStream(opts: { callId: string; name: string; arguments: string }) {
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
      response: { usage: { input_tokens: 1, output_tokens: 1 } },
    };
  })();
}

/** Stream that throws mid-flight. */
function makeFailingStream(message: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    throw new Error(message);
  })();
}

function makeHooksRecorder() {
  const calls: Array<{ hook: string; event: Record<string, unknown> }> = [];
  const record =
    (name: string) =>
    (event: Record<string, unknown>): void => {
      calls.push({ hook: name, event });
    };
  const hooks: RunHooks = {
    onRunStart: record("onRunStart"),
    onRunEnd: record("onRunEnd"),
    onRunError: record("onRunError"),
    beforeModelCall: record("beforeModelCall"),
    afterModelCall: record("afterModelCall"),
    beforeToolUse: record("beforeToolUse"),
    afterToolUse: record("afterToolUse"),
  };
  return { hooks, calls };
}

const baseUserMsg = { role: "user" as const, content: [{ type: "text" as const, text: "hi" }] };

describe("runToolLoop lifecycle hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("is a no-op when hooks are omitted", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("hello") } as never);
    const a = await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
    });

    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("hello") } as never);
    const b = await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks: {},
    });

    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    expect(JSON.stringify(a.data)).toBe(JSON.stringify(b.data));
  });

  it("shares a single runId across every hook fired in one invocation", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("hi back") } as never);
    const { hooks, calls } = makeHooksRecorder();

    await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
    });

    const ids = new Set(calls.map((c) => c.event.runId));
    expect(ids.size).toBe(1);
    const [id] = [...ids];
    expect(typeof id).toBe("string");
    expect((id as string).length).toBeGreaterThan(0);
  });

  it("fires onRunStart exactly once and before any beforeModelCall", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("x") } as never);
    const { hooks, calls } = makeHooksRecorder();

    await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
    });

    const runStartCount = calls.filter((c) => c.hook === "onRunStart").length;
    expect(runStartCount).toBe(1);
    const firstRunStartIdx = calls.findIndex((c) => c.hook === "onRunStart");
    const firstBeforeIdx = calls.findIndex((c) => c.hook === "beforeModelCall");
    expect(firstRunStartIdx).toBeGreaterThanOrEqual(0);
    expect(firstBeforeIdx).toBeGreaterThan(firstRunStartIdx);
  });

  it("pairs beforeModelCall + afterModelCall and increments stepIndex per continuation", async () => {
    // Round 1: emit a tool call. Round 2: emit plain text.
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({ callId: "c1", name: "do_thing", arguments: '{"x":1}' }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("all done") } as never);

    const { hooks, calls } = makeHooksRecorder();

    await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
      tools: [
        {
          type: "function",
          function: { name: "do_thing", parameters: { type: "object", properties: {} } },
          executor: async () => "ok",
        },
      ],
    });

    const beforeCalls = calls.filter((c) => c.hook === "beforeModelCall");
    const afterCalls = calls.filter((c) => c.hook === "afterModelCall");
    expect(beforeCalls.length).toBe(2);
    expect(afterCalls.length).toBe(2);
    expect(beforeCalls[0].event.stepIndex).toBe(0);
    expect(beforeCalls[1].event.stepIndex).toBe(1);
    expect(afterCalls[0].event.stepIndex).toBe(0);
    expect(afterCalls[1].event.stepIndex).toBe(1);
  });

  it("threads toolCallId through beforeToolUse + afterToolUse for executor-backed tools", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({ callId: "c1", name: "do_thing", arguments: '{"x":1}' }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const { hooks, calls } = makeHooksRecorder();

    await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
      tools: [
        {
          type: "function",
          function: { name: "do_thing", parameters: { type: "object", properties: {} } },
          executor: async () => "ok",
        },
      ],
    });

    const before = calls.find((c) => c.hook === "beforeToolUse");
    const after = calls.find((c) => c.hook === "afterToolUse");
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(before?.event.toolCallId).toBe("c1");
    expect(after?.event.toolCallId).toBe("c1");
    expect(before?.event.name).toBe("do_thing");
    expect((before?.event as { parsedArguments?: unknown }).parsedArguments).toEqual({ x: 1 });
    expect(after?.event.result).toBe("ok");
  });

  it("fires beforeToolUse but not afterToolUse for server-side tools without executors", async () => {
    mockCreateSseClient.mockReturnValueOnce({
      stream: makeToolCallStream({
        callId: "srv1",
        name: "server_side_thing",
        arguments: "{}",
      }),
    } as never);

    const { hooks, calls } = makeHooksRecorder();

    await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
      // No tool definitions at all -> no executors, server-side call surfaces via onToolCall path.
    });

    const beforeServer = calls.filter(
      (c) => c.hook === "beforeToolUse" && c.event.name === "server_side_thing"
    );
    const afterServer = calls.filter(
      (c) => c.hook === "afterToolUse" && c.event.name === "server_side_thing"
    );
    expect(beforeServer.length).toBe(1);
    expect(afterServer.length).toBe(0);
  });

  it("sets afterToolUse.errorType to 'execution' when the executor throws", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({ callId: "c1", name: "do_thing", arguments: "{}" }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const { hooks, calls } = makeHooksRecorder();

    await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
      tools: [
        {
          type: "function",
          function: { name: "do_thing", parameters: { type: "object", properties: {} } },
          executor: async () => {
            throw new Error("boom");
          },
        },
      ],
    });

    const after = calls.find((c) => c.hook === "afterToolUse");
    expect(after?.event.errorType).toBe("execution");
    expect((after?.event.error as string).includes("boom")).toBe(true);
  });

  it("sets afterToolUse.errorType to 'parse' for malformed JSON tool arguments", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({
          callId: "c1",
          name: "do_thing",
          arguments: "this is not json {",
        }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const { hooks, calls } = makeHooksRecorder();

    await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
      tools: [
        {
          type: "function",
          function: { name: "do_thing", parameters: { type: "object", properties: {} } },
          executor: async () => "ok",
        },
      ],
    });

    const after = calls.find((c) => c.hook === "afterToolUse");
    expect(after?.event.errorType).toBe("parse");
  });

  it("sets afterToolUse.errorType to 'timeout' when the executor exceeds its timeout", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({ callId: "c1", name: "slow", arguments: "{}" }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const { hooks, calls } = makeHooksRecorder();

    await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
      tools: [
        {
          type: "function",
          function: { name: "slow", parameters: { type: "object", properties: {} } },
          executor: () => new Promise(() => {}),
          executorTimeout: 10,
        },
      ],
    });

    const after = calls.find((c) => c.hook === "afterToolUse");
    expect(after?.event.errorType).toBe("timeout");
  });

  it("fires afterModelCall with error and onRunError when the stream throws mid-flight", async () => {
    mockCreateSseClient.mockReturnValueOnce({
      stream: makeFailingStream("upstream blew up"),
    } as never);

    const { hooks, calls } = makeHooksRecorder();

    const result = await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
    });

    expect(result.error).toContain("upstream blew up");

    const afterCalls = calls.filter((c) => c.hook === "afterModelCall");
    expect(afterCalls.length).toBe(1);
    expect(afterCalls[0].event.error).toContain("upstream blew up");

    const runErrorCalls = calls.filter((c) => c.hook === "onRunError");
    const runEndCalls = calls.filter((c) => c.hook === "onRunEnd");
    expect(runErrorCalls.length).toBe(1);
    expect(runErrorCalls[0].event.stage).toBe("model");
    expect(runEndCalls.length).toBe(0);
  });

  it("fires onRunStart + one model-call pair + onRunEnd for a no-tool run; totalSteps=1", async () => {
    mockCreateSseClient.mockReturnValueOnce({ stream: makeTextStream("just text") } as never);
    const { hooks, calls } = makeHooksRecorder();

    await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
    });

    expect(calls.filter((c) => c.hook === "onRunStart").length).toBe(1);
    expect(calls.filter((c) => c.hook === "beforeModelCall").length).toBe(1);
    expect(calls.filter((c) => c.hook === "afterModelCall").length).toBe(1);
    expect(calls.filter((c) => c.hook === "onRunError").length).toBe(0);
    const endCalls = calls.filter((c) => c.hook === "onRunEnd");
    expect(endCalls.length).toBe(1);
    expect(endCalls[0].event.totalSteps).toBe(1);
  });

  it("fires two model-call pairs plus tool pairs on a 2-round run; totalSteps=2", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({ callId: "c1", name: "do_thing", arguments: "{}" }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("final") } as never);

    const { hooks, calls } = makeHooksRecorder();

    await runToolLoop({
      messages: [baseUserMsg],
      model: "test-model",
      token: "t",
      hooks,
      tools: [
        {
          type: "function",
          function: { name: "do_thing", parameters: { type: "object", properties: {} } },
          executor: async () => "ok",
        },
      ],
    });

    expect(calls.filter((c) => c.hook === "onRunStart").length).toBe(1);
    expect(calls.filter((c) => c.hook === "beforeModelCall").length).toBe(2);
    expect(calls.filter((c) => c.hook === "afterModelCall").length).toBe(2);
    expect(calls.filter((c) => c.hook === "beforeToolUse").length).toBe(1);
    expect(calls.filter((c) => c.hook === "afterToolUse").length).toBe(1);
    const endCalls = calls.filter((c) => c.hook === "onRunEnd");
    expect(endCalls.length).toBe(1);
    expect(endCalls[0].event.totalSteps).toBe(2);
  });
});
