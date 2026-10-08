import { describe, it, expect } from "vitest";
import { ResponsesStrategy } from "./responses";
import type { StreamAccumulator } from "../types";

function createAccumulator(): StreamAccumulator {
  return {
    content: "",
    thinking: "",
    responseId: "",
    responseModel: "",
    usage: {},
    toolCalls: new Map(),
  };
}

describe("ResponsesStrategy.processStreamChunk - tool_call_events", () => {
  const strategy = new ResponsesStrategy();

  const sampleEvents = [
    {
      id: "evt_1",
      name: "generate_cloud_image",
      arguments: '{"prompt":"cat"}',
      output: '{"url":"https://example.com/cat.png","model":"flux-1"}',
    },
  ];

  it("captures tool_call_events from response.completed chunk", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk(
      {
        type: "response.completed",
        response: {
          usage: { input_tokens: 10, output_tokens: 20 },
          tool_call_events: sampleEvents,
        },
      },
      acc
    );

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].name).toBe("generate_cloud_image");
    expect(acc.toolCallEvents![0].output).toContain("cat.png");
  });

  it("captures tool_call_events from top-level chunk", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].id).toBe("evt_1");
  });

  it("captures tool_call_events from nested response", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk({ response: { tool_call_events: sampleEvents } }, acc);

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].arguments).toBe('{"prompt":"cat"}');
  });

  it("ignores empty tool_call_events array (does not block later capture)", () => {
    const acc = createAccumulator();

    strategy.processStreamChunk({ tool_call_events: [] }, acc);

    expect(acc.toolCallEvents).toBeUndefined();

    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].name).toBe("generate_cloud_image");
  });

  it("does not overwrite existing non-empty tool_call_events", () => {
    const acc = createAccumulator();

    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    const secondEvents = [{ id: "evt_2", name: "edit_cloud_image", arguments: "{}", output: "{}" }];

    strategy.processStreamChunk({ tool_call_events: secondEvents }, acc);

    expect(acc.toolCallEvents).toHaveLength(1);
    expect(acc.toolCallEvents![0].id).toBe("evt_1");
  });

  it("preserves all fields (id, name, arguments, output)", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk({ tool_call_events: sampleEvents }, acc);

    const event = acc.toolCallEvents![0];
    expect(event.id).toBe("evt_1");
    expect(event.name).toBe("generate_cloud_image");
    expect(event.arguments).toBe('{"prompt":"cat"}');
    expect(event.output).toBe('{"url":"https://example.com/cat.png","model":"flux-1"}');
  });
});

describe("ResponsesStrategy.processStreamChunk - response.failed", () => {
  const strategy = new ResponsesStrategy();

  it("throws with the upstream error message when Bifrost emits response.failed", () => {
    const acc = createAccumulator();
    expect(() =>
      strategy.processStreamChunk(
        {
          type: "response.failed",
          response: { error: { code: "server_error", message: "Upstream is on fire" } },
        },
        acc
      )
    ).toThrow("[server_error] Upstream is on fire");
  });

  it("unwraps double-JSON-encoded error messages (real MiniMax M2.1 shape)", () => {
    const acc = createAccumulator();
    const wrapped = JSON.stringify({
      error: { message: "Model not found, inaccessible, and/or not deployed", code: "NOT_FOUND" },
    });
    expect(() =>
      strategy.processStreamChunk(
        {
          type: "response.failed",
          response: { error: { code: "server_error", message: wrapped } },
        },
        acc
      )
    ).toThrow("[server_error] Model not found, inaccessible, and/or not deployed");
  });

  it("falls back to a generic message when no error detail is present", () => {
    const acc = createAccumulator();
    expect(() =>
      strategy.processStreamChunk({ type: "response.failed", response: {} }, acc)
    ).toThrow("Upstream request failed (response.failed)");
  });
});

describe("ResponsesStrategy.processStreamChunk - whitespace-only deltas", () => {
  const strategy = new ResponsesStrategy();

  it("emits `\\n\\n` delta to result.content (paragraph break between heading and body)", () => {
    const acc = createAccumulator();
    const out = strategy.processStreamChunk(
      { type: "response.output_text.delta", delta: "\n\n" },
      acc
    );
    expect(out.content).toBe("\n\n");
    expect(acc.content).toBe("\n\n");
  });

  it("emits single `\\n` delta (line break within a paragraph)", () => {
    const acc = createAccumulator();
    const out = strategy.processStreamChunk(
      { type: "response.output_text.delta", delta: "\n" },
      acc
    );
    expect(out.content).toBe("\n");
    expect(acc.content).toBe("\n");
  });

  it("emits `  \\n` delta (markdown hard break between sentences)", () => {
    const acc = createAccumulator();
    const out = strategy.processStreamChunk(
      { type: "response.output_text.delta", delta: "  \n" },
      acc
    );
    expect(out.content).toBe("  \n");
    expect(acc.content).toBe("  \n");
  });

  it("emits a single-space delta", () => {
    const acc = createAccumulator();
    const out = strategy.processStreamChunk(
      { type: "response.output_text.delta", delta: " " },
      acc
    );
    expect(out.content).toBe(" ");
    expect(acc.content).toBe(" ");
  });

  it("still skips a truly empty delta (no spurious emit)", () => {
    const acc = createAccumulator();
    const out = strategy.processStreamChunk({ type: "response.output_text.delta", delta: "" }, acc);
    expect(out.content).toBeFalsy();
    expect(acc.content).toBe("");
  });

  it("preserves end-to-end whitespace when chunks are accumulated in order", () => {
    const acc = createAccumulator();
    const deltas = ["## ", "Heading", "\n\n", "Body"];
    const emitted: string[] = [];
    for (const delta of deltas) {
      const out = strategy.processStreamChunk({ type: "response.output_text.delta", delta }, acc);
      if (out.content !== null) emitted.push(out.content);
    }
    expect(emitted.join("")).toBe("## Heading\n\nBody");
    expect(acc.content).toBe("## Heading\n\nBody");
  });
});

describe("ResponsesStrategy - credits_exhausted pass-through", () => {
  const strategy = new ResponsesStrategy();

  const readExhausted = (usage: unknown) =>
    (usage as { credits_exhausted?: boolean } | undefined)?.credits_exhausted;

  it("passes credits_exhausted from a full 'response' event into the final usage", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk(
      {
        type: "response",
        response: {
          id: "resp_1",
          usage: { input_tokens: 10, output_tokens: 5, credits_exhausted: true },
        },
      },
      acc
    );
    expect(acc.usage.credits_exhausted).toBe(true);

    const res = strategy.buildFinalResponse(acc);
    expect(readExhausted(res.usage)).toBe(true);
  });

  it("passes credits_exhausted from a response.completed event into the final usage", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk(
      {
        type: "response.completed",
        response: { usage: { input_tokens: 10, output_tokens: 5, credits_exhausted: true } },
      },
      acc
    );
    expect(acc.usage.credits_exhausted).toBe(true);

    const res = strategy.buildFinalResponse(acc);
    expect(readExhausted(res.usage)).toBe(true);
  });

  it("leaves credits_exhausted undefined when the usage frame omits it", () => {
    const acc = createAccumulator();
    strategy.processStreamChunk(
      {
        type: "response.completed",
        response: { usage: { input_tokens: 10, output_tokens: 5 } },
      },
      acc
    );
    expect(acc.usage.credits_exhausted).toBeUndefined();

    const res = strategy.buildFinalResponse(acc);
    expect(readExhausted(res.usage)).toBeUndefined();
  });
});
