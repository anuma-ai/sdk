/**
 * Continuation tool_choice coverage for runToolLoop with `required`.
 *
 * `toolChoice: "required"` exists to guarantee the FIRST round picks a tool
 * (media/search modes forcing e.g. generate_image). Re-sending it on
 * continuation rounds corners the model: the real work is done but it is
 * forbidden from answering with text, so it fabricates whatever tool call
 * escapes the constraint — observed in production as junk
 * memory_vault_save writes ("The user said: 'tiger'") after image
 * generations. These tests pin the downgrade to "auto" once a tool round
 * has executed, and that named-tool forcing is left untouched.
 */

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

/** Stream that emits a tool call (responses-API format). */
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
      response: { usage: { input_tokens: 10, output_tokens: 10 } },
    };
  })();
}

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

function makeTool(name: string) {
  return {
    type: "function" as const,
    function: {
      name,
      parameters: { type: "object", properties: {} },
    },
    executor: async () => ({ ok: true }),
  };
}

async function runWithToolChoice(
  toolChoice: string | undefined
): Promise<Array<string | undefined>> {
  const modelCallToolChoices: Array<string | undefined> = [];
  const result = await runToolLoop({
    messages: [{ role: "user", content: [{ type: "text", text: "generate an image of a tiger" }] }],
    model: "test-model",
    token: "token",
    tools: [makeTool("generate_image"), makeTool("memory_vault_save")],
    ...(toolChoice !== undefined ? { toolChoice } : {}),
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

describe("runToolLoop required continuation downgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1]);
  });

  it("downgrades 'required' to 'auto' after the first tool round executes", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({ callId: "c1", name: "generate_image", arguments: "{}" }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("here is your tiger") } as never);

    const toolChoices = await runWithToolChoice("required");
    // Round 1 forced; the continuation must NOT re-force a tool call —
    // the model is free to answer with text instead of fabricating a
    // junk memory_vault_save.
    expect(toolChoices).toEqual(["required", "auto"]);
    expect(mockCreateSseClient).toHaveBeenCalledTimes(2);
  });

  it("leaves 'auto' continuations unchanged", async () => {
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({ callId: "c1", name: "generate_image", arguments: "{}" }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const toolChoices = await runWithToolChoice("auto");
    expect(toolChoices).toEqual(["auto", "auto"]);
  });

  it("leaves named-tool forcing untouched on continuations", async () => {
    // Slide/app flows force a specific tool and rely on it persisting.
    mockCreateSseClient
      .mockReturnValueOnce({
        stream: makeToolCallStream({ callId: "c1", name: "generate_image", arguments: "{}" }),
      } as never)
      .mockReturnValueOnce({ stream: makeTextStream("done") } as never);

    const toolChoices = await runWithToolChoice("generate_image");
    expect(toolChoices).toEqual(["generate_image", "generate_image"]);
  });
});
