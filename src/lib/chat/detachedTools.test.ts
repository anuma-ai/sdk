import { describe, expect, it, vi } from "vitest";

import { createDisplayTool } from "../../tools/uiInteraction";
import { createMemoryVaultTool } from "../memoryVault/tool";
import {
  DEFERRED_TOOL_RESULT,
  detachedToolClasses,
  runDetachedToolCalls,
  storeDetachedToolResults,
} from "./detachedTools";
import type { StreamingTransport } from "./toolLoop";
import { runToolLoop } from "./toolLoop";
import { TOOL_RESULT_ORIGIN } from "./toolResults";
import type { ApiResponse } from "./useChat/strategies/types";
import type { ToolConfig } from "./useChat/types";
import { toolsToApiFormat } from "./useChat/utils";

function tool(name: string, extra: Partial<ToolConfig> = {}): ToolConfig {
  return {
    type: "function",
    function: { name, description: name, arguments: { type: "object", properties: {} } },
    ...extra,
  } as ToolConfig;
}

function responsesWithCall(name: string, args: Record<string, unknown>, events: unknown[] = []) {
  return {
    object: "response",
    output: [
      { type: "message", content: [{ text: "Here it is." }] },
      { type: "function_call", call_id: `call_${name}`, name, arguments: JSON.stringify(args) },
    ],
    tool_call_events: events,
  } as unknown as ApiResponse;
}

describe("detachedToolClasses", () => {
  it("maps each classed tool to its class and leaves the rest out", () => {
    expect(
      detachedToolClasses([
        tool("display_chart", { detachedClass: "render" }),
        tool("memory_vault_save", { detachedClass: "deferred" }),
        tool("gmail_send"),
      ])
    ).toEqual({ display_chart: "render", memory_vault_save: "deferred" });
  });

  it("is undefined when no tool has a class", () => {
    expect(detachedToolClasses([tool("gmail_send")])).toBeUndefined();
    expect(detachedToolClasses(undefined)).toBeUndefined();
  });
});

describe("the class never reaches the model provider", () => {
  it("is stripped from the tool definition", () => {
    const [completions] = toolsToApiFormat([tool("display_chart", { detachedClass: "render" })])!;
    const [responses] = toolsToApiFormat(
      [tool("display_chart", { detachedClass: "render" })],
      "responses"
    )!;
    expect(completions).not.toHaveProperty("detachedClass");
    expect(responses).not.toHaveProperty("detachedClass");
  });
});

async function requestBody(apiType: "responses" | "completions", tools: ToolConfig[]) {
  let body: Record<string, unknown> | undefined;
  const transport: StreamingTransport = (options) => {
    body = options.body;
    return {
      stream: (async function* () {
        yield { type: "response.created", response: { id: "r", model: "m" } };
        yield { type: "response.output_text.delta", delta: { OfString: "ok" } };
        yield { type: "response.completed", response: { usage: {} } };
      })(),
    };
  };
  await runToolLoop({
    messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    model: "m",
    token: "t",
    baseUrl: "https://portal.test",
    apiType,
    tools,
    transport,
  });
  return body;
}

describe("the request tells the portal each tool's class", () => {
  const tools = [tool("display_chart", { detachedClass: "render" }), tool("gmail_send")];

  it("as a top-level field on the Responses API", async () => {
    const body = await requestBody("responses", tools);
    expect(body?.client_tool_classes).toEqual({ display_chart: "render" });
  });

  it("inside the portal block on the Completions API", async () => {
    const body = await requestBody("completions", tools);
    expect((body?.portal as Record<string, unknown>)?.client_tool_classes).toEqual({
      display_chart: "render",
    });
    expect(body).not.toHaveProperty("client_tool_classes");
  });

  it("is absent when no tool has a class", async () => {
    const body = await requestBody("responses", [tool("gmail_send")]);
    expect(body).not.toHaveProperty("client_tool_classes");
  });
});

describe("runDetachedToolCalls", () => {
  it("runs the render call that ended the turn, as detached", async () => {
    const executor = vi.fn(async (args: Record<string, unknown>) => ({ drawn: args.title }));
    const results = await runDetachedToolCalls(
      responsesWithCall("display_chart", { title: "Rain" }),
      [tool("display_chart", { detachedClass: "render", executor })]
    );
    expect(executor).toHaveBeenCalledWith({ title: "Rain" }, undefined, { detached: true });
    expect(results).toEqual([{ name: "display_chart", result: { drawn: "Rain" } }]);
  });

  it("runs a deferred call the portal answered, and not one the device already ran", async () => {
    const executor = vi.fn(async () => "Memory saved.");
    const response = {
      object: "response",
      output: [{ type: "message", content: [{ text: "Saved it." }] }],
      tool_call_events: [
        {
          id: "c1",
          name: "memory_vault_save",
          arguments: '{"content":"a"}',
          output: DEFERRED_TOOL_RESULT,
        },
        {
          id: "c0",
          name: "memory_vault_save",
          arguments: '{"content":"b"}',
          output: "Memory saved.",
        },
      ],
    } as unknown as ApiResponse;
    const results = await runDetachedToolCalls(response, [
      tool("memory_vault_save", { detachedClass: "deferred", executor }),
    ]);
    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith({ content: "a" }, undefined, { detached: true });
    expect(results).toHaveLength(1);
  });

  it("reads a Completions answer's final tool calls", async () => {
    const executor = vi.fn(async () => "ok");
    const response = {
      choices: [
        {
          message: {
            tool_calls: [
              { id: "c1", function: { name: "display_weather", arguments: '{"city":"Oslo"}' } },
            ],
          },
        },
      ],
    } as unknown as ApiResponse;
    await runDetachedToolCalls(response, [
      tool("display_weather", { detachedClass: "render", executor }),
    ]);
    expect(executor).toHaveBeenCalledWith({ city: "Oslo" }, undefined, { detached: true });
  });

  it("leaves calls to tools without a class alone", async () => {
    const executor = vi.fn();
    const results = await runDetachedToolCalls(responsesWithCall("gmail_send", {}), [
      tool("gmail_send", { executor }),
    ]);
    expect(executor).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it("skips a call whose result the turn already carries", async () => {
    const executor = vi.fn();
    const response = {
      object: "response",
      output: [
        { type: "function_call", call_id: "c1", name: "display_chart", arguments: "{}" },
        { type: "function_call_output", call_id: "c1", output: "drawn" },
      ],
    } as unknown as ApiResponse;
    await runDetachedToolCalls(response, [
      tool("display_chart", { detachedClass: "render", executor }),
    ]);
    expect(executor).not.toHaveBeenCalled();
  });

  it("restores masked values in the arguments of a tool that asks for it", async () => {
    const save = vi.fn(async () => "ok");
    const draw = vi.fn(async () => "ok");
    const restore = (text: string) => text.replace("[NAME_1]", "Ada");
    await runDetachedToolCalls(
      responsesWithCall("memory_vault_save", { content: "[NAME_1] likes tea" }),
      [
        tool("memory_vault_save", {
          detachedClass: "deferred",
          deAnonymizeArgs: true,
          executor: save,
        }),
      ],
      restore
    );
    await runDetachedToolCalls(
      responsesWithCall("display_chart", { title: "[NAME_1]" }),
      [tool("display_chart", { detachedClass: "render", executor: draw })],
      restore
    );
    expect(save).toHaveBeenCalledWith({ content: "Ada likes tea" }, undefined, { detached: true });
    expect(draw).toHaveBeenCalledWith({ title: "[NAME_1]" }, undefined, { detached: true });
  });

  it("records an executor failure as the call's result", async () => {
    const results = await runDetachedToolCalls(responsesWithCall("display_chart", {}), [
      tool("display_chart", {
        detachedClass: "render",
        executor: async () => {
          throw new Error("no data");
        },
      }),
    ]);
    expect(results).toEqual([{ name: "display_chart", result: { error: "no data" } }]);
  });
});

describe("storeDetachedToolResults", () => {
  const answer = { uniqueId: "reply-1", conversationId: "conv-1" } as never;

  it("saves the results as the turn's tool-results row under the answer", async () => {
    const createMessage = vi.fn(async (opts: Record<string, unknown>) => opts as never);
    await storeDetachedToolResults({
      backend: { createMessage },
      answer,
      response: responsesWithCall("display_chart", { title: "Rain" }),
      tools: [tool("display_chart", { detachedClass: "render", executor: async () => "drawn" })],
    });
    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conv-1",
        role: "user",
        parentMessageId: "reply-1",
        origin: TOOL_RESULT_ORIGIN,
        content: expect.stringContaining('Tool "display_chart" returned: "drawn"'),
      })
    );
  });

  it("writes nothing when no call ran", async () => {
    const createMessage = vi.fn();
    const row = await storeDetachedToolResults({
      backend: { createMessage },
      answer,
      response: responsesWithCall("gmail_send", {}),
      tools: [tool("gmail_send", { executor: async () => "sent" })],
    });
    expect(row).toBeNull();
    expect(createMessage).not.toHaveBeenCalled();
  });
});

describe("tool classes", () => {
  it("display tools are render", () => {
    const display = createDisplayTool(
      { getContext: () => null },
      {
        name: "display_chart",
        description: "chart",
        parameters: { type: "object", properties: {} },
        displayType: "chart",
        execute: (args) => args,
      }
    );
    expect(display.detachedClass).toBe("render");
  });

  it("the memory save tool is deferred and saves without asking when detached", async () => {
    const onSave = vi.fn(async () => true);
    const create = vi.fn(async (input: { content: string }) => ({ uniqueId: "m1", ...input }));
    const save = createMemoryVaultTool({ create, update: vi.fn(), get: vi.fn() } as never, {
      onSave,
    });
    expect(save.detachedClass).toBe("deferred");

    await save.executor!({ content: "likes tea" }, undefined, { detached: true });
    expect(onSave).not.toHaveBeenCalled();

    await save.executor!({ content: "likes coffee" });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("the memory save tool has no class when it has no executor", () => {
    const save = createMemoryVaultTool({ create: vi.fn() } as never);
    expect(save.detachedClass).toBeUndefined();
  });
});
